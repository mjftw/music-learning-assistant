---
type: Implementation Report
title: T006 — implementation report
resource: /.sdd/reports/008-learner-leads/T006.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T006.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T21:32:00Z
sdd_id: 008-learner-leads
---

TASK: T006
STATUS: DONE
COMMIT: none (not committed, per the coordinator's instruction)
FILES:
src/practice/domain/session.ts (the lead branch of `onPitchDetected`, the shared `isTooOld()` age check, `commitLeadReading`/`armLeadGapTimer`/`cancelLeadTimers`, the lead snapshot block — already present from the aborted prior attempt; reviewed against the brief, not further edited)
tests/practice/scenarios/lead-hold.test.ts (edited per decision D001 — see CHOICES MADE)
tests/practice/scenarios/lead-meter.test.ts (verbatim from the brief, unchanged)
tests/practice/scenarios/lead-budget.test.ts (verbatim from the brief, unchanged)

VERIFY:
```
pnpm vitest run tests/practice/scenarios/lead-hold.test.ts tests/practice/scenarios/lead-meter.test.ts tests/practice/scenarios/lead-budget.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  3 passed (3)
      Tests  12 passed (12)
   Start at  21:31:26
   Duration  717ms (environment 50%, transform 30%, import 15%, tests 5%, worker 1%)
```

CHECK:
```
source ~/.cargo/env && pnpm check

 Test Files  85 passed (85)
      Tests  384 passed (384)

running 13 tests
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.43s

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

Doc-tests listening / Doc-tests sound: 0 passed; 0 failed
```
prettier, eslint, tsc, vitest (384/384), cargo fmt/clippy/test (listening crate 13/13, sound crate 24/24 + 1 ignored) all green. No failures anywhere.

CONCERNS: none.

CHOICES MADE:
- Decision D001 (`.sdd/decisions/008-learner-leads/T006-1.md`, verdict: option A, two-way door) resolved the two test assertions that could not pass against the already-approved `applyJudgement`/`applySilence` reducer (`src/practice/domain/lead.ts`, outside T006's files, left untouched as directed):
  - `REQ-016/S1`: replaced the unscoped `judged.every(...)` check with `onC = judged.filter(j => j.target.letter === "C")`, asserting `onC.length > 0` and `onC.every(j => j.verdict === "in-tune" && j.cents === 6)` — the scenario's "every reading judges in tune" read as every reading while C4 is the target, not every reading in the whole 1400 ms window (which legitimately includes post-advance D4 readings per `REQ-016/S9`).
  - `REQ-016/S4`: derived the expected advance window from the snapshot's actually-reported `heldFraction` (`heldMs = heldFraction * 1250 ≈ 896`, `expectedMs = t0 + 2900 + (1250 - heldMs)`) rather than the hand-picked round number 350, the same technique `REQ-016/S3` already uses — accounting for the cold-start reading contributing nothing both when E4's hold began and when it resumed after the silence gap.
  - Both edits applied exactly as specified in D001's "For the implementer" section; no change to `src/practice/domain/lead.ts`, `session.ts`, or the delta (the controller applies D001's delta amendment separately).
- Kept from the prior attempt (reviewed, not rewritten): `isTooOld()` as the single shared age check between the tuner and lead branches (REFACTOR step 5, first half); the commit/gap pair left as two mirrored trios (`commitTunerReading`/`armTunerGapTimer`/`cancelTunerTimers` vs `commitLeadReading`/`armLeadGapTimer`/`cancelLeadTimers`) rather than one shared `readingPipeline` helper, since their bodies genuinely differ — the tuner's commit updates the hand-over hysteresis (`tunerShownPosition`/`tunerLastHeardPosition`) that a pinned lead reading has no use for, and the tuner's gap callback clears that hysteresis via `clearTunerReading()` where the lead one clears `leadReading` and calls `applySilence(leadPhase)` instead.

<!-- recorded 2026-10-02T20:38:01Z by scripts/record.sh -->
