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
  Scale,
  SequenceNote,
  Shape,
  SpelledScale,
  Traversal,
  Variant,
} from "../../theory/published";
import {
  effectiveOctavesOf,
  fittingOctaveCounts,
  noteLabel,
  pitchHzOf,
  pitchPosition,
  scaleById,
  spelledScaleOf,
  traversalOf,
} from "../../theory/published";
import type { TickPlan } from "../adapters/lookahead-scheduler";
import { createLookaheadScheduler } from "../adapters/lookahead-scheduler";
import type { ClockPort } from "../ports/clock";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";
import type { VisibilityPort } from "../ports/visibility";
import type { WakeLockPort } from "../ports/wake-lock";
import type { DroneSettings, DroneSound } from "./drone";
import { canStepDroneOctave, droneNoteOf } from "./drone";
import type { ScaleChoice } from "./scale-choice";
import { chosenScaleIdFor } from "./scale-choice";
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

// practice.drone/REQ-001, REQ-005 — the drone's own observable state: the
// note it holds (the key's tonic at its resolved octave), whether it is
// currently sounding, its chosen sound, and whether − / + still have room
// to move it (practice.drone/REQ-002, wired by a later task).
export interface DroneSnapshot {
  readonly on: boolean;
  readonly note: Note;
  readonly hz: number;
  readonly settings: DroneSettings;
  readonly canStepDown: boolean;
  readonly canStepUp: boolean;
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
  readonly scale: Scale;
  readonly spelledScale: SpelledScale;
  readonly scaleChoice: ScaleChoice;
  readonly effectiveShape: Shape;
  readonly drone: DroneSnapshot;
}

export interface Session {
  snapshot(): SessionSnapshot;
  start(): void;
  stop(): void;
  setContext(context: SessionContext): void;
  setTraversal(traversal: Traversal): void;
  setScaleChoice(choice: ScaleChoice): void;
  setSettings(settings: SessionSettings): void;
  startDrone(): void;
  stopDrone(): void;
  stepDroneOctave(delta: -1 | 1): void;
  setDroneSound(sound: DroneSound): void;
  onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void;
  onChange(listener: () => void): () => void;
  dispose(): void;
}

// Click tags run from 1_000_000 up so they never collide with a tone's tag
// (a sequence position, always small).
const CLICK_TAG_BASE = 1_000_000;

// Drone tags run from 3_000_000 up, one per drone voice — a crossfade
// (setDroneSound while sounding) briefly holds two live voices (the old
// one releasing, the new one attacking), so each needs its own tag; well
// clear of CLICK_TAG_BASE and never colliding with a position tag.
const DRONE_TAG_BASE = 3_000_000;

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

// practice.session/REQ-006 — the highlight timer's aim is trimmed by this
// many ms. The browser's `outputLatency` is only an estimate and tends to
// run high (on the laptop, `latencyHint: "playback"` alone put the
// highlight 44 ms *after* the audible onset), and painting the highlight
// itself costs another 10–25 ms on a phone — so the timer aims 20 ms ahead
// of the audible onset it is chasing. Sound must never precede the
// highlight; a lead this small is imperceptible.
export const HIGHLIGHT_LEAD_MS = 20;

// practice.drone/REQ-001 — mirrors `RELEASE_S` in src/sound/src/drone.rs:
// how long a stopped drone voice takes to fade to true silence. Exported so
// a later task can schedule around it (e.g. REQ-004's ▶ waiting for the
// drone to fall silent before the first click or note sounds).
export const DRONE_RELEASE_MS = 80;

// The run's extremes by pitch, not by array position (T008) — a
// written-out split-direction run (e.g. classical melodic minor's ↑↓,
// REQ-012/S6) ends on the tonic it started on, so `run[0]`/`run[last]`
// would both be the tonic instead of the run's actual lowest and highest
// note.
function extremesOf(
  run: readonly KeyViewNote[],
): { readonly lowest: KeyViewNote; readonly highest: KeyViewNote } | null {
  const [first, ...rest] = run;
  if (first === undefined) return null;
  let lowest = first;
  let highest = first;
  for (const note of rest) {
    if (pitchPosition(note.note) < pitchPosition(lowest.note)) lowest = note;
    if (pitchPosition(note.note) > pitchPosition(highest.note)) highest = note;
  }
  return { lowest, highest };
}

function captionOf(
  transport: TransportState,
  run: readonly KeyViewNote[],
  sequence: readonly SequenceNote[],
  soundingPosition: number | null,
): string {
  switch (transport.kind) {
    case "idle": {
      const extremes = extremesOf(run);
      if (extremes === null) return "";
      return `${sequence.length} notes · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
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
// tempoTerm, scale, spelledScale, effectiveShape) is derived from
// `settings`/`traversal`/`run`/`scaleChoice`, already compared here, so it
// can never disagree without one of these disagreeing too. `settings`,
// `traversal`, `run` and `scaleChoice` compare by reference: each is only
// ever reassigned by `setSettings`/`setTraversal`/`setScaleChoice`/
// `recompute()`, never mutated in place, so a changed reference always
// means a real change and an unchanged one always means none.
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
    a.run === b.run &&
    a.scaleChoice === b.scaleChoice &&
    a.drone.on === b.drone.on &&
    noteLabel(a.drone.note) === noteLabel(b.drone.note) &&
    a.drone.settings === b.drone.settings
  );
}

export function createSession(
  context: SessionContext,
  traversal: Traversal,
  scaleChoice: ScaleChoice,
  settings: SessionSettings,
  droneSettings: DroneSettings,
  deps: SessionDeps,
): Session {
  const { sound, clock, wakeLock, visibility } = deps;
  const scheduler = createLookaheadScheduler(sound, clock);

  let currentContext = context;
  let currentTraversal = traversal;
  let currentScaleChoice = scaleChoice;
  let currentSettings = settings;
  let currentDroneSettings = droneSettings;
  let transport: TransportState = { kind: "idle" };
  let soundingPosition: number | null = null;
  let notice: "sound-unavailable" | null = null;
  let clickCounter = 0;
  // The live drone voice's tag, or null while the drone is off — needed by
  // stopDrone() (to release it) and setDroneSound() (to release the
  // superseded voice on a crossfade).
  let droneTag: number | null = null;
  let droneCounter = 0;
  let droneOn = false;
  // Bumped by both startDrone() and stopDrone() — a pending startDrone()
  // compares this after its awaits and posts nothing if it no longer
  // matches, so a stop() (or a second startDrone()) that lands while the
  // first is still resolving its sound.start()/wakeLock.acquire() promises
  // is never overridden by a stale post arriving after it.
  let droneGeneration = 0;
  // Identifies which run a playing tick's tag belongs to (`positionTag`,
  // below) — -1 is a pre-run sentinel, never itself used as a tag: bumped
  // to 0 by the very first start(), and again by every later start() or
  // restartIfPlaying(), so no two runs (including across a stop→start
  // cycle, not only a REQ-007 restart) ever share a generation. The
  // highlight no longer consults it (T031: the highlight timer is
  // authoritative) — it survives purely to label the `SoundCommand.tag` a
  // run's `OnsetReport`s carry back, identifying which run and position a
  // report belongs to, for anyone reading the reports themselves.
  let generation = -1;
  // Cancel functions for every highlight timer not yet fired — stop(),
  // restartIfPlaying(), dispose() and the idle transition (T031: the end of
  // a non-looping run) clear this wholesale so a timer for a superseded (or
  // finished) run never fires after its session has moved on (the gap
  // T009's review carried and T023 only closed by deleting the feature).
  const pendingHighlightCancels = new Set<() => void>();
  // Cancel for the pending idle-transition timer (T033) — armed only while
  // a non-looping run's last tick is still sounding, so the transport stays
  // "playing" at the last position (and its own highlight still fires) right
  // up until that note's audible end, instead of going idle as soon as the
  // scheduler's lookahead discovers there is no tick after it. Cleared
  // wherever a live run can be superseded or torn down before it fires.
  let cancelIdle: (() => void) | null = null;
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
  let scale: Scale = scaleById(
    chosenScaleIdFor(currentScaleChoice, currentContext.key.mode),
  );
  let spelledScale: SpelledScale = spelledScaleOf(currentContext.key, scale);
  // The shape actually traversed (REQ-012): the traversal's stored shape,
  // except arpeggio falls back to scale for a scale the catalogue does not
  // mark as offering one — the stored traversal itself never changes, only
  // what recompute() derives from it.
  let effectiveShape: Shape = currentTraversal.shape;
  // practice.drone/REQ-001, REQ-002 — the tonic at its resolved octave;
  // recomputed alongside everything else `recompute()` derives from the
  // context.
  let droneNote: Note = droneNoteOf(
    currentContext.key,
    currentContext.variant,
    currentDroneSettings,
  );

  const changeListeners = new Set<() => void>();
  const targetAdvancedListeners = new Set<(event: TargetAdvanced) => void>();

  function recompute(): void {
    scale = scaleById(
      chosenScaleIdFor(currentScaleChoice, currentContext.key.mode),
    );
    effectiveShape = scale.offersArpeggio ? currentTraversal.shape : "scale";
    const traversalNotes = traversalOf(
      currentContext.key,
      currentContext.variant,
      scale,
      { ...currentTraversal, shape: effectiveShape },
    );
    run = traversalNotes.run;
    sequence = traversalNotes.sequence;
    effectiveOctaves = effectiveOctavesOf(
      currentContext.key,
      currentContext.variant,
      scale,
      currentTraversal.octaves,
    );
    fittingCounts = fittingOctaveCounts(
      currentContext.key,
      currentContext.variant,
      scale,
    );
    spelledScale = spelledScaleOf(currentContext.key, scale);
    droneNote = droneNoteOf(
      currentContext.key,
      currentContext.variant,
      currentDroneSettings,
    );
  }

  recompute();

  // practice.drone/REQ-002, REQ-003 — every path that recomputes the drone's
  // note (setContext, setTraversal, setScaleChoice, stepDroneOctave) shares
  // this one comparison, so the retune rule is enforced in a single place
  // rather than repeated at each call site: if the drone sounds and its hz
  // actually changed, glide the live voice to it; a respelling (F# → Gb)
  // changes the note's label only — same pitchPosition, same hz — so it
  // posts nothing.
  function recomputeAndRetune(): void {
    const previousHz = pitchHzOf(droneNote);
    recompute();
    if (droneOn && droneTag !== null) {
      const newHz = pitchHzOf(droneNote);
      if (newHz !== previousHz) {
        sound.post({ kind: "retune", tag: droneTag, hz: newHz });
      }
    }
  }

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

  function nextDroneTag(): number {
    const tag = DRONE_TAG_BASE + droneCounter;
    droneCounter += 1;
    return tag;
  }

  // A playing tick's tag packs the run's generation with the sequence
  // position: generation · GENERATION_TAG_MULTIPLIER + position — the tag
  // that labels the resulting `OnsetReport` for anyone reading it (T031:
  // the session itself no longer reads its own tags back). Sequence
  // positions are always comfortably under the multiplier (the longest
  // catalogued traversal is far short of 1_000 notes) and it stays well
  // under CLICK_TAG_BASE, so a position tag and a click tag never collide.
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
  // not merely when it was scheduled (T030), less HIGHLIGHT_LEAD_MS: the
  // browser's `outputLatency` is an estimate that tends to run high, and
  // paint adds 10–25 ms on a phone, so the timer aims 20 ms ahead of the
  // audible onset — sound must never precede the highlight; a lead this
  // small is imperceptible.
  function scheduleHighlight(position: number, onsetFrame: number): void {
    const framesUntilOnset = onsetFrame - sound.currentFrame();
    const msUntilOnset = Math.max(
      0,
      (framesUntilOnset * 1000) / sound.sampleRate() +
        sound.outputLatencyMs() -
        HIGHLIGHT_LEAD_MS,
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

  // Arms the idle transition (T033) for a non-looping run that has just
  // played its last tick — `endFrame` is that tick's audible end
  // (`lastOnsetFrame + lastTickFrames`), which is exactly the onset the
  // lookahead scheduler hands `next()` for the tick it now finds does not
  // exist (`nextOnset` in lookahead-scheduler.ts is carried forward tick by
  // tick as `onset + durationFrames`). The delay mirrors `scheduleHighlight`
  // above: frames to go, converted to ms, plus the port's output latency —
  // so the transition lands when the note is actually heard to end, not
  // merely when the scheduler's lookahead ran out of ticks to build
  // (ordinarily ~200 ms earlier, well before a slow port's output latency
  // has even elapsed).
  function armIdleTimer(endFrame: number): void {
    const framesUntilEnd = endFrame - sound.currentFrame();
    const msUntilEnd = Math.max(
      0,
      (framesUntilEnd * 1000) / sound.sampleRate() + sound.outputLatencyMs(),
    );
    cancelIdle = clock.setTimeout(() => {
      cancelIdle = null;
      invalidateSnapshot();
      transport = { kind: "idle" };
      soundingPosition = null;
      cancelPendingHighlights();
      releaseWakeLockIfSilent();
      notifyChange();
    }, msUntilEnd);
  }

  function cancelIdleTimer(): void {
    cancelIdle?.();
    cancelIdle = null;
  }

  // practice.drone/REQ-004 — the wake lock is shared between playback and
  // the drone: it is released only when neither remains, so stop(), the
  // idle transition and stopDrone() all funnel through this one check
  // rather than each deciding on its own.
  function releaseWakeLockIfSilent(): void {
    if (transport.kind === "idle" && !droneOn) wakeLock.release();
  }

  const unsubscribeVisibility = visibility.onHidden(() => {
    stop();
  });

  function next(onsetFrame: number): TickPlan | null {
    invalidateSnapshot();
    const advanced = pendingAdvance
      ? advance(transport, currentSettings, sequence.length)
      : transport;
    pendingAdvance = true;

    if (advanced.kind === "idle") {
      // Looping is off and there is no tick after the one `transport` still
      // holds (its last position) — the run is not over until that tick's
      // own audible end, so `transport` is deliberately left as it is
      // (snapshot() keeps reporting "playing" at the last position, with
      // its caption) and the idle transition is armed on a timer rather
      // than made now. The scheduler still stops immediately: there is no
      // further tick to build.
      armIdleTimer(onsetFrame);
      return null;
    }
    transport = advanced;

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
        effectiveShape,
        currentSettings,
      ),
      tempoTerm: tempoTermFor(currentSettings.tempoBpm),
      soundingPosition,
      notice,
      scale,
      spelledScale,
      scaleChoice: currentScaleChoice,
      effectiveShape,
      drone: {
        on: droneOn,
        note: droneNote,
        hz: pitchHzOf(droneNote),
        settings: currentDroneSettings,
        canStepDown: canStepDroneOctave(droneNote, -1),
        canStepUp: canStepDroneOctave(droneNote, 1),
      },
    };
  }

  function snapshot(): SessionSnapshot {
    if (cachedSnapshot === null) cachedSnapshot = buildSnapshot();
    return cachedSnapshot;
  }

  // Turns a settled sound.start() outcome into the notice, shared by
  // start() and startDrone() (REQ-010, practice.drone/REQ-008) — a plain
  // synchronous function, not itself awaited, so lifting it out of both
  // adds no microtask hop of its own: the `await sound.start()` (with its
  // try/catch, below) stays written inline in each caller, because a
  // *shared* async wrapper around it would add one — an async function
  // call's own promise needs a tick beyond the one its inner `await`
  // already spends, so a caller awaiting a shared `acquireSound()` helper
  // would need three ticks where the fakes' scenario tests are pinned to
  // two (a regression T006 hit and reverted: see edge-cases.test.ts and
  // target-in-sequence.test.ts, which advance the fake clock immediately
  // after exactly two `await Promise.resolve()`s). Returns whether sound is
  // usable — start() proceeds regardless of the answer (a broken port must
  // not leave the transport stuck at "countingIn 4" forever); startDrone()
  // stays off when it is false.
  function noticeFromSoundStart(
    result: Result<void, SoundUnavailable>,
  ): boolean {
    if (!result.ok) {
      notice = "sound-unavailable";
      return false;
    }
    return true;
  }

  function start(): void {
    // practice.drone/REQ-004/S2 — ▶ silences the drone before the count-in
    // or the first note: stopDrone() posts its stop(tag) here, synchronously
    // (before this function's own await below), so it lands at this exact
    // frame; the first tick's lead then carries the drone's own release time
    // on top, so the click or note never sounds until the drone has
    // actually faded to silence.
    const droneWasOn = droneOn;
    if (droneWasOn) stopDrone();
    invalidateSnapshot();
    notice = null;
    cancelIdleTimer(); // Cancel any pending idle timer from the previous run
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
      // unchanged — see noticeFromSoundStart() above.
      let result: Result<void, SoundUnavailable>;
      try {
        result = await sound.start();
      } catch (cause) {
        result = {
          ok: false,
          error: { reason: "no-audio-context", detail: String(cause) },
        };
      }
      noticeFromSoundStart(result);
      await wakeLock.acquire();
      const droneReleaseFrames = droneWasOn
        ? Math.round((DRONE_RELEASE_MS * sound.sampleRate()) / 1000)
        : 0;
      scheduler.start(
        sound.currentFrame() + firstTickLeadFrames() + droneReleaseFrames,
        next,
      );
      invalidateSnapshot();
      notifyChange();
    })();
  }

  function stop(): void {
    invalidateSnapshot();
    scheduler.stop();
    cancelPendingHighlights();
    cancelIdleTimer();
    sound.post({ kind: "stopAll" });
    transport = { kind: "idle" };
    soundingPosition = null;
    releaseWakeLockIfSilent();
    notifyChange();
  }

  // practice.drone/REQ-001, REQ-004, REQ-008 — mirrors start()'s
  // sound.start() handling, but stays off on failure rather than proceeding
  // regardless: there is no walk-through to get stuck, so nothing is gained
  // by sounding silently, and REQ-008 asks for the pill to stay showing ▶.
  // REQ-004/S1 — playing or counting excludes the drone: stop() is called
  // synchronously, before this function's own await below, so its stopAll
  // is posted before the drone's own commands.
  //
  // REQ-001 defines ▶ on the pill only "while the drone is off" — a no-op
  // while already on keeps that the whole story rather than leaving it
  // undefined: without this guard, a second startDrone() while the first's
  // voice still sounds would overwrite `droneTag` with a fresh one and
  // orphan the old voice, which then never gets a stop(tag) of its own and
  // sounds forever (practice.drone/REQ-004/S3's invariant, sequence
  // droneOn → droneOn → play, caught this).
  function startDrone(): void {
    if (droneOn) return;
    if (transport.kind !== "idle") stop();
    invalidateSnapshot();
    // Bumped before the first await so a stopDrone() (or a second
    // startDrone()) that lands while this one is still resolving
    // sound.start()/wakeLock.acquire() supersedes it (see droneGeneration
    // above).
    droneGeneration += 1;
    const startedAtGeneration = droneGeneration;

    void (async () => {
      // See noticeFromSoundStart() and start()'s own try/catch above — the
      // same inline shape, kept inline here too rather than shared through
      // a promise-returning helper, for the same microtask-timing reason.
      let result: Result<void, SoundUnavailable>;
      try {
        result = await sound.start();
      } catch (cause) {
        result = {
          ok: false,
          error: { reason: "no-audio-context", detail: String(cause) },
        };
      }
      if (!noticeFromSoundStart(result)) {
        invalidateSnapshot();
        notifyChange();
        return;
      }
      await wakeLock.acquire();
      if (droneGeneration !== startedAtGeneration) return;
      const tag = nextDroneTag();
      droneTag = tag;
      sound.post({
        kind: "drone",
        tag,
        hz: pitchHzOf(droneNote),
        onsetFrame: sound.currentFrame() + firstTickLeadFrames(),
        sound: currentDroneSettings.sound,
      });
      droneOn = true;
      invalidateSnapshot();
      notifyChange();
    })();
  }

  // practice.drone/REQ-001, REQ-004 — releases the live voice over its own
  // fade (RELEASE_S in src/sound/src/drone.rs); the wake lock, shared with
  // playback, is released only when neither remains (releaseWakeLockIfSilent).
  function stopDrone(): void {
    invalidateSnapshot();
    droneGeneration += 1; // supersede any startDrone() still awaiting
    if (droneTag !== null) {
      sound.post({ kind: "stop", tag: droneTag });
      droneTag = null;
    }
    droneOn = false;
    releaseWakeLockIfSilent();
    notifyChange();
  }

  // practice.drone/REQ-005 — a crossfade: the new voice's attack and the
  // old voice's release both post at the same instant, so the drone is
  // never silent between them.
  function setDroneSound(newSound: DroneSound): void {
    invalidateSnapshot();
    currentDroneSettings = { ...currentDroneSettings, sound: newSound };
    if (droneOn && droneTag !== null) {
      const oldTag = droneTag;
      const newTag = nextDroneTag();
      droneTag = newTag;
      sound.post({
        kind: "drone",
        tag: newTag,
        hz: pitchHzOf(droneNote),
        onsetFrame: sound.currentFrame() + firstTickLeadFrames(),
        sound: newSound,
      });
      sound.post({ kind: "stop", tag: oldTag });
    }
    notifyChange();
  }

  // practice.drone/REQ-002 — − / + move the drone one octave from wherever
  // it is currently resolved (not from a stale pin), pinning that octave
  // number for key and variant changes to come; a no-op past A0/C8, where
  // canStepDroneOctave already says there is nowhere to go.
  function stepDroneOctave(delta: -1 | 1): void {
    if (!canStepDroneOctave(droneNote, delta)) return;
    invalidateSnapshot();
    currentDroneSettings = {
      ...currentDroneSettings,
      octave: { kind: "pinned", octave: droneNote.octave + delta },
    };
    recomputeAndRetune();
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
    cancelIdleTimer();
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
    recomputeAndRetune();
    restartIfPlaying();
    notifyChange();
  }

  function setTraversal(newTraversal: Traversal): void {
    invalidateSnapshot();
    currentTraversal = newTraversal;
    recomputeAndRetune();
    restartIfPlaying();
    notifyChange();
  }

  function setScaleChoice(choice: ScaleChoice): void {
    invalidateSnapshot();
    currentScaleChoice = choice;
    recomputeAndRetune();
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
    cancelIdleTimer();
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
    setScaleChoice,
    setSettings,
    startDrone,
    stopDrone,
    stepDroneOctave,
    setDroneSound,
    onTargetAdvanced,
    onChange,
    dispose,
  };
}
