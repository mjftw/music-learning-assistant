# Tasks: 005-scale-selection

Generated from each task's frontmatter. Next: `./scripts/task.py changes/archive/005-scale-selection next` → none

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C005_T001](C005_T001.md) | done | — | — | Phase 1 — Foundations (theory) | 1 | `Accidental` widens to five values |
| [C005_T002](C005_T002.md) | done | — | theory.circle-of-fifths/REQ-003,practice.session/REQ-012 | Phase 1 — Foundations (theory) | 1 | The scale catalogue and `spelledScaleOf` |
| [C005_T003](C005_T003.md) | done | C005_T002 | theory.circle-of-fifths/REQ-003 | Phase 1 — Foundations (theory) | 1 | `keyView` takes the chosen scale; notes carry degree, label and altered |
| [C005_T004](C005_T004.md) | done | C005_T002,C005_T003 | theory.circle-of-fifths/REQ-012 | Phase 1 — Foundations (theory) | 1 | Run-fitting by notes-per-octave; `traversalOf` replaces `runOf`/`sequenceOf` |
| [C005_T005](C005_T005.md) | done | C005_T003,C005_T004 | theory.circle-of-fifths/REQ-012 | Phase 1 — Foundations (theory) | 1 | A scale with its own descending form |
| [C005_T006](C005_T006.md) | done | C005_T002,C005_T004 | theory.circle-of-fifths/REQ-012 | Phase 1 — Foundations (theory) | 1 | The range invariant over every scale |
| [C005_T007](C005_T007.md) | done | C005_T003 | theory.circle-of-fifths/REQ-003 | Phase 1 — Foundations (theory) | 1 | Inline accidentals: `inlineAccidentalsOf` |
| [C005_T008](C005_T008.md) | done | C005_T002,C005_T004 | practice.session/REQ-012 | Phase 2 — The session knows the chosen scale | 1 | `ScaleChoice`, the effective shape, the snapshot |
| [C005_T009](C005_T009.md) | done | C005_T008 | practice.session/REQ-007 | Phase 2 — The session knows the chosen scale | 1 | A new scale mid-run restarts at once |
| [C005_T010](C005_T010.md) | done | C005_T002,C005_T008 | practice.session/REQ-011 | Phase 3 — The UI | 1 | Stored selection v4 with the per-ring scale choice |
| [C005_T011](C005_T011.md) | done | C005_T002 | practice.session/REQ-012 | Phase 3 — The UI | 1 | `ScaleSheet` and `ScaleRow` |
| [C005_T012](C005_T012.md) | done | C005_T003,C005_T008,C005_T010,C005_T011 | practice.session/REQ-012 | Phase 3 — The UI | 1 | App wiring: the choice, the heading, the row, persistence |
| [C005_T013](C005_T013.md) | done | C005_T002 | theory.circle-of-fifths/REQ-003,practice.session/REQ-012 | Phase 3 — The UI | 1 | The names view follows the chosen scale |
| [C005_T014](C005_T014.md) | done | — | practice.session/REQ-001 | Phase 3 — The UI | 1 | The Traversal sheet greys out an arpeggio the scale does not offer |
| [C005_T015](C005_T015.md) | done | C005_T007 | theory.circle-of-fifths/REQ-003 | Phase 3 — The UI | 1 | The stave draws inline accidentals |
| [C005_T016](C005_T016.md) | done | — | — | Phase 3 — The UI | 1 | Design-review loop points at this change's prototype |
| [C005_T017](C005_T017.md) | done | — | — | Phase 4 — Hardening | 1 | Every row of the proposal's edge-case table has a test |
| [C005_T018](C005_T018.md) | done | — | — | Phase 4 — Hardening | 1 | `AGENTS.md` architecture, scenario coverage, timing |
| [C005_T019](C005_T019.md) | done | — | — | Phase 4 — Hardening | 1 | Converge |
| [C005_T020](C005_T020.md) | done | — | theory.circle-of-fifths/REQ-012 | Phase 5 — Converge round 1 (2026-09-24, report `.sdd/reports/005-scale-selection/converge.md`) | 1 | A split-direction scale's descending run is fitted by its own tonic; ↑↓ never repeats the top |
| [C005_T021](C005_T021.md) | done | — | practice.session/REQ-006 | Phase 5 — Converge round 1 (2026-09-24, report `.sdd/reports/005-scale-selection/converge.md`) | 1 | The target-in-sequence invariant over every scale |
| [C005_T022](C005_T022.md) | done | — | theory.circle-of-fifths/REQ-003 | Phase 5 — Converge round 1 (2026-09-24, report `.sdd/reports/005-scale-selection/converge.md`) | 1 | The names view shows a five-note scale (S5's names half) |
| [C005_T023](C005_T023.md) | done | — | — | Phase 5 — Converge round 1 (2026-09-24, report `.sdd/reports/005-scale-selection/converge.md`) | 1 | Converge round 2 |
