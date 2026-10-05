// Test doubles for practice.session's ports — SoundPort, ClockPort,
// WakeLockPort, VisibilityPort — plus a helper that wires a Session over
// them. Fakes only, never mocks asserting on internal calls
// (docs/engineering.md §7).

import type {
  ClockPort,
  DroneSettings,
  ListeningPort,
  Result,
  ScaleChoice,
  Session,
  SessionContext,
  SessionDeps,
  SessionSettings,
  SoundPort,
  VisibilityPort,
  WakeLockPort,
} from "../../src/practice/published";
import {
  createSession,
  defaultDroneSettings,
  defaultScaleChoice,
  defaultSessionSettings,
} from "../../src/practice/published";
import type {
  ListeningEnded,
  ListeningUnavailable,
  PitchDetected,
} from "../../src/listening/published/pitch-detected.schema";
import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../src/sound/published/sound-command.schema";
import type {
  Accidental,
  Key,
  NoteLetter,
  Traversal,
  Variant,
} from "../../src/theory/published";
import { builtInCatalogue } from "../../src/theory/published";

const SAMPLE_RATE = 48000;

// A posted command paired with the frame FakeSound.frame held at post time
// — the drone and tap scenarios (T005+) are statements about *when* a
// command was posted relative to others, not just what was posted.
export interface PostedCommand {
  readonly command: SoundCommand;
  readonly atFrame: number;
}

export function isDrone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "drone" }> {
  return command.kind === "drone";
}

export function isRetune(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "retune" }> {
  return command.kind === "retune";
}

export function isStop(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "stop" }> {
  return command.kind === "stop";
}

export function isTone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "tone" }> {
  return command.kind === "tone";
}

export function isClick(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "click" }> {
  return command.kind === "click";
}

// Commands that carry an onsetFrame to report against — tone, click and
// drone, never retune, stop or stopAll.
function hasOnsetFrame(
  command: SoundCommand,
): command is Extract<SoundCommand, { onsetFrame: number }> {
  return "onsetFrame" in command;
}

export class FakeSound implements SoundPort {
  frame = 0;
  // How many times start() has been called — practice.session/REQ-010/S2
  // asserts this is 0 before the session's start() runs: no sound and no
  // permission prompt before the first gesture.
  startCalls = 0;
  // How many times dispose() has been called — T024 asserts this is 1 after
  // session.dispose(), proving the session releases its sound port rather
  // than leaking it.
  disposeCalls = 0;
  readonly posted: SoundCommand[] = [];
  // Every post(), paired with the frame this.frame held at the time —
  // `posted` alone loses that timing once more than one command shares a
  // frame or a test needs "posted before/after this instant" (T005+).
  readonly posts: PostedCommand[] = [];
  failWith: SoundUnavailable | null = null;
  // A thrown (rather than returned-as-a-value) start() failure — T025
  // exercises the session's and fallbackSound's last-resort handling of a
  // sound port that rejects instead of resolving `{ ok: false }`.
  throwOnStart: Error | null = null;
  // The port's reported output latency in ms — settable per test (T030),
  // default 0 (no latency, matching a context with neither
  // `outputLatency` nor `baseLatency`). Backs outputLatencyMs() below, the
  // same split as `frame` backing currentFrame().
  latencyMs = 0;
  private readonly listeners = new Set<(report: OnsetReport) => void>();

  start(): Promise<Result<void, SoundUnavailable>> {
    this.startCalls += 1;
    if (this.throwOnStart !== null) {
      return Promise.reject(this.throwOnStart);
    }
    if (this.failWith !== null) {
      return Promise.resolve({ ok: false, error: this.failWith });
    }
    return Promise.resolve({ ok: true, value: undefined });
  }

  sampleRate(): number {
    return SAMPLE_RATE;
  }

  currentFrame(): number {
    return this.frame;
  }

  outputLatencyMs(): number {
    return this.latencyMs;
  }

  // How many `{ kind: "stopAll" }` commands have been posted —
  // practice.tuner/REQ-001/S2 asserts enterTuner() silenced a running
  // sequence this way, the same command stop() itself posts.
  get stopAllCalls(): number {
    return this.posted.filter((command) => command.kind === "stopAll").length;
  }

  post(command: SoundCommand): void {
    this.posted.push(command);
    this.posts.push({ command, atFrame: this.frame });
  }

  onOnset(listener: (report: OnsetReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.disposeCalls += 1;
  }

  // Reports the onset of the posted command carrying `tag`, at the frame
  // it was scheduled for. T009 exercises drift between scheduled and
  // actual frame; T008 only needs the report to exist and be reachable.
  fireOnset(tag: number): void {
    const command = this.posted
      .filter(hasOnsetFrame)
      .find((candidate) => candidate.tag === tag);
    if (command === undefined) {
      throw new Error(`FakeSound.fireOnset: no posted command tagged ${tag}`);
    }
    const report: OnsetReport = {
      tag,
      onsetFrame: command.onsetFrame,
      actualFrame: command.onsetFrame,
    };
    for (const listener of this.listeners) listener(report);
  }
}

interface PendingTimeout {
  readonly id: number;
  readonly at: number;
  readonly callback: () => void;
}

export class FakeClock implements ClockPort {
  private now = 0;
  private pending: PendingTimeout[] = [];
  private nextId = 0;

  constructor(private readonly linkedSound: FakeSound) {}

  setTimeout(callback: () => void, ms: number): () => void {
    const id = this.nextId;
    this.nextId += 1;
    this.pending.push({ id, at: this.now + ms, callback });
    return () => {
      this.pending = this.pending.filter((entry) => entry.id !== id);
    };
  }

  // Runs every due callback in time order, moving FakeSound.frame in
  // lockstep so the lookahead scheduler's horizon (currentFrame plus
  // LOOKAHEAD_MS worth of frames) actually grows as time passes —
  // otherwise it never catches up to a tick spaced further apart than the
  // lookahead window (practice.session — see T008 brief).
  advance(ms: number): void {
    const target = this.now + ms;
    for (;;) {
      let dueIndex = -1;
      for (let index = 0; index < this.pending.length; index += 1) {
        const entry = this.pending[index]!;
        if (entry.at > target) continue;
        if (dueIndex === -1 || entry.at < this.pending[dueIndex]!.at) {
          dueIndex = index;
        }
      }
      if (dueIndex === -1) break;
      const [entry] = this.pending.splice(dueIndex, 1);
      this.setNow(entry!.at);
      entry!.callback();
    }
    this.setNow(target);
  }

  // An alias for `advance` some scenarios reach for by a name that says
  // what the unit is (practice.tuner/REQ-001/S2) — identical behaviour.
  advanceMs(ms: number): void {
    this.advance(ms);
  }

  private setNow(ms: number): void {
    this.now = ms;
    this.linkedSound.frame = Math.round(
      (ms * this.linkedSound.sampleRate()) / 1000,
    );
  }
}

export class FakeWakeLock implements WakeLockPort {
  acquired = false;

  acquire(): Promise<void> {
    this.acquired = true;
    return Promise.resolve();
  }

  release(): void {
    this.acquired = false;
  }
}

export class FakeVisibility implements VisibilityPort {
  private readonly listeners = new Set<() => void>();
  private readonly shownListeners = new Set<() => void>();

  // Observable subscription count — the regression coverage for T016's
  // fixer round asserts this returns to 0 after `<App>` unmounts, proving
  // `session.dispose()` actually ran rather than being skipped.
  get listenerCount(): number {
    return this.listeners.size;
  }

  onHidden(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onShown(listener: () => void): () => void {
    this.shownListeners.add(listener);
    return () => this.shownListeners.delete(listener);
  }

  hide(): void {
    for (const listener of this.listeners) listener();
  }

  // practice.tuner/REQ-008 — the page becoming visible again.
  show(): void {
    for (const listener of this.shownListeners) listener();
  }
}

// A fake ListeningPort — practice.tuner/REQ-002, REQ-006, REQ-007. `feed`
// publishes a PitchDetected to every onPitch subscriber (a no-op unless
// `listening`, mirroring the real Listener's silence once stopped/torn
// down); `end` mimics the track ending mid-session (REQ-006/S3): fires
// onEnded and stops listening, so the next start() must ask again.
export class FakeListening implements ListeningPort {
  startCalls = 0;
  stopCalls = 0;
  listening = false;
  frame = 0;
  // While set, start() resolves { ok: false, error: { reason, detail:
  // "fake" } } instead of succeeding — REQ-006/REQ-007's refused/none/failed
  // scenarios.
  failWith: ListeningUnavailable["reason"] | null = null;
  // While set, start() stays pending (the microphone "being asked for") until
  // resolveStart() answers it — a stop() landing in that window is the
  // supersede path of practice.session/REQ-015. Several held starts may be
  // pending at once (start, stop, start): each is answered by its index among
  // the held starts, in the order they were made.
  holdStart = false;
  private readonly answersToStart: (
    ((refuseWith: ListeningUnavailable["reason"] | null) => void) | null
  )[] = [];
  private readonly pitchListeners = new Set<(pitch: PitchDetected) => void>();
  private readonly endedListeners = new Set<(ended: ListeningEnded) => void>();

  start(): Promise<Result<void, ListeningUnavailable>> {
    this.startCalls += 1;
    if (this.failWith !== null) {
      return Promise.resolve({
        ok: false,
        error: { reason: this.failWith, detail: "fake" },
      });
    }
    if (this.holdStart) {
      return new Promise((resolve) => {
        this.answersToStart.push((refuseWith) => {
          if (refuseWith !== null) {
            resolve({
              ok: false,
              error: { reason: refuseWith, detail: "fake" },
            });
            return;
          }
          this.listening = true;
          resolve({ ok: true, value: undefined });
        });
      });
    }
    this.listening = true;
    return Promise.resolve({ ok: true, value: undefined });
  }

  /**
   * Answers a start() held by `holdStart`: the microphone opens now. With no
   * argument, the oldest one still pending; with `n`, the nth held start
   * (0-based, in the order they were made) — so two pending starts can be
   * answered in either order. With `refuseWith`, that start fails with the
   * reason instead of opening the microphone (it leaves `listening` as it
   * was). Nothing pending: nothing happens.
   */
  resolveStart(
    n?: number,
    refuseWith: ListeningUnavailable["reason"] | null = null,
  ): void {
    const index = n ?? this.answersToStart.findIndex((a) => a !== null);
    if (index < 0 || index >= this.answersToStart.length) return;
    const answer = this.answersToStart[index];
    this.answersToStart[index] = null;
    answer?.(refuseWith);
  }

  stop(): void {
    this.stopCalls += 1;
    this.listening = false;
  }

  currentFrame(): number {
    return this.frame;
  }

  sampleRate(): number {
    return 48000;
  }

  onPitch(listener: (pitch: PitchDetected) => void): () => void {
    this.pitchListeners.add(listener);
    return () => this.pitchListeners.delete(listener);
  }

  onEnded(listener: (ended: ListeningEnded) => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  feed(hz: number, atFrame: number = this.frame, confidence = 0.95): void {
    if (!this.listening) return;
    const pitch: PitchDetected = { hz, confidence, atFrame };
    for (const listener of this.pitchListeners) listener(pitch);
  }

  end(): void {
    this.listening = false;
    const ended: ListeningEnded = {
      reason: "failed",
      detail: "fake track ended",
    };
    for (const listener of this.endedListeners) listener(ended);
  }
}

// The `SessionDeps` fakes a rendered `<App>` needs to satisfy its
// now-required `sessionDeps` prop (practice.session/REQ-011, T016), plus the
// `sound`, `clock` and `visibility` fakes back out — shared by every UI
// scenario that drives sound/clock directly or inspects the visibility
// subscription (`tests/ui/scenarios/app-session.test.tsx`,
// `app-drone.test.tsx`).
export function sessionDepsWithFakes(
  sound = new FakeSound(),
  listening = new FakeListening(),
): {
  readonly sessionDeps: SessionDeps;
  readonly sound: FakeSound;
  readonly clock: FakeClock;
  readonly visibility: FakeVisibility;
  readonly listening: FakeListening;
} {
  const clock = new FakeClock(sound);
  const visibility = new FakeVisibility();
  return {
    sessionDeps: {
      sound,
      clock,
      wakeLock: new FakeWakeLock(),
      visibility,
      listening,
    },
    sound,
    clock,
    visibility,
    listening,
  };
}

// The plain `SessionDeps` alone — shared by every UI scenario that doesn't
// itself need the sound, clock or visibility fakes back out.
export function testSessionDeps(): SessionDeps {
  return sessionDepsWithFakes().sessionDeps;
}

// Builds a key's tonic from a spelling like "C", "F#" or "Bb", major unless
// the spelling carries a trailing "m" ("Em", "G#m") for a natural-minor key
// (T008 — practice.session/REQ-001/S5's scale-choice scenarios need both
// rings).
export function keyOf(spelling: string): Key {
  const match = /^([A-G])([#b]?)(m?)$/.exec(spelling);
  if (match === null) throw new Error(`invalid key letter "${spelling}"`);
  const [, letter, accidentalSymbol, minorSuffix] = match;
  const accidental: Accidental =
    accidentalSymbol === "#"
      ? "sharp"
      : accidentalSymbol === "b"
        ? "flat"
        : "natural";
  return {
    tonic: { letter: letter as NoteLetter, accidental },
    mode: minorSuffix === "m" ? "naturalMinor" : "major",
  };
}

export function variantOf(variantId: string): Variant {
  const variant = builtInCatalogue()
    .instruments.flatMap((instrument) => instrument.variants)
    .find((candidate) => candidate.variantId === variantId);
  if (variant === undefined) throw new Error(`unknown variant "${variantId}"`);
  return variant;
}

export interface SessionFixture {
  readonly session: Session;
  readonly sound: FakeSound;
  readonly clock: FakeClock;
  readonly wake: FakeWakeLock;
  readonly visibility: FakeVisibility;
  readonly listening: FakeListening;
  readonly context: SessionContext;
}

// practice.tuner/REQ-001 — the traversal a fixture gets when a scenario
// doesn't care what the run is, only that entering/leaving the tuner
// behaves: two octaves of G major updown on flute Concert, the same run
// `GMajorTwoOctaves` names in the session-transport/session-traversal
// scenarios, producing "29 notes · G4–G6".
const twoOctaveUpdownScale: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "scale",
};

export function sessionOn(
  keyLetter: string,
  variantId: string,
  traversal: Traversal = twoOctaveUpdownScale,
  settings: SessionSettings = defaultSessionSettings,
  scaleChoice: ScaleChoice = defaultScaleChoice,
  droneSettings: DroneSettings = defaultDroneSettings,
): SessionFixture {
  const sound = new FakeSound();
  const clock = new FakeClock(sound);
  const wake = new FakeWakeLock();
  const visibility = new FakeVisibility();
  const listening = new FakeListening();
  const context: SessionContext = {
    key: keyOf(keyLetter),
    variant: variantOf(variantId),
    spelling: "sharp",
  };
  const deps: SessionDeps = {
    sound,
    clock,
    wakeLock: wake,
    visibility,
    listening,
  };
  const session = createSession(
    context,
    traversal,
    scaleChoice,
    settings,
    droneSettings,
    deps,
  );
  return { session, sound, clock, wake, visibility, listening, context };
}

// Drives startDrone() through its two internal awaits (sound.start(), then
// wakeLock.acquire()) so the posted drone command and the updated snapshot
// are both visible synchronously afterwards — the same "two flushes" shape
// used by start()'s own scenario tests.
export async function startDroneAndFlush(session: Session): Promise<void> {
  session.startDrone();
  await Promise.resolve();
  await Promise.resolve();
}

// Advances `clock` in `stepMs` increments until `isDone` reports true,
// which lets a scenario land on a specific mid-playback moment (a
// position, a caption) without hand-computing frame arithmetic.
export function advanceUntil(
  clock: FakeClock,
  isDone: () => boolean,
  stepMs = 25,
  maxTotalMs = 30_000,
): void {
  let elapsed = 0;
  while (!isDone()) {
    if (elapsed >= maxTotalMs) {
      throw new Error(`advanceUntil: condition not met within ${maxTotalMs}ms`);
    }
    clock.advance(stepMs);
    elapsed += stepMs;
  }
}
