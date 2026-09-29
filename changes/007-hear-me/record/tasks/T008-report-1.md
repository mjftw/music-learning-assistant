---
type: Implementation Report
title: T008 — implementation report
resource: /.sdd/reports/007-hear-me/T008.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T008.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T08:42:00Z
sdd_id: 007-hear-me
---

TASK: T008 (fixer round)
STATUS: DONE
COMMIT: none (controller commits)
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-reading.test.ts

Two edits, as specified:

1. `src/practice/domain/session.ts:58-63` (was `:58-69`) — `TUNER_GAP_MS`
   changed from `301` to `300`; the comment rewritten to state what the
   constant is (the gap after the last detection that clears the reading,
   practice.tuner/REQ-003), with no mention of the fake clock.

2. `tests/practice/scenarios/tuner-reading.test.ts:108-112` — in
   REQ-003/S3, `f.clock.advanceMs(299)` changed to `f.clock.advanceMs(298)`,
   with a one-line comment explaining that `hear()` already spent 1 ms on
   the commit tick, so the clock is at t0+1 before this line, and 298 more
   reaches t0+299 (one short of the 300 ms gap). The following
   `advanceMs(1)` (→ t0+300, cleared) was left unchanged, as instructed.

REQ-003/S1 (`advanceMs(300)` after `hear()`, reaching t0+301) was checked
and left as-is per the brief — it still passes.

Confirmed RED first: with the constant set to 300 and the test's `299`
still in place, `pnpm vitest run tests/practice/scenarios/tuner-reading.test.ts`
failed exactly as predicted — `AssertionError: expected null not to be null`
at the `not.toBeNull()` assertion after `advanceMs(299)` — before making the
test edit.

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/tuner-reading.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  7 passed | 1 todo (8)
   Start at  09:41:08
   Duration  589ms (environment 48%, transform 31%, import 15%, tests 5%, worker 1%)
```

CHECK:
```
$ bash -c "source ~/.cargo/env && pnpm check"

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  64 passed (64)
      Tests  259 passed | 1 todo (260)
   Start at  09:41:44
   Duration  8.47s (tests 44%, environment 38%, import 11%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-...)
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

     Running unittests src/lib.rs (target/debug/deps/sound-...)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```
(eslint, tsc, cargo fmt --check and cargo clippy -D warnings all ran ahead
of the test steps in the same `&&` chain with no output and no non-zero
exit, i.e. all clean — the chain only reaches `vitest run` and `cargo test`
if every earlier step passed.)

CONCERNS: none

<!-- recorded 2026-09-28T08:46:56Z by scripts/record.sh -->
