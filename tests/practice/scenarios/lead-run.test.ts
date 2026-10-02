import { expect, test } from "vitest";
import {
  createSession,
  defaultDroneSettings,
  defaultScaleChoice,
  type SessionContext,
  type TargetAdvanced,
} from "../../../src/practice/published";
import type { Variant, VariantId } from "../../../src/theory/published";
import { leadFixture, leadSettings, startLead } from "../lead-helpers";
import {
  FakeClock,
  FakeListening,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
  keyOf,
  type SessionFixture,
} from "../fakes";

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

test("practice.session/REQ-015/S8 — no notes, no run", async () => {
  const f = sessionWithEmptyRun();
  expect(f.session.snapshot().run).toHaveLength(0);
  await startLead(f.session);
  expect(f.listening.startCalls).toBe(0);
  expect(f.session.snapshot().lead.phase).toBe("idle");
});
