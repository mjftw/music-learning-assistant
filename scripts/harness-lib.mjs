// Microphone-feeding harness helpers, extracted from tuner-timing-test.mjs
// (C008_T018 — a pure move, behaviour unchanged). Shared by the measured
// Playwright harnesses that feed the microphone from the page's own
// AudioContext: the dev-server lifecycle, the getUserMedia override, the
// note/position helpers and the small aggregation/printing helpers.

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
export const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const DEV_SERVER_POLL_INTERVAL_MS = 500;
// `predev` compiles both crates to WebAssembly via cargo, which can take a
// while on a cold build — same headroom timing-test.mjs gives it.
const DEV_SERVER_TIMEOUT_MS = 120_000;

// The sweep's default range — every semitone E2 (theory's pitchPosition 40)
// to C7 (position 96).
const TUNER_LOWEST_POSITION = 40;
const TUNER_HIGHEST_POSITION = 96;

export function positionsE2ToC7() {
  const positions = [];
  for (
    let position = TUNER_LOWEST_POSITION;
    position <= TUNER_HIGHEST_POSITION;
    position += 1
  ) {
    positions.push(position);
  }
  return positions;
}

// theory/domain/notes.ts's noteAtPosition + labels.ts's noteLabel, sharp
// spelling only, duplicated here — this script is plain Node ESM with no
// TS/bundler step (as trueHzOfPosition, in tuner-timing-test.mjs, already
// duplicates temperament's formula) — and used both in-page, to identify a
// mutation as this tone's own reading (armReadoutTracking), and here, to
// attribute a sweep's worst tone in the printed table. The fresh browser
// context this harness launches has no stored selection, so the app's
// default spelling (firstRunDefaults, selection-store.ts) applies
// throughout.
const SHARP_PITCH_CLASS_LABELS = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];

export function noteLabelOfPosition(position) {
  const pitchClass = ((position % 12) + 12) % 12;
  const octave = Math.floor(position / 12) - 1;
  return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
}

// A TCP probe, not a fetch: Node's fetch rejects the dev server's
// self-signed certificate, which would read as "down" (timing-test.mjs).
export function isDevServerUp() {
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

export async function waitForDevServer(deadline) {
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

// `pnpm dev`'s `predev` builds both crates to WebAssembly via cargo, which
// is only on PATH once `~/.cargo/env` is sourced.
export async function ensureDevServer() {
  if (await isDevServerUp()) return null;
  const child = spawn("bash", ["-c", "source ~/.cargo/env && pnpm dev"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
  });
  await waitForDevServer(Date.now() + DEV_SERVER_TIMEOUT_MS);
  return child;
}

export function stopDevServer(child) {
  if (child === null || child.pid === undefined) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // Already gone — nothing to clean up.
  }
}

// Runs in the page, before any of the app's own scripts (`page.addInitScript`)
// — replaces `getUserMedia` with a function that hands back the *output* of
// a `MediaStreamAudioDestinationNode` on the app's own AudioContext, so the
// harness can feed known tones in as if they were the microphone. The
// tuner creates its AudioContext lazily, inside `listening.start()`, before
// this ever runs (webAudioListening's own `start()` calls `createContext()`
// then `create(audioContext)`, and `create` — `createListener` — awaits
// `getUserMedia` only after the worklet module has already been added on
// that context) — so `window.__listening.context()` is non-null by the
// time this function is called; if it were not, that is a harness fault,
// not a silent no-op.
export function installMicrophoneOverride() {
  navigator.mediaDevices.getUserMedia = async () => {
    const listening = window.__listening;
    if (listening === undefined) {
      throw new Error("window.__listening not exposed — is this a dev build?");
    }
    const context = listening.context();
    if (context === null) {
      throw new Error(
        "window.__listening.context() is null — the tuner has not created its AudioContext yet",
      );
    }
    const destination = context.createMediaStreamDestination();
    window.__micDestination = destination;
    return destination.stream;
  };
}

export function maxOf(values) {
  if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
  return Math.max(...values);
}

export function minOf(values) {
  if (values.some((value) => value === null)) return Number.NEGATIVE_INFINITY;
  return Math.min(...values);
}

export function paintAgeMaxOf(values) {
  const present = values.filter((value) => value !== null);
  return present.length > 0 ? Math.max(...present) : null;
}

export function printTable(rows) {
  const header = [
    "case",
    "tones",
    "first readout max (ms)",
    "arrival age max (ms)",
    "paint age max (ms)",
    "readings/s min",
    "cents err max",
    "shown err max",
    "status",
  ];
  const table = [header, ...rows.map((row) => row.cells)];
  const widths = header.map((_, columnIndex) =>
    Math.max(...table.map((row) => row[columnIndex].length)),
  );
  for (const row of table) {
    console.log(
      row.map((cell, index) => cell.padEnd(widths[index])).join("  "),
    );
  }
}
