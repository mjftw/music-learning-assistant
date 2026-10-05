// In-page helpers for the design-review loop's live states. Both
// scripts/design-shots.mjs and scripts/design_snapshot.py inject this file into
// the page before the app's own scripts (Playwright's addInitScript /
// add_init_script) and call window.__shotTones, so the two drivers share one
// copy of the tone-feeding logic. Plain browser JS, no module syntax; the .mjs
// extension only keeps it with its sibling scripts under the lint and format
// rules.
//
// What it drives is the dev build's hooks (src/ui/main.tsx): window.__session,
// window.__listening and, once harness-lib.mjs's installMicrophoneOverride has
// replaced getUserMedia, window.__micDestination — a
// MediaStreamAudioDestinationNode on the app's own AudioContext whose stream
// the app takes for the microphone. A sine into that node is "the learner".
(() => {
  const TONE_GAIN = 0.5;
  const TONE_RAMP_S = 0.005;
  const MIC_WAIT_MS = 30_000;
  // A4 = 440 Hz at pitchPosition 69 (C4 = 60) — the app's default reference,
  // which the fresh browser these shots use has not changed.
  const REFERENCE_A4_HZ = 440;
  const REFERENCE_A4_POSITION = 69;
  // The lead card's 1-beat hold at 96 bpm is 625 ms; the hold's reading
  // cadence adds the first reading's latency. See the advance burst below.
  const FAST_TEMPO_BPM = 200;
  const DEFAULT_TEMPO_BPM = 96;

  const LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACCIDENTAL_OFFSET = { flat: -1, natural: 0, sharp: 1 };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function hzOfTarget(target, cents) {
    const position =
      12 * (target.note.octave + 1) +
      LETTER_SEMITONE[target.note.letter] +
      ACCIDENTAL_OFFSET[target.note.accidental];
    return (
      REFERENCE_A4_HZ *
      2 ** ((position - REFERENCE_A4_POSITION) / 12) *
      2 ** (cents / 1200)
    );
  }

  // The destination is set from inside the override's getUserMedia, itself
  // reached only once the run has asked for the microphone.
  async function micReady() {
    const deadline = performance.now() + MIC_WAIT_MS;
    while (
      window.__micDestination === undefined ||
      window.__listening.context() === null
    ) {
      if (performance.now() > deadline) {
        throw new Error("the microphone destination never appeared");
      }
      await sleep(20);
    }
    return window.__listening.context();
  }

  function openTone(context, hz) {
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(window.__micDestination);
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    osc.connect(gain);
    osc.start();
    return { osc, gain };
  }

  function currentTarget() {
    const target = window.__session.snapshot().lead.target;
    if (target === null) throw new Error("no lead target to tune against");
    return target;
  }

  window.__shotTones = {
    // Merges `overrides` over the session's settings (lead merged one level
    // down) — the harnesses' way, off the dev hook.
    setSettings(overrides) {
      const session = window.__session;
      const settings = session.snapshot().settings;
      session.setSettings({
        ...settings,
        ...overrides,
        lead: { ...settings.lead, ...(overrides.lead ?? {}) },
      });
    },

    // A steady sine `cents` from the current target, or silence for null.
    async feed(cents) {
      const context = await micReady();
      if (
        window.__shotTone === undefined ||
        window.__shotTone.destination !== window.__micDestination
      ) {
        window.__shotTone = {
          ...openTone(context, REFERENCE_A4_HZ),
          destination: window.__micDestination,
        };
      }
      const { osc, gain } = window.__shotTone;
      const now = context.currentTime;
      if (cents === null) {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + TONE_RAMP_S);
        return;
      }
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(hzOfTarget(currentTarget(), cents), now);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(TONE_GAIN, now + TONE_RAMP_S);
    },

    // An in-tune sine on the current target for `durationMs`, then silence —
    // scheduled on the audio clock so its end is exact. Returns at once; the
    // caller waits the duration out.
    async burst(durationMs) {
      const context = await micReady();
      const { gain } = openTone(context, hzOfTarget(currentTarget(), 0));
      const start = context.currentTime + 0.02;
      const end = start + durationMs / 1000;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(TONE_GAIN, start + TONE_RAMP_S);
      gain.gain.setValueAtTime(TONE_GAIN, end);
      gain.gain.linearRampToValueAtTime(0, end + TONE_RAMP_S);
    },

    // Holds every note of the run in tune, one after another, at the fastest
    // settings (loop off, 1 beat at 200 bpm: 300 ms a note), until the run is
    // complete, then puts the tempo back to the default. The retune per
    // target is done here — a round trip from the driver per note would be
    // slower than the hold. A tempo change does not leave the complete card.
    async playRunToComplete(timeoutMs) {
      window.__shotTones.setSettings({
        loop: false,
        tempoBpm: FAST_TEMPO_BPM,
        lead: { holdBeats: 1 },
      });
      const context = await micReady();
      const { osc, gain } = openTone(context, REFERENCE_A4_HZ);
      const deadline = performance.now() + timeoutMs;
      let tunedTo = null;
      while (window.__session.snapshot().lead.phase !== "complete") {
        if (performance.now() > deadline) {
          throw new Error("the run never reached complete");
        }
        const target = window.__session.snapshot().lead.target;
        if (target !== null && target.position !== tunedTo) {
          tunedTo = target.position;
          const now = context.currentTime;
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.setValueAtTime(hzOfTarget(target, 0), now);
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(TONE_GAIN, now + TONE_RAMP_S);
        }
        await sleep(5);
      }
      gain.gain.value = 0;
      window.__shotTones.setSettings({ tempoBpm: DEFAULT_TEMPO_BPM });
    },

    // What the lead run shows right now, for a driver to wait on or verify.
    leadSnapshot() {
      const lead = window.__session.snapshot().lead;
      return {
        phase: lead.phase,
        position: lead.target?.position ?? null,
        heldFraction: lead.heldFraction,
        justHeld: lead.justHeld,
      };
    },
  };
})();
