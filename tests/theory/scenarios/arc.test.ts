import { expect, test } from "vitest";
import { arcOf } from "../../../src/theory/published";
const major = (
  letter: "A" | "B" | "C" | "D" | "E" | "F" | "G",
  accidental: "natural" | "sharp" | "flat" = "natural",
) => ({ tonic: { letter, accidental }, mode: "major" as const });
const spell = (pitchClass: { letter: string; accidental: string }) =>
  `${pitchClass.letter}${pitchClass.accidental === "sharp" ? "#" : pitchClass.accidental === "flat" ? "b" : ""}`;
test("theory.circle-of-fifths/REQ-009/S1 — G major’s arc spans exactly its seven positions", () => {
  const arc = arcOf(major("G"), "sharp");
  expect(arc).toHaveLength(7);
  expect(arc.map((position) => spell(position.wedgeName)).sort()).toEqual(
    ["A", "B", "C", "D", "E", "F#", "G"].sort(),
  );
  expect(
    arc.map((position) => position.signedStep).sort((a, b) => a - b),
  ).toEqual([-1, 0, 1, 2, 3, 4, 5]);
});
test("theory.circle-of-fifths/REQ-009/S2 — A major names the Ab position G#, accented", () => {
  const arc = arcOf(major("A"), "sharp");
  const abPosition = arc.find((position) => position.positionIndex === 8)!;
  expect(spell(abPosition.wedgeName)).toBe("Ab");
  expect(spell(abPosition.scaleName)).toBe("G#");
  expect(abPosition.differsFromWedge).toBe(true);
  const inKeyPosition = arc.find((position) => position.positionIndex === 3)!;
  expect(inKeyPosition.differsFromWedge).toBe(false);
});
test("theory.circle-of-fifths/REQ-010/S1 — degrees on the arc: G=1 D=5 C=4 F#=7", () => {
  const arc = arcOf(major("G"), "sharp");
  const degreeAt = (index: number) =>
    arc.find((position) => position.positionIndex === index)!.degree;
  expect(degreeAt(1)).toBe(1); // G
  expect(degreeAt(2)).toBe(5); // D
  expect(degreeAt(0)).toBe(4); // C
  expect(degreeAt(6)).toBe(7); // F#
});
const eMinor = {
  tonic: { letter: "E", accidental: "natural" },
  mode: "naturalMinor",
} as const;
test("theory.circle-of-fifths/REQ-009/S4 — a minor key’s arc names the notes where they are", () => {
  const arc = arcOf(eMinor, "sharp");
  expect(arc).toHaveLength(7);
  const nameAt = (index: number) =>
    spell(arc.find((position) => position.positionIndex === index)!.scaleName);
  expect([0, 1, 2, 3, 4, 5, 6].map(nameAt)).toEqual([
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
  ]);
  expect(arc.every((position) => position.differsFromWedge === false)).toBe(
    true,
  );
});
test("theory.circle-of-fifths/REQ-010/S3 — a minor key numbers from its own tonic", () => {
  const arc = arcOf(eMinor, "sharp");
  const degreeAt = (index: number) =>
    arc.find((position) => position.positionIndex === index)!.degree;
  expect([0, 1, 2, 3, 4, 5, 6].map(degreeAt)).toEqual([6, 3, 7, 4, 1, 5, 2]);
});
