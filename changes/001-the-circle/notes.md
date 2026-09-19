---
type: Implementation Notes
title: 001-the-circle — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/001-the-circle/notes.md
status: draft
tags: [sdd, notes, "change:001-the-circle"]
sdd_id: 001-the-circle
---

# Notes — 001-the-circle

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## T001 (2026-09-19)
- Toolchain resolved newer than the plan's approximations: Vite 8.3.0, Vitest 5.0.1 (plan said 7.x / 3.x). Green; note for converge — plan versions are stale, reasoning unchanged.
- Stray scaffold files (root index.html, public/*, stale package.json pins) had been swept into docs commit c9acb96; removed by T001 as layout violations.
- .prettierignore excludes the docs tree (52 pre-existing files would fail prettier --check otherwise) — necessary, scoped.
- Reviewer: SPEC PASS / QUALITY PASS, 3 minor findings, none open.

## T002 (2026-09-19)
- pitchPosition uses the MIDI convention (C4=60): the task prose said "C0 = 0" but the test's 66/96 values are authoritative; code comments state the actual convention.
- Review round 1: QUALITY FAIL on duplicated lookup tables; fixed by exporting from notes.ts. Round 2: SPEC PASS / QUALITY PASS.

## T003 (2026-09-19)
- SPEC PASS / QUALITY PASS first round. Reviewer probe confirmed enharmonic relatives spell correctly (G♭→E♭ minor, C♯→A♯ minor) with no special-casing.
- Minor: straight vs curly apostrophes in test names; cosmetic.

## T004 (2026-09-19)
- Round 1: QUALITY FAIL — accidentalForTarget duplicated between keys.ts and circle.ts; extracted to notes.ts (internal export). Round 2: PASS/PASS.
- Recurring bug class for briefs: implementers duplicate a helper rather than touch a file outside the Files list. Future briefs should authorize extractions within the context up front.
- Reviewer hand-verified the 12 spellings, ring alignment, and that the adjacency property is non-vacuous at the enharmonic positions.

## T005 (2026-09-19)
- PASS/PASS round 1. parseNoteString extracted to notes.ts (pre-authorized), genuine single definition.
- Minor open: NOTE_STRING_PATTERN regex literal duplicated between notes.ts and catalogue.ts Zod validator — fold into T011 hardening.

## T006 (2026-09-19)
- PASS/PASS round 1. Reviewer re-derived the acceptance arithmetic by hand (G major/flute 22 notes, octave shift, E minor from C4) — all match.
- fast-check resolved at v3 (plan said 4.x); same API for our calls. Note for converge alongside the other version drifts.

## T007 (2026-09-19)
- PASS/PASS round 1. Two disclosed test deviations (cleanup registration, aria-checked assertion) — intent preserved, jest-dom absent by design.
- Minor: App.tsx render-time ?? fallback duplicates init-time validation; unreachable. Candidate cleanup in T011.

## T008 (2026-09-19)
- PASS/PASS round 1. Reviewer probe: 15 major + 15 minor accessible buttons (12 positions + 3 enharmonic doublings per ring).
- key-label helper extracted to src/ui/key-label.ts (pre-authorized).
- Minor (pre-existing from T007): initialSelection computes variant/key only for existence checks. Candidate cleanup in T011.

## T009 (2026-09-19)
- Spike PASSED: VexFlow per-note styling works (setStyle changes emitted SVG fill) — the plan's top risk did not materialise; no fallback needed.
- Review round 1 raised a critical "fabricated authorization" — retracted on evidence: the key-label.ts extension was controller-authorized in the dispatch (established policy since T005/T008). Final: SPEC PASS / QUALITY PASS.
- Minors for T011: (1) STYLE_TOKENS `as CSSProperties` cast needs a why-safe comment; (2) shared vitest setupFiles stub for jsdom canvas noise now leaking into other UI test output.
- REQ-003/S1 visual acceptance remains the user's manual sign-off (per plan) — headless probe confirmed 22 names C4–C7, 3 roots, 3 F♯ highlights structurally.

## T010 (2026-09-19)
- PASS/PASS round 1, no findings. findVariantById extracted to src/ui/catalogue-lookup.ts (authorized). Article VI spot-checked across the whole mounted App: nothing interruptive.

## T011 (2026-09-19)
- Edge case swept: extended `selection-persistence.test.tsx` with
  `theory.circle-of-fifths/REQ-008/S3 — stored selection naming an unknown
  variant falls back to default`. GREEN on the first run — T007's
  `initialSelection` already treats an unresolvable stored `variantId` (or
  `keyId`) the same as unreadable storage, falling back to the default. No
  `App.tsx` behaviour change needed for this case.
- Four minor review findings closed (controller-authorized):
  1. Shared jsdom canvas stub moved from the two UI test files that had it
     (`names-toggle.test.tsx`, `selector-and-notices.test.tsx`) into a single
     `tests/setup.ts`, wired via `vite.config.ts`'s `test.setupFiles`. The
     jsdom "not implemented" canvas noise no longer appears in `pnpm check`
     output for any UI test file.
  2. `App.tsx`'s render-time `??` fallback that re-resolved
     `DEFAULT_VARIANT_ID`/`DEFAULT_KEY_ID` was removed: `initialSelection`
     already guarantees `selection.variantId`/`selection.keyId` resolve in
     the current catalogue/circle before that state is ever set (falling
     back to the default itself when they don't), so the fallback was dead
     code. Left a comment explaining why the plain lookups are always safe.
  3. `NOTE_STRING_PATTERN` is now exported once from
     `src/theory/domain/notes.ts` (already home to `parseNoteString`) and
     imported by `src/theory/instruments/catalogue.ts`'s Zod schema,
     replacing the duplicated regex literal.
  4. `KeyViewStave.tsx`'s `as CSSProperties` cast for `STYLE_TOKENS` now
     carries a comment: React's `CSSProperties` type doesn't model custom
     properties (`--*` keys) at all, so there is no type for this shape, but
     the browser accepts custom properties on any element's inline `style`
     regardless — the cast is safe because the value itself is a valid style
     object at runtime, just not one TypeScript can name.
- `pnpm build` produced a `dist/` bundle (`dist/index.html`,
  `dist/assets/index-*.js`) with no errors (one non-blocking Vite warning
  about chunk size, unrelated to correctness). Phone legibility: not yet
  checked on phone — user to observe during acceptance.
- `./scripts/check-contexts.sh` — no violations. `./scripts/check-scenarios.sh
  --change changes/001-the-circle` — all 21 scenarios cited, no gaps.

### Acceptance walk-through (for the user's sign-off)

1. Run `pnpm dev`, open the app in a browser.
2. Select instrument variant **Flute — Concert**.
3. Select **G major** on the circle.
   - Expect: stave signature is one sharp (F♯).
   - Expect: notes run C4 up to C7.
   - Expect: every G is emphasised (root highlight).
   - Expect: F♯ is highlighted as the new accidental.
   - Expect: the relative-key label reads "Relative minor: E minor".
4. Toggle note names off.
   - Expect: the same notes remain on the stave with no names shown.
5. Switch the variant from **Ocarina Alto C** to **Ocarina Bass C** (with a
   key selected on the circle).
   - Expect: every displayed note moves down exactly one octave.
6. The user signs off; their verdict is recorded here verbatim.

**User verdict:** _pending_

### `pnpm check` output (T011)

```
> music-learning-assistant@0.0.0 check /home/merlin/projects/music-learning-assistant
> prettier --check . && eslint . && tsc --noEmit && vitest run

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  11 passed (11)
      Tests  28 passed (28)
   Start at  21:26:55
   Duration  1.43s (environment 63%, import 19%, tests 11%, transform 5%, setup 1%, worker 1%)
```

## T011 (2026-09-19)
- PASS/PASS. 21/21 scenarios covered, 28 tests green, boundaries respected, dist/ builds.
- All four accumulated review minors fixed (shared canvas stub, unreachable fallback removed, regex single-sourced, cast comment).
- Remaining open item: user's acceptance walk-through + phone legibility observation (see Acceptance section above; verdict pending).

## T012 (2026-09-19)
- W1 fixed: octave loop widened ±1; reviewer proved the regression is genuine (reverted fix → exact RED) and argued sufficiency (accidental offset ≤ ±1 semitone ⇒ octave skew ≤ 1). PASS/PASS.
