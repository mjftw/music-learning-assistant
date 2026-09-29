---
type: Implementation Report
title: T033 — implementation report
resource: /.sdd/reports/007-hear-me/T033.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T033.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T21:30:00Z
sdd_id: 007-hear-me
---

TASK: T033
STATUS: DONE
COMMIT: none (not committed — per the controller's instruction; left for the controller to commit)
FILES:
src/ui/TunerStave.tsx (the fix)
tests/ui/scenarios/tuner-stave.test.tsx (new RED test)

## What changed

Introduced one local helper, `headReadingOf(judged: NoteJudged, targetNote:
Note | null): { note: Note; cents: number }` (placed right before
`referenceRawIndexOf`, which is its first caller): pinned →
`{ note: judged.heard.nearest, cents: judged.heard.cents }` (unchanged
behaviour — REQ-005's "with a target, the note nearest the detected pitch");
auto → `{ note: judged.target, cents: judged.cents }` (the same
hysteresis-held note/offset `TunerLevel.tsx` already reads at lines 242-250).

Used it everywhere the file previously read `X.heard.nearest`/`X.heard.cents`
for placement (all eight sites the brief named by line number — verified each
one, in order):
- `referenceRawIndexOf` (line ~127 pre-fix) — the register decision's raw
  index, auto branch.
- `heard`, the live head's placement (line ~378 pre-fix) — via a new
  `headReading` local.
- `heardStale`, the lingering head's placement (lines ~384-391 pre-fix) — via
  a new `effectiveHeadReading` local, which also now drives the accidental
  block and the cents text (both previously read `effectiveReading.heard.*`
  directly).
- `layoutHeard`'s trail fallback (lines ~444-445 pre-fix) and the trail's own
  register fallback (line ~371 pre-fix) — both now go through one new
  `newestTrailHeadReading` local (computed once, reused for both, rather than
  calling `headReadingOf` twice on the same point — avoids the duplication
  AGENTS.md warns about).
- Every trail point's placement (lines ~503-504 pre-fix, the `trailRenderPoints`
  map).
- The accidental block (lines ~803-828 pre-fix) and the cents text
  (line ~856 pre-fix) — both switched from `effectiveReading.heard.*` to
  `effectiveHeadReading.*`.

`headReadingOf`'s second argument is always the current `snapshot.targetNote`
(never a per-point or per-history value), matching the brief's "for a given
`NoteJudged` and the current `targetNote`" — so a target's pinned/auto state
governs every placement uniformly on each render, live or in the trail.

## RED, traced

Test added to `tests/ui/scenarios/tuner-stave.test.tsx`, named
`practice.tuner/REQ-002, practice.tuner/REQ-005 — the stave head agrees with
the level in the hand-over band (converge round 1, W1)`: settles A4 at 440 Hz
(`enterAndHear(440.0)` — the first reading is shown as detected per
REQ-002/S8, so a single feed already settles the smoothing filter's `emaHz`),
then feeds 454 Hz once (+54 ¢ raw from A4, past `SNAP_CENTS` (25 ¢), so the
smoothed pitch snaps straight to 454 with no need to feed it twice; 56 ¢
`HANDOVER_CENTS` is not crossed, so A4 stays the shown/target note, clamped
to +50 — confirmed independently against
`tests/practice/scenarios/tuner-reading.test.ts`'s own REQ-002/S4, which
settles the identical case to `target` A4, `cents` 50).

I reverted `src/ui/TunerStave.tsx` to its pre-fix (`HEAD`) content (via the
`Write` tool, not `git checkout`, keeping a backup of the fixed version) and
ran `pnpm vitest run tests/ui/scenarios/tuner-stave.test.tsx`:

```
 FAIL  tests/ui/scenarios/tuner-stave.test.tsx > practice.tuner/REQ-002, practice.tuner/REQ-005 — the stave head agrees with the level in the hand-over band (converge round 1, W1)
AssertionError: expected 'translateY(114.22px)' to be 'translateY(107.5px)' // Object.is equality

Expected: "translateY(107.5px)"
Received: "translateY(114.22px)"

 ❯ tests/ui/scenarios/tuner-stave.test.tsx:65:60
     63|   f.clock.advanceMs(1);
     64|   await act(async () => {});
     65|   expect(screen.getByTestId("heard-head").style.transform).toBe(
       |                                                            ^
     66|     "translateY(107.5px)",
     67|   ); // A4: i = 33, guide y = 111, −50·0.07 — not A♯4's −(−46)·0.07

 Test Files  1 failed (1)
      Tests  1 failed | 10 passed (11)
```

`114.22` is exactly the old, buggy placement (`111 − (−46)·0.07`, the raw
A♯4/−46¢ reading) — confirms the test fails for the stated reason, and every
other existing REQ-005 scenario still passed unchanged against the pre-fix
code (10/11), as expected since S1–S6 all feed steady tones where the raw and
hysteresis notes already agree. Restored the fixed file and re-ran — green
(see VERIFY).

## Verification

VERIFY (`pnpm vitest run tests/ui/scenarios/tuner-stave.test.tsx`):
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  21:18:59
   Duration  3.12s (tests 65%, transform 16%, environment 10%, import 8%)
```

`pnpm vitest run tests/practice tests/ui`:
```
 Test Files  60 passed (60)
      Tests  284 passed (284)
```

`./scripts/check-scenarios.sh --change changes/007-hear-me | grep -c "❌"` → `0`

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
(prettier/eslint/tsc/cargo fmt/clippy all passed silently before this, per
the command's `&&` chain and exit code 0.)

CONCERNS:
- I did T033 and T038 as one coherent pass in the same file (per the
  controller's explicit instruction to do both, T033 first). T038's own
  changes (`referenceNoteOf` taking `effectiveReading`, the "<note> IS"
  value's `data-state`/colour) are already present in the same commit-ready
  working tree and are reported separately in `.sdd/reports/007-hear-me/
  T038.md`; this file's diff and CHECK output include both.
- T038's fix (extending to this task's own file — see T038's report) exposed
  a pre-existing test in `tests/ui/scenarios/tuner-stave.test.tsx`
  (`practice.tuner/REQ-005 — nothing referenced reads "— IS" over "—"`) that
  had been silently asserting the *old*, buggy premature-clear behaviour;
  I updated it (adding `letLingerPass`) since the ripple was necessary to
  keep the suite honestly green, not to make an unrelated test merely pass —
  full detail in T038's report.
QUESTION: none.

<!-- recorded 2026-09-29T20:41:40Z by scripts/record.sh -->
