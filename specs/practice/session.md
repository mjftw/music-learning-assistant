---
type: Capability Spec
title: practice / session
description: <one sentence — what this capability does for its users>
resource: /specs/practice/session.md
status: stable
tags: [sdd, capability, "context:practice"]
sources:
  - resource: /changes/003-hear-the-scale/proposal.md
  - resource: /changes/005-scale-selection/proposal.md
  - resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
  - resource: /changes/004-the-drone/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-23T13:43:58Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T13:43:58Z
  - by: human:merlin-webster
    at: 2026-09-24T04:14:37Z
  - by: human:merlin-webster
    at: 2026-09-24T09:13:02Z
  - by: human:merlin-webster
    at: 2026-09-26T12:07:33Z
sdd_context: practice
sdd_capability: session
sdd_version: 0.4.0
sdd_phase: current
---

# practice / session

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `practice.session/REQ-NNN` and a scenario as
> `practice.session/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

The "Hear the Scale" prototype (Claude Design, iterated by the user; vendored at `design/hear-the-scale.dc.html`) is the source of truth for the screen. Below the key panel a transport card plays and stops the traversal, shows the note sounding and where it is in the sequence, and steps the tempo with its Italian name shown; a row summarising the traversal opens the Traversal sheet — direction, octaves, shape, sound, and the loop / count-in / rest bar toggles. The Span pills are gone: the traversal decides what the stave and names view show, and the note that is sounding lights up as it sounds, in time. A learner can pick G major on the flute, tap ▶, hear a bar counted in and the scale played up and down at Andante, and play along.

## Requirements

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

_Changed by 005-scale-selection_

### REQ-002: Play and stop

WHEN ▶ is tapped while idle
THE SYSTEM SHALL play the sequence from its first note (after the count-in,
where enabled), SHALL show the sounding note's name and its position as
"<note> · k of N" with a progress bar at k/N, and WHILE looping is enabled
SHALL start the sequence again after its last note (after a rest bar, where
enabled) until stopped; WHEN ❚❚ is tapped while playing THE SYSTEM SHALL
silence within 50 ms and return to idle at the first note; WHEN the last
note ends with looping disabled THE SYSTEM SHALL return to idle; and WHILE
idle THE SYSTEM SHALL caption the sequence as "<N> notes · <lowest>–<highest>"
— N the sequence's length (a ↑↓ run of 8 is 15), the extremes those of the
run — with the progress bar empty

**Scenarios**
- **REQ-002/S1 — G major up and down (acceptance)**
  Given G major on flute Concert, ↑↓, 2 oct, scale, sound both, loop
  and count-in on, rest bar off, 96 bpm
  When ▶ is tapped
  Then after a four-beat count-in the notes G4 A4 B4 C5 D5 E5 F♯5 G5 A5 B5
  C6 D6 E6 F♯6 G6 F♯6 … A4 G4 sound in turn, one per beat, the caption
  reads "G4 · 1 of 29" then "A4 · 2 of 29" and so on, and after "G4 · 29 of
  29" the sequence starts again from "G4 · 1 of 29"
- **REQ-002/S2 — stop returns to the top**
  Given the sequence of S1 is playing at note 12
  When ❚❚ is tapped
  Then sound stops within 50 ms, the caption reads "29 notes · G4–G6", the
  progress bar is empty, and tapping ▶ again begins with the count-in and
  G4
- **REQ-002/S3 — once through**
  Given the traversal of S1 with looping disabled
  When ▶ is tapped and the 29th note ends
  Then the transport is idle with the caption "29 notes · G4–G6"
- **REQ-002/S4 — the idle caption follows the traversal**
  Given G major on flute Concert, idle
  When the shape is changed to arpeggio with 2 oct (↑↓)
  Then the caption reads "13 notes · G4–G6" (G4 B4 D5 G5 B5 D6 G6 and back);
  with full range and scale it reads "43 notes · C4–C7"; with ↑ only, the
  2-oct scale reads "15 notes · G4–G6"

_Since 003-hear-the-scale_

### REQ-003: Count-in and rest bar

WHERE count-in is enabled
THE SYSTEM SHALL precede the first note of each ▶ with one bar of four
clicks, the first accented, captioned "COUNT IN · 4", "· 3", "· 2", "· 1";
WHERE rest bar is enabled THE SYSTEM SHALL separate each loop from the
next with one bar of four clicks, the first accented, captioned "REST · 4"
through "· 1"; and THE SYSTEM SHALL sound the count-in and rest bar clicks
whatever the sound mode

**Scenarios**
- **REQ-003/S1 — a bar counted in**
  Given count-in enabled, sound mode notes, 120 bpm
  When ▶ is tapped
  Then four clicks sound 500 ms apart, the first accented, while the
  caption counts 4, 3, 2, 1 and the progress bar stays empty; the first
  note sounds 500 ms after the fourth click
- **REQ-003/S2 — a rest between loops**
  Given loop and rest bar enabled
  When the last note of the sequence ends
  Then four clicks sound at the beat, captioned REST · 4 … 1, and the
  sequence restarts on the beat after the fourth
- **REQ-003/S3 — off means straight in**
  Given count-in and rest bar disabled
  When ▶ is tapped
  Then the first note sounds at once, and each loop follows the last note
  of the previous without a gap

_Since 003-hear-the-scale_

### REQ-004: Tempo and tempo terms

THE SYSTEM SHALL hold a tempo between 40 and 200 beats per minute, stepped
by 2 with − and +, SHALL show beside it the tempo term whose band contains
it (Largo 40–59, Larghetto 60–65, Adagio 66–75, Andante 76–107, Moderato
108–119, Allegro 120–155, Vivace 156–175, Presto 176–200), SHALL let the
learner pick a term from the Tempo sheet, setting the tempo to the middle of
its band, SHALL sound one note per beat (every note is a crotchet), and
WHEN the tempo changes while playing THE SYSTEM SHALL apply it from the
next note without losing the position

**Scenarios**
- **REQ-004/S1 — stepping through a band boundary**
  Given the tempo is 106 (Andante)
  When + is tapped once
  Then the tempo reads 108 and the term Moderato; tapping − returns 106
  Andante
- **REQ-004/S2 — picking a term**
  Given the Tempo sheet is open at 96 bpm with Andante ticked
  When Allegro is tapped
  Then the tempo becomes 138 (the middle of 120–155), the sheet closes and
  the stepper shows 138 Allegro
- **REQ-004/S3 — the limits hold**
  Given the tempo is 200
  When + is tapped
  Then it stays 200 Presto; likewise − at 40 stays 40 Largo
- **REQ-004/S4 — a tempo change keeps the place**
  Given 96 bpm, playing at note 6
  When + is tapped three times
  Then from the next note onward notes sound 588 ms apart (102 bpm) and
  the position in the sequence is not reset

_Since 003-hear-the-scale_

### REQ-005: What sounds

THE SYSTEM SHALL sound each note of the sequence at its pitch as a plain
synthesised tone sustained for its beat with a short release, and
the metronome as a soft, woody click on every beat with no accent during
the run; WHERE the sound mode is notes THE SYSTEM SHALL sound only the
tones (the count-in and rest bar still click), WHERE it is both THE SYSTEM
SHALL sound tones and clicks, and WHERE it is metronome THE SYSTEM SHALL
sound only clicks while still advancing through the sequence

**Scenarios**
- **REQ-005/S1 — both**
  Given sound mode both, count-in off, 60 bpm
  When ▶ is tapped on the sequence of REQ-002/S1
  Then a tone at G4's pitch and a click begin together, a tone at A4's
  pitch and a click one second later, and so on
- **REQ-005/S2 — metronome only is a silent walk with a click**
  Given sound mode metronome
  When ▶ is tapped
  Then only clicks sound, one per beat, while the caption, progress bar and
  the highlighted note advance exactly as in both
- **REQ-005/S3 — notes only**
  Given sound mode notes with count-in enabled
  When ▶ is tapped
  Then the count-in clicks, then only tones sound
- **REQ-005/S4 — the tone stops when the note does**
  Given 120 bpm
  When a note sounds
  Then its tone has ended (release included) before the next note's onset
  500 ms later

_Since 003-hear-the-scale_

### REQ-006: The sounding note is shown

WHILE a note is sounding
THE SYSTEM SHALL emit `TargetAdvanced` with that note and its position as
the note begins, SHALL highlight that note in the stave view (its notehead
in the accent colour, enlarged, with a halo, the other noteheads dimmed)
and its name column in the names view, within 30 ms either side of the
note's audible onset — its scheduled onset plus the device's reported
output latency — and SHALL always highlight a note that belongs to the
active sequence; WHILE idle or counting THE SYSTEM SHALL highlight nothing

**Scenarios**
- **REQ-006/S1 — the stave follows the sound**
  Given the stave view is showing and the sequence of REQ-002/S1 plays
  When D5 sounds
  Then D5's notehead is accented, enlarged and haloed, every other notehead
  is dimmed, and the caption reads "D5 · 5 of 29"
- **REQ-006/S2 — the names view follows the sound**
  Given the names view is showing and the same sequence plays
  When D5 sounds
  Then the D column is highlighted and no other column is
- **REQ-006/S3 — nothing lit when nothing sounds**
  Given the transport is idle, or counting in
  When the panel is read
  Then no notehead or column is highlighted
- **REQ-006/S4 — sight matches sound (measured)**
  Given any tempo from 40 to 200
  When each note's audible onset (scheduled onset plus the device's
  reported output latency) is compared with the moment its highlight is
  shown
  Then the highlight is never more than 30 ms before or after it
- **REQ-006/S5 — the target is always in the sequence (invariant)**
  Given every catalogued variant, every selectable key, every traversal
  When the sequence is played through
  Then every `TargetAdvanced` carries a note that is a member of that
  sequence at the position given

_Since 003-hear-the-scale_

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

_Changed by 005-scale-selection_

### REQ-008: Playback keeps time

THE SYSTEM SHALL begin every note and click within 5 ms of its scheduled
time, at every tempo from 40 to 200, for as long as
playback continues

**Scenarios**
- **REQ-008/S1 — steadiness (measured)**
  Given 40, 96, 200 bpm, loop on
  When playback runs for 60 seconds and every onset is timestamped
  Then no onset deviates from its scheduled time by more than 5 ms, and
  the deviation does not grow over the minute

_Since 003-hear-the-scale_

### REQ-009: The page hidden, the screen awake

WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
while playing
THE SYSTEM SHALL stop playback and return to idle; and WHILE playing THE
SYSTEM SHALL keep the screen awake where the platform allows it

**Scenarios**
- **REQ-009/S1 — hidden means stopped**
  Given the sequence is playing
  When the page is hidden and shown again
  Then it is idle, silent, with the idle caption
- **REQ-009/S2 — the phone on the stand stays lit**
  Given the phone would dim after its idle interval
  When a sequence is playing for longer than that interval
  Then the screen has not dimmed; after ❚❚ the normal behaviour returns

_Since 003-hear-the-scale_

### REQ-010: When sound cannot start

IF sound cannot be produced when ▶ is tapped
THEN THE SYSTEM SHALL show a visible non-interrupting notice and SHALL run
the sequence silently — caption, progress and highlight advancing in time —
and each later ▶ SHALL try again; and THE SYSTEM SHALL make no sound and
ask nothing before the first ▶

**Scenarios**
- **REQ-010/S1 — silent but not stuck**
  Given sound cannot be produced
  When ▶ is tapped
  Then a notice appears where the tool's notices appear, nothing modal
  opens, and the highlight walks the sequence at tempo
- **REQ-010/S2 — nothing before the gesture**
  Given the tool has just opened
  When no control has been touched
  Then no sound has been made and no permission or prompt has been shown

_Since 003-hear-the-scale_

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

_Changed by 005-scale-selection_

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

_Changed by 006-scale-selection-acceptance-fixes_

### REQ-013: A tapped note sounds for one beat

WHEN a notehead in the stave view or a note's column in the names view is
tapped WHILE idle
THE SYSTEM SHALL sound that note of the run — for a names column, the
lowest note of that name in the run — as a playback tone (`REQ-005`) for
one beat at the current tempo, and SHALL highlight it as a sounding note is
(`REQ-006`) for that beat, without emitting `TargetAdvanced`, changing the
idle caption or moving the position; WHILE the drone sounds THE SYSTEM
SHALL sound the tapped note over it; WHEN the same or another note is
tapped before the beat ends THE SYSTEM SHALL end the earlier tone and start
the new one's beat; and WHILE playing or counting THE SYSTEM SHALL ignore
taps on noteheads and columns

**Scenarios**
- **REQ-013/S1 — a notehead tapped at 96 bpm**
  Given G major on flute Concert, ↑↓, 2 oct, stave view, idle at 96 bpm
  When the D5 notehead is tapped
  Then a tone at 587.33 Hz sounds for 625 ms with its release, D5's
  notehead is accented, enlarged and haloed for those 625 ms and then not,
  the caption still reads "29 notes · G4–G6", and no `TargetAdvanced` was
  emitted
- **REQ-013/S2 — a names column**
  Given G major on flute Concert, ↑↓, 2 oct, names view, idle at 120 bpm
  When the D column is tapped
  Then a tone at D5's pitch (the lowest D in the run G4–G6) sounds for 500
  ms and the D column is highlighted for 500 ms
- **REQ-013/S3 — over the drone**
  Given the drone sounding G5 (`practice.drone/REQ-001/S1`), stave view
  When the B5 notehead is tapped
  Then a tone at 987.77 Hz sounds for one beat while the drone continues at
  783.99 Hz throughout — the two together
- **REQ-013/S4 — a second tap restarts**
  Given the tap of S1, 300 ms in
  When the E5 notehead is tapped
  Then D5's tone ends and its highlight clears, and E5 sounds and is
  highlighted for a full 625 ms from that tap
- **REQ-013/S5 — ignored while playing**
  Given the sequence of `REQ-002/S1` is playing, or counting in
  When a notehead or column is tapped
  Then nothing extra sounds, the highlight stays on the sounding note (or
  nothing while counting), and the run is unaffected
- **REQ-013/S6 — the descent's own notes**
  Given G melodic minor · classical, ↑↓, names view, idle
  When the ↓-marked F column is tapped
  Then a tone at F5's pitch sounds — the descending form's note as it
  appears in the written-out run

_Since 004-the-drone_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-23 | 003-hear-the-scale | 11 | 0 | 0 |
| 0.2.0 | 2026-09-24 | 005-scale-selection | 1 | 3 | 0 |
| 0.3.0 | 2026-09-24 | 006-scale-selection-acceptance-fixes | 0 | 1 | 0 |
| 0.4.0 | 2026-09-26 | 004-the-drone | 1 | 0 | 0 |
