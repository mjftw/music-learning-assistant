import { expect, test } from "vitest";
import {
  builtInCatalogue,
  circleOfFifths,
  keyView,
  pitchPosition,
  scaleById,
} from "../../../src/theory/published";

test("theory.circle-of-fifths/REQ-005/S1 — no displayed note ever leaves the range", () => {
  const keys = circleOfFifths().flatMap((position) => [
    ...position.majors,
    ...position.minors,
  ]);
  const variants = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );

  let pairsChecked = 0;
  for (const key of keys) {
    for (const variant of variants) {
      pairsChecked += 1;
      const scale = scaleById(key.mode === "major" ? "major" : "natural-minor");
      for (const entry of keyView(key, variant, scale).notes) {
        expect(pitchPosition(entry.note)).toBeGreaterThanOrEqual(
          pitchPosition(variant.range.lowest),
        );
        expect(pitchPosition(entry.note)).toBeLessThanOrEqual(
          pitchPosition(variant.range.highest),
        );
      }
    }
  }

  expect(pairsChecked).toBe(90);
});
