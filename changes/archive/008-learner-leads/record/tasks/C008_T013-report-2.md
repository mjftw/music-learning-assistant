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
  at: 2026-10-03T23:25:43Z
sdd_id: 008-learner-leads
---

TASK: C008_T013
STATUS: DONE
COMMIT: d1fad8f
FILES:
src/ui/TransportCard.tsx
tests/ui/scenarios/transport-card-lead.test.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  00:23:42
   Duration  3.61s (tests 74%, transform 12%, environment 7%, import 6%)
CHECK:
     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::accent_is_louder_and_lower ... ok
test click::tests::click_lasts_25_ms ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

(full run: Test Files 90 passed (90); Tests 422 passed (422); cargo listening and sound suites both ok)
CONCERNS: none
CHOICES MADE:
- Extracted `TargetCaptionAndJudgement` (the live card's small column beside the target letter — caption over judgement) as a new named component purely to bring LiveCard under the 60-line cap; kept `ModeWordsRow` (margin-top wrapper) as the shared "mode words as their own row" sibling for IdleCard, LiveCard and NoMicCard (NoMicCard already used `ModeWords` directly, unchanged).
- Routed `onWho` into `LiveCard`'s props (it was previously unused there) rather than reading it off a wider props bag, matching the other cards' signatures.
- Replaced NoMicCard's inlined duplicate of the no-mic message markup with the `NoMicMessage` component that was already defined but unused, rather than leaving the duplication in place (AGENTS.md "things agents get wrong here" — extract, don't duplicate).

<!-- recorded 2026-10-03T23:27:55Z by scripts/record.sh -->
