// practice.session/REQ-006/S5 — every TargetAdvanced carries a note that is
// a member of the active sequence at the position it reports, across every
// catalogued variant, every selectable key, every selectable scale, every
// octave choice that fits (plus full range), both shapes and all three
// directions.

import { expect, test } from "vitest";
import {
  createSession,
  defaultDroneSettings,
  defaultSessionSettings,
  type ScaleChoice,
  type TargetAdvanced,
} from "../../../src/practice/published";
import {
  builtInCatalogue,
  circleOfFifths,
  fittingOctaveCounts,
  scaleById,
  scalesForMode,
} from "../../../src/theory/published";
import type {
  Direction,
  Key,
  Octaves,
  Shape,
  Variant,
} from "../../../src/theory/published";
import {
  FakeClock,
  FakeListening,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
  type SessionFixture,
} from "../fakes";
import { holdThrough, leadSettings } from "../lead-helpers";

const SHAPES: readonly Shape[] = ["scale", "arpeggio"];
const DIRECTIONS: readonly Direction[] = ["up", "down", "updown"];

// Exhaustive enumeration — well over vitest's 5 s default under a loaded parallel pool; the assertions are unchanged.
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
    // fitting counts these keys fit for is scale-independent (REQ-012), so
    // it is computed once per key/variant, outside the scale loop below.
    const fittingScale = scaleById(
      key.mode === "major" ? "major" : "natural-minor",
    );
    for (const variant of variants) {
      const octaveChoices: readonly Octaves[] = [
        ...fittingOctaveCounts(key, variant, fittingScale).map(
          (octaveCount): Octaves => ({
            kind: "count",
            count: octaveCount,
          }),
        ),
        { kind: "full" },
      ];

      for (const scale of scalesForMode(key.mode)) {
        // Both fields carry the same id; only the field matching this
        // key's own ring is ever read (chosenScaleIdFor) — the ring the
        // key is on picks it up.
        const scaleChoice: ScaleChoice = {
          major: scale.id,
          minor: scale.id,
        };

        for (const octaves of octaveChoices) {
          for (const shape of SHAPES) {
            for (const direction of DIRECTIONS) {
              count += 1;

              const traversal = { direction, octaves, shape };
              const sound = new FakeSound();
              const clock = new FakeClock(sound);
              const wakeLock = new FakeWakeLock();
              const visibility = new FakeVisibility();
              const listening = new FakeListening();
              const session = createSession(
                { key, variant, spelling: "sharp" },
                traversal,
                scaleChoice,
                { ...defaultSessionSettings, countIn: false, loop: false },
                defaultDroneSettings,
                { sound, clock, wakeLock, visibility, listening },
              );

              const events: TargetAdvanced[] = [];
              session.onTargetAdvanced((event) => events.push(event));

              session.start();
              await Promise.resolve();
              await Promise.resolve();

              const sequence = session.snapshot().sequence;
              const beatMs = 60_000 / defaultSessionSettings.tempoBpm; // one beat per note, unmodified tempo
              // The highlight timer is authoritative (T031) — advancing the
              // clock through every tick's own scheduled onset is what
              // lights each position; the sound port's onset reports are
              // not consulted for this at all.
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
  }

  expect(count).toBeGreaterThan(1000);
}, 20_000);

// practice.session/REQ-015 — every TargetAdvanced of a lead run is a member
// of the sequence at its position (loop wrap included): the play-along
// enumeration above gains its lead-run twin — every catalogued variant × the
// twelve majors × the three directions × 1 oct and full — holding through
// length + 1 targets so the wrap past the last note is covered too.
test("practice.session/REQ-015 — every TargetAdvanced of a lead run is a member of the sequence at its position (loop wrap included)", async () => {
  const majors: readonly Key[] = circleOfFifths().flatMap(
    (position) => position.majors,
  );
  const variants: readonly Variant[] = builtInCatalogue().instruments.flatMap(
    (instrument) => instrument.variants,
  );
  const fittingScale = scaleById("major");

  let count = 0;

  for (const key of majors) {
    for (const variant of variants) {
      const octaveChoices: readonly Octaves[] = [
        ...fittingOctaveCounts(key, variant, fittingScale).map(
          (octaveCount): Octaves => ({ kind: "count", count: octaveCount }),
        ),
        { kind: "full" },
      ];

      for (const octaves of octaveChoices) {
        for (const direction of DIRECTIONS) {
          count += 1;

          const traversal = { direction, octaves, shape: "scale" as Shape };
          const sound = new FakeSound();
          const clock = new FakeClock(sound);
          const wake = new FakeWakeLock();
          const visibility = new FakeVisibility();
          const listening = new FakeListening();
          const context = { key, variant, spelling: "sharp" as const };
          const session = createSession(
            context,
            traversal,
            { major: fittingScale.id, minor: fittingScale.id },
            leadSettings({}, { ...defaultSessionSettings, loop: true }),
            defaultDroneSettings,
            { sound, clock, wakeLock: wake, visibility, listening },
          );

          const events: TargetAdvanced[] = [];
          session.onTargetAdvanced((event) => events.push(event));

          const fixture: SessionFixture = {
            session,
            sound,
            clock,
            wake,
            visibility,
            listening,
            context,
          };

          session.start();
          await Promise.resolve();
          await Promise.resolve();

          const sequence = session.snapshot().sequence;
          if (sequence.length > 0) holdThrough(fixture, sequence.length + 1);

          // session.start() itself emits the first target (position 1);
          // holdThrough(length + 1) then emits one more advance per target
          // held, including the loop wrap past the last note — length + 2
          // events in total.
          expect(events).toHaveLength(sequence.length + 2);
          for (const event of events) {
            expect(event.position).toBeGreaterThanOrEqual(1);
            expect(event.position).toBeLessThanOrEqual(sequence.length);
            expect(event.note).toEqual(sequence[event.position - 1]!.note);
          }

          session.dispose();
        }
      }
    }
  }

  expect(count).toBeGreaterThan(50);
}, 20_000);
