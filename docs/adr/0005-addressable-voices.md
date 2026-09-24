---
type: Architecture Decision Record
title: ADR 0005 — Voices are addressable; a voice may have no end
description: The sound context's voice model widens from fire-and-forget tones and clicks to voices that can be retuned and stopped by tag, and a length that may be "until stopped" — because a drone must be bent and released by name while it sounds.
resource: /docs/adr/0005-addressable-voices.md
status: stable
tags: [sdd, adr, sound, "change:004-the-drone"]
sources:
  - resource: /changes/004-the-drone/plan.md
  - resource: /changes/004-the-drone/intent.md
  - resource: /docs/adr/0003-rust-owns-the-audio-boundary.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T16:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T15:12:56Z
sdd_phase: accepted
---

# ADR 0005: Voices are addressable; a voice may have no end

## Context

Since 003 the `sound` context renders **fire-and-forget** voices: a tone
or click is posted with an onset frame and a duration, renders across
that range, reports its onset once, and is dropped. The only control after
posting is `stop_all`, which fades everything over 5 ms. `docs/domain.md`
describes the Voice noun accordingly: "a tone or click with an onset in
audio frames".

004 adds a drone: a voice that sounds until the learner stops it, whose
pitch must glide when the key changes and whose sound (pure / warm / reed)
must change without a gap. None of that fits a duration-bounded voice that
cannot be addressed after posting. The practice context, meanwhile, needs
to end one tapped note early (a retap) without silencing the drone it
sounds over — `stop_all` is the wrong instrument.

## Decision

Voices are **addressable by tag** after posting. `sound/published`'s
`SoundCommand` gains `retune(tag, hz)` and `stop(tag)`, mirrored in the
crate's C ABI; `stop_all` keeps its meaning. A voice's length is a sum —
`Frames(n)` or `UntilStopped` — and every voice kind carries its own
release, applied by `stop`, `stop_all` and the natural end alike (5 ms for
a tone or click, as today; the drone's own release for a drone). A new
voice kind, `Drone`, is open-ended, glides linearly to a retuned target,
and renders one of three additive, band-limited harmonic tables.

The command contract stays schema-first (Zod on the host, the C ABI in
Rust); nothing about who decides *what* to play or *when* moves: practice
posts, sound renders.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep fire-and-forget; render the drone as a chain of long tones | Retune and sound change need stop + start: a gap or a click; the pool fills with re-posts |
| A separate "drone" engine beside the voice pool | Two render paths to keep click-free and to mix; the drone is a voice with two more verbs, not a different thing |
| Render the drone in TypeScript with Web Audio nodes (the prototype's way) | Makes practice bilingual with the audio boundary — ADR 0001/0003 |
| `retune`/`stop` as fields of a re-posted `tone` (upsert by tag) | Conflates "start a voice" with "change a voice"; a schema that can mean either is harder to validate and read |

## Consequences

**Accepted costs**
- The worklet shim dispatches five commands instead of three; the fake
  sound port in tests records and matches stops and retunes by tag.
- A tag now has a lifetime beyond the onset report; practice mints
  distinct tags for drones (`3_000_000+`) and taps (`2_000_000+`) so a
  crossfade's two drone voices are distinguishable.

**Enabled**
- 009 (temperament) retunes the drone by posting `retune`, nothing else.
- Any future held or expressive voice (a sustained target in
  learner-leads, say) has its verbs already.

**Revisit if**
- The additive tables prove too costly on the phone's audio thread — then
  a wavetable per sound replaces per-sample sines behind the same commands.
