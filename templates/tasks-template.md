---
type: Task List
title: <Feature name> — tasks
description: <one sentence — N tasks across M phases>
resource: /changes/NNN-slug/tasks.md
status: draft
tags: [sdd, tasks, "change:NNN-slug"]
sources:
  - resource: /changes/NNN-slug/plan.md
  - resource: /changes/NNN-slug/proposal.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_id: NNN-slug
sdd_context: <context>
sdd_phase: draft          # draft | approved | in-progress | complete
---

# Tasks: <Feature name>

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

## Phase 1 — Foundations

_Nothing user-visible. Scaffolding, types, schema, test harness._

### T001 · — · <one outcome>

**Status:** todo

**Files**
- Create: `path/to/new.py`
- Modify: `path/to/existing.py:40-62`
- Test: `tests/path/test_new.py`

**Interfaces**
- Consumes: <signatures from earlier tasks, exact>
- Produces: `def name(arg: Type) -> Return` — <one line on semantics>

**Steps**
- [ ] 1. RED — scenario <context>.<capability>/REQ-00X/S1: write the failing test, named after the scenario, through the published interface (the actual test code):
  ```
  <test code>
  ```
- [ ] 2. Run `<exact command>` — expect FAIL: `<exact expected failure>`
- [ ] 3. GREEN — <the smallest implementation, described concretely or as code>
- [ ] 4. Run `<same command>` — expect PASS. Run `<check command>` — green.
- [ ] 5. REFACTOR — <specific cleanup, or "none">

**Verify** — `<exact command>` → `<exact expected output or observation>`

## Phase 2 — <first vertical slice>

_Ends with something demonstrable against a requirement._

### T010 · <context>.<capability>/REQ-001 · <one outcome>

**Status:** todo

**Files**
-

**Interfaces**
-

**Steps**
- [ ] 1.

**Verify** —

## Phase N — Hardening

### T090 · — · Every row of spec §Edge cases has a test

**Status:** todo

**Files**
- Test: `<paths>`

**Steps**
- [ ] 1. For each row: RED → GREEN, one test per row, named after the row.

**Verify** — `<check command>` green; test names list every edge-case row.

### T091 · — · `AGENTS.md` Commands / Conventions / Architecture are real

**Status:** todo

**Files**
- Modify: `AGENTS.md`

**Steps**
- [ ] 1. Replace every `FILL THIS IN`; paste healthy `check` output.

**Verify** — `grep -c 'FILL THIS IN' AGENTS.md` → `0`

## Coverage

> Every `REQ-` in the spec appears at least once. Every task cites a
> requirement or sits in Foundations / Hardening.

| Requirement | Tasks | Covered |
|---|---|---|
| REQ-001 | T010 | ✅ |

## Interface consistency

> Signatures a later task *consumes* match what an earlier task *produces*,
> character for character. List each pair.

| Produced by | Signature | Consumed by |
|---|---|---|

## Deferred

- <what> — <why not now>
