---
type: Skill
name: sdd-plan
description: Turn an approved spec into a technical implementation plan in changes/NNN-slug/plan.md — stack, data model, interfaces, file structure, test strategy, risks and rollout. Use after a spec is approved, or when the user says "plan this", "write the plan", "how should we build it", or asks for architecture or technology choices for a specced feature.
---

# Plan

Produce `changes/NNN-slug/plan.md`: everything the spec deliberately excluded.
This is where technology lives, and **every choice names its alternative and its
reason**.

## Before writing

1. Read the approved `proposal.md` and every delta under `delta/` in full. If
   the proposal's `sdd_phase` is not `approved`, stop — the plan cannot be
   trusted against a moving proposal. Then run
   `./scripts/merge_delta.py preview changes/NNN-slug` and read the target
   state of each capability touched: the plan is for what the capability must
   do *after* the change.
2. Read `memory/constitution.md`. The compliance table is not a formality: if
   the plan cannot comply, either change the plan or propose an amendment, but do
   not proceed on a noted exception.
3. Read `templates/plan-template.md`.
4. Survey the existing codebase before choosing anything. Grounding the plan in
   what is already here is what stops it drifting toward whatever the model would
   pick by default. If the repo is empty, say so — greenfield is a different
   decision space and the constraints are the user's preferences, not precedent.
5. Read `AGENTS.md` Commands / Conventions / Architecture. If they still say
   `FILL THIS IN`, establishing the real values is part of this plan's output.
6. Read `docs/domain.md` and the `ddd` skill. The plan's Structure mirrors the
   slice's context root; anything other contexts may use goes under
   `published/`; consumed events are translated at an adapter.
7. **If `docs/engineering.md` is missing or its `sdd_phase` is not
   `approved`, run `sdd-engineering` now.** This is the first moment in a
   project that needs to know how code is written, which is why the
   interview lives here and not in `sdd-init`. Then read `docs/engineering.md`. Every stack, testing, error-handling and
   architecture choice in the plan follows it. Where the plan must depart (the
   preference does not fit this problem), name the section and the reason under
   `## Open questions` — the user decides, not the plan.

## Choosing the stack

This is the first artefact in the project that names a technology, and the
choice is made *here*, from evidence, in this order:

1. The imposed constraints in `docs/product.md` (where it must run, where
   data may live, what it must integrate with, deadline). These are not
   negotiable.
2. The non-functional requirements in `spec.md` (the ones with numbers).
3. The domain map: what each context needs (a stream processor, a native
   client, a batch job) may differ per context.
4. `docs/engineering.md` §1 and §14: what the user reaches for. An input,
   not a verdict. Departing from it needs a stated reason in the Open
   questions; following it needs none.
5. What the repository already uses, if anything.

Say in the Approach paragraph which of these drove the choice. A stack chosen
from familiarity alone, with 1–3 unexamined, is the plan not doing its job.

## Writing the plan

Work through the template. The sections that carry the weight:

**Approach** — one paragraph, written so the file list is predictable from it.
Then the rejected alternatives, with reasons. A plan with no rejected
alternatives has not been thought about.

**Stack** — every row names the version and why this rather than the obvious
alternative. New dependencies need a line each justifying them against
Article VIII. Prefer the standard library; prefer what the repo already uses;
prefer boring.

**Data model** — entities, fields, types, constraints, indexes and why they are
indexed. If existing data changes shape, the migration strategy belongs here,
including how it is reversed.

**Interfaces** — the public surface, *including error shapes*. An interface
without its failure responses is half-specified and will be guessed at later.

**Events** — every event this change emits or consumes, with its schema path.
Emitted events are named in this context's language, past tense, and their
schema lives under `published/`. If a consumed event's shape leaks past the
adapter into domain code, the plan is wrong.

**Requirement → design mapping** — every ADDED or MODIFIED requirement from
the deltas, cited as `<context>.<capability>/REQ-NNN`, appears
exactly once. A requirement with no row is unimplemented. A row with no
requirement is scope creep — delete it or go back to the spec.

**Test strategy** — including what is deliberately not tested and why. That is a
decision; leaving it unstated makes it look like an omission.

**Risks** and **Rollout** — how this is turned off if it goes wrong. If it
cannot be turned off, that is itself the top risk.

## The discipline

- **Do not restate requirements.** The spec owns what; the plan owns how. If a
  paragraph would be equally true of a different implementation, it belongs in
  the spec, not here.
- **Do not add scope.** If the plan needs something the spec does not cover, that
  is a spec amendment with its own gate — raise it, do not absorb it.
- **Do not choose by familiarity.** Name the alternative you rejected. If you
  cannot name one, you have not chosen.
- **Prefer fewer moving parts.** Every dependency, service and layer is a thing
  that fails at 3am. Article VIII.
- **Record decisions worth outliving the feature as ADRs** in `docs/adr/` —
  `NNNN-short-title.md`, with context, decision, consequences. Anything a future
  reader would otherwise reverse without knowing why.
- Where a choice is genuinely close, do not pick silently. Put it in Open
  questions with your recommendation and let the user decide.

## Gate

Write the file, then report in at most five lines:

- The approach in one sentence
- The choices most likely to be wrong, and the alternative for each
- New dependencies added
- Any departure from `docs/engineering.md`, by section
- Open questions, numbered
- Anything in the spec this plan cannot satisfy

Then `AskUserQuestion`: *Approve*, *Revise*, *Change a specific choice*,
*Answer open questions first*.

On approval:

- update `AGENTS.md` Commands / Conventions / Architecture with the real values
  (wrap the whole verification in one command where possible, and paste an
  example of healthy output)
- fill `scripts/hooks/post-edit.sh` with the project formatter
- tune `scripts/check-contexts.sh` (`PUBLISHED`, `IMPORT_RE`) to the chosen
  stack if the defaults do not fit it
- if this change introduces a context, event or invariant not yet in
  `docs/domain.md`, propose the map change and, once the user agrees,
  `./scripts/approve.sh docs/domain.md approved`
- `./scripts/approve.sh changes/NNN-slug/plan.md approved`
- set the change's `docs/roadmap.md` status to `planned`
- `./scripts/index.sh`
- commit `docs(plan): NNN-slug`, then hand to `sdd-tasks`.

**Do not write implementation code in this turn.**
