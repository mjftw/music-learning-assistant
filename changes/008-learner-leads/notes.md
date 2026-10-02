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
- T003: `hold-never-early` runs 8 timelines per setting (24 and 12 both exceeded the 10 s budget here); 3.5 M events over every tolerance × hold × tempo; 15 s vitest timeout.
- T004: the store's `storedSessionSchema` extracted from v3's inline object so v6 extends it; App's read path takes the stored `lead`, the save path writes v6. `hold-never-early` timed out once (15 s) under full-suite load — timeout raised at T005.
- T005: `requestListening(owner, isCurrent, onReady)` shared by enterTuner and startLead (three params to keep the tuner's generation guard byte-for-byte); `sequenceCaptionOf` extracted from captionOf; `setSettings` needed a second `invalidateSnapshot()` after `stop()` cached a stale snapshot (bug found by REQ-014/S3); `leadListeningState` is its own variable so the snapshot's dedup keeps reference equality; REQ-015/S8 uses a synthetic one-pitch variant — no real catalogue variant yields an empty run (005's notes: unreachable). Open for T008: `startLead()` must bump `droneGeneration` before stopping the drone, as enterTuner does.
- T006: D001 (two-way) — REQ-016/S1's `.every` scoped to the C-target readings, S4's window derived from the snapshot's heldFraction (the 10.667 ms reading grid; a cold start after silence or a new target counts 0); the reducer untouched. D001's amendment to REQ-016/S4's wording is applied at the end of the run. `isTooOld` shared with the tuner; the commit/gap trios kept separate (bodies differ).
