import { expect, test } from "vitest";
import {
  builtInCatalogue,
  circleOfFifths,
  fittingOctaveCounts,
  pitchPosition,
  scaleById,
  scaleNotesOf,
  traversalOf,
} from "../../../src/theory/published";
import type {
  Direction,
  Key,
  Octaves,
  PitchClass,
  Shape,
  Variant,
} from "../../../src/theory/published";

const samePitchClass = (a: PitchClass, b: PitchClass): boolean =>
  a.letter === b.letter && a.accidental === b.accidental;

const SHAPES: readonly Shape[] = ["scale", "arpeggio"];
const DIRECTIONS: readonly Direction[] = ["up", "down", "updown"];

test("theory.circle-of-fifths/REQ-012/S5 — the sequence never leaves the range (invariant)", () => {
  const keys: readonly Key[] = circleOfFifths().flatMap((position) => [
    ...position.majors,
    ...position.minors,
  ]);
  const variants: readonly Variant[] = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );

  let count = 0;
  for (const key of keys) {
    // T004 stand-in (matches practice.session's own recompute()): the key's
    // own diatonic scale — major or natural minor — is what `scaleNotesOf`
    // below already assumes for the arpeggio-membership check, so the run
    // must be built from that same scale, not an arbitrary catalogued one.
    const scale = scaleById(key.mode === "major" ? "major" : "natural-minor");
    for (const variant of variants) {
      const lowest = pitchPosition(variant.range.lowest);
      const highest = pitchPosition(variant.range.highest);
      const octaveChoices: readonly Octaves[] = [
        ...fittingOctaveCounts(key, variant, scale).map((count_): Octaves => ({
          kind: "count",
          count: count_,
        })),
        { kind: "full" },
      ];

      for (const octaves of octaveChoices) {
        for (const shape of SHAPES) {
          for (const direction of DIRECTIONS) {
            count += 1;
            const { sequence } = traversalOf(key, variant, scale, {
              direction,
              octaves,
              shape,
            });

            for (const entry of sequence) {
              const position = pitchPosition(entry.note);
              expect(position).toBeGreaterThanOrEqual(lowest);
              expect(position).toBeLessThanOrEqual(highest);
              if (shape === "arpeggio") {
                expect(
                  scaleNotesOf(key).some((pitchClass) =>
                    samePitchClass(pitchClass, entry.note),
                  ),
                ).toBe(true);
              }
            }
          }
        }
      }
    }
  }

  expect(count).toBeGreaterThan(1000);
});
