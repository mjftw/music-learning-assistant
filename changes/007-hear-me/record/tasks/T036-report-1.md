---
type: Implementation Report
title: T036 — implementation report
resource: /.sdd/reports/007-hear-me/T036.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T036.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T21:35:00Z
sdd_id: 007-hear-me
---

TASK: T036
STATUS: DONE
COMMIT: none (controller commits — instructed not to commit)
FILES:
scripts/tuner-timing-test.mjs

Two edits, as the brief's two steps specify (no test citation file change —
the header didn't need one; no new scenario ID is introduced, this is a
harness robustness fix from converge W4):

1. `measureTone` — added `centsErrReadings` and `shownErrReadings` counters,
   each incremented inside the same `if` block that already updates
   `maxCentsErr` / `maxShownCentsErr` (so a counter counts every reading the
   gate actually saw, not just the ones that set a new worst value); both
   returned in the tone's result object.
2. `sweepRow` — added `everyToneRead` (every tone's both counters > 0) to
   `passed`; when it fails, a new `noReadingLine` (printed under the table
   alongside the existing `worstLine`) names exactly which tone(s) and
   which gate (`cents err <note>` / `shown err <note>`) took no qualifying
   reading, instead of leaving the reader to infer it from the generic FAIL
   message.

Step 3 — ran `APP_URL=https://localhost:5173 pnpm test:tuner` against the
already-running `pnpm dev:phone` server (did not stop or restart it).

Two early runs FAILed with `no qualifying reading` for the sine sweep's
first tone(s) (E2, sometimes F2 too) and, on the second run, additionally
missed the first-readout/readings-per-second budgets on the flute sweep.
`uptime` showed load average 14.9–20.3 on this 22-core box at the time
(dozens of `vitest` worker processes at 90–250% CPU each, from what
`git status` confirms is a concurrent session editing
`src/ui/TunerLevel.tsx`, `src/ui/TunerStave.tsx` and related tuner files in
this same checkout while I worked) — real-time audio-thread scheduling
starved under that contention, which is exactly what the new gate is
designed to catch, but it isn't a defect in this change: I didn't touch any
app code, only the harness's own counting/printing. I monitored load back
down to ~1.8 over the next few minutes and re-ran; it passed cleanly, no
`no qualifying reading` line, every column inside budget. I'm reporting
DONE rather than DONE_WITH_CONCERNS because I traced the failures to
environmental contention I can point to directly (load average, and the
fact that they vanished once it cleared), not to the code — but I'm noting
both failing runs below for the record, since the brief's instruction is to
paste a failure rather than paper over it, and this is adjacent to that
spirit even though it resolved.

Failing run 1 (load average ~19–20 at the time):
```
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     Infinity                Infinity              157.35              0.00            0.09           0              FAIL
flute-like E2–C7     57     83.60                   66.65                 37.35               92.86           0.65           1              PASS
hand-over glissando  1      71.30                   63.98                 18.69               93.57           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 n/a ms · arrival age E2 n/a ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  no qualifying reading: cents err E2, cents err F2, shown err E2, shown err F2
  worst: first readout A♯4 83.60 ms · arrival age C4 66.65 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
```

Final, clean run (load average ~1.8):
```
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     84.90                   63.98                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     70.80                   63.98                 13.35               92.86           0.65           1              PASS
hand-over glissando  1      56.80                   61.31                 0.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 84.90 ms · arrival age B5 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout E2 70.80 ms · arrival age E2 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

Every tone in both sweeps has non-zero `centsErrReadings` and
`shownErrReadings` in this run (no `no qualifying reading` line printed),
which is the counters doing their job.

VERIFY:
```
$ APP_URL=https://localhost:5173 pnpm test:tuner
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     84.90                   63.98                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     70.80                   63.98                 13.35               92.86           0.65           1              PASS
hand-over glissando  1      56.80                   61.31                 0.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 84.90 ms · arrival age B5 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout E2 70.80 ms · arrival age E2 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

CHECK:
```
$ pnpm check
...
 Test Files  77 passed (77)
      Tests  345 passed (345)
   Start at  21:33:44
   Duration  11.27s (tests 53%, environment 31%, import 9%, transform 6%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.17s   (listening)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s   (sound)
   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```
exit code 0. Also ran the narrower citation test directly:
`pnpm vitest run tests/listening/scenarios/tuner-harness.test.ts` — 1 file,
1 test, passed (its header assertions are unaffected by this change; no new
scenario ID needed citing since T036 adds no scenario, it hardens an
existing gate).

An earlier `pnpm check` run (also under the ~15–20 load average noted
above) reported 7 failed files / 11 tests, all `Error: Test timed out in
5000ms` in files I never touched (`settings.test.tsx`, `stave-view.test.tsx`,
`target-sheet.test.tsx`) while other, unrelated files were mid-edit by a
concurrent session in this same checkout (`git status` showed
`src/practice/published/note-judged.schema.ts`, `src/ui/TargetSheet.tsx`,
etc. modified — none of which I touched, listed as modified before I ran
anything). Re-run once that session's own test run had finished and load
had dropped: clean, as pasted above.

CONCERNS:
Two things worth flagging, neither in `scripts/tuner-timing-test.mjs` itself:
1. This machine had a concurrent session actively editing tuner UI files
   (`src/ui/TunerLevel.tsx`, `src/ui/TunerStave.tsx`, `src/ui/TargetSheet.tsx`,
   `src/practice/published/note-judged.schema.ts`, and several
   `tests/ui/scenarios/tuner-*` / `tests/practice/scenarios/tuner-*` files)
   in this same working directory while I worked. I never read their diffs
   beyond `git diff --stat` (to rule out them explaining my failures) and
   never touched them, per the brief's file scope — flagging so the
   controller can check nothing of theirs collided with mine.
2. The heavy CPU contention that caused two intermediate FAILs (one of them
   a genuine `no qualifying reading` — the exact condition T036 exists to
   catch) came from that same concurrent session's own `pnpm check` /
   `cargo test` run, not from anything in this change. Worth the controller
   knowing that `pnpm test:tuner` is sensitive to machine load at the level
   this repo's own precedent already documents for `pnpm test:timing`
   ("the timing flake matches precedent", a6bac04) — this harness shares
   that sensitivity, now made more visible by the new gate rather than
   masked by it.

<!-- recorded 2026-09-29T20:41:06Z by scripts/record.sh -->
