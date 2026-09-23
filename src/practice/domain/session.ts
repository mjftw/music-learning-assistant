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

// Structural equality for the transport (T032) — `advance()` always returns
// a fresh object, so `notifyChange()`'s material-change check compares its
// fields, not its identity.
function transportEqual(a: TransportState, b: TransportState): boolean {
  switch (a.kind) {
    case "idle":
      return b.kind === "idle";
    case "countingIn":
      return b.kind === "countingIn" && a.beatsLeft === b.beatsLeft;
    case "resting":
      return b.kind === "resting" && a.beatsLeft === b.beatsLeft;
    case "playing":
      return b.kind === "playing" && a.position === b.position;
  }
}

// The fields a listener can actually observe (T032) — everything else on
// `SessionSnapshot` (effectiveOctaves, fittingCounts, sequence, summaryLine,
// tempoTerm) is derived from `settings`/`traversal`/`run`, already compared
// here, so it can never disagree without one of these disagreeing too.
// `settings`, `traversal` and `run` compare by reference: each is only ever
// reassigned by `setSettings`/`setTraversal`/`recompute()`, never mutated in
// place, so a changed reference always means a real change and an unchanged
// one always means none.
function snapshotsMateriallyEqual(
  a: SessionSnapshot,
  b: SessionSnapshot,
): boolean {
  return (
    transportEqual(a.transport, b.transport) &&
    a.soundingPosition === b.soundingPosition &&
    a.caption === b.caption &&
    a.progress === b.progress &&
    a.notice === b.notice &&
    a.settings === b.settings &&
    a.traversal === b.traversal &&
    a.run === b.run
  );
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
  // Identifies which run a playing tick's tag belongs to (`positionTag`,
  // below) — -1 is a pre-run sentinel, never itself used as a tag: bumped
  // to 0 by the very first start(), and again by every later start() or
  // restartIfPlaying(), so no two runs (including across a stop→start
  // cycle, not only a REQ-007 restart) ever share a generation. The
  // highlight no longer consults it (T031: the highlight timer is
  // authoritative) — it survives purely to label the `SoundCommand.tag` a
  // run's `OnsetReport`s carry back, so the timing harness's own
  // `window.__sound.onOnset` subscription can tell which run (and
  // position) a report belongs to.
  let generation = -1;
  // Cancel functions for every highlight timer not yet fired — stop(),
  // restartIfPlaying(), dispose() and the idle transition (T031: the end of
  // a non-looping run) clear this wholesale so a timer for a superseded (or
  // finished) run never fires after its session has moved on (the gap
  // T009's review carried and T023 only closed by deleting the feature).
  const pendingHighlightCancels = new Set<() => void>();
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

  // `snapshot()` caches its last build, invalidated by `invalidateSnapshot()`
  // wherever anything it reads might have changed (T032). Two calls with no
  // invalidation in between return the identical object — so a consumer
  // that calls `snapshot()` twice for the same beat (once from
  // `onTargetAdvanced`, once from `onChange` — see `applyTargetAdvance`,
  // below) and stores it with a reference-equality bail-out (e.g. React's
  // `useState`) renders once, not twice.
  let cachedSnapshot: SessionSnapshot | null = null;

  function invalidateSnapshot(): void {
    cachedSnapshot = null;
  }

  // The last snapshot a listener was actually notified with — `notifyChange`
  // compares this against the current one and only calls `changeListeners`
  // when a UI-visible field disagrees (T032): the scheduler's lookahead
  // poll calls `next()` well ahead of an onset, often with nothing to show
  // for it yet, and every call used to notify regardless.
  let lastNotified: SessionSnapshot | null = null;

  function notifyChange(): void {
    const current = snapshot();
    if (
      lastNotified !== null &&
      snapshotsMateriallyEqual(current, lastNotified)
    ) {
      return;
    }
    lastNotified = current;
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

  // A playing tick's tag packs the run's generation with the sequence
  // position: generation · GENERATION_TAG_MULTIPLIER + position — for the
  // timing harness to decode from the resulting `OnsetReport` (T031: the
  // session itself no longer reads its own tags back). Sequence positions
  // are always comfortably under the multiplier (the longest catalogued
  // traversal is far short of 1_000 notes) and it stays well under
  // CLICK_TAG_BASE, so a position tag and a click tag never collide.
  const GENERATION_TAG_MULTIPLIER = 1_000;

  function positionTag(position: number): number {
    if (position >= GENERATION_TAG_MULTIPLIER) {
      throw new Error(
        `unreachable: sequence position ${position} exceeds the tag encoding's capacity`,
      );
    }
    return generation * GENERATION_TAG_MULTIPLIER + position;
  }

  // The single source of "a position is now sounding" — reached only from
  // the highlight timer aimed at the tick's own scheduled onset
  // (`scheduleHighlight`, below). The timer is authoritative (T031): the
  // worklet's cross-thread `OnsetReport` never reaches here — it feeds only
  // the timing harness's own `window.__sound.onOnset` subscription, so the
  // highlight lands at the audible instant rather than whenever that
  // message happens to arrive. `sequence` is read live, not captured, so a
  // timer belonging to the current run always resolves to the position's
  // current note; a timer belonging to a superseded run can never reach
  // here at all — `cancelPendingHighlights()` cancels it outright at
  // stop(), restartIfPlaying(), dispose() and the idle transition, below.
  function applyTargetAdvance(position: number, atFrame: number): void {
    const target = sequence[position];
    if (target === undefined) return;
    invalidateSnapshot();
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

  // Schedules the highlight for a playing tick's tagged position at its own
  // *audible* onset — a `ClockPort` timeout, aimed at the graph onset plus
  // the port's output latency so it lands when the note is actually heard,
  // not merely when it was scheduled (T030).
  function scheduleHighlight(position: number, onsetFrame: number): void {
    const framesUntilOnset = onsetFrame - sound.currentFrame();
    const msUntilOnset = Math.max(
      0,
      (framesUntilOnset * 1000) / sound.sampleRate() + sound.outputLatencyMs(),
    );
    const cancel = clock.setTimeout(() => {
      pendingHighlightCancels.delete(cancel);
      applyTargetAdvance(position, onsetFrame);
    }, msUntilOnset);
    pendingHighlightCancels.add(cancel);
  }

  function cancelPendingHighlights(): void {
    for (const cancel of pendingHighlightCancels) cancel();
    pendingHighlightCancels.clear();
  }

  const unsubscribeVisibility = visibility.onHidden(() => {
    stop();
  });

  function next(onsetFrame: number): TickPlan | null {
    invalidateSnapshot();
    if (pendingAdvance) {
      transport = advance(transport, currentSettings, sequence.length);
    }
    pendingAdvance = true;

    if (transport.kind === "idle") {
      // A non-looping run's last tick already scheduled its own highlight
      // timer, aimed at its audible onset — ordinarily long past by the
      // time the lookahead scheduler catches up to discover there is no
      // tick after it (T031). Cancelling here is a defensive backstop, not
      // how the last note gets highlighted: it only ever removes a timer
      // that failed to fire on its own, never a live one still due.
      wakeLock.release();
      soundingPosition = null;
      cancelPendingHighlights();
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
      // Count-in and rest beats have no later highlight-fire event to
      // notify from — a click tick never schedules one below — so this is
      // the only point that can carry the beatsLeft countdown to a
      // listener, once per beat (T032).
      notifyChange();
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
          tag: positionTag(position),
          hz: pitchHzOf(target.note),
          onsetFrame,
          durationFrames,
        });
        positionTagged = true;
      }

      if (tick.click !== null) {
        commands.push({
          kind: "click",
          tag: positionTagged ? nextClickTag() : positionTag(position),
          accent: tick.click.accent,
          onsetFrame,
        });
        positionTagged = true;
      }

      // No notifyChange() here: this branch only posts commands, up to
      // LOOKAHEAD_MS ahead of the beat's audible onset — `scheduleHighlight`
      // → `applyTargetAdvance` is the sole notifier for a playing beat, so
      // a listener hears about it once, at the audible instant, not once
      // per lookahead poll (T032).
      if (positionTagged) scheduleHighlight(position, onsetFrame);
    }

    return { commands, durationFrames };
  }

  function buildSnapshot(): SessionSnapshot {
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

  function snapshot(): SessionSnapshot {
    if (cachedSnapshot === null) cachedSnapshot = buildSnapshot();
    return cachedSnapshot;
  }

  function start(): void {
    invalidateSnapshot();
    notice = null;
    // Wrap generation at 1_000: stale reports from 1_000 runs ago cannot exist
    // (they arrive within milliseconds), so wrapping is safe and keeps
    // position tags below CLICK_TAG_BASE (1_000_000).
    generation = (generation + 1) % 1_000;
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
      invalidateSnapshot();
      notifyChange();
    })();
  }

  function stop(): void {
    invalidateSnapshot();
    scheduler.stop();
    cancelPendingHighlights();
    sound.post({ kind: "stopAll" });
    transport = { kind: "idle" };
    soundingPosition = null;
    wakeLock.release();
    notifyChange();
  }

  function restartIfPlaying(): void {
    if (transport.kind !== "playing") return;
    invalidateSnapshot();
    // The superseded sequence's tones and clicks already posted inside the
    // scheduler's lookahead window must never sound (REQ-007/S1) — silence
    // them, then rebuild the schedule anchored at the current frame rather
    // than wherever the old sequence's lookahead had already reached, so
    // the new sequence's first note begins at once.
    sound.post({ kind: "stopAll" });
    scheduler.stop();
    cancelPendingHighlights();
    // Wrap generation at 1_000: stale reports from 1_000 runs ago cannot exist
    // (they arrive within milliseconds), so wrapping is safe and keeps
    // position tags below CLICK_TAG_BASE (1_000_000).
    generation = (generation + 1) % 1_000;
    transport = { kind: "playing", position: 0 };
    pendingAdvance = false;
    soundingPosition = null;
    scheduler.start(sound.currentFrame() + firstTickLeadFrames(), next);
  }

  function setContext(newContext: SessionContext): void {
    invalidateSnapshot();
    currentContext = newContext;
    recompute();
    restartIfPlaying();
    notifyChange();
  }

  function setTraversal(newTraversal: Traversal): void {
    invalidateSnapshot();
    currentTraversal = newTraversal;
    recompute();
    restartIfPlaying();
    notifyChange();
  }

  function setSettings(newSettings: SessionSettings): void {
    invalidateSnapshot();
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
    cancelPendingHighlights();
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
