import {
  ACCIDENTAL_OFFSET,
  LETTER_SEMITONE,
  accidentalForTarget,
  type NoteLetter,
  type PitchClass,
} from "./notes";

export type Mode = "major" | "naturalMinor";

export interface Key {
  readonly tonic: PitchClass;
  readonly mode: Mode;
}

export type KeyId = string & { readonly __brand: "KeyId" };

const LETTER_ORDER: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];

const MAJOR_STEPS: readonly number[] = [2, 2, 1, 2, 2, 2, 1];
const NATURAL_MINOR_STEPS: readonly number[] = [2, 1, 2, 2, 1, 2, 2];

function cumulativeSemitonesFromTonic(mode: Mode): readonly number[] {
  const steps = mode === "major" ? MAJOR_STEPS : NATURAL_MINOR_STEPS;
  const cumulative: number[] = [0];
  for (let i = 0; i < steps.length - 1; i += 1) {
    const previous = cumulative[cumulative.length - 1];
    const step = steps[i];
    if (previous === undefined || step === undefined)
      throw new Error("unreachable");
    cumulative.push(previous + step);
  }
  return cumulative;
}

function basePitchClassSemitone(pitchClass: PitchClass): number {
  return (
    LETTER_SEMITONE[pitchClass.letter] +
    ACCIDENTAL_OFFSET[pitchClass.accidental]
  );
}

export function scaleNotesOf(key: Key): readonly PitchClass[] {
  const tonicLetterIndex = LETTER_ORDER.indexOf(key.tonic.letter);
  const tonicSemitone = basePitchClassSemitone(key.tonic);
  const degreeOffsets = cumulativeSemitonesFromTonic(key.mode);
  return degreeOffsets.map((offset, degree) => {
    const letter =
      LETTER_ORDER[(tonicLetterIndex + degree) % LETTER_ORDER.length];
    if (letter === undefined) throw new Error("unreachable");
    const targetSemitone = (((tonicSemitone + offset) % 12) + 12) % 12;
    const accidental = accidentalForTarget(letter, targetSemitone);
    return { letter, accidental };
  });
}

export function keyId(key: Key): KeyId {
  const accidentalSymbol =
    key.tonic.accidental === "sharp"
      ? "#"
      : key.tonic.accidental === "flat"
        ? "b"
        : "";
  return `${key.tonic.letter}${accidentalSymbol}-${key.mode}` as KeyId;
}
