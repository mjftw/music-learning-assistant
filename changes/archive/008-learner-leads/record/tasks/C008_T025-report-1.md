---
type: Implementation Report
title: C008_T025 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T025.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T025.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T12:30:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T025
STATUS: DONE
COMMIT: d6a151c
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/lead-mode.test.ts
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
RED first: 4 failed (phase stayed complete / cannot-hear; card still "15 of 15 held" / no-mic card). After the fix:
 Test Files  2 passed (2)
      Tests  26 passed (26)
Then `pnpm vitest run tests/practice tests/ui`: Test Files 76 passed (76), Tests 399 passed (399).
CHECK:
`pnpm check` exit 0: vitest Test Files 93 passed (93), Tests 460 passed (460); cargo `test result: ok. 24 passed; 0 failed; 1 ignored` for sound, doc-tests ok.
CONCERNS: none
CHOICES MADE:
- Extracted `clearLeadCard()` (phase idle, listening off) in session.ts; `restartLeadIfRunning()`'s complete branch now calls it, as does `setSettings` when `who` changed and the phase is not idle. The complete branch of restartLeadIfRunning now also sets leadListeningState off (it was already off in complete; no behaviour change).
- TransportCard.tsx not touched: the domain fix made every test pass.
- Added one extra test, `practice.session/REQ-019 — a settings change that leaves who alone keeps the complete card` (holdBeats 4), as the brief asked; it passed before the fix by design (guards the unchanged-who case).

<!-- recorded 2026-10-05T11:24:20Z by scripts/record.sh -->
