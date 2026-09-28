---
type: Implementation Report
title: T015 — implementation report
resource: /.sdd/reports/007-hear-me/T015.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T015.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T11:10:22Z
sdd_id: 007-hear-me
---

TASK: T015
STATUS: DONE
COMMIT: none (brief said not to commit)
FILES:
src/ui/TunerLevel.tsx (new)
src/ui/TunerScreen.tsx (mount it in the level area; new `spelling` prop)
src/ui/App.tsx (passes `selection.spelling` to `TunerScreen`)
tests/ui/scenarios/tuner-screen.test.tsx (append — `enterAndHear` helper + 3 scenarios)

VERIFY:

RED (step 2), before `TunerLevel` existed — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx`:

```
 ❯ getElementError node_modules/.../query-helpers.js:20:35
 ❯ tests/ui/scenarios/tuner-screen.test.tsx:106:17
    104|   expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
       |                 ^
TestingLibraryElementError: Unable to find an element by: [data-testid="tuner-name"]

 Test Files  1 failed (1)
      Tests  3 failed | 2 passed (5)
```

Failed for the stated reason (step 2's predicted message, verbatim — the
other two new tests failed downstream of the same missing element, then on
`tuner-empty` once REQ-002/S1 was fixed). GREEN, after `TunerLevel` and the
`TunerScreen`/`App` wiring — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx`:

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  12:08:19
   Duration  1.68s (tests 56%, transform 17%, environment 15%, import 11%)
```

`pnpm vitest run tests/ui` (full UI suite):

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  22 passed (22)
      Tests  100 passed (100)
   Start at  12:08:23
   Duration  5.90s (tests 46%, environment 26%, transform 14%, import 13%)
```

Screenshot step (`python3 scripts/design_snapshot.py` skipped — no Python
Playwright, per the brief's override; reused T014's Node-Playwright
approach): started `pnpm dev -- --port 5174` (`dev:phone` was already
holding :5173 and was left untouched — confirmed running and answering
before and after), wrote a throwaway script into the repo root (so Node
could resolve the workspace's `playwright`), launched Chromium with
`--use-fake-ui-for-media-stream`/`--use-fake-device-for-media-stream`,
390×844 @2x, opened the app, clicked Tuner, waited for "LISTENING", and
screenshotted (nothing is fed to the fake mic, so this is REQ-003/S1's
silent state — `python3 …/design_snapshot.py`'s `tuner--listening.png`
target wasn't reachable without a driven tone, matching T014's own note
that the silent structure is what's checkable now). Saved to
`.sdd/design/007-hear-me/live/tuner--silent.png`, then deleted the script
and stopped the :5174 dev server (`dev:phone` on :5173 confirmed still
answering afterwards).

Viewed the screenshot: the ±50 ¢ rule is drawn full-height with ticks every
5 ¢, +50/+25/+10 and −10/−25/−50 labelled at the left edge and mirrored on
the right; the ±5 ¢ band is shaded pale green through the centre; "↑
sharp" (warm) top-left and "↓ flat" (cool) bottom-left; "halfway to" is
present at both the top-right and bottom-right (blank note text, since
nothing is pinned or heard); "Play a note" is centred where the big name
would be. This matches `design/Tuner.dc.html` frame #4a's level-area
structure (rule, band, ticks, "↑ sharp"/"↓ flat", "halfway to", the empty
name placeholder).

CHECK (last lines of `bash -c "source ~/.cargo/env && pnpm check"`, exit 0):

```
 Test Files  70 passed (70)
      Tests  286 passed (286)
   Start at  12:08:41
   Duration  9.32s (tests 46%, environment 36%, import 10%, transform 7%)
...
running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.64s

running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
prettier / eslint / tsc all passed with no output before this (the `&&`
chain would have short-circuited on any non-zero exit before reaching the
vitest/cargo summaries above); cargo fmt/clippy likewise silent-and-green.

CONCERNS:
- The brief's step-1 test code (verbatim from tasks.md) used `getByText("halfway
  to")` singular. Both edges of the rule legitimately render that phrase
  (REQ-002/S1's own prose: "'halfway to A♯4' above and 'halfway to G♯4'
  below"), so a singular query throws "found multiple elements" regardless
  of jest-dom. I changed it to `getAllByText("halfway to")` and asserted
  `.length === 2`, keeping the note-text assertions (`A♯4`, `G♯4`)
  unchanged. Everything else in the three new tests is the brief's
  assertions verbatim, rewritten from `toHaveTextContent`/`toBeInTheDocument`
  to `.textContent`/`toBeTruthy()`/`queryBy…().toBeNull()` per the "no
  jest-dom" note (confirmed: no `@testing-library/jest-dom` dependency, no
  vitest `setupFiles`, and no existing test in the repo uses those
  matchers).
- Beyond the three RED-step scenarios, the Produces section describes the
  full reading (the ±50 ¢-and-beyond pinned-target case: line pinned at
  the edge, tag "▲ N st"/"▼ N st", the "playing …" caption) and the
  REQ-003/S2 "target pinned but silent" case (greyed name + "Play a note"
  beneath). I implemented both per the cited REQ-002/REQ-004/REQ-003
  scenarios' prose (not per T015's own tests, which don't reach a pinned
  target — that lands with T017's target-row task), since the task's own
  step 3 says "GREEN — TunerLevel per Produces" and the interface text
  describes them. Two judgement calls worth flagging since untested here:
  (a) in the beyond-±50 case I render only the "▲ N st"/"▼ N st" text in
  the tag's cents slot with no separate "sharp"/"flat" word beside it —
  the vendored prototype's script always renders a trailing word div too,
  but REQ-004/S3 quotes the tag as reading exactly "▲ 3 st" with nothing
  appended, and the brief's Produces prose lists "▲ 3 st"/"▼ N st" as the
  tag's content with no mention of a trailing word, so I followed the
  spec/brief over the prototype markup (which is "never a source"); (b)
  the "playing …" caption's exact condition is "pinned and the heard
  note's nearest differs from the target" (matches REQ-004/S1's "the
  reading is still +20 sharp" with no caption while on-target, then
  "'playing A♯4' is captioned" once it drifts) rather than merely "pinned"
  as the Produces summary's parenthetical shorthand ("pinned only") reads
  in isolation — I judged the fuller rule, matching the cited scenario's
  actual behaviour, to be correct. Both will get their first real test
  coverage in T017.
- Used `pitchClassLabel` (theory/published) for the big name's letter+
  accidental piece, alongside the three functions the Interfaces section
  names explicitly (`noteLabel`, `noteAtPosition`, `pitchPosition`) — the
  brief's own "Things the brief cannot know" note directs this ("the big
  name shows the pitch class … and the octave separately … use the
  pitch-class label + note.octave"), so it's expected, not an addition
  beyond the interface.
- Tick geometry: the vendored script treats cents = 0 as a "labelled"-width
  tick (drawn wider/taller, just with no text, since the separate centre
  hairline already marks it) purely for line-thickness purposes. The
  brief's Produces text describes only "labelled 10/25/50: 16 px wide,
  2 px; others 8 px, 1.5 px", so I treated 0 as "other" (8 px/1.5 px) —
  it sits directly under the always-drawn 2 px centre hairline either way,
  so this is not visually distinguishable in practice; flagging the minor
  divergence from the prototype script for completeness.

<!-- recorded 2026-09-28T11:17:22Z by scripts/record.sh -->
