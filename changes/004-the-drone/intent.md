---
type: Intent
title: the-drone — intent
description: Hold a drone on any note for wind pitching and string tuning
resource: /changes/004-the-drone/intent.md
status: draft
tags: [sdd, intent, "change:004-the-drone"]
sources:
  - resource: conversation:2026-09-23
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-23T21:03:24Z
verified: []
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: draft          # draft | resolved
---

# Intent: the-drone

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

Wind players pitch against a reference; string players tune to one. The
product brief names the drone as a core practice aid alongside the
play-along; today the tool can play a scale but cannot hold a note.

## Proposed outcome

## Affected users and systems

- The user, alone, phone on the stand or laptop.
- `practice` gains `practice.drone`; the `sound` context renders it (a
  voice with no end until stopped); `theory.temperament` gives its pitch
  (equal, A440 — just temperament arrives at 007).
- `practice.session` is modified: playback and the drone exclude each other
  (▶ stops the drone; drone-on stops playback), and a tapped note on the
  stave or names view sounds for one beat.

## Constraints

- No separate design: built from the 003 vocabulary (cards, pills, sheets,
  theme) in the transport's neighbourhood; reviewed against the design
  system rather than a prototype (Q1).
- Articles VI (never interrupts), VII (synthesised locally), VIII.
- Persistence pattern of practice.session/REQ-011.

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Where does the drone's UI design come from?

**Recommended:** No new prototype — one small control next to the transport,
from the existing components; screenshot review against the design system.
**Answer:** Build from the existing vocabulary.
**Status:** decided

### Q2: Which note, and how is it chosen?

**Recommended:** Default to the selected key's tonic in the octave nearest
the middle of the instrument's range, following key changes; a drone sheet
(the Tempo sheet's shape) picks any in-range note with semitone and octave
steppers; a note pinned in the sheet survives key changes.
**Answer:** Tonic by default + any note via a sheet.
**Status:** decided

### Q3: Where does the drone control live, and how does it behave alongside playback?

**Recommended:** Its own card under the transport (toggle pill, "Drone · G4"
caption, "edit ›" to the drone sheet), sounding on through play/stop, key
changes (retuning seamlessly) and sheets; stopping when the page is hidden.
**Answer:** Drone stops when playback starts — own card, but ▶ silences the
drone; they never sound together.
**Status:** decided — own card; ▶ stops the drone; key changes retune
seamlessly; hidden page stops it. Whether the drone can be started while
playing (stopping playback) is Q4.

### Q4: The two exclusions, and tapping a note

User request during the grill: "Clicking a note on the stave should also
play that note for some time." Folded into this change (same sound
engine; a modification of practice.session).
**Recommended:** Starting the drone while playing stops playback (mirror of
▶ stopping the drone). Tapping a note on the stave or a names-view column
sounds it for one beat at the current tempo, with the halo, ignored while
playback runs (Article VI), allowed over the drone (checking an interval
against the reference — the one place two notes sound together); tapping
again before it ends restarts it.
**Answer:** Yes, all of it.
**Status:** decided

## Resolved

## Assumptions carried

## Still open

## Riskiest unknown
