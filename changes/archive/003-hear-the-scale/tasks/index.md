# Tasks: 003-hear-the-scale

Generated from each task's frontmatter. Next: `./scripts/task.py changes/archive/003-hear-the-scale next` → none

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C003_T001](C003_T001.md) | done | — | — | Phase 1 — Foundations | 1 | Rust workspace, `sound` crate skeleton, build script, `pnpm check` gains cargo |
| [C003_T002](C003_T002.md) | done | — | — | Phase 1 — Foundations | 1 | Sound engine host shim + one audible sine on the phone (the spike) |
| [C003_T003](C003_T003.md) | done | — | theory.circle-of-fifths/REQ-012 | Phase 2 — Theory: the traversal and the pitch | 1 | Fitting octave counts and the run |
| [C003_T004](C003_T004.md) | done | — | theory.circle-of-fifths/REQ-012 | Phase 2 — Theory: the traversal and the pitch | 1 | The sequence and its range invariant |
| [C003_T005](C003_T005.md) | done | — | theory.temperament/REQ-001 | Phase 2 — Theory: the traversal and the pitch | 1 | Every note has a pitch |
| [C003_T006](C003_T006.md) | done | — | practice.session/REQ-004 | Phase 3 — Practice: the transport, pure | 1 | Tempo terms and the summary line |
| [C003_T007](C003_T007.md) | done | — | practice.session/REQ-003 | Phase 3 — Practice: the transport, pure | 1 | The transport state machine |
| [C003_T008](C003_T008.md) | done | C003_T006,C003_T007 | practice.session/REQ-001 | Phase 3 — Practice: the transport, pure | 1 | The session aggregate over fake ports |
| [C003_T009](C003_T009.md) | done | C003_T008 | practice.session/REQ-006 | Phase 3 — Practice: the transport, pure | 1 | Onsets become TargetAdvanced; hidden stops; silence is not stuck |
| [C003_T010](C003_T010.md) | done | C003_T002 | practice.session/REQ-005 | Phase 4 — Sound: the real engine and the adapters | 1 | Tone, click, onset reports and stop in Rust |
| [C003_T011](C003_T011.md) | done | C003_T002,C003_T008,C003_T010 | — | Phase 4 — Sound: the real engine and the adapters | 1 | Practice adapters: Web Audio sound, silent sound, wake lock, visibility |
| [C003_T012](C003_T012.md) | done | C003_T003,C003_T006 | practice.session/REQ-011,theory.circle-of-fifths/REQ-008 | Phase 5 — UI from the prototype | 1 | Stored selection v3 |
| [C003_T013](C003_T013.md) | done | C003_T003,C003_T004 | theory.circle-of-fifths/REQ-003,practice.session/REQ-006 | Phase 5 — UI from the prototype | 1 | The panel shows the run and the sounding note; Span deleted |
| [C003_T014](C003_T014.md) | done | C003_T008 | practice.session/REQ-002 | Phase 5 — UI from the prototype | 1 | The transport card |
| [C003_T015](C003_T015.md) | done | C003_T003,C003_T006 | practice.session/REQ-001 | Phase 5 — UI from the prototype | 1 | The Traversal sheet, its row, and the Tempo sheet |
| [C003_T016](C003_T016.md) | done | C003_T008,C003_T009,C003_T011,C003_T012,C003_T013,C003_T014,C003_T015 | practice.session/REQ-011 | Phase 5 — UI from the prototype | 1 | Wire the session into the app |
| [C003_T017](C003_T017.md) | done | — | — | Phase 5 — UI from the prototype | 1 | Design review loop: the screen matches the prototype |
| [C003_T018](C003_T018.md) | done | C003_T013,C003_T016 | practice.session/REQ-008 | Phase 6 — Hardening | 1 | The measured timing test |
| [C003_T019](C003_T019.md) | done | — | — | Phase 6 — Hardening | 1 | Edge cases, spike removal, AGENTS.md healthy output |
| [C003_T020](C003_T020.md) | in-progress | — | — | Phase 6 — Hardening | 0 | Converge |
| [C003_T021](C003_T021.md) | done | — | theory.circle-of-fifths/REQ-003 | Phase 5 — UI from the prototype | 1 | Quaver flags on the stave |
| [C003_T022](C003_T022.md) | done | — | practice.session/REQ-002 | Phase 5 — UI from the prototype | 1 | The idle caption counts the sequence |
| [C003_T023](C003_T023.md) | done | — | practice.session/REQ-001,theory.circle-of-fifths/REQ-003 | Phase 5 — UI from the prototype | 1 | Crotchets only — note length removed everywhere |
| [C003_T024](C003_T024.md) | done | — | practice.session/REQ-002 | Phase 7 — Converge round 1 findings | 1 | One AudioContext for the life of the session |
| [C003_T025](C003_T025.md) | done | — | practice.session/REQ-010 | Phase 7 — Converge round 1 findings | 1 | A thrown sound failure still gives the notice and the silent walk |
| [C003_T026](C003_T026.md) | done | — | — | Phase 7 — Converge round 1 findings | 1 | Ports published for fakes; stale comment and dead export removed |
| [C003_T027](C003_T027.md) | done | — | — | Phase 7 — Converge round 1 findings | 1 | Sound-boundary failures are surfaced, not swallowed |
| [C003_T028](C003_T028.md) | done | — | practice.session/REQ-008 | Phase 7 — Converge round 1 findings | 1 | Timing headroom: first tick leads by 20 ms; onset commits flush synchronously |
| [C003_T029](C003_T029.md) | done | — | practice.session/REQ-006 | Phase 7 — Converge round 1 findings | 1 | The highlight fires from the scheduled onset, not the report |
| [C003_T030](C003_T030.md) | done | — | practice.session/REQ-006 | Phase 7 — Converge round 1 findings | 1 | Highlight aims at the audible onset; stale reports from a superseded run are ignored |
| [C003_T031](C003_T031.md) | done | — | practice.session/REQ-006 | Phase 7 — Converge round 1 findings | 1 | The timer is authoritative; the report only measures |
| [C003_T032](C003_T032.md) | done | — | practice.session/REQ-006 | Phase 7 — Converge round 1 findings | 1 | Playback does not re-render the circle; the session notifies only on material change |
| [C003_T033](C003_T033.md) | done | — | practice.session/REQ-002 | Phase 7 — Converge round 1 findings | 1 | The end of a run is timed to the last note's audible end |
