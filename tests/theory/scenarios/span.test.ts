import { expect, test } from "vitest";
import {
  builtInCatalogue,
  pitchPosition,
  spanChoicesOf,
  spanNotesOf,
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

test("theory.circle-of-fifths/REQ-011/S1 — C major on the flute offers 1, 2, 3 octaves and full", () => {
  const flute = variantById("flute-concert");
  const choices = spanChoicesOf(major("C"), flute);
  expect(
    choices.map((choice) =>
      choice.span.kind === "full" ? "full" : choice.span.count,
    ),
  ).toEqual([1, 2, 3, "full"]);
  const twoOctaves = spanNotesOf(major("C"), flute, {
    kind: "octaves",
    count: 2,
  });
  expect(twoOctaves).toHaveLength(15);
  expect(label(twoOctaves[0]!.note)).toBe("C4");
  expect(label(twoOctaves[14]!.note)).toBe("C6");
  expect(spanNotesOf(major("C"), flute, { kind: "full" })).toHaveLength(22);
});

test("theory.circle-of-fifths/REQ-011/S2 — G major on the flute caps at 2 octaves", () => {
  const choices = spanChoicesOf(major("G"), variantById("flute-concert"));
  expect(
    choices.map((choice) =>
      choice.span.kind === "full" ? "full" : choice.span.count,
    ),
  ).toEqual([1, 2, "full"]);
});

test("theory.circle-of-fifths/REQ-011/S3 — F# major on Bass C offers only full", () => {
  const bassC = variantById("ocarina-bass-c");
  const choices = spanChoicesOf(major("F", "sharp"), bassC);
  expect(choices.map((choice) => choice.span.kind)).toEqual(["full"]);
  for (const entry of spanNotesOf(major("F", "sharp"), bassC, {
    kind: "octaves",
    count: 1,
  })) {
    expect(pitchPosition(entry.note)).toBeGreaterThanOrEqual(
      pitchPosition(bassC.range.lowest),
    );
    expect(pitchPosition(entry.note)).toBeLessThanOrEqual(
      pitchPosition(bassC.range.highest),
    );
  }
});
