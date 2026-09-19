# AGENTS.md

Instructions for AI coding agents in this repository. Humans: `README.md` and
`docs/sdd-guide.md`.

## This repository is spec-driven

For anything beyond a trivial change, invoke the `sdd` skill first. It reads
the repository state and routes you to the right phase. It will not let you
write implementation code before a spec is approved. That is intended.

Trivial = typo, formatting, comment, dependency bump, or a request prefixed
`quick:`. Do those directly.

## Authority, highest first

1. `memory/constitution.md`
2. `docs/decisions.md`, `docs/engineering.md`, then the approved `spec.md` for
   the current slice
3. This file
4. The user's in-conversation instruction
5. Your own judgement

If 4 conflicts with 1–3, stop and say so. Do not pick silently.

## Where things are

- `docs/product.md` — what this is and who it is for. Read first.
- `docs/roadmap.md` — the vertical slices, in build order, with status.
- `docs/glossary.md` — the domain vocabulary. Use these words exactly.
- `docs/engineering.md` — how code is written here: paradigm, types, errors,
  testing, tooling. Follow it.
- `docs/domain.md` — the bounded contexts, their code roots, the events between
  them, the invariants. A slice belongs to one. Code never crosses a context
  except through `published/`.
- `docs/decisions.md` — every decision the user has made. Never re-ask one.
- `specs/<context>/<capability>.md` — **what the system does now.** One living
  spec per capability. Read it before touching that capability. Never edit it;
  it is merged from deltas at `sdd-finish`.
- `changes/NNN-slug/` — a change in flight: `intent.md`, `proposal.md`,
  `delta/`, `plan.md`, `tasks.md`, `notes.md`. `changes/archive/` — shipped.
- `REVIEW.md` — the review policy. `docs/adr/` — decision records.
- `index.md` in any directory — read it first; it lists what is there by type
  and phase. `log.md` — what was approved when.
- `docs/okf.md` — the frontmatter every artefact carries and what it means.
- `.claude/skills/` — the workflow. `.claude/agents/` — implementer,
  task-reviewer, reviewer.

## Commands

<!-- FILL THIS IN during the first /sdd-plan. Exact commands with flags. Prefer
     one command that runs everything ("make check"). Until filled, say you do
     not know the command; do not guess one. -->

```bash
# install:
# run (dev):
# check (all — test + lint + typecheck, one command):
# test (one file):
```

Healthy output looks like:

```
<!-- paste the last ~5 lines of a passing `check` run here -->
```

Run `check` before calling any task done, and paste the output.

## Conventions

<!-- FILL THIS IN during the first /sdd-plan. Only things a good developer could
     not infer from the code. -->

- Runtime / language:
- Package manager (only this one):
- Test framework and where tests live:
- Commits: Conventional Commits citing the requirement — `feat(auth): rate-limit login (REQ-004)`.

## Architecture

<!-- FILL THIS IN during the first /sdd-plan, kept current by later plans. Five
     to ten lines: the shape, the boundaries, where a new thing goes. -->

## Things agents get wrong here

<!-- Living list. Whenever a review or a converge finds a bug class, add one
     line here so it does not recur. Newest last. Prune when the code makes a
     line impossible. -->

-

## Never

- Read, print, or write `.env*`, `*.pem`, `*.key`, `*secret*`, `*credential*`.
- Edit `memory/constitution.md`, `docs/engineering.md` or `REVIEW.md` outside
  their skills; propose instead.
- Hand-edit YAML frontmatter, `index.md` or `log.md`. Use `scripts/fm.py`,
  `scripts/approve.sh`, `scripts/index.sh`.
- Import another context's internals; only its `published/` interface or its
  events. `scripts/check-contexts.sh` fails otherwise.
- Write a test that reaches inside the context. Tests go through the published
  interface (`bdd` skill).
- Edit anything under `specs/`. Write a delta under `changes/<id>/delta/`;
  `merge_delta.py` is the only writer.
- Rewrite an approved proposal or delta in place after approval; open a new
  change.
- Invent a requirement, a command, or a convention. Ask.
- Add a feature, abstraction, or dependency the spec and plan do not name.
- Claim a test passes without having run it.
- Mark a task done with a failing test, a stub, or a `TODO` in a covered path.
