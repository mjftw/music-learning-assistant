---
type: Task List
title: scale-selection-acceptance-fixes — tasks
description: 3 tasks — stave keys, names-view descent, converge
resource: /changes/006-scale-selection-acceptance-fixes/tasks.md
status: stable
tags: [sdd, tasks, "change:006-scale-selection-acceptance-fixes"]
sources:
  - resource: /changes/006-scale-selection-acceptance-fixes/plan.md
  - resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
generated:
  by: claude-code/unknown
  at: 2026-09-24T07:52:50Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:56:34Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: practice
sdd_phase: complete
---

# Tasks: scale-selection-acceptance-fixes

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

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-012 (MODIFIED) — S4 T002, T005; S1–S3, S5 existing tests kept | T002, T005 | ✅ |
| theory.circle-of-fifths/REQ-003 (MODIFIED) — S7 T001, T004, T007; S1–S6 existing tests kept | T001, T004, T007 | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T002 | `NamesView` prop `direction: Direction` | App.tsx (T002) |

## Deferred

- Converge round 2 W1 — the theory delta's REQ-003/S7 was amended in place after approval (the key change); accepted by name (docs/decisions.md 2026-09-24), the user re-verifies the delta at acceptance.
- Round-2 infos: no traversal-change transition test (variant via REQ-003/S2, key and scale via S7); a descent column carries no signature mark (per the approved text — user's eye at acceptance); `columnFor` computes an unused mark for descent columns.

## Groups, in build order

- Phase 1 — The fixes
  Shared conventions: tests import only from `src/theory/published`, `src/practice/published` or `src/ui/*`; test names begin with the qualified scenario ID; `pnpm vitest run path/to/file` runs one file; `pnpm check` (with `export PATH="$HOME/.cargo/bin:$PATH"`) is the gate.
- Phase 2 — Converge round 1 (2026-09-24, `.sdd/reports/006-scale-selection-acceptance-fixes/converge.md`)
- Phase 3 — Converge round 2

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
