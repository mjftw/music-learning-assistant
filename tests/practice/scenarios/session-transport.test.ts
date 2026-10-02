import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  FIRST_TICK_LEAD_MS,
} from "../../../src/practice/published";
import type { Session } from "../../../src/practice/published";
import type { Traversal } from "../../../src/theory/published";
import {
  advanceUntil,
  isClick,
  isTone,
  keyOf,
  sessionOn,
  variantOf,
} from "../fakes";

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

test("practice.session/REQ-002/S1 — G major up and down (acceptance)", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);

  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 4,
  });
  expect(wake.acquired).toBe(true);

  advanceUntil(clock, () => sound.posted.filter(isClick).length >= 4);
  const clicks = sound.posted.filter(isClick);
  expect(clicks).toHaveLength(4);
  // practice.session/REQ-008 — the first tick of the run leads the frame
  // ▶ was tapped on (0, here — the fakes' clock hasn't advanced yet) by
  // FIRST_TICK_LEAD_MS, so the audio thread's first renders (still warming
  // up right after the worklet node is created) have somewhere to land.
  const firstTickLeadFrames = (FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000;
  expect(clicks[0]!.onsetFrame).toBe(firstTickLeadFrames);
  expect(clicks[1]!.onsetFrame - clicks[0]!.onsetFrame).toBe(24000);
  expect(clicks[2]!.onsetFrame - clicks[1]!.onsetFrame).toBe(24000);
  expect(clicks[3]!.onsetFrame - clicks[2]!.onsetFrame).toBe(24000);

  advanceUntil(clock, () => sound.posted.some(isTone));
  const firstTone = sound.posted.filter(isTone)[0]!;
  expect(firstTone.hz).toBeCloseTo(392.0, 1);
  expect(firstTone.tag).toBe(0);
  // The caption follows the highlight timer's own audible onset
  // (practice.session/REQ-006, T031), not the moment the lookahead
  // scheduler posts it.
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);
  expect(session.snapshot().caption).toBe("G4 · 1 of 29");

  advanceUntil(clock, () => sound.posted.filter(isTone).length >= 30);
  const tones = sound.posted.filter(isTone);
  expect(tones[29]!.tag).toBe(0);
});

test("practice.session/REQ-002/S2 — stop returns to the top", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  // "at note 12" (REQ-002/S2's Given) is position 11 — the transport
  // advances on the scheduler's own ticks, independently of any onset.
  advanceUntil(clock, () => {
    const transport = session.snapshot().transport;
    return transport.kind === "playing" && transport.position === 11;
  });

  session.stop();

  expect(sound.posted.at(-1)).toEqual({ kind: "stopAll" });
  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
  expect(wake.acquired).toBe(false);

  await flushStart(session);
  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 4,
  });
});

test("practice.session/REQ-002/S3 — once through", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120, loop: false };
  const { session, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  advanceUntil(
    clock,
    () => session.snapshot().transport.kind === "idle",
    25,
    40_000,
  );

  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
});

test("practice.session/REQ-007/S1 — a new key mid-scale", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  // "note 9" (REQ-007/S1's Given) is position 8 — the transport advances
  // on the scheduler's own ticks, independently of any onset.
  advanceUntil(clock, () => {
    const transport = session.snapshot().transport;
    return transport.kind === "playing" && transport.position === 8;
  });

  const tonesBefore = sound.posted.filter(isTone).length;
  const lastGTone = sound.posted.filter(isTone).at(-1)!;
  const lastGToneIndex = sound.posted.lastIndexOf(lastGTone);
  const postedCountBeforeRestart = sound.posted.length;
  const frameAtRestart = sound.frame;

  session.setContext({
    key: keyOf("D"),
    variant: variantOf("flute-concert"),
    spelling: "sharp",
  });

  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });

  advanceUntil(clock, () => sound.posted.filter(isTone).length > tonesBefore);
  const tones = sound.posted.filter(isTone);
  const nextTone = tones[tones.length - 1]!;
  expect(nextTone.hz).toBeCloseTo(293.66, 1);
  const nextToneIndex = sound.posted.indexOf(nextTone);

  // practice.session/REQ-007/S1 — "begins from its first note straight
  // away": the superseded G-major tones and clicks already posted inside
  // the 200 ms lookahead must be silenced before D major's first note, so
  // they never sound after the key change.
  const stopAllIndex = sound.posted.findIndex(
    (command) => command.kind === "stopAll",
  );
  expect(stopAllIndex).toBeGreaterThan(lastGToneIndex);
  expect(stopAllIndex).toBeLessThan(nextToneIndex);

  // The new sequence picks up from the current frame, not from wherever
  // the superseded G-major schedule had already reached — and (REQ-008)
  // its own first tick leads that frame by FIRST_TICK_LEAD_MS, same as a
  // fresh start(); every later tick only ever moves further forward.
  const firstTickLeadFrames = (FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000;
  const postedAfterRestart = sound.posted
    .slice(postedCountBeforeRestart)
    .filter((command) => isTone(command) || isClick(command));
  expect(postedAfterRestart[0]!.onsetFrame).toBeGreaterThanOrEqual(
    frameAtRestart,
  );
  expect(postedAfterRestart[0]!.onsetFrame).toBeLessThanOrEqual(
    frameAtRestart + firstTickLeadFrames,
  );
  for (const command of postedAfterRestart) {
    expect(command.onsetFrame).toBeGreaterThanOrEqual(frameAtRestart);
  }

  // The caption follows the new sequence's first note's own highlight
  // timer, aimed at its audible onset (T031).
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);
  expect(session.snapshot().caption).toMatch(/^D4 · 1 of \d+$/);
});

test("practice.session/REQ-007/S2 — turning the metronome off mid-run", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 120,
    soundMode: "both" as const,
  };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  advanceUntil(clock, () => sound.posted.some(isTone));

  session.setSettings({ ...settings, soundMode: "notes" });

  const tonesBefore = sound.posted.filter(isTone).length;
  const clicksBefore = sound.posted.filter(isClick).length;

  advanceUntil(clock, () => sound.posted.filter(isTone).length > tonesBefore);

  expect(sound.posted.filter(isClick).length).toBe(clicksBefore);
});

test("practice.session/REQ-004/S4 — a tempo change keeps the place", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 96,
    countIn: false,
  };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);

  // practice.session/REQ-003/S3 — "off means straight in": with count-in
  // disabled the first note is the first thing posted, at once — FIRST_TICK_
  // LEAD_MS (20 ms) later than ▶ was tapped, not delayed further, and a
  // human hears 20 ms as "at once".
  const firstTickLeadFrames = (FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000;
  const firstPosted = sound.posted[0]!;
  if (!isTone(firstPosted)) throw new Error("unreachable: expected a tone");
  expect(firstPosted.onsetFrame).toBe(firstTickLeadFrames);

  // "note 6" (REQ-004/S4's Given) is position 5 — the transport advances
  // on the scheduler's own ticks, independently of any onset.
  advanceUntil(clock, () => {
    const transport = session.snapshot().transport;
    return transport.kind === "playing" && transport.position === 5;
  });

  const tonesBeforeChange = sound.posted.filter(isTone).length;

  // Three + taps, 96 → 98 → 100 → 102 — the UI's stepper maps to a single
  // setSettings call carrying the result.
  session.setSettings({ ...settings, tempoBpm: 102 });

  // The position already reached is never reset by a tempo change — only
  // setContext/setTraversal restart (REQ-007).
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 5,
  });

  advanceUntil(
    clock,
    () => sound.posted.filter(isTone).length >= tonesBeforeChange + 3,
  );
  const tones = sound.posted.filter(isTone);
  const changeIndex = tonesBeforeChange; // first tone posted after the tap

  // The tick already inside the lookahead window when the tap happened
  // keeps its scheduled onset; the tempo takes hold from the tick after
  // it — Math.round(60 / 102 * 48000) = 28235 frames (588 ms) at 48 kHz.
  expect(
    tones[changeIndex + 1]!.onsetFrame - tones[changeIndex]!.onsetFrame,
  ).toBe(28235);
});

test("practice.session/REQ-007/S3 — the sheet is not a stop", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  advanceUntil(clock, () => session.snapshot().transport.kind === "playing");

  for (let tick = 0; tick < 20; tick += 1) {
    if (tick % 2 === 0) {
      const before = session.snapshot().transport;
      session.setSettings({ ...settings, tempoBpm: 120 + tick });
      // practice.session/REQ-004 — a tempo change mid-run never resets the
      // position; only setContext/setTraversal do (REQ-007).
      expect(session.snapshot().transport).toEqual(before);
    } else {
      session.setTraversal({ ...GMajorTwoOctaves, direction: "updown" });
      expect(session.snapshot().transport).toEqual({
        kind: "playing",
        position: 0,
      });
    }
    clock.advance(600);
    expect(session.snapshot().transport.kind).toBe("playing");
  }
});
