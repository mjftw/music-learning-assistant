---
type: Capability Spec
title: theory / instruments
description: <one sentence — what this capability does for its users>
resource: /specs/theory/instruments.md
status: stable
tags: [sdd, capability, "context:theory"]
sources:
  - resource: /changes/001-the-circle/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-20T18:53:01Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T18:53:08Z
sdd_context: theory
sdd_capability: instruments
sdd_version: 0.1.0
sdd_phase: current
---

# theory / instruments

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `theory.instruments/REQ-NNN` and a scenario as
> `theory.instruments/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

An interactive circle of fifths replaces the paper one. The user picks an instrument variant and a key; the stave shows that key's signature and every note of the key the instrument can play, lowest to highest, root emphasised, with the newly introduced accidental highlighted and the relative key named. Note names can be hidden for self-testing. The tool reopens where it was left.

## Requirements

### REQ-001: Tiered instrument catalogue

THE SYSTEM SHALL provide a catalogue of instruments organised in two tiers —
instrument, then variant — where every variant carries a playable range
(lowest note to highest note), and selection is always of a variant

**Scenarios**
- **REQ-001/S1 — the v1 catalogue**
  Given the built-in catalogue
  When the instruments are listed
  Then two instruments appear — flute and ocarina — where flute has one
  variant (Concert, range C4–C7) and ocarina has two variants
  (Alto C, range A4–F6; Bass C, range A3–F5)
- **REQ-001/S2 — a variant is always the unit of selection**
  Given the instrument "ocarina" is chosen
  When the user completes a selection
  Then the selection names a variant (e.g. Alto C), never a bare instrument

_Since 001-the-circle_

### REQ-002: Variants are data, added over time

WHEN a valid variant definition is present at startup
THE SYSTEM SHALL include that variant in the catalogue without any change to
the tool itself

**Scenarios**
- **REQ-002/S1 — a new variant appears**
  Given a valid variant definition for "Ocarina Soprano G, range D5–B6" has
  been added
  When the tool starts
  Then the ocarina instrument lists three variants, including Soprano G with
  range D5–B6

_Since 001-the-circle_

### REQ-003: Invalid variant definitions never take the tool down

IF a variant definition fails validation at startup
THEN THE SYSTEM SHALL exclude that variant, present a visible and
non-interrupting notice naming the definition and the problem, and start
with every valid variant available

**Scenarios**
- **REQ-003/S1 — one bad file among good ones**
  Given a variant definition whose range is malformed (highest note below
  lowest) alongside the three valid built-ins
  When the tool starts
  Then the catalogue contains exactly the three valid variants, and a notice
  names the failing definition and states the range is invalid, without
  blocking any interaction
- **REQ-003/S2 — the notice does not interrupt**
  Given the notice from S1 is shown
  When the user selects a key without acknowledging the notice
  Then the selection behaves exactly as it would with no notice present

_Since 001-the-circle_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-20 | 001-the-circle | 3 | 0 | 0 |
