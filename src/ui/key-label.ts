import type { Accidental, Key } from "../theory/published";

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
