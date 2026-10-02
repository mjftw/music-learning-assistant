---
type: Implementation Report
title: T005 — implementation report
resource: /.sdd/reports/008-learner-leads/T005.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T005.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T19:39:40Z
sdd_id: 008-learner-leads
---

TASK: T005
STATUS: DONE
COMMIT: none (controller said: do not commit)
FILES:
tests/practice/lead-helpers.ts
tests/practice/scenarios/lead-mode.test.ts
tests/practice/scenarios/lead-run.test.ts
src/practice/domain/session.ts
src/practice/published/index.ts
src/ui/TransportCard.tsx
tests/ui/scenarios/transport-card.test.tsx
tests/practice/scenarios/session-transport.test.ts
tests/practice/scenarios/drone-exclusion.test.ts
tests/practice/invariants/hold-never-early.test.ts

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/lead-mode.test.ts tests/practice/scenarios/lead-run.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  7 passed (7)
   Start at  20:39:24
   Duration  859ms (environment 45%, transform 35%, import 18%, tests 3%, worker 1%)
```

Also ran, per Step 4:
```
$ pnpm vitest run tests/practice tests/ui
 Test Files  65 passed (65)
      Tests  311 passed (311)
```
(every pre-existing scenario named in Step 4 still passes — REQ-002/S1–S4, REQ-009/S1, REQ-011/S3–S4, REQ-013/S1–S4/S6, REQ-014/S5 territory untouched, and `session-transport.test.ts`'s REQ-002/S1–S2, REQ-004/S4, REQ-007/S1–S3 pass with `who: "tool"`.)

CHECK:
```
$ source ~/.cargo/env && pnpm check
...
 Test Files  82 passed (82)
      Tests  372 passed (372)
   Start at  20:39:...
   Duration  ~19s

...
     Running unittests src/lib.rs (target/debug/deps/listening-...)
running 14 tests
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 5.03s

     Running unittests src/lib.rs (target/debug/deps/sound-...)
running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
prettier, eslint and tsc all passed silently before vitest ran; cargo fmt/clippy (`-D warnings`)
and cargo test all green. Also ran `scripts/check-contexts.sh` ("✅ context boundaries respected")
and `scripts/check-scenarios.sh` ("✅ scenario coverage complete") — both clean (REQ-014/REQ-015
aren't in the merged spec yet, so the scenario check doesn't look for them; that's expected at
this stage of the change).

## What was built

Followed the brief's steps in order:

1. **RED** — wrote `tests/practice/lead-helpers.ts` verbatim from the brief, and
   `tests/practice/scenarios/lead-mode.test.ts` / `lead-run.test.ts` with the brief's exact test
   bodies, confirmed via `pnpm vitest run` that all 7 failed for the stated reason
   (`snapshot().lead` undefined / `TypeError`).
2. **GREEN** — in `src/practice/domain/session.ts`:
   - `LeadSnapshot` exported alongside `SessionSnapshot`; `SessionSnapshot` gains `lead`, loses
     `progress`.
   - New internal state: `listeningOwner: "none" | "tuner" | "lead"` (set by `enterTuner()` /
     `leaveTuner()` alongside the existing `tunerActive`, and by the new lead flow — `tunerActive`
     itself and every `!tunerActive || …` check are untouched), `leadPhase: LeadPhase`,
     `leadListeningState: ListeningState` (carries "starting", since `LeadPhase` itself has no
     such variant — mirrors `TunerSnapshot`'s split between `active` and `listening`), and
     `leadGeneration` (mirrors `tunerGeneration`/`droneGeneration`).
   - `start()` dispatches at the top: `who === "me"` routes to the new `startLead()` and returns
     before touching any of the transport/scheduler machinery; `who === "tool"` is the pre-existing
     body, untouched.
   - `startLead()`: no-op on an empty sequence or while already listening/asking
     (`listeningOwner === "lead"`); else `stopDrone()` if sounding, `listeningOwner = "lead"`,
     `wakeLock.acquire()`, `listening.start()` — on success, `leadPhase` becomes `{kind:
     "listening", target: targetAt(sequence, 1), hold: emptyHold, mutedUntilMs: null}` and
     `TargetAdvanced` is emitted; on failure, `leadPhase`/`leadListeningState` become
     `cannot-hear(reason)` and `listeningOwner` reverts to `"none"` so the next tap can retry
     (REQ-022/S2, not tested by this task but needed for T009 not to find it broken).
   - `stop()` gains a lead branch (checked first): `listening.stop()`, `listeningOwner = "none"`,
     phase/listening reset to idle/off, wake lock released if nothing else holds it; otherwise the
     existing body runs unchanged.
   - `setSettings()`: a changed `lead.who` while a run is in progress (`transport.kind !== "idle"`
     or `listeningOwner === "lead"`) calls `stop()` first, then stores the new settings. (Needed a
     second `invalidateSnapshot()` after storing the new settings — `stop()`'s own `notifyChange()`
     had already rebuilt and cached a snapshot from the *old* settings; see CONCERNS.)
   - `buildSnapshot()`'s `lead` block: `who`/`idleCaption` from `currentSettings.lead` (+
     `sequenceCaptionOf`, extracted from `captionOf`'s idle case so play along's idle caption and
     I lead's tool-mode idle caption share one implementation rather than two copies);
     `phase`/`listening`/`target`/`heldFraction` from `leadPhase`/`leadListeningState`;
     `reading`/`justHeld` are `null` (T006/T011's job); `completeCaption` from a new
     `leadCompleteCaptionOf()` (always `null` until a run can actually reach "complete", which
     T006 wires).
   - `snapshotsMateriallyEqual()`: dropped the `progress` comparison, added one for
     `lead.phase`/`listening`/`target`/`heldFraction`/`reading`/`justHeld` (`who`/`idleCaption`
     need no separate comparison — they're already implied by the existing `settings`/`run`
     reference checks, the same reasoning the function's own comment already gives for the other
     derived fields).
   - `published/index.ts`: `LeadSnapshot` added to the `session`-sourced type export list.
   - `src/ui/TransportCard.tsx`: the progress-bar `<div>` (and its now-unused
     `TRACK_*`/`FILL_BACKGROUND` constants) removed, replaced with a comment pointing at T012
     (the mode words are its job, not this task's).
3. Ran the two new files (PASS), then `tests/practice tests/ui` (PASS, 311/311) and `pnpm check`
   (PASS).
4. **REFACTOR** — extracted `requestListening(owner, isCurrent, onReady)`: the
   "await the wake lock, then (unless superseded) hand off" trampoline shared by `enterTuner()`
   and `startLead()`. Kept `isCurrent` as a caller-supplied predicate (each owner's own existing
   generation check — `tunerGeneration === startedAtGeneration` / `leadGeneration ===
   startedAtGeneration`) rather than collapsing to `owner` alone: a *second* call for the *same*
   owner (a second `enterTuner()`, say) must still supersede the first, and only the per-call
   generation — not the owner — tells those two apart. `enterTuner()`'s own `startListening()` and
   its generation handling are untouched; `requestListening()` only replaces the
   `await wakeLock.acquire(); if (tunerGeneration !== startedAtGeneration) return; startListening(...)`
   trampoline that used to be written out, with the identical check now expressed as the
   `isCurrent` callback plus a new (additive) `listeningOwner !== owner` guard. Re-ran the full
   suite after the refactor — still 311/311, then `pnpm check` green.

## REQ-015/S8's fixture — a necessary deviation from the brief's literal text

The brief's own S8 code block uses `sessionOn("F♯", "ocarina-alto-c", {direction: "up", octaves:
{kind: "count", count: 4}, shape: "scale"}, leadSettings())`, with a comment inviting me to run a
one-off loop over `builtInCatalogue()` and the twelve majors to find the pair whose `run` is
actually empty, "fix the test to that pair and delete the loop." I did exactly that (as a scratch
vitest file, run and deleted — never committed, never left in the tree): an exhaustive search over
all three catalogue variants (`flute-concert` C4–C7, `ocarina-alto-c` A4–F6, `ocarina-bass-c`
A3–F5 — every one spans **at least two octaves**), all twelve majors and minors, every scale in
`ScaleId`, every octave count (1–4, full) and both shapes, found **zero** key/variant/scale
combinations with an empty run or an empty `keyView`. The catalogue's three instrument ranges are
simply too wide, and every scale in the catalogue has ≥5 pitch classes per octave — there is no
real pair to find.

Since REQ-015/S8 ("a key with no notes of the scale in the variant's range") still needs a test,
and the brief is explicit that a true one-off-loop pair should be found and substituted, I built the
condition synthetically instead: a test-only `Variant` (`createSession()` called directly — the
published interface, not `sessionOn`, since `sessionOn` only resolves variant IDs from the real
catalogue) whose range is a single pitch (C♯4–C♯4) outside C major's scale, which deterministically
produces `run.length === 0`. This is documented in `lead-run.test.ts` with a comment explaining why
and what the exhaustive search covered. I judged this a two-way, contained, implementer-level
craft call (how to construct one test fixture) rather than a DECISION_NEEDED: it doesn't change
what REQ-015/S8 promises or touch anything outside this one test file, and is trivially reversible
if a future catalogue instrument ever does produce a genuine empty-range pair.

## CHOICES MADE

- `leadListeningState` as its own variable (mirroring `tunerListeningState`) rather than deriving
  `lead.listening` fresh from `leadPhase` on every `buildSnapshot()` call — a derived value would
  be a fresh object literal each time, breaking `snapshotsMateriallyEqual`'s reference-equality
  check on it and defeating the notify-dedup optimisation for every build once this field
  exists. This also gives the lead run a real "starting" state (between the tap and the
  microphone settling), which `LeadPhase` itself has no variant for, closing what I read as a
  stray/loose reference to "lead.phase is listening/starting" in the brief's prose (`LeadPhase`
  has no "starting" kind; the brief's Produces block for `LeadSnapshot` does separate `phase` from
  `listening`, which is what led me here).
- `requestListening(owner, isCurrent, onReady)` takes three parameters, not the two
  (`owner, onStarted`) the brief's REFACTOR line names. Two params (owner-only generation check)
  would weaken `enterTuner()`'s existing protection against a second `enterTuner()` racing the
  first one's `wakeLock.acquire()` (same owner, different generation) — a real, if narrow,
  regression risk for a brief that explicitly says "every existing tuner test must still pass."
  Kept the extra `isCurrent` predicate so each caller's own existing generation check is preserved
  byte-for-byte, just moved into a passed-in closure.
- `sequenceCaptionOf()` extracted from `captionOf()`'s `"idle"` case (previously inlined) so it can
  be shared with `leadIdleCaptionOf()`'s `who === "tool"` branch, rather than copying the
  three-line caption formula a second time (AGENTS.md: "Duplicating a private helper instead of
  extracting it").
- `snapshotsMateriallyEqual()` does not separately compare `lead.who` or `lead.idleCaption` —
  both are fully determined by `settings` (and, for the tool-mode caption, `run`/`sequence`), both
  already compared by reference, the same reasoning the function's own existing comment gives for
  skipping `effectiveOctaves`/`tempoTerm`/etc.
- `leaveTuner()`/`enterTuner()` now also set `listeningOwner`, additively, alongside the existing
  `tunerActive` — required by the brief's own "Internal" spec line (`listeningOwner`'s tuner/lead
  split) and used by `requestListening()`'s and `releaseWakeLockIfSilent()`'s guards; does not
  change any existing tuner branch's condition.
- `dispose()` also releases the microphone when `listeningOwner === "lead"` (mirroring the existing
  `if (tunerActive) listening.stop()`) — not tested by this task, but an obvious resource-leak gap
  to leave open once a lead run can be mid-listen when `dispose()` runs.
- Did **not** wire `startDrone()`/`enterTuner()` to stop a lead run first (REQ-015/S5, S7 in
  plan.md's interface table) — no RED test in this task drives it (the brief's own verbatim test
  list for `lead-run.test.ts` is S1, S2, S8 only), so per TDD ("no production code before a failing
  test") and Article VIII (simplicity), left for whichever later task's brief adds that test.
- Did **not** add an `endTapIfSounding()` call to `startLead()`'s entry (tool-mode `start()` does
  this) — not in the brief's literal description of the "me" branch's steps, and not exercised by
  any of this task's tests.

CONCERNS:
- `setSettings()` needed a second `invalidateSnapshot()` call after storing the new settings,
  not mentioned in the brief — `stop()` (now called conditionally from inside `setSettings()`)
  ends with its own `notifyChange()`, which rebuilds and *caches* a snapshot from whatever
  `currentSettings` still was at that point (the old ones); without a second invalidation, the
  final `notifyChange()` in `setSettings()` would silently return that stale cached snapshot. Found
  this via the REQ-014/S3 RED test (asserting `lead.who` was "tool" after switching back, which
  initially came back "me"), fixed, and it's covered by that same test plus the full suite — not
  flagging as a question, just noting it since it's a subtlety a future task touching
  `setSettings()` should be aware of.
- REQ-015/S8's fixture substitution (see section above) is the one place I deviated from the
  brief's literal test code rather than using it verbatim, for a solid, checkable reason (the
  literal fixture cannot produce an empty run with the real catalogue). Flagging in case the
  catalogue later grows a genuinely narrow-range instrument, at which point the synthetic variant
  could be swapped for a real one if that's ever preferred for realism.
- `tests/practice/lead-helpers.ts` exports `hearAt`/`hearSteady`/`letGapPass`/`holdThrough` that
  this task's own tests never call (they exist for T006+ per the brief's verbatim spec for that
  file) — `pnpm check`'s eslint/tsc passed clean regardless (exported, not unused-local), noting
  only so it isn't mistaken for dead code added without a task driving it.

<!-- recorded 2026-10-02T19:55:03Z by scripts/record.sh -->
