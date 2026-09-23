// scripts/check-scenarios.sh only scans $TESTDIR (tests/) and, since T019,
// src/*/src for Rust unit tests — it does not scan scripts/. REQ-008/S1 and
// REQ-006/S4 are measured, not scenario-tested, and are proven exclusively
// by `pnpm test:timing` (scripts/timing-test.mjs, Playwright/Chromium,
// ~70 s — not part of `pnpm check`, mandatory at every converge and finish
// per AGENTS.md). This one-line citation here is what lets the checker
// attribute them: it does not re-measure anything.
// practice.session/REQ-008/S1, practice.session/REQ-006/S4

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

test("scripts/timing-test.mjs exists and its header cites REQ-008/S1 and REQ-006/S4", () => {
  const scriptPath = resolve(__dirname, "../../../scripts/timing-test.mjs");
  const header = readFileSync(scriptPath, "utf8").slice(0, 500);

  expect(header).toContain("REQ-008/S1");
  expect(header).toContain("REQ-006/S4");
});
