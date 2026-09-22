// practice.session/REQ-006, REQ-005, REQ-009, REQ-010 — the sounding
// position (and therefore TargetAdvanced, the caption and the progress bar)
// moves from post time to the sound's onset; the page hidden stops
// playback; sound-unavailable runs the sequence silently.

import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  type Session,
  type TargetAdvanced,
} from "../../../src/practice/published";
import { targetAdvancedSchema } from "../../../src/practice/published/target-advanced.schema";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import type { Traversal } from "../../../src/theory/published";
import { advanceUntil, sessionOn } from "../fakes";

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

test("practice.session/REQ-006/S3 — nothing lit when nothing sounds, until the onset", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  const events: TargetAdvanced[] = [];
  session.onTargetAdvanced((event) => events.push(event));

  await flushStart(session);
  // Through the count-in the tone is already posted (the lookahead
  // scheduler runs 200 ms ahead) but nothing has sounded yet.
  advanceUntil(clock, () => sound.posted.some(isTone));

  expect(session.snapshot().soundingPosition).toBeNull();
  expect(events).toHaveLength(0);

  const firstTone = sound.posted.filter(isTone)[0]!;
  expect(firstTone.tag).toBe(0);

  sound.fireOnset(0);

  expect(session.snapshot().soundingPosition).toBe(0);
  expect(session.snapshot().caption).toBe("G4 · 1 of 29");
  expect(events).toHaveLength(1);

  const parsed = targetAdvancedSchema.parse(events[0]);
  expect(parsed.note).toEqual({
    letter: "G",
    accidental: "natural",
    octave: 4,
  });
  expect(parsed.position).toBe(0);
  expect(parsed.length).toBe(29);
});

test("practice.session/REQ-009/S1 — hidden means stopped", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock, visibility } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  advanceUntil(clock, () => session.snapshot().transport.kind === "playing");

  visibility.hide();

  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(sound.posted.at(-1)).toEqual({ kind: "stopAll" });
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
});

test("practice.session/REQ-009/S2 — the phone on the stand stays lit", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  expect(wake.acquired).toBe(false);

  await flushStart(session);
  expect(wake.acquired).toBe(true);

  session.stop();
  expect(wake.acquired).toBe(false);
});

test("practice.session/REQ-010/S1 — silent but not stuck", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.failWith = { reason: "worklet-failed", detail: "x" };

  await flushStart(session);

  expect(session.snapshot().notice).toBe("sound-unavailable");
  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 4,
  });

  advanceUntil(clock, () => session.snapshot().transport.kind === "playing");
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });

  // The fake still delivers onsets on the same SoundPort — the highlight
  // walks the sequence at tempo even though sound could not start.
  const tone = sound.posted.find(isTone);
  expect(tone).toBeDefined();
  sound.fireOnset(tone!.tag);
  expect(session.snapshot().soundingPosition).toBe(0);
});

test("practice.session/REQ-010/S2 — nothing before the gesture", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );

  expect(sound.startCalls).toBe(0);
  expect(sound.posted).toHaveLength(0);

  await flushStart(session);

  expect(sound.startCalls).toBe(1);
});

test("practice.session/REQ-005/S2 — metronome-only advances on the click's onset (♩)", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 120,
    countIn: false,
    soundMode: "metronome" as const,
  };
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);

  expect(sound.posted.some(isTone)).toBe(false);
  const firstClick = sound.posted.filter(isClick)[0]!;
  expect(firstClick.tag).toBe(0);
  expect(session.snapshot().soundingPosition).toBeNull();

  sound.fireOnset(0);

  expect(session.snapshot().soundingPosition).toBe(0);
  expect(session.snapshot().caption).toBe("G4 · 1 of 29");
});

test("practice.session/REQ-005/S2 — metronome-only, ♪: silent positions still advance at their tick", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 120,
    countIn: false,
    soundMode: "metronome" as const,
    noteLength: "quaver" as const,
  };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  const events: TargetAdvanced[] = [];
  session.onTargetAdvanced((event) => events.push(event));

  await flushStart(session);

  // Position 0 (even) clicks — its tag carries the position.
  const firstClick = sound.posted.filter(isClick)[0]!;
  expect(firstClick.tag).toBe(0);
  sound.fireOnset(0);
  expect(session.snapshot().soundingPosition).toBe(0);

  const clicksBeforePosition1 = sound.posted.filter(isClick).length;

  // Position 1 (odd) sounds nothing at all — no click, no tone — but still
  // advances, at its own onset time, via a scheduled timer.
  advanceUntil(clock, () => session.snapshot().soundingPosition === 1);

  expect(sound.posted.filter(isClick).length).toBe(clicksBeforePosition1);
  expect(sound.posted.some(isTone)).toBe(false);
  expect(session.snapshot().caption).toBe("A4 · 2 of 29");
  expect(events.some((event) => event.position === 1)).toBe(true);
});
