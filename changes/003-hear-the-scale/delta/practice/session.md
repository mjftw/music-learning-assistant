---
type: Spec Delta
title: practice.session — delta for 003-hear-the-scale
description: Creates the session capability in tool-leads mode — choosing the traversal and session settings, playing the sequence in time with sound and highlight, and remembering the choices
resource: /changes/003-hear-the-scale/delta/practice/session.md
status: stable
tags: [sdd, delta, "change:003-hear-the-scale", "context:practice"]
sources:
  - resource: /specs/practice/session.md
  - resource: /changes/003-hear-the-scale/proposal.md
  - resource: /changes/003-hear-the-scale/design/hear-the-scale.dc.html
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T17:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:09:58Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_capability: session
sdd_phase: approved
---

# Delta: practice / session

> What this change does to the living spec `specs/practice/session.md`,
> and nothing else. The capability does not exist yet: this delta is all
> ADDED from REQ-001 and the merge creates it.
>
> Throughout, "the run" is the ascending set of notes the traversal covers
> and "the sequence" is those notes in playing order — both defined by
> `theory.circle-of-fifths/REQ-012`. "The prototype" is
> `design/hear-the-scale.dc.html`, the source of truth for how every control
> looks and moves.

## ADDED

### REQ-001: The traversal is chosen from what the instrument allows

THE SYSTEM SHALL let the learner choose a traversal — direction (↑, ↓ or
↑↓), octaves (each whole-octave count from 1 to 4 that fits the selected
key on the selected variant, plus full range) and shape (scale or
arpeggio) — in the Traversal sheet, SHALL summarise the traversal and
session settings in one line on the row that opens the sheet, and IF the
chosen octave count does not fit the selected variant THEN THE SYSTEM SHALL
use the largest count that fits (or full range if none does) without
changing the stored choice

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

### REQ-006: The sounding note is shown

WHILE a note is sounding
THE SYSTEM SHALL emit `TargetAdvanced` with that note and its position as
the note begins, SHALL highlight that note in the stave view (its notehead
in the accent colour, enlarged, with a halo, the other noteheads dimmed)
and its name column in the names view, within 30 ms of the note's onset,
and SHALL always highlight a note that belongs to the active sequence;
WHILE idle or counting THE SYSTEM SHALL highlight nothing

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
  When the onset of each note is compared with the moment its highlight is
  shown
  Then the highlight is never later than 30 ms after the onset
- **REQ-006/S5 — the target is always in the sequence (invariant)**
  Given every catalogued variant, every selectable key, every traversal
  When the sequence is played through
  Then every `TargetAdvanced` carries a note that is a member of that
  sequence at the position given

### REQ-007: Changes while playing

WHEN the key, the variant, the direction, the octaves or the shape changes
while playing
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

### REQ-011: The session settings are remembered

WHEN the tool starts
THE SYSTEM SHALL restore the stored traversal (direction, octaves, shape)
and session settings (sound mode, loop, count-in, rest bar,
tempo) alongside the selection restored by
`theory.circle-of-fifths/REQ-008`; IF nothing is stored, the stored state
is unreadable, or it predates this change THEN THE SYSTEM SHALL use ↑↓,
1 oct, scale, both, loop on, count-in on, rest bar off and 96 bpm for
what is missing; and THE SYSTEM SHALL never store whether it was playing —
it always starts idle

**Scenarios**
- **REQ-011/S1 — back where it was**
  Given the tool was closed with ↓, 2 oct, arpeggio, metronome, loop off,
  count-in off, rest bar on, 132 bpm, mid-playback
  When it is reopened
  Then every one of those settings is restored, the term reads Allegro, and
  the transport is idle
- **REQ-011/S2 — first run**
  Given no stored state
  When the tool starts
  Then the summary row reads "↑↓ · 1 oct · scale · loop" and the tempo
  reads 96 Andante
- **REQ-011/S3 — stored state from before this change**
  Given stored state from 002 (selection and display preferences only)
  When the tool starts
  Then the selection and display preferences are restored and every
  traversal and session setting takes its S2 default
