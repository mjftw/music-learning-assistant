import { expect, test } from "vitest";
import {
  builtInCatalogue,
  circleOfFifths,
  fittingOctaveCounts,
  keyId,
  pitchPosition,
  SCALES,
  spelledScaleOf,
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
    for (const scale of SCALES) {
      for (const variant of variants) {
        try {
          const lowest = pitchPosition(variant.range.lowest);
          const highest = pitchPosition(variant.range.highest);

          // A note "of the scale's run" for the arpeggio-membership check:
          // either form the scale defines — the ascending form always, and
          // the descending form too where it has one (REQ-012/S5's rule).
          const spelled = spelledScaleOf(key, scale);
          const scaleRunPitchClasses: readonly PitchClass[] = [
            ...spelled.ascending,
            ...(spelled.descending ?? []),
          ].map((note) => note.pitchClass);

          const octaveChoices: readonly Octaves[] = [
            ...fittingOctaveCounts(key, variant, scale).map(
              (octaveCount): Octaves => ({
                kind: "count",
                count: octaveCount,
              }),
            ),
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
                      scaleRunPitchClasses.some((pitchClass) =>
                        samePitchClass(pitchClass, entry.note),
                      ),
                    ).toBe(true);
                  }
                }
              }
            }
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            `key=${keyId(key)} scale=${scale.id} variant=${variant.variantId}: ${reason}`,
          );
        }
      }
    }
  }

  expect(count).toBeGreaterThan(16_000);
});

test("theory.circle-of-fifths/REQ-012 (invariant) — every whole-octave run is tonic to tonic and no ↑↓ sequence repeats a pitch", () => {
  // Given every circle key × catalogued variant × catalogued scale × fitting count (+ full for ↑↓)
  // Then a count run's first and last notes are the tonic's pitch class, its span is exactly count octaves,
  //      and adjacent notes of an ↑↓ sequence never share a pitch (by pitchPosition).
  const keys: readonly Key[] = circleOfFifths().flatMap((position) => [
    ...position.majors,
    ...position.minors,
  ]);
  const variants: readonly Variant[] = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );

  let count = 0;
  const failures: string[] = [];
  for (const key of keys) {
    for (const scale of SCALES) {
      for (const variant of variants) {
        try {
          const octaveChoices: readonly Octaves[] = [
            ...fittingOctaveCounts(key, variant, scale).map(
              (octaveCount): Octaves => ({
                kind: "count",
                count: octaveCount,
              }),
            ),
            { kind: "full" },
          ];

          for (const octaves of octaveChoices) {
            for (const direction of DIRECTIONS) {
              count += 1;
              const { run, sequence } = traversalOf(key, variant, scale, {
                direction,
                octaves,
                shape: "scale",
              });

              if (octaves.kind === "count" && direction !== "updown") {
                const first = run[0]!;
                const last = run[run.length - 1]!;
                if (
                  !samePitchClass(first.note, key.tonic) ||
                  !samePitchClass(last.note, key.tonic) ||
                  pitchPosition(last.note) - pitchPosition(first.note) !==
                    12 * octaves.count
                ) {
                  failures.push(
                    `key=${keyId(key)} scale=${scale.id} variant=${variant.variantId} count=${octaves.count} direction=${direction}: run not tonic-to-tonic (first=${first.note.letter}${first.note.octave}, last=${last.note.letter}${last.note.octave})`,
                  );
                }
              }

              if (direction === "updown") {
                for (let i = 1; i < sequence.length; i += 1) {
                  if (
                    pitchPosition(sequence[i]!.note) ===
                    pitchPosition(sequence[i - 1]!.note)
                  ) {
                    failures.push(
                      `key=${keyId(key)} scale=${scale.id} variant=${variant.variantId} octaves=${octaves.kind === "full" ? "full" : octaves.count} direction=updown: repeated pitch at index ${i}`,
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            `key=${keyId(key)} scale=${scale.id} variant=${variant.variantId}: ${reason}`,
          );
        }
      }
    }
  }

  expect(count).toBeGreaterThan(9_000);
  expect(failures).toEqual([]);
});
