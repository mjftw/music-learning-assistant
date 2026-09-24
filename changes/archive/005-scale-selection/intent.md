---
type: Intent
title: scale-selection — intent
description: Choose from a catalogue of scale types (modes, pentatonics, blues, chromatic, melodic minor) to hear and play, not just the diatonic major/minor of the selected key
resource: /changes/005-scale-selection/intent.md
status: stable
tags: [sdd, intent, "change:005-scale-selection"]
sources:
  - resource: conversation:2026-09-23
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-sonnet-5
  at: 2026-09-23T21:19:19Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T21:36:21Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_phase: resolved
---

# Intent: scale-selection

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

003-hear-the-scale only ever plays the diatonic major or natural-minor scale
of the selected key. Real practice (product brief: "the current scales and
arpeggios") covers more than that — modes, pentatonics, blues, the melodic
and harmonic minors, whole tone, chromatic. Today there is no way to hear or
play along with any of them; the tool has to be left aside for that half of
practice.

## Proposed outcome

From the key already selected on the circle, the learner can open a Scale
sheet and choose among a catalogue of scale types for the current mode
(major-family scales when the outer ring is selected, minor-family when the
inner ring is, plus whole tone and chromatic from either), see its formula
(scale-degree numbers with accidentals) and hear it played back with the
existing transport, stave and names view — the circle itself keeps showing
the plain key.

## Affected users and systems

- The user, alone, same as every slice.
- `practice.session` is modified: a new Scale choice sits alongside the
  existing Traversal (direction/octaves/shape) and session settings, changes
  what the stave/names view/playback show, and (per REQ-007) restarts the
  sequence like any other traversal change.
- `theory.circle-of-fifths`/REQ-012 is modified: the run/sequence
  computation generalises from "the key's diatonic notes" to "the chosen
  scale's notes from the selected tonic", for scales with 5, 6, 7 or 12
  notes per octave, not just 7; the arpeggio shape (degree 1/3/5) is only
  offered where the scale defines those degrees.
- The circle's wedges, ring and key signature glyphs are unaffected — they
  keep showing the plain major/natural-minor key exactly as today; only the
  stave, names view and audible playback follow the chosen scale.

## Constraints

- Source design: "Hear the Scale" (Claude Design, `Hear the Scale.dc.html`,
  vendored the way 003's prototype was) — reviewed and iterated by the user
  under the project name "Iterate on Hear the Scale"; it is the source of
  truth for the screen, per the same pattern as 003 (docs/decisions.md,
  2026-09-22).
- Article VI (never interrupts): a scale change while playing behaves like
  any other REQ-007 traversal change — restart at once, no count-in.
  Article VII (synthesised locally); Article VIII (simplicity).
- Persistence pattern of practice.session/REQ-011.

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Note length — the design still has a ♩/♪ toggle; 003 removed it mid-implementation

**Recommended:** Keep it removed — treat the design's note-length pills and
`noteLen` state as carried over from before that decision, not a deliberate
reintroduction; every note stays a crotchet, and this slice does not touch
REQ-004/REQ-005 sound timing.
**Answer:** Keep it removed.
**Status:** decided

### Q2: Does the printed key signature change with the chosen scale, or stay the wedge's own?

**Recommended:** Stays the wedge's own plain major/natural-minor signature;
every note the chosen scale alters relative to that tonic's own diatonic
form gets an inline accidental. This is standard for harmonic/melodic minor
(uncontested), is the only workable choice for pentatonic/blues/whole-tone/
chromatic (which have no conventional signature of their own), and for the
modes matches the "alteration of the familiar scale" pedagogy this product
already uses elsewhere — the alternative (keying a mode by the major/minor
scale it borrows from) would decouple a wedge from its own signature, which
nothing else in this app does.
**Answer:** Deferred to the assistant's music-theory judgement ("I don't
know enough... what would seem most correct to an expert") — adopted the
recommendation above, with the reasoning given.
**Status:** decided

### Q3: Ship the whole 15-scale catalogue (incl. melodic minor's split direction) in one slice, or cut down for v1?

**Recommended:** Ship it all as designed — the design fully specifies every
scale already, there is no smaller version that is meaningfully less work,
and it is the approved source of truth.
**Answer:** Ship the full catalogue as designed.
**Status:** decided

## Resolved

- Note length stays removed (every note a crotchet) — the design's ♩/♪
  toggle is stale carryover predating 003's decision to cut it; this slice
  does not touch REQ-004/REQ-005 sound timing.
- The printed key signature (circle wedges, ring, stave signature glyphs)
  always shows the selected wedge's own plain major/natural-minor
  signature; every note the chosen scale alters relative to that tonic's
  own diatonic form gets an inline accidental instead — standard for
  harmonic/melodic minor, the only workable choice for pentatonic/blues/
  whole-tone/chromatic, matches this product's pattern-based teaching of
  modes, and keeps the wedge↔signature relationship the circle already
  depends on intact.
- Ship the full 15-scale catalogue in one slice: major, major pentatonic,
  Lydian, Mixolydian, harmonic major (major family); natural minor,
  harmonic minor, melodic minor (classical, split ascending/descending, and
  jazz, one form both ways), minor pentatonic, blues, Dorian, Phrygian,
  Locrian (minor family); whole tone, chromatic (either family) — as fully
  specified by the design.
- Scale choice is a new session setting, stored per mode (the major-ring
  choice and the minor-ring choice independently) the same way
  direction/octaves/shape/sound persist (`practice.session/REQ-011`
  pattern); changing it while playing restarts the sequence at once with no
  count-in, like any other traversal change (`REQ-007` pattern); the
  arpeggio shape is only offered where the scale's formula defines degrees
  1, 3 and 5 — every scale but the two pentatonics, blues, whole tone and
  chromatic, which fall back to "scale".
- The circle's wedges, ring, numerals and key-name label are unaffected by
  scale choice — only the stave, the names view, the new "Scales on
  {tonic}" sheet and audible playback follow it.

## Assumptions carried

- The design's degree-formula convention — each scale's degrees numbered
  and altered against its own family's home reference (the major scale for
  major-family scales, natural minor for minor-family) — is adopted as
  coded. Risk if wrong: a music-theory review flags a specific accidental
  spelling as unconventional (e.g. Locrian's ♭5); low risk, this is
  standard practice.
- Blues' formula has two entries both numbered degree 5 (natural 5 and
  ♭5); adopted as the design computes it. Arpeggio is disabled for blues
  regardless (it has no arp-eligible formula), so the duplicate degree
  number never surfaces in a played triad.

## Still open

- None beyond what sdd-specify itself decides: exact requirement/scenario
  IDs, and whether this lands as new REQs on practice.session/
  theory.circle-of-fifths or amendments to the existing ones (REQ-001,
  REQ-007, REQ-011; REQ-012) — that split is sdd-specify's job.

## Riskiest unknown

Generalising `theory.circle-of-fifths/REQ-012`'s run/sequence and
octave-fitting math — written and measured for a fixed 7-note diatonic
scale — to scales with 5, 6 or 12 notes per octave, without regressing the
existing diatonic scenarios (REQ-012/S1–S5) that 003 already shipped
against.
