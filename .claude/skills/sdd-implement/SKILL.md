---
type: Skill
name: sdd-implement
description: Controller for executing an approved tasks.md — briefs an implementer subagent per task, verifies independently, runs a per-task two-stage review, loops fixes, keeps the artefacts honest. Use when the user says "implement", "build it", "start working", "carry on", "next task", "resume", or after a task list is approved. Requires an approved tasks.md. Adapted from obra/superpowers subagent-driven-development (MIT).
---

# Implement — the controller

You are the controller, not the hands. Each task is executed by the
`implementer` subagent from a brief file, reviewed by the `task-reviewer`
subagent from a diff package, and only then checked off. Your job is
coordination: build the brief, dispatch, verify, review, loop, commit, record.

**Preserve your own context.** Do not read the whole `tasks.md`, `spec.md` or
`plan.md` per task. `scripts/task-brief.sh` extracts what each task needs.
You read the task's **Status** lines and the Coverage table; the subagents
read the rest.

## Model

Below the top of the ladder: this runs on the session default (Sonnet). First
thing: `./scripts/phase.sh leave` (a no-op if no phase is open), so later turns
are not moved up to Fable for nothing.

## Before starting

1. Confirm `proposal.md`, `plan.md`, `tasks.md` all have
   `sdd_phase: approved`.
   Then `./scripts/fm.py set changes/<change>/tasks.md sdd_phase in-progress`.
2. Read `docs/decisions.md`. Read `docs/engineering.md` §13 for the branch and
   commit conventions.
3. If the user wants isolation, create a worktree for the change
   (`git worktree add ../<repo>-<change> <branch>`) and work there.
4. Find the first task with `**Status:** todo`. If resuming, say the last
   `done` and the next `todo` in one line.

## The loop — per task

1. **Announce** the task ID in one line.
2. **Brief.** `BASE=$(git rev-parse HEAD)`; then
   `./scripts/task-brief.sh changes/<change> T0NN` → brief path. Read the brief's
   task block once (only that) and note anything the brief cannot know: an
   interface decision from an earlier task, an ambiguity you have already
   resolved with the user, the commit message to use, and the report path
   `.sdd/reports/<change>/T0NN.md`. **Never paste exact values into the
   dispatch** — they live in the brief; the dispatch points at it.
3. **Dispatch** the `implementer` (Agent tool, `subagent_type: implementer`)
   with: one line of scene-setting, the brief path ("read this first — it is
   your requirements, with the exact values to use verbatim"), the additions
   from step 2, the report path.
4. **Read the report.** Branch on STATUS. The user is not here; nothing in
   this step asks them anything (`AUTONOMY.md`).
   - `DECISION_NEEDED` → if a recorded decision already answers it
     (`docs/decisions.md`, `intent.md`, an earlier verdict in
     `record/decisions/`), re-dispatch with that answer. Otherwise **decide
     it**: dispatch `decider` (Agent tool, `subagent_type: decider`) with the
     question, the report path, the brief path and a verdict path
     `.sdd/decisions/<change>/<TID>-<n>.md`; then
     `./scripts/record.sh changes/<change> decision <verdict path>`. Decided →
     re-dispatch the implementer with the verdict's "For the implementer"
     section. Escalated → **park** (below).
   - `BLOCKED` → try once to unblock it yourself (install the missing tool,
     fix the command from `AGENTS.md`). If that fails, treat it as a decision:
     the decider judges whether to work around it or park.
   - `DONE_WITH_CONCERNS` → read the concerns *before* review. A concern that
     the spec or plan is wrong goes to the decider like any other decision.
     Otherwise continue and pass it to the reviewer.
   - `DONE` → continue. Copy its `CHOICES MADE` into `notes.md` as one-liners.

   **Park.** Set the task's `**Status:** parked`, add a line under it naming
   the decision (`Parked on D003`). Park every later task whose Interfaces
   *Consumes* something the parked task Produces, transitively. Carry on with
   the next task that is not parked.
5. **Verify independently.** Run the task's Verify line and the `check`
   command yourself. Do not accept the pasted output. Disagreement → treat as
   a failed review with your own finding.
6. **Package.** `./scripts/review-package.sh changes/<change> T0NN $BASE` → diff
   path. (`$BASE` from step 2; never `HEAD~1`.)
7. **Review.** Dispatch `task-reviewer` (Agent tool,
   `subagent_type: task-reviewer`) with the brief path, the report path, the
   review-package path, and — verbatim — the plan's binding constraints for
   this task if any.
8. **Act on the verdicts.**
   - `SPEC: FAIL` or `QUALITY: FAIL` with critical/important findings →
     dispatch the implementer again as a **fixer**: same brief, the findings
     verbatim, "fix only these; re-run the covering tests; report with output".
     Verify (step 5), re-package, re-review. Loop until both PASS. After three
     loops, the findings go to the `decider`: it rules whether the test or the
     code is wrong, whether to accept a documented deviation, or to park. Do
     not stop the run.
   - Minor findings → record in `notes.md`; do not loop.
   - `UNVERIFIED` items → resolve each yourself with cross-task context. If
     one is a real gap, it goes back to the implementer as a spec failure.
9. **Record.** `./scripts/record.sh changes/<change> task T0NN` — copies the
   implementer's report and the reviewer's review into
   `changes/<change>/record/tasks/`, numbered per attempt; run it after
   *every* review, including the ones that failed, so the fix loop is on the
   record. Then set the task's `**Status:** done`. Copy CONCERNS and minor
   findings into `notes.md` as one-liners. Commit the record with the task
   (`git add changes/<change>/record`). If the task is the last in a phase,
   say so in one line.
10. **Commit** if the implementer did not. Message:
    `<type>(<scope>): <outcome> (<REQ-ids>)`.
11. Next task. `[P]` tasks may run as parallel implementers in separate
    worktrees if the user has approved that for this change; review each
    separately; merge in task order.

`Trivial`-class tasks: dispatch the implementer with the model overridden to
the small tier, and skip Stage 2 of review.

## The run does not stop

Per `AUTONOMY.md`, from the approved plan to the end of finish nobody is
waiting on you and you are waiting on nobody. There is no question you put
to the user mid-run. A decision goes to the `decider`; a one-way door parks
its task and everything that depends on it, and the rest is built. A path
outside the plan's structure, a new dependency, a fix loop that will not
close, a spec that turns out slightly wrong: each is a decision, judged and
recorded, not a pause.

The only thing that ends the run early is having nothing left to do: every
task done or parked.

## Never

- Do the implementer's or reviewer's job inline "to save time".
- Paste exact values, test code, or signatures into a dispatch — they belong
  in the brief.
- Mark a task done on the implementer's say-so; on the reviewer's verdict
  without your own verify run; or with any critical/important finding open.
- Let the implementer read the spec tree. If a brief is insufficient, fix the
  task in `tasks.md` (the tasks file is yours after the plan; commit the fix
  with `draft.sh`) or answer in the dispatch.
- Edit `spec.md` to match what was built.
- Skip a task because it looks redundant. Send it to the decider.
- Disable, skip, loosen, or delete a failing test — or accept a report that did.

## Progress

Keep a task list mirroring the current phase so progress is visible without
reading files. Report at phase boundaries, not after every task. Tell the user
immediately, mid-phase, if you hit something that changes what they will get, a
requirement turns out to be wrong, or a risk from the plan has materialised.

## When every task is done or parked

1. **Apply the amendments.** `./scripts/record.sh changes/<change> amendments`
   lists the decided verdicts that change the delta's wording. If any:
   `./scripts/phase.sh enter sdd-specify`, invoke `sdd-continue` (the delta
   is a top-of-ladder artefact and the guard only lets the strong model write
   it), apply each verdict's `## Amendment` exactly to
   `changes/<change>/delta/…`, set its `sdd_applied: true` with `fm.py set`,
   `./scripts/merge_delta.py preview changes/<change>` must still succeed,
   `./scripts/draft.sh changes/<change>/delta`, then
   `./scripts/phase.sh leave`. The spec now says what was built and why.
2. `./scripts/fm.py set changes/<change>/tasks.md sdd_phase complete` (or
   leave it `in-progress` if tasks are parked). Do not declare victory.
3. Hand to `sdd-converge`. The run goes on through converge and finish; a
   change with screens is built, audited against its wireframes, and
   finished like any other, and the visual check goes to the user in the
   run report at the end.
