// practice.session/REQ-006, REQ-005, REQ-009, REQ-010 — the sounding
// position (and therefore TargetAdvanced, the caption and the progress bar)
// moves from post time to the sound's onset; the page hidden stops
// playback; sound-unavailable runs the sequence silently.

import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  HIGHLIGHT_LEAD_MS,
  type Session,
  type TargetAdvanced,
} from "../../../src/practice/published";
import { targetAdvancedSchema } from "../../../src/practice/published/target-advanced.schema";
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

test("practice.session/REQ-006 — the highlight fires from the scheduled onset; a report has no effect", async () => {
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

  // With no fireOnset at all, advancing the fake clock to the first tone's
  // scheduled onset is enough to light it — the timer aimed at that onset
  // drives the highlight, not the worklet's cross-thread report (converge
  // C1).
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);

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
  expect(parsed.atFrame).toBe(firstTone.onsetFrame);

  // The timer is authoritative (T031): the onset report for the same
  // position, arriving after the timer already fired, has no effect at all
  // — it is not consulted for the highlight.
  sound.fireOnset(0);

  expect(session.snapshot().soundingPosition).toBe(0);
  expect(events).toHaveLength(1);

  // stop() cancels every pending highlight timer — once the second tone is
  // posted (its own timer scheduled, still ahead of its onset), stopping
  // and advancing past that onset must not resurrect a highlight.
  advanceUntil(clock, () => sound.posted.filter(isTone).length >= 2);
  session.stop();
  clock.advance(1000);

  expect(session.snapshot().soundingPosition).toBeNull();
  expect(events).toHaveLength(1);
});

test("practice.session/REQ-006/S3 — nothing lit when nothing sounds", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  expect(session.snapshot().soundingPosition).toBeNull();

  session.start();
  await Promise.resolve();
  await Promise.resolve();

  clock.advance(300);

  expect(session.snapshot().soundingPosition).toBeNull();
  expect(session.snapshot().transport.kind).toBe("countingIn");
});

test("practice.session/REQ-006/S4 — a report before the timer does not light; the timer then fires aimed at the audible onset (scheduled frame + outputLatencyMs − HIGHLIGHT_LEAD_MS)", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.latencyMs = 40;

  await flushStart(session);
  advanceUntil(clock, () => sound.posted.some(isTone));

  expect(session.snapshot().soundingPosition).toBeNull();

  const firstTone = sound.posted.filter(isTone)[0]!;

  // A cross-thread onset report can arrive well before its own timer — the
  // timer is authoritative (T031), not the report: nothing lights yet.
  sound.fireOnset(firstTone.tag);
  expect(session.snapshot().soundingPosition).toBeNull();

  const framesUntilGraphOnset = firstTone.onsetFrame - sound.frame;
  const msUntilGraphOnset = (framesUntilGraphOnset * 1000) / sound.sampleRate();
  // The timer's aim nets latencyMs (40) minus the 20 ms lead — 20 ms past
  // the graph onset (practice.session/REQ-006).
  const netDelayMs = sound.latencyMs - HIGHLIGHT_LEAD_MS;

  // At the graph (scheduled) onset itself the highlight has not fired yet
  // — the timer is still waiting out the net (latency-minus-lead) delay.
  clock.advance(msUntilGraphOnset);
  expect(session.snapshot().soundingPosition).toBeNull();

  // 1 ms short of the net delay — still not fired.
  clock.advance(netDelayMs - 1);
  expect(session.snapshot().soundingPosition).toBeNull();

  // The final ms — the timer fires, 20 ms ahead of the raw output latency.
  clock.advance(1);
  expect(session.snapshot().soundingPosition).toBe(0);
});

test("practice.session/REQ-007/S1 — a stale report from the superseded run does not light anything or suppress the new run's timer", async () => {
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
  advanceUntil(clock, () => session.snapshot().transport.kind === "playing");

  // The G-major run's own first tone (position 0) — already posted,
  // tagged for the run it belongs to. A real worklet can still deliver its
  // OnsetReport after stopAll (a message already in flight when the
  // command landed), so this is the tag REQ-007/S1's race arrives on —
  // its raw position (0) coincides with the very position the new run's
  // own timer is about to reach, so a report that is not correctly
  // discarded would both light the wrong instant now and mark position 0
  // as already fired, suppressing the new run's own highlight later.
  const staleTone = sound.posted.filter(isTone)[0]!;

  session.setContext({
    key: keyOf("D"),
    variant: variantOf("flute-concert"),
  });
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });

  const soundingBeforeStaleReport = session.snapshot().soundingPosition;
  const eventCountBeforeStaleReport = events.length;

  sound.fireOnset(staleTone.tag);

  expect(session.snapshot().soundingPosition).toBe(soundingBeforeStaleReport);
  expect(events).toHaveLength(eventCountBeforeStaleReport);

  // The new run's own timer for position 0 still fires normally — the
  // stale report above did not suppress it.
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);
  expect(session.snapshot().caption).toBe("D4 · 1 of 29");
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

  // The highlight timer runs off the same SoundPort regardless of whether
  // sound could actually start — the highlight walks the sequence at tempo
  // even though sound could not.
  expect(sound.posted.find(isTone)).toBeDefined();
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);
});

test("T025 — a thrown sound failure still gives the notice and the silent walk", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.throwOnStart = new Error("boom");

  await flushStart(session);

  expect(session.snapshot().notice).toBe("sound-unavailable");
  expect(session.snapshot().transport).toEqual({
    kind: "countingIn",
    beatsLeft: 4,
  });

  // The transport keeps advancing on the fake's own onset reports even
  // though sound.start() threw — the silent walk-through REQ-010 requires.
  advanceUntil(clock, () => session.snapshot().transport.kind === "playing");
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });
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

test("T024 — session.dispose() reaches the sound port", () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    defaultSessionSettings,
  );

  expect(sound.disposeCalls).toBe(0);

  session.dispose();

  expect(sound.disposeCalls).toBe(1);
});

test("practice.session/REQ-005/S2 — metronome-only advances on the click's onset", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 120,
    countIn: false,
    soundMode: "metronome" as const,
  };
  const { session, sound, clock } = sessionOn(
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

  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);

  expect(session.snapshot().caption).toBe("G4 · 1 of 29");
});

test("T032 — onChange fires exactly once per beat while playing, not once per 25 ms lookahead poll", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 120,
    countIn: false,
  };
  const { session, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  const advancedEvents: TargetAdvanced[] = [];
  session.onTargetAdvanced((event) => advancedEvents.push(event));

  await flushStart(session);

  // Subscribed only after start() so this count reflects exactly the
  // steady-state playing beats below, not the transport's own idle→playing
  // transition (a separate, single notify start() already issued).
  let changeCount = 0;
  session.onChange(() => {
    changeCount += 1;
  });

  const BEATS_TO_OBSERVE = 3;
  advanceUntil(clock, () => advancedEvents.length >= BEATS_TO_OBSERVE);

  // The lookahead scheduler polls every 25 ms and posts commands up to
  // 200 ms ahead of each beat's audible onset — several polls (and at
  // 120 bpm, several lookahead-window fills) happen per beat. onChange must
  // still fire exactly once per beat sounded, not once per poll.
  expect(changeCount).toBe(BEATS_TO_OBSERVE);
});

test("T033 — the end of a non-looping run is timed to the last note's audible end (200 bpm, 150 ms latency)", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 200,
    loop: false,
    countIn: false,
  };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.latencyMs = 150;

  const events: TargetAdvanced[] = [];
  session.onTargetAdvanced((event) => events.push(event));

  await flushStart(session);
  // Position 28 is the 29th and last note of the once-through sequence
  // (G4, the palindrome's close) — its own highlight timer, aimed at its
  // audible onset, must still fire even though there is no tick after it.
  advanceUntil(clock, () => session.snapshot().soundingPosition === 28);

  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 28,
  });
  expect(session.snapshot().caption).toBe("G4 · 29 of 29");
  expect(events).toHaveLength(29);

  const lastTone = sound.posted.filter(isTone).at(-1)!;
  // One beat at 200 bpm — REQ-004: every note is a crotchet.
  const tickFrames = Math.round((60 * sound.sampleRate()) / 200);
  const audibleEndFrame = lastTone.onsetFrame + tickFrames;
  const msUntilAudibleEnd =
    ((audibleEndFrame - sound.frame) * 1000) / sound.sampleRate() +
    sound.latencyMs;

  // Comfortably short of the last note's audible end (onset + one beat +
  // the port's output latency) — still playing, its highlight still lit:
  // the idle transition never comes early.
  clock.advance(msUntilAudibleEnd - 20);
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 28,
  });
  expect(session.snapshot().soundingPosition).toBe(28);
  expect(events).toHaveLength(29);

  // Past the audible end: idle, nothing lit, no further TargetAdvanced.
  clock.advance(40);
  expect(session.snapshot().transport).toEqual({ kind: "idle" });
  expect(session.snapshot().soundingPosition).toBeNull();
  expect(session.snapshot().caption).toBe("29 notes · G4–G6");
  expect(events).toHaveLength(29);
});

test("T033 — stop() during the last note's tail cancels the pending idle timer", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 200,
    loop: false,
    countIn: false,
  };
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.latencyMs = 150;

  await flushStart(session);
  advanceUntil(clock, () => session.snapshot().soundingPosition === 28);

  session.stop();
  expect(session.snapshot().transport).toEqual({ kind: "idle" });

  // A fresh run, started right away — if stop() had left the previous
  // run's idle timer armed, it would fire mid-way through this one (it was
  // aimed at a point roughly one beat after where we stopped) and release
  // the wake lock out from under it.
  await flushStart(session);
  expect(wake.acquired).toBe(true);

  clock.advance(1000);

  expect(wake.acquired).toBe(true);
});

test("T033 — start() during the last note's tail cancels the pending idle timer", async () => {
  const settings = {
    ...defaultSessionSettings,
    tempoBpm: 200,
    loop: false,
    countIn: false,
  };
  const { session, sound, clock, wake } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );
  sound.latencyMs = 150;

  await flushStart(session);
  advanceUntil(clock, () => session.snapshot().soundingPosition === 28);

  // Start a new run directly without stopping first — if start() does not
  // cancel the previous run's idle timer, it will fire mid-way through the
  // new run and release the wake lock out from under it.
  session.start();
  await Promise.resolve();
  await Promise.resolve();

  clock.advance(1000);

  expect(session.snapshot().transport.kind).toBe("playing");
  expect(wake.acquired).toBe(true);
});
