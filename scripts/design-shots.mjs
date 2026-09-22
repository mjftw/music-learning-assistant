#!/usr/bin/env node
// Design-review loop: drives the vendored prototype and the live app to the
// same named UI state and writes paired 390x844 @2x screenshots to
// .sdd/design-review/, so the agent — and then the user — can compare
// fidelity side by side. Originated for the 002-circle-redesign delta;
// PROTOTYPE_PATH and STATES now point at 003-hear-the-scale's prototype and
// its states. Dev-only: not part of the test suite, not asserted against in
// CI (each change's plan.md keeps this judgement human-plus-agent, not a
// pixel-diff gate).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(REPO_ROOT, ".sdd", "design-review");
const PROTOTYPE_PATH = path.join(
  REPO_ROOT,
  "changes",
  "003-hear-the-scale",
  "design",
  "hear-the-scale.dc.html",
);
const APP_URL = "http://localhost:5173";
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

// Mirrors the geometry constants in the prototype's own script (the .dc.html
// has no build step to import them from) so wedge clicks land correctly
// without depending on an accessible name the prototype's SVG paths don't
// carry — they are bare <path> elements wired with onClick, nothing more.
// (003-hear-the-scale's prototype keeps the same CX/CY/OUTER as
// 002-circle-redesign's — verified against its script, not assumed.)
const CIRCLE_CENTRE = { x: 189, y: 189 };
const OUTER_RING_MID_RADIUS = 121; // (100 + 142) / 2 — see OUTER in the prototype

function pointOnPrototypeCircle(angleDegrees, radius) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: CIRCLE_CENTRE.x + radius * Math.cos(angleRadians),
    y: CIRCLE_CENTRE.y + radius * Math.sin(angleRadians),
  };
}

// Position indices from the prototype's MAJORS array: index 0 is C, at the
// clock's 12 o'clock (0°) position; index 1 is G. Only the major ring is
// driven by the states below, so only these two are needed.
const C_MAJOR_POSITION_INDEX = 0;
const G_MAJOR_POSITION_INDEX = 1;

async function clickPrototypeWedge(page, positionIndex, radius) {
  const point = pointOnPrototypeCircle(positionIndex * 30, radius);
  await page
    .locator('svg[aria-label="Circle of fifths"]')
    .click({ position: point });
}

async function clickPrototypeText(page, text) {
  // The runtime wraps each interpolated value in its own <span>, so an
  // exact-text locator matches both that span and the element it renders
  // inside — `.first()` picks the innermost, and the click still reaches
  // the ancestor's onClick handler by bubbling.
  await page.getByText(text, { exact: true }).first().click();
}

// The prototype's own hard-coded initial state (script's `state = {...}`:
// `sel: 1` [G, the major ring], `panel: "stave"`) is an author-time leftover
// in the vendored .dc.html, not the product's actual first-run default
// (practice.session/REQ-011, theory.circle-of-fifths/REQ-008/S2: C major,
// names view). Every state below drives the prototype to its target
// explicitly rather than relying on that leftover default — this helper is
// the shared "C major, names view" baseline the sheet/drawer states open on
// top of; idle-g-major-stave is the one state where the target *is* close to
// the leftover default, and still corrects to it explicitly (harmless no-op
// on `sel`/`panel` if the leftover ever changes) so nothing here depends on
// an unstated coincidence.
async function baselineCMajorNamesOnPrototype(page) {
  await clickPrototypeWedge(
    page,
    C_MAJOR_POSITION_INDEX,
    OUTER_RING_MID_RADIUS,
  );
  await clickPrototypeText(page, "names");
}

// One driver per named state, one function per target — the prototype and
// the app render the same state through different DOM shapes. The app side
// needs no correction for the C-major/names baseline: that is its actual
// first-run default (verified against selection-store.ts's
// `firstRunDefaults`), so a no-op driver reproduces it exactly rather than
// happening to match.
const STATES = {
  "idle-g-major-stave": {
    prototype: async (page) => {
      await clickPrototypeWedge(
        page,
        G_MAJOR_POSITION_INDEX,
        OUTER_RING_MID_RADIUS,
      );
      await clickPrototypeText(page, "stave");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "G major" }).click();
      await page.getByRole("button", { name: "stave" }).click();
    },
  },
  "traversal-sheet-open": {
    prototype: async (page) => {
      await baselineCMajorNamesOnPrototype(page);
      await clickPrototypeText(page, "edit ›");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Edit traversal" }).click();
    },
  },
  "tempo-sheet-open": {
    prototype: async (page) => {
      await baselineCMajorNamesOnPrototype(page);
      // The tempo-term button beside the stepper (script's `openTempo`) —
      // its text is the current term, "Andante" at the 96 bpm default.
      await clickPrototypeText(page, "Andante");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Andante" }).click();
    },
  },
  "names-idle": {
    prototype: async (page) => {
      await baselineCMajorNamesOnPrototype(page);
    },
    app: async () => {},
  },
  "settings-open": {
    prototype: async (page) => {
      await baselineCMajorNamesOnPrototype(page);
      await clickPrototypeText(page, "⚙");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Settings" }).click();
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

async function isDevServerUp() {
  try {
    const response = await fetch(APP_URL);
    return response.ok;
  } catch {
    return false;
  }
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

async function screenshotPrototype(browser, stateName) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await fulfillGoogleFontRequests(page);
  await page.goto(pathToFileURL(PROTOTYPE_PATH).href);
  await page.locator('svg[aria-label="Circle of fifths"]').waitFor();
  // The prototype's sheets/drawer slide in over a 340ms CSS `transition`
  // with no `display:none` gating while closed (unlike the app's
  // BottomSheet, whose `display` flip makes its transition a no-op in
  // practice — see src/ui/overlay.tsx) — so a screenshot taken right after
  // opening one would otherwise catch it mid-slide. Disabling transitions
  // makes every transform apply on the same tick as the click that sets it.
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; }",
  });
  await STATES[stateName].prototype(page);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${stateName}.prototype.png`),
  });
  await context.close();
}

async function screenshotApp(browser, stateName) {
  const context = await browser.newContext({
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
