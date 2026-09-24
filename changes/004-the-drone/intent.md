---
type: Intent
title: the-drone — intent
description: Hold the selected key's tonic as a drone, from the circle's centre, for wind pitching and string tuning
resource: /changes/004-the-drone/intent.md
status: stable
tags: [sdd, intent, "change:004-the-drone"]
sources:
  - resource: conversation:2026-09-23
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-23T21:03:24Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T14:46:19Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: resolved
---

# Intent: the-drone

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

Wind players pitch against a reference; string players tune to one. The
product brief names the drone as a core practice aid alongside the
play-along; today the tool can play a scale but cannot hold a note.

## Proposed outcome

A pill in the centre of the circle holds the selected key's tonic as a drone
— tap ▶ and it sounds, in the octave nearest the middle of the instrument's
range, − / + to move it, ▼ to choose pure, warm or reed — retuning as the key
changes, silenced by ▶ on the transport and silencing it in turn. A note
tapped on the stave or in the names view sounds for one beat, over the
drone if it is on. A wind player can pitch against it and a string player
tune to it without leaving the circle.

## Affected users and systems

- The user, alone, phone on the stand or laptop.
- `practice` gains `practice.drone`; the `sound` context renders it (a
  voice with no end until stopped); `theory.temperament` gives its pitch
  (equal, A440 — just temperament arrives at 007).
- `practice.session` is modified: playback and the drone exclude each other
  (▶ stops the drone; drone-on stops playback), and a tapped note on the
  stave or names view sounds for one beat.

## Constraints

- Source design: "Drone card design" (Claude Design; `Drone Ideas.dc.html`
  importing the `Drone.dc.html` component, vendored under `design/` the way
  003 and 005 vendored theirs) — reviewed and iterated by the user; it is
  the source of truth for the screen (Q5 supersedes Q1's "no separate
  design"). Layout 3a and sheet 4a are the scope; the other five layouts on
  the page are rejected explorations.
- Articles VI (never interrupts), VII (synthesised locally), VIII.
- Persistence pattern of practice.session/REQ-011.

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Where does the drone's UI design come from?

**Recommended:** No new prototype — one small control next to the transport,
from the existing components; screenshot review against the design system.
**Answer:** Build from the existing vocabulary.
**Status:** decided

### Q2: Which note, and how is it chosen?

**Recommended:** Default to the selected key's tonic in the octave nearest
the middle of the instrument's range, following key changes; a drone sheet
(the Tempo sheet's shape) picks any in-range note with semitone and octave
steppers; a note pinned in the sheet survives key changes.
**Answer:** Tonic by default + any note via a sheet.
**Status:** decided

### Q3: Where does the drone control live, and how does it behave alongside playback?

**Recommended:** Its own card under the transport (toggle pill, "Drone · G4"
caption, "edit ›" to the drone sheet), sounding on through play/stop, key
changes (retuning seamlessly) and sheets; stopping when the page is hidden.
**Answer:** Drone stops when playback starts — own card, but ▶ silences the
drone; they never sound together.
**Status:** decided — own card; ▶ stops the drone; key changes retune
seamlessly; hidden page stops it. Whether the drone can be started while
playing (stopping playback) is Q4.

### Q4: The two exclusions, and tapping a note

User request during the grill: "Clicking a note on the stave should also
play that note for some time." Folded into this change (same sound
engine; a modification of practice.session).
**Recommended:** Starting the drone while playing stops playback (mirror of
▶ stopping the drone). Tapping a note on the stave or a names-view column
sounds it for one beat at the current tempo, with the halo, ignored while
playback runs (Article VI), allowed over the drone (checking an interval
against the reference — the one place two notes sound together); tapping
again before it ends restarts it.
**Answer:** Yes, all of it.
**Status:** decided

### Q5 (2026-09-24): A design now exists — which of its layouts is the one to build?

The user iterated a Claude Design project ("Drone card design": `Drone
Ideas.dc.html`, which imports the `Drone.dc.html` component; vendored under
`design/` with its runtime, the 003/005 pattern). The Ideas page holds six
placements — 1a own card (the Q3 answer), 2a transport mode switch, 2b pill
beside SCALE, 2c tap-the-selected-wedge, 3a pill in the centre disc, 3b pill
in the circle's corner — and 4a, a "sound only" sheet opened from 3a's ▼.
**Recommended:** 3a + 4a — the newest iteration on the page: a pill in the
centre disc above the key signature (▶/■ on-off, − / + octave, the note
label, ▼ to the sheet); the sheet holds on/off and the sound (pure, warm,
reed) and nothing else, because the note comes from the circle.
**Answer:** 3a disc pill + 4a sound-only sheet.
**Status:** decided — supersedes Q1 (there is a design; it is the source of
truth for the screen), Q2 (the drone is always the selected key's tonic; only
its octave is chosen, on the pill, any octave on a full piano A0–C8, starting
nearest the middle of the instrument's range — no note picker) and Q3's
placement (in the disc, not an own card; the exclusions and retuning stand).

### Q6: The octave, and what is remembered

As the design codes it: until − / + is touched the drone sits in the octave
nearest the middle of the instrument's range for each key (flute, G major:
G5); once stepped, that octave *number* is pinned and follows key and
instrument changes (G5 → D5 → C5); − / + stop at the piano's ends (A0–C8) and
grey out there; nothing survives a reload.
**Recommended:** As coded, plus remember the pinned octave and the sound
(pure / warm / reed) with the other session settings (practice.session/REQ-011
pattern); never store on/off — the tool always starts silent.
**Answer:** As coded, and remember octave and sound.
**Status:** decided

### Q7: What the tapped note sounds like

The design gives a tapped notehead or names column its own short "blip"
voice (triangle + sine) for one beat at the current tempo, ignores taps
while playing, and lights the note (halo on the stave, lit column in names).
**Recommended:** Playback's own tone (practice.session/REQ-005), held one
beat with its release — what you hear tapped is what you hear played, and
the sound context has nothing new to render for it (Article VIII). Highlight
as designed.
**Answer:** Playback's own tone.
**Status:** decided

### Q8: When sound cannot start, and the screen on the stand

**Recommended:** If sound cannot be produced when the drone is switched on:
the usual non-interrupting notice, the pill stays off, the next tap tries
again — a silent drone has no use, unlike REQ-010's silent walk, which still
shows the sequence. While the drone sounds the screen is kept awake exactly
as while playing (REQ-009), and a hidden page stops it (Q3).
**Answer:** Notice and stay off; screen stays awake.
**Status:** decided

## Resolved

- The design ("Drone card design", vendored at `design/`) is the source of
  truth for the screen: layout 3a — a pill in the centre disc above the key
  signature, mirroring the ♯/♭ toggle below it — with ▶/■ to start and stop,
  − / + to step the octave, the note label (e.g. G5), and ▼ opening the Drone
  sheet; and 4a — the sheet holds the on/off switch, the header "Drone ·
  G5 · 784.0 Hz" over "Follows the key on the circle · A = 440 Hz", a Sound
  row (pure / warm / reed, with the design's hints), and the one-line note
  about tapping a note. Nothing else.
- The drone is always the selected key's tonic, spelled as the circle spells
  it, and retunes seamlessly when the key changes while sounding. Only the
  octave is chosen: nearest the middle of the instrument's range per key
  until − / + is touched, then the pinned octave number follows key and
  instrument changes; any octave on a full piano (A0–C8), the steppers
  greying out at the ends.
- Pitch is equal temperament, A4 = 440 Hz (`theory.temperament/REQ-001`);
  just temperament arrives with 009.
- Three sounds as the design synthesises them — pure (a sine), warm (the
  default: soft, organ-like), reed (buzzy, closest to a wind drone) — with a
  gentle fade in and out and a short glide on retune; changing the sound
  while sounding takes effect at once.
- Playback and the drone never sound together: ▶ silences the drone; switching
  the drone on stops playback (to idle, at the top). Sheets, the drawer and
  the picker never stop the drone; a hidden page does.
- A tapped notehead on the stave or column in the names view sounds that note
  with playback's own tone for one beat at the current tempo, lit as the
  sounding note is (halo / lit column); tapping again restarts it; taps are
  ignored while playing; allowed over the drone (the one place two notes
  sound together — checking an interval against the reference).
- The pinned octave and the sound persist with the session settings
  (REQ-011 pattern); on/off is never stored — the tool always starts silent.
- No sound possible when switched on → the non-interrupting notice, the pill
  stays off, the next tap retries. The screen stays awake while the drone
  sounds.
- Acceptance: on the laptop and then the phone on the stand — flute, G major,
  ■ → G5 holds; − → G4; pick D major while it sounds → it slides to D4; tap
  F♯ on the stave over it; ▶ → the drone stops and the scale plays; drone on
  again → the scale stops; lock the phone → silence. The user signs off.

## Assumptions carried

- The drone sits a little below the playback tone in level (the design's
  0.12 against its 0.22 tap voice) so a tapped note reads over it; exact
  levels are the plan's, checked by ear at acceptance.
- Warm and reed as the design mixes them (a sawtooth/sine/sub-octave and a
  square/sawtooth/sub-octave stack under a low-pass) translate to the
  sound context's synthesiser without a design change; if a mix has to
  differ, the ear at acceptance decides, not the oscillator list.
- The design's `showHz`, `dronePlacement` and `sheetStyle: fifth` (1 / 5 /
  1+5 source pills) props are exploration knobs, not scope: Hz shows in the
  sheet header only, there is no placement choice, and there is no fifth.
- `practice.drone` is a new capability (roadmap, decisions 2026-09-19); the
  exclusion with playback and the tapped note are modifications to
  `practice.session`.

## Still open

- None beyond what `sdd-specify` decides: the exact requirement and scenario
  wording, and which of the exclusions is stated on which side.

## Riskiest unknown

The sound context renders voices with an onset and a duration; the drone is
a voice with no end, a level that fades, and a pitch that glides while it
sounds. Whether that fits the existing voice model in the worklet or needs a
second kind of voice is the plan's first question, and the phone decides
whether the fade and glide are free of clicks.
