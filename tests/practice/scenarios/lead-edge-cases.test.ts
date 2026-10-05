// 008-learner-leads — the proposal's edge-case table, one test per row not
// already a scenario of this change, named after the row. Rows that are a
// scenario already are covered where they live:
//
//   Empty / first-run state          → practice.session/REQ-011/S2 (lead-settings.test.ts,
//                                       selection-store.test.ts "first-run defaults")
//   A key with no notes in range     → practice.session/REQ-015/S8 (lead-run.test.ts) for I lead;
//                                       for play along, the edge-case test below (decision D003)
//   Mode words tapped mid-run        → practice.session/REQ-014/S3 (lead-mode.test.ts)
//   Upstream unavailable             → practice.session/REQ-022/S1–S4 (lead-cannot-hear.test.ts)
//   The tool's own sound in the mic  → practice.session/REQ-018/S3 (lead-cues.test.ts),
//                                       practice.session/REQ-015/S5 and S6 (lead-run.test.ts,
//                                       invariants/never-both.test.ts), practice.session/REQ-013/S5
//                                       (session-tap.test.ts, "ignored while leading")
//   Reading with no confidence       → listening.pitch-detection/REQ-003/S4 (src/listening/src/
//                                       detector.rs — "always a positive frequency and a clarity")
//   Stored settings unreadable       → practice.session/REQ-011 (selection-store.test.ts "a bad
//                                       lead field falls back on its own, the rest restores")
//   The page hidden                  → practice.session/REQ-009/S3 (session-hidden-awake.test.ts)
//   A traversal change mid-run       → practice.session/REQ-019/S1, S5 (lead-changes.test.ts)
//
// And the measured scenarios of practice.session/REQ-021 — not unit tests,
// proven by the harnesses (`pnpm test:lead`, `pnpm test:timing`) and the
// phone; the guards at the bottom only pin that the harnesses exist and say
// what they measure (the 007 convention, tuner-harness.test.ts):
//   practice.session/REQ-021/S1 — the budget (measured): scripts/lead-timing-test.mjs
//   practice.session/REQ-021/S3 — playback untouched (measured): scripts/timing-test.mjs
//   practice.session/REQ-021/S4 — on the phone (acceptance): the phone walk at
//   acceptance, the user's sign-off — not a test.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { defaultSessionSettings } from "../../../src/practice/published";
import { pitchHzOf } from "../../../src/theory/published";
import {
  hearSteady,
  leadFixture,
  sessionWithEmptyRun,
  startLead,
} from "../lead-helpers";

test("edge case — a key with no notes in range in play along: ▶ does nothing", () => {
  const f = sessionWithEmptyRun(defaultSessionSettings);
  expect(f.session.snapshot().run).toHaveLength(0);

  f.session.start();

  expect(f.session.snapshot().transport).toEqual({ kind: "idle" });
  expect(f.sound.posts).toEqual([]);
  expect(f.wake.acquired).toBe(false);
  expect(f.listening.startCalls).toBe(0);
});

test("edge case — the circle tapped while already leading is a no-op", async () => {
  const f = leadFixture();
  await startLead(f.session);
  expect(f.listening.startCalls).toBe(1);

  // Held once, so the position is not the start state: a second start() must
  // neither restart the run nor ask for the microphone again.
  const first = f.session.snapshot().lead.target;
  if (first === null) throw new Error("no target");
  hearSteady(f, pitchHzOf(first.note), 0, 1300);
  const before = f.session.snapshot().lead;
  expect(before.target?.position).toBe(2);

  await startLead(f.session);

  const after = f.session.snapshot().lead;
  expect(f.listening.startCalls).toBe(1);
  expect(f.listening.stopCalls).toBe(0);
  expect(after.phase).toBe("listening");
  expect(after.target).toEqual(before.target);
});

test("edge case — the circle tapped again while the microphone is being asked for is the stop", async () => {
  const f = leadFixture();
  f.listening.holdStart = true;
  const targets: unknown[] = [];
  f.session.onTargetAdvanced((e) => targets.push(e));

  await startLead(f.session);
  expect(f.listening.startCalls).toBe(1);
  expect(f.session.snapshot().lead.listening).toEqual({ kind: "starting" });

  f.session.stop();
  f.listening.resolveStart();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.target).toBeNull();
  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });
  expect(targets).toEqual([]);
  expect(f.listening.listening).toBe(false);
  expect(f.wake.acquired).toBe(false);
});

const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

for (const order of [
  [0, 1],
  [1, 0],
] as const) {
  test(`edge case — start, stop, start while the microphone is being asked for: one run, one microphone (lead, resolved ${order.join(" then ")})`, async () => {
    const f = leadFixture();
    f.listening.holdStart = true;
    const targets: { position: number }[] = [];
    f.session.onTargetAdvanced((e) => targets.push(e));

    f.session.start();
    await settle();
    f.session.stop();
    f.session.start();
    await settle();
    expect(f.listening.startCalls).toBe(2);

    for (const n of order) {
      f.listening.resolveStart(n);
      await settle();
    }

    expect(f.session.snapshot().lead.phase).toBe("listening");
    expect(f.session.snapshot().lead.target?.position).toBe(1);
    expect(targets.map((t) => t.position)).toEqual([1]);
    expect(f.listening.listening).toBe(true);

    f.session.stop();
    expect(f.listening.listening).toBe(false);
    expect(f.session.snapshot().lead.phase).toBe("idle");
  });

  test(`edge case — enter, leave, enter the tuner while the microphone is being asked for: one tuner, one microphone (resolved ${order.join(" then ")})`, async () => {
    const f = leadFixture();
    f.listening.holdStart = true;

    f.session.enterTuner();
    await settle();
    f.session.leaveTuner();
    f.session.enterTuner();
    await settle();
    expect(f.listening.startCalls).toBe(2);

    for (const n of order) {
      f.listening.resolveStart(n);
      await settle();
    }

    expect(f.session.snapshot().tuner.active).toBe(true);
    expect(f.session.snapshot().tuner.listening).toEqual({
      kind: "listening",
    });
    expect(f.listening.listening).toBe(true);

    f.session.leaveTuner();
    expect(f.listening.listening).toBe(false);
  });
}

test("edge case — ■ twice", async () => {
  const f = leadFixture();
  await startLead(f.session);

  f.session.stop();
  f.session.stop();

  expect(f.listening.stopCalls).toBe(1);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.target).toBeNull();
});

test("practice.session/REQ-021/S1 · REQ-021/S3 — the harnesses that measure the budgets exist and say what they measure", () => {
  const header = (name: string): string =>
    readFileSync(resolve(__dirname, "../../../scripts", name), "utf8").slice(
      0,
      1200,
    );
  const lead = header("lead-timing-test.mjs");
  for (const id of ["REQ-021/S1", "REQ-018/S3"]) expect(lead).toContain(id);
  const timing = header("timing-test.mjs");
  for (const id of ["REQ-008/S1", "REQ-006/S4"]) expect(timing).toContain(id);
});
