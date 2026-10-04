#!/usr/bin/env node
// Measured lead-run budget — practice.session/REQ-021/S1 (every shown
// reading within 100 ms of its sound, ≥20 readings/s while steady, every
// advance shown within 100 ms, each advance at 1250 ms of accumulated
// in-tune time and never earlier), practice.session/REQ-016/S1's timing
// (the same budget, read off the hold rule itself) and practice.session/
// REQ-018/S3 (the tool's own tone, fed back as the microphone, is never
// judged). Not part of `pnpm check`; AGENTS.md requires it at every
// converge and finish from 008-learner-leads.
//
// Playwright, headless Chromium. No UI is driven at all — the microphone
// is replaced by an oscillator inside the page's own AudioContext
// (installMicrophoneOverride, harness-lib.mjs), and the session itself is
// driven straight off `window.__session` (setSettings/start/stop/snapshot/
// onNoteJudged/onTargetAdvanced — main.tsx's existing dev-only exposure):
// `start()` in I lead needs nothing clicked, only `settings.lead.who`.
//
// Usage: pnpm test:lead
// (against dev:phone's HTTPS server: APP_URL=https://localhost:5173 pnpm test:lead)

import { chromium } from "playwright";
import {
  APP_URL,
  ensureDevServer,
  stopDevServer,
  installMicrophoneOverride,
  maxOf,
  minOf,
  printTable,
} from "./harness-lib.mjs";

// practice.session/REQ-021, REQ-016 — the budgets this harness gates.
const FIRST_READOUT_MAX_MS = 100;
const ARRIVAL_AGE_MAX_MS = 100;
const READINGS_PER_SECOND_MIN = 20;
// The hold rule can only act on a reading it has already received — one
// hop's worth of slack (512 frames, the detector's own hop — notes.md's
// "the 10.667 ms reading grid") between the reading that completed the
// hold and the advance that follows it. Never negative: REQ-016's
// invariant is "never advance early".
const ADVANCE_LATENESS_MIN_FRAMES = 0;
const ADVANCE_LATENESS_MAX_FRAMES = 512;
const SHOWN_LATENESS_MAX_MS = 100;

// The run: C major on flute Concert, ↑↓ 1 oct — 15 notes, C4–C5 — the
// example traversal and the only instrument variant, both already the
// fresh-browser defaults (practice.session/REQ-011/S2), so nothing is
// selected through the UI or through setContext/setTraversal; the harness
// only asserts the default sequence is what it expects before trusting it.
const EXPECTED_SEQUENCE_LABELS = "C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4";
const EXPECTED_TARGETS_COUNT = EXPECTED_SEQUENCE_LABELS.split(" ").length;

// practice.session/REQ-016/S1 — medium, 2 beats, 96 bpm: 1250 ms required.
const CASE1_HOLD_BEATS = 2;
const CASE1_TEMPO_BPM = 96;
const CASE1_REQUIRED_HOLD_MS = (CASE1_HOLD_BEATS * 60000) / CASE1_TEMPO_BPM;
// REQ-021/S1 — a flat entry at −30 ¢ ramping exponentially (Web Audio's own
// exponentialRampToValueAtTime, which is linear in cents, since Hz is
// exponential in cents) to −2 ¢ over 650 ms, then steady until the advance;
// on target 4 only, a drift to −16 ¢ (outside medium's ±10 ¢ band, so the
// hold must reset) for 400 ms, then back.
const ENTRY_CENTS = -30;
const STEADY_CENTS = -2;
const RAMP_MS = 650;
const DRIFT_TARGET_POSITION = 4;
const DRIFT_CENTS = -16;
const DRIFT_HOLD_MS = 400;
const DRIFT_RAMP_MS = 30;
const SILENCE_MS = 300;
// A cold AudioContext can stall the first tone's first reading (007's
// harness saw it: an onset-anchoring artefact of the harness, not a
// regression). The tuner harness opens every tone after a 0.6 s preroll;
// this one opens the very first tone after this much more silence than the
// scripted SILENCE_MS every other target gets.
const FIRST_TARGET_WARMUP_EXTRA_MS = 300;
// Lead time for Web Audio parameter scheduling (osc.frequency/gain.gain) —
// just enough that `setValueAtTime(..., context.currentTime + X)` is never
// mistaken for "now or the past" by the audio thread.
const SCHEDULE_LEAD_S = 0.015;
const GAIN_RAMP_S = 0.005;
const GAIN_LEVEL = 0.5;

// practice.session/REQ-018/S3 — tone on, 1 beat at 150 bpm (400 ms hold).
const CASE2_HOLD_BEATS = 1;
const CASE2_TEMPO_BPM = 150;
const CASE2_REQUIRED_HOLD_MS = (CASE2_HOLD_BEATS * 60000) / CASE2_TEMPO_BPM;
// lead.ts's own CUE_TONE_MS/CUE_TAIL_MS and session.ts's TONE_RELEASE_MS,
// duplicated here the same way trueHzOfPosition is duplicated below — a
// plain Node script with no bundler step to import the domain's internals
// through (docs/engineering.md §8: a context's internals never cross out).
const CUE_TONE_MS = 400;
const TONE_RELEASE_MS = 40;
const CUE_TAIL_MS = 100;
const CUE_MUTE_WINDOW_MS = CUE_TONE_MS + TONE_RELEASE_MS + CUE_TAIL_MS;
// How many "new target appears" moments the tone-cue case exercises — each
// one is the tool's own cue tone fed back as the microphone (the speaker
// bleed), then silence, then the learner's own in-tune note that completes
// the (400 ms) hold and produces the next one.
const CASE2_CYCLES = 3;

const REFERENCE_A4_HZ = 440;
const REFERENCE_A4_POSITION = 69;

// Everything below runs inside the page via a single `page.evaluate` call —
// every timestamp stays on the page's own performance.now()/AudioContext
// clocks (tuner-timing-test.mjs's measureInPage does the same, for the same
// reason: no Node↔browser round trip adds jitter to what is measured).
function measureInPage(params) {
  const {
    expectedTargetsCount,
    expectedSequenceLabels,
    case1HoldBeats,
    case1TempoBpm,
    case1RequiredHoldMs,
    entryCents,
    steadyCents,
    rampMs,
    driftTargetPosition,
    driftCents,
    driftHoldMs,
    driftRampMs,
    silenceMs,
    firstTargetWarmupExtraMs,
    scheduleLeadS,
    gainRampS,
    gainLevel,
    case2HoldBeats,
    case2TempoBpm,
    case2RequiredHoldMs,
    cueToneMs,
    cueMuteWindowMs,
    case2Cycles,
    referenceA4Hz,
    referenceA4Position,
  } = params;

  const session = window.__session;
  const listening = window.__listening;
  if (session === undefined || listening === undefined) {
    throw new Error(
      "window.__session/__listening not exposed — dev build only",
    );
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitUntil(predicate, timeoutMs = 10_000) {
    const deadline = performance.now() + timeoutMs;
    while (!predicate()) {
      if (performance.now() > deadline) {
        throw new Error("waitUntil: timed out waiting for a condition");
      }
      await sleep(5);
    }
  }

  // theory/domain/notes.ts's pitchPosition and temperament's trueHz,
  // duplicated for the same reason tuner-timing-test.mjs duplicates them
  // (no bundler step in this plain Node/page-evaluated script).
  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACCIDENTAL_OFFSET = { flat: -1, natural: 0, sharp: 1 };
  const ACCIDENTAL_SYMBOL = { flat: "♭", natural: "", sharp: "♯" };

  function positionOfNote(note) {
    return (
      12 * (note.octave + 1) +
      LETTER_SEMITONE[note.letter] +
      ACCIDENTAL_OFFSET[note.accidental]
    );
  }

  function trueHzOfPosition(position) {
    return referenceA4Hz * 2 ** ((position - referenceA4Position) / 12);
  }

  function hzOfNote(note, cents = 0) {
    const baseHz = trueHzOfPosition(positionOfNote(note));
    return baseHz * 2 ** (cents / 1200);
  }

  function labelOfNote(note) {
    return `${note.letter}${ACCIDENTAL_SYMBOL[note.accidental]}${note.octave}`;
  }

  // harness-lib.mjs's maxOf, duplicated — a page.evaluate function's body
  // is serialised and run inside the page on its own, with no access to
  // this script's own Node-side imports.
  function maxOfInPage(values) {
    if (values.length === 0) return 0;
    if (values.some((value) => value === null)) return Number.POSITIVE_INFINITY;
    return Math.max(...values);
  }

  // A single oscillator/gain pair reused for a whole case's tones — gain 0
  // (silent) between them, opened and re-pitched at each onset, rather than
  // a fresh node per tone (nothing here has a fixed, pre-known duration the
  // way tuner-timing-test.mjs's steady 1 s tones do: a lead run's "steady
  // until the advance" phase ends whenever the hold rule says so).
  function connectRun(context, destination) {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(destination);
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 440;
    osc.connect(gain);
    osc.start();
    return { osc, gain };
  }

  // Opens the gain and sets the frequency at `t0` — "the frame at which
  // the oscillator's frequency was set and the gain opened" (the brief's
  // own definition of a tone's onset) — returning that onset's frame.
  function openToneAt(run, context, sampleRate, t0, hz) {
    run.gain.gain.cancelScheduledValues(t0);
    run.gain.gain.setValueAtTime(0, t0);
    run.gain.gain.linearRampToValueAtTime(gainLevel, t0 + gainRampS);
    run.osc.frequency.cancelScheduledValues(t0);
    run.osc.frequency.setValueAtTime(hz, t0);
    return Math.round(t0 * sampleRate);
  }

  function closeToneAt(run, t0) {
    run.gain.gain.cancelScheduledValues(t0);
    run.gain.gain.setValueAtTime(gainLevel, t0);
    run.gain.gain.linearRampToValueAtTime(0, t0 + gainRampS);
  }

  // The rAF loop behind every advance's `shownAtFrame` — practice.session/
  // REQ-021's "the advance shows … within 100 ms" is about what the
  // learner sees, not the model; there is no DOM text to watch the way
  // tuner-timing-test.mjs's armReadoutTracking watches "[data-testid=
  // tuner-name]" (a lead run's target moves the stave/names view, neither
  // simple text), so this polls the session's own `snapshot()` once per
  // animation frame — the same cadence React's own commits are throttled
  // to — and records the audio-clock frame (context.currentTime ×
  // sampleRate) at which each change in `lead.target.position` was caught,
  // which is what a reading or an advance is ever "shown" against.
  function startShownPoller(context, sampleRate) {
    const shownChanges = [];
    let lastPosition = session.snapshot().lead.target?.position ?? null;
    let running = true;
    function tick() {
      if (!running) return;
      const position = session.snapshot().lead.target?.position ?? null;
      if (position !== lastPosition) {
        lastPosition = position;
        shownChanges.push({
          position,
          frame: Math.round(context.currentTime * sampleRate),
        });
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return {
      // The first change to `advance.position` painted at or after the
      // advance's own frame (position 1 recurs when the run loops, so a
      // position alone is not enough to pick the right change).
      shownFrameOf: (advance) =>
        shownChanges.find(
          (change) =>
            change.position === advance.position &&
            change.frame >= advance.atFrame,
        )?.frame,
      stop: () => {
        running = false;
      },
    };
  }

  // The hold rule, replicated read-only from the recorded readings — lead.
  // ts's applyJudgement, over the window between two advances (practice.
  // session/REQ-016): accumulates between consecutive in-tune readings,
  // resets on anything else, and reports the first reading's own atFrame at
  // which the accumulation reaches `requiredMs` — "expected" for the
  // advance that actually followed it.
  function expectedAdvanceFrame(readingsInWindow, sampleRate, requiredMs) {
    let heldMs = 0;
    let lastInTuneAtMs = null;
    for (const reading of readingsInWindow) {
      const atMs = (reading.atFrame / sampleRate) * 1000;
      if (reading.verdict === "in-tune") {
        heldMs += lastInTuneAtMs === null ? 0 : atMs - lastInTuneAtMs;
        lastInTuneAtMs = atMs;
      } else {
        heldMs = 0;
        lastInTuneAtMs = null;
      }
      if (heldMs >= requiredMs) return reading.atFrame;
    }
    return null;
  }

  // One target's worth of metrics: the first qualifying NoteJudged's own
  // arrival delay from this tone's onset, the readings/s over its steady
  // window (onset + the ramp, through the advance that ended it), the
  // advance's lateness against the hold rule replicated above, and how
  // late the advance was shown.
  function targetMetrics({
    note,
    playedPosition,
    onsetFrame,
    steadyFromFrame,
    readings,
    prevAdvanceAtFrame,
    advance,
    shownAtFrame,
    requiredMs,
    sampleRate,
  }) {
    const firstReading = readings.find(
      (reading) => reading.atFrame >= onsetFrame,
    );
    const firstReadoutMs =
      firstReading === undefined
        ? null
        : ((firstReading.arrivedAtFrame - onsetFrame) / sampleRate) * 1000;

    const windowReadings = readings.filter(
      (reading) =>
        reading.atFrame > prevAdvanceAtFrame &&
        reading.atFrame <= advance.atFrame,
    );
    const steadyReadings = windowReadings.filter(
      (reading) => reading.atFrame >= steadyFromFrame,
    );
    const steadySeconds = (advance.atFrame - steadyFromFrame) / sampleRate;
    const readingsPerSecond =
      steadySeconds > 0 ? steadyReadings.length / steadySeconds : 0;

    // practice.session/REQ-016 — the hold rule runs on every raw reading,
    // "committed or not" (session.ts's own comment on commitLeadReading) —
    // a zero-delay commit timer can batch several raw readings into one
    // displayed `NoteJudged`, and the batch straddling the advance itself
    // (the completing reading, then the new target's own first reading,
    // both inside the same tick) loses the completing one entirely: its
    // own atFrame is never shown, superseded by the next commit before
    // this harness's `onNoteJudged` subscription ever sees it (observed
    // directly: `advance.atFrame` exactly one hop past the window's last
    // visible reading). `TargetAdvanced` only ever fires on an in-tune
    // reading that completed the hold (the same invariant's other
    // direction), so that reading is reconstructed here if the window
    // does not already carry it — the hold rule's own replication must
    // not depend on whichever reading a commit happened to land on.
    const completingReadingMissing = !windowReadings.some(
      (reading) => reading.atFrame === advance.atFrame,
    );
    const windowReadingsForHold = !completingReadingMissing
      ? windowReadings
      : [...windowReadings, { atFrame: advance.atFrame, verdict: "in-tune" }];
    const expectedFrame = expectedAdvanceFrame(
      windowReadingsForHold,
      sampleRate,
      requiredMs,
    );
    const advanceLatenessFrames =
      expectedFrame === null ? null : advance.atFrame - expectedFrame;

    const shownLatenessMs =
      shownAtFrame === undefined
        ? null
        : ((shownAtFrame - advance.atFrame) / sampleRate) * 1000;

    return {
      position: playedPosition,
      note,
      label: labelOfNote(note),
      firstReadoutMs,
      readingsPerSecond,
      advanceLatenessFrames,
      completingReadingMissing,
      shownLatenessMs,
      expectedFrame,
      windowReadings,
    };
  }

  // What a case reports: its per-target metrics, the worst arrival age over
  // every reading it recorded (not only those inside an advance's window),
  // and the worst paint age the app reported meanwhile (printed, not gated).
  function caseResult(perTarget, readings, sampleRate, paintAgesBefore) {
    const paintAgesDuring = (window.__paintAgesMs ?? []).slice(paintAgesBefore);
    return {
      perTarget,
      arrivalAgeMaxMs: maxOfInPage(
        readings.map(
          (reading) =>
            ((reading.arrivedAtFrame - reading.atFrame) / sampleRate) * 1000,
        ),
      ),
      maxPaintAgeMs:
        paintAgesDuring.length > 0 ? Math.max(...paintAgesDuring) : null,
    };
  }

  // practice.session/REQ-021/S1, REQ-016/S1's timing — the full 15-target
  // lead run of the example traversal.
  async function runCase1() {
    session.setSettings({
      ...session.snapshot().settings,
      tempoBpm: case1TempoBpm,
      lead: {
        who: "me",
        holdBeats: case1HoldBeats,
        tolerance: "medium",
        cueMeter: true,
        cueTone: false,
      },
    });

    const sequence = session.snapshot().sequence;
    const labels = sequence.map((entry) => labelOfNote(entry.note)).join(" ");
    if (labels !== expectedSequenceLabels) {
      throw new Error(
        `runCase1: expected the run ${expectedSequenceLabels} (C major, flute Concert, ↑↓ 1 oct — the fresh-browser defaults), got ${labels}`,
      );
    }

    const readings = [];
    const unsubscribeJudged = session.onNoteJudged((event) => {
      readings.push({
        atFrame: event.atFrame,
        cents: event.cents,
        verdict: event.verdict,
        arrivedAtFrame: listening.currentFrame(),
      });
    });
    const advances = [];
    const unsubscribeAdvanced = session.onTargetAdvanced((event) => {
      advances.push({ position: event.position, atFrame: event.atFrame });
    });

    const paintAgesBefore = (window.__paintAgesMs ?? []).length;

    // start() → startLead() → requestListening() awaits wakeLock.acquire()
    // before it ever calls listening.start() (session.ts's own ordering —
    // the drone goes first, REQ-015/S5); web-audio-listening.ts's own
    // sampleRate()/currentFrame() report 0 until its internal `listener` is
    // assigned, which is only once createListener()'s whole async chain
    // (including the overridden getUserMedia) has resolved — later than
    // `context()` turning non-null, and later than `__micDestination`
    // being set (the override sets it from *inside* that same chain). The
    // first `TargetAdvanced` (REQ-015/S1) only ever fires once that chain
    // has resolved too, so waiting for it is this harness's one, reliable
    // "fully ready" signal — nothing here is read before it.
    session.start();
    await waitUntil(() => listening.context() !== null);
    const context = listening.context();
    await waitUntil(() => window.__micDestination !== undefined);
    await waitUntil(() => advances.length >= 1);
    const sampleRate = listening.sampleRate();

    const shownPoller = startShownPoller(context, sampleRate);

    const run = connectRun(context, window.__micDestination);

    const perTarget = [];
    for (let index = 0; index < expectedTargetsCount; index += 1) {
      const note = sequence[index].note;
      const extraSilence = index === 0 ? firstTargetWarmupExtraMs : 0;
      await sleep(silenceMs + extraSilence);

      const t0 = context.currentTime + scheduleLeadS;
      const entryHz = hzOfNote(note, entryCents);
      const steadyHz = hzOfNote(note, steadyCents);
      const onsetFrame = openToneAt(run, context, sampleRate, t0, entryHz);
      run.osc.frequency.exponentialRampToValueAtTime(
        steadyHz,
        t0 + rampMs / 1000,
      );
      await sleep(scheduleLeadS * 1000 + rampMs);

      if (index + 1 === driftTargetPosition) {
        const t1 = context.currentTime + scheduleLeadS;
        const driftHz = hzOfNote(note, driftCents);
        run.osc.frequency.cancelScheduledValues(t1);
        run.osc.frequency.setValueAtTime(steadyHz, t1);
        run.osc.frequency.linearRampToValueAtTime(
          driftHz,
          t1 + driftRampMs / 1000,
        );
        await sleep(scheduleLeadS * 1000 + driftRampMs);
        const t2 = context.currentTime + scheduleLeadS;
        run.osc.frequency.setValueAtTime(driftHz, t2);
        await sleep(scheduleLeadS * 1000 + driftHoldMs);
        const t3 = context.currentTime + scheduleLeadS;
        run.osc.frequency.cancelScheduledValues(t3);
        run.osc.frequency.setValueAtTime(driftHz, t3);
        run.osc.frequency.linearRampToValueAtTime(
          steadyHz,
          t3 + driftRampMs / 1000,
        );
        await sleep(scheduleLeadS * 1000 + driftRampMs);
      }

      const prevAdvanceAtFrame = advances[index].atFrame;
      await waitUntil(() => advances.length > index + 1);
      const advance = advances[index + 1];
      // The rAF poll sees the new target a frame or so after the advance
      // itself — wait for it rather than reading it before it has run.
      await waitUntil(() => shownPoller.shownFrameOf(advance) !== undefined);
      const shownAtFrame = shownPoller.shownFrameOf(advance);

      perTarget.push(
        targetMetrics({
          note,
          playedPosition: index + 1,
          onsetFrame,
          steadyFromFrame:
            onsetFrame + Math.round((rampMs / 1000) * sampleRate),
          readings,
          prevAdvanceAtFrame,
          advance,
          shownAtFrame,
          requiredMs: case1RequiredHoldMs,
          sampleRate,
        }),
      );

      closeToneAt(run, context.currentTime + scheduleLeadS);
    }

    unsubscribeJudged();
    unsubscribeAdvanced();
    shownPoller.stop();
    run.osc.stop();
    run.osc.disconnect();
    run.gain.disconnect();

    return caseResult(perTarget, readings, sampleRate, paintAgesBefore);
  }

  // practice.session/REQ-018/S3 (measured) — tone on, 1 beat at 150 bpm;
  // as each new target appears the tool's own cue tone is fed back as the
  // microphone (the speaker bleed) at once, then silence, then the
  // learner's own in-tune note, which completes the (400 ms) hold and
  // produces the next target. A fresh run (stop, re-settle, start) so the
  // very first target gets its own cue tone too ("the first included",
  // REQ-018) — case 1 left the cue off, and a settings change alone never
  // replays a cue for the target already current.
  async function runCase2() {
    const context = listening.context();
    const sampleRate = listening.sampleRate();
    const previousDestination = window.__micDestination;

    // The first cue awaits the sound engine's own start (session.ts's
    // armCueTone) before it can post its tone and set its mute window —
    // starting it here, ahead of the run, keeps that one-off start-up out
    // of the first target's measurement, as the speaker would be silent
    // (and so there would be nothing to bleed) until it had finished.
    await window.__sound.start();

    session.stop();
    session.setSettings({
      ...session.snapshot().settings,
      tempoBpm: case2TempoBpm,
      lead: {
        ...session.snapshot().settings.lead,
        holdBeats: case2HoldBeats,
        cueTone: true,
      },
    });

    const readings = [];
    const unsubscribeJudged = session.onNoteJudged((event) => {
      readings.push({
        atFrame: event.atFrame,
        cents: event.cents,
        verdict: event.verdict,
        arrivedAtFrame: listening.currentFrame(),
      });
    });
    const advances = [];
    const unsubscribeAdvanced = session.onTargetAdvanced((event) => {
      advances.push({ position: event.position, atFrame: event.atFrame });
    });

    const shownPoller = startShownPoller(context, sampleRate);
    const paintAgesBefore = (window.__paintAgesMs ?? []).length;

    async function waitUntilFrame(frame) {
      await waitUntil(() => listening.currentFrame() >= frame);
    }
    const framesOf = (ms) => Math.round((ms / 1000) * sampleRate);

    session.start();
    await waitUntil(() => window.__micDestination !== previousDestination);
    await waitUntil(() => advances.length >= 1);

    const run = connectRun(context, window.__micDestination);
    const sequence = session.snapshot().sequence;

    const perTarget = [];
    for (let index = 0; index < case2Cycles; index += 1) {
      await waitUntil(() => advances.length > index);
      const currentAdvance = advances[index];
      const note = sequence[currentAdvance.position - 1].note;
      const hz = hzOfNote(note, 0);

      // The speaker bleed — the tool's own 400 ms cue tone, fed back as the
      // microphone at the new target's own pitch, right as it appears.
      const toneT0 = context.currentTime + scheduleLeadS;
      openToneAt(run, context, sampleRate, toneT0, hz);
      await sleep(scheduleLeadS * 1000 + cueToneMs);
      closeToneAt(run, context.currentTime + scheduleLeadS);
      const bleedEndFrame = listening.currentFrame();

      // The window REQ-018/S3 names runs from the advance (the cue's onset
      // is scheduled off the advance) for the tone, its release and the
      // tail; the hold must still be at zero when it has passed.
      const muteWindowEndFrame =
        currentAdvance.atFrame + framesOf(cueMuteWindowMs);
      await waitUntilFrame(muteWindowEndFrame);
      const heldFractionAtWindowEnd = session.snapshot().lead.heldFraction;

      // Then silence, then the learner's own note — steady and in tune from
      // its very first reading (REQ-016: the first reading after nothing is
      // shown as detected).
      await waitUntilFrame(bleedEndFrame + framesOf(silenceMs));
      const learnerT0 = context.currentTime + scheduleLeadS;
      const onsetFrame = openToneAt(run, context, sampleRate, learnerT0, hz);

      await waitUntil(() => advances.length > index + 1);
      const advance = advances[index + 1];
      await waitUntil(() => shownPoller.shownFrameOf(advance) !== undefined);
      const shownAtFrame = shownPoller.shownFrameOf(advance);

      // A reading at the advance's own frame is the one that completed the
      // hold, judged against the previous target; the window is the
      // readings strictly after the advance — the ones the cue must mute.
      const violations = readings.filter(
        (reading) =>
          reading.atFrame > currentAdvance.atFrame &&
          reading.atFrame <= muteWindowEndFrame,
      );

      perTarget.push({
        ...targetMetrics({
          note,
          playedPosition: currentAdvance.position,
          onsetFrame,
          steadyFromFrame: onsetFrame,
          readings,
          prevAdvanceAtFrame: currentAdvance.atFrame,
          advance,
          shownAtFrame,
          requiredMs: case2RequiredHoldMs,
          sampleRate,
        }),
        violations,
        heldFractionAtWindowEnd,
      });
    }

    unsubscribeJudged();
    unsubscribeAdvanced();
    shownPoller.stop();
    closeToneAt(run, context.currentTime + scheduleLeadS);
    run.osc.stop();
    run.osc.disconnect();
    run.gain.disconnect();
    session.stop();

    return caseResult(perTarget, readings, sampleRate, paintAgesBefore);
  }

  return (async () => ({
    case1: await runCase1(),
    case2: await runCase2(),
  }))();
}

// One diagnostic line per target whose advance lateness missed its bound —
// the plan's own risk (a dropped late reading) — naming the readings around
// it rather than only the aggregate figure (the task brief's step 3).
function latenessDiagnosticsOf(perTarget) {
  const lines = [];
  for (const target of perTarget) {
    const late = target.advanceLatenessFrames;
    if (
      late !== null &&
      late >= ADVANCE_LATENESS_MIN_FRAMES &&
      late <= ADVANCE_LATENESS_MAX_FRAMES
    ) {
      continue;
    }
    const readingsNear = target.windowReadings
      .slice(-6)
      .map(
        (reading) =>
          `atFrame ${reading.atFrame} ${reading.verdict} ${reading.cents.toFixed(1)}¢`,
      )
      .join(" | ");
    lines.push(
      `  advance lateness out of bounds at target ${target.position} (${target.label}): ` +
        `expected frame ${target.expectedFrame}, lateness ${late === null ? "n/a (hold never reached)" : late} frames — readings near it: ${readingsNear}`,
    );
  }
  return lines;
}

// One row of the table, with the gates it failed named so a FAIL line can
// say which cell, not only that the run failed.
function leadRunRow(label, result) {
  const { perTarget } = result;
  const firstReadoutMaxMs = maxOf(perTarget.map((t) => t.firstReadoutMs));
  const arrivalAgeMaxMs = result.arrivalAgeMaxMs;
  const readingsPerSecondMin = minOf(perTarget.map((t) => t.readingsPerSecond));
  const advanceLatenessValues = perTarget.map((t) => t.advanceLatenessFrames);
  const advanceLatenessMax = maxOf(advanceLatenessValues);
  const advanceEarly = advanceLatenessValues.some(
    (value) => value !== null && value < ADVANCE_LATENESS_MIN_FRAMES,
  );
  const shownLatenessMaxMs = maxOf(perTarget.map((t) => t.shownLatenessMs));

  const failures = [];
  if (firstReadoutMaxMs > FIRST_READOUT_MAX_MS)
    failures.push(
      `first readout max ${firstReadoutMaxMs} ms > ${FIRST_READOUT_MAX_MS}`,
    );
  if (arrivalAgeMaxMs > ARRIVAL_AGE_MAX_MS)
    failures.push(
      `arrival age max ${arrivalAgeMaxMs} ms > ${ARRIVAL_AGE_MAX_MS}`,
    );
  if (readingsPerSecondMin < READINGS_PER_SECOND_MIN)
    failures.push(
      `readings/s min ${readingsPerSecondMin} < ${READINGS_PER_SECOND_MIN}`,
    );
  if (advanceEarly)
    failures.push("an advance fell earlier than the in-tune time it needed");
  if (advanceLatenessMax > ADVANCE_LATENESS_MAX_FRAMES)
    failures.push(
      `advance lateness max ${advanceLatenessMax} frames > ${ADVANCE_LATENESS_MAX_FRAMES}`,
    );
  if (shownLatenessMaxMs > SHOWN_LATENESS_MAX_MS)
    failures.push(
      `shown lateness max ${shownLatenessMaxMs} ms > ${SHOWN_LATENESS_MAX_MS}`,
    );

  const diagnostics =
    failures.length === 0 ? [] : latenessDiagnosticsOf(perTarget);
  const missing = perTarget.filter((t) => t.completingReadingMissing).length;
  if (missing > 0) {
    diagnostics.push(
      `  note: ${missing} of ${perTarget.length} advances were completed by a reading coalesced away before it was shown (session.ts commitLeadReading) — its in-tune verdict is assumed from TargetAdvanced itself`,
    );
  }

  return {
    label,
    targetsCount: perTarget.length,
    firstReadoutMaxMs,
    arrivalAgeMaxMs,
    paintAgeMaxMs: result.maxPaintAgeMs,
    readingsPerSecondMin,
    advanceLatenessMax,
    shownLatenessMaxMs,
    failures,
    diagnostics,
  };
}

// REQ-018/S3: no NoteJudged inside the mute window and the hold at zero at
// its end, on top of the lead run's own gates.
function toneCueRow(label, result) {
  const row = leadRunRow(label, result);
  const { perTarget } = result;
  const violations = perTarget.flatMap((t) => t.violations);
  if (violations.length > 0)
    row.failures.push(
      `${violations.length} NoteJudged inside the tone cue's mute window`,
    );
  const heldNonZero = perTarget.filter((t) => t.heldFractionAtWindowEnd !== 0);
  if (heldNonZero.length > 0)
    row.failures.push("the hold was not zero at the mute window's end");

  for (const reading of violations) {
    row.diagnostics.push(
      `  NoteJudged during the tone cue's mute window at atFrame ${reading.atFrame} (${reading.verdict}, ${reading.cents.toFixed(1)}¢) — REQ-018/S3`,
    );
  }
  for (const t of heldNonZero) {
    row.diagnostics.push(
      `  heldFraction ${t.heldFractionAtWindowEnd} at the mute window's end for target ${t.position} (${t.label}), expected 0 — REQ-018/S3`,
    );
  }
  return row;
}

function cellsOf(row) {
  return [
    row.label,
    String(row.targetsCount),
    row.firstReadoutMaxMs.toFixed(2),
    row.arrivalAgeMaxMs.toFixed(2),
    row.paintAgeMaxMs === null ? "n/a" : row.paintAgeMaxMs.toFixed(2),
    row.readingsPerSecondMin.toFixed(2),
    row.advanceLatenessMax.toFixed(0),
    row.shownLatenessMaxMs.toFixed(2),
    row.failures.length === 0 ? "PASS" : "FAIL",
  ];
}

async function main() {
  const devServerChild = await ensureDevServer();

  const failures = [];
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
            window.__session !== undefined && window.__listening !== undefined,
        );

        console.log(
          "driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext",
        );

        results = await page.evaluate(measureInPage, {
          expectedTargetsCount: EXPECTED_TARGETS_COUNT,
          expectedSequenceLabels: EXPECTED_SEQUENCE_LABELS,
          case1HoldBeats: CASE1_HOLD_BEATS,
          case1TempoBpm: CASE1_TEMPO_BPM,
          case1RequiredHoldMs: CASE1_REQUIRED_HOLD_MS,
          entryCents: ENTRY_CENTS,
          steadyCents: STEADY_CENTS,
          rampMs: RAMP_MS,
          driftTargetPosition: DRIFT_TARGET_POSITION,
          driftCents: DRIFT_CENTS,
          driftHoldMs: DRIFT_HOLD_MS,
          driftRampMs: DRIFT_RAMP_MS,
          silenceMs: SILENCE_MS,
          firstTargetWarmupExtraMs: FIRST_TARGET_WARMUP_EXTRA_MS,
          scheduleLeadS: SCHEDULE_LEAD_S,
          gainRampS: GAIN_RAMP_S,
          gainLevel: GAIN_LEVEL,
          case2HoldBeats: CASE2_HOLD_BEATS,
          case2TempoBpm: CASE2_TEMPO_BPM,
          case2RequiredHoldMs: CASE2_REQUIRED_HOLD_MS,
          cueToneMs: CUE_TONE_MS,
          cueMuteWindowMs: CUE_MUTE_WINDOW_MS,
          case2Cycles: CASE2_CYCLES,
          referenceA4Hz: REFERENCE_A4_HZ,
          referenceA4Position: REFERENCE_A4_POSITION,
        });
      } finally {
        await context.close();
      }
    } finally {
      await browser.close();
    }

    const rows = [
      leadRunRow("lead run C4–C5", results.case1),
      toneCueRow("tone cue fed back", results.case2),
    ];
    printTable(
      [
        "case",
        "targets",
        "first readout max (ms)",
        "arrival age max (ms)",
        "paint age max (ms)",
        "readings/s min",
        "advance lateness max (frames)",
        "shown lateness max (ms)",
        "status",
      ],
      rows.map((row) => ({ cells: cellsOf(row) })),
    );
    for (const row of rows) {
      for (const line of row.diagnostics) console.log(line);
    }
    failures.push(
      ...rows.flatMap((row) =>
        row.failures.map((failure) => `${row.label}: ${failure}`),
      ),
    );
  } catch (error) {
    fatalError = error;
  } finally {
    stopDevServer(devServerChild);
  }

  if (fatalError !== null) {
    console.error(
      `test:lead: FAIL — ${fatalError instanceof Error ? fatalError.message : String(fatalError)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (failures.length > 0) {
    console.error(`test:lead: FAIL — ${failures.join("; ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `test:lead: PASS — first readout ≤${FIRST_READOUT_MAX_MS} ms, arrival age ≤${ARRIVAL_AGE_MAX_MS} ms, ≥${READINGS_PER_SECOND_MIN} readings/s, advance within one hop and never early, shown ≤${SHOWN_LATENESS_MAX_MS} ms, nothing judged during the tone`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
