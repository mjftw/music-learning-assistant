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
- T007: the complete/loop branch had already landed with T006; attempt 1 was tests only and the review caught that `setContext`/`setTraversal`/`setScaleChoice` left a `complete` lead card in place — fixed via `clearCompleteLeadCard()` plus a second `invalidateSnapshot()` (`restartIfPlaying()` → `endTapIfSounding()` re-caches first). Minor: calling `clearCompleteLeadCard()` before `restartIfPlaying()` would drop the extra invalidate and a one-tick stale "complete" on change listeners — fold at T010's touch of the same setters. The REQ-015 enumeration asserts `sequence.length + 2` events (start's own first target + one per hold through length + 1), 20 s timeout.
- T008: `stopAnyRun()` shared by `startDrone()`, `enterTuner()` and `start()`-as-tool (returns whether the drone was on so the tool-mode start keeps its release delay); `startLead()` bumps `droneGeneration` before stopping the drone (T005's open note closed). The widened never-both enumeration (7,380 → 16,104 sequences, 11 verbs) found two more: `startLead()` now ends a sounding tap first (`endTapIfSounding()` + `tapGeneration` bump), and `leaveTuner()` returns early when the tuner is not active instead of resetting `listeningOwner` out from under a lead run. Minor: the REQ-015/S6 invariant body mirrors the tuner's REQ-001/S3 one — a shared helper at a later touch.
- T009: hidden-while-leading, onShown's no-op for a lead run and the retry from `cannot-hear` were already in place from T005; the diff added `onEnded`'s lead branch (mirrors the tuner's shape, its own field set) and `releaseWakeLockIfSilent()` on a failed `listening.start()`. `session-hidden-awake.test.ts` and `lead-cannot-hear.test.ts` were created, not extended (neither existed); REQ-009/S1 stays in session-target.test.ts.
