---
type: Task List
title: The circle — tasks
description: 11 tasks across 5 phases — scaffold, theory domain, catalogue and key view, UI, hardening.
resource: /changes/001-the-circle/tasks.md
status: stable
tags: [sdd, tasks, "change:001-the-circle"]
sources:
  - resource: /changes/001-the-circle/plan.md
  - resource: /changes/001-the-circle/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T20:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T18:38:59Z
  - by: human:merlin-webster
    at: 2026-09-19T18:49:04Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_phase: complete
---

# Tasks: The circle

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands.
>
> Steps are 2–5 minutes each. `[P]` after the ID: no dependency on the
> neighbouring `[P]` tasks. Status per task: `todo` · `in-progress` · `done`
> · `blocked`. Requirement and scenario IDs are qualified.

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-001 | T004 (S1), T006 (S2 values), T008 (S2 interaction) | ✅ |
| theory.circle-of-fifths/REQ-002 | T004 (S1), T006 (S2) | ✅ |
| theory.circle-of-fifths/REQ-003 | T006 (S1, S2), T009 (render), T012 (octave-edge), T014 (styling) | ✅ |
| theory.circle-of-fifths/REQ-004 | T003 (S1, S2, S3), T014 (styling) | ✅ |
| theory.circle-of-fifths/REQ-005 | T006 (S1 property), T013 (enumeration) | ✅ |
| theory.circle-of-fifths/REQ-006 | T004 (S1 property) | ✅ |
| theory.circle-of-fifths/REQ-007 | T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-008 | T007 (S1, S2, S3), T011 (S3 sub-case) | ✅ |
| theory.instruments/REQ-001 | T005 (S1), T010 (S2) | ✅ |
| theory.instruments/REQ-002 | T005 (S1) | ✅ |
| theory.instruments/REQ-003 | T005 (S1), T010 (S2) | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T002 | `scaleNotesOf(key: Key): readonly PitchClass[]` | T003, T006 |
| T002 | `pitchPosition(note: Note): number` | T005 (schema refine), T006 |
| T002 | `keyId(key: Key): KeyId` | T004, T007, T008 |
| T003 | `signatureOf(key: Key): Signature` | T004, T006 |
| T003 | `relativeOf(key: Key): Key` | T004, T006 |
| T003 | `newAccidentalOf(key: Key): PitchClass \| null` | T006 |
| T004 | `circleOfFifths(): readonly CirclePosition[]` | T006, T007, T008 |
| T005 | `builtInCatalogue(): Catalogue` | T006, T007 (tests and wiring) |
| T005 | `loadCatalogue(files: ReadonlyMap<string, unknown>): Catalogue` | T010 (test) |
| T006 | `keyView(key: Key, variant: Variant): KeyView` | T008 (labels), T009 |
| T007 | `localStorageSelectionStore(storage: Storage): SelectionStore` | T008, T009, T010 (tests) |
| T007 | `App(props: { catalogue: Catalogue; selectionStore: SelectionStore }): JSX.Element` | T008, T009, T010 |

## Deferred

- Phone-layout fixes beyond an observation note — the product brief marks
  legibility a discovery item; this change records, the next one acts.
- Circle wedge visual polish (colour by key distance etc.) — not named by any
  requirement; would be scope creep here.

## Groups, in build order

- Phase 1 — Foundations
  _Nothing user-visible. Scaffolding, types, test harness._
- Phase 2 — The circle (theory domain)
  _Demonstrable: `circleOfFifths()` answers every circle question in the spec._
- Phase 3 — Instruments and the key view
  _Demonstrable: `keyView(G major, flute)` returns the acceptance values._
- Phase 4 — The UI
  _Demonstrable: the acceptance walk-through in a browser._
- Phase 5 — Hardening
- Phase 6 — Convergence findings (2026-09-19 audit)

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
