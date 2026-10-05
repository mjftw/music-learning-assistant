import { expect, test } from "vitest";
import type {
  NoteJudged,
  TargetAdvanced,
} from "../../../src/practice/published";
import {
  hearAt,
  hearSteady,
  holdThrough,
  HOP_MS,
  leadFixture,
  leadSettings,
  letGapPass,
  startLead,
} from "../lead-helpers";

async function running(settings = leadSettings()) {
  const f = leadFixture(settings);
  const judged: NoteJudged[] = [],
    advanced: TargetAdvanced[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.session.onTargetAdvanced((e) => advanced.push(e));
  await startLead(f.session);
  return { f, judged, advanced };
}
test("practice.session/REQ-016/S1 — held, then the next", async () => {
  const { f, judged, advanced } = await running();
  hearSteady(f, 262.5, 0, 1400);
  const onC = judged.filter((j) => j.target.letter === "C");
  expect(onC.length).toBeGreaterThan(0);
  expect(onC.every((j) => j.verdict === "in-tune" && j.cents === 6)).toBe(true);
  expect(advanced).toHaveLength(2);
  expect(advanced[1]).toMatchObject({
    note: { letter: "D", octave: 4 },
    position: 2,
    length: 15,
  });
  const advanceMs = (advanced[1]!.atFrame / 48000) * 1000;
  expect(advanceMs).toBeGreaterThanOrEqual(1250);
  expect(advanceMs).toBeLessThan(1250 + HOP_MS);
  expect(f.session.snapshot().lead.target?.position).toBe(2);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});
test("practice.session/REQ-016/S2 — out of tune", async () => {
  const { f, judged, advanced } = await running();
  hearSteady(f, 258.92, 0, 3000);
  expect(judged.every((j) => j.verdict === "flat" && j.cents === -18)).toBe(
    true,
  );
  expect(advanced).toHaveLength(1);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  hearAt(f, 264.47, 3100);
  expect(judged.at(-1)).toMatchObject({ cents: 19, verdict: "sharp" });
});
test("practice.session/REQ-016/S3 — leaving the band resets", async () => {
  const { f, judged, advanced } = await running();
  const t0 = holdThrough(f, 2); // C4, D4 held → the target is E4
  expect(f.session.snapshot().lead.target?.note).toMatchObject({
    letter: "E",
    octave: 4,
  });
  hearSteady(f, 330.6, t0, t0 + 900); // +5 ¢
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 1250, 2);
  const lastSharp = hearSteady(f, 332.9, t0 + 910, t0 + 1010); // +17 ¢ for 100 ms: smoothed, the offset leaves ±10 after the sixth reading
  const firstSharpIndex = judged.findIndex(
    (j) => j.target.letter === "E" && j.verdict === "sharp",
  );
  expect(firstSharpIndex).toBeGreaterThan(0);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
  hearSteady(f, 330.6, lastSharp + HOP_MS, t0 + 4000);
  const firstInTuneAfter = judged.find(
    (j, i) => i > firstSharpIndex && j.verdict === "in-tune",
  )!;
  expect(advanced).toHaveLength(4); // C4@1, D4@2, E4@3, F4@4
  const expectedMs = (firstInTuneAfter.atFrame / 48000) * 1000 + 1250;
  const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
  expect(advanceMs).toBeGreaterThanOrEqual(expectedMs);
  expect(advanceMs).toBeLessThan(expectedMs + HOP_MS);
});
test("practice.session/REQ-016/S4 — silence pauses", async () => {
  const { f, judged, advanced } = await running();
  const t0 = holdThrough(f, 2); // the target is E4
  hearSteady(f, 330.6, t0, t0 + 900);
  const before = judged.length;
  letGapPass(f);
  f.clock.advanceMs(1700);
  expect(judged).toHaveLength(before);
  expect(f.session.snapshot().lead.reading).toBeNull();
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 1250, 2);
  const heldMs = f.session.snapshot().lead.heldFraction * 1250; // ≈896: 84 hops of 10.667 ms, the first reading counting nothing
  hearSteady(f, 330.6, t0 + 2900, t0 + 3400);
  const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
  const expectedMs = t0 + 2900 + (1250 - heldMs); // the first reading back counts nothing (REQ-016); the rest from there
  expect(advanceMs).toBeGreaterThanOrEqual(expectedMs);
  expect(advanceMs).toBeLessThan(expectedMs + HOP_MS);
});
test("practice.session/REQ-016/S5 — the tolerance decides the verdict (session)", async () => {
  for (const [tolerance, expected] of [
    ["lenient", "in-tune"],
    ["medium", "sharp"],
    ["accurate", "sharp"],
  ] as const) {
    const { f, judged } = await running(leadSettings({ tolerance }));
    const t0 = holdThrough(f, 2); // the target is E4
    hearAt(f, 331.92, t0); // +12 ¢
    expect(judged.at(-1)).toMatchObject({
      target: { letter: "E" },
      cents: 12,
      verdict: expected,
    });
  }
});
test("practice.session/REQ-016/S7 — the tempo changes the requirement, not the progress", async () => {
  const { f, advanced } = await running();
  const t0 = holdThrough(f, 2); // the target is E4
  hearSteady(f, 330.6, t0, t0 + 900);
  f.session.setSettings({ ...leadSettings(), tempoBpm: 120 });
  hearSteady(f, 330.6, t0 + 910, t0 + 1200);
  const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
  expect(advanceMs).toBeGreaterThanOrEqual(t0 + 1000);
  expect(advanceMs).toBeLessThan(t0 + 1000 + HOP_MS);
  const g = await running();
  const u0 = holdThrough(g.f, 2);
  hearSteady(g.f, 330.6, u0, u0 + 900);
  g.f.session.setSettings({ ...leadSettings(), tempoBpm: 60 });
  expect(g.f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 2000, 2);
});
test("practice.session/REQ-016/S8 — far away, an octave included", async () => {
  const { f, judged, advanced } = await running();
  hearSteady(f, 523.25, 0, 2000);
  expect(judged[0]).toMatchObject({
    target: { letter: "C", octave: 4 },
    cents: 1200,
    verdict: "sharp",
  });
  expect(advanced).toHaveLength(1);
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});
test("practice.session/REQ-016/S9 — a new target starts clean", async () => {
  const { f, judged } = await running();
  hearSteady(f, 262.5, 0, 1300);
  expect(f.session.snapshot().lead.target?.position).toBe(2);
  const firstOnD = judged.find((j) => j.target.letter === "D")!;
  expect(firstOnD.cents).toBe(-194); // as detected, not smoothed from C4's +6
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});
test("practice.session/REQ-016 — the first reading after silence is as detected", async () => {
  const { f, judged } = await running();
  hearSteady(f, 262.5, 0, 500); // +6 ¢, in tune: the hold accumulates
  expect(f.session.snapshot().lead.heldFraction).toBeGreaterThan(0);
  letGapPass(f);
  f.clock.advanceMs(200); // 500 ms with nothing detected
  hearAt(f, 264.06, 1000); // +16 ¢
  expect(judged.at(-1)).toMatchObject({ cents: 16, verdict: "sharp" });
  expect(f.session.snapshot().lead.heldFraction).toBe(0);
});
