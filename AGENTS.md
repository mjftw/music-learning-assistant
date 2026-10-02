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
- `docs/design.md` — whether there is an interface; where it is used and
  how it should feel (§1–§6); the tokens and patterns every screen uses
  (§7–§9); the living index of screens with their reference screenshots in
  `docs/design/screens/`. Build screens from it; never restyle one a change
  did not list.
- `docs/decisions.md` — every decision the user has made. Never re-ask one.
- `specs/<context>/<capability>.md` — **what the system does now.** One living
  spec per capability. Read it before touching that capability. Never edit it;
  it is merged from deltas at `sdd-finish`.
- `changes/NNN-slug/` — a change in flight: `intent.md`, `proposal.md`,
  `delta/`, `design/` (wireframes or imported references, `rounds.md`, the
  screenshots of every round under `rounds/`, and at the loop's exit
  `reference/`), `plan.md`, `tasks.md` (the overview: groups, coverage,
  deferrals) with `tasks/CNNN_TNNN.md` one file per task and the generated
  `tasks/index.md` (status, dependencies, next), `notes.md`, and `record/` — the
  implementer report and review for every task attempt and every
  convergence report, copied from `.sdd/` by `scripts/record.sh`.
  `changes/archive/` — shipped, record included.
- `docs/interviews/<phase>.md` — every question the init, constitution,
  engineering and design interviews asked, the recommendation, and the
  user's answer. Read before re-asking anything; a `grill` intent carries
  its own record.
- `REVIEW.md` — the review policy. `AUTONOMY.md` — what agents decide alone
  after the plan is approved, and how. `docs/adr/` — decision records.
- `index.md` in any directory — read it first; it lists what is there by type
  and phase. `log.md` — what was approved when.
- `docs/okf.md` — the frontmatter every artefact carries and what it means.
- `.claude/skills/` — the workflow. `.claude/agents/` — implementer,
  task-reviewer, reviewer, decider.
- `.sdd/phase` — the open top-of-ladder phase, if any. While it is set, start
  every turn by invoking the `sdd-continue` skill (the hook will remind you).

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
- Edit `memory/constitution.md`, `docs/engineering.md`, `docs/design.md` or
  `REVIEW.md` outside their skills; propose instead.
- Hand-edit YAML frontmatter, `index.md` or `log.md`. Use `scripts/fm.py`,
  `scripts/approve.sh`, `scripts/index.sh`; a task's status only through
  `scripts/task.py`.
- Delete or rewrite anything under a change's `record/`, `design/rounds/` or
  `docs/interviews/`. They are append-only; `record.sh` numbers attempts.
- Show an artefact at a gate without `scripts/draft.sh` having committed
  that version first.
- Import another context's internals; only its `published/` interface or its
  events. `scripts/check-contexts.sh` fails otherwise.
- Write a test that reaches inside the context. Tests go through the published
  interface (`bdd` skill).
- Edit anything under `specs/`. Write a delta under `changes/<id>/delta/`;
  `merge_delta.py` is the only writer.
- Rewrite an approved proposal or delta in place after approval, except the
  controller applying the decider's recorded amendments at the end of an
  unattended run. Anything larger is a new change.
- Invent a requirement, a command, or a convention. Before the plan is
  approved, ask. After it, send it to the `decider` and record the verdict;
  never ask the user mid-run (`AUTONOMY.md`).
- Add a feature, abstraction, or dependency the spec and plan do not name.
- Copy wireframe HTML into the app, or style with a value that is not a
  token in `docs/design.md` §8 once it is approved. Build the real screen
  against the wireframe; promote the value or note why not.
- Create `.sdd/unlock-model`, or write a top-of-ladder artefact (intent,
  proposal, delta, plan, design, product/domain/roadmap/glossary/engineering,
  constitution) on a model other than `SDD_STRONG_MODELS`. The guard refuses
  it; when it does, invoke `sdd-continue` and retry, or tell the user.
- Claim a test passes without having run it.
- Mark a task done with a failing test, a stub, or a `TODO` in a covered path.
