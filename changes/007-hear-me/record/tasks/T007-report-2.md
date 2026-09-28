---
type: Implementation Report
title: T007 — implementation report
resource: /.sdd/reports/007-hear-me/T007.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T007.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T08:15:19Z
sdd_id: 007-hear-me
---

TASK: T007
STATUS: DONE
COMMIT: none (fixer round — not committed per instructions)
FILES:
src/practice/domain/session.ts
tests/practice/scenarios/tuner-way-in-out.test.ts

## The fix

`enterTuner()`'s async continuation checked `tunerGeneration` only once,
*after* `listening.start()` resolved. Because `listening.start()` is itself
the resource-committing call (it opens the microphone), a stale check
running only after it had already returned could stop the session's own
state from being overwritten but could never undo what `start()` had just
opened. A `leaveTuner()` landing during the still-pending
`wakeLock.acquire()` therefore left the microphone open and capturing
indefinitely, even though `tuner.active` correctly read `false`.

Changed `enterTuner()` (`src/practice/domain/session.ts`) to check the
generation twice, bracketing the one call that actually commits a resource:

```ts
void (async () => {
  await wakeLock.acquire();
  if (tunerGeneration !== startedAtGeneration) return;
  const result = await listening.start();
  if (tunerGeneration !== startedAtGeneration) {
    listening.stop();
    return;
  }
  invalidateSnapshot();
  tunerListeningState = result.ok
    ? { kind: "listening" }
    : { kind: "cannot-hear", reason: cannotHearReasonOf(result.error.reason) };
  notifyChange();
})();
```

- Before `listening.start()`: a `leaveTuner()` that landed during
  `wakeLock.acquire()` means the mic is never opened at all — return.
- After `listening.start()` resolves: if the generation went stale while it
  was pending, call `listening.stop()` regardless of the result (idempotent
  no-op if `start()` failed; releases a granted mic if it succeeded), and
  return without touching state.

The comment above `enterTuner()` was extended to explain why this differs
from `startDrone()`'s single pre-await check: there, the check runs before
the resource-committing `sound.post()`, so a stale continuation never
commits anything; here `listening.start()` itself is the awaited,
resource-committing call, so the check has to bracket it on both sides.

## RED — the covering test, before the fix

Added to `tests/practice/scenarios/tuner-way-in-out.test.ts`, exactly as
specified:

```ts
test("practice.tuner/REQ-001/S4 — leaving before the microphone was granted still releases it", async () => {
  const { session, listening, wake } = sessionOn("G", "flute-concert");
  session.enterTuner();
  session.leaveTuner();
  await flush();
  await flush();
  await flush();
  expect(listening.listening).toBe(false);
  expect(session.snapshot().tuner).toMatchObject({
    active: false,
    listening: { kind: "off" },
  });
  expect(wake.acquired).toBe(false);
});
```

(`sessionOn` exposes the wake-lock fake as `wake`, a `FakeWakeLock` with
`.acquired` per `tests/practice/fakes.ts` — included per step 3 of the
brief.)

Run before the fix:

```
 FAIL  tests/practice/scenarios/tuner-way-in-out.test.ts > practice.tuner/REQ-001/S4 — leaving before the microphone was granted still releases it
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/practice/scenarios/tuner-way-in-out.test.ts:86:31
     84|   await flush();
     85|   await flush();
     86|   expect(listening.listening).toBe(false);
       |                               ^
     87|   expect(session.snapshot().tuner).toMatchObject({
     88|     active: false,

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

`listening.listening` was `true` — exactly the reviewer's traced defect:
the microphone opened after the stale `leaveTuner()` had already run, and
nothing closed it again.

## GREEN — after the fix

`pnpm vitest run tests/practice/scenarios/tuner-way-in-out.test.ts`:

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  09:14:18
   Duration  633ms (environment 44%, transform 36%, import 14%, tests 5%, worker 1%)
```

VERIFY:
5 passed (all of `tuner-way-in-out.test.ts`, including the four pre-existing
scenarios and the new one), as above.

CHECK:
`bash -c "source ~/.cargo/env && pnpm check"` — exit code 0. Last portion of
output:

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  63 passed (63)
      Tests  252 passed (252)
   Start at  09:14:55
   Duration  8.97s (tests 45%, environment 37%, import 10%, transform 7%)

Environment  jsdom was created 63 times · 55.20s total, 37% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 11 tests
test detector::tests::cost_of_one_analysis ... ignored
test detector::tests::req_003_s1_silence ... ok
... (10 passed, 1 ignored benchmark)
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.66s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
... (24 passed, 1 ignored benchmark)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

`prettier --check`, `eslint`, `tsc --noEmit`, `cargo fmt --check` and
`cargo clippy --all-targets -- -D warnings` all ran clean ahead of these
(no output means no complaint) — the whole `pnpm check` pipeline exited 0.

CONCERNS: none — the fix is exactly the two-sided generation check the
reviewer's finding specified, applied only to `enterTuner()`, with no other
production code touched. Not committed, per the instruction.
QUESTION: none

<!-- recorded 2026-09-28T08:22:29Z by scripts/record.sh -->
