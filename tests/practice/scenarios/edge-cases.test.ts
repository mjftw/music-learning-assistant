// Edge cases from changes/003-hear-the-scale/proposal.md › "Edge cases and
// failure modes" not already exercised by a scenario test (T019). Rows
// already covered are cited here, not duplicated:
//   - first run defaults        → practice.session/REQ-011/S2
//     (tests/ui/scenarios/app-session.test.tsx, tests/ui/scenarios/selection-store.test.ts)
//   - tempo at 40 and 200       → practice.session/REQ-004/S3
//     (tests/practice/scenarios/tempo.test.ts)
//   - oversized octave clamped  → practice.session/REQ-001/S4
//     (tests/practice/scenarios/session-traversal.test.ts)
//   - corrupt stored state      → theory.circle-of-fifths/REQ-008/S3
//     (tests/ui/scenarios/selection-persistence.test.tsx)
// "silent-tick timeout is cancelled by stop" (raised at T009's review) is
// obsolete: T023 removed note length and the silent-tick path entirely —
// every crotchet tick sounds something now, so there is no silent tick left
// to time out.
//
// The one genuinely new row at the session level: a key change that arrives
// mid count-in must not reset, skip or otherwise interrupt the count
// (practice.session/REQ-007 — "IF a count-in or rest bar is in progress THEN
// the count continues and the new sequence follows it").
//
// 005-scale-selection's proposal adds two further rows (T017):
//   - an arpeggio-ineligible scale chosen mid-play falls back to scale at
//     once, the same as any other REQ-007 change while playing
//   - a scale's tonic with no whole-octave fit on the selected variant
//     falls back to full range, and the run/caption are the chosen scale's
//     own — not the default scale's — count and extremes

import { expect, test } from "vitest";
import {
  defaultScaleChoice,
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import { pitchHzOf } from "../../../src/theory/published";
import { advanceUntil, keyOf, sessionOn, variantOf } from "../fakes";

function isTone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "tone" }> {
  return command.kind === "tone";
}

test("practice.session/REQ-007 — key changed during a count-in continues the count", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    settings,
  );

  session.start();
  // start() awaits sound.start() then wakeLock.acquire() before it kicks off
  // the scheduler — two microtask flushes are enough with the fakes.
  await Promise.resolve();
  await Promise.resolve();

  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 4,
  });

  // Advance past the first count-in tick before the key change — otherwise
  // both the before and after read "countingIn 4", which a regression that
  // restarted the count on setContext would also satisfy.
  clock.advance(600);
  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 3,
  });

  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });

  // The count-in is untouched by the key change.
  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 3,
  });

  advanceUntil(clock, () => sound.posted.some(isTone));
  const firstTone = sound.posted.filter(isTone)[0]!;
  // D4, not G4 — the new sequence is the one that follows the count.
  expect(firstTone.hz).toBeCloseTo(293.66, 1);
});

test("practice.session/REQ-012, REQ-007 — an arpeggio-ineligible scale replaces an arpeggio mid-play, restarting without a count-in", async () => {
  // Blues is offered on the minor ring only, so this uses G natural minor
  // rather than G major (the arpeggio-eligible starting point in the
  // proposal's row is otherwise the same shape).
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "Gm",
    "flute-concert",
    {
      direction: "up",
      octaves: { kind: "count", count: 1 },
      shape: "arpeggio",
    },
    settings,
  );

  session.start();
  await Promise.resolve();
  await Promise.resolve();

  // The G natural minor arpeggio (G4 B♭4 D5 G5) is playing; land on position
  // 2 (D5) — mid-run, not the trivially-already-restarted position 0.
  advanceUntil(clock, () => {
    const transport = session.snapshot().transport;
    return transport.kind === "playing" && transport.position === 2;
  });

  session.setScaleChoice({ ...defaultScaleChoice, minor: "blues" });

  // Blues doesn't offer an arpeggio, so the effective shape falls back to
  // scale (REQ-012); the new sequence begins from its first note straight
  // away, with no count-in, exactly as any other REQ-007 change while
  // playing.
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });
  expect(session.snapshot().effectiveShape).toBe("scale");

  advanceUntil(clock, () => sound.posted.some(isTone));
  const firstTone = sound.posted.filter(isTone)[0]!;
  expect(firstTone.hz).toBeCloseTo(
    pitchHzOf({ letter: "G", accidental: "natural", octave: 4 }),
    1,
  );
});

test("theory.circle-of-fifths/REQ-012 — the chosen scale's tonic has no whole-octave fit, so the run falls back to full range", () => {
  // F♯ major has no whole-octave fit on Ocarina Bass C (A3–F5) for any
  // scale sharing that tonic — the same conclusion as the default major
  // scale's (practice.session/REQ-001/S3) — but the run and caption are
  // major pentatonic's own, five notes per octave rather than seven.
  const { session } = sessionOn(
    "F#",
    "ocarina-bass-c",
    defaultTraversal,
    defaultSessionSettings,
    { ...defaultScaleChoice, major: "major-pentatonic" },
  );

  const snapshot = session.snapshot();
  expect(snapshot.fittingCounts).toEqual([]);
  expect(snapshot.effectiveOctaves).toEqual({ kind: "full" });
  expect(snapshot.caption).toBe("15 notes · A♯3–D♯5");
});
