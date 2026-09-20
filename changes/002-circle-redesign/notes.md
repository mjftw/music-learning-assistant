---
type: Implementation Notes
title: 002-circle-redesign — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/002-circle-redesign/notes.md
status: draft
tags: [sdd, notes, "change:002-circle-redesign"]
sdd_id: 002-circle-redesign
---

# Notes — 002-circle-redesign

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## T001 (2026-09-20)
- PASS/PASS. fast-check + coverage out, 4 @fontsource packages + playwright (dev) in, theme.ts matches the reference palette.
- Controller fix: eslint ignores changes/** and .sdd/** — the vendored design prototype broke typed linting; SDD artefact trees are never lintable app code.
- Brief said 30 tests; real count 31 (stale figure, no regression).

## T002 (2026-09-20)
- PASS/PASS. Fixed the c-major-names state to actually drive the prototype to C major (its raw default was G, an author-time leftover) so both sides of the pair compare the same state.
- Design pipeline confirmed working end to end: prototype PNG matches the vendored design exactly (arc, degrees, names, footer).
- Google Fonts requests aborted for hermetic shots; dev server spawned/torn down only when needed; failures propagate (no silent blank PNGs).
- Minor (non-blocking): text-based click locators could silently break on a future prototype edit.
