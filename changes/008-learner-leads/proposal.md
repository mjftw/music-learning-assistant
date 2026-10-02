---
type: Change Proposal
title: Learner leads
description: On the practice screen the learner can choose I lead — the tool shows each target note, listens, and moves on once the note has been held in tune for N beats.
resource: /changes/008-learner-leads/proposal.md
status: draft
tags: [sdd, proposal, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/intent.md
  - resource: /changes/008-learner-leads/design/handoff.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T16:10:00Z
verified: []
sdd_id: 008-learner-leads
sdd_context: practice
sdd_phase: draft          # draft | in-review | approved | merged
sdd_constitution: 1.0.0
---

# Proposal: Learner leads

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

The product was conceived with two modes — tool leads and learner leads —
and only the first exists: the practice screen plays a run and the learner
follows. 007 proved that the tool can hear the learner, but the tuner only
names whatever is played; nothing yet says *which* note to play next and
waits until it has been played in tune. For a self-taught player on the
stand, that is the half of practice the tool cannot do: the learner has to
check themself against the stave, note by note, and has no measure of
whether a note was really held in tune before moving on.

## Outcome

The practice screen has a second way to practise, chosen by two words under
the transport caption: **play along** (as shipped) and **I lead**. In I lead,
tapping the start circle opens the microphone and shows the first note of
the chosen traversal as the target — the big letter on the card, the
highlighted note on the stave or in the names view. As the learner plays,
a pitch line on the target note moves sharp or flat against a pale green
band the width of the chosen tolerance; once the note sits inside the band
the band fills from left to right, and when it has been held in tune for the
chosen number of beats the target moves to the next note. The run ends
"All held", or loops. Hold (1 / 2 / 4 beats), In tune (lenient ±15 ¢ /
medium ±10 ¢ / accurate ±5 ¢) and Cues (the meter on the note; a short
tone as each target appears) live in the Traversal sheet, which keeps the
same height whichever mode is chosen. Every readout meets 007's latency
budget, measured. Nothing is sounded by the tool while it listens except
the optional tone cue, which is never judged as the learner's playing.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The learner (the user), phone on the stand, flute or ocarina in hand | Pick a key and traversal, choose I lead, press once, and play the run note by note with the tool waiting for each note to be in tune | Looking in one place — the note itself — for sharp / flat and progress; the hold feeling fair; nothing to tap mid-run |
| The same learner tuning the feel | Set how long a note must be held and how close counts as in tune | Honest words for the settings (beats, lenient / medium / accurate), no cents to learn |

## Scope

**In scope**
- The mode: play along / I lead as words on the transport card; the start
  circle's glyph and idle caption follow it; the mode persists.
- A lead run: the microphone opened on the first tap, the target shown and
  advanced through the traversal, stop, complete, loop; the drone and tapped
  notes excluded while it runs.
- The judgement against the target (offset in cents, smoothed as the tuner
  smooths) and the hold rule: accumulate in tune, reset on leaving the
  tolerance, pause in silence, advance at beats × 60000 / tempo ms.
- The meter on the target note in both panels (band, hold fill, pitch line)
  and the live card's copy and colours, exactly as `design/handoff.md`.
- Cues: the meter on/off; the tone cue, with nothing judged while it sounds.
- The settings Hold, In tune, Cues; the Traversal sheet rebuilt to the
  handoff's rows (title row gone, every row 62 px with a hint, three rows
  that swap with the mode, switches, the shared rows restyled), never
  changing height on the mode switch.
- The complete and no-microphone states; hidden-page, wake-lock and
  changes-while-running behaviour for a lead run.
- The play-along card while playing: the mode words row stays, the progress
  bar is retired.
- Five new colour tokens.

**Explicitly out of scope** <!-- the most valuable section in this document -->
- A wrong-note display ("that's D4 · go up") — explored in the design and
  rejected as distracting; a note far from the target, an octave off
  included, simply pins the line at the band box's edge.
- Any change to the tuner screen, the drone's own behaviour, pitch
  detection (`PitchDetected` is consumed unchanged, ADR 0006), or the
  catalogue of scales and traversals.
- Count-in, rest bar, metronome or a sound mode in I lead — they are play
  along's rows and swap out; a lead run starts waiting silently on note 1.
- A reference-pitch or temperament setting (009), tooltips (010).
- Scoring, history, streaks or any record of what was held (the no-gamification
  decision of 2026-09-19); nothing heard is ever stored.
- Screen 11 of the canvas, the simulated player — a demo for the eye.
- Changing the shared rows' controls: ↑ ↓ ↑↓, 1–4 oct + full, scale /
  arpeggio and Loop behave exactly as shipped (intent Q6).

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 003 hear-the-scale | The transport, the traversal and the sequence a lead run walks; the playback tone the tone cue reuses |
| Depends on | 007 hear-me | Listening (`PitchDetected`), the nearest-note / cents lookup, the smoothing, the mic / no-mic / hidden / wake-lock patterns, the sharp / flat / in-tune colours |
| Depends on | 004 the-drone | The never-both rule a lead run joins |
| Affects | 009 temperament | A lead run judges against the target's pitch under the temperament; 009 will change that pitch, not this rule |
| Shares terms | Mode, Target note, Judgement, In tune, Held, Cents, Session setting, Traversal, NoteSequence, Tempo, Tuner | (from `docs/glossary.md`) |

## Domain

> From `docs/domain.md`. One context per slice. If this slice needs two, stop:
> either it is two slices, or it is an integration slice whose only job is the
> event/interface between them.

- **Context:** `practice`
- **Nouns touched:** Session, Mode (tool-leads / learner-leads), Session
  settings (gaining hold, tolerance, cues), Target note, Judgement, Tempo,
  Drone (excluded while leading)
- **Events emitted:** `TargetAdvanced` — as each target of a lead run is
  shown, the first included; `NoteJudged` — for each reading judged against
  the target during a lead run (target, smoothed offset in cents, verdict
  with the tolerance applied)
- **Events consumed:** `PitchDetected` from `listening` — judged against the
  current target: the offset in cents from the target's pitch, smoothed,
  in tune when within the tolerance; ignored while the tone cue sounds
- **Invariants this slice must preserve:** the current target note is
  always a member of the active sequence; a sequence note or click and the
  drone never sound at once (extended: nothing the tool sounds — drone,
  playback, a tapped note — overlaps a lead run; the tone cue is the one
  sound, and it is never judged)
- **New invariants this slice introduces:** in learner-leads mode, the
  target never advances unless the note was held in tune for the required
  duration — already in the map since init, now guarded by a requirement
  and an exhaustive test

## Changes

> Requirements live in the delta files, not here. One row per capability this
> change touches. `sdd-specify` writes the deltas from the intent; this table
> is the map.

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `practice.session` | `delta/practice/session.md` | 9 (REQ-014 – REQ-022) | 4 (REQ-002, REQ-009, REQ-011, REQ-013) | 0 | The mode, the lead run, the judgement and hold, the meter and card, the cues, changes while leading, the Traversal sheet, the latency budget, no microphone; the progress bar retired, hidden-page and tapped notes extended to a lead run, the five settings remembered |

## Affects

> Living documents this change modifies, other than the capability specs.
> Each is a gated re-approval at `sdd-finish`, never a silent edit.

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | `practice` Owns: Session settings gain hold, tolerance and cues; the never-both invariant reworded to cover a lead run ("…and nothing the tool sounds overlaps a lead run except the tone cue, which is never judged") | |
| `docs/glossary.md` | New: Lead run, Hold (beats in tune before the target advances), Tolerance (lenient / medium / accurate — the in-tune band of a lead run), Cue (meter / tone), Tone cue. Changed: In-tune band — ±5 ¢ on the tuner; the chosen tolerance in a lead run. Mode — note the on-screen words "play along" / "I lead" | |
| `docs/product.md` | none | |
| `docs/design.md` | §8: five tokens — hold fill `oklch(0.80 0.07 150)`, band `oklch(0.90 0.045 150)` (the tuner's band, now named for the note), in tune `oklch(0.55 0.11 150)`, flat `oklch(0.55 0.11 258)`, sharp `oklch(0.55 0.11 28)` (the last three already the tuner's; confirmed shared); Screens: the practice screen's new states | |

## Interface

> Every screen and state this change adds or alters, or the single word
> `none`. Filled by `sdd-design` before the requirements are written, because
> walking the scenarios across these screens is what finds the missing ones.
> **Design** is the wireframe or imported reference in `design/`; **Route** is
> filled at the plan, once the app has one; the refinement loop's reference
> screenshot lands in `design/reference/<screen>--<state>.png` at its exit.
> `scripts/check-design.sh` checks the files exist and the citations resolve.

| Screen | State | Route | Design | Requirements seen here |
|---|---|---|---|---|
| `practice` | `idle-play-along` — 01: the shipped card plus the mode words, play along underlined | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-014` `practice.session/REQ-011` |
| `practice` | `idle-i-lead` — 02: I lead underlined, the Tuner glyph in the circle, "hold 2 beats · medium tuning" | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-014` `practice.session/REQ-009` `practice.session/REQ-011` |
| `practice` | `playing-play-along` — the shipped live card (❚❚, "<note> · k of N") with the mode words row in place of the progress bar; not drawn on the canvas, ruled at the walkthrough | | `design/Learner Leads Practice.dc.html` | `practice.session/REQ-002` `practice.session/REQ-014` |
| `practice` | `listening-silent` — 03: ■, the target letter, "1 of 15", "Play C4"; the target highlighted, band drawn, no line | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-015` `practice.session/REQ-017` `practice.session/REQ-018` `practice.session/REQ-021` |
| `practice` | `heard-out-of-tune` — 04: "↓ 18 ¢ flat" / "↑ 12 ¢ sharp", the line outside the band in the flat / sharp colour, no fill | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-016` `practice.session/REQ-017` `practice.session/REQ-021` |
| `practice` | `holding` — 05: "in tune · holding", the line in the band, the band filling left to right | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-016` `practice.session/REQ-017` |
| `practice` | `holding-meter-off` — 05 with Cues → meter off: the highlight and the card judgement, no band, fill or line (reachable on any canvas phone through the sheet) | | `design/Learner Leads Practice.dc.html` | `practice.session/REQ-018` `practice.session/REQ-017` |
| `practice` | `advanced` — 06: the held note ink, the next the target, "E4 held ✓" | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-016` `practice.session/REQ-017` `practice.session/REQ-019` |
| `practice` | `complete` — 07: "15 of 15 held · C4–C5", "All held", the start circle back | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-015` |
| `practice` | `no-microphone` — 08: "Can't hear — no microphone" and its line | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-022` |
| `practice` | `sheet-play-along` — 09: Who leads, Sound, Count-in, Rest bar, hairline, Direction, Octaves, Shape, Loop | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-020` `practice.session/REQ-001` |
| `practice` | `sheet-i-lead` — 10: Who leads, Hold, In tune, Cues, hairline, the shared rows; the same height | | `design/Learner Leads Final.dc.html` | `practice.session/REQ-020` `practice.session/REQ-019` |

## Non-functional requirements

> Only ones with a number in them. "Fast" is not a requirement; "renders in
> under 200 ms at p95 on a cold cache" is. Delete any line you cannot measure.

| Concern | Requirement | How measured |
|---|---|---|
| Performance (Article V) | Every reading on the meter within 100 ms of the start of the sound it reflects in the microphone signal; refreshed at least every 50 ms while a steady note is heard; a late reading dropped; the advance shown within 100 ms of the reading that completes the hold | The measured harness of 007 extended with a scripted lead run (tones fed as the microphone), at converge and finish and against the phone — `practice.session/REQ-021` |
| Performance | A lead run's hold advances exactly at beats × 60000 / tempo ms of accumulated in-tune time, never earlier | Exhaustive unit tests over every tolerance, hold and the tempo range — `REQ-016/S6`; the harness checks the advance against the fed timeline |
| Performance | Playback's own budgets are untouched: onsets within 5 ms, highlight within 30 ms | `pnpm test:timing` unchanged, at converge and finish |
| Accessibility | The judgement is never carried by colour alone: the card's words say flat / sharp / holding / held; the meter's position says it on the note | Review against `docs/design.md` §6 at converge |
| Privacy / data retention | Nothing heard is stored; the microphone is opened only when a lead run starts and released within 200 ms of its end | `REQ-015`, `REQ-022`, `listening.pitch-detection/REQ-001` |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| Empty / zero / first-run state | First run: play along, 2 beats, medium, meter on, tone off; the tool never opens mid-run | `REQ-011` |
| A key with no notes in range (the "no notes of this key in range" summary) | The start circle does nothing in either mode, as ▶ does today | `REQ-015` |
| Concurrent or duplicate action | ■ twice, or the circle tapped while already leading: the second tap is the stop; the mode words tapped mid-run stop the run first | `REQ-014`, `REQ-015` |
| Upstream dependency unavailable | Microphone refused, absent or failing: the no-mic card, the run idle, the next start retries; mid-run failure shown within 500 ms | `REQ-022` |
| The tool's own sound in the microphone | The tone cue: nothing is judged until it has ended; the drone and tapped notes cannot sound while leading | `REQ-018`, `REQ-015`, `REQ-013` |
| Malformed or hostile input | A reading with no confidence or outside E2–C7 is already not published by listening; stored settings unreadable → defaults | `listening.pitch-detection/REQ-002`, `REQ-011` |
| Partial failure mid-operation | The page hidden: the run stops, idle, the mic released; nothing resumed unasked | `REQ-009` |
| A traversal change mid-run | The lead run restarts at note 1, still listening; tempo / Hold / In tune / Cues apply at once with the accumulated time kept | `REQ-019` |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
- Medium ±10 ¢ with the tuner's smoothing feels fair on a real flute tone;
  only the walk on the phone can tell (intent: riskiest unknown).
- Redrawing the meter on the stave at the reading rate stays inside the 100
  ms budget on the phone; the harness will say.
- The tone cue's tail (~100 ms after its release) is enough for the phone's
  speaker-to-mic path; tuned in the design loop if not.
- The 0.4 s "held ✓" and the 300 ms silence rule read as "time passing",
  not as something changing on its own; the design loop can retune.
- The past-ink / future-faint styling by run position reads right on the
  descent of ↑↓.

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | None — the intent resolved the tree; the two tunables (the tone tail, the 0.4 s "held ✓") are the design loop's | — | — |

## Out of band

- 007's intent Q2 is the user's own description of this change; Q3 cut it
  out of 007 so that detection could be proven first. ADR 0006 (listening
  in a second worklet on the shared context) is the pipeline this reuses.
- The design explored a wrong-note display, a ring around the notehead, a
  level in the card, a bar under the note and a ghost head; the exported
  prototype pins the chosen one (meter on the note as a level, hold as a
  fill) and removed the rest.
- The tuner's in-tune band is fixed at ±5 ¢ (007); this change does not
  make it follow the tolerance — the tuner is a tuner.
- The progress bar's retirement supersedes REQ-002's "with a progress bar at
  k/N" (003); the position is in the caption and on the panel, and the card
  keeps one height in both modes.
