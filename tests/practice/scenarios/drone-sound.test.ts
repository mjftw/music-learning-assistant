import { expect, test } from "vitest";
import {
  defaultDroneSettings,
  defaultScaleChoice,
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import { isDrone, isStop, sessionOn, startDroneAndFlush } from "../fakes";

test("practice.drone/REQ-005/S3 — changing the sound mid-drone crossfades: a new voice and a stop of the old, never silent", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const first = sound.posted.filter(isDrone)[0]!;
  session.setDroneSound("reed");
  const drones = sound.posted.filter(isDrone);
  expect(drones).toHaveLength(2);
  expect(drones[1]!.sound).toBe("reed");
  expect(drones[1]!.hz).toBeCloseTo(first.hz, 5);
  expect(drones[1]!.tag).not.toBe(first.tag);
  expect(sound.posted.filter(isStop)).toEqual([
    { kind: "stop", tag: first.tag },
  ]);
  expect(session.snapshot().drone.settings.sound).toBe("reed");
  expect(session.snapshot().drone.on).toBe(true);
  // the overlap itself (attack over release, never silent) is proved on rendered samples by sound::tests::a_sound_change_crossfade_is_never_silent
  // audible within 300 ms: the new voice's onset is at most 300 ms after the change
  expect(drones[1]!.onsetFrame - sound.currentFrame()).toBeLessThanOrEqual(
    (300 * sound.sampleRate()) / 1000,
  );
});

test("practice.drone/REQ-005/S2 — pure is posted as pure (its single partial is proved by sound::tests::pure_drone_has_a_single_partial)", async () => {
  const { session, sound } = sessionOn(
    "A",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
    defaultScaleChoice,
    { ...defaultDroneSettings, sound: "pure" },
  );
  await startDroneAndFlush(session);
  expect(sound.posted.filter(isDrone)[0]!.sound).toBe("pure");
});
