---
type: Spec Delta
title: theory.temperament — delta for 003-hear-the-scale
description: Creates the temperament capability with one requirement — every note has a pitch in equal temperament at A4 = 440 Hz — so that playback can sound notes; 007 adds just temperament
resource: /changes/003-hear-the-scale/delta/theory/temperament.md
status: stable
tags: [sdd, delta, "change:003-hear-the-scale", "context:theory"]
sources:
  - resource: /specs/theory/temperament.md
  - resource: /changes/003-hear-the-scale/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T17:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:09:58Z
sdd_id: 003-hear-the-scale
sdd_context: theory
sdd_capability: temperament
sdd_phase: approved
---

# Delta: theory / temperament

> What this change does to the living spec `specs/theory/temperament.md`,
> and nothing else. The capability does not exist yet: this delta is all
> ADDED from REQ-001 and the merge creates it.

## ADDED

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
