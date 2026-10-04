---
type: Spec Delta
title: practice.session — delta for 008-learner-leads
description: Adds the I lead mode — a lead run that shows each target note, judges the learner's pitch against it and advances once it has been held in tune for N beats — with its settings, meter, card, cues and sheet; retires the progress bar; extends hidden-page, tapped-note and remembered-settings rules to a lead run.
resource: /changes/008-learner-leads/delta/practice/session.md
status: stable
tags: [sdd, delta, "change:008-learner-leads", "context:practice"]
sources:
  - resource: /specs/practice/session.md
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /changes/008-learner-leads/design/handoff.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T16:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-10-02T15:50:48Z
sdd_id: 008-learner-leads
sdd_context: practice
sdd_capability: session
sdd_phase: approved
---

# Delta: practice / session

> What this change does to the living spec `specs/practice/session.md`,
> and nothing else. Three sections, any of which may be empty and omitted.
> IDs: an ADDED requirement takes the next free `REQ-NNN` in the living spec
> (read it first; IDs are never reused, including removed ones). MODIFIED and
> REMOVED name existing IDs. `scripts/merge_delta.py` refuses anything else.
>
> The worked example throughout is C major on flute Concert, ↑↓, 1 oct,
> scale: the run C4 D4 E4 F4 G4 A4 B4 C5, a sequence of 15 notes · C4–C5.
> Hold 2 beats at 96 bpm is 1250 ms; at 120 bpm, 1000 ms. The design
> reference is `design/handoff.md` (the handoff) and the eleven states of
> `design/Learner Leads Final.dc.html`.

## ADDED

### REQ-014: Who leads — the mode

THE SYSTEM SHALL offer two modes on the transport card as the words "play
along" and "I lead" beneath the caption, the chosen one in ink with an
accent underline and the other muted, in place of the progress bar, in
every transport state; WHEN a mode word is tapped THE SYSTEM SHALL select
that mode, and IF a run is in progress (playing, counting or leading) THEN
THE SYSTEM SHALL stop it first (as ❚❚ or ■ does) and show the new mode
idle; WHILE I lead is selected and idle THE SYSTEM SHALL draw the Tuner
glyph (three bars) in the start circle in place of ▶ and caption the card
"hold <N> beat(s) · <lenient | medium | accurate> tuning" instead of the
sequence caption, with the page unchanged otherwise; WHILE play along is
selected THE SYSTEM SHALL behave as `REQ-002` through `REQ-008`; and in I
lead THE SYSTEM SHALL have no count-in, rest bar or sound mode — they are
play along's settings and a lead run starts waiting silently on its first
note

**Scenarios**
- **REQ-014/S1 — choosing I lead**
  Given the example traversal, play along, idle, 2 beats and medium stored
  When "I lead" is tapped
  Then "I lead" is underlined and "play along" muted, the start circle
  shows the Tuner glyph, the caption reads "hold 2 beats · medium tuning",
  nothing sounds, and the microphone has not been asked for
- **REQ-014/S2 — and back**
  Given I lead idle
  When "play along" is tapped
  Then ▶ is back in the circle and the caption reads "15 notes · C4–C5"
- **REQ-014/S3 — the words stop a run**
  Given the sequence of `REQ-002/S1` is playing at note 9, play along
  When "I lead" is tapped
  Then sound stops within 50 ms, the card is the I lead idle card, and
  nothing is listening; given instead a lead run at note 3, tapping "play
  along" ends listening and shows the play-along idle card with ▶
- **REQ-014/S4 — one beat, singular**
  Given I lead idle with Hold 1 and accurate
  When the card is read
  Then the caption reads "hold 1 beat · accurate tuning"
- **REQ-014/S5 — play along is as it was**
  Given play along selected, count-in on
  When ▶ is tapped
  Then the count-in, the run, the caption "<note> · k of N" and the
  highlight follow `REQ-002`, `REQ-003`, `REQ-005` and `REQ-006` exactly,
  with the mode words still shown beneath the caption

### REQ-015: A lead run

WHEN the start circle is tapped WHILE I lead is selected and idle
THE SYSTEM SHALL stop the drone if it sounds (`practice.drone/REQ-004`,
the pill showing ▶), request listening (`listening.pitch-detection/REQ-001`
— the microphone asked for at that moment and never before), make the
first note of the sequence the target — emitting `TargetAdvanced` with
the note and position 1 — and show the live card: ■ in place of the start
circle, the target's letter large in the accent with its octave, the
caption "<k> of <N>", and the judgement line (`REQ-017`); WHILE a lead run
is in progress THE SYSTEM SHALL sound no sequence note, click, drone or
tapped note — the tone cue of `REQ-018` is the only sound — and SHALL emit
`TargetAdvanced` for each new target, every one a member of the sequence
at the position given; WHEN ■ is tapped THE SYSTEM SHALL end listening
(the microphone released within 200 ms) and return to the I lead idle card
at the first note; WHEN the last note of the sequence is held (`REQ-016`)
with looping disabled THE SYSTEM SHALL end listening and show the complete
card — the start circle back with the Tuner glyph, the caption "<N> of <N>
held · <lowest>–<highest>" and the line "All held" — until the circle is
tapped again or the mode, key, variant, scale or traversal changes; WHERE
looping is enabled THE SYSTEM SHALL instead make the first note the target
again at once, still listening; and IF the sequence has no notes THEN the
circle SHALL do nothing

**Scenarios**
- **REQ-015/S1 — the run starts on the first note (acceptance)**
  Given the example traversal, I lead idle, the drone off, the microphone
  not yet asked for
  When the start circle is tapped
  Then the microphone is asked for at that moment, the card shows ■, "C"
  large with "4", "1 of 15" and "Play C4", C4 is highlighted on the stave
  (or its column in the names view), `TargetAdvanced` carried C4 at 1,
  and nothing sounds
- **REQ-015/S2 — stop**
  Given the run of S1 at target 6 with 700 ms held
  When ■ is tapped
  Then the microphone is released within 200 ms, the card is the I lead
  idle card ("hold 2 beats · medium tuning", the Tuner glyph), no note is
  highlighted, and tapping the circle again starts from C4 with no hold
  carried over
- **REQ-015/S3 — the last note held, loop off**
  Given the run of S1 with looping disabled, at target 15 (C4)
  When C4 is held for the required time
  Then listening ends, the microphone is released, the card reads "15 of
  15 held · C4–C5" with "All held" beneath and the start circle back with
  the Tuner glyph, every note of the run is ink, and tapping the circle
  starts a new run from C4
- **REQ-015/S4 — the last note held, loop on**
  Given the run of S1 with looping enabled, at target 15
  When C4 is held for the required time
  Then without a pause C4 at position 1 is the target again ("1 of 15"),
  `TargetAdvanced` carried C4 at 1, listening never stopped, and no
  complete card was shown
- **REQ-015/S5 — the drone goes first**
  Given I lead idle and the drone sounding C5
  When the start circle is tapped
  Then the drone is silent within 500 ms and its pill shows ▶ before the
  run's first target is shown; given instead the drone switched on during
  a lead run, the run stops first (idle, the microphone released) and then
  the drone sounds (`practice.drone/REQ-004`)
- **REQ-015/S6 — nothing sounds while leading (invariant)**
  Given every way into a lead run — from I lead idle with the drone off or
  on, after a complete card, after a stop
  When the run is in progress
  Then at no instant is a sequence note, a click, the drone or a tapped
  note sounding; the only sound ever made is the tone cue of `REQ-018`
  when it is on
- **REQ-015/S7 — the Tuner pill ends the run**
  Given a lead run at target 4
  When the Tuner pill is tapped
  Then the run stops as ■ does before the tuner opens
  (`practice.tuner/REQ-001`), and ‹ Practice returns to the I lead idle
  card
- **REQ-015/S8 — no notes, no run**
  Given a key with no notes of the scale in the variant's range (the
  summary "no notes of this key in range")
  When the start circle is tapped in I lead
  Then nothing happens and the microphone is not asked for

### REQ-016: The judgement and the hold

WHILE a lead run is in progress and a detected pitch is published
(`listening.pitch-detection/REQ-002`)
THE SYSTEM SHALL judge it against the target's pitch
(`theory.temperament/REQ-001`): the offset in cents from the target,
smoothed exactly as `practice.tuner/REQ-002` smooths (one tenth of the way
per reading; a reading more than 25 ¢ from the shown offset shown at
once; the first reading after nothing was heard or after a new target as
detected), in tune WHEN |offset| ≤ the tolerance — lenient 15 ¢, medium
10 ¢, accurate 5 ¢ — else sharp or flat, and SHALL emit `NoteJudged` with
the target, the smoothed offset and that verdict; THE SYSTEM SHALL
accumulate hold time as the elapsed time between consecutive in-tune
readings, SHALL reset it to zero on a reading that is not in tune, and
SHALL neither add to it nor reset it while nothing is detected; WHEN the
accumulated hold time reaches the required hold — beats × 60000 / tempo
ms, beats the Hold setting (1, 2 or 4) and the tempo the current one —
THE SYSTEM SHALL advance the target to the next note of the sequence
(`REQ-015`) with the hold at zero; and THE SYSTEM SHALL never advance the
target in a lead run for any other reason (invariant)

> Amended 2026-10-02 at the tasks gate, with the user's approval (the 005
> precedent): S3's excursion lasts 100 ms, not one reading — with the
> smoothing of `practice.tuner/REQ-002` a single +17 ¢ reading shows as
> +6; S9's offset corrected from −655 ¢ to −194 ¢ (C4 +6 ¢ against D4).
> Amended at converge (decision D001): S4 says the advance comes 350 ms
> after the note returns to within one reading interval — the first reading
> back counts nothing. Behaviour unchanged.

**Scenarios**
- **REQ-016/S1 — held, then the next (acceptance)**
  Given the run of `REQ-015/S1`, medium, 2 beats, 96 bpm, the target C4
  (261.63 Hz)
  When a steady 262.5 Hz (+6 ¢) is detected from t = 0
  Then every reading judges in tune, `NoteJudged` carries C4 and +6 in
  tune, the hold accumulates, and at t = 1250 ms the target is D4 ("2 of
  15", `TargetAdvanced` D4 at 2) with the hold at zero
- **REQ-016/S2 — out of tune**
  Given the target C4, medium
  When a steady 258.92 Hz (−18 ¢) is detected
  Then every `NoteJudged` carries −18 and flat, the hold stays at zero, and
  the target stays C4 however long it sounds; at 264.47 Hz (+19 ¢) the
  verdict is sharp
- **REQ-016/S3 — leaving the band resets**
  Given the target E4 (329.63 Hz), medium, 2 beats, 96 bpm
  When 330.6 Hz (+5 ¢) is detected for 900 ms, then 332.9 Hz (+17 ¢) for
  100 ms — smoothed as the tuner smooths, the shown offset leaves ±10 ¢
  after about the sixth reading — then 330.6 Hz again
  Then the hold had reached 900 ms, fell to zero on the first reading whose
  smoothed offset was outside the band, and the target advances 1250 ms
  after the first in-tune reading that followed it — not 350 ms after
- **REQ-016/S4 — silence pauses**
  Given the target E4, the hold at 900 ms in tune
  When nothing is detected for two seconds and then 330.6 Hz (+5 ¢) again
  Then no `NoteJudged` was emitted during the silence, the hold is still
  900 ms when the note returns, and the target advances 350 ms after it
  does — to within one reading interval, the first reading back counting
  nothing: hold time is the elapsed time between consecutive in-tune
  readings, so the count resumes from that reading, not across the gap
- **REQ-016/S5 — the tolerance decides the verdict**
  Given a steady 331.92 Hz (+12 ¢) against the target E4
  When the In tune setting is lenient, medium, accurate in turn
  Then the verdict is in tune (±15), sharp (±10), sharp (±5); at +8 ¢ it
  is in tune, in tune, sharp; at +4 ¢ in tune every time
- **REQ-016/S6 — the target never advances early (invariant)**
  Given every tolerance (15, 10, 5), every Hold (1, 2, 4) and every tempo
  from 40 to 200 in steps of 2
  When any sequence of readings and silences is fed
  Then the target advances only on an in-tune reading at which the
  accumulated in-tune time is at least beats × 60000 / tempo ms, and never
  on a reading that is not in tune, never in silence, and never with less
  accumulated
- **REQ-016/S7 — the tempo changes the requirement, not the progress**
  Given the target E4, 2 beats, 96 bpm, the hold at 900 ms
  When + is tapped twelve times (120 bpm) while the note stays in tune
  Then the required hold is 1000 ms from then on and the target advances
  100 ms later; given − instead, down to 60 bpm, the required hold is 2000
  ms and the 900 ms already held still counts
- **REQ-016/S8 — far away, an octave included**
  Given the target C4
  When a steady 523.25 Hz (C5) is detected
  Then `NoteJudged` carries C4, +1200 and sharp, the hold stays at zero,
  and no other note is named anywhere
- **REQ-016/S9 — a new target starts clean**
  Given the target D4 reached from C4 as in S1, with the same 262.5 Hz
  still sounding
  When the first reading against D4 arrives
  Then it is shown as detected (−194 ¢, flat, pinned — `REQ-017`), not
  smoothed from C4's +6, and the hold is zero

### REQ-017: The meter on the target note and the live card

WHILE a lead run is in progress
THE SYSTEM SHALL highlight the target note as a sounding note is
highlighted (`REQ-006` — the enlarged accented notehead with its halo, or
the names column), draw the notes before the target in the run in ink and
the notes after it faint, and draw on the target, in both the stave and
the names view, a meter in which ±50 ¢ spans 40 px with sharp up and flat
down: a pale green band ±tolerance tall (medium ±10 ¢ = 8 px) behind the
note — 26 px wide centred on the notehead on the stave, the column width
less 6 px each side in the names view — filling from left to right in the
hold-fill green by held time ÷ required hold, and a 2 px pitch line in
front of the note at the smoothed offset clamped to ±50 ¢ (2 px past the
band each side on the stave; 3 px in from the column edge in the names
view), green when in tune, the flat colour below the band and the sharp
colour above, moving to a new offset over 180 ms, and hidden while
nothing is detected; THE SYSTEM SHALL show on the card, beside the target
letter and the caption "<k> of <N>", the judgement: "Play <target>" muted
while nothing is detected, "↓ <n> ¢ flat" in the flat colour or "↑ <n> ¢
sharp" in the sharp colour (n the smoothed offset to the whole cent, its
sign the direction) while out of tune, "in tune · holding" in green while
in tune, and "<previous note> held ✓" in green from an advance until the
first reading against the new target or 0.4 s of silence, whichever is
first; and WHEN no detected pitch has been published for 300 ms THE SYSTEM
SHALL clear the pitch line and show "Play <target>", the hold and the
fill unchanged

> Amended at converge (decision D002): S4 no longer shows the pinned line
> beside "C4 held ✓"; the line is the first reading against D4
> (`REQ-016/S9`), which also clears "held ✓". Behaviour unchanged.

**Scenarios**
- **REQ-017/S1 — silent on the stave**
  Given the run of `REQ-015/S1`, stave view, nothing detected
  When the panel and card are read
  Then C4's notehead is accented, enlarged and haloed with a pale green
  band 26 px wide and 8 px tall centred on it, no fill and no line; every
  other notehead is faint; the card reads "C 4", "1 of 15", "Play C4"
  muted
- **REQ-017/S2 — flat**
  Given the target C4, medium
  When 258.92 Hz (−18 ¢) is detected
  Then a 2 px line in the flat colour sits 7.2 px below the notehead's
  centre (18 ¢ of 40 px per 100), outside the band, the band has no fill,
  and the card reads "↓ 18 ¢ flat" in the flat colour; at +12 ¢ the line
  is 4.8 px above the centre in the sharp colour and the card reads "↑ 12
  ¢ sharp"
- **REQ-017/S3 — holding**
  Given the target C4, 2 beats, 96 bpm, +6 ¢ in tune for 750 ms
  When the panel and card are read
  Then the line is green inside the band, the band is filled from the left
  to 60 % of its width in the hold-fill green, and the card reads "in tune
  · holding" in green
- **REQ-017/S4 — advanced**
  Given C4 just held and D4 the target, the same note still sounding
  When the panel and card are read after the advance, before the first
  reading against D4
  Then C4's notehead is ink and no longer enlarged, D4 is highlighted with
  its band, no fill and no pitch line yet, E4 onward faint, and the card
  reads "D 4", "2 of 15", "C4 held ✓" in green; the first reading against
  D4 then draws the line, pinned at the band box's bottom edge in the flat
  colour (`REQ-016/S9`), and "C4 held ✓" gives way to "↓ 194 ¢ flat"
- **REQ-017/S5 — pinned beyond ±50 ¢**
  Given the target C4
  When 523.25 Hz (C5, +1200 ¢) is detected
  Then the line sits at the top edge of the 40 px box in the sharp colour
  and the card reads "↑ 1200 ¢ sharp"
- **REQ-017/S6 — the names view**
  Given the names view, the target E4, +5 ¢ held 500 ms of 1250
  When the panel is read
  Then the E column is highlighted, its band spans the column width less 6
  px each side, 8 px tall, filled 40 % from the left, and the green line
  runs from 3 px inside the column's left edge to 3 px inside its right,
  at 2 px above centre
- **REQ-017/S7 — silence clears the line, keeps the fill**
  Given the hold at 900 ms with the fill at 72 %
  When nothing is detected for 300 ms
  Then the line is gone, the band still shows 72 % filled, and the card
  reads "Play E4"; when the note returns in tune the line is back at once
  and the fill continues from 72 %
- **REQ-017/S8 — ink behind, faint ahead**
  Given the run at target 10 (G4 on the way down)
  When the stave is read
  Then C4 through F4 — the notes below the target in the run — are ink, G4
  is the highlighted target, and A4 B4 C5 are faint

### REQ-018: Cues — the meter and the tone

THE SYSTEM SHALL offer two cues in the Traversal sheet's Cues row as
independent toggle pills, meter (on by default) and tone (off by default);
WHERE meter is off THE SYSTEM SHALL draw no band, fill or line on the
target note, keeping the target's highlight and the card's judgement;
WHERE tone is on THE SYSTEM SHALL sound the target as a playback tone
(`REQ-005`) of about 400 ms as each new target appears, the first
included, and from that tone's onset until it has ended with its release
plus about 100 ms THE SYSTEM SHALL judge nothing — no `NoteJudged`, no
line, no hold accumulated — resuming with the next detected pitch after
that window as a first reading (`REQ-016`); and the Cues row's hint SHALL
read "Sharp/flat on the note · a tone per note" with both on, "Shows sharp
or flat on the note" with meter only, "A short tone as each note comes
up" with tone only, and "Just the note highlight" with neither

**Scenarios**
- **REQ-018/S1 — meter off**
  Given a lead run at C4 with meter off, −18 ¢ detected
  When the panel and card are read
  Then C4 is highlighted with no band, fill or line, and the card still
  reads "↓ 18 ¢ flat"; the hold still accumulates when in tune and the
  target still advances
- **REQ-018/S2 — the tone sounds each target**
  Given tone on, the example traversal
  When the start circle is tapped, and later C4 is held
  Then a tone at 261.63 Hz sounds for about 400 ms as "1 of 15" appears,
  and a tone at 293.66 Hz as D4 becomes the target
- **REQ-018/S3 — the tone is never the learner (measured)**
  Given tone on, 1 beat at 150 bpm (a 400 ms hold), the microphone fed
  with the tool's own output
  When the run starts
  Then no `NoteJudged` is emitted while the tone sounds or in the 100 ms
  after it, the hold stays at zero, the target stays C4, and "Play C4" is
  shown once the window has passed
- **REQ-018/S4 — tone off**
  Given tone off
  When a lead run starts and advances through three targets
  Then nothing has sounded at any point
- **REQ-018/S5 — the hint follows the pills**
  Given the Cues row with meter on and tone off
  When tone is tapped on, then meter tapped off, then tone tapped off
  Then the hint reads "Sharp/flat on the note · a tone per note", then "A
  short tone as each note comes up", then "Just the note highlight"

### REQ-019: Changes while leading

WHEN the key, the variant, the scale, the direction, the octaves or the
shape changes WHILE a lead run is in progress
THE SYSTEM SHALL restart the lead run on the new sequence from its first
note at once, still listening, with the hold at zero; WHEN the tempo, the
Hold or the In tune setting changes THE SYSTEM SHALL apply it from the
next reading — the required hold recomputed, the accumulated hold time
kept — and WHEN a cue changes THE SYSTEM SHALL apply it at once; and THE
SYSTEM SHALL never stop, pause or interrupt a lead run because a sheet,
the drawer or the instrument picker opened or closed

**Scenarios**
- **REQ-019/S1 — a new key mid-run**
  Given the run of `REQ-015/S1` at target 9
  When G major is selected
  Then G major's sequence begins at its first note ("G4", "1 of 15") with
  the hold at zero, listening never stopped, and the microphone was not
  asked for again
- **REQ-019/S2 — a tighter tolerance mid-hold**
  Given the target E4, medium, +8 ¢ held for 600 ms
  When accurate is chosen in the sheet
  Then the next reading at +8 ¢ is sharp, the hold resets to zero, and the
  line turns the sharp colour outside a band now 4 px tall
- **REQ-019/S3 — more beats mid-hold**
  Given the target E4, 2 beats at 96 bpm, 900 ms held
  When Hold 4 is chosen
  Then the required hold is 2500 ms, the 900 ms still counts, and the fill
  drops to 36 %
- **REQ-019/S4 — the sheet is not a stop**
  Given a lead run at target 3 with 400 ms held
  When the Traversal sheet is opened, left open through a reading, and
  closed
  Then listening never stopped, readings were judged throughout, and the
  hold carried on
- **REQ-019/S5 — a traversal change restarts**
  Given the run at target 9
  When ↑ is chosen
  Then the ↑ run of 8 begins at C4, "1 of 8", the hold at zero

### REQ-020: The Traversal sheet

THE SYSTEM SHALL lay the Traversal sheet out as rows of one fixed height
(62 px), each with its label and a two-line hint beneath in a fixed box,
with no title row, in this order: Who leads — pills "play along" | "I
lead", the hint "It plays, you follow" or "It listens, you play", and the
sheet's ✕ at the row's right; then exactly three rows that depend on the
mode — in play along, Sound (notes / both / metronome, "What it plays for
you"), Count-in (a switch, "A bar of clicks before it starts") and Rest
bar (a switch, "A bar's rest before each loop"); in I lead, Hold (pills 1
/ 2 / 4, the hint "Beats in tune, then the next · <s> s", s = beats × 60 ÷
tempo to one decimal), In tune (pills lenient / medium / accurate, the
hint "Within <c>% of the way to the next note", c the tolerance in cents)
and Cues (`REQ-018`) — then a hairline, then the shared rows Direction
("Up, down, or up and back"), Octaves ("How far the run goes"), Shape
("Every note, or 1 3 5") and Loop (a switch, "Start again at the end"),
their controls and behaviour unchanged from `REQ-001`; WHEN the mode is
changed in the sheet or on the card THE SYSTEM SHALL swap the three
mode rows without changing the sheet's height or moving any other row,
control or the ✕; and THE SYSTEM SHALL keep the summary row above the
sheet as `REQ-001/S2` reads it, with no mode or hold in it

**Scenarios**
- **REQ-020/S1 — play along's rows**
  Given play along, the sheet opened
  When it is read top to bottom
  Then the rows are Who leads (play along selected, "It plays, you
  follow", ✕ at the right), Sound, Count-in, Rest bar, a hairline,
  Direction, Octaves, Shape, Loop — nine rows of 62 px, no title
- **REQ-020/S2 — I lead's rows**
  Given I lead, 2 beats, medium, 120 bpm, the sheet opened
  When it is read
  Then the rows are Who leads ("It listens, you play"), Hold (2 selected,
  "Beats in tune, then the next · 1.0 s"), In tune (medium, "Within 10% of
  the way to the next note"), Cues (meter selected, tone not, "Shows sharp
  or flat on the note"), a hairline, then the same four shared rows
- **REQ-020/S3 — nothing moves under the finger**
  Given the sheet open in play along, the position of every row, pill,
  switch and the ✕ noted
  When "I lead" is tapped in the Who leads row, and then "play along"
  Then the sheet's height is the same before, between and after, the ✕
  and the Who leads pills have not moved, the hairline and the four shared
  rows have not moved, and only the three rows between changed
- **REQ-020/S4 — the hints follow the settings**
  Given I lead, 96 bpm
  When Hold 1, 2 and 4 are chosen in turn, then lenient and accurate
  Then the Hold hint reads "… · 0.6 s", "… · 1.3 s", "… · 2.5 s" (one
  decimal, half rounded up), and the In tune hint "Within 15% …" then
  "Within 5% …"; nudging the tempo to 120 changes "1.3 s" to "1.0 s"
- **REQ-020/S5 — the shared rows still do what they did**
  Given C major on flute Concert, the sheet open in I lead
  When the Octaves row is read and 2 oct tapped
  Then it offered 1 oct, 2 oct, 3 oct and full as `REQ-001/S1`, the run is
  now two octaves C4–C6, and the summary row reads "↑↓ · 2 oct · scale ·
  loop"

### REQ-021: The meter keeps up (Article V)

WHILE a lead run is in progress
THE SYSTEM SHALL show every reading on the meter and the card within 100
ms of the start of the sound it reflects in the microphone signal, SHALL
refresh them at least every 50 ms while a steady note is heard, SHALL show
the advance — the new target highlighted and the card changed — within 100
ms of the reading that completed the hold, and IF a reading would be shown
more than 100 ms after its sound THEN THE SYSTEM SHALL drop it and show
nothing new

**Scenarios**
- **REQ-021/S1 — the budget (measured)**
  Given known tones fed as the microphone through a scripted lead run of
  the example traversal — silence, a flat entry at −30 ¢ settling to in
  tune over 650 ms, a drift to −16 ¢ and back, each note held to its
  advance — at medium, 2 beats, 96 bpm
  When the instant each tone starts in the signal is compared with the
  instant its reading shows, and the instant the hold completes with the
  instant the next target shows
  Then every shown reading is within 100 ms, at least 20 readings are
  shown per second while a tone is steady, every advance shows within 100
  ms, and each advance falls at 1250 ms of accumulated in-tune time (±one
  reading interval) and never earlier
- **REQ-021/S2 — late is dropped (measured)**
  Given the device stalled so that a reading would be 100 ms or more
  behind its sound
  When the stall ends
  Then that reading was never shown; the next that can meet the bound is
- **REQ-021/S3 — playback untouched (measured)**
  Given play along at 40, 96 and 200 bpm
  When `REQ-008/S1` and `REQ-006/S4` are measured after this change
  Then they pass as before
- **REQ-021/S4 — on the phone (acceptance)**
  Given the phone on the stand with the flute, I lead, C major up and down
  When the run is played note by note
  Then the line follows the embouchure without feeling behind, the fill
  grows as the note is held, the target moves on when and only when the
  note has been held, and the user signs off

### REQ-022: When the microphone cannot be used

IF listening reports the microphone refused, none, or failed
(`listening.pitch-detection/REQ-006`) when a lead run starts or while it
runs
THEN THE SYSTEM SHALL end the run, show on the card "Can't hear — no
microphone" with the line "It was refused or isn't there. Allow the
microphone for this site, then press I lead again." — visible,
non-interrupting, no modal — with the start circle and the mode words
still shown, and SHALL try again at the next tap of the start circle; a
failure while running SHALL be shown within 500 ms; and THE SYSTEM SHALL
ask for the microphone nowhere on the practice screen but at the start of
a lead run

**Scenarios**
- **REQ-022/S1 — refused**
  Given the microphone is refused
  When the start circle is tapped in I lead
  Then the card shows "Can't hear — no microphone" and its line, the start
  circle and the mode words, nothing modal opens, no note is highlighted,
  and the sheet, the drone and the Tuner pill still work
- **REQ-022/S2 — the next tap tries again**
  Given the card of S1 and the microphone since allowed
  When the start circle is tapped
  Then the run starts as `REQ-015/S1`
- **REQ-022/S3 — failed while leading**
  Given a lead run at target 4
  When the microphone is unplugged or its permission revoked
  Then within 500 ms the card shows the no-mic card, the highlight and the
  meter are cleared, and the hold is forgotten
- **REQ-022/S4 — nothing before the gesture**
  Given the tool has just opened in I lead
  When no control has been touched, and then the sheet is opened and
  closed and a mode word tapped
  Then no permission prompt has been shown

## MODIFIED

### REQ-002: Play and stop

WHEN ▶ is tapped while idle in play along
THE SYSTEM SHALL play the sequence from its first note (after the count-in,
where enabled), SHALL show the sounding note's name and its position as
"<note> · k of N" in the caption, and WHILE looping is enabled SHALL start
the sequence again after its last note (after a rest bar, where enabled)
until stopped; WHEN ❚❚ is tapped while playing THE SYSTEM SHALL silence
within 50 ms and return to idle at the first note; WHEN the last note ends
with looping disabled THE SYSTEM SHALL return to idle; WHILE idle in play
along THE SYSTEM SHALL caption the sequence as "<N> notes ·
<lowest>–<highest>" — N the sequence's length (a ↑↓ run of 8 is 15), the
extremes those of the run; and in every state the card SHALL carry the
mode words (`REQ-014`) beneath the caption where the progress bar was,
and no progress bar

**Scenarios**
- **REQ-002/S1 — G major up and down (acceptance)**
  Given G major on flute Concert, ↑↓, 2 oct, scale, sound both, loop
  and count-in on, rest bar off, 96 bpm, play along
  When ▶ is tapped
  Then after a four-beat count-in the notes G4 A4 B4 C5 D5 E5 F♯5 G5 A5 B5
  C6 D6 E6 F♯6 G6 F♯6 … A4 G4 sound in turn, one per beat, the caption
  reads "G4 · 1 of 29" then "A4 · 2 of 29" and so on with "play along"
  underlined beneath it throughout, and after "G4 · 29 of 29" the sequence
  starts again from "G4 · 1 of 29"
- **REQ-002/S2 — stop returns to the top**
  Given the sequence of S1 is playing at note 12
  When ❚❚ is tapped
  Then sound stops within 50 ms, the caption reads "29 notes · G4–G6", the
  mode words are still beneath it, and tapping ▶ again begins with the
  count-in and G4
- **REQ-002/S3 — once through**
  Given the traversal of S1 with looping disabled
  When ▶ is tapped and the 29th note ends
  Then the transport is idle with the caption "29 notes · G4–G6"
- **REQ-002/S4 — the idle caption follows the traversal**
  Given G major on flute Concert, idle, play along
  When the shape is changed to arpeggio with 2 oct (↑↓)
  Then the caption reads "13 notes · G4–G6" (G4 B4 D5 G5 B5 D6 G6 and back);
  with full range and scale it reads "43 notes · C4–C7"; with ↑ only, the
  2-oct scale reads "15 notes · G4–G6"
- **REQ-002/S5 — one card height, idle and playing**
  Given play along idle
  When ▶ is tapped and the run plays, and ❚❚ is tapped
  Then the card's height is the same idle, playing and idle again, and the
  same as the I lead idle card's

**Was:**
> WHEN ▶ is tapped while idle
> THE SYSTEM SHALL play the sequence from its first note (after the count-in,
> where enabled), SHALL show the sounding note's name and its position as
> "<note> · k of N" with a progress bar at k/N, and WHILE looping is enabled
> SHALL start the sequence again after its last note (after a rest bar, where
> enabled) until stopped; WHEN ❚❚ is tapped while playing THE SYSTEM SHALL
> silence within 50 ms and return to idle at the first note; WHEN the last
> note ends with looping disabled THE SYSTEM SHALL return to idle; and WHILE
> idle THE SYSTEM SHALL caption the sequence as "<N> notes · <lowest>–<highest>"
> — N the sequence's length (a ↑↓ run of 8 is 15), the extremes those of the
> run — with the progress bar empty

### REQ-009: The page hidden, the screen awake

WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
while playing or while a lead run is in progress
THE SYSTEM SHALL stop playback, or end the lead run and release the
microphone within 200 ms, and return to the mode's idle card — nothing
resumed when the page is shown again; and WHILE playing or leading THE
SYSTEM SHALL keep the screen awake where the platform allows it

**Scenarios**
- **REQ-009/S1 — hidden means stopped**
  Given the sequence is playing
  When the page is hidden and shown again
  Then it is idle, silent, with the idle caption
- **REQ-009/S2 — the phone on the stand stays lit**
  Given the phone would dim after its idle interval
  When a sequence is playing, or a lead run is in progress, for longer
  than that interval
  Then the screen has not dimmed; after ❚❚ or ■ the normal behaviour
  returns
- **REQ-009/S3 — a lead run hidden**
  Given a lead run at target 6 with 700 ms held
  When the page is hidden and shown again
  Then the microphone was released while hidden, the card is the I lead
  idle card ("hold 2 beats · medium tuning"), nothing is listening, no
  note is highlighted, and tapping the circle starts afresh from C4

**Was:**
> WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
> while playing
> THE SYSTEM SHALL stop playback and return to idle; and WHILE playing THE
> SYSTEM SHALL keep the screen awake where the platform allows it

### REQ-011: The session settings are remembered

WHEN the tool starts
THE SYSTEM SHALL restore the stored traversal (direction, octaves, shape),
the stored scale choice for each mode (major-family, minor-family), the
session settings (sound mode, loop, count-in, rest bar, tempo) and the
lead settings (who leads, Hold, In tune, the meter cue, the tone cue)
alongside the selection restored by `theory.circle-of-fifths/REQ-008`; IF
nothing is stored, the stored state is unreadable, or it predates this
change THEN THE SYSTEM SHALL use ↑↓, 1 oct, scale, both, loop on, count-in
on, rest bar off, 96 bpm, Major / Natural minor, play along, 2 beats,
medium, meter on and tone off for what is missing; and THE SYSTEM SHALL
never store whether it was playing or leading — it always starts idle in
the stored mode, and never listening

**Scenarios**
- **REQ-011/S1 — back where it was**
  Given the tool was closed with ↓, 2 oct, arpeggio, metronome, loop off,
  count-in off, rest bar on, 132 bpm, Dorian chosen on the minor ring,
  I lead with Hold 4, accurate, meter off and tone on, mid-run
  When it is reopened
  Then every one of those settings is restored, including Dorian and the
  lead settings, the term reads Allegro, the card is the I lead idle card
  reading "hold 4 beats · accurate tuning", and nothing is listening
- **REQ-011/S2 — first run**
  Given no stored state
  When the tool starts
  Then the summary row reads "↑↓ · 1 oct · scale · loop", the tempo reads
  96 Andante, the key name reads the plain key with no scale suffix
  (major-ring default Major, minor-ring default Natural minor), play along
  is underlined, and the sheet in I lead would show 2, medium, meter on
  and tone off
- **REQ-011/S3 — stored state from before this change**
  Given stored state from 002 (selection and display preferences only)
  When the tool starts
  Then the selection and display preferences are restored and every
  traversal, scale, session and lead setting takes its S2 default
- **REQ-011/S4 — stored state from 003 (before scale choice existed)**
  Given stored state from 003 (traversal and session settings, no scale
  choice recorded)
  When the tool starts
  Then the traversal and session settings restore as stored, and the
  major-ring scale defaults to Major, the minor-ring scale to Natural
  minor
- **REQ-011/S5 — stored state from 007 (before who leads existed)**
  Given stored state from 004–007 (traversal, scale, session and drone
  settings, no lead settings)
  When the tool starts
  Then everything stored restores as stored, and the mode is play along
  with Hold 2, medium, meter on and tone off

**Was:**
> WHEN the tool starts
> THE SYSTEM SHALL restore the stored traversal (direction, octaves, shape),
> the stored scale choice for each mode (major-family, minor-family) and
> session settings (sound mode, loop, count-in, rest bar, tempo) alongside
> the selection restored by `theory.circle-of-fifths/REQ-008`; IF nothing is
> stored, the stored state is unreadable, or it predates this change THEN THE
> SYSTEM SHALL use ↑↓, 1 oct, scale, both, loop on, count-in on, rest bar off,
> 96 bpm, and Major / Natural minor for what is missing; and THE SYSTEM SHALL
> never store whether it was playing — it always starts idle

### REQ-013: A tapped note sounds for one beat

WHEN a notehead in the stave view or a note's column in the names view is
tapped WHILE idle (in either mode)
THE SYSTEM SHALL sound that note of the run — for a names column, the
lowest note of that name in the run — as a playback tone (`REQ-005`) for
one beat at the current tempo, and SHALL highlight it as a sounding note is
(`REQ-006`) for that beat, without emitting `TargetAdvanced`, changing the
idle caption or moving the position; WHILE the drone sounds THE SYSTEM
SHALL sound the tapped note over it; WHEN the same or another note is
tapped before the beat ends THE SYSTEM SHALL end the earlier tone and start
the new one's beat; and WHILE playing, counting or a lead run is in
progress THE SYSTEM SHALL ignore taps on noteheads and columns

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
- **REQ-013/S5 — ignored while playing or leading**
  Given the sequence of `REQ-002/S1` is playing, or counting in, or a lead
  run is in progress at target 4
  When a notehead or column is tapped
  Then nothing extra sounds, the highlight stays on the sounding note or
  the target (or nothing while counting), and the run is unaffected
- **REQ-013/S6 — the descent's own notes**
  Given G melodic minor · classical, ↑↓, names view, idle
  When the ↓-marked F column is tapped
  Then a tone at F5's pitch sounds — the descending form's note as it
  appears in the written-out run
- **REQ-013/S7 — idle in I lead, too**
  Given I lead idle, stave view, 96 bpm
  When the E4 notehead is tapped
  Then a tone at 329.63 Hz sounds for 625 ms and E4 is highlighted for
  them, the caption still reads "hold 2 beats · medium tuning", and the
  microphone is not asked for

**Was:**
> WHEN a notehead in the stave view or a note's column in the names view is
> tapped WHILE idle
> THE SYSTEM SHALL sound that note of the run — for a names column, the
> lowest note of that name in the run — as a playback tone (`REQ-005`) for
> one beat at the current tempo, and SHALL highlight it as a sounding note is
> (`REQ-006`) for that beat, without emitting `TargetAdvanced`, changing the
> idle caption or moving the position; WHILE the drone sounds THE SYSTEM
> SHALL sound the tapped note over it; WHEN the same or another note is
> tapped before the beat ends THE SYSTEM SHALL end the earlier tone and start
> the new one's beat; and WHILE playing or counting THE SYSTEM SHALL ignore
> taps on noteheads and columns
