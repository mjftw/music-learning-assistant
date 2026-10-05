---
type: Task Review
title: Review package — C008_T010 · 008-learner-leads
description: The diff produced for C008_T010, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T010.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T010.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T010.md
  - resource: git:92de09dc2bd96480cd8ed7a5b3d91d36ff89499d..375ed4482ab324182024cecea3891d9fc5295ae3
generated:
  by: process:review-package.sh
  at: 2026-10-03T09:19:55Z
sdd_id: 008-learner-leads
---

# Review package — C008_T010 · 008-learner-leads

base: `92de09dc2bd96480cd8ed7a5b3d91d36ff89499d` → head: `375ed4482ab324182024cecea3891d9fc5295ae3`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-changes.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:19:55
   Duration  659ms (environment 45%, transform 35%, import 13%, tests 6%, worker 1%)

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
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
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
- A	tests/practice/scenarios/lead-changes.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index e4ebc59..c7ba83f 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1810,6 +1810,45 @@ export function createSession(
     })();
   }
 
+  // practice.session/REQ-019 — a key, variant, scale or traversal change
+  // mid-run restarts the lead run on the new sequence from its first note at
+  // once, still listening, with the hold at zero: `TargetAdvanced` emitted
+  // for the new first target, the smoothing reset, listening left entirely
+  // untouched (no stop/start of its own). A `complete` card clears to idle
+  // here too (REQ-015: "until … the mode, key, variant, scale or traversal
+  // changes") — folded into this one lead-aware branch (rather than its own
+  // `clearCompleteLeadCard()` called after `restartIfPlaying()`, T007's
+  // shape) because recomputeAndRetune() has already rebuilt `sequence` by
+  // the time this runs, so the new first target is read from the one fresh
+  // sequence rather than needing a second invalidateSnapshot() to undo a
+  // stale cache `restartIfPlaying()`'s own notifyChange() would otherwise
+  // have left behind.
+  function restartLeadIfRunning(): void {
+    if (leadPhase.kind === "complete") {
+      leadPhase = { kind: "idle" };
+      return;
+    }
+    if (leadPhase.kind !== "listening") return;
+    invalidateSnapshot();
+    leadSmoothing = initialSmoothingState;
+    cancelLeadTimers();
+    leadReading = null;
+    const target = targetAt(sequence, 1);
+    leadPhase = {
+      kind: "listening",
+      target,
+      hold: emptyHold,
+      mutedUntilMs: null,
+    };
+    const advancedEvent: TargetAdvanced = {
+      note: target.note,
+      position: 1,
+      length: sequence.length,
+      atFrame: listening.currentFrame(),
+    };
+    for (const listener of targetAdvancedListeners) listener(advancedEvent);
+  }
+
   function restartIfPlaying(): void {
     // practice.session/REQ-013 — a recompute (setContext/setTraversal/
     // setScaleChoice, all of which call this) can change what a run index
@@ -1817,6 +1856,7 @@ export function createSession(
     // — before the "only while playing" guard below, since a tap only ever
     // sounds while idle.
     endTapIfSounding();
+    restartLeadIfRunning();
     if (transport.kind !== "playing") return;
     invalidateSnapshot();
     // The superseded sequence's tones and clicks already posted inside the
@@ -1838,15 +1878,6 @@ export function createSession(
     scheduler.start(sound.currentFrame() + firstTickLeadFrames(), next);
   }
 
-  // practice.session/REQ-015 — a key, traversal or scale change clears a
-  // complete lead card back to idle (the complete card otherwise persists
-  // until the circle is tapped or the mode/key/variant/scale/traversal
-  // changes). A run still listening is restarted on the new sequence by
-  // REQ-019, not here.
-  function clearCompleteLeadCard(): void {
-    if (leadPhase.kind === "complete") leadPhase = { kind: "idle" };
-  }
-
   function setContext(newContext: SessionContext): void {
     invalidateSnapshot();
     currentContext = newContext;
@@ -1856,7 +1887,6 @@ export function createSession(
     // so there is nothing to re-sync here.
     recomputeAndRetune();
     restartIfPlaying();
-    clearCompleteLeadCard();
     invalidateSnapshot();
     notifyChange();
   }
@@ -1866,7 +1896,6 @@ export function createSession(
     currentTraversal = newTraversal;
     recomputeAndRetune();
     restartIfPlaying();
-    clearCompleteLeadCard();
     invalidateSnapshot();
     notifyChange();
   }
@@ -1876,7 +1905,6 @@ export function createSession(
     currentScaleChoice = choice;
     recomputeAndRetune();
     restartIfPlaying();
-    clearCompleteLeadCard();
     invalidateSnapshot();
     notifyChange();
   }
diff --git a/tests/practice/scenarios/lead-changes.test.ts b/tests/practice/scenarios/lead-changes.test.ts
new file mode 100644
index 0000000..545fae8
--- /dev/null
+++ b/tests/practice/scenarios/lead-changes.test.ts
@@ -0,0 +1,104 @@
+// practice.session/REQ-019 — changes while leading: a key/variant/scale/
+// traversal change restarts the lead run on the new sequence at position 1,
+// still listening, hold at zero; a tempo/Hold/In-tune change takes effect at
+// the next reading (the accumulated hold kept); a cue (cueMeter) applies at
+// once and is not a stop; the sheet opening/closing is not a stop either.
+import { expect, test } from "vitest";
+import type {
+  NoteJudged,
+  TargetAdvanced,
+} from "../../../src/practice/published";
+import { defaultScaleChoice } from "../../../src/practice/published";
+import { keyOf } from "../fakes";
+import {
+  hearAt,
+  hearSteady,
+  holdThrough,
+  leadFixture,
+  leadSettings,
+  startLead,
+} from "../lead-helpers";
+
+test("practice.session/REQ-019/S1 — a new key mid-run", async () => {
+  const f = leadFixture();
+  const advanced: TargetAdvanced[] = [];
+  f.session.onTargetAdvanced((e) => advanced.push(e));
+  await startLead(f.session);
+  holdThrough(f, 8);
+  expect(f.session.snapshot().lead.target?.position).toBe(9);
+  f.session.setContext({ ...f.context, key: keyOf("G") });
+  expect(f.session.snapshot().lead.target).toMatchObject({
+    position: 1,
+    note: { letter: "G", octave: 4 },
+  });
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+  expect(advanced.at(-1)).toMatchObject({
+    note: { letter: "G", octave: 4 },
+    position: 1,
+  });
+  expect(f.listening.stopCalls).toBe(0);
+  expect(f.listening.startCalls).toBe(1);
+});
+
+test("practice.session/REQ-019/S2 — a tighter tolerance mid-hold", async () => {
+  const f = leadFixture();
+  const judged: NoteJudged[] = [];
+  f.session.onNoteJudged((e) => judged.push(e));
+  await startLead(f.session);
+  const t0 = holdThrough(f, 2); // the target is E4
+  hearSteady(f, 331.15, t0, t0 + 600); // +8 ¢
+  expect(judged.at(-1)?.verdict).toBe("in-tune");
+  f.session.setSettings(leadSettings({ tolerance: "accurate" }));
+  hearAt(f, 331.15, t0 + 620);
+  expect(judged.at(-1)).toMatchObject({
+    target: { letter: "E" },
+    cents: 8,
+    verdict: "sharp",
+  });
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+  expect(f.listening.stopCalls).toBe(0);
+});
+
+test("practice.session/REQ-019/S3 — more beats mid-hold", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  const t0 = holdThrough(f, 2); // the target is E4
+  hearSteady(f, 330.6, t0, t0 + 900);
+  f.session.setSettings(leadSettings({ holdBeats: 4 }));
+  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 2500, 2);
+  expect(f.session.snapshot().lead.phase).toBe("listening");
+});
+
+test("practice.session/REQ-019/S4 — the sheet is not a stop (the session never sees the sheet; the verbs it calls never stop)", async () => {
+  const f = leadFixture();
+  const judged: NoteJudged[] = [];
+  f.session.onNoteJudged((e) => judged.push(e));
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 400);
+  f.session.setSettings(leadSettings({ cueMeter: false }));
+  f.session.setSettings(leadSettings({ cueMeter: true }));
+  hearSteady(f, 262.5, 410, 800);
+  expect(f.listening.stopCalls).toBe(0);
+  expect(judged.length).toBeGreaterThan(60);
+  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(800 / 1250, 1);
+});
+
+test("practice.session/REQ-019/S5 — a traversal change restarts", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1300);
+  expect(f.session.snapshot().lead.target?.position).toBe(2);
+  f.session.setTraversal({
+    direction: "up",
+    octaves: { kind: "count", count: 1 },
+    shape: "scale",
+  });
+  expect(f.session.snapshot().sequence).toHaveLength(8);
+  expect(f.session.snapshot().lead.target).toMatchObject({
+    position: 1,
+    note: { letter: "C", octave: 4 },
+  });
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+  f.session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
+  expect(f.session.snapshot().lead.target?.position).toBe(1);
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T010.md b/changes/008-learner-leads/tasks/C008_T010.md
index b6c137f..d86448f 100644
--- a/changes/008-learner-leads/tasks/C008_T010.md
+++ b/changes/008-learner-leads/tasks/C008_T010.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T010
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-019]
 sdd_depends_on: [C008_T005, C008_T009]
 sdd_parked_on: 
 sdd_group: "Phase 2 — The lead run in the Session aggregate"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T010 · Changes while leading
```

## Verdict

_The task reviewer appends its verdict here._
TASK: T010
SPEC: PASS
QUALITY: PASS
FINDINGS:
- none
UNVERIFIED:
- none

<!-- recorded 2026-10-03T09:21:53Z by scripts/record.sh -->
