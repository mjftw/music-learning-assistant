---
type: Change Proposal
title: Hear the scale
description: The tool plays the chosen traversal of the selected key within the instrument's range, at a chosen tempo, exactly as the Hear the Scale prototype shows, and the learner plays along
resource: /changes/003-hear-the-scale/proposal.md
status: stable
tags: [sdd, proposal, "change:003-hear-the-scale"]
sources:
  - resource: /changes/003-hear-the-scale/intent.md
  - resource: /changes/003-hear-the-scale/design/hear-the-scale.dc.html
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T17:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:09:58Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_phase: approved
sdd_constitution: 1.0.0
---

# Proposal: Hear the scale

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

The circle shows the scale but makes no sound. The user still has to know
how the scale goes and set the pace himself — the tool is a better paper
circle, not yet a practice partner. The product brief's core loop (tool
leads, learner follows) does not exist.

## Outcome

The "Hear the Scale" prototype (Claude Design, iterated by the user;
vendored at `design/hear-the-scale.dc.html`) is the source of truth for the
screen. Below the key panel a transport card plays and stops the traversal,
shows the note sounding and where it is in the sequence, and steps the
tempo with its Italian name shown; a row summarising the traversal opens
the Traversal sheet — direction, octaves, shape, sound, and
the loop / count-in / rest bar toggles. The Span pills are gone: the
traversal decides what the stave and names view show, and the note that is
sounding lights up as it sounds, in time. A learner can pick G major on the
flute, tap ▶, hear a bar counted in and the scale played up and down at
Andante, and play along.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The learner (the user, alone) | Hear the scale or arpeggio of the selected key, in the instrument's range, at a tempo, looped, and play along; see which note is sounding | Rock-steady time; the sound lands with the highlight; nothing interrupts mid-scale; it works on the phone on the stand |

## Scope

**In scope**
- Traversal choice: direction ↑ ↓ ↑↓; octaves 1–4 (as many as fit) or
  full range; shape scale or arpeggio — as the prototype's sheet offers it
- Session settings: sound mode notes / both / metronome,
  loop, count-in, rest bar, tempo 40–200 with the tempo-term sheet
- The transport card: play/stop, position caption, progress bar, tempo
  stepper and term
- What sounds: a plain synthesised tone for notes, a soft woody click for
  the metronome; count-in and rest bar always click
- The sounding note highlighted on the stave and in the names view
- The theory beneath it: the run fitted to the range for a traversal, the
  arpeggio's chord tones, the sequence in playing order, each note's pitch
- Persistence of the traversal and session settings with the selection
- Timing budget with measured tests; stop when hidden; screen kept awake
- Graceful silence when sound cannot start

**Explicitly out of scope** <!-- the most valuable section in this document -->
- Listening to the learner, judging pitch, learner-leads mode (005, 006)
- The drone (004)
- Just temperament and any temperament choice (007) — this change fixes
  equal temperament as the only one
- Per-instrument timbres, samples, a volume control, a metre other than 4/4
- Note length: every note is a crotchet — the prototype's ♩/♪ row is deliberately dropped (user decision, 2026-09-22)
- Pause/resume — ❚❚ is stop
- Wide/laptop layouts (carried from 002)
- Harmonic or melodic minor; the circle's own behaviour (002 stands)

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 001, 002 | The key view, instrument catalogue and the redesigned circle this screen is built on |
| Affects | 006 `learner-leads` | Modifies `practice.session` created here — adds the mode |
| Affects | 007 `temperament` | Modifies `theory.temperament` created here (equal only) to add just |
| Affects | 004 `the-drone` | Shares the sound-making and the transport card's neighbourhood |
| Shares terms | — | Traversal, NoteSequence, Session, Target note, Tempo, Note, Instrument, Range, Scale, Arpeggio, Stave (from `docs/glossary.md`) |

## Domain

> From `docs/domain.md`. One context per slice. If this slice needs two, stop:
> either it is two slices, or it is an integration slice whose only job is the
> event/interface between them.

- **Context:** `practice` (owning); `theory` is modified because the
  traversal's notes are theory facts and the key view is theory's display.
  This is one outcome with a theory prerequisite, not two changes: without
  the fitted run there is nothing to play, and without playback the run is
  Span by another name.
- **Nouns touched:** `practice` — Session, Traversal choice, Target note,
  Tempo; `theory` — Traversal, NoteSequence, Scale, Arpeggio, Note, Range,
  Temperament (equal only)
- **Events emitted:** `TargetAdvanced` — each time the sounding note changes
  (carries the new target note and its position in the sequence); the UI
  lights the note from it
- **Events consumed:** none (`PitchDetected` arrives at 005)
- **Invariants this slice must preserve:** a generated NoteSequence never
  contains a note outside the selected Instrument's range (`theory`,
  REQ-012 below and REQ-005 untouched); the current target note is always a
  member of the active sequence (`practice`, REQ-006)
- **New invariants this slice introduces:** none

## Changes

> Requirements live in the delta files, not here. One row per capability this
> change touches. `sdd-specify` writes the deltas from the intent; this table
> is the map.

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `practice.session` | `delta/practice/session.md` | 11 | 0 | 0 | New capability: choosing the traversal and session settings, playing and stopping, count-in and rest bar, tempo, what sounds, the sounding note shown, changes while playing, timing budget, hidden page, sound unavailable, persistence |
| `theory.circle-of-fifths` | `delta/theory/circle-of-fifths.md` | 1 | 3 | 1 | The key view follows the traversal's run instead of a span (REQ-003, REQ-007); span leaves the restored preferences (REQ-008); REQ-011 Span removed; REQ-012 fits a traversal to the instrument and orders the sequence |
| `theory.temperament` | `delta/theory/temperament.md` | 1 | 0 | 0 | New capability, one requirement: every note has a pitch in equal temperament at A4 = 440 Hz. Playback needs pitches; 007 adds just temperament as a modification |

## Affects

> Living documents this change modifies, other than the capability specs.
> Each is a gated re-approval at `sdd-finish`, never a silent edit.

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | `theory` row: "a traversal (1–2 octaves, up/down) fitted to an instrument's range" → "a traversal (1–4 octaves or the full range, up, down or both, as a scale or an arpeggio) fitted to an instrument's range". `practice` Owns: add Session settings (sound mode, loop, count-in, rest bar). No new events or invariants | |
| `docs/glossary.md` | **Traversal** → direction (↑ ↓ ↑↓), octaves (1–4 or full range) and shape (scale or arpeggio) — the recipe for the NoteSequence. **NoteSequence** → the notes in playing order, direction applied (a ↑↓ run of 8 notes is a 15-note sequence). **Session** → add the session settings. **Span** row removed (superseded). Add **Session setting** (`practice`: how the sequence is played — sound mode, loop, count-in, rest bar, tempo — as distinct from which notes), **Count-in** (`practice`: one bar of clicks counted down before the first note), **Rest bar** (`practice`: one bar of clicks between loops), **Tempo term** (`practice`: the Italian name for a band of tempos — Largo … Presto) | |
| `docs/product.md` | none | — |

## Non-functional requirements

> Only ones with a number in them. "Fast" is not a requirement; "renders in
> under 200 ms at p95 on a cold cache" is. Delete any line you cannot measure.

| Concern | Requirement | How measured |
|---|---|---|
| Timing | Every note onset within ±5 ms of its scheduled time, at every tempo 40–200, over at least 60 s of looping | Automated test compares actual onset times against the schedule (practice.session/REQ-008) |
| Sight matches sound | The current-note highlight is shown within 30 ms either side of the note's audible onset (scheduled onset + the device's reported output latency) | Automated test measures audible onset ↔ highlight, two-sided (practice.session/REQ-006/S4) |
| Stop | ❚❚ silences within 50 ms | Test: no audio output after 50 ms |
| Privacy / data retention | Nothing personal stored; only settings, locally, as REQ-008 | Inspection of stored state |
| Accessibility | Every transport and sheet control has an accessible name; the sounding note is announced no more often than once per note | Assertion in UI tests |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| First run | ↑↓ · 1 oct · scale · both · loop on · count-in on · rest bar off · 96 bpm (Andante); idle | practice.session/REQ-011 |
| No whole-octave run fits (F♯ major on Ocarina Bass C) | Only "full" offered; full plays | practice.session/REQ-001/S3 |
| Stored octave count no longer fits after an instrument change | Clamped for display and playback; the stored choice kept | practice.session/REQ-001/S4 |
| A full run starts off the tonic (G major on the flute starts at C4) | Arpeggio keeps degree-1/3/5 notes wherever they fall; scale plays every note | theory.circle-of-fifths/REQ-012/S3 |
| ▶ tapped while playing | It is ❚❚: stop, back to the top | practice.session/REQ-002/S2 |
| Key / instrument / traversal changed while playing | Restart from the first note at once, no count-in; during a count-in or rest bar the count continues | practice.session/REQ-007 |
| Tempo at 40 or 200 | The stepper does not go past | practice.session/REQ-004/S3 |
| Page hidden / phone locked | Playback stops; on return the transport is idle | practice.session/REQ-009 |
| Sound cannot start | Non-interrupting notice; the run walks silently with the highlight; ▶ retries | practice.session/REQ-010 |
| Corrupt or older stored state | Defaults for what is missing, as REQ-008 | practice.session/REQ-011/S3 |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
- 4/4 is the only metre — a count-in and a rest bar are four beats.
- Equal temperament at A4 = 440 Hz is the pitch reference until 007.
- The "Circle - current" file in the handoff equals the shipped 002
  prototype; only the Hear the Scale file carries new UI.
- The prototype's tempo stepper (±2, 40–200) and eight tempo-term bands
  stand as designed.
- One synthesised timbre serves every instrument; the learner is listening
  for pitch and time, not tone colour.

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| — | none open. Q1 (440 vs 442) and Q2 (real pitch always) took their recommended answers at the proposal gate, 2026-09-22 | | |

## Out of band

- The prototype is silent, so everything about *sound* (timbre, click,
  count-in length) was decided in the grill,
  not by the design; the intent's Interview record has the reasoning. The
  one visible departure from the prototype is the 4-beat count-in
  (`COUNT IN · 4·3·2·1` where it shows 3·2·1).
- Two places the prototype's code contradicts its own comments — "full"
  and arpeggio thinning — were decided in the grill (Q4) and are specified
  in theory REQ-012, not copied.
- `theory.temperament` is created here with one requirement rather than
  bolting pitch onto the circle: pitch is a temperament fact, and 007
  modifies rather than creates. It is the smallest third capability, not a
  fourth change.
- The user's stated preference that audio generation live in Rust with
  listening is a plan matter; it will amend ADR 0001 and may fall back to
  TS synthesis behind the same interface (intent Q10).
- Article V is treated as applying (numbered budget, measured tests)
  although playback is not feedback on the learner's playing.
