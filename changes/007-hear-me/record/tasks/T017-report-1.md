---
type: Implementation Report
title: T017 — implementation report
resource: /.sdd/reports/007-hear-me/T017.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T017.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T12:26:53Z
sdd_id: 007-hear-me
---

TASK: T017
STATUS: DONE
COMMIT: c0c77629040600ca81cc7ddb5cd9d63490897f29
FILES:
src/ui/TargetPill.tsx (new)
src/ui/TargetSheet.tsx (new)
src/ui/PitchSpiral.tsx (new)
src/ui/TunerScreen.tsx (modified — the target row, the sheet, `appendToTrail` extracted and exported)
src/ui/App.tsx (modified — the four target handlers, `range={variant.range}`)
src/ui/TunerLevel.tsx (modified, ripple — `lineTop` rounded to hundredths; see CONCERNS)
tests/ui/scenarios/target-sheet.test.tsx (new)

## RED (first failure, before any production code)

```
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Target"
...
 Test Files  1 failed (1)
      Tests  5 failed (5)
```
All five tests failed the same way — no `TargetPill`/`TargetSheet`/`PitchSpiral` existed yet — matching the brief's Step 2 exactly.

## GREEN — real vitest output

`pnpm vitest run tests/ui/scenarios/target-sheet.test.tsx`:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  13:25:10
   Duration  2.25s (tests 64%, transform 16%, environment 11%, import 8%)
```

`pnpm vitest run tests/ui`:
```
 Test Files  24 passed (24)
      Tests  111 passed (111)
```

## Testing-convention translation

The brief's Step 1 test text used jest-dom matchers (`toHaveTextContent`,
`toHaveAttribute`, `toBeDisabled`, `toBeInTheDocument`) that this repo's
Vitest setup doesn't install (no `jest-dom`, no `setupFiles` — confirmed by
`vite.config.ts` and by grepping for any existing use of those matchers:
none). Per the brief's "Things it cannot know" note, I translated each 1:1
into what's already the codebase's own convention (`tuner-screen.test.tsx`,
`tuner-stave.test.tsx`): `.textContent` (`toContain` where the original was
a substring check, `toBe` where it was exact, matching `tuner-name`'s
existing exact-match precedent), `.getAttribute(...)`, `.toBeTruthy()` for
`toBeInTheDocument`, and for the two `toBeDisabled()` calls, real
`<button disabled>` elements checked via `.disabled` — typed with a `const
x: HTMLButtonElement = screen.getByRole(...)` declaration rather than an
inline `as` cast (an inline cast tripped
`@typescript-eslint/no-unnecessary-type-assertion` even though `tsc`
required it without the annotated `const`; the annotated form satisfies
both).

## Design fidelity (screenshots)

`dev:phone` was already holding :5173 (confirmed answering before and
after, untouched). A stale `vite --port 5174` process from an earlier
session (pid, started ~30 min before this one) was still bound to 5174
serving pre-T017 code; killed it and started a fresh `bash -c "source
~/.cargo/env && pnpm dev -- --port 5174"` so `predev`'s `build:sound` (and
so the current code) actually ran. Wrote a throwaway Node+Playwright script
at the repo root (workspace `playwright` resolution, per T014/T015's own
precedent — `python3 scripts/design_snapshot.py` wasn't used since the
brief's own note says the Node route, matching prior tasks), Chromium with
`--use-fake-ui-for-media-stream`/`--use-fake-device-for-media-stream`,
390×844 @2×:

- `tuner--target-sheet.png` — entered the tuner, clicked Target. Read: the
  sheet's header ("Target" / "Measure from the nearest note, or pin one" /
  ✕), the Auto card ticked (border/fill matching "on"), the Hold card
  greyed with "play a note first" (no signal fed), "Or tap a note" with
  "E2–C7 · low in the middle", and the spiral: 57 wedges in a ring winding
  outward from the hub, coloured by the circle-of-fifths hue with sharps
  darker, every C wedge labelled with its octave (C7 down to C3 visible),
  the hub reading "— / pick a note" (auto). Matches 5c's structure.
- `tuner--target-pinned.png` — entered the tuner, pinned A4 via
  `window.__session.pinTarget(69)` (Hold was greyed with no signal, per the
  brief's own workaround). Read: the pill row reads "− TARGET A4 + ✕", the
  big name "A 4" greyed with "Play a note" beneath (REQ-003/S2), the stave
  strip shows only the target's grey head with "A4 IS 440.0 Hz". Matches
  4a's pinned pill.

Deleted the script, stopped the :5174 server, confirmed :5173 (`dev:phone`)
still answering. Nothing committed from the screenshot step (`.sdd/` is
gitignored).

## CHECK — `bash -c "source ~/.cargo/env && pnpm check"` (last ~15 lines)

```
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.63s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(vitest summary earlier in the same run: `Test Files  72 passed (72)` /
`Tests  297 passed (297)`; exit code 0; prettier/eslint/tsc/cargo
fmt/clippy all passed silently before this.)

CONCERNS:
- `TunerLevel.tsx` (T015's file, not in this task's Files list) needed a
  one-line ripple: the pinned rule's ±50 ¢ edge (`AREA_MID -
  lineCents*PX_PER_CENT - LINE_TOP_ADJUST` at `lineCents = 50`) landed on
  `9.500000000000028` rather than `9.5` — a float artifact of `50 * 5.1`
  (`PX_PER_CENT` has no exact binary representation), never hit by any
  scenario before T017's Hold test pushed a reading past the clamp. Added a
  `roundPx` helper (round to hundredths — far finer than a visible pixel)
  and applied it to `lineTop`. Full `tests/ui` suite (including the
  pre-existing `tuner-screen.test.tsx`/`tuner-stave.test.tsx`) still green
  after the change. Flagging per AGENTS.md's "a brief's Files list can omit
  a file the change necessarily ripples into."
- `TargetSheet.tsx` gates its own content on `open` (`{open && (...)}`)
  inside `BottomSheet`, which — per its own doc comment, and every other
  sheet in the codebase (Drone/Instrument/Traversal/Tempo/Scale) — always
  renders its children and relies solely on `display: none` for
  visibility. I deviated here because the brief's own S1 test asserts
  `screen.queryByText("Measure from the nearest note, or pin one")).
  toBeNull()`, and `queryByText` (unlike `queryByRole`) does not exclude
  `display:none` subtrees — confirmed by running the test against a
  BottomSheet-only implementation first (it found the text). Gating on
  `open` also means the 57-wedge spiral is never computed while hidden.
  Flagging in case the reviewer would rather this be a `BottomSheet`-level
  change (out of scope for this task's Files list) instead of a
  per-sheet one.
- `closeAriaLabel="Close"` on `TargetSheet`'s `OverlayHeader`, rather than
  the more descriptive `"Close target sheet"`/`"Close drone sheet"` every
  sibling sheet uses — required verbatim by the brief's own S6 test
  (`getByRole("button", { name: "Close" })`) and flagged as deliberate by
  the brief's own parenthetical. Noting the inconsistency with the sibling
  sheets' naming convention in case that was an oversight in the brief
  rather than intentional.
- The design's `spSep` (octave-separator spiral, script lines 1420-1424) is
  computed in the vendored reference but never drawn by its own markup
  (nothing in the `<svg>` block at lines 86-96 references it) — read as
  dead code in the source and not reproduced, per "the design is a spec,
  never a source." Flagging since the brief's "Design" bullet does list
  `spSep` among the arithmetic to reproduce; I judged the markup (what's
  actually rendered) as authoritative over the script's own unused
  variable.
- The spiral hub's hover state ("TAP FOR …") is not implemented at all
  (no `hoverM`-equivalent state) — the brief explicitly allows this
  ("may be rendered as the design draws it but is not asserted, the phone
  never hovers"); I judged not implementing it the simpler choice
  (Article VIII) over adding unrequested hover state. `userEvent.hover` in
  S2 is a no-op against it, as expected.

QUESTION: none.

<!-- recorded 2026-09-28T12:37:18Z by scripts/record.sh -->
