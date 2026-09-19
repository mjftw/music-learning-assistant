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
sdd_phase: approved
---

# Roadmap — vertical slices

> Each slice is thin, end-to-end, and demonstrably useful on its own. Slices
> are not layers ("database", "API", "UI"); they are outcomes ("a reading can
> be recorded and seen"). Order is the build order. Status is the single place
> to look for where the project is.
>
> Statuses: `proposed` → `grilling` → `specified` → `planned` → `building` →
> `converged` → `shipped` · `deferred` · `dropped`

| # | Slice | Context | Outcome (one line) | Depends on | Status | Spec |
|---|---|---|---|---|---|---|
| 001 | `the-circle` | `theory` | An interactive circle of fifths: pick a key and instrument, see the scale on a stave with note names and which accidental is new — replaces the paper circle on the stand | — | grilling | |
| 002 | `hear-the-scale` | `practice` | Choose traversal (1–2 octaves, up/down, scale or arpeggio) and tempo; the tool plays it within the instrument's range; the learner plays along | 001 | proposed | |
| 003 | `the-drone` | `practice` | Hold a drone on any note for wind pitching and string tuning | 001 | proposed | |
| 004 | `hear-me` | `listening` | Live pitch readout — sharp/flat in cents, inside the latency budget — useful alone as a tuner | — | proposed | |
| 005 | `learner-leads` | `practice` | The tool shows the target note, listens, and advances when it is nailed for the required duration | 002, 004 | proposed | |
| 006 | `temperament` | `theory` | Choose just vs equal temperament for playback and drone | 002, 003 | proposed | |
| 007 | `teach-me` | `theory` | Tooltips that explain the theory behind whatever is on screen | 001 | proposed | |

## Why this order

001 proves the theory model and gives an immediately useful thing — an
interactive circle of fifths that replaces the paper one on the stand —
before any sound exists. 002 turns it into the core play-along loop. 004
comes early despite only being *needed* by 005, because live pitch detection
is the project's riskiest unknown (Article V's latency budget) and it is
independently useful as a tuner; building it early de-risks everything after
it. 003 is a small quick win on the way.

## Cut line

Below 005. Tool-leads (002), learner-leads (005) and the tuner (004) are the
product as described; temperament (006) and tooltips (007) are enrichment.

## Deferred

- Per-instrument fingerings — useful in time, explicitly not needed now
  (decision, 2026-09-19).
