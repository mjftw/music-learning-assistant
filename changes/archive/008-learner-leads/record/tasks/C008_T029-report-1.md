---
type: Implementation Report
title: C008_T029 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T029.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T029.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T12:50:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T029
STATUS: DONE_WITH_CONCERNS
COMMIT: 87aeafd
FILES:
src/ui/App.tsx
tests/practice/fakes.ts
tests/practice/scenarios/lead-edge-cases.test.ts
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
transport-card-lead.test.tsx + lead-edge-cases.test.ts: Test Files 2 passed (2), Tests 25 passed (25)
pnpm vitest run tests/ui tests/practice: Test Files 76 passed (76), Tests 403 passed (403)
CHECK:
pnpm check exit 0: Test Files 93 passed (93), Tests 464 passed (464); cargo test results ok (24 passed, 1 ignored); doc-tests ok
CONCERNS:
- The session-level pin passed at once (stop() already supersedes a pending lead start); kept as the pin. The UI test was RED first (the second tap was ignored and the run started when the request resolved), GREEN after the one condition.
- Ripple outside the Files list: FakeListening in tests/practice/fakes.ts had no deferred start; added holdStart + resolveStart().
- The UI test does not assert an exact stopCalls: stop() hands the microphone back and the late stream is handed back again (2 calls); it asserts nothing is listening and startCalls stays 1.
- The snapshot does notify the UI on entering "starting" (startLead calls notifyChange() synchronously), so no session change was needed.
CHOICES MADE:
- holdStart flag + resolveStart() on FakeListening, rather than a promise-returning factory.
- Session test flushes with a local setTimeout(0) instead of startLead(), which would start a second run.
QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-05T11:51:01Z by scripts/record.sh -->
