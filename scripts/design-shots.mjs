#!/usr/bin/env node
// Design-review loop: drives the vendored prototype and the live app to the
// same named UI state and writes paired 390x844 @2x screenshots to
// .sdd/design-review/, so the agent — and then the user — can compare
// fidelity side by side. Originated for the 002-circle-redesign delta;
// PROTOTYPE_PATH and STATES pointed at 003-hear-the-scale's prototype and
// its states, then at 005-scale-selection's, then at 004-the-drone's.
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
const PROTOTYPE_PATH = path.join(
  REPO_ROOT,
  "changes",
  "004-the-drone",
  "design",
  "Drone Ideas.dc.html",
);
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

// The Ideas canvas is a page of several frames, each a
// `<dc-import name="Drone" …>` — the design tool's runtime (support.js)
// resolves that sibling component with `fetch("./Drone.dc.html")`
// (`ensureFetched`) the first time any frame needs it. Chromium's Fetch API
// rejects the `file:` scheme outright (unlike navigation or a
// `<script src>`, which both work for it), so on the file:// URL this
// prototype loads from, that fetch throws and every `dc-import` renders an
// empty placeholder forever — confirmed against the live page, not assumed.
// `window.__resourceBlobs` is the runtime's own escape hatch for exactly
// this case (support.js's `bundledBlob`): a same-named Blob found there is
// read with `.text()` instead of being fetched, so seeding it before the
// runtime's first script runs (`addInitScript`) with the component's real
// source makes every `dc-import` on the page resolve normally.
const DRONE_COMPONENT_NAME = "Drone"; // the dc-import's `name` attribute
const DRONE_COMPONENT_PATH = path.join(
  path.dirname(PROTOTYPE_PATH),
  `${DRONE_COMPONENT_NAME}.dc.html`,
);

async function fulfillSiblingComponentFetch(page) {
  const source = await readFile(DRONE_COMPONENT_PATH, "utf8");
  await page.addInitScript(
    ({ url, source: componentSource }) => {
      window.__resourceBlobs = {
        [url]: new Blob([componentSource], { type: "text/html" }),
      };
    },
    { url: `./${DRONE_COMPONENT_NAME}.dc.html`, source },
  );
}

// The rendered "Drone" component's own outer shell — Drone.dc.html's
// `<div style="position:relative;width:390px;min-height:844px;…;
// border-radius:18px">` — is the only element anywhere in that file with
// this radius (verified by grep, not assumed), so this substring match
// finds exactly one element per frame without needing a class or id the
// design doesn't carry.
const PHONE_FRAME_SELECTOR_SUFFIX = '[style*="border-radius: 18px"]';
const FRAME_RENDER_TIMEOUT_MS = 10_000;
const FRAME_RENDER_POLL_INTERVAL_MS = 100;

// Waits for the `dc-import` inside `selector` (e.g. `[id="3a"]` — ids that
// start with a digit, like the Ideas page's frame ids, aren't valid `#…`
// CSS selectors) to render: the sibling fetch above resolves asynchronously,
// so this polls rather than trusting the first paint after navigation.
// "Rendered" is the same thing a human would check before trusting the
// screenshot — a non-zero box, and the pill's own glyph (▶ off, ■ sounding)
// actually present, not a placeholder — and returns that box for the caller
// to clip a screenshot to.
async function captureFrame(page, selector) {
  const frame = page.locator(`${selector} ${PHONE_FRAME_SELECTOR_SUFFIX}`);
  const pillGlyph = frame.getByText(/[▶■]/);
  const deadline = Date.now() + FRAME_RENDER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const box = await frame.boundingBox();
    if (
      box &&
      box.width > 0 &&
      box.height > 0 &&
      (await pillGlyph.count()) > 0
    ) {
      return box;
    }
    await page.waitForTimeout(FRAME_RENDER_POLL_INTERVAL_MS);
  }
  throw new Error(
    `${selector}: the dc-import frame never rendered (no non-zero box with the pill's glyph within ${FRAME_RENDER_TIMEOUT_MS}ms)`,
  );
}

// The Ideas page bakes each frame's target state into the dc-import's own
// props (`drone-on="{{ true }}"` on 3a, `sheet-open="{{ true }}"` on 4a) —
// so, unlike the wedge-clicking states this replaces, the prototype side
// needs no driver at all, just the frame to capture. The app side still
// drives through the same accessible names the scenario tests use
// (tests/ui/scenarios/app-drone.test.tsx, drone-pill.test.tsx,
// drone-sheet.test.tsx): G major first on both states, since the frames
// show G major and the app's own first-run default is C major — selecting
// it makes the pair compare like with like.
const STATES = {
  "drone-on-3a": {
    prototypeFrameSelector: '[id="3a"]',
    app: async (page) => {
      await page.getByRole("button", { name: "G major" }).click();
      await page.getByRole("button", { name: "Start drone" }).click();
    },
  },
  "drone-sheet-4a": {
    prototypeFrameSelector: '[id="4a"]',
    app: async (page) => {
      await page.getByRole("button", { name: "G major" }).click();
      await page.getByRole("button", { name: "Edit drone" }).click();
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
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await fulfillGoogleFontRequests(page);
  await fulfillSiblingComponentFetch(page);
  await page.goto(pathToFileURL(PROTOTYPE_PATH).href);
  // The prototype's sheets slide in over a CSS `transition` with no
  // `display:none` gating while closed (unlike the app's BottomSheet, whose
  // `display` flip makes its transition a no-op in practice — see
  // src/ui/overlay.tsx). 3a and 4a set their props from the very first
  // render, so there is no click to land mid-animation after, but disabling
  // transitions still guards anything else still mid-flight on first paint
  // (e.g. the sheet's on/off switch knob).
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; }",
  });
  const box = await captureFrame(
    page,
    STATES[stateName].prototypeFrameSelector,
  );
  // `clip` alone only crops within the current viewport; the Ideas canvas
  // stacks several frames on one page, so the one being captured usually
  // sits well below the first 844px — `fullPage` renders the whole
  // scrollable page first, the same as a human scrolling to it, and then
  // the clip crops out just this frame's own 390x844.
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
    fullPage: true,
    clip: {
      x: box.x,
      y: box.y,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
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
  try {
    for (const stateName of stateNames) {
      await screenshotPrototype(browser, stateName);
      await screenshotApp(browser, stateName);
      console.log(`[design-shots] wrote ${stateName}.{prototype,app}.png`);
    }
  } finally {
    await browser.close();
    stopDevServer(devServerChild);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
