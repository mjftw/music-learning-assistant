---
type: Skill
name: sdd-implement
description: Controller for executing an approved task list (tasks/CNNN_TNNN.md files) — briefs an implementer subagent per task, verifies independently, runs a per-task two-stage review, loops fixes, keeps the artefacts honest. Use when the user says "implement", "build it", "start working", "carry on", "next task", "resume", or after a task list is approved. Requires an approved tasks.md. Adapted from obra/superpowers subagent-driven-development (MIT).
---

# Implement — the controller

You are the controller, not the hands. Each task is executed by the
`implementer` subagent from a brief file, reviewed by the `task-reviewer`
subagent from a diff package, and only then checked off. Your job is
coordination: build the brief, dispatch, verify, review, loop, commit, record.

**Preserve your own context.** Do not read the task files, `spec.md` or
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
   commit conventions. Note the check command from `AGENTS.md › Commands`;
   if it is not on a `# check…` line there, pass it to `review-package.sh`
   with `--check`.
3. If the user wants isolation, create a worktree for the change
   (`git worktree add ../<repo>-<change> <branch>`) and work there.
   `./scripts/fm.py get changes/<change>/plan.md sdd_parallel` says whether
   the user authorised building independent tasks in parallel at the plan
   gate (step 10).
4. `./scripts/task.py changes/<change> next` names the task: the first
   `todo` whose `sdd_depends_on` are all `done`. "none" means nothing is
   buildable (everything done or parked). If resuming, say the last `done`
   and the next in one line; `tasks/index.md` has both. A change that still
   has a single-file `tasks.md` with `### T0NN` blocks is migrated first:
   `./scripts/task.py changes/<change> split`, commit.

## The loop — per task

1. **Announce** the task ID in one line.
2. **Brief.** `./scripts/task.py changes/<change> status T0NN in-progress`
   (counts the attempt). `BASE=$(git rev-parse HEAD)`; then
   `./scripts/task-brief.sh changes/<change> T0NN` → brief path. Read the brief's
   task block once (only that) and note anything the brief cannot know: an
   interface decision from an earlier task, an ambiguity you have already
   resolved with the user, the commit message to use, and the report path
   `.sdd/reports/<change>/CNNN_T0NN.md` (the qualified id, the one the brief
   and the package carry and `record.sh` looks for). **Never paste exact values into the
   dispatch** — they live in the brief; the dispatch points at it.
3. **Dispatch** the `implementer` (Agent tool, `subagent_type: implementer`)
   with: one line of scene-setting, the brief path ("read this first — it is
   your requirements, with the exact values to use verbatim"), the additions
   from step 2, the report path.
4. **Read the report.** The implementer returns only its STATUS, COMMIT,
   CONCERNS, CHOICES MADE and any QUESTION/OPTIONS lines; the report file
   has the rest. Read the file only when a line you need is not in what came
   back (`grep -A` the section), never in full. Branch on STATUS. The user is not here; nothing in
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

   **Park, but only what is blocked.** The goal is to get as far as
   possible without the answer. Follow the escalated verdict's
   `## Still buildable`:
   - **Split**: if it names steps that do not depend on the escalation,
     `./scripts/task.py changes/<change> new "<outcome>" --reqs … --group …
     --after <the same dependencies>`, move those steps into the new file in
     the full anatomy, and cut them from the original. The original keeps
     only the blocked steps.
   - **Park**: `./scripts/task.py changes/<change> park T0NN D003` parks the
     task and everything that depends on it through `sdd_depends_on`. Then,
     for each task the verdict lists as **Unaffected** that the park caught,
     `./scripts/task.py changes/<change> status T0NN todo` and add a line
     `Checked against D003: unaffected` to its body; for each it lists as
     **Blocked** that the park missed, `park` it too.
   Then carry on with the next task that is not parked. If a later task
   turns out to need the answer after all, that is a new `DECISION_NEEDED`
   on that task, and the decider parks it then.
   Only when every remaining task is `parked` does implementation end; the
   run still goes on to amendments, converge and finish for what was built.
5. **Package and verify.** `./scripts/review-package.sh changes/<change>
   T0NN $BASE` → package path (`$BASE` from step 2; never `HEAD~1`). The
   script runs the task's Verify line and the `check` command itself and
   records their output and exit status under `## Commands`: that is the
   independent verification, so do not run them again and do not accept the
   implementer's paste. Read the two `exit status` lines (`grep 'exit
   status' <package>`). A non-zero status, or a Verify or check command the
   package could not find, is a failed review with your own finding: supply
   the command (`--check`, or fix the task's Verify line in its task file
   with `draft.sh`) and re-package.
6. **Review.** Dispatch `task-reviewer` (Agent tool,
   `subagent_type: task-reviewer`) with the brief path, the report path, the
   review-package path, and — verbatim — the plan's binding constraints for
   this task if any.
7. **Act on the verdicts.**
   - `SPEC: FAIL` or `QUALITY: FAIL` with critical/important findings →
     record first (step 8, so the verdict is on the record), then dispatch
     the implementer again as a **fixer**: same brief, the findings
     verbatim, "fix only these; re-run the covering tests; report with output".
     Re-package with `--incremental` (the package then carries the previous
     verdict and only the diff since it) and re-review. Loop until both PASS. After three
     loops, the findings go to the `decider`: it rules whether the test or the
     code is wrong, whether to accept a documented deviation, or to park. Do
     not stop the run.
   - Minor findings → record in `notes.md`; do not loop.
   - `UNVERIFIED` items → resolve each yourself with cross-task context. If
     one is a real gap, it goes back to the implementer as a spec failure.
8. **Record.** `./scripts/record.sh changes/<change> task T0NN` — copies the
   implementer's report and the reviewer's review into
   `changes/<change>/record/tasks/`, numbered per attempt; run it after
   *every* review, including the ones that failed, so the fix loop is on the
   record. Then `./scripts/task.py changes/<change> status T0NN done` and
   `./scripts/index.sh`. Copy CONCERNS and minor
   findings into `notes.md` as one-liners. Commit the record with the task
   (`git add changes/<change>/record`). If the task is the last in a phase,
   say so in one line.
9. **Commit** if the implementer did not. Message:
    `<type>(<scope>): <outcome> (<REQ-ids>)`.
10. Next task. When `plan.md` has `sdd_parallel: yes` (the user said so at
    the plan gate) and the task `task.py next` names has `sdd_parallel:
    true`, take every other `todo` task with `sdd_parallel: true` whose
    `sdd_depends_on` are all `done` as well, and dispatch them as parallel
    implementers, one worktree each (`git worktree add
    .sdd/worktrees/<change>-T0NN <branch>`), in one Agent call. Review each
    separately, in task order, merging each task's branch into the change
    branch before packaging the next so every review sees the code it
    builds on. A merge conflict between two of them means they were not
    independent: resolve it, note it in `notes.md`, and run the rest of
    that batch serially. Without `sdd_parallel: yes` on the plan, serial.

A task whose frontmatter says `sdd_class: trivial` (the tasks skill marks
mechanical work: a rename, deleting a REMOVED requirement's tests, a
lint or format chore) is dispatched with the implementer's model overridden
to the small tier (`model: haiku` in the Agent call), and the reviewer is
told to skip Stage 2. A task with no `sdd_class` is `standard`.

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
  task file under `tasks/` (the task files are yours after the plan; commit
  the fix with `draft.sh`) or answer in the dispatch.
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
