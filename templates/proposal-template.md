---
type: Change Proposal
title: <Feature name>
description: <one sentence — what is true once this slice is done>
resource: /changes/NNN-slug/proposal.md
status: draft
tags: [sdd, proposal, "change:NNN-slug"]
sources:
  - resource: /changes/NNN-slug/intent.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_id: NNN-slug
sdd_context: <context>
sdd_phase: draft          # draft | in-review | approved | merged
sdd_constitution: 0.1.0
---

# Proposal: <Change name>

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

<Two or three sentences. What is wrong or missing today, for whom, and what it
costs them. Not the solution.>

## Outcome

<What is true once this is done, stated so that we could tell from the outside
whether it happened. One paragraph.>

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| | | |

## Scope

**In scope**
-

**Explicitly out of scope** <!-- the most valuable section in this document -->
-

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | | |
| Affects | | |
| Shares terms | | (from `docs/glossary.md`) |

## Domain

> From `docs/domain.md`. One context per slice. If this slice needs two, stop:
> either it is two slices, or it is an integration slice whose only job is the
> event/interface between them.

- **Context:** `<name>`
- **Nouns touched:** <from the context's Owns column; glossary terms exactly>
- **Events emitted:** `<NounVerbed>` — <when>
- **Events consumed:** `<NounVerbed>` from `<context>` — <what we do with it>
- **Invariants this slice must preserve:** <from the map; each becomes a REQ below>
- **New invariants this slice introduces:** <each becomes a REQ and a row in the map>

## Changes

> Requirements live in the delta files, not here. One row per capability this
> change touches. `sdd-specify` writes the deltas from the intent; this table
> is the map.

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `<context>.<capability>` | `delta/<context>/<capability>.md` | | | | |

## Affects

> Living documents this change modifies, other than the capability specs.
> Each is a gated re-approval at `sdd-finish`, never a silent edit.

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | <new context / event / invariant, or "none"> | |
| `docs/glossary.md` | <new or changed terms, or "none"> | |
| `docs/product.md` | <scope or constraint change, or "none"> | |

## Non-functional requirements

> Only ones with a number in them. "Fast" is not a requirement; "renders in
> under 200 ms at p95 on a cold cache" is. Delete any line you cannot measure.

| Concern | Requirement | How measured |
|---|---|---|
| Performance | | |
| Scale | | |
| Availability | | |
| Security | | |
| Accessibility | | |
| Privacy / data retention | | |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| Empty / zero / first-run state | | |
| Concurrent or duplicate action | | |
| Upstream dependency unavailable | | |
| Malformed or hostile input | | |
| Partial failure mid-operation | | |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
-

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | | | |

## Out of band

<Things a reader would otherwise ask: prior art, related specs, why an obvious
alternative was rejected. Link ADRs in `docs/adr/`.>
