---
type: Implementation Report
title: C008_T030 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T030.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T030.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T13:30:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T030
STATUS: DONE_WITH_CONCERNS
COMMIT: ca33470
FILES:
src/listening/published/index.ts
src/practice/domain/session.ts
src/practice/adapters/web-audio-listening.ts
src/ui/App.tsx
tests/listening/scenarios/pitch-detection.test.ts
tests/practice/scenarios/lead-edge-cases.test.ts
tests/practice/scenarios/web-audio-listening.test.ts
tests/practice/fakes.ts
VERIFY:
`pnpm vitest run tests/listening tests/practice/scenarios/lead-edge-cases.test.ts`
 Test Files  3 passed (3)
      Tests  20 passed (20)
Also `pnpm vitest run tests/listening tests/practice tests/ui`: 78 files, 418 tests passed (never-both unchanged).
RED seen first: adapter tests (a)-(d) all failed with live tracks remaining (the fix stashed away reproduces it); the session tests failed for the "1 then 0" order only (live microphone gone: `expected false to be true`), both lead and tuner; the wrapper test failed with `[ { open: true } ]`.
CHECK:
`pnpm check` exit 0: Test Files 93 passed (93), Tests 473 passed (473); cargo fmt/clippy/test ok (24 passed, 1 ignored); `./scripts/check-contexts.sh` clean.
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
(both harnesses stopped their own server; only the user's :5174 is listening.)
CONCERNS:
- The brief's suggested session rule ("stop only when listeningOwner === none") is not sufficient and I refined it: a hidden tuner keeps `listeningOwner = "tuner"` with state "off" (hidden calls listening.stop() but leaves the owner), so an owner check would leave a microphone that opened after the hide live. I used `microphoneWanted()` instead: a lead owner, or an active tuner whose state is starting/listening.
- Found and fixed a second orphan path in `src/practice/adapters/web-audio-listening.ts` (not in the Files list; ripple, as AGENTS.md allows): the first-ever requests (start, stop, start while `create()` is still building the listener) each called `create()`, left two Listeners, and `stop()` reached only the later one, leaving the earlier listener's microphone open. Now one memoised creation promise. Test added in `tests/practice/scenarios/web-audio-listening.test.ts`. The wrapper's awaits before `listener.start()` (resume, create) also mean a `stop()` landing there reaches nothing (listener null or its epoch bump precedes the request); that case is handled by the session's superseded continuation releasing the microphone when nothing wants it, not by the adapter.
- Residual, unfixed and very unlikely: A succeeds first and is superseded while B (wanted) is pending, then B is refused/fails: A's stream stays open with nobody owning it (the lead failure branch does not call `listening.stop()`). Requires one grant and one refusal for the same page within the window. Left alone to avoid changing the existing stopCalls expectations; say if you want the failure branches to stop defensively.
- The adapter returns `{ok:false, reason:"failed", detail:"stopped while the microphone was being asked for"}` for an overtaken start; no schema change.
CHOICES MADE:
- Epoch counter bumped by both `stop()` and `dispose()` in `createListener`; `releaseStream` helper replaces the inline track-stop loop.
- Two pending starts with no stop between: the later one releases its own stream and returns ok.
- `FakeListening.resolveStart(n?)`: n is the 0-based index among held starts; no argument = oldest still pending (default path unchanged for the T029 tests).
- Adapter tests as four tests (a-d) with the brief's name plus a variant suffix; the track-counting helper `heldMediaDevices()` creates a track only when its request is answered, so "live" counts granted tracks.
- Session tests as a loop over both resolve orders for the lead and for the tuner.
- App.tsx: comment only; says the card keeps the start circle while the microphone is being asked for and that a tap then is still the stop.

## Fix round 1 (review minors)

TASK: C008_T030
STATUS: DONE_WITH_CONCERNS
COMMIT: see git log (fix(practice): a failed microphone request releases any stream an earlier request left open (REQ-015))
FILES:
src/practice/domain/session.ts
src/listening/published/index.ts
tests/practice/fakes.ts
tests/practice/lead-helpers.ts
tests/practice/scenarios/lead-edge-cases.test.ts
VERIFY:
RED: three new session tests failed with `expected true to be false` on `f.listening.listening` (card state already cannot-hear). GREEN after `listening.stop()` in the lead failure branch and the tuner cannot-hear branch; no existing assertion changed.
`pnpm vitest run tests/practice tests/listening tests/ui`: 78 files, 422 tests passed.
`pnpm test:lead`: PASS (lead run C4-C5 and tone cue fed back).
CHECK:
`pnpm check` exit 0: Test Files 93 passed, Tests 476 passed; cargo fmt/clippy/test ok.
CONCERNS: stop() in the failure branches is unconditional; harmless when nothing is open (adapter stop is idempotent, fake counts stopCalls), existing assertions on stopCalls after refusals still hold.
CHOICES MADE:
- Minor 1: tests for lead (start, stop, start), tuner (enterTuner twice) and lead-then-Tuner-pill; FakeListening.resolveStart(n?, refuseWith?) answers a chosen held start with a failure.
- Minor 2: microphoneWanted moved above the startListening doc block; sentence amended.
- Minor 3: resolveStart guards an empty/out-of-range index; `flush` exported from lead-helpers.ts and reused by lead-edge-cases.test.ts (settle kept as three flushes).
- Minor 4: Listener start()/stop() comments describe the overtaken-start contract.

<!-- recorded 2026-10-05T12:46:08Z by scripts/record.sh -->
