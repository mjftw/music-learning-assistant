import { describe, expect, test } from "vitest";
import {
  keyId,
  pitchClassLabel,
  pitchPosition,
  scaleNotesOf,
} from "../../../src/theory/published";
describe("theory primitives", () => {
  test("G major spells G A B C D E F#", () => {
    expect(
      scaleNotesOf({
        tonic: { letter: "G", accidental: "natural" },
        mode: "major",
      }),
    ).toEqual([
      { letter: "G", accidental: "natural" },
      { letter: "A", accidental: "natural" },
      { letter: "B", accidental: "natural" },
      { letter: "C", accidental: "natural" },
      { letter: "D", accidental: "natural" },
      { letter: "E", accidental: "natural" },
      { letter: "F", accidental: "sharp" },
    ]);
  });
  test("E natural minor spells E F# G A B C D", () => {
    expect(
      scaleNotesOf({
        tonic: { letter: "E", accidental: "natural" },
        mode: "naturalMinor",
      }).map((pitchClass) => `${pitchClass.letter}${pitchClass.accidental}`),
    ).toEqual([
      "Enatural",
      "Fsharp",
      "Gnatural",
      "Anatural",
      "Bnatural",
      "Cnatural",
      "Dnatural",
    ]);
  });
  test("pitch positions order F#4 above F4 and C7 above C4", () => {
    expect(pitchPosition({ letter: "F", accidental: "sharp", octave: 4 })).toBe(
      66,
    );
    expect(
      pitchPosition({ letter: "C", accidental: "natural", octave: 7 }),
    ).toBe(96);
  });
  test("keyId is stable and distinct for enharmonic spellings", () => {
    expect(
      keyId({ tonic: { letter: "F", accidental: "sharp" }, mode: "major" }),
    ).not.toBe(
      keyId({ tonic: { letter: "G", accidental: "flat" }, mode: "major" }),
    );
  });
  test("theory.circle-of-fifths/REQ-003 — double accidentals spell and label (F𝄪, B𝄫)", () => {
    expect(pitchClassLabel({ letter: "F", accidental: "doubleSharp" })).toBe(
      "F𝄪",
    );
    expect(pitchClassLabel({ letter: "B", accidental: "doubleFlat" })).toBe(
      "B𝄫",
    );
    expect(
      pitchPosition({ letter: "F", accidental: "doubleSharp", octave: 4 }),
    ).toBe(pitchPosition({ letter: "G", accidental: "natural", octave: 4 }));
    expect(
      pitchPosition({ letter: "B", accidental: "doubleFlat", octave: 3 }),
    ).toBe(pitchPosition({ letter: "A", accidental: "natural", octave: 3 }));
  });
});
