# Tasks: 008-learner-leads

Generated from each task's frontmatter. Next: `./scripts/task.py changes/008-learner-leads next` → C008_T017

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C008_T001](C008_T001.md) | done | — | practice.session/REQ-016,practice.session/REQ-018,practice.session/REQ-020 | Phase 1 — Foundations | 1 | The lead settings, the tolerances, the hints, `verdictOf` with a band |
| [C008_T002](C008_T002.md) | done | C008_T001 | practice.session/REQ-016,practice.session/REQ-015 | Phase 1 — Foundations | 1 | The hold rule as a pure reducer |
| [C008_T003](C008_T003.md) | done | C008_T001,C008_T002 | practice.session/REQ-016 | Phase 1 — Foundations | 1 | The target never advances early (invariant, exhaustive) |
| [C008_T004](C008_T004.md) | done | C008_T001 | practice.session/REQ-011 | Phase 1 — Foundations | 1 | Stored state v6 with the lead settings; the `lead.holdFill` token |
| [C008_T005](C008_T005.md) | done | C008_T001,C008_T002 | practice.session/REQ-014,practice.session/REQ-015 | Phase 2 — The lead run in the Session aggregate | 1 | `start()` / `stop()` dispatch on the mode; the first target; the idle caption |
| [C008_T006](C008_T006.md) | done | C008_T002,C008_T005 | practice.session/REQ-016,practice.session/REQ-017,practice.session/REQ-021 | Phase 2 — The lead run in the Session aggregate | 1 | The lead branch of `onPitchDetected`: age, smoothing, judgement at the tolerance, the hold, the advance, the gap |
| [C008_T007](C008_T007.md) | done | C008_T005,C008_T006 | practice.session/REQ-015 | Phase 2 — The lead run in the Session aggregate | 1 | Complete, loop, and the target-in-sequence invariant for a lead run |
| [C008_T008](C008_T008.md) | done | C008_T005,C008_T007 | practice.session/REQ-015,practice.session/REQ-013 | Phase 2 — The lead run in the Session aggregate | 1 | The exclusions: the drone both ways, the Tuner pill, tapped notes; never-both widened |
| [C008_T009](C008_T009.md) | done | C008_T005,C008_T008 | practice.session/REQ-009,practice.session/REQ-022 | Phase 2 — The lead run in the Session aggregate | 1 | Hidden, the wake lock, and the microphone that cannot be used |
| [C008_T010](C008_T010.md) | done | C008_T005,C008_T009 | practice.session/REQ-019 | Phase 2 — The lead run in the Session aggregate | 1 | Changes while leading |
| [C008_T011](C008_T011.md) | done | C008_T002,C008_T005,C008_T010 | practice.session/REQ-018,practice.session/REQ-017 | Phase 2 — The lead run in the Session aggregate | 1 | The tone cue and its mute window; 'held ✓' |
| [C008_T012](C008_T012.md) | done | C008_T005 | practice.session/REQ-014,practice.session/REQ-002 | Phase 3 — The practice screen | 1 | The transport card: the mode words, the I-lead idle card, no progress bar |
| [C008_T013](C008_T013.md) | done | — | practice.session/REQ-015,practice.session/REQ-017,practice.session/REQ-022 | Phase 3 — The practice screen | 1 | The live lead card, the judgement copy, the complete card, the no-mic card |
| [C008_T014](C008_T014.md) | done | — | practice.session/REQ-017,practice.session/REQ-018 | Phase 3 — The practice screen | 1 | `NoteMeter` and the stave: the band, the fill, the line on the target notehead; ink behind, faint ahead |
| [C008_T015](C008_T015.md) | done | C008_T014 | practice.session/REQ-017 | Phase 3 — The practice screen | 1 | The names view: the meter in the target column |
| [C008_T016](C008_T016.md) | done | C008_T001 | practice.session/REQ-020,practice.session/REQ-018 | Phase 3 — The practice screen | 1 | The Traversal sheet rebuilt: fixed rows with hints, Who leads with ✕, the three mode rows, the hairline, switches |
| [C008_T017](C008_T017.md) | todo | C008_T004,C008_T005,C008_T012,C008_T016 | practice.session/REQ-011 | Phase 3 — The practice screen | 0 | The app restores and stores the lead settings |
| [C008_T018](C008_T018.md) | todo | — | — | Phase 4 — The harness and hardening | 0 | Extract the microphone-feeding harness helpers into `scripts/harness-lib.mjs` |
| [C008_T019](C008_T019.md) | todo | C008_T018 | practice.session/REQ-021,practice.session/REQ-018,practice.session/REQ-016 | Phase 4 — The harness and hardening | 0 | `pnpm test:lead` — the measured lead run |
| [C008_T020](C008_T020.md) | todo | — | — | Phase 4 — The harness and hardening | 0 | `design-shots` points at the eleven states; `design_snapshot.py live` reaches them |
| [C008_T021](C008_T021.md) | todo | — | — | Phase 4 — The harness and hardening | 0 | Hardening: every edge-case row, the three measured budgets, the hygiene scripts |
| [C008_T022](C008_T022.md) | todo | — | — | Phase 4 — The harness and hardening | 0 | `AGENTS.md` is real; converge |
