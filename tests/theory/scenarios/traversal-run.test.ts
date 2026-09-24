import { expect, test } from "vitest";
import {
  builtInCatalogue,
  effectiveOctavesOf,
  fittingOctaveCounts,
  scaleById,
  traversalOf,
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

test("theory.circle-of-fifths/REQ-012/S2 — which counts fit", () => {
  const flute = variantById("flute-concert");
  const majorScale = scaleById("major");
  expect(fittingOctaveCounts(major("C"), flute, majorScale)).toEqual([1, 2, 3]);
  expect(fittingOctaveCounts(major("G"), flute, majorScale)).toEqual([1, 2]);
  expect(
    fittingOctaveCounts(
      major("F", "sharp"),
      variantById("ocarina-bass-c"),
      majorScale,
    ),
  ).toEqual([]);
});

test("theory.circle-of-fifths/REQ-012/S3 — an arpeggio keeps the chord tones wherever they fall", () => {
  const flute = variantById("flute-concert");
  const majorScale = scaleById("major");
  const full = traversalOf(major("G"), flute, majorScale, {
    direction: "up",
    octaves: { kind: "full" },
    shape: "arpeggio",
  }).run;
  expect(full.map((n) => label(n.note))).toEqual([
    "D4",
    "G4",
    "B4",
    "D5",
    "G5",
    "B5",
    "D6",
    "G6",
    "B6",
  ]);
  const one = traversalOf(major("G"), flute, majorScale, {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "arpeggio",
  }).run;
  expect(one.map((n) => label(n.note))).toEqual(["G4", "B4", "D5", "G5"]);
});

test("theory.circle-of-fifths/REQ-012 — the clamp falls back to the largest fitting count", () => {
  const majorScale = scaleById("major");
  expect(
    traversalOf(major("C"), variantById("ocarina-alto-c"), majorScale, {
      direction: "up",
      octaves: { kind: "count", count: 3 },
      shape: "scale",
    }).run.map((n) => label(n.note)),
  ).toEqual(["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"]);
  expect(
    effectiveOctavesOf(major("C"), variantById("ocarina-alto-c"), majorScale, {
      kind: "count",
      count: 3,
    }),
  ).toEqual({ kind: "count", count: 1 });
});

test("theory.circle-of-fifths/REQ-012/S7 — a scale with fewer notes per octave", () => {
  const { run } = traversalOf(
    major("G"),
    variantById("flute-concert"),
    scaleById("major-pentatonic"),
    {
      direction: "up",
      octaves: { kind: "count", count: 2 },
      shape: "scale",
    },
  );
  expect(run.map((n) => label(n.note))).toEqual([
    "G4",
    "A4",
    "B4",
    "D5",
    "E5",
    "G5",
    "A5",
    "B5",
    "D6",
    "E6",
    "G6",
  ]);
  expect(
    fittingOctaveCounts(
      major("G"),
      variantById("flute-concert"),
      scaleById("major-pentatonic"),
    ),
  ).toEqual([1, 2]);
});
