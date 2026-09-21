---
type: Task List
title: Circle redesign — tasks
description: 13 tasks across 6 phases — foundations, theory (arc/span), store, UI rebuild, design-review loop, hardening.
resource: /changes/002-circle-redesign/tasks.md
status: stable
tags: [sdd, tasks, "change:002-circle-redesign"]
sources:
  - resource: /changes/002-circle-redesign/plan.md
  - resource: /changes/002-circle-redesign/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-20T20:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:49:04Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_phase: in-progress
---

# Tasks: Circle redesign

> Each task is executed by an implementer that has **only its brief**. Every
> task is self-contained: exact files, exact interfaces, exact values, exact
> commands. **No placeholders.** Steps are 2–5 minutes each; a task is one
> sitting and one commit. `[P]` = independent of neighbouring `[P]` tasks.
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> The binding visual reference for every UI task is
> `changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html` (its
> constants, geometry and palette — copy values, never re-derive by eye).
> Theory-level tests import only `src/theory/published`; UI tests render
> `src/ui/App` with Testing Library (no jest-dom; `afterEach(cleanup)`;
> import depth `../../../src/...`).

## Phase 1 — Foundations

### T001 · — · Dependency swap: fonts in, unused dev deps out, theme module

**Status:** done

**Files**
- Modify: `package.json`, `src/ui/main.tsx`
- Create: `src/ui/theme.ts`

**Interfaces**
- Produces: `src/ui/theme.ts` —
  ```ts
  export const paper = { frame: '#efe9dc', card: '#f7f3ea', disc: '#fbf8f1', ink: '#1c1916', inkSoft: '#2b2620', muted: '#6f675c', mutedMore: '#7a7167', faint: '#9a9186', border: '#cfc6b4', borderSoft: '#ddd4c2', hairline: '#e6ddcc', hairlineSoft: '#ece4d5', pillActive: '#e7dcc6', accent: '#8a4b2a', trackOff: '#c8bfad', dash: '#c8bfad', scrim: 'rgba(28,25,22,.32)' } as const
  export const fonts = { body: "'Public Sans', system-ui, sans-serif", display: "'Instrument Serif', serif", mono: "'JetBrains Mono', monospace", music: "'Noto Music', serif" } as const
  ```
  (values transcribed from the design reference)

**Steps**
- [ ] 1. `pnpm remove fast-check @vitest/coverage-v8` (both unused — plan's removal table); `pnpm add @fontsource/instrument-serif @fontsource/noto-music @fontsource/public-sans @fontsource/jetbrains-mono` and `pnpm add -D playwright`
- [ ] 2. In `src/ui/main.tsx`, before other imports: `import '@fontsource/instrument-serif'`, `import '@fontsource/noto-music'`, `import '@fontsource/public-sans'` plus its `/500.css`, `/600.css`, `/700.css` variants, `import '@fontsource/jetbrains-mono'` plus `/500.css`, `/600.css`
- [ ] 3. Create `src/ui/theme.ts` exactly as in Interfaces
- [ ] 4. Run `pnpm check` — expect green (30 tests; the removed packages were imported nowhere)
- [ ] 5. Run `pnpm build` — expect success; note the woff2 assets in the output listing

**Verify** — `pnpm check` → exit 0; `pnpm build` → `dist/` contains `.woff2` assets; `grep -c 'fast-check\|vexflow' package.json` → vexflow still present (removed in T009), fast-check gone

### T002 · — · Design-shots script for the review loop

**Status:** done

**Files**
- Create: `scripts/design-shots.mjs`
- Modify: `package.json` (script: `"design:shots": "node scripts/design-shots.mjs"`)

**Interfaces**
- Produces: `pnpm design:shots [--states c-major-names,g-major-stave,...]` —
  for each named state, writes `.sdd/design-review/<state>.prototype.png` and
  `.sdd/design-review/<state>.app.png`, both 390×844 device-pixel-ratio 2

**Steps**
- [ ] 1. `pnpm exec playwright install chromium` (record the version in the report)
- [ ] 2. Write `scripts/design-shots.mjs`: launch headless Chromium at 390×844; for the prototype, open `file://…/changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html` and drive its state by clicking (its wedges/pills are real elements); for the app, open `http://localhost:5173` (start `pnpm dev` as a child process if not already up) and drive the same state via the same visible controls; screenshot both into `.sdd/design-review/`
- [ ] 3. Define the state matrix as a map in the script: `c-major-names` (defaults), `g-major-stave-full` (G major wedge, stave view), `gb-flat-spelling` (flat pill, 6-o'clock wedge), `e-minor` (inner ring), `settings-open` (gear), `picker-open` (instrument pill)
- [ ] 4. Run `pnpm design:shots --states c-major-names` — expect the two PNGs for the prototype side to exist (the app side will 404-screenshot until the UI tasks land; the script must not crash on that — write the app shot with whatever renders)
- [ ] 5. Run `pnpm check` — green (the script is not part of the test suite)

**Verify** — `ls .sdd/design-review/` → `c-major-names.prototype.png` exists and is 780×1688 pixels; `pnpm check` → exit 0

## Phase 2 — Theory: the arc and the span

### T003 [P] · theory.circle-of-fifths/REQ-009 (S1, S2), REQ-010 (S1 arc), REQ-001 (S1) · Arc positions and preference spelling

**Status:** done

**Files**
- Create: `src/theory/domain/arc.ts`
- Modify: `src/theory/published/index.ts` (re-export), `tests/theory/scenarios/circle.test.ts` (add the S1 preference reading)
- Test: `tests/theory/scenarios/arc.test.ts`

**Interfaces**
- Consumes: `Key`, `PitchClass`, `CirclePosition`, `circleOfFifths()`, `scaleNotesOf`, `keyId` (from `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export type SpellingPreference = 'sharp' | 'flat'
  export function spelledMajorAt(position: CirclePosition, preference: SpellingPreference): Key
  export function spelledMinorAt(position: CirclePosition, preference: SpellingPreference): Key
  export interface ArcPosition { readonly positionIndex: number; readonly signedStep: number; readonly degree: number; readonly scaleName: PitchClass; readonly wedgeName: PitchClass; readonly differsFromWedge: boolean }
  export function arcOf(key: Key, preference: SpellingPreference): readonly ArcPosition[]  // always exactly 7, ordered by positionIndex clockwise from the key's own position -1
  ```
  Semantics: `spelledMajorAt` picks `majors[0]` (sharp-side) or `majors[1]` (flat-side) at the three dual positions, the only spelling elsewhere; `signedStep` is the clockwise distance from the selected key's position in -1…5; `degree` maps steps (-1,0,1,2,3,4,5) → (4,1,5,2,6,3,7); `scaleName` is the selected key's spelling of that note (from `scaleNotesOf`); `wedgeName` is the displayed wedge label under the preference; `differsFromWedge` compares the two.

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-009/S1, REQ-009/S2, REQ-010/S1 (arc half) in `tests/theory/scenarios/arc.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { arcOf, circleOfFifths, keyId, spelledMajorAt } from '../../../src/theory/published'
  const major = (letter: 'A'|'B'|'C'|'D'|'E'|'F'|'G', accidental: 'natural'|'sharp'|'flat' = 'natural') =>
    ({ tonic: { letter, accidental }, mode: 'major' as const })
  const spell = (pitchClass: { letter: string; accidental: string }) =>
    `${pitchClass.letter}${pitchClass.accidental === 'sharp' ? '#' : pitchClass.accidental === 'flat' ? 'b' : ''}`
  test('theory.circle-of-fifths/REQ-009/S1 — G major’s arc spans exactly its seven positions', () => {
    const arc = arcOf(major('G'), 'sharp')
    expect(arc).toHaveLength(7)
    expect(arc.map((position) => spell(position.wedgeName)).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F#', 'G'].sort())
    expect(arc.map((position) => position.signedStep).sort((a, b) => a - b)).toEqual([-1, 0, 1, 2, 3, 4, 5])
  })
  test('theory.circle-of-fifths/REQ-009/S2 — A major names the Ab position G#, accented', () => {
    const arc = arcOf(major('A'), 'sharp')
    const abPosition = arc.find((position) => position.positionIndex === 8)!
    expect(spell(abPosition.wedgeName)).toBe('Ab')
    expect(spell(abPosition.scaleName)).toBe('G#')
    expect(abPosition.differsFromWedge).toBe(true)
    const inKeyPosition = arc.find((position) => position.positionIndex === 3)!
    expect(inKeyPosition.differsFromWedge).toBe(false)
  })
  test('theory.circle-of-fifths/REQ-010/S1 — degrees on the arc: G=1 D=5 C=4 F#=7', () => {
    const arc = arcOf(major('G'), 'sharp')
    const degreeAt = (index: number) => arc.find((position) => position.positionIndex === index)!.degree
    expect(degreeAt(1)).toBe(1)   // G
    expect(degreeAt(2)).toBe(5)   // D
    expect(degreeAt(0)).toBe(4)   // C
    expect(degreeAt(6)).toBe(7)   // F#
  })
  ```
- [ ] 2. RED — scenario theory.circle-of-fifths/REQ-001/S1 (updated reading) appended to `tests/theory/scenarios/circle.test.ts`:
  ```ts
  test('theory.circle-of-fifths/REQ-001/S1 — sharp preference reads the ring C G D A E B F# C# Ab Eb Bb F', () => {
    const readings = circleOfFifths().map((position) => spell(spelledMajorAt(position, 'sharp').tonic))
    expect(readings).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'])
    const flatReadings = circleOfFifths().map((position) => spell(spelledMajorAt(position, 'flat').tonic))
    expect(flatReadings).toEqual(['C', 'G', 'D', 'A', 'E', 'Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'])
  })
  ```
  (reuse the file's existing `spell` helper; keep the original S1 test — `circleOfFifths()` itself is unchanged)
- [ ] 3. Run `pnpm vitest run tests/theory/scenarios/arc.test.ts tests/theory/scenarios/circle.test.ts` — expect FAIL: no export `arcOf` / `spelledMajorAt`
- [ ] 4. GREEN — `src/theory/domain/arc.ts`: `signedStep = ((positionIndex - selectedIndex + 18) % 12) - 6`; arc = the seven positions with step in -1…5; degree from the step map; `scaleName` = `scaleNotesOf(key)[degree - 1]`; `spelledMajorAt`/`spelledMinorAt` pick by preference at dual positions. Find the selected key's position by matching `keyId` against both spellings and both rings
- [ ] 5. Run the same command — expect PASS (5 passed). `pnpm check` — green
- [ ] 6. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/arc.test.ts` → `3 passed`; `pnpm check` → exit 0

### T004 [P] · theory.circle-of-fifths/REQ-011 (S1, S2, S3) · Span choices and span notes

**Status:** done

**Files**
- Create: `src/theory/domain/span.ts`
- Modify: `src/theory/published/index.ts` (re-export)
- Test: `tests/theory/scenarios/span.test.ts`

**Interfaces**
- Consumes: `Key`, `Variant`, `KeyViewNote`, `keyView(key, variant)`, `pitchPosition`, `builtInCatalogue()` (from `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export type Span = { readonly kind: 'full' } | { readonly kind: 'octaves'; readonly count: 1 | 2 | 3 | 4 }
  export interface SpanChoice { readonly span: Span; readonly noteCount: number }
  export function spanChoicesOf(key: Key, variant: Variant): readonly SpanChoice[]  // ascending octave counts, then full; full always present
  export function spanNotesOf(key: Key, variant: Variant, span: Span): readonly KeyViewNote[]  // an octave run starts at the lowest in-range tonic that fits; a span that does not fit degrades to full
  ```
  An n-octave run is `7 * n + 1` consecutive notes of `keyView(key, variant).notes` starting at a tonic (`isRoot`).

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-011/S1, S2, S3 in `tests/theory/scenarios/span.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { builtInCatalogue, pitchPosition, spanChoicesOf, spanNotesOf } from '../../../src/theory/published'
  const variantById = (id: string) => builtInCatalogue().instruments.flatMap((instrument) => instrument.variants).find((variant) => variant.variantId === id)!
  const major = (letter: 'A'|'B'|'C'|'D'|'E'|'F'|'G', accidental: 'natural'|'sharp'|'flat' = 'natural') =>
    ({ tonic: { letter, accidental }, mode: 'major' as const })
  const label = (note: { letter: string; accidental: string; octave: number }) =>
    `${note.letter}${note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : ''}${note.octave}`
  test('theory.circle-of-fifths/REQ-011/S1 — C major on the flute offers 1, 2, 3 octaves and full', () => {
    const flute = variantById('flute-concert')
    const choices = spanChoicesOf(major('C'), flute)
    expect(choices.map((choice) => choice.span.kind === 'full' ? 'full' : choice.span.count)).toEqual([1, 2, 3, 'full'])
    const twoOctaves = spanNotesOf(major('C'), flute, { kind: 'octaves', count: 2 })
    expect(twoOctaves).toHaveLength(15)
    expect(label(twoOctaves[0]!.note)).toBe('C4')
    expect(label(twoOctaves[14]!.note)).toBe('C6')
    expect(spanNotesOf(major('C'), flute, { kind: 'full' })).toHaveLength(22)
  })
  test('theory.circle-of-fifths/REQ-011/S2 — G major on the flute caps at 2 octaves', () => {
    const choices = spanChoicesOf(major('G'), variantById('flute-concert'))
    expect(choices.map((choice) => choice.span.kind === 'full' ? 'full' : choice.span.count)).toEqual([1, 2, 'full'])
  })
  test('theory.circle-of-fifths/REQ-011/S3 — F# major on Bass C offers only full', () => {
    const bassC = variantById('ocarina-bass-c')
    const choices = spanChoicesOf(major('F', 'sharp'), bassC)
    expect(choices.map((choice) => choice.span.kind)).toEqual(['full'])
    for (const entry of spanNotesOf(major('F', 'sharp'), bassC, { kind: 'octaves', count: 1 })) {
      expect(pitchPosition(entry.note)).toBeGreaterThanOrEqual(pitchPosition(bassC.range.lowest))
      expect(pitchPosition(entry.note)).toBeLessThanOrEqual(pitchPosition(bassC.range.highest))
    }
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/span.test.ts` — expect FAIL: no export `spanChoicesOf`
- [ ] 3. GREEN — `src/theory/domain/span.ts`: walk `keyView(key, variant).notes`; for each octave count 1–4, the run exists if some tonic index `s` has `s + 7 * count <= notes.length - 1`; choices = existing counts ascending then full; `spanNotesOf` slices from the lowest qualifying tonic, or returns the full list when the span is `full` or does not fit
- [ ] 4. Run the same command — expect PASS (3 passed). `pnpm check` — green (existing REQ-005/REQ-006 invariant tests untouched and still green)
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/span.test.ts` → `3 passed`; `pnpm check` → exit 0

## Phase 3 — Stored state v2

### T005 · — · Selection store v2 with v1 migration

**Status:** done

**Files**
- Modify: `src/ui/selection-store.ts`
- Test: `tests/ui/scenarios/selection-store-v2.test.ts` (store-level; the App-level REQ-008 scenarios land in T011)

**Interfaces**
- Consumes: nothing new
- Produces:
  ```ts
  export type StoredSpan = 'full' | 'oct-1' | 'oct-2' | 'oct-3' | 'oct-4'
  export interface StoredSelection { readonly schemaVersion: 2; readonly variantId: string; readonly keyId: string; readonly spelling: 'sharp' | 'flat'; readonly view: 'names' | 'stave'; readonly span: StoredSpan; readonly degreesEnabled: boolean; readonly distanceRingEnabled: boolean; readonly staveNamesEnabled: boolean }
  export const firstRunDefaults: Omit<StoredSelection, 'variantId' | 'keyId'>  // spelling 'sharp', view 'names', span 'full', degrees true, ring true, staveNames false
  export interface SelectionStore { load(): StoredSelection | null; save(selection: StoredSelection): void }
  export function localStorageSelectionStore(storage: Storage): SelectionStore
  ```
  Same storage key as 001 (`music-learning-assistant.selection.v1`). `load()` Zod-parses a union: V2 passes through; 001's V1 shape (`schemaVersion: 1`, `variantId`, `keyId`, `noteNamesVisible`) migrates by carrying `variantId`/`keyId` and applying `firstRunDefaults` (dropping `noteNamesVisible`, per the delta); anything else → `null`.

**Steps**
- [ ] 1. RED — store-level tests (App scenarios come in T011) in `tests/ui/scenarios/selection-store-v2.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { firstRunDefaults, localStorageSelectionStore } from '../../src/ui/selection-store'
  const storageKey = 'music-learning-assistant.selection.v1'
  test('a v2 payload round-trips', () => {
    localStorage.clear()
    const store = localStorageSelectionStore(localStorage)
    const selection = { schemaVersion: 2 as const, variantId: 'ocarina-bass-c', keyId: 'Bb-major', spelling: 'flat' as const, view: 'stave' as const, span: 'oct-1' as const, degreesEnabled: false, distanceRingEnabled: true, staveNamesEnabled: true }
    store.save(selection)
    expect(store.load()).toEqual(selection)
  })
  test('a 001-shape v1 payload migrates: ids carried, the rest defaulted', () => {
    localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, variantId: 'ocarina-alto-c', keyId: 'G-major', noteNamesVisible: false }))
    const loaded = localStorageSelectionStore(localStorage).load()
    expect(loaded).toEqual({ schemaVersion: 2, variantId: 'ocarina-alto-c', keyId: 'G-major', ...firstRunDefaults })
  })
  test('junk still loads as null', () => {
    localStorage.setItem(storageKey, '{not json')
    expect(localStorageSelectionStore(localStorage).load()).toBeNull()
    localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 3, other: true }))
    expect(localStorageSelectionStore(localStorage).load()).toBeNull()
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-store-v2.test.ts` — expect FAIL: no export `firstRunDefaults`
- [ ] 3. GREEN — rewrite `selection-store.ts` per Interfaces (Zod discriminated union on `schemaVersion`; migration function from the V1 branch). The old `StoredSelection` (v1) type is replaced; `tests/ui/scenarios/selection-persistence.test.tsx` will fail to compile against the new shape — update ONLY its seeded payloads to keep the suite green (its assertions still describe the old App and will be rewritten in T011; if an assertion can no longer pass against the unchanged App, leave the assertion intact — the App is unchanged in this task, so only the store import surface matters)
- [ ] 4. Run `pnpm check` — expect green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-store-v2.test.ts` → `3 passed`; `pnpm check` → exit 0

## Phase 4 — The UI, component by component

### T006 · theory.circle-of-fifths/REQ-001 (S2), REQ-002 (S1, S2) · The circle rebuilt: wedges, hues, ring, centre disc, ♯/♭ pill

**Status:** done

**Files**
- Modify: `src/ui/CircleOfFifths.tsx` (full rebuild), `src/ui/App.tsx` (spelling/degrees/ring state from `firstRunDefaults`; key title element)
- Test: `tests/ui/scenarios/circle-interaction.test.tsx` (rewrite), `tests/ui/scenarios/circle-spelling.test.tsx` (new)

**Interfaces**
- Consumes: `circleOfFifths`, `spelledMajorAt`, `spelledMinorAt`, `arcOf`, `signatureOf`, `keyId`, `SpellingPreference` (published, T003); `paper`, `fonts` (T001); `firstRunDefaults` (T005); `keyLabel` (`src/ui/key-label.ts`, 001)
- Produces:
  ```ts
  export function CircleOfFifths(props: { readonly selectedKeyId: string; readonly spelling: SpellingPreference; readonly degreesEnabled: boolean; readonly distanceRingEnabled: boolean; readonly onSelectKey: (key: Key) => void; readonly onSelectSpelling: (preference: SpellingPreference) => void }): JSX.Element
  ```
  Geometry and colour from the design reference: 378×378 viewBox, CX=CY=189; minor band radii 72–100, major band 100–142; distance ring 148–153 with a 3.1° notch either side of each degree numeral at r=150.5; outside names at r=170; wedge hue `(index * 30 + 25) % 360` via `oklch(0.855|0.785 …)` unselected and `oklch(0.40 0.125 h)` selected; ring colours `oklch(DIST_L[d] DIST_C[d] 28|258)` with `DIST_L = [0.420,0.665,0.750,0.818,0.868,0.906,0.930]`, `DIST_C = [0.160,0.150,0.124,0.096,0.068,0.042,0.023]`; centre disc r=72 `#fbf8f1` with five 128px signature lines 9px apart from y=171, clef 𝄞 at (140,187), signature glyphs from x=163 step 13, newest accented `#8a4b2a`; the ♯/♭ pill at (189,230). Every wedge is `role="button"` with `aria-label` like `G major`, `E minor`, `G♭ major`; the pill halves are buttons named `sharp` and `flat`.

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-002/S1, REQ-002/S2 in `tests/ui/scenarios/circle-spelling.test.tsx`:
  ```tsx
  import { cleanup, render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { afterEach, expect, test } from 'vitest'
  import { builtInCatalogue } from '../../src/theory/published'
  import { App } from '../../src/ui/App'
  import { localStorageSelectionStore } from '../../src/ui/selection-store'
  afterEach(cleanup)
  const renderApp = () => {
    localStorage.clear()
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
  }
  test('theory.circle-of-fifths/REQ-002/S1 — the preference respells all three dual positions', async () => {
    renderApp()
    expect(screen.getByRole('button', { name: 'B major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'F♯ major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'C♯ major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'G♯ minor' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'flat' }))
    expect(screen.getByRole('button', { name: 'C♭ major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'G♭ major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'D♭ major' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'A♭ minor' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'F♯ major' })).toBeNull()
    expect(screen.getByRole('button', { name: 'C major' })).toBeTruthy()
  })
  test('theory.circle-of-fifths/REQ-002/S2 — the selection follows the position across a respell', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: 'flat' }))
    await userEvent.click(screen.getByRole('button', { name: 'G♭ major' }))
    expect(screen.getByTestId('current-key').textContent).toBe('G♭ major')
    await userEvent.click(screen.getByRole('button', { name: 'sharp' }))
    expect(screen.getByTestId('current-key').textContent).toBe('F♯ major')
  })
  ```
- [ ] 2. RED — scenario theory.circle-of-fifths/REQ-001/S2 rewritten in `tests/ui/scenarios/circle-interaction.test.tsx`: selecting `E minor` sets `current-key` to `E minor`, and the E-minor wedge and G-major wedge carry the same `data-position-index` attribute (alignment); drop the 001 assertions on `relative-key`/`signature-summary` test ids (deleted with the old panel)
- [ ] 3. Run both test files — expect FAIL: no button named `flat`
- [ ] 4. GREEN — rebuild `CircleOfFifths.tsx` per Interfaces (wedge paths, ring arcs with notches when `degreesEnabled`, numerals, outside scale names with accent when `differsFromWedge`, centre disc, pill); `App.tsx` holds `{ spelling, degreesEnabled, distanceRingEnabled }` alongside the existing selection, keyed by position so the spelling flip re-derives the selected `keyId` via `spelledMajorAt`/`spelledMinorAt`; key title `data-testid="current-key"` in `fonts.display` 46px
- [ ] 5. Run `pnpm vitest run tests/ui` — expect the two rewritten files green; `stave-styling`, `names-toggle`, `selector-and-notices`, `selection-persistence` still green (App keeps the old panel components mounted until T009/T010/T011)
- [ ] 6. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/circle-spelling.test.tsx tests/ui/scenarios/circle-interaction.test.tsx` → `3 passed`; `pnpm check` → exit 0; `pnpm design:shots --states c-major-names` → compare the circle region of the pair by eye in the report

### T007 · theory.circle-of-fifths/REQ-003 (S3), REQ-004 (S1, S2, S3), REQ-010 (S1) · Key panel shell and the names view

**Status:** todo

**Files**
- Create: `src/ui/KeyPanel.tsx`, `src/ui/NamesView.tsx`
- Modify: `src/ui/App.tsx` (mount KeyPanel below the title; `view` state from store defaults)
- Test: `tests/ui/scenarios/names-view.test.tsx` (new; replaces `stave-styling.test.tsx`, which is deleted in T009 with the old stave)

**Interfaces**
- Consumes: `scaleNotesOf`, `signatureOf`, `keyView`, `arcOf` (published); `paper`, `fonts` (T001)
- Produces:
  ```ts
  export function KeyPanel(props: { readonly view: 'names' | 'stave'; readonly onSelectView: (view: 'names' | 'stave') => void; readonly children: React.ReactNode }): JSX.Element  // the card: rounded 14px, #f7f3ea, hairline rows; names|stave pill pair (buttons named 'names'/'stave'); summary row slot
  export function NamesView(props: { readonly key_: Key; readonly degreesEnabled: boolean }): JSX.Element  // seven flex columns: mark row (mono 10px, e.g. '♯1', newest accented #8a4b2a bold), name (26px 600), degree row (mono 11px), per the design reference
  ```
  Marks: for each accidental-bearing scale note, `kind` + its 1-based index in the signature order (`signatureOf`); the newest (index = count) accented. Test ids: `data-testid="names-column"` per column, `data-testid="note-mark"`, `data-testid="note-degree"`.

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-003/S3, REQ-004/S1, REQ-004/S2, REQ-004/S3, REQ-010/S1 (names half + arc agreement) in `tests/ui/scenarios/names-view.test.tsx` (render App, click keys; assert): G major → seven columns G A B C D E F♯ regardless of variant; F♯ column mark `♯1` with accent style (`data-accented="true"`), no other accented mark; degrees row 1–7 matching the arc numerals already asserted at theory level; B♭ major → marks `♭1` on B♭ and `♭2` accented on E♭; C major → zero `note-mark` elements with content and no accented signature glyph (`data-testid="signature-glyph"` elements from T006 all `data-accented="false"`)
- [ ] 2. Run — expect FAIL: no `names-column` elements
- [ ] 3. GREEN — implement per Interfaces; App mounts `<KeyPanel view={view} …><NamesView …/></KeyPanel>` (stave arrives T009; choosing `stave` before then renders the names view unchanged — the pill state still switches for T009 to build on)
- [ ] 4. Run the file — expect PASS (5 passed); `pnpm check` green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` → `5 passed`; `pnpm check` → exit 0; `pnpm design:shots --states c-major-names` → panel region compared in the report

### T008 · theory.circle-of-fifths/REQ-009 (S3), REQ-010 (S2) · Settings drawer and header

**Status:** todo

**Files**
- Create: `src/ui/SettingsDrawer.tsx`, `src/ui/Header.tsx`
- Modify: `src/ui/App.tsx` (mount both; gear opens drawer)
- Test: `tests/ui/scenarios/settings.test.tsx`

**Interfaces**
- Consumes: `paper`, `fonts` (T001); App state from T006/T007
- Produces:
  ```ts
  export function Header(props: { readonly variantLabel: string; readonly rangeLabel: string; readonly onOpenPicker: () => void; readonly onOpenSettings: () => void }): JSX.Element  // pill: dot, label, range, ▼ (button 'Instrument'); gear button named 'Settings'
  export function SettingsDrawer(props: { readonly open: boolean; readonly onClose: () => void; readonly staveNamesEnabled: boolean; readonly degreesEnabled: boolean; readonly distanceRingEnabled: boolean; readonly onToggleStaveNames: () => void; readonly onToggleDegrees: () => void; readonly onToggleRing: () => void }): JSX.Element
  ```
  Drawer: right-side 266px panel + scrim, both `display:none` when closed; three rows exactly as the design reference (titles 'Note names on the stave', 'Scale degrees', 'Distance ring'), each row a `role="switch"` with `aria-checked`; close ✕ and scrim click both call `onClose`. Never opens itself (Article VI).

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-009/S3 and REQ-010/S2 in `tests/ui/scenarios/settings.test.tsx`: open Settings via the gear; switch `Distance ring` off → the arc (`data-testid="distance-ring"`), its numerals (`data-testid="arc-degree"`) and outside names (`data-testid="arc-name"`) are all absent while every wedge button (27 of them: 12+3 majors, 12 minors — dual positions show one spelling) remains and `current-key` is unchanged; switch `Scale degrees` off (ring back on) → no `arc-degree` and no `note-degree` anywhere, `arc-name` still present, marks unchanged
- [ ] 2. Run — expect FAIL: no button named `Settings`
- [ ] 3. GREEN — implement per Interfaces; wire toggles to App state (already persisted via the T005 store fields on every change)
- [ ] 4. Run the file — expect PASS (2 passed); `pnpm check` green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/settings.test.tsx` → `2 passed`; `pnpm design:shots --states settings-open` → drawer pair compared in the report

### T009 · theory.circle-of-fifths/REQ-003 (S1, S2), REQ-007 (S1, S2), REQ-011 (pills) · The hand-drawn stave, spans, and VexFlow removal

**Status:** todo

**Files**
- Create: `src/ui/StaveView.tsx`
- Delete: `src/ui/KeyViewStave.tsx`, `tests/ui/scenarios/stave-styling.test.tsx`, `tests/ui/scenarios/names-toggle.test.tsx`
- Modify: `src/ui/App.tsx` (span state; StaveView into KeyPanel; span pills + summary rows), `package.json` (`pnpm remove vexflow`), `tests/setup.ts` (drop the canvas stub — nothing needs it now)
- Test: `tests/ui/scenarios/stave-view.test.tsx`

**Interfaces**
- Consumes: `spanChoicesOf`, `spanNotesOf`, `signatureOf`, `keyView`, `Span` (published, T004); `paper`, `fonts` (T001); `KeyPanel` (T007)
- Produces:
  ```ts
  export function StaveView(props: { readonly key_: Key; readonly variant: Variant; readonly span: Span; readonly staveNamesEnabled: boolean }): JSX.Element
  ```
  Drawing rules from the design reference, verbatim constants: five lines 10px apart, top line at y = 16 + max(0, ceil((highestDiatonicIndex − 38) / 2)) · 10; diatonic index = octave·7 + letterIndex, F5 = 38; y(index) = topY + (38 − index) · 5; notehead rx 6.1 / 5.2 (>12 notes) / 4.3 (>18), ry = rx·0.76, tilt −20°; stems 24px, up when index < 34, x offset ±(rx−0.4); ledger lines every 2 indices ≤28 and ≥40, extending rx+3 either side; signature glyphs from x=42 step 8.5 with flat riding 4.5px high at size 24 vs sharp 20, newest accented; clef 𝄞 31px at (20, topY+18); notes spread from x0 = max(signatureEnd+14, 62) to 318; tonic noteheads and their name labels `#8a4b2a`, others `#1c1916`/`#4a4136`; name row (mono 8.5/10/11.5px by density) only when `staveNamesEnabled`. Test ids: `data-testid="stave"`, `data-testid="stave-note"` (with `data-note="G4"`, `data-root="true|false"`), `data-testid="stave-note-name"`, `data-testid="span-pill"` (accessible name `1 oct`/`2 oct`/`3 oct`/`full`), `data-testid="span-caption"`, `data-testid="range-summary"`.

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-003/S1, REQ-003/S2, REQ-007/S1, REQ-007/S2 in `tests/ui/scenarios/stave-view.test.tsx`: (S1) G major + flute + stave view + full → 22 `stave-note` elements `C4…C7`, exactly three `data-root="true"` (G4 G5 G6), `range-summary` text `22 notes · C4–C7`, one accented `signature-glyph`; (S2) same key, Alto C → Bass C → every `data-note` octave drops by one; (REQ-007/S1) switching from names to stave shows noteheads and zero `stave-note-name` elements; (REQ-007/S2) enable 'Note names on the stave' in settings, select D major → `stave-note-name` elements present and view still stave; plus REQ-011 pill rendering: G major flute shows pills `1 oct`, `2 oct`, `full` and clicking `1 oct` leaves 8 `stave-note` elements with caption `1 oct from G · 8`
- [ ] 2. Run — expect FAIL: no `stave-view.test` targets exist
- [ ] 3. GREEN — implement `StaveView.tsx` per the drawing rules; App: span state (reset to `full` when the stored span choice no longer exists for the new key/variant), pills row and summary row inside `KeyPanel`; delete `KeyViewStave.tsx` + the two old test files; `pnpm remove vexflow`; drop the canvas stub from `tests/setup.ts`
- [ ] 4. Run `pnpm vitest run tests/ui` — all green; `pnpm check` — green; `pnpm build` — green (vexflow gone from the bundle)
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` → `5 passed`; `grep -c vexflow package.json pnpm-lock.yaml` → `0` in package.json; `pnpm design:shots --states g-major-stave-full` → stave pair compared in the report

### T010 · theory.instruments/REQ-001 (S2), REQ-003 (S2) — unchanged spec, new surface · Instrument bottom sheet

**Status:** todo

**Files**
- Create: `src/ui/InstrumentSheet.tsx`
- Delete: `src/ui/InstrumentSelector.tsx`
- Modify: `src/ui/App.tsx` (sheet state; Header pill opens it)
- Test: `tests/ui/scenarios/selector-and-notices.test.tsx` (rewrite to the sheet)

**Interfaces**
- Consumes: `Catalogue`, `Variant` (published); `Header` (T008); `paper`, `fonts` (T001)
- Produces:
  ```ts
  export function InstrumentSheet(props: { readonly open: boolean; readonly catalogue: Catalogue; readonly selectedVariantId: string; readonly onSelect: (variant: Variant) => void; readonly onClose: () => void }): JSX.Element
  ```
  Bottom sheet + scrim per the design reference: header row 'Instrument' + ✕; one row per variant (all instruments flattened, catalogue order): instrument name, variant name, mono range `C4–C7`, ✓ on the selected row (row = button named `Flute Concert` etc.). Scrim and ✕ close; selecting closes. `theory.instruments` requirements are NOT modified — these tests re-express the same scenarios against the new surface.

**Steps**
- [ ] 1. RED — rewrite `selector-and-notices.test.tsx`: (theory.instruments/REQ-001/S2) open the sheet via the header pill (button `Instrument`), click row `Ocarina Alto C` → `current-variant` reads `Ocarina — Alto C`, sheet closed; (theory.instruments/REQ-003/S2) render App with the broken-catalogue fixture from the 001 version of this file → `role="status"` notice names `broken.json`, and selecting G major on the circle still updates `current-key` (notice interrupts nothing)
- [ ] 2. Run — expect FAIL: no button named `Instrument`
- [ ] 3. GREEN — implement per Interfaces; delete `InstrumentSelector.tsx`; keep `Notices.tsx` mounted above the circle as in 001
- [ ] 4. Run `pnpm vitest run tests/ui` — all green; `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/selector-and-notices.test.tsx` → `2 passed`; `pnpm design:shots --states picker-open` → sheet pair compared in the report

### T011 · theory.circle-of-fifths/REQ-008 (S1, S2, S3, S4) · Final wiring: persistence, layout column, footer

**Status:** todo

**Files**
- Modify: `src/ui/App.tsx` (persist all preferences; centred 390px column on wide screens; dashed footer placeholder `PLAY ALONG · DRONE · TEMPO`; body background `#ddd6c7` outside the column, `#efe9dc` inside), `src/ui/main.tsx` (if the column wrapper lives there)
- Test: `tests/ui/scenarios/selection-persistence.test.tsx` (rewrite to the four new scenarios)

**Interfaces**
- Consumes: everything produced by T005–T010
- Produces: the complete App per the design reference; no new exports

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-008/S1, theory.circle-of-fifths/REQ-008/S2, theory.circle-of-fifths/REQ-008/S3, theory.circle-of-fifths/REQ-008/S4 rewritten in `selection-persistence.test.tsx` (test names carry these full IDs): (S1) seed the v2 payload `{ schemaVersion: 2, variantId: 'ocarina-bass-c', keyId: 'Bb-major', spelling: 'flat', view: 'stave', span: 'oct-1', degreesEnabled: false, distanceRingEnabled: true, staveNamesEnabled: true }` → App shows `B♭ major`, `Ocarina — Bass C`, the stave view at `1 oct` with name labels, no degree numerals, ring present, flat pill active (`aria-pressed` or `data-active`); (S2) empty storage → `C major`, `Flute — Concert`, names view, sharp active, degrees + ring on; (S3) `'{not json'` → the S2 defaults, app interactive (click G major works); (S4) seed the 001 v1 payload `{ schemaVersion: 1, variantId: 'ocarina-alto-c', keyId: 'G-major', noteNamesVisible: false }` → `G major` on `Ocarina — Alto C` with every new preference at its S2 default
- [ ] 2. Run — expect FAIL on the v2 assertions (old test shape gone)
- [ ] 3. GREEN — persist every preference change through the T005 store; wrap the app in the centred column (`max-width: 390px; margin: 0 auto; min-height: 100vh`), page background per the design reference; footer placeholder block verbatim from it (dashed border, ▶ disc, caption)
- [ ] 4. Run `pnpm vitest run tests/ui` — all green. `pnpm check` — green. `pnpm build` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` → `4 passed`; `pnpm check` → exit 0

## Phase 5 — Design review

### T012 · — · The design-review loop, run to convergence

**Status:** todo

**Files**
- Modify: `changes/002-circle-redesign/notes.md` (findings per round), any `src/ui/*.tsx` file a visible difference traces to
- Test: none new — the suite guards behaviour while visuals change

**Steps**
- [ ] 1. Run `pnpm design:shots` for the full state matrix (all six states from T002)
- [ ] 2. Compare each prototype/app pair; list every visible difference (geometry, colour, type, spacing, weight) in `notes.md` under `## Design review — round 1`, each with the component and constant it traces to
- [ ] 3. Fix the listed differences (constants only — behaviour is test-guarded; `pnpm check` must stay green after every fix)
- [ ] 4. Re-shoot and re-compare; repeat rounds until no visible difference remains at 1:1 viewing, recording each round in `notes.md`
- [ ] 5. Present the final pairs to the user for the deltas only they can call; apply their calls; record their response verbatim in `notes.md`

**Verify** — `pnpm check` → exit 0; `notes.md` contains at least one review round and the user's response to the final pairs

## Phase 6 — Hardening

### T013 · — · Edge sweep, checks, acceptance hand-off

**Status:** todo

**Files**
- Test: existing suites (extend only if a gap is found)
- Modify: `changes/002-circle-redesign/notes.md` (acceptance walk-through), `AGENTS.md` (refresh the healthy-output block to the new suite counts)

**Steps**
- [ ] 1. Walk the proposal's edge-case table; confirm each row has a passing test (first-run → REQ-008/S2 · v1 state → S4 · no-octave-run → REQ-011/S3 · spelling-flip-selected → REQ-002/S2 · ring-off → REQ-009/S3); add a test only where a row lacks one
- [ ] 2. Run `./scripts/check-scenarios.sh --change changes/002-circle-redesign` — every scenario cited; `./scripts/check-contexts.sh` — clean; `pnpm check` — green; `pnpm build` — record the bundle size against 001's 1.43 MB (vexflow gone, fonts added)
- [ ] 3. Refresh the `AGENTS.md` healthy-output block with the current passing `pnpm check` tail
- [ ] 4. Write the acceptance walk-through into `notes.md`: on the phone, side-by-side with the prototype — same design; G major flute values (22 notes C4–C7); ♯/♭ respells B/F♯/C♯ positions; ring and degrees toggles; names/stave + span pills; picker sheet; settings drawer; reload restores everything. End with `**User verdict:** _pending_`
- [ ] 5. `pnpm check` output pasted into `notes.md`

**Verify** — `pnpm check` → exit 0; `./scripts/check-scenarios.sh --change changes/002-circle-redesign` → no gaps; acceptance walk-through present with verdict pending

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-001 (M) | T003 (S1), T006 (S2) | ✅ |
| theory.circle-of-fifths/REQ-002 (M) | T006 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-003 (M) | T007 (S3), T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-004 (M) | T007 (S1, S2, S3) | ✅ |
| theory.circle-of-fifths/REQ-007 (M) | T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-008 (M) | T011 (S1–S4); store mechanics T005 | ✅ |
| theory.circle-of-fifths/REQ-009 (A) | T003 (S1, S2), T008 (S3) | ✅ |
| theory.circle-of-fifths/REQ-010 (A) | T003 (S1 arc), T007 (S1 names), T008 (S2) | ✅ |
| theory.circle-of-fifths/REQ-011 (A) | T004 (S1, S2, S3), T009 (pill rendering) | ✅ |
| theory.circle-of-fifths/REQ-005, REQ-006 (untouched) | guard: existing tests must stay green throughout; T004 asserts span ⊆ range | ✅ |
| theory.instruments (untouched) | T010 re-expresses S2 scenarios against the sheet | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `paper`, `fonts` (`src/ui/theme.ts`) | T006–T011 |
| T002 | `pnpm design:shots [--states …]` | T006–T012 verify steps |
| T003 | `arcOf(key: Key, preference: SpellingPreference): readonly ArcPosition[]` | T006, T007 |
| T003 | `spelledMajorAt/spelledMinorAt(position, preference): Key` | T006 |
| T004 | `spanChoicesOf(key, variant): readonly SpanChoice[]` · `spanNotesOf(key, variant, span): readonly KeyViewNote[]` | T009 |
| T005 | `StoredSelection` (v2), `firstRunDefaults`, `localStorageSelectionStore` | T006 (defaults), T008 (toggles), T011 (scenarios) |
| T007 | `KeyPanel`, `NamesView` | T009 (mounts StaveView inside KeyPanel) |
| T008 | `Header`, `SettingsDrawer` | T009 (stave-names setting), T010 (pill opens sheet) |

## Deferred

- Wide/desktop layout — decision 2026-09-20; a later change.
- Removing the dashed footer placeholder — it leaves with change 003's real
  play-along bar.
- The vendored design's other studies (1a, 1b, colour studies) — reference
  history only; 1c is the binding design.
