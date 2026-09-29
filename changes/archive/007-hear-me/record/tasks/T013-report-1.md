---
type: Implementation Report
title: T013 — implementation report
resource: /.sdd/reports/007-hear-me/T013.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T013.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T10:00:42Z
sdd_id: 007-hear-me
---

TASK: T013
STATUS: DONE
COMMIT: none (not committed per instruction — controller to commit)
FILES:
tests/practice/invariants/never-both.test.ts
src/practice/domain/session.ts

VERIFY:
```
$ pnpm vitest run tests/practice/invariants/never-both.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  11:00:09
   Duration  956ms (tests 44%, environment 29%, transform 18%, import 8%)
```
2 passed, well inside the 20 s timeout (≈1 s total for both, 2800 sequences
each — 7 verbs × (7¹+7²+7³+7⁴)/7 ... i.e. ACTIONS.length=7, sum 7+49+343+2401
= 2800 sequences per test, 5600 total).

CHECK:
```
   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
Full `pnpm check` run (prettier, eslint, tsc, vitest, cargo fmt/clippy/test)
was green throughout: vitest reported `Test Files 69 passed (69)` /
`Tests 281 passed (281)`; cargo's two crates (`listening`, `sound`) both
reported `test result: ok.` with 0 failed.

## The enumeration found a real gap

Sequence: **`droneOnPending → enterTuner`** (a `startDrone()` still
mid-flight — awaiting `sound.start()`/`wakeLock.acquire()`, `droneOn` still
`false` — immediately followed by `enterTuner()`).

`enterTuner()`'s `if (droneOn) stopDrone()` only supersedes a drone that has
already posted (`droneOn === true`); a pending `startDrone()` whose own post
hasn't landed yet was never caught, and its continuation's guard
(`droneGeneration !== startedAtGeneration || transport.kind !== "idle"`)
still matched — `tunerActive` isn't part of it — so it went on to post a
`drone` command after the tuner was already active. Verified directly with a
scratch probe before touching production code: `session.startDrone();
session.enterTuner(); await ×4;` left a `{ kind: "drone", ... }` in
`sound.posts` with `tuner.active === true`. This is exactly the T022 /
"004's C1" pattern already fixed in `start()` (which bumps `droneGeneration`
*unconditionally*, not only `if (droneWasOn)`).

**Fix** (`src/practice/domain/session.ts`, `enterTuner()`): added an
unconditional `droneGeneration += 1;` before the existing
`if (droneOn) stopDrone();`, mirroring `start()`'s own comment and shape
exactly. `stopDrone()` still bumps it again when the drone really was on;
the double bump is harmless (only inequality with `startedAtGeneration` is
ever tested) — the same reasoning `start()`'s own comment already states.

Re-running the widened enumeration with the fix in place: green (both
tests), 2800 sequences each.

## A test-design pitfall found and fixed along the way (no production bug)

My first version of the new assertion checked `liveVoicesAt(sound,
sound.frame)` immediately after each `apply()`, with no allowance for a
transition's own budgeted release. That produced a **false positive** on
`play → enterTuner`: `enterTuner()`'s own `stop()` posts a `stopAll` at the
exact frame checked, and the running tone was still inside its 5 ms
stop-fade tail (`STOP_FADE_MS`, this file's own convention) at that instant
— not a real violation (REQ-001 explicitly grants playback up to 50 ms and
the drone up to `DRONE_RELEASE_MS` (500 ms) to fall silent *as part of*
entering). Fix: before judging "still sounding" at a step where
`tuner.active` is true, the test advances the clock by `DRONE_RELEASE_MS`
first — the larger of the two budgets — so only a genuinely un-stopped (or
leaked) voice is ever caught; a legitimate, bounded fade tail is not. The
trailing whole-sequence settle (existing `clock.advance(2000)` before the
final check) already cleared this by construction (2000 ms ≫ 500 ms), so it
needed no change.

I also found and fixed a bug in my own first draft of `liveVoicesAt`: I
had copied `droneIntervals`' `candidate.atFrame >= from` guard onto the
`stopAll` branch, which broke `sequenceIntervals`' documented rule that "a
stopAll posted before a tone or click's own onset — still queued in the
lookahead scheduler's window — drops it entirely rather than cutting it
short" (this surfaced as a second false positive, `play → droneOff →
enterTuner`, on a lookahead-scheduled future note that a `stopAll` had
already cancelled before its onset). Removed that stray condition so
`liveVoicesAt` relies solely on the existing "dropped entirely if
`stopFrame < from`" rule, for both tone/click and drone — matching
`sequenceIntervals` and `droneIntervals` exactly, just queried at one
instant instead of walked across the whole timeline.

## What was widened

- `Action`/`ACTIONS` gained `"enterTuner"` and `"leaveTuner"` (7 verbs
  total, up from 5). `apply()`'s `"enterTuner"` case calls
  `session.enterTuner()` without flushing — mirroring `"droneOnPending"` —
  so a sequence like `enterTuner, play` genuinely exercises `▶` landing
  while the tuner's start is pending. That guard (`if (tunerActive)
  return;`, already committed in T007, checked synchronously before any
  await) held correctly — no gap found there. `"leaveTuner"` flushes two
  microtasks after the (fully synchronous) call, matching `"pause"`/
  `"droneOff"`'s shape and giving any still-pending chain a chance to
  settle sooner.
- `liveVoicesAt(sound, atFrame)` — new helper implementing the file's
  existing notion of "live" (posted and not stopped before the frame minus
  its release), queried at a single instant rather than walked as
  `[from, to)` intervals across the whole timeline the way
  `droneIntervals`/`sequenceIntervals` already do for the original
  invariant.
- New test `practice.tuner/REQ-001/S3 — nothing sounds while the tuner
  listens (invariant)`, beside the existing `practice.drone/REQ-004/S3`
  one, asserting at every step of every sequence (and once more after the
  trailing settle) that when `session.snapshot().tuner.active`, nothing
  tone/click/drone is live.
- Both tests now take an explicit `20_000` ms third argument. The file had
  no explicit timeout before (brief's note assumed one existed); vitest's
  default is 5000 ms, and while both tests actually run in well under 1 s
  each even at ~2800 sequences apiece, I added the 20 s budget explicitly
  as instructed, as a ripple the brief's premise required.

CONCERNS:
- The brief's supplementary note ("six verbs up to four taps is 1554
  sequences") doesn't match the literal Steps text ("the verb set gains
  enterTuner and leaveTuner" — i.e. add two to the existing five = seven).
  I followed the literal Steps/Interfaces text: 7 verbs, 2800 sequences per
  test (5600 total). Runtime is not a concern either way (≈1 s total,
  measured above), but flagging the discrepancy since I can't reconcile
  the "six"/"1554" figure with any verb set that also keeps
  `droneOnPending` (explicitly instructed to keep) and adds exactly
  `enterTuner`+`leaveTuner` as named.
- The brief's assertion pseudocode (`const liveAt = sound.frame; expect(
  liveVoicesAt(...))...`) checked immediately after each step with no
  grace period; implemented literally it produces the two false positives
  described above (both explainable by REQ-001's own stated fade budgets
  and this file's own "dropped entirely if the stopAll precedes the
  onset" convention, not real product bugs). I adapted the check to
  advance `DRONE_RELEASE_MS` first, documented inline; flagging in case a
  different placement was intended.
- Files touched: brief's Files list names only the test file;
  `src/practice/domain/session.ts` was touched too, per Step 3
  ("fix any guard the enumeration finds") and per AGENTS.md's own guidance
  that a Files list can omit a necessary ripple — noted here rather than
  left undone.

<!-- recorded 2026-09-28T10:08:35Z by scripts/record.sh -->
