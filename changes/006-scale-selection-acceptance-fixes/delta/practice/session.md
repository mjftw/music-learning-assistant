---
type: Spec Delta
title: practice.session — delta for 006-scale-selection-acceptance-fixes
description: The names view shows a split-direction scale's differing descending notes as a ↓ group (REQ-012/S4 rewritten)
resource: /changes/006-scale-selection-acceptance-fixes/delta/practice/session.md
status: stable
tags: [sdd, delta, "change:006-scale-selection-acceptance-fixes", "context:practice"]
sources:
  - resource: /specs/practice/session.md
  - resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
generated:
  by: claude-fable-5-1
  at: 2026-09-24T06:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:55:32Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: practice
sdd_capability: session
sdd_phase: approved
---

# Delta: practice / session

## MODIFIED

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
scale; and WHERE the chosen scale has its own descending form
THE SYSTEM SHALL show, in the names view, the notes that actually play in
the chosen direction — the ascending form for ↑, the descending form for ↓,
and for ↑↓ the ascending octave followed by a ↓-marked group of the
descending form's notes that differ, in playing order

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
- **REQ-012/S4 — the descent of a split-direction scale in the names view**
  Given G melodic minor · classical chosen, names view, idle, direction ↑↓
  When the panel is read
  Then it shows the ascending octave G A B♭ C D E F♯ and then, marked ↓, the
  descending form's notes that differ from it in playing order — F E♭ — nine
  columns in all, with no alternative row; with ↑ alone the ↓ group is
  absent; with ↓ alone the panel shows the descending form's own seven
  notes G A B♭ C D E♭ F; and for a scale whose forms do not differ (natural
  minor) nothing is appended in any direction
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


**Was:**
> THE SYSTEM SHALL let the learner choose a scale from a catalogue for the
> selected mode — major-family scales or minor-family scales, plus whole tone
> and chromatic either way — in a Scale sheet titled "Scales on <tonic>" that
> lists each option's name and formula (its scale-degree numbers, with an
> accidental prefix on any degree the scale alters from the tonic's own major
> or natural-minor form) and marks the current choice; SHALL show the chosen
> scale's name beside the key name and its formula on the row that opens the
> sheet; and WHERE the chosen scale is not one the catalogue marks as
> offering an arpeggio (every scale but the two pentatonics, blues, whole
> tone and chromatic — some of which do contain a 1st, 3rd or 5th degree,
> but not as a triad idiomatic enough to arpeggiate) THE SYSTEM SHALL make
> the arpeggio option in the Traversal sheet unavailable, falling back to
> scale
