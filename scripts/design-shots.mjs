#!/usr/bin/env node
// Design-review loop (theory.circle-of-fifths delta, 002-circle-redesign):
// drives the vendored prototype and the live app to the same named UI state
// and writes paired 390x844 @2x screenshots to .sdd/design-review/, so the
// agent — and then the user — can compare fidelity side by side. Dev-only:
// not part of the test suite, not asserted against in CI (plan.md's test
// strategy keeps this judgement human-plus-agent, not a pixel-diff gate).

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
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
const BLOCKED_FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

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
    },
  },
  "gb-flat-spelling": {
    prototype: async (page) => {
      await clickPrototypeText(page, "♭");
      await clickPrototypeWedge(page, GB_POSITION_INDEX, OUTER_RING_MID_RADIUS);
    },
    app: async (page) => {
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
    prototype: async (page) => {
      await clickPrototypeText(page, "⚙");
    },
    app: async (page) => {
      await page.getByRole("button", { name: "Settings" }).click();
    },
  },
  "picker-open": {
    prototype: async (page) => {
      await clickPrototypeText(page, "Flute Concert");
    },
    app: async (page) => {
      await page.getByLabel("Instrument").click();
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

// Google Fonts is unreachable in some environments this runs in; abort those
// requests rather than fail the page load, accepting the system-font
// fallback in the shot (noted in the design-review report, not asserted on).
async function abortGoogleFontRequests(page) {
  await page.route("**/*", (route) => {
    const { hostname } = new URL(route.request().url());
    if (BLOCKED_FONT_HOSTS.includes(hostname)) return route.abort();
    return route.continue();
  });
}

async function screenshotPrototype(browser, stateName) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await abortGoogleFontRequests(page);
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
