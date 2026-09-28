---
type: Implementation Report
title: T009 — implementation report
resource: /.sdd/reports/007-hear-me/T009.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T009.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T08:51:21Z
sdd_id: 007-hear-me
---

TASK: T009
STATUS: DONE
COMMIT: none (brief's own instructions say "Do not commit")
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-target.test.ts (new)
tests/practice/scenarios/tuner-memory.test.ts (new)
tests/practice/scenarios/tuner-reading.test.ts (un-todoed REQ-003/S2)

RED (first failure seen, before any production code):
```
FAIL  tests/practice/scenarios/tuner-target.test.ts > practice.tuner/REQ-004/S1 — Hold
TypeError: f.session.holdTarget is not a function
 ❯ tests/practice/scenarios/tuner-target.test.ts:30:13

FAIL  tests/practice/scenarios/tuner-target.test.ts > practice.tuner/REQ-004/S2 — a wedge of the spiral
TypeError: f.session.pinTarget is not a function
...
 Test Files  3 failed (3)
      Tests  8 failed | 7 passed (15)
```
(the 7 "passed" were tuner-reading.test.ts's pre-existing scenarios that don't touch the new verbs; the 8 failures were every scenario in tuner-target.test.ts, tuner-memory.test.ts and the newly un-todoed REQ-003/S2, each failing with "... is not a function" exactly as the brief predicted.)

GREEN — implementation: added `holdTarget()`, `pinTarget(position)`, `stepTarget(delta)`, `clearTarget()` to the `Session` interface and to `createSession()`'s returned object in `src/practice/domain/session.ts`. All four funnel through a shared private `pinTargetAt(position)` (holdTarget/pinTarget/stepTarget) or inline (clearTarget) that reassigns `tunerTarget` and re-spells `tunerTargetNote` via `noteAtPosition(position, currentContext.spelling)` — both fields reassigned wholesale (never mutated in place), so the existing `snapshotsMateriallyEqual` reference-equality comparison (already comparing `tuner.target`/`tuner.targetNote`, added in T007) needed no change. `pinTarget` clamps to `[TUNER_LOWEST_POSITION, TUNER_HIGHEST_POSITION]` (40..96); `stepTarget` no-ops via `tunerTarget.kind !== "pinned" || !canStepTarget(tunerTarget, delta)` (the `kind` check lets TS narrow `tunerTarget.position`, redundant with `canStepTarget`'s own guard but needed for the type checker); `holdTarget` no-ops when `tunerReading === null`, else pins `pitchPosition(tunerReading.heard.nearest)`.

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/tuner-target.test.ts tests/practice/scenarios/tuner-memory.test.ts tests/practice/scenarios/tuner-reading.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  3 passed (3)
      Tests  15 passed (15)
   Start at  09:50:07
   Duration  595ms (environment 54%, transform 26%, import 15%, tests 4%, worker 1%)
```
(6 in tuner-target.test.ts + 1 in tuner-memory.test.ts + 8 in tuner-reading.test.ts, no todo — matches the brief's expectation exactly.)

`pnpm vitest run tests/practice` (the task's Verify line):
```
 Test Files  29 passed (29)
      Tests  112 passed (112)
   Start at  09:50:12
   Duration  3.51s (environment 63%, transform 17%, import 11%, tests 9%, worker 1%)
```

CHECK (last ~10 lines of `bash -c "source ~/.cargo/env && pnpm check"`, full run: prettier, eslint, tsc, vitest 267/267, cargo fmt/clippy, cargo test both crates all green):
```
   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(the vitest summary earlier in the same run: `Test Files  66 passed (66)` / `Tests  267 passed (267)`; the two Rust crates: `test result: ok. 10 passed; 0 failed; 1 ignored` (listening) and `test result: ok. 24 passed; 0 failed; 1 ignored` (sound) — the ignored tests in both are pre-existing `--release`-only cost benchmarks, unrelated to this task.)

CONCERNS:
- The brief gave exact test code for tuner-target.test.ts and tuner-memory.test.ts, but not for the un-todoed REQ-003/S2 in tuner-reading.test.ts — only "turn test.todo into the brief's real test" with no code shown. I wrote it myself, modelled on the file's own REQ-003/S1 ("silence on auto") sibling and the spec's Given/When/Then ("the target A4 is pinned... nothing is detected... the big name reads A4 greyed... 'Play a note' beneath it"): pin A4, hear a pitch, let the 300 ms gap elapse, then assert `reading` is null (the domain analogue of "Play a note") while `targetNote` still reads "A4" (the analogue of "the big name stays, greyed"). This exercises `pinTarget()` for RED purposes and is a genuine regression check that the gap timer (already correct since T008) only clears `tunerReading`/`tunerShownPosition`, never the target. Flagging in case a different assertion was intended.
- `noteAtPosition` (theory) returns a fresh object literal on every call, not a memoized/interned one — I kept `tunerTargetNote` as session-level mutable state (reassigned only by the four verbs and `leaveTuner()`), same shape as the pre-existing `tunerTarget`, rather than deriving it live in `buildSnapshot()` from `tunerTarget`/`currentContext.spelling`. Deriving it live would have been simpler code but would break the existing `snapshotsMateriallyEqual`'s reference-equality check on `tuner.targetNote` (a fresh object every snapshot build, even with nothing changed), causing `notifyChange()` to fire spuriously on every scheduler poll while a target is pinned. Noting the tradeoff since the brief's snapshot semantics line reads like a live derivation.

<!-- recorded 2026-09-28T08:57:27Z by scripts/record.sh -->
