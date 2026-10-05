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
  - resource: git:0c150dd1ee6808153afae0c8eb6902c1fd072ed3..c28290a106a3bef1ee0dea51e103be506654b0cf
generated:
  by: process:review-package.sh
  at: 2026-10-04T09:42:11Z
sdd_id: 008-learner-leads
---

# Review package — C008_T021 · 008-learner-leads

base: `0c150dd1ee6808153afae0c8eb6902c1fd072ed3` → head: `c28290a106a3bef1ee0dea51e103be506654b0cf`

## Commands (run by this script)

### Verify

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
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
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

### check

`pnpm check`

```

> music-learning-assistant@0.0.0 check /home/merlin/projects/music-learning-assistant
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 ❯ tests/ui/scenarios/app-drone.test.tsx (8 tests | 1 failed) 15802ms
   × practice.drone/REQ-001/S4 (app) — sheets, the drawer and the picker never stop it 5113ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/ui/scenarios/app-drone.test.tsx > practice.drone/REQ-001/S4 (app) — sheets, the drawer and the picker never stop it
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/ui/scenarios/app-drone.test.tsx:101:1
     99| });
    100|
    101| test("practice.drone/REQ-001/S4 (app) — sheets, the drawer and the pic…
       | ^
    102|   localStorage.clear();
    103|   const { sessionDeps, sound } = sessionDepsWithFakes();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 92 passed (93)
      Tests  1 failed | 453 passed (454)
   Start at  10:43:13
   Duration  22.89s (tests 59%, environment 27%, import 8%, transform 6%)

Environment  jsdom was created 93 times · 96.27s total, 27% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

 ELIFECYCLE  Command failed with exit code 1.
```

exit status: 1 ❌

## Files changed

- M	scripts/timing-test.mjs
- M	src/practice/domain/session.ts
- M	tests/practice/lead-helpers.ts
- A	tests/practice/scenarios/lead-edge-cases.test.ts
- M	tests/practice/scenarios/lead-run.test.ts

## Diff

```diff
diff --git a/scripts/timing-test.mjs b/scripts/timing-test.mjs
index b45f447..f5fd25c 100644
--- a/scripts/timing-test.mjs
+++ b/scripts/timing-test.mjs
@@ -434,7 +434,11 @@ async function measureTempo(browser, bpm, seconds) {
         octaves: { kind: "count", count: 2 },
         shape: "scale",
       });
+      // Merged into the session's own settings: SessionSettings carries the
+      // lead settings too (practice.session/REQ-011, 008) — a hand-built
+      // object without them is not a SessionSettings.
       window.__session.setSettings({
+        ...window.__session.snapshot().settings,
         soundMode: "both",
         loop: true,
         countIn: false,
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 2d29c6e..678d4cf 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1625,6 +1625,11 @@ export function createSession(
       startLead();
       return;
     }
+    // 008 proposal edge-case row (REQ-015) — "a key with no notes in range:
+    // the start circle does nothing in either mode". startLead() guards its
+    // own empty run (REQ-015/S8); play along has no scenario for it, only the
+    // edge-case test, so the guard is here.
+    if (sequence.length === 0) return;
     // practice.session/REQ-013 — ▶ ends any sounding tap the same way a
     // retap does, before anything else: a tap only ever sounds while idle,
     // and start() is about to leave idle.
diff --git a/tests/practice/lead-helpers.ts b/tests/practice/lead-helpers.ts
index fa6442d..3860773 100644
--- a/tests/practice/lead-helpers.ts
+++ b/tests/practice/lead-helpers.ts
@@ -2,12 +2,29 @@
 // — driving a lead run through the published Session interface only, never
 // its internals (docs/engineering.md §7).
 
-import type { Session, SessionSettings } from "../../src/practice/published";
-import { defaultSessionSettings } from "../../src/practice/published";
+import type {
+  Session,
+  SessionContext,
+  SessionSettings,
+} from "../../src/practice/published";
+import {
+  createSession,
+  defaultDroneSettings,
+  defaultScaleChoice,
+  defaultSessionSettings,
+} from "../../src/practice/published";
 import { pitchHzOf } from "../../src/theory/published";
-import type { Traversal } from "../../src/theory/published";
+import type { Traversal, Variant, VariantId } from "../../src/theory/published";
 import type { SessionFixture } from "./fakes";
-import { sessionOn } from "./fakes";
+import {
+  FakeClock,
+  FakeListening,
+  FakeSound,
+  FakeVisibility,
+  FakeWakeLock,
+  keyOf,
+  sessionOn,
+} from "./fakes";
 
 export const oneOctaveUpdown: Traversal = {
   direction: "updown",
@@ -88,3 +105,48 @@ export function holdThrough(
   }
   return t;
 }
+
+// An empty run, shared by practice.session/REQ-015/S8 and the edge-case row
+// "a key with no notes in range" — no key/scale/variant combination in the
+// built-in catalogue (flute Concert C4–C7, ocarina Alto C A4–F6, ocarina
+// Bass C A3–F5 — every one spans at least two octaves) actually leaves a
+// key with zero notes in range: an exhaustive search over the twelve
+// majors, every scale and every variant (the brief's one-off loop, run and
+// deleted — see the T005 implementation report) never found an empty run.
+// This synthetic variant's range is a single pitch outside the key's scale,
+// which reliably reproduces "no notes of this key in range" without
+// touching the real catalogue.
+const noNotesVariant: Variant = {
+  instrumentId: "test",
+  instrumentName: "Test",
+  // Test-only id, never a real catalogue entry — a cast is needed since
+  // VariantId is a branded string (docs/engineering.md §3).
+  variantId: "test-no-notes" as VariantId,
+  variantName: "No notes",
+  range: {
+    lowest: { letter: "C", accidental: "sharp", octave: 4 },
+    highest: { letter: "C", accidental: "sharp", octave: 4 },
+  },
+};
+
+export function sessionWithEmptyRun(settings: SessionSettings): SessionFixture {
+  const sound = new FakeSound();
+  const clock = new FakeClock(sound);
+  const wake = new FakeWakeLock();
+  const visibility = new FakeVisibility();
+  const listening = new FakeListening();
+  const context: SessionContext = {
+    key: keyOf("C"),
+    variant: noNotesVariant,
+    spelling: "sharp",
+  };
+  const session = createSession(
+    context,
+    { direction: "up", octaves: { kind: "count", count: 4 }, shape: "scale" },
+    defaultScaleChoice,
+    settings,
+    defaultDroneSettings,
+    { sound, clock, wakeLock: wake, visibility, listening },
+  );
+  return { session, sound, clock, wake, visibility, listening, context };
+}
diff --git a/tests/practice/scenarios/lead-edge-cases.test.ts b/tests/practice/scenarios/lead-edge-cases.test.ts
new file mode 100644
index 0000000..3f1cac0
--- /dev/null
+++ b/tests/practice/scenarios/lead-edge-cases.test.ts
@@ -0,0 +1,99 @@
+// 008-learner-leads — the proposal's edge-case table, one test per row not
+// already a scenario of this change, named after the row. Rows that are a
+// scenario already are covered where they live:
+//
+//   Empty / first-run state          → practice.session/REQ-011/S2 (lead-settings.test.ts,
+//                                       selection-store.test.ts "first-run defaults")
+//   A key with no notes in range     → practice.session/REQ-015/S8 (lead-run.test.ts) for I lead;
+//                                       for play along, the edge-case test below (decision D003)
+//   Mode words tapped mid-run        → practice.session/REQ-014/S3 (lead-mode.test.ts)
+//   Upstream unavailable             → practice.session/REQ-022/S1–S4 (lead-cannot-hear.test.ts)
+//   The tool's own sound in the mic  → practice.session/REQ-018/S3 (lead-cues.test.ts),
+//                                       practice.session/REQ-015/S5 and S6 (lead-run.test.ts,
+//                                       invariants/never-both.test.ts), practice.session/REQ-013/S5
+//                                       (session-tap.test.ts, "ignored while leading")
+//   Reading with no confidence       → listening.pitch-detection/REQ-003/S4 (src/listening/src/
+//                                       detector.rs — "always a positive frequency and a clarity")
+//   Stored settings unreadable       → practice.session/REQ-011 (selection-store.test.ts "a bad
+//                                       lead field falls back on its own, the rest restores")
+//   The page hidden                  → practice.session/REQ-009/S3 (session-hidden-awake.test.ts)
+//   A traversal change mid-run       → practice.session/REQ-019/S1, S5 (lead-changes.test.ts)
+//
+// And the measured scenarios of practice.session/REQ-021 — not unit tests,
+// proven by the harnesses (`pnpm test:lead`, `pnpm test:timing`) and the
+// phone; the guards at the bottom only pin that the harnesses exist and say
+// what they measure (the 007 convention, tuner-harness.test.ts):
+//   practice.session/REQ-021/S1 — the budget (measured): scripts/lead-timing-test.mjs
+//   practice.session/REQ-021/S3 — playback untouched (measured): scripts/timing-test.mjs
+//   practice.session/REQ-021/S4 — on the phone (acceptance): the phone walk at
+//   acceptance, the user's sign-off — not a test.
+
+import { readFileSync } from "node:fs";
+import { resolve } from "node:path";
+import { expect, test } from "vitest";
+import { defaultSessionSettings } from "../../../src/practice/published";
+import { pitchHzOf } from "../../../src/theory/published";
+import {
+  hearSteady,
+  leadFixture,
+  sessionWithEmptyRun,
+  startLead,
+} from "../lead-helpers";
+
+test("edge case — a key with no notes in range in play along: ▶ does nothing", () => {
+  const f = sessionWithEmptyRun(defaultSessionSettings);
+  expect(f.session.snapshot().run).toHaveLength(0);
+
+  f.session.start();
+
+  expect(f.session.snapshot().transport).toEqual({ kind: "idle" });
+  expect(f.sound.posts).toEqual([]);
+  expect(f.wake.acquired).toBe(false);
+  expect(f.listening.startCalls).toBe(0);
+});
+
+test("edge case — the circle tapped while already leading is a no-op", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  expect(f.listening.startCalls).toBe(1);
+
+  // Held once, so the position is not the start state: a second start() must
+  // neither restart the run nor ask for the microphone again.
+  const first = f.session.snapshot().lead.target;
+  if (first === null) throw new Error("no target");
+  hearSteady(f, pitchHzOf(first.note), 0, 1300);
+  const before = f.session.snapshot().lead;
+  expect(before.target?.position).toBe(2);
+
+  await startLead(f.session);
+
+  const after = f.session.snapshot().lead;
+  expect(f.listening.startCalls).toBe(1);
+  expect(f.listening.stopCalls).toBe(0);
+  expect(after.phase).toBe("listening");
+  expect(after.target).toEqual(before.target);
+});
+
+test("edge case — ■ twice", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+
+  f.session.stop();
+  f.session.stop();
+
+  expect(f.listening.stopCalls).toBe(1);
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.target).toBeNull();
+});
+
+test("practice.session/REQ-021/S1 · REQ-021/S3 — the harnesses that measure the budgets exist and say what they measure", () => {
+  const header = (name: string): string =>
+    readFileSync(resolve(__dirname, "../../../scripts", name), "utf8").slice(
+      0,
+      1200,
+    );
+  const lead = header("lead-timing-test.mjs");
+  for (const id of ["REQ-021/S1", "REQ-018/S3"]) expect(lead).toContain(id);
+  const timing = header("timing-test.mjs");
+  for (const id of ["REQ-008/S1", "REQ-006/S4"]) expect(timing).toContain(id);
+});
diff --git a/tests/practice/scenarios/lead-run.test.ts b/tests/practice/scenarios/lead-run.test.ts
index 4572087..93f6ee4 100644
--- a/tests/practice/scenarios/lead-run.test.ts
+++ b/tests/practice/scenarios/lead-run.test.ts
@@ -1,30 +1,17 @@
 import { expect, test } from "vitest";
 import {
-  createSession,
-  defaultDroneSettings,
   defaultScaleChoice,
-  type SessionContext,
   type TargetAdvanced,
 } from "../../../src/practice/published";
-import type { Variant, VariantId } from "../../../src/theory/published";
 import {
   holdThrough,
   leadFixture,
   leadSettings,
   oneOctaveUpdown,
+  sessionWithEmptyRun,
   startLead,
 } from "../lead-helpers";
-import {
-  FakeClock,
-  FakeListening,
-  FakeSound,
-  FakeVisibility,
-  FakeWakeLock,
-  isStop,
-  keyOf,
-  startDroneAndFlush,
-  type SessionFixture,
-} from "../fakes";
+import { isStop, keyOf, startDroneAndFlush } from "../fakes";
 import { enter } from "../tuner-helpers";
 
 test("practice.session/REQ-015/S1 — the run starts on the first note", async () => {
@@ -73,50 +60,6 @@ test("practice.session/REQ-015/S2 — stop", async () => {
   expect(f.session.snapshot().lead.heldFraction).toBe(0);
 });
 
-// practice.session/REQ-015/S8 — no key/scale/variant combination in the
-// built-in catalogue (flute Concert C4–C7, ocarina Alto C A4–F6, ocarina
-// Bass C A3–F5 — every one spans at least two octaves) actually leaves a
-// key with zero notes in range: an exhaustive search over the twelve
-// majors, every scale and every variant (the brief's one-off loop, run and
-// deleted — see the T005 implementation report) never found an empty run.
-// This synthetic variant's range is a single pitch outside the key's scale,
-// which reliably reproduces "no notes of this key in range" without
-// touching the real catalogue.
-const noNotesVariant: Variant = {
-  instrumentId: "test",
-  instrumentName: "Test",
-  // Test-only id, never a real catalogue entry — a cast is needed since
-  // VariantId is a branded string (docs/engineering.md §3).
-  variantId: "test-no-notes" as VariantId,
-  variantName: "No notes",
-  range: {
-    lowest: { letter: "C", accidental: "sharp", octave: 4 },
-    highest: { letter: "C", accidental: "sharp", octave: 4 },
-  },
-};
-
-function sessionWithEmptyRun(): SessionFixture {
-  const sound = new FakeSound();
-  const clock = new FakeClock(sound);
-  const wake = new FakeWakeLock();
-  const visibility = new FakeVisibility();
-  const listening = new FakeListening();
-  const context: SessionContext = {
-    key: keyOf("C"),
-    variant: noNotesVariant,
-    spelling: "sharp",
-  };
-  const session = createSession(
-    context,
-    { direction: "up", octaves: { kind: "count", count: 4 }, shape: "scale" },
-    defaultScaleChoice,
-    leadSettings(),
-    defaultDroneSettings,
-    { sound, clock, wakeLock: wake, visibility, listening },
-  );
-  return { session, sound, clock, wake, visibility, listening, context };
-}
-
 test("practice.session/REQ-015/S3 — the last note held, loop off", async () => {
   const f = leadFixture({ ...leadSettings(), loop: false });
   const advanced: TargetAdvanced[] = [];
@@ -182,7 +125,7 @@ test("practice.session/REQ-015 — a key, traversal or scale change from complet
 });
 
 test("practice.session/REQ-015/S8 — no notes, no run", async () => {
-  const f = sessionWithEmptyRun();
+  const f = sessionWithEmptyRun(leadSettings());
   expect(f.session.snapshot().run).toHaveLength(0);
   await startLead(f.session);
   expect(f.listening.startCalls).toBe(0);
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

_The task reviewer appends its verdict here._

<!-- recorded 2026-10-04T09:47:04Z by scripts/record.sh -->
