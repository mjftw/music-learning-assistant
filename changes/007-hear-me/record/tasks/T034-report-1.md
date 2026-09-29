---
type: Implementation Report
title: T034 — implementation report
resource: /.sdd/reports/007-hear-me/T034.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T034.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T20:18:24Z
sdd_id: 007-hear-me
---

TASK: T034
STATUS: DONE
COMMIT: none (brief said not to commit)
FILES:
src/ui/TunerLevel.tsx
tests/ui/scenarios/target-sheet.test.tsx
tests/ui/scenarios/tuner-layout.test.tsx

## What changed

`readingGeometry` in `src/ui/TunerLevel.tsx` now implements the design's
own `over` rule (`changes/007-hear-me/design/Tuner.dc.html:1292`) instead
of always applying the non-clamped, non-over placement:

- Past ±50 ¢ pinned (`over`), the tag sits on the *opposite* side of the
  line from the normal rule: sharp-over below it (`lineTop +
  TAG_ABOVE_OFFSET`, 36 — same magnitude as today's above-offset, other
  side), flat-over above it (`lineTop - TAG_OVER_ABOVE_OFFSET`, a new
  constant, 58).
- Not over, the normal rule's placement is now additionally clamped within
  the level's own height: `Math.max(ratio·30, Math.min(areaHeight −
  ratio·62, tagTop))`, where `ratio = areaHeight / AREA_HEIGHT` — the same
  pattern `levelGeometryFor` already uses to scale every other measurement.
  Two named constants, `TAG_CLAMP_TOP_MARGIN` (30) and
  `TAG_CLAMP_BOTTOM_MARGIN` (62), stand in for the design's fixed 30/62 at
  536 px.

## Decision — threading `areaHeight` through

I added `areaHeight` as an **explicit fourth parameter** to
`readingGeometry` (between `areaMid` and `pxPerCent`), rather than deriving
it as `2 * areaMid` inside the function. `levelGeometryFor` already
carries `areaHeight` on its returned `LevelGeometry`, so the call site
(`readingGeometry(effectiveReading, levelGeometry.areaMid,
levelGeometry.areaHeight, levelGeometry.pxPerCent)`) is a one-line change
with no new derivation, and the function no longer silently depends on an
invariant (`areaMid === areaHeight / 2`) that happens to hold today but
isn't `readingGeometry`'s own to assume.

I also **exported** `readingGeometry` (it was module-private before), for
the same reason `levelGeometryFor` already is: jsdom does no layout, so a
rendered `TunerLevel` never measures anything but the 536 px fallback —
the only way to exercise the clamp margins' `ratio` scaling at a height
other than 536 is to call the pure function directly with an arbitrary
`areaHeight`, the same pattern `tuner-layout.test.tsx` already uses for
`levelGeometryFor`. This wasn't spelled out in the brief's Files list, but
it's the same, already-established precedent, not a new abstraction.

## Tests

Two files, following where each half of this behaviour's existing tests
already lived (the brief's "wherever the level's existing pixel-placement
tests live" — `tuner-screen.test.tsx` turned out not to be the closer
match for either half):

**`tests/ui/scenarios/target-sheet.test.tsx`** (integration, through the
rendered `<App>`, no jest-dom — `.style.top`/`.textContent`, matching this
file's own existing pattern for `REQ-004/S1`'s pinned-target assertions):
- Extended `REQ-004/S1 — Hold` with the tag's own `style.top` assertion
  (`"45.5px"`, sharp-over — RED before the fix at `"-26.5px"`, off the top
  of the level).
- New: `practice.tuner/REQ-004 — a pinned target flat past −50 ¢: the tag
  sits above the line, clear of the header (converge W2)` — pins A4, feeds
  426.5 Hz (−54 ¢ from A4), asserts `"▼ 1 st"`, the line pinned at
  `"519.5px"`, and the tag at `"461.5px"` (above the line).

**`tests/ui/scenarios/tuner-layout.test.tsx`** (pure-function, alongside
`levelGeometryFor`'s own tests, the same file/pattern T032 established for
this exact reason):
- `REQ-004 — past +50 ¢ pinned, the tag sits below the line...` and the
  mirror `−50 ¢` case, at `areaHeight = 536`.
- `REQ-002 — a non-over reading's tag keeps today's placement` (+20 ¢ →
  `126.5px`, exactly today's value) — the brief's step 3 ("existing level
  tests at non-over readings must pass untouched") made concrete as its own
  assertion, not just relied on implicitly.
- `REQ-002 — the non-over tag's clamp margins scale with the level's own
  height, not fixed pixels` — at `areaHeight = 300` (the level's own
  minimum), a −50 ¢ reading's raw tag position (297.22) would pass through
  an *unscaled* 536-62=474 margin untouched, but is pulled up to ≈265.3 by
  the height-scaled margin (`300 − 0.56·62`) — proving the ratio scaling
  actually does something, not just that a number changed.

All six new/extended assertions were run RED first (`readingGeometry is
not a function` for the four pure-function tests before the export;
`"-26.5px"` / `"527.5px"` instead of the fixed values for the two
integration ones) and GREEN after the fix, in that order.

## Measurement (Playwright/Chromium, `https://localhost:5173`, headless,
feeding the microphone from the page's own AudioContext, the same
technique `scripts/tuner-timing-test.mjs`'s `installMicrophoneOverride`
uses — not `--use-file-for-fake-audio-capture`)

Script: `/tmp/claude-1000/-home-merlin-projects-music-learning-assistant/1770e9fb-e3e5-44c8-92c8-c6c90b7142e6/scratchpad/t034-measure.mjs`
(throwaway, not committed). For each of 360×660, 360×780, 390×844: enters
the tuner, pins the target to G4 (sharp-over) then B4 (flat-over) in turn,
feeds a 440 Hz sine (≈+200/−200 ¢ from each, well past ±50 ¢), waits for
the tag to read "... st", and compares its `getBoundingClientRect()`
against the header row's (`[data-testid="mic-indicator"]`'s parent).

```
viewport      case         tag          tagTop  tagBottom  headerTop  headerBottom  overlap
360x660       sharp-over   ▲ 2 st        88.0      121.0        0.0          47.0  false
360x660       flat-over    ▼ 2 st       329.2      362.2        0.0          47.0  false
360x780       sharp-over   ▲ 2 st        90.9      123.9        0.0          47.0  false
360x780       flat-over    ▼ 2 st       446.3      479.3        0.0          47.0  false
390x844       sharp-over   ▲ 2 st        92.5      125.5        0.0          47.0  false
390x844       flat-over    ▼ 2 st       508.7      541.7        0.0          47.0  false
t034-measure: PASS — the tag never overlaps the header row, either direction, at all three viewports
```

(The script's own console output truncated the "playing A4" caption prefix
above for width; the raw `tag` text was e.g. `"playing A4▲ 2 st"`.) No
page errors at any viewport. The dev server already running on 5173 (for
the user's phone) was used as-is — not stopped, not restarted, no second
instance started.

## VERIFY

1. Targeted test files:

```
pnpm vitest run tests/ui/scenarios/target-sheet.test.tsx tests/ui/scenarios/tuner-layout.test.tsx

 Test Files  2 passed (2)
      Tests  18 passed (18)
```

2. `pnpm vitest run tests/ui`:

First run showed one unrelated failure —
`tests/ui/scenarios/tuner-stave.test.tsx > ...converge round 1, W1` — in a
file I never touched (`git status --porcelain` at the time showed
`src/ui/TunerStave.tsx` and `tests/ui/scenarios/tuner-stave.test.tsx` mid-edit
by a concurrent agent, the W1/I6 task the brief warned about; `TargetSheet.tsx`,
`note-judged.schema.ts`, `tuner-timing-test.mjs`, `tuner-budget.test.ts` and
`tuner-reading.test.ts` were also mid-edit). That task landed a few minutes
later and the file now passes on its own (`tests/ui/scenarios/tuner-stave.test.tsx`:
`Test Files 1 passed (1)`, `Tests 11 passed (11)`). Full re-run, clean:

```
 Test Files  77 passed (77)
      Tests  345 passed (345)
```

(this is the whole suite via `pnpm check`'s vitest step, below — `tests/ui`
alone is a subset of the same green run.)

3. `./scripts/check-scenarios.sh --change changes/007-hear-me | grep -c "❌"`:

```
0
```

4. `bash -c "source ~/.cargo/env && pnpm check"` — green, once the
   concurrent task above had landed:

```
 Test Files  77 passed (77)
      Tests  345 passed (345)
```

   (Full breakdown: prettier clean, eslint clean, tsc clean, vitest
   77/345 green as above, `cargo fmt --check` clean, `cargo clippy
   --all-targets -D warnings` clean, `cargo test` — `listening` 13
   passed/1 ignored, `sound` 24 passed/1 ignored, both 0 failed.)

5. Measurement table above — no overlap at any of the three viewports, in
   either direction.

## CONCERNS

- While I was working, a concurrent agent's task (W1/I6, `src/ui/TunerStave.tsx`
  and its test) was mid-edit and briefly left `tests/ui` (and so `pnpm
  check`) red for a reason unrelated to my change — confirmed by `git
  status --porcelain` showing those files modified by someone else, not in
  my diff. I did not touch, revert, or attempt to fix the other agent's
  file, per the brief's own note about this and the "only touch files in
  the brief's Files list" rule. It landed cleanly a few minutes later and
  every command above is now green in a single, final run — noting this
  only so the transient red isn't mistaken for something I introduced.
- No other concerns — the geometry change is a direct, verbatim port of
  the design reference's own `over`/clamp rule, scaled by the same `ratio`
  pattern already established by T032's `levelGeometryFor`.

<!-- recorded 2026-09-29T20:40:12Z by scripts/record.sh -->
