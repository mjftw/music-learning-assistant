---
type: Architecture Decision Record
title: ADR 0006 — Pitch detection by normalised autocorrelation, on the shared audio thread
description: The listening context detects pitch with the McLeod Pitch Method (NSDF) in a zero-crate Rust worklet that shares synthesis's AudioContext — not an FFT, not a second context, not the main thread — because the budget is 100 ms down to E2 within ±2 ¢ and the flute is harmonic-rich.
resource: /docs/adr/0006-pitch-detection-by-normalised-autocorrelation.md
status: draft
tags: [sdd, adr, listening, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/plan.md
  - resource: /changes/007-hear-me/intent.md
  - resource: /docs/adr/0003-rust-owns-the-audio-boundary.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-28T00:30:00Z
verified: []
sdd_phase: accepted
---

# ADR 0006: Pitch detection by normalised autocorrelation, on the shared audio thread

## Context

Change 007 builds the listening context: the microphone captured and a
detected pitch published inside Article V's budget — 100 ms from the sound
starting in the signal to the readout, every note from E2 (82.41 Hz) to C7
(2093 Hz) within ±2 ¢ on a steady tone, at least twenty readings a second,
nothing for silence, breath or noise, and never an octave out on a
harmonic-rich flute tone (`listening.pitch-detection/REQ-002`, `REQ-004`).
ADR 0001 and ADR 0003 already fix that listening is Rust compiled to
WebAssembly on the browser's audio thread, beside synthesis.

Two things were open: the detection method, and whether listening gets its
own `AudioContext` or shares synthesis's.

## Decision

**The McLeod Pitch Method.** Each hop of 512 frames, the last 2048 frames
are analysed by the normalised square-difference function over lags from
2200 Hz down to 70 Hz; the first key maximum within 0.93 of the global
maximum is picked and refined by parabolic interpolation; its NSDF value is
the clarity, published as the detection's confidence, and a detection
below a clarity threshold is not published at all.

**One AudioContext.** `main.tsx` memoises a single context factory and
hands it to both the sound and the listening adapters. Listening's worklet
node hangs off a `MediaStreamAudioSourceNode` in the same graph; both
worklets stamp frames on the same clock, so a detection's `atFrame` and a
scheduled onset's frame are directly comparable, and the harness that
measures the budget can feed the microphone from inside that same context
with exact onset frames.

## Alternatives considered

| Option | Why not |
|---|---|
| FFT peak picking | ±2 ¢ at E2 is ~0.1 Hz, which an FFT reaches only with a window far longer than 100 ms; and a flute's second harmonic is often the loudest bin — the octave error the spec forbids |
| YIN | Same family, same cost and accuracy; MPM's clarity is a ready-made confidence and its key-maximum rule is less octave-prone on harmonic-rich tones. YIN is the fallback if MPM's threshold proves unstable on the real flute |
| Zero-crossing period counting | Cannot reach ±2 ¢ on a tone whose harmonics add crossings |
| A second AudioContext for listening | Two audio threads, two clocks to map onto each other for the age check and the harness; ADR 0003's one-audio-thread architecture argues the other way |
| `AnalyserNode` polled from the main thread | Not clocked: the moment a buffer reflects is a guess, and the main thread is where paint contends — Article V wants the measurement at the source |

## Consequences

**Accepted costs**
- ~1.4 million multiply-adds per hop at 48 kHz; the plan's first task
  benchmarks it and the phone decides. The knobs, in order: a 1024 hop, a
  sparser lag grid above 300 Hz, ×2 downsampling for the low lags, a
  1536 window (which puts E2's ±2 ¢ at risk — E2 is the intent's first
  cut).
- The shared context is created at the first gesture that needs it — the
  first ▶ *or* the first entry to the tuner — instead of only at ▶. The
  003 pre-flight (one context per session) still holds.

**Enabled**
- A detection's time and a scheduled onset's time are the same currency;
  the 100 ms rule is enforced by arithmetic on frames, and measured the
  same way.
- 008 learner-leads consumes the same `PitchDetected` with no change to
  listening.

**Revisit if**
- The spike cannot bring MPM under budget on the phone even at the last
  knob — then YIN at a smaller window, or a hybrid (autocorrelation for the
  period, a short FFT to refine it).
- A browser cannot attach a worklet to a microphone stream in a context
  that also drives output — then a second context, with a documented clock
  mapping.
