// listening.pitch-detection/REQ-002/S5, listening.pitch-detection/REQ-003/S1, listening.pitch-detection/REQ-003/S2, listening.pitch-detection/REQ-004/S1, listening.pitch-detection/REQ-004/S2, practice.tuner/REQ-006/S1 — measured by scripts/tuner-timing-test.mjs (pnpm test:tuner), not re-measured here
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("scripts/tuner-timing-test.mjs exists and its header cites the measured scenarios", () => {
  const header = readFileSync(
    resolve(__dirname, "../../../scripts/tuner-timing-test.mjs"),
    "utf8",
  ).slice(0, 900);
  for (const id of [
    "REQ-002/S5",
    "REQ-003/S1",
    "REQ-003/S2",
    "REQ-004/S1",
    "REQ-004/S2",
    "practice.tuner/REQ-006/S1",
  ])
    expect(header).toContain(id);
});
