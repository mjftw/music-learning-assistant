// The session aggregate — practice.session/REQ-001, REQ-002, REQ-007. Holds
// the traversal, the transport and everything derived from them, drives the
// lookahead scheduler over SoundPort, and notifies listeners of every
// change. Pure domain logic (transport.ts, settings.ts, tempo.ts) stays
// pure; this is the imperative shell around it (docs/engineering.md §2).

import type {
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type {
  Key,
  KeyViewNote,
  Note,
  OctaveCount,
  Octaves,
  SequenceNote,
  Traversal,
  Variant,
} from "../../theory/published";
import {
  effectiveOctavesOf,
  fittingOctaveCounts,
  noteLabel,
  pitchHzOf,
  runOf,
  sequenceOf,
} from "../../theory/published";
import type { TickPlan } from "../adapters/lookahead-scheduler";
import { createLookaheadScheduler } from "../adapters/lookahead-scheduler";
import type { ClockPort } from "../ports/clock";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";
import type { VisibilityPort } from "../ports/visibility";
import type { WakeLockPort } from "../ports/wake-lock";
import type { SessionSettings } from "./settings";
import { summaryLineOf } from "./settings";
import type { TempoTerm } from "./tempo";
import { tempoTermFor } from "./tempo";
import type { TransportState } from "./transport";
import { advance, startTransport, tickOf } from "./transport";

export interface SessionContext {
  readonly key: Key;
  readonly variant: Variant;
}

export interface SessionDeps {
  readonly sound: SoundPort;
  readonly clock: ClockPort;
  readonly wakeLock: WakeLockPort;
  readonly visibility: VisibilityPort;
}

export interface TargetAdvanced {
  readonly note: Note;
  readonly position: number;
  readonly length: number;
  readonly atFrame: number;
}

export interface SessionSnapshot {
  readonly transport: TransportState;
  readonly traversal: Traversal;
  readonly effectiveOctaves: Octaves;
  readonly fittingCounts: readonly OctaveCount[];
  readonly settings: SessionSettings;
  readonly run: readonly KeyViewNote[];
  readonly sequence: readonly SequenceNote[];
  readonly caption: string;
  readonly progress: number;
  readonly summaryLine: string;
  readonly tempoTerm: TempoTerm;
  readonly soundingPosition: number | null;
  readonly notice: "sound-unavailable" | null;
}

export interface Session {
  snapshot(): SessionSnapshot;
  start(): void;
  stop(): void;
  setContext(context: SessionContext): void;
  setTraversal(traversal: Traversal): void;
  setSettings(settings: SessionSettings): void;
  onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void;
  onChange(listener: () => void): () => void;
  dispose(): void;
}

// Click tags run from 1_000_000 up so they never collide with a tone's tag
// (a sequence position, always small).
const CLICK_TAG_BASE = 1_000_000;

// practice.session/REQ-008 — the very first tick of a run (a fresh start()
// or a REQ-007 restart) is scheduled this many milliseconds after
// `sound.currentFrame()`, not at it: the audio thread's first renders lag
// right after the worklet node is created, so an onset scheduled exactly at
// the current frame arrives a few quanta late. Every later tick in the same
// run is anchored to the one before it (`durationFrames`, not
// `sound.currentFrame()`), so only the first ever needs the lead. A human
// hears 20 ms as "at once" (REQ-002/S1's count-in and REQ-003/S3's "straight
// in" both stay true).
export const FIRST_TICK_LEAD_MS = 20;

function captionOf(
  transport: TransportState,
  run: readonly KeyViewNote[],
  sequence: readonly SequenceNote[],
  soundingPosition: number | null,
): string {
  switch (transport.kind) {
    case "idle": {
      const first = run[0];
      const last = run[run.length - 1];
      if (first === undefined || last === undefined) return "";
      return `${sequence.length} notes · ${noteLabel(first.note)}–${noteLabel(last.note)}`;
    }
    case "countingIn":
      return `COUNT IN · ${transport.beatsLeft}`;
    case "resting":
      return `REST · ${transport.beatsLeft}`;
    case "playing": {
      if (soundingPosition === null) return "";
      const sounding = sequence[soundingPosition];
      if (sounding === undefined) return "";
      return `${noteLabel(sounding.note)} · ${soundingPosition + 1} of ${sequence.length}`;
    }
  }
}

export function createSession(
  context: SessionContext,
  traversal: Traversal,
  settings: SessionSettings,
  deps: SessionDeps,
): Session {
  const { sound, clock, wakeLock, visibility } = deps;
  const scheduler = createLookaheadScheduler(sound, clock);

  let currentContext = context;
  let currentTraversal = traversal;
  let currentSettings = settings;
  let transport: TransportState = { kind: "idle" };
  let soundingPosition: number | null = null;
  let notice: "sound-unavailable" | null = null;
  let clickCounter = 0;
  // Whether `transport` needs to move on to the state after it before the
  // next tick is built. false right after start() (or a restart) — the
  // very next tick uses `transport` as it stands, not the one after it —
  // and true once that tick has been posted, so the observable transport
  // (what snapshot() reports) always reflects the tick most recently
  // posted, never one it has already stepped past.
  let pendingAdvance = false;

  let run: readonly KeyViewNote[] = [];
  let sequence: readonly SequenceNote[] = [];
  let effectiveOctaves: Octaves = { kind: "full" };
  let fittingCounts: readonly OctaveCount[] = [];

  const changeListeners = new Set<() => void>();
  const targetAdvancedListeners = new Set<(event: TargetAdvanced) => void>();

  function recompute(): void {
    run = runOf(currentContext.key, currentContext.variant, currentTraversal);
    sequence = sequenceOf(run, currentTraversal.direction);
    effectiveOctaves = effectiveOctavesOf(
      currentContext.key,
      currentContext.variant,
      currentTraversal.octaves,
    );
    fittingCounts = fittingOctaveCounts(
      currentContext.key,
      currentContext.variant,
    );
  }

  recompute();

  function notifyChange(): void {
    for (const listener of changeListeners) listener();
  }

  // Every tick is one beat — practice.session/REQ-004: "one note per beat
  // (every note is a crotchet)".
  function tickFramesOf(): number {
    return Math.round((60 * sound.sampleRate()) / currentSettings.tempoBpm);
  }

  // REQ-008 — see FIRST_TICK_LEAD_MS above.
  function firstTickLeadFrames(): number {
    return Math.round((FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000);
  }

  function nextClickTag(): number {
    const tag = CLICK_TAG_BASE + clickCounter;
    clickCounter += 1;
    return tag;
  }

  // The single source of "a position is now sounding" — reached either from
  // the onset report of whichever command carried that position's tag, or
  // (REQ-005/S2) from a timer for a tick with nothing to sound at all.
  // `sequence` is read live, not captured, so a stale report arriving after
  // a restart (REQ-007) still resolves to the position's current note.
  function applyTargetAdvance(position: number, atFrame: number): void {
    const target = sequence[position];
    if (target === undefined) return;
    soundingPosition = position;
    const advancedEvent: TargetAdvanced = {
      note: target.note,
      position,
      length: sequence.length,
      atFrame,
    };
    for (const listener of targetAdvancedListeners) listener(advancedEvent);
    notifyChange();
  }

  const unsubscribeOnset = sound.onOnset((report) => {
    // A position tag (< CLICK_TAG_BASE) is the tag of the sequence position
    // it belongs to; a click's own tag (count-in, rest bar, or a click that
    // merely accompanies an already-tagged tone) carries nothing to apply.
    if (report.tag >= CLICK_TAG_BASE) return;
    applyTargetAdvance(report.tag, report.actualFrame);
  });

  const unsubscribeVisibility = visibility.onHidden(() => {
    stop();
  });

  function next(onsetFrame: number): TickPlan | null {
    if (pendingAdvance) {
      transport = advance(transport, currentSettings, sequence.length);
    }
    pendingAdvance = true;

    if (transport.kind === "idle") {
      wakeLock.release();
      soundingPosition = null;
      notifyChange();
      return null;
    }

    const tick = tickOf(transport, currentSettings);
    const durationFrames = tickFramesOf();
    const commands: SoundCommand[] = [];

    if (transport.kind !== "playing") {
      // Count-in and rest bar: click only, never a position — REQ-006/S3,
      // nothing highlighted while idle or counting.
      soundingPosition = null;
      if (tick.click !== null) {
        commands.push({
          kind: "click",
          tag: nextClickTag(),
          accent: tick.click.accent,
          onsetFrame,
        });
      }
    } else {
      const position = transport.position;
      // The tick's first sounding command carries the position's tag; any
      // second command (a click alongside a tone) gets an ordinary click
      // tag so only one onset resolves this position. With every note a
      // crotchet, a playing tick always sounds a tone (soundMode notes or
      // both) or a click (soundMode both or metronome) — never neither —
      // so every position is always tagged by one of the two below.
      let positionTagged = false;

      if (tick.tonePosition !== null) {
        const target = sequence[tick.tonePosition];
        if (target === undefined) {
          throw new Error("unreachable: tonePosition out of range");
        }
        commands.push({
          kind: "tone",
          tag: position,
          hz: pitchHzOf(target.note),
          onsetFrame,
          durationFrames,
        });
        positionTagged = true;
      }

      if (tick.click !== null) {
        commands.push({
          kind: "click",
          tag: positionTagged ? nextClickTag() : position,
          accent: tick.click.accent,
          onsetFrame,
        });
        positionTagged = true;
      }
    }

    notifyChange();

    return { commands, durationFrames };
  }

  function snapshot(): SessionSnapshot {
    return {
      transport,
      traversal: currentTraversal,
      effectiveOctaves,
      fittingCounts,
      settings: currentSettings,
      run,
      sequence,
      caption: captionOf(transport, run, sequence, soundingPosition),
      progress:
        soundingPosition !== null && transport.kind === "playing"
          ? (soundingPosition + 1) / sequence.length
          : 0,
      summaryLine: summaryLineOf(
        currentTraversal,
        effectiveOctaves,
        currentSettings,
      ),
      tempoTerm: tempoTermFor(currentSettings.tempoBpm),
      soundingPosition,
      notice,
    };
  }

  function start(): void {
    notice = null;
    transport = startTransport(currentSettings);
    pendingAdvance = false;
    soundingPosition = null;
    notifyChange();

    void (async () => {
      // REQ-010: a returned `{ ok: false }` and a thrown/rejected
      // sound.start() (T025 — a last-resort backstop; every real SoundPort
      // is typed never to throw, but a broken adapter must not leave the
      // session stuck at "countingIn 4" forever) both mean "sound cannot be
      // produced" — either way the notice is raised and the walk-through
      // still starts, on the fake's own clock. try/catch here (rather than
      // sound.start().catch(...)) keeps the success path's microtask timing
      // unchanged — an extra `.catch()` link on the promise chain would add
      // a microtask hop even when start() resolves, throwing off the fixed
      // "two flushes" other scenario tests rely on.
      let result: Result<void, SoundUnavailable>;
      try {
        result = await sound.start();
      } catch (cause) {
        result = {
          ok: false,
          error: { reason: "no-audio-context", detail: String(cause) },
        };
      }
      if (!result.ok) notice = "sound-unavailable";
      await wakeLock.acquire();
      scheduler.start(sound.currentFrame() + firstTickLeadFrames(), next);
      notifyChange();
    })();
  }

  function stop(): void {
    scheduler.stop();
    sound.post({ kind: "stopAll" });
    transport = { kind: "idle" };
    soundingPosition = null;
    wakeLock.release();
    notifyChange();
  }

  function restartIfPlaying(): void {
    if (transport.kind !== "playing") return;
    // The superseded sequence's tones and clicks already posted inside the
    // scheduler's lookahead window must never sound (REQ-007/S1) — silence
    // them, then rebuild the schedule anchored at the current frame rather
    // than wherever the old sequence's lookahead had already reached, so
    // the new sequence's first note begins at once.
    sound.post({ kind: "stopAll" });
    scheduler.stop();
    transport = { kind: "playing", position: 0 };
    pendingAdvance = false;
    soundingPosition = null;
    scheduler.start(sound.currentFrame() + firstTickLeadFrames(), next);
  }

  function setContext(newContext: SessionContext): void {
    currentContext = newContext;
    recompute();
    restartIfPlaying();
    notifyChange();
  }

  function setTraversal(newTraversal: Traversal): void {
    currentTraversal = newTraversal;
    recompute();
    restartIfPlaying();
    notifyChange();
  }

  function setSettings(newSettings: SessionSettings): void {
    currentSettings = newSettings;
    notifyChange();
  }

  function onTargetAdvanced(
    listener: (event: TargetAdvanced) => void,
  ): () => void {
    targetAdvancedListeners.add(listener);
    return () => targetAdvancedListeners.delete(listener);
  }

  function onChange(listener: () => void): () => void {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
  }

  function dispose(): void {
    scheduler.stop();
    unsubscribeOnset();
    unsubscribeVisibility();
    sound.dispose();
    changeListeners.clear();
    targetAdvancedListeners.clear();
  }

  return {
    snapshot,
    start,
    stop,
    setContext,
    setTraversal,
    setSettings,
    onTargetAdvanced,
    onChange,
    dispose,
  };
}
