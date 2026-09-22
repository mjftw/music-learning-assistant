---
type: Implementation Plan
title: Circle redesign — plan
description: Rebuild the UI to the Function Paper prototype — hand-drawn SVG circle and stave, self-hosted fonts, new pure theory functions for arc and span, versioned stored state.
resource: /changes/002-circle-redesign/plan.md
status: stable
tags: [sdd, plan, "change:002-circle-redesign"]
sources:
  - resource: /changes/002-circle-redesign/proposal.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T20:05:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:42:58Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_phase: approved
---

# Plan: Circle redesign

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | The prototype-wins rule is the user's standing decision; both genuinely close calls below are open questions |
| II — spec precedes implementation | yes | Proposal and delta approved (v0.2.0 target previewed) before this plan |
| III — testable requirements | yes | Every ADDED/MODIFIED requirement maps to named tests below |
| IV — separate verification | yes | Scenario tests through `theory/published` / rendered App; per-task review as in 001 |
| V — latency budget | no | Still no while-playing feedback; first applies at 005 `hear-me` |
| VI — instrument is the focus | yes | The sheet and drawer are user-invoked, scrim-dismissed overlays; nothing opens itself, nothing interrupts; no gamification anywhere in the design |
| VII — no third-party services | yes | **The prototype loads Google Fonts from a CDN; the implementation must not.** All four typefaces are bundled locally (OFL-licensed); zero runtime network requests remain |
| VIII — simplicity | yes | Net dependency change is negative in code: VexFlow and two unused dev deps out, only font packages in |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | follows | Arc and span are pure `theory` functions; all layout math is pure per component; IO stays at the storage port |
| 3 Types | follows | `Span` as a sum type (`{ kind: 'full' } \| { kind: 'octaves', count }`); spelling preference as `'sharp' \| 'flat'`; no casts beyond the documented CSSProperties one |
| 4 Errors | follows | Store migration returns a value (parsed v2 \| migrated v1 \| null); nothing throws for expected shapes |
| 6 Architecture | follows | New domain files under `src/theory/domain/`, published via `theory/published`; UI stays the interface layer; geometry constants live in UI (visual, not theory) |
| 7 Testing | follows | One test per scenario named by ID; existing REQ-005/006 property tests untouched; visual fidelity explicitly manual (see Test strategy) |
| 8 Data and interfaces | follows | Stored state v2 is a Zod schema; v1 accepted and migrated by schema union, not ad-hoc checks |
| 9 Dependencies | follows | Each font package justified below; three now-unused dependencies removed rather than kept |
| 14 Tooling | follows | Unchanged toolchain; `pnpm check` as in AGENTS.md |

## Approach

Rebuild the view layer to the prototype while the theory context only grows:
two new pure modules — the **arc** (which seven circle positions hold the
selected key's notes, with signed distance and degree) and the **span**
(which whole-octave runs from an in-range tonic fit the variant's range, and
the notes of a chosen span) — join `theory/published`, and the existing
circle/key-view/signature functions are consumed unchanged. The UI is
rewritten component-by-component from the prototype's own geometry: the
circle (wedges, fixed per-key oklch hues, distance ring with notched degree
slots, outside scale names, centre disc with clef and signature glyphs, ♯/♭
pill), the key panel (names view; a **hand-drawn SVG stave** replacing
VexFlow — the prototype fully specifies noteheads, stems, ledger lines and
signature placement, and pixel fidelity to it is the acceptance bar), the
header pill, the instrument bottom sheet, and the settings drawer. The four
prototype typefaces are self-hosted (Article VII). Stored state moves to a
v2 schema carrying the six new preferences, with v1 state migrated by
defaulting. The whole app renders as a phone-proportioned column centred on
wider screens. Driver order: product constraint (two devices, no services) →
the prototype as the user's binding design decision → engineering §1/§14 —
nothing here needed a stack change, only a dependency swap.

### Alternatives rejected

| Option | Why not |
|---|---|
| Keep VexFlow and restyle it to match the prototype | Engraving-correct output is the *wrong* target now: the acceptance bar is pixel fidelity to a design that draws its own simplified notation (plain ellipses, fixed 24px stems, text-glyph signatures). Fighting VexFlow's layout engine to un-engrave it costs more than the ~150 lines the prototype's stave actually is — and 001 already proved the drawing (ADR 0002) |
| Google Fonts at runtime (as the prototype does) | Violates Article VII outright; also breaks offline home use |
| `@font-face` against system fonts (no bundling) | The design's voice *is* these four typefaces (Instrument Serif display, Noto Music clefs, Public Sans body, JetBrains Mono data); system fallbacks fail the side-by-side |
| Keep fast-check / coverage packages "for later" | Both unused since 001's convergence fixes; Article VIII says a dependency needs a current reason; re-adding later is one command |
| CSS-in-JS library or Tailwind for the prototype's styling | The prototype is inline styles over a tiny palette; component-local style constants plus one global stylesheet reproduce it with zero new dependencies |
| Port the prototype's `DCLogic` component wholesale | It is a design-tool runtime with its own template engine; the intent explicitly scopes it out — React + the theory context is the real implementation |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Everything from 001 | unchanged | — | TypeScript/React/Vite/Zod/localStorage-port; nothing in this change strains any of it |
| Notation rendering | Hand-drawn SVG in React, geometry from the prototype | n/a | Replaces VexFlow — see Alternatives; ADR 0002 records the reversal |
| Typefaces | Self-hosted via `@fontsource/*` packages | pinned at install | Versioned, licence-vetted (OFL), imported as CSS with woff2 assets bundled by Vite — vs. hand-vendored files that nobody updates or licences |
| Colour | `oklch()` literals as in the prototype | n/a | Native in all evergreen browsers (Chrome 111+/Safari 16.4+/Firefox 113+); this is a personal tool on current browsers — no fallback layer |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| `@fontsource/instrument-serif` | The key-name display face | Article VII forbids the prototype's CDN; the face is the design's voice |
| `@fontsource/noto-music` | Clef glyphs (𝄞) on circle and stave | Music glyphs are absent from system font stacks |
| `@fontsource/public-sans` | Body/UI face | As above — the side-by-side fails on a fallback |
| `@fontsource/jetbrains-mono` | Degrees, marks, ranges, captions | As above |
| dev: `playwright` (Chromium only) | Drives the design-review loop: headless screenshots of the vendored prototype and the app at 390×844 in matching states | The comparison needs a real renderer; jsdom cannot paint. Alternative (manual screenshots every iteration) makes the loop slow enough that it wouldn't run. Dev-only, never shipped, no runtime service (Article VII untouched) |

Removed dependencies:

| Package | Why |
|---|---|
| `vexflow` | Replaced by the prototype's own stave drawing (ADR 0002) |
| `fast-check` | Unused since the range property became exhaustive enumeration (001 convergence W2 fix) |
| `@vitest/coverage-v8` | Installed at scaffold, never wired to anything (001 converge info item) |

## Data model

- **SpellingPreference** — `'sharp' | 'flat'`. *(published)*
- **Span** *(published)* — `{ kind: 'full' } | { kind: 'octaves'; count: 1 | 2 | 3 | 4 }`;
  illegal spans unrepresentable. Stored as a string (`'full' | 'oct-1'…`) in
  the selection schema.
- **ArcPosition** *(published)* — `{ positionIndex: 0–11; signedStep: -1…5;
  degree: 1–7; scaleName: PitchClass; differsFromWedge: boolean }` — computed
  per selected key; never stored.
- **SpanChoice** *(published)* — `{ span: Span; noteCount: number }` — what
  the pills render; full is always present.
- **StoredSelectionV2** (Zod, UI adapter) — `{ schemaVersion: 2; variantId;
  keyId; spelling: 'sharp'|'flat'; view: 'names'|'stave'; span: string;
  degreesEnabled: boolean; distanceRingEnabled: boolean;
  staveNamesEnabled: boolean }`.
  **Migration**: the loader is a Zod union of V2 and 001's V1; a V1 value
  maps to V2 by carrying `variantId`/`keyId` and defaulting the rest
  (REQ-008/S4; V1's `noteNamesVisible` is deliberately dropped — the new
  default set supersedes it, per the delta). Reversal: 001's loader treated
  unknown shapes as corrupt and fell back to defaults, so rolling back is
  lossless-by-default, not lossy.

## Interfaces

Additions to `src/theory/published/index.ts` (existing surface unchanged):

- `arcOf(key: Key, preference: SpellingPreference): readonly ArcPosition[]`
  — pure; always exactly 7 entries; total for every selectable key. No error
  shape: unrepresentable inputs don't compile.
- `spanChoicesOf(key: Key, variant: Variant): readonly SpanChoice[]` — pure;
  always contains full; octave runs only when they fit (REQ-011). Total.
- `spanNotesOf(key: Key, variant: Variant, span: Span): readonly KeyViewNote[]`
  — pure; a span that doesn't fit degrades to the full range (the UI never
  offers one, but the function is total rather than throwing).
- `spelledMajorAt(position: CirclePosition, preference: SpellingPreference): Key`
  and `spelledMinorAt(…)` — which of a position's spellings the preference
  picks; identity at the nine single-spelling positions.

UI (interface layer, not a context):

- `selection-store.ts` — same `SelectionStore` port; `load()` returns
  `StoredSelectionV2 | null` (migrating V1 internally); `save()` writes V2.
- Components consume `theory/published` only; geometry/palette constants are
  module-local named constants mirroring the prototype's values.

## Events

None emitted, none consumed (unchanged domain map).

## Structure

```
src/theory/
  domain/arc.ts             ← NEW: signed steps, degree-by-step, arc positions
  domain/span.ts            ← NEW: octave runs, span choices, span notes
  published/index.ts        ← extended with the four functions above
src/ui/
  App.tsx                   ← state: selection + 6 preferences; layout column
  Header.tsx                ← NEW: instrument pill + settings button
  CircleOfFifths.tsx        ← REBUILT: wedges, hues, ring, degrees, names,
                              centre disc, ♯/♭ pill (prototype geometry)
  KeyPanel.tsx              ← NEW: names/stave switch, span row, summary row
  NamesView.tsx             ← NEW: seven columns with marks and degrees
  StaveView.tsx             ← NEW: hand-drawn SVG stave (replaces
                              KeyViewStave.tsx, which is deleted)
  InstrumentSheet.tsx       ← NEW: bottom sheet (replaces InstrumentSelector)
  SettingsDrawer.tsx        ← NEW: three display toggles
  Notices.tsx               ← unchanged (theory.instruments untouched)
  selection-store.ts        ← v2 schema + v1 migration
  key-label.ts              ← unchanged helpers
  theme.ts                  ← NEW: the paper palette + font stacks, once
  main.tsx                  ← imports @fontsource CSS; unchanged wiring
tests/theory/
  scenarios/arc.test.ts     ← NEW (REQ-009 values, REQ-010/S1 arc half)
  scenarios/span.test.ts    ← NEW (REQ-011)
  scenarios/*.test.ts       ← updated where their REQ was MODIFIED
  invariants/*              ← untouched (REQ-005, REQ-006)
tests/ui/scenarios/         ← updated + NEW for views, settings, sheet, store v2
changes/002-circle-redesign/design/  ← the vendored prototype (visual reference)
scripts/design-shots.mjs    ← NEW dev-only: paired 390×844 screenshots for the review loop
```

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| `theory.circle-of-fifths/REQ-001` (M) | `circleOfFifths()` unchanged; single-spelling render via `spelledMajorAt/spelledMinorAt` in `CircleOfFifths.tsx` | Updated S1 (sharp-preference ring reading) through published + UI; S2 via UI test (title, alignment) |
| `theory.circle-of-fifths/REQ-002` (M) | `spelledMajorAt/…` + spelling preference in `App.tsx`; selection keyed by position so the flip respells in place | S1, S2 as UI tests (flip preference, assert relabel + selection kept) |
| `theory.circle-of-fifths/REQ-003` (M) | `keyView()` + `spanNotesOf` feeding `StaveView`; summary from `keyView().notes`; centre signature in `CircleOfFifths` | Updated S1 (22 notes, roots, summary, centre+stave signature), S2 octave shift, new S3 names view — theory values through published, presence through UI tests |
| `theory.circle-of-fifths/REQ-004` (M) | Signature glyph accent in `CircleOfFifths` + `StaveView`; order marks in `NamesView` via `signatureOf` order | S1–S3 as UI tests asserting accent placement (glyph index, mark text) |
| `theory.circle-of-fifths/REQ-007` (M) | `KeyPanel` view switch; `staveNamesEnabled` in `SettingsDrawer` → `StaveView` labels | S1, S2 UI tests |
| `theory.circle-of-fifths/REQ-008` (M) | `selection-store.ts` v2 + migration; defaults in `App.tsx` | S1–S4 UI tests incl. seeded V1 payload |
| `theory.circle-of-fifths/REQ-009` (A) | `arcOf()` in `domain/arc.ts`; ring/labels in `CircleOfFifths` | S1, S2 through published (positions, spellings, differs flags); S3 UI test (toggle removes arc+degrees+names together) |
| `theory.circle-of-fifths/REQ-010` (A) | `ArcPosition.degree` + `NamesView` degree row; both gated on `degreesEnabled` | S1 through published + UI; S2 UI test |
| `theory.circle-of-fifths/REQ-011` (A) | `spanChoicesOf`/`spanNotesOf` in `domain/span.ts`; pills in `KeyPanel` | S1–S3 through published (choice sets, note lists, counts); pill rendering in UI test |
| `theory.circle-of-fifths/REQ-005, REQ-006` (untouched) | As shipped | Existing tests must stay green — `spanNotesOf` output is asserted ⊆ range in span tests |

## Test strategy

- **Theory scenarios:** REQ-009/010/011 get published-interface tests with
  the delta's exact values; MODIFIED requirements' existing tests are
  *updated to the new scenarios, never deleted* — the diff of each test file
  should read as the delta does.
- **UI scenarios:** Testing Library as in 001 (no jest-dom, shared canvas
  stub now removable with VexFlow gone); one test per UI-observable scenario
  including the V1→V2 store migration with a literal V1 JSON payload.
- **Invariants:** REQ-005/REQ-006 enumeration tests untouched and must pass
  unmodified — they are the guard that the redesign didn't move the theory.
- **Design-review loop (the fidelity check):** the vendored prototype
  (`changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html` +
  `support.js` — the binding visual reference, committed with this change)
  renders in a real browser. A screenshot script drives headless Chromium at
  390×844 over both the prototype and the implementation in matching states
  (same key, variant, view, toggles) and writes paired PNGs. The loop:
  implement → screenshot both → the agent compares the pair and iterates on
  visible differences → the user reviews the pairs and calls remaining
  deltas → repeat until the user is satisfied. This runs per-milestone
  during implementation and as a dedicated review task at the end — not as
  a pass/fail pixel-diff assertion in CI, because anti-aliasing and font
  rasterisation differ run-to-run; judgement stays human-plus-agent.
- **Deliberately not automated:** a pixel-diff threshold test — see above;
  the final acceptance stays the user's side-by-side on the phone (intent
  Q7). Also untested: oklch rendering (browser's job).

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| "Close" isn't close enough at the side-by-side (the intent's named riskiest unknown) | medium | Iterate against the prototype's constants; every geometry value is named and single-sourced, so corrections are local | First implemented component compared early in `pnpm dev`, not at the end |
| Hand-drawn stave regresses notation correctness (ledger lines, stem direction) | low-medium | The prototype's own rules are ~40 lines and the theory tests pin the note *content*; only placement can drift | Stave task's test asserts ledger-line counts and stem directions for known keys |
| V1→V2 migration drops something a user cared about | low | Only `noteNamesVisible` is dropped, by decision; everything else carries | REQ-008/S4 test seeds a real V1 payload |
| Font packages bloat the bundle | low | Subset to woff2 latin (fontsource default); measure at build | `pnpm build` size printed in the hardening task |

## Rollout

Same as 001: static build, run locally; reversal is `git revert` (the V1
store loader in the reverted build treats V2 state as corrupt and falls
back to defaults — acceptable for one user). No flags: the redesign
*replaces* the old UI, per the prototype-wins decision.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | Remove `fast-check` and `@vitest/coverage-v8` in this change, as planned? | The scaffold task | Yes — both are unused (001 converge info items); Article VIII; one command re-adds them if 005's DSP work wants property tests |
| 2 | Fonts via `@fontsource/*` packages (pinned, licence-vetted) rather than hand-vendored woff2 files? | The scaffold task | @fontsource — versioned and boring; vendored files rot |

## Out of band

ADR 0002 (`docs/adr/0002-hand-drawn-stave-replaces-vexflow.md`), proposed at
this plan's gate: the notation renderer follows the design, not engraving
convention — VexFlow out, prototype-geometry SVG in. The prototype is
vendored at `changes/002-circle-redesign/design/` (`Circle 1c Function
Paper.dc.html` + `support.js`) and is the single visual reference for the
design-review loop; its constants are copied into named constants, never
re-derived by eye. A scratch script (`scripts/design-shots.mjs`, dev-only)
captures the paired screenshots; the pairs land under `.sdd/design-review/`
(git-ignored) for comparison.
