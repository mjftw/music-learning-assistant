// practice.session/REQ-019 — changes while leading: a key/variant/scale/
// traversal change restarts the lead run on the new sequence at position 1,
// still listening, hold at zero; a tempo/Hold/In-tune change takes effect at
// the next reading (the accumulated hold kept); a cue (cueMeter) applies at
// once and is not a stop; the sheet opening/closing is not a stop either.
import { expect, test } from "vitest";
import type {
  NoteJudged,
  TargetAdvanced,
} from "../../../src/practice/published";
import { defaultScaleChoice } from "../../../src/practice/published";
import { keyOf } from "../fakes";
import {
  hearAt,
  hearSteady,
  holdThrough,
  leadFixture,
  leadSettings,
  startLead,
} from "../lead-helpers";

test("practice.session/REQ-019/S1 — a new key mid-run", async () => {
  const f = leadFixture();
  const advanced: TargetAdvanced[] = [];
  f.session.onTargetAdvanced((e) => advanced.push(e));
  await startLead(f.session);
  holdThrough(f, 8);
  expect(f.session.snapshot().lead.target?.position).toBe(9);
  f.session.setContext({ ...f.context, key: keyOf("G") });
  expect(f.session.snapshot().lead.target).toMatchObject({
    position: 1,
    note: { letter: "G", octave: 4 },
  });
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  expect(advanced.at(-1)).toMatchObject({
    note: { letter: "G", octave: 4 },
    position: 1,
  });
  expect(f.listening.stopCalls).toBe(0);
  expect(f.listening.startCalls).toBe(1);
});

test("practice.session/REQ-019/S2 — a tighter tolerance mid-hold", async () => {
  const f = leadFixture();
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  await startLead(f.session);
  const t0 = holdThrough(f, 2); // the target is E4
  hearSteady(f, 331.15, t0, t0 + 600); // +8 ¢
  expect(judged.at(-1)?.verdict).toBe("in-tune");
  f.session.setSettings(leadSettings({ tolerance: "accurate" }));
  hearAt(f, 331.15, t0 + 620);
  expect(judged.at(-1)).toMatchObject({
    target: { letter: "E" },
    cents: 8,
    verdict: "sharp",
  });
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  expect(f.listening.stopCalls).toBe(0);
});

test("practice.session/REQ-019/S3 — more beats mid-hold", async () => {
  const f = leadFixture();
  await startLead(f.session);
  const t0 = holdThrough(f, 2); // the target is E4
  hearSteady(f, 330.6, t0, t0 + 900);
  f.session.setSettings(leadSettings({ holdBeats: 4 }));
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 2500, 2);
  expect(f.session.snapshot().lead.phase).toBe("listening");
});

test("practice.session/REQ-019/S4 — the sheet is not a stop (the session never sees the sheet; the verbs it calls never stop)", async () => {
  const f = leadFixture();
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 400);
  f.session.setSettings(leadSettings({ cueMeter: false }));
  f.session.setSettings(leadSettings({ cueMeter: true }));
  hearSteady(f, 262.5, 410, 800);
  expect(f.listening.stopCalls).toBe(0);
  expect(judged.length).toBeGreaterThan(60);
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(800 / 1250, 1);
});

test("practice.session/REQ-019/S5 — a traversal change restarts", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 1300);
  expect(f.session.snapshot().lead.target?.position).toBe(2);
  f.session.setTraversal({
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });
  expect(f.session.snapshot().sequence).toHaveLength(8);
  expect(f.session.snapshot().lead.target).toMatchObject({
    position: 1,
    note: { letter: "C", octave: 4 },
  });
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  f.session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
  expect(f.session.snapshot().lead.target?.position).toBe(1);
});
