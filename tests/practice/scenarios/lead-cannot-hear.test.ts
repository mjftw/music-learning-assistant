// practice.session/REQ-022 — when the microphone cannot be used: refused at
// the start, retried at the next tap, failed mid-run, and never asked for
// before the gesture.

import { expect, test } from "vitest";
import type { TargetAdvanced } from "../../../src/practice/published";
import {
  hearSteady,
  leadFixture,
  leadSettings,
  startLead,
} from "../lead-helpers";

test("practice.session/REQ-022/S1 — refused", async () => {
  const f = leadFixture();
  f.listening.failWith = "refused";
  const advanced: TargetAdvanced[] = [];
  f.session.onTargetAdvanced((e) => advanced.push(e));
  await startLead(f.session);
  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
  expect(f.session.snapshot().lead.listening).toEqual({
    kind: "cannot-hear",
    reason: "refused",
  });
  expect(f.session.snapshot().lead.target).toBeNull();
  expect(advanced).toEqual([]);
  expect(f.wake.acquired).toBe(false);
  f.session.startDrone();
  await Promise.resolve();
  await Promise.resolve();
  expect(f.session.snapshot().drone.on).toBe(true); // the drone still works
});

test("practice.session/REQ-022/S2 — the next tap tries again", async () => {
  const f = leadFixture();
  f.listening.failWith = "none";
  await startLead(f.session);
  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
  f.listening.failWith = null;
  await startLead(f.session);
  expect(f.listening.startCalls).toBe(2);
  expect(f.session.snapshot().lead.phase).toBe("listening");
  expect(f.session.snapshot().lead.target?.position).toBe(1);
});

test("practice.session/REQ-022/S3 — failed while leading", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 500);
  f.listening.end();
  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
  expect(f.session.snapshot().lead.listening).toEqual({
    kind: "cannot-hear",
    reason: "failed",
  });
  expect(f.session.snapshot().lead.reading).toBeNull();
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  expect(f.session.snapshot().lead.target).toBeNull();
});

test("practice.session/REQ-022/S4 — nothing before the gesture", () => {
  const f = leadFixture();
  f.session.setSettings(leadSettings({ holdBeats: 4 }));
  f.session.setSettings(leadSettings({ who: "tool" }));
  f.session.setSettings(leadSettings());
  expect(f.listening.startCalls).toBe(0);
});
