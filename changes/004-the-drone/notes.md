---
type: Implementation Notes
title: 004-the-drone — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/004-the-drone/notes.md
status: draft
tags: [sdd, notes, "change:004-the-drone"]
sdd_id: 004-the-drone
---

# Notes — 004-the-drone

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

- T001 (minor, reviewer): `Voices::stop_all` and `Voices::stop(tag)` are near-identical loops marking `Fade::Requested`; a private `request_fade(matches)` helper would fold them — left as is at 5 lines each.
- T001: `#[allow(dead_code)]` on `Length::UntilStopped` until T002's `push_drone` constructs it — the crate is a `cdylib`, so an unconstructed `pub` variant trips `-D warnings`; comment names T002.
- T002: the reed drone renders in 21–31 µs per 128-frame quantum (release build, laptop) against the plan's 500 µs cap — `MAX_HARMONIC` stays 24; the wavetable fallback (ADR 0005) is not needed.
- T002 (minor, reviewer): `a_drone_renders_without_large_steps_across_attack_and_stop` does not assert `push_drone`'s return value, unlike its two siblings — mirrors the brief's sketch; fold in if the file is touched again.
- T003: the glide's `hz`/`target_hz`/`glide_per_frame` are f64 inside `Drone` (public signatures f32 as planned) — per-frame f32 accumulation drifted 0.019 Hz over the 1920-frame glide and missed the 0.01 Hz tolerance; the plan's data-model sketch said f32.
- T003 (fixer round 1): the test-only `Drone::hz()` is gated `#[cfg(test)]`, not `#[allow(dead_code)]` — the cdylib crate counts only `extern "C"` items as public.
- T004: `sessionOn` was listed in the task's Files but needs no change until T006 (its drone-settings parameter) — left untouched; the brief's `let now = 0` became `const` for `prefer-const`.
- T005: `defaultDroneOctave` ends in a `throw` for a tonic with no octave 0–8 inside A0–C8 — unreachable for any pitch class the theory context can spell (𝄫 to 𝄪 all fit), guarded by a comment (engineering §4); the invariant test never reaches it.
- T006: the planned `acquireSound()` extraction was not done as an async helper — one more awaited hop breaks the fakes' "two microtask flushes after start()" convention; a synchronous `noticeFromSoundStart` is shared instead and the six-line `await sound.start()` block stays in both `start()` and `startDrone()`.
- T006 (minor, reviewer, carried to T010): `startDrone()` does not reset `notice = null` on entry as `start()` does — REQ-008/S2's test will require it.
- T006: `tests/ui/scenarios/transport-card.test.tsx` builds a `SessionSnapshot` literal and gained a placeholder `drone` block (ripple outside the Files list).
- T007: `expect.closeTo(…)` nested in a `toEqual` literal is typed `any` by Vitest and trips `no-unsafe-assignment`; the four such assertions carry a commented `as number` cast. Future briefs should assert `toBeCloseTo` on the scalar instead (the repo's convention).
- T009: the never-both enumeration found a real gap — `startDrone()` while already sounding re-tagged the drone and orphaned the first voice (sequence drone ▶ → drone ▶ → ▶); fixed with `if (droneOn) return;` at the top of `startDrone()` (REQ-001 defines ▶ only "while the drone is off").
- T009 (informational, reviewer): `session.stop()` while the drone is on silences it at the engine (`stopAll` fades a drone over its release) but leaves `droneOn` stale — unreachable from the UI (❚❚ is never shown while the drone sounds); the hidden-page path calls `stop()` then `stopDrone()` explicitly (T010).
- T010: `startDrone()` now resets `notice = null` on entry (the T006 gap; REQ-008/S2 failed RED on it). `dispose()` → `stopDrone()` before `sound.dispose()` has no test of its own — T019 adds one (dispose while sounding posts `stop` and releases the wake lock).
- T011: the tap's beat is exactly `tickFramesOf()` (625 ms at 96 bpm); the brief's `clock.advance(624)` became 599 because `advanceUntil`'s 25 ms stepping settles the fake clock 25 ms past the highlight's due instant — a harness artefact, assertions unchanged.
- T011: `restartIfPlaying()` ends a sounding tap unconditionally (a recompute while idle makes the tapped run index stale) — plan text, no scenario of its own.
- T011: the full parallel `pnpm check` intermittently timed out two exhaustive invariants (`sequence-range`, `target-in-sequence`) at vitest's 5 s limit under machine load; they pass alone in under 3 s and the next full runs were green — not a regression of this change.
- T013: the design's disc pill also opens the sheet when the note label itself is tapped; the brief wired only ▼ to `onOpenSheet` — the label is plain text. Check at acceptance whether the label should open the sheet too.
- T015 (fixer round 1): the UI scenarios' rich session-deps fixture is now one exported `sessionDepsWithFakes(sound?)` in `tests/practice/fakes.ts` (`testSessionDeps()` delegates to it); the controller's dispatch had wrongly told the implementer to copy `app-session.test.tsx`'s local helper.
- T015: the full parallel `pnpm check` now times out the two exhaustive invariants (`target-in-sequence`, `sequence-range`) in most runs — the suite grew past 55 files and both sit at vitest's 5 s default; serialised (`--no-file-parallelism`) all 221 tests pass. Controller decision: give those two tests an explicit 20 s timeout (assertions unchanged) so `pnpm check` is meaningful again.
- T016: `stave-view.test.tsx`'s eleven direct `<StaveView>` renders gained the two new required props (ripple); the S5 test waits for the first sounding halo with `advanceUntil` rather than a fixed 2100 ms (the first highlight lands at 2500 ms at 96 bpm with count-in).
- T017: `names-view.test.tsx`'s seven direct `<NamesView>` renders gained the two new required props (ripple).
- T018: the Ideas canvas's `dc-import` fetches its sibling `Drone.dc.html` at runtime and Chromium refuses `fetch` on `file:` URLs, so `design-shots.mjs` seeds the design runtime's own `window.__resourceBlobs` hook with the component source; frames are captured by `fullPage` + `clip` on the phone-frame box. 005's nine states were replaced.
- T018 (fidelity, for acceptance): pill and sheet match the design essentially pixel-for-pixel; the prototype frames default to the stave view while the app's first run is the names view (prototype-authoring leftover); a small pre-existing circle offset also shows on 005's untouched pairs.
- T020: `pnpm test:timing` run 1 missed `vs audible` at 200 bpm by 0.57 ms (30.57 ms; onset dev and drift 0.00), run 2 passed at 29.33 ms — the laptop headroom 003/005 accepted by name; the transport and scheduler are untouched by this change. Review stage skipped for T020 (a two-clause doc edit, Trivial-class).
- T024 (2026-09-26): laptop harness against the phone server PASS (21.33 / 27.67 / 29.33 ms vs audible); phone: sound slightly leads the highlight on the first three notes of each run, then aligns — deferred to after 004 (see tasks › Deferred, decisions.md).
