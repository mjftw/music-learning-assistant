---
type: Implementation Report
title: T018 — implementation report
resource: /.sdd/reports/007-hear-me/T018.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T018.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T14:05:00Z
sdd_id: 007-hear-me
---

TASK: T018
STATUS: DONE
COMMIT: 9b252b0cf8cddff0eefd13fbbdca54b6edc72314
FILES:
src/ui/TunerScreen.tsx
src/ui/TunerLevel.tsx
src/ui/App.tsx
tests/ui/scenarios/tuner-screen.test.tsx
tests/ui/scenarios/selection-persistence.test.tsx

VERIFY:
`pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx tests/ui/scenarios/selection-persistence.test.tsx`

```
 Test Files  2 passed (2)
      Tests  14 passed (14)
   Start at  13:53:39
   Duration  2.40s (tests 67%, transform 14%, environment 11%, import 8%)
```

`pnpm vitest run tests/ui`

```
 Test Files  24 passed (24)
      Tests  116 passed (116)
   Start at  13:53:44
   Duration  6.55s (tests 53%, environment 23%, transform 12%, import 12%)
```

RED (before GREEN, both files, the four new scenarios — confirmed failing
for the right reason, `Unable to find an element` / `Unable to find role
"button" with name "flat"`, the `cannot-hear` testid and the footer's
toggle not existing yet):

```
 × practice.tuner/REQ-009/S1 — reopened: the practice screen, the flat spelling, the tuner on Auto 336ms
 × practice.tuner/REQ-007/S1 — refused 111ms
 × practice.tuner/REQ-007/S3 — failed while listening 103ms
 × practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference 277ms
 FAIL  tests/ui/scenarios/selection-persistence.test.tsx > practice.tuner/REQ-009/S1 — reopened: the practice screen, the flat spelling, the tuner on Auto
 FAIL  tests/ui/scenarios/tuner-screen.test.tsx > practice.tuner/REQ-007/S1 — refused
 FAIL  tests/ui/scenarios/tuner-screen.test.tsx > practice.tuner/REQ-007/S3 — failed while listening
 FAIL  tests/ui/scenarios/tuner-screen.test.tsx > practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference
 Test Files  2 failed (2)
      Tests  4 failed | 10 passed (14)
```
(REQ-007/S2 was green from the start — it only needs the mic-indicator's
existing LISTENING/NO MIC text, which T014/T015 already wired.)

CHECK:
`bash -c "source ~/.cargo/env && pnpm check"` (last ~15 lines):

```
 Test Files  72 passed (72)
      Tests  302 passed (302)
   Start at  13:53:xx

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running unittests src/lib.rs (target/debug/deps/listening-...)
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.63s
     Running unittests src/lib.rs (target/debug/deps/sound-...)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s
   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```

## Screenshot (design fidelity)

`dev:phone` was already holding :5173 (left alone, confirmed still
answering afterward). Started `bash -c "source ~/.cargo/env && pnpm dev --
port 5174"`. Node's Playwright has no Python counterpart installed here (as
T015-T017 found), so — per the brief's own note — wrote a throwaway
`shot-cannot-hear.mjs` at the repo root (workspace `playwright`
resolution), launched Chromium **without**
`--use-fake-ui-for-media-stream`/`--use-fake-device-for-media-stream` (the
flags the earlier tuner screenshots used to auto-grant a fake mic), at
390×844 @2×, navigated to `/`, clicked "Tuner". Headless Chromium's default
(no permission granted) denied the mic, driving `listening.start()` to
`ListeningUnavailable("refused")` and the session into `cannot-hear`.
Screenshotted to `.sdd/design/007-hear-me/live/tuner--cannot-hear.png`.

Read the screenshot and the underlying DOM: "NO MIC" in the header
(dimmed dot/ring), the card "Can't hear — no microphone" / "It was refused
or isn't there. Allow the microphone for this site, then go back and open
the tuner again." at the reference's own position (absolute, top 440, card
background/border), the footer "A4 = 440 Hz · in tune ±5 ¢" with the ♯/♭
segmented control, the level rule, band and stave strip still drawn
underneath the card (non-modal, `queryByRole("dialog")` null in the test
suite too). The "–" in place of the big name is present in the DOM
(`tuner-name` → textContent `"–"`, `color: rgb(213, 203, 184)` =
`paper.drawerBorder` = `#d5cbb8`) but reads very faint against the level's
background in the screenshot itself — the reference's own colour choice is
that low-contrast on purpose (a de-emphasised dash, not a value to draw
attention to); verified by DOM query rather than by eye alone since the
screenshot's compression makes it hard to see.

Deleted `shot-cannot-hear.mjs` and the verification throwaway script,
stopped the :5174 server, confirmed :5173 (`dev:phone`) still answering.
`.sdd/` is gitignored — nothing from the screenshot step was staged or
committed.

## Notes on interface departures from the brief's literal text

- **The footer's ♯/♭ names.** The brief's Produces line and step-1 test
  code say `aria-label="Sharp spelling"`/`"Flat spelling"`, but also says
  "the circle's own labels — read `CircleOfFifths.tsx` for them and
  reuse". `CircleOfFifths.tsx` lines 815/833 use `aria-label="sharp"` /
  `"flat"` (no "spelling" suffix) — confirmed also by
  `tests/ui/scenarios/circle-spelling.test.tsx` and
  `tests/ui/scenarios/tuner-helpers.ts`'s own `enterAndHear(hz, "flat")`
  helper, which already clicks a button named `"flat"` on the practice
  screen. Per the controller's "Things the brief cannot know" note, I used
  the circle's actual names — `"sharp"`/`"flat"` — for both the tuner
  footer's buttons and the four new tests (in place of "Sharp
  spelling"/"Flat spelling"). No collision at runtime: the circle isn't
  rendered while the tuner screen is showing.
- **`memoryStore` doesn't exist.** The brief's step-1 test code for
  REQ-007/S1, S2 and REQ-009/S1 calls a `memoryStore(...)` helper this
  codebase has none of. Per the controller's note, REQ-007/S1 and S2 use
  `sessionDepsWithFakes()` + `localStorageSelectionStore(localStorage)`
  (the pattern every other test in `tuner-screen.test.tsx` already uses),
  and REQ-009/S1 seeds `localStorage` directly with a v5
  `StoredSelection` payload before rendering, the same way
  `theory.circle-of-fifths/REQ-008/S1` above it in
  `selection-persistence.test.tsx` already does.
- **jest-dom matchers rewritten.** The brief's step-1 test code uses
  `toHaveTextContent`, `toBeInTheDocument`, `toBeEnabled`,
  `toHaveAttribute` — this repo has no jest-dom (confirmed: no setup file,
  no dependency). Rewrote every assertion to the repo's own idiom:
  `.textContent`, `.toContain(...)` for the card's two texts (its
  `textContent` concatenates the title and body divs), `toBeTruthy()`,
  `queryByRole(...) === null`, and `button.disabled`/`aria-pressed` reads
  via a typed `const x: HTMLButtonElement = screen.getByRole(...)`
  (matching `target-sheet.test.tsx`'s own pattern — a bare `as
  HTMLButtonElement` cast tripped
  `@typescript-eslint/no-unnecessary-type-assertion`).
- **`TunerLevel.tsx` ripple (anticipated by the brief).** T015 had not yet
  made the big name read "–" while cannot-hear (it simply didn't render
  the name div when there was no reference note). Added a `cannotHear`
  branch there: unconditionally "–" in `paper.drawerBorder`, and
  "Play a note" suppressed while cannot-hear — matching the vendored
  reference's own state machine (`silentNoTarget: !has && !hasT &&
  !cannotHear`, and the `cannotHear` sc-if for "–" sitting beside, not
  inside, `showName`'s), and REQ-007's own text ("'–' in place of the big
  name" — unconditional, not a fallback only for silence-with-no-target).

## Self-review

Read the diff end to end. The two "ripples" (`TunerLevel.tsx`'s "–", and
`App.tsx`'s one new prop line) are both exactly what the brief's own
"Things the brief cannot know" flagged as expected and are the minimum
needed — no other file touched. Every new geometry/colour constant in the
card and footer is copied verbatim from `Tuner.dc.html`'s own
`cannotHear`/footer markup (cited by line number in the comments) rather
than eyeballed. The footer's segmented control mirrors
`CircleOfFifths.tsx`'s own pill construction (border, active/inactive ink,
`aria-pressed`) rather than inventing a new pattern, with a comment noting
those two hex values (`#e0d7c5`, `#756c60`) aren't `paper` tokens there
either, so I didn't invent new ones. No test reaches inside the tuner
context — every assertion goes through rendered text, `data-testid`, or
`getByRole`.

CONCERNS:
The two departures from the brief's literal text (the footer's accessible
names, and `memoryStore`) are exactly what the controller's "Things the
brief cannot know" note told me to do, but flagging here per that note's
own "and say so in the report" instruction.
QUESTION: none

<!-- recorded 2026-09-28T13:04:35Z by scripts/record.sh -->
