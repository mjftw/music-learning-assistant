import { expect, test } from "vitest";
import {
  defaultScaleChoice,
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { isDrone, sessionOn, startDroneAndFlush } from "../fakes";

test("practice.drone/REQ-008/S1 — off, not silently on", async () => {
  const { session, sound, wake } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  sound.failWith = { reason: "no-audio-context", detail: "test" };
  await startDroneAndFlush(session);
  expect(session.snapshot().notice).toBe("sound-unavailable");
  expect(session.snapshot().drone.on).toBe(false);
  expect(sound.posted.filter(isDrone)).toHaveLength(0);
  expect(wake.acquired).toBe(false);
});

test("practice.drone/REQ-008/S2 — the next tap tries again", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  sound.failWith = { reason: "worklet-failed", detail: "test" };
  await startDroneAndFlush(session);
  sound.failWith = null;
  await startDroneAndFlush(session);
  expect(sound.startCalls).toBe(2);
  expect(sound.posted.filter(isDrone)).toHaveLength(1);
  expect(session.snapshot().drone.on).toBe(true);
  expect(session.snapshot().notice).toBeNull();
});

test("practice.drone/REQ-008/S3 — nothing before the gesture", () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
    defaultScaleChoice,
    { octave: { kind: "pinned", octave: 4 }, sound: "reed" },
  );
  expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
  expect(sound.startCalls).toBe(0);
  expect(sound.posted).toHaveLength(0);
});
