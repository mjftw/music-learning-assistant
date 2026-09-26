import { expect, test } from "vitest";
import {
  PIANO_HIGHEST_POSITION,
  PIANO_LOWEST_POSITION,
  canStepDroneOctave,
  defaultDroneSettings,
  droneNoteOf,
} from "../../../src/practice/published";
import {
  builtInCatalogue,
  circleOfFifths,
  pitchPosition,
  spelledMajorAt,
  spelledMinorAt,
} from "../../../src/theory/published";

// practice.drone/REQ-002 — over every catalogued variant, every selectable key spelling (both rings, both spellings) and every octave setting: unpinned lies within the variant's range; every result lies within A0–C8; canStepDroneOctave agrees with the bounds.
test("practice.drone/REQ-002 (invariant) — the drone's note is always within A0–C8, and within the range when unpinned", () => {
  for (const variant of builtInCatalogue().instruments.flatMap(
    (i) => i.variants,
  ))
    for (const position of circleOfFifths())
      for (const spelling of ["sharp", "flat"] as const)
        for (const key of [
          spelledMajorAt(position, spelling),
          spelledMinorAt(position, spelling),
        ]) {
          const nearest = droneNoteOf(key, variant, defaultDroneSettings);
          expect(pitchPosition(nearest)).toBeGreaterThanOrEqual(
            pitchPosition(variant.range.lowest),
          );
          expect(pitchPosition(nearest)).toBeLessThanOrEqual(
            pitchPosition(variant.range.highest),
          );
          for (let octave = 0; octave <= 8; octave += 1) {
            const note = droneNoteOf(key, variant, {
              sound: "warm",
              octave: { kind: "pinned", octave },
            });
            expect(pitchPosition(note)).toBeGreaterThanOrEqual(
              PIANO_LOWEST_POSITION,
            );
            expect(pitchPosition(note)).toBeLessThanOrEqual(
              PIANO_HIGHEST_POSITION,
            );
            expect(canStepDroneOctave(note, -1)).toBe(
              pitchPosition(note) - 12 >= PIANO_LOWEST_POSITION,
            );
            expect(canStepDroneOctave(note, 1)).toBe(
              pitchPosition(note) + 12 <= PIANO_HIGHEST_POSITION,
            );
          }
        }
});
