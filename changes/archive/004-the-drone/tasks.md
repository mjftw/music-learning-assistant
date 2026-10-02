---
type: Task List
title: The drone — tasks
description: 21 tasks across 4 phases — the addressable drone voice in the sound crate, the session owning the drone and the tapped note, the pill, the sheet and the tap targets in the UI, then hardening.
resource: /changes/004-the-drone/tasks.md
status: stable
tags: [sdd, tasks, "change:004-the-drone"]
sources:
  - resource: /changes/004-the-drone/plan.md
  - resource: /changes/004-the-drone/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T17:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T23:37:47Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: complete
---

# Tasks: The drone

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
> Every RED step names the scenario ID it proves. A task with no scenario is
> Foundations or Hardening.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.
>
> Frame arithmetic throughout assumes the fakes' 48 000 Hz sample rate:
> 20 ms (`FIRST_TICK_LEAD_MS`) = 960 frames, 50 ms = 2 400, 80 ms
> (`DRONE_RELEASE_MS`) = 3 840, one beat at 96 bpm = 30 000, at 120 bpm =
> 24 000. `src/sound/pkg/sound.wasm` is not tracked by git: after any Rust
> change run `pnpm build:sound` before `pnpm check` (which runs vitest
> against the staged binary).

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.drone/REQ-001 | T002, T006, T013, T015, T019 | ✅ |
| practice.drone/REQ-002 | T005, T007, T013 | ✅ |
| practice.drone/REQ-003 | T003, T007 | ✅ |
| practice.drone/REQ-004 | T008, T009 | ✅ |
| practice.drone/REQ-005 | T002, T003, T006, T014 | ✅ |
| practice.drone/REQ-006 | T013, T014, T015 | ✅ |
| practice.drone/REQ-007 | T010 | ✅ |
| practice.drone/REQ-008 | T010, T015 | ✅ |
| practice.drone/REQ-009 | T012, T015 | ✅ |
| practice.session/REQ-013 | T011, T016, T017 | ✅ |

Scenario → RED step: REQ-001 S1 T002/T006/T015 · S2 T002/T006 · S3 T014/T015 · S4 T015; REQ-002 S1 T005 · S2 T007 · S3 T007 · S4 T007/T013 · S5 T005 · S6 T007; REQ-003 S1 T003/T007 · S2 T007 · S3 T007; REQ-004 S1 T008 · S2 T008 · S3 T009; REQ-005 S1 T014 · S2 T002/T006 · S3 T003/T006 · S4 T002 (rendered level; the command half in T011's S3); REQ-006 S1 T014 · S2 T015 · S3 T014; REQ-007 S1 T010 · S2 T010; REQ-008 S1 T010/T015 · S2 T010 · S3 T010; REQ-009 S1 T015 · S2 T015 · S3 T012 · S4 T012; REQ-013 S1 T011/T016 · S2 T017 · S3 T011 · S4 T011 · S5 T011/T016 · S6 T017.

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `pub enum Length { Frames(u32), UntilStopped }`; `Voice::new(tag: u32, kind: VoiceKind, onset_frame: f64, length: Length)`; `Voices::stop(&mut self, tag: u32)`; `extern "C" fn stop(tag: u32)` | T002, T003, T004 |
| T002 | `Drone::new(hz: f32, sound: DroneSound) -> Self`; `Drone::next_sample(&mut self, elapsed_frames: f64, sample_rate: f32) -> f32`; `DroneSound::from_code(code: u32) -> Option<DroneSound>`; `extern "C" fn push_drone(tag: u32, hz: f32, onset_frame: f64, sound: u32) -> u32`; `RELEASE_S = 0.080` | T003, T004, T006 (`DRONE_RELEASE_MS = 80`) |
| T003 | `Drone::retune(&mut self, hz: f32, sample_rate: f32)`; `Voices::retune(&mut self, tag: u32, hz: f32)`; `extern "C" fn retune(tag: u32, hz: f32)` | T004 |
| T004 | `droneSoundSchema`, `type DroneSound`; `SoundCommand` ∪ `{ kind: "drone"; tag; hz; onsetFrame; sound }`, `{ kind: "retune"; tag; hz }`, `{ kind: "stop"; tag }`; `FakeSound.posts: PostedCommand[]`; `isDrone`, `isRetune`, `isStop`, `isTone`, `isClick` | T005–T012, T015–T017, T019 |
| T005 | `DroneOctave`, `DroneSettings`, `defaultDroneSettings`, `PIANO_LOWEST_POSITION = 21`, `PIANO_HIGHEST_POSITION = 108`, `defaultDroneOctave(tonic: PitchClass, range: NoteRange): number`, `droneNoteOf(key: Key, variant: Variant, settings: DroneSettings): Note`, `canStepDroneOctave(note: Note, delta: -1 \| 1): boolean` | T006, T007, T012, T015 |
| T006 | `DroneSnapshot`; `SessionSnapshot.drone`; `DRONE_RELEASE_MS = 80`; `createSession(context, traversal, scaleChoice, settings, droneSettings: DroneSettings, deps)`; `Session.startDrone(): void`; `Session.stopDrone(): void`; `Session.setDroneSound(sound: DroneSound): void`; `startDroneAndFlush(session: Session): Promise<void>`; `sessionOn(…, scaleChoice = defaultScaleChoice, droneSettings = defaultDroneSettings)` | T007–T011, T015, T019 |
| T007 | `Session.stepDroneOctave(delta: -1 \| 1): void` | T015 |
| T011 | `SessionSnapshot.tappedRunIndex: number \| null`; `Session.tapNote(runIndex: number): void` | T016, T017 |
| T012 | `StoredSelection.drone: { octave: number \| null; sound: DroneSound }`; `schemaVersion: 5`; `firstRunDefaults.drone` | T015 |
| T013 | `DronePill(props: { noteLabel; on; canStepDown; canStepUp; onToggle; onStepOctave: (delta: -1 \| 1) => void; onOpenSheet })` | T015 |
| T014 | `DroneSheet(props: { open; noteLabel; hz; on; sound: DroneSound; onToggle; onPickSound: (sound: DroneSound) => void; onClose })`; `OverlayHeader` `subtitle?`, `trailing?` | T015 |

## Deferred

- On the phone the sound slightly leads the highlight for the first three notes of each run, then aligns (T024, 2026-09-26) — the first-tick lead and highlight aim (`FIRST_TICK_LEAD_MS`, `HIGHLIGHT_LEAD_MS`) to revisit after this change ships; not a drone regression (the transport is untouched).
- A wavetable per drone sound instead of per-sample additive synthesis — only if T002's benchmark shows a quantum over 500 µs on the laptop or the phone crackles at acceptance (ADR 0005, "Revisit if").
- Extending `pnpm test:timing` to the drone's onset and retune — the budgets here (50 ms, 100 ms) are ten times playback's and are proved on the fakes' frame clock; a measured harness earns its place only if the phone says otherwise.
- `docs/domain.md` (sound's Voice noun, the never-both invariant, the session settings) and `docs/glossary.md` (Drone sound, Tapped note) — re-approved at `sdd-finish`, per the proposal's Affects table.

## Groups, in build order

- Phase 1 — Foundations (the sound crate and its published contract)
  _Nothing user-visible. The voice model widens (ADR 0005); the schema and the worklet shim learn three commands; the fakes learn to record them._
- Phase 2 — The session holds the drone
  _Ends with a drone that starts, stops, retunes, excludes playback and survives the page — all through `practice/published` on the fakes._
- Phase 3 — The UI
  _Ends with the pill in the disc, the sheet, the tap targets and the remembered settings, screenshot-comparable against the design._
- Phase 4 — Hardening
- Phase 5 — Converge round 1 (2026-09-25, report `.sdd/reports/004-the-drone/converge.md`)

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
