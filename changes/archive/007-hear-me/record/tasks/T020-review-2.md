---
type: Task Review
title: Review package — T020 · 007-hear-me
description: The diff produced for T020, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T020.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T020.md
  - resource: git:6c0023d988b6af333d9454ebbfb1bdf46ad4981a..134536850a25331af86e56aab065e2e6c7b230a7
generated:
  by: process:review-package.sh
  at: 2026-09-28T13:51:35Z
sdd_id: 007-hear-me
---

# Review package — T020 · 007-hear-me

base: `6c0023d988b6af333d9454ebbfb1bdf46ad4981a` → head: `134536850a25331af86e56aab065e2e6c7b230a7`

## Files changed

- M	changes/007-hear-me/notes.md
- M	scripts/design-shots.mjs

## Diff

```diff
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 39e05b7..646a80f 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -295,3 +295,64 @@ Pending the user's phone check.
 - Minor, recorded: why two distinct readings never share an `atFrame`
   (the listening port stamps `now_frame + 127` per hop, monotonic) is true
   but not stated at the effect.
+
+## T020 — design shots
+
+`scripts/design-shots.mjs` now points at this change's two vendored
+prototypes (`Practice.dc.html`, one frame; `Tuner.dc.html`, a canvas —
+`data-screen-label`s "4a Auto or target" and "5c Pitch spiral") and drives
+six states: `practice-way-in`, `tuner-listening`, `tuner-silent`,
+`tuner-cannot-hear`, `tuner-target-pinned`, `tuner-target-sheet`. Run with
+`APP_URL=https://localhost:5173 pnpm design:shots` (the running
+`pnpm dev:phone`); twelve PNGs landed in `.sdd/design-review/`. Every
+`state` Tweak used (`sweep` / `silent` / `cannot hear`) was reachable
+through the dc-runtime's own `window.__dcSetProps`/`window.__dcRootName`
+bridge (support.js's `Object.assign(window, api)`), so no fallback to the
+live-script default was needed. The target-pinned state is reached the
+same way on both sides: opening the target sheet, then Hold.
+
+Headless Chromium has no real microphone signal, so the app's
+`tuner-listening` and `tuner-silent` screenshots are the same shot (both
+silence) — compared against the prototype's `sweep` and `silent` renderings
+respectively; this is a limitation of the harness, not a finding.
+
+**Structural differences, by pair** (colour/spacing/size/type differences
+are taste and are left to the refinement loop):
+
+- **practice-way-in** — the design's bottom summary row reads
+  "↑↓ · 1 oct · scale · ♩ · loop" (a fifth segment, a quarter-note glyph,
+  between "scale" and "loop"); the app's reads "↑↓ · 1 oct · scale · loop"
+  — that segment is missing. `grep`-confirmed absent from `src/ui/`
+  entirely (not state-gated). This row is not part of 007-hear-me's own
+  Files (it is the practice screen's run/traversal summary chip, built in
+  an earlier change) — flagging it here since this comparison surfaced it,
+  for whichever task owns it.
+- **tuner-listening** — structural: the "TARGET auto · nearest" pill and
+  the stave card are swapped. The design (4a) places the pill *between*
+  the level and the stave card; `TunerScreen.tsx` renders `TunerLevel`,
+  then `TunerStave` (in its padded wrapper), then `TargetPill` — so the
+  pill draws *below* the card instead of above it. (Confirmed by reading
+  `TunerScreen.tsx`'s JSX order, not just the screenshot.)
+- **tuner-silent** — the same pill/stave-card order swap as
+  tuner-listening. Also, borderline: the stave card's second caption reads
+  "— IS" in the design (an em-dash standing in for the unknown note name,
+  keeping the word "IS") when nothing is pinned and nothing is detected;
+  the app shows a bare "—", dropping "IS" (`TunerStave.tsx`:
+  `referenceNote === null ? "—" : `${noteLabel(referenceNote)} IS`;`). This
+  reads as a text/content gap rather than a missing element, but is
+  source-confirmed, not a taste call — worth a look by whoever owns
+  `TunerStave.tsx`.
+- **tuner-cannot-hear** — the same pill/stave-card order swap. The "Can't
+  hear — no microphone" card's position, copy and layout otherwise match
+  the design closely.
+- **tuner-target-pinned** — the same pill/stave-card order swap (the
+  pinned "− TARGET A4 + ✕" pill sits below the stave card in the app,
+  above it in the design). The pinned pill's own layout, the stave's grey
+  target head and the "A4 IS 440.0 Hz" caption all match.
+- **tuner-target-sheet** — none. The sheet's header, Auto/Hold cards, "Or
+  tap a note" row, range caption and the pitch spiral (wedges, dimming,
+  hub, "pick a note") all match the design; no missing or misplaced
+  element found.
+
+The pill/stave-card order swap is the same root cause in all four 4a-based
+pairs (one line in `TunerScreen.tsx`), not four separate findings.
diff --git a/scripts/design-shots.mjs b/scripts/design-shots.mjs
index 9aa5aee..6eebab4 100644
--- a/scripts/design-shots.mjs
+++ b/scripts/design-shots.mjs
@@ -4,7 +4,9 @@
 // .sdd/design-review/, so the agent — and then the user — can compare
 // fidelity side by side. Originated for the 002-circle-redesign delta;
 // PROTOTYPE_PATH and STATES pointed at 003-hear-the-scale's prototype and
-// its states, then at 005-scale-selection's, then at 004-the-drone's.
+// its states, then at 005-scale-selection's, then at 004-the-drone's, then
+// (T020) at 007-hear-me's two prototype files, Practice.dc.html and
+// Tuner.dc.html.
 // Dev-only: not part of the test suite, not asserted against in CI (each
 // change's plan.md keeps this judgement human-plus-agent, not a
 // pixel-diff gate).
@@ -19,13 +21,16 @@ import { fileURLToPath, pathToFileURL } from "node:url";
 const __dirname = path.dirname(fileURLToPath(import.meta.url));
 const REPO_ROOT = path.resolve(__dirname, "..");
 const OUTPUT_DIR = path.join(REPO_ROOT, ".sdd", "design-review");
-const PROTOTYPE_PATH = path.join(
-  REPO_ROOT,
-  "changes",
-  "004-the-drone",
-  "design",
-  "Drone Ideas.dc.html",
-);
+const DESIGN_DIR = path.join(REPO_ROOT, "changes", "007-hear-me", "design");
+const PRACTICE_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Practice.dc.html");
+const TUNER_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Tuner.dc.html");
+// Tuner.dc.html carries its own `<dc-import name="Practice" …>` (a "way in"
+// thumbnail, elsewhere on its canvas) whose sibling fetch fails the same way
+// 004's Drone Ideas canvas's did (file:// + Chromium's Fetch API — see the
+// git history for that shim); unlike 004, none of the frames this task
+// captures (`data-screen-label`s "4a Auto or target", "5c Pitch spiral")
+// sit inside that import, so the failure is left as harmless console noise
+// rather than special-cased again.
 // `pnpm dev` is plain HTTP on localhost (a secure context already). If a
 // `pnpm dev:phone` (HTTPS) server holds the port instead, run with
 // APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
@@ -116,98 +121,189 @@ async function fulfillGoogleFontRequests(page) {
   });
 }
 
-// The Ideas canvas is a page of several frames, each a
-// `<dc-import name="Drone" …>` — the design tool's runtime (support.js)
-// resolves that sibling component with `fetch("./Drone.dc.html")`
-// (`ensureFetched`) the first time any frame needs it. Chromium's Fetch API
-// rejects the `file:` scheme outright (unlike navigation or a
-// `<script src>`, which both work for it), so on the file:// URL this
-// prototype loads from, that fetch throws and every `dc-import` renders an
-// empty placeholder forever — confirmed against the live page, not assumed.
-// `window.__resourceBlobs` is the runtime's own escape hatch for exactly
-// this case (support.js's `bundledBlob`): a same-named Blob found there is
-// read with `.text()` instead of being fetched, so seeding it before the
-// runtime's first script runs (`addInitScript`) with the component's real
-// source makes every `dc-import` on the page resolve normally.
-const DRONE_COMPONENT_NAME = "Drone"; // the dc-import's `name` attribute
-const DRONE_COMPONENT_PATH = path.join(
-  path.dirname(PROTOTYPE_PATH),
-  `${DRONE_COMPONENT_NAME}.dc.html`,
-);
-
-async function fulfillSiblingComponentFetch(page) {
-  const source = await readFile(DRONE_COMPONENT_PATH, "utf8");
-  await page.addInitScript(
-    ({ url, source: componentSource }) => {
-      window.__resourceBlobs = {
-        [url]: new Blob([componentSource], { type: "text/html" }),
-      };
-    },
-    { url: `./${DRONE_COMPONENT_NAME}.dc.html`, source },
-  );
-}
-
-// The rendered "Drone" component's own outer shell — Drone.dc.html's
-// `<div style="position:relative;width:390px;min-height:844px;…;
-// border-radius:18px">` — is the only element anywhere in that file with
-// this radius (verified by grep, not assumed), so this substring match
-// finds exactly one element per frame without needing a class or id the
-// design doesn't carry.
-const PHONE_FRAME_SELECTOR_SUFFIX = '[style*="border-radius: 18px"]';
+// React re-serialises every inline `style` attribute it renders (canonical
+// property order, `border-radius: 18px` with the space `rustfmt`-style,
+// colours as `rgb(...)`) regardless of how the vendored source wrote it —
+// confirmed against the rendered DOM, not assumed — so a selector matching
+// the *rendered* attribute needs that space even though the source HTML
+// (readable by grep) does not have one. This is the one phone-frame div on
+// a single-screen prototype page (Practice.dc.html); a multi-frame canvas
+// (Tuner.dc.html) is addressed directly by each frame's own
+// `data-screen-label` instead, which React leaves untouched.
+const PHONE_FRAME_SELECTOR = '[style*="border-radius: 18px"]';
 const FRAME_RENDER_TIMEOUT_MS = 10_000;
 const FRAME_RENDER_POLL_INTERVAL_MS = 100;
+// The dc-runtime's own template syntax (`{{ … }}`) is left literally in an
+// element's text until its first React render resolves it — a reliable,
+// file-agnostic "has this mounted yet" signal that doesn't assume anything
+// about what the frame draws (unlike matching a specific glyph).
+const UNRESOLVED_TEMPLATE_MARKER = "{{";
 
-// Waits for the `dc-import` inside `selector` (e.g. `[id="3a"]` — ids that
-// start with a digit, like the Ideas page's frame ids, aren't valid `#…`
-// CSS selectors) to render: the sibling fetch above resolves asynchronously,
-// so this polls rather than trusting the first paint after navigation.
-// "Rendered" is the same thing a human would check before trusting the
-// screenshot — a non-zero box, and the pill's own glyph (▶ off, ■ sounding)
-// actually present, not a placeholder — and returns that box for the caller
-// to clip a screenshot to.
+// Waits for `selector` to have rendered its final content — a non-zero box
+// and no unresolved template placeholder left in its text — the same thing
+// a human would check before trusting the screenshot. Polls rather than
+// trusting the first paint after navigation, since the runtime's own script
+// tag still has to load, parse and boot React before anything appears.
+// Returns the locator, ready to drive further (its box is re-measured right
+// before the screenshot itself — see screenshotPrototype).
 async function captureFrame(page, selector) {
-  const frame = page.locator(`${selector} ${PHONE_FRAME_SELECTOR_SUFFIX}`);
-  const pillGlyph = frame.getByText(/[▶■]/);
+  const frame = page.locator(selector);
   const deadline = Date.now() + FRAME_RENDER_TIMEOUT_MS;
   while (Date.now() < deadline) {
     const box = await frame.boundingBox();
-    if (
-      box &&
-      box.width > 0 &&
-      box.height > 0 &&
-      (await pillGlyph.count()) > 0
-    ) {
-      return box;
+    if (box && box.width > 0 && box.height > 0) {
+      const text = await frame.innerText();
+      if (!text.includes(UNRESOLVED_TEMPLATE_MARKER)) return frame;
     }
     await page.waitForTimeout(FRAME_RENDER_POLL_INTERVAL_MS);
   }
   throw new Error(
-    `${selector}: the dc-import frame never rendered (no non-zero box with the pill's glyph within ${FRAME_RENDER_TIMEOUT_MS}ms)`,
+    `${selector}: the frame never rendered (no non-zero box with fully-resolved text within ${FRAME_RENDER_TIMEOUT_MS}ms)`,
   );
 }
 
-// The Ideas page bakes each frame's target state into the dc-import's own
-// props (`drone-on="{{ true }}"` on 3a, `sheet-open="{{ true }}"` on 4a) —
-// so, unlike the wedge-clicking states this replaces, the prototype side
-// needs no driver at all, just the frame to capture. The app side still
-// drives through the same accessible names the scenario tests use
-// (tests/ui/scenarios/app-drone.test.tsx, drone-pill.test.tsx,
-// drone-sheet.test.tsx): G major first on both states, since the frames
-// show G major and the app's own first-run default is C major — selecting
-// it makes the pair compare like with like.
+// How long a prototype state change (a `__dcSetProps` call, or a driver's
+// clicks) is given to settle — transitions are already disabled (below), so
+// this only covers React's own re-render, which a `page.evaluate` /
+// `locator.click()` round-trip does not wait for on its own.
+const PROTOTYPE_STATE_SETTLE_MS = 400;
+// How long an app driver's last interaction (a click, an evaluated verb) is
+// given to settle before the screenshot — covers the same kind of
+// re-render/animation gap as PROTOTYPE_STATE_SETTLE_MS above, on the app
+// side.
+const APP_SCREENSHOT_SETTLE_MS = 500;
+
+// support.js's `init()` does `Object.assign(window, api)`, so
+// `window.__dcSetProps(name, overrides)` / `window.__dcRootName()` — the
+// same bridge the design tool's own "Tweaks" panel drives the page through
+// — are reachable from outside once the runtime has booted, without editing
+// the vendored file: `__dcSetProps` merges `overrides` over the
+// `data-props` schema's defaults and triggers a re-render (confirmed against
+// the running page: `state: "cannot hear"` alone reproduces the NO MIC
+// chrome and the "Can't hear" card).
+async function applyPrototypeState(page, frame, state) {
+  if (state.prototypeProps) {
+    await page.waitForFunction(
+      () =>
+        typeof window.__dcSetProps === "function" &&
+        typeof window.__dcRootName === "function",
+    );
+    await page.evaluate(
+      (props) => window.__dcSetProps(window.__dcRootName(), props),
+      state.prototypeProps,
+    );
+    await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
+  }
+  if (state.prototypeDriver) {
+    await state.prototypeDriver(frame);
+    await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
+  }
+}
+
+const TUNER_READING_FRAME_SELECTOR = '[data-screen-label="4a Auto or target"]';
+const TUNER_TARGET_SHEET_FRAME_SELECTOR =
+  '[data-screen-label="5c Pitch spiral"]';
+
+// Opens the target sheet (tapping the collapsed "TARGET auto · nearest"
+// pill) then pins the note currently sounding — the sheet's own "Hold" card
+// — the same two-tap path practice.tuner/REQ-004/S1 describes. Scoped to
+// `frame` (not `page`): both texts are repeated by the file's other
+// exploratory frames stacked on the same tall canvas, so an unscoped query
+// would match more than one.
+async function holdTargetOnPrototype(frame) {
+  await frame.getByText("auto · nearest").click();
+  await frame.getByText("Hold", { exact: true }).click();
+}
+
+// The app driver shared by every tuner-* state below: opens the tuner and
+// waits for its own "‹ Practice" back button (TunerScreen's
+// aria-label="Practice") so a later step never races the screen's mount.
+// That button is drawn whether or not the microphone was granted
+// (practice.tuner/REQ-007/S1: the chrome still draws without it), so this
+// one driver covers tuner-cannot-hear too.
+async function enterTuner(page) {
+  await page.getByRole("button", { name: "Tuner" }).click();
+  await page.getByRole("button", { name: "Practice", exact: true }).waitFor();
+}
+
+// Chromium's standard recipe for automating getUserMedia: the first flag
+// auto-accepts the permission prompt headless would otherwise leave
+// unanswered; the second guarantees a virtual input device exists
+// regardless of the host's own audio hardware (confirmed silent, not a
+// synthetic tone — the app still reads "Play a note" behind it), so
+// `pnpm design:shots` behaves the same on a bare CI box as on a laptop with
+// a real microphone. Only the app screenshots that actually listen are
+// taken from a browser launched with this; tuner-cannot-hear is
+// deliberately taken from the other one, so the prompt is left denied.
+const APP_MEDIA_LAUNCH_ARGS = [
+  "--use-fake-ui-for-media-stream",
+  "--use-fake-device-for-media-stream",
+];
+
+// The six states this task compares: `practice-way-in` (Practice.dc.html,
+// no interaction, both sides); the tuner reading frame (4a) at three Tweaks
+// states — listening, silent, cannot-hear — plus a target pinned on it by
+// driving the same "Hold" path on both sides; and the target sheet (5c, its
+// spiral already the frame's own baked-in state, needing no driver) against
+// the app's TargetSheet opened by TARGET.
+//
+// Headless has no real microphone signal to feed the app, so
+// tuner-listening's and tuner-silent's app screenshots are the same shot —
+// there is nothing to "sweep" without an injected tone. Both are still
+// written and reviewed as their own pair (against the prototype's `sweep`
+// and `silent` renderings respectively) because a missing/misplaced element
+// would still show up in either one; see notes.md for what that means for
+// this pair specifically.
 const STATES = {
-  "drone-on-3a": {
-    prototypeFrameSelector: '[id="3a"]',
+  "practice-way-in": {
+    prototypePath: PRACTICE_PROTOTYPE_PATH,
+    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
+    appNeedsMic: false,
+    app: async () => {
+      // The app as loaded — no interaction.
+    },
+  },
+  "tuner-listening": {
+    prototypePath: TUNER_PROTOTYPE_PATH,
+    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
+    prototypeProps: { state: "sweep" },
+    appNeedsMic: true,
+    app: enterTuner,
+  },
+  "tuner-silent": {
+    prototypePath: TUNER_PROTOTYPE_PATH,
+    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
+    prototypeProps: { state: "silent" },
+    appNeedsMic: true,
+    app: enterTuner,
+  },
+  "tuner-cannot-hear": {
+    prototypePath: TUNER_PROTOTYPE_PATH,
+    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
+    prototypeProps: { state: "cannot hear" },
+    appNeedsMic: false,
+    app: enterTuner,
+  },
+  "tuner-target-pinned": {
+    prototypePath: TUNER_PROTOTYPE_PATH,
+    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
+    prototypeDriver: holdTargetOnPrototype,
+    appNeedsMic: true,
     app: async (page) => {
-      await page.getByRole("button", { name: "G major" }).click();
-      await page.getByRole("button", { name: "Start drone" }).click();
+      await enterTuner(page);
+      // Position 69 is A4 in theory's pitchPosition numbering (plan.md;
+      // C4 = 60), the same note the prototype's Hold pins from a live
+      // reading near A4.
+      await page.evaluate(() => window.__session.pinTarget(69));
     },
   },
-  "drone-sheet-4a": {
-    prototypeFrameSelector: '[id="4a"]',
+  "tuner-target-sheet": {
+    prototypePath: TUNER_PROTOTYPE_PATH,
+    prototypeFrameSelector: TUNER_TARGET_SHEET_FRAME_SELECTOR,
+    appNeedsMic: true,
     app: async (page) => {
-      await page.getByRole("button", { name: "G major" }).click();
-      await page.getByRole("button", { name: "Edit drone" }).click();
+      await enterTuner(page);
+      await page.getByRole("button", { name: "Target", exact: true }).click();
     },
   },
 };
@@ -234,6 +330,10 @@ function validateStateNames(names) {
   }
 }
 
+function stateNeedsMic(stateName) {
+  return STATES[stateName].appNeedsMic === true;
+}
+
 // A TCP probe, not a fetch: Node's fetch rejects the dev server's
 // self-signed certificate, which would read as "down".
 function isDevServerUp() {
@@ -286,6 +386,7 @@ function stopDevServer(child) {
 }
 
 async function screenshotPrototype(browser, stateName) {
+  const state = STATES[stateName];
   const context = await browser.newContext({
     ignoreHTTPSErrors: true,
     viewport: VIEWPORT,
@@ -293,35 +394,50 @@ async function screenshotPrototype(browser, stateName) {
   });
   const page = await context.newPage();
   await fulfillGoogleFontRequests(page);
-  await fulfillSiblingComponentFetch(page);
-  await page.goto(pathToFileURL(PROTOTYPE_PATH).href);
+  await page.goto(pathToFileURL(state.prototypePath).href);
   // The prototype's sheets slide in over a CSS `transition` with no
   // `display:none` gating while closed (unlike the app's BottomSheet, whose
   // `display` flip makes its transition a no-op in practice — see
-  // src/ui/overlay.tsx). 3a and 4a set their props from the very first
-  // render, so there is no click to land mid-animation after, but disabling
-  // transitions still guards anything else still mid-flight on first paint
-  // (e.g. the sheet's on/off switch knob).
+  // src/ui/overlay.tsx); disabling transitions guards every state driven by
+  // a click (e.g. holdTargetOnPrototype's sheet open/close) against landing
+  // mid-animation.
   await page.addStyleTag({
     content: "*, *::before, *::after { transition: none !important; }",
   });
-  const box = await captureFrame(
-    page,
-    STATES[stateName].prototypeFrameSelector,
-  );
-  // `clip` alone only crops within the current viewport; the Ideas canvas
-  // stacks several frames on one page, so the one being captured usually
-  // sits well below the first 844px — `fullPage` renders the whole
-  // scrollable page first, the same as a human scrolling to it, and then
-  // the clip crops out just this frame's own 390x844.
+  const frame = await captureFrame(page, state.prototypeFrameSelector);
+  await applyPrototypeState(page, frame, state);
+  // `clip` alone only crops within the current viewport, and a locator's own
+  // `.screenshot()` mis-stitches an element taller than the viewport
+  // (confirmed against Practice.dc.html's 863px-tall card, min-height:844,
+  // under this exact page: the lower portion came back as the page's own
+  // background colour instead of the card's — a Playwright/Chromium gap,
+  // not a layout bug in the vendored file, which a `fullPage` render, itself
+  // correct, showed). `fullPage: true` renders the whole scrollable page
+  // first, the same as a human scrolling to it, and then the clip — sized to
+  // the frame's own just-measured box, since the frames this task captures
+  // are not all the same size (4a's 844 vs 5c's 700 vs Practice's 863) —
+  // crops out just this one frame.
+  //
+  // `boundingBox()` is relative to the *current viewport* (it moves with
+  // scroll), but a `fullPage` screenshot's `clip` is relative to the whole
+  // document — the same gap a driver with no clicks (nothing to scroll to)
+  // never hits, but holdTargetOnPrototype's clicks do (Playwright scrolls
+  // the picked-up-on-canvas frame to the very bottom of a >2500px-tall
+  // page to reach "Hold"), so the box is converted back to document space
+  // with the scroll position at capture time before it's used as a clip.
+  const box = await frame.boundingBox();
+  const scroll = await page.evaluate(() => ({
+    x: window.scrollX,
+    y: window.scrollY,
+  }));
   await page.screenshot({
     path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
     fullPage: true,
     clip: {
-      x: box.x,
-      y: box.y,
-      width: VIEWPORT.width,
-      height: VIEWPORT.height,
+      x: box.x + scroll.x,
+      y: box.y + scroll.y,
+      width: box.width,
+      height: box.height,
     },
   });
   await context.close();
@@ -345,6 +461,7 @@ async function screenshotApp(browser, stateName) {
       `[design-shots] ${stateName}: app driver failed — ${error.message}`,
     );
   }
+  await page.waitForTimeout(APP_SCREENSHOT_SETTLE_MS);
   await page.screenshot({
     path: path.join(OUTPUT_DIR, `${stateName}.app.png`),
   });
@@ -358,14 +475,19 @@ async function main() {
 
   const devServerChild = await ensureDevServer();
   const browser = await chromium.launch();
+  const micBrowser = stateNames.some(stateNeedsMic)
+    ? await chromium.launch({ args: APP_MEDIA_LAUNCH_ARGS })
+    : null;
   try {
     for (const stateName of stateNames) {
       await screenshotPrototype(browser, stateName);
-      await screenshotApp(browser, stateName);
+      const appBrowser = stateNeedsMic(stateName) ? micBrowser : browser;
+      await screenshotApp(appBrowser, stateName);
       console.log(`[design-shots] wrote ${stateName}.{prototype,app}.png`);
     }
   } finally {
     await browser.close();
+    if (micBrowser) await micBrowser.close();
     stopDevServer(devServerChild);
   }
 }
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 646a80f..5cfe422 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -319,14 +319,11 @@ respectively; this is a limitation of the harness, not a finding.
 **Structural differences, by pair** (colour/spacing/size/type differences
 are taste and are left to the refinement loop):
 
-- **practice-way-in** — the design's bottom summary row reads
-  "↑↓ · 1 oct · scale · ♩ · loop" (a fifth segment, a quarter-note glyph,
-  between "scale" and "loop"); the app's reads "↑↓ · 1 oct · scale · loop"
-  — that segment is missing. `grep`-confirmed absent from `src/ui/`
-  entirely (not state-gated). This row is not part of 007-hear-me's own
-  Files (it is the practice screen's run/traversal summary chip, built in
-  an earlier change) — flagging it here since this comparison surfaced it,
-  for whichever task owns it.
+- **practice-way-in** — the design's bottom summary row shows a fifth
+  segment ("♩", note length) the app does not have. **Not a bug:** note
+  length was removed (decision 2026-09-22, 003) and 005 ruled the design's
+  ♩/♪ toggle "stale carryover … not a reintroduction" (decision
+  2026-09-23); `Practice.dc.html` inherits that stale row. Nothing to do.
 - **tuner-listening** — structural: the "TARGET auto · nearest" pill and
   the stave card are swapped. The design (4a) places the pill *between*
   the level and the stave card; `TunerScreen.tsx` renders `TunerLevel`,
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 05551bb..a0d845c 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -286,15 +286,15 @@ function TunerScreenComponent(props: {
         </span>
       </div>
       <TunerLevel tuner={tuner} spelling={spelling} />
-      <div style={{ padding: "10px 16px 0" }}>
-        <TunerStave tuner={tuner} trail={trailRef.current} />
-      </div>
       <TargetPill
         tuner={tuner}
         onOpen={handleOpenTarget}
         onStep={onStep}
         onClear={onClear}
       />
+      <div style={{ padding: "10px 16px 0" }}>
+        <TunerStave tuner={tuner} trail={trailRef.current} />
+      </div>
       {cannotHear && (
         <div
           data-testid="cannot-hear"
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index 9bef4c9..56bc2e5 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -376,7 +376,7 @@ export function TunerStave(props: {
   const referenceNote = referenceNoteOf(reading, targetNote);
   const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
   const referenceLabel =
-    referenceNote === null ? "—" : `${noteLabel(referenceNote)} IS`;
+    referenceNote === null ? "— IS" : `${noteLabel(referenceNote)} IS`;
   const heardHz = reading === null ? null : reading.heard.hz;
 
   return (
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index 8f61938..9217c8c 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -177,3 +177,16 @@ test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preferen
   await userEvent.click(screen.getByRole("button", { name: "Practice" }));
   expect(screen.getByRole("button", { name: "G♭ major" })).toBeTruthy(); // the circle now spells flat
 });
+
+test("practice.tuner/REQ-004 — the target pill sits between the level and the stave strip (design 4a)", async () => {
+  await enterAndHear(440.0);
+  const level = screen.getByTestId("tuner-reading");
+  const pill = screen.getByRole("button", { name: "Target" });
+  const strip = screen.getByTestId("heard-head").closest("svg")!;
+  expect(
+    level.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING,
+  ).toBeTruthy();
+  expect(
+    pill.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
+  ).toBeTruthy();
+});
diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
index 9cedd72..f5eeba5 100644
--- a/tests/ui/scenarios/tuner-stave.test.tsx
+++ b/tests/ui/scenarios/tuner-stave.test.tsx
@@ -79,3 +79,11 @@ test("practice.tuner/REQ-005 — the trail keeps the last 50 readings, oldest fi
     screen.getByTestId("trail").getAttribute("d")!.split(" L "),
   ).toHaveLength(50);
 });
+
+test('practice.tuner/REQ-005 — nothing referenced reads "— IS" over "—"', async () => {
+  const f = await enterAndHear(440.0);
+  f.clock.advanceMs(300);
+  await act(async () => {});
+  expect(screen.getByText("— IS")).toBeTruthy();
+  expect(screen.getByTestId("reference-hz").textContent).toBe("—");
+});
```

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] the two structural fixes live outside T020's Files list (no downstream task owns them; accepted). [minor] PROTOTYPE_STATE_SETTLE_MS 400 ms vs the sweep's 600 ms startup silence — flaky prototype shot, recorded. The order test verified to fail on a swapped order; the "— IS" test on the bare "—"; the notes cite the 003/005 decisions.

<!-- recorded 2026-09-28T13:58:31Z by scripts/record.sh -->
