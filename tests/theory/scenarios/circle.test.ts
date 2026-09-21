import { expect, test } from "vitest";
import {
  circleOfFifths,
  keyId,
  spelledMajorAt,
} from "../../../src/theory/published";
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
test("circleOfFifths() exposes both spellings at the six o’clock position (theory supports the spelling preference)", () => {
  const sixOClock = circleOfFifths()[6]!;
  expect(sixOClock.majors.map(spell).sort()).toEqual(["F#", "Gb"]);
  expect(new Set(sixOClock.majors.map(keyId)).size).toBe(2);
});
test("theory.circle-of-fifths/REQ-001/S1 — sharp preference reads the ring C G D A E B F# C# Ab Eb Bb F", () => {
  const readings = circleOfFifths().map((position) =>
    spell(spelledMajorAt(position, "sharp")),
  );
  expect(readings).toEqual([
    "C",
    "G",
    "D",
    "A",
    "E",
    "B",
    "F#",
    "C#",
    "Ab",
    "Eb",
    "Bb",
    "F",
  ]);
  const flatReadings = circleOfFifths().map((position) =>
    spell(spelledMajorAt(position, "flat")),
  );
  expect(flatReadings).toEqual([
    "C",
    "G",
    "D",
    "A",
    "E",
    "Cb",
    "Gb",
    "Db",
    "Ab",
    "Eb",
    "Bb",
    "F",
  ]);
});
