// Test doubles for practice.session's ports — SoundPort, ClockPort,
// WakeLockPort, VisibilityPort — plus a helper that wires a Session over
// them. Fakes only, never mocks asserting on internal calls
// (docs/engineering.md §7).

import type { ClockPort } from "../../src/practice/ports/clock";
import type { Result } from "../../src/practice/ports/result";
import type { SoundPort } from "../../src/practice/ports/sound";
import type { VisibilityPort } from "../../src/practice/ports/visibility";
import type { WakeLockPort } from "../../src/practice/ports/wake-lock";
import type {
  Session,
  SessionDeps,
  SessionSettings,
} from "../../src/practice/published";
import { createSession } from "../../src/practice/published";
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

type TaggedCommand = Extract<SoundCommand, { tag: number }>;

function isTaggedCommand(command: SoundCommand): command is TaggedCommand {
  return command.kind !== "stopAll";
}

export class FakeSound implements SoundPort {
  frame = 0;
  // How many times start() has been called — practice.session/REQ-010/S2
  // asserts this is 0 before the session's start() runs: no sound and no
  // permission prompt before the first gesture.
  startCalls = 0;
  readonly posted: SoundCommand[] = [];
  failWith: SoundUnavailable | null = null;
  private readonly listeners = new Set<(report: OnsetReport) => void>();

  start(): Promise<Result<void, SoundUnavailable>> {
    this.startCalls += 1;
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

  post(command: SoundCommand): void {
    this.posted.push(command);
  }

  onOnset(listener: (report: OnsetReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Reports the onset of the posted command carrying `tag`, at the frame
  // it was scheduled for. T009 exercises drift between scheduled and
  // actual frame; T008 only needs the report to exist and be reachable.
  fireOnset(tag: number): void {
    const command = this.posted
      .filter(isTaggedCommand)
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

  hide(): void {
    for (const listener of this.listeners) listener();
  }
}

// The `SessionDeps` fakes a rendered `<App>` needs to satisfy its
// now-required `sessionDeps` prop (practice.session/REQ-011, T016) — shared
// by every UI scenario that doesn't itself need to inspect the sound, clock,
// wake lock or visibility fakes (those that do build their own deps inline,
// e.g. `tests/ui/scenarios/app-session.test.tsx`).
export function testSessionDeps(): SessionDeps {
  const sound = new FakeSound();
  return {
    sound,
    clock: new FakeClock(sound),
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
  };
}

// Builds a major-key tonic from a spelling like "C", "F#" or "Bb" — every
// key these scenarios need is major (practice.session/REQ-001's traversal
// scenarios never touch minor keys).
export function keyOf(spelling: string): Key {
  const match = /^([A-G])([#b]?)$/.exec(spelling);
  if (match === null) throw new Error(`invalid key letter "${spelling}"`);
  const [, letter, accidentalSymbol] = match;
  const accidental: Accidental =
    accidentalSymbol === "#"
      ? "sharp"
      : accidentalSymbol === "b"
        ? "flat"
        : "natural";
  return {
    tonic: { letter: letter as NoteLetter, accidental },
    mode: "major",
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
}

export function sessionOn(
  keyLetter: string,
  variantId: string,
  traversal: Traversal,
  settings: SessionSettings,
): SessionFixture {
  const sound = new FakeSound();
  const clock = new FakeClock(sound);
  const wake = new FakeWakeLock();
  const visibility = new FakeVisibility();
  const deps: SessionDeps = { sound, clock, wakeLock: wake, visibility };
  const session = createSession(
    { key: keyOf(keyLetter), variant: variantOf(variantId) },
    traversal,
    settings,
    deps,
  );
  return { session, sound, clock, wake, visibility };
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
