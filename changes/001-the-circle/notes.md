---
type: Implementation Notes
title: 001-the-circle — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/001-the-circle/notes.md
status: draft
tags: [sdd, notes, "change:001-the-circle"]
sdd_id: 001-the-circle
---

# Notes — 001-the-circle

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## T001 (2026-09-19)
- Toolchain resolved newer than the plan's approximations: Vite 8.3.0, Vitest 5.0.1 (plan said 7.x / 3.x). Green; note for converge — plan versions are stale, reasoning unchanged.
- Stray scaffold files (root index.html, public/*, stale package.json pins) had been swept into docs commit c9acb96; removed by T001 as layout violations.
- .prettierignore excludes the docs tree (52 pre-existing files would fail prettier --check otherwise) — necessary, scoped.
- Reviewer: SPEC PASS / QUALITY PASS, 3 minor findings, none open.

## T002 (2026-09-19)
- pitchPosition uses the MIDI convention (C4=60): the task prose said "C0 = 0" but the test's 66/96 values are authoritative; code comments state the actual convention.
- Review round 1: QUALITY FAIL on duplicated lookup tables; fixed by exporting from notes.ts. Round 2: SPEC PASS / QUALITY PASS.

## T003 (2026-09-19)
- SPEC PASS / QUALITY PASS first round. Reviewer probe confirmed enharmonic relatives spell correctly (G♭→E♭ minor, C♯→A♯ minor) with no special-casing.
- Minor: straight vs curly apostrophes in test names; cosmetic.

## T004 (2026-09-19)
- Round 1: QUALITY FAIL — accidentalForTarget duplicated between keys.ts and circle.ts; extracted to notes.ts (internal export). Round 2: PASS/PASS.
- Recurring bug class for briefs: implementers duplicate a helper rather than touch a file outside the Files list. Future briefs should authorize extractions within the context up front.
- Reviewer hand-verified the 12 spellings, ring alignment, and that the adjacency property is non-vacuous at the enharmonic positions.

## T005 (2026-09-19)
- PASS/PASS round 1. parseNoteString extracted to notes.ts (pre-authorized), genuine single definition.
- Minor open: NOTE_STRING_PATTERN regex literal duplicated between notes.ts and catalogue.ts Zod validator — fold into T011 hardening.

## T006 (2026-09-19)
- PASS/PASS round 1. Reviewer re-derived the acceptance arithmetic by hand (G major/flute 22 notes, octave shift, E minor from C4) — all match.
- fast-check resolved at v3 (plan said 4.x); same API for our calls. Note for converge alongside the other version drifts.

## T007 (2026-09-19)
- PASS/PASS round 1. Two disclosed test deviations (cleanup registration, aria-checked assertion) — intent preserved, jest-dom absent by design.
- Minor: App.tsx render-time ?? fallback duplicates init-time validation; unreachable. Candidate cleanup in T011.

## T008 (2026-09-19)
- PASS/PASS round 1. Reviewer probe: 15 major + 15 minor accessible buttons (12 positions + 3 enharmonic doublings per ring).
- key-label helper extracted to src/ui/key-label.ts (pre-authorized).
- Minor (pre-existing from T007): initialSelection computes variant/key only for existence checks. Candidate cleanup in T011.
