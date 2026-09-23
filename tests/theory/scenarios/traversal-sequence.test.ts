import { expect, test } from "vitest";
import {
  builtInCatalogue,
  runOf,
  sequenceOf,
} from "../../../src/theory/published";

const variantById = (id: string) =>
  builtInCatalogue()
    .instruments.flatMap((instrument) => instrument.variants)
    .find((variant) => variant.variantId === id)!;
const major = (
  letter: "A" | "B" | "C" | "D" | "E" | "F" | "G",
  accidental: "natural" | "sharp" | "flat" = "natural",
) => ({ tonic: { letter, accidental }, mode: "major" as const });
const label = (note: { letter: string; accidental: string; octave: number }) =>
  `${note.letter}${note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : ""}${note.octave}`;

test("theory.circle-of-fifths/REQ-012/S1 — two octaves of G major on the flute", () => {
  const run = runOf(major("G"), variantById("flute-concert"), {
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "scale",
  });
  expect(run.map((n) => label(n.note))).toEqual([
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F#5",
    "G5",
    "A5",
    "B5",
    "C6",
    "D6",
    "E6",
    "F#6",
    "G6",
  ]);
  const seq = sequenceOf(run, "updown").map((n) => label(n.note));
  expect(seq).toHaveLength(29);
  expect(seq).toEqual([...seq].reverse());
  expect(seq[0]).toBe("G4");
  expect(seq[14]).toBe("G6");
  expect(seq[28]).toBe("G4");
});

test("theory.circle-of-fifths/REQ-012/S4 — down", () => {
  const run = runOf(major("G"), variantById("flute-concert"), {
    direction: "up",
    octaves: { kind: "count", count: 2 },
    shape: "scale",
  });
  const up = sequenceOf(run, "up").map((n) => label(n.note));
  const down = sequenceOf(run, "down").map((n) => label(n.note));
  expect(down).toEqual([...up].reverse());
  expect(down).toHaveLength(15);
});
