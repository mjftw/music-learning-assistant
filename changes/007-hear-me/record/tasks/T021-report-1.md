---
type: Implementation Report
title: T021 — implementation report
resource: /.sdd/reports/007-hear-me/T021.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T021.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T14:40:26Z
sdd_id: 007-hear-me
---

TASK: T021
STATUS: DONE_WITH_CONCERNS
COMMIT: 6839822
FILES:
scripts/tuner-timing-test.mjs
tests/listening/scenarios/tuner-harness.test.ts
package.json
src/ui/main.tsx
changes/007-hear-me/notes.md (uncommitted, per the brief's own "Do not commit")

VERIFY:
`pnpm vitest run tests/listening/scenarios/tuner-harness.test.ts` — the citation test:
```
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

`APP_URL=https://localhost:5173 pnpm test:tuner` (against the already-running
`dev:phone` HTTPS server, as the brief directs) — final, authoritative run,
after fixing two harness-only bugs found along the way (below):

```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
sine E2–C7           57     83.20                   62.65                 10.69               92.86           0.09           PASS
flute-like E2–C7     57     41.20                   51.98                 8.02                92.86           0.65           PASS
hand-over glissando  1      24.30                   30.65                 10.69               93.81           —              FAIL
silence              —      —                       —                     —                   0.00            —              PASS
white noise          —      —                       —                     —                   0.00            —              PASS
test:tuner: FAIL — first readout exceeded 100 ms, arrival age exceeded 100 ms, readings/s fell below 20, |cents error| exceeded 2, the hand-over crossing missed 56 ¢ or changed more than once, or a reading appeared during silence or noise — see the table above
```

CHECK:
`pnpm check` (last ~15 lines, full run including cargo fmt/clippy/test):
```
 Test Files  73 passed (73)
      Tests  306 passed (306)
...
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
`pnpm check` exited 0 — prettier, eslint, tsc, vitest (73 files/306 tests),
cargo fmt/clippy/test all green.

CONCERNS:
- The hand-over row fails, by a narrow, reproducible margin, and I did not
  loosen the gate or touch product code to force a pass (not authorised —
  the brief's only authorised code change, shrinking WINDOW in
  detector.rs, is scoped to a first-readout failure, and first readout
  passes cleanly here). Traced to source: `centsFrom`
  (`src/practice/domain/tuner.ts`) rounds to the whole cent
  (`Math.round(1200·log2(hz/pitchHzOf(note)))`) *before*
  `nearestWithHandover` compares it against `HANDOVER_CENTS` (`Math.abs(
  ...) >= 56`) — so the product hands over as soon as the *rounded* offset
  reaches 56, which a raw offset as low as 55.5 already satisfies. The
  harness measures the raw, unrounded formula the brief gives verbatim
  (`1200·log2(hz/440) ≥ 56`) and gets ~55.5 ¢ at the crossing, run to run
  within 55.5–55.7 ¢. This reads as a genuine, if hairline, product
  characteristic consistent with REQ-002's own "to the whole cent"/"±50
  clamp" language, not a harness defect — but it does mean the row cannot
  pass as specified without either loosening the harness (not done) or
  tightening the product's hysteresis comparison to the raw value (out of
  this task's Files list and not something T021 is authorised to change).
  Flagging for the controller to decide.
- Two harness-only bugs were found and fixed while getting a clean
  measurement (both in scripts/tuner-timing-test.mjs, not the product):
  (1) the hand-over case was seeding its "last shown target" baseline from
  a trailing NoteJudged still arriving from the *previous* case (in its
  own `prerollSeconds` gap before the glissando's own onset), which
  miscounted the glissando's own first real reading as a spurious second
  "change"; fixed by ignoring any NoteJudged before the glissando's own
  onset when tracking changes. (2) the silence case started counting
  immediately after the hand-over case's oscillator stopped, with no
  settle gap — unlike every other case, which gets `prerollSeconds` of
  quiet before its own measurement starts — so it caught the hand-over
  tone's own trailing (still-in-flight) NoteJudged; fixed by giving
  silence the same `prerollSeconds` settle. Both are documented inline in
  the script and in notes.md; I mention them here because they explain
  why an earlier, dirtier full run showed additional (spurious) failures
  in the cents-error and silence columns that the fixed, final run does
  not reproduce.
- The very first full run I made (before either fix, and apparently under
  transient extra system load — this is a shared dev machine) showed
  first-readout as high as 180–256 ms and readings/s as low as 0. Neither
  reproduced in three later clean runs (isolated flute sweep, sine-then-
  flute, and the final full run pasted above), so I attribute that first
  run to load/GC contention on this machine rather than a real product or
  harness defect; I did not chase it further since it did not recur.
  Worth knowing if `pnpm test:tuner` is ever flaky in CI-like conditions.
- `changes/007-hear-me/notes.md` was updated (the T021 section, with the
  table above and the same explanation as here) but left **uncommitted**,
  per the brief's own instruction ("Paste the passing table into
  notes.md... Do not commit."). Since the table is not, in fact, fully
  passing, I pasted the real, measured table rather than inventing a
  passing one, with the same root-cause note as above.
- `main.tsx`'s new `window.__noteJudged` hook is a second, harness-only
  dev subscription beside `__session` (not routed through
  `__session.onNoteJudged`), per the brief's own wording ("window.
  __noteJudged(listener) — subscribes to session.onNoteJudged, beside
  __session"); flagging only because it is a second way to reach the same
  event stream, in case that duplication is unwanted.

<!-- recorded 2026-09-28T15:01:39Z by scripts/record.sh -->
