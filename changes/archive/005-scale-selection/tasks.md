---
type: Task List
title: scale-selection — tasks
description: 23 tasks across 6 phases — theory catalogue and generalised run-fitting, practice Scale choice, UI sheet/views/store v4, hardening, converge round 1 fixes
resource: /changes/005-scale-selection/tasks.md
status: stable
tags: [sdd, tasks, "change:005-scale-selection"]
sources:
  - resource: /changes/005-scale-selection/plan.md
  - resource: /changes/005-scale-selection/proposal.md
generated:
  by: claude-fable-5-1
  at: 2026-09-24T00:10:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T23:22:44Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_phase: complete
---

# Tasks: scale-selection

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.** "Add error handling",
> "handle edge cases", "like T011 but for Y", `TBD`, and a test described in
> prose instead of written out are all failures.
>
> Steps are 2–5 minutes each. A task is 3–8 steps. Larger → split.
> `[P]` after the ID: no dependency on the neighbouring `[P]` tasks.
>
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> Every RED step names the scenario ID it proves. A task with no scenario is
> Foundations or Hardening.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.

Shared conventions for every task below: tests import only from
`src/theory/published`, `src/practice/published` or `src/ui/*`; test names
begin with the qualified scenario ID; `pnpm vitest run path/to/file.test.ts`
runs one file; `pnpm check` is the full gate and must be green before a
task is done. The vendored design is
`changes/005-scale-selection/design/hear-the-scale.dc.html` — every UI
constant is copied from it and named, never re-derived by eye.

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-012 (ADDED) — S1 T012 · S2 T011 · S3 T008, T014 · S4 T013 · S5 T002 | T002, T008, T011, T012, T013, T014 | ✅ |
| practice.session/REQ-001 (MODIFIED) — S1–S4 existing tests kept · S5 T014 (+T008 session-level) | T008, T014 | ✅ |
| practice.session/REQ-007 (MODIFIED) — S1–S3 existing · S4 T009 | T009 | ✅ |
| practice.session/REQ-011 (MODIFIED) — S1 T010, T012 · S2 T012 · S3 T010 · S4 T010, T012 | T010, T012 | ✅ |
| theory.circle-of-fifths/REQ-003 (MODIFIED) — S1, S2, S4 existing · S3 T002, T007, T013, T015 · S5 T003, T022 · S6 T005, T007, T015 | T001, T002, T003, T005, T007, T013, T015, T022 | ✅ |
| theory.circle-of-fifths/REQ-012 (MODIFIED) — S1–S4 existing · S5 T006 · S6 T005 · S7 T004 · converge C1/C2 T020 | T004, T005, T006, T020 | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `type Accidental = "doubleFlat" \| "flat" \| "natural" \| "sharp" \| "doubleSharp"` | T002, T007, T015 |
| T002 | `spelledScaleOf(key: Key, scale: Scale): SpelledScale` | T003, T004, T006, T008, T011, T013 |
| T002 | `scaleById(id: ScaleId): Scale` / `scalesForMode(mode: Mode): readonly Scale[]` / `SCALES` | T003–T015 |
| T003 | `keyView(key: Key, variant: Variant, scale: Scale): KeyView`; `KeyViewNote.degree/degreeLabel/altered` | T004, T012 |
| T003 | `rangedNotesOf(scaleNotes: readonly ScaleNote[], tonic: PitchClass, variant: Variant): readonly KeyViewNote[]` (domain-internal) | T004, T005 |
| T004 | `traversalOf(key: Key, variant: Variant, scale: Scale, traversal: Traversal): TraversalNotes` | T005, T006, T007, T008, T015 |
| T004 | `fittingOctaveCounts(key, variant, scale)` / `effectiveOctavesOf(key, variant, scale, octaves)` | T006, T008 |
| T007 | `inlineAccidentalsOf(signature: Signature, run: readonly KeyViewNote[]): readonly (Accidental \| null)[]` | T015 |
| T008 | `createSession(context, traversal, scaleChoice: ScaleChoice, settings, deps)`; `Session.setScaleChoice(choice: ScaleChoice)`; `SessionSnapshot.scale/spelledScale/scaleChoice/effectiveShape`; `defaultScaleChoice`; `chosenScaleIdFor` | T009, T012, T017 |
| T008 | `summaryLineOf(traversal, effectiveOctaves, effectiveShape: Shape, settings)` | T012 (via snapshot), existing call sites |
| T010 | `StoredSelection.schemaVersion: 4`, `.scale: { major: ScaleId; minor: ScaleId }`, `firstRunDefaults.scale` | T012, T017 |
| T011 | `ScaleSheet({ open, key_, chosenId, onPick, onClose })`, `ScaleRow({ formulaLine, onOpen })` | T012 |
| T012 | `keyLabel(key: Key, scale: Scale): string`, `keyNameFontSizeOf(label: string): number` | — |
| T013 | `NamesView` prop `scale: Scale` | T012 |
| T014 | `TraversalSheet` props `effectiveShape: Shape`, `arpeggioOffered: boolean` | T012 |

## Deferred

- Converge W2 — `pnpm test:timing` passed 1 of 3 runs on the laptop (200 bpm
  "vs audible" 29.33 / 30.67 / 30.67 ms vs ±30 ms); accepted by name
  (docs/decisions.md 2026-09-24) as the headroom 003 already accepted — the
  phone measurement at acceptance decides; re-measured at finish.
- Converge W3 — the practice.session delta's REQ-012/S5 chromatic rows were
  amended in place after approval (per-ring chromatic, commit e6255aa);
  accepted by name (docs/decisions.md 2026-09-24), the user re-verifies the
  delta at acceptance.
- Converge round-2 infos I1–I14 recorded in notes.md; I3 (shared TickMark)
  and I4 (heading aria-label vs visible text) are proposed engineering
  refinements, not applied.

- Beaming or a different glyph for the 12-column chromatic names view on a
  phone — the design sets 15px and stops there; judge at acceptance.
- Widening `NOTE_STRING_PATTERN` (instrument data files) to double
  accidentals — no variant needs one; a data-file change when one does.

## Groups, in build order

- Phase 1 — Foundations (theory)
  _The catalogue, the widened accidental, the generalised run-fitting. Nothing user-visible until Phase 3._
- Phase 2 — The session knows the chosen scale
- Phase 3 — The UI
- Phase 4 — Hardening
- Phase 5 — Converge round 1 (2026-09-24, report `.sdd/reports/005-scale-selection/converge.md`)

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
