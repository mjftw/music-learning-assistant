---
type: Task Review
title: Review package — C008_T020 · 008-learner-leads
description: The diff produced for C008_T020, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T020.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T020.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T020.md
  - resource: git:ec7d9cb552ccee0f5ef4404b32d1ef47942e8bda..63466f9fdd14ec301e43bf91841e75faedcfacfb
generated:
  by: process:review-package.sh
  at: 2026-10-04T09:02:30Z
sdd_id: 008-learner-leads
---

# Review package — C008_T020 · 008-learner-leads

base: `ec7d9cb552ccee0f5ef4404b32d1ef47942e8bda` → head: `63466f9fdd14ec301e43bf91841e75faedcfacfb`

## Commands (run by this script)

### Verify

`ls changes/008-learner-leads/design/rounds/shots/ | wc -l`

```
24
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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
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

- A	scripts/design-shots-page.mjs
- M	scripts/design-shots.mjs
- M	scripts/design_snapshot.py

## Diff

```diff
diff --git a/scripts/design-shots-page.mjs b/scripts/design-shots-page.mjs
new file mode 100644
index 0000000..988634e
--- /dev/null
+++ b/scripts/design-shots-page.mjs
@@ -0,0 +1,178 @@
+// In-page helpers for the design-review loop's live states. Both
+// scripts/design-shots.mjs and scripts/design_snapshot.py inject this file into
+// the page before the app's own scripts (Playwright's addInitScript /
+// add_init_script) and call window.__shotTones, so the two drivers share one
+// copy of the tone-feeding logic. Plain browser JS, no module syntax; the .mjs
+// extension only keeps it with its sibling scripts under the lint and format
+// rules.
+//
+// What it drives is the dev build's hooks (src/ui/main.tsx): window.__session,
+// window.__listening and, once harness-lib.mjs's installMicrophoneOverride has
+// replaced getUserMedia, window.__micDestination — a
+// MediaStreamAudioDestinationNode on the app's own AudioContext whose stream
+// the app takes for the microphone. A sine into that node is "the learner".
+(() => {
+  const TONE_GAIN = 0.5;
+  const TONE_RAMP_S = 0.005;
+  const MIC_WAIT_MS = 30_000;
+  // A4 = 440 Hz at pitchPosition 69 (C4 = 60) — the app's default reference,
+  // which the fresh browser these shots use has not changed.
+  const REFERENCE_A4_HZ = 440;
+  const REFERENCE_A4_POSITION = 69;
+  // The lead card's 1-beat hold at 96 bpm is 625 ms; the hold's reading
+  // cadence adds the first reading's latency. See the advance burst below.
+  const FAST_TEMPO_BPM = 200;
+  const DEFAULT_TEMPO_BPM = 96;
+
+  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
+  const ACCIDENTAL_OFFSET = { flat: -1, natural: 0, sharp: 1 };
+
+  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
+
+  function hzOfTarget(target, cents) {
+    const position =
+      12 * (target.note.octave + 1) +
+      LETTER_SEMITONE[target.note.letter] +
+      ACCIDENTAL_OFFSET[target.note.accidental];
+    return (
+      REFERENCE_A4_HZ *
+      2 ** ((position - REFERENCE_A4_POSITION) / 12) *
+      2 ** (cents / 1200)
+    );
+  }
+
+  // The destination is set from inside the override's getUserMedia, itself
+  // reached only once the run has asked for the microphone.
+  async function micReady() {
+    const deadline = performance.now() + MIC_WAIT_MS;
+    while (
+      window.__micDestination === undefined ||
+      window.__listening.context() === null
+    ) {
+      if (performance.now() > deadline) {
+        throw new Error("the microphone destination never appeared");
+      }
+      await sleep(20);
+    }
+    return window.__listening.context();
+  }
+
+  function openTone(context, hz) {
+    const gain = context.createGain();
+    gain.gain.value = 0;
+    gain.connect(window.__micDestination);
+    const osc = context.createOscillator();
+    osc.type = "sine";
+    osc.frequency.value = hz;
+    osc.connect(gain);
+    osc.start();
+    return { osc, gain };
+  }
+
+  function currentTarget() {
+    const target = window.__session.snapshot().lead.target;
+    if (target === null) throw new Error("no lead target to tune against");
+    return target;
+  }
+
+  window.__shotTones = {
+    // Merges `overrides` over the session's settings (lead merged one level
+    // down) — the harnesses' way, off the dev hook.
+    setSettings(overrides) {
+      const session = window.__session;
+      const settings = session.snapshot().settings;
+      session.setSettings({
+        ...settings,
+        ...overrides,
+        lead: { ...settings.lead, ...(overrides.lead ?? {}) },
+      });
+    },
+
+    // A steady sine `cents` from the current target, or silence for null.
+    async feed(cents) {
+      const context = await micReady();
+      if (
+        window.__shotTone === undefined ||
+        window.__shotTone.destination !== window.__micDestination
+      ) {
+        window.__shotTone = {
+          ...openTone(context, REFERENCE_A4_HZ),
+          destination: window.__micDestination,
+        };
+      }
+      const { osc, gain } = window.__shotTone;
+      const now = context.currentTime;
+      if (cents === null) {
+        gain.gain.cancelScheduledValues(now);
+        gain.gain.setValueAtTime(gain.gain.value, now);
+        gain.gain.linearRampToValueAtTime(0, now + TONE_RAMP_S);
+        return;
+      }
+      osc.frequency.cancelScheduledValues(now);
+      osc.frequency.setValueAtTime(hzOfTarget(currentTarget(), cents), now);
+      gain.gain.cancelScheduledValues(now);
+      gain.gain.setValueAtTime(0, now);
+      gain.gain.linearRampToValueAtTime(TONE_GAIN, now + TONE_RAMP_S);
+    },
+
+    // An in-tune sine on the current target for `durationMs`, then silence —
+    // scheduled on the audio clock so its end is exact. Returns at once; the
+    // caller waits the duration out.
+    async burst(durationMs) {
+      const context = await micReady();
+      const { gain } = openTone(context, hzOfTarget(currentTarget(), 0));
+      const start = context.currentTime + 0.02;
+      const end = start + durationMs / 1000;
+      gain.gain.setValueAtTime(0, start);
+      gain.gain.linearRampToValueAtTime(TONE_GAIN, start + TONE_RAMP_S);
+      gain.gain.setValueAtTime(TONE_GAIN, end);
+      gain.gain.linearRampToValueAtTime(0, end + TONE_RAMP_S);
+    },
+
+    // Holds every note of the run in tune, one after another, at the fastest
+    // settings (loop off, 1 beat at 200 bpm: 300 ms a note), until the run is
+    // complete, then puts the tempo back to the default. The retune per
+    // target is done here — a round trip from the driver per note would be
+    // slower than the hold. A tempo change does not leave the complete card.
+    async playRunToComplete(timeoutMs) {
+      window.__shotTones.setSettings({
+        loop: false,
+        tempoBpm: FAST_TEMPO_BPM,
+        lead: { holdBeats: 1 },
+      });
+      const context = await micReady();
+      const { osc, gain } = openTone(context, REFERENCE_A4_HZ);
+      const deadline = performance.now() + timeoutMs;
+      let tunedTo = null;
+      while (window.__session.snapshot().lead.phase !== "complete") {
+        if (performance.now() > deadline) {
+          throw new Error("the run never reached complete");
+        }
+        const target = window.__session.snapshot().lead.target;
+        if (target !== null && target.position !== tunedTo) {
+          tunedTo = target.position;
+          const now = context.currentTime;
+          osc.frequency.cancelScheduledValues(now);
+          osc.frequency.setValueAtTime(hzOfTarget(target, 0), now);
+          gain.gain.cancelScheduledValues(now);
+          gain.gain.setValueAtTime(0, now);
+          gain.gain.linearRampToValueAtTime(TONE_GAIN, now + TONE_RAMP_S);
+        }
+        await sleep(5);
+      }
+      gain.gain.value = 0;
+      window.__shotTones.setSettings({ tempoBpm: DEFAULT_TEMPO_BPM });
+    },
+
+    // What the lead run shows right now, for a driver to wait on or verify.
+    leadSnapshot() {
+      const lead = window.__session.snapshot().lead;
+      return {
+        phase: lead.phase,
+        position: lead.target?.position ?? null,
+        heldFraction: lead.heldFraction,
+        justHeld: lead.justHeld,
+      };
+    },
+  };
+})();
diff --git a/scripts/design-shots.mjs b/scripts/design-shots.mjs
index 6eebab4..268bb4b 100644
--- a/scripts/design-shots.mjs
+++ b/scripts/design-shots.mjs
@@ -1,44 +1,54 @@
 #!/usr/bin/env node
 // Design-review loop: drives the vendored prototype and the live app to the
 // same named UI state and writes paired 390x844 @2x screenshots to
-// .sdd/design-review/, so the agent — and then the user — can compare
-// fidelity side by side. Originated for the 002-circle-redesign delta;
-// PROTOTYPE_PATH and STATES pointed at 003-hear-the-scale's prototype and
-// its states, then at 005-scale-selection's, then at 004-the-drone's, then
-// (T020) at 007-hear-me's two prototype files, Practice.dc.html and
-// Tuner.dc.html.
+// changes/008-learner-leads/design/rounds/shots/, so the agent — and then the
+// user — can compare fidelity side by side. Originated for the
+// 002-circle-redesign delta; PROTOTYPE_PATH and STATES pointed at
+// 003-hear-the-scale's prototype and its states, then at 005-scale-selection's,
+// then at 004-the-drone's, then at 007-hear-me's two prototype files, and (008
+// T020) at 008-learner-leads' canvas, Learner Leads Final.dc.html, and its
+// single-phone prototype, Learner Leads Practice.dc.html.
 // Dev-only: not part of the test suite, not asserted against in CI (each
 // change's plan.md keeps this judgement human-plus-agent, not a
 // pixel-diff gate).
 
 import { chromium } from "playwright";
-import { spawn } from "node:child_process";
 import { mkdir, readFile } from "node:fs/promises";
-import net from "node:net";
 import path from "node:path";
 import { fileURLToPath, pathToFileURL } from "node:url";
+import {
+  APP_URL,
+  ensureDevServer,
+  installMicrophoneOverride,
+  stopDevServer,
+} from "./harness-lib.mjs";
 
 const __dirname = path.dirname(fileURLToPath(import.meta.url));
 const REPO_ROOT = path.resolve(__dirname, "..");
-const OUTPUT_DIR = path.join(REPO_ROOT, ".sdd", "design-review");
-const DESIGN_DIR = path.join(REPO_ROOT, "changes", "007-hear-me", "design");
-const PRACTICE_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Practice.dc.html");
-const TUNER_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Tuner.dc.html");
-// Tuner.dc.html carries its own `<dc-import name="Practice" …>` (a "way in"
-// thumbnail, elsewhere on its canvas) whose sibling fetch fails the same way
-// 004's Drone Ideas canvas's did (file:// + Chromium's Fetch API — see the
-// git history for that shim); unlike 004, none of the frames this task
-// captures (`data-screen-label`s "4a Auto or target", "5c Pitch spiral")
-// sit inside that import, so the failure is left as harmless console noise
-// rather than special-cased again.
-// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
-// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
-// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
-const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
+const DESIGN_DIR = path.join(
+  REPO_ROOT,
+  "changes",
+  "008-learner-leads",
+  "design",
+);
+const OUTPUT_DIR = path.join(DESIGN_DIR, "rounds", "shots");
+// The canvas: eleven phones, ids #s01…#s11 (11 is a simulated player — a demo
+// with nothing to build, so it has no state below). The second file is the
+// one-phone prototype the canvas imports, props `mode` (tool / me) and
+// `llState`; it carries the two Interface rows the canvas does not draw.
+const CANVAS_PROTOTYPE_PATH = path.join(
+  DESIGN_DIR,
+  "Learner Leads Final.dc.html",
+);
+const PRACTICE_PROTOTYPE_PATH = path.join(
+  DESIGN_DIR,
+  "Learner Leads Practice.dc.html",
+);
 const VIEWPORT = { width: 390, height: 844 };
+// Wide and tall enough to hold any one prototype phone (392 × 846, or the
+// one-phone page's 863) whole.
+const PROTOTYPE_VIEWPORT = { width: 480, height: 1000 };
 const DEVICE_SCALE_FACTOR = 2;
-const DEV_SERVER_POLL_INTERVAL_MS = 500;
-const DEV_SERVER_TIMEOUT_MS = 30_000;
 // The prototype's <link> pulls the same four @fontsource families the app
 // imports in src/ui/main.tsx (Instrument Serif 400, Noto Music 400, Public
 // Sans 400/500/600/700, JetBrains Mono 400/500/600) — routing its Google
@@ -121,16 +131,49 @@ async function fulfillGoogleFontRequests(page) {
   });
 }
 
+// The canvas is eleven frames, each a `<dc-import name="Learner Leads
+// Practice" …>` — the design tool's runtime (support.js) resolves that sibling
+// component with `fetch("./Learner%20Leads%20Practice.dc.html")`
+// (`ensureFetched`) the first time any frame needs it. Chromium's Fetch API
+// rejects the `file:` scheme outright (unlike navigation or a `<script src>`,
+// which both work for it), so on the file:// URL the canvas loads from, that
+// fetch throws and every `dc-import` renders an empty placeholder forever —
+// confirmed against the live page (blank phones), not assumed.
+// `window.__resourceBlobs` is the runtime's own escape hatch for exactly this
+// case (support.js's `bundledBlob`): a same-keyed Blob found there is read
+// with `.text()` instead of being fetched, so seeding it before the runtime's
+// first script runs (`addInitScript`) with the component's real source makes
+// every `dc-import` on the page resolve normally. (The same shim 004's Drone
+// Ideas canvas needed.)
+const SIBLING_COMPONENT_NAME = "Learner Leads Practice";
+
+async function fulfillSiblingComponentFetch(page) {
+  const source = await readFile(PRACTICE_PROTOTYPE_PATH, "utf8");
+  await page.addInitScript(
+    ({ url, source: componentSource }) => {
+      window.__resourceBlobs = {
+        [url]: new Blob([componentSource], { type: "text/html" }),
+      };
+    },
+    {
+      url: `./${encodeURIComponent(SIBLING_COMPONENT_NAME)}.dc.html`,
+      source,
+    },
+  );
+}
+
 // React re-serialises every inline `style` attribute it renders (canonical
 // property order, `border-radius: 18px` with the space `rustfmt`-style,
 // colours as `rgb(...)`) regardless of how the vendored source wrote it —
 // confirmed against the rendered DOM, not assumed — so a selector matching
 // the *rendered* attribute needs that space even though the source HTML
 // (readable by grep) does not have one. This is the one phone-frame div on
-// a single-screen prototype page (Practice.dc.html); a multi-frame canvas
-// (Tuner.dc.html) is addressed directly by each frame's own
-// `data-screen-label` instead, which React leaves untouched.
+// the single-phone prototype page (Learner Leads Practice.dc.html).
 const PHONE_FRAME_SELECTOR = '[style*="border-radius: 18px"]';
+// The canvas's phones are addressed by their wrapper's own id (`s01`…`s11`,
+// `id="s{{ o.id }}"`): the wrapper holds a title row, a description and then
+// the phone itself as its third child.
+const canvasPhoneSelector = (id) => `#s${id} > div:nth-child(3)`;
 const FRAME_RENDER_TIMEOUT_MS = 10_000;
 const FRAME_RENDER_POLL_INTERVAL_MS = 100;
 // The dc-runtime's own template syntax (`{{ … }}`) is left literally in an
@@ -170,17 +213,20 @@ const PROTOTYPE_STATE_SETTLE_MS = 400;
 // How long an app driver's last interaction (a click, an evaluated verb) is
 // given to settle before the screenshot — covers the same kind of
 // re-render/animation gap as PROTOTYPE_STATE_SETTLE_MS above, on the app
-// side.
+// side. A state whose reading is time-boxed (a hold part-way, the "held ✓"
+// that lasts 0.4 s) sets `appSettleMs: 0` and takes the shot as soon as its
+// driver returns.
 const APP_SCREENSHOT_SETTLE_MS = 500;
+// How many times a time-boxed live state is re-driven on a fresh page when
+// its own `appVerify` says the shot missed the moment.
+const APP_VERIFY_ATTEMPTS = 4;
 
 // support.js's `init()` does `Object.assign(window, api)`, so
 // `window.__dcSetProps(name, overrides)` / `window.__dcRootName()` — the
 // same bridge the design tool's own "Tweaks" panel drives the page through
 // — are reachable from outside once the runtime has booted, without editing
 // the vendored file: `__dcSetProps` merges `overrides` over the
-// `data-props` schema's defaults and triggers a re-render (confirmed against
-// the running page: `state: "cannot hear"` alone reproduces the NO MIC
-// chrome and the "Can't hear" card).
+// `data-props` schema's defaults and triggers a re-render.
 async function applyPrototypeState(page, frame, state) {
   if (state.prototypeProps) {
     await page.waitForFunction(
@@ -200,112 +246,238 @@ async function applyPrototypeState(page, frame, state) {
   }
 }
 
-const TUNER_READING_FRAME_SELECTOR = '[data-screen-label="4a Auto or target"]';
-const TUNER_TARGET_SHEET_FRAME_SELECTOR =
-  '[data-screen-label="5c Pitch spiral"]';
-
-// Opens the target sheet (tapping the collapsed "TARGET auto · nearest"
-// pill) then pins the note currently sounding — the sheet's own "Hold" card
-// — the same two-tap path practice.tuner/REQ-004/S1 describes. Scoped to
-// `frame` (not `page`): both texts are repeated by the file's other
-// exploratory frames stacked on the same tall canvas, so an unscoped query
-// would match more than one.
-async function holdTargetOnPrototype(frame) {
-  await frame.getByText("auto · nearest").click();
-  await frame.getByText("Hold", { exact: true }).click();
+// ---------------------------------------------------------------------------
+// Prototype drivers (scoped to `frame`: the Practice page holds the whole
+// sheet in its DOM, so unscoped text queries would still be fine there, but
+// the canvas repeats every label eleven times).
+// ---------------------------------------------------------------------------
+
+// The one-phone prototype's ▶ is the second "▶" on the page (the first is the
+// drone pill's). The prototype's own card draws only the lead states
+// (`running` there is the lead run), so a play-along run is shown in it by
+// the panel alone — the sounding note highlighted — and its card stays the
+// idle card: the live card (❚❚, "<note> · k of N") is "not drawn on the
+// canvas, ruled at the walkthrough" (the proposal's Interface table). The shot
+// waits out the count-in (3 beats at 96 bpm) and a note.
+const PROTOTYPE_COUNT_IN_AND_NOTE_MS = 3200;
+
+async function playOnPrototype(frame) {
+  await frame.getByText("▶", { exact: true }).nth(1).click();
+  await frame.page().waitForTimeout(PROTOTYPE_COUNT_IN_AND_NOTE_MS);
 }
 
-// The app driver shared by every tuner-* state below: opens the tuner and
-// waits for its own "‹ Practice" back button (TunerScreen's
-// aria-label="Practice") so a later step never races the screen's mount.
-// That button is drawn whether or not the microphone was granted
-// (practice.tuner/REQ-007/S1: the chrome still draws without it), so this
-// one driver covers tuner-cannot-hear too.
-async function enterTuner(page) {
-  await page.getByRole("button", { name: "Tuner" }).click();
-  await page.getByRole("button", { name: "Practice", exact: true }).waitFor();
+// Cues → meter off, through the sheet (Practice prototype in I lead,
+// `llState: "holding"`), then the sheet closed again.
+async function meterOffOnPrototype(frame) {
+  await frame.getByText("edit ›").click();
+  await frame.getByText("meter", { exact: true }).click();
+  // The sheet's ✕ is the first of five (scales, tempo, picker and settings
+  // each have their own, later in the file).
+  await frame.getByText("✕", { exact: true }).first().click();
 }
 
-// Chromium's standard recipe for automating getUserMedia: the first flag
-// auto-accepts the permission prompt headless would otherwise leave
-// unanswered; the second guarantees a virtual input device exists
-// regardless of the host's own audio hardware (confirmed silent, not a
-// synthetic tone — the app still reads "Play a note" behind it), so
-// `pnpm design:shots` behaves the same on a bare CI box as on a laptop with
-// a real microphone. Only the app screenshots that actually listen are
-// taken from a browser launched with this; tuner-cannot-hear is
-// deliberately taken from the other one, so the prompt is left denied.
-const APP_MEDIA_LAUNCH_ARGS = [
-  "--use-fake-ui-for-media-stream",
-  "--use-fake-device-for-media-stream",
-];
+// ---------------------------------------------------------------------------
+// App drivers. The live app is reached through its visible controls — the
+// mode words, the start circle, "edit ›" — and, for the listening states, the
+// microphone override of harness-lib.mjs (`installMicrophoneOverride`): the
+// app's own AudioContext hands a MediaStreamAudioDestinationNode's stream
+// back as the microphone and a sine fed into that node is the "learner". The
+// in-page tone-feeding code (scripts/design-shots-page.mjs, shared with
+// design_snapshot.py) is injected before the app loads; `tones` below calls it.
+// ---------------------------------------------------------------------------
+
+const PAGE_HELPERS_PATH = path.join(__dirname, "design-shots-page.mjs");
+const MODE_WORD_I_LEAD = "mode-word-me";
+const START_CIRCLE = "start-circle";
+const COMPLETE_TIMEOUT_MS = 30_000;
+
+const tones = {
+  setSettings: (page, overrides) =>
+    page.evaluate((o) => window.__shotTones.setSettings(o), overrides),
+  feed: (page, cents) =>
+    page.evaluate((c) => window.__shotTones.feed(c), cents),
+  burst: (page, durationMs) =>
+    page.evaluate((ms) => window.__shotTones.burst(ms), durationMs),
+  playRunToComplete: (page) =>
+    page.evaluate(
+      (ms) => window.__shotTones.playRunToComplete(ms),
+      COMPLETE_TIMEOUT_MS,
+    ),
+  leadSnapshot: (page) =>
+    page.evaluate(() => window.__shotTones.leadSnapshot()),
+};
+
+async function chooseILead(page) {
+  await page.getByTestId(MODE_WORD_I_LEAD).click();
+}
+
+async function openSheet(page) {
+  await page.getByText("edit ›").click();
+  await page.getByTestId("sheet-close").waitFor();
+}
+
+async function closeSheet(page) {
+  await page.getByTestId("sheet-close").click();
+  await page.getByTestId("sheet-close").waitFor({ state: "hidden" });
+}
+
+// Starts the lead run the way a learner does (the circle, which asks for the
+// microphone at that moment) and waits for the first target to be shown.
+async function startLeadRun(page) {
+  await page.getByTestId(START_CIRCLE).click();
+  await page.getByTestId("stop-circle").waitFor();
+}
 
-// The six states this task compares: `practice-way-in` (Practice.dc.html,
-// no interaction, both sides); the tuner reading frame (4a) at three Tweaks
-// states — listening, silent, cannot-hear — plus a target pinned on it by
-// driving the same "Hold" path on both sides; and the target sheet (5c, its
-// spiral already the frame's own baked-in state, needing no driver) against
-// the app's TargetSheet opened by TARGET.
+// "<note> held ✓" lasts until the first reading against the new target (or
+// 0.4 s of silence), and a tone that is still sounding when the target
+// advances gives that reading within one hop. So the advance is made the last
+// thing the microphone hears: an in-tune burst of about the first reading's
+// latency plus the 625 ms hold of one beat at 96 bpm, then silence. Measured:
+// 650 ms advances with the burst's last reading; 660 ms and longer let a
+// reading against the new target through. The other lengths are the retries'
+// jitter.
+const ADVANCE_BURST_MS_BY_ATTEMPT = [650, 646, 654, 642];
+// The first target's warm-up (the listening graph settling) before a burst.
+const BURST_WARMUP_MS = 300;
+// How long after the burst's nominal end the shot is taken: the advance lands
+// on the burst's last reading, ~40 ms past the audio's own end, and "held ✓"
+// stays up 0.4 s against the ~100 ms the shot takes.
+const AFTER_BURST_MS = 120;
+
+async function reachAdvanced(page, attempt) {
+  const durationMs = ADVANCE_BURST_MS_BY_ATTEMPT[attempt];
+  await chooseILead(page);
+  await tones.setSettings(page, { lead: { holdBeats: 1 } });
+  await startLeadRun(page);
+  await page.waitForTimeout(BURST_WARMUP_MS);
+  await tones.burst(page, durationMs);
+  await page.waitForTimeout(durationMs + AFTER_BURST_MS);
+}
+
+// Steady in-tune holding at about 58 % of a 4-beat hold at 96 bpm (2500 ms):
+// the prototype draws 60 %.
+const HOLDING_BEATS = 4;
+const HOLDING_AFTER_ONSET_MS = 1450;
+
+async function holdInTune(page) {
+  await tones.setSettings(page, { lead: { holdBeats: HOLDING_BEATS } });
+  await startLeadRun(page);
+  await tones.feed(page, 0);
+  await page.waitForTimeout(HOLDING_AFTER_ONSET_MS);
+}
+
+// ---------------------------------------------------------------------------
+// The twelve states: one per row of the proposal's Interface table, named by
+// the row's State. `canvas` rows are phones 01–10 on Learner Leads Final;
+// the two rows the canvas does not draw (`playing-play-along`,
+// `holding-meter-off`) are the one-phone prototype driven the same way as the
+// app. 11 (the simulated player) is a demo with nothing to build: no state.
 //
-// Headless has no real microphone signal to feed the app, so
-// tuner-listening's and tuner-silent's app screenshots are the same shot —
-// there is nothing to "sweep" without an injected tone. Both are still
-// written and reviewed as their own pair (against the prototype's `sweep`
-// and `silent` renderings respectively) because a missing/misplaced element
-// would still show up in either one; see notes.md for what that means for
-// this pair specifically.
+// micMode: "fed" — a fake-ui browser with installMicrophoneOverride and the
+// in-page tone helpers; "default" — a browser that was never granted the microphone (the
+// request is refused, which is what the no-microphone card is for); omitted —
+// the microphone is never asked for.
+// ---------------------------------------------------------------------------
+const canvasState = (id, rest) => ({
+  prototypePath: CANVAS_PROTOTYPE_PATH,
+  prototypeFrameSelector: canvasPhoneSelector(id),
+  ...rest,
+});
+
 const STATES = {
-  "practice-way-in": {
-    prototypePath: PRACTICE_PROTOTYPE_PATH,
-    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
-    appNeedsMic: false,
+  "idle-play-along": canvasState("01", {
     app: async () => {
       // The app as loaded — no interaction.
     },
-  },
-  "tuner-listening": {
-    prototypePath: TUNER_PROTOTYPE_PATH,
-    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
-    prototypeProps: { state: "sweep" },
-    appNeedsMic: true,
-    app: enterTuner,
-  },
-  "tuner-silent": {
-    prototypePath: TUNER_PROTOTYPE_PATH,
-    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
-    prototypeProps: { state: "silent" },
-    appNeedsMic: true,
-    app: enterTuner,
-  },
-  "tuner-cannot-hear": {
-    prototypePath: TUNER_PROTOTYPE_PATH,
-    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
-    prototypeProps: { state: "cannot hear" },
-    appNeedsMic: false,
-    app: enterTuner,
-  },
-  "tuner-target-pinned": {
-    prototypePath: TUNER_PROTOTYPE_PATH,
-    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
-    prototypeDriver: holdTargetOnPrototype,
-    appNeedsMic: true,
+  }),
+  "idle-i-lead": canvasState("02", {
+    app: chooseILead,
+  }),
+  "playing-play-along": {
+    prototypePath: PRACTICE_PROTOTYPE_PATH,
+    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
+    prototypeDriver: playOnPrototype,
     app: async (page) => {
-      await enterTuner(page);
-      // Position 69 is A4 in theory's pitchPosition numbering (plan.md;
-      // C4 = 60), the same note the prototype's Hold pins from a live
-      // reading near A4.
-      await page.evaluate(() => window.__session.pinTarget(69));
+      await page.getByTestId(START_CIRCLE).click();
+      // The count-in is on by default: wait for the first note's caption.
+      await page.getByText(/· 1 of 15/).waitFor({ timeout: 15_000 });
     },
   },
-  "tuner-target-sheet": {
-    prototypePath: TUNER_PROTOTYPE_PATH,
-    prototypeFrameSelector: TUNER_TARGET_SHEET_FRAME_SELECTOR,
-    appNeedsMic: true,
+  "listening-silent": canvasState("03", {
+    micMode: "fed",
+    app: async (page) => {
+      await chooseILead(page);
+      await startLeadRun(page);
+      await tones.feed(page, null);
+    },
+  }),
+  "heard-out-of-tune": canvasState("04", {
+    micMode: "fed",
+    app: async (page) => {
+      await chooseILead(page);
+      await startLeadRun(page);
+      // −18 ¢ flat of the target (the sharp twin, +12 ¢, differs only in
+      // the line's side and colour).
+      await tones.feed(page, -18);
+    },
+  }),
+  holding: canvasState("05", {
+    micMode: "fed",
+    appSettleMs: 0,
+    app: async (page) => {
+      await chooseILead(page);
+      await holdInTune(page);
+    },
+  }),
+  "holding-meter-off": {
+    prototypePath: PRACTICE_PROTOTYPE_PATH,
+    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
+    prototypeProps: { mode: "me", llState: "holding" },
+    prototypeDriver: meterOffOnPrototype,
+    micMode: "fed",
+    appSettleMs: 0,
     app: async (page) => {
-      await enterTuner(page);
-      await page.getByRole("button", { name: "Target", exact: true }).click();
+      await chooseILead(page);
+      await openSheet(page);
+      await page.getByText("meter", { exact: true }).click();
+      await closeSheet(page);
+      await holdInTune(page);
     },
   },
+  advanced: canvasState("06", {
+    micMode: "fed",
+    appSettleMs: 0,
+    app: reachAdvanced,
+    appVerify: async (page) =>
+      (await tones.leadSnapshot(page)).justHeld !== null,
+  }),
+  complete: canvasState("07", {
+    micMode: "fed",
+    app: async (page) => {
+      await chooseILead(page);
+      await startLeadRun(page);
+      await tones.playRunToComplete(page);
+    },
+  }),
+  "no-microphone": canvasState("08", {
+    micMode: "default",
+    app: async (page) => {
+      await chooseILead(page);
+      await page.getByTestId(START_CIRCLE).click();
+      await page.getByTestId("no-mic-card").waitFor();
+    },
+  }),
+  "sheet-play-along": canvasState("09", {
+    appFullPage: false,
+    app: openSheet,
+  }),
+  "sheet-i-lead": canvasState("10", {
+    appFullPage: false,
+    app: async (page) => {
+      await chooseILead(page);
+      await openSheet(page);
+    },
+  }),
 };
 
 function parseStatesArgument(argv) {
@@ -330,129 +502,66 @@ function validateStateNames(names) {
   }
 }
 
-function stateNeedsMic(stateName) {
-  return STATES[stateName].appNeedsMic === true;
-}
-
-// A TCP probe, not a fetch: Node's fetch rejects the dev server's
-// self-signed certificate, which would read as "down".
-function isDevServerUp() {
-  const { port, hostname } = new URL(APP_URL);
-  return new Promise((resolve) => {
-    const socket = net.connect({ port: Number(port), host: hostname });
-    socket.once("connect", () => {
-      socket.destroy();
-      resolve(true);
-    });
-    socket.once("error", () => resolve(false));
-  });
-}
-
-async function waitForDevServer(deadline) {
-  while (Date.now() < deadline) {
-    if (await isDevServerUp()) return;
-    await new Promise((resolve) =>
-      setTimeout(resolve, DEV_SERVER_POLL_INTERVAL_MS),
-    );
-  }
-  throw new Error(
-    `dev server did not respond at ${APP_URL} within the timeout`,
-  );
-}
-
-// Starts `pnpm dev` as a detached child only when nothing is already
-// serving the app, so this is safe to run alongside an already-running
-// `pnpm dev` during interactive development.
-async function ensureDevServer() {
-  if (await isDevServerUp()) return null;
-  const child = spawn("pnpm", ["dev"], {
-    cwd: REPO_ROOT,
-    detached: true,
-    stdio: "ignore",
-  });
-  await waitForDevServer(Date.now() + DEV_SERVER_TIMEOUT_MS);
-  return child;
-}
-
-function stopDevServer(child) {
-  if (child === null || child.pid === undefined) return;
-  // Negative pid kills the whole detached process group (the shell pnpm
-  // spawns and vite underneath it), not just the immediate child.
-  try {
-    process.kill(-child.pid, "SIGTERM");
-  } catch {
-    // Already gone — nothing to clean up.
-  }
-}
-
 async function screenshotPrototype(browser, stateName) {
   const state = STATES[stateName];
   const context = await browser.newContext({
     ignoreHTTPSErrors: true,
-    viewport: VIEWPORT,
+    viewport: PROTOTYPE_VIEWPORT,
     deviceScaleFactor: DEVICE_SCALE_FACTOR,
   });
   const page = await context.newPage();
   await fulfillGoogleFontRequests(page);
+  await fulfillSiblingComponentFetch(page);
   await page.goto(pathToFileURL(state.prototypePath).href);
   // The prototype's sheets slide in over a CSS `transition` with no
   // `display:none` gating while closed (unlike the app's BottomSheet, whose
   // `display` flip makes its transition a no-op in practice — see
   // src/ui/overlay.tsx); disabling transitions guards every state driven by
-  // a click (e.g. holdTargetOnPrototype's sheet open/close) against landing
-  // mid-animation.
+  // a click (e.g. a sheet open/close) against landing mid-animation.
   await page.addStyleTag({
     content: "*, *::before, *::after { transition: none !important; }",
   });
   const frame = await captureFrame(page, state.prototypeFrameSelector);
   await applyPrototypeState(page, frame, state);
-  // `clip` alone only crops within the current viewport, and a locator's own
-  // `.screenshot()` mis-stitches an element taller than the viewport
-  // (confirmed against Practice.dc.html's 863px-tall card, min-height:844,
-  // under this exact page: the lower portion came back as the page's own
-  // background colour instead of the card's — a Playwright/Chromium gap,
-  // not a layout bug in the vendored file, which a `fullPage` render, itself
-  // correct, showed). `fullPage: true` renders the whole scrollable page
-  // first, the same as a human scrolling to it, and then the clip — sized to
-  // the frame's own just-measured box, since the frames this task captures
-  // are not all the same size (4a's 844 vs 5c's 700 vs Practice's 863) —
-  // crops out just this one frame.
-  //
-  // `boundingBox()` is relative to the *current viewport* (it moves with
-  // scroll), but a `fullPage` screenshot's `clip` is relative to the whole
-  // document — the same gap a driver with no clicks (nothing to scroll to)
-  // never hits, but holdTargetOnPrototype's clicks do (Playwright scrolls
-  // the picked-up-on-canvas frame to the very bottom of a >2500px-tall
-  // page to reach "Hold"), so the box is converted back to document space
-  // with the scroll position at capture time before it's used as a clip.
+  // The canvas is eleven phones tall (≈10 000 css px, 20 000 at 2x), past
+  // Chromium's texture limit, so a `fullPage` render of it comes back blank —
+  // and a locator's own `.screenshot()` mis-stitches an element taller than
+  // the viewport (confirmed against a 863px-tall card under an 844px
+  // viewport: the lower portion came back as the page's background colour).
+  // So the prototype is photographed in a viewport taller than any frame
+  // (PROTOTYPE_VIEWPORT), the frame scrolled into it, and the clip taken in
+  // viewport coordinates.
+  await frame.evaluate((element) =>
+    element.scrollIntoView({ block: "start", inline: "start" }),
+  );
+  await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
   const box = await frame.boundingBox();
-  const scroll = await page.evaluate(() => ({
-    x: window.scrollX,
-    y: window.scrollY,
-  }));
   await page.screenshot({
     path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
-    fullPage: true,
-    clip: {
-      x: box.x + scroll.x,
-      y: box.y + scroll.y,
-      width: box.width,
-      height: box.height,
-    },
+    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
   });
   await context.close();
 }
 
-async function screenshotApp(browser, stateName) {
+async function screenshotAppOnce(browser, stateName, attempt) {
+  const state = STATES[stateName];
   const context = await browser.newContext({
     ignoreHTTPSErrors: true,
     viewport: VIEWPORT,
     deviceScaleFactor: DEVICE_SCALE_FACTOR,
   });
   const page = await context.newPage();
+  if (state.micMode === "fed") {
+    await page.addInitScript(installMicrophoneOverride);
+    await page.addInitScript({ path: PAGE_HELPERS_PATH });
+  }
   await page.goto(APP_URL);
+  await page.waitForFunction(() => window.__session !== undefined);
+  // The canvas draws its panel as the stave (the app opens on names), and the
+  // meter is a thing on a notehead.
+  await page.getByText("stave", { exact: true }).click();
   try {
-    await STATES[stateName].app(page);
+    await state.app(page, attempt);
   } catch (error) {
     // A failing driver is a bug to fix, not to hide — but writing the app
     // shot with whatever rendered (instead of aborting the whole run) keeps
@@ -461,11 +570,69 @@ async function screenshotApp(browser, stateName) {
       `[design-shots] ${stateName}: app driver failed — ${error.message}`,
     );
   }
-  await page.waitForTimeout(APP_SCREENSHOT_SETTLE_MS);
+  await page.waitForTimeout(state.appSettleMs ?? APP_SCREENSHOT_SETTLE_MS);
+  // A time-boxed state must be up both before and after the shot to have been
+  // up during it.
+  const reachedBefore = state.appVerify ? await state.appVerify(page) : true;
+  // The whole page, not the first screenful: the live cards run taller than
+  // idle (the mode words under the judgement), pushing the summary row below
+  // the fold, and where it lands is part of the comparison. A sheet is an
+  // overlay fixed to the viewport, so those are the viewport itself.
   await page.screenshot({
     path: path.join(OUTPUT_DIR, `${stateName}.app.png`),
+    fullPage: state.appFullPage !== false,
   });
+  const reached =
+    reachedBefore && (state.appVerify ? await state.appVerify(page) : true);
+  if (state.micMode === "fed" && stateName === "holding") {
+    const snapshot = await tones.leadSnapshot(page).catch(() => null);
+    console.log(
+      `[design-shots] ${stateName}: fill at the shot ≈ ${snapshot?.heldFraction ?? "?"}`,
+    );
+  }
   await context.close();
+  return reached;
+}
+
+// A time-boxed live state (the 0.4 s "held ✓") is re-driven on a fresh page
+// when the shot missed it, rather than written as a misleading pair.
+async function screenshotApp(browserOf, stateName) {
+  const browser = browserOf(STATES[stateName].micMode);
+  for (let attempt = 1; attempt <= APP_VERIFY_ATTEMPTS; attempt += 1) {
+    if (await screenshotAppOnce(browser, stateName, attempt - 1)) return;
+    console.warn(
+      `[design-shots] ${stateName}: shot ${attempt}/${APP_VERIFY_ATTEMPTS} missed the moment — retrying`,
+    );
+  }
+  console.warn(
+    `[design-shots] ${stateName}: the last shot did not catch the state`,
+  );
+}
+
+// Chromium's standard recipe for automating getUserMedia: the first flag
+// auto-accepts the permission prompt headless would otherwise leave
+// unanswered. The plain browser keeps the prompt unanswered-and-denied, which
+// is what no-microphone (08) is the picture of.
+const APP_MEDIA_LAUNCH_ARGS = [
+  "--use-fake-ui-for-media-stream",
+  "--autoplay-policy=no-user-gesture-required",
+];
+
+// The canvas pulls React and Babel from a CDN on every load; a load that
+// never mounts its frames is re-tried rather than failing the whole run.
+const PROTOTYPE_ATTEMPTS = 3;
+
+async function withRetry(stateName, run) {
+  for (let attempt = 1; ; attempt += 1) {
+    try {
+      return await run();
+    } catch (error) {
+      if (attempt === PROTOTYPE_ATTEMPTS) throw error;
+      console.warn(
+        `[design-shots] ${stateName}: prototype attempt ${attempt}/${PROTOTYPE_ATTEMPTS} failed — ${error.message.split("\n")[0]}`,
+      );
+    }
+  }
 }
 
 async function main() {
@@ -475,19 +642,20 @@ async function main() {
 
   const devServerChild = await ensureDevServer();
   const browser = await chromium.launch();
-  const micBrowser = stateNames.some(stateNeedsMic)
+  const needsFed = stateNames.some((name) => STATES[name].micMode === "fed");
+  const fedBrowser = needsFed
     ? await chromium.launch({ args: APP_MEDIA_LAUNCH_ARGS })
     : null;
+  const browserOf = (micMode) => (micMode === "fed" ? fedBrowser : browser);
   try {
     for (const stateName of stateNames) {
-      await screenshotPrototype(browser, stateName);
-      const appBrowser = stateNeedsMic(stateName) ? micBrowser : browser;
-      await screenshotApp(appBrowser, stateName);
+      await withRetry(stateName, () => screenshotPrototype(browser, stateName));
+      await screenshotApp(browserOf, stateName);
       console.log(`[design-shots] wrote ${stateName}.{prototype,app}.png`);
     }
   } finally {
     await browser.close();
-    if (micBrowser) await micBrowser.close();
+    if (fedBrowser) await fedBrowser.close();
     stopDevServer(devServerChild);
   }
 }
diff --git a/scripts/design_snapshot.py b/scripts/design_snapshot.py
index 207b6d7..86ce632 100755
--- a/scripts/design_snapshot.py
+++ b/scripts/design_snapshot.py
@@ -16,6 +16,13 @@
       Same as live, written to changes/NNN/design/reference/ — the exit of the
       refinement loop. The fidelity pass compares against these.
 
+A route cell begins with the path in backticks (`/`); what follows it is
+prose. The app has no URL routes, so a change whose states are reached by
+driving the UI registers a driver per state name in LIVE_DRIVERS below (008:
+the twelve learner-leads rows — the mode words, the start circle, the sheet,
+and the microphone fed by scripts/design-shots-page.mjs, shared with
+design-shots.mjs). A row with no driver is opened at its path and shot as is.
+
 Needs Playwright for Python (pip install playwright; playwright install
 chromium). Stdlib otherwise. A row with no design file (wireframes) or no
 route (live/reference) is skipped with a note, not an error.
@@ -23,7 +30,20 @@ route (live/reference) is skipped with a note, not an error.
 import re, sys, pathlib, argparse
 
 ROOT = pathlib.Path(__file__).resolve().parent.parent
-ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|([^|]*)\|([^|]*)\|")
+# The State cell is the state's name in backticks, optionally followed by prose
+# (`idle-i-lead` — 02: I lead underlined …).
+ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`[^|]*\|([^|]*)\|([^|]*)\|")
+
+
+def route_path(cell):
+    """The path a Route cell opens: its leading backticked token, else the
+    cell itself when it has no backticks (rows written before routes carried
+    prose), else empty."""
+    cell = cell.strip()
+    token = re.match(r"`([^`]*)`", cell)
+    if token:
+        return token.group(1).strip()
+    return cell if cell.startswith("/") else ""
 
 
 def rows(change_dir):
@@ -40,12 +60,199 @@ def rows(change_dir):
         if not m or m.group(1) == "<screen>":
             continue
         screen, state = m.group(1), m.group(2)
-        route = m.group(3).strip().strip("`")
+        route = route_path(m.group(3))
         design = m.group(4).strip().strip("`")
         out.append((screen, state, route, design))
     return out
 
 
+# ---------------------------------------------------------------------------
+# Live drivers. A driver takes the page (the app open at the row's path, the
+# panel already on the stave) and the attempt number (0, 1, 2 …) and leaves
+# the app in the row's state. `needs_mic` rows run in a browser that auto-
+# accepts the microphone prompt and has getUserMedia replaced by
+# harness-lib.mjs's override, with scripts/design-shots-page.mjs injected;
+# `refused` rows in one that was never granted it. `verify(page)` (optional)
+# says a time-boxed state was up; the row is re-driven on a fresh page while it
+# says no. `full_page=False` is for overlays fixed to the viewport (the sheet).
+# ---------------------------------------------------------------------------
+PAGE_HELPERS = ROOT / "scripts" / "design-shots-page.mjs"
+HARNESS_LIB = ROOT / "scripts" / "harness-lib.mjs"
+VERIFY_ATTEMPTS = 4
+SETTLE_MS = 500
+# See design-shots.mjs: the advance is the burst's last reading, so the burst's
+# length is the whole trick; the others are the retries' jitter.
+ADVANCE_BURST_MS_BY_ATTEMPT = [650, 646, 654, 642]
+BURST_WARMUP_MS = 300
+AFTER_BURST_MS = 120
+HOLDING_BEATS = 4
+HOLDING_AFTER_ONSET_MS = 1450
+COUNT_IN_WAIT_MS = 15_000
+
+
+def tones(page, call, *args):
+    return page.evaluate(f"(a) => window.__shotTones.{call}(...a)", list(args))
+
+
+def choose_i_lead(page):
+    page.get_by_test_id("mode-word-me").click()
+
+
+def open_sheet(page):
+    page.get_by_text("edit ›").click()
+    page.get_by_test_id("sheet-close").wait_for()
+
+
+def start_lead_run(page):
+    page.get_by_test_id("start-circle").click()
+    page.get_by_test_id("stop-circle").wait_for()
+
+
+def hold_in_tune(page):
+    tones(page, "setSettings", {"lead": {"holdBeats": HOLDING_BEATS}})
+    start_lead_run(page)
+    tones(page, "feed", 0)
+    page.wait_for_timeout(HOLDING_AFTER_ONSET_MS)
+
+
+def drive_playing_play_along(page, attempt):
+    page.get_by_test_id("start-circle").click()
+    page.get_by_text(re.compile(r"· 1 of 15")).wait_for(timeout=COUNT_IN_WAIT_MS)
+
+
+def drive_listening_silent(page, attempt):
+    choose_i_lead(page); start_lead_run(page); tones(page, "feed", None)
+
+
+def drive_heard_out_of_tune(page, attempt):
+    choose_i_lead(page); start_lead_run(page); tones(page, "feed", -18)
+
+
+def drive_holding(page, attempt):
+    choose_i_lead(page); hold_in_tune(page)
+
+
+def drive_holding_meter_off(page, attempt):
+    choose_i_lead(page)
+    open_sheet(page)
+    page.get_by_text("meter", exact=True).click()
+    page.get_by_test_id("sheet-close").click()
+    page.get_by_test_id("sheet-close").wait_for(state="hidden")
+    hold_in_tune(page)
+
+
+def drive_advanced(page, attempt):
+    duration = ADVANCE_BURST_MS_BY_ATTEMPT[attempt]
+    choose_i_lead(page)
+    tones(page, "setSettings", {"lead": {"holdBeats": 1}})
+    start_lead_run(page)
+    page.wait_for_timeout(BURST_WARMUP_MS)
+    tones(page, "burst", duration)
+    page.wait_for_timeout(duration + AFTER_BURST_MS)
+
+
+def verify_advanced(page):
+    return tones(page, "leadSnapshot")["justHeld"] is not None
+
+
+def drive_complete(page, attempt):
+    choose_i_lead(page); start_lead_run(page)
+    tones(page, "playRunToComplete", 30_000)
+
+
+def drive_no_microphone(page, attempt):
+    choose_i_lead(page)
+    page.get_by_test_id("start-circle").click()
+    page.get_by_test_id("no-mic-card").wait_for()
+
+
+def drive_sheet_i_lead(page, attempt):
+    choose_i_lead(page); open_sheet(page)
+
+
+# state -> dict(driver, mic: None | "fed" | "refused", verify, full_page, settle_ms)
+LIVE_DRIVERS = {
+    "008-learner-leads": {
+        "idle-play-along": dict(driver=lambda page, attempt: None),
+        "idle-i-lead": dict(driver=lambda page, attempt: choose_i_lead(page)),
+        "playing-play-along": dict(driver=drive_playing_play_along),
+        "listening-silent": dict(driver=drive_listening_silent, mic="fed"),
+        "heard-out-of-tune": dict(driver=drive_heard_out_of_tune, mic="fed"),
+        "holding": dict(driver=drive_holding, mic="fed", settle_ms=0),
+        "holding-meter-off": dict(driver=drive_holding_meter_off, mic="fed", settle_ms=0),
+        "advanced": dict(driver=drive_advanced, mic="fed", settle_ms=0, verify=verify_advanced),
+        "complete": dict(driver=drive_complete, mic="fed"),
+        "no-microphone": dict(driver=drive_no_microphone, mic="refused"),
+        "sheet-play-along": dict(driver=lambda page, attempt: open_sheet(page), full_page=False),
+        "sheet-i-lead": dict(driver=drive_sheet_i_lead, full_page=False),
+    },
+}
+
+
+# What a refused permission looks like to the app, whatever the browser build
+# does with an unanswered prompt in headless.
+MICROPHONE_REFUSED_SCRIPT = (
+    "navigator.mediaDevices.getUserMedia = () => "
+    "Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));"
+)
+
+
+def microphone_override_script():
+    """harness-lib.mjs's installMicrophoneOverride, as an expression the page
+    runs before its own scripts — read from the one place it is written."""
+    text = HARNESS_LIB.read_text(encoding="utf-8")
+    m = re.search(r"export function installMicrophoneOverride\(\) \{.*?\n\}\n", text, re.S)
+    if not m:
+        raise SystemExit("error: installMicrophoneOverride not found in scripts/harness-lib.mjs")
+    return "(" + m.group(0).replace("export ", "", 1).rstrip() + ")()"
+
+
+class LiveShooter:
+    """Opens each live row in a fresh context (stored state is per context, and
+    a row that chose I lead must not leak it into the next)."""
+
+    def __init__(self, playwright, viewport):
+        self.pw, self.viewport = playwright, viewport
+        self.browsers = {}
+
+    def browser(self, mic):
+        if mic not in self.browsers:
+            args = []
+            if mic == "fed":
+                args = ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
+            self.browsers[mic] = self.pw.chromium.launch(args=args)
+        return self.browsers[mic]
+
+    def close(self):
+        for b in self.browsers.values():
+            b.close()
+
+    def shoot(self, url, target, spec, attempt):
+        context = self.browser(spec.get("mic")).new_context(viewport=self.viewport, device_scale_factor=2, ignore_https_errors=True)
+        page = context.new_page()
+        if spec.get("mic") == "fed":
+            page.add_init_script(microphone_override_script())
+            page.add_init_script(path=str(PAGE_HELPERS))
+        if spec.get("mic") == "refused":
+            page.add_init_script(MICROPHONE_REFUSED_SCRIPT)
+        page.goto(url, wait_until="networkidle")
+        page.wait_for_function("() => window.__session !== undefined")
+        # The canvas draws the panel as the stave (the app opens on names).
+        page.get_by_text("stave", exact=True).click()
+        try:
+            spec["driver"](page, attempt)
+        except Exception as error:  # a failing driver is a bug to fix, not to hide
+            print(f"  ! {target.name}: driver failed — {str(error).splitlines()[0]}", file=sys.stderr)
+        page.wait_for_timeout(spec.get("settle_ms", SETTLE_MS))
+        verify = spec.get("verify")
+        before = verify(page) if verify else True
+        page.screenshot(path=str(target), full_page=spec.get("full_page", True))
+        reached = before and (verify(page) if verify else True)
+        context.close()
+        return reached
+
+
+
 def main(argv):
     ap = argparse.ArgumentParser()
     ap.add_argument("change"); ap.add_argument("mode", choices=["wireframes", "live", "reference"])
@@ -74,6 +281,7 @@ def main(argv):
         print("error: Playwright for Python not installed: pip install playwright && playwright install chromium", file=sys.stderr)
         return 1
 
+    drivers = LIVE_DRIVERS.get(cid, {}) if a.mode != "wireframes" else {}
     jobs = []
     for screen, state, route, design in rows(change):
         name = f"{screen}--{state}"
@@ -82,26 +290,40 @@ def main(argv):
                 print(f"  · {name}: no wireframe file, skipped"); continue
             path, _, qs = design.partition("?")
             url = (change / path).resolve().as_uri() + ("?" + qs if qs else "")
-            jobs.append((name, url))
+            jobs.append((name, url, None))
         else:
             if not route:
                 print(f"  · {name}: no route yet, skipped"); continue
             url = a.base.rstrip("/") + route
-            jobs.append((name, url))
+            jobs.append((name, url, drivers.get(state)))
             for v in variants:
                 sep = "&" if "?" in url else "?"
-                jobs.append((f"{name}--{v}", f"{url}{sep}variant={v}"))
+                jobs.append((f"{name}--{v}", f"{url}{sep}variant={v}", drivers.get(state)))
     if not jobs:
         print("nothing to screenshot"); return 0
 
+    def report(target, url):
+        print(f"  {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}  ← {url}")
+
     with sync_playwright() as p:
         browser = p.chromium.launch()
         page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
-        for name, url in jobs:
-            page.goto(url, wait_until="networkidle")
+        shooter = LiveShooter(p, {"width": w, "height": h})
+        for name, url, spec in jobs:
             target = out / f"{name}.png"
-            page.screenshot(path=str(target), full_page=True)
-            print(f"  {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}  ← {url}")
+            if spec is None:
+                page.goto(url, wait_until="networkidle")
+                page.screenshot(path=str(target), full_page=True)
+                report(target, url)
+                continue
+            for attempt in range(VERIFY_ATTEMPTS):
+                if shooter.shoot(url, target, spec, attempt):
+                    break
+                print(f"  ! {name}: shot {attempt + 1}/{VERIFY_ATTEMPTS} missed the moment — retrying", file=sys.stderr)
+            else:
+                print(f"  ! {name}: the last shot did not catch the state", file=sys.stderr)
+            report(target, url)
+        shooter.close()
         browser.close()
     return 0
 
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T020.md b/changes/008-learner-leads/tasks/C008_T020.md
index 5f3340e..739e20d 100644
--- a/changes/008-learner-leads/tasks/C008_T020.md
+++ b/changes/008-learner-leads/tasks/C008_T020.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T020
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: []
 sdd_depends_on: []
 sdd_parked_on: 
 sdd_group: "Phase 4 — The harness and hardening"
 sdd_parallel: true
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T020 · `design-shots` points at the eleven states; `design_snapshot.py live` reaches them
```

## Verdict

TASK: C008_T020
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] scripts/design_snapshot.py:1195 (SPEC/hygiene) - Playwright-for-Python must equal the node Playwright (1.63.0, package.json ^1.63.0) or AudioWorklet addModule hangs; nowhere in the scripts. The ImportError message says only `pip install playwright`. Ask for a one-line note in the file's header docstring and that message (`pip install playwright==<node version>`).
- [minor] scripts/design_snapshot.py:1147, scripts/design-shots.mjs:581 - the twelve drivers and their timing constants (ADVANCE_BURST_MS_BY_ATTEMPT, BURST_WARMUP_MS, AFTER_BURST_MS, HOLDING_*) exist twice, in JS and Python, kept in step by a comment. The in-page tone code is correctly shared; moving the advance/hold sequences (or just the constants) into design-shots-page.mjs would leave one copy. Not blocking: the brief asks for both drivers.
- [minor] scripts/design_snapshot.py:1203 - microphone_override_script() lifts installMicrophoneOverride out of harness-lib.mjs with a regex ending at the first column-0 closing brace; it works today and reads from the one source, but a reformat of that function breaks it (it fails loudly with SystemExit, so safe).
- [minor] scripts/design_snapshot.py (shoot) - a missed advanced state is reported on stderr but the PNG is still written and the exit status is 0. Honest enough for dev tooling (verify before and after the shot, 4 re-drives on fresh pages, a named warning), but the stale PNG stays on disk. Also `wait_for_function(__session)` is outside the try, so a non-dev --base aborts the run with a traceback.
- [minor] scripts/design_snapshot.py:48 (rows/ROW) - the State-cell regex now accepts trailing prose and route_path() skips a non-backtick cell that does not start with "/". For the archived proposals nothing changes except 007's (0 rows matched before, 6 now; no driver, so they would be shot at their path). Rows without a driver behave as before.
- [minor] controller note, not code: changes/008-learner-leads/design/rounds/ is untracked and .gitignore does not exclude shots/ (as the report says); stage by path. Verify's second clause (notes.md lists the structural findings) is open, deliberately left to the controller.
UNVERIFIED:
- none (the 24 PNGs exist; the live run's 12 PNGs are present under .sdd/design/008-learner-leads/live/; I did not re-run the drivers).
COMMANDS:
package only, plus: python3 -m py_compile scripts/design_snapshot.py (clean); prettier --check on the two scripts (clean); a throwaway comparison of the old and new ROW regex over every proposal's Interface table; Read of advanced, no-microphone (app and prototype)

Notes behind the verdict:
1. Spec. The canvas has #s01-#s11 and 11 is the demo with no Interface row, so the brief's s01-s10 is the wrong number and the implementer's twelve rows are right. The ten canvas rows plus the two taken from Learner Leads Practice.dc.html (playing-play-along, holding-meter-off) match the Interface table; the state names match its State cells, so the PNG names line up in node and python. Routes are real: the mode word, the start circle, "edit >", the sheet's meter pill, the microphone override. Settings through the dev hook are used only for Hold 4 (hold at about 58%, the prototype draws 60%), Hold 1 plus the 650 ms burst (advanced), and loop off, tempo 200 and Hold 1 (complete, tempo restored). Never for the mode and never for target state. Acceptable for a dev-only screenshot driver; the hook is the one the harnesses already use. The advanced timing is anchored on the audio clock (scheduled burst, frame-based hold), so it is largely deterministic. The driver checks justHeld before and after the shot and re-drives up to 4 times on a fresh page; failure is named on stderr.
2. Ripples. design-shots-page.mjs is justified (shared by the node and python drivers; the .mjs name keeps it under the existing lint ignore). harness-lib's ensureDevServer, stopDevServer, APP_URL and installMicrophoneOverride replace local copies; those copies were module-private to design-shots.mjs, nothing else imported them, and the AGENTS.md and package.json reference only the script. design-shots.mjs is rewritten per change (single-change), so older changes' lists were already gone. LIVE_DRIVERS keyed by change then state; rows without a driver take the old goto, screenshot path unchanged.
3. __resourceBlobs shim: fine, same precedent as 004, documented in its comment.
4. Hygiene: no secrets, localhost/file:// only, the dev server started is stopped in finally, no TODO or debug output. The mic-refused case differs between drivers (node relies on the browser's default denial, python rejects explicitly); noted by the implementer, harmless.
5. Findings credibility: viewed advanced and no-microphone, app and prototype. Finding 4 (green line still across D4 beside "C4 held") is visible in the live advanced shot, the prototype shows a band and no line; finding 3 (title below truncated caption "hold 2 beats - medium t..." plus words, versus the prototype's title beside the circle) is exactly as described; the Tuner glyph in the no-microphone circle shows as outlined pills against the prototype's bare bars (finding 1); the live card is taller with the summary row at the fold (finding 2). The report's findings list is credible and accurate on every point I spot-checked.


<!-- recorded 2026-10-04T09:05:25Z by scripts/record.sh -->
