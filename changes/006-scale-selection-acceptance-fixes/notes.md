---
type: Implementation Notes
title: 006-scale-selection-acceptance-fixes — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/006-scale-selection-acceptance-fixes/notes.md
status: draft
tags: [sdd, notes, "change:006-scale-selection-acceptance-fixes"]
sdd_id: 006-scale-selection-acceptance-fixes
---

# Notes — 006-scale-selection-acceptance-fixes

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

- T001: the S7 test as briefed passed on the buggy code in jsdom (React only warns on duplicate keys); a console.error spy asserting no "same key" message made it load-bearing (fixer round). Brief errors: the name-label test id is `stave-note-name`; blues' inline accidentals are ♭ then ♮.
- T002: `readColumns`' `note-mark` became nullable (descent columns have none). No App-level test drives a split-direction scale through the names view end to end (reviewer note).
- Converge round 1: Not converged — C1 the S7 test only discriminated via a console.error spy (a mock, engineering §7) and never asserted the notes; the reviewer reproduced the real artefact only across a key change with a split scale in ↑↓ → S7 amended (key change added) and T004; W1 direction wiring untested through the app → T005; W3 the descent mark repeated the name ("↓F" over "F") → bare "↓", T005. Info: no other list keyed by a repeatable label (intent's riskiest unknown closed); plan.md is the untouched template by design (small change).
- T004 review (minor): the S7 test duplicates StaveView's private ACCIDENTAL_GLYPH table locally to avoid importing the render path under test.
- Converge round 2: Not converged — W1 (S7 amended in place; accepted by name) and W2 (S7 never asserted the note names) → T007. Round-1 C1/W1–W3 verified closed by the reviewer's own mutation probes.
