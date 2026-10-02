---
type: Task List
title: Circle redesign — tasks
description: 13 tasks across 6 phases — foundations, theory (arc/span), store, UI rebuild, design-review loop, hardening.
resource: /changes/002-circle-redesign/tasks.md
status: stable
tags: [sdd, tasks, "change:002-circle-redesign"]
sources:
  - resource: /changes/002-circle-redesign/plan.md
  - resource: /changes/002-circle-redesign/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T20:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:49:04Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_phase: complete
---

# Tasks: Circle redesign

> Each task is executed by an implementer that has **only its brief**. Every
> task is self-contained: exact files, exact interfaces, exact values, exact
> commands. **No placeholders.** Steps are 2–5 minutes each; a task is one
> sitting and one commit. `[P]` = independent of neighbouring `[P]` tasks.
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> The binding visual reference for every UI task is
> `changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html` (its
> constants, geometry and palette — copy values, never re-derive by eye).
> Theory-level tests import only `src/theory/published`; UI tests render
> `src/ui/App` with Testing Library (no jest-dom; `afterEach(cleanup)`;
> import depth `../../../src/...`).

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-001 (M) | T003 (S1), T006 (S2) | ✅ |
| theory.circle-of-fifths/REQ-002 (M) | T006 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-003 (M) | T007 (S3), T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-004 (M) | T007 (S1, S2, S3) | ✅ |
| theory.circle-of-fifths/REQ-007 (M) | T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-008 (M) | T011 (S1–S4); store mechanics T005 | ✅ |
| theory.circle-of-fifths/REQ-009 (A) | T003 (S1, S2), T008 (S3), T015 (S4) | ✅ |
| theory.circle-of-fifths/REQ-010 (A) | T003 (S1 arc), T007 (S1 names), T008 (S2), T015 (S3) | ✅ |
| theory.circle-of-fifths/REQ-011 (A) | T004 (S1, S2, S3), T009 (pill rendering) | ✅ |
| theory.circle-of-fifths/REQ-005, REQ-006 (untouched) | guard: existing tests must stay green throughout; T004 asserts span ⊆ range | ✅ |
| theory.instruments (untouched) | T010 re-expresses S2 scenarios against the sheet | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `paper`, `fonts` (`src/ui/theme.ts`) | T006–T011 |
| T002 | `pnpm design:shots [--states …]` | T006–T012 verify steps |
| T003 | `arcOf(key: Key, preference: SpellingPreference): readonly ArcPosition[]` | T006, T007 |
| T003 | `spelledMajorAt/spelledMinorAt(position, preference): Key` | T006 |
| T004 | `spanChoicesOf(key, variant): readonly SpanChoice[]` · `spanNotesOf(key, variant, span): readonly KeyViewNote[]` | T009 |
| T005 | `StoredSelection` (v2), `firstRunDefaults`, `localStorageSelectionStore` | T006 (defaults), T008 (toggles), T011 (scenarios) |
| T007 | `KeyPanel`, `NamesView` | T009 (mounts StaveView inside KeyPanel) |
| T008 | `Header`, `SettingsDrawer` | T009 (stave-names setting), T010 (pill opens sheet) |

## Deferred

- Wide/desktop layout — decision 2026-09-20; a later change.
- ~~Removing the dashed footer placeholder with change 003~~ — superseded: the user removed it in this change (T014, decision 2026-09-21).
- The vendored design's other studies (1a, 1b, colour studies) — reference
  history only; 1c is the binding design.

## Groups, in build order

- Phase 1 — Foundations
- Phase 2 — Theory: the arc and the span
- Phase 3 — Stored state v2
- Phase 4 — The UI, component by component
- Phase 5 — Design review
- Phase 6 — Hardening
- Phase 7 — Convergence follow-ups (audit 2026-09-21: 0 critical, 4 warnings)
- Phase 8 — Acceptance findings

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
