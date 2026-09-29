#!/usr/bin/env node
// Measured tuner budget — listening.pitch-detection/REQ-002/S5 (every
// semitone E2–C7, a sine and a flute-like tone, within ±2 ¢),
// listening.pitch-detection/REQ-003/S1 (silence publishes nothing),
// listening.pitch-detection/REQ-003/S2 (white noise publishes nothing),
// listening.pitch-detection/REQ-004/S1 (≥20 readings/s while steady),
// listening.pitch-detection/REQ-004/S2 (the first PitchDetected's atFrame
// within 100 ms of onset), practice.tuner/REQ-006/S1 (the shown reading
// within the same 100 ms budget), and practice.tuner/REQ-002/S9 (the
// shown offset settles within ±2 ¢, half a second into each tone) — plus
// the 56 ¢ hand-over glissando (practice.tuner/REQ-002/S4, live).
//
// Playwright, headless Chromium. The microphone is replaced by an
// oscillator inside the page's own AudioContext (feeding the microphone
// from the page's own AudioContext) so every onset frame is known exactly
// — see installMicrophoneOverride below. Not part of `pnpm check`;
// AGENTS.md requires it at every converge and finish from 007-hear-me.
//
// Usage: pnpm test:tuner
// (against dev:phone's HTTPS server: APP_URL=https://localhost:5173 pnpm test:tuner)

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
// `pnpm dev` is plain HTTP on localhost (a secure context already). If a
// `pnpm dev:phone` (HTTPS) server holds the port instead, run with
// APP_URL=https://localhost:5173 — the contexts ignore its self-signed cert.
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const DEV_SERVER_POLL_INTERVAL_MS = 500;
// `predev` compiles both crates to WebAssembly via cargo, which can take a
// while on a cold build — same headroom timing-test.mjs gives it.
const DEV_SERVER_TIMEOUT_MS = 120_000;

// practice.tuner/REQ-006, listening.pitch-detection/REQ-004 — the budgets
// this harness gates.
const FIRST_READOUT_MAX_MS = 100;
const ARRIVAL_AGE_MAX_MS = 100;
const READINGS_PER_SECOND_MIN = 20;
const CENTS_ERROR_MAX_CENTS = 2;
// practice.tuner/REQ-002/S9 — the shown offset (NoteJudged.target +
// .cents, what the learner actually sees) is read from this point into
// each steady tone onward, and must sit within this many cents of the
// tone fed.
const SHOWN_SETTLE_MS = 500;
const SHOWN_CENTS_ERROR_MAX_CENTS = 2;
// practice.tuner/REQ-002/S4 — the shown note holds until the detected
// pitch is this far from it.
const HANDOVER_CENTS = 56;

// The sweep — every semitone E2 (theory's pitchPosition 40) to C7
// (position 96), one row for a sine, one for a flute-like tone (six
// falling-amplitude harmonics, the plan's Data model).
const TUNER_LOWEST_POSITION = 40;
const TUNER_HIGHEST_POSITION = 96;
const REFERENCE_A4_HZ = 440;
const REFERENCE_A4_POSITION = 69;
const TONE_SECONDS = 1.0;
// Wide enough that the previous tone's own trailing "Play a note" clear
// cannot straddle this tone's onset: TUNER_GAP_MS (session.ts, 300 ms,
// re-armed on every PitchDetected) plus the detector's 2048-frame window
// (~43 ms @ 48 kHz — a tone's trailing analysis can keep re-arming the gap
// timer for that long after `osc.stop()`) plus margin.
const PREROLL_SECONDS = 0.6;
// The "steady middle" a readings/s count is taken over, and the point
// after which a reading's cents error is gated (the plan's mechanics).
const STEADY_START_FRACTION = 0.2;
const STEADY_END_FRACTION = 0.9;
const CENTS_SKIP_MS = 60;

const HANDOVER_SECONDS = 6;
const HANDOVER_START_HZ = 440; // A4
const HANDOVER_END_HZ = 470; // ~A♯4, ramped through the 56 ¢ crossing

const SILENCE_SECONDS = 2;
const NOISE_SECONDS = 2;

function positionsE2ToC7() {
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
// TS/bundler step (as trueHzOfPosition, below, already duplicates
// temperament's formula) — and used both in-page, to identify a mutation as
// this tone's own reading (armReadoutTracking), and here, to attribute a
// sweep's worst tone in the printed table. The fresh browser context this
// harness launches has no stored selection, so the app's default spelling
// (firstRunDefaults, selection-store.ts) applies throughout.
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

function noteLabelOfPosition(position) {
  const pitchClass = ((position % 12) + 12) % 12;
  const octave = Math.floor(position / 12) - 1;
  return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
}

// A TCP probe, not a fetch: Node's fetch rejects the dev server's
// self-signed certificate, which would read as "down" (timing-test.mjs).
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

// `pnpm dev`'s `predev` builds both crates to WebAssembly via cargo, which
// is only on PATH once `~/.cargo/env` is sourced.
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
function installMicrophoneOverride() {
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

// Everything below runs inside the page via a single `page.evaluate` call —
// every timestamp (onset, mutation, PitchDetected, NoteJudged, paint) stays
// on the page's own performance.now()/AudioContext clocks, exactly as
// timing-test.mjs's measureInPage does, so no Node↔browser round trip adds
// jitter to what is measured.
function measureInPage(params) {
  const {
    positions,
    toneSeconds,
    prerollSeconds,
    steadyStartFraction,
    steadyEndFraction,
    centsSkipMs,
    shownSettleMs,
    handoverSeconds,
    handoverStartHz,
    handoverEndHz,
    silenceSeconds,
    noiseSeconds,
    referenceA4Hz,
    referenceA4Position,
  } = params;

  const listening = window.__listening;
  const noteJudgedSubscribe = window.__noteJudged;
  if (listening === undefined || noteJudgedSubscribe === undefined) {
    throw new Error(
      "window.__listening/__noteJudged not exposed — dev build only",
    );
  }
  const readingEl = document.querySelector('[data-testid="tuner-reading"]');
  if (readingEl === null) {
    throw new Error(
      '[data-testid="tuner-reading"] not found — is the tuner screen open?',
    );
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function trueHzOfPosition(position) {
    return referenceA4Hz * 2 ** ((position - referenceA4Position) / 12);
  }

  // theory/domain/notes.ts's noteAtPosition + labels.ts's noteLabel, sharp
  // spelling only — duplicated in-page (the browser realm can't reach the
  // Node-scope copy of the same function above; page.evaluate serialises
  // only this function's own body). The fresh browser context this harness
  // launches has no stored selection, so the app's default spelling
  // (firstRunDefaults, selection-store.ts) applies.
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

  function noteLabelOfPosition(position) {
    const pitchClass = ((position % 12) + 12) % 12;
    const octave = Math.floor(position / 12) - 1;
    return `${SHARP_PITCH_CLASS_LABELS[pitchClass]}${octave}`;
  }

  // theory/domain/notes.ts's pitchPosition, duplicated in-page for the
  // same reason as noteLabelOfPosition above — practice.tuner/REQ-002/S9
  // needs the semitone position of a NoteJudged event's `target` (a
  // theory Note: letter, accidental, octave), and this script has no
  // bundler step to import the published function through.
  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACCIDENTAL_OFFSET = {
    doubleFlat: -2,
    flat: -1,
    natural: 0,
    sharp: 1,
    doubleSharp: 2,
  };

  function positionOfNote(note) {
    return (
      12 * (note.octave + 1) +
      LETTER_SEMITONE[note.letter] +
      ACCIDENTAL_OFFSET[note.accidental]
    );
  }

  // First mutation of the reading's subtree, at or after `onsetPerfMs`, that
  // shows *this tone's own* reading — a name is present
  // ([data-testid="tuner-name"], not [data-testid="tuner-empty"]) and its
  // text (stripped of whitespace) equals `expectedLabel`. Without the label
  // check, the *previous* tone's own trailing "Play a note" clear — also a
  // mutation of this subtree — can land after this tone's onset (its
  // trailing analysis can keep the previous tone's gap timer re-armed for
  // up to ~43 ms past `osc.stop()`, and PREROLL_SECONDS gives only the
  // 300 ms TUNER_GAP_MS plus that margin before the next onset) and get
  // mistaken for this tone's first readout.
  function armReadoutTracking(onsetPerfMs, expectedLabel) {
    let firstReadoutMs = null;
    const observer = new MutationObserver(() => {
      if (firstReadoutMs !== null) return;
      const now = performance.now();
      if (now < onsetPerfMs) return;
      const nameEl = readingEl.querySelector('[data-testid="tuner-name"]');
      const emptyEl = readingEl.querySelector('[data-testid="tuner-empty"]');
      if (nameEl === null || emptyEl !== null) return;
      const label = nameEl.textContent.replace(/\s+/g, "");
      if (label !== expectedLabel) return;
      firstReadoutMs = now - onsetPerfMs;
    });
    observer.observe(readingEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    return {
      disconnect: () => observer.disconnect(),
      value: () => firstReadoutMs,
    };
  }

  // The first PitchDetected whose `atFrame` is at or after the tone's own
  // onset frame — listening.pitch-detection/REQ-004/S2.
  function armArrivalTracking(onsetFrame, sampleRate) {
    let arrivalAgeMs = null;
    const unsubscribe = listening.onPitch((pitch) => {
      if (arrivalAgeMs !== null) return;
      if (pitch.atFrame < onsetFrame) return;
      arrivalAgeMs = ((pitch.atFrame - onsetFrame) / sampleRate) * 1000;
    });
    return { disconnect: unsubscribe, value: () => arrivalAgeMs };
  }

  // window.__paintAgesMs (T019) grows for the life of the page; the worst
  // age pushed since `beforeLength` is this tone's paint age (printed,
  // never gated).
  function paintAgeSince(beforeLength) {
    const during = (window.__paintAgesMs ?? []).slice(beforeLength);
    return during.length > 0 ? Math.max(...during) : null;
  }

  function connectOscillator(context, destination, waveform, hz) {
    const gain = context.createGain();
    gain.gain.value = 0.5; // moderate, so the detector's clarity is high
    gain.connect(destination);
    const osc = context.createOscillator();
    if (waveform === "sine") {
      osc.type = "sine";
    } else {
      const real = new Float32Array([0, 1, 0.6, 0.35, 0.2, 0.1, 0.05]);
      const imag = new Float32Array(real.length);
      osc.setPeriodicWave(context.createPeriodicWave(real, imag));
    }
    osc.frequency.value = hz;
    osc.connect(gain);
    return { osc, gain };
  }

  // One 1 s tone (sine or flute-like) at `hz`, `prerollSeconds` from now.
  async function measureTone({ context, destination, waveform, hz, position }) {
    const sampleRate = listening.sampleRate();
    const { osc, gain } = connectOscillator(context, destination, waveform, hz);

    const t0 = context.currentTime + prerollSeconds;
    const onsetFrame = Math.round(t0 * sampleRate);
    const onsetPerfMs = performance.now() + (t0 - context.currentTime) * 1000;
    const steadyStartMs =
      onsetPerfMs + steadyStartFraction * toneSeconds * 1000;
    const steadyEndMs = onsetPerfMs + steadyEndFraction * toneSeconds * 1000;

    const readout = armReadoutTracking(
      onsetPerfMs,
      noteLabelOfPosition(position),
    );
    const arrival = armArrivalTracking(onsetFrame, sampleRate);

    let steadyCount = 0;
    let maxCentsErr = 0;
    let maxShownCentsErr = 0;
    // converge round 1 (W4) — the cents-error and shown-offset gates below
    // started each tone's worst-case at 0 and never checked that a
    // qualifying reading actually arrived, so a regression that silenced
    // readings after the settle point could pass silently. These count the
    // readings each gate actually saw; sweepRow requires both non-zero.
    let centsErrReadings = 0;
    let shownErrReadings = 0;
    const unsubscribeJudged = noteJudgedSubscribe((event) => {
      const now = performance.now();
      if (now >= steadyStartMs && now < steadyEndMs) steadyCount += 1;
      if (now - onsetPerfMs >= centsSkipMs) {
        centsErrReadings += 1;
        const err = Math.abs(1200 * Math.log2(event.heard.hz / hz));
        if (err > maxCentsErr) maxCentsErr = err;
      }
      // practice.tuner/REQ-002/S9 — the shown offset (what the learner
      // sees: NoteJudged.target + .cents), read from SHOWN_SETTLE_MS into
      // the tone onward, against the tone actually fed.
      if (now - onsetPerfMs >= shownSettleMs) {
        shownErrReadings += 1;
        const shownErr = Math.abs(
          (positionOfNote(event.target) - position) * 100 + event.cents,
        );
        if (shownErr > maxShownCentsErr) maxShownCentsErr = shownErr;
      }
    });

    const paintAgesBefore = (window.__paintAgesMs ?? []).length;

    osc.start(t0);
    osc.stop(t0 + toneSeconds);
    await sleep((prerollSeconds + toneSeconds) * 1000);

    readout.disconnect();
    arrival.disconnect();
    unsubscribeJudged();
    osc.disconnect();
    gain.disconnect();

    return {
      position,
      firstReadoutMs: readout.value(),
      arrivalAgeMs: arrival.value(),
      maxPaintAgeMs: paintAgeSince(paintAgesBefore),
      readingsPerSecond:
        steadyCount / ((steadyEndFraction - steadyStartFraction) * toneSeconds),
      maxCentsErr,
      maxShownCentsErr,
      centsErrReadings,
      shownErrReadings,
    };
  }

  async function measureSweep(waveform) {
    const context = listening.context();
    if (context === null) throw new Error("listening.context() is null");
    const destination = window.__micDestination;
    if (destination === undefined) {
      throw new Error(
        "window.__micDestination not set — getUserMedia override never ran",
      );
    }
    const perTone = [];
    for (const position of positions) {
      const hz = trueHzOfPosition(position);
      perTone.push(
        await measureTone({ context, destination, waveform, hz, position }),
      );
    }
    return perTone;
  }

  // practice.tuner/REQ-002/S4 (live) — A4 → A♯4 over 6 s; the shown name
  // must change exactly once, at the 56 ¢ crossing.
  async function measureHandover() {
    const context = listening.context();
    const destination = window.__micDestination;
    const sampleRate = listening.sampleRate();
    const { osc, gain } = connectOscillator(
      context,
      destination,
      "sine",
      handoverStartHz,
    );

    const t0 = context.currentTime + prerollSeconds;
    const onsetFrame = Math.round(t0 * sampleRate);
    const onsetPerfMs = performance.now() + (t0 - context.currentTime) * 1000;
    const steadyStartMs =
      onsetPerfMs + steadyStartFraction * handoverSeconds * 1000;
    const steadyEndMs =
      onsetPerfMs + steadyEndFraction * handoverSeconds * 1000;

    // The glissando starts at handoverStartHz (440 Hz, A4 — referenceA4Position):
    // its first readout is the same identity check as a sweep tone's.
    const readout = armReadoutTracking(
      onsetPerfMs,
      noteLabelOfPosition(referenceA4Position),
    );
    const arrival = armArrivalTracking(onsetFrame, sampleRate);

    let steadyCount = 0;
    let lastTargetKey = null;
    let changeCount = 0;
    let crossingOffsetCents = null;
    const unsubscribeJudged = noteJudgedSubscribe((event) => {
      const now = performance.now();
      // A NoteJudged received before this tone's own onset is a trailing
      // reading from whatever case ran before it (its listener is
      // subscribed for the full `prerollSeconds` gap ahead of `osc.start`,
      // the same gap every tone gets — see measureTone) — its target is
      // not this glissando's baseline, so it must not seed `lastTargetKey`
      // or be counted as a change.
      if (now < onsetPerfMs) return;
      if (now >= steadyStartMs && now < steadyEndMs) steadyCount += 1;
      const targetKey = JSON.stringify(event.target);
      if (lastTargetKey === null) {
        lastTargetKey = targetKey;
        return;
      }
      if (targetKey === lastTargetKey) return;
      changeCount += 1;
      crossingOffsetCents = 1200 * Math.log2(event.heard.hz / referenceA4Hz);
      lastTargetKey = targetKey;
    });

    const paintAgesBefore = (window.__paintAgesMs ?? []).length;

    osc.frequency.setValueAtTime(handoverStartHz, t0);
    osc.frequency.linearRampToValueAtTime(handoverEndHz, t0 + handoverSeconds);
    osc.start(t0);
    osc.stop(t0 + handoverSeconds);
    await sleep((prerollSeconds + handoverSeconds) * 1000);

    readout.disconnect();
    arrival.disconnect();
    unsubscribeJudged();
    osc.disconnect();
    gain.disconnect();

    return {
      firstReadoutMs: readout.value(),
      arrivalAgeMs: arrival.value(),
      maxPaintAgeMs: paintAgeSince(paintAgesBefore),
      readingsPerSecond:
        steadyCount /
        ((steadyEndFraction - steadyStartFraction) * handoverSeconds),
      changeCount,
      crossingOffsetCents,
    };
  }

  // A seeded LCG — deterministic broadband noise, no dependency.
  function lcgNoiseBuffer(context, durationS) {
    const length = Math.round(durationS * context.sampleRate);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x2545f491;
    for (let index = 0; index < length; index += 1) {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      data[index] = (seed / 0x7fffffff) * 2 - 1;
    }
    return buffer;
  }

  // listening.pitch-detection/REQ-003/S1 — nothing connected to the mic
  // destination is silence.
  async function measureSilence() {
    // Every other case gets `prerollSeconds` of quiet before its own audio
    // (or, for silence, before it starts counting) — the same gap that
    // lets a prior case's analysis lag (its window/hop still draining
    // real signal after the source itself stopped) finish publishing
    // before this measurement begins. Silence has no oscillator of its
    // own to carry that gap, so it is taken explicitly here.
    await sleep(prerollSeconds * 1000);
    let count = 0;
    const unsubscribe = noteJudgedSubscribe(() => {
      count += 1;
    });
    await sleep(silenceSeconds * 1000);
    unsubscribe();
    return { count };
  }

  // listening.pitch-detection/REQ-003/S2 — white noise at a played note's
  // level.
  async function measureNoise() {
    const context = listening.context();
    const destination = window.__micDestination;
    const gain = context.createGain();
    gain.gain.value = 0.3;
    gain.connect(destination);
    const source = context.createBufferSource();
    source.buffer = lcgNoiseBuffer(context, noiseSeconds);
    source.connect(gain);

    let count = 0;
    const unsubscribe = noteJudgedSubscribe(() => {
      count += 1;
    });

    const t0 = context.currentTime + prerollSeconds;
    source.start(t0);
    source.stop(t0 + noiseSeconds);
    // A little extra grace so a trailing false detection at the noise's
    // tail end is still caught, not clipped by an exact-length wait.
    await sleep((prerollSeconds + noiseSeconds + 0.3) * 1000);

    unsubscribe();
    source.disconnect();
    gain.disconnect();
    return { count };
  }

  return (async () => ({
    sine: await measureSweep("sine"),
    flute: await measureSweep("flute-like"),
    handover: await measureHandover(),
    silence: await measureSilence(),
    noise: await measureNoise(),
  }))();
}

function maxOf(values) {
  if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
  return Math.max(...values);
}

function minOf(values) {
  if (values.some((value) => value === null)) return Number.NEGATIVE_INFINITY;
  return Math.min(...values);
}

function paintAgeMaxOf(values) {
  const present = values.filter((value) => value !== null);
  return present.length > 0 ? Math.max(...present) : null;
}

// The tone whose `selector(tone)` is largest — null sorts as worse than any
// number (it means no matching reading ever arrived for that tone at all).
// Attributes a sweep row's worst figure to a specific note so a stray
// excursion isn't lost in the row's aggregate max.
function worstToneOf(perTone, selector) {
  let worst = perTone[0];
  let worstSortable =
    selector(worst) === null ? Number.POSITIVE_INFINITY : selector(worst);
  for (const tone of perTone.slice(1)) {
    const value = selector(tone);
    const sortable = value === null ? Number.POSITIVE_INFINITY : value;
    if (sortable > worstSortable) {
      worst = tone;
      worstSortable = sortable;
    }
  }
  return worst;
}

function sweepRow(label, perTone) {
  const firstReadoutMaxMs = maxOf(perTone.map((tone) => tone.firstReadoutMs));
  const arrivalAgeMaxMs = maxOf(perTone.map((tone) => tone.arrivalAgeMs));
  const paintAgeMaxMs = paintAgeMaxOf(
    perTone.map((tone) => tone.maxPaintAgeMs),
  );
  const readingsPerSecondMin = minOf(
    perTone.map((tone) => tone.readingsPerSecond),
  );
  const centsErrMax = maxOf(perTone.map((tone) => tone.maxCentsErr));
  const shownCentsErrMax = maxOf(perTone.map((tone) => tone.maxShownCentsErr));
  // converge round 1 (W4) — centsErrMax/shownCentsErrMax both start at 0 and
  // a tone that never took a qualifying reading (its `if` above never ran)
  // would silently report 0, the same value as a perfect reading. Requiring
  // every tone's counter to be non-zero closes that hole.
  const tonesWithNoCentsReading = perTone.filter(
    (tone) => tone.centsErrReadings === 0,
  );
  const tonesWithNoShownReading = perTone.filter(
    (tone) => tone.shownErrReadings === 0,
  );
  const everyToneRead =
    tonesWithNoCentsReading.length === 0 &&
    tonesWithNoShownReading.length === 0;
  const passed =
    firstReadoutMaxMs <= FIRST_READOUT_MAX_MS &&
    arrivalAgeMaxMs <= ARRIVAL_AGE_MAX_MS &&
    readingsPerSecondMin >= READINGS_PER_SECOND_MIN &&
    centsErrMax <= CENTS_ERROR_MAX_CENTS &&
    shownCentsErrMax <= SHOWN_CENTS_ERROR_MAX_CENTS &&
    everyToneRead;

  const worstFirstReadout = worstToneOf(perTone, (tone) => tone.firstReadoutMs);
  const worstArrival = worstToneOf(perTone, (tone) => tone.arrivalAgeMs);
  const worstCents = worstToneOf(perTone, (tone) => tone.maxCentsErr);
  const worstShown = worstToneOf(perTone, (tone) => tone.maxShownCentsErr);
  const worstLine =
    `  worst: first readout ${noteLabelOfPosition(worstFirstReadout.position)} ` +
    `${worstFirstReadout.firstReadoutMs === null ? "n/a" : worstFirstReadout.firstReadoutMs.toFixed(2)} ms · ` +
    `arrival age ${noteLabelOfPosition(worstArrival.position)} ` +
    `${worstArrival.arrivalAgeMs === null ? "n/a" : worstArrival.arrivalAgeMs.toFixed(2)} ms · ` +
    `cents err ${noteLabelOfPosition(worstCents.position)} ${worstCents.maxCentsErr.toFixed(2)} ¢ · ` +
    `shown err ${noteLabelOfPosition(worstShown.position)} ${worstShown.maxShownCentsErr} ¢`;
  // Only printed when the counter gate actually failed — names the tone(s)
  // that took no qualifying reading, rather than the generic FAIL message
  // restating the numeric gates (which would say nothing new here).
  const noReadingLine = everyToneRead
    ? undefined
    : `  no qualifying reading: ` +
      [
        ...tonesWithNoCentsReading.map(
          (tone) => `cents err ${noteLabelOfPosition(tone.position)}`,
        ),
        ...tonesWithNoShownReading.map(
          (tone) => `shown err ${noteLabelOfPosition(tone.position)}`,
        ),
      ].join(", ");

  return {
    cells: [
      label,
      String(perTone.length),
      firstReadoutMaxMs.toFixed(2),
      arrivalAgeMaxMs.toFixed(2),
      paintAgeMaxMs === null ? "n/a" : paintAgeMaxMs.toFixed(2),
      readingsPerSecondMin.toFixed(2),
      centsErrMax.toFixed(2),
      String(shownCentsErrMax),
      passed ? "PASS" : "FAIL",
    ],
    passed,
    worstLine,
    noReadingLine,
  };
}

// practice.tuner/REQ-002/S4 (live) — exactly one name change, at or beyond
// the 56 ¢ hand-over threshold; the other columns are printed for context,
// not gated (the tone is a deliberate sweep, not a steady note).
function handoverRow(result) {
  const passed =
    result.changeCount === 1 &&
    result.crossingOffsetCents !== null &&
    result.crossingOffsetCents >= HANDOVER_CENTS;
  return {
    cells: [
      "hand-over glissando",
      "1",
      result.firstReadoutMs === null ? "n/a" : result.firstReadoutMs.toFixed(2),
      result.arrivalAgeMs === null ? "n/a" : result.arrivalAgeMs.toFixed(2),
      result.maxPaintAgeMs === null ? "n/a" : result.maxPaintAgeMs.toFixed(2),
      result.readingsPerSecond.toFixed(2),
      "—",
      "—",
      passed ? "PASS" : "FAIL",
    ],
    passed,
  };
}

function silentRow(label, result) {
  const passed = result.count === 0;
  return {
    cells: [
      label,
      "—",
      "—",
      "—",
      "—",
      result.count.toFixed(2),
      "—",
      "—",
      passed ? "PASS" : "FAIL",
    ],
    passed,
  };
}

function printTable(rows) {
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

async function main() {
  const devServerChild = await ensureDevServer();

  let allPassed = true;
  let fatalError = null;
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--use-fake-ui-for-media-stream",
      ],
    });
    let results;
    try {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      try {
        await page.addInitScript(installMicrophoneOverride);
        await page.goto(APP_URL);
        await page.waitForFunction(
          () =>
            window.__session !== undefined &&
            window.__sound !== undefined &&
            window.__listening !== undefined &&
            window.__noteJudged !== undefined,
        );

        await page.click('button[aria-label="Tuner"]');
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="mic-indicator"]')
              ?.textContent?.includes("LISTENING") === true,
        );
        // The indicator reads "LISTENING" for both the session's
        // "starting" and "listening" states (isListening in
        // TunerScreen.tsx) — the former is shown while `listening.start()`
        // is still awaiting `context.audioWorklet.addModule()`, before it
        // has even called `getUserMedia` (and so before the override below
        // has set `window.__micDestination`). Waiting for the destination
        // itself is the harness's own, stronger signal that capture is
        // actually ready for tones to be fed in.
        await page.waitForFunction(() => window.__micDestination !== undefined);

        console.log("feeding the microphone from the page's own AudioContext");

        results = await page.evaluate(measureInPage, {
          positions: positionsE2ToC7(),
          toneSeconds: TONE_SECONDS,
          prerollSeconds: PREROLL_SECONDS,
          steadyStartFraction: STEADY_START_FRACTION,
          steadyEndFraction: STEADY_END_FRACTION,
          centsSkipMs: CENTS_SKIP_MS,
          shownSettleMs: SHOWN_SETTLE_MS,
          handoverSeconds: HANDOVER_SECONDS,
          handoverStartHz: HANDOVER_START_HZ,
          handoverEndHz: HANDOVER_END_HZ,
          silenceSeconds: SILENCE_SECONDS,
          noiseSeconds: NOISE_SECONDS,
          referenceA4Hz: REFERENCE_A4_HZ,
          referenceA4Position: REFERENCE_A4_POSITION,
        });

        // Tidy, not required by any gate: leaves the tuner the way a real
        // session would, releasing the (overridden) microphone.
        await page
          .click('button[aria-label="Practice"]')
          .catch(() => undefined);
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }

    const rows = [
      sweepRow("sine E2–C7", results.sine),
      sweepRow("flute-like E2–C7", results.flute),
      handoverRow(results.handover),
      silentRow("silence", results.silence),
      silentRow("white noise", results.noise),
    ];
    printTable(rows);
    // One extra line per sweep row, under the table — the note each of its
    // worst figures belongs to, so a stray excursion can be attributed
    // rather than lost in the row's aggregate max.
    for (const row of rows) {
      if (row.worstLine !== undefined) console.log(row.worstLine);
      if (row.noReadingLine !== undefined) console.log(row.noReadingLine);
    }
    allPassed = rows.every((row) => row.passed);
  } catch (error) {
    fatalError = error;
  } finally {
    stopDevServer(devServerChild);
  }

  if (fatalError !== null) {
    console.error(
      `test:tuner: FAIL — ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (!allPassed) {
    console.error(
      `test:tuner: FAIL — first readout exceeded ${FIRST_READOUT_MAX_MS} ms, arrival age exceeded ${ARRIVAL_AGE_MAX_MS} ms, readings/s fell below ${READINGS_PER_SECOND_MIN}, |cents error| exceeded ${CENTS_ERROR_MAX_CENTS}, the shown offset was not within ±${SHOWN_CENTS_ERROR_MAX_CENTS} ¢ ${SHOWN_SETTLE_MS} ms into a tone, the hand-over crossing missed ${HANDOVER_CENTS} ¢ or changed more than once, or a reading appeared during silence or noise — see the table above`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `test:tuner: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, |cents error| ≤${CENTS_ERROR_MAX_CENTS}, shown offset within ±${SHOWN_CENTS_ERROR_MAX_CENTS} ¢, nothing for silence or noise`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
