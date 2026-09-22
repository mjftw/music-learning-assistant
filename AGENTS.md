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

```bash
# install (once): rustup — https://rustup.rs — then:
rustup target add wasm32-unknown-unknown
pnpm install
# run (dev):                       (builds src/sound/pkg/sound.wasm first)
pnpm dev
# check (all — prettier, eslint, tsc, vitest, cargo fmt/clippy/test, one command):
pnpm check
# test (one file):
pnpm vitest run <path/to/file.test.ts>
# measured timing budget (Playwright/Chromium, ~70 s) — required at converge and finish, not per task:
pnpm test:timing
```

Healthy output looks like:

```
> music-learning-assistant@0.0.0 check /home/merlin/projects/music-learning-assistant
> prettier --check . && eslint . && tsc --noEmit && vitest run

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  17 passed (17)
      Tests  52 passed (52)
   Start at  15:18:33
   Duration  2.29s (environment 56%, tests 20%, import 14%, transform 10%)
```

`pnpm test:timing` healthy output ends:

```
bpm  onsets  max onset dev (ms)  drift (ms)  highlights  max highlight (ms)  status
40   82      2.67                -2.67       40          25.67               PASS
96   194     0.00                0.00        94          27.17               PASS
200  402     0.00                0.00        195         24.27               PASS
test:timing: PASS — every onset ≤5 ms, drift ≤1 ms, highlight ≤30 ms
```

Run `check` before calling any task done, and paste the output.

## Conventions

- Runtime / language: TypeScript (strict), browser SPA built with Vite.
  Rust (stable, `wasm32-unknown-unknown`, zero crates) owns the audio
  boundary — `src/sound/` from change 003 and `src/listening/` from 005
  (ADR 0001, ADR 0003); the workspace `Cargo.toml` at the root is the
  accepted root-config exception. Rust tests are `cargo test`.
- Package manager (only this one): pnpm.
- Test framework and where tests live: Vitest (+ Testing Library);
  `tests/<context>/scenarios/` one test per spec scenario named by
  its full ID, `tests/<context>/invariants/` for invariants tested by
  exhaustive enumeration, `tests/ui/scenarios/` for view-observable
  scenarios.
- Commits: Conventional Commits citing the requirement — `feat(auth): rate-limit login (REQ-004)`.

## Architecture

A static single-page web app; no server, no runtime services (Article VII).
Four bounded contexts (docs/domain.md): `src/theory/` (pure functions —
notes, keys, circle, traversal, pitch, catalogue), `src/practice/` (the
session: a pure transport state machine, a lookahead scheduler adapter on
the audio clock, ports for sound / clock / wake lock / visibility),
`src/sound/` (Rust→WASM synthesiser in an AudioWorklet plus a ~60-line TS
host shim in its `published/`; ADR 0003), `src/listening/` (pitch
detection; Rust→WASM from change 005, ADR 0001).
`src/ui/` is the view layer over the contexts, not a context itself. Each
context exposes `published/` and nothing else crosses its boundary
(scripts/check-contexts.sh). Data files (instrument variants) and stored
state are Zod-parsed into typed values at the edge; domain code never
re-validates. New domain logic goes in its context's `domain/`; new IO goes
behind a port with the adapter at the edge. The stave is hand-drawn SVG per
the design reference (ADR 0002), and all fonts are self-hosted with no
runtime network dependencies.

## Things agents get wrong here

<!-- Living list. Whenever a review or a converge finds a bug class, add one
     line here so it does not recur. Newest last. Prune when the code makes a
     line impossible. -->

- Duplicating a private helper instead of extracting it, because the natural
  home file isn't in the task's Files list. Extract within the same context
  and say so in the report; don't copy-paste (failed T002 and T004 reviews).

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
