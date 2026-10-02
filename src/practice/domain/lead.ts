// The lead settings — who leads, the Hold, the In tune tolerance and the
// Cues — plus the hints the Traversal sheet shows beneath each row
// (practice.session/REQ-016, REQ-018, REQ-020) — and the hold rule itself,
// a pure reducer over a lead run's phase (practice.session/REQ-015,
// REQ-016). Pure (docs/engineering.md §2: functional core).

import type { Note, SequenceNote } from "../../theory/published";
import type { NoteJudged } from "../published/note-judged.schema";

export type Who = "tool" | "me";
export type HoldBeats = 1 | 2 | 4;
export type Tolerance = "lenient" | "medium" | "accurate";

export const TOLERANCE_CENTS: Readonly<Record<Tolerance, number>> = {
  lenient: 15,
  medium: 10,
  accurate: 5,
};

export interface LeadSettings {
  readonly who: Who;
  readonly holdBeats: HoldBeats;
  readonly tolerance: Tolerance;
  readonly cueMeter: boolean;
  readonly cueTone: boolean;
}

export const defaultLeadSettings: LeadSettings = {
  who: "tool",
  holdBeats: 2,
  tolerance: "medium",
  cueMeter: true,
  cueTone: false,
};

// beats × 60000 / tempo — practice.session/REQ-016
export function requiredHoldMs(beats: HoldBeats, tempoBpm: number): number {
  return (beats * 60000) / tempoBpm;
}

// "Beats in tune, then the next · <s> s" — s = beats × 60 / tempo to one
// decimal, half rounded up (practice.session/REQ-020/S4).
export function holdHintOf(beats: HoldBeats, tempoBpm: number): string {
  const seconds = (beats * 60) / tempoBpm;
  const rounded = Math.round(seconds * 10 + Number.EPSILON) / 10;
  return `Beats in tune, then the next · ${rounded.toFixed(1)} s`;
}

// "Within <c>% of the way to the next note" — practice.session/REQ-020
export function toleranceHintOf(tolerance: Tolerance): string {
  return `Within ${TOLERANCE_CENTS[tolerance]}% of the way to the next note`;
}

// The Cues row's hint, both pills considered — practice.session/REQ-018
export function cuesHintOf(cueMeter: boolean, cueTone: boolean): string {
  if (cueMeter && cueTone) return "Sharp/flat on the note · a tone per note";
  if (cueMeter) return "Shows sharp or flat on the note";
  if (cueTone) return "A short tone as each note comes up";
  return "Just the note highlight";
}

// The Who leads row's hint — practice.session/REQ-020
export function whoHintOf(who: Who): string {
  return who === "tool" ? "It plays, you follow" : "It listens, you play";
}

// practice.session/REQ-017: silence clears the pitch line (shares the
// tuner's value by name, not by constant).
export const LEAD_GAP_MS = 300;
// practice.session/REQ-018: the tone cue's length, and how long after its
// release nothing is judged.
export const CUE_TONE_MS = 400;
export const CUE_TAIL_MS = 100;
// practice.session/REQ-017: "<note> held ✓" shows this long in silence.
export const HELD_TICK_MS = 400;

export interface LeadTarget {
  readonly position: number; // 1-based position in the sequence
  readonly note: Note;
  readonly runIndex: number;
}

export interface Hold {
  readonly heldMs: number;
  readonly lastInTuneAtMs: number | null;
}

export type LeadPhase =
  | { readonly kind: "idle" }
  | {
      readonly kind: "listening";
      readonly target: LeadTarget;
      readonly hold: Hold;
      readonly mutedUntilMs: number | null;
    }
  | { readonly kind: "complete" }
  | {
      readonly kind: "cannot-hear";
      readonly reason: "refused" | "none" | "failed";
    };

export const emptyHold: Hold = { heldMs: 0, lastInTuneAtMs: null };

// The sequence's 1-based position `position` as a `LeadTarget` — a bug if
// `position` falls outside 1..sequence.length, never an input a caller
// should see at runtime.
export function targetAt(
  sequence: readonly SequenceNote[],
  position: number,
): LeadTarget {
  if (position < 1 || position > sequence.length) {
    throw new RangeError(
      `targetAt: position ${position} outside 1..${sequence.length}`,
    );
  }
  const entry = sequence[position - 1]!;
  return { position, note: entry.note, runIndex: entry.runIndex };
}

// The three rules of practice.session/REQ-015 for what follows a completed
// hold: the next position, or the wrap to the first note when looping, or
// the run's completion.
function nextPhaseAfterHold(
  position: number,
  sequence: readonly SequenceNote[],
  loop: boolean,
): LeadPhase {
  if (position < sequence.length) {
    return {
      kind: "listening",
      target: targetAt(sequence, position + 1),
      hold: emptyHold,
      mutedUntilMs: null,
    };
  }
  return loop
    ? {
        kind: "listening",
        target: targetAt(sequence, 1),
        hold: emptyHold,
        mutedUntilMs: null,
      }
    : { kind: "complete" };
}

// The hold rule, pure (practice.session/REQ-016): accumulates hold time
// between consecutive in-tune readings, resets it on a reading that is not
// in tune, and advances the target once the accumulated hold reaches the
// required hold for the current settings and tempo. The reducer trusts
// `judged.verdict` — the caller computes it at the tolerance.
export function applyJudgement(
  phase: LeadPhase,
  judged: NoteJudged,
  atMs: number,
  settings: LeadSettings,
  tempoBpm: number,
  sequence: readonly SequenceNote[],
  loop: boolean,
): { readonly phase: LeadPhase; readonly advanced: boolean } {
  if (phase.kind !== "listening") return { phase, advanced: false };

  const hold: Hold =
    judged.verdict === "in-tune"
      ? {
          heldMs:
            phase.hold.heldMs +
            (phase.hold.lastInTuneAtMs === null
              ? 0
              : atMs - phase.hold.lastInTuneAtMs),
          lastInTuneAtMs: atMs,
        }
      : emptyHold;

  if (hold.heldMs >= requiredHoldMs(settings.holdBeats, tempoBpm)) {
    return {
      phase: nextPhaseAfterHold(phase.target.position, sequence, loop),
      advanced: true,
    };
  }

  return { phase: { ...phase, hold }, advanced: false };
}

// practice.session/REQ-016: nothing detected neither adds to the hold nor
// resets it — only the "last in tune at" marker is cleared, so the next
// reading's elapsed time is measured from itself, not across the gap.
export function applySilence(phase: LeadPhase): LeadPhase {
  if (phase.kind !== "listening") return phase;
  return { ...phase, hold: { ...phase.hold, lastInTuneAtMs: null } };
}

// The meter's fill — practice.session/REQ-017 — clamped to [0, 1]; 0 when
// there is nothing to divide by.
export function heldFractionOf(hold: Hold, requiredMs: number): number {
  if (requiredMs <= 0) return 0;
  return Math.min(1, hold.heldMs / requiredMs);
}
