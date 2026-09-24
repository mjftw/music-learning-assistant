import { expect, test } from "vitest";
import {
  builtInCatalogue,
  inlineAccidentalsOf,
  scaleById,
  signatureOf,
  traversalOf,
  type Key,
} from "../../../src/theory/published";
const flute = builtInCatalogue()
  .instruments.flatMap((i) => i.variants)
  .find((v) => v.variantId === "flute-concert")!;
const gMinor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "naturalMinor",
};
const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};

test("theory.circle-of-fifths/REQ-003/S6 (theory) — accidentals hold for the rest of the run", () => {
  const { run } = traversalOf(
    gMinor,
    flute,
    scaleById("melodic-minor-classical"),
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "scale",
    },
  );
  expect(inlineAccidentalsOf(signatureOf(gMinor), run)).toEqual([
    null,
    null,
    null,
    null,
    null,
    "natural",
    "sharp",
    null,
    "natural",
    "flat",
    null,
    null,
    null,
    null,
    null,
  ]);
});

test("theory.circle-of-fifths/REQ-003/S3 (theory) — Lydian's raised 4th carries an inline sharp, nothing else does", () => {
  const { run } = traversalOf(gMajor, flute, scaleById("lydian"), {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });
  expect(inlineAccidentalsOf(signatureOf(gMajor), run)).toEqual([
    null,
    null,
    null,
    "sharp",
    null,
    null,
    null,
    null,
  ]);
  const plain = traversalOf(gMajor, flute, scaleById("major"), {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });
  expect(
    inlineAccidentalsOf(signatureOf(gMajor), plain.run).every(
      (a) => a === null,
    ),
  ).toBe(true);
});
