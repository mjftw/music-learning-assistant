---
type: Implementation Report
title: T027 — implementation report
resource: /.sdd/reports/007-hear-me/T027.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T027.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T21:24:11Z
sdd_id: 007-hear-me
---

TASK: T027
STATUS: DONE
COMMIT: none (brief said not to commit)
FILES:
scripts/tuner-timing-test.mjs
tests/listening/scenarios/tuner-harness.test.ts
AGENTS.md
changes/007-hear-me/notes.md

How the shown offset's error is computed (practice.tuner/REQ-002/S9):
- New named constants: `SHOWN_SETTLE_MS = 500`, `SHOWN_CENTS_ERROR_MAX_CENTS = 2`.
- For every reading (`NoteJudged`) arriving 500 ms or more after a tone's
  onset, the error is
  `| (positionOfNote(event.target) − position of the tone fed) × 100 + event.cents |`
  — `event.target` is the shown note (theory `Note`: letter/accidental/octave),
  `event.cents` the shown offset from it; both are exactly what the learner
  sees, unlike the existing `event.heard.hz` gate which reads the raw
  detection.
- `positionOfNote` duplicates `theory/domain/notes.ts`'s published
  `pitchPosition` (its `LETTER_SEMITONE`/`ACCIDENTAL_OFFSET` tables) inside
  the page function, the same way this script already duplicates
  `noteAtPosition`+`noteLabel` (`noteLabelOfPosition`) and the temperament
  formula (`trueHzOfPosition`) — the script has no bundler/TS step, so it
  cannot import the published theory function, and `event.target` only
  exists inside the browser-evaluated closure. This follows the script's
  own established convention rather than inventing a new one; each
  duplicate carries a comment naming its source, as the others do.
- The worst such error per tone is kept (`maxShownCentsErr`, starting at 0,
  same pattern as the existing `maxCentsErr`); the worst per sweep row is
  `maxOf(...)`, gated into `passed`, added to the `worstLine`, and named in
  both the PASS and FAIL lines. Because both terms are exact integers
  (positions are integers, `event.cents` is documented as "signed, whole
  cents"), the error is always a whole number and is printed undecorated
  (no `.toFixed`).
- A new column `shown err max` sits between `cents err max` and `status`;
  the glissando, silence and noise rows print "—" for it, as they already
  do for `cents err max`.
- The header comment (first 900 chars, what
  `tests/listening/scenarios/tuner-harness.test.ts` slices and checks) now
  cites `practice.tuner/REQ-002/S9` alongside every citation already
  there — verified all eight IDs are still within the first 900 JS-string
  characters (`header.length === 900`, every `.includes(id)` true).

TDD: RED first — added `practice.tuner/REQ-002/S9` to the citation list in
`tests/listening/scenarios/tuner-harness.test.ts` and ran it; it failed
because the header didn't cite S9 yet (AssertionError, expected string
`practice.tuner/REQ-002/S9` not found). Then added the citation to the
script's header comment; the test passed. The column/gate itself is a
measured requirement (Article V) with no unit-test surface beyond that
citation check — its correctness is proven by running the harness itself,
as every other gated column in this script already is.

VERIFY:

1. `APP_URL=https://localhost:5173 pnpm test:tuner` (against the already-running `dev:phone` server):

```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     95.10                   63.98                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     77.40                   63.98                 13.35               92.86           0.65           1              PASS
hand-over glissando  1      69.10                   63.98                 8.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 95.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout F♯6 77.40 ms · arrival age F♯6 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

2. `pnpm vitest run tests/listening/scenarios/tuner-harness.test.ts`:

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  22:21:55
   Duration  349ms (environment 90%, transform 5%, import 3%, worker 1%, tests 1%)
```

3. `./scripts/check-scenarios.sh --change changes/007-hear-me | grep "practice.tuner/REQ-002"`:

```
  ✅ practice.tuner/REQ-002/S1 tested
  ✅ practice.tuner/REQ-002/S2 tested
  ✅ practice.tuner/REQ-002/S3 tested
  ✅ practice.tuner/REQ-002/S4 tested
  ✅ practice.tuner/REQ-002/S5 tested
  ✅ practice.tuner/REQ-002/S6 tested
  ✅ practice.tuner/REQ-002/S7 tested
  ✅ practice.tuner/REQ-002/S8 tested
  ✅ practice.tuner/REQ-002/S9 tested
```

4. `bash -c "source ~/.cargo/env && pnpm check"` — exit 0:

```
 Test Files  75 passed (75)
      Tests  314 passed (314)
   Start at  22:22:39
   Duration  10.07s (tests 50%, environment 34%, import 10%, transform 7%)

running 13 tests
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.19s

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s
```

CHECK: (pnpm check, as above) exit 0, 75 files / 314 tests, both Rust
crates' `cargo test` green (listening: 13 passed/1 ignored;
sound: 24 passed/1 ignored).

CONCERNS:
- The gate passed comfortably on the laptop (worst shown error 1 ¢ against
  a ±2 ¢ budget, on the flute-like sweep at A♯6) — no widening or workaround
  was needed, so there is nothing to flag as a finding.
- AGENTS.md's `pnpm check` example block still shows the placeholder
  `Start at`/`Duration` timestamps from the prior documented run; the brief
  asked only for the `Test Files`/`Tests` counts to be updated to my own
  run's numbers, which I did (75/314) — I left the timestamp line
  untouched, consistent with that scoping.
- `changes/007-hear-me/tasks.md` shows as modified in `git status` (its
  T027 `Status:` line was already flipped from `todo` to `in-progress`
  before I started, per the conversation's initial git-status snapshot); I
  did not touch this file, and per the brief's Files list and "do not
  edit anything under changes/ other than appending to notes.md"
  instruction, I left it as I found it.
- Per this task's explicit instruction ("Do not commit"), nothing was
  committed — this overrides the general SDD procedure's step 6, which the
  brief's own instructions take precedence over.

<!-- recorded 2026-09-28T21:29:25Z by scripts/record.sh -->
