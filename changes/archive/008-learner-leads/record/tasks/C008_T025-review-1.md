---
type: Task Review
title: Review package — C008_T025 · 008-learner-leads
description: The diff produced for C008_T025, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T025.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T025.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T025.md
  - resource: git:bb28b6354981c547a183775f0d18f729b015bd4e..d6a151cbd470669bbbe3ad8a85b5bbfc6c5e76ff
generated:
  by: process:review-package.sh
  at: 2026-10-05T11:22:37Z
sdd_id: 008-learner-leads
---

# Review package — C008_T025 · 008-learner-leads

base: `bb28b6354981c547a183775f0d18f729b015bd4e` → head: `d6a151cbd470669bbbe3ad8a85b5bbfc6c5e76ff`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-mode.test.ts tests/ui/scenarios/transport-card-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  26 passed (26)
   Start at  12:22:38
   Duration  5.27s (tests 73%, environment 12%, transform 10%, import 6%)

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
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
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
- M	tests/practice/scenarios/lead-mode.test.ts
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 678d4cf..01ea1b9 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -2010,6 +2010,14 @@ export function createSession(
     })();
   }
 
+  // practice.session/REQ-015, REQ-022 — a finished lead run's card (complete,
+  // or the no-mic card) goes back to the I lead idle state: the phase idle
+  // and listening off, so the cannot-hear reason goes with it.
+  function clearLeadCard(): void {
+    leadPhase = { kind: "idle" };
+    leadListeningState = { kind: "off" };
+  }
+
   // practice.session/REQ-019 — a key, variant, scale or traversal change
   // mid-run restarts the lead run on the new sequence from its first note at
   // once, still listening, with the hold at zero: `TargetAdvanced` emitted
@@ -2025,7 +2033,7 @@ export function createSession(
   // have left behind.
   function restartLeadIfRunning(): void {
     if (leadPhase.kind === "complete") {
-      leadPhase = { kind: "idle" };
+      clearLeadCard();
       return;
     }
     if (leadPhase.kind !== "listening") return;
@@ -2129,6 +2137,17 @@ export function createSession(
     ) {
       stop();
     }
+    // practice.session/REQ-014, REQ-015, REQ-022 — a complete or cannot-hear
+    // card has no run (listeningOwner "none"), so the stop above never
+    // reaches it; a changed mode clears it, in both directions. A `who`
+    // that did not change leaves it (REQ-019: the sheet's other settings
+    // never clear it).
+    if (
+      newSettings.lead.who !== currentSettings.lead.who &&
+      leadPhase.kind !== "idle"
+    ) {
+      clearLeadCard();
+    }
     currentSettings = newSettings;
     // stop() above (when called) already rebuilt and cached a snapshot of
     // its own, from the *old* settings — invalidated again here so the
diff --git a/tests/practice/scenarios/lead-mode.test.ts b/tests/practice/scenarios/lead-mode.test.ts
index a4b4ab6..5c1efda 100644
--- a/tests/practice/scenarios/lead-mode.test.ts
+++ b/tests/practice/scenarios/lead-mode.test.ts
@@ -1,6 +1,11 @@
 import { expect, test } from "vitest";
 import { defaultSessionSettings } from "../../../src/practice/published";
-import { leadFixture, leadSettings, startLead } from "../lead-helpers";
+import {
+  holdThrough,
+  leadFixture,
+  leadSettings,
+  startLead,
+} from "../lead-helpers";
 import { sessionOn } from "../fakes";
 
 test("practice.session/REQ-014/S1 — choosing I lead", () => {
@@ -63,3 +68,52 @@ test("practice.session/REQ-014/S4 — one beat, singular", () => {
     "hold 1 beat · accurate tuning",
   );
 });
+
+test("practice.session/REQ-015/S3 — the complete card goes when the mode changes", async () => {
+  const f = leadFixture({ ...leadSettings(), loop: false });
+  await startLead(f.session);
+  holdThrough(f, 15);
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+
+  f.session.setSettings(defaultSessionSettings);
+  const s = f.session.snapshot();
+  expect(s.lead.phase).toBe("idle");
+  expect(s.lead.completeCaption).toBeNull();
+  expect(s.caption).toBe("15 notes · C4–C5");
+
+  f.session.start();
+  await Promise.resolve();
+  await Promise.resolve();
+  expect(f.session.snapshot().transport.kind).toBe("countingIn");
+});
+
+test("practice.session/REQ-019 — a settings change that leaves who alone keeps the complete card", async () => {
+  const f = leadFixture({ ...leadSettings(), loop: false });
+  await startLead(f.session);
+  holdThrough(f, 15);
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+
+  f.session.setSettings({
+    ...leadSettings({ holdBeats: 4 }),
+    loop: false,
+  });
+  expect(f.session.snapshot().lead.phase).toBe("complete");
+  expect(f.session.snapshot().lead.completeCaption).toBe(
+    "15 of 15 held · C4–C5",
+  );
+});
+
+test("practice.session/REQ-022/S1 — the no-mic card goes when the mode changes", async () => {
+  const f = leadFixture();
+  f.listening.failWith = "refused";
+  await startLead(f.session);
+  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
+
+  f.session.setSettings(defaultSessionSettings);
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });
+
+  f.session.setSettings(leadSettings());
+  expect(f.session.snapshot().lead.phase).toBe("idle");
+  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });
+});
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index 7a0fc75..564d6ee 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -295,3 +295,42 @@ test("practice.session/REQ-015/S2 (card) — ■ stops the lead run", async () =
   expect(app.listening.startCalls).toBe(2);
   expect(screen.getByTestId("target-letter").textContent).toBe("C");
 });
+
+test("practice.session/REQ-014/S2 (card) — play along after a finished run is the play-along card", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      { who: "me" },
+      { session: { ...storedCMajor().session, loop: false } },
+    ),
+  );
+  await startLeadInApp(app);
+  let t = 0;
+  for (let n = 0; n < 15; n += 1) {
+    const hz = Number(screen.getByTestId("target-hz").textContent);
+    hearSteadyInApp(app, hz, t, t + 1300);
+    silenceInApp(app, 300);
+    t += 1700;
+  }
+  expect(screen.getByTestId("judgement").textContent).toBe("All held");
+  await app.user.click(screen.getByTestId("mode-word-tool"));
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "15 notes · C4–C5",
+  );
+  expect(screen.queryByTestId("judgement")).toBeNull();
+  expect(screen.getByTestId("start-circle").textContent).toContain("▶");
+}, 15000);
+
+test("practice.session/REQ-014/S2 (card) — play along after a refused microphone is the play-along card", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  app.listening.failWith = "refused";
+  await startLeadInApp(app);
+  expect(screen.getByTestId("no-mic-card")).toBeTruthy();
+  await app.user.click(screen.getByTestId("mode-word-tool"));
+  expect(screen.queryByTestId("no-mic-card")).toBeNull();
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "15 notes · C4–C5",
+  );
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+  expect(screen.getByTestId("start-circle").textContent).toContain("❚❚");
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/record/index.md b/changes/008-learner-leads/record/index.md
index 6a730eb..a24d6f1 100644
--- a/changes/008-learner-leads/record/index.md
+++ b/changes/008-learner-leads/record/index.md
@@ -1,3 +1,4 @@
 # Record: 008-learner-leads
 
+- [008-learner-leads — convergence report](converge-1.md) — Convergence Report
 - [tasks/](tasks/index.md)
diff --git a/changes/008-learner-leads/tasks/C008_T025.md b/changes/008-learner-leads/tasks/C008_T025.md
index 04a881e..d34ccbb 100644
--- a/changes/008-learner-leads/tasks/C008_T025.md
+++ b/changes/008-learner-leads/tasks/C008_T025.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T11:19:36Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T025
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-014, practice.session/REQ-015, practice.session/REQ-022, practice.session/REQ-002]
 sdd_depends_on: []
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 1"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T025 · A mode change clears a complete or cannot-hear lead card (converge C1)
```

## Verdict

_The task reviewer appends its verdict here._

TASK: C008_T025
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/practice/scenarios/lead-mode.test.ts:186 — the same-who guard test is named "practice.session/REQ-019 — ..." with no scenario ID; the brief did not name one and check-scenarios.sh accepts it, so only a naming looseness.
- [minor] .sdd/reports/008-learner-leads/C008_T025.md — report says the complete branch "was already off in complete"; in fact leadListeningState stays {kind:"listening"} from startLead (session.ts:2280) when a run completes (session.ts:1115 only stops the port), so clearLeadCard() setting it off is a small correction, not a no-op. Harmless and matches Produces ("listening off").
UNVERIFIED:
- practice.session/REQ-022 — restartLeadIfRunning() returns early for any phase but complete/listening, so a key/variant/scale/traversal change leaves a cannot-hear card as it is (phase and reason kept; next circle tap retries). REQ-022 and REQ-015 say nothing about a key/traversal change clearing the no-mic card (REQ-015's "until ... mode, key, variant, scale or traversal changes" lists only the complete card), so the spec neither requires nor forbids it; not part of this task.
- practice.session/REQ-015/S3 — complete card in the UI after a mode change away and back is not asserted (phase returns to idle in domain test only for cannot-hear back-direction); the complete -> tool -> me path goes through the same clearLeadCard, so low risk.
COMMANDS:
package only, plus ./scripts/check-scenarios.sh --change changes/008-learner-leads (scenario coverage complete; "REQ-015/S3 ... (card)" and REQ-022/S1 suffixed names are attributed fine) and ./scripts/check-contexts.sh (boundaries respected)

<!-- recorded 2026-10-05T11:24:20Z by scripts/record.sh -->
