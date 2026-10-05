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
  - resource: git:34f3be1c42f37a084aeec329cacc12921ea4cc0d..80d99d2558e0dc7ff609a0573ce12a3d403356d7
generated:
  by: process:review-package.sh
  at: 2026-10-02T21:32:26Z
sdd_id: 008-learner-leads
---

# Review package — C008_T007 · 008-learner-leads

base: `34f3be1c42f37a084aeec329cacc12921ea4cc0d` → head: `80d99d2558e0dc7ff609a0573ce12a3d403356d7`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-run.test.ts tests/practice/invariants/target-in-sequence.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  22:32:26
   Duration  5.11s (tests 78%, environment 12%, transform 7%, import 3%)

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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
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

- M	tests/practice/invariants/target-in-sequence.test.ts
- M	tests/practice/scenarios/lead-run.test.ts

## Diff

```diff
diff --git a/tests/practice/invariants/target-in-sequence.test.ts b/tests/practice/invariants/target-in-sequence.test.ts
index ae91ec6..0434736 100644
--- a/tests/practice/invariants/target-in-sequence.test.ts
+++ b/tests/practice/invariants/target-in-sequence.test.ts
@@ -32,7 +32,9 @@ import {
   FakeSound,
   FakeVisibility,
   FakeWakeLock,
+  type SessionFixture,
 } from "../fakes";
+import { holdThrough, leadSettings } from "../lead-helpers";
 
 const SHAPES: readonly Shape[] = ["scale", "arpeggio"];
 const DIRECTIONS: readonly Direction[] = ["up", "down", "updown"];
@@ -127,3 +129,88 @@ test("practice.session/REQ-006/S5 — the target is always in the sequence (inva
 
   expect(count).toBeGreaterThan(1000);
 }, 20_000);
+
+// practice.session/REQ-015 — every TargetAdvanced of a lead run is a member
+// of the sequence at its position (loop wrap included): the play-along
+// enumeration above gains its lead-run twin — every catalogued variant × the
+// twelve majors × the three directions × 1 oct and full — holding through
+// length + 1 targets so the wrap past the last note is covered too.
+test("practice.session/REQ-015 — every TargetAdvanced of a lead run is a member of the sequence at its position (loop wrap included)", async () => {
+  const majors: readonly Key[] = circleOfFifths().flatMap(
+    (position) => position.majors,
+  );
+  const variants: readonly Variant[] = builtInCatalogue().instruments.flatMap(
+    (instrument) => instrument.variants,
+  );
+  const fittingScale = scaleById("major");
+
+  let count = 0;
+
+  for (const key of majors) {
+    for (const variant of variants) {
+      const octaveChoices: readonly Octaves[] = [
+        ...fittingOctaveCounts(key, variant, fittingScale).map(
+          (octaveCount): Octaves => ({ kind: "count", count: octaveCount }),
+        ),
+        { kind: "full" },
+      ];
+
+      for (const octaves of octaveChoices) {
+        for (const direction of DIRECTIONS) {
+          count += 1;
+
+          const traversal = { direction, octaves, shape: "scale" as Shape };
+          const sound = new FakeSound();
+          const clock = new FakeClock(sound);
+          const wake = new FakeWakeLock();
+          const visibility = new FakeVisibility();
+          const listening = new FakeListening();
+          const context = { key, variant, spelling: "sharp" as const };
+          const session = createSession(
+            context,
+            traversal,
+            { major: fittingScale.id, minor: fittingScale.id },
+            leadSettings({}, { ...defaultSessionSettings, loop: true }),
+            defaultDroneSettings,
+            { sound, clock, wakeLock: wake, visibility, listening },
+          );
+
+          const events: TargetAdvanced[] = [];
+          session.onTargetAdvanced((event) => events.push(event));
+
+          const fixture: SessionFixture = {
+            session,
+            sound,
+            clock,
+            wake,
+            visibility,
+            listening,
+            context,
+          };
+
+          session.start();
+          await Promise.resolve();
+          await Promise.resolve();
+
+          const sequence = session.snapshot().sequence;
+          if (sequence.length > 0) holdThrough(fixture, sequence.length + 1);
+
+          // session.start() itself emits the first target (position 1);
+          // holdThrough(length + 1) then emits one more advance per target
+          // held, including the loop wrap past the last note — length + 2
+          // events in total.
+          expect(events).toHaveLength(sequence.length + 2);
+          for (const event of events) {
+            expect(event.position).toBeGreaterThanOrEqual(1);
+            expect(event.position).toBeLessThanOrEqual(sequence.length);
+            expect(event.note).toEqual(sequence[event.position - 1]!.note);
+          }
+
+          session.dispose();
+        }
+      }
+    }
+  }
+
+  expect(count).toBeGreaterThan(50);
+}, 20_000);
diff --git a/tests/practice/scenarios/lead-run.test.ts b/tests/practice/scenarios/lead-run.test.ts
index c84d0d1..083eea3 100644
--- a/tests/practice/scenarios/lead-run.test.ts
+++ b/tests/practice/scenarios/lead-run.test.ts
@@ -7,7 +7,12 @@ import {
   type TargetAdvanced,
 } from "../../../src/practice/published";
 import type { Variant, VariantId } from "../../../src/theory/published";
-import { leadFixture, leadSettings, startLead } from "../lead-helpers";
+import {
+  holdThrough,
+  leadFixture,
+  leadSettings,
+  startLead,
+} from "../lead-helpers";
 import {
   FakeClock,
   FakeListening,
@@ -108,6 +113,44 @@ function sessionWithEmptyRun(): SessionFixture {
   return { session, sound, clock, wake, visibility, listening, context };
 }
 
+test("practice.session/REQ-015/S3 — the last note held, loop off", async () => {
+  const f = leadFixture({ ...leadSettings(), loop: false });
+  const advanced: TargetAdvanced[] = [];
+  f.session.onTargetAdvanced((e) => advanced.push(e));
+  await startLead(f.session);
+  holdThrough(f, 15);
+  const s = f.session.snapshot();
+  expect(s.lead.phase).toBe("complete");
+  expect(s.lead.completeCaption).toBe("15 of 15 held · C4–C5");
+  expect(s.lead.target).toBeNull();
+  expect(f.listening.stopCalls).toBe(1);
+  expect(f.wake.acquired).toBe(false);
+  expect(advanced).toHaveLength(15);
+  await startLead(f.session);
+  expect(f.session.snapshot().lead.target?.position).toBe(1);
+  expect(f.listening.startCalls).toBe(2);
+});
+
+test("practice.session/REQ-015/S4 — the last note held, loop on", async () => {
+  const f = leadFixture();
+  const advanced: TargetAdvanced[] = [];
+  f.session.onTargetAdvanced((e) => advanced.push(e));
+  await startLead(f.session);
+  holdThrough(f, 15);
+  expect(f.session.snapshot().lead.phase).toBe("listening");
+  expect(f.session.snapshot().lead.target).toMatchObject({
+    position: 1,
+    note: { letter: "C", octave: 4 },
+  });
+  expect(advanced).toHaveLength(16);
+  expect(advanced[15]).toMatchObject({
+    position: 1,
+    note: { letter: "C", octave: 4 },
+  });
+  expect(f.listening.stopCalls).toBe(0);
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
SPEC: FAIL
QUALITY: SKIPPED (spec failed)
FINDINGS:
- [critical] src/practice/domain/session.ts:1794-1820 (setContext/setTraversal/setScaleChoice) — the brief's Produces list requires "`setContext`/`setTraversal`/`setScaleChoice` from `complete` → `idle`" — i.e. a key/variant/scale/traversal change clears a complete lead card back to idle (also the Files list: "Modify: `src/practice/domain/session.ts` … a key/traversal change clears a complete card"). None of these three setters touch `leadPhase` at all; `restartIfPlaying()` (which they all call) only acts when `transport.kind === "playing"`, which never holds for a lead run (lead state lives in `leadPhase`, not `transport`). Confirmed empirically: built a throwaway test driving `leadFixture` to `complete` via `holdThrough(f, 15)` then calling `session.setTraversal(...)` — `snapshot().lead.phase` stayed `"complete"` instead of becoming `"idle"`. No test anywhere (lead-run.test.ts, target-in-sequence.test.ts, or elsewhere) exercises this transition, so the gap was never caught; the implementer's claim that "the Produces behaviour … was all already present and correct" is incorrect for this one item.
UNVERIFIED:
- practice.session/REQ-015 (the rest of the Produces list: listening.stop(), listeningOwner = "none", wake lock release, completeCaption, target null, start() from complete restarting at position 1) — covered directly by the S3/S4 tests added in this diff; not unverified.
COMMANDS:
pnpm vitest run tests/practice/scenarios/__gap-check.test.ts (throwaway, removed after use) — last line: "AssertionError: expected 'complete' to be 'idle'" confirming setTraversal does not clear a complete lead card

<!-- recorded 2026-10-02T21:34:49Z by scripts/record.sh -->
