---
type: Implementation Report
title: T017 — fixer round report
resource: /.sdd/reports/007-hear-me/T017.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T017.md
generated:
  by: claude-code/claude-haiku-4-5-20251001
  at: 2026-09-28T13:40:00Z
sdd_id: 007-hear-me
---

TASK: T017
STATUS: DONE
COMMIT: none
FILES:
src/ui/TargetSheet.tsx
src/ui/TunerScreen.tsx

VERIFY:
```
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  13:39:30
   Duration  2.20s (tests 66%, transform 14%, environment 12%, import 8%)
```

CHECK:
```
 Test Files  72 passed (72)
      Tests  297 passed (297)
   Start at  13:39:50
   Duration  9.91s (tests 50%, environment 33%, import 10%, transform 7%)

Environment  jsdom was created 72 times · 58.50s total, 33% of tracked time

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 11 tests
...
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.62s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

CONCERNS: none

## Summary

Fixed two duplications found by the reviewer in the T017 implementation:

### Finding 1: Duplicate constants in `src/ui/TargetSheet.tsx`

**Removed:**
- Deleted local constants `SPIRAL_FLOOR = 40` and `SPIRAL_CEILING = 96` (lines 57-58)
- Deleted associated comment block (lines 52-56)
- Removed import of `appendToTrail` from TunerScreen (no longer needed)

**Added:**
- Imported `TUNER_LOWEST_POSITION` and `TUNER_HIGHEST_POSITION` from `../practice/published` (lines 3-6)

**Updated:**
- `spiralSpanOf()` function to use imported constants instead of local duplicates (lines 73, 79)

### Finding 2: Duplicate trail-tracking logic in `src/ui/TargetSheet.tsx`

**Removed:**
- Deleted duplicate `trailRef` and `lastReadingRef` refs (lines 217-225)
- Deleted duplicate trail tracking logic that re-implemented `appendToTrail`
- Removed `useRef` import (no longer needed)

**Added:**
- Added `readonly trail: readonly NoteJudged[]` to TargetSheet props (line 200)

**Updated:**
- TargetSheet function signature to destructure `trail` from props (lines 206-216)
- PitchSpiral component call to use `trail={trail}` prop instead of `trail={trailRef.current}` (line 295)
- TunerScreen component to pass `trail={trailRef.current}` to TargetSheet (line 231)

### Changes in `src/ui/TunerScreen.tsx`

**Made private:**
- Removed `export` from `TRAIL_CAPACITY` constant (line 12)
- Removed `export` from `appendToTrail()` function (line 14)
- Updated comment to remove reference to exporting for TargetSheet (lines 10-11)

All 111 UI tests pass. Full check suite passes (297 tests, 72 test files, all green).

<!-- recorded 2026-09-28T12:45:08Z by scripts/record.sh -->
