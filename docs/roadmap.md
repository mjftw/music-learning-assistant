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
| 002 | `circle-redesign` | `theory` | `theory.circle-of-fifths` (modifies) | Redesign the circle's visual and interaction language per the Claude Design handoff — distance ring, scale degrees, a names/stave view switch, settings drawer | 001 | building | `changes/002-circle-redesign` |
| 003 | `hear-the-scale` | `practice` | `practice.session` (creates) | Choose traversal (1–2 octaves, up/down, scale or arpeggio) and tempo; the tool plays it within the instrument's range; the learner plays along | 001 | proposed | |
| 004 | `the-drone` | `practice` | `practice.drone` (creates) | Hold a drone on any note for wind pitching and string tuning | 001 | proposed | |
| 005 | `hear-me` | `listening` | `listening.pitch-detection` (creates) | Live pitch readout — sharp/flat in cents, inside the latency budget — useful alone as a tuner | — | proposed | |
| 006 | `learner-leads` | `practice` | `practice.session` (modifies) | The tool shows the target note, listens, and advances when it is held in tune for the required duration | 003, 005 | proposed | |
| 007 | `temperament` | `theory` | `theory.temperament` (creates), `practice.session` (modifies) | Choose just vs equal temperament for playback and drone | 003, 004 | proposed | |
| 008 | `teach-me` | `theory` | `theory.explanations` (creates) | Tooltips that explain the theory behind whatever is on screen | 001 | proposed | |

## Why this order

001 proves the theory model and gives an immediately useful thing — an
interactive circle of fifths that replaces the paper one on the stand —
before any sound exists. 002 fixes the visual/interaction language while it
is still the only screen in the app, before more UI is built on top of the
same patterns. 003 turns it into the core play-along loop. 005 comes early
despite only being *needed* by 006, because live pitch detection is the
project's riskiest unknown (Article V's latency budget) and it is
independently useful as a tuner; building it early de-risks everything after
it. 004 is a small quick win on the way.

## Cut line

Below 006. Tool-leads (003), learner-leads (006) and the tuner (005) are the
product as described; temperament (007) and tooltips (008) are enrichment.
002 sits above the line: it is corrective (the shipped UI as-is is unusable
by the user's own verdict), not enrichment.

## Deferred

- Per-instrument fingerings — useful in time, explicitly not needed now
  (decision, 2026-09-19).

## Shipped

| # | Change | Capability | Version after | Shipped |
|---|---|---|---|---|
| 001 | `the-circle` | `theory.circle-of-fifths`, `theory.instruments` | v0.1.0 each | 2026-09-20 |
