---
type: Implementation Report
title: C008_T016 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T016.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T016.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T07:10:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T016
STATUS: DONE
COMMIT: ca10dca
FILES:
src/ui/Switch.tsx
src/ui/TraversalSheet.tsx
src/ui/theme.ts
src/ui/App.tsx
src/ui/overlay.tsx
tests/ui/scenarios/traversal-sheet-lead.test.tsx
tests/ui/scenarios/traversal-sheet.test.tsx
VERIFY:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  07:04:33
   Duration  2.54s (tests 60%, transform 19%, environment 12%, import 9%)
```
(ran `pnpm vitest run tests/ui/scenarios/traversal-sheet-lead.test.tsx` — all 7 scenarios pass. The `design_snapshot.py … live` half of Verify is the controller's, per the brief, and was not run here.)
CHECK:
```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
... (24 passed, 1 ignored)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
Full vitest summary from the same `pnpm check` run: `Test Files 92 passed (92)`, `Tests 442 passed (442)`. Prettier, eslint, tsc, cargo fmt --check and cargo clippy -- -D warnings all green (no output = pass for the first three; clippy produced no warnings).

CONCERNS:
- The brief's step-1 test code literally calls `screen.getByText("+")` to find the tempo stepper; the app already has a second, pre-existing "+" (the drone pill's octave-up button, unrelated to this task) so that exact line throws a multiple-elements error. I scoped it to `within(screen.getByTestId("transport-card")).getByText("+")` instead — same button, unambiguous. Noting this since it deviates from the brief's verbatim test code (the only such deviation).
- `scripts/check-design.sh` reports 3 pre-existing hard-coded values in `src/ui/global.css`, unrelated to this task's files (untouched by this diff) — not introduced here.

CHOICES MADE:
- `paper.pillInk` did not exist as a token; the same value (`#756c60`) already lived as `TraversalSheet.tsx`'s local `PILL_INACTIVE_INK` constant, so I promoted it to `theme.ts` under `paper.pillInk` as the brief invited, and noted it in a comment there (for the controller to propose into docs/design.md).
- `OverlayCloseButton` (private in `overlay.tsx`) was exactly the 28 px circle / `paper.border` border the brief's `sheetRow.closeSize`/`✕` spec calls for, and `overlay.tsx` is outside the brief's Files list; rather than duplicate it inside `TraversalSheet.tsx`, I exported it with an optional `testId` prop and reused it for `data-testid="sheet-close"` — a necessary ripple into `overlay.tsx`, called out here per AGENTS.md's "Things agents get wrong" note.
- `App.tsx`'s `TraversalSheet` usage (the real ripple site, not the approximate line range the brief cited) is at what is now lines ~1046-1058; added `tempoBpm={snapshot.settings.tempoBpm}` there.
- Row component refactored (step 5) to take `dataRow`, `label`, `hint`, `control` and `trailing` so every row — including the swapped mode rows and the shared rows — is one call, per the brief's REFACTOR step.
- Tapping "I lead"/"play along" pills in the sheet route through `onSettings` (same `session.setSettings` path `handleWho` uses on the card), via a local `setLead` helper that merges into `settings.lead`.
- Switch's `aria-label` uses the row's own label text ("Count-in", "Rest bar", "Loop") rather than a separate copy, keeping one source of truth per row.

QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-04T06:12:19Z by scripts/record.sh -->
