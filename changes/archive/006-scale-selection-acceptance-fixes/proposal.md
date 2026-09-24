---
type: Change Proposal
title: scale-selection-acceptance-fixes
description: The stave shows only the current run after any scale change, and the names view shows a split-direction scale's differing descending notes
resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
status: stable
tags: [sdd, proposal, "change:006-scale-selection-acceptance-fixes"]
sources:
  - resource: /changes/006-scale-selection-acceptance-fixes/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-fable-5-1
  at: 2026-09-24T06:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:55:31Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: practice
sdd_phase: merged
sdd_constitution: 1.0.0
---

# Proposal: scale-selection-acceptance-fixes

> **WHAT and WHY only.** Small change: proposal + delta, no plan.

## Problem

Acceptance of 005-scale-selection found (1) stray noteheads and accidentals
left on the stave after moving between scale types — a display of notes
that are not in the run — and (2) the names view of a scale whose descent
differs (classical melodic minor) shows the ascending names only, with a
small alternative row the user did not find readable as "these notes are
different on the way down".

## Outcome

After any sequence of scale, key, variant or traversal changes the stave
shows exactly the current run's noteheads and inline accidentals, nothing
older. For a split-direction scale the names view shows what plays: the
ascending octave, then — for ↑↓ — a ↓-marked group of the descending
form's notes that differ, in playing order; for ↓ alone, the descending
form's own seven notes.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The user | Trust the stave after switching scales; read the descent of a melodic minor in the names view | Nothing on screen that is not being played |

## Scope

**In scope**
- The stave regression (a scenario proving the run after a change is
  exactly the run) and its fix.
- REQ-012/S4 rewritten: the ↓ group replaces the alternative row.

**Explicitly out of scope**
- Any other names-view or stave change; the design vocabulary is 005's.

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 005-scale-selection | Fixes it; rides its unmerged branch |
| Affects | none | |
| Shares terms | `docs/glossary.md` | Scale, Traversal, NoteSequence |

## Domain

- **Context:** `practice` (owning); `theory.circle-of-fifths` gains one
  scenario under REQ-003 (the stave shows the run) — no theory logic changes.
- **Nouns touched:** Scale choice, Traversal choice; NoteSequence (display only).
- **Events emitted / consumed:** none changed.
- **Invariants preserved:** the target is always in the sequence (untouched).
- **New invariants:** none.

## Changes

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `practice.session` | `delta/practice/session.md` | 0 | 1 (REQ-012 — S4 rewritten) | 0 | The names view shows the descent |
| `theory.circle-of-fifths` | `delta/theory/circle-of-fifths.md` | 0 | 1 (REQ-003 — S7 added) | 0 | The stave after a scale change is exactly the run |

## Affects

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | none | |
| `docs/glossary.md` | none | |
| `docs/product.md` | none | |

## Non-functional requirements

None new.

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| A scale change while playing (REQ-007) | The stave and names view show the new run at once; no old notehead survives | `theory.circle-of-fifths/REQ-003/S7` |
| ↑↓ with a scale whose forms do not differ | No ↓ group | `practice.session/REQ-012/S4` |

## Assumptions

- The stave artefacts come from noteheads keyed by note label, which a
  written-out run repeats; the regression scenario is written to fail first.

## Open questions

None.

## Out of band

Found at the user's acceptance walk of 005 (2026-09-24); the user chose
the compact ↓ group over writing the whole run out.
