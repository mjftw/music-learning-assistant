---
type: Implementation Report
title: C008_T026 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T026.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T026.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T12:30:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T026
STATUS: DONE
COMMIT: ddadb4b
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/lead-hold.test.ts
VERIFY:
lead-hold.test.ts: Test Files 1 passed (1), Tests 9 passed (9)
RED first: cents 7 / "in-tune" instead of 16 / "sharp", as predicted.
pnpm vitest run tests/practice: Tests 208 passed (208)
CHECK:
pnpm check: Test Files 93 passed (93), Tests 461 passed (461); cargo test result: ok. 24 passed; 0 failed; 1 ignored
check-scenarios.sh --change changes/008-learner-leads: scenario coverage complete
pnpm test:lead:
lead run C4–C5     15  70.33  8.02  8.02  93.80  0  18.69  PASS
tone cue fed back  3   59.67  8.02  8.02  83.40  0   8.02  PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
CONCERNS: none
CHOICES MADE: Test named without an S-number (no REQ-016 scenario covers it): "practice.session/REQ-016 — the first reading after silence is as detected"; scenario coverage still complete.
Silence in the test is letGapPass (300 ms) plus 200 ms more, so 500 ms passes between the +6 ¢ run and the +16 ¢ reading.
Fix is one line, leadSmoothing = initialSmoothingState inside the lead gap timer callback, with a comment.
QUESTION: none

<!-- recorded 2026-10-05T11:29:20Z by scripts/record.sh -->
