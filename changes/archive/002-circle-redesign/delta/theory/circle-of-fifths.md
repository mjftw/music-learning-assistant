---
type: Spec Delta
title: theory.circle-of-fifths — delta for 002-circle-redesign
description: The circle and key view rebuilt to the Function Paper prototype — global spelling, distance ring, degrees, names/stave panel with spans.
resource: /changes/002-circle-redesign/delta/theory/circle-of-fifths.md
status: stable
tags: [sdd, delta, "change:002-circle-redesign", "context:theory"]
sources:
  - resource: /specs/theory/circle-of-fifths.md
  - resource: /changes/002-circle-redesign/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T19:50:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:36:23Z
  - by: human:merlin-webster
    at: 2026-09-21T15:21:03Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_phase: approved
---

# Delta: theory / circle-of-fifths

> What this change does to the living spec `specs/theory/circle-of-fifths.md`,
> and nothing else. The capability is at v0.1.0 with REQ-001–REQ-008; this
> delta modifies six of them and adds three.

## ADDED

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

### REQ-011: The stave shows a chosen span

WHERE the stave view is active
THE SYSTEM SHALL offer one span choice per whole-octave run of the selected
key that fits within the variant's range starting from an in-range tonic,
plus a full-range choice, and SHALL show exactly the chosen span's notes
with a caption naming it; IF no whole-octave run fits THEN THE SYSTEM SHALL
offer only the full-range choice

**Scenarios**
- **REQ-011/S1 — C major on the flute offers three octave runs**
  Given C major on flute Concert (C4–C7) in stave view
  When the span choices are read
  Then they are 1 oct, 2 oct, 3 oct and full; choosing 2 oct shows the 15
  notes C4 through C6 with the caption naming 2 octaves from C, and full
  shows all 22 in-range notes
- **REQ-011/S2 — G major on the flute cannot reach three octaves**
  Given G major on flute Concert (C4–C7) in stave view
  When the span choices are read
  Then they are 1 oct, 2 oct and full — no 3 oct, because a three-octave
  run from any in-range G would leave the range
- **REQ-011/S3 — a range with no full octave run offers only full**
  Given F♯ major on Ocarina Bass C (A3–F5) in stave view
  When the span choices are read
  Then only full is offered — no whole-octave run from an in-range F♯ fits
  within A3–F5

## MODIFIED

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

**Was:**
> THE SYSTEM SHALL display the circle of fifths as twelve positions ordered by
> fifths clockwise from C at the top, with the major keys on the outer ring and
> each major key's relative natural minor on the inner ring, every key on
> either ring selectable
> (S1 read the enharnonic positions as dual labels "B/C♭, F♯/G♭, C♯/D♭"; S2
> required the key view to name G major as the relative — the alignment on
> the circle now carries that relationship.)

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

**Was:**
> THE SYSTEM SHALL show both spellings at the three enharmonic positions
> (B/C♭, F♯/G♭, C♯/D♭) and SHALL spell the selected key's scale according to
> the spelling chosen

### REQ-003: The key view shows the key on the instrument

WHEN a key is selected
THE SYSTEM SHALL display that key's signature — in the circle's centre and
on the stave view's stave — and, in the stave view, the chosen span of the
key's notes within the selected variant's playable range, ordered lowest to
highest with every occurrence of the root visually emphasised, together
with a summary of how many in-range notes the key has and their extremes;
and, in the names view, the key's seven notes in scale order

**Scenarios**
- **REQ-003/S1 — G major on the flute (acceptance)**
  Given the selected variant is flute Concert (C4–C7), stave view, full span
  When G major is selected
  Then the signature shows one sharp (F♯) in the circle's centre and on the
  stave, the stave's notes run from C4 up to C7 using only G-major notes
  with every G emphasised, and the summary reads 22 notes, C4–C7
- **REQ-003/S2 — the display follows the variant's range**
  Given G major is selected on Ocarina Alto C (A4–F6) in stave view, full
  span
  When the variant is changed to Ocarina Bass C (A3–F5)
  Then every displayed note moves down exactly one octave
- **REQ-003/S3 — the names view shows the scale itself**
  Given G major is selected in the names view
  When the panel is read
  Then it shows the seven notes G A B C D E F♯ in scale order, regardless
  of the selected variant's range

**Was:**
> WHEN a key is selected
> THE SYSTEM SHALL display that key's signature on a stave together with every
> note of the key within the selected variant's playable range, ordered lowest
> to highest, with every occurrence of the root visually emphasised, and the
> relative key named
> (The relative key is no longer named in the key view — the rings' alignment
> carries it, per REQ-001/S2.)

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

**Was:**
> WHEN a key with at least one accidental is selected
> THE SYSTEM SHALL highlight the accidental that is new relative to the key
> with one fewer accidental, and SHALL highlight nothing for a key with no
> accidentals
> (Previously every occurrence of the new accidental was highlighted among
> the stave's noteheads; the accent now lives in the signature glyphs and
> the names view's marks only.)

### REQ-007: The key view has a names view and a stave view

THE SYSTEM SHALL offer the key view as two switchable views — a names view
(the seven notes with their accidental-order marks and, where enabled,
degrees) and a stave view (notated notes for the chosen span) — defaulting
to the names view; and WHERE the stave view is active a separate setting
SHALL control whether each notehead is labelled with its name underneath,
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

**Was:**
> THE SYSTEM SHALL show a note name with each displayed note by default, and
> WHEN the note-names toggle is switched off THE SYSTEM SHALL hide all note
> names until it is switched on again
> (The single toggle becomes the names/stave view switch plus a stave-names
> setting; names are now default-off on the stave because the names view
> carries them by default instead.)

### REQ-008: The tool reopens where it was left

WHEN the tool starts
THE SYSTEM SHALL restore the stored selection and display preferences —
instrument variant, key, spelling preference, key-view choice, span, scale
degrees, distance ring, and stave note-names; IF nothing is stored or the
stored state is unreadable THEN THE SYSTEM SHALL show C major on the flute
with sharp spelling, the names view, full span, degrees and distance ring
on, and stave note-names off; IF stored state from an earlier shape is
found THEN THE SYSTEM SHALL keep what it carries and default the rest

**Scenarios**
- **REQ-008/S1 — resuming mid-week practice**
  Given the tool was closed showing B♭ major on Ocarina Bass C, flat
  spelling, stave view at 1 oct, degrees off, ring on, stave names on
  When it is reopened
  Then every one of those choices is restored exactly
- **REQ-008/S2 — first run**
  Given no stored state exists
  When the tool starts
  Then it shows C major on the flute with sharp spelling, the names view,
  full span, degrees and distance ring on, and stave note-names off
- **REQ-008/S3 — corrupt stored state**
  Given the stored state is unreadable
  When the tool starts
  Then it shows the first-run defaults of S2, fully usable
- **REQ-008/S4 — stored state from the previous shape**
  Given stored state from before this change (variant, key and the old
  names toggle only)
  When the tool starts
  Then the variant and key are restored and every new preference takes its
  S2 default

**Was:**
> WHEN the tool starts
> THE SYSTEM SHALL restore the last selection (instrument variant, key, and
> note-names toggle) stored on the device; IF nothing is stored or the stored
> selection is unreadable THEN THE SYSTEM SHALL show C major on the flute with
> note names on
