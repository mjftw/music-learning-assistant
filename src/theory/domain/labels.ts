import type { Note, PitchClass, Accidental } from "./notes";

const ACCIDENTAL_SYMBOL: Record<Accidental, string> = {
  flat: "♭",
  natural: "",
  sharp: "♯",
};

export function pitchClassLabel(pitchClass: PitchClass): string {
  return `${pitchClass.letter}${ACCIDENTAL_SYMBOL[pitchClass.accidental]}`;
}

export function noteLabel(note: Note): string {
  return `${pitchClassLabel(note)}${note.octave}`;
}
