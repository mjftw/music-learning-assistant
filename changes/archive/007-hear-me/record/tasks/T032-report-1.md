---
type: Implementation Report
title: T032 — implementation report
resource: /.sdd/reports/007-hear-me/T032.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T032.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T18:45:00Z
sdd_id: 007-hear-me
---

TASK: T032
STATUS: DONE
COMMIT: 1914370e2cc8e142a434fa8fb30689ee2036552b
FILES:
src/ui/App.tsx
src/ui/TunerLevel.tsx
src/ui/TunerScreen.tsx
src/ui/TunerStave.tsx
src/ui/main.tsx
src/ui/use-measured-size.ts
tests/ui/scenarios/tuner-fit-variants.test.tsx (deleted)
tests/ui/scenarios/tuner-layout.test.tsx (new)

## What changed

The design round 5 exploration (the `?fit=a|b` switch, the `fit` prop
threaded through `App`/`TunerScreen`/`TunerLevel`, the `"fixed"` and
`"flex-compact"` treatments) is gone. `fit="flex"` — the level's geometry
following its own measured height via `levelGeometryFor`, falling back to
536px when unmeasured (jsdom, and the first paint), with a 300px minimum
below which the page scrolls — is now the tuner screen's one and only
layout, unconditionally. The screen and the column that wraps it
(`src/ui/App.tsx`) carry the `visible-height` class while the tuner shows;
every other screen keeps the column's inline `minHeight: COLUMN_MIN_HEIGHT`
exactly as before. `src/ui/main.tsx` now has no `URLSearchParams` read at
all (verified: `git diff 58fd471 -- src/ui/main.tsx` is empty). Every
comment containing `design-loop variant (007 round 5)` is gone, replaced
where the WHY wasn't obvious with a short comment describing the rule
itself. `use-measured-size.ts` and the stave card's own measured-width fit
(`TunerStave.tsx`) are kept, unconditional, as the brief asked — only their
one round-5 comment marker was shortened.

## Decisions

**The "Can't hear" card.** The old fixed `CARD_TOP = 440` never survived
the level flexing (at 360×660 it would land inside the target-pill/stave
area, not the level). I wrapped `<TunerLevel>` in a `position: relative,
flex: 1` sibling wrapper inside `TunerScreen` and moved the card inside
that wrapper, centred over the level's own rendered box (`top: "50%"`,
`transform: "translateY(-50%)"`, `left/right: CARD_SIDE` — the same 16px
margins as everything else) instead of a fixed pixel offset. This is the
smallest change that keeps the card inside the screen at every height:
`top: 50%` on an absolutely positioned descendant is computed against its
nearest *positioned* ancestor's own box — here, the level's own wrapper —
so the card centres on the level however tall it is, never needs to know
the header's height, and (since the wrapper only wraps the level, not the
target pill/stave/footer) can't visually collide with them. Confirmed by
measurement and screenshot at 360×660, 360×780 and 390×844: the card is
wholly inside the screen, never covers the header, and the ‹ Practice
button stays reachable (`elementFromPoint` at its centre resolves to the
button) at all three.

**Bottom margin.** No change was needed: the footer already used fixed
`padding` (`14px 16px 20px`), not space computed from the viewport, so its
own bottom spacing was already independent of the level's height. Measured
directly: the footer text's bottom edge sits 27.4px above the viewport's
bottom edge at *both* 360×660 and 390×844 (identical), and the stave card's
own bottom edge sits 62.8px above the footer's own top at both sizes too —
nothing touches the bottom edge, and the spacing is unchanged from the
390×844 design height.

## Tests

`tests/ui/scenarios/tuner-fit-variants.test.tsx` is deleted.
`tests/ui/scenarios/tuner-layout.test.tsx` (new) carries the four
`practice.tuner/REQ-002 — ...` tests the brief asked for: the pure
`levelGeometryFor` shape at height 352 (the centre at 176, a +20¢ reading's
offset, the band's proportion) and at 536 (today's numbers, exactly); the
screen and the column both carrying `visible-height` with no inline
`minHeight` while the tuner shows (2 elements found); the practice screen's
column keeping its inline `minHeight: "100vh"` and no such class; and the
level's own `minHeight: "300px"`. No test asserts on internals — all four
go through `<App>`'s published render tree and DOM style values, per the
brief's "no jest-dom" convention.

Every existing test kept its own assertions unchanged (many assert pixel
positions on the level at the 536px fallback) and all pass.

## Measurement table (Playwright/Chromium, `https://localhost:5173/`, no
URL parameters, `ignoreHTTPSErrors: true`)

Three states × three viewports, `--use-fake-ui-for-media-stream
--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<a
440Hz wav>` for "listening" and "target-pinned" (mic permission granted); a
separate browser launched with none of those flags and no `permissions`
granted for "cannot-hear" (mirrors `scripts/design-shots.mjs`'s own
`tuner-cannot-hear` driver — the prompt is left denied). "target-pinned"
drives `window.__session.pinTarget(69)` (A4) after Target, as
`design-shots.mjs`'s own `tuner-target-pinned` state does.

```
state          viewport   scrollH  clientH  scrollW  clientW  levelH   errors
listening      360x660    660      660      360      360      352.20   none
listening      360x780    780      780      360      360      472.20   none
listening      390x844    844      844      390      390      536.20   none
cannot-hear    360x660    660      660      360      360      352.20   none
cannot-hear    360x780    780      780      360      360      472.20   none
cannot-hear    390x844    844      844      390      390      536.20   none
target-pinned  360x660    660      660      360      360      352.20   none
target-pinned  360x780    780      780      360      360      472.20   none
target-pinned  390x844    844      844      390      390      536.20   none
```

`scrollHeight === clientHeight` and `scrollWidth === clientWidth` at every
state/viewport — no scroll anywhere. No page or console errors anywhere.

"Can't hear" card, all three viewports (top/bottom/left/right in px, the
viewport in parentheses):

```
360x660: top=170.9 bottom=275.3 left=16.0 right=344.0 (360x660) — inside=true, overlapsHeader=false, ‹Practice reachable=true
360x780: top=230.9 bottom=335.3 left=16.0 right=344.0 (360x780) — inside=true, overlapsHeader=false, ‹Practice reachable=true
390x844: top=272.0 bottom=358.2 left=16.0 right=374.0 (390x844) — inside=true, overlapsHeader=false, ‹Practice reachable=true
```

Bottom margin (footer text's own bottom edge, and the stave card's bottom
edge relative to the footer's own top):

```
360x660: footer text bottom gap = 27.4px; stave-card-to-footer gap = 62.8px
390x844: footer text bottom gap = 27.4px; stave-card-to-footer gap = 62.8px
```

Identical at both sizes — the bottom spacing carries over from 390×844 to
360×660 unchanged.

Practice screen (unaffected by this task — App's practice branch was not
touched beyond a variable rename):

```
practice-360x660: scrollH=823 clientH=660 colClassName="" colInlineMinHeight="100vh" colComputedMinHeight="660px"
```

`scrollHeight` (823) > `clientHeight` (660) — the practice screen still
scrolls exactly as it always has (its content, the circle etc., is taller
than the viewport); the column has no `visible-height` class and keeps its
own inline `minHeight: "100vh"`.

## Screenshots — what I saw

Saved under the scratchpad as `rule-<state>-<width>x<height>.png` (9 files)
plus the bottom-margin/practice-screen scripts' own console output; I read
the three 360×660 screenshots (`listening`, `cannot-hear`, `target-pinned`)
plus the 360×780 and 390×844 `cannot-hear` ones before writing this report.

- **listening, 360×660** — header (‹ Practice, LISTENING), the shrunk level
  (every label — ±50/±25/±10 ticks, "sharp"/"flat", both "halfway to"
  captions — legible, nothing overlapping), the target pill, the stave
  strip card (clef, note head on A4's line, dashed guide, "0" cents, "HEARD
  440.0 Hz"/"A4 IS 440.0 Hz"), and the footer (the A4=440Hz text and the
  ♯/♭ toggle) all visible with clear bottom spacing. Nothing cut off.
- **cannot-hear, 360×660 / 360×780 / 390×844** — the card sits centred over
  the level's own box, comfortably inside the screen at every height,
  never touching or covering the header row, the ‹ Practice button fully
  clear above it. The level, target pill (auto · nearest), stave strip
  (empty, "—"/"— IS —") and footer are all still drawn underneath/around
  it exactly as REQ-007/S1 asks.
- **target-pinned, 360×660** — the target pill reads "− TARGET A4 +  ✕",
  the level shows the same reading as "listening" (0, in tune), and the
  stave strip shows the heard head at A4 alongside the grey target head at
  A4 to its right, "HEARD 440.0 Hz"/"A4 IS 440.0 Hz". Nothing cut off or
  overlapping.

## VERIFY

1. `pnpm vitest run tests/ui`

```
 Test Files  26 passed (26)
      Tests  138 passed (138)
   Start at  19:39:45
   Duration  8.93s (tests 59%, environment 20%, import 11%, transform 10%)
```

2. `pnpm vitest run tests/practice tests/ui`

```
 Test Files  60 passed (60)
      Tests  276 passed (276)
   Start at  19:39:57
   Duration  13.04s (tests 56%, environment 28%, import 10%, transform 6%)
```

3. `grep -rn "design-loop variant" src tests` — no output (exit code 1,
   nothing matched).
   `grep -rn 'fit=\|"flex-compact"\|"fixed"\|URLSearchParams' src tests`:

```
src/theory/domain/scales.ts:45:  | { readonly kind: "fixed"; readonly degrees: readonly ScaleDegree[] }
src/theory/domain/scales.ts:75:  return { kind: "fixed", degrees };
src/theory/domain/scales.ts:433:  if (formula.kind === "fixed") return formula.degrees;
```

   These three are an unrelated `theory` scale-formula variant (a scale
   whose degrees are fixed vs. modal) — nothing to do with the tuner's
   layout switch; untouched by this task.

4. `git diff 58fd471 -- src/ui/main.tsx` — empty.

5. `./scripts/check-scenarios.sh --change changes/007-hear-me | grep -c "❌"`
   → `0`. `./scripts/check-contexts.sh` → `✅ context boundaries respected`.
   `./scripts/check-design.sh --change changes/007-hear-me`:

```
Design
  interface: yes · design.md approved v1.0.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 007-hear-me
✅ design checks clean
```

   `global.css` is untouched by this task (`git diff` against it is empty;
   last touched at commit d384253, before T032) — these 3 warnings predate
   me, as the design-round-5 report itself already noted.

6. `bash -c "source ~/.cargo/env && pnpm check"`:

```
 Test Files  77 passed (77)
      Tests  337 passed (337)
```

   (Full run: prettier clean, eslint clean, tsc clean, vitest 77/337 green
   as above, `cargo fmt --check` clean, `cargo clippy --all-targets -D
   warnings` clean, `cargo test` — `listening` 13 passed/1 ignored, `sound`
   24 passed/1 ignored, both 0 failed.)

## CONCERNS

- While I was working, `changes/007-hear-me/index.md`,
  `changes/007-hear-me/record/index.md` and a new
  `changes/007-hear-me/record/tasks/index.md` appeared modified/untracked
  in `git status` — I never touched anything under `changes/`; this is the
  concurrent task-review agent's own activity (the brief said another agent
  was reviewing T031 at the same time). I staged and committed only the 8
  files I actually changed (`git add` by explicit path, not `-A`); those
  three `changes/` paths are still unstaged/untracked in the working tree,
  untouched by my commit.
- The "Can't hear" card's new centred position is a genuine layout change
  from the un-shipped exploration (it was never exercised with a flexing
  level before this task, per the design-round-5 report's own CONCERNS) —
  I verified it by direct measurement and screenshot at all three required
  viewports rather than a unit test, since no existing test asserted on
  the card's position and the brief's Tests section didn't ask for one; the
  brief's own Verify step (browser measurement) is what gates this.


<!-- recorded 2026-09-29T19:06:04Z by scripts/record.sh -->
