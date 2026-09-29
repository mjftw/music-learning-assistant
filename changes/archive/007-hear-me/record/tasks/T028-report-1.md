---
type: Implementation Report
title: T028 — implementation report
resource: /.sdd/reports/007-hear-me/T028.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T028.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T21:44:18Z
sdd_id: 007-hear-me
---

TASK: T028
STATUS: DONE
COMMIT: none (not requested)
FILES:
src/practice/domain/session.ts
src/practice/domain/tuner.ts
src/ui/TargetSheet.tsx
src/ui/PitchSpiral.tsx
tests/practice/scenarios/tuner-target.test.ts
tests/practice/scenarios/tuner-memory.test.ts
tests/practice/tuner-helpers.ts
tests/ui/scenarios/target-sheet.test.tsx
tests/ui/scenarios/tuner-helpers.ts
tests/practice/scenarios/tuner-way-in-out.test.ts
tests/ui/scenarios/transport-card.test.tsx

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/tuner-target.test.ts tests/practice/scenarios/tuner-memory.test.ts tests/ui/scenarios/target-sheet.test.tsx

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  3 passed (3)
      Tests  20 passed (20)
   Start at  22:43:20
   Duration  2.88s (tests 55%, environment 20%, transform 15%, import 9%)
```

```
$ pnpm vitest run tests/practice tests/ui

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  58 passed (58)
      Tests  260 passed (260)
   Start at  22:43:26
   Duration  9.01s (tests 52%, environment 31%, import 10%, transform 7%)
```

```
$ ./scripts/check-scenarios.sh --change changes/007-hear-me | grep "❌"
  ❌ practice.tuner/REQ-005/S5 has no test citing it
  ❌ practice.tuner/REQ-005/S6 has no test citing it
❌ scenario gaps
```
(exactly the two the brief said would remain — the next task)

```
$ ./scripts/check-contexts.sh
✅ context boundaries respected
```

CHECK:
```
$ bash -c "source ~/.cargo/env && pnpm check"

Checking formatting...
All matched files use Prettier code style!

 Test Files  75 passed (75)
      Tests  321 passed (321)
   Start at  22:43:50
   Duration  10.55s (tests 51%, environment 33%, import 9%, transform 7%)

running 13 tests (listening)
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.20s

running 24 tests (sound)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s
```
prettier, eslint, tsc, vitest, cargo fmt, cargo clippy and cargo test all
ran and passed (the chain never stopped early).

DECISIONS:
- `session.ts` tracks the last note heard as a *pitch position* (`let
  tunerLastHeardPosition: number | null`), the same shape as
  `tunerShownPosition`, set in `commitTunerReading()` from every committed
  reading's `heard.nearest`, left untouched by `clearTunerReading()` (the
  gap/hidden/failed-mic clearer), and reset to `null` only in
  `leaveTuner()`. `buildSnapshot()` derives `TunerSnapshot.lastHeard`
  fresh from it each call (spelled per `currentContext.spelling`), exactly
  mirroring how `targetNote` is derived from `tunerTarget` — so a spelling
  change re-spells it for free, and `snapshotsMateriallyEqual` compares it
  by value with the existing `targetNoteEqual` helper (a fresh `Note`
  object every call would otherwise never compare equal by reference).
- `holdTarget()` now pins `tunerReading.heard.nearest` when a reading is
  showing (unchanged), else `tunerLastHeardPosition` when set, else no-op —
  matching REQ-004/S1, S7, S8.
- `TargetSheet.tsx`'s `HoldCard` takes `active`/`holdName`/`subtitle`
  instead of the old `hasReading`/`holdName`: `active` is true whenever
  there is a note to show (a live reading *or* a remembered last-heard
  note), driving the same border/title styling the reading-showing state
  always had; `subtitle` carries "what you're playing" / "the last note
  you played" / "play a note first".
- `PitchSpiral.tsx` takes a new `lastHeard: Note | null` prop. The needle
  now has three states: tracks `reading` at its verdict colour (unchanged);
  rests at `pitchPosition(lastHeard)` (zero cents) in `tuner.ghostInk` when
  there's no reading but a last-heard note; or is absent. The needle
  `<g>` carries `data-state="heard"` / `"last-heard"` so tests can tell the
  two apart, per the brief's suggestion. The trail is now additionally
  gated on `reading !== null` (previously just on `needleTone !== null`,
  which would otherwise also be true for the greyed state) — in practice
  `TunerScreen.tsx`'s `trailRef` already resets to `[]` whenever
  `tuner.reading` goes null, so the trail array itself is already empty by
  the time the needle turns grey; this extra guard makes the "no trail
  while greyed" requirement hold from `PitchSpiral`'s own contract too,
  not just by relying on that caller behaviour.
- Test helpers: added `letGapPass(f)` to both
  `tests/practice/tuner-helpers.ts` and `tests/ui/scenarios/tuner-helpers.ts`
  (`f.clock.advanceMs(300)`, matching the 300 ms the existing REQ-003
  scenarios already advance inline — `TUNER_GAP_MS` is a private constant
  in `session.ts`, not exported, so this mirrors the value rather than
  importing it, the same as the existing tests do). In
  `tests/ui/scenarios/tuner-helpers.ts` I extracted the render/open dance
  out of `enterAndHear` into a new `enterTuner(spelling?, extraProps?)`
  (returns once LISTENING shows, before feeding any pitch), and rewrote
  `enterAndHear` to call it — needed for REQ-004/S8's "nothing heard yet"
  scenario, which must enter the tuner without ever feeding a pitch; this
  follows AGENTS.md's "extract, don't duplicate" note rather than
  copy-pasting the render/open block into a second helper.

RIPPLES (not in the brief's Files list, touched because the type change
required it — found by `grep -rn "targetNote:"`):
- `tests/practice/scenarios/tuner-way-in-out.test.ts` — REQ-001/S4's
  `toEqual` snapshot of the whole `tuner` object needed `lastHeard: null`
  added (a second test in the same file uses `toMatchObject` and needed no
  change).
- `tests/ui/scenarios/transport-card.test.tsx` — `placeholderTuner`, a
  hand-built `TunerSnapshot` fixture, needed `lastHeard: null` added to
  satisfy the widened interface.
- `tests/ui/scenarios/tuner-helpers.ts` — extended with `enterTuner` and
  `letGapPass` (see DECISIONS above); not in the brief's Files list but
  explicitly invited by the brief's "Test helpers" section.

TDD notes: every new/changed assertion was run red before any production
code changed. `tuner-target.test.ts`'s S7 failed on the pinned-target
assertion (`{kind:"auto"}` vs `{kind:"pinned", position:69}`); S8 and
`tuner-memory.test.ts`'s S3 failed on `lastHeard` reading back `undefined`
instead of `null` (Vitest doesn't type-check, so the missing field showed
up as a genuine runtime mismatch, not a compile error); the spelling-respell
test failed the same way. The UI-side S7 test failed on the Hold card's
text ("Holdplay a note first" not containing "A4"). S8 and REQ-009/S3 on
the UI side were already green before any production change — the old
`hasReading`-only logic already showed "play a note first" and no needle
whenever `tuner.reading` was null, which is also true in both those
scenarios; I kept them as explicit scenario-ID-tagged regression coverage
per the brief's own ask, not as a TDD-driving red.

CONCERNS: none.

<!-- recorded 2026-09-28T21:51:25Z by scripts/record.sh -->
