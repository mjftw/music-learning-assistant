import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { isDrone, isStop, sessionOn, startDroneAndFlush } from "../fakes";

test("practice.drone/REQ-001/S1 — G major on the flute (acceptance)", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  expect(session.snapshot().drone.on).toBe(false);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
  await startDroneAndFlush(session);
  const drones = sound.posted.filter(isDrone);
  expect(drones).toHaveLength(1);
  expect(drones[0]!.hz).toBeCloseTo(783.99, 2);
  expect(drones[0]!.sound).toBe("warm");
  expect(drones[0]!.onsetFrame).toBeLessThanOrEqual(
    (50 * sound.sampleRate()) / 1000,
  );
  expect(session.snapshot().drone.on).toBe(true);
  expect(session.snapshot().drone.hz).toBeCloseTo(783.99, 2);
});

test("practice.drone/REQ-001/S2 — off", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  session.stopDrone();
  expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
  expect(session.snapshot().drone.on).toBe(false);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
});
