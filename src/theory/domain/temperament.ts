import type { SpellingPreference } from "./arc";
import type { Note } from "./notes";
import { noteAtPosition, pitchPosition } from "./notes";

// A440 equal temperament: A4 (semitone 69 in pitchPosition's numbering) is
// the reference pitch, and every semitone away from it is a ratio of the
// twelfth root of two.
export const REFERENCE_A4_HZ = 440;
const REFERENCE_A4_POSITION = 69;
const SEMITONES_PER_OCTAVE = 12;

export function pitchHzOf(note: Note): number {
  const semitonesFromA4 = pitchPosition(note) - REFERENCE_A4_POSITION;
  return REFERENCE_A4_HZ * 2 ** (semitonesFromA4 / SEMITONES_PER_OCTAVE);
}

// The inverse of pitchHzOf: the nearest note under A440 equal temperament
// and the signed offset from it in whole cents (-50..+50; a frequency
// exactly halfway rounds up to the upper note, at -50 — Math.round's own
// "round half up" is exactly that rule). hz must be greater than zero; the
// published port's schema guarantees this at the boundary, so a violation
// here is a programming error, not an expected failure.
export function nearestNoteOf(
  hz: number,
  spelling: SpellingPreference,
): { readonly note: Note; readonly cents: number } {
  if (!(hz > 0)) {
    throw new RangeError(`nearestNoteOf: hz must be greater than 0, got ${hz}`);
  }
  const position = Math.round(
    REFERENCE_A4_POSITION +
      SEMITONES_PER_OCTAVE * Math.log2(hz / REFERENCE_A4_HZ),
  );
  const note = noteAtPosition(position, spelling);
  // "+ 0" folds a -0 result (Math.round of a hz an insignificant sliver
  // below the note's exact pitch) back to 0 — the note is in tune either
  // way, and -0 !== 0 under deep equality.
  const cents = Math.round(1200 * Math.log2(hz / pitchHzOf(note))) + 0;
  return { note, cents };
}
