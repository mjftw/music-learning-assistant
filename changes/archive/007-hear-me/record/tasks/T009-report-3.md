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
  at: 2026-09-28T09:10:29Z
sdd_id: 007-hear-me
---

TASK: T009 (fixer round 2)
STATUS: DONE
COMMIT: none (fixer round — not committed, per instruction)
FILES:
src/practice/domain/session.ts

## The finding and the fix

Reviewer's important finding: `tunerTargetNote` was fully derivable from
`tunerTarget` + `currentContext.spelling` (`judge()` never reads it — it
recomputes `noteAtPosition` itself) but was kept as denormalised mutable
state, manually re-synced at three sites (`pinTargetAt`, `clearTarget`,
`setContext`). Round 1's fix added the third sync site rather than removing
the redundancy that caused the round-1 bug in the first place.

Did exactly the four numbered items, all in `src/practice/domain/session.ts`
only:

1. **Deleted `tunerTargetNote`** — the `let tunerTargetNote: Note | null =
   null;` declaration and every assignment to it, in `pinTargetAt`,
   `clearTarget`, `setContext` (the round-1 sync block removed outright —
   nothing to re-sync any more) and `leaveTuner`. `buildSnapshot()` now
   derives it inline:
   ```ts
   targetNote:
     tunerTarget.kind === "pinned"
       ? noteAtPosition(tunerTarget.position, currentContext.spelling)
       : null,
   ```
   This makes the round-1 bug (a sync site forgotten) structurally
   impossible — there is no longer a second copy to forget.

2. **`snapshotsMateriallyEqual` compares `targetNote` and `target` by value,
   not reference.** `noteAtPosition` returns a fresh object every
   `buildSnapshot()` call, so reference equality on `targetNote` would never
   hold while pinned (a spurious notify on every scheduler poll). Added:
   - `targetEqual(a: TunerTarget, b: TunerTarget)` — kind + position,
     mirrors the existing `transportEqual` switch shape.
   - `sameNote(a: Note, b: Note)` — `letter`/`accidental`/`octave` (the
     `Note` interface's exact fields, read from
     `src/theory/domain/notes.ts`; theory publishes no note-equality
     helper, so this is the small private one the brief allows).
   - `targetNoteEqual(a: Note | null, b: Note | null)` — both null, or both
     non-null and `sameNote`.

   `snapshotsMateriallyEqual` now calls `targetEqual(a.tuner.target,
   b.tuner.target)` and `targetNoteEqual(a.tuner.targetNote,
   b.tuner.targetNote)` instead of `===`. The comment above the tuner block
   was rewritten to say which fields still compare by reference (`active`,
   `listening`, `reading` — only ever reassigned, never mutated in place)
   and which now compare by value and why.

3. **`pinTargetAt`'s comment fixed.** It no longer keeps two fields in
   sync — it only sets `tunerTarget`, bracketed by
   `invalidateSnapshot()`/`notifyChange()`. Kept as a function (not
   inlined): it is still called from three sites (`holdTarget`,
   `pinTarget`, `stepTarget`) and centralises that bracketing; the comment
   now says exactly that.

4. **Round-1's behaviour kept, now for free.** The "a spelling change
   re-spells the pinned target" test (added in round 1) needed no change
   and still passes — `setContext` no longer touches `tunerTargetNote` at
   all; `buildSnapshot()`'s derivation picks up the new
   `currentContext.spelling` on its own.

## Verify

`pnpm vitest run tests/practice` — all pass, count unchanged (113):

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  29 passed (29)
      Tests  113 passed (113)
   Start at  10:10:24
   Duration  3.51s (environment 64%, transform 16%, import 10%, tests 9%)
```

Targeted re-check of the three tuner files touched by this and the prior
round (`tuner-target.test.ts`, `tuner-memory.test.ts`, `tuner-reading.test.ts`,
including the round-1 regression test):

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  3 passed (3)
      Tests  16 passed (16)
   Start at  10:10:20
   Duration  618ms (environment 53%, transform 26%, import 16%, tests 4%, worker 1%)
```

## Check

`bash -c "source ~/.cargo/env && pnpm check"` — exit 0, last portion:

```
 Test Files  66 passed (66)
      Tests  268 passed (268)
   Start at  10:09:30
   Duration  8.60s (tests 43%, environment 39%, import 11%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.02s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-...)
running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.62s

     Running unittests src/lib.rs (target/debug/deps/sound-...)
running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

prettier, eslint, tsc, vitest, cargo fmt --check, cargo clippy -D warnings and
cargo test all green.

CONCERNS:
- No test explicitly exercises the reference-vs-value distinction in
  `snapshotsMateriallyEqual` (e.g. asserting `onChange` fires exactly once
  per genuine tuner change and not on a no-op re-poll while pinned) — the
  existing scenario suite passed unchanged both before and after this
  edit, which is expected since it never asserted on notify-call counts
  either way. If the controller wants that guarded explicitly, it would be
  a new invariant/unit test on `snapshotsMateriallyEqual` itself, which the
  brief's four numbered items didn't ask for, so I left it as is.

<!-- recorded 2026-09-28T09:16:59Z by scripts/record.sh -->
