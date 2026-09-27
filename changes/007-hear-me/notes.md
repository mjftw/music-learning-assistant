---
type: Implementation Notes
title: 007-hear-me — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/007-hear-me/notes.md
status: draft
tags: [sdd, notes, "change:007-hear-me"]
sdd_id: 007-hear-me
---

# Notes — 007-hear-me

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## Design check — hard-coded values outside the tokens file (2026-09-28)

`scripts/check-design.sh` warns that `src/ui/global.css` carries three
hard-coded values. They are justified, not promoted: the page background
outside the app column (`#ddd6c7`, the design's `body` background — CSS
cannot read `theme.ts`, and it is the one colour that is not part of a
screen), `-webkit-tap-highlight-color: transparent`, and `font: inherit`
on `button`. Nothing under `src/ui/*.tsx` is checked by the glob; those
read `theme.ts` by construction.
