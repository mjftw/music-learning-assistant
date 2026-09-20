---
type: Spec Delta
title: theory.instruments — delta for 001-the-circle
description: Creates the instrument catalogue — tiered instrument → variant, ranges as data.
resource: /changes/001-the-circle/delta/theory/instruments.md
status: stable
tags: [sdd, delta, "change:001-the-circle", "context:theory"]
sources:
  - resource: /specs/theory/instruments.md
  - resource: /changes/001-the-circle/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T18:45:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T16:28:20Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_capability: instruments
sdd_phase: approved
---

# Delta: theory / instruments

> What this change does to the living spec `specs/theory/instruments.md`,
> and nothing else. The capability does not exist yet; this delta is all
> ADDED and the merge creates it.

## ADDED

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
