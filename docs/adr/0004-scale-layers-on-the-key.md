---
type: Architecture Decision Record
title: ADR 0004 — A chosen scale layers on the key; the key keeps the circle's meaning
description: Key.mode still means "which ring"; the scale catalogue is a separate theory value that only the note-producing functions take, so the circle, signature and ring code never learn about scales.
resource: /docs/adr/0004-scale-layers-on-the-key.md
status: stable
tags: [sdd, adr, theory, "change:005-scale-selection"]
sources:
  - resource: /changes/005-scale-selection/plan.md
  - resource: /changes/005-scale-selection/intent.md
generated:
  by: claude-fable-5-1
  at: 2026-09-23T22:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T23:06:37Z
sdd_phase: accepted
---

# ADR 0004: A chosen scale layers on the key; the key keeps the circle's meaning

## Context

Until 005, `Key = { tonic, mode: "major" | "naturalMinor" }` did two jobs at
once: it named a position on the circle of fifths (which drives the
signature, the relative key, the distance ring, the wedge label and the
enharmonic respelling — `theory.circle-of-fifths` REQ-001/002/004/009/010)
and it named the scale the tool played (`scaleNotesOf(key)`, the stave, the
names view, the run). 005 adds sixteen scale types rooted on any tonic.
The obvious refactor — widen `mode` to the sixteen scales — would make
every circle-facing function ask "which of these sixteen is on the ring",
when the intent (Q2) decided the circle, ring and printed signature never
change with the scale: G Lydian is drawn as G major's wedge with G major's
one sharp, and the raised 4th is an inline accidental.

## Decision

We keep `Key` exactly as it is, meaning *the selected ring position*, and
add `Scale` as a separate `theory` value from a catalogue. Only the
functions that produce **notes** take a scale: `keyView(key, variant,
scale)`, `traversalOf(key, variant, scale, traversal)` and
`spelledScaleOf(key, scale)`. `scaleNotesOf(key)` keeps its diatonic
meaning and the circle/ring/signature code keeps calling it. The practice
session holds the choice per ring (`ScaleChoice`) and resolves the current
scale from the key's mode.

## Alternatives considered

| Option | Why not |
|---|---|
| `Key.mode` becomes one of sixteen scales | Every circle-facing function would need a "plain key of this scale" step; the ring and signature tests would all change for a behaviour the intent says must not change |
| A `theory.scales` capability with its own spec and code root | One context (`theory`) either way; a second spec would split run-fitting (REQ-012) from the catalogue it consumes |
| Practice owns the catalogue (it is "session state") | Which notes a scale has is a timeless fact — `docs/domain.md` puts Scale, Arpeggio and NoteSequence in `theory`; practice owns only *which* is chosen |

## Consequences

**Accepted costs**
- Two notions of "scale" exist in `theory`: the key's diatonic scale
  (`scaleNotesOf`, for the circle) and the chosen scale (`spelledScaleOf`,
  for what plays). The names are distinct and the docstrings say which is
  which.
- Every note-producing signature gains a `scale` parameter; callers
  cannot forget it (no default), so the diatonic case is spelled out as
  `scaleById("major")` / `("natural-minor")`.

**Enabled**
- The circle, ring, signature and respelling code and their tests are
  untouched by 005.
- 007 (temperament) and 004 (drone) keep taking a `Key`; a drone on the
  tonic does not care which scale is chosen.

**Revisit if**
- A future change wants the circle to *show* the chosen scale (say, a mode
  ring) — then the circle needs the scale and the layering is the wrong
  boundary.
