---
type: Task Review
title: Review package — C008_T009 · 008-learner-leads
description: The diff produced for C008_T009, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T009.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T009.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T009.md
  - resource: git:8a3a2e73caf80ffd3c034315294d768175668843..81257930e6ed3f895f06cd8535315e6db6f9c74d
generated:
  by: process:review-package.sh
  at: 2026-10-03T09:14:10Z
sdd_id: 008-learner-leads
---

# Review package — C008_T009 · 008-learner-leads

base: `8a3a2e73caf80ffd3c034315294d768175668843` → head: `81257930e6ed3f895f06cd8535315e6db6f9c74d`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/session-hidden-awake.test.ts tests/practice/scenarios/lead-cannot-hear.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  10:14:10
   Duration  704ms (environment 46%, transform 37%, import 14%, tests 3%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::accent_is_louder_and_lower ... ok
test click::tests::click_lasts_25_ms ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

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
- A	tests/practice/scenarios/lead-cannot-hear.test.ts
- A	tests/practice/scenarios/session-hidden-awake.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 719dffd..e4ebc59 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1151,11 +1151,30 @@ export function createSession(
   // does not itself fire onEnded, but a real track ending after release
   // well might) must not resurrect a state leaveTuner() already cleared.
   const unsubscribeListeningEnded = listening.onEnded(() => {
-    if (!tunerActive) return;
+    if (tunerActive) {
+      invalidateSnapshot();
+      tunerListeningState = { kind: "cannot-hear", reason: "failed" };
+      clearTunerReading();
+      cancelTunerTimers();
+      notifyChange();
+      return;
+    }
+    // practice.session/REQ-022/S3 — a lead run's microphone unplugged or its
+    // permission revoked mid-run: the same "cannot-hear(failed)" shape as
+    // the tuner's own branch above, but through `listeningOwner` rather than
+    // `tunerActive`, and with the lead run's own reading, smoothing, hold
+    // and timers forgotten (mirrors stop()'s lead branch) and the wake lock
+    // released, since nothing is listening or sounding once this ends it.
+    if (listeningOwner !== "lead") return;
     invalidateSnapshot();
-    tunerListeningState = { kind: "cannot-hear", reason: "failed" };
-    clearTunerReading();
-    cancelTunerTimers();
+    leadGeneration += 1; // supersede a startLead() still awaiting its asks
+    listeningOwner = "none";
+    leadListeningState = { kind: "cannot-hear", reason: "failed" };
+    leadPhase = { kind: "cannot-hear", reason: "failed" };
+    leadReading = null;
+    leadSmoothing = initialSmoothingState;
+    cancelLeadTimers();
+    releaseWakeLockIfSilent();
     notifyChange();
   });
 
@@ -2029,11 +2048,15 @@ export function createSession(
             // practice.session/REQ-022 — the attempt ends here rather than
             // leaving `listeningOwner` claimed: nothing is actually
             // listening, so the next tap of the start circle must be free
-            // to try again (T009 tests the cannot-hear card itself).
+            // to try again (T009 tests the cannot-hear card itself). The
+            // wake lock was acquired for this attempt alone (nothing else
+            // is sounding or listening at this point) — released the same
+            // way stop()'s lead branch releases it.
             listeningOwner = "none";
             const reason = cannotHearReasonOf(result.error.reason);
             leadListeningState = { kind: "cannot-hear", reason };
             leadPhase = { kind: "cannot-hear", reason };
+            releaseWakeLockIfSilent();
           }
           notifyChange();
         })();
diff --git a/tests/practice/scenarios/lead-cannot-hear.test.ts b/tests/practice/scenarios/lead-cannot-hear.test.ts
new file mode 100644
index 0000000..8060854
--- /dev/null
+++ b/tests/practice/scenarios/lead-cannot-hear.test.ts
@@ -0,0 +1,67 @@
+// practice.session/REQ-022 — when the microphone cannot be used: refused at
+// the start, retried at the next tap, failed mid-run, and never asked for
+// before the gesture.
+
+import { expect, test } from "vitest";
+import type { TargetAdvanced } from "../../../src/practice/published";
+import {
+  hearSteady,
+  leadFixture,
+  leadSettings,
+  startLead,
+} from "../lead-helpers";
+
+test("practice.session/REQ-022/S1 — refused", async () => {
+  const f = leadFixture();
+  f.listening.failWith = "refused";
+  const advanced: TargetAdvanced[] = [];
+  f.session.onTargetAdvanced((e) => advanced.push(e));
+  await startLead(f.session);
+  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
+  expect(f.session.snapshot().lead.listening).toEqual({
+    kind: "cannot-hear",
+    reason: "refused",
+  });
+  expect(f.session.snapshot().lead.target).toBeNull();
+  expect(advanced).toEqual([]);
+  expect(f.wake.acquired).toBe(false);
+  f.session.startDrone();
+  await Promise.resolve();
+  await Promise.resolve();
+  expect(f.session.snapshot().drone.on).toBe(true); // the drone still works
+});
+
+test("practice.session/REQ-022/S2 — the next tap tries again", async () => {
+  const f = leadFixture();
+  f.listening.failWith = "none";
+  await startLead(f.session);
+  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
+  f.listening.failWith = null;
+  await startLead(f.session);
+  expect(f.listening.startCalls).toBe(2);
+  expect(f.session.snapshot().lead.phase).toBe("listening");
+  expect(f.session.snapshot().lead.target?.position).toBe(1);
+});
+
+test("practice.session/REQ-022/S3 — failed while leading", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 500);
+  f.listening.end();
+  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
+  expect(f.session.snapshot().lead.listening).toEqual({
+    kind: "cannot-hear",
+    reason: "failed",
+  });
+  expect(f.session.snapshot().lead.reading).toBeNull();
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+  expect(f.session.snapshot().lead.target).toBeNull();
+});
+
+test("practice.session/REQ-022/S4 — nothing before the gesture", () => {
+  const f = leadFixture();
+  f.session.setSettings(leadSettings({ holdBeats: 4 }));
+  f.session.setSettings(leadSettings({ who: "tool" }));
+  f.session.setSettings(leadSettings());
+  expect(f.listening.startCalls).toBe(0);
+});
diff --git a/tests/practice/scenarios/session-hidden-awake.test.ts b/tests/practice/scenarios/session-hidden-awake.test.ts
new file mode 100644
index 0000000..41237e9
--- /dev/null
+++ b/tests/practice/scenarios/session-hidden-awake.test.ts
@@ -0,0 +1,35 @@
+// practice.session/REQ-009 — the page hidden, the screen awake, for a lead
+// run: REQ-009/S1 (play along) lives in session-target.test.ts; this file
+// covers S2's lead-run case and S3, both reached through startLead().
+
+import { expect, test } from "vitest";
+import { hearSteady, leadFixture, startLead } from "../lead-helpers";
+
+test("practice.session/REQ-009/S2 — the phone on the stand stays lit while leading", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  expect(f.wake.acquired).toBe(true);
+  f.session.stop();
+  expect(f.wake.acquired).toBe(false);
+});
+
+test("practice.session/REQ-009/S3 — a lead run hidden", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 700);
+  f.visibility.hide();
+  expect(f.listening.stopCalls).toBe(1);
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.target).toBeNull();
+  expect(f.session.snapshot().lead.idleCaption).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  expect(f.wake.acquired).toBe(false);
+  f.visibility.show();
+  await Promise.resolve();
+  await Promise.resolve();
+  expect(f.listening.startCalls).toBe(1);
+  await startLead(f.session);
+  expect(f.session.snapshot().lead.target?.position).toBe(1);
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T009.md b/changes/008-learner-leads/tasks/C008_T009.md
index bc7c0c8..13dd373 100644
--- a/changes/008-learner-leads/tasks/C008_T009.md
+++ b/changes/008-learner-leads/tasks/C008_T009.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T009
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-009, practice.session/REQ-022]
 sdd_depends_on: [C008_T005, C008_T008]
 sdd_parked_on: 
 sdd_group: "Phase 2 — The lead run in the Session aggregate"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T009 · Hidden, the wake lock, and the microphone that cannot be used
```

## Verdict

_The task reviewer appends its verdict here._

## Verdict

TASK: C008_T009
SPEC: PASS
QUALITY: PASS
FINDINGS:
- none
UNVERIFIED:
- practice.session/REQ-022 (ask nowhere but at lead start) — the diff only touches the two named branches; the no-ask invariant is enforced by pre-existing `startLead()`/`setSettings()` code outside this diff (test S4 passes against unchanged code).

<!-- recorded 2026-10-03T09:15:47Z by scripts/record.sh -->
