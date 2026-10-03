---
type: Task Review
title: Review package — C008_T008 · 008-learner-leads
description: The diff produced for C008_T008, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T008.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T008.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T008.md
  - resource: git:c381d8cf9c857306e3e153849d4b7944a6588adc..b3cefeb8d8dca2eece5b0633ac74d7869638b2cd
generated:
  by: process:review-package.sh
  at: 2026-10-02T21:52:34Z
sdd_id: 008-learner-leads
---

# Review package — C008_T008 · 008-learner-leads

base: `c381d8cf9c857306e3e153849d4b7944a6588adc` → head: `b3cefeb8d8dca2eece5b0633ac74d7869638b2cd`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/invariants/never-both.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:52:34
   Duration  4.38s (tests 85%, environment 7%, transform 6%, import 2%)

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
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
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

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.09s

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
- M	tests/practice/invariants/never-both.test.ts
- M	tests/practice/scenarios/lead-run.test.ts
- M	tests/practice/scenarios/session-tap.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index f470990..719dffd 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1417,17 +1417,13 @@ export function createSession(
     // (before this function's own await below), so it lands at this exact
     // frame; the first tick's lead then carries the drone's own release time
     // on top, so the click or note never sounds until the drone has
-    // actually faded to silence.
-    const droneWasOn = droneOn;
-    // Bumped unconditionally — even a startDrone() that is only still
-    // pending (droneOn still false, awaiting sound.start()/wakeLock.acquire())
-    // must be superseded the instant ▶ is tapped, or its continuation would
-    // pass its own generation check and post a drone under a run already in
-    // progress (T022). stopDrone() below bumps it again when the drone was
-    // actually on; a second bump there is harmless — only inequality with
-    // startedAtGeneration is ever tested.
-    droneGeneration += 1;
-    if (droneWasOn) stopDrone();
+    // actually faded to silence. stopAnyRun() also bumps droneGeneration
+    // unconditionally — even a startDrone() that is only still pending
+    // (droneOn still false, awaiting sound.start()/wakeLock.acquire()) must
+    // be superseded the instant ▶ is tapped, or its continuation would pass
+    // its own generation check and post a drone under a run already in
+    // progress (T022).
+    const droneWasOn = stopAnyRun();
     invalidateSnapshot();
     notice = null;
     cancelIdleTimer(); // Cancel any pending idle timer from the previous run
@@ -1511,6 +1507,33 @@ export function createSession(
     notifyChange();
   }
 
+  // practice.drone/REQ-004, practice.tuner/REQ-001, practice.session/REQ-015
+  // — the guard startDrone(), enterTuner() and start()-as-tool all open
+  // with: stop whatever is currently sounding or listening — playback
+  // (❚❚/■), the drone, or a lead run (■) — before beginning the new one, so
+  // the "never both" invariant holds across every way in. Returns whether
+  // the drone was on, since start()-as-tool needs that to compute the
+  // drone's own release delay before its first tick.
+  function stopAnyRun(): boolean {
+    const droneWasOn = droneOn;
+    // Bumped unconditionally, before stopDrone() — a startDrone() that is
+    // only still pending (droneOn still false, awaiting
+    // sound.start()/wakeLock.acquire()) must be superseded too, or its
+    // continuation would post a drone under whatever is starting now (T022;
+    // mirrors enterTuner()'s own unconditional bump, and the open note from
+    // T005 that startLead() needed the same for its own drone-goes-first
+    // guard).
+    droneGeneration += 1;
+    if (droneWasOn) stopDrone();
+    // practice.session/REQ-015/S5, S7 — a lead run in progress, or still
+    // requesting the microphone (listeningOwner is set synchronously,
+    // before either of its own awaits), ends the same way ■ ends it.
+    if (listeningOwner === "lead") stop();
+    // Playback in progress ends the same way ❚❚/■ ends it too.
+    if (transport.kind !== "idle") stop();
+    return droneWasOn;
+  }
+
   // practice.drone/REQ-001, REQ-004, REQ-008 — mirrors start()'s
   // sound.start() handling, but stays off on failure rather than proceeding
   // regardless: there is no walk-through to get stuck, so nothing is gained
@@ -1530,7 +1553,9 @@ export function createSession(
     // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
     if (tunerActive) return;
     if (droneOn) return;
-    if (transport.kind !== "idle") stop();
+    // practice.session/REQ-015/S5 — the drone switched on during a lead run
+    // stops it first (idle, the microphone released), then sounds.
+    stopAnyRun();
     invalidateSnapshot();
     // practice.drone/REQ-008/S2 — a retry clears the stale notice up front,
     // mirroring start(): a successful sound.start() below never re-sets it,
@@ -1677,6 +1702,9 @@ export function createSession(
     // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
     if (tunerActive) return;
     if (transport.kind !== "idle") return;
+    // practice.session/REQ-013/S5 — a lead run in progress (listening, or
+    // still requesting the microphone) ignores a tap too.
+    if (listeningOwner === "lead") return;
     const target = run[runIndex];
     if (target === undefined) return;
 
@@ -1934,6 +1962,22 @@ export function createSession(
   function startLead(): void {
     if (sequence.length === 0) return;
     if (listeningOwner === "lead") return;
+    // practice.session/REQ-015/S6 — "no sequence note, click, drone or
+    // tapped note" sounds while a lead run is in progress: a tap only ever
+    // sounds while idle, which a lead run starting from idle does not by
+    // itself end — found by this task's widened never-both enumeration
+    // (tapNote → start-as-me). Bumping tapGeneration too supersedes a tap
+    // still only pending (awaiting sound.start()), the same reasoning as
+    // enterTuner()'s own bump.
+    endTapIfSounding();
+    tapGeneration += 1;
+    // practice.session/REQ-015/S5 — the drone goes first: bumped
+    // unconditionally, before the conditional stopDrone() — mirrors
+    // stopAnyRun()'s own unconditional bump (the open note from T005): a
+    // startDrone() that is only still pending (droneOn still false,
+    // awaiting sound.start()/wakeLock.acquire()) must be superseded too, or
+    // its continuation would post a drone under the lead run just starting.
+    droneGeneration += 1;
     if (droneOn) stopDrone();
     invalidateSnapshot();
     listeningOwner = "lead";
@@ -2023,18 +2067,17 @@ export function createSession(
     // tapGeneration above).
     endTapIfSounding();
     tapGeneration += 1;
-    if (transport.kind !== "idle") stop();
-    // Bumped unconditionally — mirrors start()'s own T022 fix: a
-    // startDrone() that is only still pending (droneOn still false,
-    // awaiting sound.start()/wakeLock.acquire()) is not caught by the
-    // `if (droneOn) stopDrone()` below, since droneOn only flips true once
-    // that call's own post lands; without this, its continuation would
-    // pass its own generation check and post a drone after tunerActive is
-    // already true (found by T013's widened never-both enumeration:
-    // droneOnPending → enterTuner). stopDrone() below bumps it again when
-    // the drone was actually on; a second bump there is harmless.
-    droneGeneration += 1;
-    if (droneOn) stopDrone();
+    // practice.session/REQ-015/S7 — the Tuner pill ends a lead run first,
+    // the same way ■ does; stopAnyRun() also bumps droneGeneration
+    // unconditionally — mirrors start()'s own T022 fix: a startDrone() that
+    // is only still pending (droneOn still false, awaiting
+    // sound.start()/wakeLock.acquire()) is not caught by a plain
+    // `if (droneOn) stopDrone()`, since droneOn only flips true once that
+    // call's own post lands; without the unconditional bump, its
+    // continuation would pass its own generation check and post a drone
+    // after tunerActive is already true (found by T013's widened
+    // never-both enumeration: droneOnPending → enterTuner).
+    stopAnyRun();
     invalidateSnapshot();
     tunerActive = true;
     listeningOwner = "tuner";
@@ -2056,6 +2099,15 @@ export function createSession(
   // continuation cannot overwrite the "off" state this sets with a stale
   // "listening"/"cannot-hear" once it resolves.
   function leaveTuner(): void {
+    // practice.session/REQ-015/S6 — a no-op unless the tuner is actually
+    // active: without this, leaveTuner() called while a lead run owns
+    // listening (never reachable from the UI — entering the tuner always
+    // stops a lead run first, REQ-015/S7 — but found by this task's
+    // widened never-both enumeration: start-as-me → leaveTuner → droneOn)
+    // would clobber `listeningOwner` back to "none" out from under the
+    // still-"listening" lead run, letting startDrone()'s stopAnyRun() guard
+    // (which checks `listeningOwner === "lead"`) miss it entirely.
+    if (!tunerActive) return;
     invalidateSnapshot();
     tunerGeneration += 1;
     listening.stop();
diff --git a/tests/practice/invariants/never-both.test.ts b/tests/practice/invariants/never-both.test.ts
index 70284b9..27a5361 100644
--- a/tests/practice/invariants/never-both.test.ts
+++ b/tests/practice/invariants/never-both.test.ts
@@ -24,6 +24,7 @@ import {
   sessionOn,
   startDroneAndFlush,
 } from "../fakes";
+import { leadSettings } from "../lead-helpers";
 
 type Action =
   | "play"
@@ -34,7 +35,9 @@ type Action =
   | "enterTuner"
   | "leaveTuner"
   | "tapNote"
-  | "tapNotePending";
+  | "tapNotePending"
+  | "start-as-me"
+  | "stop-lead";
 const ACTIONS: readonly Action[] = [
   "play",
   "pause",
@@ -45,6 +48,8 @@ const ACTIONS: readonly Action[] = [
   "leaveTuner",
   "tapNote",
   "tapNotePending",
+  "start-as-me",
+  "stop-lead",
 ];
 const GAP_MS = 300;
 const CLICK_MS = 25;
@@ -165,6 +170,24 @@ async function apply(session: Session, action: Action): Promise<void> {
       // in between has already run synchronously.
       session.tapNote(0);
       return;
+    case "start-as-me":
+      // practice.session/REQ-015 — selects "I lead" and taps the start
+      // circle; mirrors flushStart's two-flush shape (requestListening's
+      // own wakeLock.acquire() then listening.start(), the same chain
+      // depth as sound.start() then wakeLock.acquire() above).
+      session.setSettings(leadSettings());
+      session.start();
+      await Promise.resolve();
+      await Promise.resolve();
+      return;
+    case "stop-lead":
+      // practice.session/REQ-015/S2 — ■ while leading; session.stop()
+      // dispatches on listeningOwner the same way it dispatches on the
+      // transport for "pause" above.
+      session.stop();
+      await Promise.resolve();
+      await Promise.resolve();
+      return;
   }
 }
 
@@ -351,6 +374,71 @@ test(
   TEST_TIMEOUT_MS,
 );
 
+test(
+  "practice.session/REQ-015/S6 — nothing sounds while leading (invariant)",
+  async () => {
+    let checked = 0;
+    for (let length = 1; length <= 4; length += 1)
+      for (const sequence of sequences(length)) {
+        const { session, sound, clock } = sessionOn(
+          "G",
+          "flute-concert",
+          defaultTraversal,
+          { ...defaultSessionSettings, countIn: false },
+        );
+        for (const action of sequence) {
+          // tapNotePending must never itself be awaited — see its comment
+          // in apply() above.
+          if (action === "tapNotePending") void apply(session, action);
+          else await apply(session, action);
+          if (session.snapshot().lead.phase === "listening") {
+            // REQ-015/S5 grants the drone up to DRONE_RELEASE_MS (80 ms)
+            // and playback its own stop-fade to fall silent as *part of*
+            // the run starting — wait that out before judging "still
+            // sounding", mirroring the tuner invariant below.
+            clock.advance(DRONE_RELEASE_MS);
+            const liveAt = sound.frame;
+            expect(
+              liveVoicesAt(sound, liveAt).filter(
+                (v) =>
+                  isTone(v.command) || isClick(v.command) || isDrone(v.command),
+              ),
+              `sounding while leading in ${sequence.join(" → ")}`,
+            ).toEqual([]);
+            expect(session.snapshot().drone.on).toBe(false);
+          }
+          clock.advance(GAP_MS);
+        }
+        // As above — settle a trailing droneOnPending/enterTuner/start-as-me
+        // before the final check, so a post it makes only once flushed is
+        // not missed.
+        await Promise.resolve();
+        await Promise.resolve();
+        clock.advance(2000);
+        if (session.snapshot().lead.phase === "listening") {
+          const liveAt = sound.frame;
+          expect(
+            liveVoicesAt(sound, liveAt).filter(
+              (v) =>
+                isTone(v.command) || isClick(v.command) || isDrone(v.command),
+            ),
+            `sounding while leading after ${sequence.join(" → ")}`,
+          ).toEqual([]);
+          expect(session.snapshot().drone.on).toBe(false);
+        }
+        session.dispose();
+        checked += 1;
+      }
+    expect(checked).toBe(
+      ACTIONS.length +
+        ACTIONS.length ** 2 +
+        ACTIONS.length ** 3 +
+        ACTIONS.length ** 4,
+    );
+  },
+  TEST_TIMEOUT_MS,
+);
+
 test(
   "practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant)",
   async () => {
diff --git a/tests/practice/scenarios/lead-run.test.ts b/tests/practice/scenarios/lead-run.test.ts
index 97efd67..4572087 100644
--- a/tests/practice/scenarios/lead-run.test.ts
+++ b/tests/practice/scenarios/lead-run.test.ts
@@ -20,9 +20,12 @@ import {
   FakeSound,
   FakeVisibility,
   FakeWakeLock,
+  isStop,
   keyOf,
+  startDroneAndFlush,
   type SessionFixture,
 } from "../fakes";
+import { enter } from "../tuner-helpers";
 
 test("practice.session/REQ-015/S1 — the run starts on the first note", async () => {
   const f = leadFixture();
@@ -185,3 +188,36 @@ test("practice.session/REQ-015/S8 — no notes, no run", async () => {
   expect(f.listening.startCalls).toBe(0);
   expect(f.session.snapshot().lead.phase).toBe("idle");
 });
+
+test("practice.session/REQ-015/S5 — the drone goes first", async () => {
+  const f = leadFixture();
+  await startDroneAndFlush(f.session);
+  expect(f.session.snapshot().drone.on).toBe(true);
+  await startLead(f.session);
+  const droneStopIndex = f.sound.posts.findIndex(
+    (p) => isStop(p.command) && p.command.tag >= 3_000_000,
+  );
+  expect(droneStopIndex).toBeGreaterThanOrEqual(0);
+  expect(f.session.snapshot().drone.on).toBe(false);
+  expect(f.session.snapshot().lead.phase).toBe("listening");
+  const g = leadFixture();
+  await startLead(g.session);
+  await startDroneAndFlush(g.session);
+  expect(g.listening.stopCalls).toBe(1);
+  expect(g.session.snapshot().lead.phase).toBe("idle");
+  expect(g.session.snapshot().drone.on).toBe(true);
+});
+
+test("practice.session/REQ-015/S7 — the Tuner pill ends the run", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  await enter(f.session);
+  expect(f.listening.stopCalls).toBe(1);
+  expect(f.listening.startCalls).toBe(2);
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().tuner.active).toBe(true);
+  f.session.leaveTuner();
+  expect(f.session.snapshot().lead.idleCaption).toBe(
+    "hold 2 beats · medium tuning",
+  );
+});
diff --git a/tests/practice/scenarios/session-tap.test.ts b/tests/practice/scenarios/session-tap.test.ts
index 117a7c0..c9572ad 100644
--- a/tests/practice/scenarios/session-tap.test.ts
+++ b/tests/practice/scenarios/session-tap.test.ts
@@ -10,6 +10,7 @@ import {
   sessionOn,
   startDroneAndFlush,
 } from "../fakes";
+import { leadFixture, startLead } from "../lead-helpers";
 
 const GMajorTwoOctaves: Traversal = {
   direction: "updown",
@@ -120,3 +121,28 @@ test("practice.session/REQ-013/S5 — ignored while playing or counting", async
   expect(sound.posted.filter(isTone).length).toBe(duringRun);
   expect(session.snapshot().tappedRunIndex).toBeNull();
 });
+
+test("practice.session/REQ-013/S5 — ignored while leading", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  f.session.tapNote(3);
+  await Promise.resolve();
+  await Promise.resolve();
+  expect(f.sound.posted.filter(isTone)).toEqual([]);
+  expect(f.session.snapshot().tappedRunIndex).toBeNull();
+  expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
+});
+
+test("practice.session/REQ-013/S7 — idle in I lead, too", async () => {
+  const f = leadFixture();
+  f.session.tapNote(2); // E4
+  await Promise.resolve();
+  await Promise.resolve();
+  const tone = f.sound.posted.find(isTone)!;
+  expect(tone.hz).toBeCloseTo(329.63, 1);
+  expect(tone.durationFrames).toBe(Math.round((625 / 1000) * 48000));
+  expect(f.session.snapshot().lead.idleCaption).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  expect(f.listening.startCalls).toBe(0);
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T008.md b/changes/008-learner-leads/tasks/C008_T008.md
index a7071ff..efa6b1a 100644
--- a/changes/008-learner-leads/tasks/C008_T008.md
+++ b/changes/008-learner-leads/tasks/C008_T008.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T008
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015, practice.session/REQ-013]
 sdd_depends_on: [C008_T005, C008_T007]
 sdd_parked_on: 
 sdd_group: "Phase 2 — The lead run in the Session aggregate"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T008 · The exclusions: the drone both ways, the Tuner pill, tapped notes; never-both widened
```

## Verdict

_The task reviewer appends its verdict here._
TASK: C008_T008
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/practice/invariants/never-both.test.ts:390-443 — the new REQ-015/S6 invariant test body is a near-verbatim copy of the pre-existing REQ-001/S3 (tuner) invariant test just below it; a shared helper (sequence enumeration + "settle, advance, assert no live voices" body parameterised by the phase predicate) would remove the duplication, but this mirrors a duplication pattern the file already had before this task (drone-vs-tuner), so it is not new to this diff.
UNVERIFIED:
- none
COMMANDS:
./scripts/check-contexts.sh — "✅ context boundaries respected"

<!-- recorded 2026-10-03T09:01:41Z by scripts/record.sh -->
