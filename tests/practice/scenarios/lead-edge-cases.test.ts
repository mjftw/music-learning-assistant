// 008-learner-leads — the proposal's edge-case table, one test per row not
// already a scenario of this change, named after the row. Rows that are a
// scenario already are covered where they live:
//
//   Empty / first-run state          → practice.session/REQ-011/S2 (lead-settings.test.ts,
//                                       selection-store.test.ts "first-run defaults")
//   A key with no notes in range     → practice.session/REQ-015/S8 (lead-run.test.ts) for I lead;
//                                       play along's ▶ is NOT covered — it starts a count-in on an
//                                       empty run today, contradicting the row (see the T021 report)
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
import { pitchHzOf } from "../../../src/theory/published";
import { hearSteady, leadFixture, startLead } from "../lead-helpers";

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
