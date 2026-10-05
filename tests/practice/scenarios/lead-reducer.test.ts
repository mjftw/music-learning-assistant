import { expect, test } from "vitest";
import type {
  LeadPhase,
  NoteJudged,
  SequenceNote,
} from "../../../src/practice/published";
import {
  applyJudgement,
  applySilence,
  defaultLeadSettings,
  emptyHold,
  heldFractionOf,
  targetAt,
} from "../../../src/practice/published";
import { sessionOn } from "../fakes";

const oneOctaveUpdown = {
  direction: "updown",
  octaves: { kind: "count", count: 1 },
  shape: "scale",
} as const;
const seq: readonly SequenceNote[] = sessionOn(
  "C",
  "flute-concert",
  oneOctaveUpdown,
).session.snapshot().sequence;
const me = { ...defaultLeadSettings, who: "me" as const };
const listeningAt = (position: number): LeadPhase => ({
  kind: "listening",
  target: targetAt(seq, position),
  hold: emptyHold,
  mutedUntilMs: null,
});
function judged(cents: number, verdict: NoteJudged["verdict"]): NoteJudged {
  const target = targetAt(seq, 1).note;
  return {
    target,
    cents,
    verdict,
    heard: { hz: 262.5, nearest: target, cents },
    atFrame: 0,
  };
}
const inTune = judged(6, "in-tune"),
  flat = judged(-18, "flat");
function feedSteady(
  phase: LeadPhase,
  fromMs: number,
  toMs: number,
  stepMs = 10,
): { phase: LeadPhase; advancedAtMs: number | null } {
  let p = phase,
    advancedAtMs: number | null = null;
  for (let t = fromMs; t <= toMs && advancedAtMs === null; t += stepMs) {
    const r = applyJudgement(p, inTune, t, me, 96, seq, true);
    p = r.phase;
    if (r.advanced) advancedAtMs = t;
  }
  return { phase: p, advancedAtMs };
}

test("practice.session/REQ-016/S1 — held, then the next (reducer)", () => {
  const { phase, advancedAtMs } = feedSteady(listeningAt(1), 0, 2000);
  expect(advancedAtMs).toBe(1250);
  expect(phase).toMatchObject({
    kind: "listening",
    target: { position: 2, note: { letter: "D", octave: 4 } },
    hold: emptyHold,
  });
});
test("practice.session/REQ-016/S2 — out of tune never accumulates", () => {
  let p = listeningAt(1);
  for (let t = 0; t <= 5000; t += 10) {
    const r = applyJudgement(p, flat, t, me, 96, seq, true);
    expect(r.advanced).toBe(false);
    p = r.phase;
  }
  expect(p).toMatchObject({
    kind: "listening",
    target: { position: 1 },
    hold: emptyHold,
  });
});
test("practice.session/REQ-016/S3 — leaving the band resets", () => {
  const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
  expect(held900).toMatchObject({ hold: { heldMs: 900 } });
  const reset = applyJudgement(
    held900,
    judged(17, "sharp"),
    910,
    me,
    96,
    seq,
    true,
  ).phase;
  expect(reset).toMatchObject({ hold: emptyHold });
  expect(feedSteady(reset, 920, 4000).advancedAtMs).toBe(920 + 1250);
});
test("practice.session/REQ-016/S4 — silence pauses", () => {
  const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
  const paused = applySilence(held900);
  expect(paused).toMatchObject({ hold: { heldMs: 900, lastInTuneAtMs: null } });
  expect(feedSteady(paused, 2900, 5000).advancedAtMs).toBe(2900 + 350);
});
test("practice.session/REQ-016/S7 — the tempo changes the requirement, not the progress", () => {
  const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
  let p = held900,
    at: number | null = null;
  for (let t = 910; t <= 2000 && at === null; t += 10) {
    const r = applyJudgement(p, inTune, t, me, 120, seq, true);
    p = r.phase;
    if (r.advanced) at = t;
  }
  expect(at).toBe(1000);
  const r60 = applyJudgement(held900, inTune, 910, me, 60, seq, true);
  expect(r60.advanced).toBe(false);
  expect(r60.phase).toMatchObject({ hold: { heldMs: 910 } });
});
test("practice.session/REQ-015/S3 — the last note held, loop off → complete", () => {
  let p = listeningAt(15),
    advanced = false;
  for (let t = 0; t <= 2000 && !advanced; t += 10) {
    const r = applyJudgement(p, inTune, t, me, 96, seq, false);
    p = r.phase;
    advanced = r.advanced;
  }
  expect(p).toEqual({ kind: "complete" });
});
test("practice.session/REQ-015/S4 — the last note held, loop on → position 1 again", () => {
  let p = listeningAt(15),
    advanced = false;
  for (let t = 0; t <= 2000 && !advanced; t += 10) {
    const r = applyJudgement(p, inTune, t, me, 96, seq, true);
    p = r.phase;
    advanced = r.advanced;
  }
  expect(p).toMatchObject({
    kind: "listening",
    target: { position: 1, note: { letter: "C", octave: 4 } },
    hold: emptyHold,
  });
});
test("practice.session/REQ-017/S3 — the held fraction", () => {
  expect(
    heldFractionOf({ heldMs: 750, lastInTuneAtMs: 750 }, 1250),
  ).toBeCloseTo(0.6, 10);
  expect(heldFractionOf({ heldMs: 2000, lastInTuneAtMs: 2000 }, 1250)).toBe(1);
  expect(heldFractionOf(emptyHold, 1250)).toBe(0);
});
test("practice.session/REQ-016 — idle, complete and cannot-hear ignore judgements", () => {
  for (const phase of [
    { kind: "idle" },
    { kind: "complete" },
    { kind: "cannot-hear", reason: "refused" },
  ] as const) {
    expect(applyJudgement(phase, inTune, 5000, me, 96, seq, true)).toEqual({
      phase,
      advanced: false,
    });
  }
});
