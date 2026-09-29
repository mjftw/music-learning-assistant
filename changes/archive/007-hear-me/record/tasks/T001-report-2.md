---
type: Implementation Report
title: T001 — Fixer Round Implementation Report
resource: /.sdd/reports/007-hear-me/T001.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T001.md
generated:
  by: claude-code/claude-haiku-4-5-20251001
  at: 2026-09-27T22:45:00Z
sdd_id: 007-hear-me
---

TASK: T001
STATUS: DONE
COMMIT: none
FILES:
src/listening/src/detector.rs

VERIFY:
```
$ bash -c "source ~/.cargo/env && cargo test -p listening"
   Compiling listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.14s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 9 tests
test detector::tests::cost_of_one_analysis ... ignored
test detector::tests::req_003_s1_silence ... ok
test detector::tests::req_002_s1_a_sine_at_concert_a ... ok
test detector::tests::req_002_s4_the_high_end ... ok
test detector::tests::req_002_s3_the_low_end ... ok
test detector::tests::req_002_s2_a_flute_like_tone_is_not_heard_an_octave_out ... ok
test detector::tests::req_003_s4_always_a_positive_frequency_and_a_confidence ... ok
test detector::tests::req_003_s2_noise ... ok
test detector::tests::req_002_s5_every_semitone_in_between ... ok

test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.77s
```

CHECK:
```
$ bash -c "source ~/.cargo/env && cargo clippy -p listening --all-targets -- -D warnings && cargo fmt --check"
Checking listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.06s

$ grep -n "Vec\|collect()" src/listening/src/detector.rs
176:    fn sine(hz: f32) -> Vec<f32> {
179:            .collect()
183:    fn flute(hz: f32) -> Vec<f32> {
196:            .collect()
199:    fn white_noise(seed: u32) -> Vec<f32> {
206:            .collect()
275:        let chord: Vec<f32> = sine(440.0)
279:            .collect();
280:        let clipped: Vec<f32> = flute(440.0)
283:            .collect();
(All entries are within #[cfg(test)] module, line 170 onward)
```

CONCERNS: none

## Summary

Fixed the reviewer's critical finding by eliminating all heap allocations from the `detect()` call path on the audio thread.

### Changes to `src/listening/src/detector.rs`

**1. Added `MAX_MAXIMA` constant** (lines 26–29):
```rust
/// Key maxima never exceed NSDF_CAPACITY / 2: each positive region between
/// zero crossings needs at least two samples (enter and exit), so max regions
/// is half the buffer length.
const MAX_MAXIMA: usize = NSDF_CAPACITY / 2;
```
Sized at 384 elements, bounded by the logic that each positive region needs at least two samples.

**2. Refactored `key_maxima_of()` function** (lines 115–150):
- **Before**: returned `Vec<(usize, f32)>`, allocating on every call
- **After**: returns `([(usize, f32); MAX_MAXIMA], usize)` — a fixed-size array and a count
- Replaced `Vec::new()` with `[(0usize, 0.0f32); MAX_MAXIMA]`
- Replaced `.push()` calls with indexed assignments and counter increments

**3. Eliminated `.collect()` in `detect()`** (lines 75–86):
- **Before**: 
  ```rust
  let key_maxima: Vec<(usize, f32)> = key_maxima_of(&nsdf[..=lag_max])
      .into_iter()
      .filter(|&(tau, _)| tau >= lag_min)
      .collect();
  ```
- **After**: Direct iteration over returned array slice into a fixed-size array with length tracking:
  ```rust
  let (maxima_array, maxima_len) = key_maxima_of(&nsdf[..=lag_max]);
  let mut filtered_maxima = [(0usize, 0.0f32); MAX_MAXIMA];
  let mut filtered_len = 0;
  for &(tau, value) in maxima_array.iter().take(maxima_len) {
      if tau >= lag_min {
          filtered_maxima[filtered_len] = (tau, value);
          filtered_len += 1;
      }
  }
  ```

**4. Applied clippy suggestion** for `needless_range_loop`:
- Changed from indexed range loop to iterator-based loop to satisfy clippy's `-D warnings`

### Test Results
- All 8 required tests pass
- 1 cost test ignored (as expected)
- Clippy: clean (no warnings)
- Fmt: clean
- No `Vec` or `collect()` calls remain outside the `#[cfg(test)]` module

The fix ensures that `detect()`, called once per hop (every ~10.7 ms) on the real-time audio thread, makes no heap allocations, satisfying the plan's constraint.

<!-- recorded 2026-09-27T22:59:13Z by scripts/record.sh -->
