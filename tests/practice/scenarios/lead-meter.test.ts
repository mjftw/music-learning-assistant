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
