---
type: Skill
name: sdd-init
description: Onboard a fresh repository created from the starter — brainstorm what the product is, then product brief, domain map of bounded contexts, constitution, roadmap of changes, glossary — before any change is specified. Use on a new project, when docs/product.md is missing or still a template, or when the user says "init", "set up the project", "new project", "let's start", or describes an app they want to build and no specs exist yet.
---

# Init — the opening interviews

Runs once, on a new repository. It captures what the project *is* before any
change is specified. Everything written here is what every later phase reads
first, so these are the highest-leverage questions in the whole workflow.

**Run this on the strongest model available.** If you have reason to think you
are not it, say so once before starting.

You are mining the user. They hold the picture; you hold the questions. Every
answer is recorded in their words. Nothing is inferred. Article I.

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

**Gate**: show it in full; `AskUserQuestion`: *Approve* / *Revise*. On
approval `./scripts/approve.sh docs/product.md approved`, then
`./scripts/index.sh`, and append each decision to `docs/decisions.md` as
`<date> · init · <decision> · <why>`.

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

**Gate**: show it in full; *Approve* / *Revise* / *Merge two contexts* /
*Split one*. On approval `./scripts/approve.sh docs/domain.md approved`,
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

Write the file with every change `proposed`. **Gate**: *Approve* / *Revise* /
*Re-order*. On approval `./scripts/approve.sh docs/roadmap.md approved`, then
`./scripts/index.sh`; append decisions.

## Step 7 — Glossary → `docs/glossary.md`

List the nouns that appeared in Steps 2–6. For each, ask which context it
belongs to and for the definition the *user* uses in that context, and what it
must not be confused with. Specs and code will use these terms exactly.
Write the file. **Gate**: *Approve* / *Revise*, then
`./scripts/approve.sh docs/glossary.md approved` and `./scripts/index.sh`.

## Step 8 — Hand off

Commit: `docs(init): intent, product brief, domain, roadmap, glossary`.

Summarise in five lines: the product in one sentence; N contexts; N changes and
which is first; the riskiest assumption; the open questions. Then offer to
start change 1 with `grill`.

Say explicitly: *engineering preferences and the stack are chosen at the first
plan, from what we recorded today.* If `docs/engineering.md` was copied in by
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
