---
type: Design Log
title: 007-hear-me — design rounds
description: Every round of the refinement loop for this change — what was tried, what the user chose, and why — so a decision made on the fifth try is never undone on the sixth.
resource: /changes/007-hear-me/design/rounds.md
status: draft
tags: [sdd, design, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/proposal.md
  - resource: /docs/design.md
generated:
  by: claude-code/unknown
  at: 2026-09-27T09:55:30Z
verified: []
sdd_id: 007-hear-me
sdd_phase: open           # open | exited
---

# Design rounds — 007-hear-me

> The design record for this change. **Origin** says where the starting
> design came from. **Rounds** is the refinement loop on the live build, one
> block per round, newest last; there is no gate per round. **Exit** is filled
> once, when the user says the screens are done, and is what `sdd-finish` and
> the fidelity pass read.

## Origin

- **Source:** imported — Claude Design project "Tuner feature design"
  (`946097da-1312-43a7-b34a-75f6ed30c06d`, the user's), read through the
  design MCP on 2026-09-27 and vendored here, the pattern of 003/004/005.
  Decided at the grill (intent Q11): it is the source of truth for the
  screen.
- **Files:**
  - `Practice.dc.html` — the practice screen (005's prototype) with the way
    in: a **Tuner** pill in the header beside ⚙ (1d: "tapping it stops
    playback and the drone and opens the tuner; ‹ Practice brings you back,
    idle"). Its drone pill is a stand-in for the shipped one; its
    Traversal sheet still carries the stale "Note length" row 005 ruled on.
  - `Tuner.dc.html` — the tuner screen as a canvas of five turns, newest
    first: Turn 1 readouts (1a needle, 1b slide rule, 1c level; 1d = the
    way in, importing Practice); Turn 2 level with more on it (2a
    graduated rule, 2b zoomed centre, 2c + a stave strip); Turn 3 (3a) the
    heard note written on the stave — a whole-note head drifting ≤ ±3.5 px
    on a dotted guide, cents above, a 2.5 s trail, the instrument's clef
    with 8va/8vb; Turn 4 (4a) = 3a + an optional target (Auto · nearest /
    Hold / pick a note; − + a semitone; ✕ to auto; "▼ 2 st" beyond 50 ¢; a
    grey target head on the stave; forgotten on leaving); Turn 5 the
    target picker (5a chromatic strip over the instrument's range, "the
    current one"; 5c a pitch spiral in the circle's style). Every turn
    shares: ‹ Practice, LISTENING / NO MIC, the big note name + octave,
    "↑ sharp / ↓ flat" with "halfway to <neighbour>", the in-tune band,
    "Play a note" when silent, "–" + "Can't hear — no microphone" card,
    "A4 = 440 Hz · in tune ±N ¢", the ♯/♭ toggle. Tweaks (props): state,
    instrument (flute/guitar/cello), band ±3/±5/±10, showHz, spelling,
    staveTrail.
  - `support.js` — the dc runtime, identical to 004's and 005's.
- **Chosen:** 4a is the tuner screen; the Target sheet is 5c, the pitch
  spiral (user, 2026-09-27: "4a with 5c" — over the recommended 5a strip).
  Turns 1–2, 3a alone and 5a are the path to it, kept in the canvas.
  Choosing 4a reopens intent Q10's "no nearest-note lock or target": the
  target is in scope, Auto · nearest the default.
- **Walkthrough:** 2026-09-27. Things on the screen no requirement asked
  for, and the ruling on each:
  - The target (4a/5c): in scope — the user's reopening of intent Q10;
    Auto · nearest is the default; becomes a requirement.
  - Tweaks → exploration knobs, not scope (user, 2026-09-27): **band** is
    fixed at ±5 ¢ (±3/±10 are knobs; the tolerance setting is 008's);
    **showHz** — the big readout never shows Hz, the strip card's HEARD /
    "<note> IS" Hz stay as 4a draws them (closes intent Q6: note name +
    octave, cents, ±5 band, Hz in the strip only); **instrument** — the
    clef is the selected variant's, every catalogued variant is treble
    (2026-09-19), so guitar treble-8 and cello bass are knobs until such an
    instrument is catalogued, the 8va/8vb rule stays; **staveTrail** on,
    no setting; **spelling** — the tuner's ♯/♭ toggle is the circle's
    global preference (002), not a second one.
  - Behaviours the prototype's script encodes, all confirmed as
    requirements (user, 2026-09-27): hand-over hysteresis (the nearest
    note changes only 6 ¢ past the halfway point, 56 ¢ from the shown
    note); beyond ±50 ¢ with a target the line pins to the edge and the
    tag counts semitones ("▲ 2 st"); the target — Hold, a spiral wedge,
    or −/+ a semitone within the instrument's range, ✕ to auto, forgotten
    on leaving, the big name stays on the target in silence (greyed),
    "playing <note>" captioned when a different note is heard; the spiral
    covers E2–C7 and the instrument's range plus the pinned or heard
    note, one ring per octave, lowest in the hub, out-of-range wedges
    dimmed, a needle with a short trail, every C shows its octave, the
    hub shows the target's name and Hz; the stave strip — a whole-note
    head drifting ≤ ±3.5 px on a dotted guide, cents above, a 2.5 s
    trail, the target as a grey head to its right, 8va/8vb past the ledger
    range; the level — a linear ±50 ¢ rule labelled at 10/25/50, "halfway
    to <neighbour>" at each end.
  - Practice.dc.html's "Note length" row: the stale carryover 005 ruled
    on, not a reintroduction; its drone pill is a stand-in for the
    shipped one — neither changes anything.
  Scenarios with no screen or state of their own, and where they happen:
  page hidden → mic stops, a visible tuner resumes (the listening state
  again); noise / breath / several pitches → the "Play a note" state;
  the browser's own microphone prompt on first entry (not the tool's);
  entering from a playing run or a sounding drone → the practice screen
  is left idle and silent (1d), no state of its own.

## Rounds

### Round 1 — tuner · listening (the reading on a steady note)

- **Looked at:** the phone on the stand, the flute in both hands, long
  tones (docs/design.md §2) — the user's walk for T024, 2026-09-28.
- **Problem:** "It's working well on phone apart from it's quite flickery.
  E.g. if I play a perfect note it jumps around 'in tune' a lot and it's
  quite jarring. I think we need to smooth it a little - something like a
  moving average or a low pass filter."
- **Tried:** live behind `?variant=a|b|c` (no parameter = the build as
  walked). In a and c a reading more than 25 ¢ from the smoothed value is a
  new pitch and snaps to it, so a note change is named on its first
  reading; a gap, a hand-over or a re-pin starts the smoothing again.
  A low-pass filter — exponential, α = 0.1 per reading (≈ 110 ms; the
  prototype's 0.35 per 50 ms tick, rescaled to ~93 readings/s) ·
  B no smoothing of the value — the in-tune verdict latches (in at ±5 ¢,
  out past ±7 ¢) and the number moves in 2 ¢ steps ·
  C moving average of the last 8 readings (≈ 85 ms).
  A round about movement: a screenshot cannot show it, so none is kept for
  this round; the measured harness is run against a and c instead
  (`notes.md`).
- **Chose:** A, the low-pass filter — "A is pretty good, I think a bit
  better than C" (the user, on the phone with the flute, 2026-09-28).
- **Rejected because:** B "B is bad" · C a little behind A ("A … a bit
  better than C").
- **Requirement changed?** yes: practice.tuner/REQ-002 — the smoothing
  clause and S6–S9, written to the delta with the user's approval
  (2026-09-28); built as T026 (the rule) and T027 (the harness gates the
  shown offset: worst 0 ¢ sine, 1 ¢ flute-like). The user, on the phone
  with the rule in place: "looks good on phone".

### Round 2 — tuner · target sheet (Hold after the note has stopped)

- **Looked at:** the phone on the stand, the flute in both hands — the
  user cannot tap while playing (docs/design.md §2).
- **Problem:** "on note selector spiral I'd like it to remember the last
  heard so you can press hold on this without needing to press while
  you're playing which is often not possible."
- **Tried:** one treatment, as asked, with one choice put to the user —
  whether the spiral's needle stays in silence. No switch: nothing to
  compare but that.
- **Chose:** Hold pins the last note heard once the note has stopped; the
  Hold card names it; the needle stays greyed on it — "Approve, needle
  stays greyed" (the user, 2026-09-28).
- **Rejected because:** the needle vanishing in silence — not chosen; it
  would leave nothing on the spiral to show what Hold will pin.
- **Requirement changed?** yes: practice.tuner/REQ-004 (S7, S8),
  REQ-009/S3, REQ-003's last clause — written to the delta with the
  user's approval; built as T028.

### Round 3 — tuner · silent (the stave strip's trail)

- **Looked at:** the same.
- **Problem:** "I want the stave tail stay when no note playing.
  currently it gets wiped as soon as no note which feels jarring. should
  just see previous tail go off to left with no new tail being made until
  its off screen." (spelling tidied)
- **Found on the way:** the build's trail is the last 50 readings; the
  prototype made 20 readings a second (2.5 s), the build makes about 93
  (about 0.5 s). REQ-005 says 2.5 s.
- **Tried:** the trail placed by age and kept through silence, its
  length live behind `?variant=a|b|c`: A 2.5 s (the spec) · B 1.2 s ·
  C 0.55 s (the build as it was). A round about movement; no screenshot
  kept.
- **Chose:** A, 2.5 s — "A" (the user, on the phone, 2026-09-28).
- **Rejected because:** B and C — not chosen; no words given.
- **Requirement changed?** yes: practice.tuner/REQ-005 (the trail moves
  with time and outlives the note; S5, S6) and REQ-003's last clause —
  written to the delta with the user's approval; the length stays the
  spec's 2.5 s. Built as T029; the switch removed by T030.
- **Left as built, put to the user, no answer yet:** the trail turns grey
  the instant the note stops.

### Round 4 — tuner · listening → silent (the reading going away)

- **Looked at:** the phone on the stand, glancing between breaths
  (docs/design.md §2).
- **Problem:** "Looks good but it's very abrupt how quickly everything
  disappears when going from hearing something to nothing, could it do
  more of a soft fade out?"
- **Tried:** live behind `?variant=a|b|c` (no parameter = the build as it
  is, the reading cut 300 ms after the note stops):
  A fade — the last reading stays where it was and fades out over 0.6 s,
  then "Play a note" fades in ·
  B linger, then fade — the last reading turns grey and holds for 1 s (to
  be read between breaths), then fades over 0.4 s ·
  C ghost — the last reading stays, grey, with "Play a note" beneath,
  until the next note or leaving.
  Durations here are new values; the winner's becomes a motion token at
  exit (docs/design.md §8).
- **Chose (the treatment):** B, linger then fade — "b but try with
  faster fade" (the user, on the phone, 2026-09-28).
- **Rejected because:** A the plain fade and C the ghost — not chosen; no
  words given.
- **Tried next (the timing of B):** live behind the same switch:
  A hold 1 s, fade 0.2 s · B hold 1 s, fade 0.4 s (as first tried) ·
  C hold 0.6 s, fade 0.2 s.
- **Chose (the timing):** C, hold 0.6 s then fade 0.2 s — "Variant C is
  the best btw" (the user, on the phone, 2026-09-28).
- **Rejected because (the timing):** A and B, the 1 s hold — not chosen;
  no words given.
- **Requirement changed?** <pending — practice.tuner/REQ-003 (what
  silence shows, and when)>

### Round 5 — tuner · every state (the screen on the user's phone)

- **Looked at:** the user's phone, a Galaxy S24 — 360 CSS px wide, 780
  tall, about 660 visible in the browser with its bars showing.
- **Problem:** "The screen is a bit too tall and doesn't fit on my phone
  without scrolling up and down. I have a Galaxy s24."
- **Measured (the controller, headless Chromium):** the tuner is a fixed
  844 px tall at any viewport — the design's 390 × 844 frame built
  literally (the level alone is a fixed 536 px): 64 px over at 360 × 780,
  184 px over at 360 × 660. At 360 wide the stave strip's card also runs
  off the right edge. `rounds/round-5/before--tuner-silent-360x660.png`.
  The width is a structural miss, fixed whichever treatment wins.
- **Tried:** live behind `?fit=a|b` (no parameter = the build as it is):
  A the level flexes — the screen is the visible height, the header, the
  target pill, the strip and the footer keep their sizes, the level takes
  what is left and its scale shrinks to fit ·
  B the same, and the footer's line (A4 = 440 Hz · in tune ±5 ¢, ♯/♭)
  moves up beside LISTENING, giving its height to the level.
  Not built: scaling the whole frame down — the reading must stay legible
  at arm's length (docs/design.md §2).
- **Chose:** A, the level flexes, the footer stays — "A is better but
  still needs a small amount of scrolling" (the user, on the phone,
  2026-09-29). `rounds/round-5/a--tuner-listening-360x660.png`.
- **Rejected because:** B — "A is better"; B also dropped the "A4 = 440
  Hz · in tune ±5 ¢" line for want of room.
  `rounds/round-5/b--tuner-listening-360x660.png`.
- **Still scrolling (found 2026-09-29):** the column that wraps every
  screen (`App.tsx`) has `min-height: 100vh`; on a phone `100vh` is the
  height with the browser's bars hidden, so with the bars showing the
  page is taller than what is visible by the bars' height, and the tuner
  inside stretches to fill it. Headless Chromium has no bars, so the
  measurement did not see it. The column takes the visible height
  (`100dvh`) while the tuner shows.
- **Requirement changed?** <pending — none expected: no requirement
  names a size; a pattern for docs/design.md §9 at exit>

## Exit

- **Exited:** <date>
- **Reference screenshots:** `reference/<screen>--<state>.png` for every row
  in the proposal's Interface table
- **Promoted to `docs/design.md`:** <tokens and patterns, by name; or none>
- **Requirement changes written to the delta:** <list, or none>
- **Left for a later change:** <anything the user chose to stop short of>
