---
type: Implementation Plan
title: <Feature name> — plan
description: <one sentence — the approach>
resource: /changes/NNN-slug/plan.md
status: draft
tags: [sdd, plan, "change:NNN-slug"]
sources:
  - resource: /changes/NNN-slug/proposal.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_id: NNN-slug
sdd_context: <context>
sdd_phase: draft          # draft | in-review | approved
---

# Plan: <Feature name>

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | | |
| II — spec precedes implementation | | |
| III — testable requirements | | |
| IV — separate verification | | |
| VIII — simplicity | | |

> If any row reads "does not comply", stop. Either change the plan or propose an
> amendment. Do not proceed on a noted exception.

## Engineering preferences check

> `docs/engineering.md`, section by section. "Follows" or the departure and
> its reason. A departure is an open question for the user, not a decision.

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | | |
| 3 Types | | |
| 4 Errors | | |
| 6 Architecture | | |
| 7 Testing | | |
| 8 Data and interfaces | | |
| 9 Dependencies | | |
| 14 Tooling | | |

## Approach

<One paragraph: the shape of the solution. A reader should be able to predict
the file list from this paragraph.>

### Alternatives rejected

| Option | Why not |
|---|---|
| | |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | | | |
| Framework | | | |
| Data store | | | |
| Testing | | | |
| Build / tooling | | | |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|

## Data model

<Entities, fields, types, relationships, constraints. Include the migration
strategy if this changes existing data. Say what is indexed and why.>

## Interfaces

<Public surface: endpoints, function signatures, events, CLI commands, message
schemas. Include error shapes — an interface without its failure responses is
half-specified.>

Events this slice emits or consumes are listed with their schema path. A
consumed event from another context is translated into this context's own types
at the adapter — never used raw inside the domain.

## Structure

> Mirrors `docs/domain.md`. Everything this slice adds lives under its
> context's code root. Anything another context may use goes under
> `published/` (the context's interface and event schemas); everything else is
> internal and `scripts/check-contexts.sh` will fail a cross-context import of
> it. Inside the root, ports & adapters per engineering §6: pure domain, ports
> as interfaces, adapters at the edge.

```
src/<context>/
  published/        ← interface + event schemas other contexts may depend on
  domain/           ← pure: the nouns, the invariants, no IO
  ports/            ← interfaces the domain needs (repo, clock, bus…)
  adapters/         ← implementations of ports; translation from other contexts' events
tests/<context>/
  scenarios/        ← one test per spec scenario, through the published interface or driving port
  invariants/       ← property/invariant tests
```

## Requirement → design mapping

> Every requirement in the spec appears here exactly once. A requirement with no
> row is unimplemented; a row with no requirement is scope creep.

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| <context>.<capability>/REQ-001 | | |

## Test strategy

- **Unit:** <what, and what is deliberately not unit-tested>
- **Integration:** <the seams that actually break>
- **End-to-end:** <the user journeys from the spec>
- **Not tested, and why:** <be explicit; this is a decision, not an omission>

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|

## Rollout

<Migration, feature flag, backfill, reversibility. How we turn it off if it goes
wrong. If it cannot be turned off, say so — that is a risk above.>

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
