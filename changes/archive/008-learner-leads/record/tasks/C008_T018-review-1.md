---
type: Task Review
title: Review package — C008_T018 · 008-learner-leads
description: The diff produced for C008_T018, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T018.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T018.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T018.md
  - resource: git:b053fa37a3edf696557393ca08d8790479c2ac7c..b31dbd00bbe1d78baeaad06e8b169951e728c098
generated:
  by: process:review-package.sh
  at: 2026-10-04T06:59:21Z
sdd_id: 008-learner-leads
---

# Review package — C008_T018 · 008-learner-leads

base: `b053fa37a3edf696557393ca08d8790479c2ac7c` → head: `b31dbd00bbe1d78baeaad06e8b169951e728c098`

## Commands (run by this script)

### Verify

`pnpm test:tuner`

```

> music-learning-assistant@0.0.0 test:tuner /home/merlin/projects/music-learning-assistant
> node scripts/tuner-timing-test.mjs

feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     79.00                   63.98                 29.35               92.86           0.09           0              PASS  
flute-like E2–C7     57     73.80                   63.98                 18.69               92.86           0.65           1              PASS  
hand-over glissando  1      55.40                   58.65                 13.35               93.81           —              —              PASS  
silence              —      —                       —                     —                   0.00            —              —              PASS  
white noise          —      —                       —                     —                   0.00            —              —              PASS  
  worst: first readout E2 79.00 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout G♯4 73.80 ms · arrival age D♯3 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
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
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
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

- A	scripts/harness-lib.mjs
- M	scripts/tuner-timing-test.mjs

## Diff

```diff
diff --git a/scripts/harness-lib.mjs b/scripts/harness-lib.mjs
new file mode 100644
index 0000000..bf3ed34
--- /dev/null
+++ b/scripts/harness-lib.mjs
@@ -0,0 +1,183 @@
+// Microphone-feeding harness helpers, extracted from tuner-timing-test.mjs
+// (C008_T018 — a pure move, behaviour unchanged). Shared by the measured
+// Playwright harnesses that feed the microphone from the page's own
+// AudioContext: the dev-server lifecycle, the getUserMedia override, the
+// note/position helpers and the small aggregation/printing helpers.
+
+import { spawn } from "node:child_process";
+import net from "node:net";
+import path from "node:path";
+import { fileURLToPath } from "node:url";
+
+const __dirname = path.dirname(fileURLToPath(import.meta.url));
+const REPO_ROOT = path.resolve(__dirname, "..");
+// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
+// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
+// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
+export const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
+const DEV_SERVER_POLL_INTERVAL_MS = 500;
+// `predev` compiles both crates to WebAssembly via cargo, which can take a
+// while on a cold build — same headroom timing-test.mjs gives it.
+const DEV_SERVER_TIMEOUT_MS = 120_000;
+
+// The sweep's default range — every semitone E2 (theory's pitchPosition 40)
+// to C7 (position 96).
+const TUNER_LOWEST_POSITION = 40;
+const TUNER_HIGHEST_POSITION = 96;
+
+export function positionsE2ToC7() {
+  const positions = [];
+  for (
+    let position = TUNER_LOWEST_POSITION;
+    position <= TUNER_HIGHEST_POSITION;
+    position += 1
+  ) {
+    positions.push(position);
+  }
+  return positions;
+}
+
+// theory/domain/notes.ts's noteAtPosition + labels.ts's noteLabel, sharp
+// spelling only, duplicated here — this script is plain Node ESM with no
+// TS/bundler step (as trueHzOfPosition, in tuner-timing-test.mjs, already
+// duplicates temperament's formula) — and used both in-page, to identify a
+// mutation as this tone's own reading (armReadoutTracking), and here, to
+// attribute a sweep's worst tone in the printed table. The fresh browser
+// context this harness launches has no stored selection, so the app's
+// default spelling (firstRunDefaults, selection-store.ts) applies
+// throughout.
+const SHARP_PITCH_CLASS_LABELS = [
+  "C",
+  "C♯",
+  "D",
+  "D♯",
+  "E",
+  "F",
+  "F♯",
+  "G",
+  "G♯",
+  "A",
+  "A♯",
+  "B",
+];
+
+export function noteLabelOfPosition(position) {
+  const pitchClass = ((position % 12) + 12) % 12;
+  const octave = Math.floor(position / 12) - 1;
+  return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
+}
+
+// A TCP probe, not a fetch: Node's fetch rejects the dev server's
+// self-signed certificate, which would read as "down" (timing-test.mjs).
+export function isDevServerUp() {
+  const { port, hostname } = new URL(APP_URL);
+  return new Promise((resolve) => {
+    const socket = net.connect({ port: Number(port), host: hostname });
+    socket.once("connect", () => {
+      socket.destroy();
+      resolve(true);
+    });
+    socket.once("error", () => resolve(false));
+  });
+}
+
+export async function waitForDevServer(deadline) {
+  while (Date.now() < deadline) {
+    if (await isDevServerUp()) return;
+    await new Promise((resolve) =>
+      setTimeout(resolve, DEV_SERVER_POLL_INTERVAL_MS),
+    );
+  }
+  throw new Error(
+    `dev server did not respond at ${APP_URL} within the timeout`,
+  );
+}
+
+// `pnpm dev`'s `predev` builds both crates to WebAssembly via cargo, which
+// is only on PATH once `~/.cargo/env` is sourced.
+export async function ensureDevServer() {
+  if (await isDevServerUp()) return null;
+  const child = spawn("bash", ["-c", "source ~/.cargo/env && pnpm dev"], {
+    cwd: REPO_ROOT,
+    detached: true,
+    stdio: "ignore",
+  });
+  await waitForDevServer(Date.now() + DEV_SERVER_TIMEOUT_MS);
+  return child;
+}
+
+export function stopDevServer(child) {
+  if (child === null || child.pid === undefined) return;
+  try {
+    process.kill(-child.pid, "SIGTERM");
+  } catch {
+    // Already gone — nothing to clean up.
+  }
+}
+
+// Runs in the page, before any of the app's own scripts (`page.addInitScript`)
+// — replaces `getUserMedia` with a function that hands back the *output* of
+// a `MediaStreamAudioDestinationNode` on the app's own AudioContext, so the
+// harness can feed known tones in as if they were the microphone. The
+// tuner creates its AudioContext lazily, inside `listening.start()`, before
+// this ever runs (webAudioListening's own `start()` calls `createContext()`
+// then `create(audioContext)`, and `create` — `createListener` — awaits
+// `getUserMedia` only after the worklet module has already been added on
+// that context) — so `window.__listening.context()` is non-null by the
+// time this function is called; if it were not, that is a harness fault,
+// not a silent no-op.
+export function installMicrophoneOverride() {
+  navigator.mediaDevices.getUserMedia = async () => {
+    const listening = window.__listening;
+    if (listening === undefined) {
+      throw new Error("window.__listening not exposed — is this a dev build?");
+    }
+    const context = listening.context();
+    if (context === null) {
+      throw new Error(
+        "window.__listening.context() is null — the tuner has not created its AudioContext yet",
+      );
+    }
+    const destination = context.createMediaStreamDestination();
+    window.__micDestination = destination;
+    return destination.stream;
+  };
+}
+
+export function maxOf(values) {
+  if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
+  return Math.max(...values);
+}
+
+export function minOf(values) {
+  if (values.some((value) => value === null)) return Number.NEGATIVE_INFINITY;
+  return Math.min(...values);
+}
+
+export function paintAgeMaxOf(values) {
+  const present = values.filter((value) => value !== null);
+  return present.length > 0 ? Math.max(...present) : null;
+}
+
+export function printTable(rows) {
+  const header = [
+    "case",
+    "tones",
+    "first readout max (ms)",
+    "arrival age max (ms)",
+    "paint age max (ms)",
+    "readings/s min",
+    "cents err max",
+    "shown err max",
+    "status",
+  ];
+  const table = [header, ...rows.map((row) => row.cells)];
+  const widths = header.map((_, columnIndex) =>
+    Math.max(...table.map((row) => row[columnIndex].length)),
+  );
+  for (const row of table) {
+    console.log(
+      row.map((cell, index) => cell.padEnd(widths[index])).join("  "),
+    );
+  }
+}
diff --git a/scripts/tuner-timing-test.mjs b/scripts/tuner-timing-test.mjs
index c5024da..51bd34d 100644
--- a/scripts/tuner-timing-test.mjs
+++ b/scripts/tuner-timing-test.mjs
@@ -20,21 +20,18 @@
 // (against dev:phone's HTTPS server: APP_URL=https://localhost:5173 pnpm test:tuner)
 
 import { chromium } from "playwright";
-import { spawn } from "node:child_process";
-import net from "node:net";
-import path from "node:path";
-import { fileURLToPath } from "node:url";
-
-const __dirname = path.dirname(fileURLToPath(import.meta.url));
-const REPO_ROOT = path.resolve(__dirname, "..");
-// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
-// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
-// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
-const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
-const DEV_SERVER_POLL_INTERVAL_MS = 500;
-// `predev` compiles both crates to WebAssembly via cargo, which can take a
-// while on a cold build — same headroom timing-test.mjs gives it.
-const DEV_SERVER_TIMEOUT_MS = 120_000;
+import {
+  APP_URL,
+  positionsE2ToC7,
+  noteLabelOfPosition,
+  ensureDevServer,
+  stopDevServer,
+  installMicrophoneOverride,
+  maxOf,
+  minOf,
+  paintAgeMaxOf,
+  printTable,
+} from "./harness-lib.mjs";
 
 // practice.tuner/REQ-006, listening.pitch-detection/REQ-004 — the budgets
 // this harness gates.
@@ -53,10 +50,9 @@ const SHOWN_CENTS_ERROR_MAX_CENTS = 2;
 const HANDOVER_CENTS = 56;
 
 // The sweep — every semitone E2 (theory's pitchPosition 40) to C7
-// (position 96), one row for a sine, one for a flute-like tone (six
-// falling-amplitude harmonics, the plan's Data model).
-const TUNER_LOWEST_POSITION = 40;
-const TUNER_HIGHEST_POSITION = 96;
+// (position 96, harness-lib's positionsE2ToC7), one row for a sine, one
+// for a flute-like tone (six falling-amplitude harmonics, the plan's Data
+// model).
 const REFERENCE_A4_HZ = 440;
 const REFERENCE_A4_POSITION = 69;
 const TONE_SECONDS = 1.0;
@@ -79,123 +75,9 @@ const HANDOVER_END_HZ = 470; // ~A♯4, ramped through the 56 ¢ crossing
 const SILENCE_SECONDS = 2;
 const NOISE_SECONDS = 2;
 
-function positionsE2ToC7() {
-  const positions = [];
-  for (
-    let position = TUNER_LOWEST_POSITION;
-    position <= TUNER_HIGHEST_POSITION;
-    position += 1
-  ) {
-    positions.push(position);
-  }
-  return positions;
-}
-
-// theory/domain/notes.ts's noteAtPosition + labels.ts's noteLabel, sharp
-// spelling only, duplicated here — this script is plain Node ESM with no
-// TS/bundler step (as trueHzOfPosition, below, already duplicates
-// temperament's formula) — and used both in-page, to identify a mutation as
-// this tone's own reading (armReadoutTracking), and here, to attribute a
-// sweep's worst tone in the printed table. The fresh browser context this
-// harness launches has no stored selection, so the app's default spelling
-// (firstRunDefaults, selection-store.ts) applies throughout.
-const SHARP_PITCH_CLASS_LABELS = [
-  "C",
-  "C♯",
-  "D",
-  "D♯",
-  "E",
-  "F",
-  "F♯",
-  "G",
-  "G♯",
-  "A",
-  "A♯",
-  "B",
-];
-
-function noteLabelOfPosition(position) {
-  const pitchClass = ((position % 12) + 12) % 12;
-  const octave = Math.floor(position / 12) - 1;
-  return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
-}
-
-// A TCP probe, not a fetch: Node's fetch rejects the dev server's
-// self-signed certificate, which would read as "down" (timing-test.mjs).
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
-// `pnpm dev`'s `predev` builds both crates to WebAssembly via cargo, which
-// is only on PATH once `~/.cargo/env` is sourced.
-async function ensureDevServer() {
-  if (await isDevServerUp()) return null;
-  const child = spawn("bash", ["-c", "source ~/.cargo/env && pnpm dev"], {
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
-  try {
-    process.kill(-child.pid, "SIGTERM");
-  } catch {
-    // Already gone — nothing to clean up.
-  }
-}
-
-// Runs in the page, before any of the app's own scripts (`page.addInitScript`)
-// — replaces `getUserMedia` with a function that hands back the *output* of
-// a `MediaStreamAudioDestinationNode` on the app's own AudioContext, so the
-// harness can feed known tones in as if they were the microphone. The
-// tuner creates its AudioContext lazily, inside `listening.start()`, before
-// this ever runs (webAudioListening's own `start()` calls `createContext()`
-// then `create(audioContext)`, and `create` — `createListener` — awaits
-// `getUserMedia` only after the worklet module has already been added on
-// that context) — so `window.__listening.context()` is non-null by the
-// time this function is called; if it were not, that is a harness fault,
-// not a silent no-op.
-function installMicrophoneOverride() {
-  navigator.mediaDevices.getUserMedia = async () => {
-    const listening = window.__listening;
-    if (listening === undefined) {
-      throw new Error("window.__listening not exposed — is this a dev build?");
-    }
-    const context = listening.context();
-    if (context === null) {
-      throw new Error(
-        "window.__listening.context() is null — the tuner has not created its AudioContext yet",
-      );
-    }
-    const destination = context.createMediaStreamDestination();
-    window.__micDestination = destination;
-    return destination.stream;
-  };
-}
+// positionsE2ToC7, noteLabelOfPosition, isDevServerUp, waitForDevServer,
+// ensureDevServer, stopDevServer and installMicrophoneOverride moved to
+// harness-lib.mjs (C008_T018) — imported above.
 
 // Everything below runs inside the page via a single `page.evaluate` call —
 // every timestamp (onset, mutation, PitchDetected, NoteJudged, paint) stays
@@ -607,20 +489,8 @@ function measureInPage(params) {
   }))();
 }
 
-function maxOf(values) {
-  if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
-  return Math.max(...values);
-}
-
-function minOf(values) {
-  if (values.some((value) => value === null)) return Number.NEGATIVE_INFINITY;
-  return Math.min(...values);
-}
-
-function paintAgeMaxOf(values) {
-  const present = values.filter((value) => value !== null);
-  return present.length > 0 ? Math.max(...present) : null;
-}
+// maxOf, minOf, paintAgeMaxOf and printTable moved to harness-lib.mjs
+// (C008_T018) — imported above.
 
 // The tone whose `selector(tone)` is largest — null sorts as worse than any
 // number (it means no matching reading ever arrived for that tone at all).
@@ -759,29 +629,6 @@ function silentRow(label, result) {
   };
 }
 
-function printTable(rows) {
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
-  const table = [header, ...rows.map((row) => row.cells)];
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
 
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T018.md b/changes/008-learner-leads/tasks/C008_T018.md
index 9e6c7a9..cc2e8cc 100644
--- a/changes/008-learner-leads/tasks/C008_T018.md
+++ b/changes/008-learner-leads/tasks/C008_T018.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T018
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
 
 # C008_T018 · Extract the microphone-feeding harness helpers into `scripts/harness-lib.mjs`
```

## Verdict

_The task reviewer appends its verdict here._

## Verdict

TASK: C008_T018
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] scripts/tuner-timing-test.mjs:78-80,491-492 — engineering.md's comment preference allows a comment only for a non-obvious WHY, not one that narrates the change — the two "moved to harness-lib.mjs (C008_T018) — imported above" comments are changelog narration and could be dropped (the import block above already shows what moved); not blocking.
UNVERIFIED:
- none — this task cites no requirement and the brief's Produces/Steps are fully checked against the diff and the package's recorded Verify/check output.
COMMANDS:
package only (plus a read-only `grep` confirming SHARP_PITCH_CLASS_LABELS/TUNER_*_POSITION/APP_URL/REPO_ROOT appear in harness-lib.mjs and that the only other copy of SHARP_PITCH_CLASS_LABELS is the stated in-page duplicate inside measureInPage; `./scripts/check-contexts.sh` → "✅ context boundaries respected")

<!-- recorded 2026-10-04T07:04:51Z by scripts/record.sh -->
