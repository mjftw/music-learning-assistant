---
type: Intent
title: scale-selection-acceptance-fixes — intent
description: Acceptance fixes for 005: stave artefacts after a scale change; the names view shows a split-direction scale's descent
resource: /changes/006-scale-selection-acceptance-fixes/intent.md
status: stable
tags: [sdd, intent, "change:006-scale-selection-acceptance-fixes"]
sources:
  - resource: conversation:2026-09-24
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/unknown
  at: 2026-09-24T07:52:50Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:53:27Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: practice
sdd_phase: resolved
---

# Intent: scale-selection-acceptance-fixes

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

Two findings from the user's acceptance walk of 005-scale-selection on the
laptop: "Odd visual bug on the stave on some of the scales — I think it is
artefacts being left on the stave when moving between different scale
types when the notes should have been removed." and "The note names view
is now incorrect for any scale that plays differently up to down — it
doesn't show the notes being different on the way down."

## Proposed outcome

The stave shows exactly the current run's noteheads after any sequence of
scale changes; the names view shows the descending form where it differs
— "probably by putting repeats of the note names for the down where the
down is different, like we do with the stave view".

## Affected users and systems

- `practice.session/REQ-012` (S4 modified: the names view's ↓ group
  replaces the alternative row); `theory.circle-of-fifths/REQ-003` (a
  scenario added: the stave after a scale change).
- Cause of the stave bug, found by inspection: noteheads keyed by note
  label, which a written-out ↑↓ run repeats.

## Constraints

- Same design vocabulary as 005; no new sheet or setting.
- Fixes ride the unmerged `005-scale-selection` branch so the PR ships them.

## Interview record

### Q1: For a split-direction scale in ↑↓, how does the names view show the descent?

**Recommended:** Append only the degrees that differ, in playing order,
as a ↓-marked group after the ascending octave (G minor: G A B♭ C D E F♯ ·
↓ F E♭) — compact, and the alternative row goes away.
**Answer:** Append only the degrees that differ, descending.
**Status:** decided

## Resolved

- Names view for ↑↓: ascending octave then a ↓ group of the descending
  form's differing notes in playing order; ↑ shows the ascending form
  only; ↓ shows the descending form only (its own seven notes). The
  alternative row is removed.
- Stave: noteheads keyed by run position; a regression scenario.

## Assumptions carried

- The duplicate-key diagnosis is right — the regression test is written
  first and must fail before the fix.

## Still open

- None.

## Riskiest unknown

Whether anything else on the stave (names row, halos) also keys by label.
