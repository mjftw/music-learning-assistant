---
type: Implementation Report
title: T016 — implementation report
resource: /.sdd/reports/007-hear-me/T016.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T016.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T11:59:56Z
sdd_id: 007-hear-me
---

TASK: T016 (fixer round)
STATUS: DONE
COMMIT: none (not committed, per the fixer brief)
FILES:
src/ui/TunerStave.tsx (Finding 1, 2, 3)
src/ui/cents-label.ts (new — Finding 2, `formatCents`'s one home)
src/ui/key-label.ts (Finding 2 — `ACCIDENTAL_GLYPH` moved here beside `diatonicIndex`)
src/ui/StaveView.tsx (Finding 2 — imports `ACCIDENTAL_GLYPH`; `NAME_INK` → `paper.inkMid`)
src/ui/TunerLevel.tsx (Finding 2 — imports `formatCents`)
src/ui/Header.tsx (Finding 2 — `TUNER_PILL_INK` → `paper.inkMid`)
src/ui/theme.ts (Finding 2 — `paper.inkMid = "#4a4136"` added)
tests/ui/scenarios/tuner-stave.test.tsx (RED test for Finding 1)

## Finding 1 — the two-tier register/wrap rule (important)

`src/ui/TunerStave.tsx`:
- Lines 40-65: replaced the single `WRAP_HIGH_INDEX`/`WRAP_LOW_INDEX` pair
  (used by both placements) with four named constants and a comment
  tracing the design's two decisions (`changes/007-hear-me/design/
  Tuner.dc.html` lines 1222-1241): `REGISTER_HIGH_LIMIT = 49`,
  `REGISTER_LOW_LIMIT = 24` (the design's `hiLim`/`loLim`, deciding the
  shared `adj`) alongside the pre-existing `WRAP_HIGH_INDEX = 49`,
  `WRAP_LOW_INDEX = 23` (the design's `bottom+19`/`bottom-7`, the heard
  note's own correction-loop bounds).
- Lines 74-127 (`registerAdjOf`, `octaveMarkOf`, `targetWrittenPositionOf`,
  `heardWrittenPositionOf`, `referenceRawIndexOf`) replace the old single
  `writtenPositionOf`: `registerAdjOf` decides one ±7 shift from whichever
  raw index governs the reading (`referenceRawIndexOf`: the pinned target
  when there is one, else the heard note — the design's `ref`) using
  `REGISTER_HIGH_LIMIT`/`REGISTER_LOW_LIMIT`; `targetWrittenPositionOf`
  applies that `adj` once, never re-wrapped (the design's `place(tgt, 182)`
  called without `own`); `heardWrittenPositionOf` applies the same `adj` as
  a baseline, then runs its own correction loop bounded by
  `WRAP_HIGH_INDEX`/`WRAP_LOW_INDEX` (the design's `place(r.m, 150, true)`);
  `octaveMarkOf` is the design's `octLab` (±7 → 8va/8vb, ±14 → 15ma/15mb),
  applied to `adj` alone for the target and to `adj + ownShift` for the
  heard note.
- Lines 236-259 (`placeHeard`)/261-269 (`placeTarget`): both now take
  `adj: number` and call the new position functions.
- Lines 296-303, 355-372: the component computes `referenceRawIndex`/`adj`
  once per render and threads it into `placeHeard`/`placeTarget`; the trail
  loop (355-372) now passes the *current* reading's `adj` to every
  historical point rather than a fresh per-point decision, matching the
  design's own `p.tot` applied uniformly across `hist` (Tuner.dc.html lines
  1257-1264) — noted in the code comment since the brief's Do doesn't
  mention the trail explicitly and trail geometry isn't gated by the plan's
  test strategy.

RED (added to `tests/ui/scenarios/tuner-stave.test.tsx`, run before any
production-code change, against the pre-fix `TunerStave.tsx`):
```
 FAIL  tests/ui/scenarios/tuner-stave.test.tsx > practice.tuner/REQ-005 — E3 is written an octave up under 8vb
TestingLibraryElementError: Unable to find an element with the text: 8vb. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.
 ❯ Object.getElementError node_modules/.pnpm/@testing-library+dom@10.4.2/node_modules/@testing-library/dom/dist/config.js:37:19
 ❯ tests/ui/scenarios/tuner-stave.test.tsx:49:17
     47| test("practice.tuner/REQ-005 — E3 is written an octave up under 8vb", …
     48|   await enterAndHear(164.81);
     49|   expect(screen.getByText("8vb")).toBeTruthy();
       |                 ^

 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```
(The pre-fix code's single `WRAP_LOW_INDEX = 23` threshold left raw index
23 — E3 — unshifted, mark `""`; the E2/C2 scenarios in S3 already crossed
23 by enough that the old single-threshold code happened to match the
design there, which is why S3 was already green.)

GREEN: with the fix, `enterAndHear(164.81)` (E3, raw index 23) now finds
`8vb` and `heard-head` at `translateY(126px)` (E4, i = 30, cents 0) — see
VERIFY below.

## Finding 2 — three duplicated helpers (important)

- `src/ui/cents-label.ts` (new): `formatCents` moved here verbatim, its one
  home now. `TunerLevel.tsx` (import added, its private copy removed) and
  `TunerStave.tsx` (same) both import it.
- `src/ui/key-label.ts`: `ACCIDENTAL_GLYPH` moved here beside
  `diatonicIndex`, exported, with the `natural: "♮"` entry `StaveView.tsx`
  needs kept (`TunerStave.tsx` never indexes `"natural"` — both its
  heard/target accidental blocks are guarded by `accidental !== "natural"`,
  so the shared value is safe for both callers). `StaveView.tsx` imports it
  and its private copy is removed; `TunerStave.tsx` does the same.
- `src/ui/theme.ts`: `paper.inkMid = "#4a4136"` added to the `paper` token
  object. `TunerStave.tsx` (`color: paper.inkMid` at the reference-Hz
  value), `StaveView.tsx` (`const NAME_INK = paper.inkMid;`) and
  `Header.tsx` (`const TUNER_PILL_INK = paper.inkMid;`) now use the token
  instead of the literal. `grep "#4a4136" src/` still finds it in
  `CircleOfFifths.tsx`, `TraversalRow.tsx`, `TraversalSheet.tsx`,
  `ScaleRow.tsx`, `DroneSheet.tsx`, `KeyPanel.tsx` — left untouched; those
  are outside this task.

## Finding 3 — the silent-state tone (minor)

`src/ui/TunerStave.tsx` line 312: `tone` now falls back to `paper.faint`
(neutral) instead of `tuner.inTune` (green) when `reading === null` — this
is the colour used for the "—" HEARD Hz text (and the trail gradient's
stroke colour, moot with no trail) while nothing is heard, matching the
design's silent default.

## Verification

`pnpm vitest run tests/ui`:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  23 passed (23)
      Tests  106 passed (106)
   Start at  12:59:19
   Duration  6.26s (tests 49%, environment 24%, transform 14%, import 13%)
```

`bash -c "source ~/.cargo/env && pnpm check"` (last ~20 lines):
```
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 11 tests
test detector::tests::cost_of_one_analysis ... ignored
test detector::tests::req_003_s1_silence ... ok
test detector::tests::req_002_s4_the_high_end ... ok
...
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.66s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(vitest summary earlier in the same run: `Test Files  71 passed (71)` /
`Tests  292 passed (292)`; exit code 0; prettier/eslint/tsc/cargo
fmt/clippy all passed silently before this.)

CONCERNS:
- `REGISTER_HIGH_LIMIT` and `WRAP_HIGH_INDEX` are numerically identical
  (both 49, `BOTTOM_LINE_INDEX + 19`) — kept as two separate named
  constants rather than one shared one, since they represent two
  semantically distinct decisions in the design (the register decision vs.
  the heard note's own correction loop) that only happen to coincide at
  the top; only the low bound actually differs (24 vs. 23). Flagging in
  case a single shared high-bound constant was preferred for terseness.
- The trail's use of the *current* reading's `adj` for every historical
  point (rather than a fresh register decision per point) is a judgement
  call reproducing the design's own `p.tot`-applied-uniformly approach
  (Tuner.dc.html lines 1257-1264); it isn't gated by any test (the plan's
  test strategy explicitly excludes "the exact trail geometry beyond '50
  points, oldest first'"), so this is unverified beyond code-reading and
  the existing trail-length test still passing.

QUESTION: none.

<!-- recorded 2026-09-28T12:06:09Z by scripts/record.sh -->
