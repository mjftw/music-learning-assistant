// Edge cases from changes/004-the-drone/proposal.md › "Edge cases and
// failure modes" not already exercised by a scenario test (T019). Rows
// already covered are cited here, not duplicated:
//   - first run (drone off, unpinned, warm)  → practice.drone/REQ-009/S2
//     (tests/ui/scenarios/app-drone.test.tsx)
//   - malformed stored octave/sound          → practice.drone/REQ-009/S4
//     (tests/ui/scenarios/selection-store.test.ts)
//   - a pinned octave a new key cannot use    → practice.drone/REQ-002/S5
//     (tests/practice/scenarios/drone-octave.test.ts)
//   - sound cannot start                      → practice.drone/REQ-008/S1
//     (tests/practice/scenarios/drone-sound-unavailable.test.ts)
//   - page hidden while sounding              → practice.drone/REQ-007/S1
//     (tests/practice/scenarios/drone-hidden-awake.test.ts)
//   - key change while sounding               → practice.drone/REQ-003/S1
//     (tests/practice/scenarios/drone-tonic.test.ts)
//   - a retap restarts its beat               → practice.session/REQ-013/S4
//     (tests/practice/scenarios/session-tap.test.ts)
//   - ▶ on the transport stops the drone       → practice.drone/REQ-004/S2
//     (tests/practice/scenarios/drone-exclusion.test.ts)
//
// The two rows genuinely new at the session level, both from "Concurrent or
// duplicate action" (proposal.md, the row citing REQ-001/REQ-004): two quick
// taps on ▶/■ must leave one voice or none, never two. Both exercise the
// generation check `startDrone()` uses to ignore a start superseded before
// its awaits resolve (T006, T009).
//
// A third, from T010's review (changes/004-the-drone/notes.md): dispose()
// calling stopDrone() before sound.dispose() had no test of its own.

import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import { isDrone, isStop, sessionOn, startDroneAndFlush } from "../fakes";

// changes/004-the-drone/proposal.md › Edge cases › "Concurrent or duplicate action" — a ■ that arrives while ▶'s start is still awaiting the sound port cancels it: nothing is posted, the drone is off.
test("practice.drone/REQ-001 (edge) — ■ during a pending ▶ leaves no voice", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  session.startDrone();
  session.stopDrone();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(sound.posted.filter(isDrone)).toHaveLength(0);
  expect(session.snapshot().drone.on).toBe(false);
});

// "▶ ▶" quickly: the second start is ignored while the first is pending — exactly one drone voice
test("practice.drone/REQ-001 (edge) — ▶ ▶ posts one voice", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  session.startDrone();
  session.startDrone();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(sound.posted.filter(isDrone)).toHaveLength(1);
  expect(session.snapshot().drone.on).toBe(true);
});

// T010's review (changes/004-the-drone/notes.md): "dispose() → stopDrone()
// before sound.dispose() has no test of its own — T019 adds one (dispose
// while sounding posts `stop` and releases the wake lock)."
test("practice.drone/REQ-007 (edge) — dispose while sounding stops the drone and releases the screen", async () => {
  const { session, sound, wake } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;

  session.dispose();

  expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
  expect(wake.acquired).toBe(false);
  expect(sound.disposeCalls).toBe(1);
});
