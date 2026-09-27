---
type: Skill
name: sdd-init
description: Onboard a fresh repository created from the starter — brainstorm what the product is, then product brief, domain map of bounded contexts, constitution, roadmap of changes, glossary — before any change is specified. Use on a new project, when docs/product.md is missing or still a template, or when the user says "init", "set up the project", "new project", "let's start", or describes an app they want to build and no specs exist yet.
model: fable
---

# Init — the opening interviews

Runs once, on a new repository. It captures what the project *is* before any
change is specified. Everything written here is what every later phase reads
first, so these are the highest-leverage questions in the whole workflow.

You are mining the user. They hold the picture; you hold the questions. Every
answer is recorded in their words. Nothing is inferred. Article I.


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter sdd-init`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## The one rule about order

**Nothing about technology until a plan is being written.** Not the language,
not the framework, not the database, not the hosting. Every step below is
about what the product is, who it is for, how it divides, and what must never
be false. The first time a technology question is legitimate is `sdd-plan` for
the first change, and even then it is answered from the constraints recorded
here, not before them.

If the user volunteers a technology ("it'll be in Rust"), record it under
`## Constraints` in the intent as *stated by the user*, and move on. Do not
follow it up here.

## The interview record

Every question this skill asks is written to `docs/interviews/init.md`
(from `templates/interview-template.md`; create it on the first question,
`sdd_phase: open`) as it is asked and answered: the question, the
recommendation you offered, the user's answer in their words, and where in
the artefact it landed. Questions you decided not to ask go under `## Not
asked` with the reason. When the gate passes, set `sdd_phase: closed` and
commit the record with the artefact. The artefact is the summary; the
record is why it says what it says.

## Step 1 — Mechanical setup

If `README.md` is still the template's own (its first line is
`<!-- sdd-starter-template -->`), ask for the project name and a one-line
description, then run:

    ./scripts/init.sh "<name>" "<one line>"

That is the only question in this step.

## Step 2 — Brainstorm → `docs/intent-product.md`

Most products arrive half-formed. Before any structured questions, run
`grill` at product level (its "Product-level grilling" section). The point is
to let the user think out loud with someone pushing back, and to capture
what they say in their own words. It writes `docs/intent-product.md`
(`type: Intent`) as it goes, and ends with the resolved / assumptions / open /
riskiest-unknown summary.

Do not skip this because the user seems clear. A clear user finishes it in ten
minutes; an unclear one needed it.

## Step 3 — Product brief → `docs/product.md`

**Derived from the intent, not asked from scratch.** Read
`docs/intent-product.md` and draft every section of `docs/product.md` from
it. Then go through the sections the intent did not cover, one question at a
time, recommended answer attached:

- What is this, in one sentence a stranger would understand?
- Who is it for, specifically, and who is it *not* for?
- What do they do today instead, and what does that cost them?
- What must be true for you to call version one a success?
- What is out of scope for the whole project, not just v1?
- What constraints are *imposed* on you before we write anything: where it
  must run, where data may live, what it must integrate with, licensing,
  deadline? Only what is imposed. Anything you are free to choose is left
  blank and chosen in the plan.
- How does a change reach users, who is on the hook when it breaks, and what
  would make you abandon the project?

Fill `title` and `description` in the frontmatter, set `generated.by` to
`claude-code/<your model id, or unknown>` and `generated.at` to now
(`./scripts/fm.py set`), and add `/docs/intent-product.md` to `sources`.

**Gate**: `./scripts/draft.sh docs/product.md`, show it in full;
`AskUserQuestion`: *Approve* / *Revise* (draft again after each revision). On
approval `./scripts/approve.sh docs/product.md approved`, then
`./scripts/index.sh`, and append each decision to `docs/decisions.md` as
`<date> · init · <decision> · <why>`.

## Step 3b — Interface → `docs/design.md` §1–§6

Hand to `sdd-design` entry point **A**. One question decides whether the
product has an interface at all; if it does, five more capture where it is
used, its tone, density, conventions and accessibility floor, in the user's
words. No colours, fonts or component libraries: those are asked at the
first plan. If there is no interface, `docs/design.md` records that and
every later change skips design automatically.

## Step 4 — Domain discovery → `docs/domain.md`

Read the `ddd` skill. Then, from the product brief, propose a first cut of
bounded contexts and interrogate it, one question at a time, recommended
answer attached:

1. **Nouns.** List every noun in the brief. Group the ones that change
   together and are described by the same people. Each group is a candidate
   context. Ask: "Does *<noun>* mean the same thing everywhere, or does it
   mean something different to <group A> than to <group B>?" A different
   meaning is a context boundary.
2. **Verbs → events.** For each context, what happens that other parts of the
   product need to know about? Name each as a past-tense fact in that
   context's words. Ask: "When <event>, who needs to know, and what do they
   need from it?"
3. **Rules.** For each context: "What must never be true? What would be a
   bug in the data, not just in the code?" Each answer is an invariant.
4. **Roots.** Propose a code root per context (`src/<name>/`). Confirm.
5. **Shared.** Anything that genuinely must be identical across contexts.
   Push back on each one.

Write the file. Three to seven contexts is normal; one is fine for a small
product. Fill `title`, `description`, `generated.*` with `fm.py set`.

**Gate**: `./scripts/draft.sh docs/domain.md`, show it in full; *Approve* /
*Revise* / *Merge two contexts* / *Split one* (draft again after each
revision). On approval `./scripts/approve.sh docs/domain.md approved`,
`./scripts/index.sh`, append decisions.

## Step 5 — Constitution

Hand to `sdd-constitution`. Return here when it is ratified. The candidates
it offers for Articles V–VII should be drawn from the product brief's
constraints (data sovereignty, hosting, regulation) before generic ones.

## Step 6 — Roadmap → `docs/roadmap.md`

Decompose the product into **changes**, each a thin vertical slice: end-to-end,
and demonstrably useful alone. Not layers ("database", "API", "UI") — outcomes
("a reading can be recorded and seen").

Propose a first cut of 3–8 changes, ordered, one-line outcome each, **the
context each belongs to**, and the dependencies between them. Then interrogate
it with the user, one question at a time:

- Is change 1 the smallest thing that is still useful to you?
- Which change would you cut if you had half the time? (That is the cut line.)
- Does any change depend on a decision we have not made?
- Is anything here really two changes? Really none?
- Does any change span two contexts? Then it is two changes, or an integration
  change.
- Which capability does each change create or modify? Name it
  (`<context>.<capability>`); the first changes create capabilities, later ones
  modify them.

Write the file with every change `proposed`. **Gate**:
`./scripts/draft.sh docs/roadmap.md`; *Approve* / *Revise* / *Re-order*. On approval `./scripts/approve.sh docs/roadmap.md approved`, then
`./scripts/index.sh`; append decisions.

## Step 7 — Glossary → `docs/glossary.md`

List the nouns that appeared in Steps 2–6. For each, ask which context it
belongs to and for the definition the *user* uses in that context, and what it
must not be confused with. Specs and code will use these terms exactly.
Write the file. **Gate**: `./scripts/draft.sh docs/glossary.md`; *Approve* /
*Revise*, then `./scripts/approve.sh docs/glossary.md approved` and
`./scripts/index.sh`.

## Step 8 — Hand off

`./scripts/fm.py set docs/interviews/init.md sdd_phase closed`. Commit:
`docs(init): intent, product brief, design principles, domain, roadmap,
glossary, interview record`.
Then `./scripts/phase.sh leave`: init is over, and the next phase opens its
own when the user starts it.

Summarise in five lines: the product in one sentence; N contexts; N changes and
which is first; the riskiest assumption; the open questions. Then offer to
start change 1 with `grill`.

Say explicitly: *engineering preferences, the stack, and the design system
(tokens, components) are chosen at the first plan, from what we recorded
today.* If `docs/engineering.md` was copied in by
`init.sh` from a master, say that too, in one line.

## Rules

- One question at a time. A recommendation on every question.
- Read `docs/decisions.md` before asking anything. Never re-ask a recorded
  decision.
- No technology questions. See the rule at the top.
- Do not write a spec, a plan, or code in this phase.
- Do not fill a section with a plausible guess. Empty-and-marked-open beats
  full-and-wrong.
- Accept "I don't know". Record it as open or as an assumption with its risk.
