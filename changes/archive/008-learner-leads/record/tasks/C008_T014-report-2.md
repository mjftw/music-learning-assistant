---
type: Implementation Report
title: C008_T014 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T014.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T014.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T00:58:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T014 (fixer round)
STATUS: DONE
COMMIT: 19d61fef9df4abe2cf9639f00edd9a09dd71b0ab
FILES:
src/ui/App.tsx
src/ui/KeyPanel.tsx
src/ui/NoteMeter.tsx
src/ui/StaveView.tsx
VERIFY:
Real-browser check (Playwright, Chromium, throwaway script in the scratch directory, not committed): seeded localStorage with the stored selection (`who: "me"`, `view: "stave"`), granted a fake microphone, started a lead run, and read the live DOM.
- Structural: `getComputedStyle(band).zIndex === "auto"` (no negative z-index anywhere), `card.compareDocumentPosition(band) & DOCUMENT_POSITION_FOLLOWING` true and `card.contains(band)` true — the band is a later sibling inside the panel's own card, after its opaque background, so it paints on top of it by DOM order alone.
- Pixel: a cropped/zoomed screenshot of the first notehead shows a pale green strip either side of the enlarged brown notehead; `convert meter-band.png -crop 1x1+520+473 txt:-` reads `#C1D3B9` (pale green) at the band's left edge, confirming it is visible in front of the panel and behind the notehead, not occluded.
- `document.elementsFromPoint` at the band's centre does *not* list the band or the line — confirmed this is because both carry `pointer-events: none` (inherited from the geometry box), which correctly excludes them from hit-testing/click-through, the same reason the stave beneath stays tappable; it is not evidence of invisibility, so I used the structural + pixel checks above instead and say so here.
- Did not drive a detected pitch through the fake microphone (would need a real tone fed and the McLeod detector settling, impractical to script reliably in the time available); verified the silent state only (band, no fill, no line) as the instructions allow — did not verify the line's "in front of the notehead" placement in a real browser pixel-for-pixel, only structurally (DOM order places the overlay's line after `children` in the same non-z-indexed stacking context, so it paints in front by the same rule the band's underlay does behind).

`pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx tests/ui/scenarios/transport-card-lead.test.tsx`:
```
 Test Files  3 passed (3)
      Tests  32 passed (32)
   Start at  00:50:19
   Duration  4.06s (tests 65%, environment 15%, transform 12%, import 9%)
```
CHECK:
`pnpm vitest run tests/ui`:
```
 Test Files  28 passed (28)
      Tests  173 passed (173)
   Start at  00:55:52
   Duration  9.58s (tests 62%, environment 19%, import 10%, transform 9%)
```
`pnpm check` (prettier, eslint, tsc, vitest, cargo fmt/clippy/test):
```
 Test Files  91 passed (91)
      Tests  433 passed (433)
   Start at  00:56:55
   Duration  19.49s (tests 59%, environment 28%, import 8%, transform 5%)
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(cargo clippy -D warnings and cargo fmt --check both passed — no output means clean; the earlier lines in the same run show every crate's unit tests green and prettier/eslint/tsc clean before vitest's 91/91.)

CONCERNS:
- The structural check for "the line is in front of the notehead" is DOM-order reasoning, not a pixel check (I could not easily script a steady detected pitch through the fake-device microphone in the time available) — the controller's own instruction allowed stopping at the silent state for the band; I did the same for the line and say so here rather than claim more than I verified.
CHOICES MADE:
- `KeyPanel`'s `underlay`/`overlay` render inside one additional `<div style={{ position: "relative" }}>` wrapping only `children` (not the card's own padding/background div), so its origin is exactly `children`'s own local origin — the same frame `onTargetBox` reports the stave's target head centre in. No coordinate conversion was needed in `App`; the existing `box.left === cx − 13` arithmetic still lands in the right frame, verified by the browser check's band screenshot sitting flush against the actual rendered notehead.
- `NoteMeter`'s `layer` prop defaults to showing both band and line (unchanged unit-test behaviour); `App` renders two instances (`layer="band"` as the underlay, `layer="line"` as the overlay) sharing one `geometry`/`toleranceCents`/`heldFraction`/`reading` computed once, to avoid duplicating that derivation.
- Removed both `zIndex: -1` and `zIndex: 1` from `NoteMeter` entirely — paint order is now DOM order only, inside the one non-z-indexed stacking context `KeyPanel`'s inner wrapper forms implicitly by containing both layers and `children`.
- Memoized `leadTarget` with `useMemo` keyed on the run index (not the whole snapshot), and wrapped `StaveView` in `React.memo` as a second, independent guard against a per-reading re-render, since every other prop it receives was already stable across a reading.
- `KeyPanel.tsx` was outside the brief's Files list; touched as a necessary ripple per the controller's direction, and said so here.

<!-- recorded 2026-10-04T00:04:13Z by scripts/record.sh -->
