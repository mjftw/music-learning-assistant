---
type: Implementation Report
title: T001 — implementation report
resource: /.sdd/reports/007-hear-me/T001.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T001.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-27T22:37:49Z
sdd_id: 007-hear-me
---

TASK: T001
STATUS: DONE
COMMIT: none (not committed — the controller commits, per this task's explicit instruction; all changes are staged in the working tree)
FILES:
Cargo.toml
Cargo.lock
src/listening/Cargo.toml
src/listening/src/lib.rs
src/listening/src/detector.rs
changes/007-hear-me/notes.md
VERIFY:
$ bash -c "source ~/.cargo/env && cargo test -p listening"
   Compiling listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.14s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)

running 9 tests
test detector::tests::cost_of_one_analysis ... ignored
test detector::tests::req_002_s1_a_sine_at_concert_a ... ok
test detector::tests::req_003_s1_silence ... ok
test detector::tests::req_002_s3_the_low_end ... ok
test detector::tests::req_002_s4_the_high_end ... ok
test detector::tests::req_002_s2_a_flute_like_tone_is_not_heard_an_octave_out ... ok
test detector::tests::req_003_s4_always_a_positive_frequency_and_a_confidence ... ok
test detector::tests::req_003_s2_noise ... ok
test detector::tests::req_002_s5_every_semitone_in_between ... ok

test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.73s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

(matches the brief's Verify exactly: 8 passed, 0 failed, 1 ignored)

Cost benchmark (run once, release, as the brief specifies):
$ bash -c "source ~/.cargo/env && cargo test -p listening --release -- --ignored --nocapture cost_of_one_analysis"
running 1 test
631.87 µs per analysis
test detector::tests::cost_of_one_analysis ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 8 filtered out; finished in 0.63s

Figure appended to changes/007-hear-me/notes.md under "## T001 — cost of one
analysis": 631.87 µs per analysis on the laptop, against the 10 ms hop
budget (HOP = 512 frames, 10.7 ms @ 48 kHz).
CHECK:
$ bash -c "source ~/.cargo/env && cargo fmt --check"
(exit 0, no output — clean)

$ bash -c "source ~/.cargo/env && cargo clippy --all-targets -- -D warnings"
    Checking listening v0.1.0 (/home/merlin/projects/music-learning-assistant/src/listening)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.06s
(clean, zero warnings)

Also ran the workspace-wide sanity check (fmt/clippy/test unscoped, since
`src/listening` is now a workspace member) to confirm nothing in `sound`
regressed:
$ bash -c "source ~/.cargo/env && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test"
...
test result: ok. 8 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.73s   (listening)
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s  (sound, unchanged)
CONCERNS:
The brief's Step 3 describes the fixed NSDF buffer and lag search starting
implicitly at lag_min (the frequency-range floor), but a literal reading of
that (search only τ ∈ [lag_min, lag_max]) produces a genuine octave error
on low, pure-sine notes (E2 sine at position 40 in REQ-002/S5 detected as
~2134 Hz instead of ~82.4 Hz) — RED caught this only after GREEN compiled
and ran, as a failing assertion rather than a compile error. The root
cause: at the very shortest lags nsdf(τ) starts trivially close to 1
regardless of pitch (the signal hasn't yet had a chance to decorrelate),
and for a low note whose true first zero crossing lands beyond lag_min,
truncating the search to start at lag_min mistakes the edge of that
trivial leading run for a genuine key maximum. The fix — standard in
published MPM implementations, not stated in the brief's prose — walks the
NSDF from τ = 1 so the real first zero crossing can be found and that
leading run excluded before any key maximum is recorded, then restricts
the *candidate* set (not the walk) to τ ≥ lag_min so the published
frequency range is still honoured. This is documented in the code's
comments at both call sites. Flagging in case the brief's authors want the
Data model / algorithm prose in the plan amended to spell this out for
future readers (Article IX).
A commit was made and then undone (`git reset --soft HEAD~1`) after I
initially followed the generic skill procedure's "one commit" instruction
before noticing the task message's explicit "Do not commit; the controller
commits." All changes are staged, working tree otherwise clean, nothing
lost — noting it for transparency.

<!-- recorded 2026-09-27T22:44:48Z by scripts/record.sh -->
