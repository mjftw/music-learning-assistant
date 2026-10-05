// practice.session/REQ-009 — the page hidden, the screen awake, for a lead
// run: REQ-009/S1 (play along) lives in session-target.test.ts; this file
// covers S2's lead-run case and S3, both reached through startLead().

import { expect, test } from "vitest";
import { hearSteady, leadFixture, startLead } from "../lead-helpers";

test("practice.session/REQ-009/S2 — the phone on the stand stays lit while leading", async () => {
  const f = leadFixture();
  await startLead(f.session);
  expect(f.wake.acquired).toBe(true);
  f.session.stop();
  expect(f.wake.acquired).toBe(false);
});

test("practice.session/REQ-009/S3 — a lead run hidden", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 700);
  f.visibility.hide();
  expect(f.listening.stopCalls).toBe(1);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.target).toBeNull();
  expect(f.session.snapshot().lead.idleCaption).toBe(
    "hold 2 beats · medium tuning",
  );
  expect(f.wake.acquired).toBe(false);
  f.visibility.show();
  await Promise.resolve();
  await Promise.resolve();
  expect(f.listening.startCalls).toBe(1);
  await startLead(f.session);
  expect(f.session.snapshot().lead.target?.position).toBe(1);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});
