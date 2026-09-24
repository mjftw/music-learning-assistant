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
- T012: the heading button is aria-labelled 'Edit scale' (its visible text collided with wedge names); the REQ-012/S1 app test's names-view assertion is temporarily diatonic — T013 restores C♯. Brief errors: wedge clicked by 'G major', NamesView/TraversalSheet props deferred to T013/T014. Minor: initialScaleChoiceOf inlined; a test-only JSON.parse cast.
- T013 review (minor): App's pre-session names-view fallback shows the ring's default scale for one render before the restored scale — same pattern as the existing StaveView notes=[] fallback.
- T016: `scripts/design-shots.mjs` retargeted at `changes/005-scale-selection/design/hear-the-scale.dc.html`; added states `scale-sheet-open`, `g-lydian-names`, `g-melodic-minor-stave`, `pentatonic-traversal-sheet`. No component constant needed correcting — the scale sheet, the heading/formula row, the names-view alt row and the stave's inline accidentals (REQ-012/S1–S6) all matched the prototype pixel-for-pixel.
- T016: accepted divergence — the prototype's Traversal sheet still has a Note length (♩/♪) row, and its summary line still carries a "♩"/"♪" segment; the app has neither, per the note-length-dropped decision already recorded at 003's acceptance.
- T016: accepted divergence — on `g-melodic-minor-stave` (a minor-ring key), the prototype's distance-ring degree numerals reuse the major key's offset-from-selected-wedge table for minor keys too, while the app numbers a minor key's ring from its own tonic (`theory.circle-of-fifths/REQ-010/S3`, tested and shipped before this change, and explicitly untouched by it): the app labels the wedges spelling G, D, A, E♭, B♭, F, C "1 5 2 6 3 7 4" wherever those major-key letters actually sit, while the prototype labels "1 5 2 6 3 7 4" by walking from G minor's own selected wedge as if it were a major tonic. The vendored prototype simply never modelled the minor-ring case this way; not something this change's Files list can touch.
- T016: accepted divergence — the prototype's phone-mockup frame (a border + padding the vendored `.dc.html` wraps itself in) offsets all of its content roughly 54px@2x below the app's edge-to-edge layout; carried over from 003's acceptance, visible in every pair including this task's four new ones, not specific to the scale-selection feature.
- T017: the fully-empty run (no note of the chosen scale in range) is unreachable — every catalogued variant spans more than an octave, so every pitch class occurs at least once; the milder no-whole-octave-fit case is what is tested. Minor: the v2-payload UI test cites REQ-011/S4 where S3's Given fits better.
- T018: pnpm test:timing PASSed on the 3rd run; runs 1–2 failed only the 200 bpm 'vs audible' row at 30.67 ms vs the 30 ms budget (onset dev and drift 0.00 throughout). Transport/scheduler untouched by this change; same headroom noted at 003's converge (decisions 2026-09-23). Re-measure at finish; the phone decides.
- Converge round 1 (2026-09-24): Not converged — C1 (split-direction descending run fitted by the ascending form's index: 27 key×variant×count combinations wrong, e.g. C♯ minor ↓ starts D♯5) and C2 (↑↓ repeats the top note when the two forms' tops differ) → T020; W1 (practice invariant only over the default scale) → T021; W4 (REQ-003/S5's names-view half untested) → T022. Root cause of C1/C2: T005's brief said "share the same start root index" — a brief error, not a spec one.
- Converge round 1 info, recorded: I1 dead initialisers in session.ts; I2 duplicated map key in notation.ts; I3 TICK_* triplicated (a proposed engineering refinement, not adopted here); I4 heading aria-label "Edit scale" ≠ visible text (WCAG 2.5.3; proposed refinement); I5 Formula/ScaleDegree/ScaleFamily/TraversalNotes published without an external consumer; I6 plan's ~43k corrected to 18,816; I7 REQ-012/S4's alt row rendered empty rather than absent for unaltered degrees (as the design does); I8 "no notes of this key in range" unreachable; I9 one-render default-scale flash; I11 REQ-011/S1 proven in pieces.
- T020: C1/C2 fixed; the brief's C2 literals were wrong (A4 is in range on Alto C and is the tonic) and its tonic-to-tonic check applies to ↑/↓ only (↑↓'s run is the written-out zigzag) — both corrected in the tests with comments.
- Converge round 2 (2026-09-24, HEAD 900efb7): Converged — 0 critical, W2/W3 carried as accepted-by-name decisions, 14 info (I13: the descending run is sliced with the ascending form's notesPerOctave — fine for melodic minor, fragile for a future split scale of different length; I14: countRunOf's undefined-startIndex fallback deserves an assertion; I15/I16 doc staleness fixed inline at T023).
