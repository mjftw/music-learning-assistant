import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  DRONE_RELEASE_MS,
  FIRST_TICK_LEAD_MS,
} from "../../../src/practice/published";
import type { Session } from "../../../src/practice/published";
import type { Traversal } from "../../../src/theory/published";
import {
  advanceUntil,
  isClick,
  isDrone,
  isStop,
  sessionOn,
  startDroneAndFlush,
} from "../fakes";

async function flushStart(session: Session): Promise<void> {
  session.start();
  // start() awaits sound.start() then wakeLock.acquire() before it kicks
  // off the scheduler — two microtask flushes are enough with the fakes.
  await Promise.resolve();
  await Promise.resolve();
}

const GMajorTwoOctaves: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "scale",
};

test("practice.drone/REQ-004/S1 — the drone interrupts a run", async () => {
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    { ...defaultSessionSettings, countIn: false },
  );
  await flushStart(session);
  advanceUntil(clock, () => session.snapshot().soundingPosition === 8);
  const postsBefore = sound.posts.length;
  await startDroneAndFlush(session);
  const after = sound.posts.slice(postsBefore).map((p) => p.command.kind);
  expect(after[0]).toBe("stopAll");
  expect(after).toContain("drone");
  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
  expect(session.snapshot().progress).toBe(0);
  expect(session.snapshot().drone.on).toBe(true);
  expect(wake.acquired).toBe(true);
});

test("practice.drone/REQ-004/S2 — ▶ silences the drone before the first click", async () => {
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  clock.advance(500);
  const tapFrame = sound.currentFrame();
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  await flushStart(session);
  expect(session.snapshot().drone.on).toBe(false);
  const stop = sound.posts.find(
    (p) => isStop(p.command) && p.command.tag === tag,
  );
  expect(stop?.atFrame).toBe(tapFrame);
  advanceUntil(clock, () => sound.posted.some(isClick));
  const releaseFrames = (DRONE_RELEASE_MS * sound.sampleRate()) / 1000;
  const leadFrames = (FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000;
  expect(sound.posted.filter(isClick)[0]!.onsetFrame).toBe(
    tapFrame + leadFrames + releaseFrames,
  );
  expect(wake.acquired).toBe(true);
  session.stop();
  expect(wake.acquired).toBe(false);
});

test("practice.drone/REQ-004 — the wake lock is held while either sounds and released only when neither does", async () => {
  const { session, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  expect(wake.acquired).toBe(true);
  session.stopDrone();
  expect(wake.acquired).toBe(false);
});
