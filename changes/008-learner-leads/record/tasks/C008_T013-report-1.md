---
type: Implementation Report
title: C008_T013 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T013.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T013.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-03T09:55:34Z
sdd_id: 008-learner-leads
---

TASK: C008_T013
STATUS: DONE_WITH_CONCERNS
COMMIT: 35658fe
FILES:
src/ui/TransportCard.tsx
src/ui/cents-label.ts
src/ui/theme.ts
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  10:53:06
   Duration  3.24s (tests 76%, transform 10%, environment 8%, import 6%)
CHECK:
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

(full pnpm check: prettier clean, eslint clean, tsc clean, vitest 90 files / 422 tests passed, cargo fmt/clippy clean, cargo test 13+24 passed)
CONCERNS:
- The brief's Step 1 verbatim test for REQ-017/S4 (card) — "advanced" — drove a continuous steady tone to 1300 ms (`hearSteadyInApp(app, 262.5, 0, 1300)`) then asserted "C4 held ✓". I reproduced and isolated this outside the UI (a throwaway probe directly against `Session`, same fixture/inputs) and confirmed `lead.justHeld` is already `null` by t=1300: the existing domain code (`src/practice/domain/session.ts`, from an earlier task, outside this task's Files) clears `justHeld` on the very first surviving detection after an advance — by design, matching REQ-017's own wording ("until the first reading against the new target") and matching the accepted precedent `tests/practice/scenarios/lead-meter.test.ts`'s own REQ-017/S4, which stops its steady feed at 1240 ms then does one more explicit reading at 1260 ms before asserting, precisely to catch the instant before the next reading clears it. I treated this as a test-construction detail within my craft (same scenario ID, same assertions/text/colour, verbatim Produces values untouched) and retimed the drive to mirror that precedent (steady to 1240 ms, one more reading at 1260 ms, then the D4 reading at 1300 ms) rather than loosening any assertion. Flagging this because the brief's literal test code could not pass against the already-shipped domain behaviour as written.
- The complete-card test (REQ-015/S3) drives the full 15-note run (~1800 synchronous `act()` calls) and exceeded vitest's default 5 s per-test timeout only under full-suite load (passed standalone in ~2.5 s); I gave it an explicit 15000 ms timeout rather than shrinking the scenario, since reaching "run complete" through the published interface has no cheaper path.
- Mode words are not shown on the live card or the complete card (only on idle and no-mic), matching the Produces block's literal listing (which names tuner-glyph/caption/judgement for complete, and stop-circle/target-letter/octave/caption/judgement for listening, with no mention of mode words) rather than REQ-014's more general "in every transport state" — happy to add them back if that's the intended reading.
CHOICES MADE:
- Reused `pitchClassLabel`/`noteLabel`/`pitchHzOf` from `theory/published` (same helpers `TunerLevel.tsx` and `PitchSpiral.tsx` already use) rather than writing new label logic.
- Split `TransportCard` into `IdleCard` (covers play-along idle/playing, I-lead idle, and I-lead complete — they share one start circle, one caption, and a second line that's either mode words or the "All held" judgement), `LiveCard`, and `NoMicCard`, plus small shared helpers (`TempoStepper`, `circleStyle`, `captionStyle`, `cardShellStyle`) extracted to avoid duplicating the existing tempo-stepper/circle/caption styling across all three, per the step 5 refactor instruction ("three small components... each under 60 lines").
- `target-hz`'s hidden span uses `style={{ display: "none" }}` plus `aria-hidden="true"` (test reads `.textContent` directly, which jsdom still exposes regardless of `display: none`).
- No-mic card keeps the tempo stepper/term visible alongside the start circle and mode words (not explicitly required by the test, but REQ-022 says "the sheet, the drone and the Tuner pill still work" and nothing says to hide the stepper).
QUESTION: none (resolved via DONE_WITH_CONCERNS — see CONCERNS above)

<!-- recorded 2026-10-03T09:59:21Z by scripts/record.sh -->
