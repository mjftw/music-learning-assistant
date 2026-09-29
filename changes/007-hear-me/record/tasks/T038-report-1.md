---
type: Implementation Report
title: T038 — implementation report
resource: /.sdd/reports/007-hear-me/T038.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T038.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T21:35:00Z
sdd_id: 007-hear-me
---

TASK: T038
STATUS: DONE
COMMIT: none (not committed — per the controller's instruction; left for the controller to commit)
FILES:
src/ui/TunerStave.tsx (the fix — built on top of T033's fix in the same file)
tests/ui/scenarios/tuner-linger.test.tsx (extended REQ-003/S4, S6 — no new tests, per the brief)
tests/ui/scenarios/tuner-stave.test.tsx (a necessary ripple — see CONCERNS)

## What changed (`src/ui/TunerStave.tsx`)

Applied on top of T033's `headReadingOf` helper (already in the same file;
this task didn't touch it).

1. `referenceNoteOf`'s call site: `referenceNoteOf(reading, targetNote)` →
   `referenceNoteOf(effectiveReading, targetNote)` — `effectiveReading`
   (`reading ?? stale?.reading ?? null`) was already computed at what the
   brief called "line ~349" for the head's own placement; the caption now
   reads the same live-or-lingering reading, so it lingers whenever the head
   does instead of clearing to "— IS" the instant `reading` goes null.
   Added a doc-comment on `referenceNoteOf` itself explaining why.
2. The "<note> IS" value (`data-testid="reference-hz"`, ~line 990): given the
   same `data-state`/`aria-hidden` spread the "HEARD" value
   (`data-testid="heard-hz"`) already carries, driven by the existing
   `headStaleAttrs` (`staleAttrs(reading === null ? stale : undefined)`) — no
   new state, reused exactly what "HEARD" already reads. Its colour changed
   from the fixed `paper.inkMid` to a new `referenceInk` local:
   `headStaleAttrs !== undefined ? paper.faint : paper.inkMid`.

No new production abstraction beyond that one local (`referenceInk`) — no
helper extraction needed here since T033's `headReadingOf` already covers the
"which reading" question and this task only needed the existing
`headStaleAttrs` flag, already computed once per render.

## RED, traced (two parts, since the brief's fix has two independent halves)

Both were confirmed by temporarily reverting just that one piece (via the
`Edit` tool, not `git checkout`) and restoring immediately after.

**Part 1 — `referenceNoteOf`'s argument.** Reverted the call site back to
`referenceNoteOf(reading, targetNote)` and ran
`pnpm vitest run tests/ui/scenarios/tuner-linger.test.tsx`:
```
 FAIL  tests/ui/scenarios/tuner-linger.test.tsx > practice.tuner/REQ-003/S4 — the last reading lingers, then goes
AssertionError: expected '—' to be '440.0 Hz' // Object.is equality

Expected: "440.0 Hz"
Received: "—"

 ❯ tests/ui/scenarios/tuner-linger.test.tsx:64:58
     62|     "fading",
     63|   );
     64|   expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 H…
       |                                                          ^

 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```
(S4, auto mode, failed exactly as the brief's I6 description says — clears to
"—" the instant the session's reading clears. S6 — pinned — didn't fail here,
because its `reading?.target ?? targetNote` fallback already resolves to the
pinned target regardless of `reading` vs. `effectiveReading`; S6's own
regression is caught by part 2.)

**Part 2 — the value's `data-state`/colour.** Restored part 1, then
temporarily reverted the `reference-hz` div back to its old, unconditional
`color: paper.inkMid` with no `data-state` spread, and ran the same file:
```
 FAIL  tests/ui/scenarios/tuner-linger.test.tsx > practice.tuner/REQ-003/S4 — the last reading lingers, then goes
AssertionError: expected null to be 'fading' // Object.is equality
 FAIL  tests/ui/scenarios/tuner-linger.test.tsx > practice.tuner/REQ-003/S6 — lingering with a target
AssertionError: expected null to be 'fading' // Object.is equality

 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```
Both S4 and S6 failed, confirming the styling half is needed independently of
part 1. Restored the fix; both parts together make the whole file green (see
VERIFY).

## Step 2 (REQ-003/S2, unaffected) — checked, not re-tested

`headStaleAttrs` is `staleAttrs(reading === null ? stale : undefined)`; when
a target is pinned and nothing has ever been heard, `stale` is never set (the
screen's linger only starts on a live→null transition), so
`headStaleAttrs` stays `undefined` and `referenceInk` resolves to
`paper.inkMid` — full strength, unchanged from before this task. No new test
added for this (already covered by
`tests/practice/scenarios/tuner-reading.test.ts`'s REQ-003/S2, which the
brief's step 2 itself points to as unaffected); I verified the reasoning by
reading the code rather than by adding a redundant UI-level test.

## Verification

VERIFY (`pnpm vitest run tests/ui/scenarios/tuner-linger.test.tsx`):
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  21:22:41
   Duration  2.34s (tests 57%, transform 20%, environment 12%, import 10%)
```

`pnpm vitest run tests/practice tests/ui`:
```
 Test Files  60 passed (60)
      Tests  284 passed (284)
```

`./scripts/check-scenarios.sh --change changes/007-hear-me` shows
`practice.tuner/REQ-003/S4 tested` and `practice.tuner/REQ-003/S6 tested`
(both ✅; grep -c "❌" → `0`).

`./scripts/check-contexts.sh` → `✅ context boundaries respected`

CHECK (`bash -c "source ~/.cargo/env && pnpm check"`, exit code 0):
```
 Test Files  77 passed (77)
      Tests  345 passed (345)
   Start at  21:25:19
   Duration  13.60s (tests 53%, environment 31%, import 9%, transform 7%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.49s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

CONCERNS:
- This fix exposed a pre-existing test in `tests/ui/scenarios/
  tuner-stave.test.tsx` — `practice.tuner/REQ-005 — nothing referenced reads
  "— IS" over "—"` — that cleared the session's reading
  (`f.clock.advanceMs(300)`) without ever advancing the screen's own linger
  timer, then asserted "— IS"/"—" at once. That was, in effect, asserting
  the exact I6 bug (the caption clearing before the linger the rest of the
  strip already honours). Once T038 made the caption linger too, that
  assertion became false: the caption now correctly shows "A4 IS 440.0 Hz"
  (greyed) during the linger, only reaching "— IS"/"—" once
  `letLingerPass` has run. I updated the test to call `letGapPass` +
  `letLingerPass` (the same helpers every other linger-aware test in this
  file already uses) before asserting "nothing is referenced" — this is a
  file the brief's Files list doesn't name, but per AGENTS.md ("a brief's
  Files list can omit a file the change necessarily ripples into ... list
  and touch it anyway, and say so") I judged this a necessary ripple, not a
  loosened assertion: the old expectation encoded the bug this task exists
  to fix, and the new one asserts the corrected behaviour at the correct
  moment in time.
- `TunerStave.tsx`'s diff in this report is the same file T033 already
  modified; the two tasks' changes are separable in the diff (T033: the
  `headReadingOf` helper and every `.heard.nearest`/`.heard.cents` site it
  replaces; T038: `referenceNoteOf`'s argument, the `reference-hz` block's
  `data-state`/colour, and the `referenceInk` local) and are called out by
  line/name above rather than re-diffed together.
QUESTION: none.

<!-- recorded 2026-09-29T20:41:40Z by scripts/record.sh -->
