---
type: Design Log
title: 008-learner-leads — design rounds
description: Every round of the refinement loop for this change — what was tried, what the user chose, and why — so a decision made on the fifth try is never undone on the sixth.
resource: /changes/008-learner-leads/design/rounds.md
status: draft
tags: [sdd, design, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /docs/design.md
generated:
  by: claude-code/unknown
  at: 2026-10-02T15:21:41Z
verified: []
sdd_id: 008-learner-leads
sdd_phase: exited
---

# Design rounds — 008-learner-leads

> The design record for this change. **Origin** says where the starting
> design came from. **Rounds** is the refinement loop on the live build, one
> block per round, newest last; there is no gate per round. **Exit** is filled
> once, when the user says the screens are done, and is what `sdd-finish` and
> the fidelity pass read.

## Origin

- **Source:** imported — the Claude Design handoff bundle "Designing 008
  learner leads" (`claude.ai/design/p/4accb530-3209-447b-8b4c-4bbfd161e610`,
  the user's), exported as `Designing 008 learner leads-handoff.zip` on
  2026-10-02 and vendored here, the pattern of 003/004/005/007. The design
  MCP was not registered in this session, so the user brought the export.
  Settled before the grill: the user's brief names `handoff.md` as "the
  source of truth for copy, sizes, colours, states and behaviour".
- **Files:**
  - `handoff.md` — the build spec written in Claude Design (the bundle's
    `README.md`): every state, size, colour and copy, the hold rule, the
    sheet's rows, the five new tokens. Read first.
  - `Learner Leads Final.dc.html` — the canvas of eleven phones, each the
    practice screen in one state: 01 idle · play along, 02 idle · I lead
    chosen, 03 listening · silent, 04 heard · out of tune, 05 holding in
    tune, 06 advanced to the next note, 07 run complete, 08 can't hear ·
    no microphone, 09 sheet · play along, 10 sheet · I lead, 11 demo — a
    simulated player walking C major. Each phone is interactive (names /
    stave, the mode words, the sheet's rows).
  - `Learner Leads Practice.dc.html` — the practice screen prototype the
    canvas imports, props `mode` (tool / me) and `llState`. Its `FINAL`
    constant pins the chosen design (option c, segC idle, tonal fill,
    explained sheet, meter at level on the note, hold as a fill, no mode
    cue, no wrong-note display); the earlier explorations were removed
    before export. Reference only — "do not port its code".
  - `support.js` — the dc runtime, byte-identical to 007's.
- **Walkthrough:** 2026-10-02, against the resolved intent.
  - Scenarios with no screen or state among the eleven:
    - the drone switched on mid-run (intent Q2) — ends on 02 with the
      drone pill on; no new state;
    - the tone cue sounding (Q1) — the meter shows nothing, which is 03;
      no new state;
    - a tempo, Hold, In tune or Cues change mid-run — 10 with the hint
      updating; no new state;
    - the page hidden mid-run (Q3) — 02 on return; no new state;
    - the microphone failing mid-run — 08; no new state;
    - loop on after the last held note — 06 with note 1 as the target; no
      new state; the complete card 07 is the loop-off ending;
    - `Cues → meter` off while leading — not a phone on the canvas but
      reachable on any live phone through the sheet (10 → Cues → meter);
      the README rules it ("hide the band, fill and line; the note keeps
      its highlight; the card judgement still shows"); listed as a state
      of 05 in the Interface table, citing the README;
    - the names view of 03–07 — reachable on each phone (names / stave);
      the README gives its band and line geometry; one row each in the
      Interface table is not needed: the state is the same, the panel
      differs;
    - a note an octave off, or any note beyond ±50 ¢ — pins at the band
      box's edge (04 at its limit); the wrong-note display was "explored
      and rejected as distracting" (README) — out of scope in the
      proposal.
  - Things on the screens no requirement asked for, and the ruling:
    - the mode words under the caption and the Tuner glyph in the start
      circle (01/02) — the mode switch; becomes a requirement;
    - the I-lead idle caption "hold N beat(s) · <tolerance> tuning" (02) —
      requirement;
    - the live card's big target letter + octave, "{i} of {n}" and the
      judgement line with its four copies and colours (03–06) —
      requirement;
    - the meter on the target note — band, hold fill, pitch line, in both
      panels, with the README's geometry — requirement;
    - past notes ink / future faint while leading — the stave's "progress"
      style; requirement;
    - the complete card (07) and the no-mic card (08) — requirements;
    - the Traversal sheet rebuilt: title row gone, ✕ in the Who leads row,
      every row 62 px with a hint, three rows that swap with the mode, a
      hairline, switches in place of the toggle pills, the shared rows
      restyled (09/10) — requirement; the shared controls stay the shipped
      ones (intent Q6);
    - the play-along card while playing — not drawn by the prototype;
      asked 2026-10-02: the mode words row stays and the progress bar is
      retired (REQ-002 modified), so the card keeps one height through
      idle → playing in both modes;
    - 11, the simulated player — a demo of the hold logic for the eye, not
      a feature (intent); nothing to build;
    - the `demo` / `llState` props and the Tuner header pill's drawing —
      exploration scaffolding and the shipped pill; nothing to build.

## Rounds

No taste rounds were run: the design arrived finished (the Learner Leads
handoff), and the build was checked against it by screenshot rather than
re-explored.

- **Screenshot pass (2026-10-04, T020):** all twelve Interface rows shot,
  prototype beside live (`rounds/shots/`). Four structural findings: the
  Tuner glyph drawn as outlined pills, the no-mic title below the caption
  instead of in its place, a stale pitch line across a new target — fixed
  (T023) and re-shot; and the live card about 40 px taller than the
  prototype's because it keeps the mode words.
- **Phone walk (2026-10-04, Galaxy S24, on the stand with the flute):**
  ■ did nothing while leading — fixed (T024); "Looks like it's working".
- **Converge 1 (2026-10-05):** note opacity applied twice on the stave
  (notes ahead at 0.09, play along's dim at 0.52) — fixed (T027) and
  re-shot.
- **The live card's height (2026-10-05):** asked — keep the mode words or
  match the prototype. **Chose:** keep the words. **Requirement changed?**
  no — REQ-014 and REQ-002 already say "in every state".

## Exit

- **Exited:** 2026-10-05
- **Reference screenshots:** `reference/practice--<state>.png` for all
  twelve rows of the proposal's Interface table, shot from the final build
- **Promoted to `docs/design.md` (v1.2.0):** tokens `paper.pillInk`,
  `lead.holdFill`, `modeWords.glyphCentre`, `modeWords.glyphOuter`, the
  `modeWords` / `leadCard` / `noteMeter` / `sheetRow` metrics, radii 3 and
  1, the meter line's motion; patterns "The reading is on the note", "A
  card keeps one structure in every state", "A sheet never changes height"
- **Requirement changes written to the delta:** none from the design; the
  run's two wording amendments (D001, D002) are recorded under
  `record/decisions/`
- **Left for a later change:** the three literals in `src/ui/global.css`
  that `check-design.sh` has warned about since 002/007; the ocarina
  ranges (the user's finding on the walk, a separate fix after the MR)
