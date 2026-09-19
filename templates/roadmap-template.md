---
type: Roadmap
title: Roadmap — vertical slices
description: The vertical slices of this project, in build order, with status.
resource: /docs/roadmap.md
status: draft
tags: [sdd, roadmap]
sources:
  - resource: conversation:YYYY-MM-DD
  - resource: /docs/product.md
  - resource: /docs/domain.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_phase: draft          # draft | approved
---

# Roadmap — changes

> Each change is a thin vertical slice: end-to-end and demonstrably useful on
> its own. Changes
> are not layers ("database", "API", "UI"); they are outcomes ("a reading can
> be recorded and seen"). Order is the build order. Status is the single place
> to look for where the project is.
>
> Statuses: `proposed` → `grilling` → `specified` → `planned` → `building` →
> `converged` → `shipped` · `deferred` · `dropped`. A shipped change moves to
> the table at the bottom so this one stays short.

| # | Change | Context | Capability (creates / modifies) | Outcome (one line) | Depends on | Status | Dir |
|---|---|---|---|---|---|---|---|
| 1 | | `<ctx>` | `<ctx>.<cap>` (creates) | | — | proposed | |
| 2 | | `<ctx>` | `<ctx>.<cap>` (modifies) | | 1 | proposed | |

## Why this order

<One paragraph. What slice 1 proves, and why it comes first.>

## Cut line

<If time halves, everything below this line is dropped. Name the line.>

## Deferred

- <slice> — <why not now>

## Shipped

| # | Change | Capability | Version after | Shipped |
|---|---|---|---|---|
