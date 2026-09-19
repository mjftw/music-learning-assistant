---
type: Intent
title: The circle — intent
description: An interactive circle of fifths that replaces the paper one on the music stand.
resource: /specs/001-the-circle/intent.md
status: stable
tags: [sdd, intent, "slice:001-the-circle"]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T17:55:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T16:16:39Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_phase: resolved
---

# Intent: The circle

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

Today a physical circle of fifths sits on the music stand: the user finds the
scale's root on it and works out which new sharp or flat this scale
introduces relative to the previous one, unaided. (From the product brief.)

## Proposed outcome

An interactive circle of fifths: pick a key and instrument, see the scale on
a stave with note names and which accidental is new — replaces the paper
circle on the stand. (From the roadmap, approved.)

## Affected users and systems

The user, practising at home. First slice: creates the `theory` context and
the UI shell around it. No sound, no microphone, no other context involved.

## Constraints

- `theory` context owns this slice (approved domain map); invariants:
  a NoteSequence never leaves the instrument's range; neighbouring keys on
  the circle differ by exactly one accidental.
- Selectable instrument constrains the note range; never show a note the
  instrument cannot play (decision, 2026-09-19).
- Article VI: no interruptions, no gamification; tooltips are slice 007.
- Usable on laptop at least; phone on the stand is the preferred practice
  interface (product brief).

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Which keys and scales does the circle cover in this slice?

**Recommended:** Both rings — 12 major keys outside, relative natural minors
inside — because that is what the paper circle shows; stave display majors
and natural minor only, harmonic/melodic minor later.
**Answer:** Agreed.
**Status:** decided

### Q2: How are the enharmonic keys handled (B/C♭, F♯/G♭, C♯/D♭)?

**Recommended:** Show both spellings at those three positions, as paper
circles do; the scale is spelled per the chosen name (F♯ major → sharps,
G♭ major → flats). Seeing 6♯ ≡ 6♭ is a connection worth teaching.
**Answer:** Agreed.
**Status:** decided

### Q3: What appears when a key is selected?

**Recommended:** Key signature drawn on the stave; the scale over one octave
with the note name under each note; the new accidental highlighted (new =
vs the neighbouring key with one fewer accidental — the user's own
heuristic); the relative minor/major named alongside. Nothing else.
**Answer:** Yes, but note names must be toggleable off: (1) worried it will
look crowded and hard to read; (2) sometimes it helps not to be told, so you
are forced to remember yourself — that aids learning.
**Status:** decided

### Q4: Which instruments exist in v1, and how is the selector organised?

**Recommended:** Two built-ins — flute and the user's ocarina — with
editable ranges.
**Answer:** Two ocarinas, both in C: a Songbird 12-hole Alto C and a
Concerto Bass C (one octave apart), plus the flute. The selector is tiered
and built to expand without redesign: instrument (ocarina, flute) →
variant (Alto C, Bass C). A category tier above (woodwind, string) may come
later but is more than needed now.
**Status:** decided

### Q5: Concrete ranges, and are they editable in-app?

**Recommended:** Flute C4–C7 (ignore B-foot), Ocarina Alto C A4–F6,
Ocarina Bass C A3–F5; no in-app range editing — a new variant is added as
data when needed.
**Answer:** Agreed — and variants are input data files added over time,
plugin-architecture style. "I like this."
**Status:** decided

### Q6: Which part of the scale does the stave show?

**Recommended (first):** The lowest full playable octave only.
**Answer:** Rejected — if the instrument can play more than a single octave
(flute can; the ocarinas do an octave and a bit) it is unhelpful and
misleading not to show that. Agreed refinement: the stave shows every note
of the key within the instrument's range, lowest to highest (e.g. C major
on Alto C = A4→F6), with the root visually emphasised so the scale's shape
stays obvious.
**Status:** decided

### Q7: What is remembered between uses, and what does first run show?

**Recommended:** Remember the last selection (instrument, variant, key,
note-names toggle) locally on the device; first run shows C major on the
flute. Nothing else stored — no history, nothing personal; wiping it loses
only the last selection.
**Answer:** Agreed.
**Status:** decided

### Q8: What happens on a bad variant data file?

**Recommended:** Skip it with a visible, non-interrupting notice naming the
file and the problem; the app starts with every valid instrument. A broken
file never takes the tool down. (Alternative — refuse to start — rejected
as violating "the tool just works when picked up".)
**Answer:** Agreed.
**Status:** decided

### Q9: What is the acceptance test, and who signs off?

**Recommended:** A sharp-side key on the flute, plus the ocarina
octave-shift check; property tests for circle adjacency and range safety.
(User first said G♯ major; agreed that is a theoretical key — 8 sharps —
and settled on G major, the one-sharp scale.)
**Answer:** G major on the flute: correct key signature (F♯), every
G-major note the flute can play lowest→highest with the root emphasised,
F♯ highlighted as the new accidental vs C major, E minor named as
relative; note-names toggle hides names; switching Alto C → Bass C
ocarina shifts everything down an octave. Signed off by the user on their
laptop. Property tests: neighbouring keys differ by exactly one
accidental; no displayed note leaves the variant's range.
**Status:** decided

## Resolved

- Circle shows both rings: 12 major keys outside, relative natural minors
  inside; stave display covers major and natural minor only — harmonic and
  melodic minor come later.
- Enharmonic positions (B/C♭, F♯/G♭, C♯/D♭) show both spellings; the scale
  is spelled per the chosen name — seeing 6♯ ≡ 6♭ teaches the connection.
- Selected key shows: key signature on the stave; the key's notes across
  the instrument's full playable range, lowest to highest, root emphasised;
  the new accidental highlighted (new = vs the key with one fewer
  accidental); the relative minor/major named. Nothing else.
- Note names under notes are toggleable off — avoids crowding, and not
  being told aids memory.
- Instruments in v1: flute (C4–C7), Ocarina Alto C (A4–F6), Ocarina Bass C
  (A3–F5). Selector is tiered — instrument → variant — expandable without
  redesign; a category tier may come later.
- Variants are input data files added over time, plugin-architecture style;
  no in-app range editing.
- Remembered between uses: last selection (instrument, variant, key,
  note-names toggle), locally; first run shows C major on the flute;
  nothing else stored.
- A variant file that fails validation is skipped with a visible,
  non-interrupting notice naming the file and problem; the app starts with
  every valid instrument.
- Acceptance: the G major check above, signed off by the user; property
  tests for circle adjacency and range safety.

## Assumptions carried

- Ranges as recorded (flute C4–C7 ignoring B-foot; Alto C A4–F6; Bass C
  A3–F5) match the actual instruments — risk if wrong: a corrected range is
  a data-file edit, low cost.

## Still open

- None.

## Riskiest unknown

Whether the full-range stave display (an octave and a bit, names on) stays
legible on a phone-sized screen — discovered by use, per the product brief.
