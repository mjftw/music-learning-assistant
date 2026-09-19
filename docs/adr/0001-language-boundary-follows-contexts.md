---
type: Decision Record
title: ADR 0001 — The language boundary follows the context boundary
description: Rust owns the listening context (as WASM); TypeScript owns theory, practice and the UI; they meet only at the PitchDetected event.
resource: /docs/adr/0001-language-boundary-follows-contexts.md
status: stable
tags: [sdd, adr, architecture]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/domain.md
  - resource: /docs/engineering.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T20:05:00Z
verified: []
---

# ADR 0001 — The language boundary follows the context boundary

**Status:** accepted 2026-09-19

## Context

The product is a TypeScript web app for the user-facing work, but the user's
architecture direction is "Rust is the brain, TS the view", and slice 004
(`hear-me`) brings a genuinely latency-critical engine: live pitch detection
under Article V's numbered budget. Decided up front, before any code, to
prevent the same logic ever living in two languages ("split brain").

## Decision

No bounded context is ever bilingual. The language split coincides exactly
with the context map in `docs/domain.md`:

- **Rust owns `listening`** — mic capture processing, pitch detection, DSP,
  anything under the latency budget. It ships as WebAssembly running in the
  browser's audio pipeline, which preserves the static, no-server deployment
  (Article VII). Moving it to a native server process later would not move
  the boundary.
- **TypeScript owns `theory`, `practice`, and the UI** — theory feeds rich
  structured data to the view on every interaction; practice is
  orchestration; the view is TS's natural ground.
- **The seam is the already-approved event contract**: `PitchDetected` from
  `listening/published`, schema-first in a language-neutral schema (JSON
  Schema), enforced by serde on the Rust side and Zod at the TypeScript
  adapter. The language boundary adds no new interface to the domain map.

## Consequences

- Split brain is structurally prevented: duplicate logic would require a
  bilingual context, which this ADR forbids.
- Slices 001–003 are pure TypeScript; the Rust toolchain
  (wasm-bindgen/wasm-pack) arrives with 004 and is scoped to
  `src/listening/`.
- The `PitchDetected` schema must stay language-neutral; neither side's
  native types are the contract.
- If a future engine (e.g. synthesis quality in `practice`) develops a
  measured performance need, the remedy is moving that *whole capability*
  across the map (its own ADR), never splitting a context across languages.
- Rejected: all domain logic in Rust with TS rendering only — WASM
  serialisation on every UI interaction, a doubled toolchain from day one,
  and UI-adjacent logic creeping into TS anyway (the very split brain it
  tries to avoid).
