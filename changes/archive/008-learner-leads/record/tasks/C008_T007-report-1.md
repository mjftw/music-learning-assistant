---
type: Implementation Report
title: C008_T007 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T007.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T007.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T21:35:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T007
STATUS: DONE_WITH_CONCERNS
COMMIT: 80d99d2558e0dc7ff609a0573ce12a3d403356d7
FILES:
tests/practice/scenarios/lead-run.test.ts
tests/practice/invariants/target-in-sequence.test.ts
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  22:30:16
   Duration  5.06s (tests 77%, environment 11%, transform 9%, import 3%)
CHECK:
 Test Files  85 passed (85)
      Tests  387 passed (387)
(cargo, from the same `pnpm check` run)
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.52s
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
CONCERNS:
Step 2 of the brief says "Run ... expect FAIL: completeCaption undefined / listening not stopped on complete." When I added the exact S3/S4 tests from the brief, they passed immediately — `complete`/loop-wrap handling (nextPhaseAfterHold in src/practice/domain/lead.ts, the "complete" branch of onPitchDetected in src/practice/domain/session.ts, leadCompleteCaptionOf) was already implemented, apparently landed as part of an earlier task (T006's commit "feat(practice): the lead reading — age, smoothing, judgement at the tolerance, the hold, the advance, the gap (REQ-016, REQ-017, REQ-021)" already carries the complete/loop plumbing this task's brief describes as new). I verified by reading src/practice/domain/lead.ts and session.ts before writing any test, confirming the Produces behaviour (listening.stop(), listeningOwner reset, completeCaption, target null, start() from complete restarting at position 1, loop wrapping without stopping) was all already present and correct — so no production code change was needed or made here, only the two new RED-then-immediately-GREEN scenario tests and the new invariant enumeration. I did not touch src/practice/domain/session.ts even though the brief's Files list named it as "Modify", because the Produces behaviour it asks for already exists verbatim; this is a case of the task's own GREEN step turning out to require zero diff, not a shortcut.
`changes/008-learner-leads/tasks/C008_T007.md` showed as modified in git status before I started this session (per the initial git status snapshot) — I did not touch it and left it unstaged, since it is outside this task's Files list and outside my mandate to edit `changes/`.
CHOICES MADE:
For the new REQ-015 enumeration in tests/practice/invariants/target-in-sequence.test.ts, built each fixture directly with createSession (mirroring the existing REQ-006/S5 enumeration's own style) rather than via sessionOn/leadFixture, since the enumeration needs to vary key/variant/octaves/direction independently the same way the existing test does; wrapped each in a SessionFixture-shaped object so lead-helpers' holdThrough/hearSteady could drive it.
Scoped the new lead-run invariant to the twelve majors (not majors+minors) × the three directions × 1-oct-fitting and full, per the brief's exact wording ("the twelve majors × the three directions × 1 oct and full"), scale shape only (the brief does not mention arpeggio for this enumeration, unlike the existing play-along one).
Asserted the event count as `sequence.length + 2` (the first target emitted synchronously by start(), plus one per held target through holdThrough(length + 1)) rather than `length + 1` as literally read in the brief's prose ("hold through length + 1 targets ... assert for every event ..."): the brief's assertion text only specifies the per-event membership/position checks, not a total count, so I added the total-count assertion as the natural strengthening and derived its value empirically from the fixture's own behaviour (confirmed by running the test) rather than guessing.
Used `20_000` ms timeout on the new invariant test, matching the existing enumeration's own precedent in the same file, as the brief directs.
Did not add `holdThrough` to lead-helpers.ts since it already existed there.
QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-02T21:34:49Z by scripts/record.sh -->
