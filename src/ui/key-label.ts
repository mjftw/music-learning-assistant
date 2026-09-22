import type { Accidental, Key, Note } from "../theory/published";

const ACCIDENTAL_SYMBOL: Record<Accidental, string> = {
  flat: "♭",
  natural: "",
  sharp: "♯",
};

export function pitchClassLabel(pitchClass: {
  readonly letter: string;
  readonly accidental: Accidental;
}): string {
  return `${pitchClass.letter}${ACCIDENTAL_SYMBOL[pitchClass.accidental]}`;
}

export function keyLabel(key: Key): string {
  const modeLabel = key.mode === "major" ? "major" : "minor";
  return `${pitchClassLabel(key.tonic)} ${modeLabel}`;
}

// The circle wedge's own visible text: the tonic alone for major, the tonic
// plus a trailing "m" for minor (e.g. "F♯", "Em") — shorter than `keyLabel`
// because it sits inside a small wedge rather than standing as a heading.
export function wedgeLabel(key: Key): string {
  return key.mode === "major"
    ? pitchClassLabel(key.tonic)
    : `${pitchClassLabel(key.tonic)}m`;
}

export function noteLabel(note: Note): string {
  return `${pitchClassLabel(note)}${note.octave}`;
}
