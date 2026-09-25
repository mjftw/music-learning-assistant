import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import { isDrone, isStop, sessionOn, startDroneAndFlush } from "../fakes";

test("practice.drone/REQ-007/S1 — hidden means silent", async () => {
  const { session, sound, visibility } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  visibility.hide();
  expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
  expect(session.snapshot().drone.on).toBe(false);
  await startDroneAndFlush(session);
  expect(sound.posted.filter(isDrone)).toHaveLength(2);
  expect(session.snapshot().drone.on).toBe(true);
});

test("practice.drone/REQ-007/S2 — the phone on the stand stays lit", async () => {
  const { session, wake, clock } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  clock.advance(120_000);
  expect(wake.acquired).toBe(true);
  session.stopDrone();
  expect(wake.acquired).toBe(false);
});
