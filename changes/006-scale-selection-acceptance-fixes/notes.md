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
