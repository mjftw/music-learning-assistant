---
type: Skill
name: sdd-tasks
description: Break an approved plan into an ordered, dependency-aware task list — one file per task under changes/NNN-slug/tasks/ plus the tasks.md overview — each task citing the requirement IDs it satisfies and how it will be verified. Use after a plan is approved, or when the user says "break this down", "make the task list", "generate tasks", or asks what the steps are for a planned feature.
---

# Tasks

Produce `changes/NNN-slug/tasks/CNNN_TNNN.md`, one file per task from
`templates/task-template.md`, and `changes/NNN-slug/tasks.md`, the short
overview (groups in build order, the coverage table, deferrals). An agent
executes one task file at a time without re-deriving the design; the
controller finds the next one from each file's frontmatter
(`./scripts/task.py <change> next`), never by reading the lot.

Create each file with `./scripts/task.py changes/NNN-slug new "<one
outcome>" --reqs <ids> --group "<group>" [--after T0NN]`, then fill its
body. State is frontmatter: `sdd_requirements` (qualified ids),
`sdd_depends_on` (every task whose Produces this one Consumes — the
controller orders the build by it and parks only along it), `sdd_group`,
`sdd_parallel`. Never set `sdd_phase` by hand.

Task ids are qualified by the change number: `C008_T005` is task 5 of change
008, unique across the repository, usable in commit messages, decisions,
test names and `git log --grep`. Commands accept the short form (`T005`)
and qualify it.

## Model

Below the top of the ladder: this runs on the session default (Sonnet). First
thing: `./scripts/phase.sh leave` (a no-op if no phase is open), so later turns
are not moved up to Fable for nothing.

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
constitution). It cannot read the other task files, the spec, or the plan.
So each task carries everything it needs:

- **Status** line — `todo` initially.
- **Files** — exact paths. `Create:` / `Modify: path:lines` / `Test:`.
- **Interfaces** — `Consumes:` exact signatures from earlier tasks;
  `Produces:` exact signatures this task exposes. Character-for-character.
- **Steps** — 3–8, each 2–5 minutes, checkbox-numbered. TDD-shaped and
  scenario-driven: RED names the scenario ID (`REQ-00N/Sk`) and gives the
  actual test code, through the published interface (`bdd` skill) → run,
  expect *this* failure → GREEN → run, expect pass, suite green → REFACTOR.
- **Verify** — the exact command and the exact expected output. A task
  that builds or alters a screen adds a second line: the
  `design_snapshot.py … live` command and which wireframe state the
  screenshot must match *in structure* (elements, order, states reachable).
  Not taste: the screen is expected to be grey and correct here; taste is the
  refinement loop after all tasks are done.

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
- **Interface consistency** — every `Consumes:` matches a `Produces:` of a
  task named in `sdd_depends_on`, exactly. A Consumes with no dependency
  listed is a missing dependency; a dependency with nothing consumed is
  noise. `./scripts/task.py changes/NNN-slug check` catches dangling ones.
- **Placeholder scan** — `./scripts/task.py changes/NNN-slug check` warns on
  `TBD`, `TODO`, "handle edge cases", "similar to T…" and missing anatomy.
- **Granularity** — no step you could not do in five minutes; no task with
  one step.
- **Scenario coverage** — every scenario ID in the spec appears in some task's
  RED step. `./scripts/check-scenarios.sh changes/NNN-slug` reports gaps once
  tests exist; before that, `./scripts/task.py changes/NNN-slug coverage`
  is the Coverage table — paste it into `tasks.md`.
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

## No gate: self-approve and build

Tasks are the first artefact after the plan, and the plan was the last thing
the user approved (`AUTONOMY.md`). Nobody reviews this file; the
self-review above is the review. So:

1. `./scripts/task.py changes/NNN-slug check` clean, the coverage table
   pasted into `tasks.md` showing every requirement covered. If not, fix the
   tasks; do not hand over a list with gaps.
2. `./scripts/draft.sh changes/NNN-slug/tasks.md changes/NNN-slug/tasks`.
3. `./scripts/approve.sh changes/NNN-slug/tasks.md approved` (the approval is
   the plan's; this records that the tasks follow from it), set the change's
   `docs/roadmap.md` status to `building`, `./scripts/index.sh`, commit
   `docs(tasks): NNN-slug`.
4. Hand straight to `sdd-implement`. Do not report and wait.
