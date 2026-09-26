---
type: Spec Delta
title: practice.session — delta for 004-the-drone
description: A tapped notehead or names column sounds that note for one beat with playback's tone, over the drone if it is on.
resource: /changes/004-the-drone/delta/practice/session.md
status: stable
tags: [sdd, delta, "change:004-the-drone", "context:practice"]
sources:
  - resource: /specs/practice/session.md
  - resource: /changes/004-the-drone/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T16:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T15:02:36Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_capability: session
sdd_phase: approved
---

# Delta: practice / session

> What this change does to the living spec `specs/practice/session.md`,
> and nothing else. One requirement is added; nothing existing changes.
> The drone's own behaviour, including ▶ silencing it, lives in
> `practice.drone`.

## ADDED

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
