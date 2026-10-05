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
  SpellingPreference,
  Traversal,
  Variant,
} from "../../theory/published";
import {
  effectiveOctavesOf,
  fittingOctaveCounts,
  noteAtPosition,
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
import type { ListeningPort } from "../ports/listening";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";
import type { VisibilityPort } from "../ports/visibility";
import type { WakeLockPort } from "../ports/wake-lock";
import type { DroneSettings, DroneSound } from "./drone";
import { canStepDroneOctave, droneNoteOf } from "./drone";
import type { LeadPhase, LeadSettings, LeadTarget, Who } from "./lead";
import {
  applyJudgement,
  applySilence,
  CUE_TAIL_MS,
  CUE_TONE_MS,
  emptyHold,
  heldFractionOf,
  HELD_TICK_MS,
  LEAD_GAP_MS,
  requiredHoldMs,
  targetAt,
  TOLERANCE_CENTS,
} from "./lead";
import type { ScaleChoice } from "./scale-choice";
import { chosenScaleIdFor } from "./scale-choice";
import type { SessionSettings } from "./settings";
import { summaryLineOf } from "./settings";
import type { TempoTerm } from "./tempo";
import { tempoTermFor } from "./tempo";
import type { TransportState } from "./transport";
import { advance, startTransport, tickOf } from "./transport";
import type {
  ListeningState,
  SmoothingState,
  TunerSnapshot,
  TunerTarget,
} from "./tuner";
import {
  canStepTarget,
  initialSmoothingState,
  judge,
  READING_MAX_AGE_MS,
  smoothedPitchHzOf,
  TUNER_HIGHEST_POSITION,
  TUNER_LOWEST_POSITION,
  verdictOf,
} from "./tuner";
import type { NoteJudged } from "../published/note-judged.schema";
import type { PitchDetected } from "../../listening/published/pitch-detected.schema";

// practice.tuner/REQ-003 — the gap rule: the length of silence, measured
// from the last detection, after which the reading clears back to
// "Play a note".
const TUNER_GAP_MS = 300;

export interface SessionContext {
  readonly key: Key;
  readonly variant: Variant;
  // practice.tuner/REQ-002/S5 — the ♯/♭ preference the tuner spells the
  // nearest note with; App passes selection.spelling, and setContext
  // re-spells targetNote and the next reading (wired from T008).
  readonly spelling: SpellingPreference;
}

export interface SessionDeps {
  readonly sound: SoundPort;
  readonly clock: ClockPort;
  readonly wakeLock: WakeLockPort;
  readonly visibility: VisibilityPort;
  // practice.tuner/REQ-001 — the tuner's microphone seam (enterTuner/leaveTuner).
  readonly listening: ListeningPort;
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

// practice.session/REQ-014, REQ-015 — "I lead"'s own half of the session:
// who leads, the lead run's phase and target, its listening state (the same
// sum TunerSnapshot uses) and the two captions the card shows while idle or
// complete. `reading` and `justHeld` are always null until T006 and T011
// wire the judged-reading and "<note> held ✓" logic through.
export interface LeadSnapshot {
  readonly who: Who;
  readonly phase: LeadPhase["kind"];
  readonly listening: ListeningState;
  readonly target: LeadTarget | null;
  readonly heldFraction: number;
  readonly reading: NoteJudged | null;
  readonly justHeld: Note | null;
  readonly idleCaption: string;
  readonly completeCaption: string | null;
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
  readonly summaryLine: string;
  readonly tempoTerm: TempoTerm;
  readonly soundingPosition: number | null;
  readonly notice: "sound-unavailable" | null;
  readonly scale: Scale;
  readonly spelledScale: SpelledScale;
  readonly scaleChoice: ScaleChoice;
  readonly effectiveShape: Shape;
  readonly drone: DroneSnapshot;
  readonly tappedRunIndex: number | null;
  readonly tuner: TunerSnapshot;
  readonly lead: LeadSnapshot;
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
  tapNote(runIndex: number): void;
  // practice.tuner/REQ-001 — the way in and out: enterTuner stops playback
  // and the drone (never both sounding) and requests listening; leaveTuner
  // ends it and forgets the target.
  enterTuner(): void;
  leaveTuner(): void;
  // practice.tuner/REQ-004 — the four target verbs: Hold pins the note
  // playing now (a no-op without a reading), pinTarget pins a spiral wedge
  // (clamped to E2–C7), stepTarget moves the pinned note a semitone (a
  // no-op on auto or at the bounds), and clearTarget returns to auto.
  holdTarget(): void;
  pinTarget(position: number): void;
  stepTarget(delta: -1 | 1): void;
  clearTarget(): void;
  // practice.tuner/REQ-006 (Article V) — the UI reports that the reading
  // with this atFrame has just been painted; returns that reading's age in
  // ms at this instant (listening.currentFrame() − atFrame, at the port's
  // sample rate). Used by the harness; never changes state.
  readingShown(atFrame: number): number;
  onNoteJudged(listener: (event: NoteJudged) => void): () => void;
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

// practice.session/REQ-013 — a tapped note's tag, one per tap; well clear
// of DRONE_TAG_BASE and CLICK_TAG_BASE and never colliding with a position
// tag.
const TAP_TAG_BASE = 2_000_000;

// practice.session/REQ-018 — the tone cue's own tag, one per target shown;
// well clear of the other three bases and never colliding with a position
// tag.
const CUE_TAG_BASE = 4_000_000;

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

// practice.session/REQ-018 — mirrors `RELEASE_S` in src/sound/src/tone.rs:
// how long a tone voice (the cue, a tapped note, a sequence note) takes to
// fade to true silence once its duration ends. The tone cue's mute window
// (below) runs until the cue's release has finished, not merely until its
// nominal duration ends, so a resonant tail is never heard as the learner.
const TONE_RELEASE_MS = 40;

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

// "<N> notes · <lowest>–<highest>" — play along's idle caption
// (practice.session/REQ-002) and, when who is "tool", I lead's idle caption
// too (practice.session/REQ-014/S2): the same sequence, read the same way,
// shared rather than recomputed twice.
function sequenceCaptionOf(
  run: readonly KeyViewNote[],
  sequence: readonly SequenceNote[],
): string {
  const extremes = extremesOf(run);
  if (extremes === null) return "";
  return `${sequence.length} notes · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
}

function captionOf(
  transport: TransportState,
  run: readonly KeyViewNote[],
  sequence: readonly SequenceNote[],
  soundingPosition: number | null,
): string {
  switch (transport.kind) {
    case "idle":
      return sequenceCaptionOf(run, sequence);
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

// Structural equality for the tuner's target (T032; round-2 fixer for
// T009's review) — mirrors transportEqual above; kept by-value (rather than
// relying on `tunerTarget`'s reference staying stable between snapshots) so
// the pairing with targetNoteEqual below reads the same way at every call
// site.
function targetEqual(a: TunerTarget, b: TunerTarget): boolean {
  switch (a.kind) {
    case "auto":
      return b.kind === "auto";
    case "pinned":
      return b.kind === "pinned" && a.position === b.position;
  }
}

// Field-by-field equality for a Note (round-2 fixer for T009's review) —
// theory publishes no note-equality helper, so a small private one here.
function sameNote(a: Note, b: Note): boolean {
  return (
    a.letter === b.letter &&
    a.accidental === b.accidental &&
    a.octave === b.octave
  );
}

// snapshotsMateriallyEqual's comparison for `tuner.targetNote` — buildSnapshot()
// now derives it with noteAtPosition() on every call, which returns a fresh
// object each time, so two structurally equal notes are never the same
// reference; compares by value instead (round-2 fixer for T009's review).
function targetNoteEqual(a: Note | null, b: Note | null): boolean {
  if (a === null || b === null) return a === b;
  return sameNote(a, b);
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
    a.notice === b.notice &&
    a.settings === b.settings &&
    a.traversal === b.traversal &&
    a.run === b.run &&
    a.scaleChoice === b.scaleChoice &&
    a.drone.on === b.drone.on &&
    noteLabel(a.drone.note) === noteLabel(b.drone.note) &&
    a.drone.settings === b.drone.settings &&
    a.tappedRunIndex === b.tappedRunIndex &&
    // practice.tuner/REQ-001 — `active`, `listening` and `reading` are only
    // ever reassigned by enterTuner()/leaveTuner()/commitTunerReading()
    // (never mutated in place), so reference equality is enough, the same
    // reasoning as settings/traversal/run above; `target`, `targetNote` and
    // `lastHeard` compare by value (targetEqual/targetNoteEqual, above) —
    // targetNote and lastHeard are now derived fresh on every
    // buildSnapshot() call and would otherwise never compare equal, and
    // comparing target by value too keeps a scheduler poll while pinned
    // from ever firing a spurious notify.
    a.tuner.active === b.tuner.active &&
    a.tuner.listening === b.tuner.listening &&
    targetEqual(a.tuner.target, b.tuner.target) &&
    targetNoteEqual(a.tuner.targetNote, b.tuner.targetNote) &&
    a.tuner.reading === b.tuner.reading &&
    targetNoteEqual(a.tuner.lastHeard, b.tuner.lastHeard) &&
    // practice.session/REQ-014, REQ-015 — `who` and `idleCaption` are
    // already covered by `settings`/`run` above (the same reasoning as this
    // function's own comment: both are derived purely from one or the
    // other); `phase`, `listening`, `target`, `heldFraction`, `reading` and
    // `justHeld` are not, and need their own comparison. `listening` and
    // `target` are only ever reassigned by `startLead()`/`stop()` (never
    // mutated in place, never rebuilt fresh per buildSnapshot() call the
    // way `tuner.targetNote` is), so reference equality is enough, the same
    // reasoning as `tuner.active`/`tuner.listening` above.
    a.lead.phase === b.lead.phase &&
    a.lead.listening === b.lead.listening &&
    a.lead.target === b.lead.target &&
    a.lead.heldFraction === b.lead.heldFraction &&
    a.lead.reading === b.lead.reading &&
    a.lead.justHeld === b.lead.justHeld
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
  const { sound, clock, wakeLock, visibility, listening } = deps;
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
  // practice.session/REQ-013 — whether `sound.start()` has ever succeeded:
  // set by `noticeFromSoundStart` on a `{ ok: true }` result, from start(),
  // startDrone() or tapNote() itself. A tap does not start the transport,
  // but it still needs a started sound port to post a tone; once any of the
  // three has succeeded once, later taps post synchronously without
  // needing their own round trip through sound.start() again.
  let soundReady = false;
  // The sounding tap's own tag, or null while none is sounding — needed to
  // stop it on a retap (REQ-013) the same way droneTag stops a superseded
  // drone voice.
  let tappedTag: number | null = null;
  let tapCounter = 0;
  // practice.session/REQ-018 — the tone cue's own tag counter, one per
  // target shown while the cue is on.
  let cueCounter = 0;
  // Bumped by tapNote() itself (every call, sync or async) and by
  // enterTuner() — mirrors droneGeneration: a first-ever tapNote() still
  // awaiting sound.start() compares this after its await and posts nothing
  // if it no longer matches, so a second tapNote() landing before the
  // first resolves (found by T013's fixer-round enumeration:
  // tapNotePending → tapNote → enterTuner — the first tap's continuation
  // would otherwise post after being superseded, orphaning its voice with
  // no tag endTapIfSounding() still knows to stop) or an enterTuner()
  // landing meanwhile (practice.tuner/REQ-001/S3's own race, brief T013's
  // fixer round) is never overridden by a stale post arriving after it.
  let tapGeneration = 0;
  // Cancel functions for the sounding tap's two timers (set tappedRunIndex
  // at the audible onset, clear it a beat later) — both cleared together
  // whenever the tap ends (a retap, start(), restartIfPlaying()), so a
  // timer belonging to a superseded tap never fires after its tap has
  // already been stopped.
  let tapHighlightCancel: (() => void) | null = null;
  let tapClearCancel: (() => void) | null = null;
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

  // practice.session/REQ-013 — the run index of the currently sounding
  // tapped note, or null while none is sounding. Set by the tap's own
  // highlight timer at its audible onset, cleared a beat later — never by
  // `applyTargetAdvance` (a playing run's own highlight), which is why the
  // two are separate fields rather than one shared "sounding" index.
  let tappedRunIndex: number | null = null;

  // practice.tuner/REQ-001 — the tuner's own state, off until enterTuner()
  // is called and forgotten again on leaveTuner() (REQ-009: nothing about
  // the tuner survives leaving it).
  let tunerActive = false;
  let tunerListeningState: ListeningState = { kind: "off" };
  let tunerTarget: TunerTarget = { kind: "auto" };
  let tunerReading: NoteJudged | null = null;
  // practice.tuner/REQ-004/S7, REQ-009/S3 — the pitch position of
  // `heard.nearest` of the last committed reading, kept through a gap (a
  // page hidden, or the microphone failing) and forgotten only on
  // leaveTuner(): NOT reset by clearTunerReading() below, which runs on
  // every gap. Hold pins this once `tunerReading` has cleared, and
  // buildSnapshot() derives `lastHeard` from it, spelled per the
  // preference like `targetNote`.
  let tunerLastHeardPosition: number | null = null;
  // practice.tuner/REQ-002 — the shown-note hysteresis position
  // (nearestWithHandover's `shown`), reset alongside `tunerReading` on a gap
  // or on leaveTuner(): a fresh reading after silence starts from the
  // nearest note again, not wherever the ear was before the gap.
  let tunerShownPosition: number | null = null;
  // practice.tuner/REQ-002 — the smoothing filter's own state, reset
  // alongside `tunerReading`/`tunerShownPosition` (see `clearTunerReading`
  // below) and on enterTuner().
  let tunerSmoothingState: SmoothingState = initialSmoothingState;
  // The most recently judged detection, awaiting its commit-on-next-tick
  // timer — a newer detection arriving before commit replaces this rather
  // than queuing, so at most one reading is ever in flight (plan.md's
  // coalescing note).
  let tunerPendingReading: {
    readonly judged: NoteJudged;
    readonly shown: number;
  } | null = null;
  // Cancels for the tuner's two timers — the 0 ms commit-on-next-tick timer
  // (armed once per burst of detections, not re-armed while already
  // pending) and the 300 ms gap timer (re-armed on every detection).
  let tunerCommitCancel: (() => void) | null = null;
  let tunerGapCancel: (() => void) | null = null;
  // Bumped by both enterTuner() and leaveTuner() — mirrors droneGeneration:
  // a leaveTuner() that lands while enterTuner()'s wakeLock.acquire()/
  // listening.start() awaits are still resolving must supersede that
  // continuation, so it never overwrites the "off" state leaveTuner() just
  // set with a stale "listening"/"cannot-hear".
  let tunerGeneration = 0;

  // practice.session/REQ-014, REQ-015 — which subsystem currently holds (or
  // is still requesting) the microphone: the tuner and a lead run never
  // listen at once, so one flag settles who a detection or an ended-track
  // event belongs to, and who requestListening()'s supersede check compares
  // against. `tunerActive` is untouched by this — it stays the tuner's own
  // "the tuner screen is open" flag, exactly as before.
  let listeningOwner: "none" | "tuner" | "lead" = "none";
  // practice.session/REQ-015 — a lead run's own state: the phase stays
  // "idle" while the microphone is still being requested (leadListeningState
  // carries "starting" for that window instead — LeadPhase has no variant
  // for it, the same way TunerSnapshot's `active` and `listening` are two
  // separate fields rather than one), and becomes "listening" only once
  // leadListeningState does too, with the first target already pinned to it
  // (REQ-015/S1: the target and `TargetAdvanced` arrive together).
  let leadPhase: LeadPhase = { kind: "idle" };
  let leadListeningState: ListeningState = { kind: "off" };
  // Bumped by both startLead() and stop() — mirrors tunerGeneration: a
  // stop() (or a second startLead()) landing while a startLead() is still
  // awaiting wakeLock.acquire()/listening.start() must supersede that
  // continuation, so it never overwrites the state the newer call already
  // set with a stale "listening"/"cannot-hear".
  let leadGeneration = 0;
  // practice.session/REQ-016 — the lead run's own smoothing filter, pinned
  // to the target note (never `shown`, which has no meaning for a pinned
  // target): reset on a new target (T006) and inside a muted window (T011);
  // mirrors `tunerSmoothingState` above.
  let leadSmoothing: SmoothingState = initialSmoothingState;
  // The committed reading shown on the meter and the card, and the one
  // still awaiting its commit-on-next-tick timer — mirrors
  // `tunerReading`/`tunerPendingReading` above (the same coalescing: a
  // burst of detections within one tick commits only the newest).
  let leadReading: NoteJudged | null = null;
  let leadPendingReading: NoteJudged | null = null;
  // practice.session/REQ-017 — true when `leadPendingReading` is the reading
  // that completed the hold: it was judged against the target just left, so
  // it is emitted as NoteJudged but never shown on the new target.
  let leadPendingCompleted = false;
  // Cancels for the lead run's own two timers — mirrors
  // `tunerCommitCancel`/`tunerGapCancel` above.
  let leadCommitCancel: (() => void) | null = null;
  let leadGapCancel: (() => void) | null = null;
  // practice.session/REQ-017 — "<previous note> held ✓": the note just
  // advanced away from, or null the rest of the time. Set on an advance
  // (the hold branch of onPitchDetected), cleared by the next surviving
  // detection (judged against the new target — a muted or stale one never
  // reaches that code) or by `leadJustHeldCancel` firing HELD_TICK_MS after
  // the advance with no reading, whichever is first.
  let leadJustHeld: Note | null = null;
  let leadJustHeldCancel: (() => void) | null = null;
  // practice.session/REQ-018 — the tone cue currently sounding (or just
  // posted, mid-release), or null while none is — needed to stop it (`stop`
  // with its tag) wherever a lead run ends or restarts, the same way
  // `tappedTag`/`droneTag` stop their own voice.
  let cueTag: number | null = null;

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
  const noteJudgedListeners = new Set<(event: NoteJudged) => void>();

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

  function framesOfMs(ms: number): number {
    return Math.round((ms * sound.sampleRate()) / 1000);
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

  function nextTapTag(): number {
    const tag = TAP_TAG_BASE + tapCounter;
    tapCounter += 1;
    return tag;
  }

  function nextCueTag(): number {
    const tag = CUE_TAG_BASE + cueCounter;
    cueCounter += 1;
    return tag;
  }

  // practice.session/REQ-013, REQ-018 — posts one tone command, shared by a
  // tapped note and the lead tone cue (T011's refactor: the two used to
  // build the command inline, separately): the onset is always
  // `sound.currentFrame() + FIRST_TICK_LEAD_MS` ahead (REQ-008's reasoning
  // applies here too), and the duration is given in ms, converted to frames
  // the same way `firstTickLeadFrames()` converts its own constant. Returns
  // the onset frame actually used, so a caller that needs to reason about
  // when the tone ends (the cue's mute window) uses the same value the
  // command itself carries, rather than recomputing it and risking the two
  // disagreeing.
  function scheduleOneTone(
    hz: number,
    durationMs: number,
    tag: number,
  ): number {
    const onsetFrame = sound.currentFrame() + firstTickLeadFrames();
    sound.post({
      kind: "tone",
      tag,
      hz,
      onsetFrame,
      durationFrames: framesOfMs(durationMs),
    });
    return onsetFrame;
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
  // The aim arithmetic shared by every highlight timer, playing or tapped
  // (practice.session/REQ-006, REQ-013): frames to the onset, converted to
  // ms, plus the port's output latency (an estimate that tends to run
  // high), less HIGHLIGHT_LEAD_MS — see that constant's own comment for
  // why. Never negative: a timer aimed at an onset already behind the
  // current frame fires at once rather than "in the past".
  function msUntilAudible(onsetFrame: number): number {
    const framesUntilOnset = onsetFrame - sound.currentFrame();
    return Math.max(
      0,
      (framesUntilOnset * 1000) / sound.sampleRate() +
        sound.outputLatencyMs() -
        HIGHLIGHT_LEAD_MS,
    );
  }

  function scheduleHighlight(position: number, onsetFrame: number): void {
    const cancel = clock.setTimeout(() => {
      pendingHighlightCancels.delete(cancel);
      applyTargetAdvance(position, onsetFrame);
    }, msUntilAudible(onsetFrame));
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

  // practice.drone/REQ-004, practice.tuner/REQ-001, practice.session/REQ-015
  // — the wake lock is shared between playback, the drone, the tuner and a
  // lead run: it is released only when none remains, so stop(), the idle
  // transition, stopDrone() and leaveTuner() all funnel through this one
  // check rather than each deciding on its own.
  function releaseWakeLockIfSilent(): void {
    if (
      transport.kind === "idle" &&
      !droneOn &&
      !tunerActive &&
      listeningOwner !== "lead"
    ) {
      wakeLock.release();
    }
  }

  // practice.drone/REQ-007/S1 — hidden means silent: both playback and the
  // drone stop when the page is hidden, exactly as ■ or ❚❚ would stop them
  // while visible.
  //
  // practice.tuner/REQ-008, listening.pitch-detection/REQ-005 — hidden
  // means deaf too, but only while there is a microphone actually open (or
  // being opened) to stop: "listening" or "starting". A "cannot-hear" state
  // (or an already-"off" one) is left untouched — REQ-007 asks for the
  // microphone nowhere but on entering the tuner and promises to try again
  // only "at the next entry", so a hide/show pair while refused/absent/failed
  // must not ask the platform again; onShown (below) only ever resumes from
  // "off", so leaving "cannot-hear" as it is keeps that path closed. Bumping
  // tunerGeneration supersedes an enterTuner() or startListening() still
  // awaiting the microphone — an in-flight start must not resurrect the
  // state this hide just cleared once it resolves — the same reasoning as
  // leaveTuner()'s own bump, below.
  const unsubscribeVisibility = visibility.onHidden(() => {
    stop();
    stopDrone();
    if (
      tunerActive &&
      (tunerListeningState.kind === "listening" ||
        tunerListeningState.kind === "starting")
    ) {
      invalidateSnapshot();
      tunerGeneration += 1;
      listening.stop();
      cancelTunerTimers();
      clearTunerReading();
      tunerListeningState = { kind: "off" };
      notifyChange();
    }
  });

  // practice.tuner/REQ-006, practice.session/REQ-021 (Article V) — the age
  // check shared by both subsystems: a detection already older than the
  // budget by the time it reaches here is dropped outright, no matter who
  // is listening — silence beats a late reading.
  function isTooOld(pitch: PitchDetected): boolean {
    const ageMs =
      ((listening.currentFrame() - pitch.atFrame) / listening.sampleRate()) *
      1000;
    return ageMs > READING_MAX_AGE_MS;
  }

  // practice.tuner/REQ-002, practice.session/REQ-016 — turns a detection
  // into a judgement for whichever subsystem is listening (the tuner and a
  // lead run never listen at once — `listeningOwner` settles it), held as
  // `tunerPendingReading`/`leadPendingReading` until the next clock tick
  // commits it (a burst of detections within one tick coalesces onto the
  // newest for display — the hold itself, below, applies to every one).
  // Ignored unless the owning subsystem is active and actually listening —
  // a detection that arrives after leaveTuner()/stop() (or before
  // listening.start() resolves) is dropped.
  function onPitchDetected(pitch: PitchDetected): void {
    if (tunerActive && tunerListeningState.kind === "listening") {
      if (isTooOld(pitch)) return;
      // practice.tuner/REQ-002 — judge a smoothed pitch (never holding the
      // reading back), but keep `heard.hz` the raw detected value: the
      // measured harness reads it, and the spec says the Hz stays detected.
      const { hz: smoothedHz, state } = smoothedPitchHzOf(
        tunerSmoothingState,
        tunerTarget,
        tunerShownPosition,
        pitch.hz,
      );
      tunerSmoothingState = state;
      const result = judge(
        { ...pitch, hz: smoothedHz },
        tunerTarget,
        tunerShownPosition,
        currentContext.spelling,
      );
      tunerPendingReading = {
        judged: {
          ...result.judged,
          heard: { ...result.judged.heard, hz: pitch.hz },
        },
        shown: result.shown,
      };
      if (tunerCommitCancel === null) {
        tunerCommitCancel = clock.setTimeout(commitTunerReading, 0);
      }
      armTunerGapTimer();
      return;
    }

    if (
      listeningOwner !== "lead" ||
      leadPhase.kind !== "listening" ||
      leadListeningState.kind !== "listening"
    ) {
      return;
    }
    if (isTooOld(pitch)) return;

    const atMs = (pitch.atFrame / listening.sampleRate()) * 1000;
    // practice.session/REQ-018 — a detection inside the tone cue's mute
    // window is dropped the same way a stale one is, except the smoothing
    // resets too, so the first reading once the window ends is shown as
    // detected rather than blended across it. Dropped entirely: it is never
    // judged, so it never clears `justHeld` either (below).
    if (leadPhase.mutedUntilMs !== null && atMs < leadPhase.mutedUntilMs) {
      leadSmoothing = initialSmoothingState;
      return;
    }

    // practice.session/REQ-017 — every surviving detection (not dropped as
    // too old or muted, above) is a reading against the *current* target —
    // clears "<note> held ✓" the instant the first one after an advance
    // reaches here, before the hold rule (below) might advance again and
    // set a fresh one.
    clearLeadJustHeld();

    // practice.session/REQ-016, REQ-017 — judged against the target's own
    // pitch, pinned (never auto): the smoothing and the judgement are the
    // tuner's own pure functions, called with a pinned target and no shown
    // hysteresis (a pinned target ignores it) — then the verdict is
    // recomputed at the lead tolerance rather than the tuner's fixed band.
    const pinned: TunerTarget = {
      kind: "pinned",
      position: pitchPosition(leadPhase.target.note),
    };
    const { hz: smoothedHz, state } = smoothedPitchHzOf(
      leadSmoothing,
      pinned,
      null,
      pitch.hz,
    );
    leadSmoothing = state;
    const { judged } = judge(
      { ...pitch, hz: smoothedHz },
      pinned,
      null,
      currentContext.spelling,
    );
    const reading: NoteJudged = {
      ...judged,
      heard: { ...judged.heard, hz: pitch.hz },
      verdict: verdictOf(
        judged.cents,
        TOLERANCE_CENTS[currentSettings.lead.tolerance],
      ),
    };

    // practice.session/REQ-016 — the hold rule runs on every reading that
    // reaches here, not only the one later committed for display: a burst
    // coalesced away for `NoteJudged` still counts, and still can reset or
    // complete the hold.
    const previousTarget =
      leadPhase.kind === "listening" ? leadPhase.target : null;
    const { phase, advanced } = applyJudgement(
      leadPhase,
      reading,
      atMs,
      currentSettings.lead,
      currentSettings.tempoBpm,
      sequence,
      currentSettings.loop,
    );
    leadPhase = phase;

    if (advanced) {
      leadSmoothing = initialSmoothingState;
      if (phase.kind === "listening") {
        // practice.session/REQ-015 — `TargetAdvanced` is emitted here,
        // synchronously, the instant the completing reading is judged —
        // never deferred to the commit tick, which only coalesces what is
        // shown.
        const advancedEvent: TargetAdvanced = {
          note: phase.target.note,
          position: phase.target.position,
          length: sequence.length,
          atFrame: pitch.atFrame,
        };
        for (const listener of targetAdvancedListeners) {
          listener(advancedEvent);
        }
        // practice.session/REQ-017 — "<previous note> held ✓" from this
        // advance until the first reading against the new target or
        // HELD_TICK_MS of silence, whichever first (armLeadJustHeldTimer,
        // below).
        if (previousTarget !== null) armLeadJustHeld(previousTarget.note);
        // practice.session/REQ-018 — the tone cue for the new target, the
        // first included at startLead()/restartLeadIfRunning() too.
        armCueTone(phase.target);
      } else if (phase.kind === "complete") {
        // practice.session/REQ-015/S3 — the last note of a non-looping run
        // held: listening ends here, the same release stop()'s lead branch
        // performs.
        listening.stop();
        listeningOwner = "none";
        releaseWakeLockIfSilent();
      }
    }

    leadPendingReading = reading;
    leadPendingCompleted = advanced;
    if (leadCommitCancel === null) {
      leadCommitCancel = clock.setTimeout(commitLeadReading, 0);
    }
    armLeadGapTimer();
  }

  // practice.tuner/REQ-002 — one commit per tick, the newest pending
  // reading wins: moves `tunerPendingReading` into `tunerReading`, updates
  // the hand-over hysteresis from `judge`'s returned `shown`, and emits
  // NoteJudged.
  function commitTunerReading(): void {
    tunerCommitCancel = null;
    if (tunerPendingReading === null) return;
    invalidateSnapshot();
    tunerReading = tunerPendingReading.judged;
    tunerShownPosition = tunerPendingReading.shown;
    // practice.tuner/REQ-004/S7 — every committed reading, not only a
    // pinned one, updates what was last heard.
    tunerLastHeardPosition = pitchPosition(tunerReading.heard.nearest);
    tunerPendingReading = null;
    for (const listener of noteJudgedListeners) listener(tunerReading);
    notifyChange();
  }

  // practice.session/REQ-016, REQ-021 — one commit per tick for a lead run,
  // mirroring commitTunerReading(): moves `leadPendingReading` into
  // `leadReading` and emits NoteJudged. The hold rule above already applied
  // every reading in the burst to `leadPhase`, committed or not — this only
  // decides what is shown.
  function commitLeadReading(): void {
    leadCommitCancel = null;
    if (leadPendingReading === null) return;
    invalidateSnapshot();
    const committed = leadPendingReading;
    leadReading = leadPendingCompleted ? null : committed;
    leadPendingReading = null;
    for (const listener of noteJudgedListeners) listener(committed);
    notifyChange();
  }

  // Clears the shown reading and its hand-over hysteresis together — the
  // gap timer below, leaveTuner() (REQ-009), the onEnded handler
  // (REQ-007/S3) and the hidden branch (REQ-008, above) all set both fields
  // to null in lockstep, so a shared setter keeps it that way rather than
  // writing the pair out at each site (round-2 fixer for T011's review).
  function clearTunerReading(): void {
    tunerReading = null;
    tunerShownPosition = null;
    // practice.tuner/REQ-002 — the smoothing filter resets in lockstep.
    tunerSmoothingState = initialSmoothingState;
  }

  // practice.tuner/REQ-003 — the gap rule: re-armed on every detection; when
  // it fires with no newer detection since it was armed, the reading clears
  // to "Play a note".
  function armTunerGapTimer(): void {
    tunerGapCancel?.();
    tunerGapCancel = clock.setTimeout(() => {
      tunerGapCancel = null;
      invalidateSnapshot();
      clearTunerReading();
      notifyChange();
    }, TUNER_GAP_MS);
  }

  // Cancels both of the tuner's timers and forgets any reading awaiting
  // commit — leaveTuner() calls this so a stale commit or gap timer from
  // before ‹ Practice never fires afterwards.
  function cancelTunerTimers(): void {
    tunerCommitCancel?.();
    tunerCommitCancel = null;
    tunerGapCancel?.();
    tunerGapCancel = null;
    tunerPendingReading = null;
  }

  // practice.session/REQ-017 — the gap rule for a lead run, mirroring
  // armTunerGapTimer(): re-armed on every detection; when it fires with no
  // newer detection since it was armed, the shown reading clears (the fill
  // stays where it was — only the reading and the "last in tune at" marker
  // are forgotten) and nothing is judged again until the next detection.
  function armLeadGapTimer(): void {
    leadGapCancel?.();
    leadGapCancel = clock.setTimeout(() => {
      leadGapCancel = null;
      invalidateSnapshot();
      leadReading = null;
      leadPhase = applySilence(leadPhase);
      notifyChange();
    }, LEAD_GAP_MS);
  }

  // Cancels both of the lead run's timers and forgets any reading awaiting
  // commit — stop()'s lead branch calls this so a stale commit or gap timer
  // from a superseded run never fires afterwards, mirroring
  // cancelTunerTimers().
  function cancelLeadTimers(): void {
    leadCommitCancel?.();
    leadCommitCancel = null;
    leadGapCancel?.();
    leadGapCancel = null;
    leadPendingReading = null;
  }

  // practice.session/REQ-017 — "<previous note> held ✓" cleared, and its
  // HELD_TICK_MS timer cancelled: a no-op when nothing is held. Called by
  // the first surviving detection after an advance (onPitchDetected, above)
  // and by every place a lead run's own state is otherwise forgotten
  // (stop(), restartLeadIfRunning(), a mid-run failure) so a stale timer
  // never fires after the run it belonged to has moved on.
  function clearLeadJustHeld(): void {
    if (leadJustHeld === null) return;
    leadJustHeldCancel?.();
    leadJustHeldCancel = null;
    invalidateSnapshot();
    leadJustHeld = null;
  }

  // practice.session/REQ-017 — sets "<note> held ✓" on an advance and arms
  // the HELD_TICK_MS timer that clears it again if no reading against the
  // new target arrives first (clearLeadJustHeld, above, called by the
  // first one that does).
  function armLeadJustHeld(note: Note): void {
    invalidateSnapshot();
    leadJustHeld = note;
    leadJustHeldCancel?.();
    leadJustHeldCancel = clock.setTimeout(() => {
      leadJustHeldCancel = null;
      invalidateSnapshot();
      leadJustHeld = null;
      notifyChange();
    }, HELD_TICK_MS);
  }

  // practice.session/REQ-018 — stops a sounding (or still-releasing) cue
  // tone, the same way `endTapIfSounding` stops a tapped note — called
  // wherever a lead run ends or restarts, so a cue never outlasts the run
  // or target it was sounding for.
  function stopCueIfSounding(): void {
    if (cueTag === null) return;
    sound.post({ kind: "stop", tag: cueTag });
    cueTag = null;
  }

  // practice.session/REQ-018 — the tone cue: sounds `target` as it becomes
  // the target (the first on start, every advance, every restart of
  // REQ-019), a no-op when the cue is off. `await sound.start()` once, as
  // `tapNote` does (noticeFromSoundStart's own comment explains why that
  // stays written inline rather than through a shared async helper); once
  // sound is confirmed usable, posts the tone and sets `mutedUntilMs` on
  // `leadPhase` from the same onset `scheduleOneTone` actually used, so the
  // two can never disagree. Guarded against a run that has moved on (a
  // stop(), a second advance, a restart) by the time sound.start() settles
  // — `leadPhase.target !== target` catches a second/different target
  // becoming current in the meantime, the same reference-identity reasoning
  // `targetEqual`/`sameNote` elsewhere in this file avoid relying on for
  // value types, but `LeadTarget` here is compared to the very object this
  // closure captured, never reconstructed.
  function armCueTone(target: LeadTarget): void {
    if (!currentSettings.lead.cueTone) return;
    const tag = nextCueTag();
    const atGeneration = leadGeneration;

    function postAndMute(): void {
      if (
        listeningOwner !== "lead" ||
        leadGeneration !== atGeneration ||
        leadPhase.kind !== "listening" ||
        leadPhase.target !== target
      ) {
        return;
      }
      const onsetFrame = scheduleOneTone(
        pitchHzOf(target.note),
        CUE_TONE_MS,
        tag,
      );
      cueTag = tag;
      const onsetMs = (onsetFrame * 1000) / sound.sampleRate();
      invalidateSnapshot();
      leadPhase = {
        ...leadPhase,
        mutedUntilMs: onsetMs + CUE_TONE_MS + TONE_RELEASE_MS + CUE_TAIL_MS,
      };
      notifyChange();
    }

    if (soundReady) {
      postAndMute();
      return;
    }

    void (async () => {
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
      postAndMute();
    })();
  }

  // practice.tuner/REQ-002 — subscribed once, for the session's whole
  // lifetime (not per enterTuner()/leaveTuner()): onPitchDetected itself
  // checks tunerActive and the listening state, the same shape as
  // unsubscribeVisibility above.
  const unsubscribeListeningPitch = listening.onPitch(onPitchDetected);

  // practice.tuner/REQ-007/S3 — the microphone unplugged or its permission
  // revoked mid-session: subscribed once, for the session's whole lifetime,
  // the same shape as onPitchDetected above. Ignored unless the tuner is
  // active — an onEnded firing after leaveTuner() (FakeListening.stop()
  // does not itself fire onEnded, but a real track ending after release
  // well might) must not resurrect a state leaveTuner() already cleared.
  const unsubscribeListeningEnded = listening.onEnded(() => {
    if (tunerActive) {
      invalidateSnapshot();
      tunerListeningState = { kind: "cannot-hear", reason: "failed" };
      clearTunerReading();
      cancelTunerTimers();
      notifyChange();
      return;
    }
    // practice.session/REQ-022/S3 — a lead run's microphone unplugged or its
    // permission revoked mid-run: the same "cannot-hear(failed)" shape as
    // the tuner's own branch above, but through `listeningOwner` rather than
    // `tunerActive`, and with the lead run's own reading, smoothing, hold
    // and timers forgotten (mirrors stop()'s lead branch) and the wake lock
    // released, since nothing is listening or sounding once this ends it.
    if (listeningOwner !== "lead") return;
    invalidateSnapshot();
    leadGeneration += 1; // supersede a startLead() still awaiting its asks
    listeningOwner = "none";
    leadListeningState = { kind: "cannot-hear", reason: "failed" };
    leadPhase = { kind: "cannot-hear", reason: "failed" };
    leadReading = null;
    leadSmoothing = initialSmoothingState;
    cancelLeadTimers();
    stopCueIfSounding();
    clearLeadJustHeld();
    releaseWakeLockIfSilent();
    notifyChange();
  });

  // practice.tuner/REQ-008, listening.pitch-detection/REQ-005/S2 — shown
  // again while the tuner is still active resumes listening without a tap,
  // but only from the "off" state the hidden branch (above) leaves it in: a
  // no-op while not active at all, or while the state is anything but
  // "off" — "starting" (a request from this same show is already in
  // flight) or "listening"/"cannot-hear" (a spurious shown with no
  // preceding hidden). Subscribed once, for the session's whole lifetime,
  // the same shape as onPitchDetected above.
  const unsubscribeListeningShown = visibility.onShown(() => {
    if (!tunerActive || tunerListeningState.kind !== "off") return;
    tunerGeneration += 1;
    startListening(tunerGeneration);
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

  // practice.session/REQ-014 — "hold 2 beats · medium tuning" while I lead
  // is idle; the sequence caption (shared with play along, REQ-002) while
  // who is "tool" — I lead's own idle card never shows while who is "tool",
  // but the field is always well-defined.
  function leadIdleCaptionOf(settings: LeadSettings): string {
    if (settings.who === "tool") return sequenceCaptionOf(run, sequence);
    const { holdBeats, tolerance } = settings;
    const beatWord = holdBeats === 1 ? "beat" : "beats";
    return `hold ${holdBeats} ${beatWord} · ${tolerance} tuning`;
  }

  // practice.session/REQ-015 — "15 of 15 held · C4–C5", shown only once the
  // run has completed (looping disabled, the last note held); null the rest
  // of the time. `extremesOf`/`noteLabel` are the same pair `captionOf`'s
  // idle case uses, read against the run rather than the sequence position.
  function leadCompleteCaptionOf(phase: LeadPhase): string | null {
    if (phase.kind !== "complete") return null;
    const extremes = extremesOf(run);
    if (extremes === null) return null;
    return `${sequence.length} of ${sequence.length} held · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
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
      tappedRunIndex,
      tuner: {
        active: tunerActive,
        listening: tunerListeningState,
        target: tunerTarget,
        // practice.tuner/REQ-004 — derived, not stored: `tunerTarget` is the
        // only source of truth for the pinned position, so a spelling
        // change (setContext) re-spells this for free rather than needing
        // its own sync site (the round-1 bug: setContext forgot to).
        targetNote:
          tunerTarget.kind === "pinned"
            ? noteAtPosition(tunerTarget.position, currentContext.spelling)
            : null,
        reading: tunerReading,
        // practice.tuner/REQ-004/S7, REQ-009/S3 — derived, not stored, the
        // same reasoning as targetNote above: a spelling change re-spells
        // this for free.
        lastHeard:
          tunerLastHeardPosition === null
            ? null
            : noteAtPosition(tunerLastHeardPosition, currentContext.spelling),
        canStepDown: canStepTarget(tunerTarget, -1),
        canStepUp: canStepTarget(tunerTarget, 1),
      },
      lead: {
        who: currentSettings.lead.who,
        phase: leadPhase.kind,
        listening: leadListeningState,
        target: leadPhase.kind === "listening" ? leadPhase.target : null,
        heldFraction:
          leadPhase.kind === "listening"
            ? heldFractionOf(
                leadPhase.hold,
                requiredHoldMs(
                  currentSettings.lead.holdBeats,
                  currentSettings.tempoBpm,
                ),
              )
            : 0,
        // commitLeadReading() commits a judged reading onto this field the
        // same way commitTunerReading() does for the tuner.
        reading: leadReading,
        justHeld: leadJustHeld,
        idleCaption: leadIdleCaptionOf(currentSettings.lead),
        completeCaption: leadCompleteCaptionOf(leadPhase),
      },
    };
  }

  function snapshot(): SessionSnapshot {
    if (cachedSnapshot === null) cachedSnapshot = buildSnapshot();
    return cachedSnapshot;
  }

  // Turns a settled sound.start() outcome into the notice, shared by
  // start(), startDrone() and tapNote() (REQ-010, practice.drone/REQ-008,
  // practice.session/REQ-013) — a plain synchronous function, not itself
  // awaited, so lifting it out of all three adds no microtask hop of its
  // own: the `await sound.start()` (with its try/catch, below) stays
  // written inline in each caller, because a *shared* async wrapper around
  // it would add one — an async function call's own promise needs a tick
  // beyond the one its inner `await` already spends, so a caller awaiting a
  // shared `acquireSound()` helper would need three ticks where the fakes'
  // scenario tests are pinned to two (a regression T006 hit and reverted:
  // see edge-cases.test.ts and target-in-sequence.test.ts, which advance
  // the fake clock immediately after exactly two `await
  // Promise.resolve()`s). Returns whether sound is usable — start()
  // proceeds regardless of the answer (a broken port must not leave the
  // transport stuck at "countingIn 4" forever); startDrone() and tapNote()
  // stay silent when it is false. Also flips `soundReady` on success, so a
  // tap after any successful start posts without needing its own round trip
  // through sound.start() again.
  function noticeFromSoundStart(
    result: Result<void, SoundUnavailable>,
  ): boolean {
    if (!result.ok) {
      notice = "sound-unavailable";
      return false;
    }
    soundReady = true;
    return true;
  }

  function start(): void {
    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens:
    // ▶ is refused outright rather than queued for when the tuner is left.
    if (tunerActive) return;
    // practice.session/REQ-014, REQ-015 — the start circle dispatches on the
    // mode: "me" never touches the transport/scheduler machinery below at
    // all, it asks to listen instead.
    if (currentSettings.lead.who === "me") {
      startLead();
      return;
    }
    // 008 proposal edge-case row (REQ-015) — "a key with no notes in range:
    // the start circle does nothing in either mode". startLead() guards its
    // own empty run (REQ-015/S8); play along has no scenario for it, only the
    // edge-case test, so the guard is here.
    if (sequence.length === 0) return;
    // practice.session/REQ-013 — ▶ ends any sounding tap the same way a
    // retap does, before anything else: a tap only ever sounds while idle,
    // and start() is about to leave idle.
    endTapIfSounding();
    // practice.drone/REQ-004/S2 — ▶ silences the drone before the count-in
    // or the first note: stopDrone() posts its stop(tag) here, synchronously
    // (before this function's own await below), so it lands at this exact
    // frame; the first tick's lead then carries the drone's own release time
    // on top, so the click or note never sounds until the drone has
    // actually faded to silence. stopAnyRun() also bumps droneGeneration
    // unconditionally — even a startDrone() that is only still pending
    // (droneOn still false, awaiting sound.start()/wakeLock.acquire()) must
    // be superseded the instant ▶ is tapped, or its continuation would pass
    // its own generation check and post a drone under a run already in
    // progress (T022).
    const droneWasOn = stopAnyRun();
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
    // practice.session/REQ-015/S2, REQ-009/S3 — a lead run in progress
    // (phase "listening", or a startLead() still awaiting the wake lock or
    // the microphone — listeningOwner is set synchronously, before either
    // await) ends here instead of falling through to the transport/scheduler
    // branch below, which a lead run never touches.
    if (listeningOwner === "lead") {
      leadGeneration += 1; // supersede a startLead() still awaiting its asks
      listening.stop();
      listeningOwner = "none";
      leadListeningState = { kind: "off" };
      leadPhase = { kind: "idle" };
      // practice.session/REQ-016 — hold forgotten: the reading, its
      // smoothing and any commit/gap timer in flight go with it, the same
      // reasoning as cancelTunerTimers()/clearTunerReading() on leaveTuner().
      leadReading = null;
      leadSmoothing = initialSmoothingState;
      cancelLeadTimers();
      // practice.session/REQ-018 — a sounding (or still-releasing) cue tone
      // stops here too — "nothing sounds" once the run has stopped.
      stopCueIfSounding();
      clearLeadJustHeld();
      releaseWakeLockIfSilent();
      notifyChange();
      return;
    }
    // practice.drone/REQ-004 (T022) — clears the drone first when it is on,
    // so droneOn/droneTag are never left stale: without this, a stop() that
    // runs while the drone is fully on would leave `on` true with no
    // scheduled release, and posting stopAll below would silence its voice
    // in the sound port while the session's own state still called it live.
    if (droneOn) stopDrone();
    scheduler.stop();
    cancelPendingHighlights();
    cancelIdleTimer();
    sound.post({ kind: "stopAll" });
    transport = { kind: "idle" };
    soundingPosition = null;
    releaseWakeLockIfSilent();
    notifyChange();
  }

  // practice.drone/REQ-004, practice.tuner/REQ-001, practice.session/REQ-015
  // — the guard startDrone(), enterTuner() and start()-as-tool all open
  // with: stop whatever is currently sounding or listening — playback
  // (❚❚/■), the drone, or a lead run (■) — before beginning the new one, so
  // the "never both" invariant holds across every way in. Returns whether
  // the drone was on, since start()-as-tool needs that to compute the
  // drone's own release delay before its first tick.
  function stopAnyRun(): boolean {
    const droneWasOn = droneOn;
    // Bumped unconditionally, before stopDrone() — a startDrone() that is
    // only still pending (droneOn still false, awaiting
    // sound.start()/wakeLock.acquire()) must be superseded too, or its
    // continuation would post a drone under whatever is starting now (T022;
    // mirrors enterTuner()'s own unconditional bump, and the open note from
    // T005 that startLead() needed the same for its own drone-goes-first
    // guard).
    droneGeneration += 1;
    if (droneWasOn) stopDrone();
    // practice.session/REQ-015/S5, S7 — a lead run in progress, or still
    // requesting the microphone (listeningOwner is set synchronously,
    // before either of its own awaits), ends the same way ■ ends it.
    if (listeningOwner === "lead") stop();
    // Playback in progress ends the same way ❚❚/■ ends it too.
    if (transport.kind !== "idle") stop();
    return droneWasOn;
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
    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
    if (tunerActive) return;
    if (droneOn) return;
    // practice.session/REQ-015/S5 — the drone switched on during a lead run
    // stops it first (idle, the microphone released), then sounds.
    stopAnyRun();
    invalidateSnapshot();
    // practice.drone/REQ-008/S2 — a retry clears the stale notice up front,
    // mirroring start(): a successful sound.start() below never re-sets it,
    // so leaving it here would strand yesterday's "sound-unavailable" notice
    // forever once sound becomes available again.
    notice = null;
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
      // Belt and braces alongside the generation check (T022): start()
      // bumps droneGeneration synchronously the instant ▶ is tapped, so
      // this alone should already catch a ▶ that lands during the awaits
      // above; re-checking transport.kind here too means a stale post is
      // never mistaken for current even if some future caller changed the
      // transport without going through droneGeneration.
      if (droneGeneration !== startedAtGeneration || transport.kind !== "idle")
        return;
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

  // practice.session/REQ-013 — ends the sounding tap exactly as a retap
  // does: stop its voice, cancel its two timers, clear `tappedRunIndex`.
  // Shared by tapNote() (a retap), start() and restartIfPlaying() — a tap
  // only ever sounds while idle, so a run that starts playing, or a run
  // rebuilt out from under it by a recompute, must end it rather than
  // leave a stale tag or a timer aimed at a run index that no longer means
  // the same note. A no-op when nothing is sounding — `notifyChange()`'s
  // own material-change check absorbs the case where nothing here actually
  // changed.
  function endTapIfSounding(): void {
    invalidateSnapshot();
    if (tappedTag !== null) {
      sound.post({ kind: "stop", tag: tappedTag });
      tappedTag = null;
    }
    tapHighlightCancel?.();
    tapHighlightCancel = null;
    tapClearCancel?.();
    tapClearCancel = null;
    tappedRunIndex = null;
    notifyChange();
  }

  // practice.session/REQ-013 — sounds one run note for one beat, over the
  // drone if it sounds, without touching soundingPosition, the caption,
  // progress or targetAdvancedListeners: a tapped note is not the run.
  // Ignored unless idle and runIndex names a real note. A retap ends the
  // one sounding first (endTapIfSounding — same as a stop then a start of
  // the new one). Posting needs a started sound port: once any of
  // start()/startDrone()/tapNote() has ever succeeded, `soundReady` lets
  // every later tap post synchronously; the very first tap of a session
  // that has never started sound goes through the same `sound.start()`
  // round trip startDrone() does (see noticeFromSoundStart above for why
  // that stays written inline here rather than through a shared async
  // helper).
  function tapNote(runIndex: number): void {
    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
    if (tunerActive) return;
    if (transport.kind !== "idle") return;
    // practice.session/REQ-013/S5 — a lead run in progress (listening, or
    // still requesting the microphone) ignores a tap too.
    if (listeningOwner === "lead") return;
    const target = run[runIndex];
    if (target === undefined) return;

    // Bumped unconditionally, before endTapIfSounding() — see tapGeneration
    // above: this supersedes a still-pending earlier tapNote() (or an
    // enterTuner() that bumps it too) the instant this call starts, exactly
    // where start()'s own droneGeneration bump sits relative to stopDrone().
    tapGeneration += 1;
    const startedAtGeneration = tapGeneration;

    endTapIfSounding();

    // `target` is passed in rather than closed over: TypeScript does not
    // carry the `undefined` check above through a nested function's
    // closure, so a parameter keeps the type solid without an unchecked
    // cast.
    function post(note: Note): void {
      const tag = nextTapTag();
      const beatMs = (tickFramesOf() * 1000) / sound.sampleRate();
      const onsetFrame = scheduleOneTone(pitchHzOf(note), beatMs, tag);
      tappedTag = tag;

      const msUntilOnset = msUntilAudible(onsetFrame);

      tapHighlightCancel = clock.setTimeout(() => {
        tapHighlightCancel = null;
        invalidateSnapshot();
        tappedRunIndex = runIndex;
        notifyChange();
      }, msUntilOnset);

      tapClearCancel = clock.setTimeout(() => {
        tapClearCancel = null;
        invalidateSnapshot();
        tappedRunIndex = null;
        notifyChange();
      }, msUntilOnset + beatMs);
    }

    if (soundReady) {
      post(target.note);
      return;
    }

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
      // practice.tuner/REQ-001/S3, practice.session/REQ-013 — the guards at
      // the top of tapNote() only run once, synchronously, before this
      // await: an enterTuner() (found by T013's fixer-round enumeration:
      // tapNotePending → enterTuner) or a second tapNote() (tapNotePending
      // → tapNote → enterTuner — the first tap's continuation would
      // otherwise post an orphaned voice no later endTapIfSounding() still
      // knows the tag of) that lands while this first-ever tap is still
      // awaiting sound.start() would otherwise pass unnoticed. A plain
      // `if (tunerActive) return` here would catch the first case but not
      // the second (tunerActive is still false while only a later tap has
      // superseded this one) — tapGeneration catches both, since
      // enterTuner() bumps it too.
      if (tapGeneration !== startedAtGeneration) return;
      post(target.note);
    })();
  }

  // practice.session/REQ-015, REQ-022 — a finished lead run's card (complete,
  // or the no-mic card) goes back to the I lead idle state: the phase idle
  // and listening off, so the cannot-hear reason goes with it.
  function clearLeadCard(): void {
    leadPhase = { kind: "idle" };
    leadListeningState = { kind: "off" };
  }

  // practice.session/REQ-019 — a key, variant, scale or traversal change
  // mid-run restarts the lead run on the new sequence from its first note at
  // once, still listening, with the hold at zero: `TargetAdvanced` emitted
  // for the new first target, the smoothing reset, listening left entirely
  // untouched (no stop/start of its own). A `complete` card clears to idle
  // here too (REQ-015: "until … the mode, key, variant, scale or traversal
  // changes") — folded into this one lead-aware branch (rather than its own
  // `clearCompleteLeadCard()` called after `restartIfPlaying()`, T007's
  // shape) because recomputeAndRetune() has already rebuilt `sequence` by
  // the time this runs, so the new first target is read from the one fresh
  // sequence rather than needing a second invalidateSnapshot() to undo a
  // stale cache `restartIfPlaying()`'s own notifyChange() would otherwise
  // have left behind.
  function restartLeadIfRunning(): void {
    if (leadPhase.kind === "complete") {
      clearLeadCard();
      return;
    }
    if (leadPhase.kind !== "listening") return;
    invalidateSnapshot();
    leadSmoothing = initialSmoothingState;
    cancelLeadTimers();
    leadReading = null;
    stopCueIfSounding();
    clearLeadJustHeld();
    const target = targetAt(sequence, 1);
    leadPhase = {
      kind: "listening",
      target,
      hold: emptyHold,
      mutedUntilMs: null,
    };
    const advancedEvent: TargetAdvanced = {
      note: target.note,
      position: 1,
      length: sequence.length,
      atFrame: listening.currentFrame(),
    };
    for (const listener of targetAdvancedListeners) listener(advancedEvent);
    // practice.session/REQ-018, REQ-019 — "a cue changes THE SYSTEM SHALL
    // apply it at once": the restarted run's own first target gets the cue
    // too, the same as startLead()'s.
    armCueTone(target);
  }

  function restartIfPlaying(): void {
    // practice.session/REQ-013 — a recompute (setContext/setTraversal/
    // setScaleChoice, all of which call this) can change what a run index
    // means, or replace `run` outright, so any sounding tap ends here too
    // — before the "only while playing" guard below, since a tap only ever
    // sounds while idle.
    endTapIfSounding();
    restartLeadIfRunning();
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
    // practice.tuner/REQ-002/S5, REQ-009/S1 — a spelling change while a
    // target is pinned re-spells it for free: `tuner.targetNote` is derived
    // in buildSnapshot() from `tunerTarget` and `currentContext.spelling`,
    // so there is nothing to re-sync here.
    recomputeAndRetune();
    restartIfPlaying();
    invalidateSnapshot();
    notifyChange();
  }

  function setTraversal(newTraversal: Traversal): void {
    invalidateSnapshot();
    currentTraversal = newTraversal;
    recomputeAndRetune();
    restartIfPlaying();
    invalidateSnapshot();
    notifyChange();
  }

  function setScaleChoice(choice: ScaleChoice): void {
    invalidateSnapshot();
    currentScaleChoice = choice;
    recomputeAndRetune();
    restartIfPlaying();
    invalidateSnapshot();
    notifyChange();
  }

  function setSettings(newSettings: SessionSettings): void {
    invalidateSnapshot();
    // practice.session/REQ-014/S3 — changing who leads while a run (playback
    // or a lead run) is in progress stops it first and shows the new mode
    // idle, rather than leaving the old run going under the new mode's
    // settings. A run in progress either side of the switch: the transport
    // not idle (play along) or listeningOwner "lead" (a lead run listening,
    // or still asking to).
    if (
      newSettings.lead.who !== currentSettings.lead.who &&
      (transport.kind !== "idle" || listeningOwner === "lead")
    ) {
      stop();
    }
    // practice.session/REQ-014, REQ-015, REQ-022 — a complete or cannot-hear
    // card has no run (listeningOwner "none"), so the stop above never
    // reaches it; a changed mode clears it, in both directions. A `who`
    // that did not change leaves it (REQ-019: the sheet's other settings
    // never clear it).
    if (
      newSettings.lead.who !== currentSettings.lead.who &&
      leadPhase.kind !== "idle"
    ) {
      clearLeadCard();
    }
    currentSettings = newSettings;
    // stop() above (when called) already rebuilt and cached a snapshot of
    // its own, from the *old* settings — invalidated again here so the
    // notifyChange() below reads one built from the settings just stored,
    // not stop()'s stale one.
    invalidateSnapshot();
    notifyChange();
  }

  // listening.pitch-detection's worklet/wasm setup failures (the port
  // never being reached at all) fold into the tuner's own "failed" reason —
  // practice.tuner/REQ-007 shows the same "Can't hear" card either way.
  function cannotHearReasonOf(
    reason: "refused" | "none" | "failed" | "worklet-failed" | "wasm-failed",
  ): "refused" | "none" | "failed" {
    return reason === "worklet-failed" || reason === "wasm-failed"
      ? "failed"
      : reason;
  }

  // practice.tuner/REQ-001, REQ-008 — the shared second half of "starting
  // to listen": state → "starting", notify, then request the microphone;
  // settles on "listening" or "cannot-hear" once it resolves, unless
  // `tunerGeneration` has moved past `generation` in the meantime (a
  // leaveTuner() or a hidden event landing mid-await), in which case
  // whatever was just opened is released again instead — safe either way, a
  // no-op if start() failed. Shared by enterTuner() (called once its own
  // wakeLock.acquire() await has settled) and the onShown handler above
  // (REQ-008/S1: resumes listening without a tap; the wake lock is
  // untouched here — it was never released while hidden).
  function startListening(generation: number): void {
    invalidateSnapshot();
    tunerListeningState = { kind: "starting" };
    notifyChange();

    void (async () => {
      const result = await listening.start();
      if (tunerGeneration !== generation) {
        listening.stop();
        return;
      }
      invalidateSnapshot();
      tunerListeningState = result.ok
        ? { kind: "listening" }
        : {
            kind: "cannot-hear",
            reason: cannotHearReasonOf(result.error.reason),
          };
      notifyChange();
    })();
  }

  // practice.tuner/REQ-001, REQ-008; practice.session/REQ-015 — the shared
  // "wait for the wake lock, then ask to listen" trampoline both
  // enterTuner() and startLead() run after committing to a request
  // (`listeningOwner`/their own generation already set synchronously, before
  // this is called): once the wake lock resolves, hand off to `onReady` —
  // unless a later call has superseded this one in the meantime, in which
  // case `onReady` never runs. `isCurrent` stays each caller's own
  // generation check (tunerGeneration/leadGeneration) rather than folding
  // into `owner` alone: a *second* call for the same owner (a second
  // enterTuner(), say) must supersede the first just as surely as the other
  // subsystem taking over would, and only the caller's own generation
  // distinguishes those two from one another.
  function requestListening(
    owner: "tuner" | "lead",
    isCurrent: () => boolean,
    onReady: () => void,
  ): void {
    void (async () => {
      await wakeLock.acquire();
      if (listeningOwner !== owner || !isCurrent()) return;
      onReady();
    })();
  }

  // practice.session/REQ-015 — the "me" branch of start(): stop the drone if
  // it sounds, then ask to listen exactly as enterTuner() does below (the
  // microphone is asked for "at that moment", never before) — a no-op on an
  // empty sequence (REQ-015/S8) or while a lead run is already listening or
  // still asking to (guarded by `listeningOwner`, since LeadPhase itself has
  // no "starting" of its own — `leadListeningState` carries that instead,
  // the same split as TunerSnapshot's `active`/`listening`).
  function startLead(): void {
    if (sequence.length === 0) return;
    if (listeningOwner === "lead") return;
    // practice.session/REQ-015/S6 — "no sequence note, click, drone or
    // tapped note" sounds while a lead run is in progress: a tap only ever
    // sounds while idle, which a lead run starting from idle does not by
    // itself end — found by this task's widened never-both enumeration
    // (tapNote → start-as-me). Bumping tapGeneration too supersedes a tap
    // still only pending (awaiting sound.start()), the same reasoning as
    // enterTuner()'s own bump.
    endTapIfSounding();
    tapGeneration += 1;
    // practice.session/REQ-015/S5 — the drone goes first: bumped
    // unconditionally, before the conditional stopDrone() — mirrors
    // stopAnyRun()'s own unconditional bump (the open note from T005): a
    // startDrone() that is only still pending (droneOn still false,
    // awaiting sound.start()/wakeLock.acquire()) must be superseded too, or
    // its continuation would post a drone under the lead run just starting.
    droneGeneration += 1;
    if (droneOn) stopDrone();
    invalidateSnapshot();
    listeningOwner = "lead";
    leadListeningState = { kind: "starting" };
    leadGeneration += 1;
    const startedAtGeneration = leadGeneration;
    notifyChange();

    requestListening(
      "lead",
      () => leadGeneration === startedAtGeneration,
      () => {
        void (async () => {
          const result = await listening.start();
          if (
            listeningOwner !== "lead" ||
            leadGeneration !== startedAtGeneration
          ) {
            // Superseded (a stop() or a second startLead()) while the
            // microphone was being asked for — if it actually opened, hand
            // it straight back rather than leaving it open under nobody's
            // name.
            if (result.ok) listening.stop();
            return;
          }
          invalidateSnapshot();
          if (result.ok) {
            leadListeningState = { kind: "listening" };
            // practice.session/REQ-015/S1 — the first target, pinned the
            // instant listening actually starts: the "listening" phase and
            // `TargetAdvanced` arrive together, never one before the other.
            const target = targetAt(sequence, 1);
            leadPhase = {
              kind: "listening",
              target,
              hold: emptyHold,
              mutedUntilMs: null,
            };
            const advancedEvent: TargetAdvanced = {
              note: target.note,
              position: 1,
              length: sequence.length,
              atFrame: listening.currentFrame(),
            };
            for (const listener of targetAdvancedListeners) {
              listener(advancedEvent);
            }
            // practice.session/REQ-018 — the tone cue, the first target
            // included.
            armCueTone(target);
          } else {
            // practice.session/REQ-022 — the attempt ends here rather than
            // leaving `listeningOwner` claimed: nothing is actually
            // listening, so the next tap of the start circle must be free
            // to try again (T009 tests the cannot-hear card itself). The
            // wake lock was acquired for this attempt alone (nothing else
            // is sounding or listening at this point) — released the same
            // way stop()'s lead branch releases it.
            listeningOwner = "none";
            const reason = cannotHearReasonOf(result.error.reason);
            leadListeningState = { kind: "cannot-hear", reason };
            leadPhase = { kind: "cannot-hear", reason };
            releaseWakeLockIfSilent();
          }
          notifyChange();
        })();
      },
    );
  }

  // practice.tuner/REQ-001 — the way in: stop playback and the drone (never
  // both sounding) before requesting listening, exactly as startDrone()
  // stops playback before requesting sound — same shape, same generation
  // guard (tunerGeneration) against a leaveTuner() landing mid-await. Unlike
  // startDrone(), the resource-committing call is itself awaited inside
  // startListening() above, so a single check after wakeLock.acquire()
  // cannot by itself protect it — a leaveTuner() (or a hidden event) that
  // lands while wakeLock.acquire() is still resolving must stop this
  // continuation from ever calling startListening() at all (checked by
  // requestListening(), before it); one that lands while listening.start()
  // itself is resolving is caught by startListening()'s own check.
  function enterTuner(): void {
    // practice.tuner/REQ-001/S3 — a tapped note is a named way in (its Given
    // lists "a tapped note sounding") and nothing sounds once the tuner
    // screen shows: end an already-*posted* tap the same way start() does,
    // before anything else — stop() below only reaches a sounding tap when
    // transport.kind is not "idle", but a tap only ever sounds while idle,
    // so without this an already-posted tap left sounding on entry never
    // gets silenced at all (found by T013's fixer-round enumeration:
    // tapNote → enterTuner). Bumping tapGeneration too supersedes a tap
    // that is only still *pending* (tappedTag still null, awaiting
    // sound.start()) — endTapIfSounding() alone cannot reach that one,
    // since it has no tag yet to stop (tapNotePending → enterTuner; see
    // tapGeneration above).
    endTapIfSounding();
    tapGeneration += 1;
    // practice.session/REQ-015/S7 — the Tuner pill ends a lead run first,
    // the same way ■ does; stopAnyRun() also bumps droneGeneration
    // unconditionally — mirrors start()'s own T022 fix: a startDrone() that
    // is only still pending (droneOn still false, awaiting
    // sound.start()/wakeLock.acquire()) is not caught by a plain
    // `if (droneOn) stopDrone()`, since droneOn only flips true once that
    // call's own post lands; without the unconditional bump, its
    // continuation would pass its own generation check and post a drone
    // after tunerActive is already true (found by T013's widened
    // never-both enumeration: droneOnPending → enterTuner).
    stopAnyRun();
    invalidateSnapshot();
    tunerActive = true;
    listeningOwner = "tuner";
    tunerGeneration += 1;
    const startedAtGeneration = tunerGeneration;
    notifyChange();

    requestListening(
      "tuner",
      () => tunerGeneration === startedAtGeneration,
      () => startListening(startedAtGeneration),
    );
  }

  // practice.tuner/REQ-001/S4 — the way out: release the microphone, forget
  // the target and the reading (REQ-009), and return to the practice screen
  // exactly as it was left. Bumping tunerGeneration here supersedes any
  // enterTuner() still awaiting wakeLock.acquire()/listening.start(), so its
  // continuation cannot overwrite the "off" state this sets with a stale
  // "listening"/"cannot-hear" once it resolves.
  function leaveTuner(): void {
    // practice.session/REQ-015/S6 — a no-op unless the tuner is actually
    // active: without this, leaveTuner() called while a lead run owns
    // listening (never reachable from the UI — entering the tuner always
    // stops a lead run first, REQ-015/S7 — but found by this task's
    // widened never-both enumeration: start-as-me → leaveTuner → droneOn)
    // would clobber `listeningOwner` back to "none" out from under the
    // still-"listening" lead run, letting startDrone()'s stopAnyRun() guard
    // (which checks `listeningOwner === "lead"`) miss it entirely.
    if (!tunerActive) return;
    invalidateSnapshot();
    tunerGeneration += 1;
    listening.stop();
    cancelTunerTimers();
    tunerActive = false;
    listeningOwner = "none";
    tunerListeningState = { kind: "off" };
    tunerTarget = { kind: "auto" };
    clearTunerReading();
    // practice.tuner/REQ-009/S3 — the last note heard is forgotten only
    // here, not by clearTunerReading()'s gap (that runs on every silence).
    tunerLastHeardPosition = null;
    releaseWakeLockIfSilent();
    notifyChange();
  }

  // Shared by every target verb below: pins `tunerTarget` at `position`,
  // bracketed by invalidateSnapshot()/notifyChange() — `targetNote` needs no
  // sync here any more, since buildSnapshot() derives it from `tunerTarget`
  // itself (practice.tuner/REQ-004).
  function pinTargetAt(position: number): void {
    invalidateSnapshot();
    tunerTarget = { kind: "pinned", position };
    // practice.tuner/REQ-002 — the first reading after the target changes is as detected
    tunerSmoothingState = initialSmoothingState;
    notifyChange();
  }

  // practice.tuner/REQ-004/S1, S7, S8 — Hold: pins the note playing now if
  // a reading is showing; otherwise, while nothing is heard, pins the last
  // note heard since the tuner was entered; a no-op while neither exists.
  function holdTarget(): void {
    if (tunerReading !== null) {
      pinTargetAt(pitchPosition(tunerReading.heard.nearest));
      return;
    }
    if (tunerLastHeardPosition !== null) {
      pinTargetAt(tunerLastHeardPosition);
    }
  }

  // practice.tuner/REQ-004/S2 — a wedge of the spiral: clamped to E2–C7 so a
  // tap outside the instrument's drawn range still lands somewhere real.
  function pinTarget(position: number): void {
    pinTargetAt(
      Math.max(
        TUNER_LOWEST_POSITION,
        Math.min(TUNER_HIGHEST_POSITION, position),
      ),
    );
  }

  // practice.tuner/REQ-004/S4 — − / + move the pinned note a semitone; a
  // no-op on auto (canStepTarget already says no) or at either bound. The
  // `tunerTarget.kind !== "pinned"` check (redundant with canStepTarget's
  // own guard) is what lets TypeScript narrow `tunerTarget.position` below.
  function stepTarget(delta: -1 | 1): void {
    if (tunerTarget.kind !== "pinned" || !canStepTarget(tunerTarget, delta)) {
      return;
    }
    pinTargetAt(tunerTarget.position + delta);
  }

  // practice.tuner/REQ-004/S5 — ✕ / Auto: back to the nearest note. The
  // shown-note hysteresis (tunerShownPosition) needs no reset here: while
  // pinned, judge() already keeps it at the nearest note of every detection
  // (see tuner.ts), so it is never stale by the time auto reads it.
  function clearTarget(): void {
    invalidateSnapshot();
    tunerTarget = { kind: "auto" };
    // practice.tuner/REQ-002 — the first reading after the target changes is as detected
    tunerSmoothingState = initialSmoothingState;
    notifyChange();
  }

  // practice.tuner/REQ-006 (Article V) — a pure read of the age of the
  // reading painted at `atFrame`, against the listening port's own clock;
  // never changes state. The UI calls this from a useLayoutEffect right
  // after painting a reading, for the measured harness to read back.
  function readingShown(atFrame: number): number {
    return (
      ((listening.currentFrame() - atFrame) / listening.sampleRate()) * 1000
    );
  }

  function onNoteJudged(listener: (event: NoteJudged) => void): () => void {
    noteJudgedListeners.add(listener);
    return () => noteJudgedListeners.delete(listener);
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
    unsubscribeListeningPitch();
    unsubscribeListeningEnded();
    unsubscribeListeningShown();
    cancelTunerTimers();
    // practice.drone/REQ-007 — release the drone's own voice and wake lock
    // before the port itself goes away, rather than leaving it to whatever
    // sound.dispose() happens to do with a live voice.
    stopDrone();
    // practice.tuner/REQ-001 — release the microphone too, the same reason.
    if (tunerActive) listening.stop();
    // practice.session/REQ-015 — and a lead run's, the same reason.
    if (listeningOwner === "lead") listening.stop();
    sound.dispose();
    changeListeners.clear();
    targetAdvancedListeners.clear();
    noteJudgedListeners.clear();
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
    tapNote,
    enterTuner,
    leaveTuner,
    holdTarget,
    pinTarget,
    stepTarget,
    clearTarget,
    readingShown,
    onNoteJudged,
    onTargetAdvanced,
    onChange,
    dispose,
  };
}
