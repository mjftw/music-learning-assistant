---
type: Implementation Report
title: C008_T010 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T010.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T010.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-03T09:19:26Z
sdd_id: 008-learner-leads
---

TASK: T010
STATUS: DONE
COMMIT: 375ed44
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/lead-changes.test.ts
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:18:02
   Duration  715ms (environment 41%, transform 38%, import 15%, tests 6%, worker 1%)
CHECK:
All matched files use Prettier code style!
 Test Files  88 passed (88)
      Tests  404 passed (404)
running 25 tests (sound crate) ... test result: ok. 24 passed; 0 failed; 1 ignored
running 13 tests (listening crate) ... test result: ok. 13 passed; 0 failed; 1 ignored
Doc-tests listening/sound: ok. 0 passed; 0 failed
CONCERNS: none
CHOICES MADE:
- Folded `clearCompleteLeadCard()` into a new `restartLeadIfRunning()` placed inside `restartIfPlaying()`, before the `transport.kind !== "playing"` guard, exactly as T007's review left as the cleaner shape — this removes the extra `invalidateSnapshot()`/second call `setContext`/`setTraversal`/`setScaleChoice` previously needed after `restartIfPlaying()`, since `restartLeadIfRunning()` runs (and, for the listening branch, invalidates the snapshot and emits `TargetAdvanced`) before any stale-snapshot caching could occur. `clearCompleteLeadCard()` itself is deleted; its single remaining behaviour (complete → idle) lives in the new function's first branch.
- Left `restartIfPlaying()`'s play-along (`transport.kind === "playing"`) restart logic completely untouched, as instructed — only added the one new call (`restartLeadIfRunning()`) ahead of its existing guard.
- `holdThrough` in `tests/practice/lead-helpers.ts` already returned the time at which the last hold completed plus the gap (used as S2/S3's `t0`); no change was needed there, confirmed by running the file and reading its existing return statement.
- Named the new function `restartLeadIfRunning()` (mirrors `restartIfPlaying()`'s naming) rather than reusing `clearCompleteLeadCard`'s name, since it now does strictly more than clearing a complete card.

<!-- recorded 2026-10-03T09:21:53Z by scripts/record.sh -->
