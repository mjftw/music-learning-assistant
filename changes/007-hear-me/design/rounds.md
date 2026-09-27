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

- **Source:** external tool (Claude Design) — decided at the grill
  (intent Q11): the user iterates the tuner screen in Claude Design, as for
  003, 004 and 005; it is imported (design MCP, or the exported `.dc.html`)
  and vendored here, and is the source of truth for the screen. Nothing is
  in this directory yet; the change waits here until it is brought back.
- **Files:** to bring back, one per screen and state the intent implies —
  either the artifact's HTML (`design/tuner.dc.html`, plus any component it
  imports, as `Drone Ideas.dc.html` + `Drone.dc.html` were for 004) or one
  PNG per state:
  - `design/tuner--listening.png` — a note is heard: the reading. The
    design decides what it shows (intent Q6, still open): the nearest
    note's name and octave or not, the cents offset, an in-tune band and
    its width, Hz or not — under A = 440 equal temperament, ♯/♭ per the
    global spelling preference.
  - `design/tuner--silent.png` — listening, nothing heard (silence, breath,
    noise, several pitches): the reading shows nothing rather than a guess.
  - `design/tuner--cannot-hear.png` — the microphone refused, absent or
    failing: the visible non-interrupting notice, the tuner showing it
    cannot hear.
  - `design/practice--way-in.png` — the practice screen with the control
    that enters the tuner (intent Q4/Q11: the design decides the way in);
    entering stops playback and the drone.
  - The way out is on the tuner screen itself, in every state.
- **Walkthrough:** not yet — runs on import, before the proposal.

## Rounds

### Round 1 — <screen · state>

- **Looked at:** <where: device, distance, situation from docs/design.md §2>
- **Problem:** <the user's words>
- **Tried:** A <one line> · B <one line> · C <one line>
- **Chose:** <A/B/C or a mix> — <why, the user's words>
- **Rejected because:** A <…> · C <…>
- **Requirement changed?** <no | yes: <context>.<capability>/REQ-NNN — noted for the delta>

## Exit

- **Exited:** <date>
- **Reference screenshots:** `reference/<screen>--<state>.png` for every row
  in the proposal's Interface table
- **Promoted to `docs/design.md`:** <tokens and patterns, by name; or none>
- **Requirement changes written to the delta:** <list, or none>
- **Left for a later change:** <anything the user chose to stop short of>
