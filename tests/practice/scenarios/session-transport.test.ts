import { expect, test } from "vitest";
import { defaultSessionSettings } from "../../../src/practice/published";
import type { Session } from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import type { Traversal } from "../../../src/theory/published";
import { advanceUntil, keyOf, sessionOn, variantOf } from "../fakes";

function isTone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "tone" }> {
  return command.kind === "tone";
}

function isClick(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "click" }> {
  return command.kind === "click";
}

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
  expect(clicks[1]!.onsetFrame - clicks[0]!.onsetFrame).toBe(24000);
  expect(clicks[2]!.onsetFrame - clicks[1]!.onsetFrame).toBe(24000);
  expect(clicks[3]!.onsetFrame - clicks[2]!.onsetFrame).toBe(24000);

  advanceUntil(clock, () => sound.posted.some(isTone));
  const firstTone = sound.posted.filter(isTone)[0]!;
  expect(firstTone.hz).toBeCloseTo(392.0, 1);
  expect(firstTone.tag).toBe(0);
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
  advanceUntil(clock, () => session.snapshot().caption.includes("· 12 of 29"));

  session.stop();

  expect(sound.posted.at(-1)).toEqual({ kind: "stopAll" });
  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(session.snapshot().caption).toBe("15 notes · G4–G6");
  expect(session.snapshot().progress).toBe(0);
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
  expect(session.snapshot().caption).toBe("15 notes · G4–G6");
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
  advanceUntil(clock, () => session.snapshot().caption.includes("· 9 of 29"));

  const tonesBefore = sound.posted.filter(isTone).length;

  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });

  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });

  advanceUntil(clock, () => sound.posted.filter(isTone).length > tonesBefore);
  const tones = sound.posted.filter(isTone);
  const nextTone = tones[tones.length - 1]!;
  expect(nextTone.hz).toBeCloseTo(293.66, 1);
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
