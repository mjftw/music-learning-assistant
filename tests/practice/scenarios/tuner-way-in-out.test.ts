import { expect, test } from "vitest";
import {
  isClick,
  isDrone,
  isTone,
  sessionOn,
  startDroneAndFlush,
} from "../fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

test("practice.tuner/REQ-001/S1 — in from idle", async () => {
  const { session, listening, sound } = sessionOn("G", "flute-concert");
  session.enterTuner();
  await flush();
  await flush();
  expect(listening.startCalls).toBe(1);
  expect(session.snapshot().tuner).toMatchObject({
    active: true,
    listening: { kind: "listening" },
    target: { kind: "auto" },
  });
  expect(
    sound.posts.filter(
      (p) => isTone(p.command) || isClick(p.command) || isDrone(p.command),
    ),
  ).toEqual([]);
});

test("practice.tuner/REQ-001/S2 — in from a run and a drone", async () => {
  const { session, sound, clock } = sessionOn("G", "flute-concert");
  session.start();
  await flush();
  await flush();
  clock.advanceMs(6000);
  const postedBefore = sound.posts.length;
  session.enterTuner();
  await flush();
  await flush();
  expect(sound.stopAllCalls).toBeGreaterThanOrEqual(1);
  expect(
    sound.posts
      .slice(postedBefore)
      .filter((p) => isTone(p.command) || isClick(p.command)),
  ).toEqual([]);
  session.leaveTuner();
  expect(session.snapshot().transport.kind).toBe("idle");
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
  const drone = sessionOn("G", "flute-concert");
  await startDroneAndFlush(drone.session);
  drone.session.enterTuner();
  await flush();
  await flush();
  expect(drone.session.snapshot().drone.on).toBe(false);
  expect(drone.sound.posts.some((p) => p.command.kind === "stop")).toBe(true);
});

test("practice.tuner/REQ-001/S4 — out", async () => {
  const { session, listening } = sessionOn("G", "flute-concert");
  const before = session.snapshot();
  session.enterTuner();
  await flush();
  await flush();
  session.leaveTuner();
  expect(listening.stopCalls).toBe(1);
  expect(session.snapshot().tuner).toEqual({
    active: false,
    listening: { kind: "off" },
    target: { kind: "auto" },
    targetNote: null,
    reading: null,
    lastHeard: null,
    canStepDown: false,
    canStepUp: false,
  });
  expect(session.snapshot().caption).toBe(before.caption);
  expect(session.snapshot().transport).toEqual(before.transport);
});

test("practice.tuner/REQ-001/S4 — leaving before the microphone was granted still releases it", async () => {
  const { session, listening, wake } = sessionOn("G", "flute-concert");
  session.enterTuner();
  session.leaveTuner();
  await flush();
  await flush();
  await flush();
  expect(listening.listening).toBe(false);
  expect(session.snapshot().tuner).toMatchObject({
    active: false,
    listening: { kind: "off" },
  });
  expect(wake.acquired).toBe(false);
});

test("practice.tuner/REQ-001 — while active, ▶, the drone and a tapped note are refused", async () => {
  const { session, sound } = sessionOn("G", "flute-concert");
  session.enterTuner();
  await flush();
  await flush();
  session.start();
  session.startDrone();
  session.tapNote(0);
  await flush();
  await flush();
  expect(
    sound.posts.filter(
      (p) => isTone(p.command) || isClick(p.command) || isDrone(p.command),
    ),
  ).toEqual([]);
  expect(session.snapshot().transport.kind).toBe("idle");
});
