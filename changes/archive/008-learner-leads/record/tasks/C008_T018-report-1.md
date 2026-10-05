---
type: Implementation Report
title: C008_T018 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T018.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T018.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T06:58:33Z
sdd_id: 008-learner-leads
---

TASK: C008_T018
STATUS: DONE
COMMIT: b31dbd0
FILES:
scripts/harness-lib.mjs
scripts/tuner-timing-test.mjs
VERIFY:
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     69.20                   61.31                 21.35               92.86           1.28           0              PASS  
flute-like E2–C7     57     68.40                   61.31                 29.35               92.86           0.65           1              PASS  
hand-over glissando  1      61.30                   61.31                 10.69               93.81           —              —              PASS  
silence              —      —                       —                     —                   0.00            —              —              PASS  
white noise          —      —                       —                     —                   0.00            —              —              PASS  
  worst: first readout F5 69.20 ms · arrival age E2 61.31 ms · cents err G5 1.28 ¢ · shown err E2 0 ¢
  worst: first readout E4 68.40 ms · arrival age G3 61.31 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
CHECK:
Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  92 passed (92)
      Tests  446 passed (446)
   Start at  07:57:54
   Duration  22.27s (tests 60%, environment 27%, import 8%, transform 5%)

[... cargo fmt/clippy clean, cargo test for listening and sound crates ...]

test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.91s (listening)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s (sound)
Doc-tests listening: ok. 0 passed; 0 failed
Doc-tests sound: ok. 0 passed; 0 failed
CONCERNS: none
CHOICES MADE:
- Baseline pnpm test:tuner (before any change) passed cleanly, with no instance of the archived 007 cold-load first-readout artefact, so the normal DONE path applied (same rows/columns, PASS before and after).
- positionsE2ToC7 closed over module-level constants TUNER_LOWEST_POSITION/TUNER_HIGHEST_POSITION; noteLabelOfPosition closed over SHARP_PITCH_CLASS_LABELS (node-side copy only — the in-page duplicate inside measureInPage, needed because page.evaluate serialises only that function's own body, was left untouched per the file's own comment). Moved these constants into harness-lib.mjs alongside the functions that need them, so each function's body stays verbatim.
- ensureDevServer closed over REPO_ROOT (derived from __dirname). harness-lib.mjs computes its own REPO_ROOT the same way (one level up from scripts/, where harness-lib.mjs itself lives) — identical value, no behaviour change.
- isDevServerUp/waitForDevServer/ensureDevServer close over APP_URL, DEV_SERVER_POLL_INTERVAL_MS and DEV_SERVER_TIMEOUT_MS; moved APP_URL (exported, per the Interfaces list) and the two timing constants into harness-lib.mjs. tuner-timing-test.mjs now imports APP_URL from harness-lib.mjs for its own remaining uses (page.goto, etc.) rather than keeping a second definition.
- Removed the now-dead imports (node:child_process, node:net, node:path, node:url) and __dirname/REPO_ROOT from tuner-timing-test.mjs since nothing left there uses them.
- Left short one-line comments in tuner-timing-test.mjs noting what moved to harness-lib.mjs, for readability, rather than leaving a silent gap.

<!-- recorded 2026-10-04T07:04:51Z by scripts/record.sh -->
