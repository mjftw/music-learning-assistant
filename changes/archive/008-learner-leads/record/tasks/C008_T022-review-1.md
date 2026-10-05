---
type: Task Review
title: Review package — C008_T022 · 008-learner-leads
description: The diff produced for C008_T022, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T022.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T022.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T022.md
  - resource: git:7941c2a768f9a4380da4c6cb60851f00c763914d..5b963e9aea7f834571875827fe07f85591eb6392
generated:
  by: process:review-package.sh
  at: 2026-10-04T09:56:32Z
sdd_id: 008-learner-leads
---

# Review package — C008_T022 · 008-learner-leads

base: `7941c2a768f9a4380da4c6cb60851f00c763914d` → head: `5b963e9aea7f834571875827fe07f85591eb6392`

## Commands (run by this script)

### Verify

`grep -c "test:lead" AGENTS.md`

```
3
```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::accent_is_louder_and_lower ... ok
test click::tests::click_lasts_25_ms ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::an_unknown_sound_code_is_refused ... ok
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

- M	AGENTS.md

## Diff

```diff
diff --git a/AGENTS.md b/AGENTS.md
index b2cac99..5166a45 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -188,7 +188,9 @@ Run `check` before calling any task done, and paste the output.
   `tests/<context>/scenarios/` one test per spec scenario named by
   its full ID, `tests/<context>/invariants/` for invariants tested by
   exhaustive enumeration, `tests/ui/scenarios/` for view-observable
-  scenarios.
+  scenarios. Shared fixtures sit beside the tests: `tests/practice/lead-helpers.ts`
+  (lead-run) beside `tuner-helpers.ts`, and `tests/ui/scenarios/lead-app-helpers.tsx`
+  (app-level lead helpers).
 - Commits: Conventional Commits citing the requirement — `feat(auth): rate-limit login (REQ-004)`.
 
 ## Architecture
@@ -198,8 +200,10 @@ Four bounded contexts (docs/domain.md): `src/theory/` (pure functions —
 notes, keys, circle, traversal, pitch, catalogue, scales (the catalogue),
 notation), `src/practice/` (the session: a pure transport state machine, the
 drone, the tuner (target, reading, the never-both invariant extended to
-listening), a lookahead scheduler adapter on the audio clock, ports for sound
-/ clock / wake lock / visibility / listening),
+listening and to the lead run), a lead run (the hold rule as a pure reducer
+over timestamped judgements; the Session owns it beside the transport, the
+drone and the tuner), a lookahead scheduler adapter on the audio clock, ports
+for sound / clock / wake lock / visibility / listening),
 `src/sound/` (Rust→WASM synthesiser in an AudioWorklet plus a ~60-line TS
 host shim in its `published/`; ADR 0003) — voices are addressable by tag
 and a drone voice has no end (ADR 0005), `src/listening/` (pitch
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T022.md b/changes/008-learner-leads/tasks/C008_T022.md
index 9a212d9..e722c03 100644
--- a/changes/008-learner-leads/tasks/C008_T022.md
+++ b/changes/008-learner-leads/tasks/C008_T022.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T022
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
 
 # C008_T022 · `AGENTS.md` is real; converge
```

## Verdict

_The task reviewer appends its verdict here._

### Task reviewer verdict (attempt 1, documentation half)

TASK: C008_T022
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] AGENTS.md Conventions — the brief names only `tests/practice/lead-helpers.ts`; the diff also names `tests/ui/scenarios/lead-app-helpers.tsx`. Both files exist and are imported by tests, so it is a description of what is there, not an invented convention. Recorded, not blocking.
UNVERIFIED:
- C008_T022 step 3 and notes.md — out of scope (controller's)
COMMANDS:
package only (plus read-only greps: FILL THIS IN count 0, test:lead count 3, file existence, lead.ts and session.ts read)

<!-- recorded 2026-10-04T09:57:54Z by scripts/record.sh -->
