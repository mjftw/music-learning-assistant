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
  at: 2026-09-28T10:05:00Z
sdd_id: 007-hear-me
---

TASK: T009 (fixer round)
STATUS: DONE
COMMIT: none (fixer round — not committed, per instruction)
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-target.test.ts

## The gap and the fix

Reviewer's critical finding: `setContext` never re-spelled `tunerTargetNote`
when a target was pinned, so the greyed big name shown during silence went
stale after a spelling change while pinned (REQ-002/S5, REQ-009/S1).

Fix, in `setContext` (`src/practice/domain/session.ts`, after
`currentContext = newContext;`, before `recomputeAndRetune()`):

```ts
if (tunerTarget.kind === "pinned") {
  tunerTargetNote = noteAtPosition(
    tunerTarget.position,
    currentContext.spelling,
  );
}
```

I assigned `tunerTargetNote` directly with `noteAtPosition` (the exact line
the brief specifies) rather than calling the existing `pinTargetAt(position)`
helper. `pinTargetAt` also reassigns `tunerTarget` to a fresh object and
calls `invalidateSnapshot()`/`notifyChange()` itself; calling it mid-way
through `setContext` (before `recomputeAndRetune()`/`restartIfPlaying()`
have run) would fire `notifyChange()` with a snapshot computed from stale
derived state (current positions/note still reflecting the old context) —
exactly what "do not re-arm anything" warns against. The direct assignment
touches only the one field, does nothing to `tunerTarget` or the reading,
and lets the single `notifyChange()` at the end of `setContext` pick it up
(`tuner.targetNote` is compared by reference in
`snapshotsMateriallyEqual`, and this produces a fresh object, so the change
is seen).

Also added, per the reviewer's minor point, a one-line comment on
`clearTarget()` (`src/practice/domain/session.ts`): the shown-note
hysteresis (`tunerShownPosition`) needs no reset there, because `judge()`
already keeps it at the nearest note of every pinned detection (confirmed
in `src/practice/domain/tuner.ts`, the pinned branch returns
`shown: pitchPosition(nearest.note)`) — no code change, as instructed.

## RED — before the fix

Added the exact test to `tests/practice/scenarios/tuner-target.test.ts`,
named `practice.tuner/REQ-004 — a spelling change re-spells the pinned
target`. Ran it before the fix:

```
❯ tests/practice/scenarios/tuner-target.test.ts (7 tests | 1 failed) 30ms
   × practice.tuner/REQ-004 — a spelling change re-spells the pinned target 6ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/practice/scenarios/tuner-target.test.ts > practice.tuner/REQ-004 — a spelling change re-spells the pinned target
AssertionError: expected 'A♯4' to be 'B♭4' // Object.is equality

Expected: "B♭4"
Received: "A♯4"

 ❯ tests/practice/scenarios/tuner-target.test.ts:116:61
    114|   expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A♯4"…
    115|   f.session.setContext({ ...f.context, spelling: "flat" });
    116|   expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("B♭4"…
       |                                                             ^
    117|   hear(f, 466.16);
    118|   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("…

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

Failed for exactly the stated reason.

## GREEN

VERIFY: `pnpm vitest run tests/practice/scenarios/tuner-target.test.ts`

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  09:58:54
   Duration  587ms (environment 48%, transform 32%, import 14%, tests 5%, worker 1%)
```

7 passed, as required.

CHECK: `bash -c "source ~/.cargo/env && pnpm check"` (last portion)

```
 Test Files  66 passed (66)
      Tests  268 passed (268)
   Start at  09:59:06
   Duration  8.65s (tests 43%, environment 39%, import 11%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-...)
running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.63s

     Running unittests src/lib.rs (target/debug/deps/sound-...)
running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

prettier, eslint, tsc, vitest, cargo fmt --check, cargo clippy -D warnings
and cargo test all green.

CONCERNS: none

<!-- recorded 2026-09-28T09:06:59Z by scripts/record.sh -->
