# Tasks: 001-the-circle

Generated from each task's frontmatter. Next: `./scripts/task.py changes/archive/001-the-circle next` → none

| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |
|---|---|---|---|---|---|---|
| [C001_T001](C001_T001.md) | done | — | — | Phase 1 — Foundations | 1 | Vite + React + TS-strict scaffold with one green `pnpm check` |
| [C001_T002](C001_T002.md) | done | — | — | Phase 1 — Foundations | 1 | Theory primitives: notes, keys, scale spelling |
| [C001_T003](C001_T003.md) | done | C001_T002 | theory.circle-of-fifths/REQ-004 | Phase 2 — The circle (theory domain) | 1 | Signatures, relatives, and the new accidental |
| [C001_T004](C001_T004.md) | done | C001_T002,C001_T003 | theory.circle-of-fifths/REQ-001 | Phase 2 — The circle (theory domain) | 1 | The circle itself |
| [C001_T005](C001_T005.md) | done | C001_T002 | theory.instruments/REQ-001 | Phase 3 — Instruments and the key view | 1 | The catalogue from data files |
| [C001_T006](C001_T006.md) | done | C001_T002,C001_T005 | theory.circle-of-fifths/REQ-003,theory.circle-of-fifths/REQ-001 | Phase 3 — Instruments and the key view | 1 | The key view |
| [C001_T007](C001_T007.md) | done | — | theory.circle-of-fifths/REQ-008 | Phase 4 — The UI | 1 | Selection state, storage port, first run |
| [C001_T008](C001_T008.md) | done | C001_T007 | theory.circle-of-fifths/REQ-001 | Phase 4 — The UI | 1 | The circle rendered and clickable |
| [C001_T009](C001_T009.md) | done | C001_T007 | theory.circle-of-fifths/REQ-003 | Phase 4 — The UI | 1 | The stave and the names toggle |
| [C001_T010](C001_T010.md) | done | C001_T007 | theory.instruments/REQ-001 | Phase 4 — The UI | 1 | Variant selector and the notice strip |
| [C001_T011](C001_T011.md) | done | — | — | Phase 5 — Hardening | 1 | Edge-case sweep, context check, acceptance hand-off |
| [C001_T012](C001_T012.md) | done | — | theory.circle-of-fifths/REQ-003 | Phase 6 — Convergence findings (2026-09-19 audit) | 1 | Octave-edge range boundaries never drop an in-range note (W1) |
| [C001_T013](C001_T013.md) | done | — | theory.circle-of-fifths/REQ-005 | Phase 6 — Convergence findings (2026-09-19 audit) | 1 | The range property enumerates every key × variant (W2) |
| [C001_T014](C001_T014.md) | done | — | theory.circle-of-fifths/REQ-003 | Phase 6 — Convergence findings (2026-09-19 audit) | 1 | Styling inputs are tested: root emphasis and new-accidental highlight (W3) |
