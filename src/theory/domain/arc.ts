import type { CirclePosition } from "./circle";
import { circleOfFifths } from "./circle";
import type { Key } from "./keys";
import { keyId, scaleNotesOf } from "./keys";
import type { PitchClass } from "./notes";

export type SpellingPreference = "sharp" | "flat";

// Picks the sharp-side or flat-side spelling from a position's keys — a
// no-op at the nine single-spelling positions, a real choice at the three
// dual positions (index 5, 6, 7), where the sharp-side spelling is always
// listed first.
function preferredOf(
  keys: readonly Key[],
  preference: SpellingPreference,
): Key {
  const [sharpSide, flatSide] = keys;
  if (sharpSide === undefined) throw new Error("unreachable: empty ring");
  if (flatSide === undefined) return sharpSide;
  return preference === "sharp" ? sharpSide : flatSide;
}

export function spelledMajorAt(
  position: CirclePosition,
  preference: SpellingPreference,
): Key {
  return preferredOf(position.majors, preference);
}

export function spelledMinorAt(
  position: CirclePosition,
  preference: SpellingPreference,
): Key {
  return preferredOf(position.minors, preference);
}

export interface ArcPosition {
  readonly positionIndex: number;
  readonly signedStep: number;
  readonly degree: number;
  readonly scaleName: PitchClass;
  readonly wedgeName: PitchClass;
  readonly differsFromWedge: boolean;
}

// Maps the arc's signed step (-1 flatward through 5 sharpward of the
// selected key) to the scale degree it lands on, per REQ-010.
const DEGREE_BY_SIGNED_STEP: Readonly<Record<number, number>> = {
  "-1": 4,
  "0": 1,
  "1": 5,
  "2": 2,
  "3": 6,
  "4": 3,
  "5": 7,
};

function findSelectedPositionIndex(key: Key): number {
  const target = keyId(key);
  const ring = key.mode === "major" ? "majors" : "minors";
  const selected = circleOfFifths().find((position) =>
    position[ring].some((candidate) => keyId(candidate) === target),
  );
  if (selected === undefined)
    throw new Error("unreachable: key is not on the circle of fifths");
  return selected.index;
}

export function arcOf(
  key: Key,
  preference: SpellingPreference,
): readonly ArcPosition[] {
  const selectedIndex = findSelectedPositionIndex(key);
  const scale = scaleNotesOf(key);
  const wedgeAt =
    key.mode === "major"
      ? (position: CirclePosition) => spelledMajorAt(position, preference)
      : (position: CirclePosition) => spelledMinorAt(position, preference);

  const arcPositions: ArcPosition[] = [];
  for (const position of circleOfFifths()) {
    const signedStep = ((position.index - selectedIndex + 18) % 12) - 6;
    if (signedStep < -1 || signedStep > 5) continue;
    const degree = DEGREE_BY_SIGNED_STEP[signedStep];
    if (degree === undefined) throw new Error("unreachable: step out of range");
    const scaleName = scale[degree - 1];
    if (scaleName === undefined)
      throw new Error("unreachable: degree out of range");
    const wedgeName = wedgeAt(position).tonic;
    const differsFromWedge =
      wedgeName.letter !== scaleName.letter ||
      wedgeName.accidental !== scaleName.accidental;
    arcPositions.push({
      positionIndex: position.index,
      signedStep,
      degree,
      scaleName,
      wedgeName,
      differsFromWedge,
    });
  }
  return arcPositions;
}
