---
type: Capability Spec
title: practice / drone
description: <one sentence — what this capability does for its users>
resource: /specs/practice/drone.md
status: stable
tags: [sdd, capability, "context:practice"]
sources:
  - resource: /changes/004-the-drone/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-26T12:07:32Z
verified:
  - by: human:merlin-webster
    at: 2026-09-26T12:07:33Z
sdd_context: practice
sdd_capability: drone
sdd_version: 0.1.0
sdd_phase: current
---

# practice / drone

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `practice.drone/REQ-NNN` and a scenario as
> `practice.drone/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

A pill in the centre of the circle holds the selected key's tonic as a drone: tap ▶ and it sounds, in the octave nearest the middle of the instrument's range, − / + moves it an octave, ▼ opens a sheet that offers pure, warm or reed. It follows the key as the key changes, retuning without a break. It and playback never sound together — ▶ on the transport silences it, switching it on stops playback. A note tapped on the stave or in the names view sounds for one beat, over the drone if it is on, so an interval can be checked against the reference. The octave and the sound are remembered; the tool always starts silent. The screen ("Drone card design", layouts 3a + 4a, vendored under `design/`) is the source of truth.

## Requirements

### REQ-001: The drone holds the key's tonic

THE SYSTEM SHALL offer a drone on the selected key's tonic — spelled as the
circle currently spells that key — from a pill in the circle's centre disc;
WHEN ▶ on the pill or the sheet's switch is tapped while the drone is off
THE SYSTEM SHALL sound the tonic at its pitch under `theory.temperament`
continuously, audible within 50 ms and faded in rather than struck, showing
■ on the pill and the switch on; WHEN ■ or the switch is tapped while it
sounds THE SYSTEM SHALL fade it out to silence within 500 ms and show ▶;
and THE SYSTEM SHALL show the drone's note as "<name><octave>" on the pill
and, in the sheet, "<name><octave> · <pitch> Hz" to one decimal

**Scenarios**
- **REQ-001/S1 — G major on the flute (acceptance)**
  Given G major on flute Concert (C4–C7), the drone off, nothing pinned
  When ▶ on the pill is tapped
  Then a continuous tone at 783.99 Hz (G5) is sounding within 50 ms, faded
  in, the pill shows ■ and "G5", and the sheet header reads "G5 · 784.0 Hz"
- **REQ-001/S2 — off**
  Given the drone of S1 is sounding
  When ■ is tapped
  Then the tone fades and is silent within 500 ms, the pill shows ▶ and
  still reads "G5"
- **REQ-001/S3 — the switch and the pill are one control**
  Given the drone is off and the Drone sheet is open
  When the switch is tapped on, then the sheet is closed and ■ tapped
  Then the drone sounds after the switch, the pill shows ■ while it does,
  and after ■ both the pill and the switch show off
- **REQ-001/S4 — sheets, the drawer and the picker never stop it**
  Given the drone is sounding
  When the Traversal sheet, the Scale sheet, the Tempo sheet, the Drone
  sheet, the settings drawer and the instrument picker are each opened and
  closed in turn
  Then the tone never stopped, faded or changed pitch

_Since 004-the-drone_

### REQ-002: The octave

THE SYSTEM SHALL place the drone, for each key, in the octave that puts the
tonic nearest the middle of the selected variant's range (the lower octave
when two are equally near) within that range; WHEN − or + is tapped THE
SYSTEM SHALL move the drone one octave down or up — retuning at once if it
sounds — and thereafter SHALL keep that octave number across key and
variant changes; SHALL allow any octave that keeps the tonic within A0–C8,
showing − or + as unavailable where the next step would leave it; and IF
the kept octave number would put a newly selected key's tonic outside
A0–C8 THEN THE SYSTEM SHALL use that key's default octave, keeping the
number for later keys

**Scenarios**
- **REQ-002/S1 — the default octave per key and variant**
  Given nothing pinned
  When G major and then C major are selected on flute Concert (C4–C7), on
  Ocarina Alto C (A4–F6) and on Ocarina Bass C (A3–F5)
  Then the drone's note is G5, G5 and G4 for G major, and C5 (nearest to
  the middle F♯5, tied with C6, the lower wins), C6 and C5 for C major
- **REQ-002/S2 — stepping while sounding**
  Given the drone of REQ-001/S1 is sounding G5
  When − is tapped
  Then the tone moves to 392.00 Hz (G4) without a break and the pill reads
  "G4"; + returns it to G5
- **REQ-002/S3 — the stepped octave follows the key and the instrument**
  Given G major on flute Concert with the drone stepped to G4
  When D major is selected, then Ocarina Alto C (A4–F6)
  Then the drone's note is D4 on the flute and still D4 on the ocarina,
  though the ocarina cannot play it — the octave number is pinned, the
  instrument's range no longer decides
- **REQ-002/S4 — the piano's ends**
  Given G major with the drone at G5
  When − is tapped repeatedly
  Then the note descends G4, G3, G2, G1 and − is then shown unavailable and
  does nothing; + from G1 ascends to G7, where + is unavailable; for C major
  the top is C8, and for A major the bottom is A0
- **REQ-002/S5 — a pinned octave the new key cannot use**
  Given A major with the drone stepped down to A0
  When C major is selected, then A major again
  Then the drone's note is C5 for C major (its flute default — C0 lies
  below A0) and A0 again for A major
- **REQ-002/S6 — unpinned, the octave follows the instrument**
  Given G major on flute Concert, nothing pinned, the drone at G5
  When Ocarina Bass C (A3–F5) is selected
  Then the drone's note is G4

_Since 004-the-drone_

### REQ-003: The drone follows the key

WHEN the selected key, the spelling preference or the variant changes WHILE
the drone sounds
THE SYSTEM SHALL retune to the drone's new note — the new key's tonic, or
the same pitch respelled, or the new default octave when unpinned — without
a break: the pitch glides to the new one within 100 ms, nothing restarts,
and the label follows

**Scenarios**
- **REQ-003/S1 — a new key while sounding**
  Given G major on flute Concert, the drone sounding G5
  When D major is selected on the outer ring
  Then the tone glides to 587.33 Hz (D5) within 100 ms, never stopping,
  and the pill reads "D5"; selecting B minor on the inner ring glides it
  to 987.77 Hz (B5 — the octave nearest the middle of C4–C7 for B: five
  semitones from F♯5, where B4 is seven)
- **REQ-003/S2 — respelling keeps the pitch**
  Given the position at six o'clock selected as F♯ major with sharp
  spelling, the drone sounding F♯5 at 739.99 Hz
  When the preference is switched to flat
  Then the pill reads "G♭5" and the tone is unchanged at 739.99 Hz
- **REQ-003/S3 — a new instrument while sounding, unpinned**
  Given G major on flute Concert, nothing pinned, the drone sounding G5
  When Ocarina Bass C (A3–F5) is selected
  Then the tone glides to G4 within 100 ms and the pill reads "G4"

_Since 004-the-drone_

### REQ-004: Playback and the drone never sound together

WHEN the drone is switched on WHILE playing or counting
THE SYSTEM SHALL stop playback first — silent within 50 ms, idle at the
first note, as ❚❚ does — and then sound the drone; WHEN ▶ on the transport
is tapped WHILE the drone sounds THE SYSTEM SHALL stop the drone before the
count-in or the first note sounds, showing the pill off; and THE SYSTEM
SHALL never have a sequence note or a click and the drone sounding at once
(a tapped note — `practice.session/REQ-013` — is the one thing that sounds
over the drone)

**Scenarios**
- **REQ-004/S1 — the drone interrupts a run**
  Given G major is playing at note 9 of 29
  When ▶ on the pill is tapped
  Then the run is silent within 50 ms, the caption reads "29 notes ·
  G4–G6" with the progress bar empty, and the drone sounds G5
- **REQ-004/S2 — ▶ silences the drone**
  Given the drone is sounding G5, count-in enabled
  When ▶ on the transport is tapped
  Then the drone is silent before the first count-in click, the pill shows
  ▶, and the run proceeds as `practice.session/REQ-002/S1`
- **REQ-004/S3 — never both (invariant)**
  Given every interleaving of ▶ and ❚❚ on the transport with ▶ and ■ on
  the pill, up to four taps long, from idle
  When the sounds are inspected at every instant
  Then at no instant is a sequence tone or a click sounding while the
  drone is

_Since 004-the-drone_

### REQ-005: The drone sound

THE SYSTEM SHALL render the drone in one of three drone sounds chosen from
the Drone sheet's Sound row — pure (a single sine at the note's pitch),
warm (a soft, organ-like blend with a sub-octave), reed (a buzzier blend) —
defaulting to warm, at a peak level no more than 60 % of a playback tone's;
SHALL show the current sound marked with a hint beneath the row title —
"Sine · easiest to hear beats against", "Soft, organ-like", "Buzzy ·
closest to a wind drone"; and WHEN the sound changes WHILE the drone sounds
THE SYSTEM SHALL apply it at once, the new sound audible within 300 ms with
no silence between

**Scenarios**
- **REQ-005/S1 — warm by default**
  Given nothing stored
  When the Drone sheet is opened
  Then the Sound row shows pure, warm and reed with warm marked and the
  hint "Soft, organ-like"
- **REQ-005/S2 — pure is a sine**
  Given pure chosen, the drone sounding A4
  When the sound is analysed
  Then its energy is at 440 Hz alone, with no partial above −40 dB
  relative to it
- **REQ-005/S3 — changing the sound mid-drone**
  Given warm chosen, the drone sounding G5
  When reed is tapped
  Then the hint reads "Buzzy · closest to a wind drone", the reed sound is
  audible within 300 ms, and the drone was never silent
- **REQ-005/S4 — under the tone**
  Given the drone sounding G5 in any sound
  When G5 is tapped on the stave (`practice.session/REQ-013`)
  Then the tapped tone's peak level is above the drone's, the drone's at
  most 60 % of it

_Since 004-the-drone_

### REQ-006: The Drone sheet

WHEN ▼ on the pill is tapped
THE SYSTEM SHALL open the Drone sheet showing the title "Drone" with the
note and pitch, the line "Follows the key on the circle · A = 440 Hz", the
on/off switch, the Sound row and the tapping note; and THE SYSTEM SHALL
never start, stop or retune the drone, nor stop playback, because the sheet
opened or closed

**Scenarios**
- **REQ-006/S1 — the sheet's content**
  Given G major on flute Concert, the drone off at G5, warm
  When ▼ is tapped
  Then the sheet shows "Drone" beside "G5 · 784.0 Hz", the line "Follows
  the key on the circle · A = 440 Hz", the switch off, the Sound row with
  warm marked, and the note "Tap a note on the stave or in the names to
  hear it for one beat — over the drone, to check an interval."
- **REQ-006/S2 — the sheet is not a control**
  Given the sequence of `practice.session/REQ-002/S1` is playing
  When the Drone sheet is opened, left open through several notes, and
  closed without touching the switch
  Then the notes kept sounding and advancing and the drone never sounded
- **REQ-006/S3 — the sheet follows the key**
  Given the Drone sheet is open reading "G5 · 784.0 Hz"
  When the sheet is closed, D major selected, and the sheet reopened
  Then it reads "D5 · 587.3 Hz"

_Since 004-the-drone_

### REQ-007: The page hidden, the screen awake

WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
WHILE the drone sounds
THE SYSTEM SHALL stop the drone and show the pill off; and WHILE the drone
sounds THE SYSTEM SHALL keep the screen awake where the platform allows it

**Scenarios**
- **REQ-007/S1 — hidden means silent**
  Given the drone is sounding
  When the page is hidden and shown again
  Then the drone is silent and the pill shows ▶; tapping ▶ sounds it again
- **REQ-007/S2 — the phone on the stand stays lit**
  Given the phone would dim after its idle interval
  When the drone sounds for longer than that interval
  Then the screen has not dimmed; after ■ the normal behaviour returns

_Since 004-the-drone_

### REQ-008: When sound cannot start

IF sound cannot be produced when the drone is switched on
THEN THE SYSTEM SHALL show the visible non-interrupting notice
(`practice.session/REQ-010`), leave the drone off with the pill showing ▶,
and try again at the next switch-on; and THE SYSTEM SHALL make no sound
and ask nothing before the first gesture

**Scenarios**
- **REQ-008/S1 — off, not silently on**
  Given sound cannot be produced
  When ▶ on the pill is tapped
  Then a notice appears where the tool's notices appear, nothing modal
  opens, the pill still shows ▶ and the switch off
- **REQ-008/S2 — the next tap tries again**
  Given the notice of S1 was shown and sound has since become available
  When ▶ on the pill is tapped
  Then the drone sounds as `REQ-001/S1`
- **REQ-008/S3 — nothing before the gesture**
  Given the tool has just opened with a stored octave and sound
  When no control has been touched
  Then no sound has been made and no permission or prompt has been shown

_Since 004-the-drone_

### REQ-009: The octave and the sound are remembered

WHEN the tool starts
THE SYSTEM SHALL restore the stored drone octave (a pinned octave number, or
unpinned) and the stored drone sound alongside the session settings of
`practice.session/REQ-011`; IF nothing is stored, the stored state is
unreadable, it predates this change, the octave is not a whole number from
0 to 8, or the sound is not one of pure, warm and reed THEN THE SYSTEM
SHALL use unpinned and warm for what is missing; and THE SYSTEM SHALL never
store whether the drone was sounding — it always starts off

**Scenarios**
- **REQ-009/S1 — back where it was**
  Given the tool was closed with the drone stepped to G4 on G major, reed
  chosen, sounding
  When it is reopened
  Then the pill reads "G4" and the drone is off; the Drone sheet shows reed
  marked; selecting D major reads "D4" (the pin survived)
- **REQ-009/S2 — first run**
  Given no stored state
  When the tool starts with C major on the flute
  Then the pill reads "C5" and ▶, and the Drone sheet shows warm marked
- **REQ-009/S3 — stored state from before this change**
  Given stored state from 005 (selection, traversal, scale and session
  settings, nothing about the drone)
  When the tool starts
  Then everything it carries is restored, the octave is unpinned and the
  sound warm
- **REQ-009/S4 — an unreadable octave or sound**
  Given stored state with the drone octave 12 and the sound "bright"
  When the tool starts
  Then the octave is unpinned, the sound warm, and everything else in the
  stored state is restored

_Since 004-the-drone_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-26 | 004-the-drone | 9 | 0 | 0 |
