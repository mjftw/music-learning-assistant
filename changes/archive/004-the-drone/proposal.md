---
type: Change Proposal
title: The drone
description: The selected key's tonic held as a drone from the circle's centre, in any octave and one of three sounds, never together with playback; a tapped note sounds for one beat.
resource: /changes/004-the-drone/proposal.md
status: stable
tags: [sdd, proposal, "change:004-the-drone"]
sources:
  - resource: /changes/004-the-drone/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T16:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T15:02:35Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: merged
sdd_constitution: 1.0.0
---

# Proposal: The drone

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

Wind players pitch against a reference and string players tune to one; the
product brief names the drone as a core practice aid beside the play-along.
Today the tool can play a scale but cannot hold a note, so the learner has
no reference to pitch a long tone against, and no way to hear a single note
of the key in isolation.

## Outcome

A pill in the centre of the circle holds the selected key's tonic as a
drone: tap ▶ and it sounds, in the octave nearest the middle of the
instrument's range, − / + moves it an octave, ▼ opens a sheet that offers
pure, warm or reed. It follows the key as the key changes, retuning without
a break. It and playback never sound together — ▶ on the transport silences
it, switching it on stops playback. A note tapped on the stave or in the
names view sounds for one beat, over the drone if it is on, so an interval
can be checked against the reference. The octave and the sound are
remembered; the tool always starts silent. The screen ("Drone card design",
layouts 3a + 4a, vendored under `design/`) is the source of truth.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The learner (flute, ocarina; phone on the stand or laptop) | Hold the key's tonic as a reference while playing long tones or tuning; move it to a comfortable octave; hear a single note of the key on demand | One tap to start and stop, nothing to configure mid-practice, no click or gap when the key changes |

## Scope

**In scope**
- The drone pill in the centre disc (▶/■, − / +, note label, ▼) and the
  Drone sheet (on/off, note and pitch, the Sound row).
- Tonic of the selected key, spelled as the circle spells it; octave
  nearest mid-range by default, then pinned; any octave A0–C8.
- Three sounds: pure, warm (default), reed.
- Seamless retune on key, variant, spelling and octave changes while
  sounding.
- Mutual exclusion with playback, both directions.
- A tapped notehead or names column sounds for one beat with playback's
  tone, lit as a sounding note, allowed over the drone, ignored while playing.
- Stop when the page is hidden; screen kept awake while sounding; the
  no-sound notice; octave and sound remembered, on/off never.

**Explicitly out of scope** <!-- the most valuable section in this document -->
- Any note other than the tonic (a note picker), the fifth, or a tonic +
  fifth pair — the design's `fifth` sheet style is an exploration, rejected.
- The other five placements on the Ideas page (own card, transport mode,
  pill beside SCALE, corner, tap-the-wedge).
- Just temperament — 009. Volume control — none anywhere (003 decision).
- A drone sounding through playback (they exclude each other by decision).
- The tapped note while playing, or a tapped note outside the run.
- Wide layouts, tooltips (010), any change to what the circle or stave show.

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 001, 003 | The circle and its centre disc; the sound context, the transport, session settings and their persistence; `theory.temperament` for pitch |
| Affects | 009 temperament | Will retune the drone under just temperament |
| Affects | 007 hear-me / 008 learner-leads | A held reference next to live pitch feedback; nothing here constrains them |
| Shares terms | Note, Key, Tonic, Drone, Tempo, Session setting, Stave, Names view | (from `docs/glossary.md`) |

## Domain

- **Context:** `practice`
- **Nouns touched:** Drone (owned, new capability), Session settings
  (drone octave and drone sound join them), Tempo (the tapped note's beat),
  Target note (untouched — a tapped note is never the target).
- **Events emitted:** none new. `TargetAdvanced` is not emitted for a
  tapped note or the drone.
- **Events consumed:** none new. `theory/published` gives the tonic and its
  pitch under equal temperament; the `sound` context renders the drone and
  the tapped tone on request.
- **Invariants this slice must preserve:** *The current target note is
  always a member of the active sequence* — untouched: neither the drone
  nor a tapped note is a target.
- **New invariants this slice introduces:** *A sequence note and the drone
  never sound at once* (`practice.drone/REQ-004`).

## Changes

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `practice.drone` | `delta/practice/drone.md` | 9 | 0 | 0 | New capability: the pill and sheet, the note and octave, following the key, exclusion with playback, the three sounds, hidden page / screen / no sound, memory |
| `practice.session` | `delta/practice/session.md` | 1 | 0 | 0 | A tapped notehead or names column sounds for one beat (REQ-013); nothing existing changes |

## Affects

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | `sound`'s Voice widens from "a tone or click with an onset" to include a held drone with no end; `practice`'s Session settings gain the drone's octave and sound | |
| `docs/glossary.md` | New row *Drone sound* (`practice`): pure, warm or reed — the timbre the drone is rendered with; not to be confused with *Sound mode*, what sounds during playback. New row *Tapped note* (`practice`): a note of the run sounded for one beat on demand; not a Target note | |
| `docs/product.md` | none | |

## Non-functional requirements

| Concern | Requirement | How measured |
|---|---|---|
| Performance | The drone is audible within 50 ms of ▶ on the pill and silent within 500 ms of ■; a retune glides to the new pitch within 100 ms with no gap | Fake-clock test of the commands issued; ear on the phone at acceptance for clicks |
| Scale | One drone voice at a time; one tapped tone at a time (a retap replaces it) | Scenario tests |
| Availability | No sound possible → notice, stays off, next tap retries (REQ-008) | Scenario test |
| Security | n/a | |
| Accessibility | Pill controls are tappable on a phone: each hit area at least 22 px tall as designed | Design review screenshots |
| Privacy / data retention | Octave and sound stored locally with the session settings; nothing else | Scenario test |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| Empty / zero / first-run state | Drone off, octave unpinned (nearest mid-range per key), sound warm | `practice.drone/REQ-009` |
| Concurrent or duplicate action | Two quick taps on ▶/■ toggle twice and leave one voice or none; a retap of a note restarts its beat; ▶ on the transport while the drone sounds stops the drone before the count-in | `practice.drone/REQ-001`, `REQ-004`; `practice.session/REQ-013` |
| Upstream dependency unavailable | Sound cannot start → notice, pill stays off, retry on next tap | `practice.drone/REQ-008` |
| Malformed or hostile input | Stored octave outside 0–8 or unknown sound → treated as absent, defaults used | `practice.drone/REQ-009` |
| Partial failure mid-operation | A pinned octave that would put the new key's tonic outside A0–C8 (A0 pinned, then C major) → that key uses its default octave, the pin unchanged | `practice.drone/REQ-002` |
| Page hidden while sounding | Drone stops, pill shows off; playback's own rule (`practice.session/REQ-009`) unchanged | `practice.drone/REQ-007` |
| Key change while sounding | Retune without a break; spelling change keeps the pitch | `practice.drone/REQ-003` |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
- The sound context can render a voice with no end, a fading level and a
  gliding pitch without clicks on the phone; the plan's first question.
- Warm and reed as the design mixes them translate to the synthesiser; if a
  mix must differ, the ear at acceptance decides.
- 60 % of a playback tone's peak level (the design's 0.12 : 0.22) is quiet
  enough for a tapped note to read over the drone and loud enough to pitch
  against; adjusted at acceptance if not.
- The pill's − / + at 18 px wide are usable on the phone; the design's
  sizes are adopted as drawn.

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| — | none | | |

## Out of band

- Attention cost (Article VI): one pill of five small controls in the disc's
  empty upper half, mirroring the ♯/♭ toggle below the signature; it earns
  its place because the drone is a core practice aid and the note comes
  from the circle, so no other control is needed. The sheet is opened only
  by choice and never interrupts.
- The tapped note lives in `practice.session` because it uses the session's
  tempo, tone and highlight; it is not a drone.
- The prototype's own drone synthesis (three oscillator stacks under a
  low-pass) is the reference for the sounds' character, not a requirement.
