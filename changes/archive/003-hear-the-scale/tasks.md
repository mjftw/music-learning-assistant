---
type: Task List
title: Hear the scale — tasks
description: 20 tasks across 6 phases — Rust sound engine spike, theory traversal and pitch, practice transport and session, sound adapters, UI from the prototype, hardening and measured timing
resource: /changes/003-hear-the-scale/tasks.md
status: stable
tags: [sdd, tasks, "change:003-hear-the-scale"]
sources:
  - resource: /changes/003-hear-the-scale/plan.md
  - resource: /changes/003-hear-the-scale/proposal.md
  - resource: /changes/003-hear-the-scale/design/hear-the-scale.dc.html
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T18:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:27:31Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_phase: complete
---

# Tasks: Hear the scale

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.**
>
> Steps are 2–5 minutes each. A task is 3–8 steps. Larger → split.
> `[P]` after the ID: no dependency on the neighbouring `[P]` tasks.
>
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.
>
> **The design reference** is `changes/003-hear-the-scale/design/hear-the-scale.dc.html`
> (line numbers below refer to it). It wins on every visual and interaction
> divergence; colours already live in `src/ui/theme.ts` (`paper.*`, `fonts.*`).
> Test helpers shared across theory tests: `variantById(id)`, `major(letter,
> accidental?)`, `label(note)` as in `tests/theory/scenarios/span.test.ts:8-17`
> (copy the three helpers into a new test file; they are five lines).

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-003 (M) | T013, T021 (S5) | ✅ |
| theory.circle-of-fifths/REQ-007 (M) | T013 | ✅ |
| theory.circle-of-fifths/REQ-008 (M) | T012 | ✅ |
| theory.circle-of-fifths/REQ-011 (REMOVED) | T013 (deletes span.ts and its tests) | ✅ |
| theory.circle-of-fifths/REQ-012 (A) | T003 (S2, S3), T004 (S1, S4, S5) | ✅ |
| theory.temperament/REQ-001 (A) | T005 | ✅ |
| practice.session/REQ-001 | T006 (S2), T008 (S1, S3, S4), T015 (UI) | ✅ |
| practice.session/REQ-002 | T008 (S1–S4), T014 (UI), T022 (caption amended), T033 (S3 timed end) | ✅ |
| practice.session/REQ-003 | T007 (S1–S3), T015 (toggles UI) | ✅ |
| practice.session/REQ-004 | T006 (S1–S3), T023 (S4 amended), T014, T015 (UI) | ✅ |
| practice.session/REQ-005 | T007 (S1–S3), T009 (S2 session-level), T010 (S4) | ✅ |
| practice.session/REQ-006 | T013 (S1, S2), T009 (S3, S5), T018 (S4), T029/T030/T031 (timer-driven highlight at the audible onset; S4 two-sided) | ✅ |
| practice.session/REQ-007 | T008 (S1–S3), T016 (S3 UI), T030 (stale-report race), T031 | ✅ |
| practice.session/REQ-008 | T018 (S1) | ✅ |
| practice.session/REQ-009 | T009 (S1, S2) | ✅ |
| practice.session/REQ-010 | T009 (S1, S2), T016 (S1 UI) | ✅ |
| practice.session/REQ-011 | T012 (S1–S3), T016 (app) | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `render(now_frame: f64) -> u32`, `output_ptr() -> *const f32`, `init(sample_rate: f32)` | T002, T010 |
| T002 | `push_tone(tag: u32, hz: f32, onset_frame: f64, duration_frames: u32) -> u32` | T010 |
| T002 | `soundCommandSchema`, `SoundCommand`, `OnsetReport`, `SoundUnavailable` | T008, T010, T011 |
| T002 | `createSoundEngine(context: AudioContext): Promise<SoundEngineOutcome>` | T011 |
| T003 | `fittingOctaveCounts`, `runOf`, `effectiveOctavesOf`, `Traversal`, `Octaves`, `OctaveCount`, `Direction`, `Shape` | T004, T006, T008, T012, T013, T015 |
| T003 | `noteLabel(note: Note): string` (moved to theory) | T008 |
| T004 | `sequenceOf(run, direction): readonly SequenceNote[]`, `SequenceNote` | T008, T013 |
| T005 | `pitchHzOf(note: Note): number` | T008 |
| T006 | `TEMPO_TERMS`, `tempoTermFor`, `steppedTempo`, `tempoForTerm`, `TempoTerm`, `SessionSettings`, `NoteLength`, `SoundMode`, `defaultSessionSettings`, `defaultTraversal`, `summaryLineOf` | T007, T008, T012, T014, T015, T016 |
| T007 | `startTransport`, `tickOf`, `advance`, `TransportState`, `Tick` | T008 |
| T008 | `SoundPort`, `ClockPort`, `WakeLockPort`, `VisibilityPort`, `Result` | T009, T011 |
| T008 | `createSession(...)`, `Session`, `SessionSnapshot`, `SessionDeps`, `TargetAdvanced` | T009, T014, T015, T016, T018 |
| T010 | `push_click`, `stop_all`, `report_ptr` ; processor posts `onset` | T011 (via engine), T018 |
| T011 | `webAudioSound`, `silentSound`, `screenWakeLock`, `pageVisibility`, `browserClock` | T016 |
| T012 | `StoredSelection` v3, `firstRunDefaults` | T013, T016 |
| T013 | `StaveView`/`NamesView`/`KeyPanel` new props | T016, T017, T018 |
| T014 | `TransportCard(props)` | T016, T017 |
| T015 | `TraversalRow`, `TraversalSheet`, `TempoSheet` | T016, T017 |
| T016 | `window.__session` (dev), `App(props)` | T018 |

## Deferred

- **Round 3 W1 (accepted by name)** — Article V's "late feedback is suppressed, not shown late" is not applied to the sounding-note highlight: the Article governs feedback on the learner's playing (`listening`, 005/006); the intent adopted only its numbered-budget-and-measurement discipline for playback (Q5). REQ-006 "SHALL always highlight" stands — an unlit note is worse than one a few ms late. Controller decision under the user's pre-approval; for the user to confirm at acceptance.
- **Round 3 W3 / rounds 4–5 (accepted by name)** — with the timer authoritative (T031) and the two-sided ±30 ms gate around the audible onset, this headless laptop measures the highlight 21–28 ms after the audible onset with occasional single samples at 30.1–30.6 ms (onsets exact, 0.00 ms; render work removed by T032 did not move it; a control timer lags identically). Not attributable to product code on this box. The harness stays strict. **Open for the user:** whether 30 ms is the right number, decided after the phone measurement at acceptance.

- **W5 (converge round 1)** — superseded: round 2 found the 30 ms bound *exceeded* on some runs (C1) → T029 fires the highlight from the scheduled onset. The phone re-measurement at the acceptance walk still stands.

- Wide/laptop layout — carried from 002; the design has none.
- Per-instrument timbre, volume control, metres other than 4/4, pause — out of scope by the proposal.
- The prototype's `progress`/`playhead` feedback styles — it fixes `minimal`; the others are dead code in the design.
- A `pnpm check` that includes `test:timing` — deliberately separate (plan open question 2, decided).

## Groups, in build order

- Phase 1 — Foundations
  _Rust workspace, the sound engine loaded in an AudioWorklet, one audible sine on the phone._
- Phase 2 — Theory: the traversal and the pitch
- Phase 3 — Practice: the transport, pure
- Phase 4 — Sound: the real engine and the adapters
- Phase 5 — UI from the prototype
- Phase 6 — Hardening
- Phase 7 — Converge round 1 findings

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
