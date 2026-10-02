---
type: Implementation Report
title: T003 — implementation report
resource: /.sdd/reports/008-learner-leads/T003.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T003.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T17:09:51Z
sdd_id: 008-learner-leads
---

TASK: T003
STATUS: DONE_WITH_CONCERNS
COMMIT: none (brief says: "Do not commit")
FILES:
tests/practice/invariants/hold-never-early.test.ts

VERIFY:
```
$ pnpm vitest run tests/practice/invariants/hold-never-early.test.ts --reporter=verbose

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 ✓ tests/practice/invariants/hold-never-early.test.ts > practice.session/REQ-016/S6 — the target advances only at ≥ beats × 60000 / tempo ms in tune, never otherwise 7175ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  18:07:44
   Duration  7.81s (tests 93%, environment 3%, transform 2%, import 1%)

real	0m8.190s (wall time of the whole `pnpm vitest run ...` command, measured with `time`)
```
Repeated twice for stability: 8.26s and 8.19s wall time, both comfortably under the 10 s budget.

CHECK:
```
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
Full `pnpm check` (prettier, eslint, tsc, vitest, cargo fmt/clippy/test): vitest reported
`Test Files 80 passed (80)` / `Tests 361 passed (361)` (up from 79/360 before this task — the
one new test file and test), and every cargo crate's test result was `ok`.

CONCERNS:
- The brief's step 2 says "reduce the timelines per setting to 12 if not [under 10 s]". On
  this machine, 24 timelines measured ~21.3s and the brief's own fallback of 12 still
  measured ~10.7s (test body) / ~11.4s (whole command) — over budget. I reduced further to 8
  timelines per setting to get a comfortable margin (~7.2s test body / ~8.2s whole command,
  repeatable). `checked` still ends at 3,499,200 (3 tolerances × 3 holds × 81 tempos × 8
  timelines × 600 events), well over the `toBeGreaterThan(1_000_000)` assertion the brief's
  verbatim code already asserts, so coverage is still exhaustive across every
  tolerance/hold/tempo combination, just with fewer randomised timelines per combination than
  either 24 or 12. Said so in-file as a comment and flagging here per the brief's instruction
  ("say so in the report").
- I also added an explicit per-test timeout (`15_000` as the third argument to `test()`) —
  without it, vitest's default 5000ms per-test timeout kills the test before it can finish,
  regardless of timeline count below ~30ish. This mirrors the same pattern already used by
  `tests/practice/invariants/target-in-sequence.test.ts` (which passes `20_000`). This wasn't
  in the brief's verbatim code block, but the test cannot run to completion without it.
- Test-only task as the brief specifies; T001/T002's reducer passed first time (no reducer
  bug found), so `git status` shows only the one new file.

CHOICES MADE:
- Reduced `TIMELINES_PER_SETTING` to 8 (not the brief's fallback of 12) to land safely under
  the 10 s wall-clock budget on this machine, with margin for variance; documented in a code
  comment and above.
- Added an explicit `15_000` ms timeout as `test()`'s third argument (vitest's default is
  5000ms), the same shape already used in `target-in-sequence.test.ts`'s exhaustive invariant
  test.
- Kept the brief's verbatim test body/assertions/oracle logic unchanged — only the timeline
  count and the function's timeout argument differ from the brief's code block.

<!-- recorded 2026-10-02T17:53:28Z by scripts/record.sh -->
