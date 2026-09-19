import { expect, test } from "vitest";
import {
  newAccidentalOf,
  relativeOf,
  signatureOf,
} from "../../../src/theory/published";
const major = (
  letter: "A" | "B" | "C" | "D" | "E" | "F" | "G",
  accidental: "natural" | "sharp" | "flat" = "natural",
) => ({ tonic: { letter, accidental }, mode: "major" as const });
test("theory.circle-of-fifths/REQ-004/S1 — G major's new sharp is F#", () => {
  expect(newAccidentalOf(major("G"))).toEqual({
    letter: "F",
    accidental: "sharp",
  });
});
test("theory.circle-of-fifths/REQ-004/S2 — Bb major's new flat is Eb", () => {
  expect(newAccidentalOf(major("B", "flat"))).toEqual({
    letter: "E",
    accidental: "flat",
  });
});
test("theory.circle-of-fifths/REQ-004/S3 — C major has nothing to highlight", () => {
  expect(newAccidentalOf(major("C"))).toBeNull();
});
test("signature and relative support the key view", () => {
  expect(signatureOf(major("G"))).toEqual({
    kind: "sharps",
    count: 1,
    accidentals: [{ letter: "F", accidental: "sharp" }],
  });
  expect(relativeOf(major("G"))).toEqual({
    tonic: { letter: "E", accidental: "natural" },
    mode: "naturalMinor",
  });
  expect(
    relativeOf({
      tonic: { letter: "E", accidental: "natural" },
      mode: "naturalMinor",
    }),
  ).toEqual(major("G"));
});
