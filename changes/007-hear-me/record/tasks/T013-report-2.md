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
  at: 2026-09-28T10:31:47Z
sdd_id: 007-hear-me
---

TASK: T013
STATUS: DONE_WITH_CONCERNS
COMMIT: none (fixer round instructed "Do not commit")
FILES:
tests/practice/invariants/never-both.test.ts
src/practice/domain/session.ts

## Fixer round summary

The reviewer found the widened `never-both` enumeration never exercised a
tapped note as a way into the tuner (REQ-001/S3's own Given names it), and
that this hid two live violations: (a) `enterTuner()` never ends an
already-sounding tap, and (b) a first-ever `tapNote()`'s pending
`sound.start()` continuation never re-checks whether the tuner became
active while it was in flight.

## Edits

**`tests/practice/invariants/never-both.test.ts`**
- `Action`/`ACTIONS` (lines 28–48): added `tapNote` and `tapNotePending`.
- `apply()` (lines 133–167): added the `tapNote`/`tapNotePending` cases.
  `tapNote` mirrors `droneOn`/`startDroneAndFlush` (tap, then flush two
  microtasks). `tapNotePending` mirrors `droneOnPending`'s *shape*
  (`session.tapNote(0); return;`, no explicit flush) — see the concern
  below on why its shape alone isn't sufficient.
- `sequenceIntervals()` (line 231): excludes a tapped tone (tag ≥
  `TAP_TAG_BASE`, hardcoded at line 57 the same way
  `session-tap.test.ts` already does — the constant is private to
  `session.ts`, not exported) from the drone test's overlap check, per
  `practice.drone/REQ-004`'s explicit exemption ("a tapped note ... is the
  one thing that sounds over the drone"). Needed because `ACTIONS` is
  shared by both tests in this file; widening it with tap verbs otherwise
  makes the *drone* test fail on a legitimate tap-over-drone overlap the
  spec allows — a ripple the brief didn't name but the shared enumeration
  makes unavoidable.
- `liveVoicesAt()` (lines 278–284): a tapped tone is now ended by its own
  targeted `stop(tag)` (`endTapIfSounding()`'s own mechanism), not only by
  a `stopAll` — mirroring how a drone voice is already handled — so a tap
  properly ended by a retap or by the session fix below is not mistaken
  for "still sounding" through the rest of its natural duration.
- Both sequence loops (lines 321–326, 366–370): call `tapNotePending`
  un-awaited (`void apply(session, action)`) instead of through the
  uniform `await apply(session, action)` every other action uses — see the
  concern below for why.

**`src/practice/domain/session.ts`**
- `tapGeneration` (new state, line 399): a generation counter for taps,
  mirroring `droneGeneration`.
- `tapNote()` (lines 1317–1324): bumps `tapGeneration` unconditionally at
  the top of every call (sync or async), before `endTapIfSounding()`.
- `tapNote()`'s async continuation (line 1395): `if (tapGeneration !==
  startedAtGeneration) return;` before `post()` — supersedes a pending tap
  whose `sound.start()` is still in flight when a later `tapNote()` or
  `enterTuner()` lands.
- `enterTuner()` (lines 1529–1530): `endTapIfSounding()` (ends an
  already-*posted* sounding tap — fixes defect (a)) and `tapGeneration +=
  1` (supersedes a still-*pending* tap that has no tag yet to stop — fixes
  defect (b)), both unconditional, before the existing `if
  (transport.kind !== "idle") stop()`.

## RED sequences (test-only changes, session.ts unchanged)

First run (defect a): `pnpm vitest run tests/practice/invariants/never-both.test.ts`
failed at sequence `tapNote → enterTuner` — a tapped tone (`tag: 2000000`)
still live (per `liveVoicesAt`) while `tuner.active` was true, because
`enterTuner()` never called `endTapIfSounding()`.

After adding only `endTapIfSounding()` to `enterTuner()` (defect a's fix,
session.ts otherwise unchanged) and re-running: PASSED — cleanly, with no
sequence surfacing defect (b) at all. Investigating why: `tapNotePending`,
built in the same code *shape* as `droneOnPending` (`session.X(); return;`,
no explicit flush), does not reproduce a genuinely pending tap the way
`droneOnPending` reproduces a pending drone. `startDrone()`'s pending
branch has *two* internal awaits (`sound.start()`, then
`wakeLock.acquire()`); `apply(session, "droneOnPending")`'s own returned
promise settles after exactly the one tick any `await apply(...)` costs
its caller, which drains only the *first* of those two, leaving the drone
genuinely posted only once the next action's own await runs (the
established T022 race). `tapNote()`'s pending branch has only *one*
internal await (`sound.start()`) — awaiting `apply(session,
"tapNotePending")` at the call site (as every other action is awaited)
drains that one tick itself, so the tap is already posted by the time
control returns, before any subsequent action even runs. Confirmed
empirically with a throwaway debug test (not part of the diff): after
`await apply(session, "droneOnPending")` alone, `sound.posts` was empty;
after `await apply(session, "tapNotePending")` alone, the tone was already
posted.

Fix: both sequence loops call `tapNotePending` un-awaited (`void
apply(session, action)`) instead of through the uniform `await
apply(session, action)`. Re-running with the session-level `enterTuner()`
fix present: FAILED again, now at `tapNotePending → enterTuner` — the tone
(`onsetFrame: 15360`, well after `tuner.active` became `true` at frame
14400) posted after entering the tuner. This is defect (b), reproduced.

Fixing (b) alone with `if (tunerActive) return;` (the brief's smaller
option) and re-running surfaced a *third*, adjacent violation the widened
enumeration also caught: `tapNotePending → tapNote → enterTuner` — a
*second* `tapNote()` call landing while the *first* is still pending
starts a second async round trip; both eventually post, but
`endTapIfSounding()`/`tappedTag` only ever remembers the *second* one, so
the *first* tap (`tag: 2000000`) is orphaned — never stopped by
`enterTuner()`'s `endTapIfSounding()` — even though `tunerActive` is false
at the moment either continuation runs (this isn't a tuner race at all,
it's a bare double-tap-while-pending race). A plain `tunerActive` check
cannot catch this since it isn't a tuner-entry race in this instance;
switched to the `tapGeneration` counter the brief also offered, which
covers both: `enterTuner()` bumps it (fixing (b)) and every `tapNote()`
call bumps it too (fixing the newly found double-tap race), and the
pending continuation checks it once, after its `await`. Re-ran: both tests
PASSED, and stayed passing through the earlier `tapNote → enterTuner` and
`tapNotePending → enterTuner` regressions checked individually along the
way (each temporarily reverted, confirmed RED, then restored).

## Runtime

Nine verbs, four taps deep = 7380 sequences per test, run against both
tests in this file: well under the brief's ~10 s cap (full file: 1.47–1.52
s across several runs), so no capping of the enumeration to
tuner-verb-containing sequences was needed.

## VERIFY

```
$ pnpm vitest run tests/practice/invariants/never-both.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  11:30:56
   Duration  1.47s (tests 64%, environment 18%, transform 12%, import 5%)
```

2 passed, well within the 20 s file timeout.

## CHECK

```
$ bash -c "source ~/.cargo/env && pnpm check"

 Test Files  69 passed (69)
      Tests  281 passed (281)
   Start at  11:31:33
   Duration  9.44s (tests 45%, environment 39%, import 10%, transform 6%)
...
running 11 tests (listening)
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.65s

running 25 tests (sound)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

Doc-tests listening: ok. 0 passed; 0 failed
Doc-tests sound: ok. 0 passed; 0 failed
```

prettier, eslint, tsc, vitest, cargo fmt/clippy/test all green.

## CONCERNS

- The brief's step 1 suggested "a generation counter for taps if there is
  none, or simply `if (tunerActive) return;` after the await — choose the
  smaller change that is correct and say which." I initially picked the
  smaller `if (tunerActive) return;`, confirmed it fixes (b) exactly as
  described, but the widened enumeration then found an *adjacent* defect
  the brief didn't name: two overlapping pending `tapNote()` calls (before
  `soundReady`) orphan the first tap's voice (`tappedTag` only ever
  remembers the latest), which `enterTuner()`'s `endTapIfSounding()` then
  cannot reach. `tunerActive` alone doesn't cover this case (it isn't
  about the tuner at all), so I switched to the generation-counter option
  for both fixes. I believe this is the correct call — the brief offered
  it as an alternative for exactly this kind of reason — but flagging it
  since it goes beyond literally "the two defects" named in the reviewer's
  finding.
- `apply()`'s `tapNotePending` case, if ever invoked through the uniform
  `await apply(session, "tapNotePending")` pattern used everywhere else in
  this file, silently stops being "pending" (the tap posts within its own
  step) because `tapNote()`'s pending branch has only one internal await
  versus `startDrone()`'s two. I documented this at length in the case's
  comment and made both sequence loops special-case it (`void apply(...)`
  instead of `await apply(...)`) rather than hiding the distinction behind
  a helper — an earlier attempt at a small `applyAction()` wrapper looked
  cleaner but silently reintroduced the same one-tick drain at its own
  call site, which I only caught by writing a throwaway debug test and
  tracing microtask order by hand. Flagging in case a future edit to this
  file (e.g. a reviewer "simplifying" the two `if/else` call sites back
  into a shared helper) reintroduces the same trap.
- `sequenceIntervals()`'s new tap exemption (drone test) wasn't asked for
  by the brief (which named only `liveVoicesAt`), but is a necessary
  ripple of `ACTIONS` being shared between both tests in this file — without
  it, the *drone* invariant test starts failing on a tap-over-drone
  overlap that `practice.drone/REQ-004`'s prose explicitly permits.

<!-- recorded 2026-09-28T10:41:24Z by scripts/record.sh -->
