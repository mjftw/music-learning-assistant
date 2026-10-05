---
type: Task Review
title: Review package — C008_T024 · 008-learner-leads
description: The diff produced for C008_T024, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T024.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T024.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T024.md
  - resource: git:94b94964284973ad5930c50f1e0ef4f2e11a6878..29abfb7d797da33bfc09fd40872fbf66a9aae201
generated:
  by: process:review-package.sh
  at: 2026-10-04T12:34:52Z
sdd_id: 008-learner-leads
---

# Review package — C008_T024 · 008-learner-leads

base: `94b94964284973ad5930c50f1e0ef4f2e11a6878` → head: `29abfb7d797da33bfc09fd40872fbf66a9aae201`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  13:34:52
   Duration  4.81s (tests 75%, transform 12%, environment 8%, import 6%)

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
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

## Files changed

- M	src/ui/App.tsx
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 7bf09f8..545ad2d 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -569,10 +569,15 @@ export function App(props: {
 
   function handleTogglePlay(): void {
     if (session === null || snapshot === null) return;
-    if (snapshot.transport.kind === "idle") {
-      session.start();
-    } else {
+    // A lead run never touches the transport, so ■ on the live lead card
+    // (shown for the whole `listening` phase, the microphone request
+    // included) is told apart by the lead phase (practice.session/REQ-015).
+    const inProgress =
+      snapshot.transport.kind !== "idle" || snapshot.lead.phase === "listening";
+    if (inProgress) {
       session.stop();
+    } else {
+      session.start();
     }
   }
 
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index 3d46628..7a0fc75 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -278,3 +278,20 @@ test("practice.session/REQ-017/S3 (app, stave) — the meter sits on the target"
   expect(box.style.top).toBe(`${Number(head.getAttribute("cy")) - 20}px`);
   expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
 });
+
+test("practice.session/REQ-015/S2 (card) — ■ stops the lead run", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  await app.user.click(screen.getByTestId("stop-circle"));
+  await flushApp();
+  expect(app.listening.stopCalls).toBe(1);
+  expect(screen.queryByTestId("stop-circle")).toBeNull();
+  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+  expect(app.listening.startCalls).toBe(2);
+  expect(screen.getByTestId("target-letter").textContent).toBe("C");
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T024.md b/changes/008-learner-leads/tasks/C008_T024.md
index 82dff3c..1e1e163 100644
--- a/changes/008-learner-leads/tasks/C008_T024.md
+++ b/changes/008-learner-leads/tasks/C008_T024.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-04T12:30:44Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T024
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015]
 sdd_depends_on: [C008_T013]
 sdd_parked_on:            # D003 when parked
 sdd_group: "Appended"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T024 · ■ on the live lead card stops the run
```

## Verdict

_The task reviewer appends its verdict here._

### Verdict (task-reviewer)

TASK: C008_T024
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/ui/scenarios/transport-card-lead.test.tsx:282 — the pending-microphone state (card still the start circle, handler calls start(), which startLead() ignores while listeningOwner is "lead") has no test; correct per the brief's "leave it", just unpinned.
UNVERIFIED:
- none
COMMANDS: package only; ./scripts/check-contexts.sh -> context boundaries respected

<!-- recorded 2026-10-04T12:36:44Z by scripts/record.sh -->
