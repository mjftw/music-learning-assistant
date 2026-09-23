---
type: Capability Spec
title: theory / circle-of-fifths
description: <one sentence — what this capability does for its users>
resource: /specs/theory/circle-of-fifths.md
status: stable
tags: [sdd, capability, "context:theory"]
sources:
  - resource: /changes/001-the-circle/proposal.md
  - resource: /changes/002-circle-redesign/proposal.md
  - resource: /changes/003-hear-the-scale/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-20T18:53:01Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T18:53:08Z
  - by: human:merlin-webster
    at: 2026-09-22T15:53:54Z
  - by: human:merlin-webster
    at: 2026-09-23T13:43:59Z
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_version: 1.0.0
sdd_phase: current
---

# theory / circle-of-fifths

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `theory.circle-of-fifths/REQ-NNN` and a scenario as
> `theory.circle-of-fifths/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

An interactive circle of fifths replaces the paper one. The user picks an instrument variant and a key; the stave shows that key's signature and every note of the key the instrument can play, lowest to highest, root emphasised, with the newly introduced accidental highlighted and the relative key named. Note names can be hidden for self-testing. The tool reopens where it was left.

## Requirements

### REQ-001: The circle shows both rings

THE SYSTEM SHALL display the circle of fifths as twelve positions ordered by
fifths clockwise from C at the top, with the major keys on the outer ring and
each major key's relative natural minor on the inner ring, every key on
either ring selectable

**Scenarios**
- **REQ-001/S1 — the rings are complete and aligned**
  Given the circle is displayed with sharp spelling preferred
  When its positions are read clockwise from the top
  Then the outer ring runs C, G, D, A, E, B, F♯, C♯, A♭, E♭, B♭, F and the
  inner ring shows each key's relative minor aligned with it (A minor with
  C major, E minor with G major, and so on)
- **REQ-001/S2 — a minor key is selectable in its own right**
  Given the circle is displayed
  When E minor is selected on the inner ring
  Then the key title reads E minor, the key view shows E natural minor —
  one sharp (F♯), root E — and the E minor wedge sits aligned with G major,
  its relative, on the outer ring

_Changed by 002-circle-redesign_

### REQ-002: One spelling preference governs the enharmonic positions

THE SYSTEM SHALL spell the three enharmonic positions (B/C♭, F♯/G♭, C♯/D♭,
and their relative minors) according to a single global ♯/♭ spelling
preference, SHALL spell the selected key's scale accordingly, and WHEN the
preference changes while such a position is selected THE SYSTEM SHALL keep
that position selected, respelled

**Scenarios**
- **REQ-002/S1 — the preference respells all three positions at once**
  Given the circle is displayed with sharp spelling preferred
  When the preference is switched to flat
  Then the three positions read C♭, G♭ and D♭ on the outer ring (A♭m, E♭m,
  B♭m on the inner) where they read B, F♯ and C♯ (G♯m, D♯m, A♯m) before,
  and the other nine positions are unchanged
- **REQ-002/S2 — the chosen spelling drives the accidentals**
  Given the position at six o'clock is selected with flat spelling
  preferred, as G♭ major
  When the key view is displayed
  Then it is spelled entirely in flats (6 flats); and switching the
  preference to sharp keeps the same position selected as F♯ major, spelled
  entirely in sharps (6 sharps)

_Changed by 002-circle-redesign_

### REQ-003: The key view shows the key on the instrument

WHEN a key is selected
THE SYSTEM SHALL display that key's signature — in the circle's centre and
on the stave view's stave — and, in the stave view, the traversal's run
(`REQ-012`) ordered lowest to highest with every occurrence of the root
visually emphasised, together with a summary of how many in-range notes
the key has and their extremes; and, in the names view, the key's seven
notes in scale order

**Scenarios**
- **REQ-003/S1 — G major on the flute (acceptance)**
  Given the selected variant is flute Concert (C4–C7), stave view, full
  range, scale
  When G major is selected
  Then the signature shows one sharp (F♯) in the circle's centre and on the
  stave, the stave's notes run from C4 up to C7 using only G-major notes
  with every G emphasised, and the summary reads 22 notes, C4–C7
- **REQ-003/S2 — the display follows the variant's range**
  Given G major is selected on Ocarina Alto C (A4–F6) in stave view, full
  range
  When the variant is changed to Ocarina Bass C (A3–F5)
  Then every displayed note moves down exactly one octave
- **REQ-003/S3 — the names view shows the scale itself**
  Given G major is selected in the names view
  When the panel is read
  Then it shows the seven notes G A B C D E F♯ in scale order, regardless
  of the selected variant's range or the traversal
- **REQ-003/S4 — the stave shows the traversal's run, the summary the key**
  Given G major on flute Concert in stave view
  When the traversal is set to 2 oct, arpeggio
  Then the stave shows exactly G4 B4 D5 G5 B5 D6 G6 while the summary still
  reads 22 notes, C4–C7

_Changed by 003-hear-the-scale_

### REQ-004: The new accidental is accented where accidentals are listed

WHEN a key with at least one accidental is selected
THE SYSTEM SHALL accent the newest accidental — the one this key adds
relative to the key with one fewer — within the displayed key signature,
and, in the names view, SHALL mark each accidental-bearing note with its
position in the order accidentals are introduced, accenting the newest;
and SHALL accent nothing for a key with no accidentals

**Scenarios**
- **REQ-004/S1 — G major's new sharp**
  Given G major is selected
  When the key signature is displayed
  Then the F♯ glyph is the accented one, and the names view marks F♯ as the
  first sharp, accented as newest
- **REQ-004/S2 — B♭ major's new flat**
  Given B♭ major is selected
  When the key signature is displayed
  Then the E♭ glyph is accented (F major has only B♭), and the names view
  marks B♭ as flat one and E♭ as flat two, with E♭ accented as newest
- **REQ-004/S3 — C major has nothing to accent**
  Given C major is selected
  When the key view is displayed
  Then no accidental glyph or mark is accented

_Changed by 002-circle-redesign_

### REQ-005: No displayed note leaves the range

THE SYSTEM SHALL never display a note outside the selected variant's playable
range

**Scenarios**
- **REQ-005/S1 — property over every key and variant**
  Given each of the 15 selectable major spellings and their 15 relative
  minor spellings, on each catalogued variant
  When its key view is displayed
  Then every displayed note lies within that variant's range

_Since 001-the-circle_

### REQ-006: Neighbouring keys differ by exactly one accidental

THE SYSTEM SHALL order the circle so that any two neighbouring keys differ by
exactly one accidental

**Scenarios**
- **REQ-006/S1 — property around the circle**
  Given every pair of clockwise neighbours on the outer ring
  When their key signatures are compared
  Then exactly one accidental separates each pair

_Since 001-the-circle_

### REQ-007: The key view has a names view and a stave view

THE SYSTEM SHALL offer the key view as two switchable views — a names view
(the seven notes with their accidental-order marks and, where enabled,
degrees) and a stave view (the traversal's run, notated) — defaulting to
the names view; and WHERE the stave view is active a separate setting SHALL
control whether each notehead is labelled with its name underneath,
defaulting to off

**Scenarios**
- **REQ-007/S1 — switching views**
  Given G major is selected with the names view showing
  When the stave view is chosen
  Then noteheads replace the seven name columns, with no name labels under
  them (the setting defaults to off)
- **REQ-007/S2 — stave names on demand, and the choice sticks**
  Given the stave view is active with note names enabled in settings
  When another key is selected
  Then the new key's noteheads are shown with their names underneath —
  both the view choice and the names setting persist across key changes

_Changed by 003-hear-the-scale_

### REQ-008: The tool reopens where it was left

WHEN the tool starts
THE SYSTEM SHALL restore the stored selection and display preferences —
instrument variant, key, spelling preference, key-view choice, scale
degrees, distance ring, and stave note-names; IF nothing is stored or the
stored state is unreadable THEN THE SYSTEM SHALL show C major on the flute
with sharp spelling, the names view, degrees and distance ring on, and
stave note-names off; IF stored state from an earlier shape is found THEN
THE SYSTEM SHALL keep what it carries and default the rest

**Scenarios**
- **REQ-008/S1 — resuming mid-week practice**
  Given the tool was closed showing B♭ major on Ocarina Bass C, flat
  spelling, stave view, degrees off, ring on, stave names on
  When it is reopened
  Then every one of those choices is restored exactly
- **REQ-008/S2 — first run**
  Given no stored state exists
  When the tool starts
  Then it shows C major on the flute with sharp spelling, the names view,
  degrees and distance ring on, and stave note-names off
- **REQ-008/S3 — corrupt stored state**
  Given the stored state is unreadable
  When the tool starts
  Then it shows the first-run defaults of S2, fully usable
- **REQ-008/S4 — stored state from an earlier shape**
  Given stored state from before 002 (variant, key and the old names toggle
  only), or from 002 (with a span)
  When the tool starts
  Then the variant and key are restored, every display preference the state
  carries is kept, the rest take their S2 defaults, and a stored span is
  ignored

_Changed by 003-hear-the-scale_

### REQ-009: The distance ring shows the key's reach

WHERE the distance ring is enabled
THE SYSTEM SHALL draw an arc spanning exactly the seven circle positions
whose notes belong to the selected key — one position flatward of it through
five sharpward — coloured warm on the sharp side and cool on the flat side,
fading with distance from the selected key, and SHALL label, outside the
arc at each of those positions, the name the selected key gives that note,
visually accented wherever that name differs from the wedge's own fixed
label

**Scenarios**
- **REQ-009/S1 — G major's arc spans its seven notes**
  Given G major is selected with the distance ring enabled
  When the circle is displayed
  Then an arc covers exactly the positions C, G, D, A, E, B and F♯ (one
  flatward, five sharpward of G), and no others
- **REQ-009/S2 — the key's own spelling sits outside the arc**
  Given A major is selected with the distance ring enabled and sharp
  spelling preferred
  When the arc labels are read
  Then the position whose wedge is fixed as A♭ carries the outside label
  G♯ — A major's name for that note — visually accented because it differs
  from the wedge's label
- **REQ-009/S3 — switching the ring off removes everything key-relative**
  Given G major is selected with the distance ring enabled
  When the distance ring is disabled in settings
  Then the arc, the degrees set into it and the outside note names all
  disappear together, while the wedges, their labels and the selection are
  unchanged
- **REQ-009/S4 — a minor key's arc names the notes where they are**
  Given E minor is selected with the distance ring enabled and sharp
  spelling preferred
  When the arc labels are read
  Then the arc covers the same seven positions as its relative G major —
  C, G, D, A, E, B and F♯ — and each carries the outside label of the note
  at that position (C, G, D, A, E, B, F♯), none of them accented, because
  each matches its outer wedge's label

_Since 002-circle-redesign_

### REQ-010: Scale degrees are numbered, or not at all

WHERE scale degrees are enabled
THE SYSTEM SHALL number each note of the selected key 1 through 7 — set
into the distance ring's arc at that note's position, and beneath each note
in the names view — and WHERE scale degrees are disabled THE SYSTEM SHALL
show no degree numbers anywhere

**Scenarios**
- **REQ-010/S1 — degrees on the arc and in the names view agree**
  Given G major is selected with scale degrees and the distance ring enabled
  When the display is read
  Then the arc position at G carries 1, D carries 5, C carries 4 and F♯
  carries 7, and the names view numbers G A B C D E F♯ as 1 2 3 4 5 6 7
- **REQ-010/S2 — disabling degrees clears both places**
  Given degrees are shown in the arc and the names view
  When scale degrees are disabled in settings
  Then no degree number appears anywhere, and notes, names and marks are
  otherwise unchanged
- **REQ-010/S3 — a minor key numbers from its own tonic**
  Given E minor is selected with scale degrees and the distance ring enabled
  When the display is read
  Then the arc position at E carries 1, F♯ carries 2, G carries 3, A
  carries 4, B carries 5, C carries 6 and D carries 7 — the 1 sits at E's
  place on the outer ring, not on the selected E minor wedge — and the names
  view numbers E F♯ G A B C D as 1 2 3 4 5 6 7

_Since 002-circle-redesign_

### ~~REQ-011: The stave shows a chosen span~~

_Removed by 003-hear-the-scale: Superseded: the traversal chosen in `practice.session/REQ-001` decides what the stave shows, and `REQ-012` fits it to the instrument. Span is no longer a concept._

### REQ-012: A traversal is fitted to the instrument and ordered

WHEN a traversal — octaves (a whole-octave count or full range), shape
(scale or arpeggio) and direction (↑, ↓ or ↑↓) — is applied to the selected
key on the selected variant
THE SYSTEM SHALL produce the run: for a whole-octave count n, the key's
notes from the lowest in-range tonic that has the tonic n octaves above it
in range, up to and including that upper tonic; for full range, every
in-range note of the key lowest to highest; for the arpeggio shape, only
those notes of the run whose scale degree is 1, 3 or 5; and SHALL produce
the sequence from the run: ascending for ↑, descending for ↓, ascending
then descending without repeating the top note for ↑↓; and THE SYSTEM SHALL
report which whole-octave counts from 1 to 4 fit (a count fits when such a
run exists)

**Scenarios**
- **REQ-012/S1 — two octaves of G major on the flute**
  Given G major on flute Concert (C4–C7), 2 oct, scale
  When the run and the ↑↓ sequence are produced
  Then the run is the 15 notes G4 A4 B4 C5 D5 E5 F♯5 G5 A5 B5 C6 D6 E6 F♯6
  G6, and the sequence is those 15 ascending followed by the 14 below G6
  descending — 29 notes, a palindrome ending on G4
- **REQ-012/S2 — which counts fit**
  Given flute Concert (C4–C7)
  When the fitting counts are read for C major and for G major
  Then C major fits 1, 2 and 3 (C4–C5, C4–C6, C4–C7) and G major fits 1
  and 2 (G4–G5, G4–G6) but not 3, because G7 is out of range; F♯ major on
  Ocarina Bass C (A3–F5) fits none
- **REQ-012/S3 — an arpeggio keeps the chord tones wherever they fall**
  Given G major on flute Concert, full range, arpeggio
  When the run is produced
  Then it is D4 G4 B4 D5 G5 B5 D6 G6 B6 — the degree-1, 3 and 5 notes of
  every in-range G-major note, starting on D4 because the range starts
  below G4; with 1 oct instead it is G4 B4 D5 G5
- **REQ-012/S4 — down**
  Given the run of S1
  When the ↓ sequence is produced
  Then it is G6 F♯6 E6 … A4 G4 — 15 notes
- **REQ-012/S5 — the sequence never leaves the range (invariant)**
  Given every catalogued variant, every selectable key spelling, every
  octave choice that fits plus full range, both shapes and all three
  directions
  When the sequence is produced
  Then every note lies within the variant's range, and every note of an
  arpeggio is a note of the same key's scale run

_Since 003-hear-the-scale_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-20 | 001-the-circle | 8 | 0 | 0 |
| 0.2.0 | 2026-09-22 | 002-circle-redesign | 3 | 6 | 0 |
| 1.0.0 | 2026-09-23 | 003-hear-the-scale | 1 | 3 | 1 |
