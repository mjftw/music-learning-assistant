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
4. **Read the report.** Branch on STATUS:
   - `NEEDS_CONTEXT` / `BLOCKED` → answer it if `docs/decisions.md`,
     `intent.md` or the plan answers it (read only the relevant section);
     otherwise **stop and ask the user** (Article I). Re-dispatch with the
     answer added to the dispatch.
   - `DONE_WITH_CONCERNS` → read the concerns *before* review. If a concern is
     a spec/plan problem, stop and raise it. Otherwise continue and pass the
     concern to the reviewer.
   - `DONE` → continue.
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
     loops, stop and bring the user the findings.
   - Minor findings → record in `notes.md`; do not loop.
   - `UNVERIFIED` items → resolve each yourself with cross-task context. If
     one is a real gap, it goes back to the implementer as a spec failure.
9. **Record.** Set the task's `**Status:** done`. Copy CONCERNS and minor
   findings into `notes.md` as one-liners. If the task is the last in a phase,
   say so in one line.
10. **Commit** if the implementer did not. Message:
    `<type>(<scope>): <outcome> (<REQ-ids>)`.
11. Next task. `[P]` tasks may run as parallel implementers in separate
    worktrees if the user has approved that for this change; review each
    separately; merge in task order.

`Trivial`-class tasks: dispatch the implementer with the model overridden to
the small tier, and skip Stage 2 of review.

## Stop and ask the user when

- Any NEEDS_CONTEXT or BLOCKED you cannot answer from recorded decisions.
- A concern or finding says the spec, plan, or a requirement is wrong.
  Article IX: the spec is amended with the user, never patched around.
- A task would touch a path outside the plan's structure.
- The fix loop hits three rounds.
- A task is about to add a dependency.

## Never

- Do the implementer's or reviewer's job inline "to save time".
- Paste exact values, test code, or signatures into a dispatch — they belong
  in the brief.
- Mark a task done on the implementer's say-so; on the reviewer's verdict
  without your own verify run; or with any critical/important finding open.
- Let the implementer read the spec tree. If a brief is insufficient, fix the
  task in `tasks.md` (propose the edit; it is an approved artefact) or answer
  in the dispatch.
- Edit `spec.md` to match what was built.
- Skip a task because it looks redundant. Say so; ask.
- Disable, skip, loosen, or delete a failing test — or accept a report that did.

## Progress

Keep a task list mirroring the current phase so progress is visible without
reading files. Report at phase boundaries, not after every task. Tell the user
immediately, mid-phase, if you hit something that changes what they will get, a
requirement turns out to be wrong, or a risk from the plan has materialised.

## When every task is done

`./scripts/fm.py set changes/<change>/tasks.md sdd_phase complete`. Do not declare
victory. Hand to `sdd-converge` — the change-level audit is by a reviewer that
saw none of this.
