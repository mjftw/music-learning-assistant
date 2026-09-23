import { expect, test } from "vitest";
import {
  SCALES,
  scaleById,
  scalesForMode,
  spelledScaleOf,
  pitchClassLabel,
  type Key,
} from "../../../src/theory/published";

const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};
const eMinor: Key = {
  tonic: { letter: "E", accidental: "natural" },
  mode: "naturalMinor",
};
const fMajor: Key = {
  tonic: { letter: "F", accidental: "natural" },
  mode: "major",
};
const dMinor: Key = {
  tonic: { letter: "D", accidental: "natural" },
  mode: "naturalMinor",
};
const lines = (key: Key) =>
  scalesForMode(key.mode).map((scale) => [
    scale.name,
    spelledScaleOf(key, scale).formulaLine,
  ]);

test("practice.session/REQ-012/S5 (theory) — every formula in the catalogue, major ring on G", () => {
  expect(lines(gMajor)).toEqual([
    ["Major", "1 2 3 4 5 6 7"],
    ["Major pentatonic", "1 2 3 5 6"],
    ["Lydian", "1 2 3 ♯4 5 6 7"],
    ["Mixolydian", "1 2 3 4 5 6 ♭7"],
    ["Harmonic major", "1 2 3 4 5 ♭6 7"],
    ["Whole tone", "1 2 3 ♯4 ♭6 ♭7"],
    ["Chromatic", "1 ♯1 2 ♯2 3 4 ♯4 5 ♯5 6 ♯6 7"],
  ]);
});

test("practice.session/REQ-012/S5 (theory) — every formula in the catalogue, minor ring on E", () => {
  expect(lines(eMinor)).toEqual([
    ["Natural minor", "1 2 3 4 5 6 7"],
    ["Harmonic minor", "1 2 3 4 5 6 ♯7"],
    ["Melodic minor · classical", "1 2 3 4 5 ♯6 ♯7 · ↓ natural"],
    ["Melodic minor · jazz", "1 2 3 4 5 ♯6 ♯7 · both ways"],
    ["Minor pentatonic", "1 3 4 5 7"],
    ["Blues", "1 3 4 ♭5 5 7"],
    ["Dorian", "1 2 3 4 5 ♯6 7"],
    ["Phrygian", "1 ♭2 3 4 5 6 7"],
    ["Locrian", "1 ♭2 3 4 ♭5 6 7"],
    ["Whole tone", "1 2 ♯3 ♯4 6 7"],
    ["Chromatic", "1 ♯1 2 ♯2 ♯3 4 ♯4 5 ♯5 ♯6 ♯♯6 ♯7"],
  ]);
});

test("practice.session/REQ-012/S5 (theory) — chromatic follows the signature on flat keys", () => {
  expect(spelledScaleOf(fMajor, scaleById("chromatic")).formulaLine).toBe(
    "1 ♭2 2 ♭3 3 4 ♭5 5 ♭6 6 ♭7 7",
  );
  expect(spelledScaleOf(dMinor, scaleById("chromatic")).formulaLine).toBe(
    "1 ♭2 2 3 ♯3 4 ♭5 5 6 ♯6 7 ♯7",
  );
  expect(SCALES).toHaveLength(16);
});

test("theory.circle-of-fifths/REQ-003/S3 (theory) — G Lydian is spelled G A B C♯ D E F♯ with the 4th altered", () => {
  const spelled = spelledScaleOf(gMajor, scaleById("lydian"));
  expect(spelled.ascending.map((n) => pitchClassLabel(n.pitchClass))).toEqual([
    "G",
    "A",
    "B",
    "C♯",
    "D",
    "E",
    "F♯",
  ]);
  expect(spelled.ascending.map((n) => n.altered)).toEqual([
    false,
    false,
    false,
    true,
    false,
    false,
    false,
  ]);
  expect(spelled.descending).toBeNull();
  const melodic = spelledScaleOf(
    { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" },
    scaleById("melodic-minor-classical"),
  );
  expect(melodic.ascending.map((n) => pitchClassLabel(n.pitchClass))).toEqual([
    "G",
    "A",
    "B♭",
    "C",
    "D",
    "E",
    "F♯",
  ]);
  expect(melodic.descending?.map((n) => pitchClassLabel(n.pitchClass))).toEqual(
    ["G", "A", "B♭", "C", "D", "E♭", "F"],
  );
  const gSharpHarmonic = spelledScaleOf(
    { tonic: { letter: "G", accidental: "sharp" }, mode: "naturalMinor" },
    scaleById("harmonic-minor"),
  );
  expect(pitchClassLabel(gSharpHarmonic.ascending[6]!.pitchClass)).toBe("F𝄪");
});
