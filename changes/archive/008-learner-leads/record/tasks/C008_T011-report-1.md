---
type: Implementation Report
title: C008_T011 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T011.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T011.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-03T09:31:30Z
sdd_id: 008-learner-leads
---

TASK: C008_T011
STATUS: DONE
COMMIT: 75e62dc
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/lead-cues.test.ts
tests/practice/scenarios/lead-meter.test.ts
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  10:30:27
   Duration  617ms (environment 49%, transform 32%, import 15%, tests 4%, worker 1%)
(from the combined run also including session-tap.test.ts: 3 files, 14 tests, all passed)
CHECK:
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
... (all ok)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

(vitest portion of the same `pnpm check` run: Test Files 89 passed (89), Tests 410 passed (410); prettier, eslint, tsc, cargo fmt/clippy all clean beforehand)
CONCERNS:
- `changes/008-learner-leads/tasks/C008_T011.md` showed as modified in git status before I started (not by me); I left it untouched and did not stage it, per the brief's "do not stage anything under .sdd/ or changes/".
- `TONE_RELEASE_MS = 40` (mirroring tone.rs's `RELEASE_S = 0.040`) is a new private constant I introduced in session.ts — the brief named it only descriptively ("the tone's release ms as tapNote's tone has"), with no exact value given anywhere I could find in the brief text; I derived it from src/sound/src/tone.rs's existing `RELEASE_S` the same way `DRONE_RELEASE_MS` already mirrors drone.rs's own constant. Flagging in case the intended value differs.
CHOICES MADE:
- `CUE_TAG_BASE` lives in session.ts beside `CLICK_TAG_BASE`/`DRONE_TAG_BASE`/`TAP_TAG_BASE` (all four are session-local tag-namespacing constants), not in domain/lead.ts as the plan's Data model section sketches — consistent with where every other tag base already lives in this codebase.
- `scheduleOneTone(hz, durationMs, tag)` returns the onset frame used, so the cue's `mutedUntilMs` is always computed from the exact onset the tone command itself carries (never a second, possibly-diverging computation) — extracted from tapNote's inline tone-building code per the brief's step 5, tapNote's own behaviour and its existing tests (`session-tap.test.ts`) unchanged.
- The cue's own `cueTag`/`stopCueIfSounding()` mirror the existing `tappedTag`/`endTapIfSounding()` shape (REQ-018 says "`stop()` stops a sounding cue (`stop` with its tag)"); wired into stop()'s lead branch, `restartLeadIfRunning()`, and the mid-run listening-ended (cannot-hear) branch.
- `justHeld` is set only on the REQ-016 hold-completion advance inside `onPitchDetected`, not on `startLead()`'s first target (no previous target exists) or on a REQ-019 restart (a fresh sequence, hold at zero — no "previous note" in the new run's own terms); `restartLeadIfRunning()` and `stop()` both clear any `justHeld` left over from before, for safety.
- `clearLeadJustHeld()` runs on every surviving (non-muted, non-stale) detection, placed after the mute-window check and before the hold rule, so a reading that itself completes the *next* advance still clears the old "held ✓" first and then a fresh one is armed for the new advance in the same call — matches the "first reading against the new target" scenario in `lead-meter.test.ts`/REQ-017/S4.
- `frameOfMs` and `FakeClock.advanceMs` were both already present in `tests/practice/lead-helpers.ts`/`tests/practice/fakes.ts` respectively (nothing to add, per the brief's "add if missing" instruction).

<!-- recorded 2026-10-03T09:34:20Z by scripts/record.sh -->
