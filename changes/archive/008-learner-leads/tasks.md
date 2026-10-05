---
type: Task List
title: Learner leads — tasks
description: 22 tasks across four phases — foundations (the lead domain, the store), the lead run in the Session aggregate, the practice screen (card, meter, panels, sheet), the harness and hardening.
resource: /changes/008-learner-leads/tasks.md
status: stable
tags: [sdd, tasks, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/plan.md
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /changes/008-learner-leads/delta/practice/session.md
  - resource: /changes/008-learner-leads/design/handoff.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T17:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-10-02T16:34:00Z
sdd_id: 008-learner-leads
sdd_context: practice
sdd_phase: complete
---

# Tasks: Learner leads

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
> **The worked example everywhere:** C major on flute Concert, ↑↓, 1 oct,
> scale — the run C4 D4 E4 F4 G4 A4 B4 C5, the sequence of 15 notes · C4–C5.
> Pitches: C4 261.63 Hz, D4 293.66, E4 329.63; 262.5 Hz is C4 +6 ¢, 258.92
> is −18 ¢, 264.47 is +19 ¢; 330.6 is E4 +5 ¢, 331.15 +8 ¢, 331.92 +12 ¢,
> 332.9 +17 ¢; C5 523.25 is C4 +1200 ¢. Medium = ±10 ¢; 2 beats at 96 bpm =
> 1250 ms, at 120 bpm = 1000 ms. The detector's hop is 512 frames at 48 kHz
> = 10.667 ms. **Smoothing (practice.tuner/REQ-002) is on:** a steady tone
> reads exactly (the first reading after silence or a new target is as
> detected); a step of less than 25 ¢ creeps a tenth of the way per reading,
> so a reading that must *leave* the band is fed for ~100 ms, not once.

## Coverage

> Every `REQ-` in the spec appears at least once. Every task cites a
> requirement or sits in Foundations / Hardening.

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-014 (the mode) | T005, T012 | ✅ |
| practice.session/REQ-015 (a lead run) | T002, T005, T007, T008, T013 | ✅ |
| practice.session/REQ-016 (the judgement and the hold) | T001, T002, T003, T006, T019 | ✅ |
| practice.session/REQ-017 (the meter and the card) | T002, T006, T011, T013, T014, T015 | ✅ |
| practice.session/REQ-018 (cues) | T001, T011, T014, T016, T019 | ✅ |
| practice.session/REQ-019 (changes while leading) | T010, T014 | ✅ |
| practice.session/REQ-020 (the Traversal sheet) | T001, T016 | ✅ |
| practice.session/REQ-021 (the budget) | T006, T019, T021 | ✅ |
| practice.session/REQ-022 (no microphone) | T009, T013 | ✅ |
| practice.session/REQ-002 (play and stop — modified) | T005, T012 | ✅ |
| practice.session/REQ-009 (hidden; awake — modified) | T009 | ✅ |
| practice.session/REQ-011 (remembered — modified) | T001, T004, T017 | ✅ |
| practice.session/REQ-013 (tapped note — modified) | T008 | ✅ |

Scenario IDs by task — REQ-014: S1 S2 S3 S4 (T005), S1 S2 (card, T012), S5 (T005 via `session-transport`); REQ-015: S1 S2 S8 (T005), S3 S4 (T002, T007), S5 S7 (T008), S6 (T008 `never-both`), S1 S3 (card, T013); REQ-016: S1–S4 S7–S9 (T002, T006), S5 (T001, T006), S6 (T003); REQ-017: S1 (T006, T013, T014, T015), S2 S3 S5 (T013, T014), S4 (T011, T013), S6 (T014, T015), S7 (T006), S8 (T014); REQ-018: S1 (T011, T014), S2 S3 S4 (T011), S3 measured (T019), S5 (T001, T016); REQ-019: S1–S5 (T010), S2 (meter, T014); REQ-020: S1–S5 (T016), S4 (T001); REQ-021: S1 (T019), S2 (T006), S3 (T021), S4 (the user's walk at the design loop); REQ-022: S1–S4 (T009), S1 (card, T013); REQ-002: S1 S2 S5 (T012), S3 S4 (unchanged tests, T005); REQ-009: S1 (unchanged), S2 S3 (T009); REQ-011: S1 S2 S5 (T004, T017), S3 S4 (T017 extends); REQ-013: S1–S4 S6 (unchanged), S5 S7 (T008).

## Interface consistency

> Signatures a later task *consumes* match what an earlier task *produces*,
> character for character. List each pair.

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `TOLERANCE_CENTS`, `requiredHoldMs(beats: HoldBeats, tempoBpm: number): number`, `LeadSettings`, `defaultLeadSettings` | T002, T003, T004, T005, T006, T016 |
| T001 | `verdictOf(cents: number, bandCents?: number): Verdict` | T006 |
| T001 | `holdHintOf`, `toleranceHintOf`, `cuesHintOf`, `whoHintOf` | T016 |
| T002 | `applyJudgement(phase, judged, atMs, settings, tempoBpm, sequence, loop): { phase; advanced }`, `applySilence(phase)`, `heldFractionOf(hold, requiredMs)`, `targetAt(sequence, position)`, `emptyHold`, `LeadPhase`, `LeadTarget` | T003, T005, T006, T007 |
| T002 | `LEAD_GAP_MS`, `CUE_TONE_MS`, `CUE_TAIL_MS`, `HELD_TICK_MS` | T006, T011 |
| T004 | `lead.holdFill` (theme.ts); stored v6 `session.lead` | T014, T017 |
| T005 | `SessionSnapshot.lead: LeadSnapshot`; `start()`/`stop()`/`setSettings` dispatch; `tests/practice/lead-helpers.ts` (`leadFixture`, `leadSettings`, `startLead`, `hearAt`, `hearSteady`, `holdThrough`, `letGapPass`, `HOP_MS`, `frameOfMs`) | T006–T017 |
| T006 | `snapshot.lead.reading`, `snapshot.lead.heldFraction`; `NoteJudged`/`TargetAdvanced` from a lead run | T007–T015, T019 |
| T011 | `snapshot.lead.justHeld`; the cue voice | T013 |
| T012 | `onWho`, `data-testid` `mode-word-tool` / `mode-word-me` / `start-circle` / `tuner-glyph` / `transport-card` | T013, T016, T017 |
| T014 | `NoteMeter({ geometry, toleranceCents, heldFraction, reading })`, `MeterGeometry`; `StaveView` `leadTarget` / `onTargetBox`; `noteMeter` tokens | T015 |
| T016 | `sheet-row` / `row-hint` / `sheet-close` / `sheet-hairline` test ids; `Switch` | T017 |
| T018 | `scripts/harness-lib.mjs` exports | T019 |

## Deferred

- The tone cue's acoustic tail on the phone (`CUE_TAIL_MS` = 100) and the 0.4 s "held ✓" — tuned in the design loop on the device, not here (intent: still open).
- A `requestAnimationFrame`-throttled fill (30 Hz) — only if `test:lead`'s paint-age column shows the per-reading fill update costing paint on the phone (plan risk).
- Promoting `#756c60` (the unselected pill ink the sheet already uses) to a token — T016 says so if `check-design.sh` warns; otherwise it stays as the shipped sheet has it.

## Groups, in build order

- Phase 1 — Foundations
  _Nothing user-visible. The lead domain module, the settings, the store._
- Phase 2 — The lead run in the Session aggregate
  _Ends with a lead run that starts, judges, holds, advances, completes and stops — through `practice/published`, no UI._
- Phase 3 — The practice screen
  _Ends with the eleven states reachable on the live app._
- Phase 4 — The harness and hardening

## Tasks

One file per task under `tasks/`; the live table is `tasks/index.md`.
