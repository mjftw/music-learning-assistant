---
type: Implementation Notes
title: 005-scale-selection — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/005-scale-selection/notes.md
status: draft
tags: [sdd, notes, "change:005-scale-selection"]
sdd_id: 005-scale-selection
---

# Notes — 005-scale-selection

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

- T003: brief's test scaffolding claim (flute/noteLabel present in key-view.test.ts) was wrong; added locally. StaveView + its test listed in Files but call runOf, not keyView — untouched until T004.
- T004: the brief's literal scaleById("major") for sequence-range.test.ts was wrong (the invariant iterates minor keys); the key's own mode is used there — a brief error, not a spec one. Private sequenceOf renamed sequenceFromRun. Ripples: target-in-sequence.test.ts, app-session.test.tsx, doc comments in App/StaveView.
- T005 review (minor): countRunOf's optional startIndex default references earlier params (engineering §15 'explicit over clever') — made required in T006; report overstated the invariant's coverage (broadened in T006).
- T006: invariant found A♯ minor × Chromatic unspellable (triple sharp) — spec amended to per-ring chromatic (decisions.md 2026-09-24, to confirm at acceptance). Enumeration is 18,816 sequences (plan said ~43k — the fitting counts are fewer than estimated; the gate of >16,000 holds). Minor: spelledScaleOf recomputed per variant in the invariant.
- T007 review (minor): letter+octave key string built twice in notation.ts; a keyOf helper would dedupe.
- T008 review (minor): session.ts's closure initialisers replay the scale resolution that recompute() overwrites two lines later; a placeholder would do. Ripple: transport-card.test.tsx snapshot fixture gained the new fields.
- T010: carried to T012 — add snapshot?.scaleChoice to App's persistence-effect deps (inert until the UI can change it); rename app-session's v3-fixture test from REQ-011/S1 to S4 (it now migrates).
- T011 review (minor): TICK_* constants triplicated across ScaleSheet/TempoSheet/InstrumentSheet — pre-existing pattern; a shared TickMark in overlay.tsx would dedupe.
