import type { Key, Mode } from "./keys";
import {
  ACCIDENTAL_OFFSET,
  LETTER_SEMITONE,
  accidentalForTarget,
  type NoteLetter,
  type PitchClass,
} from "./notes";
import { signatureOf } from "./signatures";

export type ScaleId =
  | "major"
  | "major-pentatonic"
  | "lydian"
  | "mixolydian"
  | "harmonic-major"
  | "natural-minor"
  | "harmonic-minor"
  | "melodic-minor-classical"
  | "melodic-minor-jazz"
  | "minor-pentatonic"
  | "blues"
  | "dorian"
  | "phrygian"
  | "locrian"
  | "whole-tone"
  | "chromatic";

export type ScaleFamily = "major" | "minor" | "either";

export type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ScaleDegree {
  readonly degree: Degree;
  readonly semitones: number;
}

export type Formula =
  | { readonly kind: "fixed"; readonly degrees: readonly ScaleDegree[] }
  | {
      readonly kind: "bySignature";
      readonly sharps: readonly ScaleDegree[];
      readonly flats: readonly ScaleDegree[];
    };

export interface Scale {
  readonly id: ScaleId;
  readonly family: ScaleFamily;
  readonly name: string;
  readonly title: string;
  readonly ascending: Formula;
  readonly descending: Formula | null;
  readonly note: string | null;
  readonly offersArpeggio: boolean;
}

function degree(degreeNumber: Degree, semitones: number): ScaleDegree {
  return { degree: degreeNumber, semitones };
}

function fixed(degrees: readonly ScaleDegree[]): Formula {
  return { kind: "fixed", degrees };
}

// Builds a derived formula by overriding the semitone count of the given
// degrees of `base` (major or natural minor), leaving the rest unchanged —
// e.g. Lydian is major with its 4th raised a semitone.
function withAlterations(
  base: readonly ScaleDegree[],
  changes: Partial<Record<Degree, number>>,
): Formula {
  return fixed(
    base.map((entry) => {
      const semitones = changes[entry.degree];
      return semitones === undefined ? entry : degree(entry.degree, semitones);
    }),
  );
}

const MAJOR_DEGREES: readonly ScaleDegree[] = [
  degree(1, 0),
  degree(2, 2),
  degree(3, 4),
  degree(4, 5),
  degree(5, 7),
  degree(6, 9),
  degree(7, 11),
];

const NATURAL_MINOR_DEGREES: readonly ScaleDegree[] = [
  degree(1, 0),
  degree(2, 2),
  degree(3, 3),
  degree(4, 5),
  degree(5, 7),
  degree(6, 8),
  degree(7, 10),
];

const MAJOR = fixed(MAJOR_DEGREES);
const NATURAL_MINOR = fixed(NATURAL_MINOR_DEGREES);
const LYDIAN = withAlterations(MAJOR_DEGREES, { 4: 6 });
const MIXOLYDIAN = withAlterations(MAJOR_DEGREES, { 7: 10 });
const HARMONIC_MAJOR = withAlterations(MAJOR_DEGREES, { 6: 8 });
const HARMONIC_MINOR = withAlterations(NATURAL_MINOR_DEGREES, { 7: 11 });
const MELODIC_MINOR_ASCENDING = withAlterations(NATURAL_MINOR_DEGREES, {
  6: 9,
  7: 11,
});
const DORIAN = withAlterations(NATURAL_MINOR_DEGREES, { 6: 9 });
const PHRYGIAN = withAlterations(NATURAL_MINOR_DEGREES, { 2: 1 });
const LOCRIAN = withAlterations(NATURAL_MINOR_DEGREES, { 2: 1, 5: 6 });

const MAJOR_PENTATONIC = fixed([
  degree(1, 0),
  degree(2, 2),
  degree(3, 4),
  degree(5, 7),
  degree(6, 9),
]);

const MINOR_PENTATONIC = fixed([
  degree(1, 0),
  degree(3, 3),
  degree(4, 5),
  degree(5, 7),
  degree(7, 10),
]);

// Two degree-5 entries (♭5 and 5), as designed — nothing dedupes by degree.
const BLUES = fixed([
  degree(1, 0),
  degree(3, 3),
  degree(4, 5),
  degree(5, 6),
  degree(5, 7),
  degree(7, 10),
]);

const WHOLE_TONE = fixed([
  degree(1, 0),
  degree(2, 2),
  degree(3, 4),
  degree(4, 6),
  degree(6, 8),
  degree(7, 10),
]);

const CHROMATIC: Formula = {
  kind: "bySignature",
  sharps: [
    degree(1, 0),
    degree(1, 1),
    degree(2, 2),
    degree(2, 3),
    degree(3, 4),
    degree(4, 5),
    degree(4, 6),
    degree(5, 7),
    degree(5, 8),
    degree(6, 9),
    degree(6, 10),
    degree(7, 11),
  ],
  flats: [
    degree(1, 0),
    degree(2, 1),
    degree(2, 2),
    degree(3, 3),
    degree(3, 4),
    degree(4, 5),
    degree(5, 6),
    degree(5, 7),
    degree(6, 8),
    degree(6, 9),
    degree(7, 10),
    degree(7, 11),
  ],
};

export const SCALES: readonly Scale[] = [
  {
    id: "major",
    family: "major",
    name: "Major",
    title: "major",
    ascending: MAJOR,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "major-pentatonic",
    family: "major",
    name: "Major pentatonic",
    title: "major pentatonic",
    ascending: MAJOR_PENTATONIC,
    descending: null,
    note: null,
    offersArpeggio: false,
  },
  {
    id: "lydian",
    family: "major",
    name: "Lydian",
    title: "Lydian",
    ascending: LYDIAN,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "mixolydian",
    family: "major",
    name: "Mixolydian",
    title: "Mixolydian",
    ascending: MIXOLYDIAN,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "harmonic-major",
    family: "major",
    name: "Harmonic major",
    title: "harmonic major",
    ascending: HARMONIC_MAJOR,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "natural-minor",
    family: "minor",
    name: "Natural minor",
    title: "minor",
    ascending: NATURAL_MINOR,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "harmonic-minor",
    family: "minor",
    name: "Harmonic minor",
    title: "harmonic minor",
    ascending: HARMONIC_MINOR,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "melodic-minor-classical",
    family: "minor",
    name: "Melodic minor · classical",
    title: "melodic minor",
    ascending: MELODIC_MINOR_ASCENDING,
    descending: NATURAL_MINOR,
    note: "↓ natural",
    offersArpeggio: true,
  },
  {
    id: "melodic-minor-jazz",
    family: "minor",
    name: "Melodic minor · jazz",
    title: "jazz minor",
    ascending: MELODIC_MINOR_ASCENDING,
    descending: null,
    note: "both ways",
    offersArpeggio: true,
  },
  {
    id: "minor-pentatonic",
    family: "minor",
    name: "Minor pentatonic",
    title: "minor pentatonic",
    ascending: MINOR_PENTATONIC,
    descending: null,
    note: null,
    offersArpeggio: false,
  },
  {
    id: "blues",
    family: "minor",
    name: "Blues",
    title: "blues",
    ascending: BLUES,
    descending: null,
    note: null,
    offersArpeggio: false,
  },
  {
    id: "dorian",
    family: "minor",
    name: "Dorian",
    title: "Dorian",
    ascending: DORIAN,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "phrygian",
    family: "minor",
    name: "Phrygian",
    title: "Phrygian",
    ascending: PHRYGIAN,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "locrian",
    family: "minor",
    name: "Locrian",
    title: "Locrian",
    ascending: LOCRIAN,
    descending: null,
    note: null,
    offersArpeggio: true,
  },
  {
    id: "whole-tone",
    family: "either",
    name: "Whole tone",
    title: "whole tone",
    ascending: WHOLE_TONE,
    descending: null,
    note: null,
    offersArpeggio: false,
  },
  {
    id: "chromatic",
    family: "either",
    name: "Chromatic",
    title: "chromatic",
    ascending: CHROMATIC,
    descending: null,
    note: null,
    offersArpeggio: false,
  },
];

export function scaleById(id: ScaleId): Scale {
  const scale = SCALES.find((candidate) => candidate.id === id);
  if (scale === undefined) throw new Error("unreachable");
  return scale;
}

export function scalesForMode(mode: Mode): readonly Scale[] {
  const family: ScaleFamily = mode === "major" ? "major" : "minor";
  return SCALES.filter(
    (scale) => scale.family === family || scale.family === "either",
  );
}

export interface ScaleNote {
  readonly pitchClass: PitchClass;
  readonly degree: Degree;
  readonly degreeLabel: string;
  readonly altered: boolean;
}

export interface SpelledScale {
  readonly ascending: readonly ScaleNote[];
  readonly descending: readonly ScaleNote[] | null;
  readonly formulaLine: string;
}

// The "home" reference degreeLabel is relative to: the tonic's own major or
// natural-minor form, per docs/plan's design — not the scale's own formula.
const MAJOR_HOME_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];
const MINOR_HOME_SEMITONES: readonly number[] = [0, 2, 3, 5, 7, 8, 10];

function homeSemitonesFor(family: ScaleFamily, mode: Mode): readonly number[] {
  if (family === "major") return MAJOR_HOME_SEMITONES;
  if (family === "minor") return MINOR_HOME_SEMITONES;
  return mode === "major" ? MAJOR_HOME_SEMITONES : MINOR_HOME_SEMITONES;
}

const LETTER_ORDER: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];

function degreesOf(formula: Formula, key: Key): readonly ScaleDegree[] {
  if (formula.kind === "fixed") return formula.degrees;
  return signatureOf(key).kind === "flats" ? formula.flats : formula.sharps;
}

function spellDegree(
  key: Key,
  entry: ScaleDegree,
  home: readonly number[],
): ScaleNote {
  const tonicLetterIndex = LETTER_ORDER.indexOf(key.tonic.letter);
  const letter = LETTER_ORDER[(tonicLetterIndex + entry.degree - 1) % 7];
  if (letter === undefined) throw new Error("unreachable");

  const tonicSemitone =
    LETTER_SEMITONE[key.tonic.letter] + ACCIDENTAL_OFFSET[key.tonic.accidental];
  const target = (((tonicSemitone + entry.semitones) % 12) + 12) % 12;
  const pitchClass: PitchClass = {
    letter,
    accidental: accidentalForTarget(letter, target),
  };

  const homeSemitone = home[entry.degree - 1];
  if (homeSemitone === undefined) throw new Error("unreachable");
  let alt = entry.semitones - homeSemitone;
  if (alt > 6) alt -= 12;
  if (alt < -6) alt += 12;
  const prefix = alt > 0 ? "♯".repeat(alt) : alt < 0 ? "♭".repeat(-alt) : "";
  const degreeLabel = `${prefix}${entry.degree}`;

  return { pitchClass, degree: entry.degree, degreeLabel, altered: alt !== 0 };
}

export function spelledScaleOf(key: Key, scale: Scale): SpelledScale {
  const home = homeSemitonesFor(scale.family, key.mode);
  const ascending = degreesOf(scale.ascending, key).map((entry) =>
    spellDegree(key, entry, home),
  );
  const descending =
    scale.descending === null
      ? null
      : degreesOf(scale.descending, key).map((entry) =>
          spellDegree(key, entry, home),
        );
  const formulaLine =
    ascending.map((note) => note.degreeLabel).join(" ") +
    (scale.note === null ? "" : ` · ${scale.note}`);

  return { ascending, descending, formulaLine };
}
