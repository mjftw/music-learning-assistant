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
  at: 2026-10-04T00:45:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T014
STATUS: DONE
COMMIT: 674d6a4
FILES:
src/ui/NoteMeter.tsx
src/ui/App.tsx
src/ui/StaveView.tsx
src/ui/theme.ts
tests/ui/scenarios/note-meter.test.tsx
tests/ui/scenarios/stave-view.test.tsx
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  18 passed (18)
   Start at  00:38:44
   Duration  2.29s (tests 51%, environment 21%, transform 17%, import 10%)
CHECK:
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

(full pnpm check: prettier clean, eslint clean, tsc clean, vitest 91 files / 433 tests passed, cargo fmt/clippy/test all green)
CONCERNS: none
CHOICES MADE:
- Resumed a previous implementer's uncommitted work rather than redoing it: `NoteMeter.tsx`, `theme.ts`'s `noteMeter` tokens, `StaveView`'s `noteOpacityOf`/`leadTarget`/`onTargetBox`, and the note-meter/stave-view/transport-card-lead test additions were already present and correct (verified by inspection and by the RED→GREEN run); I only found and finished App.tsx's wiring, which still had just the two unused imports (`TOLERANCE_CENTS`, `NoteMeter`) and no actual rendering — the step-3 GREEN work.
- Wired App.tsx: a `targetBox` state set via `StaveView`'s `onTargetBox`; `leadTarget` derived as `{ runIndex }` only while `snapshot.lead.phase === "listening"` (idle/complete/cannot-hear show the run plain, matching REQ-015/S3's "every note of the run is ink" on completion); wrapped the `KeyPanel` in a `position: relative` div and rendered `<NoteMeter>` as its absolutely-positioned sibling, gated on `lead.phase === "listening" && settings.lead.cueMeter && selection.view === "stave" && targetBox !== null`, per the brief's Produces note.
- Did not wire the names-view column meter geometry (`MeterGeometry`'s `"column"` branch) into `NamesView` itself — the brief's Files list names only `StaveView` and `App.tsx`'s panel/overlay, and none of this task's Steps' tests exercise the names view; `NoteMeter`'s column geometry exists and is tested in isolation (`note-meter.test.tsx` S6) ready for whichever task wires it.
QUESTION: none

<!-- recorded 2026-10-03T23:46:19Z by scripts/record.sh -->
