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
  at: 2026-09-28T11:41:14Z
sdd_id: 007-hear-me
---

TASK: T016
STATUS: DONE
COMMIT: a5673c8635d2e0615a771da1d3ec71e5e3cd9240
FILES:
src/ui/TunerStave.tsx (new)
src/ui/TunerScreen.tsx (modified — mounts TunerStave, keeps the trail ring)
src/ui/key-label.ts (modified — extracted, exported `diatonicIndex`)
src/ui/StaveView.tsx (modified — imports `diatonicIndex` instead of its own private copy)
src/ui/App.tsx (modified — see CONCERNS/ripple note)
tests/ui/scenarios/tuner-stave.test.tsx (new)
tests/ui/scenarios/tuner-helpers.ts (new — `enterAndHear` moved out of tuner-screen.test.tsx)
tests/ui/scenarios/tuner-screen.test.tsx (modified — imports the moved helper)

RED (step 2, before any implementation):
Ran `pnpm vitest run tests/ui/scenarios/tuner-stave.test.tsx` against the test file alone (no TunerStave.tsx, TunerScreen still had its T016 placeholder `<div/>`). All 5 tests failed; the first for the stated reason:
`TestingLibraryElementError: Unable to find an element by: [data-testid="heard-head"]`
(S2 failed the same way on `heard-accidental`; S3 on the text `8vb`; S4 on `heard-head`; the trail test on `trail` — all "element not found", confirming TunerStave simply didn't exist yet, not a typo in the test.)

GREEN — implementation notes:
- `TunerStave` reproduces `changes/007-hear-me/design/Tuner.dc.html`'s `st4` block arithmetic (lines 1222-1279) as named constants: `y(i) = 126 − (i − 30)·5`, the wrap bounds (`bottom+19`=49, `bottom-7`=23) for 8va/15ma/8vb/15mb, the ledger loops, `hy = guideY − cents·0.07` (cents defensively clamped to ±50), the centring/top-align `shift` pass, and the trail's x-spacing (52→140, oldest first).
- The heard head positions from `reading.heard.nearest` / `reading.heard.cents` (the note's own offset from itself — always ≤ ±50), not `reading.cents` (which is target-relative and can exceed ±50 when pinned, per S4: target A4 pinned, heard C5 at ~0¢, head still drawn at C5's own position with negligible drift). The ghost target head is a plain `cy`-positioned ellipse (no drift) from `tuner.targetNote`.
- The trail is built from the `trail: readonly NoteJudged[]` prop TunerScreen hands in, placing each entry with the same `placeHeard` helper used for the live head.

REFACTOR (step 5): `StaveView.tsx` already had an equivalent, private `diatonicIndex(note)` (`note.octave * 7 + LETTERS.indexOf(note.letter)`) — the same formula the brief's geometry names. Extracted it into `src/ui/key-label.ts` (already the shared home StaveView imports `noteLabel`/`pitchClassLabel` from) as an exported `diatonicIndex`, removed StaveView's private copy and its now-unused `LETTERS`/`NoteLetter` import, and had both StaveView.tsx and TunerStave.tsx import the shared one. Ran `tests/ui/scenarios/stave-view.test.tsx` and `stave-tap.test.tsx` (11 tests) before and after — unchanged, both green — confirming the extraction is behaviour-preserving. StaveView's own `y(i)` (a closure over a per-run `topY`, scaled by `PANEL_GAP/2`) is a genuinely different function from TunerStave's fixed-baseline `y(i)`, so it was not shared, per the brief's own caveat.

VERIFY (`pnpm vitest run tests/ui/scenarios/tuner-stave.test.tsx`):
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  12:37:37
   Duration  1.77s (tests 57%, transform 18%, environment 15%, import 10%)
```

`pnpm vitest run tests/ui` (regression check for the extraction and the shared helper move):
```
 Test Files  23 passed (23)
      Tests  105 passed (105)
```

CHECK (`bash -c "source ~/.cargo/env && pnpm check"`, last ~15 lines):
```
   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(vitest summary earlier in the same run: `Test Files 71 passed (71)` / `Tests 291 passed (291)`; exit code 0.)

Screenshot: started `pnpm dev -- --port 5174` (via `source ~/.cargo/env`; `dev:phone` was already holding :5173 and was left alone), ran a throwaway Node-Playwright script (the same route T014/T015 used — `python3 scripts/design_snapshot.py` has no Python Playwright installed here) against it with a fake mic, saved `.sdd/design/007-hear-me/live/tuner--silent.png`. Viewed it: the card shows the 5 stave lines, the bar, the treble clef, and the right column reading "HEARD" / "—" and a small "— IS" / "—" — matching 4a's silent-state structure. Deleted the script and stopped the :5174 server afterward (:5173 confirmed still running). `.sdd/` is gitignored, so nothing there was staged.

CONCERNS:
- App.tsx ripple, not in the brief's Files list: `TunerScreen`/`TunerStave` render correctly, but S2 (flat spelling) failed through the full `<App>` stack — `currentContext.spelling` inside `session.ts` never picked up the "flat" click because App.tsx's `setContext` effect depended on `[session, keyIdOf(selectedKey), variant?.variantId]`, not `selection.spelling`; for the default key (C major, spelling-invariant) that effect never re-fires on a spelling-only toggle. `git log -L` traces this to commit `2f8c6d9` (a prior task of *this same* 007-hear-me change), which added `spelling: selection.spelling` to the `setContext` payload but not to the dependency array — `tuner-reading.test.ts`'s REQ-002/S5 passes only because it drives `session.setContext` directly, bypassing the UI. I added `selection.spelling` to the dependency array (a one-line fix, matching the existing pattern for primitive deps) and re-ran the full suite (71 files / 291 tests) plus `pnpm check` clean. Flagging this because it's a fix to a file outside my Files list, made necessary by a bug in earlier work in this same change, per AGENTS.md's "a brief's Files list can omit a file the change necessarily ripples into."
- `formatCents` (the "+12"/"−16"/"0", U+2212-minus formatter) is duplicated as a small local function in TunerStave.tsx rather than imported from TunerLevel.tsx, since TunerLevel.tsx is outside this task's Files list and the function is four lines with no side effects. Same reasoning for a small local `ACCIDENTAL_GLYPH` record (StaveView.tsx keeps its own too, un-shared) — the Produces/Consumes interface explicitly limits TunerStave's imports to `noteLabel, pitchPosition, pitchHzOf` from theory/published, and `pitchClassLabel`/accidental-glyph helpers aren't in that list.
- `pitchPosition` was listed in the brief's Consumes but turned out unneeded by my implementation (accidental/position arithmetic goes through the shared `diatonicIndex` and `pitchHzOf` instead) — left unimported rather than importing something unused.
- The 8va/15ma/8vb/15mb wrap thresholds: the brief's prose says "above index 49 ... below 24", but the design's own `place()`/wrap-loop (Tuner.dc.html lines 1233-1235) uses `bottom+19` (49, matches) and `bottom-7` (23, not 24) as the actual loop bound; I verified against the brief's own worked examples (E2 → E3/8vb at i=23, C2 → C4/15mb at i=28) that 23 is the value that reproduces both, and used 23 (named `WRAP_LOW_INDEX`, derived from `BOTTOM_LINE_INDEX - 7` with a comment). With 24 as the loop bound, E2 over-shifts to i=30 instead of the required i=23. Noting the discrepancy from the brief's prose in case "24" was intentional and I'm missing something.
- The RED test file and the S4 `act()` call needed two small mechanical adaptations from the brief's verbatim Steps code, both because of established project conventions the brief's own text flagged as things it couldn't know: (1) `toHaveTextContent("…")`/`toBeInTheDocument()` → `.textContent).toBe("…")`/`.toBeTruthy()` (this repo has no `@testing-library/jest-dom` registered — confirmed by grep, and by TunerLevel's own tests using the `.textContent`/`.toBeTruthy()` style); (2) `await act(async () => { f.session.pinTarget(69); })` → `act(() => { ... })` (no `await` inside the callback trips `@typescript-eslint/require-await`, and the rest of the test suite already uses sync `act(() => {...})` for callbacks with no await). Neither changes what's asserted, only how it's phrased for tools that exist in this repo.
- `enterAndHear` gained an internal `cleanup()` call before rendering (not in the brief's given signature/behaviour list) because the brief's own S3 test calls it twice in one test with no `cleanup()` in between — without it, the second `render()` stacks a second `<App>` beside the first and `waitFor(() => screen.getByTestId(...))` never resolves to a single element.

QUESTION: none — proceeded via the "Things the brief cannot know" section and AGENTS.md's ripple guidance rather than stopping; flagged the judgement calls above for review.

<!-- recorded 2026-09-28T11:52:58Z by scripts/record.sh -->
