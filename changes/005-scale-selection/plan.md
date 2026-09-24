---
type: Implementation Plan
title: scale-selection — plan
description: A theory scale catalogue layered on the unchanged circle key; run-fitting generalised by notes-per-octave; a practice Scale choice persisted per ring in store v4
resource: /changes/005-scale-selection/plan.md
status: stable
tags: [sdd, plan, "change:005-scale-selection"]
sources:
  - resource: /changes/005-scale-selection/proposal.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-fable-5-1
  at: 2026-09-23T21:19:19Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T23:06:37Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_phase: approved
---

# Plan: scale-selection

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | Every behaviour here traces to the approved deltas or a decision in `docs/decisions.md`; the two close calls are Open questions, not choices |
| II — spec precedes implementation | yes | Proposal and both deltas approved 2026-09-23; the preview target state is what this plan builds against |
| III — testable requirements | yes | Every ADDED/MODIFIED requirement maps to a scenario test below, through `theory/published` or `practice/published` or the rendered UI |
| IV — separate verification | yes | Tests first per task (`tdd`); task-reviewer and converge reviewer never the implementer |
| VI — instrument is the focus | yes | The Scale sheet is opened deliberately (key name / formula row), never appears on its own; a scale change mid-run restarts without a count-in and never pauses (REQ-007) |
| VII — no third-party services | yes | Catalogue is data in the repo; no new runtime dependency |
| VIII — simplicity | yes | No new dependency; one new theory module (`scales.ts`), one new practice module (`scale-choice.ts`), one new UI sheet; the circle, signature, ring and transport code are untouched |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | Follows | Catalogue and spelling are pure functions in `theory/domain`; the session (imperative shell) only gains a setter |
| 3 Types | Follows | `ScaleId` is a string-literal union (illegal ids unrepresentable); `Accidental` widens to a five-value union; the chromatic formula is a sum type (`fixed` / `byHome`), not a flag |
| 4 Errors | Follows | No new failure paths at runtime; the store's parse still returns `null` → defaults (REQ-011) |
| 6 Architecture | Follows | Theory publishes the catalogue and spelled scales; practice consumes them through `theory/published` only; the UI imports only `published/` |
| 7 Testing | Follows | One test per scenario, by ID, through published interfaces; the range invariant broadened to every scale |
| 8 Data and interfaces | Follows | Stored selection bumps to schema v4 with a Zod schema and a v3→v4 migration, like v2→v3 |
| 9 Dependencies | Follows | None added |
| 14 Tooling | Follows | `pnpm check`, `pnpm test:timing` unchanged |

## Approach

The choice is driven by what the repository already is (an approved TS SPA
whose `theory` context already owns the circle, the key view and the
run-fitting, and whose `practice` session already owns the traversal) — no
new stack question arises. `theory` gains a **scale catalogue**
(`src/theory/domain/scales.ts`): sixteen `Scale` entries, each a formula of
(degree, semitones-above-tonic) pairs, a family, a title, an
arpeggio-eligibility flag and, for classical melodic minor, a descending
formula. A pure `spelledScaleOf(key, scale)` spells the formula on the
key's tonic (letters follow the degree; accidentals follow from the
semitone, now including 𝄪/𝄫) and labels each degree against the family's
home reference. `Key` keeps its circle semantics untouched — `mode` still
means *which ring*, and drives the signature, the relative key, the
distance ring and the wedge labels exactly as today (ADR 0004); the chosen
`Scale` is layered on top of the key by the functions that produce
notes: `keyView` and `runOf` take a `scale` argument, the 7-note
assumptions in `traversal.ts` (`7 * octaveCount`, `ARPEGGIO_DEGREES`)
become "notes per octave" and "degree ∈ {1,3,5}" from the formula, and
`runOf`/`sequenceOf` merge into one `traversalOf` that returns both the
notes the stave draws and the playing order (the two differ only for a
split-direction scale). A pure `inlineAccidentalsOf(signature, run)`
decides the courtesy accidentals the stave draws. `practice` gains a
**Scale choice** (`src/practice/domain/scale-choice.ts`: the per-ring pair
of ids, its defaults, and the resolution for the current key's mode); the
session gets `setScaleChoice`, resolves the scale, computes the *effective
shape* (arpeggio only where the catalogue allows it — the same clamp
pattern as `effectiveOctaves`) and restarts on change like any traversal
change. The UI adds a `ScaleSheet` (the Tempo sheet's shape), a formula
row under the key name, the key name itself becomes "tonic + scale
title", `NamesView` gains the degree-label/altered accent and the
descending-alternative row, `StaveView` draws inline accidentals, the
Traversal sheet greys out arpeggio when the effective shape differs, and
the selection store bumps to v4 with the per-ring scale ids. The design
file is vendored under `changes/005-scale-selection/design/` and
`scripts/design-shots.mjs` is pointed at it for the screenshot review loop,
as in 002 and 003.

### Alternatives rejected

| Option | Why not |
|---|---|
| Fold the scale into `Key` (`mode` becomes one of sixteen scales) | `mode` is load-bearing for the circle: signature, relative key, ring arc, wedge labels, spelling at the dual positions (REQ-001/002/009/010 of circle-of-fifths). The intent (Q2) keeps all of that keyed to the plain key; layering keeps that code untouched and its tests green. Recorded as ADR 0004. |
| A new theory capability `theory.scales` with its own spec | The proposal and roadmap were approved as modifications to `theory.circle-of-fifths`; REQ-012 already owns run-fitting and REQ-003 the key view, and the catalogue is the input to both. A new spec would split one behaviour across two documents. |
| Derive arpeggio eligibility from "has degrees 1, 3, 5" | Factually wrong for the design: the pentatonics and blues have those degrees yet are excluded (delta corrected 2026-09-23). A catalogued boolean is the truth. |
| Keep `Accidental` at three values and spell G♯ harmonic minor's F𝄪 as G | Wrong theory in a theory-teaching tool; the design spells 𝄪/𝄫. The five-value union costs a symbol map and a two-more-branch `accidentalForTarget`. |
| Keep `runOf` + `sequenceOf` separate and add a third function for the descending form | Three functions whose outputs must agree is a consistency trap; one `traversalOf` returning `{ run, sequence }` makes the split-direction case a local concern with one test surface. |
| Store the scale choice as a single id (not per ring) | Intent decided per-ring persistence (major-ring and minor-ring choices survive switching rings); the design keeps `majorScale`/`minorScale` separately. |
| Compute inline accidentals in `StaveView` | Notation rules ("holds for the rest of the run") are theory facts that REQ-003 tests through `theory/published`; the view stays a renderer. |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | TypeScript (strict), browser SPA | as repo | Unchanged; nothing here touches the Rust audio boundary (the session posts the same `SoundCommand`s) |
| Framework | React 19 + Vite | as repo | Unchanged |
| Data store | `localStorage` behind `SelectionStore`, Zod-parsed | as repo | Schema v4 (below); same port, same migration pattern as v2→v3 |
| Testing | Vitest + Testing Library; Playwright for `design-shots` (dev-only) and `test:timing` | as repo | Unchanged |
| Build / tooling | pnpm, Prettier, ESLint, tsc, `pnpm check` | as repo | Unchanged |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| — | none | — |

## Data model

**theory**

```ts
type Accidental = "doubleFlat" | "flat" | "natural" | "sharp" | "doubleSharp";
//   ACCIDENTAL_OFFSET: -2 -1 0 +1 +2; labels 𝄫 ♭ (none) ♯ 𝄪
//   accidentalForTarget: diff 2 → doubleSharp, diff 10 → doubleFlat
//   NOTE_STRING_PATTERN (instrument data files) is unchanged — variants
//   never carry double accidentals.

type ScaleId =
  | "major" | "major-pentatonic" | "lydian" | "mixolydian" | "harmonic-major"
  | "natural-minor" | "harmonic-minor" | "melodic-minor-classical"
  | "melodic-minor-jazz" | "minor-pentatonic" | "blues" | "dorian"
  | "phrygian" | "locrian" | "whole-tone" | "chromatic";
type ScaleFamily = "major" | "minor" | "either";
type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
interface ScaleDegree { readonly degree: Degree; readonly semitones: number } // 0–11, ascending
type Formula =
  | { readonly kind: "fixed"; readonly degrees: readonly ScaleDegree[] }
  | { readonly kind: "byHome";                      // chromatic only: per ring, per signature
      readonly major: { readonly sharps: readonly ScaleDegree[]; readonly flats: readonly ScaleDegree[] };
      readonly minor: { readonly sharps: readonly ScaleDegree[]; readonly flats: readonly ScaleDegree[] } };
interface Scale {
  readonly id: ScaleId;
  readonly family: ScaleFamily;
  readonly name: string;         // sheet row: "Melodic minor · classical"
  readonly title: string;        // key name suffix: "melodic minor"
  readonly ascending: Formula;
  readonly descending: Formula | null;   // classical melodic minor: natural minor
  readonly note: string | null;  // "↓ natural" | "both ways" — formula suffix
  readonly offersArpeggio: boolean;
}
const SCALES: readonly Scale[]   // in the design's order; `scaleById(id)` total

interface ScaleNote {            // one degree of a scale spelled on a tonic
  readonly pitchClass: PitchClass;
  readonly degree: Degree;
  readonly degreeLabel: string;  // "♭3", "♯4", "5" — vs the family's home
  readonly altered: boolean;     // degreeLabel carries an accidental
}
interface SpelledScale {
  readonly ascending: readonly ScaleNote[];
  readonly descending: readonly ScaleNote[] | null;
  readonly formulaLine: string;  // "1 2 3 ♯4 5 6 7" (+ " · ↓ natural")
}
```

Home reference for `degreeLabel`: the major steps for family `major`, the
natural-minor steps for family `minor`, and for `either` the reference of
the key's mode (the design's `home`). Chromatic picks the ring's home (`major` for a major key, `minor` for a
minor key), then `sharps` when the key's signature kind is `sharps` or
`none`, `flats` when `flats`. (Amended at T006: the design's single
major-home pattern spells A♯ minor's ♯♯6 as a triple sharp.)

The blues formula carries two degree-5 entries (♭5 and 5), as designed;
nothing dedupes by degree.

`KeyViewNote` gains `degree`, `degreeLabel`, `altered` (copied from the
`ScaleNote` it came from). `Run` is `readonly KeyViewNote[]` as today.

**practice**

```ts
interface ScaleChoice { readonly major: ScaleId; readonly minor: ScaleId }
const defaultScaleChoice: ScaleChoice = { major: "major", minor: "natural-minor" };
function chosenScaleIdFor(choice: ScaleChoice, mode: Mode): ScaleId
```

`SessionSnapshot` gains `scale: Scale`, `spelledScale: SpelledScale`,
`scaleChoice: ScaleChoice` and `effectiveShape: Shape`.

**ui — stored selection v4**

```ts
schemaVersion: 4
scale: { major: ScaleId; minor: ScaleId }   // z.enum over the sixteen ids
```

Migration `v3 → v4`: copy every v3 field, add `scale` at its defaults
(REQ-011/S4). v1/v2 chain through v3 as today. Unknown ids fail the enum →
the whole payload parses as `null` → first-run defaults, the existing
"unreadable state" rule (REQ-011). Reversal: an older build reads a v4
payload as unparseable and falls back to defaults — the same one-way
behaviour every earlier bump had.

## Interfaces

**`theory/published` — added**

```ts
export type { Scale, ScaleId, ScaleFamily, ScaleNote, SpelledScale, Degree };
export { SCALES, scaleById, scalesForMode, spelledScaleOf, inlineAccidentalsOf, traversalOf };

scalesForMode(mode: Mode): readonly Scale[]           // family === mode | "either", catalogue order
spelledScaleOf(key: Key, scale: Scale): SpelledScale
keyView(key: Key, variant: Variant, scale: Scale): KeyView   // signature/newAccidental from key; notes from scale
fittingOctaveCounts(key, variant, scale): readonly OctaveCount[]
effectiveOctavesOf(key, variant, scale, octaves): Octaves
traversalOf(key, variant, scale, traversal): { readonly run: readonly KeyViewNote[]; readonly sequence: readonly SequenceNote[] }
//   run: what the stave draws, left to right (REQ-003 as amended);
//   sequence: playing order, runIndex into `run`
inlineAccidentalsOf(signature: Signature, run: readonly KeyViewNote[]): readonly (Accidental | null)[]
//   null = nothing drawn; otherwise the glyph to draw before that notehead
```

`runOf`/`sequenceOf` are removed from `published/` (their only consumer is
the session); `scaleNotesOf(key)` stays — it is the *key's* diatonic scale
and the circle's ring/arc/relative code depends on that meaning.

Errors: none of these can fail for a catalogued scale on a circle key
(`accidentalForTarget` still throws for an unreachable spelling — a bug,
not a runtime path; the exhaustive invariant test proves it is never hit).

**`practice/published` — added**

```ts
export type { ScaleChoice };
export { defaultScaleChoice, chosenScaleIdFor };
Session.setScaleChoice(choice: ScaleChoice): void   // recompute + restartIfPlaying, like setTraversal
createSession(context, traversal, scaleChoice, settings, deps)
```

`summaryLineOf(traversal, effectiveOctaves, effectiveShape, settings)` —
the shape word is the effective one.

**Events** — `TargetAdvanced` unchanged (`src/practice/published/target-advanced.schema.ts`); it now carries any catalogued note.

## Structure

```
src/theory/
  domain/scales.ts              ← NEW: SCALES, scaleById, scalesForMode, spelledScaleOf
  domain/notes.ts               ← Accidental widened; accidentalForTarget handles ±2
  domain/labels.ts              ← 𝄪 𝄫 symbols
  domain/key-view.ts            ← keyView(key, variant, scale); notes carry degree/label/altered
  domain/traversal.ts           ← notes-per-octave from the formula; traversalOf; degree-based arpeggio
  domain/notation.ts            ← NEW: inlineAccidentalsOf (signature + holds-for-the-run rule)
  published/index.ts            ← exports above; runOf/sequenceOf dropped
src/practice/
  domain/scale-choice.ts        ← NEW: ScaleChoice, defaults, chosenScaleIdFor
  domain/session.ts             ← setScaleChoice; effectiveShape; traversalOf; caption extremes = lowest/highest of run
  domain/settings.ts            ← summaryLineOf takes the effective shape
  published/index.ts
src/ui/
  ScaleSheet.tsx                ← NEW: "Scales on <tonic>", hint, rows name/formula/tick (Tempo sheet's shape)
  ScaleRow.tsx                  ← NEW: the "SCALE · <formula> ▼" pill under the key name (opens the sheet)
  key-label.ts                  ← keyLabel(key, scale) = "<tonic> <title>"; heading size 46/40/34 by length
  App.tsx                       ← scaleChoice in state + store v4; key name opens the sheet; wiring
  NamesView.tsx                 ← columns from spelledScale: degreeLabel (accent when altered), alt row (↓E♭), 26/21/15px by count
  StaveView.tsx                 ← inline accidental glyphs (Noto Music) from inlineAccidentalsOf
  TraversalSheet.tsx            ← arpeggio pill unavailable (ink #c3baab, no-op) when the scale offers none
  selection-store.ts            ← v4 schema + migrateFromV3
changes/005-scale-selection/design/   ← vendored "Hear the Scale.dc.html" + support.js
scripts/design-shots.mjs        ← PROTOTYPE_PATH/STATES → this change's prototype (dev-only)
docs/adr/0004-scale-layers-on-the-key.md
tests/theory/scenarios/scales.test.ts, key-view.test.ts, traversal-run.test.ts, traversal-sequence.test.ts, notation.test.ts
tests/theory/invariants/sequence-range.test.ts        ← broadened to every scale
tests/practice/scenarios/session-scale.test.ts, session-traversal.test.ts, summary-line.test.ts
tests/ui/scenarios/scale-sheet.test.tsx, names-view.test.tsx, stave-view.test.tsx, traversal-sheet.test.tsx, selection-store.test.ts, selection-persistence.test.tsx, app-session.test.tsx
```

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| practice.session/REQ-012 (Scale choice) | `scale-choice.ts`, `Session.setScaleChoice`, `ScaleSheet`, `ScaleRow`, `keyLabel`, `NamesView` alt row, `TraversalSheet` unavailable pill; `scalesForMode` for the family filter | S1 `app-session` (tap Lydian → heading, formula row, names view); S2 `scale-sheet` (rows and hint for G major and E minor); S3 `traversal-sheet` (pentatonic → arpeggio unavailable; Lydian → back); S4 `names-view` (melodic minor alt row) |
| practice.session/REQ-001 (modified) | `effectiveShape` in the session; `TraversalSheet` shape row | S1–S4 existing tests unchanged; S5 `traversal-sheet` |
| practice.session/REQ-007 (modified) | `setScaleChoice` → `restartIfPlaying` | S1–S3 existing; S4 `session-scale` (playing at 9, Lydian → position 0, no count-in) |
| practice.session/REQ-011 (modified) | store v4, `migrateFromV3`, `defaultScaleChoice`, App wiring | S1 `selection-persistence` (Dorian restored); S2 first run; S3 v2 payload; S4 v3 payload → defaults |
| theory.circle-of-fifths/REQ-003 (modified) | `keyView(key, variant, scale)`, `spelledScaleOf`, `traversalOf` (written-out run), `inlineAccidentalsOf`, range summary from the scale's in-range notes | S1, S2, S4 existing (default scale); S3 `key-view` (Lydian names, C♯ altered); S5 `key-view` (pentatonic 5 names, 11-note run); S6 `notation` + `traversal-run` (melodic minor written out, ♮/♯/♭ held) |
| theory.circle-of-fifths/REQ-012 (modified) | `traversal.ts`: notes-per-octave from the formula, degree-based arpeggio, `traversalOf` with the descending form | S1–S4 existing; S5 `sequence-range` invariant over all 16 scales; S6 `traversal-sequence` (melodic minor 15 notes); S7 `traversal-run` (pentatonic 11 notes) |

## Test strategy

- **Unit (theory scenarios):** the catalogue's spelling and labels for the
  scenarios' named scales; `traversalOf` for the split-direction and
  five-note cases; `inlineAccidentalsOf` for the held-accidental case.
  Deliberately not unit-tested: each of the sixteen formulas individually
  beyond what a scenario names — see Open question 1.
- **Integration (practice scenarios):** the session through `practice/published`
  with the existing fakes: `setScaleChoice` mid-run restarts (REQ-007/S4);
  effective shape and summary line (REQ-001).
- **End-to-end (ui scenarios):** the Scale sheet, the heading and formula
  row, the names view's alt row, the traversal sheet's unavailable pill,
  store v4 round-trip and v3 migration. Design fidelity via
  `scripts/design-shots.mjs` screenshots against the vendored prototype,
  reviewed by the user at acceptance (not a pixel-diff gate, as in 002/003).
- **Invariant:** `sequence-range` enumerates every variant × every key
  spelling × every scale × fitting octaves + full × both shapes × three
  directions (18,816 sequences — measured at T006; the plan's original ~43k estimate overcounted the fitting octave choices): every note in range, every arpeggio note in
  the scale's run, and `accidentalForTarget` never throws (this is the
  proof that no catalogued scale on any circle key needs a triple
  accidental).
- **Not tested, and why:** audible correctness of the tones (the pitch
  path is unchanged from 003 and measured by `test:timing`); the exact
  glyph placement of inline accidentals (screenshot review, like every
  other stave detail per ADR 0002).

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| Generalising `traversal.ts` regresses the diatonic run-fitting 003 shipped | medium | Wrong octave counts or runs for plain major/minor | The existing REQ-012/S1–S4 and REQ-001/S1–S4 tests stay untouched and must stay green; the first theory task is a pure refactor under them (notes-per-octave = 7) before any new scale is added |
| A formula in the catalogue is wrong (a wrong semitone in Locrian, say) | medium | The tool teaches a wrong scale | Open question 1 (a scenario table pinning every formula); the invariant test catches unspellable results but not wrong-but-spellable ones |
| Double accidentals leak into places typed for three (labels, stave names, store, instrument data) | low | Type error at compile time, not runtime — the union widening makes every `Record<Accidental, …>` fail to compile until handled | `pnpm check` |
| The chromatic scale on C♯/C♭ spells with several 𝄪/𝄫 | certain | Ugly but not wrong; only at the two extreme dual positions | Open question 2 |
| The written-out ↑↓ stave for melodic minor (15 noteheads) crowds the 342px stave | low | Small noteheads (existing `rx` steps down past 12 and 18 notes) | Screenshot review; the full-range flute run already draws 22 |

## Rollout

No flag. Reversible by reverting the merge; the store bump is one-way in
the same sense as every earlier bump (an old build sees a v4 payload as
unreadable and starts from defaults). `pnpm test:timing` runs unchanged at
converge and finish — the transport and scheduler are not touched.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | *Answered 2026-09-24: yes — added as practice.session/REQ-012/S5.* The scenarios pin Lydian, major pentatonic and melodic minor by name; the other thirteen formulas are only "listed" (REQ-012/S2). Add one scenario (practice.session/REQ-012/S5) giving every scale's formula line as the sheet shows it on a major-ring key and on a minor-ring key, so each formula has a test? It is a spec addition (a new scenario in the approved delta), so it needs your nod. | the theory catalogue task's RED step | Yes — a theory-teaching tool should have every formula pinned by a test; I will write the table from the design's data and you review the music, not the code |
| 2 | *Answered 2026-09-24: keep the design's rule.* Chromatic follows the key's spelling, so on C♯ major it reads C♯ C𝄪 D♯ D𝄪 E♯ F♯ F𝄪 … (five double sharps), and on C♭ the mirror in double flats. The design does exactly this; conventional notation would mix naturals in. Keep the design's rule? | nothing — one line of data either way | Keep the design's rule (it is the approved source of truth and consistent); revisit only if it reads badly at acceptance |
