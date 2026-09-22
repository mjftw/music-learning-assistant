---
type: Implementation Notes
title: 003-hear-the-scale — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/003-hear-the-scale/notes.md
status: draft
tags: [sdd, notes, "change:003-hear-the-scale"]
sdd_id: 003-hear-the-scale
---

# Notes — 003-hear-the-scale

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

## Implementation log

- T003 done — review PASS/PASS, no findings. Resumed from an interrupted first run; code matched the brief line for line.
- T004 done — review PASS/PASS. Minor: per-file test helpers duplicated (codebase convention); brief steps 3–4 labelled RED passed immediately (generic implementation).
- T005 done — review PASS/PASS, no findings. Phase 2 (theory) complete.
- T001 done — DONE_WITH_CONCERNS: the task put `[profile.release]` in the member manifest where Cargo ignores it; fixer (haiku) moved it to the root, reviewer confirmed `-C opt-level=s -C panic=abort` now applied. Review PASS/PASS; minor: `render(_now_frame)` parameter name differs from the brief (ABI identical).

## Spike

- Laptop, headless Chromium 153.0.8010.12: ok — `?worker&url` loaded via `audioWorklet.addModule` without a fallback; `WebAssembly.compileStreaming` against Vite's dev-served `.wasm` succeeded; the `?sound-spike` button read "ok" after the click with no console or page errors.
- Phone: not yet checked — user away; carried to the acceptance walk.
- T002 done — DONE_WITH_CONCERNS; review PASS/PASS. WASM-in-AudioWorklet confirmed in headless Chromium 153 (plan Risk 1 de-risked on the laptop; phone deferred to acceptance). Minor: onset test proves same-quantum onset only — tighten in T010 (assert the sample after onset is non-zero); test-only Mutex guards the shared static engine; implementer report file was not persisted (reconstructed).
- T006 done — review PASS/PASS. Minor: `TEMPO_STEP_BPM` exported per the interface but unused by `steppedTempo`. `tempoTermFor` throws outside 40–200 — judged correct (illegal state, §4). Reviewer sandbox lacks cargo on PATH (`source ~/.cargo/env` needed) — controller re-ran the full check.
- T007 done — review PASS/PASS. Minor: `tickOf(idle)` branch structurally forced, untested; one test title has an extra suffix.
- T008 done — DONE_WITH_CONCERNS (a `pendingAdvance` flag defers the transport advance so the snapshot reads the tick that just sounded — reviewer traced it as correct); review PASS/PASS. Minor: `flushStart` in the test flushes exactly two microtasks. **Reviewer finding carried:** metronome-only mode posts no tones, so onset-driven highlight (T009) would stall — REQ-005/S2 violated. T009 amended (Article IX, controller edit under the user's pre-approval): first sounding command of a playing tick carries the position tag; silent ticks use a clock timeout.
- T009 done — DONE_WITH_CONCERNS; review PASS/PASS. **Important (pre-existing from T008):** `restartIfPlaying()` did not post `stopAll`, so old-key tones in the lookahead could sound after a change — fixed in `d2837b5` with a REQ-007/S1 test extension, re-reviewed PASS/PASS. Minor: two REQ-010/invariant tests were already green under T008 (RED bookkeeping); `isTone`/`isClick` guards duplicated across two test files; `stop()` vs restart `stopAll` ordering differs (harmless). Carried to T019: silent-tick `clock.setTimeout` (metronome + quaver) not cancelled by `stop()`. Phase 3 complete.
- T010 done — DONE_WITH_CONCERNS; review PASS/PASS. Rust: 8 tests; onset test tightened (frame 73). Headless spike re-run green with the enveloped tone. Minor: `index.ts` edit outside the Files list (necessary — singular `report` → `reports[]`); quantum-boundary exactness correct by construction, not unit-tested.
