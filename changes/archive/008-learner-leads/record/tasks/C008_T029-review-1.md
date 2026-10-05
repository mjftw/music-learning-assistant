---
type: Task Review
title: Review package — C008_T029 · 008-learner-leads
description: The diff produced for C008_T029, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T029.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T029.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T029.md
  - resource: git:a3839b4024b6af9d6592eba38a140002cffddcd2..87aeafdc0a2665bdb49bf2ad41cf07c83fcacb86
generated:
  by: process:review-package.sh
  at: 2026-10-05T11:49:10Z
sdd_id: 008-learner-leads
---

# Review package — C008_T029 · 008-learner-leads

base: `a3839b4024b6af9d6592eba38a140002cffddcd2` → head: `87aeafdc0a2665bdb49bf2ad41cf07c83fcacb86`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx tests/practice/scenarios/lead-edge-cases.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  25 passed (25)
   Start at  12:49:10
   Duration  5.35s (tests 73%, environment 11%, transform 10%, import 6%)

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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
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
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.11s

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
- M	tests/practice/fakes.ts
- M	tests/practice/scenarios/lead-edge-cases.test.ts
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 545ad2d..5b256f4 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -571,9 +571,13 @@ export function App(props: {
     if (session === null || snapshot === null) return;
     // A lead run never touches the transport, so ■ on the live lead card
     // (shown for the whole `listening` phase, the microphone request
-    // included) is told apart by the lead phase (practice.session/REQ-015).
+    // included) is told apart by the lead phase (practice.session/REQ-015);
+    // while the microphone is still being asked for the phase is yet idle
+    // and the lead snapshot says "starting" — the second tap is the stop.
     const inProgress =
-      snapshot.transport.kind !== "idle" || snapshot.lead.phase === "listening";
+      snapshot.transport.kind !== "idle" ||
+      snapshot.lead.phase === "listening" ||
+      snapshot.lead.listening.kind === "starting";
     if (inProgress) {
       session.stop();
     } else {
diff --git a/tests/practice/fakes.ts b/tests/practice/fakes.ts
index bc3dce1..43195d5 100644
--- a/tests/practice/fakes.ts
+++ b/tests/practice/fakes.ts
@@ -298,6 +298,11 @@ export class FakeListening implements ListeningPort {
   // "fake" } } instead of succeeding — REQ-006/REQ-007's refused/none/failed
   // scenarios.
   failWith: ListeningUnavailable["reason"] | null = null;
+  // While set, start() stays pending (the microphone "being asked for") until
+  // resolveStart() answers it — a stop() landing in that window is the
+  // supersede path of practice.session/REQ-015.
+  holdStart = false;
+  private answerStart: (() => void) | null = null;
   private readonly pitchListeners = new Set<(pitch: PitchDetected) => void>();
   private readonly endedListeners = new Set<(ended: ListeningEnded) => void>();
 
@@ -309,10 +314,25 @@ export class FakeListening implements ListeningPort {
         error: { reason: this.failWith, detail: "fake" },
       });
     }
+    if (this.holdStart) {
+      return new Promise((resolve) => {
+        this.answerStart = () => {
+          this.listening = true;
+          resolve({ ok: true, value: undefined });
+        };
+      });
+    }
     this.listening = true;
     return Promise.resolve({ ok: true, value: undefined });
   }
 
+  /** Answers a start() held by `holdStart`: the microphone opens now. */
+  resolveStart(): void {
+    const answer = this.answerStart;
+    this.answerStart = null;
+    answer?.();
+  }
+
   stop(): void {
     this.stopCalls += 1;
     this.listening = false;
diff --git a/tests/practice/scenarios/lead-edge-cases.test.ts b/tests/practice/scenarios/lead-edge-cases.test.ts
index 3f1cac0..597df0f 100644
--- a/tests/practice/scenarios/lead-edge-cases.test.ts
+++ b/tests/practice/scenarios/lead-edge-cases.test.ts
@@ -74,6 +74,28 @@ test("edge case — the circle tapped while already leading is a no-op", async (
   expect(after.target).toEqual(before.target);
 });
 
+test("edge case — the circle tapped again while the microphone is being asked for is the stop", async () => {
+  const f = leadFixture();
+  f.listening.holdStart = true;
+  const targets: unknown[] = [];
+  f.session.onTargetAdvanced((e) => targets.push(e));
+
+  await startLead(f.session);
+  expect(f.listening.startCalls).toBe(1);
+  expect(f.session.snapshot().lead.listening).toEqual({ kind: "starting" });
+
+  f.session.stop();
+  f.listening.resolveStart();
+  await new Promise((resolve) => setTimeout(resolve, 0));
+
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.target).toBeNull();
+  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });
+  expect(targets).toEqual([]);
+  expect(f.listening.listening).toBe(false);
+  expect(f.wake.acquired).toBe(false);
+});
+
 test("edge case — ■ twice", async () => {
   const f = leadFixture();
   await startLead(f.session);
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index 564d6ee..af55f4b 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -296,6 +296,28 @@ test("practice.session/REQ-015/S2 (card) — ■ stops the lead run", async () =
   expect(screen.getByTestId("target-letter").textContent).toBe("C");
 });
 
+test("practice.session/REQ-015/S2 (card) — a second tap while the microphone is asked for stops", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  app.listening.holdStart = true;
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+  expect(app.listening.startCalls).toBe(1);
+  expect(screen.queryByTestId("stop-circle")).toBeNull();
+
+  await app.user.click(screen.getByTestId("start-circle"));
+  act(() => app.listening.resolveStart());
+  await flushApp();
+
+  expect(screen.queryByTestId("stop-circle")).toBeNull();
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  // The late microphone was handed back: nothing is listening, and no
+  // second request was made.
+  expect(app.listening.startCalls).toBe(1);
+  expect(app.listening.listening).toBe(false);
+});
+
 test("practice.session/REQ-014/S2 (card) — play along after a finished run is the play-along card", async () => {
   const app = renderLeadApp(
     storedCMajor(
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T029.md b/changes/008-learner-leads/tasks/C008_T029.md
index 0144799..9ad09ad 100644
--- a/changes/008-learner-leads/tasks/C008_T029.md
+++ b/changes/008-learner-leads/tasks/C008_T029.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T11:19:36Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T029
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015]
 sdd_depends_on: [C008_T026]
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 1"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T029 · A second tap while the microphone is being asked for stops the lead run (converge W5)
```

## Verdict

SPEC: PASS
QUALITY: PASS

Findings (none blocking):
- [minor] tests/practice/fakes.ts:301-326 - ripple outside the brief's Files list, declared in the report; there was no existing deferred start on FakeListening (only failWith), so the addition is needed and minimal. holdStart defaults false; the only users are the two new tests, so every other test keeps the old path.
- [minor] src/listening/published/index.ts (pre-existing, not this diff) - Listener.start() checks `graph !== null` only on entry. Tap, stop, tap again while the first getUserMedia is still pending gives two concurrent starts; if they resolve out of order, one graph can be overwritten and left open. Needs the permission prompt to be slow, and the diff makes the sequence a little easier to reach. Out of scope; note for notes.md.
- [minor] The UI test asserts startCalls 1 and listening false, not stopCalls. Right call; see (3).

Answers:
(1) W5 closed. Session test traces stop() (session.ts ~1703): leadGeneration bumped, listening.stop(), owner none, listening off, phase idle, wake lock released. The late resolve fails the `listeningOwner !== "lead" || generation` check, so no target, no TargetAdvanced, and the late stream is handed back. The UI test is RED without the condition (second tap hits start(), which startLead ignores via owner==="lead", and the run begins on resolve) and green with it.
(2) No false stops. snapshot.lead.listening is leadListeningState only (session.ts:1564), set to "starting" only in startLead (2259). The tuner has its own tunerListeningState / snapshot.tuner. After cannot-hear, leadListeningState is "cannot-hear" and owner is "none", so the retry tap calls start(). Every "starting" window has owner "lead" and the start circle shown, so a tap there means stop. setSettings with who changed stops first, so "starting" cannot persist in play-along.
(3) Benign idempotence, not a double release. stop() calls listening.stop() while the real adapter's start() is still awaiting getUserMedia, so graph is null and teardown() returns at once. When the stream arrives, start() sets graph and returns ok, the superseded branch calls listening.stop(), and teardown() releases it. The first call is a no-op, the second does the work, and the microphone is held only until the grant resolves. The fake counts both (2). The behavioural assertion is the right one.
(4) The fake is minimal: a flag, one stored resolver and resolveStart(). It follows the existing public-field style, and the default path is unchanged.
(5) Test names: the UI test cites practice.session/REQ-015/S2 (card). The session test is named as an edge case, the form its siblings use. Both go through the published Session interface or the DOM plus fakes, with no internals. check-contexts.sh: respected.

UNVERIFIED: none


<!-- recorded 2026-10-05T11:51:01Z by scripts/record.sh -->
