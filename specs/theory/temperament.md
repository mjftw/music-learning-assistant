---
type: Capability Spec
title: theory / temperament
description: <one sentence — what this capability does for its users>
resource: /specs/theory/temperament.md
status: stable
tags: [sdd, capability, "context:theory"]
sources:
  - resource: /changes/003-hear-the-scale/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-23T13:43:58Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T13:43:59Z
sdd_context: theory
sdd_capability: temperament
sdd_version: 0.1.0
sdd_phase: current
---

# theory / temperament

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `theory.temperament/REQ-NNN` and a scenario as
> `theory.temperament/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

The "Hear the Scale" prototype (Claude Design, iterated by the user; vendored at `design/hear-the-scale.dc.html`) is the source of truth for the screen. Below the key panel a transport card plays and stops the traversal, shows the note sounding and where it is in the sequence, and steps the tempo with its Italian name shown; a row summarising the traversal opens the Traversal sheet — direction, octaves, shape, sound, and the loop / count-in / rest bar toggles. The Span pills are gone: the traversal decides what the stave and names view show, and the note that is sounding lights up as it sounds, in time. A learner can pick G major on the flute, tap ▶, hear a bar counted in and the scale played up and down at Andante, and play along.

## Requirements

### REQ-001: Every note has a pitch

THE SYSTEM SHALL give every note a pitch in hertz under equal temperament
with A4 = 440 Hz — each semitone a ratio of the twelfth root of two — and
SHALL give enharmonic spellings of the same note the same pitch

**Scenarios**
- **REQ-001/S1 — reference and neighbours**
  Given equal temperament
  When the pitches of A4, A5, C4 and F♯5 are read
  Then they are 440 Hz, 880 Hz, 261.63 Hz and 739.99 Hz (to two decimals)
- **REQ-001/S2 — spelling does not change the pitch**
  Given equal temperament
  When the pitches of F♯4 and G♭4, and of E♯5 and F5, are read
  Then each pair is identical
- **REQ-001/S3 — the whole catalogue is sounded**
  Given every note within every catalogued variant's range
  When its pitch is read
  Then it is a positive number, and pitches rise strictly with the note

_Since 003-hear-the-scale_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-23 | 003-hear-the-scale | 1 | 0 | 0 |
