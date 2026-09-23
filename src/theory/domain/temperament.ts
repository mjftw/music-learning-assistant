import type { Note } from "./notes";
import { pitchPosition } from "./notes";

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
