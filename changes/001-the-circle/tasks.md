---
type: Task List
title: The circle — tasks
description: 11 tasks across 5 phases — scaffold, theory domain, catalogue and key view, UI, hardening.
resource: /changes/001-the-circle/tasks.md
status: stable
tags: [sdd, tasks, "change:001-the-circle"]
sources:
  - resource: /changes/001-the-circle/plan.md
  - resource: /changes/001-the-circle/proposal.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T20:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T18:38:59Z
  - by: human:merlin-webster
    at: 2026-09-19T18:49:04Z
sdd_id: 001-the-circle
sdd_context: theory
sdd_phase: in-progress
---

# Tasks: The circle

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands.
>
> Steps are 2–5 minutes each. `[P]` after the ID: no dependency on the
> neighbouring `[P]` tasks. Status per task: `todo` · `in-progress` · `done`
> · `blocked`. Requirement and scenario IDs are qualified.

## Phase 1 — Foundations

_Nothing user-visible. Scaffolding, types, test harness._

### T001 · — · Vite + React + TS-strict scaffold with one green `pnpm check`

**Status:** done

**Files**
- Create: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `src/ui/index.html`, `src/ui/main.tsx`, `src/ui/App.tsx`, `src/theory/published/index.ts`, `tests/theory/scenarios/.gitkeep`, `tests/theory/invariants/.gitkeep`, `tests/ui/scenarios/.gitkeep`
- Modify: `AGENTS.md` (paste healthy `check` output), `.gitignore` (`node_modules/`, `dist/`)

**Interfaces**
- Produces: `pnpm dev` · `pnpm build` · `pnpm check` (prettier --check . && eslint . && tsc --noEmit && vitest run) · `pnpm vitest run <file>`
- Produces: `src/ui/App.tsx` — `export function App(): JSX.Element` rendering `<h1>Music Learning Assistant</h1>` (placeholder; replaced in T007)

**Steps**
- [ ] 1. `pnpm create vite . --template react-ts`, then `pnpm add zod vexflow` and `pnpm add -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event fast-check prettier eslint typescript-eslint @types/node`
- [ ] 2. `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, target ES2022; `vite.config.ts` (use `defineConfig` from `vitest/config`): `root: 'src/ui'`, `build: { outDir: '../../dist', emptyOutDir: true }`, and `test: { environment: 'jsdom', dir: '.', include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'] }` with the test dir resolving to the repo root (set `test.root` or run vitest from the repo root so `tests/` is found). No code file sits at the repo root or loose in `src/` — the app entry is `src/ui/index.html` + `src/ui/main.tsx`; only tooling manifests stay at the root
- [ ] 3. `package.json` scripts: `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"check": "prettier --check . && eslint . && tsc --noEmit && vitest run"`, `"test": "vitest run"`; flat `eslint.config.js` with `typescript-eslint` recommended-type-checked
- [ ] 4. Strip the Vite demo (logos, counter, CSS modules demo) to the placeholder `App` above; create empty `src/theory/published/index.ts` (`export {}`) and one smoke test `tests/ui/scenarios/app.smoke.test.tsx` asserting the heading renders
- [ ] 5. Run `pnpm check` — expect all four stages green, `1 passed` test
- [ ] 6. Paste the last ~5 lines of the passing `check` into the `AGENTS.md` "Healthy output" block, replacing the placeholder comment

**Verify** — `pnpm check` → exits 0; prettier, eslint, tsc silent; vitest `Test Files 1 passed`. `grep -c 'FILL THIS IN' AGENTS.md` → `0`

### T002 · — · Theory primitives: notes, keys, scale spelling

**Status:** done

**Files**
- Create: `src/theory/domain/notes.ts`, `src/theory/domain/keys.ts`
- Modify: `src/theory/published/index.ts` (re-export everything below)
- Test: `tests/theory/scenarios/primitives.test.ts`

**Interfaces**
- Produces (all re-exported from `src/theory/published/index.ts`):
  ```ts
  export type NoteLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  export type Accidental = 'natural' | 'sharp' | 'flat'
  export interface PitchClass { readonly letter: NoteLetter; readonly accidental: Accidental }
  export interface Note extends PitchClass { readonly octave: number }
  export type Mode = 'major' | 'naturalMinor'
  export interface Key { readonly tonic: PitchClass; readonly mode: Mode }
  export type KeyId = string & { readonly __brand: 'KeyId' }
  export function keyId(key: Key): KeyId            // e.g. 'G-major', 'Gb-major', 'E-naturalMinor'
  export function pitchPosition(note: Note): number  // semitones above C0; pitchPosition({letter:'F',accidental:'sharp',octave:4}) === 66
  export function scaleNotesOf(key: Key): readonly PitchClass[]  // the 7 degrees, spelled for that key
  ```

**Steps**
- [ ] 1. RED — foundations sanity (not a spec scenario): in `tests/theory/scenarios/primitives.test.ts`, through `src/theory/published`:
  ```ts
  import { describe, expect, test } from 'vitest'
  import { keyId, pitchPosition, scaleNotesOf } from '../../../src/theory/published'
  describe('theory primitives', () => {
    test('G major spells G A B C D E F#', () => {
      expect(scaleNotesOf({ tonic: { letter: 'G', accidental: 'natural' }, mode: 'major' })).toEqual([
        { letter: 'G', accidental: 'natural' }, { letter: 'A', accidental: 'natural' },
        { letter: 'B', accidental: 'natural' }, { letter: 'C', accidental: 'natural' },
        { letter: 'D', accidental: 'natural' }, { letter: 'E', accidental: 'natural' },
        { letter: 'F', accidental: 'sharp' },
      ])
    })
    test('E natural minor spells E F# G A B C D', () => {
      expect(scaleNotesOf({ tonic: { letter: 'E', accidental: 'natural' }, mode: 'naturalMinor' }).map((pitchClass) => `${pitchClass.letter}${pitchClass.accidental}`)).toEqual([
        'Enatural', 'Fsharp', 'Gnatural', 'Anatural', 'Bnatural', 'Cnatural', 'Dnatural',
      ])
    })
    test('pitch positions order F#4 above F4 and C7 above C4', () => {
      expect(pitchPosition({ letter: 'F', accidental: 'sharp', octave: 4 })).toBe(66)
      expect(pitchPosition({ letter: 'C', accidental: 'natural', octave: 7 })).toBe(96)
    })
    test('keyId is stable and distinct for enharmonic spellings', () => {
      expect(keyId({ tonic: { letter: 'F', accidental: 'sharp' }, mode: 'major' })).not.toBe(
        keyId({ tonic: { letter: 'G', accidental: 'flat' }, mode: 'major' }),
      )
    })
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/primitives.test.ts` — expect FAIL: module has no export `scaleNotesOf`
- [ ] 3. GREEN — `notes.ts`: letter semitone table `{C:0,D:2,E:4,F:5,G:7,A:9,B:11}`, accidental offset (−1/0/+1), `pitchPosition = 12 * octave + letterSemitone + offset` (C0 = 0); `keys.ts`: major interval pattern `[2,2,1,2,2,2,1]` from the tonic, natural minor `[2,1,2,2,1,2,2]`, spelled by advancing one letter per degree and choosing the accidental that hits the target semitone; `keyId` as `` `${letter}${accidental === 'sharp' ? '#' : accidental === 'flat' ? 'b' : ''}-${mode}` `` cast to `KeyId`
- [ ] 4. Run the same command — expect PASS (4 passed). Run `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/primitives.test.ts` → `4 passed`; `pnpm check` → exit 0

## Phase 2 — The circle (theory domain)

_Demonstrable: `circleOfFifths()` answers every circle question in the spec._

### T003 · theory.circle-of-fifths/REQ-004 · Signatures, relatives, and the new accidental

**Status:** done

**Files**
- Create: `src/theory/domain/signatures.ts`
- Modify: `src/theory/published/index.ts` (re-export)
- Test: `tests/theory/scenarios/new-accidental.test.ts`

**Interfaces**
- Consumes: `Key`, `PitchClass`, `Mode`, `scaleNotesOf(key: Key): readonly PitchClass[]` (T002, via `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export type SignatureKind = 'sharps' | 'flats' | 'none'
  export interface Signature { readonly kind: SignatureKind; readonly count: number; readonly accidentals: readonly PitchClass[] }
  export function signatureOf(key: Key): Signature   // accidentals in signature order (F# C# G# D# A# E# B# / Bb Eb Ab Db Gb Cb Fb)
  export function relativeOf(key: Key): Key          // major ↔ natural minor, correctly spelled
  export function newAccidentalOf(key: Key): PitchClass | null  // vs the key with one fewer accidental; null when count is 0
  ```

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-004/S1, S2, S3 in `tests/theory/scenarios/new-accidental.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { newAccidentalOf, relativeOf, signatureOf } from '../../../src/theory/published'
  const major = (letter: 'A'|'B'|'C'|'D'|'E'|'F'|'G', accidental: 'natural'|'sharp'|'flat' = 'natural') =>
    ({ tonic: { letter, accidental }, mode: 'major' as const })
  test('theory.circle-of-fifths/REQ-004/S1 — G major’s new sharp is F#', () => {
    expect(newAccidentalOf(major('G'))).toEqual({ letter: 'F', accidental: 'sharp' })
  })
  test('theory.circle-of-fifths/REQ-004/S2 — Bb major’s new flat is Eb', () => {
    expect(newAccidentalOf(major('B', 'flat'))).toEqual({ letter: 'E', accidental: 'flat' })
  })
  test('theory.circle-of-fifths/REQ-004/S3 — C major has nothing to highlight', () => {
    expect(newAccidentalOf(major('C'))).toBeNull()
  })
  test('signature and relative support the key view', () => {
    expect(signatureOf(major('G'))).toEqual({ kind: 'sharps', count: 1, accidentals: [{ letter: 'F', accidental: 'sharp' }] })
    expect(relativeOf(major('G'))).toEqual({ tonic: { letter: 'E', accidental: 'natural' }, mode: 'naturalMinor' })
    expect(relativeOf({ tonic: { letter: 'E', accidental: 'natural' }, mode: 'naturalMinor' })).toEqual(major('G'))
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/new-accidental.test.ts` — expect FAIL: no export `newAccidentalOf`
- [ ] 3. GREEN — `signatures.ts`: derive `Signature` by filtering `scaleNotesOf(key)` for non-natural pitch classes and ordering them along the fifths sequence (sharps `F C G D A E B`, flats `B E A D G C F`); `newAccidentalOf` returns the last accidental in signature order, `null` for `count === 0`; `relativeOf` walks +3/−3 letters with correct accidental via `scaleNotesOf` degree 6 (major→minor) / degree 3 (minor→major)
- [ ] 4. Run the same command — expect PASS (4 passed). `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/new-accidental.test.ts` → `4 passed`

### T004 · theory.circle-of-fifths/REQ-001, REQ-002, REQ-006 · The circle itself

**Status:** done

**Files**
- Create: `src/theory/domain/circle.ts`
- Modify: `src/theory/published/index.ts` (re-export)
- Test: `tests/theory/scenarios/circle.test.ts`, `tests/theory/invariants/adjacency.test.ts`

**Interfaces**
- Consumes: `Key`, `keyId(key: Key): KeyId`, `relativeOf(key: Key): Key`, `signatureOf(key: Key): Signature` (T002/T003, via `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export interface CirclePosition { readonly index: number; readonly majors: readonly Key[]; readonly minors: readonly Key[] }
  export function circleOfFifths(): readonly CirclePosition[]  // 12 positions, index 0 = C at the top, clockwise by fifths; majors.length is 2 exactly at indexes 5 (B/Cb), 6 (F#/Gb), 7 (C#/Db); minors[i] === relativeOf(majors[i])
  ```

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-001/S1 and REQ-002/S1 in `tests/theory/scenarios/circle.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { circleOfFifths, keyId } from '../../../src/theory/published'
  const spell = (key: { tonic: { letter: string; accidental: string } }) =>
    `${key.tonic.letter}${key.tonic.accidental === 'sharp' ? '#' : key.tonic.accidental === 'flat' ? 'b' : ''}`
  test('theory.circle-of-fifths/REQ-001/S1 — the rings are complete and aligned', () => {
    const positions = circleOfFifths()
    expect(positions).toHaveLength(12)
    expect(positions.map((position) => position.majors.map(spell).join('/'))).toEqual([
      'C', 'G', 'D', 'A', 'E', 'B/Cb', 'F#/Gb', 'C#/Db', 'Ab', 'Eb', 'Bb', 'F',
    ])
    expect(spell(positions[0]!.minors[0]!)).toBe('A')   // A minor with C major
    expect(spell(positions[1]!.minors[0]!)).toBe('E')   // E minor with G major
    for (const position of positions) expect(position.minors).toHaveLength(position.majors.length)
  })
  test('theory.circle-of-fifths/REQ-002/S1 — six o’clock offers both F# and Gb major', () => {
    const sixOClock = circleOfFifths()[6]!
    expect(sixOClock.majors.map(spell).sort()).toEqual(['F#', 'Gb'])
    expect(new Set(sixOClock.majors.map(keyId)).size).toBe(2)
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/circle.test.ts` — expect FAIL: no export `circleOfFifths`
- [ ] 3. RED — scenario theory.circle-of-fifths/REQ-006/S1 in `tests/theory/invariants/adjacency.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { circleOfFifths, signatureOf } from '../../../src/theory/published'
  const signedCount = (key: Parameters<typeof signatureOf>[0]) => {
    const signature = signatureOf(key)
    return signature.kind === 'flats' ? -signature.count : signature.count
  }
  test('theory.circle-of-fifths/REQ-006/S1 — every neighbouring pair differs by exactly one accidental', () => {
    const positions = circleOfFifths()
    for (let index = 0; index < 12; index += 1) {
      const current = positions[index]!.majors.map(signedCount)
      const next = positions[(index + 1) % 12]!.majors.map(signedCount)
      const differences = current.flatMap((a) => next.map((b) => Math.abs(a - b)))
      expect(differences, `positions ${index}→${(index + 1) % 12}`).toContain(1)
    }
  })
  ```
- [ ] 4. GREEN — `circle.ts`: start at C major, step clockwise by a perfect fifth (letter +4, accidental to land 7 semitones up); attach the flat-side spelling at indexes 5–7 (Cb, Gb, Db) alongside the sharp-side one; `minors` by mapping `relativeOf` over `majors`
- [ ] 5. Run `pnpm vitest run tests/theory/scenarios/circle.test.ts tests/theory/invariants/adjacency.test.ts` — expect PASS (3 passed). `pnpm check` — green
- [ ] 6. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/circle.test.ts tests/theory/invariants/adjacency.test.ts` → `3 passed`

## Phase 3 — Instruments and the key view

_Demonstrable: `keyView(G major, flute)` returns the acceptance values._

### T005 [P] · theory.instruments/REQ-001, REQ-002, REQ-003 · The catalogue from data files

**Status:** done

**Files**
- Create: `src/theory/instruments/catalogue.ts`, `src/theory/instruments/data/flute-concert.json`, `src/theory/instruments/data/ocarina-alto-c.json`, `src/theory/instruments/data/ocarina-bass-c.json`
- Modify: `src/theory/published/index.ts` (re-export)
- Test: `tests/theory/scenarios/catalogue.test.ts`

**Interfaces**
- Consumes: `Note` (T002, via `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export type VariantId = string & { readonly __brand: 'VariantId' }
  export interface NoteRange { readonly lowest: Note; readonly highest: Note }
  export interface Variant { readonly instrumentId: string; readonly instrumentName: string; readonly variantId: VariantId; readonly variantName: string; readonly range: NoteRange }
  export interface Instrument { readonly instrumentId: string; readonly instrumentName: string; readonly variants: readonly Variant[] }
  export interface CatalogueNotice { readonly source: string; readonly problem: string }
  export interface Catalogue { readonly instruments: readonly Instrument[]; readonly notices: readonly CatalogueNotice[] }
  export function loadCatalogue(files: ReadonlyMap<string, unknown>): Catalogue  // never throws; invalid entries become notices
  export function builtInCatalogue(): Catalogue  // the data/*.json files via import.meta.glob(..., { eager: true })
  ```
- Data file shape (Zod schema in `catalogue.ts`; notes as strings like `"A4"`, `"F#5"`, `"Bb3"`):
  ```json
  { "instrumentId": "ocarina", "instrumentName": "Ocarina", "variantId": "ocarina-alto-c", "variantName": "Alto C", "range": { "lowest": "A4", "highest": "F6" } }
  ```

**Steps**
- [ ] 1. RED — scenarios theory.instruments/REQ-001/S1, REQ-002/S1, REQ-003/S1 in `tests/theory/scenarios/catalogue.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { builtInCatalogue, loadCatalogue } from '../../../src/theory/published'
  const asFile = (json: object) => json as unknown
  test('theory.instruments/REQ-001/S1 — the v1 catalogue', () => {
    const catalogue = builtInCatalogue()
    expect(catalogue.notices).toEqual([])
    expect(catalogue.instruments.map((instrument) => instrument.instrumentId).sort()).toEqual(['flute', 'ocarina'])
    const flute = catalogue.instruments.find((instrument) => instrument.instrumentId === 'flute')!
    expect(flute.variants.map((variant) => variant.variantName)).toEqual(['Concert'])
    expect(flute.variants[0]!.range).toEqual({ lowest: { letter: 'C', accidental: 'natural', octave: 4 }, highest: { letter: 'C', accidental: 'natural', octave: 7 } })
    const ocarina = catalogue.instruments.find((instrument) => instrument.instrumentId === 'ocarina')!
    expect(ocarina.variants.map((variant) => `${variant.variantName}: ${variant.range.lowest.letter}${variant.range.lowest.octave}–${variant.range.highest.letter}${variant.range.highest.octave}`).sort()).toEqual(['Alto C: A4–F6', 'Bass C: A3–F5'])
  })
  test('theory.instruments/REQ-002/S1 — a new valid variant file appears', () => {
    const catalogue = loadCatalogue(new Map([
      ['ocarina-soprano-g.json', asFile({ instrumentId: 'ocarina', instrumentName: 'Ocarina', variantId: 'ocarina-soprano-g', variantName: 'Soprano G', range: { lowest: 'D5', highest: 'B6' } })],
    ]))
    expect(catalogue.notices).toEqual([])
    expect(catalogue.instruments[0]!.variants[0]!.variantName).toBe('Soprano G')
    expect(catalogue.instruments[0]!.variants[0]!.range.lowest).toEqual({ letter: 'D', accidental: 'natural', octave: 5 })
  })
  test('theory.instruments/REQ-003/S1 — a bad file is excluded with a notice and the rest load', () => {
    const catalogue = loadCatalogue(new Map<string, unknown>([
      ['broken.json', asFile({ instrumentId: 'ocarina', instrumentName: 'Ocarina', variantId: 'broken', variantName: 'Broken', range: { lowest: 'F6', highest: 'A4' } })],
      ['ok.json', asFile({ instrumentId: 'flute', instrumentName: 'Flute', variantId: 'flute-concert', variantName: 'Concert', range: { lowest: 'C4', highest: 'C7' } })],
    ]))
    expect(catalogue.instruments.flatMap((instrument) => instrument.variants)).toHaveLength(1)
    expect(catalogue.notices).toHaveLength(1)
    expect(catalogue.notices[0]!.source).toBe('broken.json')
    expect(catalogue.notices[0]!.problem).toMatch(/range/i)
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/catalogue.test.ts` — expect FAIL: no export `loadCatalogue`
- [ ] 3. GREEN — `catalogue.ts`: Zod schema — note string regex `^([A-G])(#|b)?([0-8])$` transformed to `Note`; object schema as the shape above; `.superRefine` rejecting `pitchPosition(lowest) >= pitchPosition(highest)` with message `range: lowest must be below highest`; `loadCatalogue` safeParses each entry, groups valid variants by `instrumentId`, collects failures as `{ source, problem }`; `builtInCatalogue` wraps `import.meta.glob('./data/*.json', { eager: true, import: 'default' })` into the same Map and delegates
- [ ] 4. Run the same command — expect PASS (3 passed). `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/catalogue.test.ts` → `3 passed`

### T006 · theory.circle-of-fifths/REQ-003, REQ-005; theory.circle-of-fifths/REQ-001 (S2), REQ-002 (S2) · The key view

**Status:** done

**Files**
- Create: `src/theory/domain/key-view.ts`
- Modify: `src/theory/published/index.ts` (re-export)
- Test: `tests/theory/scenarios/key-view.test.ts`, `tests/theory/invariants/range-safety.test.ts`

**Interfaces**
- Consumes: `Key`, `Note`, `PitchClass`, `Signature`, `Variant`, `scaleNotesOf`, `signatureOf`, `relativeOf`, `newAccidentalOf`, `pitchPosition`, `builtInCatalogue`, `circleOfFifths` (T002–T005, via `src/theory/published`)
- Produces (re-exported from `src/theory/published/index.ts`):
  ```ts
  export interface KeyViewNote { readonly note: Note; readonly isRoot: boolean }
  export interface KeyView { readonly signature: Signature; readonly notes: readonly KeyViewNote[]; readonly newAccidental: PitchClass | null; readonly relative: Key }
  export function keyView(key: Key, variant: Variant): KeyView  // every key-member note within variant.range, ascending; total for all selectable keys
  ```

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-003/S1, REQ-003/S2, REQ-001/S2, REQ-002/S2 in `tests/theory/scenarios/key-view.test.ts`:
  ```ts
  import { expect, test } from 'vitest'
  import { builtInCatalogue, keyView } from '../../../src/theory/published'
  const variants = () => builtInCatalogue().instruments.flatMap((instrument) => instrument.variants)
  const byId = (id: string) => variants().find((variant) => variant.variantId === id)!
  const gMajor = { tonic: { letter: 'G', accidental: 'natural' }, mode: 'major' } as const
  const label = (note: { letter: string; accidental: string; octave: number }) =>
    `${note.letter}${note.accidental === 'sharp' ? '#' : note.accidental === 'flat' ? 'b' : ''}${note.octave}`
  test('theory.circle-of-fifths/REQ-003/S1 — G major on the flute (acceptance)', () => {
    const view = keyView(gMajor, byId('flute-concert'))
    expect(view.signature).toEqual({ kind: 'sharps', count: 1, accidentals: [{ letter: 'F', accidental: 'sharp' }] })
    expect(view.notes.map((entry) => label(entry.note))).toEqual([
      'C4','D4','E4','F#4','G4','A4','B4','C5','D5','E5','F#5','G5','A5','B5','C6','D6','E6','F#6','G6','A6','B6','C7',
    ])
    expect(view.notes.filter((entry) => entry.isRoot).map((entry) => label(entry.note))).toEqual(['G4', 'G5', 'G6'])
    expect(view.relative).toEqual({ tonic: { letter: 'E', accidental: 'natural' }, mode: 'naturalMinor' })
  })
  test('theory.circle-of-fifths/REQ-003/S2 — Alto C → Bass C shifts everything down one octave', () => {
    const alto = keyView(gMajor, byId('ocarina-alto-c')).notes.map((entry) => label(entry.note))
    const bass = keyView(gMajor, byId('ocarina-bass-c')).notes.map((entry) => label(entry.note))
    expect(alto[0]).toBe('A4')
    expect(bass).toEqual(alto.map((noteLabel) => noteLabel.replace(/\d/, (octave) => String(Number(octave) - 1))))
  })
  test('theory.circle-of-fifths/REQ-001/S2 — E minor stands on its own', () => {
    const view = keyView({ tonic: { letter: 'E', accidental: 'natural' }, mode: 'naturalMinor' }, byId('flute-concert'))
    expect(view.signature).toEqual({ kind: 'sharps', count: 1, accidentals: [{ letter: 'F', accidental: 'sharp' }] })
    expect(view.notes[0]!.note.letter).toBe('C')
    expect(view.notes.some((entry) => entry.isRoot && entry.note.letter === 'E')).toBe(true)
    expect(view.relative).toEqual(gMajor)
  })
  test('theory.circle-of-fifths/REQ-002/S2 — Gb major spells flat, F# major spells sharp', () => {
    const flute = byId('flute-concert')
    const flats = keyView({ tonic: { letter: 'G', accidental: 'flat' }, mode: 'major' }, flute)
    const sharps = keyView({ tonic: { letter: 'F', accidental: 'sharp' }, mode: 'major' }, flute)
    expect(flats.signature).toMatchObject({ kind: 'flats', count: 6 })
    expect(sharps.signature).toMatchObject({ kind: 'sharps', count: 6 })
    expect(flats.notes.every((entry) => entry.note.accidental !== 'sharp')).toBe(true)
    expect(sharps.notes.every((entry) => entry.note.accidental !== 'flat')).toBe(true)
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/key-view.test.ts` — expect FAIL: no export `keyView`
- [ ] 3. RED — scenario theory.circle-of-fifths/REQ-005/S1 in `tests/theory/invariants/range-safety.test.ts`:
  ```ts
  import fc from 'fast-check'
  import { expect, test } from 'vitest'
  import { builtInCatalogue, circleOfFifths, keyView, pitchPosition } from '../../../src/theory/published'
  test('theory.circle-of-fifths/REQ-005/S1 — no displayed note ever leaves the range', () => {
    const keys = circleOfFifths().flatMap((position) => [...position.majors, ...position.minors])
    const variants = builtInCatalogue().instruments.flatMap((instrument) => instrument.variants)
    fc.assert(fc.property(fc.constantFrom(...keys), fc.constantFrom(...variants), (key, variant) => {
      for (const entry of keyView(key, variant).notes) {
        expect(pitchPosition(entry.note)).toBeGreaterThanOrEqual(pitchPosition(variant.range.lowest))
        expect(pitchPosition(entry.note)).toBeLessThanOrEqual(pitchPosition(variant.range.highest))
      }
    }), { numRuns: 200 })
  })
  ```
- [ ] 4. GREEN — `key-view.ts`: for each octave crossing the range, emit every `scaleNotesOf(key)` pitch class as a `Note`, keep those with `pitchPosition` inside `[lowest, highest]`, sort ascending, mark `isRoot` where the pitch class equals the tonic; signature/relative/newAccidental delegate to T003 functions
- [ ] 5. Run `pnpm vitest run tests/theory/scenarios/key-view.test.ts tests/theory/invariants/range-safety.test.ts` — expect PASS (5 passed). `pnpm check` — green
- [ ] 6. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/key-view.test.ts tests/theory/invariants/range-safety.test.ts` → `5 passed`

## Phase 4 — The UI

_Demonstrable: the acceptance walk-through in a browser._

### T007 · theory.circle-of-fifths/REQ-008 · Selection state, storage port, first run

**Status:** done

**Files**
- Create: `src/ui/selection-store.ts`
- Modify: `src/ui/App.tsx` (replace the T001 placeholder), `src/ui/main.tsx`
- Test: `tests/ui/scenarios/selection-persistence.test.tsx` (delete `tests/ui/scenarios/app.smoke.test.tsx`)

**Interfaces**
- Consumes: `Catalogue`, `builtInCatalogue`, `keyId`, `keyView`, `circleOfFifths` (via `src/theory/published`)
- Produces:
  ```ts
  // src/ui/selection-store.ts
  export interface StoredSelection { readonly schemaVersion: 1; readonly variantId: string; readonly keyId: string; readonly noteNamesVisible: boolean }
  export interface SelectionStore { load(): StoredSelection | null; save(selection: StoredSelection): void }
  export function localStorageSelectionStore(storage: Storage): SelectionStore  // key 'music-learning-assistant.selection.v1'; Zod-parses on load; null on anything unreadable
  // src/ui/App.tsx
  export function App(props: { readonly catalogue: Catalogue; readonly selectionStore: SelectionStore }): JSX.Element
  ```
- `App` renders (stable test ids): `data-testid="current-key"` (e.g. `G major`), `data-testid="current-variant"` (e.g. `Ocarina — Bass C`), and persists every selection change via `selectionStore.save`
- First-run default: key `C major`, variant `flute-concert`, `noteNamesVisible: true`

**Steps**
- [ ] 1. RED — scenarios theory.circle-of-fifths/REQ-008/S2, S1, S3 in `tests/ui/scenarios/selection-persistence.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { expect, test } from 'vitest'
  import { builtInCatalogue } from '../../src/theory/published'
  import { App } from '../../src/ui/App'
  import { localStorageSelectionStore } from '../../src/ui/selection-store'
  const storageKey = 'music-learning-assistant.selection.v1'
  test('theory.circle-of-fifths/REQ-008/S2 — first run shows C major on the flute, names on', () => {
    localStorage.clear()
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    expect(screen.getByTestId('current-key').textContent).toBe('C major')
    expect(screen.getByTestId('current-variant').textContent).toBe('Flute — Concert')
    expect(screen.getByRole('switch', { name: /note names/i })).toBeChecked?.() ??
      expect(screen.getByRole('switch', { name: /note names/i }).getAttribute('aria-checked')).toBe('true')
  })
  test('theory.circle-of-fifths/REQ-008/S1 — reopening restores Bb major on Bass C with names hidden', () => {
    localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, variantId: 'ocarina-bass-c', keyId: 'Bb-major', noteNamesVisible: false }))
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    expect(screen.getByTestId('current-key').textContent).toBe('B♭ major')
    expect(screen.getByTestId('current-variant').textContent).toBe('Ocarina — Bass C')
    expect(screen.getByRole('switch', { name: /note names/i }).getAttribute('aria-checked')).toBe('false')
  })
  test('theory.circle-of-fifths/REQ-008/S3 — corrupt storage falls back to the default, usable', () => {
    localStorage.setItem(storageKey, '{not json')
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    expect(screen.getByTestId('current-key').textContent).toBe('C major')
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` — expect FAIL: no module `src/ui/selection-store`
- [ ] 3. GREEN — `selection-store.ts` with a Zod schema for `StoredSelection` (literal `schemaVersion: 1`), `load()` returning `null` on missing key, JSON parse error, or schema failure; `App.tsx` holding `{ variantId, keyId, noteNamesVisible }` in `useState` initialised from `selectionStore.load()` (falling back to the default, also when the stored `variantId`/`keyId` matches nothing in the catalogue/circle), rendering the two test-id labels and an `aria`-labelled note-names switch, saving on every change; `main.tsx` wires `<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(window.localStorage)} />`
- [ ] 4. Run the same command — expect PASS (3 passed). `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` → `3 passed`

### T008 · theory.circle-of-fifths/REQ-001 · The circle rendered and clickable

**Status:** done

**Files**
- Create: `src/ui/CircleOfFifths.tsx`
- Modify: `src/ui/App.tsx` (mount it)
- Test: `tests/ui/scenarios/circle-interaction.test.tsx`

**Interfaces**
- Consumes: `circleOfFifths(): readonly CirclePosition[]`, `Key`, `keyId` (via `src/theory/published`); `App` props from T007
- Produces: `export function CircleOfFifths(props: { readonly selectedKeyId: string; readonly onSelect: (key: Key) => void }): JSX.Element` — an SVG of 12 wedges; every major and minor key is a `<button role="button">` (SVG `<g>` with `role` and `aria-label` like `G major`, `E minor`; both spellings rendered at the enharmonic positions)

**Steps**
- [ ] 1. RED — UI walk of scenario theory.circle-of-fifths/REQ-001/S2 in `tests/ui/scenarios/circle-interaction.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { expect, test } from 'vitest'
  import { builtInCatalogue } from '../../src/theory/published'
  import { App } from '../../src/ui/App'
  import { localStorageSelectionStore } from '../../src/ui/selection-store'
  test('theory.circle-of-fifths/REQ-001/S2 — selecting E minor on the inner ring shows its key view', async () => {
    localStorage.clear()
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    await userEvent.click(screen.getByRole('button', { name: 'E minor' }))
    expect(screen.getByTestId('current-key').textContent).toBe('E minor')
    expect(screen.getByTestId('relative-key').textContent).toBe('Relative major: G major')
    expect(screen.getByTestId('signature-summary').textContent).toBe('1 sharp (F♯)')
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/circle-interaction.test.tsx` — expect FAIL: no accessible button `E minor`
- [ ] 3. GREEN — `CircleOfFifths.tsx`: two concentric rings of wedges from `circleOfFifths()` (outer majors, inner minors, both spellings stacked at indexes 5–7), each an accessible, clickable element calling `props.onSelect(key)`; highlight the wedge whose `keyId` equals `props.selectedKeyId`; in `App.tsx` render `data-testid="relative-key"` as `Relative {mode === 'major' ? 'minor' : 'major'}: <name>` and `data-testid="signature-summary"` as `<count> <kind> (<accidentals>)` (e.g. `1 sharp (F♯)`, `no accidentals` for C major) from `keyView`
- [ ] 4. Run the same command — expect PASS. Run `pnpm vitest run tests/ui` — all green. `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/circle-interaction.test.tsx` → `1 passed`; `pnpm dev` → circle visible, clicking G highlights it (manual glance)

### T009 · theory.circle-of-fifths/REQ-003 (render), REQ-007 · The stave and the names toggle

**Status:** done

**Files**
- Create: `src/ui/KeyViewStave.tsx`
- Modify: `src/ui/App.tsx` (mount it)
- Test: `tests/ui/scenarios/names-toggle.test.tsx`

**Interfaces**
- Consumes: `KeyView`, `keyView` (via `src/theory/published`); `App` state from T007
- Produces: `export function KeyViewStave(props: { readonly view: KeyView; readonly noteNamesVisible: boolean }): JSX.Element` — VexFlow renders treble-clef stave, key signature and the view's notes into an SVG; root notes styled distinctly (fill colour token `--root-emphasis`); the new accidental's notes styled with `--new-accidental`; note names rendered as this component's own `<div data-testid="note-name">` row (not VexFlow annotations), present only when `noteNamesVisible`

**Steps**
- [ ] 1. Spike (time-boxed, from the plan's top risk): in `pnpm dev`, render a VexFlow treble stave with G major's signature and 22 notes C4–C7, with per-note `setStyle` on the three Gs — confirm styling works; if VexFlow cannot style individual notes, stop and report `blocked` citing the plan's named fallback (hand-rolled SVG + Bravura)
- [ ] 2. RED — scenarios theory.circle-of-fifths/REQ-007/S1, S2 in `tests/ui/scenarios/names-toggle.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { expect, test } from 'vitest'
  import { builtInCatalogue } from '../../src/theory/published'
  import { App } from '../../src/ui/App'
  import { localStorageSelectionStore } from '../../src/ui/selection-store'
  const setup = () => {
    localStorage.clear()
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
  }
  test('theory.circle-of-fifths/REQ-007/S1 — switching names off hides them, notes remain', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'G major' }))
    expect(screen.getAllByTestId('note-name').length).toBe(22)
    await userEvent.click(screen.getByRole('switch', { name: /note names/i }))
    expect(screen.queryAllByTestId('note-name')).toHaveLength(0)
    expect(screen.getByTestId('stave')).toBeTruthy()
  })
  test('theory.circle-of-fifths/REQ-007/S2 — the choice sticks across key changes', async () => {
    setup()
    await userEvent.click(screen.getByRole('switch', { name: /note names/i }))
    await userEvent.click(screen.getByRole('button', { name: 'D major' }))
    expect(screen.queryAllByTestId('note-name')).toHaveLength(0)
  })
  ```
- [ ] 3. Run `pnpm vitest run tests/ui/scenarios/names-toggle.test.tsx` — expect FAIL: no element `note-name` / no `stave`
- [ ] 4. GREEN — `KeyViewStave.tsx` as specified under Interfaces (`data-testid="stave"` on the wrapper; VexFlow `Renderer.Backends.SVG` into a ref'd div; the names row maps `view.notes` to labels like `G4`, hidden entirely when `noteNamesVisible` is false); mount in `App.tsx` under the circle
- [ ] 5. Run the same command — expect PASS (2 passed). `pnpm check` — green
- [ ] 6. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/names-toggle.test.tsx` → `2 passed`; `pnpm dev` → G major on flute shows the acceptance picture (signature F♯, C4–C7, Gs emphasised, F♯s highlighted)

### T010 · theory.instruments/REQ-001 (S2), REQ-003 (S2) · Variant selector and the notice strip

**Status:** done

**Files**
- Create: `src/ui/InstrumentSelector.tsx`, `src/ui/Notices.tsx`
- Modify: `src/ui/App.tsx` (mount both)
- Test: `tests/ui/scenarios/selector-and-notices.test.tsx`

**Interfaces**
- Consumes: `Catalogue`, `Variant` (via `src/theory/published`); `App` state from T007
- Produces:
  ```ts
  export function InstrumentSelector(props: { readonly catalogue: Catalogue; readonly selectedVariantId: string; readonly onSelect: (variant: Variant) => void }): JSX.Element
  export function Notices(props: { readonly notices: readonly CatalogueNotice[] }): JSX.Element  // role="status" strip; renders nothing when empty; no dialog, no focus steal, no dismiss requirement
  ```
- Selector layout: one `<optgroup>`-per-instrument `<select aria-label="Instrument">` whose options are variants (`Flute — Concert`, `Ocarina — Alto C`, `Ocarina — Bass C`) — the unit of selection is always a variant

**Steps**
- [ ] 1. RED — scenarios theory.instruments/REQ-001/S2 and REQ-003/S2 in `tests/ui/scenarios/selector-and-notices.test.tsx`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { expect, test } from 'vitest'
  import { builtInCatalogue, loadCatalogue } from '../../src/theory/published'
  import { App } from '../../src/ui/App'
  import { localStorageSelectionStore } from '../../src/ui/selection-store'
  test('theory.instruments/REQ-001/S2 — completing a selection names a variant', async () => {
    localStorage.clear()
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Instrument' }), 'ocarina-alto-c')
    expect(screen.getByTestId('current-variant').textContent).toBe('Ocarina — Alto C')
  })
  test('theory.instruments/REQ-003/S2 — the notice interrupts nothing', async () => {
    localStorage.clear()
    const withBroken = loadCatalogue(new Map<string, unknown>([
      ['flute-concert.json', { instrumentId: 'flute', instrumentName: 'Flute', variantId: 'flute-concert', variantName: 'Concert', range: { lowest: 'C4', highest: 'C7' } }],
      ['broken.json', { instrumentId: 'ocarina', instrumentName: 'Ocarina', variantId: 'broken', variantName: 'Broken', range: { lowest: 'F6', highest: 'A4' } }],
    ]))
    render(<App catalogue={withBroken} selectionStore={localStorageSelectionStore(localStorage)} />)
    expect(screen.getByRole('status').textContent).toContain('broken.json')
    await userEvent.click(screen.getByRole('button', { name: 'G major' }))
    expect(screen.getByTestId('current-key').textContent).toBe('G major')
  })
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selector-and-notices.test.tsx` — expect FAIL: no combobox `Instrument`
- [ ] 3. GREEN — implement both components per Interfaces; changing variant keeps the selected key (the key view recomputes via `keyView`); mount `<Notices>` above the circle, `role="status"`, plain text `⚠ broken.json — <problem>`
- [ ] 4. Run the same command — expect PASS (2 passed). Run `pnpm vitest run` — whole suite green. `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/ui/scenarios/selector-and-notices.test.tsx` → `2 passed`

## Phase 5 — Hardening

### T011 · — · Edge-case sweep, context check, acceptance hand-off

**Status:** done

**Files**
- Test: `tests/ui/scenarios/selection-persistence.test.tsx` (extend)
- Modify: `changes/001-the-circle/notes.md` (acceptance walk-through instructions)

**Steps**
- [ ] 1. Walk the proposal's edge-case table; the only row without a test is "stored selection names a variant/key that no longer exists" (a sub-case of REQ-008/S3's fallback). RED — extend `selection-persistence.test.tsx`:
  ```tsx
  test('theory.circle-of-fifths/REQ-008/S3 — stored selection naming an unknown variant falls back to default', () => {
    localStorage.setItem('music-learning-assistant.selection.v1', JSON.stringify({ schemaVersion: 1, variantId: 'ocarina-soprano-g', keyId: 'G-major', noteNamesVisible: true }))
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} />)
    expect(screen.getByTestId('current-key').textContent).toBe('C major')
    expect(screen.getByTestId('current-variant').textContent).toBe('Flute — Concert')
  })
  ```
  GREEN if T007 already handles it; otherwise fix `App.tsx` initialisation.
- [ ] 2. Run `./scripts/check-contexts.sh` — expect no violations; run `./scripts/check-scenarios.sh --change changes/001-the-circle` — expect every scenario cited by a test
- [ ] 3. Run `pnpm build` — expect a `dist/` bundle with no errors; open `pnpm dev` on the laptop and phone browser once and note any legibility observation in `changes/001-the-circle/notes.md` (observation only — fixes are a later change)
- [ ] 4. Write the acceptance walk-through into `changes/001-the-circle/notes.md`: select Flute — Concert, G major → expect F♯ signature, C4–C7, Gs emphasised, F♯ highlighted as new, "Relative minor: E minor"; toggle names off; switch Alto C → Bass C and watch the octave drop. The user signs off; record their verdict verbatim.
- [ ] 5. Run `pnpm check` — green; paste the output into `changes/001-the-circle/notes.md`

**Verify** — `pnpm check` → exit 0; `./scripts/check-scenarios.sh --change changes/001-the-circle` → no gaps; user's sign-off recorded in `notes.md`

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-001 | T004 (S1), T006 (S2 values), T008 (S2 interaction) | ✅ |
| theory.circle-of-fifths/REQ-002 | T004 (S1), T006 (S2) | ✅ |
| theory.circle-of-fifths/REQ-003 | T006 (S1, S2), T009 (render), T012 (octave-edge), T014 (styling) | ✅ |
| theory.circle-of-fifths/REQ-004 | T003 (S1, S2, S3), T014 (styling) | ✅ |
| theory.circle-of-fifths/REQ-005 | T006 (S1 property), T013 (enumeration) | ✅ |
| theory.circle-of-fifths/REQ-006 | T004 (S1 property) | ✅ |
| theory.circle-of-fifths/REQ-007 | T009 (S1, S2) | ✅ |
| theory.circle-of-fifths/REQ-008 | T007 (S1, S2, S3), T011 (S3 sub-case) | ✅ |
| theory.instruments/REQ-001 | T005 (S1), T010 (S2) | ✅ |
| theory.instruments/REQ-002 | T005 (S1) | ✅ |
| theory.instruments/REQ-003 | T005 (S1), T010 (S2) | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T002 | `scaleNotesOf(key: Key): readonly PitchClass[]` | T003, T006 |
| T002 | `pitchPosition(note: Note): number` | T005 (schema refine), T006 |
| T002 | `keyId(key: Key): KeyId` | T004, T007, T008 |
| T003 | `signatureOf(key: Key): Signature` | T004, T006 |
| T003 | `relativeOf(key: Key): Key` | T004, T006 |
| T003 | `newAccidentalOf(key: Key): PitchClass \| null` | T006 |
| T004 | `circleOfFifths(): readonly CirclePosition[]` | T006, T007, T008 |
| T005 | `builtInCatalogue(): Catalogue` | T006, T007 (tests and wiring) |
| T005 | `loadCatalogue(files: ReadonlyMap<string, unknown>): Catalogue` | T010 (test) |
| T006 | `keyView(key: Key, variant: Variant): KeyView` | T008 (labels), T009 |
| T007 | `localStorageSelectionStore(storage: Storage): SelectionStore` | T008, T009, T010 (tests) |
| T007 | `App(props: { catalogue: Catalogue; selectionStore: SelectionStore }): JSX.Element` | T008, T009, T010 |

## Deferred

- Phone-layout fixes beyond an observation note — the product brief marks
  legibility a discovery item; this change records, the next one acts.
- Circle wedge visual polish (colour by key distance etc.) — not named by any
  requirement; would be scope creep here.

## Phase 6 — Convergence findings (2026-09-19 audit)

### T012 · theory.circle-of-fifths/REQ-003 · Octave-edge range boundaries never drop an in-range note (W1)

**Status:** todo

**Files**
- Modify: `src/theory/domain/key-view.ts`
- Test: `tests/theory/scenarios/key-view.test.ts` (extend)

**Interfaces**
- Consumes: `keyView(key: Key, variant: Variant): KeyView` (unchanged signature); `Variant` from `src/theory/published`
- Produces: same signature; behaviour fix only

**Steps**
- [ ] 1. RED — regression for the audit's repro, in `tests/theory/scenarios/key-view.test.ts` (construct the Variant inline; the catalogue is not involved):
  ```ts
  test('theory.circle-of-fifths/REQ-003 — a range boundary spelled across an octave edge still yields every in-range note (W1 regression)', () => {
    const cFlatBottom = { instrumentId: 'test', instrumentName: 'Test', variantId: 'test-cflat' as VariantId, variantName: 'C flat bottom', range: { lowest: { letter: 'C', accidental: 'flat', octave: 4 }, highest: { letter: 'C', accidental: 'natural', octave: 5 } } }
    const gMajorNotes = keyView({ tonic: { letter: 'G', accidental: 'natural' }, mode: 'major' }, cFlatBottom).notes.map((entry) => `${entry.note.letter}${entry.note.accidental}${entry.note.octave}`)
    expect(gMajorNotes[0]).toBe('Bnatural3')
    const bSharpTop = { instrumentId: 'test', instrumentName: 'Test', variantId: 'test-bsharp' as VariantId, variantName: 'B sharp top', range: { lowest: { letter: 'C', accidental: 'natural', octave: 4 }, highest: { letter: 'B', accidental: 'sharp', octave: 6 } } }
    const cFlatMajorNotes = keyView({ tonic: { letter: 'C', accidental: 'flat' }, mode: 'major' }, bSharpTop).notes.map((entry) => `${entry.note.letter}${entry.note.accidental}${entry.note.octave}`)
    expect(cFlatMajorNotes[cFlatMajorNotes.length - 1]).toBe('Cflat7')
  })
  ```
  (import `VariantId` type from `../../../src/theory/published`; adjust type imports as needed)
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/key-view.test.ts` — expect FAIL: first note is `Cnatural4` (B3 missing) / last note is `Bflat6` (C♭7 missing)
- [ ] 3. GREEN — in `src/theory/domain/key-view.ts`, widen the candidate octave loop by one on each side (`range.lowest.octave - 1` to `range.highest.octave + 1`); the existing `pitchPosition` filter keeps correctness
- [ ] 4. Run the same command — expect PASS. Run `pnpm vitest run tests/theory/invariants/range-safety.test.ts` — still green. `pnpm check` — green
- [ ] 5. REFACTOR — none

**Verify** — `pnpm vitest run tests/theory/scenarios/key-view.test.ts tests/theory/invariants/range-safety.test.ts` → all pass; `pnpm check` → exit 0

### T013 · theory.circle-of-fifths/REQ-005 · The range property enumerates every key × variant (W2)

**Status:** todo

**Files**
- Test: `tests/theory/invariants/range-safety.test.ts` (rewrite the sampling into enumeration)

**Interfaces**
- Consumes: `circleOfFifths`, `builtInCatalogue`, `keyView`, `pitchPosition` from `src/theory/published`

**Steps**
- [ ] 1. RED→GREEN (strengthening an existing green test): replace the `fc.assert`/`fc.constantFrom`/`numRuns` body with full enumeration — for every key drawn from `circleOfFifths()` (all `majors` and all `minors`, 30 keys) and every catalogued variant, assert every `keyView(key, variant).notes` entry lies within `[pitchPosition(range.lowest), pitchPosition(range.highest)]`. Keep the test name `theory.circle-of-fifths/REQ-005/S1 — no displayed note ever leaves the range`. Drop the `fast-check` import if nothing else uses it in the file.
- [ ] 2. Temporarily assert the enumeration count (`expect(checked).toBe(30 * 3 * something)` is NOT required — instead log-free sanity: `expect(pairsChecked).toBe(90)`), keep that assertion in the final test
- [ ] 3. Run `pnpm vitest run tests/theory/invariants/range-safety.test.ts` — PASS with `pairsChecked` = 90. `pnpm check` — green

**Verify** — `pnpm vitest run tests/theory/invariants/range-safety.test.ts` → 1 passed, enumerating 90 pairs; `pnpm check` → exit 0

### T014 · theory.circle-of-fifths/REQ-003, REQ-004 · Styling inputs are tested: root emphasis and new-accidental highlight (W3)

**Status:** todo

**Files**
- Test: `tests/ui/scenarios/stave-styling.test.tsx` (new)

**Interfaces**
- Consumes: `App` (`src/ui/App`), `localStorageSelectionStore` (`src/ui/selection-store`), `builtInCatalogue` (`src/theory/published`)

**Steps**
- [ ] 1. RED — in `tests/ui/scenarios/stave-styling.test.tsx` (afterEach(cleanup), ../../../ depth, no jest-dom): render App (localStorage cleared), click `G major`, query the stave wrapper's emitted SVG and assert: exactly 3 notehead elements carry fill `var(--root-emphasis)` (the three Gs), exactly 3 carry `var(--new-accidental)` (the three F♯s), and no other note carries either token; then click `B♭ major` and assert the highlight moves to the E♭s (fill `var(--new-accidental)` count 3 on flute C4–C7: E♭4, E♭5, E♭6) and roots to the B♭s (B♭4, B♭5, B♭6 → 3). Selector: `container.querySelectorAll('[data-testid="stave"] svg [fill="var(--root-emphasis)"]')` and equivalent — group per notehead if VexFlow emits multiple elements per note (count distinct note groups, not raw path elements; the T009 headless probe in .sdd/reports/001-the-circle/T009.md shows the emitted shape).
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/stave-styling.test.tsx` — expect FAIL only if the styling is wrong; if it passes immediately, verify the RED is honest by temporarily inverting one expected count (then restore) and noting that in the report
- [ ] 3. `pnpm check` — green

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-styling.test.tsx` → 1 passed (or 2 if split per key); `pnpm check` → exit 0
