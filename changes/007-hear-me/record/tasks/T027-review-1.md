---
type: Task Review
title: Review package — T027 · 007-hear-me
description: The diff produced for T027, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T027.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T027.md
  - resource: git:459d9a1bceada79c672479391359e0c7c930daa5..459d9a1bceada79c672479391359e0c7c930daa5
generated:
  by: process:review-package.sh
  at: 2026-09-28T21:24:58Z
sdd_id: 007-hear-me
---

# Review package — T027 · 007-hear-me

base: `459d9a1bceada79c672479391359e0c7c930daa5` → head: `459d9a1bceada79c672479391359e0c7c930daa5`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/AGENTS.md b/AGENTS.md
index 696af7d..b0a6124 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -95,8 +95,8 @@ Healthy output looks like (last ~8 lines of `pnpm check`: vitest summary,
 then cargo's `test result`):
 
 ```
- Test Files  74 passed (74)
-      Tests  309 passed (309)
+ Test Files  75 passed (75)
+      Tests  314 passed (314)
    Start at  17:40:59
    Duration  10.63s (tests 50%, environment 33%, import 10%, transform 7%)
 
@@ -128,19 +128,20 @@ sweeping E2–C7 as a sine and a flute-like tone; it takes approximately 4
 minutes. Healthy output shows five test rows — sine E2–C7, flute-like E2–C7,
 hand-over glissando, silence, and white noise — plus worst-case summaries,
 ending with a PASS line. The first readout budget (≤100 ms), arrival age
-(≤100 ms), readings per second (≥20), and cents error (≤2 ¢) are gated; paint
-age is printed for information and is not gated.
+(≤100 ms), readings per second (≥20), cents error (≤2 ¢), and the shown
+offset error (≤2 ¢, read 500 ms into each tone — practice.tuner/REQ-002/S9)
+are gated; paint age is printed for information and is not gated.
 
 ```
-case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
-sine E2–C7           57     84.30                   63.98                 18.69               92.86           0.09           PASS
-flute-like E2–C7     57     80.40                   66.65                 8.02                92.86           0.65           PASS
-hand-over glissando  1      59.30                   61.31                 10.69               93.57           —              PASS
-silence              —      —                       —                     —                   0.00            —              PASS
-white noise          —      —                       —                     —                   0.00            —              PASS
-  worst: first readout E2 84.30 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢
-  worst: first readout E5 80.40 ms · arrival age E5 66.65 ms · cents err B6 0.65 ¢
-test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, nothing for silence or noise
+case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
+sine E2–C7           57     95.10                   63.98                 18.69               92.86           0.09           0              PASS
+flute-like E2–C7     57     77.40                   63.98                 13.35               92.86           0.65           1              PASS
+hand-over glissando  1      69.10                   63.98                 8.02                93.81           —              —              PASS
+silence              —      —                       —                     —                   0.00            —              —              PASS
+white noise          —      —                       —                     —                   0.00            —              —              PASS
+  worst: first readout E2 95.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
+  worst: first readout F♯6 77.40 ms · arrival age F♯6 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
+test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
 ```
 
 Run `check` before calling any task done, and paste the output.
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 0d064e9..cc413da 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -542,3 +542,29 @@ fed tone) before converge.
   mislabel from T010, not T026's.
 - The fix round (haiku) pasted the documented `pnpm check` counts rather
   than its own; the controller's run: 75 files, 314 tests, exit 0.
+
+## T027 — test:tuner with the shown-offset gate (2026-09-28)
+
+Run against `dev:phone` (`APP_URL=https://localhost:5173 pnpm test:tuner`)
+with the new `shown err max` column (practice.tuner/REQ-002/S9): the worst
+error, per sweep, of `|(semitone position of NoteJudged.target − semitone
+position of the tone fed) × 100 + NoteJudged.cents|` among readings taken
+`SHOWN_SETTLE_MS` (500 ms) or later into each tone, gated at
+`SHOWN_CENTS_ERROR_MAX_CENTS` (±2 ¢).
+
+```
+case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
+sine E2–C7           57     95.10                   63.98                 18.69               92.86           0.09           0              PASS
+flute-like E2–C7     57     77.40                   63.98                 13.35               92.86           0.65           1              PASS
+hand-over glissando  1      69.10                   63.98                 8.02                93.81           —              —              PASS
+silence              —      —                       —                     —                   0.00            —              —              PASS
+white noise          —      —                       —                     —                   0.00            —              —              PASS
+  worst: first readout E2 95.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
+  worst: first readout F♯6 77.40 ms · arrival age F♯6 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
+test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
+```
+
+The shown offset settles well inside the budget — 0 ¢ worst on the sine
+sweep, 1 ¢ worst on the flute-like sweep (A♯6) — confirming REQ-002/S9's
+smoothing (T026) does not leave the *shown* reading off the truth even
+though the harness had, until now, only ever gated the raw `heard.hz`.
diff --git a/changes/007-hear-me/tasks.md b/changes/007-hear-me/tasks.md
index 056065a..76888bc 100644
--- a/changes/007-hear-me/tasks.md
+++ b/changes/007-hear-me/tasks.md
@@ -1352,7 +1352,7 @@ _Ends with the tuner reachable from the header, grey and correct against 4a / 5c
 
 > Appended 2026-09-28 by design round 1.
 
-**Status:** todo
+**Status:** in-progress
 
 **Files**
 - Modify: `scripts/tuner-timing-test.mjs` (a gated column: the shown offset — `NoteJudged.cents` — half a second into each steady tone, within ±2 ¢ of the tone fed)
diff --git a/scripts/tuner-timing-test.mjs b/scripts/tuner-timing-test.mjs
index e695b8e..e9af67a 100644
--- a/scripts/tuner-timing-test.mjs
+++ b/scripts/tuner-timing-test.mjs
@@ -5,9 +5,10 @@
 // listening.pitch-detection/REQ-003/S2 (white noise publishes nothing),
 // listening.pitch-detection/REQ-004/S1 (≥20 readings/s while steady),
 // listening.pitch-detection/REQ-004/S2 (the first PitchDetected's atFrame
-// within 100 ms of onset), and practice.tuner/REQ-006/S1 (the shown
-// reading within the same 100 ms budget) — plus the 56 ¢ hand-over
-// glissando (practice.tuner/REQ-002/S4, live).
+// within 100 ms of onset), practice.tuner/REQ-006/S1 (the shown reading
+// within the same 100 ms budget), and practice.tuner/REQ-002/S9 (the
+// shown offset settles within ±2 ¢, half a second into each tone) — plus
+// the 56 ¢ hand-over glissando (practice.tuner/REQ-002/S4, live).
 //
 // Playwright, headless Chromium. The microphone is replaced by an
 // oscillator inside the page's own AudioContext (feeding the microphone
@@ -41,6 +42,12 @@ const FIRST_READOUT_MAX_MS = 100;
 const ARRIVAL_AGE_MAX_MS = 100;
 const READINGS_PER_SECOND_MIN = 20;
 const CENTS_ERROR_MAX_CENTS = 2;
+// practice.tuner/REQ-002/S9 — the shown offset (NoteJudged.target +
+// .cents, what the learner actually sees) is read from this point into
+// each steady tone onward, and must sit within this many cents of the
+// tone fed.
+const SHOWN_SETTLE_MS = 500;
+const SHOWN_CENTS_ERROR_MAX_CENTS = 2;
 // practice.tuner/REQ-002/S4 — the shown note holds until the detected
 // pitch is this far from it.
 const HANDOVER_CENTS = 56;
@@ -203,6 +210,7 @@ function measureInPage(params) {
     steadyStartFraction,
     steadyEndFraction,
     centsSkipMs,
+    shownSettleMs,
     handoverSeconds,
     handoverStartHz,
     handoverEndHz,
@@ -261,6 +269,28 @@ function measureInPage(params) {
     return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
   }
 
+  // theory/domain/notes.ts's pitchPosition, duplicated in-page for the
+  // same reason as noteLabelOfPosition above — practice.tuner/REQ-002/S9
+  // needs the semitone position of a NoteJudged event's `target` (a
+  // theory Note: letter, accidental, octave), and this script has no
+  // bundler step to import the published function through.
+  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
+  const ACCIDENTAL_OFFSET = {
+    doubleFlat: -2,
+    flat: -1,
+    natural: 0,
+    sharp: 1,
+    doubleSharp: 2,
+  };
+
+  function positionOfNote(note) {
+    return (
+      12 * (note.octave + 1) +
+      LETTER_SEMITONE[note.letter] +
+      ACCIDENTAL_OFFSET[note.accidental]
+    );
+  }
+
   // First mutation of the reading's subtree, at or after `onsetPerfMs`, that
   // shows *this tone's own* reading — a name is present
   // ([data-testid="tuner-name"], not [data-testid="tuner-empty"]) and its
@@ -353,6 +383,7 @@ function measureInPage(params) {
 
     let steadyCount = 0;
     let maxCentsErr = 0;
+    let maxShownCentsErr = 0;
     const unsubscribeJudged = noteJudgedSubscribe((event) => {
       const now = performance.now();
       if (now >= steadyStartMs && now < steadyEndMs) steadyCount += 1;
@@ -360,6 +391,15 @@ function measureInPage(params) {
         const err = Math.abs(1200 * Math.log2(event.heard.hz / hz));
         if (err > maxCentsErr) maxCentsErr = err;
       }
+      // practice.tuner/REQ-002/S9 — the shown offset (what the learner
+      // sees: NoteJudged.target + .cents), read from SHOWN_SETTLE_MS into
+      // the tone onward, against the tone actually fed.
+      if (now - onsetPerfMs >= shownSettleMs) {
+        const shownErr = Math.abs(
+          (positionOfNote(event.target) - position) * 100 + event.cents,
+        );
+        if (shownErr > maxShownCentsErr) maxShownCentsErr = shownErr;
+      }
     });
 
     const paintAgesBefore = (window.__paintAgesMs ?? []).length;
@@ -382,6 +422,7 @@ function measureInPage(params) {
       readingsPerSecond:
         steadyCount / ((steadyEndFraction - steadyStartFraction) * toneSeconds),
       maxCentsErr,
+      maxShownCentsErr,
     };
   }
 
@@ -599,21 +640,25 @@ function sweepRow(label, perTone) {
     perTone.map((tone) => tone.readingsPerSecond),
   );
   const centsErrMax = maxOf(perTone.map((tone) => tone.maxCentsErr));
+  const shownCentsErrMax = maxOf(perTone.map((tone) => tone.maxShownCentsErr));
   const passed =
     firstReadoutMaxMs <= FIRST_READOUT_MAX_MS &&
     arrivalAgeMaxMs <= ARRIVAL_AGE_MAX_MS &&
     readingsPerSecondMin >= READINGS_PER_SECOND_MIN &&
-    centsErrMax <= CENTS_ERROR_MAX_CENTS;
+    centsErrMax <= CENTS_ERROR_MAX_CENTS &&
+    shownCentsErrMax <= SHOWN_CENTS_ERROR_MAX_CENTS;
 
   const worstFirstReadout = worstToneOf(perTone, (tone) => tone.firstReadoutMs);
   const worstArrival = worstToneOf(perTone, (tone) => tone.arrivalAgeMs);
   const worstCents = worstToneOf(perTone, (tone) => tone.maxCentsErr);
+  const worstShown = worstToneOf(perTone, (tone) => tone.maxShownCentsErr);
   const worstLine =
     `  worst: first readout ${noteLabelOfPosition(worstFirstReadout.position)} ` +
     `${worstFirstReadout.firstReadoutMs === null ? "n/a" : worstFirstReadout.firstReadoutMs.toFixed(2)} ms · ` +
     `arrival age ${noteLabelOfPosition(worstArrival.position)} ` +
     `${worstArrival.arrivalAgeMs === null ? "n/a" : worstArrival.arrivalAgeMs.toFixed(2)} ms · ` +
-    `cents err ${noteLabelOfPosition(worstCents.position)} ${worstCents.maxCentsErr.toFixed(2)} ¢`;
+    `cents err ${noteLabelOfPosition(worstCents.position)} ${worstCents.maxCentsErr.toFixed(2)} ¢ · ` +
+    `shown err ${noteLabelOfPosition(worstShown.position)} ${worstShown.maxShownCentsErr} ¢`;
 
   return {
     cells: [
@@ -624,6 +669,7 @@ function sweepRow(label, perTone) {
       paintAgeMaxMs === null ? "n/a" : paintAgeMaxMs.toFixed(2),
       readingsPerSecondMin.toFixed(2),
       centsErrMax.toFixed(2),
+      String(shownCentsErrMax),
       passed ? "PASS" : "FAIL",
     ],
     passed,
@@ -648,6 +694,7 @@ function handoverRow(result) {
       result.maxPaintAgeMs === null ? "n/a" : result.maxPaintAgeMs.toFixed(2),
       result.readingsPerSecond.toFixed(2),
       "—",
+      "—",
       passed ? "PASS" : "FAIL",
     ],
     passed,
@@ -665,6 +712,7 @@ function silentRow(label, result) {
       "—",
       result.count.toFixed(2),
       "—",
+      "—",
       passed ? "PASS" : "FAIL",
     ],
     passed,
@@ -680,6 +728,7 @@ function printTable(rows) {
     "paint age max (ms)",
     "readings/s min",
     "cents err max",
+    "shown err max",
     "status",
   ];
   const table = [header, ...rows.map((row) => row.cells)];
@@ -747,6 +796,7 @@ async function main() {
           steadyStartFraction: STEADY_START_FRACTION,
           steadyEndFraction: STEADY_END_FRACTION,
           centsSkipMs: CENTS_SKIP_MS,
+          shownSettleMs: SHOWN_SETTLE_MS,
           handoverSeconds: HANDOVER_SECONDS,
           handoverStartHz: HANDOVER_START_HZ,
           handoverEndHz: HANDOVER_END_HZ,
@@ -799,13 +849,13 @@ async function main() {
 
   if (!allPassed) {
     console.error(
-      `test:tuner: FAIL — first readout exceeded ${FIRST_READOUT_MAX_MS} ms, arrival age exceeded ${ARRIVAL_AGE_MAX_MS} ms, readings/s fell below ${READINGS_PER_SECOND_MIN}, |cents error| exceeded ${CENTS_ERROR_MAX_CENTS}, the hand-over crossing missed ${HANDOVER_CENTS} ¢ or changed more than once, or a reading appeared during silence or noise — see the table above`,
+      `test:tuner: FAIL — first readout exceeded ${FIRST_READOUT_MAX_MS} ms, arrival age exceeded ${ARRIVAL_AGE_MAX_MS} ms, readings/s fell below ${READINGS_PER_SECOND_MIN}, |cents error| exceeded ${CENTS_ERROR_MAX_CENTS}, the shown offset was not within ±${SHOWN_CENTS_ERROR_MAX_CENTS} ¢ ${SHOWN_SETTLE_MS} ms into a tone, the hand-over crossing missed ${HANDOVER_CENTS} ¢ or changed more than once, or a reading appeared during silence or noise — see the table above`,
     );
     process.exitCode = 1;
     return;
   }
   console.log(
-    `test:tuner: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, |cents error| ≤${CENTS_ERROR_MAX_CENTS}, nothing for silence or noise`,
+    `test:tuner: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, |cents error| ≤${CENTS_ERROR_MAX_CENTS}, shown offset within ±${SHOWN_CENTS_ERROR_MAX_CENTS} ¢, nothing for silence or noise`,
   );
 }
 
diff --git a/tests/listening/scenarios/tuner-harness.test.ts b/tests/listening/scenarios/tuner-harness.test.ts
index 9484d96..f2ed11f 100644
--- a/tests/listening/scenarios/tuner-harness.test.ts
+++ b/tests/listening/scenarios/tuner-harness.test.ts
@@ -1,4 +1,4 @@
-// listening.pitch-detection/REQ-002/S5, listening.pitch-detection/REQ-003/S1, listening.pitch-detection/REQ-003/S2, listening.pitch-detection/REQ-004/S1, listening.pitch-detection/REQ-004/S2, practice.tuner/REQ-006/S1 — measured by scripts/tuner-timing-test.mjs (pnpm test:tuner), not re-measured here
+// listening.pitch-detection/REQ-002/S5, listening.pitch-detection/REQ-003/S1, listening.pitch-detection/REQ-003/S2, listening.pitch-detection/REQ-004/S1, listening.pitch-detection/REQ-004/S2, practice.tuner/REQ-006/S1, practice.tuner/REQ-002/S9 — measured by scripts/tuner-timing-test.mjs (pnpm test:tuner), not re-measured here
 // practice.tuner/REQ-006/S3 — "on the phone (acceptance)": the phone walk, measured at acceptance, T024 — not a test here either
 import { readFileSync } from "node:fs";
 import { resolve } from "node:path";
@@ -16,6 +16,7 @@ test("scripts/tuner-timing-test.mjs exists and its header cites the measured sce
     "REQ-004/S1",
     "REQ-004/S2",
     "practice.tuner/REQ-006/S1",
+    "practice.tuner/REQ-002/S9",
   ])
     expect(header).toContain(id);
 });
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-28)

SPEC: PASS · QUALITY: PASS

- The error `|(positionOfNote(target) − position fed) × 100 + cents|` is right in sign, in either spelling, and at E2 and C7; `positionOfNote` matches theory's `pitchPosition` table for table; the gate is on both sweeps only; the PASS and FAIL lines name it; the header's first 900 characters carry every cited ID.
- `AGENTS.md`: only the check counts, the gated-list sentence and the table changed; the table matches `notes.md`. Nothing under `src/` changed; no existing gate loosened.
- [minor, may-defer] a tone whose readings stopped between about 350 ms and 500 ms would pass the new gate with an error of 0 (seeded at 0, no readings after the settle point), and the readings-per-second gate would not catch it. The raw cents column has the same shape. Not live in the recorded run. **Noted for converge.**

Reviewer's commands: the harness citation test 1 passed; `check-scenarios.sh` gaps 0; `check-contexts.sh` clean. Implementer's `pnpm test:tuner` against dev:phone: PASS, shown err max 0 ¢ (sine), 1 ¢ (flute-like, A♯6); `pnpm check` 75 files / 314 tests.

<!-- recorded 2026-09-28T21:29:25Z by scripts/record.sh -->
