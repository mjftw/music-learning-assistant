---
type: Decision Record
title: ADR 0002 — The notation renderer follows the design, not engraving convention
description: VexFlow is removed; the stave is hand-drawn SVG whose geometry is copied from the Function Paper prototype.
resource: /docs/adr/0002-hand-drawn-stave-replaces-vexflow.md
status: stable
tags: [sdd, adr, ui]
sources:
  - resource: conversation:2026-09-20
  - resource: /changes/002-circle-redesign/plan.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T20:10:00Z
verified: []
---

# ADR 0002 — The notation renderer follows the design, not engraving convention

**Status:** accepted 2026-09-20

## Context

001 chose VexFlow for the stave: correct engraving out of the box, and at
that point the design bar was "shows the right notes". 002's acceptance bar
is different — pixel fidelity to the "Circle 1c Function Paper" prototype,
which draws its own deliberately simplified notation: plain tilted-ellipse
noteheads, fixed-length stems, text-glyph key signatures, computed ledger
lines. The user's standing decision is that the prototype wins on every
visual divergence.

## Decision

Remove VexFlow. The stave is hand-drawn SVG in React whose geometry
(line spacing, notehead radii by density, stem rules, ledger-line rules,
signature positions) is copied from the prototype's constants into named
constants — never re-derived by eye. The prototype file is the single
visual reference.

## Consequences

- The acceptance side-by-side can actually be won: both pictures come from
  the same drawing rules.
- Note *content* stays pinned by the theory scenario tests; only placement
  is hand-owned, and it is ~150 lines of named-constant geometry.
- Engraving niceties (beaming, accidental collision layout, proportional
  spacing) are gone. Nothing in the product roadmap needs them; a future
  change that does must revisit this ADR rather than bolt them on.
- The jsdom canvas stub in the test setup becomes removable — the hand-drawn
  stave needs no text measurement.
- Reversal: reinstate the dependency and re-grow the old component from
  001's history; the theory interface (`keyView`, `spanNotesOf`) is
  renderer-agnostic either way.
