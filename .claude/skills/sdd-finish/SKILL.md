---
type: Skill
name: sdd-finish
description: Close out a converged change — merge its deltas into the living specs, re-approve any affected living docs, archive the change, choose merge / pull request / keep, update the roadmap. Use after sdd-converge reports Converged, or when the user says "finish", "ship it", "open the PR", "merge this", "we're done with this change". Adapted from obra/superpowers finishing-a-development-branch (MIT).
---

# Finish

Runs only after `sdd-converge` has reported **Converged** for the change. If it
has not, stop and say so.

## 1. Confirm the state

- `git status` clean; every task `**Status:** done`; `tasks.md`
  `sdd_phase: complete`; the convergence report at
  `.sdd/reports/<change>/converge.md`.
- `check` command green, run now, output shown.
- `./scripts/check-scenarios.sh --change changes/<id>` clean: every ADDED and
  MODIFIED scenario has a test; nothing cites a REMOVED one.
- `./scripts/check-specs.sh` clean for this change.

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

For each row in `proposal.md › Affects` that is not "none": propose the exact
edit to `docs/domain.md` / `docs/glossary.md` / `docs/product.md`, show the
diff, `AskUserQuestion` *Apply* / *Skip*. On apply: make the edit,
`./scripts/approve.sh <doc> approved`, bump `sdd_version` on `domain.md` if
it has one. Never silently.

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
- `.sdd/briefs/<id>`, `.sdd/reviews/<id>`, `.sdd/target/<id>`: delete.
- Say in four lines: which capabilities changed and to what version, what
  shipped, the next change on the roadmap, any open item carried forward.
  Offer `grill` for the next change.
