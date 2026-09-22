import { expect, test } from "vitest";
import { circleOfFifths, keyId } from "../../../src/theory/published";
const spell = (key: { tonic: { letter: string; accidental: string } }) =>
  `${key.tonic.letter}${key.tonic.accidental === "sharp" ? "#" : key.tonic.accidental === "flat" ? "b" : ""}`;
test("theory.circle-of-fifths/REQ-001/S1 — the rings are complete and aligned", () => {
  const positions = circleOfFifths();
  expect(positions).toHaveLength(12);
  expect(
    positions.map((position) => position.majors.map(spell).join("/")),
  ).toEqual([
    "C",
    "G",
    "D",
    "A",
    "E",
    "B/Cb",
    "F#/Gb",
    "C#/Db",
    "Ab",
    "Eb",
    "Bb",
    "F",
  ]);
  expect(spell(positions[0]!.minors[0]!)).toBe("A"); // A minor with C major
  expect(spell(positions[1]!.minors[0]!)).toBe("E"); // E minor with G major
  for (const position of positions)
    expect(position.minors).toHaveLength(position.majors.length);
});
test("theory.circle-of-fifths/REQ-002/S1 — six o’clock offers both F# and Gb major", () => {
  const sixOClock = circleOfFifths()[6]!;
  expect(sixOClock.majors.map(spell).sort()).toEqual(["F#", "Gb"]);
  expect(new Set(sixOClock.majors.map(keyId)).size).toBe(2);
});
