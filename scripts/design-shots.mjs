#!/usr/bin/env node
// Design-review loop: drives the vendored prototype and the live app to the
// same named UI state and writes paired 390x844 @2x screenshots to
// changes/008-learner-leads/design/rounds/shots/, so the agent — and then the
// user — can compare fidelity side by side. Originated for the
// 002-circle-redesign delta; PROTOTYPE_PATH and STATES pointed at
// 003-hear-the-scale's prototype and its states, then at 005-scale-selection's,
// then at 004-the-drone's, then at 007-hear-me's two prototype files, and (008
// T020) at 008-learner-leads' canvas, Learner Leads Final.dc.html, and its
// single-phone prototype, Learner Leads Practice.dc.html.
// Dev-only: not part of the test suite, not asserted against in CI (each
// change's plan.md keeps this judgement human-plus-agent, not a
// pixel-diff gate).

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  APP_URL,
  ensureDevServer,
  installMicrophoneOverride,
  stopDevServer,
} from "./harness-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DESIGN_DIR = path.join(
  REPO_ROOT,
  "changes",
  "008-learner-leads",
  "design",
);
const OUTPUT_DIR = path.join(DESIGN_DIR, "rounds", "shots");
// The canvas: eleven phones, ids #s01…#s11 (11 is a simulated player — a demo
// with nothing to build, so it has no state below). The second file is the
// one-phone prototype the canvas imports, props `mode` (tool / me) and
// `llState`; it carries the two Interface rows the canvas does not draw.
const CANVAS_PROTOTYPE_PATH = path.join(
  DESIGN_DIR,
  "Learner Leads Final.dc.html",
);
const PRACTICE_PROTOTYPE_PATH = path.join(
  DESIGN_DIR,
  "Learner Leads Practice.dc.html",
);
const VIEWPORT = { width: 390, height: 844 };
// Wide and tall enough to hold any one prototype phone (392 × 846, or the
// one-phone page's 863) whole.
const PROTOTYPE_VIEWPORT = { width: 480, height: 1000 };
const DEVICE_SCALE_FACTOR = 2;
// The prototype's <link> pulls the same four @fontsource families the app
// imports in src/ui/main.tsx (Instrument Serif 400, Noto Music 400, Public
// Sans 400/500/600/700, JetBrains Mono 400/500/600) — routing its Google
// Fonts request to the *same* locally vendored CSS+woff2 files makes the
// prototype/app screenshot pairs a fair typography comparison instead of
// falling back to system fonts on one side only.
const FONT_STYLESHEET_HOST = "fonts.googleapis.com";
const FONT_FILE_HOST = "fonts.gstatic.com";
const FONT_FILE_URL_PREFIX = `https://${FONT_FILE_HOST}/s/`;
const FONTSOURCE_DIR = path.join(REPO_ROOT, "node_modules", "@fontsource");
const FONT_STYLESHEETS = [
  ["instrument-serif", "index.css"],
  ["noto-music", "index.css"],
  ["public-sans", "index.css"],
  ["public-sans", "500.css"],
  ["public-sans", "600.css"],
  ["public-sans", "700.css"],
  ["jetbrains-mono", "index.css"],
  ["jetbrains-mono", "500.css"],
  ["jetbrains-mono", "600.css"],
];

// Builds one stylesheet out of the vendored @font-face rules, rewriting each
// relative `url(./files/…)` to an absolute fonts.gstatic.com URL so the
// prototype's <link> — which points at that host — can be answered with it,
// and the individual font files can then be routed from the same package.
async function buildLocalFontStylesheet() {
  const sheets = await Promise.all(
    FONT_STYLESHEETS.map(([pkg, file]) =>
      readFile(path.join(FONTSOURCE_DIR, pkg, file), "utf8"),
    ),
  );
  return sheets
    .join("\n")
    .replaceAll("url(./files/", `url(${FONT_FILE_URL_PREFIX}`);
}

// Every @font-face src the stylesheet above references lives under one of
// the four packages' files/ directories, named uniquely (each filename
// already carries its package prefix) — so the font file it requests can be
// found by basename alone, without re-deriving which package/weight it is.
async function readLocalFontFile(fileName) {
  for (const [pkg] of FONT_STYLESHEETS) {
    const candidate = path.join(FONTSOURCE_DIR, pkg, "files", fileName);
    try {
      return await readFile(candidate);
    } catch {
      // Not in this package's files/ directory — try the next.
    }
  }
  throw new Error(`no local font file found for ${fileName}`);
}

function fontFileContentType(fileName) {
  return fileName.endsWith(".woff2") ? "font/woff2" : "font/woff";
}

// Google Fonts is unreachable in some environments this runs in (and would
// serve different bytes than the app's self-hosted, pinned @fontsource
// versions even where it is reachable), so the prototype's request for it is
// answered locally instead: the stylesheet request gets the vendored
// @font-face rules, and each font file request gets the matching local
// woff2/woff bytes — the same files src/ui/main.tsx imports for the app.
async function fulfillGoogleFontRequests(page) {
  const stylesheet = await buildLocalFontStylesheet();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === FONT_STYLESHEET_HOST) {
      return route.fulfill({ contentType: "text/css", body: stylesheet });
    }
    if (url.hostname === FONT_FILE_HOST) {
      const fileName = url.pathname.replace(/^\/s\//, "");
      const body = await readLocalFontFile(fileName);
      return route.fulfill({
        contentType: fontFileContentType(fileName),
        body,
      });
    }
    return route.continue();
  });
}

// The canvas is eleven frames, each a `<dc-import name="Learner Leads
// Practice" …>` — the design tool's runtime (support.js) resolves that sibling
// component with `fetch("./Learner%20Leads%20Practice.dc.html")`
// (`ensureFetched`) the first time any frame needs it. Chromium's Fetch API
// rejects the `file:` scheme outright (unlike navigation or a `<script src>`,
// which both work for it), so on the file:// URL the canvas loads from, that
// fetch throws and every `dc-import` renders an empty placeholder forever —
// confirmed against the live page (blank phones), not assumed.
// `window.__resourceBlobs` is the runtime's own escape hatch for exactly this
// case (support.js's `bundledBlob`): a same-keyed Blob found there is read
// with `.text()` instead of being fetched, so seeding it before the runtime's
// first script runs (`addInitScript`) with the component's real source makes
// every `dc-import` on the page resolve normally. (The same shim 004's Drone
// Ideas canvas needed.)
const SIBLING_COMPONENT_NAME = "Learner Leads Practice";

async function fulfillSiblingComponentFetch(page) {
  const source = await readFile(PRACTICE_PROTOTYPE_PATH, "utf8");
  await page.addInitScript(
    ({ url, source: componentSource }) => {
      window.__resourceBlobs = {
        [url]: new Blob([componentSource], { type: "text/html" }),
      };
    },
    {
      url: `./${encodeURIComponent(SIBLING_COMPONENT_NAME)}.dc.html`,
      source,
    },
  );
}

// React re-serialises every inline `style` attribute it renders (canonical
// property order, `border-radius: 18px` with the space `rustfmt`-style,
// colours as `rgb(...)`) regardless of how the vendored source wrote it —
// confirmed against the rendered DOM, not assumed — so a selector matching
// the *rendered* attribute needs that space even though the source HTML
// (readable by grep) does not have one. This is the one phone-frame div on
// the single-phone prototype page (Learner Leads Practice.dc.html).
const PHONE_FRAME_SELECTOR = '[style*="border-radius: 18px"]';
// The canvas's phones are addressed by their wrapper's own id (`s01`…`s11`,
// `id="s{{ o.id }}"`): the wrapper holds a title row, a description and then
// the phone itself as its third child.
const canvasPhoneSelector = (id) => `#s${id} > div:nth-child(3)`;
const FRAME_RENDER_TIMEOUT_MS = 10_000;
const FRAME_RENDER_POLL_INTERVAL_MS = 100;
// The dc-runtime's own template syntax (`{{ … }}`) is left literally in an
// element's text until its first React render resolves it — a reliable,
// file-agnostic "has this mounted yet" signal that doesn't assume anything
// about what the frame draws (unlike matching a specific glyph).
const UNRESOLVED_TEMPLATE_MARKER = "{{";

// Waits for `selector` to have rendered its final content — a non-zero box
// and no unresolved template placeholder left in its text — the same thing
// a human would check before trusting the screenshot. Polls rather than
// trusting the first paint after navigation, since the runtime's own script
// tag still has to load, parse and boot React before anything appears.
// Returns the locator, ready to drive further (its box is re-measured right
// before the screenshot itself — see screenshotPrototype).
async function captureFrame(page, selector) {
  const frame = page.locator(selector);
  const deadline = Date.now() + FRAME_RENDER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const box = await frame.boundingBox();
    if (box && box.width > 0 && box.height > 0) {
      const text = await frame.innerText();
      if (!text.includes(UNRESOLVED_TEMPLATE_MARKER)) return frame;
    }
    await page.waitForTimeout(FRAME_RENDER_POLL_INTERVAL_MS);
  }
  throw new Error(
    `${selector}: the frame never rendered (no non-zero box with fully-resolved text within ${FRAME_RENDER_TIMEOUT_MS}ms)`,
  );
}

// How long a prototype state change (a `__dcSetProps` call, or a driver's
// clicks) is given to settle — transitions are already disabled (below), so
// this only covers React's own re-render, which a `page.evaluate` /
// `locator.click()` round-trip does not wait for on its own.
const PROTOTYPE_STATE_SETTLE_MS = 400;
// How long an app driver's last interaction (a click, an evaluated verb) is
// given to settle before the screenshot — covers the same kind of
// re-render/animation gap as PROTOTYPE_STATE_SETTLE_MS above, on the app
// side. A state whose reading is time-boxed (a hold part-way, the "held ✓"
// that lasts 0.4 s) sets `appSettleMs: 0` and takes the shot as soon as its
// driver returns.
const APP_SCREENSHOT_SETTLE_MS = 500;
// How many times a time-boxed live state is re-driven on a fresh page when
// its own `appVerify` says the shot missed the moment.
const APP_VERIFY_ATTEMPTS = 4;

// support.js's `init()` does `Object.assign(window, api)`, so
// `window.__dcSetProps(name, overrides)` / `window.__dcRootName()` — the
// same bridge the design tool's own "Tweaks" panel drives the page through
// — are reachable from outside once the runtime has booted, without editing
// the vendored file: `__dcSetProps` merges `overrides` over the
// `data-props` schema's defaults and triggers a re-render.
async function applyPrototypeState(page, frame, state) {
  if (state.prototypeProps) {
    await page.waitForFunction(
      () =>
        typeof window.__dcSetProps === "function" &&
        typeof window.__dcRootName === "function",
    );
    await page.evaluate(
      (props) => window.__dcSetProps(window.__dcRootName(), props),
      state.prototypeProps,
    );
    await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
  }
  if (state.prototypeDriver) {
    await state.prototypeDriver(frame);
    await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
  }
}

// ---------------------------------------------------------------------------
// Prototype drivers (scoped to `frame`: the Practice page holds the whole
// sheet in its DOM, so unscoped text queries would still be fine there, but
// the canvas repeats every label eleven times).
// ---------------------------------------------------------------------------

// The one-phone prototype's ▶ is the second "▶" on the page (the first is the
// drone pill's). The prototype's own card draws only the lead states
// (`running` there is the lead run), so a play-along run is shown in it by
// the panel alone — the sounding note highlighted — and its card stays the
// idle card: the live card (❚❚, "<note> · k of N") is "not drawn on the
// canvas, ruled at the walkthrough" (the proposal's Interface table). The shot
// waits out the count-in (3 beats at 96 bpm) and a note.
const PROTOTYPE_COUNT_IN_AND_NOTE_MS = 3200;

async function playOnPrototype(frame) {
  await frame.getByText("▶", { exact: true }).nth(1).click();
  await frame.page().waitForTimeout(PROTOTYPE_COUNT_IN_AND_NOTE_MS);
}

// Cues → meter off, through the sheet (Practice prototype in I lead,
// `llState: "holding"`), then the sheet closed again.
async function meterOffOnPrototype(frame) {
  await frame.getByText("edit ›").click();
  await frame.getByText("meter", { exact: true }).click();
  // The sheet's ✕ is the first of five (scales, tempo, picker and settings
  // each have their own, later in the file).
  await frame.getByText("✕", { exact: true }).first().click();
}

// ---------------------------------------------------------------------------
// App drivers. The live app is reached through its visible controls — the
// mode words, the start circle, "edit ›" — and, for the listening states, the
// microphone override of harness-lib.mjs (`installMicrophoneOverride`): the
// app's own AudioContext hands a MediaStreamAudioDestinationNode's stream
// back as the microphone and a sine fed into that node is the "learner". The
// in-page tone-feeding code (scripts/design-shots-page.mjs, shared with
// design_snapshot.py) is injected before the app loads; `tones` below calls it.
// ---------------------------------------------------------------------------

const PAGE_HELPERS_PATH = path.join(__dirname, "design-shots-page.mjs");
const MODE_WORD_I_LEAD = "mode-word-me";
const START_CIRCLE = "start-circle";
const COMPLETE_TIMEOUT_MS = 30_000;

const tones = {
  setSettings: (page, overrides) =>
    page.evaluate((o) => window.__shotTones.setSettings(o), overrides),
  feed: (page, cents) =>
    page.evaluate((c) => window.__shotTones.feed(c), cents),
  burst: (page, durationMs) =>
    page.evaluate((ms) => window.__shotTones.burst(ms), durationMs),
  playRunToComplete: (page) =>
    page.evaluate(
      (ms) => window.__shotTones.playRunToComplete(ms),
      COMPLETE_TIMEOUT_MS,
    ),
  leadSnapshot: (page) =>
    page.evaluate(() => window.__shotTones.leadSnapshot()),
};

async function chooseILead(page) {
  await page.getByTestId(MODE_WORD_I_LEAD).click();
}

async function openSheet(page) {
  await page.getByText("edit ›").click();
  await page.getByTestId("sheet-close").waitFor();
}

async function closeSheet(page) {
  await page.getByTestId("sheet-close").click();
  await page.getByTestId("sheet-close").waitFor({ state: "hidden" });
}

// Starts the lead run the way a learner does (the circle, which asks for the
// microphone at that moment) and waits for the first target to be shown.
async function startLeadRun(page) {
  await page.getByTestId(START_CIRCLE).click();
  await page.getByTestId("stop-circle").waitFor();
}

// "<note> held ✓" lasts until the first reading against the new target (or
// 0.4 s of silence), and a tone that is still sounding when the target
// advances gives that reading within one hop. So the advance is made the last
// thing the microphone hears: an in-tune burst of about the first reading's
// latency plus the 625 ms hold of one beat at 96 bpm, then silence. Measured:
// 650 ms advances with the burst's last reading; 660 ms and longer let a
// reading against the new target through. The other lengths are the retries'
// jitter.
const ADVANCE_BURST_MS_BY_ATTEMPT = [650, 646, 654, 642];
// The first target's warm-up (the listening graph settling) before a burst.
const BURST_WARMUP_MS = 300;
// How long after the burst's nominal end the shot is taken: the advance lands
// on the burst's last reading, ~40 ms past the audio's own end, and "held ✓"
// stays up 0.4 s against the ~100 ms the shot takes.
const AFTER_BURST_MS = 120;

async function reachAdvanced(page, attempt) {
  const durationMs = ADVANCE_BURST_MS_BY_ATTEMPT[attempt];
  await chooseILead(page);
  await tones.setSettings(page, { lead: { holdBeats: 1 } });
  await startLeadRun(page);
  await page.waitForTimeout(BURST_WARMUP_MS);
  await tones.burst(page, durationMs);
  await page.waitForTimeout(durationMs + AFTER_BURST_MS);
}

// Steady in-tune holding at about 58 % of a 4-beat hold at 96 bpm (2500 ms):
// the prototype draws 60 %.
const HOLDING_BEATS = 4;
const HOLDING_AFTER_ONSET_MS = 1450;

async function holdInTune(page) {
  await tones.setSettings(page, { lead: { holdBeats: HOLDING_BEATS } });
  await startLeadRun(page);
  await tones.feed(page, 0);
  await page.waitForTimeout(HOLDING_AFTER_ONSET_MS);
}

// ---------------------------------------------------------------------------
// The twelve states: one per row of the proposal's Interface table, named by
// the row's State. `canvas` rows are phones 01–10 on Learner Leads Final;
// the two rows the canvas does not draw (`playing-play-along`,
// `holding-meter-off`) are the one-phone prototype driven the same way as the
// app. 11 (the simulated player) is a demo with nothing to build: no state.
//
// micMode: "fed" — a fake-ui browser with installMicrophoneOverride and the
// in-page tone helpers; "default" — a browser that was never granted the microphone (the
// request is refused, which is what the no-microphone card is for); omitted —
// the microphone is never asked for.
// ---------------------------------------------------------------------------
const canvasState = (id, rest) => ({
  prototypePath: CANVAS_PROTOTYPE_PATH,
  prototypeFrameSelector: canvasPhoneSelector(id),
  ...rest,
});

const STATES = {
  "idle-play-along": canvasState("01", {
    app: async () => {
      // The app as loaded — no interaction.
    },
  }),
  "idle-i-lead": canvasState("02", {
    app: chooseILead,
  }),
  "playing-play-along": {
    prototypePath: PRACTICE_PROTOTYPE_PATH,
    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
    prototypeDriver: playOnPrototype,
    app: async (page) => {
      await page.getByTestId(START_CIRCLE).click();
      // The count-in is on by default: wait for the first note's caption.
      await page.getByText(/· 1 of 15/).waitFor({ timeout: 15_000 });
    },
  },
  "listening-silent": canvasState("03", {
    micMode: "fed",
    app: async (page) => {
      await chooseILead(page);
      await startLeadRun(page);
      await tones.feed(page, null);
    },
  }),
  "heard-out-of-tune": canvasState("04", {
    micMode: "fed",
    app: async (page) => {
      await chooseILead(page);
      await startLeadRun(page);
      // −18 ¢ flat of the target (the sharp twin, +12 ¢, differs only in
      // the line's side and colour).
      await tones.feed(page, -18);
    },
  }),
  holding: canvasState("05", {
    micMode: "fed",
    appSettleMs: 0,
    app: async (page) => {
      await chooseILead(page);
      await holdInTune(page);
    },
  }),
  "holding-meter-off": {
    prototypePath: PRACTICE_PROTOTYPE_PATH,
    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
    prototypeProps: { mode: "me", llState: "holding" },
    prototypeDriver: meterOffOnPrototype,
    micMode: "fed",
    appSettleMs: 0,
    app: async (page) => {
      await chooseILead(page);
      await openSheet(page);
      await page.getByText("meter", { exact: true }).click();
      await closeSheet(page);
      await holdInTune(page);
    },
  },
  advanced: canvasState("06", {
    micMode: "fed",
    appSettleMs: 0,
    app: reachAdvanced,
    appVerify: async (page) =>
      (await tones.leadSnapshot(page)).justHeld !== null,
  }),
  complete: canvasState("07", {
    micMode: "fed",
    app: async (page) => {
      await chooseILead(page);
      await startLeadRun(page);
      await tones.playRunToComplete(page);
    },
  }),
  "no-microphone": canvasState("08", {
    micMode: "default",
    app: async (page) => {
      await chooseILead(page);
      await page.getByTestId(START_CIRCLE).click();
      await page.getByTestId("no-mic-card").waitFor();
    },
  }),
  "sheet-play-along": canvasState("09", {
    appFullPage: false,
    app: openSheet,
  }),
  "sheet-i-lead": canvasState("10", {
    appFullPage: false,
    app: async (page) => {
      await chooseILead(page);
      await openSheet(page);
    },
  }),
};

function parseStatesArgument(argv) {
  const flagIndex = argv.indexOf("--states");
  if (flagIndex === -1) return Object.keys(STATES);
  const value = argv[flagIndex + 1];
  if (value === undefined) {
    throw new Error("--states requires a comma-separated list of state names");
  }
  return value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function validateStateNames(names) {
  const unknown = names.filter((name) => !(name in STATES));
  if (unknown.length > 0) {
    throw new Error(
      `unknown state(s): ${unknown.join(", ")} — known states are ${Object.keys(STATES).join(", ")}`,
    );
  }
}

async function screenshotPrototype(browser, stateName) {
  const state = STATES[stateName];
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: PROTOTYPE_VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await fulfillGoogleFontRequests(page);
  await fulfillSiblingComponentFetch(page);
  await page.goto(pathToFileURL(state.prototypePath).href);
  // The prototype's sheets slide in over a CSS `transition` with no
  // `display:none` gating while closed (unlike the app's BottomSheet, whose
  // `display` flip makes its transition a no-op in practice — see
  // src/ui/overlay.tsx); disabling transitions guards every state driven by
  // a click (e.g. a sheet open/close) against landing mid-animation.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; }",
  });
  const frame = await captureFrame(page, state.prototypeFrameSelector);
  await applyPrototypeState(page, frame, state);
  // The canvas is eleven phones tall (≈10 000 css px, 20 000 at 2x), past
  // Chromium's texture limit, so a `fullPage` render of it comes back blank —
  // and a locator's own `.screenshot()` mis-stitches an element taller than
  // the viewport (confirmed against a 863px-tall card under an 844px
  // viewport: the lower portion came back as the page's background colour).
  // So the prototype is photographed in a viewport taller than any frame
  // (PROTOTYPE_VIEWPORT), the frame scrolled into it, and the clip taken in
  // viewport coordinates.
  await frame.evaluate((element) =>
    element.scrollIntoView({ block: "start", inline: "start" }),
  );
  await page.waitForTimeout(PROTOTYPE_STATE_SETTLE_MS);
  const box = await frame.boundingBox();
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });
  await context.close();
}

async function screenshotAppOnce(browser, stateName, attempt) {
  const state = STATES[stateName];
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  if (state.micMode === "fed") {
    await page.addInitScript(installMicrophoneOverride);
    await page.addInitScript({ path: PAGE_HELPERS_PATH });
  }
  await page.goto(APP_URL);
  await page.waitForFunction(() => window.__session !== undefined);
  // The canvas draws its panel as the stave (the app opens on names), and the
  // meter is a thing on a notehead.
  await page.getByText("stave", { exact: true }).click();
  try {
    await state.app(page, attempt);
  } catch (error) {
    // A failing driver is a bug to fix, not to hide — but writing the app
    // shot with whatever rendered (instead of aborting the whole run) keeps
    // this warning, and the screenshot itself, as the evidence for that fix.
    console.warn(
      `[design-shots] ${stateName}: app driver failed — ${error.message}`,
    );
  }
  await page.waitForTimeout(state.appSettleMs ?? APP_SCREENSHOT_SETTLE_MS);
  // A time-boxed state must be up both before and after the shot to have been
  // up during it.
  const reachedBefore = state.appVerify ? await state.appVerify(page) : true;
  // The whole page, not the first screenful: the live cards run taller than
  // idle (the mode words under the judgement), pushing the summary row below
  // the fold, and where it lands is part of the comparison. A sheet is an
  // overlay fixed to the viewport, so those are the viewport itself.
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.app.png`),
    fullPage: state.appFullPage !== false,
  });
  const reached =
    reachedBefore && (state.appVerify ? await state.appVerify(page) : true);
  if (state.micMode === "fed" && stateName === "holding") {
    const snapshot = await tones.leadSnapshot(page).catch(() => null);
    console.log(
      `[design-shots] ${stateName}: fill at the shot ≈ ${snapshot?.heldFraction ?? "?"}`,
    );
  }
  await context.close();
  return reached;
}

// A time-boxed live state (the 0.4 s "held ✓") is re-driven on a fresh page
// when the shot missed it, rather than written as a misleading pair.
async function screenshotApp(browserOf, stateName) {
  const browser = browserOf(STATES[stateName].micMode);
  for (let attempt = 1; attempt <= APP_VERIFY_ATTEMPTS; attempt += 1) {
    if (await screenshotAppOnce(browser, stateName, attempt - 1)) return;
    console.warn(
      `[design-shots] ${stateName}: shot ${attempt}/${APP_VERIFY_ATTEMPTS} missed the moment — retrying`,
    );
  }
  console.warn(
    `[design-shots] ${stateName}: the last shot did not catch the state`,
  );
}

// Chromium's standard recipe for automating getUserMedia: the first flag
// auto-accepts the permission prompt headless would otherwise leave
// unanswered. The plain browser keeps the prompt unanswered-and-denied, which
// is what no-microphone (08) is the picture of.
const APP_MEDIA_LAUNCH_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--autoplay-policy=no-user-gesture-required",
];

// The canvas pulls React and Babel from a CDN on every load; a load that
// never mounts its frames is re-tried rather than failing the whole run.
const PROTOTYPE_ATTEMPTS = 3;

async function withRetry(stateName, run) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt === PROTOTYPE_ATTEMPTS) throw error;
      console.warn(
        `[design-shots] ${stateName}: prototype attempt ${attempt}/${PROTOTYPE_ATTEMPTS} failed — ${error.message.split("\n")[0]}`,
      );
    }
  }
}

async function main() {
  const stateNames = parseStatesArgument(process.argv.slice(2));
  validateStateNames(stateNames);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const devServerChild = await ensureDevServer();
  const browser = await chromium.launch();
  const needsFed = stateNames.some((name) => STATES[name].micMode === "fed");
  const fedBrowser = needsFed
    ? await chromium.launch({ args: APP_MEDIA_LAUNCH_ARGS })
    : null;
  const browserOf = (micMode) => (micMode === "fed" ? fedBrowser : browser);
  try {
    for (const stateName of stateNames) {
      await withRetry(stateName, () => screenshotPrototype(browser, stateName));
      await screenshotApp(browserOf, stateName);
      console.log(`[design-shots] wrote ${stateName}.{prototype,app}.png`);
    }
  } finally {
    await browser.close();
    if (fedBrowser) await fedBrowser.close();
    stopDevServer(devServerChild);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
