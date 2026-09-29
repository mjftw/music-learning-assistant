import { expect, test } from "vitest";
import {
  builtInCatalogue,
  nearestNoteOf,
  noteLabel,
  pitchHzOf,
  pitchPosition,
} from "../../../src/theory/published";
import type { Note } from "../../../src/theory/published";

test("theory.temperament/REQ-001/S1 — reference and neighbours", () => {
  expect(
    pitchHzOf({ letter: "A", accidental: "natural", octave: 4 }),
  ).toBeCloseTo(440, 2);
  expect(
    pitchHzOf({ letter: "A", accidental: "natural", octave: 5 }),
  ).toBeCloseTo(880, 2);
  expect(
    pitchHzOf({ letter: "C", accidental: "natural", octave: 4 }),
  ).toBeCloseTo(261.63, 2);
  expect(
    pitchHzOf({ letter: "F", accidental: "sharp", octave: 5 }),
  ).toBeCloseTo(739.99, 2);
});

test("theory.temperament/REQ-001/S2 — spelling does not change the pitch", () => {
  expect(pitchHzOf({ letter: "F", accidental: "sharp", octave: 4 })).toBe(
    pitchHzOf({ letter: "G", accidental: "flat", octave: 4 }),
  );
  expect(pitchHzOf({ letter: "E", accidental: "sharp", octave: 5 })).toBe(
    pitchHzOf({ letter: "F", accidental: "natural", octave: 5 }),
  );
});

// One spelling per semitone-in-octave (0 = C): a natural note where one
// exists, otherwise the sharp of the letter below.
const SEMITONE_SPELLING: ReadonlyArray<Pick<Note, "letter" | "accidental">> = [
  { letter: "C", accidental: "natural" },
  { letter: "C", accidental: "sharp" },
  { letter: "D", accidental: "natural" },
  { letter: "D", accidental: "sharp" },
  { letter: "E", accidental: "natural" },
  { letter: "F", accidental: "natural" },
  { letter: "F", accidental: "sharp" },
  { letter: "G", accidental: "natural" },
  { letter: "G", accidental: "sharp" },
  { letter: "A", accidental: "natural" },
  { letter: "A", accidental: "sharp" },
  { letter: "B", accidental: "natural" },
];

function noteAtSemitonePosition(position: number): Note {
  const semitoneInOctave = ((position % 12) + 12) % 12;
  const octave = Math.floor(position / 12) - 1;
  const spelling = SEMITONE_SPELLING[semitoneInOctave]!;
  return { ...spelling, octave };
}

test("theory.temperament/REQ-001/S3 — the whole catalogue is sounded", () => {
  const variants = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );
  for (const variant of variants) {
    const lowest = pitchPosition(variant.range.lowest);
    const highest = pitchPosition(variant.range.highest);
    let previousHz = 0;
    for (let position = lowest; position <= highest; position += 1) {
      const hz = pitchHzOf(noteAtSemitonePosition(position));
      expect(hz).toBeGreaterThan(0);
      expect(hz).toBeGreaterThan(previousHz);
      previousHz = hz;
    }
  }
});

const near = (hz: number, spelling: "sharp" | "flat" = "sharp") => {
  const r = nearestNoteOf(hz, spelling);
  return [noteLabel(r.note), r.cents] as const;
};

test("theory.temperament/REQ-002/S1 — a little sharp of A", () => {
  expect(near(445.0)).toEqual(["A4", 20]);
  expect(near(436.0)).toEqual(["A4", -16]);
  expect(near(440.0)).toEqual(["A4", 0]);
});

test("theory.temperament/REQ-002/S2 — the ends of the tuner's range", () => {
  expect(near(82.41)).toEqual(["E2", 0]);
  expect(near(2093.0)).toEqual(["C7", 0]);
});

test("theory.temperament/REQ-002/S3 — spelled per the preference", () => {
  expect(near(466.16, "sharp")).toEqual(["A♯4", 0]);
  expect(near(466.16, "flat")).toEqual(["B♭4", 0]);
});

test("theory.temperament/REQ-002/S4 — halfway belongs to the note above", () => {
  expect(near(452.9)).toEqual(["A♯4", -50]);
  expect(near(452.8)).toEqual(["A4", 50]);
});
