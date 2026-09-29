---
type: Implementation Report
title: T011 — implementation report
resource: /.sdd/reports/007-hear-me/T011.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T011.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T09:25:10Z
sdd_id: 007-hear-me
---

TASK: T011
STATUS: DONE
COMMIT: none (brief says "Do not commit")
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-cannot-hear.test.ts

VERIFY:
RED (before the fix — only S3 fails, for the stated reason: no `onEnded`
subscription exists yet, so the state stays `listening` after
`f.listening.end()`; S1/S2 already pass because T007 already wired
`enterTuner`'s failed-`start()` path):

```
 ❯ tests/practice/scenarios/tuner-cannot-hear.test.ts (3 tests | 1 failed) 33ms
   × practice.tuner/REQ-007/S3 — failed while listening 11ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/practice/scenarios/tuner-cannot-hear.test.ts > practice.tuner/REQ-007/S3 — failed while listening
AssertionError: expected { kind: 'listening' } to deeply equal { kind: 'cannot-hear', …(1) }

- Expected
+ Received

  {
-   "kind": "cannot-hear",
-   "reason": "failed",
+   "kind": "listening",
  }

 ❯ tests/practice/scenarios/tuner-cannot-hear.test.ts:55:48

 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```

GREEN (`pnpm vitest run tests/practice/scenarios/tuner-cannot-hear.test.ts`):

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  10:24:42
   Duration  551ms (environment 50%, transform 32%, import 14%, tests 4%, worker 1%)
```

CHECK:
`bash -c "source ~/.cargo/env && pnpm check"` — last ~10 lines (vitest
summary + cargo test result):

```
 Test Files  68 passed (68)
      Tests  274 passed (274)
   Start at  10:24:54
   Duration  8.69s (tests 42%, environment 40%, import 11%, transform 7%)

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(listening crate's own `cargo test` block, run just before sound's, also
green: `test result: ok. 10 passed; 0 failed; 1 ignored`.)

CONCERNS:
- `S1`'s failed-`start()` path (`enterTuner` → `cannot-hear`) was already
  wired by T007 before this task; only S3 (the `onEnded` subscription)
  required new production code. Flagging this since the brief's step 2
  ("expect FAIL: `listening` reads `{ kind: "listening" }` or the state is
  unchanged after `end()`") only fully matched for S3 — S1/S2 were already
  green at RED time. This matches the brief's own "Things the brief cannot
  know" note ("already wired at T007"), so treated as expected, not a gap.
- The `onEnded` handler ignores the event entirely when `!tunerActive`
  (matching the brief's "When not active: ignore"), including the case
  where `FakeListening.end()` is called after `leaveTuner()`. Not exercised
  by a test in this task (S3 only calls `end()` while active); relying on
  the brief's explicit instruction rather than adding an unrequested test.

CHECK COMMAND OUTPUT (full picture, all green): prettier — pass; eslint —
pass; tsc --noEmit — pass; vitest — 68 files / 274 tests passed; cargo fmt
--check — pass; cargo clippy -D warnings — pass; cargo test (listening: 10
passed/1 ignored; sound: 24 passed/1 ignored) — pass.

<!-- recorded 2026-09-28T09:28:43Z by scripts/record.sh -->
