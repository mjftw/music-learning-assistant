---
type: Spec Delta
title: theory.circle-of-fifths — delta for 003-hear-the-scale
description: The key view follows the traversal's run instead of a span; span leaves the preferences; REQ-011 Span removed; a traversal is fitted to the instrument and ordered into a sequence
resource: /changes/003-hear-the-scale/delta/theory/circle-of-fifths.md
status: stable
tags: [sdd, delta, "change:003-hear-the-scale", "context:theory"]
sources:
  - resource: /specs/theory/circle-of-fifths.md
  - resource: /changes/003-hear-the-scale/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T17:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:09:58Z
sdd_id: 003-hear-the-scale
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_phase: approved
---

# Delta: theory / circle-of-fifths

> What this change does to the living spec `specs/theory/circle-of-fifths.md`,
> and nothing else. Highest existing ID is REQ-011; ADDED continues at
> REQ-012.

## ADDED

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

## MODIFIED

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

**Was:**
> WHEN a key is selected
> THE SYSTEM SHALL display that key's signature — in the circle's centre and
> on the stave view's stave — and, in the stave view, the chosen span of the
> key's notes within the selected variant's playable range, ordered lowest to
> highest with every occurrence of the root visually emphasised, together
> with a summary of how many in-range notes the key has and their extremes;
> and, in the names view, the key's seven notes in scale order
> (S1 and S2 said "full span"; S3 did not mention the traversal; S4 is new.)

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

**Was:**
> THE SYSTEM SHALL offer the key view as two switchable views — a names view
> (the seven notes with their accidental-order marks and, where enabled,
> degrees) and a stave view (notated notes for the chosen span) — defaulting
> to the names view; and WHERE the stave view is active a separate setting
> SHALL control whether each notehead is labelled with its name underneath,
> defaulting to off

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

**Was:**
> WHEN the tool starts
> THE SYSTEM SHALL restore the stored selection and display preferences —
> instrument variant, key, spelling preference, key-view choice, span, scale
> degrees, distance ring, and stave note-names; IF nothing is stored or the
> stored state is unreadable THEN THE SYSTEM SHALL show C major on the flute
> with sharp spelling, the names view, full span, degrees and distance ring
> on, and stave note-names off; IF stored state from an earlier shape is
> found THEN THE SYSTEM SHALL keep what it carries and default the rest
> (Span leaves the list; the traversal and session settings are remembered
> by `practice.session/REQ-011`.)

## REMOVED

### REQ-011: The stave shows a chosen span
Superseded: the traversal chosen in `practice.session/REQ-001` decides
what the stave shows, and `REQ-012` fits it to the instrument. Span is no
longer a concept.
