---
type: Implementation Notes
title: 008-learner-leads — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/008-learner-leads/notes.md
status: draft
tags: [sdd, notes, "change:008-learner-leads"]
sdd_id: 008-learner-leads
---

# Notes — 008-learner-leads

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

## Implementation notes

- T001: `initialSettingsOf` in App.tsx merges `defaultLeadSettings` over a stored v5 session until T004's v6 store (REQ-011/S3's defaults); the Files list did not name App.tsx — the ripple was taken, not left.
- T002: `practice/published` now re-exports theory's `SequenceNote` type (the reducer's signature names it). Minor: `nextPhaseAfterHold` builds the listening phase in two branches — fold at a later touch.
