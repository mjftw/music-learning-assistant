---
type: Task Review
title: Review package — C008_T028 · 008-learner-leads
description: The diff produced for C008_T028, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T028.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T028.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T028.md
  - resource: git:689922b5baba4281c71f8f1714bd93b4cf489326..201c95e2f88f283575b0c5fcb815d1d0d3fa56b7
generated:
  by: process:review-package.sh
  at: 2026-10-05T11:41:32Z
sdd_id: 008-learner-leads
---

# Review package — C008_T028 · 008-learner-leads

base: `689922b5baba4281c71f8f1714bd93b4cf489326` → head: `201c95e2f88f283575b0c5fcb815d1d0d3fa56b7`

## Commands (run by this script)

### Verify

`pnpm test:lead`

```

> music-learning-assistant@0.0.0 test:lead /home/merlin/projects/music-learning-assistant
> node scripts/lead-timing-test.mjs

driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  max gap (ms)  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   8.02                  8.02                93.80           10.67         0                              18.69                    PASS  
tone cue fed back  3        70.33                   5.35                  5.35                82.92           10.67         0                              5.35                     PASS  
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
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

- M	AGENTS.md
- M	scripts/lead-timing-test.mjs

## Diff

```diff
diff --git a/AGENTS.md b/AGENTS.md
index 5166a45..099ac48 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -158,17 +158,19 @@ held to its advance, with one drift out of tune on the fourth — then a second
 run with the tone cue on, 1 beat at 150 bpm, where the tool's own 400 ms tone
 is fed back as the microphone at each new target; it takes about 40 seconds.
 Gated: the first readout (≤100 ms), arrival age (≤100 ms), readings per second
-(≥20), each advance within one reading hop (512 frames) of the in-tune time it
-needed, computed from the recorded `NoteJudged` verdicts, and never earlier,
+(≥20), the largest gap between consecutive `NoteJudged` readings within a tone's
+sounding span (≤50 ms — never measured across the scripted silences, the tone
+cue's mute window or the post-advance gap), each advance within one reading hop
+(512 frames) of the in-tune time it needed, computed from the recorded `NoteJudged` verdicts, and never earlier,
 the advance shown within 100 ms, and — in the tone cue row — no `NoteJudged`
 inside the cue's window and the hold at zero at its end. Paint age is printed
 for information and is not gated.
 
 ```
-case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
-lead run C4–C5     15       70.33                   5.35                  8.02                94.21           0                              16.02                    PASS
-tone cue fed back  3        62.33                   8.02                  8.02                83.40           0                              18.69                    PASS
-test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
+case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  max gap (ms)  advance lateness max (frames)  shown lateness max (ms)  status
+lead run C4–C5     15       70.33                   5.35                  8.02                94.21           10.67         0                              16.02                    PASS
+tone cue fed back  3        67.67                   5.35                  5.35                82.92           10.67         0                              13.35                    PASS
+test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
 ```
 
 Run `check` before calling any task done, and paste the output.
diff --git a/scripts/lead-timing-test.mjs b/scripts/lead-timing-test.mjs
index 95bccc5..13e26fa 100644
--- a/scripts/lead-timing-test.mjs
+++ b/scripts/lead-timing-test.mjs
@@ -1,6 +1,7 @@
 #!/usr/bin/env node
 // Measured lead-run budget — practice.session/REQ-021/S1 (every shown
-// reading within 100 ms of its sound, ≥20 readings/s while steady, every
+// reading within 100 ms of its sound, ≥20 readings/s while steady and no
+// gap over 50 ms between readings while a tone sounds, every
 // advance shown within 100 ms, each advance at 1250 ms of accumulated
 // in-tune time and never earlier), practice.session/REQ-016/S1's timing
 // (the same budget, read off the hold rule itself) and practice.session/
@@ -33,6 +34,11 @@ import {
 const FIRST_READOUT_MAX_MS = 100;
 const ARRIVAL_AGE_MAX_MS = 100;
 const READINGS_PER_SECOND_MIN = 20;
+// REQ-021's "refreshed at least every 50 ms while a steady note is heard",
+// gated on the largest interval between consecutive NoteJudged.atFrame
+// inside one tone's sounding span — the average rate above would pass a
+// single 200 ms stall.
+const MAX_GAP_MAX_MS = 50;
 // The hold rule can only act on a reading it has already received — one
 // hop's worth of slack (512 frames, the detector's own hop — notes.md's
 // "the 10.667 ms reading grid") between the reading that completed the
@@ -331,6 +337,24 @@ function measureInPage(params) {
     const readingsPerSecond =
       steadySeconds > 0 ? steadyReadings.length / steadySeconds : 0;
 
+    // The largest interval between consecutive readings while this tone
+    // sounds and readings are expected: from its first reading to its last
+    // before the advance — never across the silence before the onset, the
+    // tone-cue's mute window (before the onset too) or the gap after the
+    // advance (windowReadings stops at it). Fewer than two readings leave
+    // no interval to measure, which cannot hold a note: null, so it fails.
+    const soundingReadings = windowReadings.filter(
+      (reading) => reading.atFrame >= onsetFrame,
+    );
+    let maxGap = null;
+    for (let i = 1; i < soundingReadings.length; i += 1) {
+      const fromFrame = soundingReadings[i - 1].atFrame;
+      const toFrame = soundingReadings[i].atFrame;
+      const ms = ((toFrame - fromFrame) / sampleRate) * 1000;
+      if (maxGap === null || ms > maxGap.ms)
+        maxGap = { ms, fromFrame, toFrame };
+    }
+
     // practice.session/REQ-016 — the hold rule runs on every raw reading,
     // "committed or not" (session.ts's own comment on commitLeadReading) —
     // a zero-delay commit timer can batch several raw readings into one
@@ -370,6 +394,7 @@ function measureInPage(params) {
       label: labelOfNote(note),
       firstReadoutMs,
       readingsPerSecond,
+      maxGap,
       advanceLatenessFrames,
       completingReadingMissing,
       shownLatenessMs,
@@ -709,6 +734,13 @@ function leadRunRow(label, result) {
   const firstReadoutMaxMs = maxOf(perTarget.map((t) => t.firstReadoutMs));
   const arrivalAgeMaxMs = result.arrivalAgeMaxMs;
   const readingsPerSecondMin = minOf(perTarget.map((t) => t.readingsPerSecond));
+  const gapValues = perTarget.map((t) =>
+    t.maxGap === null ? null : t.maxGap.ms,
+  );
+  const maxGapMs = maxOf(gapValues);
+  const widestGapTarget =
+    perTarget.find((t) => t.maxGap === null) ??
+    perTarget.reduce((worst, t) => (t.maxGap.ms > worst.maxGap.ms ? t : worst));
   const advanceLatenessValues = perTarget.map((t) => t.advanceLatenessFrames);
   const advanceLatenessMax = maxOf(advanceLatenessValues);
   const advanceEarly = advanceLatenessValues.some(
@@ -729,6 +761,12 @@ function leadRunRow(label, result) {
     failures.push(
       `readings/s min ${readingsPerSecondMin} < ${READINGS_PER_SECOND_MIN}`,
     );
+  if (maxGapMs > MAX_GAP_MAX_MS)
+    failures.push(
+      widestGapTarget.maxGap === null
+        ? `max gap unmeasurable at target ${widestGapTarget.position} (${widestGapTarget.label}): fewer than two readings while the tone sounded`
+        : `max gap ${maxGapMs.toFixed(2)} ms > ${MAX_GAP_MAX_MS} at target ${widestGapTarget.position} (${widestGapTarget.label}), between atFrame ${widestGapTarget.maxGap.fromFrame} and ${widestGapTarget.maxGap.toFrame}`,
+    );
   if (advanceEarly)
     failures.push("an advance fell earlier than the in-tune time it needed");
   if (advanceLatenessMax > ADVANCE_LATENESS_MAX_FRAMES)
@@ -756,6 +794,7 @@ function leadRunRow(label, result) {
     arrivalAgeMaxMs,
     paintAgeMaxMs: result.maxPaintAgeMs,
     readingsPerSecondMin,
+    maxGapMs,
     advanceLatenessMax,
     shownLatenessMaxMs,
     failures,
@@ -798,6 +837,7 @@ function cellsOf(row) {
     row.arrivalAgeMaxMs.toFixed(2),
     row.paintAgeMaxMs === null ? "n/a" : row.paintAgeMaxMs.toFixed(2),
     row.readingsPerSecondMin.toFixed(2),
+    row.maxGapMs.toFixed(2),
     row.advanceLatenessMax.toFixed(0),
     row.shownLatenessMaxMs.toFixed(2),
     row.failures.length === 0 ? "PASS" : "FAIL",
@@ -879,6 +919,7 @@ async function main() {
         "arrival age max (ms)",
         "paint age max (ms)",
         "readings/s min",
+        "max gap (ms)",
         "advance lateness max (frames)",
         "shown lateness max (ms)",
         "status",
@@ -913,7 +954,7 @@ async function main() {
     return;
   }
   console.log(
-    `test:lead: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, advance within one hop and never early, shown ≤${SHOWN_LATENESS_MAX_MS} ms, nothing judged during the tone`,
+    `test:lead: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, no gap over ${MAX_GAP_MAX_MS} ms, advance within one hop and never early, shown ≤${SHOWN_LATENESS_MAX_MS} ms, nothing judged during the tone`,
   );
 }
 
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T028.md b/changes/008-learner-leads/tasks/C008_T028.md
index 99941ee..d14626f 100644
--- a/changes/008-learner-leads/tasks/C008_T028.md
+++ b/changes/008-learner-leads/tasks/C008_T028.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T11:19:36Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T028
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-021]
 sdd_depends_on: []
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 1"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T028 · test:lead gates the largest gap between readings, not only the average rate (converge W3)
```

## Verdict

_The task reviewer appends its verdict here._

### Task review (attempt 1)

SPEC: PASS
QUALITY: PASS

- Span: per tone, readings with onsetFrame <= atFrame <= advance.atFrame, so the silence before the onset, the cue's mute window and the post-advance gap are excluded. Gaps are between consecutive committed NoteJudged only: onset -> first reading is not a gap (50-100 ms there is covered only by the 100 ms first-readout gate); last reading -> advance is at most one hop when the completing reading was coalesced away.
- No existing gate loosened or removed: the only removed lines are the header comment and the PASS-line template, both extended.
- Fewer than two readings -> maxGap null -> maxOf gives Infinity -> FAIL with the "unmeasurable" message. Correct.
- Mutation re-run from a scratch copy (a 200 ms stretch dropped from target 6's list): FAIL, "max gap 202.67 ms > 50 at target 6 (A4)". readings/s min is unchanged, so the average-rate gate alone would pass.
- AGENTS.md: paragraph, table and PASS line match the script's real output; grep -c "test:lead: PASS" AGENTS.md = 1.
- Findings (minor): AGENTS.md paragraph has one over-long wrapped line ("(512 frames) of the in-tune time ..."). Gap is on signal-time atFrame of committed events, not paint time. Neither blocks.

<!-- recorded 2026-10-05T11:44:42Z by scripts/record.sh -->
