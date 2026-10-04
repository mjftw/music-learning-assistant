---
type: Implementation Report
title: C008_T014 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T014.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T014.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T00:07:59Z
sdd_id: 008-learner-leads
---

TASK: C008_T014
STATUS: DONE
COMMIT: 0e110132896ea7fa595af17e0d8dbb9aab4e836d
FILES:
src/ui/App.tsx
src/ui/StaveView.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  28 passed (28)
      Tests  173 passed (173)
   Start at  01:06:24
   Duration  9.38s (tests 62%, environment 19%, transform 10%, import 10%)
CHECK:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  91 passed (91)
      Tests  433 passed (433)
   Start at  01:07:25
   Duration  18.78s (tests 58%, environment 28%, import 8%, transform 5%)

[... cargo build/test for listening and sound crates ...]
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.30s
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s
Doc-tests listening: test result: ok. 0 passed; 0 failed
Doc-tests sound: test result: ok. 0 passed; 0 failed
(prettier, eslint, tsc all clean before the test run; full `pnpm check` exited 0)

COUNTER EVIDENCE (temporary, removed before commit):
Reproduction (before the fix, `src/ui/App.tsx` unfixed, module-level
`__staveViewRenderCount` in `StaveView.tsx`, a throwaway test rendering the
app via `lead-app-helpers.tsx`, starting a lead run and feeding 20 readings
with `hearInApp` on the same target without completing the hold):
  stave render count before: 6 after: 26   (test FAILED — expected 6, got 26)
After the fix (`selectedKey` memoized in `App.tsx`):
  stave render count before: 4 after: 4    (test PASSED)
The counter, its temporary export, and the throwaway test file were removed
before the commit above; `git diff` on the commit shows only the real fix
and the corrected comment.

CONCERNS: none
CHOICES MADE:
- Memoized the whole `selectedKey` derivation (including the `position`
  lookup) in one `useMemo` keyed on `selection.positionIndex`,
  `selection.mode` and `selection.spelling` — the primitive fields it reads
  — rather than memoizing `circleOfFifths()`'s output separately; `position`
  was only ever used to compute `selectedKey`, so folding it in keeps the
  diff smallest and avoids a second memo whose only consumer is the first.
- Did not touch `theory/domain/circle.ts` — `circleOfFifths()` rebuilding
  its tree on every call is a pre-existing, out-of-scope property of that
  context; the fix lives entirely on the consuming side in `App.tsx`, as
  the finding and the brief's scope note required.
- Verified every other `StaveView` prop (`notes`, `variant`, `playing`,
  `soundingRunIndex`, `tapsEnabled`, `onTapNote`, `onTargetBox`,
  `staveNamesEnabled`) is already reference-/value-stable across a reading
  by reading their derivations (`snapshot.run` is the session's own
  un-reassigned `run` variable; `findVariantById` returns the catalogue's
  own object; `handleTapNote`/`onTargetBox` are `useCallback`/`useState`
  setters keyed only on `session`; the rest are primitives) — only `key_`
  needed a fix, confirmed with the same counter before removing it.
- Could not express the repro as a permanent test through a legitimate
  observable: React's `<Profiler>` can't be inserted from outside `App`
  without touching production markup shaped for the test, which the brief
  said was probably not the way; used a temporary module-level counter and
  a throwaway test file instead, captured the before/after counts above,
  then deleted both, leaving only the production fix and corrected comment.
- Corrected the `StaveView` comment (previously claiming "every other prop
  … is already stable" while omitting `key_`) to state what is actually
  true: every prop including `key_` is now kept stable, and say where each
  is made so.

<!-- recorded 2026-10-04T00:10:27Z by scripts/record.sh -->
