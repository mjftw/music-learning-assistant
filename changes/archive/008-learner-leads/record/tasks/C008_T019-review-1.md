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
  - resource: git:27971ab2340e5c1892844d81da6af0d6c2daee8e..23359438b00f58f9875cff6541236d3cd09cd3dc
generated:
  by: process:review-package.sh
  at: 2026-10-04T08:05:08Z
sdd_id: 008-learner-leads
---

# Review package — C008_T019 · 008-learner-leads

base: `27971ab2340e5c1892844d81da6af0d6c2daee8e` → head: `23359438b00f58f9875cff6541236d3cd09cd3dc`

## Commands (run by this script)

### Verify

`pnpm test:lead`

```

> music-learning-assistant@0.0.0 test:lead /home/merlin/projects/music-learning-assistant
> node scripts/lead-timing-test.mjs

driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   8.02                  18.69               93.80           0                              18.69                    PASS  
tone cue fed back  3        70.33                   5.35                  5.35                82.92           0                              5.35                     PASS  
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
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
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
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

- M	AGENTS.md
- M	package.json
- A	scripts/lead-timing-test.mjs
- M	scripts/tuner-timing-test.mjs
- M	src/ui/App.tsx
- M	tests/ui/scenarios/app-session.test.tsx
- M	tests/ui/scenarios/lead-app-helpers.tsx

## Diff

```diff
diff --git a/AGENTS.md b/AGENTS.md
index 586f673..b2cac99 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -88,7 +88,7 @@ pnpm test:timing
 pnpm test:tuner
 # measured lead-run budget (Playwright/Chromium; feeds a scripted lead run of C major as the microphone —
 # silence, a flat entry settling, holds, one drift — and the tone cue fed back) — required at converge
-# and finish from 008, not per task; its healthy output is pasted here at 008's converge:
+# and finish from 008, not per task:
 pnpm test:lead
 # design fidelity screenshots against the vendored prototype (dev-only, human-reviewed):
 pnpm design:shots
@@ -151,6 +151,26 @@ white noise          —      —                       —
 test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
 ```
 
+`pnpm test:lead` runs a scripted lead run of C major (flute Concert, ↑↓ 1 oct,
+15 notes) at medium, 2 beats, 96 bpm, fed as the microphone from the page's own
+AudioContext — each note a flat entry at −30 ¢ settling to −2 ¢ over 650 ms,
+held to its advance, with one drift out of tune on the fourth — then a second
+run with the tone cue on, 1 beat at 150 bpm, where the tool's own 400 ms tone
+is fed back as the microphone at each new target; it takes about 40 seconds.
+Gated: the first readout (≤100 ms), arrival age (≤100 ms), readings per second
+(≥20), each advance within one reading hop (512 frames) of the in-tune time it
+needed, computed from the recorded `NoteJudged` verdicts, and never earlier,
+the advance shown within 100 ms, and — in the tone cue row — no `NoteJudged`
+inside the cue's window and the hold at zero at its end. Paint age is printed
+for information and is not gated.
+
+```
+case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
+lead run C4–C5     15       70.33                   5.35                  8.02                94.21           0                              16.02                    PASS
+tone cue fed back  3        62.33                   8.02                  8.02                83.40           0                              18.69                    PASS
+test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
+```
+
 Run `check` before calling any task done, and paste the output.
 
 ## Conventions
diff --git a/package.json b/package.json
index 1c95149..92454d5 100644
--- a/package.json
+++ b/package.json
@@ -15,6 +15,7 @@
     "pretest": "pnpm build:sound",
     "test:timing": "node scripts/timing-test.mjs",
     "test:tuner": "node scripts/tuner-timing-test.mjs",
+    "test:lead": "node scripts/lead-timing-test.mjs",
     "design:shots": "node scripts/design-shots.mjs"
   },
   "dependencies": {
diff --git a/scripts/lead-timing-test.mjs b/scripts/lead-timing-test.mjs
new file mode 100644
index 0000000..5fe9bf0
--- /dev/null
+++ b/scripts/lead-timing-test.mjs
@@ -0,0 +1,932 @@
+#!/usr/bin/env node
+// Measured lead-run budget — practice.session/REQ-021/S1 (every shown
+// reading within 100 ms of its sound, ≥20 readings/s while steady, every
+// advance shown within 100 ms, each advance at 1250 ms of accumulated
+// in-tune time and never earlier), practice.session/REQ-016/S1's timing
+// (the same budget, read off the hold rule itself) and practice.session/
+// REQ-018/S3 (the tool's own tone, fed back as the microphone, is never
+// judged). Not part of `pnpm check`; AGENTS.md requires it at every
+// converge and finish from 008-learner-leads.
+//
+// Playwright, headless Chromium. No UI is driven at all — the microphone
+// is replaced by an oscillator inside the page's own AudioContext
+// (installMicrophoneOverride, harness-lib.mjs), and the session itself is
+// driven straight off `window.__session` (setSettings/start/stop/snapshot/
+// onNoteJudged/onTargetAdvanced — main.tsx's existing dev-only exposure):
+// `start()` in I lead needs nothing clicked, only `settings.lead.who`.
+//
+// Usage: pnpm test:lead
+// (against dev:phone's HTTPS server: APP_URL=https://localhost:5173 pnpm test:lead)
+
+import { chromium } from "playwright";
+import {
+  APP_URL,
+  ensureDevServer,
+  stopDevServer,
+  installMicrophoneOverride,
+  maxOf,
+  minOf,
+} from "./harness-lib.mjs";
+
+// practice.session/REQ-021, REQ-016 — the budgets this harness gates.
+const FIRST_READOUT_MAX_MS = 100;
+const ARRIVAL_AGE_MAX_MS = 100;
+const READINGS_PER_SECOND_MIN = 20;
+// The hold rule can only act on a reading it has already received — one
+// hop's worth of slack (512 frames, the detector's own hop — notes.md's
+// "the 10.667 ms reading grid") between the reading that completed the
+// hold and the advance that follows it. Never negative: REQ-016's
+// invariant is "never advance early".
+const ADVANCE_LATENESS_MIN_FRAMES = 0;
+const ADVANCE_LATENESS_MAX_FRAMES = 512;
+const SHOWN_LATENESS_MAX_MS = 100;
+
+// The run: C major on flute Concert, ↑↓ 1 oct — 15 notes, C4–C5 — the
+// example traversal and the only instrument variant, both already the
+// fresh-browser defaults (practice.session/REQ-011/S2), so nothing is
+// selected through the UI or through setContext/setTraversal; the harness
+// only asserts the default sequence is what it expects before trusting it.
+const EXPECTED_SEQUENCE_LABELS = "C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4";
+const EXPECTED_TARGETS_COUNT = EXPECTED_SEQUENCE_LABELS.split(" ").length;
+
+// practice.session/REQ-016/S1 — medium, 2 beats, 96 bpm: 1250 ms required.
+const CASE1_HOLD_BEATS = 2;
+const CASE1_TEMPO_BPM = 96;
+const CASE1_REQUIRED_HOLD_MS = (CASE1_HOLD_BEATS * 60000) / CASE1_TEMPO_BPM;
+// REQ-021/S1 — a flat entry at −30 ¢ ramping exponentially (Web Audio's own
+// exponentialRampToValueAtTime, which is linear in cents, since Hz is
+// exponential in cents) to −2 ¢ over 650 ms, then steady until the advance;
+// on target 4 only, a drift to −16 ¢ (outside medium's ±10 ¢ band, so the
+// hold must reset) for 400 ms, then back.
+const ENTRY_CENTS = -30;
+const STEADY_CENTS = -2;
+const RAMP_MS = 650;
+const DRIFT_TARGET_POSITION = 4;
+const DRIFT_CENTS = -16;
+const DRIFT_HOLD_MS = 400;
+const DRIFT_RAMP_MS = 30;
+const SILENCE_MS = 300;
+// A cold AudioContext can stall the first tone's first reading (007's
+// harness saw it: an onset-anchoring artefact of the harness, not a
+// regression). The tuner harness opens every tone after a 0.6 s preroll;
+// this one opens the very first tone after this much more silence than the
+// scripted SILENCE_MS every other target gets.
+const FIRST_TARGET_WARMUP_EXTRA_MS = 300;
+// Lead time for Web Audio parameter scheduling (osc.frequency/gain.gain) —
+// just enough that `setValueAtTime(..., context.currentTime + X)` is never
+// mistaken for "now or the past" by the audio thread.
+const SCHEDULE_LEAD_S = 0.015;
+const GAIN_RAMP_S = 0.005;
+const GAIN_LEVEL = 0.5;
+
+// practice.session/REQ-018/S3 — tone on, 1 beat at 150 bpm (400 ms hold).
+const CASE2_HOLD_BEATS = 1;
+const CASE2_TEMPO_BPM = 150;
+const CASE2_REQUIRED_HOLD_MS = (CASE2_HOLD_BEATS * 60000) / CASE2_TEMPO_BPM;
+// lead.ts's own CUE_TONE_MS/CUE_TAIL_MS and session.ts's TONE_RELEASE_MS,
+// duplicated here the same way trueHzOfPosition is duplicated below — a
+// plain Node script with no bundler step to import the domain's internals
+// through (docs/engineering.md §8: a context's internals never cross out).
+const CUE_TONE_MS = 400;
+const TONE_RELEASE_MS = 40;
+const CUE_TAIL_MS = 100;
+const CUE_MUTE_WINDOW_MS = CUE_TONE_MS + TONE_RELEASE_MS + CUE_TAIL_MS;
+// How many "new target appears" moments the tone-cue case exercises — each
+// one is the tool's own cue tone fed back as the microphone (the speaker
+// bleed), then silence, then the learner's own in-tune note that completes
+// the (400 ms) hold and produces the next one.
+const CASE2_CYCLES = 3;
+
+const REFERENCE_A4_HZ = 440;
+const REFERENCE_A4_POSITION = 69;
+
+// Everything below runs inside the page via a single `page.evaluate` call —
+// every timestamp stays on the page's own performance.now()/AudioContext
+// clocks (tuner-timing-test.mjs's measureInPage does the same, for the same
+// reason: no Node↔browser round trip adds jitter to what is measured).
+function measureInPage(params) {
+  const {
+    expectedTargetsCount,
+    expectedSequenceLabels,
+    case1HoldBeats,
+    case1TempoBpm,
+    case1RequiredHoldMs,
+    entryCents,
+    steadyCents,
+    rampMs,
+    driftTargetPosition,
+    driftCents,
+    driftHoldMs,
+    driftRampMs,
+    silenceMs,
+    firstTargetWarmupExtraMs,
+    scheduleLeadS,
+    gainRampS,
+    gainLevel,
+    case2HoldBeats,
+    case2TempoBpm,
+    case2RequiredHoldMs,
+    cueToneMs,
+    cueMuteWindowMs,
+    case2Cycles,
+    referenceA4Hz,
+    referenceA4Position,
+  } = params;
+
+  const session = window.__session;
+  const listening = window.__listening;
+  if (session === undefined || listening === undefined) {
+    throw new Error(
+      "window.__session/__listening not exposed — dev build only",
+    );
+  }
+
+  function sleep(ms) {
+    return new Promise((resolve) => setTimeout(resolve, ms));
+  }
+
+  async function waitUntil(predicate, timeoutMs = 10_000) {
+    const deadline = performance.now() + timeoutMs;
+    while (!predicate()) {
+      if (performance.now() > deadline) {
+        throw new Error("waitUntil: timed out waiting for a condition");
+      }
+      await sleep(5);
+    }
+  }
+
+  // theory/domain/notes.ts's pitchPosition and temperament's trueHz,
+  // duplicated for the same reason tuner-timing-test.mjs duplicates them
+  // (no bundler step in this plain Node/page-evaluated script).
+  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
+  const ACCIDENTAL_OFFSET = { flat: -1, natural: 0, sharp: 1 };
+  const ACCIDENTAL_SYMBOL = { flat: "♭", natural: "", sharp: "♯" };
+
+  function positionOfNote(note) {
+    return (
+      12 * (note.octave + 1) +
+      LETTER_SEMITONE[note.letter] +
+      ACCIDENTAL_OFFSET[note.accidental]
+    );
+  }
+
+  function trueHzOfPosition(position) {
+    return referenceA4Hz * 2 ** ((position - referenceA4Position) / 12);
+  }
+
+  function hzOfNote(note, cents = 0) {
+    const baseHz = trueHzOfPosition(positionOfNote(note));
+    return baseHz * 2 ** (cents / 1200);
+  }
+
+  function labelOfNote(note) {
+    return `${note.letter}${ACCIDENTAL_SYMBOL[note.accidental]}${note.octave}`;
+  }
+
+  // harness-lib.mjs's maxOf, duplicated — a page.evaluate function's body
+  // is serialised and run inside the page on its own, with no access to
+  // this script's own Node-side imports.
+  function maxOfInPage(values) {
+    if (values.length === 0) return 0;
+    if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
+    return Math.max(...values);
+  }
+
+  // A single oscillator/gain pair reused for a whole case's tones — gain 0
+  // (silent) between them, opened and re-pitched at each onset, rather than
+  // a fresh node per tone (nothing here has a fixed, pre-known duration the
+  // way tuner-timing-test.mjs's steady 1 s tones do: a lead run's "steady
+  // until the advance" phase ends whenever the hold rule says so).
+  function connectRun(context, destination) {
+    const gain = context.createGain();
+    gain.gain.value = 0;
+    gain.connect(destination);
+    const osc = context.createOscillator();
+    osc.type = "sine";
+    osc.frequency.value = 440;
+    osc.connect(gain);
+    osc.start();
+    return { osc, gain };
+  }
+
+  // Opens the gain and sets the frequency at `t0` — "the frame at which
+  // the oscillator's frequency was set and the gain opened" (the brief's
+  // own definition of a tone's onset) — returning that onset's frame.
+  function openToneAt(run, context, sampleRate, t0, hz) {
+    run.gain.gain.cancelScheduledValues(t0);
+    run.gain.gain.setValueAtTime(0, t0);
+    run.gain.gain.linearRampToValueAtTime(gainLevel, t0 + gainRampS);
+    run.osc.frequency.cancelScheduledValues(t0);
+    run.osc.frequency.setValueAtTime(hz, t0);
+    return Math.round(t0 * sampleRate);
+  }
+
+  function closeToneAt(run, t0) {
+    run.gain.gain.cancelScheduledValues(t0);
+    run.gain.gain.setValueAtTime(gainLevel, t0);
+    run.gain.gain.linearRampToValueAtTime(0, t0 + gainRampS);
+  }
+
+  // The rAF loop behind every advance's `shownAtFrame` — practice.session/
+  // REQ-021's "the advance shows … within 100 ms" is about what the
+  // learner sees, not the model; there is no DOM text to watch the way
+  // tuner-timing-test.mjs's armReadoutTracking watches "[data-testid=
+  // tuner-name]" (a lead run's target moves the stave/names view, neither
+  // simple text), so this polls the session's own `snapshot()` once per
+  // animation frame — the same cadence React's own commits are throttled
+  // to — and records the audio-clock frame (context.currentTime ×
+  // sampleRate) at which each change in `lead.target.position` was caught,
+  // which is what a reading or an advance is ever "shown" against.
+  function startShownPoller(context, sampleRate) {
+    const shownChanges = [];
+    let lastPosition = session.snapshot().lead.target?.position ?? null;
+    let running = true;
+    function tick() {
+      if (!running) return;
+      const position = session.snapshot().lead.target?.position ?? null;
+      if (position !== lastPosition) {
+        lastPosition = position;
+        shownChanges.push({
+          position,
+          frame: Math.round(context.currentTime * sampleRate),
+        });
+      }
+      requestAnimationFrame(tick);
+    }
+    requestAnimationFrame(tick);
+    return {
+      // The first change to `advance.position` painted at or after the
+      // advance's own frame (position 1 recurs when the run loops, so a
+      // position alone is not enough to pick the right change).
+      shownFrameOf: (advance) =>
+        shownChanges.find(
+          (change) =>
+            change.position === advance.position &&
+            change.frame >= advance.atFrame,
+        )?.frame,
+      stop: () => {
+        running = false;
+      },
+    };
+  }
+
+  // The hold rule, replicated read-only from the recorded readings — lead.
+  // ts's applyJudgement, over the window between two advances (practice.
+  // session/REQ-016): accumulates between consecutive in-tune readings,
+  // resets on anything else, and reports the first reading's own atFrame at
+  // which the accumulation reaches `requiredMs` — "expected" for the
+  // advance that actually followed it.
+  function expectedAdvanceFrame(readingsInWindow, sampleRate, requiredMs) {
+    let heldMs = 0;
+    let lastInTuneAtMs = null;
+    for (const reading of readingsInWindow) {
+      const atMs = (reading.atFrame / sampleRate) * 1000;
+      if (reading.verdict === "in-tune") {
+        heldMs += lastInTuneAtMs === null ? 0 : atMs - lastInTuneAtMs;
+        lastInTuneAtMs = atMs;
+      } else {
+        heldMs = 0;
+        lastInTuneAtMs = null;
+      }
+      if (heldMs >= requiredMs) return reading.atFrame;
+    }
+    return null;
+  }
+
+  // One target's worth of metrics: the first qualifying NoteJudged's own
+  // arrival delay from this tone's onset, the readings/s over its steady
+  // window (onset + the ramp, through the advance that ended it), the
+  // advance's lateness against the hold rule replicated above, and how
+  // late the advance was shown.
+  function targetMetrics({
+    note,
+    playedPosition,
+    onsetFrame,
+    steadyFromFrame,
+    readings,
+    prevAdvanceAtFrame,
+    advance,
+    shownAtFrame,
+    requiredMs,
+    sampleRate,
+  }) {
+    const firstReading = readings.find(
+      (reading) => reading.atFrame >= onsetFrame,
+    );
+    const firstReadoutMs =
+      firstReading === undefined
+        ? null
+        : ((firstReading.arrivedAtFrame - onsetFrame) / sampleRate) * 1000;
+
+    const windowReadings = readings.filter(
+      (reading) =>
+        reading.atFrame > prevAdvanceAtFrame &&
+        reading.atFrame <= advance.atFrame,
+    );
+    const steadyReadings = windowReadings.filter(
+      (reading) => reading.atFrame >= steadyFromFrame,
+    );
+    const steadySeconds = (advance.atFrame - steadyFromFrame) / sampleRate;
+    const readingsPerSecond =
+      steadySeconds > 0 ? steadyReadings.length / steadySeconds : 0;
+
+    // practice.session/REQ-016 — the hold rule runs on every raw reading,
+    // "committed or not" (session.ts's own comment on commitLeadReading) —
+    // a zero-delay commit timer can batch several raw readings into one
+    // displayed `NoteJudged`, and the batch straddling the advance itself
+    // (the completing reading, then the new target's own first reading,
+    // both inside the same tick) loses the completing one entirely: its
+    // own atFrame is never shown, superseded by the next commit before
+    // this harness's `onNoteJudged` subscription ever sees it (observed
+    // directly: `advance.atFrame` exactly one hop past the window's last
+    // visible reading). `TargetAdvanced` only ever fires on an in-tune
+    // reading that completed the hold (the same invariant's other
+    // direction), so that reading is reconstructed here if the window
+    // does not already carry it — the hold rule's own replication must
+    // not depend on whichever reading a commit happened to land on.
+    const completingReadingMissing = !windowReadings.some(
+      (reading) => reading.atFrame === advance.atFrame,
+    );
+    const windowReadingsForHold = !completingReadingMissing
+      ? windowReadings
+      : [...windowReadings, { atFrame: advance.atFrame, verdict: "in-tune" }];
+    const expectedFrame = expectedAdvanceFrame(
+      windowReadingsForHold,
+      sampleRate,
+      requiredMs,
+    );
+    const advanceLatenessFrames =
+      expectedFrame === null ? null : advance.atFrame - expectedFrame;
+
+    const shownLatenessMs =
+      shownAtFrame === undefined
+        ? null
+        : ((shownAtFrame - advance.atFrame) / sampleRate) * 1000;
+
+    return {
+      position: playedPosition,
+      note,
+      label: labelOfNote(note),
+      firstReadoutMs,
+      readingsPerSecond,
+      advanceLatenessFrames,
+      completingReadingMissing,
+      shownLatenessMs,
+      expectedFrame,
+      windowReadings,
+    };
+  }
+
+  // What a case reports: its per-target metrics, the worst arrival age over
+  // every reading it recorded (not only those inside an advance's window),
+  // and the worst paint age the app reported meanwhile (printed, not gated).
+  function caseResult(perTarget, readings, sampleRate, paintAgesBefore) {
+    const paintAgesDuring = (window.__paintAgesMs ?? []).slice(paintAgesBefore);
+    return {
+      perTarget,
+      arrivalAgeMaxMs: maxOfInPage(
+        readings.map(
+          (reading) =>
+            ((reading.arrivedAtFrame - reading.atFrame) / sampleRate) * 1000,
+        ),
+      ),
+      maxPaintAgeMs:
+        paintAgesDuring.length > 0 ? Math.max(...paintAgesDuring) : null,
+    };
+  }
+
+  // practice.session/REQ-021/S1, REQ-016/S1's timing — the full 15-target
+  // lead run of the example traversal.
+  async function runCase1() {
+    session.setSettings({
+      ...session.snapshot().settings,
+      tempoBpm: case1TempoBpm,
+      lead: {
+        who: "me",
+        holdBeats: case1HoldBeats,
+        tolerance: "medium",
+        cueMeter: true,
+        cueTone: false,
+      },
+    });
+
+    const sequence = session.snapshot().sequence;
+    const labels = sequence.map((entry) => labelOfNote(entry.note)).join(" ");
+    if (labels !== expectedSequenceLabels) {
+      throw new Error(
+        `runCase1: expected the run ${expectedSequenceLabels} (C major, flute Concert, ↑↓ 1 oct — the fresh-browser defaults), got ${labels}`,
+      );
+    }
+
+    const readings = [];
+    const unsubscribeJudged = session.onNoteJudged((event) => {
+      readings.push({
+        atFrame: event.atFrame,
+        cents: event.cents,
+        verdict: event.verdict,
+        arrivedAtFrame: listening.currentFrame(),
+      });
+    });
+    const advances = [];
+    const unsubscribeAdvanced = session.onTargetAdvanced((event) => {
+      advances.push({ position: event.position, atFrame: event.atFrame });
+    });
+
+    const paintAgesBefore = (window.__paintAgesMs ?? []).length;
+
+    // start() → startLead() → requestListening() awaits wakeLock.acquire()
+    // before it ever calls listening.start() (session.ts's own ordering —
+    // the drone goes first, REQ-015/S5); web-audio-listening.ts's own
+    // sampleRate()/currentFrame() report 0 until its internal `listener` is
+    // assigned, which is only once createListener()'s whole async chain
+    // (including the overridden getUserMedia) has resolved — later than
+    // `context()` turning non-null, and later than `__micDestination`
+    // being set (the override sets it from *inside* that same chain). The
+    // first `TargetAdvanced` (REQ-015/S1) only ever fires once that chain
+    // has resolved too, so waiting for it is this harness's one, reliable
+    // "fully ready" signal — nothing here is read before it.
+    session.start();
+    await waitUntil(() => listening.context() !== null);
+    const context = listening.context();
+    await waitUntil(() => window.__micDestination !== undefined);
+    await waitUntil(() => advances.length >= 1);
+    const sampleRate = listening.sampleRate();
+
+    const shownPoller = startShownPoller(context, sampleRate);
+
+    const run = connectRun(context, window.__micDestination);
+
+    const perTarget = [];
+    for (let index = 0; index < expectedTargetsCount; index += 1) {
+      const note = sequence[index].note;
+      const extraSilence = index === 0 ? firstTargetWarmupExtraMs : 0;
+      await sleep(silenceMs + extraSilence);
+
+      const t0 = context.currentTime + scheduleLeadS;
+      const entryHz = hzOfNote(note, entryCents);
+      const steadyHz = hzOfNote(note, steadyCents);
+      const onsetFrame = openToneAt(run, context, sampleRate, t0, entryHz);
+      run.osc.frequency.exponentialRampToValueAtTime(
+        steadyHz,
+        t0 + rampMs / 1000,
+      );
+      await sleep(scheduleLeadS * 1000 + rampMs);
+
+      if (index + 1 === driftTargetPosition) {
+        const t1 = context.currentTime + scheduleLeadS;
+        const driftHz = hzOfNote(note, driftCents);
+        run.osc.frequency.cancelScheduledValues(t1);
+        run.osc.frequency.setValueAtTime(steadyHz, t1);
+        run.osc.frequency.linearRampToValueAtTime(
+          driftHz,
+          t1 + driftRampMs / 1000,
+        );
+        await sleep(scheduleLeadS * 1000 + driftRampMs);
+        const t2 = context.currentTime + scheduleLeadS;
+        run.osc.frequency.setValueAtTime(driftHz, t2);
+        await sleep(scheduleLeadS * 1000 + driftHoldMs);
+        const t3 = context.currentTime + scheduleLeadS;
+        run.osc.frequency.cancelScheduledValues(t3);
+        run.osc.frequency.setValueAtTime(driftHz, t3);
+        run.osc.frequency.linearRampToValueAtTime(
+          steadyHz,
+          t3 + driftRampMs / 1000,
+        );
+        await sleep(scheduleLeadS * 1000 + driftRampMs);
+      }
+
+      const prevAdvanceAtFrame = advances[index].atFrame;
+      await waitUntil(() => advances.length > index + 1);
+      const advance = advances[index + 1];
+      // The rAF poll sees the new target a frame or so after the advance
+      // itself — wait for it rather than reading it before it has run.
+      await waitUntil(() => shownPoller.shownFrameOf(advance) !== undefined);
+      const shownAtFrame = shownPoller.shownFrameOf(advance);
+
+      perTarget.push(
+        targetMetrics({
+          note,
+          playedPosition: index + 1,
+          onsetFrame,
+          steadyFromFrame:
+            onsetFrame + Math.round((rampMs / 1000) * sampleRate),
+          readings,
+          prevAdvanceAtFrame,
+          advance,
+          shownAtFrame,
+          requiredMs: case1RequiredHoldMs,
+          sampleRate,
+        }),
+      );
+
+      closeToneAt(run, context.currentTime + scheduleLeadS);
+    }
+
+    unsubscribeJudged();
+    unsubscribeAdvanced();
+    shownPoller.stop();
+    run.osc.stop();
+    run.osc.disconnect();
+    run.gain.disconnect();
+
+    return caseResult(perTarget, readings, sampleRate, paintAgesBefore);
+  }
+
+  // practice.session/REQ-018/S3 (measured) — tone on, 1 beat at 150 bpm;
+  // as each new target appears the tool's own cue tone is fed back as the
+  // microphone (the speaker bleed) at once, then silence, then the
+  // learner's own in-tune note, which completes the (400 ms) hold and
+  // produces the next target. A fresh run (stop, re-settle, start) so the
+  // very first target gets its own cue tone too ("the first included",
+  // REQ-018) — case 1 left the cue off, and a settings change alone never
+  // replays a cue for the target already current.
+  async function runCase2() {
+    const context = listening.context();
+    const sampleRate = listening.sampleRate();
+    const previousDestination = window.__micDestination;
+
+    // The first cue awaits the sound engine's own start (session.ts's
+    // armCueTone) before it can post its tone and set its mute window —
+    // starting it here, ahead of the run, keeps that one-off start-up out
+    // of the first target's measurement, as the speaker would be silent
+    // (and so there would be nothing to bleed) until it had finished.
+    await window.__sound.start();
+
+    session.stop();
+    session.setSettings({
+      ...session.snapshot().settings,
+      tempoBpm: case2TempoBpm,
+      lead: {
+        ...session.snapshot().settings.lead,
+        holdBeats: case2HoldBeats,
+        cueTone: true,
+      },
+    });
+
+    const readings = [];
+    const unsubscribeJudged = session.onNoteJudged((event) => {
+      readings.push({
+        atFrame: event.atFrame,
+        cents: event.cents,
+        verdict: event.verdict,
+        arrivedAtFrame: listening.currentFrame(),
+      });
+    });
+    const advances = [];
+    const unsubscribeAdvanced = session.onTargetAdvanced((event) => {
+      advances.push({ position: event.position, atFrame: event.atFrame });
+    });
+
+    const shownPoller = startShownPoller(context, sampleRate);
+    const paintAgesBefore = (window.__paintAgesMs ?? []).length;
+
+    async function waitUntilFrame(frame) {
+      await waitUntil(() => listening.currentFrame() >= frame);
+    }
+    const framesOf = (ms) => Math.round((ms / 1000) * sampleRate);
+
+    session.start();
+    await waitUntil(() => window.__micDestination !== previousDestination);
+    await waitUntil(() => advances.length >= 1);
+
+    const run = connectRun(context, window.__micDestination);
+    const sequence = session.snapshot().sequence;
+
+    const perTarget = [];
+    for (let index = 0; index < case2Cycles; index += 1) {
+      await waitUntil(() => advances.length > index);
+      const currentAdvance = advances[index];
+      const note = sequence[currentAdvance.position - 1].note;
+      const hz = hzOfNote(note, 0);
+
+      // The speaker bleed — the tool's own 400 ms cue tone, fed back as the
+      // microphone at the new target's own pitch, right as it appears.
+      const toneT0 = context.currentTime + scheduleLeadS;
+      openToneAt(run, context, sampleRate, toneT0, hz);
+      await sleep(scheduleLeadS * 1000 + cueToneMs);
+      closeToneAt(run, context.currentTime + scheduleLeadS);
+      const bleedEndFrame = listening.currentFrame();
+
+      // The window REQ-018/S3 names runs from the advance (the cue's onset
+      // is scheduled off the advance) for the tone, its release and the
+      // tail; the hold must still be at zero when it has passed.
+      const muteWindowEndFrame =
+        currentAdvance.atFrame + framesOf(cueMuteWindowMs);
+      await waitUntilFrame(muteWindowEndFrame);
+      const heldFractionAtWindowEnd = session.snapshot().lead.heldFraction;
+
+      // Then silence, then the learner's own note — steady and in tune from
+      // its very first reading (REQ-016: the first reading after nothing is
+      // shown as detected).
+      await waitUntilFrame(bleedEndFrame + framesOf(silenceMs));
+      const learnerT0 = context.currentTime + scheduleLeadS;
+      const onsetFrame = openToneAt(run, context, sampleRate, learnerT0, hz);
+
+      await waitUntil(() => advances.length > index + 1);
+      const advance = advances[index + 1];
+      await waitUntil(() => shownPoller.shownFrameOf(advance) !== undefined);
+      const shownAtFrame = shownPoller.shownFrameOf(advance);
+
+      // A reading at the advance's own frame is the one that completed the
+      // hold, judged against the previous target; the window is the
+      // readings strictly after the advance — the ones the cue must mute.
+      const violations = readings.filter(
+        (reading) =>
+          reading.atFrame > currentAdvance.atFrame &&
+          reading.atFrame <= muteWindowEndFrame,
+      );
+
+      perTarget.push({
+        ...targetMetrics({
+          note,
+          playedPosition: currentAdvance.position,
+          onsetFrame,
+          steadyFromFrame: onsetFrame,
+          readings,
+          prevAdvanceAtFrame: currentAdvance.atFrame,
+          advance,
+          shownAtFrame,
+          requiredMs: case2RequiredHoldMs,
+          sampleRate,
+        }),
+        violations,
+        heldFractionAtWindowEnd,
+      });
+    }
+
+    unsubscribeJudged();
+    unsubscribeAdvanced();
+    shownPoller.stop();
+    closeToneAt(run, context.currentTime + scheduleLeadS);
+    run.osc.stop();
+    run.osc.disconnect();
+    run.gain.disconnect();
+    session.stop();
+
+    return caseResult(perTarget, readings, sampleRate, paintAgesBefore);
+  }
+
+  return (async () => ({
+    case1: await runCase1(),
+    case2: await runCase2(),
+  }))();
+}
+
+// One diagnostic line per target whose advance lateness missed its bound —
+// the plan's own risk (a dropped late reading) — naming the readings around
+// it rather than only the aggregate figure (the task brief's step 3).
+function latenessDiagnosticsOf(perTarget) {
+  const lines = [];
+  for (const target of perTarget) {
+    const late = target.advanceLatenessFrames;
+    if (
+      late !== null &&
+      late >= ADVANCE_LATENESS_MIN_FRAMES &&
+      late <= ADVANCE_LATENESS_MAX_FRAMES
+    ) {
+      continue;
+    }
+    const readingsNear = target.windowReadings
+      .slice(-6)
+      .map(
+        (reading) =>
+          `atFrame ${reading.atFrame} ${reading.verdict} ${reading.cents.toFixed(1)}¢`,
+      )
+      .join(" | ");
+    lines.push(
+      `  advance lateness out of bounds at target ${target.position} (${target.label}): ` +
+        `expected frame ${target.expectedFrame}, lateness ${late === null ? "n/a (hold never reached)" : late} frames — readings near it: ${readingsNear}`,
+    );
+  }
+  return lines;
+}
+
+// One row of the table, with the gates it failed named so a FAIL line can
+// say which cell, not only that the run failed.
+function leadRunRow(label, result) {
+  const { perTarget } = result;
+  const firstReadoutMaxMs = maxOf(perTarget.map((t) => t.firstReadoutMs));
+  const arrivalAgeMaxMs = result.arrivalAgeMaxMs;
+  const readingsPerSecondMin = minOf(perTarget.map((t) => t.readingsPerSecond));
+  const advanceLatenessValues = perTarget.map((t) => t.advanceLatenessFrames);
+  const advanceLatenessMax = maxOf(advanceLatenessValues);
+  const advanceEarly = advanceLatenessValues.some(
+    (value) => value !== null && value < ADVANCE_LATENESS_MIN_FRAMES,
+  );
+  const shownLatenessMaxMs = maxOf(perTarget.map((t) => t.shownLatenessMs));
+
+  const failures = [];
+  if (firstReadoutMaxMs > FIRST_READOUT_MAX_MS)
+    failures.push(
+      `first readout max ${firstReadoutMaxMs} ms > ${FIRST_READOUT_MAX_MS}`,
+    );
+  if (arrivalAgeMaxMs > ARRIVAL_AGE_MAX_MS)
+    failures.push(
+      `arrival age max ${arrivalAgeMaxMs} ms > ${ARRIVAL_AGE_MAX_MS}`,
+    );
+  if (readingsPerSecondMin < READINGS_PER_SECOND_MIN)
+    failures.push(
+      `readings/s min ${readingsPerSecondMin} < ${READINGS_PER_SECOND_MIN}`,
+    );
+  if (advanceEarly)
+    failures.push("an advance fell earlier than the in-tune time it needed");
+  if (advanceLatenessMax > ADVANCE_LATENESS_MAX_FRAMES)
+    failures.push(
+      `advance lateness max ${advanceLatenessMax} frames > ${ADVANCE_LATENESS_MAX_FRAMES}`,
+    );
+  if (shownLatenessMaxMs > SHOWN_LATENESS_MAX_MS)
+    failures.push(
+      `shown lateness max ${shownLatenessMaxMs} ms > ${SHOWN_LATENESS_MAX_MS}`,
+    );
+
+  const diagnostics =
+    failures.length === 0 ? [] : latenessDiagnosticsOf(perTarget);
+  const missing = perTarget.filter((t) => t.completingReadingMissing).length;
+  if (missing > 0) {
+    diagnostics.push(
+      `  note: ${missing} of ${perTarget.length} advances were completed by a reading coalesced away before it was shown (session.ts commitLeadReading) — its in-tune verdict is assumed from TargetAdvanced itself`,
+    );
+  }
+
+  return {
+    label,
+    targetsCount: perTarget.length,
+    firstReadoutMaxMs,
+    arrivalAgeMaxMs,
+    paintAgeMaxMs: result.maxPaintAgeMs,
+    readingsPerSecondMin,
+    advanceLatenessMax,
+    shownLatenessMaxMs,
+    failures,
+    diagnostics,
+  };
+}
+
+// REQ-018/S3: no NoteJudged inside the mute window and the hold at zero at
+// its end, on top of the lead run's own gates.
+function toneCueRow(label, result) {
+  const row = leadRunRow(label, result);
+  const { perTarget } = result;
+  const violations = perTarget.flatMap((t) => t.violations);
+  if (violations.length > 0)
+    row.failures.push(
+      `${violations.length} NoteJudged inside the tone cue's mute window`,
+    );
+  const heldNonZero = perTarget.filter((t) => t.heldFractionAtWindowEnd !== 0);
+  if (heldNonZero.length > 0)
+    row.failures.push("the hold was not zero at the mute window's end");
+
+  for (const reading of violations) {
+    row.diagnostics.push(
+      `  NoteJudged during the tone cue's mute window at atFrame ${reading.atFrame} (${reading.verdict}, ${reading.cents.toFixed(1)}¢) — REQ-018/S3`,
+    );
+  }
+  for (const t of heldNonZero) {
+    row.diagnostics.push(
+      `  heldFraction ${t.heldFractionAtWindowEnd} at the mute window's end for target ${t.position} (${t.label}), expected 0 — REQ-018/S3`,
+    );
+  }
+  return row;
+}
+
+function cellsOf(row) {
+  return [
+    row.label,
+    String(row.targetsCount),
+    row.firstReadoutMaxMs.toFixed(2),
+    row.arrivalAgeMaxMs.toFixed(2),
+    row.paintAgeMaxMs === null ? "n/a" : row.paintAgeMaxMs.toFixed(2),
+    row.readingsPerSecondMin.toFixed(2),
+    row.advanceLatenessMax.toFixed(0),
+    row.shownLatenessMaxMs.toFixed(2),
+    row.failures.length === 0 ? "PASS" : "FAIL",
+  ];
+}
+
+function printTable(rows) {
+  const header = [
+    "case",
+    "targets",
+    "first readout max (ms)",
+    "arrival age max (ms)",
+    "paint age max (ms)",
+    "readings/s min",
+    "advance lateness max (frames)",
+    "shown lateness max (ms)",
+    "status",
+  ];
+  const table = [header, ...rows];
+  const widths = header.map((_, columnIndex) =>
+    Math.max(...table.map((row) => row[columnIndex].length)),
+  );
+  for (const row of table) {
+    console.log(
+      row.map((cell, index) => cell.padEnd(widths[index])).join("  "),
+    );
+  }
+}
+
+async function main() {
+  const devServerChild = await ensureDevServer();
+
+  const failures = [];
+  let fatalError = null;
+  try {
+    const browser = await chromium.launch({
+      headless: true,
+      args: [
+        "--autoplay-policy=no-user-gesture-required",
+        "--use-fake-ui-for-media-stream",
+      ],
+    });
+    let results;
+    try {
+      const context = await browser.newContext({ ignoreHTTPSErrors: true });
+      const page = await context.newPage();
+      try {
+        await page.addInitScript(installMicrophoneOverride);
+        await page.goto(APP_URL);
+        await page.waitForFunction(
+          () =>
+            window.__session !== undefined && window.__listening !== undefined,
+        );
+
+        console.log(
+          "driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext",
+        );
+
+        results = await page.evaluate(measureInPage, {
+          expectedTargetsCount: EXPECTED_TARGETS_COUNT,
+          expectedSequenceLabels: EXPECTED_SEQUENCE_LABELS,
+          case1HoldBeats: CASE1_HOLD_BEATS,
+          case1TempoBpm: CASE1_TEMPO_BPM,
+          case1RequiredHoldMs: CASE1_REQUIRED_HOLD_MS,
+          entryCents: ENTRY_CENTS,
+          steadyCents: STEADY_CENTS,
+          rampMs: RAMP_MS,
+          driftTargetPosition: DRIFT_TARGET_POSITION,
+          driftCents: DRIFT_CENTS,
+          driftHoldMs: DRIFT_HOLD_MS,
+          driftRampMs: DRIFT_RAMP_MS,
+          silenceMs: SILENCE_MS,
+          firstTargetWarmupExtraMs: FIRST_TARGET_WARMUP_EXTRA_MS,
+          scheduleLeadS: SCHEDULE_LEAD_S,
+          gainRampS: GAIN_RAMP_S,
+          gainLevel: GAIN_LEVEL,
+          case2HoldBeats: CASE2_HOLD_BEATS,
+          case2TempoBpm: CASE2_TEMPO_BPM,
+          case2RequiredHoldMs: CASE2_REQUIRED_HOLD_MS,
+          cueToneMs: CUE_TONE_MS,
+          cueMuteWindowMs: CUE_MUTE_WINDOW_MS,
+          case2Cycles: CASE2_CYCLES,
+          referenceA4Hz: REFERENCE_A4_HZ,
+          referenceA4Position: REFERENCE_A4_POSITION,
+        });
+      } finally {
+        await context.close();
+      }
+    } finally {
+      await browser.close();
+    }
+
+    const rows = [
+      leadRunRow("lead run C4–C5", results.case1),
+      toneCueRow("tone cue fed back", results.case2),
+    ];
+    printTable(rows.map(cellsOf));
+    for (const row of rows) {
+      for (const line of row.diagnostics) console.log(line);
+    }
+    failures.push(
+      ...rows.flatMap((row) =>
+        row.failures.map((failure) => `${row.label}: ${failure}`),
+      ),
+    );
+  } catch (error) {
+    fatalError = error;
+  } finally {
+    stopDevServer(devServerChild);
+  }
+
+  if (fatalError !== null) {
+    console.error(
+      `test:lead: FAIL — ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`,
+    );
+    process.exitCode = 1;
+    return;
+  }
+
+  if (failures.length > 0) {
+    console.error(`test:lead: FAIL — ${failures.join("; ")}`);
+    process.exitCode = 1;
+    return;
+  }
+  console.log(
+    `test:lead: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, advance within one hop and never early, shown ≤${SHOWN_LATENESS_MAX_MS} ms, nothing judged during the tone`,
+  );
+}
+
+main().catch((error) => {
+  console.error(error);
+  process.exitCode = 1;
+});
diff --git a/scripts/tuner-timing-test.mjs b/scripts/tuner-timing-test.mjs
index 51bd34d..108164e 100644
--- a/scripts/tuner-timing-test.mjs
+++ b/scripts/tuner-timing-test.mjs
@@ -75,10 +75,6 @@ const HANDOVER_END_HZ = 470; // ~A♯4, ramped through the 56 ¢ crossing
 const SILENCE_SECONDS = 2;
 const NOISE_SECONDS = 2;
 
-// positionsE2ToC7, noteLabelOfPosition, isDevServerUp, waitForDevServer,
-// ensureDevServer, stopDevServer and installMicrophoneOverride moved to
-// harness-lib.mjs (C008_T018) — imported above.
-
 // Everything below runs inside the page via a single `page.evaluate` call —
 // every timestamp (onset, mutation, PitchDetected, NoteJudged, paint) stays
 // on the page's own performance.now()/AudioContext clocks, exactly as
@@ -489,9 +485,6 @@ function measureInPage(params) {
   }))();
 }
 
-// maxOf, minOf, paintAgeMaxOf and printTable moved to harness-lib.mjs
-// (C008_T018) — imported above.
-
 // The tone whose `selector(tone)` is largest — null sorts as worse than any
 // number (it means no matching reading ever arrived for that tone at all).
 // Attributes a sweep row's worst figure to a specific note so a stray
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 665d5ca..7bf09f8 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -1,6 +1,7 @@
 import {
   useCallback,
   useEffect,
+  useLayoutEffect,
   useMemo,
   useRef,
   useState,
@@ -688,6 +689,21 @@ export function App(props: {
     },
     [session, onPaintAge],
   );
+  // practice.session/REQ-021 — the same report as the tuner's reading
+  // above, for a lead run's reading instead: there is no separate "lead
+  // screen" component to own this the way TunerScreen owns its own
+  // useLayoutEffect, so it lives here, keyed on the reading's own atFrame
+  // (not the NoteJudged object) so a re-render that commits nothing new
+  // reports only once — null outside "listening" (idle, complete and
+  // cannot-hear all show nothing).
+  const leadReadingAtFrame =
+    snapshot !== null && snapshot.lead.phase === "listening"
+      ? snapshot.lead.reading?.atFrame
+      : undefined;
+  useLayoutEffect(() => {
+    if (leadReadingAtFrame !== undefined)
+      handleReadingShown(leadReadingAtFrame);
+  }, [leadReadingAtFrame, handleReadingShown]);
 
   const handleSelectKey = useCallback((selectedWedgeKey: Key) => {
     setSelection((current) => {
diff --git a/tests/ui/scenarios/app-session.test.tsx b/tests/ui/scenarios/app-session.test.tsx
index 3176dbf..9e18fae 100644
--- a/tests/ui/scenarios/app-session.test.tsx
+++ b/tests/ui/scenarios/app-session.test.tsx
@@ -28,10 +28,12 @@ import {
   variantOf,
 } from "../../practice/fakes";
 import {
+  flushApp,
   openSheet,
   pill,
   pillSelected,
   renderLeadApp,
+  startLeadInApp,
   storedCMajor,
 } from "./lead-app-helpers";
 
@@ -714,3 +716,24 @@ test("practice.session/REQ-012/S4 (app) — the descent group follows the sessio
     "D♯",
   ]);
 });
+
+// practice.session/REQ-021's measured lead budget (pnpm test:lead,
+// C008_T019) reads a lead reading's paint age off onPaintAge the same way
+// practice.tuner/REQ-006's harness does for the tuner's own reading
+// (tuner-screen.test.tsx) — this proves App forwards it for a lead run too,
+// mirroring that test's own shape exactly (bump the fake's frame after the
+// reading commits but before the deferred layout effect flushes, so the
+// reported age is the gap between them, not zero).
+test("practice.session/REQ-021 — every painted lead reading is reported with its age", async () => {
+  const ages: number[] = [];
+  const app = renderLeadApp(storedCMajor(), {
+    onPaintAge: (ms) => ages.push(ms),
+  });
+  await startLeadInApp(app);
+  app.listening.frame = 0;
+  app.listening.feed(262.5, 0);
+  app.clock.advance(1);
+  app.listening.frame = 480;
+  await flushApp();
+  expect(ages.at(-1)).toBe(10);
+});
diff --git a/tests/ui/scenarios/lead-app-helpers.tsx b/tests/ui/scenarios/lead-app-helpers.tsx
index 0d6f1f9..29dad93 100644
--- a/tests/ui/scenarios/lead-app-helpers.tsx
+++ b/tests/ui/scenarios/lead-app-helpers.tsx
@@ -1,4 +1,5 @@
 import { act, render, screen, within } from "@testing-library/react";
+import type { ComponentProps } from "react";
 import userEvent from "@testing-library/user-event";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
@@ -32,7 +33,13 @@ export function storedCMajor(
   };
 }
 
-export function renderLeadApp(stored: StoredSelection = storedCMajor()) {
+export function renderLeadApp(
+  stored: StoredSelection = storedCMajor(),
+  // Additive, mirroring tuner-helpers.ts's enterTuner — lets a scenario
+  // reach an <App> prop renderLeadApp doesn't otherwise expose (e.g.
+  // onPaintAge, C008_T019) without its own render/open dance.
+  extraProps: Partial<ComponentProps<typeof App>> = {},
+) {
   localStorage.clear();
   localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
   const fakes = sessionDepsWithFakes();
@@ -41,6 +48,7 @@ export function renderLeadApp(stored: StoredSelection = storedCMajor()) {
       catalogue={builtInCatalogue()}
       selectionStore={localStorageSelectionStore(localStorage)}
       sessionDeps={fakes.sessionDeps}
+      {...extraProps}
     />,
   );
   return { ...fakes, user: userEvent.setup() };
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


<!-- recorded 2026-10-04T08:10:20Z by scripts/record.sh -->
