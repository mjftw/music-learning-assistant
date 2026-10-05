---
type: Task Review
title: Review package — C008_T021 · 008-learner-leads
description: The diff produced for C008_T021, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T021.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T021.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T021.md
  - resource: git:0c150dd1ee6808153afae0c8eb6902c1fd072ed3..004e16edd94f862e9ec22586030f90c01643f3ee
  - resource: /changes/008-learner-leads/record/tasks/C008_T021-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-04T09:50:40Z
sdd_id: 008-learner-leads
---

# Review package — C008_T021 · 008-learner-leads

base: `0c150dd1ee6808153afae0c8eb6902c1fd072ed3` → head: `004e16edd94f862e9ec22586030f90c01643f3ee`

**Incremental review.** The previous attempt (head `c28290a106a3bef1ee0dea51e103be506654b0cf`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict




## Commands (run by this script)

### Verify

`pnpm check`

```
test click::tests::click_lasts_25_ms ... ok
test click::tests::accent_is_louder_and_lower ... ok
test drone::tests::reed_drone_render_cost ... ignored
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::click_lasts_25_ms ... ok
test click::tests::accent_is_louder_and_lower ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
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
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

## Files changed

- M	scripts/timing-test.mjs
- M	src/practice/domain/session.ts
- M	tests/practice/lead-helpers.ts
- A	tests/practice/scenarios/lead-edge-cases.test.ts
- M	tests/practice/scenarios/lead-run.test.ts
- M	tests/ui/scenarios/app-drone.test.tsx
- M	tests/ui/scenarios/circle-spelling.test.tsx
- M	tests/ui/scenarios/selection-persistence.test.tsx
- M	tests/ui/scenarios/selector-and-notices.test.tsx
- M	tests/ui/scenarios/stave-view.test.tsx

## Diff since the previous attempt (`c28290a106a3bef1ee0dea51e103be506654b0cf` → head)

```diff
diff --git a/tests/ui/scenarios/app-drone.test.tsx b/tests/ui/scenarios/app-drone.test.tsx
index 4fb70df..6207379 100644
--- a/tests/ui/scenarios/app-drone.test.tsx
+++ b/tests/ui/scenarios/app-drone.test.tsx
@@ -129,7 +129,7 @@ test("practice.drone/REQ-001/S4 (app) — sheets, the drawer and the picker neve
     expect(sound.posted.filter(isRetune)).toHaveLength(0);
     expect(sound.posted.filter(isDrone)).toHaveLength(1);
   }
-});
+}, 15_000);
 
 test("practice.drone/REQ-006/S2 (app) — the sheet is not a control", async () => {
   localStorage.clear();
diff --git a/tests/ui/scenarios/circle-spelling.test.tsx b/tests/ui/scenarios/circle-spelling.test.tsx
index 6c4b579..be76a0c 100644
--- a/tests/ui/scenarios/circle-spelling.test.tsx
+++ b/tests/ui/scenarios/circle-spelling.test.tsx
@@ -32,7 +32,7 @@ test("theory.circle-of-fifths/REQ-002/S1 — the preference respells all three d
   expect(screen.getByRole("button", { name: "A♭ minor" })).toBeTruthy();
   expect(screen.queryByRole("button", { name: "F♯ major" })).toBeNull();
   expect(screen.getByRole("button", { name: "C major" })).toBeTruthy();
-});
+}, 15_000);
 
 test("theory.circle-of-fifths/REQ-002/S2 — the selection follows the position across a respell", async () => {
   renderApp();
diff --git a/tests/ui/scenarios/selection-persistence.test.tsx b/tests/ui/scenarios/selection-persistence.test.tsx
index dd552ae..4f098db 100644
--- a/tests/ui/scenarios/selection-persistence.test.tsx
+++ b/tests/ui/scenarios/selection-persistence.test.tsx
@@ -111,7 +111,7 @@ test("theory.circle-of-fifths/REQ-008/S1 — resuming mid-week practice", async
   expect(pressed("names")).toBe("true");
   expect(pressed("stave")).toBe("false");
   expect(screen.getAllByTestId("arc-degree")).toHaveLength(7);
-});
+}, 15_000);
 
 test("theory.circle-of-fifths/REQ-008/S2 — first run", async () => {
   localStorage.clear();
diff --git a/tests/ui/scenarios/selector-and-notices.test.tsx b/tests/ui/scenarios/selector-and-notices.test.tsx
index 80af407..edc8ae1 100644
--- a/tests/ui/scenarios/selector-and-notices.test.tsx
+++ b/tests/ui/scenarios/selector-and-notices.test.tsx
@@ -30,7 +30,7 @@ test("theory.instruments/REQ-001/S2 — completing a selection names a variant",
   expect(
     screen.queryByRole("button", { name: "Close instrument picker" }),
   ).toBeNull();
-});
+}, 15_000);
 
 test("theory.instruments/REQ-003/S2 — the notice interrupts nothing", async () => {
   localStorage.clear();
diff --git a/tests/ui/scenarios/stave-view.test.tsx b/tests/ui/scenarios/stave-view.test.tsx
index 695f668..2c302ed 100644
--- a/tests/ui/scenarios/stave-view.test.tsx
+++ b/tests/ui/scenarios/stave-view.test.tsx
@@ -231,7 +231,7 @@ test("theory.circle-of-fifths/REQ-003/S2 — the display follows the variant's r
     const octave = Number(note.slice(-1));
     expect(after[index]).toBe(`${pitchClass}${octave - 1}`);
   });
-});
+}, 15_000);
 
 test("theory.circle-of-fifths/REQ-007/S1 — switching views shows noteheads with no name labels", async () => {
   setup();
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T021.md b/changes/008-learner-leads/tasks/C008_T021.md
index 5b5be4c..aac1650 100644
--- a/changes/008-learner-leads/tasks/C008_T021.md
+++ b/changes/008-learner-leads/tasks/C008_T021.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T021
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: []
 sdd_depends_on: []
 sdd_parked_on: 
 sdd_group: "Phase 4 — The harness and hardening"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T021 · Hardening: every edge-case row, the three measured budgets, the hygiene scripts
```

## Verdict

TASK: C008_T021
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/practice/scenarios/lead-edge-cases.test.ts:88 — REQ-021/S3 is cited fully qualified only in the first ID of the test name ("practice.session/REQ-021/S1 · REQ-021/S3"); S4 (phone acceptance) is attributed by header comment only. check-scenarios is green and this matches the 007 tuner-harness precedent, but S4 has no executable check; the real gate is the user's phone sign-off at acceptance.
- [minor] src/practice/domain/session.ts:1628 — the guard comment's last clause ("so the guard is here") does not say why startLead's own guard is not shared; the proposal-row citation is the useful WHY.
- [minor] tests/practice/scenarios/lead-edge-cases.test.ts:50 — "circle tapped while already leading" asserts start() twice is a no-op; the proposal's "second tap is the stop" (circle renders as the stop button) is covered in the UI card tests, not here. Acceptable.
UNVERIFIED:
- practice.session/REQ-021/S1, S3 — pnpm test:lead / test:timing / test:tuner PASS lines are the implementer's paste only; the package does not re-run them. test:timing and test:tuner were run on the attempt-1 tree and not re-run after the session.ts guard (the guard is play-along-empty-run only, so the transport for non-empty runs is untouched, but not measured).
- practice.session/REQ-021/S4 — phone sign-off, acceptance only.
COMMANDS:
package only, plus: ./scripts/check-scenarios.sh --change changes/008-learner-leads (scenario coverage complete); ./scripts/check-contexts.sh (boundaries respected); grep scripts/ for setSettings


<!-- recorded 2026-10-04T09:53:19Z by scripts/record.sh -->
