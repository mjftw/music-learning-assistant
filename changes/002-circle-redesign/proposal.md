---
type: Change Proposal
title: Circle redesign
description: The circle and key view rebuilt to the Function Paper prototype — distance ring, degrees, global spelling, names/stave panel, picker sheet, settings drawer.
resource: /changes/002-circle-redesign/proposal.md
status: stable
tags: [sdd, proposal, "change:002-circle-redesign"]
sources:
  - resource: /changes/002-circle-redesign/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T19:45:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:36:23Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_phase: approved
sdd_constitution: 1.0.0
---

# Proposal: Circle redesign

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

001-the-circle is functionally correct but, in the user's words at
acceptance, "the UI is terrible." A design prototype ("Circle 1c Function
Paper", from the Claude Design handoff bundle) has since refined not just
the visuals but how the user wants the product to behave — and by standing
decision (2026-09-20), the prototype wins on every visual and interaction
divergence from shipped behaviour.

## Outcome

The circle and key view read as the prototype: a phone-proportioned column
(centred on larger screens); wedges with fixed per-key hues; an optional
distance ring spanning exactly the key's seven positions, warm sharpward and
cool flatward, with scale degrees set into it and the key's own names for
those notes outside it; a single global ♯/♭ preference spelling the three
enharmonic positions; the key signature in the circle's centre; and a bottom
panel switching between a names view (seven notes with accidental-order
marks and degrees) and a stave view (the key across the range for a chosen
span, roots accented, optional names). Instrument selection opens as a
sheet; display settings live in a drawer; every preference survives a
restart.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The user, practising at home | Everything 001 allowed, plus: read key-relative structure (degrees, distance) off the circle; switch spelling globally; choose how much of the range the stave shows; adjust display settings without leaving practice | The design reading exactly as the prototype, especially on the phone on the music stand |

## Scope

**In scope**
- The circle redrawn: fixed per-key wedge hues, selected-wedge emphasis,
  minor ring labels, centre disc with clef and key signature.
- Global ♯/♭ spelling preference (replaces per-position dual spellings).
- Distance ring + outside scale names (toggleable); scale degrees
  (toggleable) shown in the arc and in the names view.
- Bottom panel: names view ⇄ stave view; span pills (whole-octave runs that
  fit, plus full); range summary; stave note-names setting (default off).
- Instrument picker as a bottom sheet; settings drawer with the three
  display toggles.
- Persistence of all new preferences with one stored-shape version bump.
- Laptop: the same column centred at phone width.

**Explicitly out of scope** <!-- the most valuable section in this document -->
- Sound, playback, drone, tempo — the footer is a static dashed placeholder
  naming them (changes 003, 004).
- Wide/desktop layouts — a possible later change (decision 2026-09-20).
- Tooltips / theory explanations — change 008.
- Any change to `theory.instruments` — the catalogue, its data files and
  its notices are consumed unchanged.
- Harmonic/melodic minors, fingerings — unchanged from the roadmap.
- Gamification, interruptions — forbidden by Article VI as ever.

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 001 (shipped) | modifies the capability it created |
| Affects | 003 `hear-the-scale` | 003's traversal picker may default from the Span but is its own concept (decision 2026-09-20) |
| Shares terms | all | Key, Scale, Accidental, Circle of fifths, Variant, Range, Stave + new: Span (from `docs/glossary.md` once applied) |

## Domain

- **Context:** `theory`
- **Nouns touched:** Key, Scale, Accidental, Circle of Fifths, Note,
  Variant (consumed), Range (consumed); new noun **Span**
- **Events emitted:** none — `theory` exposes synchronous lookups only
- **Events consumed:** none
- **Invariants this slice must preserve:** neighbouring keys differ by
  exactly one accidental (REQ-006, untouched); no displayed note ever
  leaves the selected variant's range (REQ-005, untouched — the span is
  always a subset of the in-range notes)
- **New invariants this slice introduces:** none

## Changes

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `theory.circle-of-fifths` | `delta/theory/circle-of-fifths.md` | 3 | 6 | 0 | The prototype changes how the circle is spelled, what the key view shows and how preferences are structured; adds the distance ring, degrees and span |

## Affects

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | none | — |
| `docs/glossary.md` | add **Span** (`theory`): which part of the key's in-range notes the stave shows — a whole-octave run up from a tonic, or the full range; not to be confused with Traversal (how playback walks a scale, change 003). Add **Distance ring** (UI): the arc over the key's seven circle positions, coloured by distance from the selected key, carrying the scale degrees | |
| `docs/product.md` | none | — |

## Non-functional requirements

| Concern | Requirement | How measured |
|---|---|---|
| Privacy / data retention | Stored state remains exactly one local selection object (now including the six display preferences); nothing else is stored | Inspect stored state after use; delete it; verify only preferences reset |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| Empty / zero / first-run state | C major on flute; sharp spelling; names view; full span; degrees on; ring on; stave names off | `theory.circle-of-fifths/REQ-008` |
| Stored state from 001's shape | Loads; new preferences take their defaults | `theory.circle-of-fifths/REQ-008` |
| No whole-octave run of the key fits the variant's range | Only the full-range span is offered | `theory.circle-of-fifths/REQ-011` |
| Selected dual position when the spelling preference flips | The selection follows the position: the same wedge, respelled | `theory.circle-of-fifths/REQ-002` |
| Distance ring off | Arc, degrees-in-arc and outside names all disappear together; wedges and selection untouched | `theory.circle-of-fifths/REQ-009` |
| Malformed variant data / upstream down / concurrency | Unchanged from 001 (`theory.instruments/REQ-003`; no runtime deps; single user) | — |

## Assumptions

- "Circle 1c Function Paper" is the final design; the other studies in the
  handoff are earlier iterations — risk if wrong: rework against a
  different study.
- The prototype's own theory logic (spelling, ranges, runs) agrees with
  `theory/published` everywhere reachable — risk if wrong: a visual
  divergence traced to a logic divergence; existing scenario tests catch it.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|

## Out of band

The prototype's source (`Circle 1c Function Paper.dc.html` + `support.js`)
is the visual reference; the acceptance test is a side-by-side on the phone
(intent Q7). The prototype cites this repo's requirement IDs in its own
comments, so its divergences from the 001 spec are deliberate. Prototype
props defaults (sharp spelling, degrees on, ring on, stave names off, names
panel, full span) become the first-run defaults.
