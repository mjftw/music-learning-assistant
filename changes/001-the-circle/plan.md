---
type: Implementation Plan
title: The circle — plan
description: A TypeScript web app; pure theory domain with a published interface, SVG circle, notation-rendered stave, schema-validated data files and local storage.
resource: /changes/001-the-circle/plan.md
status: stable
tags: [sdd, plan, "change:001-the-circle"]
sources:
  - resource: /changes/001-the-circle/proposal.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T19:45:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T17:55:18Z
  - by: human:merlin-webster
    at: 2026-09-19T18:49:04Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_phase: approved
---

# Plan: The circle

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | Every close call below is an open question with a recommendation, not a silent pick |
| II — spec precedes implementation | yes | Proposal and both deltas approved before this plan; nothing here adds behaviour |
| III — testable requirements | yes | Every REQ maps to a named test in the mapping table; invariants get property tests |
| IV — separate verification | yes | Scenario tests run through `theory/published` only; reviewer subagents verify per task |
| V — latency budget | no | This change gives no feedback while playing; first applies at 004 |
| VI — instrument is the focus | yes | The key view adds nothing beyond what the spec names; the invalid-variant notice is non-interrupting (`theory.instruments/REQ-003/S2` tests it) |
| VII — no third-party services | yes | A static, local web app: no server, no account, no network call at runtime |
| VIII — simplicity | yes | Four runtime dependencies, each justified below; no state management library, no router, no CSS framework |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | follows | All theory logic is pure functions; IO (storage, data loading) at the edges |
| 3 Types | follows | tsc strict; branded types for note/key ids; sum types for accidentals and modes |
| 4 Errors | follows | Catalogue loading returns a Result carrying valid variants plus notices; no throws for expected failures |
| 6 Architecture | follows | `src/theory/` with `published/`; UI is an interface layer, not a context; storage behind a port |
| 7 Testing | follows | One Vitest test per scenario, named by ID; fast-check property tests for the two invariants; fakes for storage |
| 8 Data and interfaces | follows | Variant files and stored selection validated by Zod schemas — the schema is the contract and the type source |
| 9 Dependencies | follows | Four runtime deps, each replacing well over ~200 owned lines, maintained, MIT/OFL-compatible |
| 12 Configuration | follows | Variant data files parsed once into typed values; skip-with-notice per spec (spec wins over fail-fast, as §12 records) |
| 14 Tooling | follows | pnpm, Prettier, ESLint, tsc strict, Vitest — the §14 TypeScript row exactly |

## Approach

A single-page TypeScript web app, built with Vite, served as static files —
it runs on the laptop and the phone from the same build, satisfying the
product's two-device constraint with one codebase and zero runtime services
(Article VII). All music knowledge lives in `src/theory/` as pure functions
behind `theory/published`: the circle layout, key spelling, the key-view
computation (signature, in-range notes, root emphasis, new accidental,
relative key), and the instrument catalogue parsed from JSON variant files by
Zod schemas. The React UI renders the circle as hand-drawn SVG (it is twelve
labelled wedges — no library earns its place) and the stave via VexFlow
(clefs, key signatures and ledger lines are exactly the wheel not to
reinvent). The last selection is saved to `localStorage` behind a storage
port with a Zod-validated, versioned shape; anything unreadable falls back to
the first-run default. The stack was driven by the product constraints
(two devices, no services) and engineering §1 (TypeScript first for
user-facing work); no constraint pushed toward Rust or a server for this
change.

### Alternatives rejected

| Option | Why not |
|---|---|
| Native/hybrid mobile app (or Tauri/Electron shell) | Two build targets or a wrapper for zero gain at this stage; the browser already reaches both devices; user writes no iOS/Android |
| Rust + WASM theory core | Engineering §1 reserves Rust for performance-critical cores; spelling scales is not one; would double the toolchain on day one |
| Svelte / vanilla TS instead of React | React is the §1 "reach for" for web UIs and the ecosystem standard; Svelte saves bytes we do not need saved; vanilla grows a hand-rolled framework |
| Hand-rolled SVG stave with the Bravura font | Full control, zero dep — but clef metrics, accidental placement and ledger-line rules are hundreds of fiddly lines VexFlow already owns; kept as fallback if VexFlow blocks the emphasis/highlight styling |
| A state-management library (Redux/Zustand) | One screen, one selection object; React state suffices (Article VIII) |
| JSON Schema + codegen for data files | Zod gives schema, validation and inferred types in one step with no generation pipeline; engineering §12's "schema → typed values" verbatim |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | TypeScript on the browser | TS ~5.9, ES2022 target | Product: laptop + phone with one codebase, no runtime services; engineering §1 rank 1. Alternative (native app) rejected above |
| UI framework | React | 19.x | §1 "reach for" for web UIs; smallest learning surface for future slices; Svelte rejected above |
| Notation rendering | VexFlow | 5.x | Stave, clef, key signatures, ledger lines, per-note styling out of the box; hand-rolled SVG kept as named fallback |
| Data validation | Zod | 4.x | One tool for §8 schema-first and §12 typed config; JSON Schema + codegen rejected above |
| Data store | `localStorage` via a port | n/a | The only stored state is one small selection object; a database of any kind is Article VIII violation here |
| Testing | Vitest + fast-check + Testing Library (jsdom) | Vitest 3.x, fast-check 4.x | §14 row; fast-check for the two invariant property tests; Testing Library for the UI-observable scenarios (toggle, persistence, notice) |
| Build / tooling | Vite, pnpm, Prettier, ESLint (typescript-eslint), tsc strict | Vite 7.x | §14 row exactly; one `pnpm check` runs format check, lint, typecheck, tests |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| `react`, `react-dom` | UI rendering | The browser stdlib alternative is a hand-rolled component framework |
| `vexflow` | Stave, clef, key signature, ledger lines, note styling | Music engraving is thousands of lines of glyph metrics we must not own |
| `zod` | Schemas for variant files and stored selection; inferred types | Hand-written validators re-check what types already say — §3 forbids that shape |
| dev: `vite`, `typescript`, `vitest`, `@vitejs/plugin-react`, `fast-check`, `@testing-library/react`, `jsdom`, `prettier`, `eslint` + `typescript-eslint` | Build, check, test | The §14 toolchain; fast-check is the property-test runner §7 asks for |

## Data model

All types live in `src/theory/`; the ones marked *published* are exported via
`theory/published`.

- **NoteLetter** — sum type `A…G`. **Accidental** — sum type
  `natural | sharp | flat` (double accidentals unrepresentable: theoretical
  keys are out of spec). *published*
- **Note** *(published)* — `{ letter, accidental, octave }`; ordering and
  equality by pitch position. Spelling preserved (F♯ ≠ G♭ as values).
- **Mode** — `major | naturalMinor`. **Key** *(published)* —
  `{ tonic: { letter, accidental }, mode }`; a branded `KeyId` string for
  lookups and storage.
- **CirclePosition** *(published)* — `{ index: 0–11, majors: Key[] (1 or 2 —
  2 only at the three enharmonic positions), minor: Key }`.
- **KeyView** *(published)* — `{ signature: Accidental + count, notes:
  Array<{ note: Note, isRoot: boolean }>, newAccidental: Note's letter+accidental | null,
  relative: Key }`. Computed, never stored.
- **Variant** *(published)* — `{ instrumentId, variantId (branded), instrumentName,
  variantName, range: { lowest: Note, highest: Note } }`; constraint
  `lowest < highest`, enforced by the Zod schema.
- **VariantFile** (Zod schema, internal) — the on-disk JSON shape; parsed to
  `Variant` or rejected with a **CatalogueNotice**
  `{ source: string, problem: string }` *(published)*.
- **StoredSelection** (Zod schema, UI adapter) —
  `{ schemaVersion: 1, variantId, keyId, noteNamesVisible }`. Unreadable or
  wrong version ⇒ first-run default; no migration needed at v1.

Variant data files live in `src/theory/instruments/data/*.json`, one per
variant, bundled by Vite glob import — "added over time" means adding a file
and rebuilding; no code change (satisfies `theory.instruments/REQ-002`).

## Interfaces

`src/theory/published/index.ts` — the whole surface other code may use:

- `circleOfFifths(): readonly CirclePosition[]` — pure; the twelve positions
  clockwise from C.
- `keyView(key: Key, variant: Variant): KeyView` — pure; total for every
  selectable key × catalogued variant (no error shape needed: selectable
  inputs cannot fail; unrepresentable keys don't compile).
- `loadCatalogue(files: ReadonlyMap<string, unknown>): { instruments: Instrument[]; notices: CatalogueNotice[] }`
  — pure given file contents; never throws; invalid files become notices
  (the error shape), valid ones always load.
- `relativeOf(key: Key): Key`, `newAccidentalOf(key: Key): … | null` — exposed
  for the UI labels; same functions the key view uses.

UI-side ports (not a context — interface layer):

- `SelectionStore` port: `load(): StoredSelection | null` / `save(s): void`;
  `localStorage` adapter Zod-parses on load, returns `null` on anything
  unreadable (the caller falls back to the default — `REQ-008/S3`).

Events: none emitted, none consumed (approved domain map: `theory` is
synchronous lookups only).

## Structure

```
src/theory/
  published/index.ts        ← the interface above; the only cross-boundary import target
  domain/notes.ts           ← Note, ordering, spelling
  domain/keys.ts            ← Key, signatures, relatives, new accidental
  domain/circle.ts          ← the twelve positions, enharmonic spellings
  domain/key-view.ts        ← notes-in-range computation, root emphasis
  instruments/catalogue.ts  ← Zod schema, parse to Variant, notices
  instruments/data/*.json   ← flute-concert, ocarina-alto-c, ocarina-bass-c
src/ui/
  index.html                ← app entry (Vite `root: 'src/ui'`; build.outDir dist/ at repo top)
  main.tsx                  ← mounts App with builtInCatalogue() + localStorage store
  App.tsx                   ← selection state, wiring
  CircleOfFifths.tsx        ← hand-drawn SVG wedges
  KeyViewStave.tsx          ← VexFlow rendering, names toggle
  InstrumentSelector.tsx    ← tiered instrument → variant
  Notices.tsx               ← non-interrupting notice strip
  selection-store.ts        ← SelectionStore port + localStorage adapter
tests/theory/
  scenarios/*.test.ts       ← one test per scenario, named by ID
  invariants/*.test.ts      ← fast-check properties (REQ-005, REQ-006)
tests/ui/
  scenarios/*.test.tsx      ← toggle, persistence, notice behaviour
```

No code file lives at the repo root or loose in `src/`: all code sits inside
a named directory under `src/` (decision 2026-09-19). Tooling manifests
(`package.json`, lockfile, `tsconfig.json`, `vite.config.ts`, ESLint/Prettier
configs) stay at the repo root — they configure the whole repo and
`pnpm check` runs from there.

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| `theory.circle-of-fifths/REQ-001` | `domain/circle.ts` via `circleOfFifths()`; rings rendered in `CircleOfFifths.tsx` | Scenario tests S1 (position order, ring alignment), S2 (minor selectable) through `published` |
| `theory.circle-of-fifths/REQ-002` | Enharmonic `majors` pairs in `domain/circle.ts`; spelling in `domain/keys.ts` | S1, S2 through `published` |
| `theory.circle-of-fifths/REQ-003` | `domain/key-view.ts` (`keyView()`); rendered in `KeyViewStave.tsx` | S1 G-major-on-flute values, S2 octave shift, through `published` |
| `theory.circle-of-fifths/REQ-004` | `newAccidentalOf` in `domain/keys.ts` | S1, S2, S3 (C major ⇒ null) through `published` |
| `theory.circle-of-fifths/REQ-005` | `keyView()` clamps to `variant.range` by construction | fast-check property: all keys × catalogued variants, every note within range |
| `theory.circle-of-fifths/REQ-006` | Circle ordering in `domain/circle.ts` | fast-check property over all neighbouring pairs |
| `theory.circle-of-fifths/REQ-007` | `noteNamesVisible` state in `App.tsx`, applied in `KeyViewStave.tsx` | UI scenario tests S1 (hidden), S2 (sticks across key change) |
| `theory.circle-of-fifths/REQ-008` | `selection-store.ts` adapter + default in `App.tsx` | UI scenario tests S1 (restore), S2 (first run), S3 (corrupt ⇒ default, usable) |
| `theory.instruments/REQ-001` | `catalogue.ts` + the three data files; `InstrumentSelector.tsx` | Scenario S1 (catalogue contents), S2 (selection is a variant) through `published` |
| `theory.instruments/REQ-002` | Vite glob import of `instruments/data/*.json` through `loadCatalogue` | Scenario S1: extra valid file in the test input appears in the catalogue |
| `theory.instruments/REQ-003` | `loadCatalogue` notices; `Notices.tsx` | Scenario S1 (bad range ⇒ excluded + notice), S2 (notice blocks nothing) |

## Test strategy

- **Unit / scenario:** every delta scenario is one Vitest test named by its
  full ID, calling `theory/published` only; UI-observable scenarios (REQ-007,
  REQ-008, instruments REQ-003/S2) run as Testing Library tests in jsdom with
  a fake `SelectionStore` / seeded `localStorage`.
- **Invariants:** REQ-005/S1 and REQ-006/S1 as fast-check properties.
- **Integration:** none needed — one process, no seams beyond `localStorage`,
  which the adapter test covers.
- **End-to-end:** the acceptance check (G major on flute; Alto→Bass shift) is
  the user's manual sign-off on the laptop, per the intent; not automated.
- **Not tested, and why:** VexFlow's rendered output (glyph positions,
  engraving) — that is the dependency's contract, and pixel assertions are
  brittle; we test the *inputs* we hand it (notes, signature, styling flags).
  Phone legibility — a discovery item in the product brief, not assertable.

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| VexFlow cannot style root emphasis / new-accidental highlight cleanly | low-medium | Fall back to hand-rolled SVG stave with Bravura (named alternative) | First implementation task spikes exactly this before anything builds on it |
| Full-range stave illegible on phone | medium | Layout iteration (wrap, scale, scroll) in a later change; core model untouched | User tries the dev build on the phone early |
| Enharmonic spelling bugs (C♭, double-checking F♯/G♭) | medium | Wrong accidentals shown for edge keys | The REQ-005/REQ-006 properties plus REQ-002/S2 scenario catch spelling drift |

## Rollout

Static build (`pnpm build`) run locally; "deploy" is opening it, per the
product brief's lifecycle. Reversal is `git revert` and rebuild. The stored
selection carries `schemaVersion: 1`; any future shape change bumps it and
falls back to default rather than migrating. Nothing else persists.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | React (as planned) or a lighter view layer? | Scaffolding, first UI task | React — engineering §1's stated reach-for; the alternative saves nothing we need |
| 2 | VexFlow (as planned) or hand-rolled SVG + Bravura for the stave? | The stave tasks | VexFlow, with the spike task as the escape hatch — engraving is the classic do-not-hand-roll |

## Out of band

ADR 0001 (`docs/adr/0001-language-boundary-follows-contexts.md`), decided at
this plan's gate: the language boundary follows the context boundary — Rust
owns `listening` (arriving as WASM at change 004), TypeScript owns `theory`,
`practice` and the UI, and the seam is the `PitchDetected` contract. This
change is all-TypeScript in consequence, not by default.
