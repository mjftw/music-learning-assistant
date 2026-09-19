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
