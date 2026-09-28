---
type: Spec Delta
title: practice.tuner — delta for 007-hear-me
description: Creates the tuner — a screen that listens and judges the detected pitch against the nearest note or a pinned target, within a measured budget, and sounds nothing while it does.
resource: /changes/007-hear-me/delta/practice/tuner.md
status: stable
tags: [sdd, delta, "change:007-hear-me", "context:practice"]
sources:
  - resource: /changes/007-hear-me/proposal.md
  - resource: /changes/007-hear-me/design/rounds.md
  - resource: /specs/practice/session.md
  - resource: /specs/practice/drone.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T23:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T22:05:29Z
sdd_id: 007-hear-me
sdd_context: practice
sdd_capability: tuner
sdd_phase: approved
---

# Delta: practice / tuner

> What this change does to the living spec `specs/practice/tuner.md`, and
> nothing else. The capability does not exist yet: this delta is all ADDED
> from REQ-001 and the merge creates the living spec.
>
> Purpose (becomes the living spec's): A **Tuner** pill in the practice
> screen's header opens the tuner: playback and the drone stop, the
> microphone is asked for, and as the learner plays the screen names the
> nearest note and its octave, draws the offset on a ±50 ¢ level with a
> ±5 ¢ in-tune band, and writes the note on a small stave with the cents
> above it — every readout within 100 ms of the sound, measured. A target
> can be pinned — Hold what is playing, or a note from the pitch spiral —
> and everything is measured from it instead; it is forgotten on leaving.
> Silence shows "Play a note"; no microphone shows "Can't hear"; ‹ Practice
> returns to the practice screen idle. Nothing sounds while the tuner
> listens; nothing is stored. The screen ("Tuner feature design", 4a with
> 5c, vendored under `design/`) is the source of truth.

## ADDED

### REQ-001: The way in and out, and silence while listening

WHEN the Tuner pill in the practice screen's header is tapped
THE SYSTEM SHALL stop playback (silent within 50 ms, idle at the first
note, as ❚❚ does) and the drone (faded out within 500 ms, the pill showing
▶) before opening the tuner screen, and there request listening
(`listening.pitch-detection/REQ-001`); WHILE the tuner screen is showing
THE SYSTEM SHALL sound nothing — no note, click, drone or tapped note;
and WHEN ‹ Practice is tapped THE SYSTEM SHALL end listening and return to
the practice screen as it was left, idle and silent

**Scenarios**
- **REQ-001/S1 — in from idle**
  Given G major on flute Concert, idle, the drone off
  When the Tuner pill is tapped
  Then the tuner screen shows with LISTENING in its header, the microphone
  is asked for at that moment (the first time), and nothing sounds
- **REQ-001/S2 — in from a run and a drone**
  Given the sequence of `practice.session/REQ-002/S1` is playing at note 9
  When the Tuner pill is tapped
  Then the run is silent within 50 ms and the tuner shows; on ‹ Practice
  the practice screen reads "29 notes · G4–G6" with the progress bar
  empty; given instead the drone sounding G5, the drone is silent within
  500 ms and the pill shows ▶ on return
- **REQ-001/S3 — nothing sounds while the tuner listens (invariant)**
  Given every way into the tuner — from idle, playing, counting, the drone
  sounding, a tapped note sounding
  When the tuner screen is showing
  Then at no instant is a sequence note, a click, the drone or a tapped
  note sounding
- **REQ-001/S4 — out**
  Given the tuner is showing and listening, the pinned target A4
  When ‹ Practice is tapped
  Then the microphone is released, the practice screen shows exactly what
  it showed before entering, idle, and nothing sounds

### REQ-002: The reading — the nearest note and how far off

WHILE the tuner is listening and a detected pitch is being published
THE SYSTEM SHALL emit `NoteJudged` and show, for each detected pitch, the
nearest note's name and octave (`theory.temperament/REQ-002`, spelled per
the ♯/♭ preference) as the big name, the offset to the whole cent as the
tag ("+12" / "−16" / "0") with the word in tune (within ±5 ¢), sharp or
flat, the line on the level at that offset (a linear ±50 ¢ rule marked
every 5 ¢, labelled at 10, 25 and 50, the ±5 ¢ band shaded), "↑ sharp ·
halfway to <the note above>" at the top and "↓ flat · halfway to <the note
below>" at the bottom; the line, tag and cents SHALL be coloured warm when
sharp, cool when flat, and green when in tune; and THE SYSTEM SHALL keep
the shown note until the detected pitch is 56 ¢ from it, clamping the
offset to ±50 meanwhile; and THE SYSTEM SHALL smooth the shown offset:
while the same note stays shown, each reading moves the shown pitch one
tenth of the way from where it was to the detected pitch (a low-pass
filter, a time constant of about 100 ms at the tuner's reading rate); a
detected pitch more than 25 ¢ from the shown pitch is a new pitch and
SHALL be shown as detected, at once; and the first reading after nothing
was heard, after the shown note changes, or after the target changes
SHALL be shown as detected. The smoothing SHALL never hold a reading back
— each is still shown within REQ-006's bound of its newest sound.
`NoteJudged` carries the smoothed offset and verdict; the heard frequency
(the Hz in the stave strip) stays the detected pitch

> Amended 2026-09-28 at design round 1 (`design/rounds.md`), with the
> user's approval: the smoothing clause and S6–S9. S1–S5 feed a steady
> pitch, so they read the same smoothed or not.

**Scenarios**
- **REQ-002/S1 — a little sharp**
  Given the tuner is listening, sharp spelling, Auto
  When a steady 445.0 Hz is detected
  Then the big name reads A with octave 4, the tag "+20 sharp" in the warm
  colour, the line 20 ¢ above centre, "halfway to A♯4" above and "halfway
  to G♯4" below, and NoteJudged carries A4, +20, sharp
- **REQ-002/S2 — in tune**
  Given the tuner is listening
  When a steady 441.0 Hz is detected
  Then the tag reads "+4 in tune" in green, the line inside the band, and
  NoteJudged's verdict is in tune; at 442.0 Hz it reads "+8 sharp"
- **REQ-002/S3 — flat, spelled flat**
  Given flat spelling preferred
  When a steady 461.0 Hz is detected
  Then the big name reads B♭ 4 and the tag "−19 flat" in the cool colour
- **REQ-002/S4 — the name holds across the boundary (hysteresis)**
  Given A4 is shown at 440 Hz
  When the detected pitch rises steadily through 452.9 Hz (+50 ¢) to 454.0
  Hz (+54 ¢) and on to 455.0 Hz (+58 ¢)
  Then the big name stays A4 with the tag "+50" through 454.0 Hz, and at
  455.0 Hz becomes A♯4 with the tag "−42"; coming back down it stays A♯4
  until 56 ¢ below it
- **REQ-002/S5 — the spelling toggle is the circle's preference**
  Given the tuner is showing with sharp spelling and the practice screen
  had sharp
  When ♭ is tapped on the tuner's footer
  Then the tuner spells in flats at once and, on ‹ Practice, the circle
  shows the flat spelling too (`theory.circle-of-fifths/REQ-002`)
- **REQ-002/S6 — a steady note does not flicker**
  Given A4 is shown
  When the detected pitch alternates between 440.0 Hz and 441.5 Hz for 20
  readings
  Then the shown offset settles between +2 and +4, and no reading differs
  from the one before it by more than 1 ¢
- **REQ-002/S7 — a new note is shown at once**
  Given A4 has settled at 440.0 Hz
  When 466.16 Hz is detected
  Then that reading shows A♯4 at 0, with no creep towards it; a following
  467.5 Hz (+5 ¢) is smoothed, showing less than +5
- **REQ-002/S8 — the first reading is as detected**
  Given nothing was heard
  When 445.0 Hz is detected
  Then the first reading shows A4, +20
- **REQ-002/S9 — the shown offset settles on the truth (measured)**
  Given the steady tones of REQ-006/S1, E2–C7
  When the shown offset is read half a second into each tone
  Then it is within ±2 ¢ of the tone fed

### REQ-003: Nothing heard

WHILE the tuner is listening and no detected pitch is being published
THE SYSTEM SHALL show "Play a note" in place of the big name, with no
line, tag, head or Hz shown, and WHERE a target is pinned SHALL keep the
target's name and octave as the big name, greyed, with "Play a note"
beneath

**Scenarios**
- **REQ-003/S1 — silence on auto**
  Given the tuner is listening, Auto
  When nothing is detected for 300 ms
  Then the level shows no line and no tag, the stave strip no head, the
  Hz read "—", and "Play a note" is shown in the middle
- **REQ-003/S2 — silence with a target**
  Given the target A4 is pinned
  When nothing is detected
  Then the big name reads A 4 greyed, "Play a note" beneath it, and the
  stave strip shows only the target's grey head with "A4 IS 440.0 Hz"
- **REQ-003/S3 — a breath between notes**
  Given a note has been showing
  When the detected pitch stops for the length of a breath and resumes
  Then the reading clears to "Play a note" while nothing is published and
  returns with the next detected pitch, with no stale reading in between

### REQ-004: A target

WHERE a target note is pinned — by Hold (the note playing now), by a wedge
of the pitch spiral in the Target sheet, or by − / + moving the pinned note
a semitone within E2–C7 —
THE SYSTEM SHALL measure every detected pitch from the target instead of
the nearest note: the big name stays the target's, the tag, line and
verdict give the offset from it, and IF the offset exceeds ±50 ¢ THEN THE
SYSTEM SHALL pin the line to the level's edge, read the tag as "▲ N st" or
"▼ N st" (whole semitones), and caption "playing <the nearest note>"; the
Target sheet SHALL show Auto · nearest (ticked when no target is pinned),
Hold with the note playing now, and the spiral — one ring of wedges per
octave from E2 to C7 and the instrument's range, the lowest in the hub
winding outward, wedges outside the instrument's range dimmed, each C
labelled with its octave, a needle marking the detected pitch, the hub
naming the target and its pitch in hertz; WHEN ✕ on the target pill is
tapped or Auto is chosen THE SYSTEM SHALL return to the nearest note; and
THE SYSTEM SHALL start every entry to the tuner on Auto

**Scenarios**
- **REQ-004/S1 — Hold**
  Given the tuner reads A4 +20 at 445 Hz, Auto
  When TARGET is tapped and Hold is tapped
  Then the sheet closes, the pill reads "TARGET A4" with − and +, and the
  reading is still +20 sharp; when the pitch drifts up to 461 Hz (+81 ¢
  from A4) the big name stays A 4, the line pins to the top edge, the tag
  reads "▲ 1 st", and "playing A♯4" is captioned
- **REQ-004/S2 — a wedge of the spiral**
  Given the tuner is listening on flute Concert, Auto
  When TARGET is tapped and the D5 wedge is tapped
  Then the sheet closes and the pill reads "TARGET D5"; the hub read "D5 ·
  587.3 Hz" while it was open; wedges below C4 and above C7 were dimmed
  yet the E2 wedge was still there to tap
- **REQ-004/S3 — far from the target**
  Given the target A4 is pinned
  When a steady 523.25 Hz (C5) is detected
  Then the big name reads A 4, the line is pinned to the top edge, the tag
  reads "▲ 3 st", "playing C5" is captioned, the stave strip shows the
  heard head at C5 and the target's grey head at A4, and NoteJudged carries
  A4, +300, sharp
- **REQ-004/S4 — a semitone either way**
  Given the target A4
  When + is tapped, then − twice
  Then the target reads A♯4, then A4, then G♯4, each measured from at once;
  at C7 + does nothing and at E2 − does nothing
- **REQ-004/S5 — back to auto**
  Given the target D5 is pinned and 445 Hz is detected
  When ✕ on the pill is tapped
  Then the pill reads "TARGET auto · nearest" and the reading is A4 +20
  again; choosing Auto in the sheet does the same
- **REQ-004/S6 — the sheet is not a stop**
  Given the tuner is listening
  When the Target sheet is opened, left open through a note, and closed
  Then listening never stopped and the needle in the spiral followed the
  note while it was open

### REQ-005: The stave strip

WHILE the tuner is showing
THE SYSTEM SHALL draw a treble stave (the selected variant's clef) with,
when a pitch is detected, the nearest note (or, with a target, the note
nearest the detected pitch) as a whole-note head at its written position
with its accidental, moved with the offset — up when sharp, down when flat,
never as far as the next staff position — along a dotted guide at the true
position, the offset in cents written above the head, and a trail of the
last 2.5 s of the head's movement; WHERE a target is pinned SHALL draw it
as a grey head to the right; SHALL write a note above the ledger range an
octave lower under 8va (two under 15ma) and below it an octave higher
under 8vb (15mb); and SHALL show "HEARD <Hz>" to one decimal beside the
stave and "<target or nearest note> IS <Hz>"

**Scenarios**
- **REQ-005/S1 — A4 a little sharp**
  Given the tuner reads A4 +20 at 445.0 Hz on flute Concert
  When the strip is read
  Then a whole-note head sits in A4's space lifted slightly above the
  dotted guide, "+20" is written above it in the warm colour, "HEARD 445.0
  Hz" and "A4 IS 440.0 Hz" are shown, and no 8va mark appears
- **REQ-005/S2 — a flat accidental**
  Given flat spelling and 461.0 Hz detected
  When the strip is read
  Then the head sits on B♭4's line with a ♭ before it, dropped slightly
  below the guide, "−19" above
- **REQ-005/S3 — the low end takes 8vb**
  Given a steady 82.41 Hz (E2) is detected
  When the strip is read
  Then the head is written at E3's position under 8vb; for C2 it is written
  at C4 under 15mb
- **REQ-005/S4 — the target beside the heard note**
  Given the target A4 and 523.25 Hz detected
  When the strip is read
  Then the heard head is at C5, a grey head at A4 to its right, and the
  captions read "HEARD 523.3 Hz" and "A4 IS 440.0 Hz"

### REQ-006: The readout keeps up (Article V)

THE SYSTEM SHALL show every reading within 100 ms of the start of the
sound it reflects in the microphone signal, SHALL refresh the reading at
least every 50 ms while a steady note is heard, and IF a reading would be
shown more than 100 ms after its sound THEN THE SYSTEM SHALL drop it and
show nothing new — a late reading is never shown

**Scenarios**
- **REQ-006/S1 — the budget (measured)**
  Given known tones fed as the microphone — a sine and a flute-like tone at
  every semitone E2–C7, and the flute script of `design/Tuner.dc.html`
  When the instant each tone starts in the signal is compared with the
  instant its reading is shown
  Then every shown reading is within 100 ms, and at least 20 readings are
  shown per second while a tone is steady
- **REQ-006/S2 — late is dropped (measured)**
  Given the device is stalled so that a reading would be 100 ms or more
  behind its sound
  When the stall ends
  Then that reading was never shown; the next reading that can meet the
  bound is
- **REQ-006/S3 — on the phone (acceptance)**
  Given the phone on the stand with the flute
  When long tones are played up and down the instrument
  Then the readout names each note, moves with the embouchure and never
  feels behind; the harness against the phone reads within 100 ms; the user
  signs off

### REQ-007: When the microphone cannot be used

IF listening reports the microphone refused, none, or failed
(`listening.pitch-detection/REQ-006`)
THEN THE SYSTEM SHALL show NO MIC in the header, "–" in place of the big
name, and the card "Can't hear — no microphone · It was refused or isn't
there. Allow the microphone for this site, then go back and open the tuner
again." — visible, non-interrupting, no modal — and SHALL try again at the
next entry to the tuner; and THE SYSTEM SHALL ask for the microphone
nowhere but on entering the tuner

**Scenarios**
- **REQ-007/S1 — refused**
  Given the microphone is refused
  When the Tuner pill is tapped
  Then the tuner shows NO MIC, "–" and the card; nothing modal opens; the
  level, strip and footer are still drawn; ‹ Practice still works
- **REQ-007/S2 — the next entry tries again**
  Given the card of S1 was shown and the microphone has since been allowed
  When ‹ Practice is tapped and the Tuner pill tapped again
  Then the tuner listens as REQ-001/S1
- **REQ-007/S3 — failed while listening**
  Given the tuner is listening
  When the microphone is unplugged or its permission revoked
  Then the tuner shows NO MIC and the card within 500 ms, and the last
  reading is cleared

### REQ-008: The page hidden, the screen awake

WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
WHILE the tuner is listening
THE SYSTEM SHALL stop listening and clear the reading; WHEN the page is
shown again with the tuner still showing THE SYSTEM SHALL listen again
without a tap; and WHILE the tuner is listening THE SYSTEM SHALL keep the
screen awake where the platform allows it

**Scenarios**
- **REQ-008/S1 — hidden means deaf, shown means listening**
  Given the tuner reads A4
  When the page is hidden and shown again
  Then while hidden nothing was read; on showing, LISTENING is back within
  200 ms and the reading returns with the next detected pitch, with no tap
  and no new permission prompt
- **REQ-008/S2 — the phone on the stand stays lit**
  Given the phone would dim after its idle interval
  When the tuner listens for longer than that interval
  Then the screen has not dimmed; after ‹ Practice the normal behaviour
  returns

### REQ-009: Nothing is remembered

THE SYSTEM SHALL never store the target, whether the tuner was showing, or
anything heard, and SHALL always open on the practice screen with the
tuner closed and the target on Auto; the ♯/♭ preference changed on the
tuner SHALL persist as the circle's own preference does
(`theory.circle-of-fifths/REQ-008`)

**Scenarios**
- **REQ-009/S1 — reopened**
  Given the tool was closed on the tuner with the target D5 pinned and flat
  spelling chosen there
  When it is reopened
  Then the practice screen shows, with the flat spelling; entering the
  tuner shows Auto · nearest
- **REQ-009/S2 — leaving forgets the target**
  Given the target D5 is pinned
  When ‹ Practice is tapped and the Tuner pill tapped again
  Then the pill reads "TARGET auto · nearest"
