---
type: Architecture Decision Record
title: ADR 0003 — Rust owns the audio boundary
description: Amends ADR 0001 — a fourth bounded context, sound (synthesis), joins listening as Rust compiled to WebAssembly running in the browser's audio thread; the language split still follows the context map.
resource: /docs/adr/0003-rust-owns-the-audio-boundary.md
status: draft
tags: [sdd, adr, architecture, "change:003-hear-the-scale"]
sources:
  - resource: /changes/003-hear-the-scale/plan.md
  - resource: /changes/003-hear-the-scale/intent.md
  - resource: /docs/adr/0001-language-boundary-follows-contexts.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T18:10:00Z
verified: []
sdd_phase: accepted
---

# ADR 0003: Rust owns the audio boundary

## Context

ADR 0001 fixed the rule — no bounded context is ever bilingual; the
language split coincides with the context map — and applied it to the map
as it stood: Rust owns `listening`, TypeScript owns `theory`, `practice`
and the UI, Rust arrives with hear-me. It anticipated this moment: "if a
future engine (e.g. synthesis quality in `practice`) develops a need, the
remedy is moving that *whole capability* across the map (its own ADR),
never splitting a context across languages."

Change 003 makes sound. The user's stated preference (2026-09-22) is that
audio generation belongs in Rust alongside audio listening. `docs/domain.md`
puts "sounding notes" in `practice`, which is orchestration and stays
TypeScript. Synthesis is also the second thing that will run on the
browser's audio thread; listening (005) is the first. One audio-thread
architecture is preferable to two.

Constraints: the deployment stays a static bundle (Article VII); the
timing numbers (±5 ms onset) require the audio clock; the Rust toolchain
is not yet installed on the development machine; Article VIII counts a
second language as a cost. Preference, labelled as such: Rust for audio.

## Decision

We add a fourth bounded context, **`sound`**, to `docs/domain.md`. It owns
synthesis: given tones and clicks with onsets in audio frames, it renders
samples on the audio thread and reports when each onset actually rendered.
It does not decide what to play or when (`practice`) nor what pitch a note
has (`theory`).

**Rust owns the audio boundary: `sound` and `listening`.** Both compile to
WebAssembly and run inside an `AudioWorkletProcessor`. Each context's
`published/` carries a schema-first message contract (`SoundCommand` and
`OnsetReport` for `sound`; `PitchDetected` for `listening`) validated by
Zod on the TypeScript side and serde on the Rust side.

The AudioWorklet host shim — the few dozen lines of TypeScript that
instantiate the WASM module in the worklet scope, move messages and copy
sample buffers — lives in the Rust context's `published/` directory. It is
boundary plumbing with no domain logic, and ADR 0001's "never bilingual"
rule is read as applying to domain logic: a context's rules live in one
language.

ADR 0001 is amended, not superseded: its rule stands; its list of who owns
what gains `sound`, and "Rust arrives with 004/005" becomes "Rust arrives
with 003".

## Alternatives considered

| Option | Why not |
|---|---|
| Synthesis as a Rust adapter inside `practice` | Makes `practice` bilingual — exactly what ADR 0001 forbids, and the split brain it exists to prevent |
| Web Audio nodes in TypeScript, no Rust until 005 | Simplest and sufficient for 003 alone; rejected on the user's preference and because 005 needs the worklet architecture anyway — building it twice is the larger cost. Remains the **fallback**: same `SoundPort`, `sound` deleted, Rust at 005 |
| All of `practice` in Rust | Transport is UI-adjacent orchestration; serialising every state change across WASM for the view is the cost ADR 0001 already rejected |
| wasm-bindgen glue | Does not load cleanly in the worklet scope; a bare `extern "C"` ABI over shared memory is smaller and readable |

## Consequences

**Accepted costs**
- A second toolchain from change 003: rustup, the `wasm32` target,
  rustfmt/clippy/cargo test folded into `pnpm check`, a workspace
  `Cargo.toml` at the root (the accepted root-config exception).
- A build step (`scripts/build-sound.sh`) before dev, test and build.
- WASM-in-worklet compatibility on the user's phone is a risk taken early
  (first task) rather than late.

**Enabled**
- One audio-thread architecture serving 003 (sound), 004 (drone) and 005
  (listening): worklet loading, message schemas, onset/latency reporting
  are built once.
- Latency measured at the source: the audio thread reports onsets; Article
  V's numbers are tested, not estimated.
- No context is bilingual; the map and the languages still coincide.

**Revisit if**
- The worklet + WASM path cannot run on the user's phone browser after the
  spike task — take the fallback, delete `sound`, and Rust arrives at 005.
- A second consumer of synthesis (the drone, 004) turns out to want a
  different engine — that is a sign the `sound` context's contract is too
  narrow, not that the boundary is wrong.
