---
type: Implementation Report
title: T019 — implementation report
resource: /.sdd/reports/007-hear-me/T019.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T019.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T14:08:00Z
sdd_id: 007-hear-me
---

TASK: T019
STATUS: DONE
COMMIT: none (brief says "Do not commit")
FILES:
src/ui/TunerScreen.tsx
src/ui/App.tsx
src/ui/main.tsx
tests/ui/scenarios/tuner-screen.test.tsx

RED (first failure, stated reason):
```
 FAIL  tests/ui/scenarios/tuner-screen.test.tsx > practice.tuner/REQ-006 — every painted reading is reported with its age
AssertionError: expected undefined to be 10 // Object.is equality

- Expected:
10

+ Received:
undefined

 ❯ tests/ui/scenarios/tuner-screen.test.tsx:166:23
    164|   f.listening.frame = 4800 + 480;
    165|   await act(async () => {});
    166|   expect(ages.at(-1)).toBe(10);
       |                       ^
    167| });

 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
```

GREEN — `TunerScreen.tsx` gained a required `onReadingShown: (atFrame: number) => void` prop and a `useLayoutEffect` keyed on `tuner.reading?.atFrame` that calls it once per distinct reading (skipped when there is no reading). `App.tsx` gained an optional `onPaintAge?: (ageMs: number) => void` prop and a `handleReadingShown` callback wired to `<TunerScreen onReadingShown={...}>` that calls `session.readingShown(atFrame)` and forwards the returned age to `onPaintAge`. `main.tsx` gained a dev-only `collectPaintAge` that pushes onto `window.__paintAgesMs` (created lazily), wired as `<App onPaintAge={collectPaintAge}>` beside the existing `__session`/`__sound`/`__listening` hooks; `window.__enterTuner` was **not** added, per the brief.

`enterAndHear`'s third argument already spreads `extraProps` onto `<App>` (`tests/ui/scenarios/tuner-helpers.ts` line 57, `...extraProps`) — verified before use; no change needed there.

VERIFY: `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx`
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  14:05:48
   Duration  2.48s (tests 69%, transform 14%, environment 10%, import 7%)
```

`pnpm vitest run tests/ui`:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  24 passed (24)
      Tests  117 passed (117)
   Start at  14:06:05
   Duration  6.42s (tests 53%, environment 23%, transform 12%, import 12%)
```

CHECK: `bash -c "source ~/.cargo/env && pnpm check"` (last ~10 lines; full vitest summary above it: 72 test files, 303 tests, all passed, no prettier/eslint/tsc errors)
```
   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(vitest summary from the same run: `Test Files  72 passed (72)` / `Tests  303 passed (303)`; cargo: `test result: ok. 10 passed; 0 failed; 1 ignored` for `listening`, `test result: ok. 24 passed; 0 failed; 1 ignored` for `sound`.)

CONCERNS:
none — the one thing I checked rather than assumed (the "Things the brief cannot know" note said to verify `enterAndHear`'s third argument spreads onto `<App>`, and to add that if missing) was already correct in `tuner-helpers.ts`, so no change was needed there.

<!-- recorded 2026-09-28T13:11:46Z by scripts/record.sh -->
