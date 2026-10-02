// The tuner's rules, pure — practice.tuner/REQ-002, REQ-004. Turns a
// PitchDetected into a NoteJudged: which note the reading is measured
// against (the nearest note, held with hysteresis, on auto; the pinned
// note when a target is set), how far off in cents, and the verdict.
// No IO, no session state beyond what is threaded through as arguments
// (docs/engineering.md §2: functional core).

import type { Note, SpellingPreference } from "../../theory/published";
import {
  nearestNoteOf,
  noteAtPosition,
  pitchHzOf,
  pitchPosition,
} from "../../theory/published";
import type { PitchDetected } from "../../listening/published/pitch-detected.schema";
import type { NoteJudged, Verdict } from "../published/note-judged.schema";

export const IN_TUNE_BAND_CENTS = 5;
export const HANDOVER_CENTS = 56;
export const READING_MAX_AGE_MS = 100;
export const TUNER_LOWEST_POSITION = 40; // E2 in theory's pitchPosition numbering (C4 = 60)
export const TUNER_HIGHEST_POSITION = 96; // C7

export type TunerTarget =
  | { readonly kind: "auto" }
  | { readonly kind: "pinned"; readonly position: number };

export type ListeningState =
  | { readonly kind: "off" }
  | { readonly kind: "starting" }
  | { readonly kind: "listening" }
  | {
      readonly kind: "cannot-hear";
      readonly reason: "refused" | "none" | "failed";
    };

export interface TunerSnapshot {
  readonly active: boolean;
  readonly listening: ListeningState;
  readonly target: TunerTarget;
  readonly targetNote: Note | null;
  readonly reading: NoteJudged | null;
  // practice.tuner/REQ-004/S7, REQ-009/S3 — the last note heard since the
  // tuner was entered, spelled per the preference like `targetNote`; kept
  // through a gap, a hidden page or a failed microphone, forgotten only on
  // leaveTuner(). Hold pins this once `reading` has cleared, and the
  // spiral's needle rests greyed on it.
  readonly lastHeard: Note | null;
  readonly canStepDown: boolean;
  readonly canStepUp: boolean;
}

/**
 * The position to show on auto: `shown` unless it is null or the pitch is
 * ≥ HANDOVER_CENTS from it, then the nearest note's position.
 */
export function nearestWithHandover(shown: number | null, hz: number): number {
  if (shown === null) {
    return pitchPosition(nearestNoteOf(hz, "sharp").note);
  }
  const shownNote = noteAtPosition(shown, "sharp");
  // Compares the raw (unrounded) offset, not centsFrom's whole-cent display
  // value: rounding first would let a raw offset as low as 55.5 ¢ (which
  // rounds to 56) trigger the hand-over early (practice.tuner/REQ-002 — the
  // shown note holds until the detected pitch is 56 ¢ from it).
  if (Math.abs(rawCentsFrom(shownNote, hz)) >= HANDOVER_CENTS) {
    return pitchPosition(nearestNoteOf(hz, "sharp").note);
  }
  return shown;
}

/** cents from `note` to `hz`, whole, unclamped — for display */
export function centsFrom(note: Note, hz: number): number {
  // "+ 0" folds a -0 result (hz an insignificant sliver below note's exact
  // pitch) back to 0, matching theory's nearestNoteOf (-0 !== 0 under
  // deep equality).
  return Math.round(rawCentsFrom(note, hz)) + 0;
}

/** cents from `note` to `hz`, unrounded — for the hand-over comparison only */
function rawCentsFrom(note: Note, hz: number): number {
  return 1200 * Math.log2(hz / pitchHzOf(note));
}

// |cents| ≤ bandCents → "in-tune"; > 0 sharp; < 0 flat — the band defaults
// to the tuner's own (practice.session/REQ-016/S5 passes a lead tolerance).
export function verdictOf(
  cents: number,
  bandCents: number = IN_TUNE_BAND_CENTS,
): Verdict {
  if (Math.abs(cents) <= bandCents) return "in-tune";
  return cents > 0 ? "sharp" : "flat";
}

// Math.round(Math.abs(cents) / 100)
export function semitoneCountOf(cents: number): number {
  return Math.round(Math.abs(cents) / 100);
}

// pinned and within E2–C7 after the step
export function canStepTarget(target: TunerTarget, delta: -1 | 1): boolean {
  if (target.kind !== "pinned") return false;
  const stepped = target.position + delta;
  return stepped >= TUNER_LOWEST_POSITION && stepped <= TUNER_HIGHEST_POSITION;
}

function clampCents(cents: number): number {
  return Math.max(-50, Math.min(50, cents));
}

/**
 * The judgement: on auto the target is the shown note (after hand-over)
 * and cents are clamped to ±50; pinned, the target is the pinned note and
 * cents are unclamped. `heard.nearest` is always nearestNoteOf(hz).
 */
export function judge(
  pitch: PitchDetected,
  target: TunerTarget,
  shown: number | null,
  spelling: SpellingPreference,
): { readonly judged: NoteJudged; readonly shown: number } {
  const { hz, atFrame } = pitch;
  const nearest = nearestNoteOf(hz, spelling);
  const heard = { hz, nearest: nearest.note, cents: nearest.cents };

  if (target.kind === "auto") {
    const shownPosition = nearestWithHandover(shown, hz);
    const targetNote = noteAtPosition(shownPosition, spelling);
    const cents = clampCents(centsFrom(targetNote, hz));
    const judged: NoteJudged = {
      target: targetNote,
      cents,
      verdict: verdictOf(cents),
      heard,
      atFrame,
    };
    return { judged, shown: shownPosition };
  }

  const targetNote = noteAtPosition(target.position, spelling);
  const cents = centsFrom(targetNote, hz);
  const judged: NoteJudged = {
    target: targetNote,
    cents,
    verdict: verdictOf(cents),
    heard,
    atFrame,
  };
  // Pinned: `shown` becomes the nearest note's position, not the pinned
  // target's, so the hand-over state stays warm for when the target is
  // later cleared back to auto (Session.clearTarget) — nearestWithHandover
  // then resumes from wherever the ear actually was.
  return { judged, shown: pitchPosition(nearest.note) };
}

// practice.tuner/REQ-002 — the shown pitch is smoothed: each reading moves
// the smoothed pitch a tenth of the way from where it was to the detected
// pitch (an exponential low-pass filter, ~100 ms time constant at the
// tuner's ~90 readings/s); a detected pitch more than SNAP_CENTS away is a
// new pitch and is shown as detected, at once.
export const SMOOTHING_FACTOR = 0.1;
export const SNAP_CENTS = 25;

export interface SmoothingState {
  readonly key: number | null; // the shown/pinned position this state was built for
  readonly emaHz: number | null; // the smoothed pitch, in Hz
}

export const initialSmoothingState: SmoothingState = { key: null, emaHz: null };

// Which note `hz` is judged against: pinned, the target; auto, the same
// hand-over `judge` itself would land on.
function smoothingKeyOf(
  target: TunerTarget,
  shown: number | null,
  hz: number,
): number {
  return target.kind === "pinned"
    ? target.position
    : nearestWithHandover(shown, hz);
}

/**
 * practice.tuner/REQ-002 — moves the smoothed pitch a tenth of the way to
 * `hz`, or snaps to `hz` at once: on the first reading after a reset
 * (`state.emaHz === null`), when `hz` is more than SNAP_CENTS from the
 * smoothed pitch, or when the shown note or target has changed since the
 * last reading (the key mismatch).
 */
export function smoothedPitchHzOf(
  state: SmoothingState,
  target: TunerTarget,
  shown: number | null,
  hz: number,
): { readonly hz: number; readonly state: SmoothingState } {
  const continuedHz =
    state.emaHz !== null
      ? state.emaHz + (hz - state.emaHz) * SMOOTHING_FACTOR
      : hz;
  const jumped =
    state.emaHz !== null &&
    Math.abs(1200 * Math.log2(hz / state.emaHz)) > SNAP_CENTS;
  const continuedKey = smoothingKeyOf(target, shown, continuedHz);
  const continues = !jumped && state.key !== null && state.key === continuedKey;
  const smoothedHz = continues ? continuedHz : hz;
  const key = smoothingKeyOf(target, shown, smoothedHz);
  return { hz: smoothedHz, state: { key, emaHz: smoothedHz } };
}
