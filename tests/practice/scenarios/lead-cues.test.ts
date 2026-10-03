import { expect, test } from "vitest";
import type { NoteJudged } from "../../../src/practice/published";
import { CUE_TAIL_MS, CUE_TONE_MS } from "../../../src/practice/published";
import { isTone } from "../fakes";
import {
  frameOfMs,
  hearAt,
  hearSteady,
  leadFixture,
  leadSettings,
  letGapPass,
  startLead,
} from "../lead-helpers";

test("practice.session/REQ-018/S2 — the tone sounds each target", async () => {
  const f = leadFixture(leadSettings({ cueTone: true }));
  await startLead(f.session);
  await Promise.resolve();
  await Promise.resolve();
  const tones = f.sound.posted.filter(isTone);
  expect(tones).toHaveLength(1);
  expect(tones[0]!.hz).toBeCloseTo(261.63, 1);
  expect(tones[0]!.durationFrames).toBe(frameOfMs(CUE_TONE_MS));
  expect(tones[0]!.tag).toBeGreaterThanOrEqual(4_000_000);
  const windowMs = CUE_TONE_MS + CUE_TAIL_MS + 200; // past the tone, its release and the tail
  hearSteady(f, 262.5, windowMs, windowMs + 1300);
  const after = f.sound.posted.filter(isTone);
  expect(after).toHaveLength(2);
  expect(after[1]!.hz).toBeCloseTo(293.66, 1);
});
test("practice.session/REQ-018/S3 — the tone is never the learner", async () => {
  const f = leadFixture({
    ...leadSettings({ cueTone: true, holdBeats: 1 }),
    tempoBpm: 150,
  }); // a 400 ms hold
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  await startLead(f.session);
  await Promise.resolve();
  await Promise.resolve();
  hearSteady(f, 261.63, 20, 20 + CUE_TONE_MS + CUE_TAIL_MS); // the tool's own tone, fed back, in tune
  expect(judged).toEqual([]);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  expect(f.session.snapshot().lead.target?.position).toBe(1);
  expect(f.session.snapshot().lead.reading).toBeNull();
  hearAt(f, 262.5, 20 + CUE_TONE_MS + CUE_TAIL_MS + 200);
  expect(judged).toHaveLength(1);
  expect(judged[0]!.cents).toBe(6); // as detected after the window
});
test("practice.session/REQ-018/S4 — tone off", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 1300);
  letGapPass(f);
  hearSteady(f, 293.66, 1700, 3000);
  letGapPass(f);
  hearSteady(f, 329.63, 3400, 4700);
  expect(f.session.snapshot().lead.target?.position).toBe(4);
  expect(f.sound.posted.filter(isTone)).toEqual([]);
});
test("practice.session/REQ-018/S1 — meter off still judges and advances", async () => {
  const f = leadFixture(leadSettings({ cueMeter: false }));
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 1300);
  expect(f.session.snapshot().lead.target?.position).toBe(2);
  expect(f.session.snapshot().settings.lead.cueMeter).toBe(false);
});
