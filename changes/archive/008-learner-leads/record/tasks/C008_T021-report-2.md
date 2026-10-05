---
type: Implementation Report
title: C008_T021 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T021.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T021.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-04T10:40:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T021
STATUS: DONE
COMMIT: see git log (timeout round: `test(ui): explicit timeouts on the app-sized tests ...`; fix round c28290a; first attempt 5f303a0)
FILES:
tests/ui/scenarios/{app-drone,circle-spelling,selection-persistence,selector-and-notices,stave-view}.test.tsx (timeout round: `, 15_000` on one test each)
tests/practice/scenarios/lead-edge-cases.test.ts (new)
tests/practice/lead-helpers.ts (ripple: `sessionWithEmptyRun(settings)` + `noNotesVariant` extracted from lead-run.test.ts)
tests/practice/scenarios/lead-run.test.ts (ripple: imports the extracted helper)
scripts/timing-test.mjs (ripple: see CONCERNS 2)
Fix round (D003): src/practice/domain/session.ts (guard in start()), tests/practice/scenarios/lead-edge-cases.test.ts (play-along test + header)

VERIFY / CHECK:
`pnpm check` (exit 0): Test Files 93 passed (93), Tests 453 passed (453); last lines:
```
   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(cargo: `test result: ok. 24 passed; 0 failed; 1 ignored`.) One earlier run had
`practice.drone/REQ-001/S4 (app)` time out at 5077 ms under load (first full run, while
other work ran); passed alone and in two further full runs.

HARNESS PASS LINES (verbatim):
- test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
  (40 bpm: onset dev 1.33, drift 0.09, vs audible 20.00; 96: 1.33 / 0.04 / 22.57; 200: 1.33 / 0.04 / 22.57)
- test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
  (sine worst first readout 74.90 ms, arrival age 61.31 ms, cents err 0.09; flute-like 70.70 / 63.98 / 0.65; shown err ≤1 ¢)
- test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
  (lead run C4–C5: 15 targets, first readout max 70.33 ms, arrival 5.35, readings/s min 94.21, advance lateness 0 frames, shown lateness 16.02 ms; tone cue fed back: 3 targets, 62.33 / 8.02 / 83.40 / 0 / 10.69)

HYGIENE:
- `./scripts/check-contexts.sh` — context boundaries respected.
- `./scripts/check-design.sh --change changes/008-learner-leads` — design checks clean (3 known `src/ui/global.css` literals only).
- `./scripts/check-scenarios.sh --change changes/008-learner-leads` — first run named three gaps, all
  practice.session/REQ-021: S1 (measured, `pnpm test:lead`), S3 (measured, `pnpm test:timing`), S4 (phone
  acceptance). They are not unit-testable; attributed in `lead-edge-cases.test.ts` the way 007 did
  (`tuner-harness.test.ts`): a guard test that the two harness scripts exist and cite what they measure, plus a header
  comment citing S1/S3/S4 (S4 is the user's phone sign-off, not a test). Re-run: "scenario coverage complete", no gaps.
  Also the standing `check-scenarios.sh` (no `--change`): complete.
  Note: the invocation as written in the dispatch (`check-scenarios.sh changes/008-learner-leads`, no `--change`)
  checks the living specs; the per-change form needs `--change`.

COVERAGE (proposal edge-case row -> covering test):
- Empty / first-run state -> `tests/practice/scenarios/lead-settings.test.ts` "practice.session/REQ-011/S2 — the lead defaults"; `tests/ui/scenarios/selection-store.test.ts` "practice.session/REQ-011/S2 (store) — first-run defaults carry the lead defaults"
- Key with no notes in range -> I lead: `lead-run.test.ts` "practice.session/REQ-015/S8 — no notes, no run". Play along: NEW `lead-edge-cases.test.ts` "edge case — a key with no notes in range in play along: ▶ does nothing" (covered since the fix round, D003)
- Duplicate action: circle while already leading -> NEW `lead-edge-cases.test.ts` "edge case — the circle tapped while already leading is a no-op" (start() twice after one advance: startCalls 1, stopCalls 0, target unchanged at position 2)
- Duplicate action: ■ twice -> NEW `lead-edge-cases.test.ts` "edge case — ■ twice" (stopCalls 1, idle)
- Duplicate action: mode words mid-run stop the run first -> `lead-mode.test.ts` "practice.session/REQ-014/S3 — the words stop a run"
- Upstream unavailable (refused / none / failed, retry, mid-run) -> `lead-cannot-hear.test.ts` REQ-022/S1, S2, S3, S4; card: `tests/ui/scenarios/transport-card-lead.test.tsx` "REQ-022/S1 (card)"
- Tool's own sound in the microphone -> `lead-cues.test.ts` "REQ-018/S3 — the tone is never the learner"; "REQ-015/S5 — the drone goes first" (lead-run.test.ts); `invariants/never-both.test.ts` (REQ-015/S6 enumeration); `session-tap.test.ts` "REQ-013/S5 — ignored while leading"
- Reading with no confidence / outside range -> listening's own scenario: `listening.pitch-detection/REQ-003/S4` in `src/listening/src/detector.rs` ("always a positive frequency and a clarity in (0, 1]"; a Rust test, attributed by check-scenarios); `FakeListening` cannot publish a reading without confidence, so nothing at practice level
- Stored settings unreadable -> defaults -> `tests/ui/scenarios/selection-store.test.ts` "practice.session/REQ-011 — a bad lead field falls back on its own, the rest restores"; "corrupt or unrecognised stored state loads as null (theory.circle-of-fifths/REQ-008/S3)"
- Page hidden -> `session-hidden-awake.test.ts` "practice.session/REQ-009/S3 — a lead run hidden" (+ S2)
- Traversal change mid-run -> `lead-changes.test.ts` "practice.session/REQ-019/S1", "S2", "S3", "S5"

CONCERNS:
1. RESOLVED by decision D003 (option A) in the fix round below: the play-along empty-run guard and the withheld test are in. (Originally: the proposal's row "does nothing in either mode" was false for play along — `start()` began a count-in on an empty run; unreachable with the built-in catalogue.)
2. `pnpm test:timing` FAILED on the first run with a harness error, not a timing miss: `TypeError: Cannot read properties of undefined (reading 'who')` at `session.setSettings` — `scripts/timing-test.mjs` hand-builds `{soundMode, loop, countIn, restBar, tempoBpm}` for `setSettings`, which since T00x's `SessionSettings.lead` is required. Fixed by spreading the session's own settings first (`...window.__session.snapshot().settings`); reran: PASS at all three tempos. `scripts/timing-test.mjs` is outside the brief's Files; touched under the AGENTS.md ripple rule. `design-shots*.mjs` not examined for the same shape issue.
3. The first `pnpm check` of attempt 1 had one load-related timeout (`practice.drone/REQ-001/S4 (app)`); not reproduced.

FIX ROUND (D003, `changes/008-learner-leads/record/decisions/D003.md`):
- RED: added `edge case — a key with no notes in range in play along: ▶ does nothing` to lead-edge-cases.test.ts; failed with `expected { kind: 'countingIn', beatsLeft: 4 } to deeply equal { kind: 'idle' }`.
- GREEN: `if (sequence.length === 0) return;` in `start()` of src/practice/domain/session.ts, after the `lead.who === "me"` branch and before `endTapIfSounding();`, commented with the proposal's edge-case row. `startLead`'s own guard untouched (REQ-015/S8).
- Header comment of lead-edge-cases.test.ts: the row now reads as covered in both modes.
- `pnpm vitest run tests/practice tests/ui`: Test Files 76 passed (76), Tests 393 passed (393).
- `pnpm check` (exit 0): Test Files 93 passed (93), Tests 454 passed (454); cargo `24 passed; 0 failed; 1 ignored`; ends with the two Doc-tests `test result: ok. 0 passed`.
- `pnpm test:lead` (exit 0): test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
  (lead run C4–C5: 15 targets, first readout max 70.33 ms, arrival 8.02, readings/s min 93.80, advance lateness 0, shown 18.69 ms; tone cue fed back: 3 targets, 70.33 / 5.35 / 82.92 / 0 / 5.35). test:timing/test:tuner not re-run (not asked); their attempt-1 PASS lines above stand.
- No dev server left running.

CHOICES MADE:
- Extracted `noNotesVariant` and `sessionWithEmptyRun(settings)` into `tests/practice/lead-helpers.ts` (was private to lead-run.test.ts) rather than duplicating it for the new test; lead-run.test.ts imports it. Both then became unused in lead-edge-cases once the play-along test was withheld, but the extraction stands (it is the shared home and lead-run uses it).
- Rows already scenarios are cited (header comment of lead-edge-cases.test.ts and this report) rather than re-tested.
- Attributed REQ-021/S1 and S3 with a header-guard test on the harness scripts (007 precedent) and S4 as an acceptance comment citation.
- "Circle tapped while already leading" tested after one advance so "position unchanged" is meaningful (position 2, not the start state).
- Attempt 1 withheld the failing play-along test rather than commit a red suite; the fix round commits it with the guard.
- Fix round: guard comment cites the proposal row and that play along has no scenario of its own; the `scripts/timing-test.mjs` ripple is recorded in CONCERNS 2.

TIMEOUT ROUND (independent `pnpm check` failed: `practice.drone/REQ-001/S4 (app)` timed out at 5113 ms under load):
- Measured `pnpm vitest run --reporter=verbose` (93 files, 454 tests, 22.8 s). Tests over ~3 s under full load:
  - already carrying an explicit timeout: hold-never-early REQ-016/S6 20.4 s (30 s); target-in-sequence REQ-006/S5 9.9 s and REQ-015 6.6 s (20 s); sequence-range REQ-012/S5 6.6 s (20 s); transport-card-lead REQ-015/S3 8.7 s (15 s); never-both x3, 3.9-4.5 s (20 s)
  - NOT carrying one, now given `15_000` (assertions untouched): selection-persistence REQ-008/S1 4.8 s; app-drone practice.drone/REQ-001/S4 (app) 4.7 s (the failing one); circle-spelling REQ-002/S1 3.7 s; stave-view REQ-003/S2 3.5 s; selector-and-notices theory.instruments/REQ-001/S2 3.2 s
  - next slowest, left alone (<2.7 s): target-sheet REQ-004/S1 2.7 s, edge-cases REQ-002/S2 2.3 s, settings REQ-009/S3 2.3 s, traversal-sheet-lead REQ-020/S4 2.3 s.
- Three consecutive `pnpm check` runs, all exit 0:
  - run 1: Test Files 93 passed (93); Tests 454 passed (454); cargo 24 passed
  - run 2: Test Files 93 passed (93); Tests 454 passed (454); cargo 24 passed
  - run 3: Test Files 93 passed (93); Tests 454 passed (454); cargo 24 passed
- Option for the controller (not applied): vitest prints that jsdom is created 93 times (94 s total, 26% of time); `pool: 'vmThreads'` or `isolate: false` would cut that, at the cost of changing isolation semantics; a global `testTimeout` was deliberately not touched.

<!-- recorded 2026-10-04T09:53:19Z by scripts/record.sh -->
