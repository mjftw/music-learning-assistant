---
type: Change Proposal
title: The circle
description: An interactive circle of fifths, instrument-aware, replaces the paper one on the music stand.
resource: /changes/001-the-circle/proposal.md
status: stable
tags: [sdd, proposal, "change:001-the-circle"]
sources:
  - resource: /changes/001-the-circle/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T18:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T16:28:19Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_phase: approved
sdd_constitution: 1.0.0
---

# Proposal: The circle

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

Today a physical circle of fifths sits on the music stand: the user finds the
scale's root on it and works out which new sharp or flat this scale
introduces relative to the previous one, unaided. Nothing connects the circle
to the instrument in hand — what its range can actually play.

## Outcome

An interactive circle of fifths replaces the paper one. The user picks an
instrument variant and a key; the stave shows that key's signature and every
note of the key the instrument can play, lowest to highest, root emphasised,
with the newly introduced accidental highlighted and the relative key named.
Note names can be hidden for self-testing. The tool reopens where it was left.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The user, practising at home | Pick an instrument variant and a key on the circle; read the scale off the stave; hide note names to test recall | Legibility at the music stand; never being shown a note the instrument cannot play; the connections between keys staying visible |

## Scope

**In scope**
- The circle: 12 positions, major keys on the outer ring, relative natural
  minors on the inner ring, both selectable; both spellings shown at the
  three enharmonic positions.
- The key view: key signature on a stave; the key's notes across the selected
  variant's full playable range; root emphasis; new-accidental highlight;
  relative key named; note-names toggle.
- The instrument catalogue: tiered instrument → variant, each variant carrying
  its playable range; variants defined as data added over time; invalid
  variant data skipped with a visible, non-interrupting notice.
- Remembering the last selection locally; first-run default C major on flute.

**Explicitly out of scope** <!-- the most valuable section in this document -->
- Sound of any kind — playback is change 002, drone is 003.
- Listening / microphone — 004.
- Tooltips and theory explanations — 007 (`theory.explanations`).
- Temperament choice — 006; this change needs no pitch values, only note
  names and positions.
- Harmonic and melodic minor scales — later change; natural minor only.
- Per-instrument fingerings — deferred (decision 2026-09-19).
- In-app editing of instruments or ranges — new variants arrive as data.
- A category tier above instrument (woodwind, string) — the selector must
  merely not preclude it.
- Any progress tracking, history, or storage beyond the last selection.

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | — | first change |
| Affects | 002, 003, 005, 006 | they consume `theory.instruments` (variants, ranges) and the key/scale model this creates |
| Shares terms | all | Note, Instrument, Range, Key, Scale, Circle of fifths, Accidental, Stave (from `docs/glossary.md`) |

## Domain

- **Context:** `theory`
- **Nouns touched:** Note, Instrument (variant, range), Key, Scale, Circle of
  Fifths, Accidental
- **Events emitted:** none — `theory` exposes synchronous lookups only
  (domain map)
- **Events consumed:** none
- **Invariants this slice must preserve:** neighbouring keys on the Circle of
  Fifths differ by exactly one accidental (map); no displayed note ever leaves
  the selected Instrument's range (map: a NoteSequence never contains a note
  outside the Instrument's range — this change applies it to display)
- **New invariants this slice introduces:** none

## Changes

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `theory.circle-of-fifths` | `delta/theory/circle-of-fifths.md` | 8 | 0 | 0 | The capability does not exist; this change creates it |
| `theory.instruments` | `delta/theory/instruments.md` | 3 | 0 | 0 | The capability does not exist; this change creates it |

## Affects

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | none | — |
| `docs/glossary.md` | add **Variant** (`theory`): a concrete, playable form of an instrument with its own range (e.g. Ocarina Alto C); not to be confused with Instrument, the tier above | |
| `docs/product.md` | none | — |

## Non-functional requirements

| Concern | Requirement | How measured |
|---|---|---|
| Privacy / data retention | The only state stored is the last selection (instrument, variant, key, note-names toggle), on the user's device; deleting it loses nothing else | Inspect stored state after use; delete it; verify only the selection resets |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| Empty / zero / first-run state | C major on the flute, note names on | `theory.circle-of-fifths/REQ-008` |
| Concurrent or duplicate action | Single user, single device; re-selecting the current key is a no-op | accepted risk |
| Upstream dependency unavailable | No runtime dependencies exist (Article VII) | — |
| Malformed or hostile input | Invalid variant data file skipped with a visible, non-interrupting notice | `theory.instruments/REQ-003` |
| Partial failure mid-operation | Unreadable stored selection falls back to first-run default; the tool always opens | `theory.circle-of-fifths/REQ-008` |
| Key with zero accidentals selected | No new-accidental highlight (there is none) | `theory.circle-of-fifths/REQ-004` |

## Assumptions

- Recorded ranges match the physical instruments (flute C4–C7 ignoring
  B-foot; Ocarina Alto C A4–F6; Ocarina Bass C A3–F5) — if wrong, a data
  edit corrects it.
- The full-range stave (an octave and a bit, names on) is legible on a
  phone-sized screen — to be discovered by use (product brief, open
  question 1).

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | Is one clef (treble) used for all v1 variants, including Bass C ocarina (A3–F5, ledger lines below the stave)? | Stave display detail in the plan | Yes — all three variants are close enough to treble range; a second clef is complexity the slice does not need |

## Out of band

The one-octave stave display was proposed and rejected during grilling
(intent Q6): hiding playable notes misleads. G♯ major was proposed as the
acceptance key and withdrawn — it is a theoretical key (8 sharps); G major
replaced it (intent Q9).
