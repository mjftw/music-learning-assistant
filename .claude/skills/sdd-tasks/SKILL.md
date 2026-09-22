---
type: Skill
name: sdd-tasks
description: Break an approved plan into an ordered, dependency-aware task list in changes/NNN-slug/tasks.md, each task citing the requirement IDs it satisfies and how it will be verified. Use after a plan is approved, or when the user says "break this down", "make the task list", "generate tasks", or asks what the steps are for a planned feature.
---

# Tasks

Produce `changes/NNN-slug/tasks.md`: an ordered checklist an agent can execute one
item at a time without re-deriving the design.

## Before writing

1. Read the approved `proposal.md`, its deltas, and `plan.md`. The proposal
   and plan must have `sdd_phase: approved`.
2. Read `templates/tasks-template.md`.
3. Run `./scripts/merge_delta.py preview changes/NNN-slug`. Tasks cite
   requirements by qualified ID (`<context>.<capability>/REQ-NNN`) and RED
   steps cite qualified scenario IDs; the brief pulls each from the target
   state.
4. Read the plan's requirement → design mapping. That table is the input to this
   one; if a requirement is missing there, stop and fix the plan.

## Ordering

Foundations before what depends on them: **schema → models → services →
endpoints → UI → hardening**. Group by vertical slice, not by layer, so each
phase after the first ends with something demonstrable against a requirement.

Mark independent tasks `[P]` — no dependency on each other, safe to parallelise.
Be conservative: a wrongly parallelised pair costs more than a serial run.

## Task anatomy

Each task will be executed by an implementer that sees **only its brief**
(`scripts/task-brief.sh` builds it: the task block, the cited requirements,
the plan sections it names, `docs/engineering.md`, the commands, the
constitution). It cannot read the rest of `tasks.md`, the spec, or the plan.
So each task carries everything it needs:

- **Status** line — `todo` initially.
- **Files** — exact paths. `Create:` / `Modify: path:lines` / `Test:`.
- **Interfaces** — `Consumes:` exact signatures from earlier tasks;
  `Produces:` exact signatures this task exposes. Character-for-character.
- **Steps** — 3–8, each 2–5 minutes, checkbox-numbered. TDD-shaped and
  scenario-driven: RED names the scenario ID (`REQ-00N/Sk`) and gives the
  actual test code, through the published interface (`bdd` skill) → run,
  expect *this* failure → GREEN → run, expect pass, suite green → REFACTOR.
- **Verify** — the exact command and the exact expected output.

**No placeholders.** Automatic failures: "add error handling", "handle edge
cases", "similar to T011", `TBD`, `TODO`, a test described in prose, a value
left as `<...>`. Use the actual `429`, the actual field name from the plan's
data model, the actual glossary term.

Sizing: one task is one sitting and one commit. If Files lists more than ~5
paths, split. If ten tasks each touch one line of one file, merge.

## Coverage check

Fill the coverage table. **Every ADDED and MODIFIED requirement in the deltas
appears at least once.** Every REMOVED requirement has a task that deletes its
tests and any code only it needed, citing the qualified ID.
Every task either cites a requirement or sits in Foundations/Hardening. If a
requirement has no task, the list is incomplete — do not present it. If a task
has no requirement and is not scaffolding, it is scope creep — delete it.

Always include the Hardening phase: edge cases from the spec's table, lint,
typecheck, format, `sdd-converge`, and filling `AGENTS.md` Commands /
Conventions / Architecture.

## Self-review before the gate

Run these over the whole file and fix what fails before presenting:

- **Spec coverage** — every `REQ-` appears in the Coverage table with a task.
- **Interface consistency** — every `Consumes:` matches a `Produces:` above
  it exactly. Fill the Interface consistency table.
- **Placeholder scan** —
  `grep -nE 'TBD|TODO|<[a-z ]+>|handle .* cases|error handling|similar to|like T[0-9]+' changes/NNN-slug/tasks.md`
  returns nothing outside the template's own guidance block.
- **Granularity** — no step you could not do in five minutes; no task with
  one step.
- **Scenario coverage** — every scenario ID in the spec appears in some task's
  RED step. `./scripts/check-scenarios.sh changes/NNN-slug` reports gaps once
  tests exist; before that, grep the spec's IDs against `tasks.md`.
- **Preference conformance** — steps follow `docs/engineering.md` (types,
  error style, test style). A departure is a plan open question, not a task.

## The discipline

- Do not design in the task list. If you find yourself making a choice here, it
  belongs in the plan — go back.
- Do not write "refactor as needed", "polish", "clean up", or "handle errors".
  Name the behaviour and its verification.
- Do not bundle the happy path and its failure case into one task.
- Put deliberately-deferred work under `## Deferred` with a reason, so it does
  not read as an oversight in three months.

## Gate

Write the file, then report in at most five lines:

- Task count, and phase breakdown
- The coverage table result — every requirement covered, or which are not
- Placeholder scan result (must be clean)
- Which tasks are riskiest or most likely to reveal a spec problem
- Anything deferred
- Open questions

Then `AskUserQuestion`: *Approve and start implementing*, *Approve, stop here*,
*Revise*, *Re-order*.

On approval: `./scripts/approve.sh changes/NNN-slug/tasks.md approved`, set the
slice's `docs/roadmap.md` status to `building`, `./scripts/index.sh`, commit
`docs(tasks): NNN-slug`, and hand to `sdd-implement` only if the user chose to
start.
