---
type: Task List
title: Hear me — tasks
description: 25 tasks across 5 phases — the listening crate and its contract, the session holding the tuner, the tuner screen, the measured harness, hardening.
resource: /changes/007-hear-me/tasks.md
status: stable
tags: [sdd, tasks, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/plan.md
  - resource: /changes/007-hear-me/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-28T01:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T22:29:42Z
sdd_id: 007-hear-me
sdd_context: listening
sdd_phase: complete
---

# Tasks: Hear me

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.** "Add error handling",
> "handle edge cases", "like T011 but for Y", `TBD`, and a test described in
> prose instead of written out are all failures.
>
> Steps are 2–5 minutes each. A task is 3–8 steps. Larger → split.
> `[P]` after the ID: no dependency on the neighbouring `[P]` tasks.
>
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> Every RED step names the scenario ID it proves. A task with no scenario is
> Foundations or Hardening.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.
>
> Conventions that hold for every task here: `cargo` is on PATH only after
> `source ~/.cargo/env`; run it as `bash -c "source ~/.cargo/env && cargo …"`.
> Frame numbers are in `pitchPosition` semitones for notes (C4 = 60, A4 =
> 69, E2 = 40, C7 = 96) and in AudioContext frames at 48 000 Hz for time
> (100 ms = 4800 frames, 50 ms = 2400). Test names cite scenario IDs fully
> qualified. Tests reach a context only through its `published/`.

## Coverage

> Every `REQ-` in the spec appears at least once. Every task cites a
> requirement or sits in Foundations / Hardening.

| Requirement | Tasks | Covered |
|---|---|---|
| listening.pitch-detection/REQ-001 | T003 | ✅ |
| listening.pitch-detection/REQ-002 | T001, T021, T022 | ✅ |
| listening.pitch-detection/REQ-003 | T001, T002, T021 | ✅ |
| listening.pitch-detection/REQ-004 | T002, T010, T021 | ✅ |
| listening.pitch-detection/REQ-005 | T012 | ✅ |
| listening.pitch-detection/REQ-006 | T003 | ✅ |
| practice.tuner/REQ-001 | T007, T013, T014 | ✅ |
| practice.tuner/REQ-002 | T006, T008, T015, T018, T026, T027, T032, T033, T034, T036, T037 | ✅ |
| practice.tuner/REQ-003 | T008, T015, T031, T038 | ✅ |
| practice.tuner/REQ-004 | T006, T009, T017, T028, T034 | ✅ |
| practice.tuner/REQ-005 | T016, T029, T030, T033 | ✅ |
| practice.tuner/REQ-006 | T010, T019, T021, T024 | ✅ |
| practice.tuner/REQ-007 | T011, T018 | ✅ |
| practice.tuner/REQ-008 | T012 | ✅ |
| practice.tuner/REQ-009 | T009, T018, T028 | ✅ |
| theory.temperament/REQ-002 | T004 | ✅ |

Scenario → task: listening REQ-001/S1–S3 T003; REQ-002/S1–S5 T001 (S5 also T021); REQ-003/S1, S2, S4 T001, S3 T002; REQ-004/S1, S2 T021, S3 T002 + T010; REQ-005/S1–S2 T012; REQ-006/S1–S3 T003. practice.tuner REQ-001/S1, S2, S4 T007, S3 T013; REQ-002/S1–S5 T008 (S1, S2, S5 also T015/T018), S6–S8 T026, S9 T027; REQ-003/S1–S3 T008 (S1 also T015), S4–S6 T031; REQ-004/S1–S6 T009 (S1, S2, S4–S6 also T017), S7–S8 T028; REQ-005/S1–S4 T016, S5–S6 T029; REQ-006/S1 T021, S2 T010, S3 T024; REQ-007/S1–S3 T011 (also T018); REQ-008/S1–S2 T012; REQ-009/S1 T018, S2 T009, S3 T028. theory.temperament REQ-002/S1–S5 T004.

## Interface consistency

> Signatures a later task *consumes* match what an earlier task *produces*,
> character for character. List each pair.

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection>` | T002 |
| T002 | `push(now_frame: f64) -> u32`, `input_ptr() -> *mut f32`, `result_ptr() -> *const f64`, `init(sample_rate: f32)` | T003 (the shim) |
| T003 | `createListener(context: AudioContext, mediaDevices?: MediaDevices): Promise<ListenerOutcome>`; `type PitchDetected`, `ListeningUnavailable`, `ListeningEnded` | T005, T006 |
| T004 | `nearestNoteOf(hz: number, spelling: SpellingPreference): { readonly note: Note; readonly cents: number }`; `noteAtPosition(position: number, spelling: SpellingPreference): Note` | T006, T009, T015, T017 |
| T005 | `interface ListeningPort`; `class FakeListening` (`feed`, `end`, `failWith`, `frame`, `startCalls`, `stopCalls`, `listening`); `FakeVisibility.show()`; `SessionDeps.listening` | T007–T012, T014–T019 |
| T006 | `judge(pitch, target, shown, spelling): { judged, shown }`; `nearestWithHandover`; `canStepTarget`; `semitoneCountOf`; `TunerSnapshot`; `TunerTarget`; `NoteJudged`; the five constants | T007–T010, T015–T017 |
| T007 | `Session.enterTuner(): void`, `leaveTuner(): void`, `onNoteJudged(listener): () => void`; `SessionContext.spelling`; `SessionSnapshot.tuner` | T008–T019 |
| T009 | `Session.holdTarget(): void`, `pinTarget(position: number): void`, `stepTarget(delta: -1 \| 1): void`, `clearTarget(): void` | T016, T017 |
| T010 | `Session.readingShown(atFrame: number): number` | T019 |
| T014 | `TunerScreen(props)`; `Header.onOpenTuner`; `theme.tuner`; `window.__listening` | T015–T019, T021 |
| T019 | `App.onPaintAge`; `window.__paintAgesMs` | T021 |

## Deferred

- A 1024 hop / sparser lag grid / ×2 downsampling — only if T001's cost or T021's budget demands it (the plan's ordered knobs); not built speculatively (Article VIII).
- The spiral's hover state ("TAP FOR" + the note) — rendered as the design draws it but not asserted: the phone never hovers.
- Chromium's file-based fake microphone — the fallback route for T021 if the in-page override cannot be attached; not built unless needed.
- Tablet / laptop layouts of the tuner — design §2 "later".
- **Converge W6** (`.sdd/reports/007-hear-me/converge.md`): the consumed `PitchDetected` shape appears directly in practice's domain code (`domain/tuner.ts`, `domain/session.ts`) rather than translated at the `ListeningPort` adapter. Accepted by the user as this repo's established reading — `sound`'s events have crossed the same way since 003, and `check-contexts.sh` is clean. To be raised as a `docs/engineering.md` §6 question (whether a port signature may carry the upstream context's own published event type) via `sdd-engineering` › Refine, in a later session — not built here.
- **Converge W7, the rest** (`.sdd/reports/007-hear-me/converge.md`; corrected 2026-09-29 by round 2's W5 — `#b0a797` was wrongly included here, see T045): `#e0d7c5`, `#756c60`, `#5e564c` are pre-existing, repo-wide unpromoted literals (verified by `git log -S`: each traces to 002/003/004, present in `CircleOfFifths.tsx`, `DronePill.tsx`, `DroneSheet.tsx`, `KeyPanel.tsx`, `overlay.tsx`, `ScaleRow.tsx`, `TransportCard.tsx`, `TraversalSheet.tsx` and others), not introduced by 007 — `check-design.sh` only scans `.css`, so it never caught any of them, in this change or any earlier one. Promoting them is a repo-wide token exercise, not proportionate to this slice; T039 and T045 fix the two exact/promotable matches in 007's own files. The tooling gap (`check-design.sh` should scan `.tsx` literals too) is proposed via `sdd-engineering` › Refine alongside W6, not built here.
- **Converge round 2, shipped with these open** (`.sdd/reports/007-hear-me/converge.md`): the user chose to stop the convergence loop and ship — C1 (T040), W1 (T041), W2 (T042), W3 (T043), W4 (T044) and W5's correction (T045) are tracked as follow-up tasks above, not built before this PR. The change was NOT marked `implemented`/`converged`; that gate is still open.

## Groups, in build order

- Phase 1 — Foundations (the listening crate, its contract, the port)
  _Nothing user-visible. The detector proven on synthesised buffers, the crate's C ABI, the published contract, the nearest-note lookup, the port and the fakes._
- Phase 2 — The session holds the tuner
  _Ends with the whole tuner observable through `practice/published` with the fakes: enter, read, target, budget, cannot hear, hidden, leave._
- Phase 3 — The tuner screen
  _Ends with the tuner reachable from the header, grey and correct against 4a / 5c; the phone can enter it._
- Phase 4 — The measured harness
- Phase 5 — Hardening

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
