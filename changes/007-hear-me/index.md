# Change 007-hear-me

- [hear-me — intent](intent.md) — Intent · resolved — Hear the learner: a live pitch readout — nearest note, sharp or flat in cents — inside the latency budget, useful alone as a tuner
- [007-hear-me — notes](notes.md) — Implementation Notes — Decisions taken during implementation that the plan did not cover.
- [Hear me — plan](plan.md) — Implementation Plan · approved — A zero-crate Rust listening crate in the shared AudioWorklet detects pitch by normalised autocorrelation (MPM) and publishes PitchDetected; the session aggregate owns the tuner beside the transport and the drone so nothing sounds while it listens; a second screen in the UI; a Playwright harness feeds the microphone from the page's own AudioContext and measures the 100 ms budget.
- [Hear me — a tuner that proves listening](proposal.md) — Change Proposal · approved — A tuner screen hears the instrument and shows the nearest note and how far sharp or flat, within 100 ms, with an optional pinned target — the listening context's first capability, measured against Article V.
- [Hear me — tasks](tasks.md) — Task List · in-progress — 25 tasks across 5 phases — the listening crate and its contract, the session holding the tuner, the tuner screen, the measured harness, hardening.
- [record/](record/index.md)
