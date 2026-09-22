#!/usr/bin/env node
// Design-review loop (theory.circle-of-fifths delta, 002-circle-redesign):
// drives the vendored prototype and the live app to the same named UI state
// and writes paired 390x844 @2x screenshots to .sdd/design-review/, so the
// agent — and then the user — can compare fidelity side by side. Dev-only:
// not part of the test suite, not asserted against in CI (plan.md's test
// strategy keeps this judgement human-plus-agent, not a pixel-diff gate).

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
  "002-circle-redesign",
  "design",
  "Circle 1c Function Paper.dc.html",
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
const CIRCLE_CENTRE = { x: 189, y: 189 };
const OUTER_RING_MID_RADIUS = 121; // (100 + 142) / 2 — see OUTER in the prototype
const INNER_RING_MID_RADIUS = 86; // (72 + 100) / 2 — see INNER in the prototype

function pointOnPrototypeCircle(angleDegrees, radius) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: CIRCLE_CENTRE.x + radius * Math.cos(angleRadians),
    y: CIRCLE_CENTRE.y + radius * Math.sin(angleRadians),
  };
}

// Position indices from the prototype's MAJORS/MINORS arrays: index 0 is
// C, at the clock's 12 o'clock (0°) position; index 1 is G (major ring) /
// E (minor ring); index 6 is the flat-preference F♯/G♭ wedge, at 6 o'clock
// (180°).
const C_MAJOR_POSITION_INDEX = 0;
const G_MAJOR_POSITION_INDEX = 1;
const E_MINOR_POSITION_INDEX = 1;
const GB_POSITION_INDEX = 6;

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

// One driver per named state, one function per target — the prototype and
// the app render the same state through different DOM shapes, and the app
// side is best-effort: the redesigned UI (names/stave switch, settings
// drawer, instrument sheet) hasn't landed yet, so its drivers reach for
// controls that already exist on today's 001 UI where they can.
const STATES = {
  "c-major-names": {
    // The prototype's own hard-coded initial state (sel: 1) renders G
    // major — an author-time leftover in the vendored .dc.html, not the
    // product's actual first-run default (REQ-008: C major). Click the C
    // major wedge explicitly so this pair compares the same state; the app
    // side already defaults to C major and needs no action.
    prototype: async (page) => {
      await clickPrototypeWedge(
        page,
        C_MAJOR_POSITION_INDEX,
        OUTER_RING_MID_RADIUS,
      );
    },
    app: async () => {},
  },
  "g-major-stave-full": {
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
  "gb-flat-spelling": {
    prototype: async (page) => {
      await clickPrototypeText(page, "♭");
      await clickPrototypeWedge(page, GB_POSITION_INDEX, OUTER_RING_MID_RADIUS);
    },
    app: async (page) => {
      await page.getByRole("button", { name: "flat" }).click();
      await page.getByRole("button", { name: "G♭ major" }).click();
    },
  },
  "e-minor": {
    prototype: async (page) => {
      await clickPrototypeWedge(
        page,
        E_MINOR_POSITION_INDEX,
        INNER_RING_MID_RADIUS,
      );
    },
    app: async (page) => {
      await page.getByRole("button", { name: "E minor" }).click();
    },
  },
  "settings-open": {
    // Same C-major correction as c-major-names above — without it this pair
    // would compare the settings drawer over two different keys (the
    // prototype's leftover G major behind it vs. the app's real C major
    // default), which is no comparison of the drawer at all.
    prototype: async (page) => {
      await clickPrototypeWedge(
        page,
        C_MAJOR_POSITION_INDEX,
        OUTER_RING_MID_RADIUS,
      );
      await clickPrototypeText(page, "⚙");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Settings" }).click();
    },
  },
  "picker-open": {
    // Same C-major correction as c-major-names above (see settings-open).
    prototype: async (page) => {
      await clickPrototypeWedge(
        page,
        C_MAJOR_POSITION_INDEX,
        OUTER_RING_MID_RADIUS,
      );
      await clickPrototypeText(page, "Flute Concert");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Instrument" }).click();
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
    // The redesigned UI hasn't landed yet — write the app shot with
    // whatever rendered rather than failing the whole run (T002 step 4).
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
