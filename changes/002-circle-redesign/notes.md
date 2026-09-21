---
type: Implementation Notes
title: 002-circle-redesign — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/002-circle-redesign/notes.md
status: draft
tags: [sdd, notes, "change:002-circle-redesign"]
sdd_id: 002-circle-redesign
---

# Notes — 002-circle-redesign

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## T001 (2026-09-20)
- PASS/PASS. fast-check + coverage out, 4 @fontsource packages + playwright (dev) in, theme.ts matches the reference palette.
- Controller fix: eslint ignores changes/** and .sdd/** — the vendored design prototype broke typed linting; SDD artefact trees are never lintable app code.
- Brief said 30 tests; real count 31 (stale figure, no regression).

## T002 (2026-09-20)
- PASS/PASS. Fixed the c-major-names state to actually drive the prototype to C major (its raw default was G, an author-time leftover) so both sides of the pair compare the same state.
- Design pipeline confirmed working end to end: prototype PNG matches the vendored design exactly (arc, degrees, names, footer).
- Google Fonts requests aborted for hermetic shots; dev server spawned/torn down only when needed; failures propagate (no silent blank PNGs).
- Minor (non-blocking): text-based click locators could silently break on a future prototype edit.

## T003 (2026-09-20)
- PASS/PASS. arcOf, spelledMajorAt/spelledMinorAt land clean; A major's Ab-wedge → G# scaleName traced correctly.
- Minor: two tests share scenario id REQ-001/S1 by design (raw circle vs. derived reading) — brief-directed, not a defect.

## T004 (2026-09-20)
- PASS/PASS. Reviewer hand-recomputed all three scenarios independently — C major/flute (1,2,3,full), G major/flute (1,2,full), F#/Bass-C (full only, correctly no octave run fits) — all confirmed.

## T005 (2026-09-21)
- PASS/PASS. Store v2 + v1 migration; App.tsx touched only mechanically (4 lines, controller-authorized) — rendered behaviour unchanged; 001's selection-persistence scenarios still pass untouched.
- Minor: schema is z.union not z.discriminatedUnion (behaviourally verified equivalent: v2 passes, v1 migrates, junk → null, never throws).
- Minor: brief's test import path was one level shallow; implementer corrected it silently — briefs for tests/ui/scenarios must use ../../../src/.
- Note for T011: App currently maps its old noteNamesVisible state onto staveNamesEnabled as a temporary bridge — T011 replaces it.

## T006 (2026-09-21)
- PASS/PASS. Reviewer verified every circle constant value-for-value against the reference; arc driven by published arcOf; selection keyed by position+ring so the respell follows structurally. c-major and e-minor screenshot pairs match essentially pixel-for-pixel in the circle region.
- For T012: (1) design-shots `gb-flat-spelling` app driver must click the `flat` pill before `G♭ major` — that pair has never truly been compared; (2) route the prototype's Google Fonts requests to the local @fontsource files so pairs compare on equal typography; (3) the ♯/♭ pill's layout literals in CircleOfFifths.tsx should become named constants like the rest of the file.
- Trap for T007–T011: the 001 note-names bridge keeps DEFAULT_NOTE_NAMES_VISIBLE = true, deliberately separate from firstRunDefaults.staveNamesEnabled (false), until the old panel is replaced.
- Controller process correction (user): explicit `model` on every dispatch; visual comparison belongs to the reviewer subagent, not the main session.

## T007 (2026-09-21)
- PASS/PASS, no findings. Names card + marks + degrees verified character-for-character against the reference; names view draws from scaleNotesOf (range-independent, REQ-003/S3).
- App root now sets fontFamily: fonts.body (reference sets Public Sans at the page root). Note-name text uses data-testid="column-name" because "note-name" still belongs to the mounted 001 KeyViewStave until T009.
- Outstanding for T011: page background (#efe9dc frame / #ddd6c7 outside) and the centred column.

## T008 (2026-09-21)
- PASS/PASS, no findings. Header + settings drawer match the reference value-for-value; closed drawer renders nothing queryable; never opens itself (Article VI).
- Brief error corrected in dispatch: the redesigned circle has 24 wedge buttons (one spelling per dual position), not 27.
- For T011: reviewer could not attribute "every toggle change is persisted" to a test — REQ-008/S1's rewrite should include a toggle → re-render-from-store assertion.
- Real staveNamesEnabled preference now exists (persisted, default false) alongside the temporary 001 note-names bridge; T009 deletes the bridge with the old stave.

## T009 (2026-09-21)
- PASS/PASS. Hand-drawn stave replaces VexFlow (ADR 0002): drawing rules verified value-for-value against the reference; reviewer hand-checked ledger lines (C4 → 1 at index 28; C7 → 40–48; A3 → 28, 26) and the reference's own index<34 stem rule. Stave card "visually indistinguishable from the prototype".
- VexFlow gone from package, lockfile, src and the built bundle: JS 1.43 MB → 330 KB. tests/setup.ts canvas stub deleted with it.
- Deleted with the old stave: KeyViewStave.tsx, the 001 note-names bridge, relative-key/signature-summary paragraphs, stave-styling + names-toggle tests (their REQs were MODIFIED; replacements in stave-view.test.tsx). selection-persistence.test.tsx lost only its two switch aria-checked assertions (T011 rewrites it).
- KeyPanel props extended (rangeSummary, spanCaption, spanChoices) — single home for the span and summary rows; reviewer judged the surface cohesive.
- Minors for the T012 cleanup pass: KeyPanel SPAN_ROW_* constants alias SUMMARY_ROW_*; pillStyle/spanPillStyle share most of their body — extract a base.

## T010 (2026-09-21)
- Round 1: SPEC PASS / QUALITY FAIL — scrim + close button duplicated verbatim between InstrumentSheet and SettingsDrawer (the recurring class). Fixed by a haiku-tier fixer: shared src/ui/overlay.tsx (OverlayScrim, OverlayCloseButton, OverlayHeader). Round 2: PASS/PASS.
- theory.instruments spec untouched; its two UI scenarios re-expressed against the sheet. current-variant test id moved to the header pill; visible text is the prototype's 'Flute Concert' form (no em dash).
- Model ladder applied from here: sonnet implementer/reviewer, haiku for mechanical fixer rounds.

## T011 (2026-09-21)
- PASS/PASS. REQ-008 S1–S4 rewritten with a genuine persistence round trip (UI change → unmount → fresh App over the same storage). Centred 390px column, overlays clip to the column, inert aria-hidden footer placeholder. Implementer committed its own work (dc778da) — contents verified clean.
- Reviewer's full-frame comparison: c-major-names, g-major-stave-full, settings-open, picker-open effectively pixel-identical to the prototype.
- Work list for T012 (design review): (1) design-shots gb-flat-spelling app driver must click `flat` first; (2) serve the prototype's Google Fonts requests from the local @fontsource files so pairs compare on equal typography; (3) keyboard-focus outline on the selected wedge (CircleOfFifths.tsx:394-395, 415-416) — keep keyboard access, style focus-visible instead of the default black ring; (4) name the ♯/♭ pill layout literals; (5) KeyPanel SPAN_ROW_* aliases + pillStyle/spanPillStyle duplication; (6) App.tsx bare "0 auto".
- Work list for T013 (hardening): REQ-008/S3 should assert the full default set; S2/S4 should assert the full-span default.

## T012 (2026-09-21)

### Design review — round 1

Work-list items applied first (T011's accumulated findings):
1. `scripts/design-shots.mjs` — `gb-flat-spelling`'s app driver clicked `G♭ major` without clicking `flat` first, so that pair had never been genuinely compared. Fixed: clicks `flat` then `G♭ major`.
2. `scripts/design-shots.mjs` — the prototype context aborted `fonts.googleapis.com`/`fonts.gstatic.com` requests, so it fell back to system fonts while the app used the real self-hosted `@fontsource` faces. Replaced the abort with `route.fulfill`: the stylesheet request is answered with the same `@font-face` CSS the app imports (Instrument Serif 400, Noto Music 400, Public Sans 400/500/600/700, JetBrains Mono 400/500/600 — `src/ui/main.tsx`'s exact import list), rewritten to point at `fonts.gstatic.com/s/<file>`, and each of those file requests is answered with the matching local woff2/woff bytes read from `node_modules/@fontsource/*/files/`. Practical, not impractical — implemented in full.
3. `src/ui/CircleOfFifths.tsx` + `src/ui/global.css` — wedges showed the browser's default black focus ring after a pointer click (visible in `e-minor`). Added a `circle-wedge` class (new `WEDGE_CLASS_NAME` constant) and a global.css rule: `outline: none` on the class, a `:focus-visible` rule restores a visible ring (2px, `paper.accent`'s hex, CSS can't import the TS constant so the value is copied with a comment) for keyboard users only. Keyboard activation (`Enter`/`Space`) untouched.
4. `src/ui/CircleOfFifths.tsx` — the ♯/♭ pill's inline layout literals (`padding`, `fontSize`, `fontWeight`, `lineHeight`, `borderRadius`) lifted to `PILL_BUTTON_PADDING`/`PILL_BUTTON_FONT_SIZE`/`PILL_BUTTON_FONT_WEIGHT`/`PILL_BUTTON_LINE_HEIGHT`/`PILL_BORDER_RADIUS`, matching the file's naming convention.
5. `src/ui/KeyPanel.tsx` — `SPAN_ROW_*` (which only aliased `SUMMARY_ROW_*`) collapsed into one shared `ROW_MARGIN_TOP`/`ROW_PADDING_TOP`/`ROW_BORDER` used by both rows; `pillStyle`/`spanPillStyle` now share a `basePillStyle()` (colour/weight/line-height) with only padding, monospacing and rounding varying per caller.
6. `src/ui/App.tsx` — the column's bare `"0 auto"` (centres the 390px column on a wider viewport — the reference's own `CIRCLE_WRAPPER_MARGIN` is a different concept, centring the circle within the column) named `COLUMN_CENTERING_MARGIN` with a comment noting it isn't from the reference.

`pnpm check` green after each item; re-ran `pnpm design:shots` for all six states and compared every pair (full-frame reads plus `imagemagick compare -metric AE` + targeted crops for close reading). Two further, genuine visible differences turned up that weren't on the work list — round 1's own job:
7. Every `<button>` in the app rendered its text in the browser's default UI font (Arial, confirmed via a computed-style probe: `getComputedStyle(button).fontFamily === "Arial"`) instead of inheriting `Public Sans`/`JetBrains Mono` from the page — invisible until item 2 made the comparison fair, because the prototype's interactive elements are plain `<div onClick>`, never real `<button>`s, so it never hit this gap. Visible as bolder/different letterforms in the header's "Flute Concert" pill and as different text-wrapping in the settings drawer's row descriptions ("Label each notehead" / "underneath" on two lines vs. one). Fixed with one rule in `global.css`: `button { font: inherit; }` — each button's own inline `fontSize`/`fontWeight` still wins (inline beats any stylesheet selector). Re-verified: header pill and drawer wrapping now match the reference exactly.
8. The `settings-open` and `picker-open` states' prototype drivers left the prototype on its own hard-coded leftover default (G major — the same author-time artefact `c-major-names` already works around) while their app drivers correctly land on the app's real C-major default (REQ-008) — so both pairs were comparing the settings drawer/instrument sheet over two *different* keys underneath, not the same state. Fixed by applying `c-major-names`' existing C-major-wedge-click correction to both prototype drivers too.

### Design review — round 2

Re-ran `pnpm design:shots` for all six states after round 1's fixes and re-compared every pair (full-frame + crops: header pill lettering, settings-drawer wrapping, wedge focus ring, sharp/flat pill, span/names pills, key-name serif heading, stave). No further visible difference found. The remaining `compare -metric AE` pixel counts are uniform thin double-edge anti-aliasing along every shape boundary (confirmed by reading the diff overlays), not a localised shift or a real geometry/colour/type mismatch — expected and explicitly out of scope per plan.md ("anti-aliasing and font rasterisation differ run-to-run... judgement stays human-plus-agent", not a pixel-diff gate). Converged at round 2, within the 4-round cap.

## Design review — user verdict (2026-09-21)
Presented all six prototype/app screenshot pairs (equal self-hosted fonts on both sides). Independent reviewer: all six match; one ~2px drawer-divider offset, imperceptible at 1:1.
**User response, verbatim:** "Matches — proceed"

## User decision (2026-09-21) — footer placeholder removed
After the design review: "Looks great! You can remove the 'play along' area at the bottom though as that'll be implemented in later changes for real so we don't need the mockup yet." Logged in docs/decisions.md. Consequence for converge and the screenshot pairs: the bottom-of-column region now DELIBERATELY differs from the prototype (no dashed footer); no requirement in the delta mentions the footer, so the spec is unaffected. Tracked as T014.

## T012 (2026-09-21)
- Round 1 review: all six pairs MATCH (independent verdict); SPEC FAIL on a keyboard focus ring that did not actually paint on SVG wedges (Chromium cannot ring a non-rectangular path with `outline`) and on step 5 pending. Fix: a React-tracked, :focus-visible-gated overlay <path> stroked paper.accent — reviewer reproduced a complete ring on a major and a minor wedge under Tab, none on pointer click. Round 2: PASS/PASS.
- Real bug found by making the font comparison fair: every <button> rendered in Arial (UA form-control font) — fixed with `button { font: inherit }`.
- design-shots now serves the prototype's Google Fonts from local @fontsource files; gb-flat-spelling, settings-open and picker-open drivers corrected.

## T014 (2026-09-21)
- Trivial class, haiku tier, controller-verified (no quality-review stage): footer placeholder and its 22 FOOTER_* constants removed from App.tsx; column layout intact; 52 tests green; no test referenced the footer.
