// practice.session/REQ-006/S5 — every TargetAdvanced carries a note that is
// a member of the active sequence at the position it reports, across every
// catalogued variant, every selectable key, every octave choice that fits
// (plus full range), both shapes and all three directions.

import { expect, test } from "vitest";
import {
  createSession,
  defaultSessionSettings,
  type TargetAdvanced,
} from "../../../src/practice/published";
import {
  builtInCatalogue,
  circleOfFifths,
  fittingOctaveCounts,
  scaleById,
} from "../../../src/theory/published";
import type {
  Direction,
  Key,
  Octaves,
  Shape,
  Variant,
} from "../../../src/theory/published";
import { FakeClock, FakeSound, FakeVisibility, FakeWakeLock } from "../fakes";

const SHAPES: readonly Shape[] = ["scale", "arpeggio"];
const DIRECTIONS: readonly Direction[] = ["up", "down", "updown"];

test("practice.session/REQ-006/S5 — the target is always in the sequence (invariant)", async () => {
  const keys: readonly Key[] = circleOfFifths().flatMap((position) => [
    ...position.majors,
    ...position.minors,
  ]);
  const variants: readonly Variant[] = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );

  let count = 0;

  for (const key of keys) {
    // T004 stand-in (matches practice.session's own recompute()) — which
    // fitting counts these keys fit for is scale-independent (REQ-012), but
    // the scale used here still mirrors the one the session itself picks.
    const scale = scaleById(key.mode === "major" ? "major" : "natural-minor");
    for (const variant of variants) {
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

            const traversal = { direction, octaves, shape };
            const sound = new FakeSound();
            const clock = new FakeClock(sound);
            const wakeLock = new FakeWakeLock();
            const visibility = new FakeVisibility();
            const session = createSession(
              { key, variant },
              traversal,
              { ...defaultSessionSettings, countIn: false, loop: false },
              { sound, clock, wakeLock, visibility },
            );

            const events: TargetAdvanced[] = [];
            session.onTargetAdvanced((event) => events.push(event));

            session.start();
            await Promise.resolve();
            await Promise.resolve();

            const sequence = session.snapshot().sequence;
            const beatMs = 60_000 / defaultSessionSettings.tempoBpm; // one beat per note, unmodified tempo
            // The highlight timer is authoritative (T031) — advancing the
            // clock through every tick's own scheduled onset is what lights
            // each position; the sound port's onset reports are not
            // consulted for this at all.
            clock.advance(sequence.length * beatMs + 5_000);

            expect(events).toHaveLength(sequence.length);
            for (const event of events) {
              expect(event.note).toEqual(sequence[event.position]!.note);
              expect(event.length).toBe(sequence.length);
            }

            session.dispose();
          }
        }
      }
    }
  }

  expect(count).toBeGreaterThan(1000);
});
