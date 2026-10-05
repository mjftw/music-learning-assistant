---
type: Implementation Report
title: C008_T028 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T028.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T028.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T12:10:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T028
STATUS: DONE_WITH_CONCERNS
COMMIT: 201c95e
FILES:
scripts/lead-timing-test.mjs
AGENTS.md
VERIFY:
Three real runs of `pnpm test:lead`, all PASS (tails):

run 1
lead run C4–C5     15  70.33  5.35  5.35  94.21  10.67  0  16.02  PASS
tone cue fed back  3   67.67  8.02  8.02  83.40  10.67  0  8.02   PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone

run 2
lead run C4–C5     15  70.33  5.35  8.02  94.21  10.67  0  16.02  PASS
tone cue fed back  3   65.00  8.02  8.02  83.40  10.67  0  13.35  PASS
test:lead: PASS — (same line)

run 3
lead run C4–C5     15  70.33  5.35  8.02  94.21  10.67  0  16.02  PASS
tone cue fed back  3   67.67  5.35  5.35  82.92  10.67  0  13.35  PASS
test:lead: PASS — (same line)

Mutation proof (throwaway copy in the scratchpad, not committed; drops the readings
of one 200 ms stretch of target 6's sounding span before the gap is measured):
lead run C4–C5     15  70.33  8.02  8.02  93.80  202.67  0  18.69  FAIL
tone cue fed back  3   59.67  8.02  8.02  83.40  10.67   0  8.02   PASS
test:lead: FAIL — lead run C4–C5: max gap 202.67 ms > 50 at target 6 (A4), between atFrame 621695 and 631423

CHECK:
pnpm check exit 0: Test Files 93 passed (93), Tests 462 passed (462); cargo test ok (24 passed; 0 failed; 1 ignored), doc-tests 0.
CONCERNS:
- The mutation drops the stretch only from the list the gap is measured over, not from the list readings/s uses; readings/s there was still 93.80, i.e. the average-rate gate alone would not have caught it either way.
- Healthy gaps are 10.67 ms (one hop) in both cases, so 50 ms has wide margin; no product gap over 50 ms was seen in any of the four real/mutant runs besides the injected one.
- A tone with fewer than two readings in its span has no interval to measure; it is reported as null and fails the gate (it could not have held a note anyway).
CHOICES MADE:
- Sounding span per tone = that target's window readings (after the previous advance, up to and including this advance's frame) with atFrame >= the tone's onsetFrame; so the silence before the onset, the cue's mute window and the post-advance gap are never measured.
- Gap measured on committed NoteJudged events as the brief says; a coalesced-away completing reading shows as a 2-hop gap (≈21 ms), still within bound.
- The FAIL message names the widest target, its label and the two atFrames; the table column `max gap (ms)` follows `readings/s min`, per case = the worst over its targets.
- No test pins the PASS line or header, so none changed. AGENTS.md block updated (paragraph, table rows from a real run, PASS line); `grep -c "test:lead: PASS" AGENTS.md` = 1.

<!-- recorded 2026-10-05T11:44:42Z by scripts/record.sh -->
