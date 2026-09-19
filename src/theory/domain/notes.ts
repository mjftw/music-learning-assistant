export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type Accidental = "natural" | "sharp" | "flat";

export interface PitchClass {
  readonly letter: NoteLetter;
  readonly accidental: Accidental;
}

export interface Note extends PitchClass {
  readonly octave: number;
}

export const LETTER_SEMITONE: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const ACCIDENTAL_OFFSET: Record<Accidental, number> = {
  flat: -1,
  natural: 0,
  sharp: 1,
};

export function pitchPosition(note: Note): number {
  // Scientific pitch notation: the octave increments at C, and C4 is middle
  // C (semitone 60 — the widespread MIDI convention where MIDI note 60 =
  // C4). Hence the extra "+ 1" group of twelve semitones.
  return (
    12 * (note.octave + 1) +
    LETTER_SEMITONE[note.letter] +
    ACCIDENTAL_OFFSET[note.accidental]
  );
}

const NOTE_STRING_PATTERN = /^([A-G])(#|b)?([0-8])$/;

const ACCIDENTAL_SYMBOL: Record<string, Accidental> = {
  "#": "sharp",
  b: "flat",
};

// Parses note strings like "A4", "F#5", "Bb3" (letter, optional accidental,
// octave) into a Note. Shared by any code that reads notes from text —
// currently the instrument catalogue's data files.
export function parseNoteString(input: string): Note | null {
  const match = NOTE_STRING_PATTERN.exec(input);
  if (match === null) return null;
  const [, letter, accidentalSymbol, octaveDigits] = match;
  if (letter === undefined || octaveDigits === undefined) return null;
  const accidental: Accidental =
    accidentalSymbol === undefined
      ? "natural"
      : ACCIDENTAL_SYMBOL[accidentalSymbol]!;
  return {
    letter: letter as NoteLetter,
    accidental,
    octave: Number.parseInt(octaveDigits, 10),
  };
}

// Internal helper shared by keys.ts and circle.ts — not part of the
// published surface. Finds the single accidental that spells `letter` at
// `targetSemitone` (0-11), or throws if no natural/sharp/flat reaches it.
export function accidentalForTarget(
  letter: NoteLetter,
  targetSemitone: number,
): Accidental {
  const letterSemitone = LETTER_SEMITONE[letter];
  const diff = (((targetSemitone - letterSemitone) % 12) + 12) % 12;
  if (diff === 0) return "natural";
  if (diff === 1) return "sharp";
  if (diff === 11) return "flat";
  throw new Error(
    `cannot spell letter ${letter} to reach semitone ${targetSemitone} with a single accidental`,
  );
}
