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

## T003 (2026-09-20)
- PASS/PASS. arcOf, spelledMajorAt/spelledMinorAt land clean; A major's Ab-wedge → G# scaleName traced correctly.
- Minor: two tests share scenario id REQ-001/S1 by design (raw circle vs. derived reading) — brief-directed, not a defect.

## T004 (2026-09-20)
- PASS/PASS. Reviewer hand-recomputed all three scenarios independently — C major/flute (1,2,3,full), G major/flute (1,2,full), F#/Bass-C (full only, correctly no octave run fits) — all confirmed.

## T005 (2026-09-21)
- PASS/PASS. Store v2 + v1 migration; App.tsx touched only mechanically (4 lines, controller-authorized) — rendered behaviour unchanged; 001's selection-persistence scenarios still pass untouched.
- Minor: schema is z.union not z.discriminatedUnion (behaviourally verified equivalent: v2 passes, v1 migrates, junk → null, never throws).
- Minor: brief's test import path was one level shallow; implementer corrected it silently — briefs for tests/ui/scenarios must use ../../../src/.
- Note for T011: App currently maps its old noteNamesVisible state onto staveNamesEnabled as a temporary bridge — T011 replaces it.

## T006 (2026-09-21)
- PASS/PASS. Reviewer verified every circle constant value-for-value against the reference; arc driven by published arcOf; selection keyed by position+ring so the respell follows structurally. c-major and e-minor screenshot pairs match essentially pixel-for-pixel in the circle region.
- For T012: (1) design-shots `gb-flat-spelling` app driver must click the `flat` pill before `G♭ major` — that pair has never truly been compared; (2) route the prototype's Google Fonts requests to the local @fontsource files so pairs compare on equal typography; (3) the ♯/♭ pill's layout literals in CircleOfFifths.tsx should become named constants like the rest of the file.
- Trap for T007–T011: the 001 note-names bridge keeps DEFAULT_NOTE_NAMES_VISIBLE = true, deliberately separate from firstRunDefaults.staveNamesEnabled (false), until the old panel is replaced.
- Controller process correction (user): explicit `model` on every dispatch; visual comparison belongs to the reviewer subagent, not the main session.
