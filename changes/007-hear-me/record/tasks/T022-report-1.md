---
type: Implementation Report
title: T022 — implementation report
resource: /.sdd/reports/007-hear-me/T022.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T022.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T16:21:12Z
sdd_id: 007-hear-me
---

TASK: T022
STATUS: DONE
COMMIT: none (brief: "Do not commit")
FILES:
tests/practice/scenarios/tuner-edge-cases.test.ts
src/listening/src/detector.rs
tests/listening/scenarios/tuner-harness.test.ts

VERIFY:

Before (`./scripts/check-scenarios.sh --change changes/007-hear-me`) — one gap:
```
  ✅ practice.tuner/REQ-006/S1 tested
  ✅ practice.tuner/REQ-006/S2 tested
  ❌ practice.tuner/REQ-006/S3 has no test citing it
  ✅ practice.tuner/REQ-007/S1 tested
  ...
❌ scenario gaps
```
(every other scenario across the three capabilities was already ✅ before this task; this was the only gap.)

After (`./scripts/check-scenarios.sh --change changes/007-hear-me`):
```
listening.pitch-detection
  ✅ listening.pitch-detection/REQ-001/S1 tested
  ✅ listening.pitch-detection/REQ-001/S2 tested
  ✅ listening.pitch-detection/REQ-001/S3 tested
  ✅ listening.pitch-detection/REQ-002/S1 tested
  ✅ listening.pitch-detection/REQ-002/S2 tested
  ✅ listening.pitch-detection/REQ-002/S3 tested
  ✅ listening.pitch-detection/REQ-002/S4 tested
  ✅ listening.pitch-detection/REQ-002/S5 tested
  ✅ listening.pitch-detection/REQ-003/S1 tested
  ✅ listening.pitch-detection/REQ-003/S2 tested
  ✅ listening.pitch-detection/REQ-003/S3 tested
  ✅ listening.pitch-detection/REQ-003/S4 tested
  ✅ listening.pitch-detection/REQ-004/S1 tested
  ✅ listening.pitch-detection/REQ-004/S2 tested
  ✅ listening.pitch-detection/REQ-004/S3 tested
  ✅ listening.pitch-detection/REQ-005/S1 tested
  ✅ listening.pitch-detection/REQ-005/S2 tested
  ✅ listening.pitch-detection/REQ-006/S1 tested
  ✅ listening.pitch-detection/REQ-006/S2 tested
  ✅ listening.pitch-detection/REQ-006/S3 tested
practice.tuner
  ✅ practice.tuner/REQ-001/S1 tested
  ✅ practice.tuner/REQ-001/S2 tested
  ✅ practice.tuner/REQ-001/S3 tested
  ✅ practice.tuner/REQ-001/S4 tested
  ✅ practice.tuner/REQ-002/S1 tested
  ✅ practice.tuner/REQ-002/S2 tested
  ✅ practice.tuner/REQ-002/S3 tested
  ✅ practice.tuner/REQ-002/S4 tested
  ✅ practice.tuner/REQ-002/S5 tested
  ✅ practice.tuner/REQ-003/S1 tested
  ✅ practice.tuner/REQ-003/S2 tested
  ✅ practice.tuner/REQ-003/S3 tested
  ✅ practice.tuner/REQ-004/S1 tested
  ✅ practice.tuner/REQ-004/S2 tested
  ✅ practice.tuner/REQ-004/S3 tested
  ✅ practice.tuner/REQ-004/S4 tested
  ✅ practice.tuner/REQ-004/S5 tested
  ✅ practice.tuner/REQ-004/S6 tested
  ✅ practice.tuner/REQ-005/S1 tested
  ✅ practice.tuner/REQ-005/S2 tested
  ✅ practice.tuner/REQ-005/S3 tested
  ✅ practice.tuner/REQ-005/S4 tested
  ✅ practice.tuner/REQ-006/S1 tested
  ✅ practice.tuner/REQ-006/S2 tested
  ✅ practice.tuner/REQ-006/S3 tested
  ✅ practice.tuner/REQ-007/S1 tested
  ✅ practice.tuner/REQ-007/S2 tested
  ✅ practice.tuner/REQ-007/S3 tested
  ✅ practice.tuner/REQ-008/S1 tested
  ✅ practice.tuner/REQ-008/S2 tested
  ✅ practice.tuner/REQ-009/S1 tested
  ✅ practice.tuner/REQ-009/S2 tested
theory.temperament
  ✅ theory.temperament/REQ-001/S1 tested
  ✅ theory.temperament/REQ-001/S2 tested
  ✅ theory.temperament/REQ-001/S3 tested
  ✅ theory.temperament/REQ-002/S1 tested
  ✅ theory.temperament/REQ-002/S2 tested
  ✅ theory.temperament/REQ-002/S3 tested
  ✅ theory.temperament/REQ-002/S4 tested
  ✅ theory.temperament/REQ-002/S5 tested
✅ scenario coverage complete
```

New tests added, one per gap/edge-case row:
- `detector::tests::req_002_s5_a_note_outside_e2_to_c7` (`cargo test -p listening`, `src/listening/src/detector.rs`) — edge case "a note outside E2–C7": `detect()` on a 60 Hz sine (below E2, outside the search range) returns either `None` or a positive `hz`; cites `listening.pitch-detection/REQ-002/S5`'s last clause.
- `practice.tuner/REQ-001/S3 — entering while counting in silences the count-in` (`tests/practice/scenarios/tuner-edge-cases.test.ts`) — edge case "entering while counting in": `sessionOn`, `start()`, flush, `enterTuner()` during count-in → `stopAllCalls ≥ 1`, transport idle, tuner active.
- `practice.tuner/REQ-001/S3 — a tapped note sounding when the tuner is entered` (`tests/practice/scenarios/tuner-edge-cases.test.ts`) — edge case "a tapped note sounding when the tuner is entered": `tapNote(0)`, flush, `enterTuner()` → a `stop(tag)` posted for the tap's tag (≥ 2,000,000) and no tone/click/drone posted afterward.
- A citation-only comment (not a new test) added to `tests/listening/scenarios/tuner-harness.test.ts` attributing `practice.tuner/REQ-006/S3` — "on the phone (acceptance)" — as measured at acceptance, T024.
- "The pitch sits on a boundary" edge-case row: covered by `practice.tuner/REQ-002/S4` already (`tests/practice/scenarios/tuner-reading.test.ts`); cited in the new file's header comment, no new test written.

Sanity check (not part of the committed diff): I temporarily removed the `endTapIfSounding()` call at the top of `enterTuner()` in `src/practice/domain/session.ts`, reran the new tap-note edge-case test, watched it fail with `expected false to be true` on the `stop(tag)` assertion, then reverted the change (`git diff` on that file is empty) — confirming the new test exercises real behaviour rather than being vacuously true.

CHECK (last ~10 lines of `pnpm check`):
```
   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
Full run summary (from the same invocation): `Test Files  74 passed (74)`, `Tests  309 passed (309)`; `cargo test` on both crates: listening `13 passed; 0 failed; 1 ignored`, sound `24 passed; 0 failed; 1 ignored`. prettier, eslint, tsc, cargo fmt --check and cargo clippy -D warnings all passed silently (no output = pass) before vitest ran.

CONCERNS:
- Both new TypeScript tests in `tuner-edge-cases.test.ts` and the new Rust test passed on first run without any production change — the behaviour they cover was already correct (built and hardened during earlier tasks, per the comments already in `session.ts` referencing "T013's fixer-round enumeration"). I did not treat this as a stub or a false-positive test: I verified genuineness by temporarily breaking `enterTuner()`'s tap-silencing and confirming the tap-note test failed for the right reason, then reverted (clean `git diff` on `session.ts` afterward). No RED phase was possible for the count-in test or the Rust test in the same way without a comparably risky edit to production code already covered elsewhere by `never-both.test.ts`'s exhaustive enumeration, so I did not repeat that experiment for those two; I'm flagging this so a reviewer can judge whether that was sufficient.
- The two new practice tests both technically restate an already-attributed scenario ID (`practice.tuner/REQ-001/S3`, already ✅ before this task via `never-both.test.ts`'s enumeration) rather than introducing a new ID — that's intentional per the brief's edge-case-row framing (readability over the exhaustive invariant), but worth a reviewer's eye since it's a case of "same ID cited twice" rather than closing a fresh gap.

QUESTION: none

<!-- recorded 2026-09-28T16:26:17Z by scripts/record.sh -->
