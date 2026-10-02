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
  `reference/`), `plan.md`, `tasks.md`, `notes.md`, and `record/` — the
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

```bash
# install (once): rustup — https://rustup.rs — then:
rustup target add wasm32-unknown-unknown
pnpm install
# run (dev):                       (builds src/sound/pkg/sound.wasm first)
pnpm dev
# run for the phone: HTTPS (self-signed) on the LAN — AudioWorklet needs a secure context and a LAN
# address is not one; open https://<laptop-ip>:5173 on the phone, accept the warning once.
# The harnesses below assume plain `pnpm dev`; against dev:phone set APP_URL=https://localhost:5173
pnpm dev:phone
# check (all — prettier, eslint, tsc, vitest, cargo fmt/clippy/test, one command):
pnpm check
# test (one file):
pnpm vitest run <path/to/file.test.ts>
# measured timing budget (Playwright/Chromium, ~3 min, sequential tempos) — required at converge and finish, not per task:
pnpm test:timing
# measured tuner budget (Playwright/Chromium; feeds the microphone from the page's own AudioContext,
# sweeps E2–C7 as a sine and a flute-like tone) — required at converge and finish from 007, not per task:
pnpm test:tuner
# design fidelity screenshots against the vendored prototype (dev-only, human-reviewed):
pnpm design:shots
```

`pnpm build:sound` (run by `predev`/`pretest`/`prebuild`) builds **both**
Rust crates — `src/sound/pkg/sound.wasm` and, from 007,
`src/listening/pkg/listening.wasm`; the script keeps its name.

Healthy output looks like (last ~8 lines of `pnpm check`: vitest summary,
then cargo's `test result`):

```
 Test Files  75 passed (75)
      Tests  314 passed (314)
   Start at  17:40:59
   Duration  10.63s (tests 50%, environment 33%, import 10%, transform 7%)

running 24 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
```

`pnpm test:timing` prints `measuring 3 tempos sequentially, N s each` first
— the three tempos run one page at a time, then a separate pre-flight
browser, so the whole thing takes ~3 minutes, not a hang — and healthy
output ends:

```
bpm  onsets  max onset dev (ms)  drift (ms, |slope·span|)  highlights  vs audible (ms)  vs scheduled (ms)  status
40   82      0.00                0.00                      40          28.00            66.67              PASS
96   194     0.00                0.00                      94          26.43            68.00              PASS
200  402     0.00                0.00                      195         28.00            70.77              PASS
test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
```

`vs audible (ms)` is what REQ-006/S4's ±30 ms budget gates (two-sided — either
side of the audible onset counts); `vs scheduled (ms)` is printed for
information only, never gated, and normally sits near the port's reported
output latency.

`pnpm test:tuner` feeds the microphone from the page's own AudioContext,
sweeping E2–C7 as a sine and a flute-like tone; it takes approximately 4
minutes. Healthy output shows five test rows — sine E2–C7, flute-like E2–C7,
hand-over glissando, silence, and white noise — plus worst-case summaries,
ending with a PASS line. The first readout budget (≤100 ms), arrival age
(≤100 ms), readings per second (≥20), cents error (≤2 ¢), and the shown
offset error (≤2 ¢, read 500 ms into each tone — practice.tuner/REQ-002/S9)
are gated; paint age is printed for information and is not gated.

```
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     95.10                   63.98                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     77.40                   63.98                 13.35               92.86           0.65           1              PASS
hand-over glissando  1      69.10                   63.98                 8.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 95.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout F♯6 77.40 ms · arrival age F♯6 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

Run `check` before calling any task done, and paste the output.

## Conventions

- Runtime / language: TypeScript (strict), browser SPA built with Vite.
  Rust (stable, `wasm32-unknown-unknown`, zero crates) owns the audio
  boundary — `src/sound/` from change 003 and `src/listening/` from 007 (hear-me)
  (ADR 0001, ADR 0003, ADR 0006); the workspace `Cargo.toml` at the root is the
  accepted root-config exception. Rust tests are `cargo test`.
- Design tokens: `src/ui/theme.ts` (`docs/design.md` §8). Styles are inline
  style objects from named constants; `scripts/check-design.sh` warns on a
  colour, size or font hard-coded elsewhere.
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
notes, keys, circle, traversal, pitch, catalogue, scales (the catalogue),
notation), `src/practice/` (the session: a pure transport state machine, the
drone, the tuner (target, reading, the never-both invariant extended to
listening), a lookahead scheduler adapter on the audio clock, ports for sound
/ clock / wake lock / visibility / listening),
`src/sound/` (Rust→WASM synthesiser in an AudioWorklet plus a ~60-line TS
host shim in its `published/`; ADR 0003) — voices are addressable by tag
and a drone voice has no end (ADR 0005), `src/listening/` (pitch
detection by the McLeod Pitch Method: NSDF, 2048-frame window, 512-frame hop,
an onset gate so every analysed window is pure signal, in a second AudioWorklet
sharing the sound context's AudioContext; the host shim in its `published/`;
ADR 0006).
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
- A brief's Files list can omit a file the change necessarily ripples into
  (a test call site, a `published/` re-export). List and touch it anyway,
  and say so in the report — don't leave the ripple undone to stay inside
  the list (recurred at T010, T022).
- Test names cite scenario IDs fully qualified (`practice.session/REQ-011/S1`),
  or `check-scenarios.sh` cannot attribute them (T012).

## Never

- Read, print, or write `.env*`, `*.pem`, `*.key`, `*secret*`, `*credential*`.
- Edit `memory/constitution.md`, `docs/engineering.md`, `docs/design.md` or
  `REVIEW.md` outside their skills; propose instead.
- Hand-edit YAML frontmatter, `index.md` or `log.md`. Use `scripts/fm.py`,
  `scripts/approve.sh`, `scripts/index.sh`.
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
