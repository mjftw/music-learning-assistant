---
type: Spec Delta
title: theory.temperament — delta for 007-hear-me
description: Adds the inverse of REQ-001 — the nearest note to a frequency, with the offset in cents, spelled per the preference.
resource: /changes/007-hear-me/delta/theory/temperament.md
status: draft
tags: [sdd, delta, "change:007-hear-me", "context:theory"]
sources:
  - resource: /specs/theory/temperament.md
  - resource: /changes/007-hear-me/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T23:30:00Z
verified: []
sdd_id: 007-hear-me
sdd_context: theory
sdd_capability: temperament
---

# Delta: theory / temperament

> What this change does to the living spec `specs/theory/temperament.md`,
> and nothing else. The living spec's highest requirement is REQ-001; this
> delta adds REQ-002.

## ADDED

### REQ-002: Every frequency has a nearest note

THE SYSTEM SHALL give, for any frequency greater than zero, the nearest
note under equal temperament with A4 = 440 Hz and the offset from that
note in cents (−50 to +50, a frequency exactly halfway belonging to the
upper note at −50), and SHALL spell an enharmonic note per the ♯/♭
spelling preference

**Scenarios**
- **REQ-002/S1 — a little sharp of A**
  Given equal temperament
  When the nearest note to 445.0 Hz is read
  Then it is A4, +20 cents (to the whole cent); for 436.0 Hz it is A4,
  −16 cents; for 440.0 Hz it is A4, 0
- **REQ-002/S2 — the ends of the tuner's range**
  Given equal temperament
  When the nearest notes to 82.41 Hz and 2093.00 Hz are read
  Then they are E2, 0 cents and C7, 0 cents
- **REQ-002/S3 — spelled per the preference**
  Given equal temperament
  When the nearest note to 466.16 Hz is read with sharp spelling preferred,
  then with flat
  Then it is A♯4 then B♭4, 0 cents either way
- **REQ-002/S4 — halfway belongs to the note above**
  Given equal temperament
  When the nearest note to 452.89 Hz (50 cents above A4) is read
  Then it is A♯4 (or B♭4), −50 cents; for 452.8 Hz it is A4, +50
- **REQ-002/S5 — the inverse of REQ-001 (invariant)**
  Given every note from A0 to C8
  When its pitch under REQ-001 is read and the nearest note to that pitch
  is read back
  Then it is the same note at 0 cents
