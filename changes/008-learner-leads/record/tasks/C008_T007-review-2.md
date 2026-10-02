---
type: Task Review
title: Review package — C008_T007 · 008-learner-leads
description: The diff produced for C008_T007, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T007.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T007.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T007.md
  - resource: git:34f3be1c42f37a084aeec329cacc12921ea4cc0d..1e75085a0a1590dcd2ad30e57c84508e3e7b1e00
  - resource: /changes/008-learner-leads/record/tasks/C008_T007-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-02T21:40:04Z
sdd_id: 008-learner-leads
---

# Review package — C008_T007 · 008-learner-leads

base: `34f3be1c42f37a084aeec329cacc12921ea4cc0d` → head: `1e75085a0a1590dcd2ad30e57c84508e3e7b1e00`

**Incremental review.** The previous attempt (head `80d99d2558e0dc7ff609a0573ce12a3d403356d7`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict


TASK: C008_T007
SPEC: FAIL
QUALITY: SKIPPED (spec failed)
FINDINGS:
- [critical] src/practice/domain/session.ts:1794-1820 (setContext/setTraversal/setScaleChoice) — the brief's Produces list requires "`setContext`/`setTraversal`/`setScaleChoice` from `complete` → `idle`" — i.e. a key/variant/scale/traversal change clears a complete lead card back to idle (also the Files list: "Modify: `src/practice/domain/session.ts` … a key/traversal change clears a complete card"). None of these three setters touch `leadPhase` at all; `restartIfPlaying()` (which they all call) only acts when `transport.kind === "playing"`, which never holds for a lead run (lead state lives in `leadPhase`, not `transport`). Confirmed empirically: built a throwaway test driving `leadFixture` to `complete` via `holdThrough(f, 15)` then calling `session.setTraversal(...)` — `snapshot().lead.phase` stayed `"complete"` instead of becoming `"idle"`. No test anywhere (lead-run.test.ts, target-in-sequence.test.ts, or elsewhere) exercises this transition, so the gap was never caught; the implementer's claim that "the Produces behaviour … was all already present and correct" is incorrect for this one item.
UNVERIFIED:
- practice.session/REQ-015 (the rest of the Produces list: listening.stop(), listeningOwner = "none", wake lock release, completeCaption, target null, start() from complete restarting at position 1) — covered directly by the S3/S4 tests added in this diff; not unverified.
COMMANDS:
pnpm vitest run tests/practice/scenarios/__gap-check.test.ts (throwaway, removed after use) — last line: "AssertionError: expected 'complete' to be 'idle'" confirming setTraversal does not clear a complete lead card


## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-run.test.ts tests/practice/invariants/target-in-sequence.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  22:40:05
   Duration  4.91s (tests 78%, environment 11%, transform 8%, import 3%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test click::tests::accent_is_louder_and_lower ... ok
test click::tests::click_lasts_25_ms ... ok
test drone::tests::reed_drone_render_cost ... ignored
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
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

## Files changed

- M	src/practice/domain/session.ts
- M	tests/practice/invariants/target-in-sequence.test.ts
- M	tests/practice/scenarios/lead-run.test.ts

## Diff since the previous attempt (`80d99d2558e0dc7ff609a0573ce12a3d403356d7` → head)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index ad309bd..f470990 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1791,6 +1791,15 @@ export function createSession(
     scheduler.start(sound.currentFrame() + firstTickLeadFrames(), next);
   }
 
+  // practice.session/REQ-015 — a key, traversal or scale change clears a
+  // complete lead card back to idle (the complete card otherwise persists
+  // until the circle is tapped or the mode/key/variant/scale/traversal
+  // changes). A run still listening is restarted on the new sequence by
+  // REQ-019, not here.
+  function clearCompleteLeadCard(): void {
+    if (leadPhase.kind === "complete") leadPhase = { kind: "idle" };
+  }
+
   function setContext(newContext: SessionContext): void {
     invalidateSnapshot();
     currentContext = newContext;
@@ -1800,6 +1809,8 @@ export function createSession(
     // so there is nothing to re-sync here.
     recomputeAndRetune();
     restartIfPlaying();
+    clearCompleteLeadCard();
+    invalidateSnapshot();
     notifyChange();
   }
 
@@ -1808,6 +1819,8 @@ export function createSession(
     currentTraversal = newTraversal;
     recomputeAndRetune();
     restartIfPlaying();
+    clearCompleteLeadCard();
+    invalidateSnapshot();
     notifyChange();
   }
 
@@ -1816,6 +1829,8 @@ export function createSession(
     currentScaleChoice = choice;
     recomputeAndRetune();
     restartIfPlaying();
+    clearCompleteLeadCard();
+    invalidateSnapshot();
     notifyChange();
   }
 
diff --git a/tests/practice/scenarios/lead-run.test.ts b/tests/practice/scenarios/lead-run.test.ts
index 083eea3..97efd67 100644
--- a/tests/practice/scenarios/lead-run.test.ts
+++ b/tests/practice/scenarios/lead-run.test.ts
@@ -11,6 +11,7 @@ import {
   holdThrough,
   leadFixture,
   leadSettings,
+  oneOctaveUpdown,
   startLead,
 } from "../lead-helpers";
 import {
@@ -151,6 +152,32 @@ test("practice.session/REQ-015/S4 — the last note held, loop on", async () =>
   expect(f.session.snapshot().lead.completeCaption).toBeNull();
 });
 
+test("practice.session/REQ-015 — a key, traversal or scale change from complete returns to idle", async () => {
+  const f = leadFixture({ ...leadSettings(), loop: false });
+  await startLead(f.session);
+  holdThrough(f, 15);
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+
+  f.session.setContext({ ...f.context, key: keyOf("G") });
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.completeCaption).toBeNull();
+  expect(f.session.snapshot().lead.target).toBeNull();
+
+  await startLead(f.session);
+  holdThrough(f, 15);
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+  f.session.setTraversal({ ...oneOctaveUpdown, direction: "up" });
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.completeCaption).toBeNull();
+
+  await startLead(f.session);
+  holdThrough(f, 8);
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+  f.session.setScaleChoice(defaultScaleChoice);
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.completeCaption).toBeNull();
+});
+
 test("practice.session/REQ-015/S8 — no notes, no run", async () => {
   const f = sessionWithEmptyRun();
   expect(f.session.snapshot().run).toHaveLength(0);
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T007.md b/changes/008-learner-leads/tasks/C008_T007.md
index d719c67..f07c89a 100644
--- a/changes/008-learner-leads/tasks/C008_T007.md
+++ b/changes/008-learner-leads/tasks/C008_T007.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T007
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015]
 sdd_depends_on: [C008_T005, C008_T006]
 sdd_parked_on: 
 sdd_group: "Phase 2 — The lead run in the Session aggregate"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T007 · Complete, loop, and the target-in-sequence invariant for a lead run
```

## Verdict

_The task reviewer appends its verdict here._

TASK: C008_T007
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] src/practice/domain/session.ts:1803-1835 (setContext/setTraversal/setScaleChoice) — the smallest correct fix was to call `clearCompleteLeadCard()` before `restartIfPlaying()` (which calls `endTapIfSounding()` → `notifyChange()`, caching a snapshot and firing any subscribed change listener while `leadPhase` is still `"complete"`). Instead the fixer added a second `invalidateSnapshot()` after `clearCompleteLeadCard()` in all three setters, which fixes the value `session.snapshot()` returns once the call has returned (what the new test checks) but does not stop the intermediate `notifyChange()` inside `restartIfPlaying()` from firing a change listener with the stale "complete" snapshot mid-call, a brief flicker the reorder would have avoided for the same one-line cost. Not blocking: no test observes a change-listener's intermediate value here, Produces only specifies the eventual `idle` state, and the pattern (several `notifyChange()` calls per operation) is pre-existing elsewhere in this file.
UNVERIFIED:
- practice.session/REQ-019 (restart on new sequence while a lead run is listening, not complete) — out of scope for this task (T010 per the brief/plan); `clearCompleteLeadCard()` is correctly guarded to `leadPhase.kind === "complete"` only, so the "listening" branch is untouched by this diff, but REQ-019's own behaviour lives entirely outside this task's files.
COMMANDS:
package only

<!-- recorded 2026-10-02T21:42:36Z by scripts/record.sh -->
