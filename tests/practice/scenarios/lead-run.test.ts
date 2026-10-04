import { expect, test } from "vitest";
import {
  defaultScaleChoice,
  type TargetAdvanced,
} from "../../../src/practice/published";
import {
  holdThrough,
  leadFixture,
  leadSettings,
  oneOctaveUpdown,
  sessionWithEmptyRun,
  startLead,
} from "../lead-helpers";
import { isStop, keyOf, startDroneAndFlush } from "../fakes";
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
  const f = sessionWithEmptyRun(leadSettings());
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
