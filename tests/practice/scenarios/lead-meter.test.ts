import { expect, test } from "vitest";
import {
  hearAt,
  hearSteady,
  leadFixture,
  letGapPass,
  startLead,
} from "../lead-helpers";

test("practice.session/REQ-017/S7 — silence clears the line, keeps the fill", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 900);
  expect(f.session.snapshot().lead.reading).not.toBeNull();
  letGapPass(f);
  expect(f.session.snapshot().lead.reading).toBeNull();
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(0.72, 2);
  hearAt(f, 262.5, 1500);
  expect(f.session.snapshot().lead.reading).toMatchObject({
    cents: 6,
    verdict: "in-tune",
  });
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(0.72, 2);
});
test("practice.session/REQ-017/S1 — silent: no reading, the target highlighted", async () => {
  const f = leadFixture();
  await startLead(f.session);
  expect(f.session.snapshot().lead.reading).toBeNull();
  expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
  expect(f.session.snapshot().soundingPosition).toBeNull();
});
test("practice.session/REQ-017/S4 — 'held ✓' until the first reading on the new target", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 1240);
  hearAt(f, 262.5, 1260); // completes the hold → D4
  expect(f.session.snapshot().lead.target?.position).toBe(2);
  expect(f.session.snapshot().lead.justHeld).toMatchObject({
    letter: "C",
    octave: 4,
  });
  hearAt(f, 293.66, 1300);
  expect(f.session.snapshot().lead.justHeld).toBeNull();
});
test("practice.session/REQ-017/S4 — 'held ✓' goes after 0.4 s of silence", async () => {
  const f = leadFixture();
  await startLead(f.session);
  hearSteady(f, 262.5, 0, 1240);
  hearAt(f, 262.5, 1260);
  letGapPass(f);
  expect(f.session.snapshot().lead.justHeld).not.toBeNull();
  f.clock.advanceMs(100);
  expect(f.session.snapshot().lead.justHeld).toBeNull();
});
