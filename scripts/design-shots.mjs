#!/usr/bin/env node
// Design-review loop: drives the vendored prototype and the live app to the
// same named UI state and writes paired 390x844 @2x screenshots to
// .sdd/design-review/, so the agent — and then the user — can compare
// fidelity side by side. Originated for the 002-circle-redesign delta;
// PROTOTYPE_PATH and STATES pointed at 003-hear-the-scale's prototype and
// its states, then at 005-scale-selection's, then at 004-the-drone's, then
// (T020) at 007-hear-me's two prototype files, Practice.dc.html and
// Tuner.dc.html.
// Dev-only: not part of the test suite, not asserted against in CI (each
// change's plan.md keeps this judgement human-plus-agent, not a
// pixel-diff gate).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, ".sdd", "design-review");
const DESIGN_DIR = path.join(REPO_ROOT, "changes", "007-hear-me", "design");
const PRACTICE_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Practice.dc.html");
const TUNER_PROTOTYPE_PATH = path.join(DESIGN_DIR, "Tuner.dc.html");
// Tuner.dc.html carries its own `<dc-import name="Practice" …>` (a "way in"
// thumbnail, elsewhere on its canvas) whose sibling fetch fails the same way
// 004's Drone Ideas canvas's did (file:// + Chromium's Fetch API — see the
// git history for that shim); unlike 004, none of the frames this task
// captures (`data-screen-label`s "4a Auto or target", "5c Pitch spiral")
// sit inside that import, so the failure is left as harmless console noise
// rather than special-cased again.
// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 2;
const DEV_SERVER_POLL_INTERVAL_MS = 500;
const DEV_SERVER_TIMEOUT_MS = 30_000;
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

// React re-serialises every inline `style` attribute it renders (canonical
// property order, `border-radius: 18px` with the space `rustfmt`-style,
// colours as `rgb(...)`) regardless of how the vendored source wrote it —
// confirmed against the rendered DOM, not assumed — so a selector matching
// the *rendered* attribute needs that space even though the source HTML
// (readable by grep) does not have one. This is the one phone-frame div on
// a single-screen prototype page (Practice.dc.html); a multi-frame canvas
// (Tuner.dc.html) is addressed directly by each frame's own
// `data-screen-label` instead, which React leaves untouched.
const PHONE_FRAME_SELECTOR = '[style*="border-radius: 18px"]';
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
// side.
const APP_SCREENSHOT_SETTLE_MS = 500;

// support.js's `init()` does `Object.assign(window, api)`, so
// `window.__dcSetProps(name, overrides)` / `window.__dcRootName()` — the
// same bridge the design tool's own "Tweaks" panel drives the page through
// — are reachable from outside once the runtime has booted, without editing
// the vendored file: `__dcSetProps` merges `overrides` over the
// `data-props` schema's defaults and triggers a re-render (confirmed against
// the running page: `state: "cannot hear"` alone reproduces the NO MIC
// chrome and the "Can't hear" card).
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

const TUNER_READING_FRAME_SELECTOR = '[data-screen-label="4a Auto or target"]';
const TUNER_TARGET_SHEET_FRAME_SELECTOR =
  '[data-screen-label="5c Pitch spiral"]';

// Opens the target sheet (tapping the collapsed "TARGET auto · nearest"
// pill) then pins the note currently sounding — the sheet's own "Hold" card
// — the same two-tap path practice.tuner/REQ-004/S1 describes. Scoped to
// `frame` (not `page`): both texts are repeated by the file's other
// exploratory frames stacked on the same tall canvas, so an unscoped query
// would match more than one.
async function holdTargetOnPrototype(frame) {
  await frame.getByText("auto · nearest").click();
  await frame.getByText("Hold", { exact: true }).click();
}

// The app driver shared by every tuner-* state below: opens the tuner and
// waits for its own "‹ Practice" back button (TunerScreen's
// aria-label="Practice") so a later step never races the screen's mount.
// That button is drawn whether or not the microphone was granted
// (practice.tuner/REQ-007/S1: the chrome still draws without it), so this
// one driver covers tuner-cannot-hear too.
async function enterTuner(page) {
  await page.getByRole("button", { name: "Tuner" }).click();
  await page.getByRole("button", { name: "Practice", exact: true }).waitFor();
}

// Chromium's standard recipe for automating getUserMedia: the first flag
// auto-accepts the permission prompt headless would otherwise leave
// unanswered; the second guarantees a virtual input device exists
// regardless of the host's own audio hardware (confirmed silent, not a
// synthetic tone — the app still reads "Play a note" behind it), so
// `pnpm design:shots` behaves the same on a bare CI box as on a laptop with
// a real microphone. Only the app screenshots that actually listen are
// taken from a browser launched with this; tuner-cannot-hear is
// deliberately taken from the other one, so the prompt is left denied.
const APP_MEDIA_LAUNCH_ARGS = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
];

// The six states this task compares: `practice-way-in` (Practice.dc.html,
// no interaction, both sides); the tuner reading frame (4a) at three Tweaks
// states — listening, silent, cannot-hear — plus a target pinned on it by
// driving the same "Hold" path on both sides; and the target sheet (5c, its
// spiral already the frame's own baked-in state, needing no driver) against
// the app's TargetSheet opened by TARGET.
//
// Headless has no real microphone signal to feed the app, so
// tuner-listening's and tuner-silent's app screenshots are the same shot —
// there is nothing to "sweep" without an injected tone. Both are still
// written and reviewed as their own pair (against the prototype's `sweep`
// and `silent` renderings respectively) because a missing/misplaced element
// would still show up in either one; see notes.md for what that means for
// this pair specifically.
const STATES = {
  "practice-way-in": {
    prototypePath: PRACTICE_PROTOTYPE_PATH,
    prototypeFrameSelector: PHONE_FRAME_SELECTOR,
    appNeedsMic: false,
    app: async () => {
      // The app as loaded — no interaction.
    },
  },
  "tuner-listening": {
    prototypePath: TUNER_PROTOTYPE_PATH,
    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
    prototypeProps: { state: "sweep" },
    appNeedsMic: true,
    app: enterTuner,
  },
  "tuner-silent": {
    prototypePath: TUNER_PROTOTYPE_PATH,
    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
    prototypeProps: { state: "silent" },
    appNeedsMic: true,
    app: enterTuner,
  },
  "tuner-cannot-hear": {
    prototypePath: TUNER_PROTOTYPE_PATH,
    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
    prototypeProps: { state: "cannot hear" },
    appNeedsMic: false,
    app: enterTuner,
  },
  "tuner-target-pinned": {
    prototypePath: TUNER_PROTOTYPE_PATH,
    prototypeFrameSelector: TUNER_READING_FRAME_SELECTOR,
    prototypeDriver: holdTargetOnPrototype,
    appNeedsMic: true,
    app: async (page) => {
      await enterTuner(page);
      // Position 69 is A4 in theory's pitchPosition numbering (plan.md;
      // C4 = 60), the same note the prototype's Hold pins from a live
      // reading near A4.
      await page.evaluate(() => window.__session.pinTarget(69));
    },
  },
  "tuner-target-sheet": {
    prototypePath: TUNER_PROTOTYPE_PATH,
    prototypeFrameSelector: TUNER_TARGET_SHEET_FRAME_SELECTOR,
    appNeedsMic: true,
    app: async (page) => {
      await enterTuner(page);
      await page.getByRole("button", { name: "Target", exact: true }).click();
    },
  },
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

function stateNeedsMic(stateName) {
  return STATES[stateName].appNeedsMic === true;
}

// A TCP probe, not a fetch: Node's fetch rejects the dev server's
// self-signed certificate, which would read as "down".
function isDevServerUp() {
  const { port, hostname } = new URL(APP_URL);
  return new Promise((resolve) => {
    const socket = net.connect({ port: Number(port), host: hostname });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForDevServer(deadline) {
  while (Date.now() < deadline) {
    if (await isDevServerUp()) return;
    await new Promise((resolve) =>
      setTimeout(resolve, DEV_SERVER_POLL_INTERVAL_MS),
    );
  }
  throw new Error(
    `dev server did not respond at ${APP_URL} within the timeout`,
  );
}

// Starts `pnpm dev` as a detached child only when nothing is already
// serving the app, so this is safe to run alongside an already-running
// `pnpm dev` during interactive development.
async function ensureDevServer() {
  if (await isDevServerUp()) return null;
  const child = spawn("pnpm", ["dev"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
  });
  await waitForDevServer(Date.now() + DEV_SERVER_TIMEOUT_MS);
  return child;
}

function stopDevServer(child) {
  if (child === null || child.pid === undefined) return;
  // Negative pid kills the whole detached process group (the shell pnpm
  // spawns and vite underneath it), not just the immediate child.
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already gone — nothing to clean up.
  }
}

async function screenshotPrototype(browser, stateName) {
  const state = STATES[stateName];
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await fulfillGoogleFontRequests(page);
  await page.goto(pathToFileURL(state.prototypePath).href);
  // The prototype's sheets slide in over a CSS `transition` with no
  // `display:none` gating while closed (unlike the app's BottomSheet, whose
  // `display` flip makes its transition a no-op in practice — see
  // src/ui/overlay.tsx); disabling transitions guards every state driven by
  // a click (e.g. holdTargetOnPrototype's sheet open/close) against landing
  // mid-animation.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; }",
  });
  const frame = await captureFrame(page, state.prototypeFrameSelector);
  await applyPrototypeState(page, frame, state);
  // `clip` alone only crops within the current viewport, and a locator's own
  // `.screenshot()` mis-stitches an element taller than the viewport
  // (confirmed against Practice.dc.html's 863px-tall card, min-height:844,
  // under this exact page: the lower portion came back as the page's own
  // background colour instead of the card's — a Playwright/Chromium gap,
  // not a layout bug in the vendored file, which a `fullPage` render, itself
  // correct, showed). `fullPage: true` renders the whole scrollable page
  // first, the same as a human scrolling to it, and then the clip — sized to
  // the frame's own just-measured box, since the frames this task captures
  // are not all the same size (4a's 844 vs 5c's 700 vs Practice's 863) —
  // crops out just this one frame.
  //
  // `boundingBox()` is relative to the *current viewport* (it moves with
  // scroll), but a `fullPage` screenshot's `clip` is relative to the whole
  // document — the same gap a driver with no clicks (nothing to scroll to)
  // never hits, but holdTargetOnPrototype's clicks do (Playwright scrolls
  // the picked-up-on-canvas frame to the very bottom of a >2500px-tall
  // page to reach "Hold"), so the box is converted back to document space
  // with the scroll position at capture time before it's used as a clip.
  const box = await frame.boundingBox();
  const scroll = await page.evaluate(() => ({
    x: window.scrollX,
    y: window.scrollY,
  }));
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
    fullPage: true,
    clip: {
      x: box.x + scroll.x,
      y: box.y + scroll.y,
      width: box.width,
      height: box.height,
    },
  });
  await context.close();
}

async function screenshotApp(browser, stateName) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await page.goto(APP_URL);
  try {
    await STATES[stateName].app(page);
  } catch (error) {
    // A failing driver is a bug to fix, not to hide — but writing the app
    // shot with whatever rendered (instead of aborting the whole run) keeps
    // this warning, and the screenshot itself, as the evidence for that fix.
    console.warn(
      `[design-shots] ${stateName}: app driver failed — ${error.message}`,
    );
  }
  await page.waitForTimeout(APP_SCREENSHOT_SETTLE_MS);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.app.png`),
  });
  await context.close();
}

async function main() {
  const stateNames = parseStatesArgument(process.argv.slice(2));
  validateStateNames(stateNames);
  await mkdir(OUTPUT_DIR, { recursive: true });

  const devServerChild = await ensureDevServer();
  const browser = await chromium.launch();
  const micBrowser = stateNames.some(stateNeedsMic)
    ? await chromium.launch({ args: APP_MEDIA_LAUNCH_ARGS })
    : null;
  try {
    for (const stateName of stateNames) {
      await screenshotPrototype(browser, stateName);
      const appBrowser = stateNeedsMic(stateName) ? micBrowser : browser;
      await screenshotApp(appBrowser, stateName);
      console.log(`[design-shots] wrote ${stateName}.{prototype,app}.png`);
    }
  } finally {
    await browser.close();
    if (micBrowser) await micBrowser.close();
    stopDevServer(devServerChild);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
