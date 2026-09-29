---
type: Implementation Report
title: T010 — implementation report
resource: /.sdd/reports/007-hear-me/T010.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T010.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T09:20:00Z
sdd_id: 007-hear-me
---

TASK: T010
STATUS: DONE_WITH_CONCERNS
COMMIT: none (brief said "Do not commit")
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-budget.test.ts

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/tuner-budget.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  10:19:23
   Duration  558ms (environment 50%, transform 31%, import 15%, tests 3%, worker 1%)
```

RED (first run, before the GREEN change — pasted verbatim):
```
 ❯ tests/practice/scenarios/tuner-budget.test.ts (3 tests | 2 failed) 19ms
   × practice.tuner/REQ-006/S2 — late is dropped 12ms
   × practice.tuner/REQ-006 — readingShown reports the age at paint 3ms

 FAIL  tests/practice/scenarios/tuner-budget.test.ts > practice.tuner/REQ-006/S2 — late is dropped
AssertionError: expected [ { …(5) } ] to deeply equal []
 ❯ tests/practice/scenarios/tuner-budget.test.ts:33:18
     33|   expect(judged).toEqual([]);

 FAIL  tests/practice/scenarios/tuner-budget.test.ts > practice.tuner/REQ-006 — readingShown reports the age at paint
TypeError: f.session.readingShown is not a function
 ❯ tests/practice/scenarios/tuner-budget.test.ts:60:20

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```
(The coalescing test — REQ-004/S3 — already passed on RED, as the brief said it would since T008's pipeline already coalesces; the late-drop test failed on the exact assertion the brief named, `expected [] to have length 0` / here `toEqual([])`; readingShown failed because it did not exist yet.)

CHECK (last ~40 lines of `bash -c "source ~/.cargo/env && pnpm check"`):
```
Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  67 passed (67)
      Tests  271 passed (271)
   Start at  10:19:35
   Duration  8.71s (tests 43%, environment 39%, import 10%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.63s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

CONCERNS:
The brief's "things it cannot know" note said to define the same three helpers (`enter`, `hear`, `flush`) at the top of the new file, mirroring tuner-reading.test.ts. I did that first, but none of the three verbatim test bodies in the Steps section actually calls `hear(f, hz)` — every scenario inlines `f.listening.feed(...)` + `f.clock.advanceMs(1)` itself (needed so `late is dropped` can pass an explicit `atFrame`, and `readingShown` can set `f.listening.frame` between feed and check). With `hear` defined but unused, `eslint`'s `no-unused-vars` failed `pnpm check`; the same happened with the `SessionFixture` type import once `hear` was gone. I dropped both rather than keep dead code just to match the mirrored shape, since AGENTS.md/engineering.md forbid dead code and the check must be green. `enter` and `flush` are defined and used, matching the pattern for what the steps actually need. Flagging this in case the controller wants `hear` kept for a reason I'm not seeing (e.g. a later task in this file reusing it) — as written, no later step in this brief calls it.

<!-- recorded 2026-09-28T09:23:47Z by scripts/record.sh -->
