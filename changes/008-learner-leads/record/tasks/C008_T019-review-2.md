---
type: Task Review
title: Review package — C008_T019 · 008-learner-leads
description: The diff produced for C008_T019, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T019.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T019.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T019.md
  - resource: git:27971ab2340e5c1892844d81da6af0d6c2daee8e..8c732cb86a434cf7c4dfeccf7724172257577a45
  - resource: /changes/008-learner-leads/record/tasks/C008_T019-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-04T08:16:27Z
sdd_id: 008-learner-leads
---

# Review package — C008_T019 · 008-learner-leads

base: `27971ab2340e5c1892844d81da6af0d6c2daee8e` → head: `8c732cb86a434cf7c4dfeccf7724172257577a45`

**Incremental review.** The previous attempt (head `23359438b00f58f9875cff6541236d3cd09cd3dc`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict


TASK: C008_T019
SPEC: PASS
QUALITY: FAIL (one cheap, project-precedented finding)
FINDINGS:
- [important] scripts/lead-timing-test.mjs:967 — docs/engineering.md duplication rule and AGENTS.md "Things agents get wrong" (failed T002/T004): extract within the context, touch the ripple even if outside the Files list — a local `printTable` copies harness-lib.mjs `printTable` (same padEnd/width logic) differing only in the header (the lib's is hard-coded to the tuner's). Fix: give the lib's `printTable` a `header` parameter (tuner-timing-test.mjs passes its header; the two callers share one implementation) and say so in the report.
- [minor] scripts/lead-timing-test.mjs:488 — brief says readings/s >= 20 "over any steady 1 s"; the code averages over each target's steady span (onset+ramp to the advance, under 1 s in case 2). A single 100 ms stall in a 0.8 s span still passes. Not a loosening of the stated figure (>= 20/s) but it cannot see a gap; a max-gap gate (<= 50 ms, REQ-021's "at least every 50 ms") would be the stronger check. Not blocking.
- [minor] scripts/lead-timing-test.mjs:402 — "shown" for an advance is an rAF poll of `snapshot().lead.target.position`, a model proxy (>= one rAF, about 16 ms), not the React commit or DOM. Brief specifies exactly this, and the real `onPaintAge` column is printed beside it (5-19 ms), so acceptable.
- [minor] scripts/lead-timing-test.mjs:763 — the bleed is injected at the new target's pitch about 20-35 ms after the advance with zero speaker-to-mic latency. A real device's round trip (output plus input latency) would shift the bleed later against the fixed 540 ms mute window; the harness cannot see a latency above about 100 ms. Inherent to the brief's design; phone acceptance (REQ-021/S4) covers it.

Answers to the review questions:
1. Gates are as the brief states them and not vacuous. First readout is measured from the tone's onset frame (`atFrame >= onsetFrame`, `arrivedAtFrame - onsetFrame`); a missing reading gives null -> Infinity -> FAIL. "Expected" comes from the recorded NoteJudged verdicts via a replicated hold rule, not from the fed pitch; only a missing completing reading is synthesised from the advance, and even then an early advance gives null -> FAIL (checked by reading the code). The lateness bounds are [0, 512], with early and out-of-range both failing. I verified the claims with two mutated copies run from the scratchpad (nothing in the repo touched):
   (a) case 2 with cueTone false -> FAIL: 131 NoteJudged inside the mute window, heldFraction 0.987 at the window end, first readout Infinity.
   (b) hold rule that does not reset on out-of-tune -> FAIL: lateness 8704 frames at target 4 (F4). So the drift target does reset the hold and the check detects a session that failed to reset.
   Lateness 0 on every advance is the grid-quantised result, not a vacuous check.
2. The deviation is right. The reading at `advance.atFrame` is `pitch.atFrame` of the reading that completed the hold, judged against the previous target (session.ts:1076-1098: applyJudgement, then TargetAdvanced with atFrame: pitch.atFrame). A reading against the new target has a strictly later atFrame, so `atFrame > advance` still catches it, as negative control (a) shows.
3. Acceptable. The harness asserts the exact 15-label sequence and throws if it differs, in a fresh BrowserContext whose defaults are REQ-011/S2. The explicit assertion makes it robust rather than fragile.
4. Acceptable. The onset is measured from the tone's own onset frame (first readout max 62-70 ms against the 100 ms budget), not from run start, so the 300 ms of extra leading silence does not subtract from the measured latency. It matches the tuner harness's preroll. `__sound.start()` in case 2 only keeps the one-off engine start out; with the engine not started nothing could bleed. A learner playing within about 300 ms of tapping start is not covered, which is a phone-acceptance matter.
5. Not production code. `git diff` shows no change to src/practice; the "fallback" is in the harness script (lead-timing-test.mjs:508-513), and it is correct and bounded (see 1). It never triggered, so the `note:` print path is exercised by no run; that is acceptable for a diagnostic line. No product change here, so no severity applies.
6. App.tsx: the `useLayoutEffect` depends on a primitive (`leadReadingAtFrame`) and `handleReadingShown` (stable `useCallback`), and adds no prop. `leadTarget` and `namesLeadTarget` memos and the StaveView props are untouched, so T014's constraint holds. `extraProps` on renderLeadApp is additive and defaulted. The new app-session test fails without the effect (ages would be empty) and uses the port fake only.
7. AGENTS.md has the paragraph and the fenced block in test:tuner's style, `grep -c "test:lead: PASS" AGENTS.md` = 1, and the promise line is gone. The two narrating comments in tuner-timing-test.mjs are deleted (no other change). The printTable duplication is the important finding above. `maxOfInPage` is a justified duplicate (page.evaluate serialisation, and it handles empty arrays).
8. Hygiene: the remaining `console.log` calls are the intended table, diagnostics and PASS line; no DEBUG or TODO. The dev server is not left running (`ps` count 0 after my runs, and the script's `finally` stops it). `pnpm check` exit 0 (ESLint is part of it).
UNVERIFIED:
- practice.session/REQ-018/S3 — the real speaker-to-microphone round-trip latency against the fixed mute window; the harness feeds the oscillator straight into the stream. The phone acceptance covers it.
- practice.session/REQ-021/S1 — "shown" is the model changing, not the DOM; the DOM-level view is only the printed paint age.
COMMANDS:
Two mutated copies of the script, run from the scratchpad against the real app (a negative control with cueTone false in case 2, and a hold rule with no reset): both FAIL as described above. No repo files changed.



## Commands (run by this script)

### Verify

`pnpm test:lead`

```

> music-learning-assistant@0.0.0 test:lead /home/merlin/projects/music-learning-assistant
> node scripts/lead-timing-test.mjs

driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   8.02                  8.02                93.80           0                              18.69                    PASS  
tone cue fed back  3        70.33                   8.02                  8.02                83.40           0                              18.69                    PASS  
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
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
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
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
- M	package.json
- M	scripts/harness-lib.mjs
- A	scripts/lead-timing-test.mjs
- M	scripts/tuner-timing-test.mjs
- M	src/ui/App.tsx
- M	tests/ui/scenarios/app-session.test.tsx
- M	tests/ui/scenarios/lead-app-helpers.tsx

## Diff since the previous attempt (`23359438b00f58f9875cff6541236d3cd09cd3dc` → head)

```diff
diff --git a/scripts/harness-lib.mjs b/scripts/harness-lib.mjs
index bf3ed34..282546d 100644
--- a/scripts/harness-lib.mjs
+++ b/scripts/harness-lib.mjs
@@ -159,18 +159,9 @@ export function paintAgeMaxOf(values) {
   return present.length > 0 ? Math.max(...present) : null;
 }
 
-export function printTable(rows) {
-  const header = [
-    "case",
-    "tones",
-    "first readout max (ms)",
-    "arrival age max (ms)",
-    "paint age max (ms)",
-    "readings/s min",
-    "cents err max",
-    "shown err max",
-    "status",
-  ];
+// Prints a padded table: `header` is the column labels, each row's `cells`
+// the strings under them.
+export function printTable(header, rows) {
   const table = [header, ...rows.map((row) => row.cells)];
   const widths = header.map((_, columnIndex) =>
     Math.max(...table.map((row) => row[columnIndex].length)),
diff --git a/scripts/lead-timing-test.mjs b/scripts/lead-timing-test.mjs
index 5fe9bf0..95bccc5 100644
--- a/scripts/lead-timing-test.mjs
+++ b/scripts/lead-timing-test.mjs
@@ -26,6 +26,7 @@ import {
   installMicrophoneOverride,
   maxOf,
   minOf,
+  printTable,
 } from "./harness-lib.mjs";
 
 // practice.session/REQ-021, REQ-016 — the budgets this harness gates.
@@ -803,29 +804,6 @@ function cellsOf(row) {
   ];
 }
 
-function printTable(rows) {
-  const header = [
-    "case",
-    "targets",
-    "first readout max (ms)",
-    "arrival age max (ms)",
-    "paint age max (ms)",
-    "readings/s min",
-    "advance lateness max (frames)",
-    "shown lateness max (ms)",
-    "status",
-  ];
-  const table = [header, ...rows];
-  const widths = header.map((_, columnIndex) =>
-    Math.max(...table.map((row) => row[columnIndex].length)),
-  );
-  for (const row of table) {
-    console.log(
-      row.map((cell, index) => cell.padEnd(widths[index])).join("  "),
-    );
-  }
-}
-
 async function main() {
   const devServerChild = await ensureDevServer();
 
@@ -893,7 +871,20 @@ async function main() {
       leadRunRow("lead run C4–C5", results.case1),
       toneCueRow("tone cue fed back", results.case2),
     ];
-    printTable(rows.map(cellsOf));
+    printTable(
+      [
+        "case",
+        "targets",
+        "first readout max (ms)",
+        "arrival age max (ms)",
+        "paint age max (ms)",
+        "readings/s min",
+        "advance lateness max (frames)",
+        "shown lateness max (ms)",
+        "status",
+      ],
+      rows.map((row) => ({ cells: cellsOf(row) })),
+    );
     for (const row of rows) {
       for (const line of row.diagnostics) console.log(line);
     }
diff --git a/scripts/tuner-timing-test.mjs b/scripts/tuner-timing-test.mjs
index 108164e..ecda7bc 100644
--- a/scripts/tuner-timing-test.mjs
+++ b/scripts/tuner-timing-test.mjs
@@ -705,7 +705,20 @@ async function main() {
       silentRow("silence", results.silence),
       silentRow("white noise", results.noise),
     ];
-    printTable(rows);
+    printTable(
+      [
+        "case",
+        "tones",
+        "first readout max (ms)",
+        "arrival age max (ms)",
+        "paint age max (ms)",
+        "readings/s min",
+        "cents err max",
+        "shown err max",
+        "status",
+      ],
+      rows,
+    );
     // One extra line per sweep row, under the table — the note each of its
     // worst figures belongs to, so a stray excursion can be attributed
     // rather than lost in the row's aggregate max.
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T019.md b/changes/008-learner-leads/tasks/C008_T019.md
index 0bdd42f..30275fe 100644
--- a/changes/008-learner-leads/tasks/C008_T019.md
+++ b/changes/008-learner-leads/tasks/C008_T019.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T019
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-021, practice.session/REQ-018, practice.session/REQ-016]
 sdd_depends_on: [C008_T018]
 sdd_parked_on: 
 sdd_group: "Phase 4 — The harness and hardening"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T019 · `pnpm test:lead` — the measured lead run
```

## Verdict

_The task reviewer appends its verdict here._

### Re-review (after 8c732cb)

Previous important finding (duplicated printTable) FIXED: lib `printTable(header, rows)` shared by tuner and lead scripts; tuner header inline is byte-identical to the removed lib header and to the AGENTS.md test:tuner block; lead header identical to the removed local copy and to the AGENTS.md test:lead block; no other caller of the lib function (grep scripts/). `timing-test.mjs` keeps its own older printTable with a different header and rows shape (pre-existing, predates the lib) — acceptable, minor note only.

TASK: C008_T019
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] scripts/lead-timing-test.mjs — readings/s is averaged over each steady span rather than checking the max gap (carried over).
- [minor] scripts/lead-timing-test.mjs — "shown" measured via a rAF proxy (carried over).
- [minor] scripts/timing-test.mjs:487 — older separate printTable (different header) remains; pre-existing, could later share the lib.
UNVERIFIED:
- none
COMMANDS: package only (plus git show 8c732cb, grep printTable scripts/)

<!-- recorded 2026-10-04T08:18:20Z by scripts/record.sh -->
