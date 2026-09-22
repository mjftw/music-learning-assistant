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
- T011 done — review PASS/PASS. Carried: `webAudioSound.currentFrame()` is 0 without an engine, so the real app needs the silent adapter to take over on a failed start — T016 amended to add `fallbackSound(primary, fallback)` with a test (the plan's stated design). Phase 4 complete.
- T012 done — review PASS/PASS. Out-of-range v3 tempo → `null` confirmed. Minor: one test lacks the `localStorage.clear()` opener. Tree intentionally red in App.tsx until T013.
- T012 fix — store test names cited unqualified ids (T012 reviewer's 'verbatim' claim was wrong); haiku fixer qualified them; verified by the scenario checker.
- T013 done — DONE_WITH_CONCERNS; review PASS/PASS. Span deleted; `span` survives only in the v2 migration schema (intended). Minor: two span-pill assertions removed from selection-persistence.test; REQ-006/S1 test title paraphrased; end-to-end REQ-006/S1 (caption + highlight during playback) lands with T016. Scenario gaps remaining: REQ-005/S4 (Rust test needs the id in a comment — T019), REQ-006/S4 + REQ-008/S1 (T018 timing).
- T014 done — review PASS/PASS, no findings. Progress width is unrounded per the brief (design script rounds) — a deliberate override; design review (T017) will judge the visual.
- T015 done — review PASS/PASS. `BottomSheet` extracted into overlay.tsx (InstrumentSheet migrated, tests green) — the duplication remedy worked this time. Minor: sheets toggle `display` so the declared slide transition does not animate (same as 002's InstrumentSheet); tests bundle several Givens per scenario.
- T016 done — first review **SPEC FAIL**: a DEV-gated skip of the first effect cleanup (StrictMode workaround) meant `dispose()` never ran on a real unmount in dev/test (reviewer proved the leaked visibility listener). Fixer: symmetric `useEffect` (create → dispose), two regression tests (unmount disposes; StrictMode still plays); `testSessionDeps` deduplicated into fakes. Re-review PASS/PASS. Controller sign-offs: additive `onSessionReady` prop (dev hook for the timing harness); one passive-effect frame with an empty stave before the first snapshot (minor, unobservable in tests). Real WebAudio smoke in headless Chromium: count-in → notes → halo → stop, no notice. Phone walk still deferred.
- T017 round 1 — design-shots retargeted (five states); independent comparison: **MATCH on all five** (prototype frame offset 54px@2x accounted for; en dashes confirmed in source).
- **User finding (2026-09-22, mid-T017):** "On quaver setting the stave is still showing minims but should be showing quavers like in design." Neither spec nor tasks covered the prototype's quaver flags (design script 454–464). Delta amended in flight (Article IX, under the user's pre-approval): REQ-003 sentence + S5; task T021 added. Same review: the prototype's idle caption counts the ↑↓ *sequence* ("15 notes · F5–F6" for an 8-note run) — I had ruled the spec's run count wins; reversed under "the design is the source of truth": REQ-002 amended (S2–S4 values), task T022 added. Open observation: the user's screenshot shows the stave drawing all 13 in-range notes with a 1-oct traversal, which neither the vendored prototype's code nor the app does — the live Claude Design project may have moved past the handoff; ask for a fresh export at acceptance.
- T021 done — review PASS/PASS; `quaver-stave` pair MATCH (flags pixel-identical). Minor: the brief named G6 as the top of an 8-note run (it is G5); the stave row aligns at ~46 px @2x vs the wheel's 54 px in the prototype captures (harness property).
- **User decision (2026-09-22):** "ditch the Note length settings altogether and just stick to crotchets, we don't need quaver mode." Deltas and proposal amended (REQ-003 sentence + S5 removed; REQ-004 renamed, S4 now a tempo-change scenario; REQ-005/REQ-008/REQ-011 wording; summary line loses the ♩ segment); domain.md Session settings updated; T021 superseded; T023 added. This is a deliberate departure from the prototype's Traversal sheet (its Note length row), like 002's footer removal.
