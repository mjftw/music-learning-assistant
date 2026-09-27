---
type: Skill
name: grill
description: Interview the user relentlessly about a plan, feature or design until shared understanding is reached, resolving each branch of the decision tree. Use when the user says "grill me", "grill", "interrogate this", "stress-test this plan", "poke holes in this", or when starting a feature whose requirements are not yet pinned down. Writes the slice's intent.md; no code.
model: fable
---

# Grilling

Requirements that were never specified — not models that cannot write code — are
the cause of most AI coding failures. This skill exists to surface them in
conversation, where fixing one costs seconds, rather than in the implementation,
where it costs hours.

Adapted from the `grill-me` pattern (Matt Pocock, MIT). Credit in
`docs/sdd-guide.md`.


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter grill`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## The shape of it

Treat the subject as a **tree of decisions, not a single prompt**. Resolve
upstream choices before downstream ones, because an upstream answer often
deletes whole branches below it.

Loop until done:

1. **Look before you ask.** If the answer is discoverable — in the codebase,
   `docs/decisions.md`, `docs/product.md`, `docs/domain.md`, `docs/glossary.md`,
   the constitution,
   a prior spec, package manifests — go and read it. Say what you found. Never
   spend a question on something you could have looked up.
2. **Ask the questions whose prerequisites are already settled.** Not everything
   at once — only what is currently answerable.
3. **Recommend an answer for every question.** State your pick and the one-line
   reason. The user should be reviewing a draft, not filling in a blank form.
   This is what makes the session fast: they can say "yes to all of those".
4. **Push on weak answers.** This is relentless, not collaborative-to-a-fault.
   "I'll handle that later", "it should just work", "standard stuff" — those are
   unresolved branches. Say so and ask again, more concretely.
5. **Accept "I don't know".** It is a real answer. A question the user cannot
   answer is usually a signal to prototype rather than to guess — record it as
   an assumption or an open question and move on.
6. **Stop when the tree is resolved.**

Ask **one question at a time** unless the user asks for batches.

## What to grill on

Work down this list; skip what genuinely does not apply, and say you are
skipping it.

**Purpose** — What breaks if we do not build this? Who complains today? What do
they do instead right now? How will we know it worked?

**Context and capability** — Which bounded context in `docs/domain.md` owns
this, and which capability under `specs/<context>/`? Read the living spec
first: half the questions below may already be answered by what is true
today, and a change to existing behaviour must be framed as what it
*modifies* or *removes*, not as a fresh feature. Recommend a context. If the honest answer is "two", say so: it is
either two slices or an integration slice whose only job is the event or
interface between them — ask which. Which nouns from the context's Owns
column does this touch? Which events does it emit or consume? Which
invariants could it violate?

**Boundaries** — What is explicitly *not* in this? What is the smallest version
that is still useful? What would we cut first under time pressure?

**Actors** — Who uses it? Who administers it? Who does it affect who never
touches it?

**Data** — What is stored? Who owns it? What is the source of truth? What
happens on conflicting writes? Is any of it personal data, and what is the
retention rule? Can any of it be deleted, and does deleting it break anything?

**States** — First run, empty, one item, ten thousand items, loading, stale,
offline, partially failed, mid-migration. Take each in turn.

**Failure** — What happens when the dependency is down? On duplicate submission?
On malformed input? On hostile input? Mid-operation crash — is the result a
consistent state? Who finds out, and how?

**Boring realities** — Auth and who can see what. Timezones and daylight
saving. Money and rounding. Unicode, long strings, empty strings. Concurrency.
Idempotency of anything retryable. Rate limits. Clock skew.

**Scale and shape** — How many, how often, how big, growing how fast? What is
the p95 that would make someone complain?

**Lifecycle** — How does it get deployed, configured, observed, backed up, and
turned off? What does "reversible" mean here?

**Done** — What is the acceptance test? Who signs it off? What is deliberately
left for later, and is that written down?

Never ask which language, framework, database or host. Those are plan
decisions. If the user raises one, record it as a stated preference under
`## Constraints` and return to behaviour.

## Output — `intent.md`

Every answer the user gives is the most expensive thing in this repository to
obtain. It is recorded as you go, not reconstructed at the end.

Before the first question, for a slice, create it if it does not exist
(`./scripts/new-change.sh <slug>`) and open `changes/NNN-slug/intent.md`. For
the product, copy `templates/intent-template.md` to `docs/intent-product.md`
and set its `resource` and `title` (see "Product-level grilling" below). As
each question resolves, append to `## Interview record` in the template's
`Q / Recommended / Answer / Status` shape. Fill `## Problem`, `## Proposed
outcome`, `## Affected users and systems`, `## Constraints` in the user's
words as they emerge. Set `title`, `description`, and `generated.by` /
`generated.at` with `./scripts/fm.py set`. Set `sdd_context` on `intent.md`
once the context is decided — `new-change.sh` cannot know it.

## Product-level grilling

`sdd-init` Step 2 runs this skill before any structured question, on the
product as a whole. The output is `docs/intent-product.md` (`type: Intent`,
`resource: /docs/intent-product.md`, no `sdd_id`), in the same shape as a
slice intent.

The list under "What to grill on" is for a slice and is mostly wrong here.
Product-level questions are wider and looser, and the first few should be
open. Work down this instead:

**The itch** — What are you trying to achieve? Not the product: the outcome.
What is annoying, slow, impossible or expensive today? Who feels it? What
happens if nothing changes?

**The picture in your head** — Describe it as if it existed. What does
someone do with it on a Tuesday? What is the first thing they see? What is
the last thing before they close it?

**Why now, why you** — What changed that makes this worth doing now? Have
you tried something before? What exists that nearly does this, and why is it
not enough?

**Who** — Who uses it, who runs it, who pays for it, who is affected without
touching it? Which of those is *you*?

**Edges** — What is definitely not this? What would make you say "that's a
different product"? What would you cut first?

**Done** — What would you show someone to prove it works? What would make
you abandon it?

**Forces** — Anything already imposed: where it has to run, where data may
live, what it has to talk to, when it needs to exist by, what it must cost.
Only what is imposed. If the user starts choosing technology here, record it
as their stated preference under Constraints and move on; do not follow it
up. The stack is chosen at the first plan.

**Worries** — What are you most unsure about? What do you expect to be hard?
What would you least like to be wrong about?

Push on the same things: "it should just work", "standard stuff", "the usual
users". Recommend an answer to every question. Accept "I don't know" and
record it. Stop when you could write the one-sentence description yourself
and the user would not correct it.

For any other project-level grilling (a big decision, a direction change),
write `docs/intent-<topic>.md` the same way.

At the end of every grilling session that does not resolve the tree,
`./scripts/draft.sh changes/NNN-slug/intent.md` so the partial interview is in
git and survives a lost session.

When the tree is resolved:

1. Fill `## Resolved`, `## Assumptions carried`, `## Still open`,
   `## Riskiest unknown`.
2. Show those four sections to the user. When they confirm the record is
   right: `./scripts/approve.sh changes/NNN-slug/intent.md resolved`, then
   `./scripts/index.sh`.
3. Append every `decided` item to `docs/decisions.md` as
   `<date> · NNN-slug · <decision> · <why>`.
4. Add the change to `docs/roadmap.md` if it is not there; set its row's status
   to `grilling` (`sdd-specify` moves it on).
5. Commit: `docs(intent): NNN-slug`.
6. Ask whether to proceed to `sdd-specify`.

Before asking **any** question, read `docs/decisions.md`, `docs/product.md`,
`docs/domain.md`, `docs/glossary.md`, and any existing `intent.md` for this
slice. A recorded
decision is never re-asked. If you believe one is wrong, say so once with your
reason, then follow it (Article I).

## Do not

- Produce a plan, a spec, or code. Inquiry is the whole job; the only file you
  write is `intent.md`.
- Accept the first answer to a question that matters.
- Ask a question you could have answered by reading the repository.
- Ask more than one question at a time (unless told to).
- Ask a question without offering your recommended answer.
