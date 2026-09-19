---
type: Spec Delta
title: theory.circle-of-fifths — delta for 001-the-circle
description: Creates the interactive circle of fifths and its key view.
resource: /changes/001-the-circle/delta/theory/circle-of-fifths.md
status: stable
tags: [sdd, delta, "change:001-the-circle", "context:theory"]
sources:
  - resource: /specs/theory/circle-of-fifths.md
  - resource: /changes/001-the-circle/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T18:45:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T16:28:20Z
  - by: human:merlin-webster
    at: 2026-09-19T18:31:11Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_phase: approved
---

# Delta: theory / circle-of-fifths

> What this change does to the living spec `specs/theory/circle-of-fifths.md`,
> and nothing else. The capability does not exist yet; this delta is all
> ADDED and the merge creates it.

## ADDED

### REQ-001: The circle shows both rings

THE SYSTEM SHALL display the circle of fifths as twelve positions ordered by
fifths clockwise from C at the top, with the major keys on the outer ring and
each major key's relative natural minor on the inner ring, every key on
either ring selectable

**Scenarios**
- **REQ-001/S1 — the rings are complete and aligned**
  Given the circle is displayed
  When its positions are read clockwise from the top
  Then the outer ring runs C, G, D, A, E, B/C♭, F♯/G♭, C♯/D♭, A♭, E♭, B♭, F
  and the inner ring shows each key's relative minor aligned with it
  (A minor with C major, E minor with G major, and so on)
- **REQ-001/S2 — a minor key is selectable in its own right**
  Given the circle is displayed
  When E minor is selected on the inner ring
  Then the key view shows E natural minor — one sharp (F♯), root E — and
  names G major as the relative major

### REQ-002: Enharmonic positions show both spellings

THE SYSTEM SHALL show both spellings at the three enharmonic positions
(B/C♭, F♯/G♭, C♯/D♭) and SHALL spell the selected key's scale according to
the spelling chosen

**Scenarios**
- **REQ-002/S1 — both spellings visible**
  Given the circle is displayed
  When the position at six o'clock is read
  Then it offers both F♯ major and G♭ major
- **REQ-002/S2 — the chosen spelling drives the accidentals**
  Given the enharmonic position F♯/G♭
  When G♭ major is selected
  Then the key view is spelled entirely in flats (6 flats), and selecting
  F♯ major instead spells it entirely in sharps (6 sharps)

### REQ-003: The key view shows the key on the instrument

WHEN a key is selected
THE SYSTEM SHALL display that key's signature on a stave together with every
note of the key within the selected variant's playable range, ordered lowest
to highest, with every occurrence of the root visually emphasised, and the
relative key named

**Scenarios**
- **REQ-003/S1 — G major on the flute (acceptance)**
  Given the selected variant is flute Concert (C4–C7)
  When G major is selected
  Then the stave carries a one-sharp signature (F♯), the notes run from C4
  up to C7 using only G-major notes, every G is emphasised, and E minor is
  named as the relative minor
- **REQ-003/S2 — the display follows the variant's range**
  Given G major is selected on Ocarina Alto C (A4–F6)
  When the variant is changed to Ocarina Bass C (A3–F5)
  Then every displayed note moves down exactly one octave

### REQ-004: The new accidental is highlighted

WHEN a key with at least one accidental is selected
THE SYSTEM SHALL highlight the accidental that is new relative to the key
with one fewer accidental, and SHALL highlight nothing for a key with no
accidentals

**Scenarios**
- **REQ-004/S1 — G major's new sharp**
  Given G major is selected
  When the key view is displayed
  Then F♯ is highlighted as new (C major, one step back, has none)
- **REQ-004/S2 — B♭ major's new flat**
  Given B♭ major is selected
  When the key view is displayed
  Then E♭ is highlighted as new (F major has only B♭)
- **REQ-004/S3 — C major has nothing to highlight**
  Given C major is selected
  When the key view is displayed
  Then no accidental is highlighted

### REQ-005: No displayed note leaves the range

THE SYSTEM SHALL never display a note outside the selected variant's playable
range

**Scenarios**
- **REQ-005/S1 — property over every key and variant**
  Given each of the 15 selectable major spellings and 12 minor keys, on each
  catalogued variant
  When its key view is displayed
  Then every displayed note lies within that variant's range

### REQ-006: Neighbouring keys differ by exactly one accidental

THE SYSTEM SHALL order the circle so that any two neighbouring keys differ by
exactly one accidental

**Scenarios**
- **REQ-006/S1 — property around the circle**
  Given every pair of clockwise neighbours on the outer ring
  When their key signatures are compared
  Then exactly one accidental separates each pair

### REQ-007: Note names can be hidden

THE SYSTEM SHALL show a note name with each displayed note by default, and
WHEN the note-names toggle is switched off THE SYSTEM SHALL hide all note
names until it is switched on again

**Scenarios**
- **REQ-007/S1 — names hidden for self-testing**
  Given the key view for G major with note names showing
  When the toggle is switched off
  Then the same notes remain on the stave with no names shown
- **REQ-007/S2 — the choice sticks**
  Given note names were toggled off
  When another key is selected
  Then names remain hidden

### REQ-008: The tool reopens where it was left

WHEN the tool starts
THE SYSTEM SHALL restore the last selection (instrument variant, key, and
note-names toggle) stored on the device; IF nothing is stored or the stored
selection is unreadable THEN THE SYSTEM SHALL show C major on the flute with
note names on

**Scenarios**
- **REQ-008/S1 — resuming mid-week practice**
  Given the tool was closed showing B♭ major on Ocarina Bass C with names
  hidden
  When it is reopened
  Then it shows B♭ major on Ocarina Bass C with names hidden
- **REQ-008/S2 — first run**
  Given no stored selection exists
  When the tool starts
  Then it shows C major on the flute with note names on
- **REQ-008/S3 — corrupt stored selection**
  Given the stored selection is unreadable
  When the tool starts
  Then it shows C major on the flute with note names on, and the tool is
  fully usable
