#!/usr/bin/env node
// Measured timing budget — practice.session/REQ-008/S1 (every onset within
// ±5 ms of its schedule, drift ≤1 ms over the run) and REQ-006/S4 (the
// stave's highlight never later than 30 ms after the onset it follows).
// Playwright, headless Chromium, the real WebAudio engine (a null sink is
// fine — the AudioContext still runs in real time headless). Not part of
// `pnpm check` (~70 s); AGENTS.md requires it at every converge and finish.
//
// 003-hear-the-scale/T023 removed note length from the settings model, so
// the six configurations this test was specified against (three tempos ×
// crotchet/quaver) collapse to three: only tempo varies. Every page plays
// the REQ-002/S1 acceptance traversal — G major on the flute, ↑↓ · 2 oct ·
// scale, count-in off, loop on, sound both — chosen so the sequence runs
// continuously (loop, no rest bar, no count-in gap) for the whole window.
//
// Usage: pnpm test:timing [--seconds 60]

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const APP_URL = "http://localhost:5173";
const DEV_SERVER_POLL_INTERVAL_MS = 500;
// `predev` compiles the sound crate to WebAssembly via cargo, which can take
// a while on a cold build — generous headroom over design-shots.mjs's 30 s
// (that script never starts the dev server itself).
const DEV_SERVER_TIMEOUT_MS = 120_000;
const DEFAULT_SECONDS = 60;
// Lets the last beat's onset report and its matching highlight settle after
// the measurement window closes, so neither array is truncated mid-pair.
const COLLECTION_GRACE_MS = 300;

const TEMPOS_BPM = [40, 96, 200];

// practice.session/REQ-008, REQ-006 — the budgets this test enforces.
const MAX_ONSET_DEVIATION_MS = 5;
const MAX_DRIFT_MS = 1;
const MAX_HIGHLIGHT_LATENCY_MS = 30;

function parseSecondsArgument(argv) {
  const flagIndex = argv.indexOf("--seconds");
  if (flagIndex === -1) return DEFAULT_SECONDS;
  const value = Number(argv[flagIndex + 1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--seconds requires a positive number");
  }
  return value;
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

// `pnpm dev`'s `predev` builds the sound crate to WebAssembly via cargo,
// which is only on PATH once `~/.cargo/env` is sourced (design-shots.mjs
// never needs this — it only reads a static prototype file over `file://`).
async function ensureDevServer() {
  if (await isDevServerUp()) return null;
  const child = spawn("bash", ["-c", "source ~/.cargo/env && pnpm dev"], {
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

// Runs entirely inside the page: configuring, subscribing and collecting in
// the browser keeps every timestamp on the same real-time clocks
// (performance.now(), AudioContext) instead of crossing the Node↔browser
// boundary per event, which would add its own jitter to exactly what this
// test measures. `window.__session`/`window.__sound` are dev-only hooks
// main.tsx exposes (T016, T018).
function measureInPage({ seconds, graceMs }) {
  const sound = window.__sound;
  const session = window.__session;
  if (sound === undefined || session === undefined) {
    throw new Error("window.__sound/__session not exposed — dev build only");
  }

  const stave = document.querySelector('[data-testid="stave"]');
  if (stave === null) {
    throw new Error(
      '[data-testid="stave"] not found — is the stave view open?',
    );
  }

  function clickButtonNamed(name) {
    const button = Array.from(document.querySelectorAll("button")).find(
      (candidate) =>
        candidate.getAttribute("aria-label") === name ||
        candidate.textContent?.trim() === name,
    );
    if (button === undefined) throw new Error(`no button named "${name}"`);
    button.click();
  }

  const deviationsMs = [];
  const predictedHighlightPerfMs = [];
  // `context()`/`sampleRate()` are only meaningful once `sound.start()` has
  // run (REQ-010/S2: no AudioContext before the first ▶) — clicking "Play"
  // below is what triggers that, so both are read lazily, from inside the
  // very first callback that needs them, never before.
  let startupError = null;

  const unsubscribeOnset = sound.onOnset((report) => {
    if (startupError !== null) return;
    const context = sound.context();
    if (context === null) {
      startupError = "no AudioContext — sound failed to start";
      return;
    }
    const sampleRate = sound.sampleRate();
    // Every onset, tone and click alike — REQ-008/S1 is about every note
    // *and click*, not just the ones that move the highlight.
    deviationsMs.push(
      ((report.actualFrame - report.onsetFrame) / sampleRate) * 1000,
    );
  });

  // REQ-006/S4's highlight is driven by `TargetAdvanced`
  // (src/practice/domain/session.ts), not by "an onset happened" — the two
  // differ exactly at a loop's seam: 2 oct ↑↓ is a palindrome (the sequence
  // ends on the same note, G4, that it starts on), so the note sounding at
  // the last position of one loop and the first position of the next is
  // the *same* run index. The stave's `sounding-halo` circle is keyed by
  // note, not position, so it stays mounted continuously across that seam
  // — correctly, since the right note was already highlighted — and no DOM
  // mutation fires for it. Predicting one highlight per onset regardless
  // (as the raw `onOnset` stream would) manufactures a false "missing"
  // observation right at every loop boundary, which then misaligns every
  // pairing after it. Comparing `TargetAdvanced.note` between calls finds
  // the one beat per run where no mutation is expected, using only the
  // published `Session` interface.
  let lastNoteKey = null;
  const unsubscribeTargetAdvanced = session.onTargetAdvanced((event) => {
    const context = sound.context();
    if (context === null) return; // surfaced via startupError above
    const sampleRate = sound.sampleRate();
    const noteKey = JSON.stringify(event.note);
    if (noteKey === lastNoteKey) return;
    lastNoteKey = noteKey;
    // `atFrame` is the onset's *actual* rendered frame (REQ-008/S1 already
    // shows this equals the scheduled frame in steady state), on the same
    // `context.currentTime`-based clock `onsetFrame`/`currentFrame()` use
    // (src/sound/published/index.ts) — not `getOutputTimestamp()`'s output
    // clock, which trails it by the destination's output latency and would
    // bias every prediction by that amount.
    const perfNow = performance.now();
    const contextNow = context.currentTime;
    predictedHighlightPerfMs.push(
      perfNow + (event.atFrame / sampleRate - contextNow) * 1000,
    );
  });

  const observedHighlightPerfMs = [];
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.getAttribute("data-testid") === "sounding-halo"
        ) {
          observedHighlightPerfMs.push(performance.now());
        }
      }
    }
  });
  observer.observe(stave, { childList: true, subtree: true });

  clickButtonNamed("Play");

  return new Promise((resolve, reject) => {
    setTimeout(
      () => {
        observer.disconnect();
        unsubscribeOnset();
        unsubscribeTargetAdvanced();
        session.stop();

        try {
          if (startupError !== null) {
            throw new Error(startupError);
          }
          if (deviationsMs.length === 0) {
            throw new Error("no onset reports arrived during the window");
          }
          if (observedHighlightPerfMs.length === 0) {
            throw new Error("no sounding-halo insertions observed");
          }

          const pairedCount = Math.min(
            predictedHighlightPerfMs.length,
            observedHighlightPerfMs.length,
          );
          const highlightLatenciesMs = [];
          for (let index = 0; index < pairedCount; index += 1) {
            highlightLatenciesMs.push(
              observedHighlightPerfMs[index] - predictedHighlightPerfMs[index],
            );
          }

          resolve({
            onsetCount: deviationsMs.length,
            maxOnsetDeviationMs: Math.max(...deviationsMs.map(Math.abs)),
            driftMs: deviationsMs[deviationsMs.length - 1] - deviationsMs[0],
            highlightCount: pairedCount,
            maxHighlightLatencyMs: Math.max(...highlightLatenciesMs),
          });
        } catch (error) {
          reject(error);
        }
      },
      seconds * 1000 + graceMs,
    );
  });
}

async function measureTempo(browser, bpm, seconds) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(APP_URL);
    await page.waitForFunction(
      () => window.__session !== undefined && window.__sound !== undefined,
    );

    await page.getByRole("button", { name: "G major" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="current-key"]')?.textContent ===
        "G major",
    );
    await page.getByRole("button", { name: "stave" }).click();
    await page.waitForSelector('[data-testid="stave"]');

    await page.evaluate((bpmValue) => {
      window.__session.setTraversal({
        direction: "updown",
        octaves: { kind: "count", count: 2 },
        shape: "scale",
      });
      window.__session.setSettings({
        soundMode: "both",
        loop: true,
        countIn: false,
        restBar: false,
        tempoBpm: bpmValue,
      });
    }, bpm);

    return await page.evaluate(measureInPage, {
      seconds,
      graceMs: COLLECTION_GRACE_MS,
    });
  } finally {
    await context.close();
  }
}

function rowFailed(result) {
  return (
    result.maxOnsetDeviationMs > MAX_ONSET_DEVIATION_MS ||
    result.driftMs > MAX_DRIFT_MS ||
    result.maxHighlightLatencyMs > MAX_HIGHLIGHT_LATENCY_MS
  );
}

function formatRow(bpm, outcome) {
  if (outcome.error !== undefined) {
    return [String(bpm), "ERROR", outcome.error, "", "", "", "FAIL"];
  }
  const { result } = outcome;
  return [
    String(bpm),
    String(result.onsetCount),
    result.maxOnsetDeviationMs.toFixed(2),
    result.driftMs.toFixed(2),
    String(result.highlightCount),
    result.maxHighlightLatencyMs.toFixed(2),
    rowFailed(result) ? "FAIL" : "PASS",
  ];
}

function printTable(rows) {
  const header = [
    "bpm",
    "onsets",
    "max onset dev (ms)",
    "drift (ms)",
    "highlights",
    "max highlight (ms)",
    "status",
  ];
  const table = [header, ...rows];
  const widths = header.map((_, columnIndex) =>
    Math.max(...table.map((row) => row[columnIndex].length)),
  );
  for (const row of table) {
    console.log(
      row.map((cell, index) => cell.padEnd(widths[index])).join("  "),
    );
  }
}

async function main() {
  const seconds = parseSecondsArgument(process.argv.slice(2));

  const devServerChild = await ensureDevServer();
  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  let allPassed = true;
  try {
    const outcomes = await Promise.all(
      TEMPOS_BPM.map(async (bpm) => {
        try {
          const result = await measureTempo(browser, bpm, seconds);
          return { bpm, result };
        } catch (error) {
          return {
            bpm,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const rows = outcomes.map(({ bpm, result, error }) =>
      formatRow(bpm, { result, error }),
    );
    printTable(rows);

    allPassed = outcomes.every(
      ({ result, error }) => error === undefined && !rowFailed(result),
    );
  } finally {
    await browser.close();
    stopDevServer(devServerChild);
  }

  if (!allPassed) {
    console.error(
      `test:timing: FAIL — an onset exceeded ${MAX_ONSET_DEVIATION_MS} ms, drift exceeded ${MAX_DRIFT_MS} ms, or a highlight exceeded ${MAX_HIGHLIGHT_LATENCY_MS} ms`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `test:timing: PASS — every onset ≤${MAX_ONSET_DEVIATION_MS} ms, drift ≤${MAX_DRIFT_MS} ms, highlight ≤${MAX_HIGHLIGHT_LATENCY_MS} ms`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
