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

import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
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
