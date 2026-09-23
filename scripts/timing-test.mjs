#!/usr/bin/env node
// Measured timing budget — practice.session/REQ-008/S1 (every onset within
// ±5 ms of its schedule, drift ≤1 ms over the run) and REQ-006/S4 (the
// stave's highlight never more than 30 ms either side of the note's audible
// onset — two-sided; T031 also prints, for information only, how the
// highlight compares to the bare scheduled onset).
// Playwright, headless Chromium, the real WebAudio engine (a null sink is
// fine — the AudioContext still runs in real time headless). Not part of
// `pnpm check` (~3 min — the three tempos run sequentially, T024-fix1, plus
// a separate pre-flight browser); AGENTS.md requires it at every converge
// and finish.
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
// How far apart a predicted highlight (from `TargetAdvanced`) and its
// observed `sounding-halo` mutation may be and still count as the same
// event, not a dropped highlight — generous next to REQ-006/S4's 30 ms
// budget so it only catches a genuine miss, not a slow-but-real pairing.
const MAX_HIGHLIGHT_PAIRING_GAP_MS = 200;

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
function measureInPage({ seconds, graceMs, pairingGapMs }) {
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

  // REQ-008/S1's "the deviation does not grow over the minute" is a trend
  // over the whole run, not an endpoint difference — the first onset of a
  // run settles by one audio quantum (an artefact of the very first render,
  // not growth) and then locks to 0, so comparing only the first and last
  // deviation misses growth that happens mid-run and reverses, or that
  // starts early (a negative slope). The least-squares slope of deviation
  // (ms) against onset time (s) across every onset captures growth over the
  // whole run wherever it happens.
  function leastSquaresSlope(xs, ys) {
    const n = xs.length;
    const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
    const meanY = ys.reduce((sum, y) => sum + y, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let index = 0; index < n; index += 1) {
      numerator += (xs[index] - meanX) * (ys[index] - meanY);
      denominator += (xs[index] - meanX) ** 2;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }

  const deviationsMs = [];
  const onsetTimesS = [];
  // Two predictions per `TargetAdvanced`, from the same `atFrame`: the
  // *audible* instant (scheduled onset + output latency) the session's
  // highlight timer is actually aimed at (T031, gated below), and the bare
  // *scheduled* onset (no latency added), printed only for information —
  // it shows roughly `+outputLatency` once the timer is authoritative,
  // rather than clustering near 0 the way the audible column does.
  const predictedAudibleHighlightPerfMs = [];
  const predictedScheduledHighlightPerfMs = [];
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
    onsetTimesS.push(report.onsetFrame / sampleRate);
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
    // `atFrame` is the tick's *scheduled* onset frame — the session's
    // highlight timer (src/practice/domain/session.ts) aims at this frame
    // plus the port's output latency, not at the worklet's rendered frame
    // (T030) — on the same `context.currentTime`-based clock
    // `onsetFrame`/`currentFrame()` use (src/sound/published/index.ts) —
    // not `getOutputTimestamp()`'s output clock, which trails it by the
    // destination's output latency and would bias every prediction by
    // that amount. `context.outputLatency` is added below for the same
    // reason the session's own timer adds it: without it the prediction
    // would be the *scheduled* onset, not the *audible* one the highlight
    // actually aims at, understating the highlight's real lateness by
    // exactly that latency.
    const perfNow = performance.now();
    const contextNow = context.currentTime;
    const scheduledPerfMs =
      perfNow + (event.atFrame / sampleRate - contextNow) * 1000;
    predictedScheduledHighlightPerfMs.push(scheduledPerfMs);
    predictedAudibleHighlightPerfMs.push(
      scheduledPerfMs + context.outputLatency * 1000,
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

          // The palindrome-seam rule above (predict only when
          // `TargetAdvanced.note` changes) means predicted and observed
          // counts must be equal in a correct run; zipping by
          // `Math.min(...)` would silently truncate a real mismatch (a
          // missing or a spurious highlight) into a shorter, misleadingly
          // clean pairing instead of failing on it.
          if (
            predictedAudibleHighlightPerfMs.length !==
            observedHighlightPerfMs.length
          ) {
            throw new Error(
              `highlights: predicted ${predictedAudibleHighlightPerfMs.length}, observed ${observedHighlightPerfMs.length}`,
            );
          }

          // vs audible (ms): observed minus the audible prediction — what
          // REQ-006/S4's ±30 ms budget gates, two-sided (T031: the timer is
          // authoritative, so this should now sit near 0 either side of
          // it). vs scheduled (ms): observed minus the bare scheduled
          // prediction (no output latency added) — informational only, not
          // gated; expected to sit near +outputLatency once the timer (not
          // the report) drives the highlight.
          const highlightLatenciesMs = [];
          const scheduledLatenciesMs = [];
          let droppedHighlightCount = 0;
          for (
            let index = 0;
            index < predictedAudibleHighlightPerfMs.length;
            index += 1
          ) {
            const latencyMs =
              observedHighlightPerfMs[index] -
              predictedAudibleHighlightPerfMs[index];
            // Equal counts alone do not prove the pairing is right — a
            // dropped highlight and a spurious one could cancel out in the
            // count while still misaligning every latency after them. A
            // real pair's observed mutation follows its predicted onset
            // closely; anything this far apart is a dropped highlight, not
            // a slow one (REQ-006/S4's own budget is 30 ms).
            if (Math.abs(latencyMs) > pairingGapMs) {
              droppedHighlightCount += 1;
              continue;
            }
            highlightLatenciesMs.push(latencyMs);
            scheduledLatenciesMs.push(
              observedHighlightPerfMs[index] -
                predictedScheduledHighlightPerfMs[index],
            );
          }
          if (droppedHighlightCount > 0) {
            throw new Error(
              `highlights: ${droppedHighlightCount} dropped (no observed partner within ${pairingGapMs} ms)`,
            );
          }

          const spanS = onsetTimesS[onsetTimesS.length - 1] - onsetTimesS[0];
          const slopeMsPerS = leastSquaresSlope(onsetTimesS, deviationsMs);

          resolve({
            onsetCount: deviationsMs.length,
            maxOnsetDeviationMs: Math.max(...deviationsMs.map(Math.abs)),
            driftMs: Math.abs(slopeMsPerS) * spanS,
            highlightCount: predictedAudibleHighlightPerfMs.length,
            maxHighlightLatencyMs: Math.max(
              ...highlightLatenciesMs.map(Math.abs),
            ),
            maxScheduledLatencyMs: Math.max(
              ...scheduledLatenciesMs.map(Math.abs),
            ),
          });
        } catch (error) {
          reject(error);
        }
      },
      seconds * 1000 + graceMs,
    );
  });
}

// Pre-flight — T024: exactly one AudioContext for the life of a session.
// Wraps `window.AudioContext` in a counting subclass before the app's own
// scripts run (`page.addInitScript`, so it is in place before `main.tsx`'s
// module-scope `new AudioContext()` call can fire), then drives four
// ▶/❚❚ cycles through the same button the app renders (its `aria-label`
// toggles between "Play" and "Stop" — practice.session's transport button,
// src/ui/TransportCard.tsx) and reads the count back. T024-fix1: runs once,
// on its own page, in its own `chromium.launch()` instance, after the three
// measurement pages below have already run and closed — a pre-flight page
// sharing Chromium with the measurement pages was found (converge, T024)
// to delay every measured onset by several ms; running it afterwards, in a
// separate browser process, removes it from the measurement path entirely.
async function preflightAudioContextCount(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      const OriginalAudioContext = window.AudioContext;
      let constructedCount = 0;
      class CountingAudioContext extends OriginalAudioContext {
        constructor(...args) {
          super(...args);
          constructedCount += 1;
        }
      }
      window.AudioContext = CountingAudioContext;
      Object.defineProperty(window, "__audioContextsConstructed", {
        get: () => constructedCount,
      });
    });

    await page.goto(APP_URL);
    await page.waitForFunction(
      () => window.__session !== undefined && window.__sound !== undefined,
    );

    for (let cycle = 0; cycle < 4; cycle += 1) {
      await page.click('button[aria-label="Play"]');
      await page.click('button[aria-label="Stop"]');
    }

    const constructedCount = await page.evaluate(
      () => window.__audioContextsConstructed,
    );
    if (constructedCount !== 1) {
      throw new Error(
        `AudioContexts constructed: ${constructedCount} (expected 1)`,
      );
    }
  } finally {
    await context.close();
  }
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
      pairingGapMs: MAX_HIGHLIGHT_PAIRING_GAP_MS,
    });
  } finally {
    await context.close();
  }
}

// REQ-006/S4's gate is two-sided (T031, |highlight − audible onset| ≤
// MAX_HIGHLIGHT_LATENCY_MS): `maxHighlightLatencyMs` is already an absolute
// value (measureInPage), so a single `>` comparison here covers both a
// highlight that lands too early and one that lands too late.
// `maxScheduledLatencyMs` (the "vs scheduled" column) is informational
// only — never gated.
function rowFailed(result) {
  return (
    result.maxOnsetDeviationMs > MAX_ONSET_DEVIATION_MS ||
    result.driftMs > MAX_DRIFT_MS ||
    result.maxHighlightLatencyMs > MAX_HIGHLIGHT_LATENCY_MS
  );
}

function formatRow(bpm, outcome) {
  if (outcome.error !== undefined) {
    return [String(bpm), "ERROR", outcome.error, "", "", "", "", "FAIL"];
  }
  const { result } = outcome;
  return [
    String(bpm),
    String(result.onsetCount),
    result.maxOnsetDeviationMs.toFixed(2),
    result.driftMs.toFixed(2),
    String(result.highlightCount),
    result.maxHighlightLatencyMs.toFixed(2),
    result.maxScheduledLatencyMs.toFixed(2),
    rowFailed(result) ? "FAIL" : "PASS",
  ];
}

function printTable(rows) {
  const header = [
    "bpm",
    "onsets",
    "max onset dev (ms)",
    "drift (ms, |slope·span|)",
    "highlights",
    "vs audible (ms)",
    "vs scheduled (ms)",
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

  // T024-fix1: three sequential ~`seconds`-long measurement pages plus a
  // separate pre-flight browser run to ~3 minutes total, up from the ~70 s
  // the parallel version took — this note says so up front so the wait is
  // expected, not mistaken for a hang.
  console.log(`measuring 3 tempos sequentially, ${seconds} s each`);

  const devServerChild = await ensureDevServer();

  let allPassed = true;
  // Anything thrown here is a harness fault, not a per-tempo measurement
  // failure (those are already caught individually below into ERROR rows)
  // — the pre-flight's own AudioContext-count check is the only thing that
  // throws through to this catch.
  let fatalError = null;
  try {
    // Sequential, one page at a time — not `Promise.all`. Running the three
    // tempos concurrently made them contend for the same CPU/audio-worklet
    // budget, swinging highlight latency 22–33 ms run to run and straddling
    // the 30 ms budget (converge finding, T024-fix1: measurement
    // contention, not the product).
    const measurementBrowser = await chromium.launch({
      headless: true,
      args: ["--autoplay-policy=no-user-gesture-required"],
    });
    const outcomes = [];
    try {
      for (const bpm of TEMPOS_BPM) {
        try {
          const result = await measureTempo(measurementBrowser, bpm, seconds);
          outcomes.push({ bpm, result });
        } catch (error) {
          outcomes.push({
            bpm,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      await measurementBrowser.close();
    }

    // The pre-flight runs last, in its own freshly-launched browser, closed
    // again before the table/summary print below — see
    // preflightAudioContextCount's own comment for why.
    const preflightBrowser = await chromium.launch({
      headless: true,
      args: ["--autoplay-policy=no-user-gesture-required"],
    });
    try {
      await preflightAudioContextCount(preflightBrowser);
      console.log(
        "pre-flight: AudioContexts constructed: 1 (expected 1) — PASS",
      );
    } finally {
      await preflightBrowser.close();
    }

    const rows = outcomes.map(({ bpm, result, error }) =>
      formatRow(bpm, { result, error }),
    );
    printTable(rows);

    allPassed = outcomes.every(
      ({ result, error }) => error === undefined && !rowFailed(result),
    );
  } catch (error) {
    fatalError = error;
  } finally {
    stopDevServer(devServerChild);
  }

  if (fatalError !== null) {
    console.error(
      `test:timing: FAIL — ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (!allPassed) {
    console.error(
      `test:timing: FAIL — an onset exceeded ${MAX_ONSET_DEVIATION_MS} ms, drift (|slope·span|) exceeded ${MAX_DRIFT_MS} ms, or |highlight − audible onset| exceeded ${MAX_HIGHLIGHT_LATENCY_MS} ms`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `test:timing: PASS — every onset ≤${MAX_ONSET_DEVIATION_MS} ms, drift (|slope·span|) ≤${MAX_DRIFT_MS} ms, |highlight − audible onset| ≤${MAX_HIGHLIGHT_LATENCY_MS} ms`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
