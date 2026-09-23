---
type: Change Proposal
title: scale-selection
description: Choose a scale type (modes, pentatonics, blues, whole tone, chromatic, melodic minor) to hear and play from the selected key, not just its diatonic major/minor
resource: /changes/005-scale-selection/proposal.md
status: stable
tags: [sdd, proposal, "change:005-scale-selection"]
sources:
  - resource: /changes/005-scale-selection/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-sonnet-5
  at: 2026-09-23T21:19:19Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T21:54:16Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_phase: approved
sdd_constitution: 1.0.0
---

# Proposal: scale-selection

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

003-hear-the-scale plays only the diatonic major or natural-minor scale of
the selected key — there is no way to hear or play along with a mode, a
pentatonic, the blues scale, a melodic or harmonic minor, whole tone or
chromatic, even though the product exists to serve exactly this half of
practice (product brief: "the current scales and arpeggios").

## Outcome

From the key already selected on the circle, the learner opens a Scale
sheet and picks any scale in the catalogue offered for that key's mode; the
key name, formula, stave, names view and playback all follow the choice,
while the circle's wedges, ring and signature keep showing the plain key
exactly as before. The choice persists per mode, and behaves like any other
traversal change — it never interrupts playback, it restarts the sequence
at once.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The user (self-taught flute/ocarina player, learning theory on the instrument) | Pick a scale type for the selected key, see its formula, hear and play along with it, without losing the circle as the mental map | The scale sounds and reads correctly (right notes, right formula) and never derails a run already playing |

## Scope

**In scope**
- A Scale sheet, opened from the key name / a new formula row, offering the
  catalogue for the selected mode: major family (Major, Major pentatonic,
  Lydian, Mixolydian, Harmonic major), minor family (Natural minor,
  Harmonic minor, Melodic minor · classical, Melodic minor · jazz, Minor
  pentatonic, Blues, Dorian, Phrygian, Locrian), and, from either ring,
  Whole tone and Chromatic — 15 entries total.
- The formula (scale-degree numbers, with an accidental prefix on any
  degree the scale alters from the tonic's own major/natural-minor form),
  shown in the sheet and next to the key name.
- The stave, names view and playback following the chosen scale, generalised
  from a fixed 7-note diatonic run to scales of 5, 6, 7 or 12 notes per
  octave.
- Classical melodic minor's separate ascending (raised 6th/7th) and
  descending (natural minor) forms, and its "both ways" direction using
  each.
- The arpeggio shape available only where the chosen scale defines degrees
  1, 3 and 5; falling back to "scale" for the two pentatonics, blues, whole
  tone and chromatic.
- Persisting the chosen scale per mode (major-ring choice and minor-ring
  choice independently), and restarting the sequence at once (no count-in)
  when it changes while playing — the same pattern as every other
  traversal change.

**Explicitly out of scope**
- Any change to the circle's wedges, ring, numerals or key signature
  display — they show the plain major/natural-minor key regardless of
  scale choice (decided in intent, Q2).
- Note length (crotchet/quaver) — stays removed, per 003's decision; not
  reintroduced by this change even though the source design still shows it
  (decided in intent, Q1).
- Temperament (just vs equal) — 007's territory, untouched.
- The drone — 004's territory, paused and untouched.
- Per-instrument fingerings — deferred generally (docs/roadmap.md).
- Any new capability or context: this lands entirely inside
  `practice.session` and `theory.circle-of-fifths`.

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 003-hear-the-scale | Builds directly on its transport, stave, names view and Traversal sheet; the scale choice is a sibling of the existing Traversal choice. |
| Affects | none | 004-the-drone is paused and untouched; 006–009 are unstarted and unaffected. |
| Shares terms | `docs/glossary.md` | Key, Scale, Traversal, NoteSequence, Session setting — used exactly as defined there (Scale's definition is broadened by this change; see Affects below). |

## Domain

> From `docs/domain.md`. One context per slice. If this slice needs two, stop:
> either it is two slices, or it is an integration slice whose only job is the
> event/interface between them.

- **Context:** `practice` (owning) — this is the same relationship as
  003-hear-the-scale had with `theory`: `theory.circle-of-fifths` is
  modified because the chosen scale's notes are a theory fact and the key
  view is theory's display, but the user-facing choice, its persistence and
  its effect on the transport are `practice.session`'s. One outcome with a
  theory prerequisite, not two changes.
- **Nouns touched:** `practice` — Session, Traversal choice (its shape
  option now depends on the chosen scale), Session settings; new noun
  **Scale choice** (which of the catalogue is selected, per mode). `theory`
  — Scale (broadened: no longer only the key's own diatonic form),
  NoteSequence, Arpeggio, Note, Range.
- **Events emitted:** `TargetAdvanced` — unchanged; still each time the
  sounding note changes, now potentially a note of a non-diatonic scale.
- **Events consumed:** none (unchanged from 003).
- **Invariants this slice must preserve:** a generated NoteSequence never
  contains a note outside the selected Instrument's range (`theory`,
  `circle-of-fifths/REQ-012`, now over every selectable scale too); the
  current target note is always a member of the active sequence
  (`practice`, `session/REQ-006`).
- **New invariants this slice introduces:** none — the existing range
  invariant is generalised, not added to.

## Changes

> Requirements live in the delta files, not here. One row per capability this
> change touches. `sdd-specify` writes the deltas from the intent; this table
> is the map.

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `practice.session` | `delta/practice/session.md` | 1 (REQ-012) | 3 (REQ-001, REQ-007, REQ-011) | 0 | The Scale sheet, its choice, persistence and interaction with the existing Traversal sheet and transport |
| `theory.circle-of-fifths` | `delta/theory/circle-of-fifths.md` | 0 | 2 (REQ-003, REQ-012) | 0 | The key view and the run/sequence fitting generalise from "the key's diatonic scale" to "the chosen scale rooted on the key's tonic" |

## Affects

> Living documents this change modifies, other than the capability specs.
> Each is a gated re-approval at `sdd-finish`, never a silent edit.

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | `practice`'s Owns column gains the noun **Scale choice**, alongside Traversal choice | |
| `docs/glossary.md` | `Scale`'s definition broadens from "the ordered notes of a key" to "one of a catalogue of note-formulas rooted on a key's tonic"; new term **Scale family** (major / minor / either — which ring's sheet offers a scale); `Mode`'s "Not to be confused with" note updated — musical modes (Dorian etc.) are no longer unused, they are catalogue entries, still distinct from practice's Mode | |
| `docs/product.md` | none | |

## Non-functional requirements

> Only ones with a number in them. "Fast" is not a requirement; "renders in
> under 200 ms at p95 on a cold cache" is. Delete any line you cannot measure.

None beyond what `practice.session/REQ-006` (30 ms highlight budget) and
`REQ-008` (5 ms timing budget) already require — both are unchanged by this
slice and continue to apply to whichever scale is playing.

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| The chosen scale's tonic has no in-range occurrence at all | Same fallback as today: the octave-fitting reports no whole-octave count fits, full range is offered, and if even full range is empty the caption reads "no notes of this key in range" | `theory.circle-of-fifths/REQ-012`, `practice.session/REQ-002` |
| Arpeggio is selected, then a scale with no degree 1/3/5 is chosen while playing | Shape falls back to "scale" and the sequence restarts at once, no count-in, like any other traversal change | `practice.session/REQ-012` (new), `REQ-007` |
| Stored state predates this change (no scale choice recorded) | Major-ring scale defaults to Major, minor-ring scale defaults to Natural minor; every other stored setting restores as before | `practice.session/REQ-011` |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
- The design's degree-formula convention (each scale numbered against its
  own family's home reference) and its blues formula's duplicate degree-5
  entry are adopted as coded (carried from `intent.md`'s Assumptions
  carried).

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

None — the intent's interview resolved every branch found; the two
Affects entries above are bookkeeping, not open decisions.

## Out of band

The source is the "Hear the Scale" Claude Design project ("Iterate on Hear
the Scale"), imported the same way 003's prototype was vendored — it is the
source of truth for the screen (`docs/decisions.md`, 2026-09-22 pattern,
reapplied here 2026-09-23). `changes/005-scale-selection/intent.md` carries
the full interview record, including the music-theory reasoning for the
key-signature-display decision (Q2).
