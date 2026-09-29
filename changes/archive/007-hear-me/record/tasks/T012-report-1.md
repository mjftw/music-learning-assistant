---
type: Implementation Report
title: T012 — implementation report
resource: /.sdd/reports/007-hear-me/T012.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T012.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T09:38:32Z
sdd_id: 007-hear-me
---

TASK: T012 (fixer round)
STATUS: DONE
COMMIT: none (fixer round — not committed per instructions)
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-hidden-awake.test.ts

## The fix

Concern 3 was real: `visibility.onHidden`'s tuner branch (session.ts,
originally lines 742–754) reset `tunerListeningState` to `off` whenever
`tunerActive` was true, regardless of what state it was actually in —
including from `cannot-hear`. A `show()` afterwards then found the state
`off` and called `startListening()` again, which asks the platform for the
microphone a second time. `practice.tuner/REQ-007` promises the microphone
is asked for "nowhere but on entering the tuner" and that a later attempt
happens only "at the next entry to the tuner" — a hide/show pair while
`cannot-hear` is not an entry, so it must not re-request.

**session.ts (lines 730–762, the `visibility.onHidden` subscription).**
Narrowed the guard from `if (tunerActive)` to `if (tunerActive && (state is
"listening" or "starting"))`. When the state is `cannot-hear` (or already
`off`), the block is skipped entirely — no `listening.stop()`, no
generation bump, no reading clear, no state change — leaving `onShown`'s own
guard (`tunerListeningState.kind !== "off"` → no-op, unchanged, confirmed at
line 870) the only path back to `startListening()`, and it never opens
because the state stays `cannot-hear`. The `stop()`/`stopDrone()` calls at
the top of the handler (playback/drone) are untouched, as instructed. The
`tunerGeneration += 1` bump stays inside the narrowed branch — kept
deliberately, with the comment now saying why: it supersedes an in-flight
`enterTuner()`/`startListening()` still awaiting the microphone, so that
continuation cannot resurrect the "listening"/"cannot-hear" state this hide
just cleared once its promise resolves (the same reasoning `leaveTuner()`'s
own bump already uses).

**tests/practice/scenarios/tuner-hidden-awake.test.ts.** Added the exact
test given in the fixer brief, named
`practice.tuner/REQ-008 — a hide while the microphone cannot be used does
not ask for it again on show`.

## RED (before the fix)

```
 ❯ tests/practice/scenarios/tuner-hidden-awake.test.ts (6 tests | 1 failed) 34ms
   × practice.tuner/REQ-008 — a hide while the microphone cannot be used does not ask for it again on show 9ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/practice/scenarios/tuner-hidden-awake.test.ts > practice.tuner/REQ-008 — a hide while the microphone cannot be used does not ask for it again on show
AssertionError: expected 2 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 2

 ❯ tests/practice/scenarios/tuner-hidden-awake.test.ts:90:34
     88|   await flush();
     89|   await flush();
     90|   expect(f.listening.startCalls).toBe(1);
       |                                  ^
     91|   expect(f.session.snapshot().tuner.listening).toEqual({
     92|     kind: "cannot-hear",

 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```

The other five tests (S1, REQ-005/S1, REQ-005/S2, S2, "shown while not on
the tuner") were already passing and stayed passing — the fix only narrows
one condition inside the hidden handler.

## GREEN (after the fix)

```
$ pnpm vitest run tests/practice/scenarios/tuner-hidden-awake.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  10:37:57
   Duration  609ms (environment 48%, transform 31%, import 15%, tests 5%, worker 1%)
```

## Verify

`pnpm vitest run tests/practice/scenarios/tuner-hidden-awake.test.ts` → 6 passed (matches the brief's earlier 5 plus the new fixer test).

VERIFY:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  10:37:57
   Duration  609ms (environment 48%, transform 31%, import 15%, tests 5%, worker 1%)
```

## Check

`bash -c "source ~/.cargo/env && pnpm check"` → green.

CHECK:
```
     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

(Vitest summary earlier in the same run: `Test Files 69 passed (69)`, `Tests 280 passed (280)`; Prettier, ESLint, tsc, cargo fmt/clippy all passed silently before it — no output means no violations.)

CONCERNS: none — this fixer round resolved the one outstanding concern from the original T012 report (the REQ-007/REQ-008 conflict); no new issues surfaced while making the fix. `pnpm check`'s full 280-test vitest suite and both Rust crates' `cargo test` are green, so no other scenario (in particular the existing REQ-007 `tuner-cannot-hear.test.ts` suite, and this file's other five tests) regressed.

QUESTION: none

<!-- recorded 2026-09-28T09:43:20Z by scripts/record.sh -->
