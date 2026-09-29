---
type: Roadmap
title: Roadmap — vertical slices
description: The vertical slices of this project, in build order, with status.
resource: /docs/roadmap.md
status: stable
tags: [sdd, roadmap]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/product.md
  - resource: /docs/domain.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T17:25:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:46:01Z
  - by: human:merlin-webster
    at: 2026-09-19T16:25:07Z
  - by: human:merlin-webster
    at: 2026-09-20T18:54:28Z
  - by: human:merlin-webster
    at: 2026-09-20T19:14:01Z
  - by: human:merlin-webster
    at: 2026-09-22T16:33:44Z
  - by: human:merlin-webster
    at: 2026-09-29T22:21:12Z
sdd_phase: approved
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
| 008 | `learner-leads` | `practice` | `practice.session` (modifies) | The tool shows the target note, listens, and advances when it is held in tune for the required duration | 003, 007 | proposed | |
| 009 | `temperament` | `theory` | `theory.temperament` (modifies), `practice.session` (modifies) | Choose just vs equal temperament for playback and drone | 003, 004 | proposed | |
| 010 | `teach-me` | `theory` | `theory.explanations` (creates) | Tooltips that explain the theory behind whatever is on screen | 001 | proposed | |

## Why this order

001 proves the theory model and gives an immediately useful thing — an
interactive circle of fifths that replaces the paper one on the stand —
before any sound exists. 002 fixes the visual/interaction language while it
is still the only screen in the app, before more UI is built on top of the
same patterns. 003 turns it into the core play-along loop. 007 comes early
despite only being *needed* by 008, because live pitch detection is the
project's riskiest unknown (Article V's latency budget) and it is
independently useful as a tuner; building it early de-risks everything after
it. 004 is a small quick win on the way.

## Cut line

Below 008. Tool-leads (003), learner-leads (008) and the tuner (007) are the
product as described; temperament (009) and tooltips (010) are enrichment.
002 sits above the line: it is corrective (the shipped UI as-is is unusable
by the user's own verdict), not enrichment. 005 (and its acceptance fixes, 006) jumps the queue ahead of
004 and 007–010: it is a direct continuation of 003's scale player, needs no
new audio-boundary or theory-model risk, and does not depend on the drone,
the tuner or learner-leads.

## Deferred

- Per-instrument fingerings — useful in time, explicitly not needed now
  (decision, 2026-09-19).

## Shipped

| # | Change | Capability | Version after | Shipped |
|---|---|---|---|---|
| 001 | `the-circle` | `theory.circle-of-fifths`, `theory.instruments` | v0.1.0 each | 2026-09-20 |
| 002 | `circle-redesign` | `theory.circle-of-fifths` | v0.2.0 | 2026-09-22 |
| 003 | `hear-the-scale` | `practice.session` (new), `theory.temperament` (new), `theory.circle-of-fifths` | v0.1.0, v0.1.0, v1.0.0 | 2026-09-23 |
| 005 | `scale-selection` | `practice.session`, `theory.circle-of-fifths` | v0.2.0, v1.1.0 | 2026-09-24 |
| 006 | `scale-selection-acceptance-fixes` | `practice.session`, `theory.circle-of-fifths` | v0.3.0, v1.2.0 | 2026-09-24 |
| 004 | `the-drone` | `practice.drone` (new), `practice.session` | v0.1.0, v0.4.0 | 2026-09-26 |
| 007 | `hear-me` | `listening.pitch-detection` (new), `practice.tuner` (new), `theory.temperament` | v0.1.0, v0.1.0, v0.2.0 | 2026-09-29 — shipped with convergence round 2 open by the user's decision: T040–T045 in `changes/archive/007-hear-me/tasks.md` carry forward |
