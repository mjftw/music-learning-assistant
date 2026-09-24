---
type: Spec Delta
title: practice.session — delta for 005-scale-selection
description: Adds Scale choice (a catalogue of scale types per mode) and its effect on the Traversal sheet, changes-while-playing and persistence
resource: /changes/005-scale-selection/delta/practice/session.md
status: stable
tags: [sdd, delta, "change:005-scale-selection", "context:practice"]
sources:
  - resource: /specs/practice/session.md
  - resource: /changes/005-scale-selection/proposal.md
generated:
  by: claude-sonnet-5
  at: 2026-09-23T21:19:19Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T21:54:16Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_capability: session
sdd_phase: approved
---

# Delta: practice / session

> What this change does to the living spec `specs/practice/session.md`, and
> nothing else.

## ADDED

### REQ-012: Scale choice

THE SYSTEM SHALL let the learner choose a scale from a catalogue for the
selected mode — major-family scales or minor-family scales, plus whole tone
and chromatic either way — in a Scale sheet titled "Scales on <tonic>" that
lists each option's name and formula (its scale-degree numbers, with an
accidental prefix on any degree the scale alters from the tonic's own major
or natural-minor form) and marks the current choice; SHALL show the chosen
scale's name beside the key name and its formula on the row that opens the
sheet; and WHERE the chosen scale is not one the catalogue marks as
offering an arpeggio (every scale but the two pentatonics, blues, whole
tone and chromatic — some of which do contain a 1st, 3rd or 5th degree,
but not as a triad idiomatic enough to arpeggiate) THE SYSTEM SHALL make
the arpeggio option in the Traversal sheet unavailable, falling back to
scale

**Scenarios**
- **REQ-012/S1 — choosing a scale**
  Given G major selected, the Scale sheet open
  When Lydian is tapped
  Then the sheet closes, the key name reads "G Lydian", the row above the
  sheet reads "1 2 3 ♯4 5 6 7", and the stave and names view begin showing
  G Lydian's notes (G A B C♯ D E F♯)
- **REQ-012/S2 — the sheet lists only the current mode's family**
  Given G major selected (outer ring)
  When the Scale sheet opens
  Then it lists Major, Major pentatonic, Lydian, Mixolydian, Harmonic
  major, Whole tone and Chromatic, with Major ticked, and its hint reads
  "Major family · tap the inner ring for minor"; given E minor selected
  instead, it lists Natural minor, Harmonic minor, Melodic minor ·
  classical, Melodic minor · jazz, Minor pentatonic, Blues, Dorian,
  Phrygian, Locrian, Whole tone and Chromatic, with Natural minor ticked
- **REQ-012/S3 — arpeggio unavailable for a scale the catalogue excludes**
  Given G major pentatonic chosen (its formula does include degrees 1, 3
  and 5, but the catalogue still marks it arpeggio-ineligible), the
  Traversal sheet open
  When the Shape row is read
  Then arpeggio is shown unavailable and scale is selected; choosing Lydian
  from the Scale sheet re-enables arpeggio without changing the shape
  already in effect
- **REQ-012/S4 — the descending alternative for a split-direction scale**
  Given G melodic minor · classical chosen, names view, idle
  When the panel is read
  Then each degree shows its ascending name and, on the row below, its
  descending alternative where the two differ — ↓E♭ under the 6th
  degree's E (raised ascending, natural minor's E♭ descending) and ↓F
  under the 7th degree's F♯ (raised ascending, natural minor's F
  descending) — and no alternative row shows for the other five degrees
- **REQ-012/S5 — every formula in the catalogue, as the sheet shows it**
  Given G major selected (a sharp key, outer ring)
  When the Scale sheet is read
  Then its rows read, in this order:
  | Scale | Formula |
  |---|---|
  | Major | 1 2 3 4 5 6 7 |
  | Major pentatonic | 1 2 3 5 6 |
  | Lydian | 1 2 3 ♯4 5 6 7 |
  | Mixolydian | 1 2 3 4 5 6 ♭7 |
  | Harmonic major | 1 2 3 4 5 ♭6 7 |
  | Whole tone | 1 2 3 ♯4 ♭6 ♭7 |
  | Chromatic | 1 ♯1 2 ♯2 3 4 ♯4 5 ♯5 6 ♯6 7 |
  and given E minor selected instead (a sharp key, inner ring) they read:
  | Scale | Formula |
  |---|---|
  | Natural minor | 1 2 3 4 5 6 7 |
  | Harmonic minor | 1 2 3 4 5 6 ♯7 |
  | Melodic minor · classical | 1 2 3 4 5 ♯6 ♯7 · ↓ natural |
  | Melodic minor · jazz | 1 2 3 4 5 ♯6 ♯7 · both ways |
  | Minor pentatonic | 1 3 4 5 7 |
  | Blues | 1 3 4 ♭5 5 7 |
  | Dorian | 1 2 3 4 5 ♯6 7 |
  | Phrygian | 1 ♭2 3 4 5 6 7 |
  | Locrian | 1 ♭2 3 4 ♭5 6 7 |
  | Whole tone | 1 2 ♯3 ♯4 6 7 |
  | Chromatic | 1 ♯1 2 3 ♯3 4 ♯4 5 6 ♯6 7 ♯7 |
  and Chromatic alone follows the signature: on F major (one flat) it reads
  "1 ♭2 2 ♭3 3 4 ♭5 5 ♭6 6 ♭7 7" and on D minor "1 ♭2 2 3 ♭4 4 ♭5 5 6 ♯6 7
  ♯7"; every other formula is the same on every key of its ring. (Degree
  labels are relative to the ring's own home scale — major or natural
  minor — which is why Natural minor reads 1–7 and Harmonic minor ♯7, and
  why Whole tone and Chromatic read differently on the two rings. On the
  minor ring Chromatic's in-between notes are the raised lower neighbour
  (sharps) or the lowered upper neighbour (flats) of the minor degrees,
  with the leading tone always ♯7; this keeps every spelling within a
  double accidental — A♯ minor's would otherwise need a triple sharp.)

**Was:** _(none — this requirement is new)_

## MODIFIED

### REQ-001: The traversal is chosen from what the instrument allows

THE SYSTEM SHALL let the learner choose a traversal — direction (↑, ↓ or
↑↓), octaves (each whole-octave count from 1 to 4 that fits the selected
key on the selected variant, plus full range) and shape (scale, or
arpeggio WHERE the catalogue marks the chosen scale as offering one) — in
the Traversal sheet, SHALL summarise the traversal and session settings in
one line on the row that opens the sheet, and IF the chosen octave count does
not fit the selected variant THEN THE SYSTEM SHALL use the largest count
that fits (or full range if none does) without changing the stored choice

**Scenarios**
- **REQ-001/S1 — C major on the flute offers three octave counts**
  Given C major on flute Concert (C4–C7)
  When the Traversal sheet is opened
  Then Octaves offers 1 oct, 2 oct, 3 oct and full — no 4 oct, because
  four octaves from C4 would leave the range
- **REQ-001/S2 — the summary line**
  Given G major on the flute with ↑↓, 2 oct, scale, both, loop on
  When the row above the sheet is read
  Then it reads "↑↓ · 2 oct · scale · loop"; with full range, sound
  mode metronome and loop off it reads "↑↓ · full range · click only ·
  once"
- **REQ-001/S3 — a range with no whole-octave run offers only full**
  Given F♯ major on Ocarina Bass C (A3–F5)
  When the Traversal sheet is opened
  Then Octaves offers only full, and the run is the twelve in-range notes
  A♯3 through E♯5
- **REQ-001/S4 — an octave choice that no longer fits is clamped, not lost**
  Given C major with 3 oct chosen on flute Concert
  When the variant is changed to Ocarina Alto C (A4–F6), then back to the
  flute
  Then on the ocarina the run is the one octave C5–C6 and the Octaves row
  shows 1 oct selected; back on the flute the run is three octaves C4–C7
  again
- **REQ-001/S5 — arpeggio unavailable in the Traversal sheet itself**
  Given G major pentatonic chosen
  When the Traversal sheet is opened
  Then the Shape row offers only scale, with arpeggio shown unavailable

**Was:**
> THE SYSTEM SHALL let the learner choose a traversal — direction (↑, ↓ or
> ↑↓), octaves (each whole-octave count from 1 to 4 that fits the selected
> key on the selected variant, plus full range) and shape (scale or
> arpeggio) — in the Traversal sheet, SHALL summarise the traversal and
> session settings in one line on the row that opens the sheet, and IF the
> chosen octave count does not fit the selected variant THEN THE SYSTEM
> SHALL use the largest count that fits (or full range if none does)
> without changing the stored choice

### REQ-007: Changes while playing

WHEN the key, the variant, the scale, the direction, the octaves or the
shape changes while playing
THE SYSTEM SHALL restart the new sequence from its first note at once
without a count-in, continuing to play (IF a count-in or rest bar is in
progress THEN the count continues and the new sequence follows it); WHEN
the sound mode changes THE SYSTEM SHALL apply it at once; WHEN loop,
count-in or rest bar change THE SYSTEM SHALL apply them the next time they
matter; and THE SYSTEM SHALL never stop, pause or interrupt playback
because a sheet, the drawer or the instrument picker opened or closed

**Scenarios**
- **REQ-007/S1 — a new key mid-scale**
  Given G major is playing at note 9
  When D major is selected
  Then D major's sequence begins from its first note straight away, with no
  count-in, and the caption reads "D4 · 1 of N" for its N
- **REQ-007/S2 — turning the metronome off mid-run**
  Given sound mode both, playing
  When notes is chosen in the Traversal sheet
  Then the next beat has no click and the tones continue uninterrupted
- **REQ-007/S3 — the sheet is not a stop**
  Given the sequence is playing
  When the Traversal sheet is opened, left open through several notes, and
  closed
  Then the notes kept sounding and advancing throughout
- **REQ-007/S4 — a new scale mid-run**
  Given G major (scale: Major) is playing at note 9
  When Lydian is chosen from the Scale sheet
  Then G Lydian's sequence begins from its first note straight away, with
  no count-in, and the caption reads "G4 · 1 of N" for its N

**Was:**
> WHEN the key, the variant, the direction, the octaves or the shape
> changes while playing
> THE SYSTEM SHALL restart the new sequence from its first note at once
> without a count-in, continuing to play (IF a count-in or rest bar is in
> progress THEN the count continues and the new sequence follows it); WHEN
> the sound mode changes THE SYSTEM SHALL apply it at once; WHEN loop,
> count-in or rest bar change THE SYSTEM SHALL apply them the next time
> they matter; and THE SYSTEM SHALL never stop, pause or interrupt
> playback because a sheet, the drawer or the instrument picker opened or
> closed

### REQ-011: The session settings are remembered

WHEN the tool starts
THE SYSTEM SHALL restore the stored traversal (direction, octaves, shape),
the stored scale choice for each mode (major-family, minor-family) and
session settings (sound mode, loop, count-in, rest bar, tempo) alongside
the selection restored by `theory.circle-of-fifths/REQ-008`; IF nothing is
stored, the stored state is unreadable, or it predates this change THEN THE
SYSTEM SHALL use ↑↓, 1 oct, scale, both, loop on, count-in on, rest bar off,
96 bpm, and Major / Natural minor for what is missing; and THE SYSTEM SHALL
never store whether it was playing — it always starts idle

**Scenarios**
- **REQ-011/S1 — back where it was**
  Given the tool was closed with ↓, 2 oct, arpeggio, metronome, loop off,
  count-in off, rest bar on, 132 bpm, Dorian chosen on the minor ring,
  mid-playback
  When it is reopened
  Then every one of those settings is restored, including Dorian, the term
  reads Allegro, and the transport is idle
- **REQ-011/S2 — first run**
  Given no stored state
  When the tool starts
  Then the summary row reads "↑↓ · 1 oct · scale · loop", the tempo reads
  96 Andante, and the key name reads the plain key with no scale suffix
  (major-ring default Major, minor-ring default Natural minor)
- **REQ-011/S3 — stored state from before this change**
  Given stored state from 002 (selection and display preferences only)
  When the tool starts
  Then the selection and display preferences are restored and every
  traversal, scale and session setting takes its S2 default
- **REQ-011/S4 — stored state from 003 (before scale choice existed)**
  Given stored state from 003 (traversal and session settings, no scale
  choice recorded)
  When the tool starts
  Then the traversal and session settings restore as stored, and the
  major-ring scale defaults to Major, the minor-ring scale to Natural
  minor

**Was:**
> WHEN the tool starts
> THE SYSTEM SHALL restore the stored traversal (direction, octaves, shape)
> and session settings (sound mode, loop, count-in, rest bar,
> tempo) alongside the selection restored by
> `theory.circle-of-fifths/REQ-008`; IF nothing is stored, the stored state
> is unreadable, or it predates this change THEN THE SYSTEM SHALL use ↑↓,
> 1 oct, scale, both, loop on, count-in on, rest bar off and 96 bpm for
> what is missing; and THE SYSTEM SHALL never store whether it was playing
> — it always starts idle
