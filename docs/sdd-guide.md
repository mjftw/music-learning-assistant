---
type: Guide
title: Spec-driven development guide
description: How this repository's agent-led workflow works, phase by phase, and why it is shaped this way.
resource: /docs/sdd-guide.md
status: stable
tags: [sdd, guide]
---

# Spec-driven development guide

A repository pre-wired so that asking an AI agent to build something runs it
through init, grill, specify, plan, tasks, implement, converge and finish,
stopping for your approval at each gate, instead of going straight to
code.

You are the source of truth. The agent's job is to mine you for what to build
and how, record every answer, and execute. It proposes; it never decides for
you. That is Article I of the constitution, and every skill is written to obey
it.

Agent instructions live in `AGENTS.md`.

## Quick start

```bash
# 1. Use this template on GitHub, clone the new repo, then:
./scripts/init.sh "Project Name" "One-line description"

# 2. Open your agent here. Claude Code:
claude

# 3. One door:
/sdd-init
```

That opens with a brainstorm about what you are trying to achieve, drafts the
product brief from it, maps the bounded contexts, ratifies the constitution,
decomposes the product into changes, builds the glossary, and offers
to start change 1. None of it asks about technology. Your engineering
preferences (once ever, then reused across projects) and this project's stack
are settled at the first plan, once the product and its constraints exist to
choose from. From then on, describe what you
want; the `sdd` skill routes it.

## What is here

```
AGENTS.md               Agent instructions. The cross-tool standard, read by
                        Codex, Cursor, Copilot, Gemini CLI, Windsurf, Aider,
                        Zed, Devin and others.
CLAUDE.md               One line: @AGENTS.md, plus Claude-only notes.
REVIEW.md               Review policy: passes, severities, thresholds. Yours.
index.md                Bundle root. Declares okf_version.
log.md                  Every gate passed, dated.
memory/constitution.md  Project principles. Outranks everything, including you
                        mid-conversation. Amended deliberately, never by an agent.
docs/intent-product.md  The opening brainstorm, in your words.
docs/product.md         What this is, for whom, imposed constraints, lifecycle.
docs/roadmap.md         The changes, in build order, with status.
docs/glossary.md        Domain vocabulary. Specs and code use these words.
docs/engineering.md     How you like code written. Copied from your master.
docs/domain.md          Bounded contexts, their code roots, events, invariants.
docs/decisions.md       Append-only log of every decision you have made.
docs/okf.md             The artefact frontmatter and what each field means.
docs/adr/               Architecture Decision Records.
specs/                  What the system does NOW, by bounded context:
  <context>/<capability>.md   living spec, versioned, with a history table.
changes/                What is being changed:
  NNN-slug/
    intent.md           Your words. Q&A record. Written by grill.
    proposal.md         WHAT and WHY; capabilities touched; what it affects.
    delta/<ctx>/<cap>.md  ADDED / MODIFIED / REMOVED against the living spec.
    plan.md             HOW. Stack, data, interfaces, risks.
    tasks.md            Ordered, self-contained task blocks.
    notes.md            Decisions taken during implementation.
  archive/              Shipped changes, kept for history.
templates/              What the skills fill in.
scripts/init.sh         One-time instantiation of a new project.
scripts/new-change.sh   Allocates the next change number and seeds the change.
scripts/merge_delta.py  Previews or merges a change's deltas into the living specs.
scripts/check-specs.sh  Static lint over the artefact tree.
scripts/check-contexts.sh  Fails a cross-context import that bypasses published/.
scripts/check-scenarios.sh Every spec scenario has a test citing it.
scripts/fm.py           The only way frontmatter is edited.
scripts/approve.sh      The only way a gate is passed.
scripts/index.sh        Regenerates index.md files from frontmatter.
scripts/task-brief.sh   Extracts one task into a self-contained brief.
scripts/review-package.sh  Packages a task's diff for the reviewer.
scripts/hooks/          PreToolUse path guard; PostToolUse formatter.
.claude/skills/         The workflow itself.
.claude/agents/         implementer, task-reviewer, reviewer.
.claude/settings.json   Permission allowlist and hook registration.
```

## The skills

| Skill | Does |
|---|---|
| `sdd` | Router. Reads repo state, right-sizes the change, dispatches. |
| `sdd-init` | The door. Brainstorm → product brief → domain map → constitution → roadmap → glossary. Technology-free. Once per project. |
| `sdd-engineering` | Establishes, loads or refines your cross-project coding preferences. Runs at the first plan, not at init. |
| `sdd-constitution` | Establishes or amends the constitution. |
| `grill` | Interviews you until the decision tree is resolved. Writes `intent.md` in your words. |
| `ears` | Reference for writing testable requirements, and their scenarios. |
| `ddd` | The four parts of DDD we use (contexts, language, events, invariants) and what we skip. |
| `bdd` | Scenarios → tests that survive a rewrite. Doubles only at ports. |
| `sdd-specify` | Writes the proposal and the deltas. |
| `sdd-plan` | Writes `plan.md`. |
| `sdd-tasks` | Writes `tasks.md`. |
| `sdd-implement` | Controller: briefs an implementer per task, verifies, reviews, loops. |
| `sdd-converge` | Audits the change against the artefacts. Appends gaps. Repeats. |
| `sdd-finish` | Merges the deltas into the living specs, archives the change, PR. |
| `tdd` | The iron law. RED/GREEN/REFACTOR. |
| `debugging` | Systematic debugging and verification before completion. |

Each of `specify`, `plan` and `tasks` ends at a gate: the artefact is
written, open questions are surfaced, and nothing proceeds without your
approval. Each gate is its own approval. Saying "carry on" earlier in the
session does not carry forward. A gate is passed by `scripts/approve.sh`, which stamps the
frontmatter with your `human:` verification and appends to `log.md`.

## Right-sizing

A one-line CSS fix and a new auth system should not get the same ceremony.

| Change | Path |
|---|---|
| Typo, format, comment, dep bump | Just done. Or prefix `quick:`. |
| One file, no new interface | Spec only, skip the plan |
| New feature, interface, dependency, schema | Full workflow |
| Auth, money, personal data, deletion, migrations | Full workflow, no exceptions |

## The model ladder

Judgement lives at the top of the workflow; execution at the bottom. Model
power follows.

| Phase | Runs as | Model |
|---|---|---|
| `sdd-init`, `sdd-constitution`, `grill`, `sdd-specify`, `sdd-plan` (and `sdd-engineering`, which it runs) | main session | strongest available |
| `sdd-tasks` | main session | strongest or mid |
| `sdd-implement` (controller) | main session | mid or strongest |
| `implementer` (per task) | subagent | mid (sonnet); `Trivial` → small |
| `task-reviewer` (per task) | subagent | mid (sonnet) |
| `sdd-converge` → `reviewer` | subagent | strongest |
| `sdd-finish` | main session | any |

The one place the ladder bends is the reviewer: verification weaker than what
it verifies catches nothing, so `converge` runs on the strongest model.
Overrule it in `.claude/agents/reviewer.md` if you disagree.

## The implementation loop

Below `tasks.md` the shape is borrowed from superpowers'
subagent-driven-development. The controller (your main session) never reads the
whole plan per task. For each task it:

1. builds a brief. `scripts/task-brief.sh` extracts the task block, the
   requirements it cites, the plan sections it touches, your engineering
   preferences, the commands and the constitution into one file;
2. dispatches an `implementer` (Sonnet, fresh context) that sees only that
   brief, works TDD, and reports `DONE` / `DONE_WITH_CONCERNS` /
   `NEEDS_CONTEXT` / `BLOCKED`;
3. verifies independently, running the task's verify line and `check` itself;
4. packages the diff with `scripts/review-package.sh`, against the commit
   recorded *before* dispatch, never `HEAD~1`;
5. dispatches a `task-reviewer` (Sonnet) for two verdicts: spec compliance
   (everything required, nothing extra), then quality against your
   preferences;
6. loops a fixer on critical and important findings, at most three rounds;
7. marks the task done and commits.

A `NEEDS_CONTEXT` the controller cannot answer from `docs/decisions.md` comes
to you. That is the design: the implementer never guesses, and you are asked
exactly once per gap.

When every task is done, `sdd-converge` audits the whole change with a reviewer
that saw none of this, and `sdd-finish` closes it out.

## Artefacts are OKF

Every markdown artefact here carries [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
frontmatter, one `type` per artefact kind (`Intent`, `Specification`,
`Implementation Plan`, `Task List`, …). That buys three things.

Provenance: `sources` links each artefact to what it was derived from, so the
chain conversation → intent → spec → plan → tasks → code is a frontmatter walk.

Trust: a gate approval is a `verified` entry with a `human:` actor, so "which
specs have I actually approved" is `grep -l 'by: human:' specs/*/spec.md`.

Progressive disclosure: an `index.md` in every directory, regenerated by
`scripts/index.sh`, lets an agent orient from one file instead of reading every
spec.

`scripts/approve.sh` is the only way a gate is passed; `scripts/fm.py` the
only way frontmatter is edited. Types and fields: [docs/okf.md](okf.md).

## Domains and behaviours

Two disciplines run through every phase, deliberately kept to their most
useful parts.

Domain-driven design gives us four ideas and no vocabulary tax. During `sdd-init`
the product is divided into bounded contexts (`docs/domain.md`): named
areas that each own one model and one vocabulary, with a code root each.
Every change belongs to exactly one. Contexts talk through past-tense,
schema-first events, never by importing each other's internals, and
`scripts/check-contexts.sh` fails the build if they do. The glossary is
scoped per context, so the same word can mean two things in two places
and the code in each uses its own. Each context lists its invariants, the
rules that must never be false, and every one becomes a requirement
and a test that tries to break it. Entities vs value objects, repositories,
strategic-pattern names, event-storming workshops: skipped. The `ddd` skill
says why.

Behaviour-driven tests are the spec's scenarios made executable. Every
requirement in a spec carries Given/When/Then scenarios with real
values, one per path including failures, each with an ID like
`REQ-004/S2`. A test is one scenario, named after it, driving the context
through its published interface only. The litmus, from the `bdd` skill:
*could the implementation be rewritten from scratch and this test still
pass unedited?* A test that imports internals, patches inside the context,
or asserts on how something was called fails review. Fakes live at ports
(an in-memory repository, a settable clock); mocks that verify calls are
forbidden. `scripts/check-scenarios.sh` is the coverage metric: every
scenario has a test. It replaces line coverage. Gherkin runners are
optional; the discipline is not.

## Living specs and changes

The specs are not a changelog. `specs/` holds one living document per
capability, and it is the only place that says what the system does now.
Every change, from the first feature to a one-line rule tweak years later, is
the same shape: an intent in your words, a proposal, and a delta that says what
is added, modified or removed in which capability. Until the change ships,
everyone works against a preview of the living spec with the delta applied.
When it ships, the delta is merged in, the capability's version goes up, the
change is archived, and the next change is written against the new truth.

A removed requirement stays in the living spec, struck through, with the change
that removed it. IDs are never reused. A capability's history table lists every
change that shaped it. The first change is not special: it is a delta that is
all ADDED into a capability that does not exist yet, and the merge creates it.

## Why it is shaped this way

The rigour level here is spec-anchored: specs persist as a governing
contract, code stays the maintained artefact, tests are the enforcer. That is
the pragmatic middle of the three levels Martin Fowler's team identified, as
opposed to *spec-first*, where the spec only guides, and *spec-as-source*,
where humans never touch code.

Three deliberate choices:

One change at a time. Kent Beck's objection to SDD is that writing the whole
specification up front "encodes the assumption that you aren't going to learn
anything during implementation that would change the specification." Article IX
answers that directly: implementation is expected to teach us things, and when
it does, the spec is amended. Do not spec forty requirements before building
one.

Something must actually check. A markdown template with a shiny UI is still
a markdown template. The spec only helps if something compares the code to it,
that is `sdd-converge`, run by a reviewer that did not watch the work happen.

Enforcement is by mechanism, not prose. Protected paths, generated files and
the constitution are guarded by a `PreToolUse` hook, not by a list an agent is
asked to remember. Anthropic's guidance: draw the boundary around access and
actions, not around what you believe a model will do.

The evidence on agent instruction files is worth knowing: generic,
LLM-generated `AGENTS.md` files *reduce* task success in most tested settings
and add extra steps. What works is narrow: things an agent could not infer
from the codebase. The test for any line in `AGENTS.md`: *would a competent
developer who had never seen this repo get this wrong?* If no, delete it.

## Alignment with Anthropic's AI-Native SDLC

This template follows the playbook's chain, `intent.md` (your words) →
`spec.md` → `plan.md` → diff → review findings, every stage committing an
artefact the next can read, and its mechanisms: `AGENTS.md` for commands,
conventions, architecture and *things agents get wrong*; skills for
institutional knowledge applied consistently; hooks that draw the boundary
around actions; subagents in `.claude/agents/` for verifiers; `REVIEW.md` as
human-owned review policy.

Deliberate differences: spec and plan stay separate (the playbook merges them)
because the separation is what gives the abstraction ladder its rungs; the
reviewer is pinned to the strongest model. Not yet included: Deploy and
Maintain stages (project-specific), and continuous evals of the agent
configuration. Add 20 to 50 real tasks under `evals/` once a project has history,
and run them in CI on any change to `AGENTS.md`, skills, or hooks.

## Credits

- The gate workflow follows [GitHub Spec Kit](https://github.com/github/spec-kit) (MIT).
- Living specs plus change proposals with delta specs, merged on ship, follow
  [OpenSpec](https://github.com/Fission-AI/OpenSpec).
- `grill` adapts the `grill-me` pattern from
  [mattpocock/skills](https://github.com/mattpocock/skills) (MIT).
- TDD iron law, task anatomy, subagent-driven implementation, systematic
  debugging, finishing a branch: [obra/superpowers](https://github.com/obra/superpowers) (MIT).
- Chain of artefacts, hooks, subagents, `REVIEW.md` and *things agents get
  wrong*: [Anthropic, The AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).
- Artefact format: [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf),
  Google Cloud (Apache-2.0).
- Bounded contexts, ubiquitous language, domain events, invariants: Evans,
  *Domain-Driven Design* (2003); Vernon, *Implementing DDD* (2013). Applied to
  agent codebases per [Golovko, From Prompt Spaghetti to Bounded Contexts](https://gitnation.com/contents/from-prompt-spaghetti-to-bounded-contexts-ddd-for-agentic-codebases).
- Given/When/Then scenarios: North, *Introducing BDD* (2006).
- EARS: Mavin et al., Rolls-Royce, 2009. Popularised for agent work by AWS Kiro.
- `AGENTS.md` is stewarded by the Agentic AI Foundation (Linux Foundation).

## Portability

The skills are plain `SKILL.md` folders, the open Agent Skills standard, read
by Claude Code, Codex, Cursor, VS Code and others. `AGENTS.md` covers the rest.
If you move to another agent, `.claude/settings.json` (permissions and hooks)
and `.claude/agents/` are the only parts that do not travel; the scripts and
artefacts do.
