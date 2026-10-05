---
type: Implementation Report
title: C008_T008 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T008.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T008.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T22:52:30Z
sdd_id: 008-learner-leads
---

TASK: C008_T008
STATUS: DONE
COMMIT: b3cefeb8d8dca2eece5b0633ac74d7869638b2cd
FILES:
src/practice/domain/session.ts
tests/practice/invariants/never-both.test.ts
tests/practice/scenarios/lead-run.test.ts
tests/practice/scenarios/session-tap.test.ts
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 ✓ tests/practice/invariants/never-both.test.ts > practice.drone/REQ-004/S3 — never both (invariant) 1179ms
 ✓ tests/practice/invariants/never-both.test.ts > practice.session/REQ-015/S6 — nothing sounds while leading (invariant) 1221ms
 ✓ tests/practice/invariants/never-both.test.ts > practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant) 1104ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:50:04
   Duration  4.23s (tests 85%, environment 8%, transform 6%, import 2%)

Enumeration count: before this task, 9 verbs → 7,380 checked sequences
(9+81+729+6561); after widening with `start-as-me` and `stop-lead` (11
verbs) → 16,104 checked sequences (11+121+1331+14641). All three invariant
tests in the file stay comfortably inside TEST_TIMEOUT_MS (20s) — no
timeout increase was needed.
CHECK:
Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  85 passed (85)
      Tests  393 passed (393)
   Start at  22:51:10
   Duration  20.64s (tests 58%, environment 28%, import 9%, transform 5%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-...)
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
     Running unittests src/lib.rs (target/debug/deps/sound-...)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out
   Doc-tests listening / sound: ok. 0 passed
(cargo fmt --check and cargo clippy -- -D warnings both passed silently
before cargo test ran, as part of the one `pnpm check` command)
CONCERNS:
Two root causes surfaced only once the never-both enumeration was widened,
beyond what the brief's Produces line named explicitly — fixed in session.ts
rather than left to loosen the new test:
1. startLead() did not end an already-sounding tap (endTapIfSounding() +
   tapGeneration bump) before claiming the microphone, so a tap posted just
   before "I lead" was tapped kept sounding under REQ-015/S6's "nothing
   sounds while leading" (found by the sequence tapNote → start-as-me).
2. leaveTuner() unconditionally reset `listeningOwner` to "none" even when
   it currently held "lead" (not "tuner") — unreachable from the real UI,
   since entering the tuner always stops a lead run first (REQ-015/S7), but
   reachable by calling the published methods directly out of order (found
   by start-as-me → leaveTuner → droneOn). Guarded with `if (!tunerActive)
   return;`, mirroring the guard already on the onEnded handler.
Both are noted inline in session.ts at the fix site.
CHOICES MADE:
- Named the shared "stop whatever is in progress" helper `stopAnyRun()`
  (step 5's REFACTOR), returning whether the drone was on so start()'s
  tool-mode branch can still compute the drone's release delay.
- `stopAnyRun()`'s internal order is: bump+stop the drone, then stop a lead
  run (listeningOwner === "lead"), then stop playback (transport not idle)
  — these three are mutually exclusive in practice (the drone and playback
  never run with a lead run in progress and vice versa), so the order
  never actually interleaves visible side effects; kept in this order since
  it matches the drone-first wording of REQ-015/S5's own Produces line.
- "stop-lead" in never-both.test.ts is implemented identically to the
  existing "pause" verb (session.stop(), two flushes) — the brief names it
  as its own verb rather than reusing "pause", so I added it verbatim as a
  distinct enumeration entry rather than collapsing the two, since the verb
  *list* (not just its implementation) is what the enumeration counts over.
- Widened the enumeration's new REQ-015/S6 test's mid-loop check with
  `clock.advance(DRONE_RELEASE_MS)` before reading `liveVoicesAt`, mirroring
  the existing tuner invariant's own precedent for giving a transition its
  budgeted release/stop-fade window before judging "still sounding".
QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-03T09:01:41Z by scripts/record.sh -->
