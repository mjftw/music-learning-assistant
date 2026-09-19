import {
  ACCIDENTAL_OFFSET,
  LETTER_SEMITONE,
  accidentalForTarget,
  type NoteLetter,
  type PitchClass,
} from "./notes";
import type { Key } from "./keys";
import { relativeOf } from "./signatures";

export interface CirclePosition {
  readonly index: number;
  readonly majors: readonly Key[];
  readonly minors: readonly Key[];
}

const LETTER_ORDER: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
const POSITIONS = 12;
const STEPS_PER_SIDE = 7;

// Walks clockwise around the circle by a perfect fifth (letterStep and
// semitoneStep are +4/+7 for the sharp side, -4/-7 for the flat side),
// starting from C at step 0. Returns one spelling per step, 0..steps
// inclusive.
function walkByFifths(
  letterStep: number,
  semitoneStep: number,
  steps: number,
): readonly PitchClass[] {
  const spellings: PitchClass[] = [];
  let letterIndex = LETTER_ORDER.indexOf("C");
  let semitone = LETTER_SEMITONE.C + ACCIDENTAL_OFFSET.natural;
  for (let step = 0; step <= steps; step += 1) {
    const letter = LETTER_ORDER[letterIndex];
    if (letter === undefined) throw new Error("unreachable");
    const targetSemitone = ((semitone % 12) + 12) % 12;
    spellings.push({
      letter,
      accidental: accidentalForTarget(letter, targetSemitone),
    });
    letterIndex =
      (letterIndex + letterStep + LETTER_ORDER.length) % LETTER_ORDER.length;
    semitone += semitoneStep;
  }
  return spellings;
}

function majorSpellingsByPosition(): readonly (readonly PitchClass[])[] {
  const majorsByIndex: PitchClass[][] = Array.from(
    { length: POSITIONS },
    () => [],
  );

  // Sharp side: C, G, D, A, E, B, F#, C# — positions 0..7.
  walkByFifths(4, 7, STEPS_PER_SIDE).forEach((pitchClass, step) => {
    majorsByIndex[step]!.push(pitchClass);
  });

  // Flat side: C, F, Bb, Eb, Ab, Db, Gb, Cb — walking anticlockwise, so
  // step n lands at position (12 - n) % 12. Step 0 (C) is skipped: it is
  // already present from the sharp-side walk.
  walkByFifths(-4, -7, STEPS_PER_SIDE).forEach((pitchClass, step) => {
    if (step === 0) return;
    const position = (POSITIONS - step) % POSITIONS;
    majorsByIndex[position]!.push(pitchClass);
  });

  return majorsByIndex;
}

export function circleOfFifths(): readonly CirclePosition[] {
  return majorSpellingsByPosition().map((spellings, index) => {
    const majors: readonly Key[] = spellings.map((tonic) => ({
      tonic,
      mode: "major" as const,
    }));
    const minors: readonly Key[] = majors.map(relativeOf);
    return { index, majors, minors };
  });
}
