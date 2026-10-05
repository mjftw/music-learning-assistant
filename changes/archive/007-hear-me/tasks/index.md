# Tasks: 007-hear-me

Generated from each task's frontmatter. Next: `./scripts/task.py changes/archive/007-hear-me next` → C007_T025

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C007_T001](C007_T001.md) | done | — | listening.pitch-detection/REQ-002,listening.pitch-detection/REQ-003 | Phase 1 — Foundations (the listening crate, its contract, the port) | 1 | The MPM detector on synthesised buffers, and its cost |
| [C007_T002](C007_T002.md) | done | C007_T001 | listening.pitch-detection/REQ-003,listening.pitch-detection/REQ-004 | Phase 1 — Foundations (the listening crate, its contract, the port) | 1 | The ring, the hop and the C ABI; both crates built |
| [C007_T003](C007_T003.md) | done | C007_T002 | listening.pitch-detection/REQ-001,listening.pitch-detection/REQ-006 | Phase 1 — Foundations (the listening crate, its contract, the port) | 1 | The published contract: the schema, the worklet shim, `createListener` |
| [C007_T004](C007_T004.md) | done | — | theory.temperament/REQ-002 | Phase 1 — Foundations (the listening crate, its contract, the port) | 1 | The nearest note to a frequency |
| [C007_T005](C007_T005.md) | done | C007_T003 | — | Phase 1 — Foundations (the listening crate, its contract, the port) | 1 | The `ListeningPort`, its adapter, `onShown` on the visibility port, and the fakes |
| [C007_T006](C007_T006.md) | done | C007_T004 | practice.tuner/REQ-002,practice.tuner/REQ-004 | Phase 2 — The session holds the tuner | 1 | The tuner's rules, pure |
| [C007_T007](C007_T007.md) | done | C007_T005,C007_T006 | practice.tuner/REQ-001 | Phase 2 — The session holds the tuner | 1 | The session enters and leaves the tuner; nothing sounds while it listens |
| [C007_T008](C007_T008.md) | done | C007_T006,C007_T007 | practice.tuner/REQ-002,practice.tuner/REQ-003 | Phase 2 — The session holds the tuner | 1 | The reading: a detected pitch becomes a judgement; nothing heard clears it |
| [C007_T009](C007_T009.md) | done | C007_T006,C007_T008 | practice.tuner/REQ-004,practice.tuner/REQ-009 | Phase 2 — The session holds the tuner | 1 | A target: Hold, pin, step, clear; forgotten on leaving |
| [C007_T010](C007_T010.md) | done | C007_T006,C007_T008 | practice.tuner/REQ-006,listening.pitch-detection/REQ-004 | Phase 2 — The session holds the tuner | 1 | A late detection is dropped; a burst is coalesced; the paint age is reported |
| [C007_T011](C007_T011.md) | done | C007_T005,C007_T007 | practice.tuner/REQ-007 | Phase 2 — The session holds the tuner | 1 | When the microphone cannot be used |
| [C007_T012](C007_T012.md) | done | C007_T005,C007_T007 | practice.tuner/REQ-008,listening.pitch-detection/REQ-005 | Phase 2 — The session holds the tuner | 1 | The page hidden, the screen awake |
| [C007_T013](C007_T013.md) | done | — | practice.tuner/REQ-001 | Phase 2 — The session holds the tuner | 1 | Never both: the invariant over every interleaving, with the tuner |
| [C007_T014](C007_T014.md) | done | C007_T005,C007_T007 | practice.tuner/REQ-001 | Phase 3 — The tuner screen | 1 | The Tuner pill, the `screen` state, the tuner screen's shell; one AudioContext for both worklets |
| [C007_T015](C007_T015.md) | done | — | practice.tuner/REQ-002,practice.tuner/REQ-003 | Phase 3 — The tuner screen | 1 | The level, the big name, the tag; 'Play a note' |
| [C007_T016](C007_T016.md) | done | — | practice.tuner/REQ-005 | Phase 3 — The tuner screen | 1 | The stave strip |
| [C007_T017](C007_T017.md) | done | C007_T009 | practice.tuner/REQ-004 | Phase 3 — The tuner screen | 1 | The target pill, the Target sheet, the pitch spiral |
| [C007_T018](C007_T018.md) | done | C007_T011 | practice.tuner/REQ-007,practice.tuner/REQ-002,practice.tuner/REQ-009 | Phase 3 — The tuner screen | 1 | 'Can't hear', the footer's ♯/♭ toggle, the spelling persists |
| [C007_T019](C007_T019.md) | done | C007_T010 | practice.tuner/REQ-006 | Phase 3 — The tuner screen | 1 | The paint is reported; the dev hooks the harness needs |
| [C007_T020](C007_T020.md) | done | — | — | Phase 3 — The tuner screen | 1 | The design-review loop points at this change's design |
| [C007_T021](C007_T021.md) | done | C007_T014,C007_T015,C007_T019 | practice.tuner/REQ-006,listening.pitch-detection/REQ-002,listening.pitch-detection/REQ-003,listening.pitch-detection/REQ-004 | Phase 4 — The measured harness | 1 | `pnpm test:tuner` — the budget, the accuracy, the refresh, silence and noise, measured |
| [C007_T022](C007_T022.md) | done | — | — | Phase 5 — Hardening | 1 | Every row of the proposal's edge-case table has a test; scenario coverage is complete |
| [C007_T023](C007_T023.md) | done | — | — | Phase 5 — Hardening | 1 | `AGENTS.md` healthy outputs; `pnpm check`, `pnpm test:timing`, `pnpm test:tuner` |
| [C007_T024](C007_T024.md) | done | — | practice.tuner/REQ-006 | Phase 5 — Hardening | 1 | The phone: the harness against `pnpm dev:phone`, and the user's walk |
| [C007_T025](C007_T025.md) | todo | — | — | Phase 5 — Hardening | 0 | Converge |
| [C007_T026](C007_T026.md) | done | — | practice.tuner/REQ-002 | Phase 5 — Hardening | 1 | The shown offset is smoothed (design round 1: variant A becomes the rule) |
| [C007_T027](C007_T027.md) | done | — | practice.tuner/REQ-002 | Phase 5 — Hardening | 1 | The harness gates the shown offset (S9) |
| [C007_T028](C007_T028.md) | done | — | practice.tuner/REQ-004 | Phase 5 — Hardening | 1 | Hold and the needle remember the last note heard |
| [C007_T029](C007_T029.md) | done | — | practice.tuner/REQ-005 | Phase 5 — Hardening | 1 | The trail moves with time and outlives the note |
| [C007_T030](C007_T030.md) | done | — | practice.tuner/REQ-005 | Phase 5 — Hardening | 1 | The trail's length as chosen; the switch removed |
| [C007_T031](C007_T031.md) | done | — | practice.tuner/REQ-003 | Phase 5 — Hardening | 1 | The last reading lingers and fades (design round 4: the rule) |
| [C007_T032](C007_T032.md) | done | — | practice.tuner/REQ-002 | Phase 5 — Hardening | 1 | The tuner fits the phone: the level flexes (design round 5: the rule) |
| [C007_T033](C007_T033.md) | done | — | practice.tuner/REQ-002,practice.tuner/REQ-005 | Phase 5 — Hardening | 1 | The stave head agrees with the level in the hand-over band (converge W1) |
| [C007_T034](C007_T034.md) | done | — | practice.tuner/REQ-002,practice.tuner/REQ-004 | Phase 5 — Hardening | 1 | The reading's tag never covers LISTENING / NO MIC past ±50 ¢ (converge W2) |
| [C007_T035](C007_T035.md) | done | — | listening.pitch-detection/REQ-004 | Phase 5 — Hardening | 1 | The coalescing test cites the right scenario (converge W3) |
| [C007_T036](C007_T036.md) | done | — | practice.tuner/REQ-002 | Phase 5 — Hardening | 1 | The harness's shown-offset and cents-error gates cannot pass on zero readings (converge W4) |
| [C007_T037](C007_T037.md) | done | — | practice.tuner/REQ-002 | Phase 5 — Hardening | 1 | `NoteJudged` gets a Zod schema, schema-first as `docs/domain.md` requires (converge W5) |
| [C007_T038](C007_T038.md) | done | — | practice.tuner/REQ-003 | Phase 5 — Hardening | 1 | The '<note> IS' caption lingers and fades with 'HEARD' (delta amendment at converge, S4/S6) |
| [C007_T039](C007_T039.md) | done | — | — | Phase 5 — Hardening | 1 | One hard-coded colour in 007's own files matches an existing token (converge W7, narrowed) |
| [C007_T040](C007_T040.md) | todo | — | practice.tuner/REQ-006 | Phase 5 — Hardening | 0 | Diagnose `test:tuner`'s fresh-launch first-readout failure (converge round 2, C1) |
| [C007_T041](C007_T041.md) | todo | — | practice.tuner/REQ-005 | Phase 5 — Hardening | 0 | The trail and head redraw against the current target, not the target each reading was judged under (converge round 2, W1) |
| [C007_T042](C007_T042.md) | todo | — | practice.tuner/REQ-002,practice.tuner/REQ-004 | Phase 5 — Hardening | 0 | The tag still covers the 'halfway to' labels at 360×660 (converge round 2, W2) |
| [C007_T043](C007_T043.md) | todo | — | practice.tuner/REQ-003 | Phase 5 — Hardening | 0 | The '<note> IS' label itself lingers, fades and hides from assistive technology (converge round 2, W3) |
| [C007_T044](C007_T044.md) | todo | — | practice.tuner/REQ-004 | Phase 5 — Hardening | 0 | Hold in the hand-over band still pins the raw nearest note, not the shown one (converge round 2, W4) |
| [C007_T045](C007_T045.md) | todo | — | — | Phase 5 — Hardening | 0 | `#b0a797` is 007's own colour, not pre-existing debt (converge round 2, W5 — corrects the controller's round-1 error) |
