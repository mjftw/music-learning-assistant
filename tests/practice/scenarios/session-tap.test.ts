import { expect, test } from "vitest";
import { defaultSessionSettings } from "../../../src/practice/published";
import type { Session } from "../../../src/practice/published";
import type { Traversal } from "../../../src/theory/published";
import {
  advanceUntil,
  isDrone,
  isStop,
  isTone,
  sessionOn,
  startDroneAndFlush,
} from "../fakes";
import { leadFixture, startLead } from "../lead-helpers";

const GMajorTwoOctaves: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "scale",
};

async function flushStart(session: Session): Promise<void> {
  session.start();
  // start() awaits sound.start() then wakeLock.acquire() before it kicks
  // off the scheduler — two microtask flushes are enough with the fakes.
  await Promise.resolve();
  await Promise.resolve();
}

async function tapAndFlush(session: Session, runIndex: number): Promise<void> {
  session.tapNote(runIndex);
  await Promise.resolve();
  await Promise.resolve();
}

test("practice.session/REQ-013/S1 — a notehead tapped at 96 bpm", async () => {
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  let targetAdvanced = 0;
  session.onTargetAdvanced(() => {
    targetAdvanced += 1;
  });
  await tapAndFlush(session, 4);
  const tone = sound.posted.filter(isTone)[0]!;
  expect(tone.hz).toBeCloseTo(587.33, 2);
  expect(tone.durationFrames).toBe(30000);
  expect(tone.tag).toBeGreaterThanOrEqual(2_000_000);
  advanceUntil(clock, () => session.snapshot().tappedRunIndex === 4);
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
  expect(session.snapshot().soundingPosition).toBeNull();
  // advanceUntil's default 25 ms step lands here 25 ms past the highlight's
  // own due instant (FakeClock.advance settles "now" to the full step even
  // though the timer fired earlier within it) — 599, not 624, is the last
  // ms still inside the 625 ms beat from that point.
  clock.advance(599);
  expect(session.snapshot().tappedRunIndex).toBe(4);
  clock.advance(2);
  expect(session.snapshot().tappedRunIndex).toBeNull();
  expect(targetAdvanced).toBe(0);
});

test("practice.session/REQ-013/S3 — over the drone", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const droneTag = sound.posted.filter(isDrone)[0]!.tag;
  await tapAndFlush(session, 9);
  expect(sound.posted.filter(isTone)[0]!.hz).toBeCloseTo(987.77, 2);
  expect(sound.posted.filter(isStop).some((s) => s.tag === droneTag)).toBe(
    false,
  );
  expect(session.snapshot().drone.on).toBe(true);
});

test("practice.session/REQ-013/S4 — a second tap restarts", async () => {
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  await tapAndFlush(session, 4);
  const first = sound.posted.filter(isTone)[0]!;
  advanceUntil(clock, () => session.snapshot().tappedRunIndex === 4);
  clock.advance(300);
  await tapAndFlush(session, 5);
  expect(sound.posted.filter(isStop)).toEqual([
    { kind: "stop", tag: first.tag },
  ]);
  expect(sound.posted.filter(isTone)[1]!.hz).toBeCloseTo(659.26, 2);
  advanceUntil(clock, () => session.snapshot().tappedRunIndex === 5);
  // See the same 25 ms advanceUntil-overshoot note in S1 above.
  clock.advance(599);
  expect(session.snapshot().tappedRunIndex).toBe(5);
  clock.advance(2);
  expect(session.snapshot().tappedRunIndex).toBeNull();
});

test("practice.session/REQ-013/S5 — ignored while playing or counting", async () => {
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );
  await flushStart(session);
  const duringCountIn = sound.posted.length;
  await tapAndFlush(session, 4);
  expect(sound.posted.length).toBe(duringCountIn);
  advanceUntil(clock, () => session.snapshot().soundingPosition === 2);
  const duringRun = sound.posted.filter(isTone).length;
  await tapAndFlush(session, 4);
  clock.advance(10);
  expect(sound.posted.filter(isTone).length).toBe(duringRun);
  expect(session.snapshot().tappedRunIndex).toBeNull();
});

test("practice.session/REQ-013/S5 — ignored while leading", async () => {
  const f = leadFixture();
  await startLead(f.session);
  f.session.tapNote(3);
  await Promise.resolve();
  await Promise.resolve();
  expect(f.sound.posted.filter(isTone)).toEqual([]);
  expect(f.session.snapshot().tappedRunIndex).toBeNull();
  expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
});

test("practice.session/REQ-013/S7 — idle in I lead, too", async () => {
  const f = leadFixture();
  f.session.tapNote(2); // E4
  await Promise.resolve();
  await Promise.resolve();
  const tone = f.sound.posted.find(isTone)!;
  expect(tone.hz).toBeCloseTo(329.63, 1);
  expect(tone.durationFrames).toBe(Math.round((625 / 1000) * 48000));
  expect(f.session.snapshot().lead.idleCaption).toBe(
    "hold 2 beats · medium tuning",
  );
  expect(f.listening.startCalls).toBe(0);
});
