import fc from "fast-check";
import { expect, test } from "vitest";
import {
  builtInCatalogue,
  circleOfFifths,
  keyView,
  pitchPosition,
} from "../../../src/theory/published";
test("theory.circle-of-fifths/REQ-005/S1 — no displayed note ever leaves the range", () => {
  const keys = circleOfFifths().flatMap((position) => [
    ...position.majors,
    ...position.minors,
  ]);
  const variants = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );
  fc.assert(
    fc.property(
      fc.constantFrom(...keys),
      fc.constantFrom(...variants),
      (key, variant) => {
        for (const entry of keyView(key, variant).notes) {
          expect(pitchPosition(entry.note)).toBeGreaterThanOrEqual(
            pitchPosition(variant.range.lowest),
          );
          expect(pitchPosition(entry.note)).toBeLessThanOrEqual(
            pitchPosition(variant.range.highest),
          );
        }
      },
    ),
    { numRuns: 200 },
  );
});
