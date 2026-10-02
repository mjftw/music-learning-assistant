import { expect, test } from "vitest";
import {
  createSession,
  defaultDroneSettings,
  defaultScaleChoice,
  type SessionContext,
  type TargetAdvanced,
} from "../../../src/practice/published";
import type { Variant, VariantId } from "../../../src/theory/published";
import {
  holdThrough,
  leadFixture,
  leadSettings,
  oneOctaveUpdown,
  startLead,
} from "../lead-helpers";
import {
  FakeClock,
  FakeListening,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
  isStop,
  keyOf,
  startDroneAndFlush,
  type SessionFixture,
} from "../fakes";
import { enter } from "../tuner-helpers";

test("practice.session/REQ-015/S1 — the run starts on the first note", async () => {
  const f = leadFixture();
  const advanced: TargetAdvanced[] = [];
  f.session.onTargetAdvanced((e) => advanced.push(e));
  expect(f.listening.startCalls).toBe(0);
  await startLead(f.session);
  expect(f.listening.startCalls).toBe(1);
  const s = f.session.snapshot();
  expect(s.lead.phase).toBe("listening");
  expect(s.lead.target).toMatchObject({
    position: 1,
    note: { letter: "C", accidental: "natural", octave: 4 },
    runIndex: 0,
  });
  expect(s.lead.reading).toBeNull();
  expect(s.lead.heldFraction).toBe(0);
  expect(advanced).toHaveLength(1);
  expect(advanced[0]).toMatchObject({
    note: { letter: "C", octave: 4 },
    position: 1,
    length: 15,
  });
  expect(
    f.sound.posted.filter(
      (c) => c.kind === "tone" || c.kind === "click" || c.kind === "drone",
    ),
  ).toEqual([]);
  expect(f.wake.acquired).toBe(true);
});

test("practice.session/REQ-015/S2 — stop", async () => {
  const f = leadFixture();
  await startLead(f.session);
  f.session.stop();
  expect(f.listening.stopCalls).toBe(1);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.target).toBeNull();
  expect(f.session.snapshot().lead.idleCaption).toBe(
    "hold 2 beats · medium tuning",
  );
  expect(f.wake.acquired).toBe(false);
  await startLead(f.session);
  expect(f.session.snapshot().lead.target?.position).toBe(1);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});

// practice.session/REQ-015/S8 — no key/scale/variant combination in the
// built-in catalogue (flute Concert C4–C7, ocarina Alto C A4–F6, ocarina
// Bass C A3–F5 — every one spans at least two octaves) actually leaves a
// key with zero notes in range: an exhaustive search over the twelve
// majors, every scale and every variant (the brief's one-off loop, run and
// deleted — see the T005 implementation report) never found an empty run.
// This synthetic variant's range is a single pitch outside the key's scale,
// which reliably reproduces "no notes of this key in range" without
// touching the real catalogue.
const noNotesVariant: Variant = {
  instrumentId: "test",
  instrumentName: "Test",
  // Test-only id, never a real catalogue entry — a cast is needed since
  // VariantId is a branded string (docs/engineering.md §3).
  variantId: "test-no-notes" as VariantId,
  variantName: "No notes",
  range: {
    lowest: { letter: "C", accidental: "sharp", octave: 4 },
    highest: { letter: "C", accidental: "sharp", octave: 4 },
  },
};

function sessionWithEmptyRun(): SessionFixture {
  const sound = new FakeSound();
  const clock = new FakeClock(sound);
  const wake = new FakeWakeLock();
  const visibility = new FakeVisibility();
  const listening = new FakeListening();
  const context: SessionContext = {
    key: keyOf("C"),
    variant: noNotesVariant,
    spelling: "sharp",
  };
  const session = createSession(
    context,
    { direction: "up", octaves: { kind: "count", count: 4 }, shape: "scale" },
    defaultScaleChoice,
    leadSettings(),
    defaultDroneSettings,
    { sound, clock, wakeLock: wake, visibility, listening },
  );
  return { session, sound, clock, wake, visibility, listening, context };
}

test("practice.session/REQ-015/S3 — the last note held, loop off", async () => {
  const f = leadFixture({ ...leadSettings(), loop: false });
  const advanced: TargetAdvanced[] = [];
  f.session.onTargetAdvanced((e) => advanced.push(e));
  await startLead(f.session);
  holdThrough(f, 15);
  const s = f.session.snapshot();
  expect(s.lead.phase).toBe("complete");
  expect(s.lead.completeCaption).toBe("15 of 15 held · C4–C5");
  expect(s.lead.target).toBeNull();
  expect(f.listening.stopCalls).toBe(1);
  expect(f.wake.acquired).toBe(false);
  expect(advanced).toHaveLength(15);
  await startLead(f.session);
  expect(f.session.snapshot().lead.target?.position).toBe(1);
  expect(f.listening.startCalls).toBe(2);
});

test("practice.session/REQ-015/S4 — the last note held, loop on", async () => {
  const f = leadFixture();
  const advanced: TargetAdvanced[] = [];
  f.session.onTargetAdvanced((e) => advanced.push(e));
  await startLead(f.session);
  holdThrough(f, 15);
  expect(f.session.snapshot().lead.phase).toBe("listening");
  expect(f.session.snapshot().lead.target).toMatchObject({
    position: 1,
    note: { letter: "C", octave: 4 },
  });
  expect(advanced).toHaveLength(16);
  expect(advanced[15]).toMatchObject({
    position: 1,
    note: { letter: "C", octave: 4 },
  });
  expect(f.listening.stopCalls).toBe(0);
  expect(f.session.snapshot().lead.completeCaption).toBeNull();
});

test("practice.session/REQ-015 — a key, traversal or scale change from complete returns to idle", async () => {
  const f = leadFixture({ ...leadSettings(), loop: false });
  await startLead(f.session);
  holdThrough(f, 15);
  expect(f.session.snapshot().lead.phase).toBe("complete");

  f.session.setContext({ ...f.context, key: keyOf("G") });
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.completeCaption).toBeNull();
  expect(f.session.snapshot().lead.target).toBeNull();

  await startLead(f.session);
  holdThrough(f, 15);
  expect(f.session.snapshot().lead.phase).toBe("complete");
  f.session.setTraversal({ ...oneOctaveUpdown, direction: "up" });
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.completeCaption).toBeNull();

  await startLead(f.session);
  holdThrough(f, 8);
  expect(f.session.snapshot().lead.phase).toBe("complete");
  f.session.setScaleChoice(defaultScaleChoice);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.completeCaption).toBeNull();
});

test("practice.session/REQ-015/S8 — no notes, no run", async () => {
  const f = sessionWithEmptyRun();
  expect(f.session.snapshot().run).toHaveLength(0);
  await startLead(f.session);
  expect(f.listening.startCalls).toBe(0);
  expect(f.session.snapshot().lead.phase).toBe("idle");
});

test("practice.session/REQ-015/S5 — the drone goes first", async () => {
  const f = leadFixture();
  await startDroneAndFlush(f.session);
  expect(f.session.snapshot().drone.on).toBe(true);
  await startLead(f.session);
  const droneStopIndex = f.sound.posts.findIndex(
    (p) => isStop(p.command) && p.command.tag >= 3_000_000,
  );
  expect(droneStopIndex).toBeGreaterThanOrEqual(0);
  expect(f.session.snapshot().drone.on).toBe(false);
  expect(f.session.snapshot().lead.phase).toBe("listening");
  const g = leadFixture();
  await startLead(g.session);
  await startDroneAndFlush(g.session);
  expect(g.listening.stopCalls).toBe(1);
  expect(g.session.snapshot().lead.phase).toBe("idle");
  expect(g.session.snapshot().drone.on).toBe(true);
});

test("practice.session/REQ-015/S7 — the Tuner pill ends the run", async () => {
  const f = leadFixture();
  await startLead(f.session);
  await enter(f.session);
  expect(f.listening.stopCalls).toBe(1);
  expect(f.listening.startCalls).toBe(2);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().tuner.active).toBe(true);
  f.session.leaveTuner();
  expect(f.session.snapshot().lead.idleCaption).toBe(
    "hold 2 beats · medium tuning",
  );
});
