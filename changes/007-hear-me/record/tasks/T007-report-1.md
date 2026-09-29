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
  at: 2026-09-28T08:05:26Z
sdd_id: 007-hear-me
---

TASK: T007
STATUS: DONE_WITH_CONCERNS
COMMIT: none (brief instructs "Do not commit")
FILES:
src/practice/domain/session.ts
src/ui/App.tsx
tests/practice/fakes.ts
tests/practice/scenarios/tuner-way-in-out.test.ts (new)
tests/practice/invariants/target-in-sequence.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/drone-octave.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/drone-tonic.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/edge-cases.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/session-target.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/session-transport.test.ts (ripple: SessionContext.spelling)
tests/practice/scenarios/session-traversal.test.ts (ripple: SessionContext.spelling)
tests/ui/scenarios/transport-card.test.tsx (ripple: SessionSnapshot.tuner placeholder)

src/practice/published/index.ts was left untouched — every symbol T007 needed
(TunerSnapshot, ListeningState, TunerTarget, NoteJudged, canStepTarget, Session,
SessionContext, SessionSnapshot) was already exported from T006; `Session` gaining
new methods and `SessionSnapshot`/`SessionContext` gaining new fields needs no new
export line since the type names are unchanged.

VERIFY:
$ pnpm vitest run tests/practice/scenarios/tuner-way-in-out.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  09:04:14
   Duration  598ms (environment 48%, transform 31%, import 15%, tests 5%, worker 1%)

$ pnpm vitest run tests/practice tests/ui

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  47 passed (47)
      Tests  191 passed (191)
   Start at  09:01:17
   Duration  7.60s (tests 45%, environment 34%, import 11%, transform 10%)

$ pnpm vitest run tests/practice   (Verify line)

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  26 passed (26)
      Tests  96 passed (96)
   Start at  09:03:53
   Duration  3.51s (environment 63%, transform 19%, import 10%, tests 8%)

CHECK:
$ bash -c "source ~/.cargo/env && pnpm check"

> music-learning-assistant@0.0.0 check
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  63 passed (63)
      Tests  251 passed (251)
   Start at  09:04:49
   Duration  8.86s (tests 44%, environment 38%, import 11%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
running 11 tests (listening) ... test result: ok. 10 passed; 0 failed; 1 ignored
running 25 tests (sound) ... test result: ok. 24 passed; 0 failed; 1 ignored
Doc-tests listening: ok. 0 passed
Doc-tests sound: ok. 0 passed

(prettier, eslint, tsc, vitest, cargo fmt, cargo clippy -D warnings and cargo
test all exited 0 — the command chain is `&&`-joined so any failure upstream
would have stopped it before reaching cargo test)

CONCERNS:
- The brief's step-1 test snippet accessed `p.command` on elements of
  `sound.posted` (e.g. `sound.posted.filter((p) => isTone(p.command) || ...)`).
  `FakeSound.posted` is (and remains) `SoundCommand[]` — `isTone`/`isClick`/
  `isDrone` take a `SoundCommand` directly, exactly as every other test file
  in the suite uses them (`sound.posted.filter(isTone)`). The `.command`
  field only exists on `sound.posts` (`PostedCommand[]`, the frame-paired
  array), which several existing tests already index this same way
  (drone-exclusion.test.ts, never-both.test.ts). I judged this a
  transcription slip in the brief rather than an intended rename — renaming
  `FakeSound.posted`'s shape would have rippled, unlisted, into ~15 other
  test files that call `sound.posted.filter(isTone)` directly. I changed the
  three affected assertions in tuner-way-in-out.test.ts from `sound.posted`
  to `sound.posts` (keeping `.command`), which is the smallest change that
  makes the test's own literal shape type-check and pass, and left
  `FakeSound.posted`'s type/semantics untouched. Flagging in case the
  intent was actually different.
- `sessionOn("G", "flute-concert")` (only two args) required adding default
  `traversal`/`settings` parameters to `tests/practice/fakes.ts`'s `sessionOn`
  — not explicitly named in the brief's Files list, but necessary per the
  brief's own step-1 test code and its "sessionOn's fixture fields... add
  them if missing" note. I added a local `twoOctaveUpdownScale` traversal
  (two octaves, updown, scale — the same shape every other test file's own
  `GMajorTwoOctaves` constant uses) as the default, since it is what
  produces the "29 notes · G4–G6" caption the brief's own S2 test asserts
  on G major + flute-concert. Default `settings` is `defaultSessionSettings`
  (already published). This only changes behaviour for callers that omit
  those arguments — every existing call site in the suite already passes
  them explicitly, confirmed by the full `tests/practice tests/ui` and
  `pnpm check` runs above, both green.
- `SessionContext.spelling` being required meant fixing every test file
  that builds a `SessionContext` object literal directly (via `setContext`
  or `createSession`), not only `App.tsx` and `fakes.ts` as the brief's own
  note named: `drone-tonic.test.ts`, `drone-octave.test.ts`,
  `session-transport.test.ts`, `session-target.test.ts`,
  `session-traversal.test.ts`, `edge-cases.test.ts`, and
  `tests/practice/invariants/target-in-sequence.test.ts` (a direct
  `createSession` call). All given `spelling: "sharp"`, matching `sessionOn`'s
  own default — `tsc --noEmit` is clean and every test in those files still
  passes. `tests/ui/scenarios/transport-card.test.tsx` also needed a
  placeholder `tuner: TunerSnapshot` (off/auto/null, the REQ-001/S4 default
  shape) added to its hand-built `SessionSnapshot` fixture, following the
  file's own existing "renders nothing about X either (T007+)" placeholder
  pattern for drone/scale/tappedRunIndex.
- `enterTuner()`/`leaveTuner()` follow `startDrone()`/`stopDrone()`'s shape
  exactly as instructed: `enterTuner()` calls `stop()` when transport isn't
  idle and `stopDrone()` when the drone is on, then does the inline
  `await wakeLock.acquire(); await listening.start();` guarded by
  `tunerGeneration`; `leaveTuner()` bumps `tunerGeneration` (superseding a
  still-pending `enterTuner()`), calls `listening.stop()` synchronously,
  resets `active`/`listening`/`target`/`targetNote`/`reading`, and calls the
  now-tuner-aware `releaseWakeLockIfSilent()`. `start()`, `startDrone()` and
  `tapNote()` each gained a `if (tunerActive) return;` guard at their top.
  `dispose()` now also calls `listening.stop()` when the tuner is active and
  clears the new `noteJudgedListeners` set (not directly tested by any T007
  scenario, but matches the brief's "dispose() releasing everything").
  `onNoteJudged` is wired (registers/unsubscribes into a `Set`) but nothing
  emits to it yet, per the brief — that's T008.

<!-- recorded 2026-09-28T08:13:20Z by scripts/record.sh -->
