import { expect, test } from "vitest";
import {
  builtInCatalogue,
  effectiveOctavesOf,
  fittingOctaveCounts,
  runOf,
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
  expect(fittingOctaveCounts(major("C"), flute)).toEqual([1, 2, 3]);
  expect(fittingOctaveCounts(major("G"), flute)).toEqual([1, 2]);
  expect(
    fittingOctaveCounts(major("F", "sharp"), variantById("ocarina-bass-c")),
  ).toEqual([]);
});

test("theory.circle-of-fifths/REQ-012/S3 — an arpeggio keeps the chord tones wherever they fall", () => {
  const flute = variantById("flute-concert");
  const full = runOf(major("G"), flute, {
    direction: "up",
    octaves: { kind: "full" },
    shape: "arpeggio",
  });
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
  const one = runOf(major("G"), flute, {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "arpeggio",
  });
  expect(one.map((n) => label(n.note))).toEqual(["G4", "B4", "D5", "G5"]);
});

test("theory.circle-of-fifths/REQ-012 — the clamp falls back to the largest fitting count", () => {
  expect(
    runOf(major("C"), variantById("ocarina-alto-c"), {
      direction: "up",
      octaves: { kind: "count", count: 3 },
      shape: "scale",
    }).map((n) => label(n.note)),
  ).toEqual(["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"]);
  expect(
    effectiveOctavesOf(major("C"), variantById("ocarina-alto-c"), {
      kind: "count",
      count: 3,
    }),
  ).toEqual({ kind: "count", count: 1 });
});
