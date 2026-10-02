---
type: Implementation Report
title: T002 — implementation report
resource: /.sdd/reports/008-learner-leads/T002.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T002.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T16:55:52Z
sdd_id: 008-learner-leads
---

TASK: T002
STATUS: DONE
COMMIT: none (dispatch instructions said not to commit)
FILES:
src/practice/domain/lead.ts
src/practice/published/index.ts
tests/practice/scenarios/lead-reducer.test.ts
VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/lead-reducer.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  17:55:21
   Duration  636ms (environment 45%, transform 36%, import 17%, tests 2%, worker 1%)
```
CHECK:
```
$ pnpm check
...
 Test Files  79 passed (79)
      Tests  360 passed (360)
   Start at  17:55:00
   Duration  12.42s (tests 53%, environment 31%, import 9%, transform 7%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.35s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
prettier, eslint, tsc, vitest, cargo fmt/clippy/test all green, full `pnpm check` exit 0.

CONCERNS:
- The brief's step 2 expected RED failure message "applyJudgement is not a function"; the actual RED failed one step earlier at module-eval time with "targetAt is not a function" (the module-level `judged(6, "in-tune")` calls `targetAt` before any test body runs `applyJudgement`). Same root cause (the new exports didn't exist yet); I judged this close enough to the stated reason to proceed rather than escalate, but flagging it since the brief's exact wording didn't match.
- The brief's RED test imports `SequenceNote` from `../../../src/practice/published`, but `practice/published/index.ts` did not re-export it before this task (it's theory's type, used elsewhere in practice only structurally via `SessionSnapshot.sequence`, never named). I added `export type { SequenceNote } from "../../theory/published";` to `practice/published/index.ts` to make the brief's test compile — a ripple the Files list already covered (`published/index.ts` was listed to modify) but worth calling out since it's a new type re-export, not just new value exports.

CHOICES MADE:
- Extracted the "advance or wrap or complete" branch into a private (non-exported) `nextPhaseAfterHold(position, sequence, loop)` helper per Step 5's refactor instruction, so `applyJudgement` reads as: not-listening passthrough, the hold computation, then the threshold check.
- Grouped the new lead-run constants/types/functions in `lead.ts` after the existing settings/hints code (append, as the brief's Files entry says), with a short banner comment extending the file's existing header rather than duplicating per-symbol REQ citations throughout.
- Alphabetized the new `published/index.ts` exports consistently with the file's existing style (each export block already alpha-sorted).
- `targetAt`'s RangeError message includes the offending position and the valid range, matching the file's existing error-message style elsewhere in the codebase (informative, not generic).

QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-02T17:04:19Z by scripts/record.sh -->
