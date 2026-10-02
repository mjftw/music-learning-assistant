# Tasks: 004-the-drone

Generated from each task's frontmatter. Next: `./scripts/task.sh changes/archive/004-the-drone next` → none

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C004_T001](C004_T001.md) | done | — | — | Phase 1 — Foundations (the sound crate and its published contract) | 1 | Voices are addressable: `Length`, per-kind stop fade, `stop(tag)` |
| [C004_T002](C004_T002.md) | done | C004_T001 | practice.drone/REQ-001,practice.drone/REQ-005 | Phase 1 — Foundations (the sound crate and its published contract) | 1 | The `Drone` voice: harmonic tables, attack, release, level |
| [C004_T003](C004_T003.md) | done | C004_T001,C004_T002 | practice.drone/REQ-003,practice.drone/REQ-005 | Phase 1 — Foundations (the sound crate and its published contract) | 1 | The drone glides on retune; a sound change crossfades without silence |
| [C004_T004](C004_T004.md) | done | C004_T001,C004_T003 | — | Phase 1 — Foundations (the sound crate and its published contract) | 1 | `SoundCommand` learns `drone`, `retune`, `stop`; the shim, the silent port and the fakes follow |
| [C004_T005](C004_T005.md) | done | C004_T004 | practice.drone/REQ-002 | Phase 2 — The session holds the drone | 1 | The octave rule and the drone's note, pure |
| [C004_T006](C004_T006.md) | done | C004_T004,C004_T005 | practice.drone/REQ-001,practice.drone/REQ-005 | Phase 2 — The session holds the drone | 1 | The session starts, stops and re-sounds the drone |
| [C004_T007](C004_T007.md) | done | C004_T004,C004_T006 | practice.drone/REQ-002,practice.drone/REQ-003 | Phase 2 — The session holds the drone | 1 | Stepping the octave; the drone follows the key and the instrument |
| [C004_T008](C004_T008.md) | done | C004_T004,C004_T006 | practice.drone/REQ-004 | Phase 2 — The session holds the drone | 1 | Playback and the drone exclude each other; the wake lock is shared |
| [C004_T009](C004_T009.md) | done | C004_T004,C004_T008 | practice.drone/REQ-004 | Phase 2 — The session holds the drone | 1 | Never both: the invariant over every interleaving |
| [C004_T010](C004_T010.md) | done | C004_T006,C004_T008 | practice.drone/REQ-007,practice.drone/REQ-008 | Phase 2 — The session holds the drone | 1 | The page hidden, the screen awake, sound that cannot start |
| [C004_T011](C004_T011.md) | done | C004_T004,C004_T006 | practice.session/REQ-013 | Phase 2 — The session holds the drone | 1 | A tapped note sounds for one beat |
| [C004_T012](C004_T012.md) | done | C004_T004 | practice.drone/REQ-009 | Phase 3 — The UI | 1 | Stored selection v5 carries the drone's octave and sound |
| [C004_T013](C004_T013.md) | done | — | practice.drone/REQ-001,practice.drone/REQ-002 | Phase 3 — The UI | 1 | `DronePill` — the pill in the disc |
| [C004_T014](C004_T014.md) | done | — | practice.drone/REQ-006,practice.drone/REQ-005 | Phase 3 — The UI | 1 | `DroneSheet`, and a header that carries a subtitle and a switch |
| [C004_T015](C004_T015.md) | done | C004_T005,C004_T007,C004_T012,C004_T013,C004_T014 | practice.drone/REQ-001,practice.drone/REQ-006,practice.drone/REQ-008,practice.drone/REQ-009 | Phase 3 — The UI | 1 | App wiring: the pill over the circle, the sheet, persistence |
| [C004_T016](C004_T016.md) | done | C004_T004,C004_T011 | practice.session/REQ-013 | Phase 3 — The UI | 1 | Tapping a notehead on the stave |
| [C004_T017](C004_T017.md) | done | C004_T011 | practice.session/REQ-013 | Phase 3 — The UI | 1 | Tapping a column in the names view |
| [C004_T018](C004_T018.md) | done | — | — | Phase 3 — The UI | 1 | The design-review loop points at this change's design |
| [C004_T019](C004_T019.md) | done | — | — | Phase 4 — Hardening | 1 | Every row of the proposal's edge-case table has a test; scenario coverage is complete |
| [C004_T020](C004_T020.md) | done | — | — | Phase 4 — Hardening | 1 | `AGENTS.md` architecture line, `pnpm check`, `pnpm test:timing` |
| [C004_T021](C004_T021.md) | done | — | — | Phase 4 — Hardening | 1 | Converge |
| [C004_T022](C004_T022.md) | done | C004_T006 | practice.drone/REQ-004 | Phase 5 — Converge round 1 (2026-09-25, report `.sdd/reports/004-the-drone/converge.md`) | 1 | ▶ during the drone's pending start cancels it; `stop()` never leaves the drone stale |
| [C004_T023](C004_T023.md) | done | C004_T004,C004_T006,C004_T014 | practice.drone/REQ-005 | Phase 5 — Converge round 1 (2026-09-25, report `.sdd/reports/004-the-drone/converge.md`) | 1 | REQ-005/S3's hint and 300 ms clauses, and every Sound-row hint, are asserted |
| [C004_T024](C004_T024.md) | done | — | practice.session/REQ-006 | Phase 5 — Converge round 1 (2026-09-25, report `.sdd/reports/004-the-drone/converge.md`) | 1 | The timing budget measured against the phone's server, and the phone's own check |
