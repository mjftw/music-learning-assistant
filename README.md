<!-- sdd-starter-template -->
# Spec Driven Development project starter 

A GitHub template for building software with AI agents, spec-first, where you
are the source of truth and the agent is the hands.

Create a repo from it, open your coding agent, and say what you want to build.
The agent interviews you, one question at a time, always with a recommended
answer, until it understands the product, the domain, and how you like code
written. Then it works down through the levels of abstraction: product brief,
bounded contexts, changes, intent, proposal and delta, plan, tasks, code.
Every artefact stops for your approval. Nothing is inferred, nothing is
re-asked, and no implementation code is written before a spec you have approved
exists.

Model power descends with the abstraction. The strongest model does the
interviewing and specifying, cheaper models do the typing, and the strongest
model comes back to verify.

---

## Contents

- [The idea in one minute](#the-idea-in-one-minute)
- [Using the template](#using-the-template)
- [The process, end to end](#the-process-end-to-end)
- [What you will be asked, and when](#what-you-will-be-asked-and-when)
- [The artefacts](#the-artefacts)
- [The model ladder](#the-model-ladder)
- [What the agent is not allowed to do](#what-the-agent-is-not-allowed-to-do)
- [Day to day](#day-to-day)
- [Scripts](#scripts)
- [Customising the template](#customising-the-template)
- [What it is built from](#what-it-is-built-from)

---

## The idea in one minute

AI agents are good at writing code and bad at guessing what you meant. Every
gap in a request gets filled with a plausible assumption, and the assumptions
compound into a codebase that does almost what you wanted.

This template closes the gaps before code exists, by making the agent mine you
for every decision and write each one down:

| Level | Artefact | The agent asks you… |
|---|---|---|
| Brainstorm | `docs/intent-product.md` | what you are trying to achieve, in your words, before anything is structured |
| Product | `docs/product.md` | what this is, for whom, what success means, what is out of scope for ever |
| Domain | `docs/domain.md` | how the product divides into bounded contexts, what events pass between them, what must never be false |
| Roadmap | `docs/roadmap.md` | which changes to make, each a thin vertical slice, in what order, where the cut line is |
| Change intent | `changes/NNN/intent.md` | everything about one change, in your words, recorded as you answer |
| Proposal + delta | `changes/NNN/proposal.md`, `delta/` | what and why, and exactly which requirements are added, modified or removed in which capability, no technology |
| Preferences | `docs/engineering.md` | how you like code written, asked at the first plan, then reused across every project |
| Plan | `changes/NNN/plan.md` | how: stack, data, interfaces, structure, every choice with its rejected alternative |
| Tasks | `changes/NNN/tasks.md` | self-contained work units, each naming the scenario it proves |
| Current truth | `specs/<context>/<capability>.md` | nothing; it is merged from approved deltas when a change ships, and it is what the system does now |

Three rules hold it together.

Article I of the constitution says the user is the source of truth. The agent
proposes; it never decides. A decision you make is written to
`docs/decisions.md` and is never re-asked.

Every artefact is a gate. It is written, its open questions are put to you, and
nothing proceeds until you approve. Approval stamps the file with a
`verified: human:<you>` entry.

Something always checks. Implementation is reviewed per task by an agent that
did not write it, then the whole change is audited against its spec by a
reviewer that saw none of the work. Tests are the spec's scenarios, written so
the implementation could be thrown away and rewritten without touching them.

## Using the template

On GitHub: *Use this template*, then *Create a new repository*. Then:

```bash
git clone git@github.com:<you>/<new-repo>.git
cd <new-repo>
./scripts/init.sh "Project Name" "One line about what it is"
claude            # or your agent of choice; see Portability below
```

Then, in the agent session:

```
/sdd-init
```

That is the only command you need to remember. It walks you through the opening
interviews, which take about 45 minutes for a real product, ratifies the
constitution, and offers to start the first change. None of it asks about
technology; that starts at the first plan. After that you just say what
you want, and the `sdd` skill works out which phase you are in and routes you.

`init.sh` seeds `docs/` from `templates/`, swaps this README for the project's
own, copies your engineering preferences from `~/.config/sdd/engineering.md` if
you have them, and makes the first commit.

## The process, end to end

```
                    ┌──────────────────────────────────────────────┐
  once per project  │  /sdd-init            no technology yet      │
                    │    brainstorm (grill), product brief,        │
                    │    domain map, constitution, roadmap,        │
                    │    glossary                                  │
                    └──────────────────┬───────────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────────┐
  once per change   │  grill          → intent.md     (you talk)   │
                    │  sdd-specify    → proposal + delta  [GATE]   │
                    │  sdd-plan       → plan.md       [GATE]       │
                    │       └ first time: engineering prefs, then  │
                    │         the stack is chosen here             │
                    │  sdd-tasks      → tasks.md      [GATE]       │
                    │  sdd-implement  → code, one task at a time   │
                    │       ├ brief   → implementer (cheap model)  │
                    │       ├ verify  → controller re-runs tests   │
                    │       └ review  → task-reviewer, fix loop    │
                    │  sdd-converge   → reviewer audits the change │
                    │       └ gaps    → back to implement          │
                    │  sdd-finish     → merge delta into specs/, PR│
                    └──────────────────────────────────────────────┘
```

### Per phase

`sdd-init` is the door, and it asks nothing about technology. It starts with a
brainstorm: an open interview about what you are trying to achieve, what is
annoying today, what the thing looks like in your head, who it is for, what
would make you abandon it. That becomes `docs/intent-product.md` in your own
words. The product brief is then drafted *from* that intent rather than asked
from scratch, and you are only questioned on what the brainstorm left out.
Domain discovery follows, where nouns become bounded contexts, verbs become
events, and "what must never be true" becomes invariants. Then the
constitution, which is three project-specific articles on top of the fixed
ones. Then the roadmap, the product decomposed into changes, each a thin
vertical slice: end to end, useful on its own, and belonging to exactly one
context. Then the
glossary, with every term scoped to a context, in your definition.

Every step of init is technology-free by design. Which language, which
framework, which database, where it is hosted: none of those are answerable
until the product, its constraints and its non-functional requirements exist,
so none of them are asked. If you volunteer one, it is recorded as your stated
preference and not followed up.

`grill` runs for each change: an interview that walks the decision tree top down
through purpose, context, boundaries, actors, data, states, failure modes, the
boring realities like time zones and money and unicode and concurrency, scale,
lifecycle, and done. It looks things up in the repo before asking. It pushes on
weak answers. It accepts "I don't know" and records it as an open question.
Every answer is written to `intent.md` as it is given, in your words.

`sdd-specify` turns the intent into a proposal and one or more deltas: what and
why in `proposal.md`, and in `delta/<context>/<capability>.md` exactly which
requirements are added, modified or removed in the living spec, each with
Given/When/Then scenarios carrying real values, including the failure paths. A
modified requirement shows its old sentence so the diff is visible. The delta is
previewed against the current truth before you see it, so a change that would
add an ID that exists or modify one that does not is caught here. The most
valuable section of the proposal is the one listing what is explicitly out of
scope. Gate.

`sdd-plan` is where technology finally enters. On the first change it runs the
engineering-preferences interview if you have no master file yet, asking the
principles first (paradigm, types, errors, testing) and the languages and
tooling last, framed as what you reach for rather than a decision for this
project. Then it chooses this project's stack, in order, from: the constraints
the product brief recorded as imposed, the numbers in the spec's
non-functional requirements, what each bounded context actually needs, your
preferences, and whatever the repo already uses. The Approach paragraph has to
say which of those drove the choice.

`sdd-plan` turns the spec into `plan.md`: stack, data model, interfaces with
their error shapes, events with their schemas, file structure mirroring the
context map, test strategy, risks, rollout. Every choice names the alternative
it rejected. The plan is checked against the constitution and your engineering
preferences section by section, and a departure is a question for you rather
than a decision. This phase also fills `AGENTS.md` with the real commands.
Gate.

`sdd-tasks` turns the plan into `tasks.md`: ordered, dependency-aware, and each
task self-contained with exact files, exact interfaces, 3 to 8 steps of 2 to 5
minutes, and an exact verify command. Self-contained matters because the
implementer will see only its own task, never the whole plan. No placeholders:
"handle edge cases" fails the gate. Every RED step names the scenario it
proves. Gate.

`sdd-implement` is the controller loop. For each task it builds a brief, where
`scripts/task-brief.sh` extracts the task, its requirements, the relevant plan
sections, your preferences, the commands and the constitution into one file. It
dispatches an `implementer` subagent that reads only that brief and works TDD.
Each task is its own file under tasks/, with its requirements, its
dependencies and its status in the frontmatter; tasks/index.md is generated
from those and is the only thing the controller reads to find the next task
(the first todo whose dependencies are done). The old tasks.md stays as a
short overview: the groups in build order, the coverage table, deferrals.
It re-runs the verification itself. It packages the diff, dispatches a
`task-reviewer` for two verdicts on spec compliance and then quality, and loops
a fixer on failures; after three rounds the decider rules on it. Then it
marks the task done and commits. An implementer that hits a question about
what to build reports `DECISION_NEEDED`, and the decider answers it on the
strongest model and records why. It never guesses, and it never waits for
you.

`sdd-converge` puts a `reviewer` subagent on the strongest model, one that did
not watch any of the above, to audit the change against its proposal, its
deltas, the target state, `plan.md`,
the constitution, your preferences and `REVIEW.md`. It checks that every
scenario has a test, that every test goes through the public interface, that no
context imports another's internals, that no dependency arrived unplanned, and
that no secret is in the tree. Gaps go back into `tasks.md`, and it repeats
until clean.

`sdd-finish` is where the truth changes. It merges the deltas into
`specs/<context>/<capability>.md`, bumps each capability's version, records the
change in its history, re-runs the standing coverage check over every living
spec, applies any approved edits to the domain map or glossary, archives the
change under `changes/archive/`, and offers a PR. From then on the living spec
is what the system does, and the next change is written against it.

## What you will be asked, and when

The template is built so that your attention is spent at decision gates and
nowhere else.

| You are asked | When | Not asked again because |
|---|---|---|
| What you are trying to achieve, openly | `/sdd-init` step 2, once | recorded in `docs/intent-product.md` |
| The big questions: what, for whom, contexts, invariants | `/sdd-init`, once | recorded in `docs/` and `docs/decisions.md` |
| Whether there is an interface, and where and how it is used | `/sdd-init` step 3b, once | recorded in `docs/design.md` |
| How you like code written | the first `sdd-plan`, once ever | recorded in `docs/engineering.md` and your master copy |
| Do you have a design, or wireframe it? Then what is missing on each screen | before each change's proposal, if it touches a screen | wireframes and the walkthrough in the change's `design/` |
| Tokens: the palette, type and spacing | the first `sdd-plan` that touches a screen | recorded in `docs/design.md` §8 |
| What is wrong with the screen, and which treatment wins | the refinement loop, as many rounds as you like, no approvals | `design/rounds.md`; winners promoted to `docs/design.md` at exit |
| Everything about a change | `grill`, once per change | recorded in `intent.md` |
| Approve or revise | each gate: spec, plan, tasks, and the init docs | approval is a `verified` stamp on the file |
| A question the brief could not answer | mid-implementation, rarely | answered once, added to `decisions.md` |
| Accept a warning by name | converge, if any | recorded in the report |
| Merge, PR or keep | finish | |

The agent is told to prefer a small number of good questions over silent
assumptions, and to recommend an answer with every question. A typical change
costs you one `grill` session and three approvals.

## The artefacts

Every markdown file carries [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
frontmatter with a distinct `type`, `sources` for provenance, `generated` for
who drafted it, and `verified` for who approved it. The `index.md` in each
directory is regenerated from that frontmatter, and `log.md` records every gate
passed. Details are in [`docs/okf.md`](docs/okf.md).

```
index.md                bundle root, start here
log.md                  every gate passed, dated
AGENTS.md               agent instructions (cross-tool standard); CLAUDE.md imports it
REVIEW.md               review policy: passes, severities, thresholds. Yours.
memory/constitution.md  highest authority; agents propose amendments, never make them
docs/
  product.md            what this is, for whom, constraints, lifecycle
  domain.md             bounded contexts, code roots, events, invariants
  engineering.md        how you like code written, copied from your master
  roadmap.md            changes in build order, with status
  glossary.md           the vocabulary, scoped per context
  intent-product.md     the opening brainstorm, in your words
  decisions.md          append-only; every decision you have made
  adr/                  architecture decision records
  sdd-guide.md          the long-form guide to all of this
  okf.md                the frontmatter and what each field means
specs/                  what the system does NOW, by bounded context
  <context>/
    <capability>.md     living spec: every true requirement, versioned, with history
changes/                what is being changed
  NNN-slug/             one directory per change
    intent.md           your words, Q&A record
    proposal.md         WHAT and WHY; which capabilities it touches; what it affects
    delta/<ctx>/<cap>.md  ADDED / MODIFIED / REMOVED against the living spec
    plan.md             HOW: stack, data, interfaces, structure, risks
    tasks.md            self-contained task blocks
    notes.md            decisions taken during implementation
  archive/              shipped changes, kept for history
templates/              what the skills fill in
scripts/                see below
.claude/skills/         the workflow, 16 skills
.claude/agents/         implementer, task-reviewer, reviewer
.claude/settings.json   permissions and hooks
```

## The model ladder

Judgement at the top, hands at the bottom, model power following:

| Phase | Runs as | Model |
|---|---|---|
| `sdd-init`, `sdd-constitution`, `sdd-engineering`, `grill`, `sdd-specify`, `sdd-plan`, `sdd-design` | main session | Fable |
| `sdd-tasks`, `sdd-implement` (controller), `sdd-finish` | main session | Sonnet, the project default |
| `implementer`, `task-reviewer` (per task) | subagents | Sonnet (Haiku for a trivial task) |
| `sdd-converge` → `reviewer` | subagent | Opus |

The ladder is enforced, not requested. The session starts on Sonnet
(`.claude/settings.json`), so nothing runs on Fable unless a phase needs it.
Each Fable skill carries `model: fable`, but a skill's model only lasts for
the turn it is invoked in, and an interview is many turns. So the skill also
opens a phase marker (`.sdd/phase`); while it is open, a hook reminds the
agent at the start of every turn to invoke `sdd-continue`, a tiny skill whose
only job is to move that turn to Fable. The marker closes at the gate that
hands down to a lower phase, and anything left open for twelve hours is
dropped.

Behind that sits a guard. The write hook reads from the session transcript
which model issued each write, and refuses writes to the intent, proposal,
deltas, plan, design files, and the product, domain, roadmap, glossary,
engineering and constitution documents from any model not in
`SDD_STRONG_MODELS` (`claude-fable-*` by default, in `.claude/settings.json`).
If you start a session on Haiku and ask it to spec something, it can talk to
you, but it cannot write the spec. If Fable is not available to your account
the agent stops and tells you; creating `.sdd/unlock-model` is how you say
"write it on this model anyway", and agents are told never to create it.

Verification is never weaker than what it verifies, so the change-level
reviewer is Opus whatever the session is on. Subagent tiers live in
`.claude/agents/*.md`. To move the top of the ladder to a newer model, change
`SDD_STRONG_MODELS` and the `model:` line in the eight skills that carry it;
`./scripts/selftest-models.sh` checks the guard afterwards.

## How the product evolves

The specs are not a changelog. `specs/` holds one living document per
capability, and it is the only place that says what the system does now.
Every change, from the first feature to a one-line rule tweak years later, is
the same shape: an intent in your words, a proposal, and a delta that says
what is added, modified or removed in which capability. Until the change
ships, everyone works against a preview of the living spec with the delta
applied. When it ships, the delta is merged in, the capability's version goes
up, the change is archived, and the next change is written against the new
truth.

A removed requirement stays in the living spec, struck through, with the
change that removed it. IDs are never reused. A capability's history table
lists every change that shaped it. So "what does readings do" is one file,
"why does it do that" is its sources, and "what did we think last spring" is
the archive.

The first change is not special: it is a delta that is all ADDED into a
capability that does not exist yet, and the merge creates it. There is no
initial-build mode and no migration to an evolution mode.

## Designing the interface

Most of the artefacts here are words, and a process made of words produces
software that works and looks like nothing. So design has its own place in
the ladder, at the moments a designer would be in the room.

At init the agent asks one question: does this product have an interface
people look at? A library or a service says no, and design never comes up
again. Anything else says yes, and a few short questions record where it is
used (a phone on a music stand, a laptop at a desk, an e-ink panel on a wall),
the tone, what must always be visible, the interaction rules that follow, and
the accessibility floor. Nothing about colour or fonts yet; those are chosen
with the stack.

Before each change is specified, the agent asks whether it touches a screen.
If it does, you have three ways in. Import a design you already have, from
Figma, from Claude Design, from a photo of a sketch. Go and make one in one of
those tools, and the change waits until you bring it back. Or have the agent
wireframe it: grey boxes, one file per screen, one block per state, which it
screenshots and looks at before showing you. Either way the agent then walks
every scenario across the screens and tells you which scenarios have nowhere
to happen and which screen elements no requirement asks for. That list is
settled before the requirements are written.

Then the build, which is meant to be correct and grey. The design itself
happens afterwards in the refinement loop, on the real app, on the real
device. You say what is wrong. The agent tries up to three treatments at
once behind a temporary switch, screenshots them, and you pick. No approval
per round; the record is a log of what was tried and why the winner won. If a
round changes what the product does rather than how it looks, the agent
writes that into the delta and says so. When you say it is done, the loop
exits: reference screenshots are taken, the values that won become tokens in
docs/design.md, and the reviewer compares the shipped screens to those
references, including checking that screens the change did not list have not
changed.

For shipped screens that work but feel wrong, new-change.sh --design skips
the plan and tasks and goes straight to the loop.

## After the plan, nobody needs to be there

All the questions come before the plan is approved: the product, the
domain, the intent, the proposal and its deltas, the plan. The plan's gate
is the last one. Approving it starts an unattended run that writes the
tasks, builds them, reviews them, fixes what the reviews find, audits the
result and finishes the change, without asking you anything. Implementation
takes hours; a run that stops to ask whether a helper belongs in one file or
another wastes them.

The rules are in AUTONOMY.md, which is yours to edit. The implementer
decides the craft of its own task and lists what it chose. Anything bigger,
such as what a requirement means, a case the spec never covered, or a
value that contradicts another, goes to a decider agent on the strongest
model. There is no list of permitted decisions. The decider asks four
questions of each one: what reversing it later would cost, how much will be
built on top of it, whether it reaches outside the change, and whether it
changes what a requirement promises or only how the promise is kept. A
two-way door it decides, with the options, its reasoning, and how to undo
it. A one-way door it escalates: that task and anything depending on it are
parked, and everything else is still built.

When a decision needs the spec's wording to change, the decider writes the
exact amendment, and once the last task is done the amendments are applied
to the delta on the strong model, before the audit, so the reviewer checks
the code against a spec that says what was actually built. The reviewer
also re-judges every decision, and one it thinks should have been escalated
is a critical finding.

You come back to a run report. It opens with what needs you: escalations,
parked work, and for any change that touched a screen, a visual check,
listing each screen and state with its route and a live screenshot, asking
you to look at it on the real device. Then what was decided for you, then
the amendments, then the result, and the commands to push the branch.

## What is kept

Consolidating a change into the living specs would be a bad trade if it
threw the reasoning away, so the process keeps more than the result.

The change directory is never deleted. At finish it moves to
changes/archive/ with its intent, proposal, deltas, plan, tasks, notes and
design folder intact, and the living spec's sources and history table point
back at it.

Every gate commits a numbered draft before you see it. Send a proposal back
three times and git log on that file shows all four versions; a requirement
you had removed before approving is one diff away, not gone.

The working files the agents write while building are copied into the
change's record/ folder as they are produced: the implementer's report and
the reviewer's findings for every task attempt, including the ones that
failed and went round the fix loop, and every convergence report, one per
cycle. The design loop keeps the screenshots of every round under
design/rounds/, rejected treatments included, so the log's "rejected because
cramped" sits next to the picture. Only the task briefs and the merged
preview are discarded, because both are regenerated from what is kept.

The init, constitution, engineering and design interviews write a record in
docs/interviews/: every question, the recommendation the agent made, and
your answer in your words, in the same shape a change's intent already uses.
The recommendations you overrode are the useful lines; they are where the
agent would have got it wrong on its own.

## What the agent is not allowed to do

Each of these is enforced by a mechanism, not by asking nicely.

It cannot write implementation code before an approved spec exists, because the
`sdd` router refuses to route past a gate that has not been passed.

It cannot edit the constitution, your engineering preferences, `REVIEW.md`,
`index.md` or `log.md` directly. A `PreToolUse` hook
(`scripts/hooks/guard-paths.sh`) blocks the edit tools on those paths, and the
owning skill unlocks a file only between your approval and the commit.

It cannot read or write `.env*`, keys, secrets or credentials. Denied in
`settings.json` and by the hook.

It cannot run `git push`, `git reset --hard` or `rm -rf`. Pushing is the one
step that leaves your machine, and it stays yours.

It cannot edit a living spec. `specs/**` is blocked by the hook; the only
writer is `merge_delta.py`, at finish, after you approved the delta and the
change converged.

It cannot hand-edit frontmatter. `scripts/fm.py` and `scripts/approve.sh` are
the only way, so `status` and `sdd_phase` can never disagree.

It cannot import another bounded context's internals, because
`scripts/check-contexts.sh` fails it. Only `published/` interfaces and events
cross a boundary.

It cannot write a test that reaches inside the context. `task-reviewer` marks
that as an important finding, and the `bdd` skill's litmus is whether the
implementation could be rewritten with this test still passing unedited.

It cannot mark a task done on the implementer's word. The controller re-runs
the verification itself, and then a separate reviewer checks the diff.

It cannot re-ask a recorded decision, or answer an open question on your
behalf.

## Day to day

| Say | Happens |
|---|---|
| "I want to add X" | `sdd` classifies it (trivial, small or full), reads the roadmap, and routes, usually to `grill` |
| `quick: fix the typo in the footer` | done directly, no ceremony |
| "what does X do now" | reads `specs/<context>/<capability>.md` and answers; no change opened |
| "change how X works" | `grill` on the existing capability, then a delta with MODIFIED and REMOVED entries |
| "where were we" or "carry on" | resumes from the last `done` task |
| "grill me on X" | the interview, for anything, not only changes |
| "converge" or "did we build what we specced" | the change audit |
| "ship it" or "open the PR" | `sdd-finish` |
| "my coding preferences" | `sdd-engineering`: view, refine, sync to master |
| "amend the constitution" | `sdd-constitution`: proposed, gated, versioned |

Right-sizing means a one-line CSS fix and a new auth system do not get the same
ceremony. Trivial changes are just done. A single-file change gets a spec and
skips the plan. Anything touching auth, money, personal data, deletion or
migrations gets the full path with no exceptions.

## Scripts

All stdlib bash and Python 3, no dependencies.

| Script | Does |
|---|---|
| `init.sh "Name" "One line"` | one-time instantiation of a repo made from this template |
| `new-change.sh <slug> [--branch] [--design]` | allocates the next change number (archived ones count), seeds the change from templates; `--design` seeds only intent, proposal and the design log for a refinement-only change |
| `merge_delta.py preview\|apply <change>` | previews a change's deltas against the living specs into `.sdd/target/`, or merges them in at finish |
| `fm.py get\|set\|check\|verify` | the only way frontmatter is read or written |
| `approve.sh <file> <phase>` | the only way a gate is passed; stamps `verified`, appends to `log.md` |
| `index.sh` | regenerates every `index.md` from frontmatter |
| `check-specs.sh` | lints the artefact tree: phases, contexts, scenarios, placeholders, tech in specs |
| `check-contexts.sh` | fails a cross-context import that bypasses `published/` |
| `check-scenarios.sh` | every live scenario has a test and no test cites a removed requirement; `--change` checks a change's target state |
| `check-design.sh` | docs/design.md state and hard-coded values outside the tokens file; `--change` checks a change's Interface table: design files and states exist, cited requirements are in the target state, every row has a reference once the loop has exited |
| `record.sh <change> task T0NN\|converge\|design-round N\|list` | copies the implementer report and task review, the convergence report, or a design round's screenshots from the ephemeral .sdd/ into the change's committed record, numbered per attempt |
| `task.py <change> next\|status\|park\|new\|list\|coverage\|check\|split` | one file per task under tasks/: the next buildable task, status changes, parking along dependencies, new tasks, the index table, the coverage table, consistency checks, and migrating an old single-file tasks.md |
| `report.sh <change>` | writes the end-of-run report: what needs you (escalations, parked tasks, the visual check), the decisions digest, the amendments, the result |
| `draft.sh <path> [path...]` | commits the artefact as a numbered draft before a gate, so rejected versions stay in git history |
| `phase.sh enter <skill>\|leave\|show` | opens and closes the top-of-ladder phase marker that keeps an interview on Fable; skills call it, you rarely need to |
| `selftest-models.sh` | checks the model ladder's enforcement on this install: the write guard, the phase marker, the skill and agent model lines |
| `design_snapshot.py <change> wireframes\|live\|reference` | screenshots every screen and state in the Interface table: the wireframes, the running app (with `--variants a,b,c` for a round of the loop), or the references at its exit |
| `task-brief.sh <change> <TID>` | extracts one task into a self-contained brief for the implementer |
| `review-package.sh <change> <TID> <base>` | packages a task's diff for the reviewer |
| `hooks/guard-paths.sh` | `PreToolUse`: protected paths |
| `hooks/post-edit.sh` | `PostToolUse`: runs your formatter, filled in by the first plan |

## Customising the template

Things you will want to change, in the order you will want to change them.

Your engineering preferences master lives at `~/.config/sdd/engineering.md`, or
wherever `$SDD_ENGINEERING` points. The first `/sdd-init` interviews you for
it, and every later project copies it in. Refinements discovered during a
project are proposed back with a "sync to master?" question.

`REVIEW.md` holds the review passes, severities and thresholds. Edit it by
hand; agents apply it and never change it.

Constitution Articles V to VII are the project-specific non-negotiables, and
`sdd-constitution` interviews for them with candidates.

Model tiers are the `model:` field in `.claude/agents/*.md`.

`check-contexts.sh` has `PUBLISHED` and `IMPORT_RE` at the top, tuned to your
stack in the first `/sdd-plan`.

`settings.json` has an allowlist that permits `git commit` and denies `push`.
Adjust to taste.

`templates/*.md` are what the skills fill in. Change the shape of a spec there
and every future spec follows.

### Portability

The skills are plain `SKILL.md` folders, the open Agent Skills standard, read
by Claude Code, Codex, Cursor, VS Code and others. `AGENTS.md` is the
cross-tool context file, and `CLAUDE.md` is one line importing it. The scripts
and artefacts are agent-agnostic. Two things do not travel to another agent:
`.claude/settings.json`, which holds permissions and hooks, and
`.claude/agents/`, which holds the subagent definitions. Most agents have
equivalents, but those files are Claude Code's.

## What it is built from

Nothing here is novel. It is a deliberate assembly of current practice, and
each part is credited in [`docs/sdd-guide.md`](docs/sdd-guide.md):

- The gate workflow and constitution come from GitHub Spec Kit.
- Living specs plus change proposals with delta specs, merged on ship, come
  from OpenSpec.
- The chain of artefacts (`intent.md`, spec, plan, diff, review), hooks as
  boundaries, `REVIEW.md`, subagent verifiers and the "things agents get wrong"
  list come from Anthropic's AI-Native SDLC playbook.
- `grill` comes from Matt Pocock's grill-me.
- The TDD iron law, task anatomy, brief-per-task subagent implementation,
  systematic debugging and branch finishing come from obra/superpowers.
- EARS requirements notation (Mavin et al., Rolls-Royce), as used by AWS Kiro,
  paired with Given/When/Then scenarios from Dan North's BDD.
- Bounded contexts, ubiquitous language, domain events and invariants come from
  Domain-Driven Design (Evans; Vernon). Four ideas, no vocabulary tax.
- Open Knowledge Format v0.2 (Google Cloud) for every artefact.
- AGENTS.md (Agentic AI Foundation, Linux Foundation) and the Agent Skills
  standard, for portability.

The long version of everything above, including the reasoning behind each
choice and what was deliberately left out, is in
[`docs/sdd-guide.md`](docs/sdd-guide.md).
