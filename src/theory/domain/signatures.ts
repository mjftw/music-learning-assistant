import { scaleNotesOf, type Key, type Mode } from "./keys";
import type { NoteLetter, PitchClass } from "./notes";

export type SignatureKind = "sharps" | "flats" | "none";

export interface Signature {
  readonly kind: SignatureKind;
  readonly count: number;
  readonly accidentals: readonly PitchClass[];
}

const SHARP_ORDER: readonly NoteLetter[] = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER: readonly NoteLetter[] = ["B", "E", "A", "D", "G", "C", "F"];

export function signatureOf(key: Key): Signature {
  const scale = scaleNotesOf(key);
  const sharps = scale.filter(
    (pitchClass) => pitchClass.accidental === "sharp",
  );
  const flats = scale.filter((pitchClass) => pitchClass.accidental === "flat");

  if (sharps.length > 0) {
    const accidentals = SHARP_ORDER.filter((letter) =>
      sharps.some((pitchClass) => pitchClass.letter === letter),
    ).map((letter) => ({ letter, accidental: "sharp" as const }));
    return { kind: "sharps", count: accidentals.length, accidentals };
  }

  if (flats.length > 0) {
    const accidentals = FLAT_ORDER.filter((letter) =>
      flats.some((pitchClass) => pitchClass.letter === letter),
    ).map((letter) => ({ letter, accidental: "flat" as const }));
    return { kind: "flats", count: accidentals.length, accidentals };
  }

  return { kind: "none", count: 0, accidentals: [] };
}

export function newAccidentalOf(key: Key): PitchClass | null {
  const signature = signatureOf(key);
  if (signature.count === 0) return null;
  const last = signature.accidentals[signature.accidentals.length - 1];
  if (last === undefined) throw new Error("unreachable");
  return last;
}

const RELATIVE_DEGREE: Record<Mode, number> = {
  major: 5,
  naturalMinor: 2,
};

const RELATIVE_MODE: Record<Mode, Mode> = {
  major: "naturalMinor",
  naturalMinor: "major",
};

export function relativeOf(key: Key): Key {
  const scale = scaleNotesOf(key);
  const degree = RELATIVE_DEGREE[key.mode];
  const relativeTonic = scale[degree];
  if (relativeTonic === undefined) throw new Error("unreachable");
  return { tonic: relativeTonic, mode: RELATIVE_MODE[key.mode] };
}
