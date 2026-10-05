---
type: Implementation Report
title: C008_T024 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T024.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T024.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-04T13:40:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T024
STATUS: DONE
COMMIT: see git log (fix(ui): ■ on the live lead card stops the run (REQ-015))
FILES:
src/ui/App.tsx
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
RED: stopCalls expected 1, received 0. GREEN: transport-card-lead.test.tsx all passed; pnpm vitest run tests/ui: 29 files, 190 tests passed.
CHECK:
pnpm check exit 0: Test Files 93 passed, Tests 455 passed; cargo test results ok (13, 24 passed).
CONCERNS: none
CHOICES MADE: handleTogglePlay stops when transport is not idle or lead.phase === "listening" (the card shows ■ for the whole listening phase, mic request included, so no separate listening.kind check).

<!-- recorded 2026-10-04T12:36:44Z by scripts/record.sh -->
