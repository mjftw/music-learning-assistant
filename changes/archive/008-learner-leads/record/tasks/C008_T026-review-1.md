---
type: Task Review
title: Review package — C008_T026 · 008-learner-leads
description: The diff produced for C008_T026, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T026.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T026.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T026.md
  - resource: git:9f8703b3e6eb6d72d3b303ea02c2f90931da0ec9..ddadb4beb4d68dd11bd25b8ee131fe0362eace6b
generated:
  by: process:review-package.sh
  at: 2026-10-05T11:27:50Z
sdd_id: 008-learner-leads
---

# Review package — C008_T026 · 008-learner-leads

base: `9f8703b3e6eb6d72d3b303ea02c2f90931da0ec9` → head: `ddadb4beb4d68dd11bd25b8ee131fe0362eace6b`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-hold.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  12:27:50
   Duration  760ms (environment 41%, transform 33%, import 15%, tests 10%)

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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
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

- M	src/practice/domain/session.ts
- M	tests/practice/scenarios/lead-hold.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 01ea1b9..36fbf86 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1211,6 +1211,9 @@ export function createSession(
       leadGapCancel = null;
       invalidateSnapshot();
       leadReading = null;
+      // REQ-016 — the first reading after nothing was heard is as detected:
+      // the smoothing restarts, as the tuner's gap restarts its own.
+      leadSmoothing = initialSmoothingState;
       leadPhase = applySilence(leadPhase);
       notifyChange();
     }, LEAD_GAP_MS);
diff --git a/tests/practice/scenarios/lead-hold.test.ts b/tests/practice/scenarios/lead-hold.test.ts
index 2d14c75..5e8621c 100644
--- a/tests/practice/scenarios/lead-hold.test.ts
+++ b/tests/practice/scenarios/lead-hold.test.ts
@@ -144,3 +144,13 @@ test("practice.session/REQ-016/S9 — a new target starts clean", async () => {
   expect(firstOnD.cents).toBe(-194); // as detected, not smoothed from C4's +6
   expect(f.session.snapshot().lead.heldFraction).toBe(0);
 });
+test("practice.session/REQ-016 — the first reading after silence is as detected", async () => {
+  const { f, judged } = await running();
+  hearSteady(f, 262.5, 0, 500); // +6 ¢, in tune: the hold accumulates
+  expect(f.session.snapshot().lead.heldFraction).toBeGreaterThan(0);
+  letGapPass(f);
+  f.clock.advanceMs(200); // 500 ms with nothing detected
+  hearAt(f, 264.06, 1000); // +16 ¢
+  expect(judged.at(-1)).toMatchObject({ cents: 16, verdict: "sharp" });
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T026.md b/changes/008-learner-leads/tasks/C008_T026.md
index 139b31b..88ff09f 100644
--- a/changes/008-learner-leads/tasks/C008_T026.md
+++ b/changes/008-learner-leads/tasks/C008_T026.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T11:19:36Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T026
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-016]
 sdd_depends_on: [C008_T025]
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 1"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T026 · The first lead reading after silence is as detected, not smoothed (converge C2)
```

## Verdict

SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/practice/scenarios/lead-hold.test.ts:147 — the test is named without an S-number; acceptable (lead-reducer.test.ts and lead-settings.test.ts already carry S-less `practice.session/REQ-016 — ...` names) and the sentence is in REQ-016's body. Recommend, for the decider, a delta amendment adding REQ-016/S10 "the first reading after silence is as detected" (+6 ¢ held, 500 ms nothing, +16 ¢ -> sharp, hold zero), as REQ-016/S4 only returns at the same pitch.
- [minor] the test does not assert the silence itself leaves the hold unchanged (only >0 before, 0 after); REQ-016/S4 covers that and still passes.
UNVERIFIED:
- practice.session/REQ-021 — `pnpm test:lead` PASS (advance lateness 0) is the implementer's claim; not in the package, not run.
COMMANDS:
package only (plus ./scripts/check-contexts.sh: boundaries respected; read-through of session.ts reset sites)


<!-- recorded 2026-10-05T11:29:20Z by scripts/record.sh -->
