---
type: Implementation Report
title: C008_T007 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T007.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T007.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T22:40:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T007
STATUS: DONE
COMMIT: 1e75085
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/lead-run.test.ts
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  22:38:08
   Duration  5.24s (tests 79%, environment 11%, transform 7%, import 3%)
CHECK:
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.10s

Overall vitest summary: Test Files 85 passed (85); Tests 388 passed (388).
Overall cargo summary (both crates + workspace): test result: ok (13 passed, 1 ignored); ok (24 passed, 1 ignored); doc-tests listening ok (0); doc-tests sound ok (0).
CONCERNS: none
CHOICES MADE:
- Named the new test `practice.session/REQ-015 — a key, traversal or scale change from complete returns to idle` (no existing S-numbered scenario covers this transition specifically; the brief offered this exact fallback name).
- Extracted a small private helper `clearCompleteLeadCard()` in session.ts rather than duplicating the `leadPhase.kind === "complete"` check three times, called it before `restartIfPlaying()`/after `recomputeAndRetune()` is irrelevant to it, and added a second `invalidateSnapshot()` call after it in each setter — the snapshot cache had already been rebuilt and re-cached (as "complete") inside `restartIfPlaying()`'s `endTapIfSounding()` path before my first fix attempt, so clearing the lead phase alone was invisible to `snapshot()` until the cache was invalidated again. Found this by adding throwaway `console.log` probes (removed before commit) rather than guessing.
- Test exercises all three setters (`setContext`, `setTraversal`, `setScaleChoice`) in one scenario, re-starting the run (`startLead`) between each to reach a fresh `complete` state, per the Produces line listing all three.

<!-- recorded 2026-10-02T21:42:36Z by scripts/record.sh -->
