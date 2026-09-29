---
type: Implementation Report
title: T001 — Fixer Round 2
resource: /.sdd/reports/007-hear-me/T001.md
status: done
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T001.md
generated:
  by: claude-code/claude-haiku-4-5-20251001
  at: 2026-09-28T00:00:00Z
sdd_id: 007-hear-me
---

TASK: T001
STATUS: DONE
COMMIT: none
FILES:
src/listening/src/detector.rs

CHANGES (line references):

1. **Lines 26–28: Fixed MAX_MAXIMA comment**
   - Before: "each positive region between zero crossings needs at least two samples (enter and exit), so max regions is half the buffer length."
   - After: "Key maxima never exceed floor(N/2) where N is the walked length (≤ NSDF_CAPACITY − 1): the walk opens at a non-positive sample, and consecutive positive regions must be separated by at least one non-positive sample, so at most floor(N/2) ≤ 383 regions."
   - Reason: The old comment's reasoning was factually incorrect. The walk is open at a non-positive sample; regions are separated by ≥1 non-positive sample; worst case is floor(N/2) for N ≤ 767, giving R_max ≤ 383 < MAX_MAXIMA (384).

2. **Line 76: Updated key_maxima_of call**
   - Before: `let (maxima_array, maxima_len) = key_maxima_of(&nsdf[..=lag_max]);`
   - After: `let (maxima_array, maxima_len) = key_maxima_of(&nsdf[..=lag_max], lag_min);`
   - Reason: Pass lag_min directly to enable filtering during the walk.

3. **Line 75: Updated comment**
   - Before: "Get all key maxima, then filter to the requested frequency range."
   - After: "Get key maxima within the requested frequency range."
   - Reason: Filtering now happens during the walk, not in a separate pass.

4. **Lines 78–86: Removed second filtering array**
   - Deleted: 9 lines of duplicate filtering logic using filtered_maxima array and second loop
   - Reason: Now filtered by key_maxima_of during the walk.

5. **Lines 78–88: Updated global_max and find logic**
   - Changed from `filtered_maxima[..filtered_len]` to `maxima_array[..maxima_len]`
   - Reason: Use results directly from key_maxima_of without intermediate array.

6. **Line 106: Updated key_maxima_of signature**
   - Before: `fn key_maxima_of(nsdf: &[f32]) -> ([(usize, f32); MAX_MAXIMA], usize) {`
   - After: `fn key_maxima_of(nsdf: &[f32], lag_min: usize) -> ([(usize, f32); MAX_MAXIMA], usize) {`
   - Reason: Accept lag_min parameter for filtering.

7. **Lines 101–105: Updated key_maxima_of docstring**
   - Added "with τ ≥ lag_min" to signature description
   - Reason: Clarify that filtering happens during the walk.

8. **Lines 128–136: Added lag_min check (first location)**
   - Before: `if let Some(best) = region_best.take() { maxima[count] = best; count += 1; }`
   - After: `if let Some((best_tau, best_value)) = region_best.take() { if best_tau >= lag_min { assert!(...); maxima[count] = (best_tau, best_value); count += 1; } }`
   - Reason: Filter during walk and add defensive assert.

9. **Lines 130–133: Added defensive assert (first location)**
   - `assert!(count < MAX_MAXIMA, "maxima count {count} exceeds capacity {MAX_MAXIMA}");`
   - Reason: Protect against buffer overflow, matching style of existing lag_max assert.

10. **Lines 140–148: Added lag_min check and assert (second location)**
    - Same changes as location 1, for trailing positive region after loop ends
    - Reason: Ensure trailing regions are also filtered and protected by assert.

VERIFY:
```
$ bash -c "source ~/.cargo/env && cargo test -p listening"
   Compiling listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.14s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 9 tests
test detector::tests::cost_of_one_analysis ... ignored
test detector::tests::req_002_s2_a_flute_like_tone_is_not_heard_an_octave_out ... ok
test detector::tests::req_002_s1_a_sine_at_concert_a ... ok
test detector::tests::req_003_s1_silence ... ok
test detector::tests::req_002_s4_the_high_end ... ok
test detector::tests::req_002_s3_the_low_end ... ok
test detector::tests::req_003_s4_always_a_positive_frequency_and_a_confidence ... ok
test detector::tests::req_003_s2_noise ... ok
test detector::tests::req_002_s5_every_semitone_in_between ... ok

test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.78s
```

CHECK:
```
$ bash -c "source ~/.cargo/env && cargo clippy -p listening --all-targets -- -D warnings && cargo fmt --check"
Checking listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.06s
```

CONCERNS: none

## Summary

Fixed both reviewer findings as instructed:

1. **[Important] MAX_MAXIMA comment** — Replaced factually incorrect reasoning ("each positive region needs at least two samples") with the actual worst-case argument: the walk opens at a non-positive sample; regions are separated by ≥1 non-positive sample; so at most floor(N/2) ≤ 383 regions for N ≤ NSDF_CAPACITY − 1. Added `assert!(count < MAX_MAXIMA, "...")` before writes in `key_maxima_of`, in the same style as the existing `lag_max < NSDF_CAPACITY` assert.

2. **[Minor] Eliminated duplicate filtering** — Passed `lag_min` into `key_maxima_of` and moved filtering to happen during the single walk. Deleted the second `filtered_maxima` array and its filtering loop in `detect`. Updated the comment from "Get all key maxima, then filter..." to "Get key maxima within the requested frequency range."

All 8 tests pass. Clippy and fmt check pass with no warnings.

<!-- recorded 2026-09-27T23:04:59Z by scripts/record.sh -->
