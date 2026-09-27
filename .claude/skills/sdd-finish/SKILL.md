---
type: Skill
name: sdd-finish
description: Close out a converged change — merge its deltas into the living specs, re-approve any affected living docs, archive the change, choose merge / pull request / keep, update the roadmap. Use after sdd-converge reports Converged, or when the user says "finish", "ship it", "open the PR", "merge this", "we're done with this change". Adapted from obra/superpowers finishing-a-development-branch (MIT).
---

# Finish

Runs only after `sdd-converge` has reported **Converged** for the change. If it
has not, stop and say so.

## Model

Below the top of the ladder: this runs on the session default (Sonnet). First
thing: `./scripts/phase.sh leave` (a no-op if no phase is open), so later turns
are not moved up to Fable for nothing.

## 1. Confirm the state

- `git status` clean; every task `**Status:** done`; `tasks.md`
  `sdd_phase: complete`; the convergence report at
  `.sdd/reports/<change>/converge.md`.
- `check` command green, run now, output shown.
- `./scripts/check-scenarios.sh --change changes/<id>` clean: every ADDED and
  MODIFIED scenario has a test; nothing cites a REMOVED one.
- `./scripts/check-specs.sh` clean for this change.
- If the change has screens: `design/rounds.md` `sdd_phase: exited` and
  `./scripts/check-design.sh --change changes/<id>` clean (a reference
  screenshot per Interface row).

## 2. Merge the deltas into the living specs

This is the moment the current truth changes. It is the user's decision, made
when they approved the proposal; you are executing it.

1. `mkdir -p .sdd && touch .sdd/unlock-specs`
2. `./scripts/merge_delta.py apply changes/<id>` — for each capability this
   creates or updates `specs/<context>/<capability>.md`, bumps its version,
   appends the change to its sources and History.
3. For each capability touched:
   `./scripts/approve.sh specs/<context>/<capability>.md current` — the
   living spec now carries the user's verification for this change.
4. `rm -f .sdd/unlock-specs`
5. `./scripts/check-scenarios.sh` (no arguments) — the standing invariant over
   the living specs must be clean. If it is not, stop: something the reviewer
   missed is now in the truth. Report it before going on.

## 3. Apply the Affects

The documents named here are top-of-ladder artefacts, and the guard refuses
edits to them from the session default. So: `./scripts/phase.sh enter
sdd-finish`, invoke `sdd-continue`, do this step, then `./scripts/phase.sh
leave`. Skip all of that when every row says "none".

For each row in `proposal.md › Affects` that is not "none": propose the exact
edit to `docs/domain.md` / `docs/glossary.md` / `docs/product.md`, show the
diff, `AskUserQuestion` *Apply* / *Skip*. On apply: make the edit,
`./scripts/approve.sh <doc> approved`, bump `sdd_version` on `domain.md` if
it has one. Never silently.

## 3b. Record the screens

If the change has screens: copy `changes/<id>/design/reference/*.png` to
`docs/design/screens/` (overwriting a screen state this change altered),
then propose the rows for `docs/design.md › Screens` (screen, state, route,
reference path, since <id>) and show them. `AskUserQuestion` *Apply* /
*Skip*. On apply: `touch .sdd/unlock-design`, edit, `approve.sh
docs/design.md approved`, `rm -f .sdd/unlock-design`. The wireframes and
rounds log stay with the archived change; the references become the living
truth the next fidelity pass compares against.

## 4. Archive the change

- `./scripts/fm.py set changes/<id>/proposal.md sdd_phase merged`
- `git mv changes/<id> changes/archive/<id>`
- `docs/roadmap.md`: move the change's row from the active table to the
  `## Shipped` table, status `shipped`.
- `./scripts/index.sh`
- Commit: `feat(<id>): merge into specs — <capabilities> (<summary>)`

## 5. Ask — one question, four options, recommended first

Per `docs/engineering.md` §13, recommend the one it names:

- **Open a pull request (Recommended when a remote exists)** — PR title
  `<id>: <proposal title>`; body = the proposal's Outcome, each capability's
  delta summary (+adds ~modifies -removes), the convergence report, ADRs
  proposed. `git push` is denied to agents; give the user the exact commands.
- **Merge locally** — `git checkout main && git merge --squash <branch>` (or
  `--no-ff` per §13), delete the branch.
- **Keep the branch** — say why; note it in the roadmap row.
- **Discard** — only if the user says so explicitly, twice. Never recommend.

## 6. After

- Worktree, if used: `git worktree remove ../<repo>-<id>`.
- `./scripts/record.sh changes/archive/<id> list` — the record travels with
  the archived change: task reports and reviews per attempt, every
  convergence report, every design round's screenshots. Check it is not
  empty for a change that had tasks; if a task's record is missing, the
  controller skipped step 9 — copy it now from `.sdd/` before the next line.
- `.sdd/briefs/<id>`, `.sdd/reviews/<id>`, `.sdd/reports/<id>`,
  `.sdd/target/<id>`, `.sdd/design/<id>`: delete. Everything worth keeping
  from them is in the record.
- Say in four lines: which capabilities changed and to what version, what
  shipped, the next change on the roadmap, any open item carried forward.
  Offer `grill` for the next change.
