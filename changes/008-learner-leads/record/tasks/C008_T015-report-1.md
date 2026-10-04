---
type: Implementation Report
title: C008_T015 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T015.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T015.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T01:21:00Z
sdd_id: 008-learner-leads
---

> Written to disk by the controller from the implementer's hand-back, verbatim;
> the implementer returned the report as its message and did not leave the file.

TASK: C008_T015
STATUS: DONE
COMMIT: f0d4231
FILES:
src/ui/NamesView.tsx
src/ui/App.tsx
tests/ui/scenarios/names-view.test.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:20:38
   Duration  1.67s (tests 47%, transform 26%, environment 16%, import 11%)
(the `design_snapshot.py live` half is explicitly the controller's per the brief — not run here)
CHECK:
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s
(vitest suite above that: 91 test files, 435 tests, all passed; prettier/eslint/tsc/cargo fmt/clippy all clean)
CONCERNS:
- The names view shows one octave's worth of de-duplicated columns regardless of how many the run actually traverses (octaves, shape); a raw sequence `runIndex` therefore cannot be reused as-is for NamesView the way it is for StaveView (1:1 with every rendered notehead). I added an exported `targetColumnIndexOf(key, scale, direction, pitchClass)` in NamesView.tsx (pure, reuses the existing `columnsOf`/`samePitchClass`) and had App.tsx resolve the session's lead-target note to a pitch class, then to this view's own column index, rather than passing through the exact same `leadTarget` object already computed for the stave. This departs from the context note's literal "reuse those... rather than computing them again," but I believe it's required for correctness beyond the single-octave example the tests cover; flagging in case the controller/reviewer wants to confirm this reading of the brief's "matching by the run note's pitch class" line.
- The two-column dimming (opacity 0.4) is applied only to the `column-name` div's inline style (not the mark/degree rows), matching exactly what the given test asserts (`within(c).getByTestId("column-name").style.opacity`); I did not also dim the whole button, to avoid double-dimming via CSS inheritance plus an explicit inline opacity. Visually only the big letter dims, not the small mark/degree glyphs — a reasonable reading of "the prototype's `op`" but not verified pixel-for-pixel against the prototype HTML (never copied into the app per policy).
CHOICES MADE:
- `leadTarget.runIndex` on NamesView is defined as the index into this view's own rendered `columns` array (not the session's raw sequence `runIndex`), since both given test scenarios directly index `columns[n]` and the view has no notion of octaves/traversal shape. Documented in a code comment at the prop declaration.
- Exported `targetColumnIndexOf` from NamesView.tsx (rather than duplicating the column/pitch-class matching logic in App.tsx) to satisfy "don't duplicate a private helper" guidance — it reuses the existing private `columnsOf`/`samePitchClass`.
- The target column's background/ink reuse the existing `SOUNDING_BACKGROUND`/`SOUNDING_INK` constants via a new `highlighted = column.isSounding || isLeadTarget` flag, per the brief's "the existing isSounding path."
- Verified manually in a real Chromium browser (Playwright, throwaway script in the scratchpad, deleted after use) against `pnpm dev`: seeded localStorage with the v6 schema (C major, flute Concert, names view, `who: "me"`), started a lead run with a stubbed microphone (silent-oscillator fallback when `getUserMedia` is unavailable in headless Chromium), and screenshotted the panel. The pale green band is visible behind the target column's letter, with the other columns visibly dimmer — confirming DOM paint order (band before content, line after) renders correctly outside jsdom.
QUESTION: none

<!-- recorded 2026-10-04T05:58:47Z by scripts/record.sh -->
