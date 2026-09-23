---
type: Task List
title: scale-selection — tasks
description: 19 tasks across 5 phases — theory catalogue and generalised run-fitting, practice Scale choice, UI sheet/views/store v4, hardening
resource: /changes/005-scale-selection/tasks.md
status: stable
tags: [sdd, tasks, "change:005-scale-selection"]
sources:
  - resource: /changes/005-scale-selection/plan.md
  - resource: /changes/005-scale-selection/proposal.md
generated:
  by: claude-fable-5-1
  at: 2026-09-24T00:10:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T23:22:44Z
sdd_id: 005-scale-selection
sdd_context: practice
sdd_phase: approved
---

# Tasks: scale-selection

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.** "Add error handling",
> "handle edge cases", "like T011 but for Y", `TBD`, and a test described in
> prose instead of written out are all failures.
>
> Steps are 2–5 minutes each. A task is 3–8 steps. Larger → split.
> `[P]` after the ID: no dependency on the neighbouring `[P]` tasks.
>
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> Every RED step names the scenario ID it proves. A task with no scenario is
> Foundations or Hardening.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.

Shared conventions for every task below: tests import only from
`src/theory/published`, `src/practice/published` or `src/ui/*`; test names
begin with the qualified scenario ID; `pnpm vitest run path/to/file.test.ts`
runs one file; `pnpm check` is the full gate and must be green before a
task is done. The vendored design is
`changes/005-scale-selection/design/hear-the-scale.dc.html` — every UI
constant is copied from it and named, never re-derived by eye.

## Phase 1 — Foundations (theory)

_The catalogue, the widened accidental, the generalised run-fitting. Nothing user-visible until Phase 3._

### T001 · — · `Accidental` widens to five values

**Status:** todo

**Files**
- Modify: `src/theory/domain/notes.ts:2` (`Accidental`), `:23-27` (`ACCIDENTAL_OFFSET`), `:71-83` (`accidentalForTarget`)
- Modify: `src/theory/domain/labels.ts:3-7`
- Test: `tests/theory/scenarios/primitives.test.ts`

**Interfaces**
- Produces: `export type Accidental = "doubleFlat" | "flat" | "natural" | "sharp" | "doubleSharp"` — `ACCIDENTAL_OFFSET` is `-2, -1, 0, +1, +2`; `accidentalForTarget(letter, targetSemitone)` returns `doubleSharp` for a difference of 2 and `doubleFlat` for 10 (still throws otherwise); `pitchClassLabel` renders `𝄫 ♭ (nothing) ♯ 𝄪`

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003 (foundation for S3/S6): append to `tests/theory/scenarios/primitives.test.ts`:
  ```ts
  test("theory.circle-of-fifths/REQ-003 — double accidentals spell and label (F𝄪, B𝄫)", () => {
    expect(pitchClassLabel({ letter: "F", accidental: "doubleSharp" })).toBe("F𝄪");
    expect(pitchClassLabel({ letter: "B", accidental: "doubleFlat" })).toBe("B𝄫");
    expect(pitchPosition({ letter: "F", accidental: "doubleSharp", octave: 4 })).toBe(
      pitchPosition({ letter: "G", accidental: "natural", octave: 4 }),
    );
    expect(pitchPosition({ letter: "B", accidental: "doubleFlat", octave: 3 })).toBe(
      pitchPosition({ letter: "A", accidental: "natural", octave: 3 }),
    );
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/primitives.test.ts` — expect FAIL: `Type '"doubleSharp"' is not assignable to type 'Accidental'` (tsc) / `TypeError` on the missing offset.
- [ ] 3. GREEN — widen the union; add `doubleFlat: -2` and `doubleSharp: 2` to `ACCIDENTAL_OFFSET`; in `accidentalForTarget` add `if (diff === 2) return "doubleSharp"; if (diff === 10) return "doubleFlat";` before the throw; add `doubleFlat: "𝄫"` and `doubleSharp: "𝄪"` to `labels.ts`'s `ACCIDENTAL_SYMBOL`.
- [ ] 4. Run `pnpm check` — every `Record<Accidental, …>` in `src/` now fails to compile until it names the two new members; fix each (`src/ui/StaveView.tsx` and `src/ui/NamesView.tsx` use symbol constants, not records — confirm with `grep -rn "Record<Accidental" src`). Expect green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → vitest summary all passed, `cargo test` `test result: ok`.

### T002 · theory.circle-of-fifths/REQ-003, practice.session/REQ-012 · The scale catalogue and `spelledScaleOf`

**Status:** todo

**Files**
- Create: `src/theory/domain/scales.ts`
- Modify: `src/theory/published/index.ts` (export the types and functions below)
- Test: `tests/theory/scenarios/scales.test.ts`

**Interfaces**
- Consumes: `accidentalForTarget(letter: NoteLetter, targetSemitone: number): Accidental` (`notes.ts`), `signatureOf(key: Key): Signature` (`signatures.ts`, `.kind` is `"sharps" | "flats" | "none"`), `LETTER_SEMITONE`, `ACCIDENTAL_OFFSET` (`notes.ts`), `type Mode = "major" | "naturalMinor"` (`keys.ts`)
- Produces (all exported from `src/theory/published/index.ts`):
  ```ts
  export type ScaleId = "major" | "major-pentatonic" | "lydian" | "mixolydian" | "harmonic-major" | "natural-minor" | "harmonic-minor" | "melodic-minor-classical" | "melodic-minor-jazz" | "minor-pentatonic" | "blues" | "dorian" | "phrygian" | "locrian" | "whole-tone" | "chromatic";
  export type ScaleFamily = "major" | "minor" | "either";
  export type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
  export interface ScaleDegree { readonly degree: Degree; readonly semitones: number }
  export type Formula =
    | { readonly kind: "fixed"; readonly degrees: readonly ScaleDegree[] }
    | { readonly kind: "bySignature"; readonly sharps: readonly ScaleDegree[]; readonly flats: readonly ScaleDegree[] };
  export interface Scale { readonly id: ScaleId; readonly family: ScaleFamily; readonly name: string; readonly title: string; readonly ascending: Formula; readonly descending: Formula | null; readonly note: string | null; readonly offersArpeggio: boolean }
  export const SCALES: readonly Scale[];
  export function scaleById(id: ScaleId): Scale;
  export function scalesForMode(mode: Mode): readonly Scale[];   // family === (mode === "major" ? "major" : "minor") || family === "either", in SCALES order
  export interface ScaleNote { readonly pitchClass: PitchClass; readonly degree: Degree; readonly degreeLabel: string; readonly altered: boolean }
  export interface SpelledScale { readonly ascending: readonly ScaleNote[]; readonly descending: readonly ScaleNote[] | null; readonly formulaLine: string }
  export function spelledScaleOf(key: Key, scale: Scale): SpelledScale;
  ```
  `SCALES`, in this order, as `(degree, semitones)` pairs — `name` / `title` / `note` / `offersArpeggio`:
  1. `major` — Major / major — `(1,0)(2,2)(3,4)(4,5)(5,7)(6,9)(7,11)` — family major, arpeggio yes
  2. `major-pentatonic` — Major pentatonic / major pentatonic — `(1,0)(2,2)(3,4)(5,7)(6,9)` — major, no
  3. `lydian` — Lydian / Lydian — major with `(4,6)` — major, yes
  4. `mixolydian` — Mixolydian / Mixolydian — major with `(7,10)` — major, yes
  5. `harmonic-major` — Harmonic major / harmonic major — major with `(6,8)` — major, yes
  6. `natural-minor` — Natural minor / minor — `(1,0)(2,2)(3,3)(4,5)(5,7)(6,8)(7,10)` — minor, yes
  7. `harmonic-minor` — Harmonic minor / harmonic minor — natural minor with `(7,11)` — minor, yes
  8. `melodic-minor-classical` — Melodic minor · classical / melodic minor — natural minor with `(6,9)(7,11)`; **descending = natural minor**; note `↓ natural` — minor, yes
  9. `melodic-minor-jazz` — Melodic minor · jazz / jazz minor — natural minor with `(6,9)(7,11)`; note `both ways` — minor, yes
  10. `minor-pentatonic` — Minor pentatonic / minor pentatonic — `(1,0)(3,3)(4,5)(5,7)(7,10)` — minor, no
  11. `blues` — Blues / blues — `(1,0)(3,3)(4,5)(5,6)(5,7)(7,10)` (two degree-5 entries, kept) — minor, no
  12. `dorian` — Dorian / Dorian — natural minor with `(6,9)` — minor, yes
  13. `phrygian` — Phrygian / Phrygian — natural minor with `(2,1)` — minor, yes
  14. `locrian` — Locrian / Locrian — natural minor with `(2,1)(5,6)` — minor, yes
  15. `whole-tone` — Whole tone / whole tone — `(1,0)(2,2)(3,4)(4,6)(6,8)(7,10)` — either, no
  16. `chromatic` — Chromatic / chromatic — `bySignature`: sharps `(1,0)(1,1)(2,2)(2,3)(3,4)(4,5)(4,6)(5,7)(5,8)(6,9)(6,10)(7,11)`, flats `(1,0)(2,1)(2,2)(3,3)(3,4)(4,5)(5,6)(5,7)(6,8)(6,9)(7,10)(7,11)` — either, no
  Every entry not listed as having a descending formula or a note has `descending: null` / `note: null`.
  `spelledScaleOf(key, scale)`: the formula in use is `ascending` when `fixed`; when `bySignature`, `flats` if `signatureOf(key).kind === "flats"`, else `sharps`. For each `(degree, semitones)`: letter = `["C","D","E","F","G","A","B"][(indexOf(tonic.letter) + degree - 1) % 7]`; target semitone = `(LETTER_SEMITONE[tonic.letter] + ACCIDENTAL_OFFSET[tonic.accidental] + semitones) mod 12` (non-negative); accidental = `accidentalForTarget(letter, target)`. Degree label: home = `[0,2,4,5,7,9,11]` for family `major`, `[0,2,3,5,7,8,10]` for `minor`, and for `either` the one matching `key.mode` (`major` → major's, `naturalMinor` → minor's); `alt = semitones - home[degree - 1]`, then `if (alt > 6) alt -= 12; if (alt < -6) alt += 12`; label = `"♯".repeat(alt)` or `"♭".repeat(-alt)` followed by the degree; `altered = alt !== 0`. `descending` spelled the same way from the descending formula, or `null`. `formulaLine` = ascending labels joined by `" "`, plus `` ` · ${note}` `` when `note` is not null.

**Steps**
- [ ] 1. RED — practice.session/REQ-012/S5 (theory-level) and theory.circle-of-fifths/REQ-003/S3 (theory-level): create `tests/theory/scenarios/scales.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { SCALES, scaleById, scalesForMode, spelledScaleOf, pitchClassLabel, type Key } from "../../../src/theory/published";

  const gMajor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "major" };
  const eMinor: Key = { tonic: { letter: "E", accidental: "natural" }, mode: "naturalMinor" };
  const fMajor: Key = { tonic: { letter: "F", accidental: "natural" }, mode: "major" };
  const dMinor: Key = { tonic: { letter: "D", accidental: "natural" }, mode: "naturalMinor" };
  const lines = (key: Key) => scalesForMode(key.mode).map((scale) => [scale.name, spelledScaleOf(key, scale).formulaLine]);

  test("practice.session/REQ-012/S5 (theory) — every formula in the catalogue, major ring on G", () => {
    expect(lines(gMajor)).toEqual([
      ["Major", "1 2 3 4 5 6 7"],
      ["Major pentatonic", "1 2 3 5 6"],
      ["Lydian", "1 2 3 ♯4 5 6 7"],
      ["Mixolydian", "1 2 3 4 5 6 ♭7"],
      ["Harmonic major", "1 2 3 4 5 ♭6 7"],
      ["Whole tone", "1 2 3 ♯4 ♭6 ♭7"],
      ["Chromatic", "1 ♯1 2 ♯2 3 4 ♯4 5 ♯5 6 ♯6 7"],
    ]);
  });

  test("practice.session/REQ-012/S5 (theory) — every formula in the catalogue, minor ring on E", () => {
    expect(lines(eMinor)).toEqual([
      ["Natural minor", "1 2 3 4 5 6 7"],
      ["Harmonic minor", "1 2 3 4 5 6 ♯7"],
      ["Melodic minor · classical", "1 2 3 4 5 ♯6 ♯7 · ↓ natural"],
      ["Melodic minor · jazz", "1 2 3 4 5 ♯6 ♯7 · both ways"],
      ["Minor pentatonic", "1 3 4 5 7"],
      ["Blues", "1 3 4 ♭5 5 7"],
      ["Dorian", "1 2 3 4 5 ♯6 7"],
      ["Phrygian", "1 ♭2 3 4 5 6 7"],
      ["Locrian", "1 ♭2 3 4 ♭5 6 7"],
      ["Whole tone", "1 2 ♯3 ♯4 6 7"],
      ["Chromatic", "1 ♯1 2 ♯2 ♯3 4 ♯4 5 ♯5 ♯6 ♯♯6 ♯7"],
    ]);
  });

  test("practice.session/REQ-012/S5 (theory) — chromatic follows the signature on flat keys", () => {
    expect(spelledScaleOf(fMajor, scaleById("chromatic")).formulaLine).toBe("1 ♭2 2 ♭3 3 4 ♭5 5 ♭6 6 ♭7 7");
    expect(spelledScaleOf(dMinor, scaleById("chromatic")).formulaLine).toBe("1 ♭2 2 3 ♯3 4 ♭5 5 6 ♯6 7 ♯7");
    expect(SCALES).toHaveLength(16);
  });

  test("theory.circle-of-fifths/REQ-003/S3 (theory) — G Lydian is spelled G A B C♯ D E F♯ with the 4th altered", () => {
    const spelled = spelledScaleOf(gMajor, scaleById("lydian"));
    expect(spelled.ascending.map((n) => pitchClassLabel(n.pitchClass))).toEqual(["G", "A", "B", "C♯", "D", "E", "F♯"]);
    expect(spelled.ascending.map((n) => n.altered)).toEqual([false, false, false, true, false, false, false]);
    expect(spelled.descending).toBeNull();
    const melodic = spelledScaleOf({ tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" }, scaleById("melodic-minor-classical"));
    expect(melodic.ascending.map((n) => pitchClassLabel(n.pitchClass))).toEqual(["G", "A", "B♭", "C", "D", "E", "F♯"]);
    expect(melodic.descending?.map((n) => pitchClassLabel(n.pitchClass))).toEqual(["G", "A", "B♭", "C", "D", "E♭", "F"]);
    const gSharpHarmonic = spelledScaleOf({ tonic: { letter: "G", accidental: "sharp" }, mode: "naturalMinor" }, scaleById("harmonic-minor"));
    expect(pitchClassLabel(gSharpHarmonic.ascending[6]!.pitchClass)).toBe("F𝄪");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/scales.test.ts` — expect FAIL: `Cannot find module` / `SCALES is not exported`.
- [ ] 3. GREEN — write `src/theory/domain/scales.ts` with the data and functions exactly as in Interfaces; a private `withAlterations(base, changes: Partial<Record<Degree, number>>)` builds the derived formulas; export from `published/index.ts`.
- [ ] 4. Run `pnpm vitest run tests/theory/scenarios/scales.test.ts` — expect PASS. Run `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/theory/scenarios/scales.test.ts` → `Tests  4 passed (4)`.

### T003 · theory.circle-of-fifths/REQ-003 · `keyView` takes the chosen scale; notes carry degree, label and altered

**Status:** todo

**Files**
- Modify: `src/theory/domain/key-view.ts:9-49`
- Modify: `src/theory/domain/traversal.ts:46,60,90` (pass `scaleById("major")`/`("natural-minor")` by `key.mode` for now — T004 replaces this), `src/ui/App.tsx:331`, `src/ui/StaveView.tsx` (only if it calls `keyView` — `grep -n "keyView(" src/ui/StaveView.tsx`)
- Modify (test call sites): `tests/theory/scenarios/key-view.test.ts`, `tests/theory/invariants/range-safety.test.ts`, `tests/ui/scenarios/stave-view.test.tsx` — add the third argument `scaleById("major")` (or `"natural-minor"` where the key is minor)
- Test: `tests/theory/scenarios/key-view.test.ts`

**Interfaces**
- Consumes: `spelledScaleOf(key: Key, scale: Scale): SpelledScale`, `scaleById(id: ScaleId): Scale`, `type ScaleNote` (T002)
- Produces:
  ```ts
  export interface KeyViewNote { readonly note: Note; readonly isRoot: boolean; readonly degree: Degree; readonly degreeLabel: string; readonly altered: boolean }
  export function keyView(key: Key, variant: Variant, scale: Scale): KeyView   // signature/newAccidental from key; notes from spelledScaleOf(key, scale).ascending
  export function rangedNotesOf(scaleNotes: readonly ScaleNote[], tonic: PitchClass, variant: Variant): readonly KeyViewNote[]   // domain-internal (not published): the in-range notes of a spelled form, ascending, isRoot = pitch class equals tonic
  ```

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003/S5 (theory): append to `tests/theory/scenarios/key-view.test.ts`:
  ```ts
  test("theory.circle-of-fifths/REQ-003/S5 (theory) — a five-note scale's key view has five notes per octave, each carrying its degree", () => {
    const view = keyView(gMajor, flute, scaleById("major-pentatonic"));
    const labels = view.notes.map((n) => noteLabel(n.note));
    expect(labels.slice(0, 6)).toEqual(["D4", "E4", "G4", "A4", "B4", "D5"]);
    expect(view.notes.map((n) => n.degree).slice(0, 6)).toEqual([5, 6, 1, 2, 3, 5]);
    expect(view.notes.filter((n) => n.isRoot).map((n) => noteLabel(n.note))).toEqual(["G4", "G5", "G6"]);
    expect(view.signature.count).toBe(1);
    const lydian = keyView(gMajor, flute, scaleById("lydian"));
    expect(lydian.notes.find((n) => n.altered)?.degreeLabel).toBe("♯4");
  });
  ```
  (`gMajor`, `flute` and `noteLabel` are already defined/imported in that file; add `scaleById` to the import.)
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/key-view.test.ts` — expect FAIL: `Expected 3 arguments, but got 2` on the existing calls, then the new assertion.
- [ ] 3. GREEN — implement `rangedNotesOf` (the existing octave loop, over `ScaleNote`s, copying `degree`/`degreeLabel`/`altered` onto each `KeyViewNote`); `keyView` = `{ signature: signatureOf(key), notes: rangedNotesOf(spelledScaleOf(key, scale).ascending, key.tonic, variant), newAccidental: newAccidentalOf(key) }`. Update every call site listed in Files with the diatonic scale for its key's mode.
- [ ] 4. Run `pnpm vitest run tests/theory/scenarios/key-view.test.ts` — expect PASS. Run `pnpm check` — green (every existing REQ-003/REQ-005 test unchanged in behaviour).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → all vitest files pass.

### T004 · theory.circle-of-fifths/REQ-012 · Run-fitting by notes-per-octave; `traversalOf` replaces `runOf`/`sequenceOf`

**Status:** todo

**Files**
- Modify: `src/theory/domain/traversal.ts` (whole file)
- Modify: `src/theory/published/index.ts:13-26` (export `traversalOf`, `TraversalNotes`; drop `runOf`, `sequenceOf`)
- Modify: `src/practice/domain/session.ts:21-28,235-247` (call `traversalOf(key, variant, scale, traversal)` with `scaleById(key.mode === "major" ? "major" : "natural-minor")` for now — T009 wires the chosen scale)
- Modify (test call sites): `tests/theory/scenarios/traversal-run.test.ts`, `tests/theory/scenarios/traversal-sequence.test.ts`, `tests/theory/invariants/sequence-range.test.ts` — `runOf(key, variant, t)` → `traversalOf(key, variant, scaleById("major"), t).run`; `sequenceOf(run, d)` → `.sequence` of the same call
- Test: `tests/theory/scenarios/traversal-run.test.ts`

**Interfaces**
- Consumes: `keyView(key, variant, scale)`, `rangedNotesOf(scaleNotes, tonic, variant)` (T003), `spelledScaleOf`, `scaleById` (T002)
- Produces:
  ```ts
  export interface TraversalNotes { readonly run: readonly KeyViewNote[]; readonly sequence: readonly SequenceNote[] }
  export function fittingOctaveCounts(key: Key, variant: Variant, scale: Scale): readonly OctaveCount[]
  export function effectiveOctavesOf(key: Key, variant: Variant, scale: Scale, octaves: Octaves): Octaves
  export function traversalOf(key: Key, variant: Variant, scale: Scale, traversal: Traversal): TraversalNotes
  ```
  Rules: `notesPerOctave = spelledScaleOf(key, scale).ascending.length`; an n-octave run is `notesPerOctave * n + 1` consecutive notes from a root (replaces the literal 7). Arpeggio keeps notes with `degree === 1 || degree === 3 || degree === 5`. In this task the descending form is ignored (`sequence` from `run` exactly as today's `sequenceOf`); T005 adds it.

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-012/S7: append to `tests/theory/scenarios/traversal-run.test.ts`:
  ```ts
  test("theory.circle-of-fifths/REQ-012/S7 — a scale with fewer notes per octave", () => {
    const { run } = traversalOf(major("G"), variantById("flute-concert"), scaleById("major-pentatonic"), {
      direction: "up", octaves: { kind: "count", count: 2 }, shape: "scale",
    });
    expect(run.map((n) => label(n.note))).toEqual(["G4", "A4", "B4", "D5", "E5", "G5", "A5", "B5", "D6", "E6", "G6"]);
    expect(fittingOctaveCounts(major("G"), variantById("flute-concert"), scaleById("major-pentatonic"))).toEqual([1, 2]);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/traversal-run.test.ts` — expect FAIL: `traversalOf is not a function` (and the existing tests fail on the old signatures until step 3 updates them).
- [ ] 3. GREEN — rewrite `traversal.ts`: `lowestTonicIndexFor(notes, octaveCount, notesPerOctave)`; `countRunOf` slices `notesPerOctave * count + 1`; arpeggio filters by `degree`; `traversalOf` builds `run` from `keyView(key, variant, scale).notes` and `sequence` with the existing ascending/descending/palindrome logic. Update `published/index.ts`, `session.ts` and the three test files' call sites.
- [ ] 4. Run `pnpm vitest run tests/theory` — expect PASS (S1–S4 and S7). Run `pnpm check` — green.
- [ ] 5. REFACTOR — delete `degreeIndexOf` and `ARPEGGIO_DEGREES` (the degree now travels with the note).

**Verify** — `pnpm check` → green; `grep -rn "runOf\|sequenceOf" src tests` → no matches.

### T005 · theory.circle-of-fifths/REQ-012, REQ-003 · A scale with its own descending form

**Status:** todo

**Files**
- Modify: `src/theory/domain/traversal.ts` (`traversalOf`)
- Test: `tests/theory/scenarios/traversal-sequence.test.ts`

**Interfaces**
- Consumes: `traversalOf(key, variant, scale, traversal): TraversalNotes` (T004), `rangedNotesOf(scaleNotes, tonic, variant)` (T003), `spelledScaleOf(key, scale).descending`
- Produces: the same `traversalOf`, now: when `spelledScaleOf(key, scale).descending` is not null **and** `traversal.shape === "scale"`, let `A` = the fitted ascending-form run and `D` = the descending form fitted identically (same `effectiveOctaves`, `rangedNotesOf(descending, tonic, variant)`, same start root and length); then `↑`: `run = A`, ascending sequence; `↓`: `run = D` (ascending order), sequence = `D` reversed with `runIndex` into `D`; `↑↓`: `run = [...A, ...reverse(D).slice(1)]` and `sequence` = `run` in order (`runIndex === position`). For `shape === "arpeggio"` the descending form is ignored (chord tones of `A` both ways).

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-012/S6 and REQ-003/S6 (theory): append to `tests/theory/scenarios/traversal-sequence.test.ts`:
  ```ts
  const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
  const oneOct = (direction: Direction): Traversal => ({ direction, octaves: { kind: "count", count: 1 }, shape: "scale" });

  test("theory.circle-of-fifths/REQ-012/S6 — a scale with its own descending form", () => {
    const { run, sequence } = traversalOf(gMinor, variantById("flute-concert"), scaleById("melodic-minor-classical"), oneOct("updown"));
    expect(sequence.map((n) => noteLabel(n.note))).toEqual([
      "G4", "A4", "B♭4", "C5", "D5", "E5", "F♯5", "G5", "F5", "E♭5", "D5", "C5", "B♭4", "A4", "G4",
    ]);
    expect(run.map((n) => noteLabel(n.note))).toEqual(sequence.map((n) => noteLabel(n.note)));
    expect(sequence.map((n) => n.runIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  test("theory.circle-of-fifths/REQ-003/S6 (theory) — ↑ shows the ascending form, ↓ the descending form lowest to highest", () => {
    const up = traversalOf(gMinor, variantById("flute-concert"), scaleById("melodic-minor-classical"), oneOct("up"));
    expect(up.run.map((n) => noteLabel(n.note))).toEqual(["G4", "A4", "B♭4", "C5", "D5", "E5", "F♯5", "G5"]);
    const down = traversalOf(gMinor, variantById("flute-concert"), scaleById("melodic-minor-classical"), oneOct("down"));
    expect(down.run.map((n) => noteLabel(n.note))).toEqual(["G4", "A4", "B♭4", "C5", "D5", "E♭5", "F5", "G5"]);
    expect(down.sequence.map((n) => noteLabel(n.note))).toEqual(["G5", "F5", "E♭5", "D5", "C5", "B♭4", "A4", "G4"]);
    const arpeggio = traversalOf(gMinor, variantById("flute-concert"), scaleById("melodic-minor-classical"), { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "arpeggio" });
    expect(arpeggio.sequence.map((n) => noteLabel(n.note))).toEqual(["G4", "B♭4", "D5", "G5", "D5", "B♭4", "G4"]);
  });
  ```
  (`variantById`, `noteLabel` and the `Key`/`Direction`/`Traversal` types follow that file's existing imports.)
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/traversal-sequence.test.ts` — expect FAIL: the ↑↓ sequence is the 15-note mirror `… G5 F♯5 E5 …`.
- [ ] 3. GREEN — implement the rules in Interfaces inside `traversalOf`; `countRunOf` for `D` starts at the same root index as `A` (both forms share the tonic positions).
- [ ] 4. Run `pnpm vitest run tests/theory` — expect PASS. Run `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/theory/scenarios/traversal-sequence.test.ts` → all passed.

### T006 · theory.circle-of-fifths/REQ-012 · The range invariant over every scale

**Status:** todo

**Files**
- Modify: `tests/theory/invariants/sequence-range.test.ts`
- Test: same file

**Interfaces**
- Consumes: `SCALES`, `spelledScaleOf`, `traversalOf`, `fittingOctaveCounts` (T002, T004)

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-012/S5: add a `for (const scale of SCALES)` loop inside the key/variant loops; replace `runOf`/`sequenceOf` with `traversalOf(key, variant, scale, { direction, octaves, shape })`; for `shape === "arpeggio"` assert the note's pitch class is one of `spelledScaleOf(key, scale).ascending` (replacing the `scaleNotesOf(key)` check); wrap the whole enumeration so that a thrown `accidentalForTarget` error fails the test with the key, scale and variant in the message; raise the final `expect(count).toBeGreaterThan(1000)` to `16_000`.
- [ ] 2. Run `pnpm vitest run tests/theory/invariants/sequence-range.test.ts` — expect FAIL only if a catalogued scale on a circle key spells a triple accidental or leaves the range; expected outcome: PASS on the first run (record the count printed).
- [ ] 3. GREEN — nothing to write if it passes; if it fails, the failure names a real spec problem — stop and report it (do not special-case a scale).
- [ ] 4. Run `pnpm check` — green.

**Verify** — `pnpm vitest run tests/theory/invariants/sequence-range.test.ts` → `1 passed`, duration under 10 s.

### T007 · theory.circle-of-fifths/REQ-003 · Inline accidentals: `inlineAccidentalsOf`

**Status:** todo

**Files**
- Create: `src/theory/domain/notation.ts`
- Modify: `src/theory/published/index.ts`
- Test: `tests/theory/scenarios/notation.test.ts`

**Interfaces**
- Consumes: `type Signature = { kind: "sharps" | "flats" | "none"; count: number; accidentals: readonly PitchClass[] }` (`signatures.ts` — confirm the field names with `sed -n 1,40p src/theory/domain/signatures.ts`), `type KeyViewNote` (T003)
- Produces: `export function inlineAccidentalsOf(signature: Signature, run: readonly KeyViewNote[]): readonly (Accidental | null)[]` — one entry per run note; `null` = nothing drawn. Rule: a map from `letter + octave` to the accidental in effect, initialised lazily from the signature (`sharp`/`flat` for a letter the signature names, else `natural`); for each note, if `note.accidental !== inEffect` emit `note.accidental` and update the map, else emit `null`.

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003/S6 (theory) and S3 (theory): create `tests/theory/scenarios/notation.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { builtInCatalogue, inlineAccidentalsOf, scaleById, signatureOf, traversalOf, type Key } from "../../../src/theory/published";
  const flute = builtInCatalogue().instruments.flatMap((i) => i.variants).find((v) => v.variantId === "flute-concert")!;
  const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
  const gMajor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "major" };

  test("theory.circle-of-fifths/REQ-003/S6 (theory) — accidentals hold for the rest of the run", () => {
    const { run } = traversalOf(gMinor, flute, scaleById("melodic-minor-classical"), { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" });
    expect(inlineAccidentalsOf(signatureOf(gMinor), run)).toEqual([
      null, null, null, null, null, "natural", "sharp", null, "natural", "flat", null, null, null, null, null,
    ]);
  });

  test("theory.circle-of-fifths/REQ-003/S3 (theory) — Lydian's raised 4th carries an inline sharp, nothing else does", () => {
    const { run } = traversalOf(gMajor, flute, scaleById("lydian"), { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" });
    expect(inlineAccidentalsOf(signatureOf(gMajor), run)).toEqual([null, null, null, "sharp", null, null, null, null]);
    const plain = traversalOf(gMajor, flute, scaleById("major"), { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" });
    expect(inlineAccidentalsOf(signatureOf(gMajor), plain.run).every((a) => a === null)).toBe(true);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/theory/scenarios/notation.test.ts` — expect FAIL: `inlineAccidentalsOf` is not exported.
- [ ] 3. GREEN — write `notation.ts` per the rule; export it.
- [ ] 4. Run `pnpm vitest run tests/theory/scenarios/notation.test.ts` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/theory/scenarios/notation.test.ts` → `2 passed`.

## Phase 2 — The session knows the chosen scale

### T008 · practice.session/REQ-012, REQ-001 · `ScaleChoice`, the effective shape, the snapshot

**Status:** todo

**Files**
- Create: `src/practice/domain/scale-choice.ts`
- Modify: `src/practice/domain/session.ts` (`createSession` signature, `SessionSnapshot`, `recompute`, `buildSnapshot`, new `setScaleChoice`), `src/practice/domain/settings.ts:44-55` (`summaryLineOf`), `src/practice/published/index.ts`
- Modify (call sites): `src/ui/App.tsx:240-245` (pass `stored?.scale ?? defaultScaleChoice` as the new third argument — full wiring is T012), `tests/practice/fakes.ts:222-275` (`keyOf` accepts a trailing `m` for a natural-minor key, e.g. `"Em"`, `"G#m"`; `sessionOn` gains an optional fifth parameter `scaleChoice: ScaleChoice = defaultScaleChoice`), `tests/practice/scenarios/summary-line.test.ts`, `tests/practice/invariants/target-in-sequence.test.ts`, `tests/ui/scenarios/app-session.test.tsx` (the `summaryLineOf` calls gain the effective-shape argument)
- Test: `tests/practice/scenarios/session-scale.test.ts`

**Interfaces**
- Consumes: `Scale`, `ScaleId`, `scaleById`, `spelledScaleOf`, `SpelledScale`, `traversalOf`, `fittingOctaveCounts(key, variant, scale)`, `effectiveOctavesOf(key, variant, scale, octaves)` (T002, T004)
- Produces (exported from `src/practice/published/index.ts`):
  ```ts
  export interface ScaleChoice { readonly major: ScaleId; readonly minor: ScaleId }
  export const defaultScaleChoice: ScaleChoice = { major: "major", minor: "natural-minor" };
  export function chosenScaleIdFor(choice: ScaleChoice, mode: Mode): ScaleId   // mode "major" → choice.major, "naturalMinor" → choice.minor
  export function createSession(context: SessionContext, traversal: Traversal, scaleChoice: ScaleChoice, settings: SessionSettings, deps: SessionDeps): Session
  interface Session { …; setScaleChoice(choice: ScaleChoice): void }   // recompute + restartIfPlaying + notifyChange, exactly as setTraversal
  interface SessionSnapshot { …; readonly scale: Scale; readonly spelledScale: SpelledScale; readonly scaleChoice: ScaleChoice; readonly effectiveShape: Shape }
  export function summaryLineOf(traversal: Traversal, effectiveOctaves: Octaves, effectiveShape: Shape, settings: SessionSettings): string   // the shape word is effectiveShape
  ```
  `recompute()`: `scale = scaleById(chosenScaleIdFor(scaleChoice, key.mode))`; `effectiveShape = scale.offersArpeggio ? traversal.shape : "scale"`; `traversalOf(key, variant, scale, { ...traversal, shape: effectiveShape })`; `spelledScale = spelledScaleOf(key, scale)`. `snapshotsMateriallyEqual` also compares `scaleChoice` by reference. The idle caption's extremes become the run's lowest and highest pitch (`pitchPosition`), not its first and last note.

**Steps**
- [ ] 1. RED — practice.session/REQ-012/S3 (session) and REQ-001/S5 (session): create `tests/practice/scenarios/session-scale.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { defaultSessionSettings, defaultScaleChoice } from "../../../src/practice/published";
  import { sessionOn } from "../fakes";

  const twoOctArpeggio = { direction: "updown", octaves: { kind: "count", count: 2 }, shape: "arpeggio" } as const;

  test("practice.session/REQ-012/S3 (session) — arpeggio falls back to scale for a scale the catalogue excludes", () => {
    const { session } = sessionOn("G", "flute-concert", twoOctArpeggio, defaultSessionSettings, { ...defaultScaleChoice, major: "major-pentatonic" });
    const snapshot = session.snapshot();
    expect(snapshot.scale.id).toBe("major-pentatonic");
    expect(snapshot.scale.offersArpeggio).toBe(false);
    expect(snapshot.effectiveShape).toBe("scale");
    expect(snapshot.traversal.shape).toBe("arpeggio");
    expect(snapshot.summaryLine).toBe("↑↓ · 2 oct · scale · loop");
    expect(snapshot.caption).toBe("21 notes · G4–G6");
    session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
    expect(session.snapshot().effectiveShape).toBe("arpeggio");
    expect(session.snapshot().summaryLine).toBe("↑↓ · 2 oct · arpeggio · loop");
  });

  test("practice.session/REQ-001/S5 (session) — the chosen scale follows the ring, each ring keeping its own choice", () => {
    const { session } = sessionOn("Em", "flute-concert", { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" }, defaultSessionSettings, { major: "lydian", minor: "dorian" });
    expect(session.snapshot().scale.id).toBe("dorian");
    expect(session.snapshot().spelledScale.formulaLine).toBe("1 2 3 4 5 ♯6 7");
    expect(session.snapshot().caption).toBe("8 notes · E4–E5");
  });

  test("practice.session/REQ-002 — the idle caption's extremes are the run's lowest and highest", () => {
    const { session } = sessionOn("Gm", "flute-concert", { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" }, defaultSessionSettings, { ...defaultScaleChoice, minor: "melodic-minor-classical" });
    expect(session.snapshot().caption).toBe("15 notes · G4–G5");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/session-scale.test.ts` — expect FAIL: `sessionOn` rejects the fifth argument / `scale` is undefined on the snapshot.
- [ ] 3. GREEN — `scale-choice.ts`; the session changes in Interfaces; `keyOf("Em")` in the fakes; the `summaryLineOf` call sites.
- [ ] 4. Run `pnpm vitest run tests/practice` — expect PASS. `pnpm check` — green (the existing REQ-001/S1–S4 and REQ-002/S4 captions are unchanged: lowest/highest equal first/last for every diatonic run).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/session-scale.test.ts` → `3 passed`.

### T009 · practice.session/REQ-007 · A new scale mid-run restarts at once

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (`setScaleChoice` — only if T008 left restart out)
- Test: `tests/practice/scenarios/session-scale.test.ts`

**Interfaces**
- Consumes: `Session.setScaleChoice(choice: ScaleChoice): void` (T008), `advanceUntil(clock, isDone)` and `FakeSound.commands`/`FakeSound.tones()` from `tests/practice/fakes.ts` (use whichever accessor `tests/practice/scenarios/session-transport.test.ts` uses for REQ-007/S1 — copy that test's shape)

**Steps**
- [ ] 1. RED — practice.session/REQ-007/S4: append to `tests/practice/scenarios/session-scale.test.ts`, modelled line-for-line on the existing `practice.session/REQ-007/S1` test in `session-transport.test.ts` (same fixture, same `advanceUntil` to position 9, same assertions on the posted tones), replacing the key change with `session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" })` and asserting: the transport is `{ kind: "playing", position: 0 }` immediately (no `countingIn`), the next tone posted is G4's pitch (`pitchHzOf({ letter: "G", accidental: "natural", octave: 4 })`), and after the highlight fires the caption reads `G4 · 1 of 29` (2 oct ↑↓ Lydian on the flute is 29 notes, like G major).
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/session-scale.test.ts` — expect FAIL if `setScaleChoice` does not call `restartIfPlaying()`; PASS if T008 already did — in that case the test still stands as the scenario's proof.
- [ ] 3. GREEN — make `setScaleChoice` mirror `setTraversal` exactly.
- [ ] 4. Run `pnpm check` — green.

**Verify** — `pnpm vitest run tests/practice/scenarios/session-scale.test.ts` → `4 passed`.

## Phase 3 — The UI

### T010 · practice.session/REQ-011 · Stored selection v4 with the per-ring scale choice

**Status:** todo

**Files**
- Modify: `src/ui/selection-store.ts` (whole file)
- Test: `tests/ui/scenarios/selection-store.test.ts`

**Interfaces**
- Consumes: `type ScaleId` (T002), `defaultScaleChoice` (T008)
- Produces:
  ```ts
  export interface StoredSelection { readonly schemaVersion: 4; …all v3 fields…; readonly scale: { readonly major: ScaleId; readonly minor: ScaleId } }
  export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId">   // schemaVersion 4, scale: defaultScaleChoice
  ```
  `storedSelectionV4Schema` = the v3 object plus `scale: z.object({ major: scaleIdSchema, minor: scaleIdSchema })` where `scaleIdSchema = z.enum([...the sixteen ids in catalogue order])`; `migrateFromV3(v3)` copies every v3 field and sets `scale: firstRunDefaults.scale`; v2 chains through v3 then v4; the union lists v4, v3, v2, v1.

**Steps**
- [ ] 1. RED — practice.session/REQ-011/S1, S4, S3: in `tests/ui/scenarios/selection-store.test.ts`, change the round-trip test's payload to `schemaVersion: 4` with `scale: { major: "lydian", minor: "dorian" }` (rename it to cite REQ-011/S1); add:
  ```ts
  test("a v3 payload migrates: everything kept, scale defaults to Major / Natural minor (practice.session/REQ-011/S4)", () => {
    localStorage.clear();
    localStorage.setItem(storageKey, JSON.stringify({
      schemaVersion: 3, variantId: "flute-concert", keyId: "G-major", spelling: "sharp", view: "stave",
      degreesEnabled: true, distanceRingEnabled: false, staveNamesEnabled: true,
      traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
      session: { soundMode: "notes", loop: false, countIn: true, restBar: false, tempoBpm: 120 },
    }));
    const loaded = localStorageSelectionStore(localStorage).load();
    expect(loaded?.schemaVersion).toBe(4);
    expect(loaded?.scale).toEqual({ major: "major", minor: "natural-minor" });
    expect(loaded?.traversal).toEqual({ direction: "down", octaves: 2, shape: "arpeggio" });
    expect(loaded?.session.tempoBpm).toBe(120);
  });

  test("an unknown scale id makes the payload unreadable → null (practice.session/REQ-011)", () => {
    localStorage.clear();
    localStorage.setItem(storageKey, JSON.stringify({ ...firstRunDefaults, variantId: "flute-concert", keyId: "C-major", scale: { major: "ionian", minor: "natural-minor" } }));
    expect(localStorageSelectionStore(localStorage).load()).toBeNull();
  });
  ```
  and in the existing v2 test assert `loaded?.scale` equals the defaults (REQ-011/S3).
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` — expect FAIL: `schemaVersion: 4` not assignable / `scale` missing.
- [ ] 3. GREEN — implement v4 as in Interfaces.
- [ ] 4. Run `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` → all passed.

### T011 [P] · practice.session/REQ-012 · `ScaleSheet` and `ScaleRow`

**Status:** todo

**Files**
- Create: `src/ui/ScaleSheet.tsx`, `src/ui/ScaleRow.tsx`
- Test: `tests/ui/scenarios/scale-sheet.test.tsx`

**Interfaces**
- Consumes: `scalesForMode(mode)`, `spelledScaleOf(key, scale)`, `pitchClassLabel(pitchClass)`, `type Key`, `type ScaleId` (T002); `BottomSheet`, `OverlayScrim`, `OverlayHeader` from `src/ui/overlay.tsx` (as `TempoSheet.tsx` uses them)
- Produces:
  ```tsx
  export const ScaleSheet: React.MemoExoticComponent<(props: { readonly open: boolean; readonly key_: Key; readonly chosenId: ScaleId; readonly onPick: (id: ScaleId) => void; readonly onClose: () => void }) => JSX.Element>
  export const ScaleRow: React.MemoExoticComponent<(props: { readonly formulaLine: string; readonly onOpen: () => void }) => JSX.Element>
  ```
  ScaleSheet: header title `Scales on ${pitchClassLabel(key_.tonic)}`, hint `Major family · tap the inner ring for minor` when `key_.mode === "major"`, else `Minor family · tap the outer ring for major`; one row per `scalesForMode(key_.mode)`: `role="button"` named by `scale.name`, containing `data-testid="scale-formula"` with `spelledScaleOf(key_, scale).formulaLine` and `data-testid="scale-tick"` showing `✓` only for `chosenId`; the chosen row's background `rgba(138,75,42,.08)`, name weight 700 and accent ink, others 600 and ink. Geometry from the design (markup `scalesSlide` sheet, z-index scrim 13 / sheet 14, row padding `10px 18px`, name 14px, formula mono 11px muted). ScaleRow: a `role="button"` named `Scale` — pill with mono `SCALE` label (9.5px, letter-spacing .08em, `#9a9186`), `data-testid="scale-row-formula"` (mono 11.5px 600 `#4a4136`, ellipsis) and a `▼` (9px `#9a9186`); pill padding `5px 11px 6px`, border `1px solid #e0d7c5`, radius 999, background `#f7f3ea`.

**Steps**
- [ ] 1. RED — practice.session/REQ-012/S2: create `tests/ui/scenarios/scale-sheet.test.tsx`:
  ```tsx
  import { cleanup, render, screen, within } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { afterEach, expect, test, vi } from "vitest";
  import type { Key } from "../../../src/theory/published";
  import { ScaleSheet } from "../../../src/ui/ScaleSheet";

  afterEach(() => cleanup());
  const gMajor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "major" };
  const eMinor: Key = { tonic: { letter: "E", accidental: "natural" }, mode: "naturalMinor" };
  const rows = () => screen.getAllByRole("button").filter((b) => within(b).queryByTestId("scale-formula") !== null)
    .map((b) => [b.textContent?.replace(within(b).getByTestId("scale-formula").textContent ?? "", "").replace("✓", "").trim(), within(b).getByTestId("scale-formula").textContent, within(b).getByTestId("scale-tick").textContent]);

  test("practice.session/REQ-012/S2 — the sheet lists only the current mode's family", async () => {
    const onPick = vi.fn();
    const { unmount } = render(<ScaleSheet open key_={gMajor} chosenId="major" onPick={onPick} onClose={() => undefined} />);
    expect(screen.getByText("Scales on G")).toBeTruthy();
    expect(screen.getByText("Major family · tap the inner ring for minor")).toBeTruthy();
    expect(rows()).toEqual([
      ["Major", "1 2 3 4 5 6 7", "✓"], ["Major pentatonic", "1 2 3 5 6", ""], ["Lydian", "1 2 3 ♯4 5 6 7", ""],
      ["Mixolydian", "1 2 3 4 5 6 ♭7", ""], ["Harmonic major", "1 2 3 4 5 ♭6 7", ""],
      ["Whole tone", "1 2 3 ♯4 ♭6 ♭7", ""], ["Chromatic", "1 ♯1 2 ♯2 3 4 ♯4 5 ♯5 6 ♯6 7", ""],
    ]);
    await userEvent.click(screen.getByRole("button", { name: /Lydian/ }));
    expect(onPick).toHaveBeenCalledWith("lydian");
    unmount();
    render(<ScaleSheet open key_={eMinor} chosenId="natural-minor" onPick={onPick} onClose={() => undefined} />);
    expect(screen.getByText("Minor family · tap the outer ring for major")).toBeTruthy();
    expect(rows().map((r) => r[0])).toEqual(["Natural minor", "Harmonic minor", "Melodic minor · classical", "Melodic minor · jazz", "Minor pentatonic", "Blues", "Dorian", "Phrygian", "Locrian", "Whole tone", "Chromatic"]);
    expect(rows()[0]![2]).toBe("✓");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/scale-sheet.test.tsx` — expect FAIL: `Cannot find module '../../../src/ui/ScaleSheet'`.
- [ ] 3. GREEN — write both components (copy `TempoSheet.tsx`'s structure; constants named from the design).
- [ ] 4. Run `pnpm vitest run tests/ui/scenarios/scale-sheet.test.tsx` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/scale-sheet.test.tsx` → `1 passed`.

### T012 · practice.session/REQ-012, REQ-011 · App wiring: the choice, the heading, the row, persistence

**Status:** todo

**Files**
- Modify: `src/ui/App.tsx` (state, session creation, store save, key-name row, `ScaleRow`, `ScaleSheet`, `NamesView`/`StaveView`/`keyView` arguments), `src/ui/key-label.ts:6-9`
- Modify (call sites of `keyLabel`): `src/ui/CircleOfFifths.tsx` (`grep -n "keyLabel(" src/ui/CircleOfFifths.tsx` — pass `scaleById("major")`/`("natural-minor")` by the wedge key's mode; the circle never shows a scale)
- Test: `tests/ui/scenarios/app-session.test.tsx`, `tests/ui/scenarios/selection-persistence.test.tsx`

**Interfaces**
- Consumes: `ScaleSheet`, `ScaleRow` (T011); `Session.setScaleChoice`, `SessionSnapshot.scale/spelledScale/scaleChoice/effectiveShape`, `defaultScaleChoice`, `createSession(context, traversal, scaleChoice, settings, deps)` (T008); `StoredSelection.scale` (T010); `keyView(key, variant, scale)` (T003)
- Produces:
  ```ts
  export function keyLabel(key: Key, scale: Scale): string          // `${pitchClassLabel(key.tonic)} ${scale.title}` — "G major", "E minor", "G Lydian", "E jazz minor"
  export function keyNameFontSizeOf(label: string): number          // label.length <= 10 → 46; <= 15 → 40; else 34 (design keyNameSize)
  ```
  App: `scaleSheetOpen` state; the key-name `div` (`data-testid="current-key"`) becomes a `button` named by its text that opens the sheet; `<ScaleRow formulaLine={snapshot.spelledScale.formulaLine} onOpen=… />` directly under it (design: gap 9px, padding `6px 16px 0`); `handlePickScale(id)` → `session.setScaleChoice({ ...snapshot.scaleChoice, [selection.mode === "major" ? "major" : "minor"]: id })` then closes the sheet; the persistence effect saves `schemaVersion: 4` and `scale: snapshot.scaleChoice` (add `snapshot?.scaleChoice` to its dependency list); `initialScaleChoiceOf(stored) = stored?.scale ?? defaultScaleChoice`; `keyView(selectedKey, variant, snapshot.scale)` for the range summary (`"no notes of this key in range"` text unchanged); `NamesView` gets `scale={snapshot.scale}` (prop added in T013 — pass it now, T013 consumes it); `TraversalSheet` gets `effectiveShape={snapshot.effectiveShape}` and `arpeggioOffered={snapshot.scale.offersArpeggio}` (T014 consumes).

**Steps**
- [ ] 1. RED — practice.session/REQ-012/S1 (app), REQ-011/S1 (app), REQ-011/S2 (app), REQ-011/S4 (app): append to `tests/ui/scenarios/app-session.test.tsx` (using its `render` setup and `testSessionDeps()`):
  ```tsx
  test("practice.session/REQ-012/S1 (app) — choosing a scale changes the heading, the formula row and the names view", async () => {
    localStorage.clear();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={testSessionDeps().sessionDeps} />);
    await userEvent.click(screen.getByRole("button", { name: "G" }));       // the outer-ring wedge, as circle-interaction.test.tsx clicks it
    expect(screen.getByTestId("current-key").textContent).toBe("G major");
    await userEvent.click(screen.getByTestId("current-key"));
    await userEvent.click(screen.getByRole("button", { name: /^Lydian/ }));
    expect(screen.getByTestId("current-key").textContent).toBe("G Lydian");
    expect(screen.getByTestId("scale-row-formula").textContent).toBe("1 2 3 ♯4 5 6 7");
    expect(screen.getAllByTestId("column-name").map((c) => c.textContent)).toEqual(["G", "A", "B", "C♯", "D", "E", "F♯"]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).scale).toEqual({ major: "lydian", minor: "natural-minor" });
  });

  test("practice.session/REQ-011/S1 (app) — Dorian on the minor ring is restored", () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...firstRunDefaults, variantId: "flute-concert", keyId: "E-naturalMinor", scale: { major: "major", minor: "dorian" }, traversal: { direction: "down", octaves: 2, shape: "arpeggio" }, session: { soundMode: "metronome", loop: false, countIn: false, restBar: true, tempoBpm: 132 } }));
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={testSessionDeps().sessionDeps} />);
    expect(screen.getByTestId("current-key").textContent).toBe("E Dorian");
    expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
  });

  test("practice.session/REQ-011/S2 (app) — first run: plain key, no scale suffix", () => {
    localStorage.clear();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={testSessionDeps().sessionDeps} />);
    expect(screen.getByTestId("current-key").textContent).toBe("C major");
    expect(screen.getByTestId("scale-row-formula").textContent).toBe("1 2 3 4 5 6 7");
  });

  test("practice.session/REQ-011/S4 (app) — a v3 payload keeps its settings and takes the default scales", () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 3, variantId: "flute-concert", keyId: "G-major", spelling: "sharp", view: "names", degreesEnabled: true, distanceRingEnabled: true, staveNamesEnabled: false, traversal: { direction: "up", octaves: 2, shape: "scale" }, session: { soundMode: "both", loop: true, countIn: true, restBar: false, tempoBpm: 120 } }));
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={testSessionDeps().sessionDeps} />);
    expect(screen.getByTestId("current-key").textContent).toBe("G major");
    expect(screen.getByText("↑ · 2 oct · scale · loop")).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
  });
  ```
  (`firstRunDefaults` imported from `selection-store`; the E minor key id is whatever `keyId()` produces for E natural minor — check with `keyId({ tonic: { letter: "E", accidental: "natural" }, mode: "naturalMinor" })` and use that literal.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/app-session.test.tsx` — expect FAIL: no `scale-row-formula`, heading unchanged.
- [ ] 3. GREEN — the App changes in Interfaces; `key-label.ts`; the `CircleOfFifths.tsx` call sites.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS (the existing `selection-persistence` tests keep passing with v4; if one asserts `schemaVersion: 3` literally, update it to 4 and cite REQ-011/S1). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/app-session.test.tsx` → all passed.

### T013 [P] · theory.circle-of-fifths/REQ-003, practice.session/REQ-012 · The names view follows the chosen scale

**Status:** todo

**Files**
- Modify: `src/ui/NamesView.tsx` (whole file)
- Test: `tests/ui/scenarios/names-view.test.tsx`

**Interfaces**
- Consumes: `spelledScaleOf(key, scale)`, `signatureOf(key)`, `pitchClassLabel` (T002), `type Scale`
- Produces: `NamesView(props: { readonly key_: Key; readonly scale: Scale; readonly degreesEnabled: boolean; readonly soundingPitchClass: PitchClass | null }): JSX.Element` — columns from `spelledScaleOf(key_, scale).ascending`: `column-name` = `pitchClassLabel`; `note-mark` as today but only when the note's accidental equals the signature's for that letter (an altered note not in the signature shows no mark); `note-degree` = `degreeLabel` when `degreesEnabled` (`data-altered="true"` and accent ink when `altered`); new `data-testid="note-alt"` row = `↓${pitchClassLabel(descending note)}` where the descending form's note for that degree differs, `""` otherwise, and the row is rendered only when `descending` is not null; name font size 26 for ≤7 columns, 21 for ≤9, 15 otherwise (design `namesSize`); sounding highlight also applies to the alt row when the sounding pitch class equals the descending note.

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003/S3 (UI) and practice.session/REQ-012/S4: append to `tests/ui/scenarios/names-view.test.tsx` (its `readColumns` helper gains `alt: within(column).queryByTestId("note-alt")?.textContent ?? null` and `altered: within(column).getByTestId("note-degree").getAttribute("data-altered")`):
  ```tsx
  test("theory.circle-of-fifths/REQ-003/S3 (UI) — the names view follows the chosen scale", () => {
    render(<NamesView key_={gMajor} scale={scaleById("lydian")} degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().map((c) => [c.name, c.degree, c.altered, c.mark])).toEqual([
      ["G", "1", "false", ""], ["A", "2", "false", ""], ["B", "3", "false", ""], ["C♯", "♯4", "true", ""],
      ["D", "5", "false", ""], ["E", "6", "false", ""], ["F♯", "7", "false", "♯1"],
    ]);
  });

  test("practice.session/REQ-012/S4 — the descending alternative for a split-direction scale", () => {
    const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
    render(<NamesView key_={gMinor} scale={scaleById("melodic-minor-classical")} degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().map((c) => [c.name, c.alt])).toEqual([
      ["G", ""], ["A", ""], ["B♭", ""], ["C", ""], ["D", ""], ["E", "↓E♭"], ["F♯", "↓F"],
    ]);
    cleanup();
    render(<NamesView key_={gMinor} scale={scaleById("natural-minor")} degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().every((c) => c.alt === null)).toBe(true);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` — expect FAIL: `scale` prop unknown / `note-alt` missing.
- [ ] 3. GREEN — rewrite `columnsOf` over the spelled scale; add the alt row and size steps.
- [ ] 4. Run `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` — expect PASS (the existing REQ-003/S3 G-major and REQ-010 tests unchanged). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` → all passed.

### T014 [P] · practice.session/REQ-001, REQ-012 · The Traversal sheet greys out an arpeggio the scale does not offer

**Status:** todo

**Files**
- Modify: `src/ui/TraversalSheet.tsx` (props, the `Shape` row, `Pill`)
- Test: `tests/ui/scenarios/traversal-sheet.test.tsx`

**Interfaces**
- Consumes: `type Shape` (theory)
- Produces: `TraversalSheet` props gain `readonly effectiveShape: Shape; readonly arpeggioOffered: boolean` — the shape pills' pressed state follows `effectiveShape`; when `arpeggioOffered` is false the arpeggio pill has `aria-disabled="true"`, ink `#c3baab`, transparent background, and its click does nothing (design `kindPills`). The `TraversalRow` is unchanged (the summary line already carries the effective shape from T008).

**Steps**
- [ ] 1. RED — practice.session/REQ-001/S5 and REQ-012/S3 (UI): append to `tests/ui/scenarios/traversal-sheet.test.tsx` (update the file's existing `<TraversalSheet …>` renders with `effectiveShape={traversal.shape}` and `arpeggioOffered`):
  ```tsx
  test("practice.session/REQ-001/S5 — arpeggio unavailable in the Traversal sheet itself", async () => {
    const onTraversal = vi.fn();
    render(<TraversalSheet open traversal={baseTraversal({ shape: "arpeggio" })} effectiveShape="scale" arpeggioOffered={false} effectiveOctaves={{ kind: "count", count: 1 }} fittingCounts={[1, 2]} settings={baseSettings()} onTraversal={onTraversal} onSettings={noop} onClose={noop} />);
    const arpeggio = screen.getByRole("button", { name: "arpeggio" });
    expect(arpeggio.getAttribute("aria-disabled")).toBe("true");
    expect(pressedOf("scale")).toBe("true");
    expect(pressedOf("arpeggio")).toBe("false");
    await userEvent.click(arpeggio);
    expect(onTraversal).not.toHaveBeenCalled();
  });

  test("practice.session/REQ-012/S3 (UI) — an offered arpeggio is pressable again", async () => {
    const onTraversal = vi.fn();
    render(<TraversalSheet open traversal={baseTraversal({ shape: "arpeggio" })} effectiveShape="arpeggio" arpeggioOffered effectiveOctaves={{ kind: "count", count: 1 }} fittingCounts={[1, 2]} settings={baseSettings()} onTraversal={onTraversal} onSettings={noop} onClose={noop} />);
    expect(screen.getByRole("button", { name: "arpeggio" }).getAttribute("aria-disabled")).toBeNull();
    expect(pressedOf("arpeggio")).toBe("true");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/traversal-sheet.test.tsx` — expect FAIL: unknown props / `aria-disabled` null.
- [ ] 3. GREEN — the prop and pill changes.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/traversal-sheet.test.tsx` → all passed.

### T015 [P] · theory.circle-of-fifths/REQ-003 · The stave draws inline accidentals

**Status:** todo

**Files**
- Modify: `src/ui/StaveView.tsx` (`buildStave` output gains `accidentals`; render them)
- Test: `tests/ui/scenarios/stave-view.test.tsx`

**Interfaces**
- Consumes: `inlineAccidentalsOf(signature, run)` (T007), `signatureOf(key)`
- Produces: for each run note whose entry is not null, an absolutely positioned glyph — font Noto Music, size `Math.round(rx * 2.7)`, at `x - rx - 6.5`, `y + (flat or doubleFlat ? -3 : 0)`, ink and opacity of its notehead — with `data-testid="inline-accidental"`, `data-run-index`, and `data-glyph` in `♮ ♯ ♭ 𝄪 𝄫` (design `accs`). The signature glyphs are unchanged.

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003/S6 (UI) and S3 (UI, stave): append to `tests/ui/scenarios/stave-view.test.tsx` (render `<StaveView …>` directly with `notes` from `traversalOf(...).run`, as the file's REQ-006/S1 test does):
  ```tsx
  test("theory.circle-of-fifths/REQ-003/S6 (UI) — a split-direction scale is written out with held accidentals", () => {
    const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
    const { run } = traversalOf(gMinor, flute, scaleById("melodic-minor-classical"), { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" });
    render(<StaveView key_={gMinor} variant={flute} notes={run} staveNamesEnabled={false} soundingRunIndex={null} playing={false} />);
    expect(screen.getAllByTestId("notehead")).toHaveLength(15);
    expect(screen.getAllByTestId("inline-accidental").map((g) => [g.getAttribute("data-run-index"), g.getAttribute("data-glyph")])).toEqual([
      ["5", "♮"], ["6", "♯"], ["8", "♮"], ["9", "♭"],
    ]);
  });

  test("theory.circle-of-fifths/REQ-003/S3 (UI, stave) — Lydian's C♯ carries an inline sharp", () => {
    const { run } = traversalOf(gMajor, flute, scaleById("lydian"), { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" });
    render(<StaveView key_={gMajor} variant={flute} notes={run} staveNamesEnabled={false} soundingRunIndex={null} playing={false} />);
    expect(screen.getAllByTestId("inline-accidental").map((g) => [g.getAttribute("data-run-index"), g.getAttribute("data-glyph")])).toEqual([["3", "♯"]]);
  });
  ```
  (`notehead` is the existing test id for a notehead — confirm with `grep -n 'data-testid="notehead' src/ui/StaveView.tsx` and use the real id.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` — expect FAIL: no `inline-accidental` elements.
- [ ] 3. GREEN — compute `inlineAccidentalsOf(signature, notes)` in `StaveView`, add the glyph entries to `buildStave`'s result, render them.
- [ ] 4. Run `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` → all passed.

### T016 · — · Design-review loop points at this change's prototype

**Status:** todo

**Files**
- Modify: `scripts/design-shots.mjs` (`PROTOTYPE_PATH` → `changes/005-scale-selection/design/hear-the-scale.dc.html`; `STATES` gains `scale-sheet-open` (tap the key name), `g-lydian-names` (Lydian chosen, names view), `g-melodic-minor-stave` (E minor → minor ring G… use G minor: tap the inner-ring G wedge, choose Melodic minor · classical, stave view, ↑↓), `pentatonic-traversal-sheet` (Major pentatonic chosen, Traversal sheet open))
- Modify: `changes/005-scale-selection/notes.md` (one line per visual deviation found)

**Steps**
- [ ] 1. Update `PROTOTYPE_PATH` and add the four states, driving the prototype and the app to the same state (the prototype's controls are the same DOM the 003 states already drive; the new sheet is opened by clicking the key-name element).
- [ ] 2. Run `pnpm dev` in one shell and `node scripts/design-shots.mjs` in another; open `.sdd/design-review/` and compare each pair.
- [ ] 3. For each visible divergence, either fix the constant in the component (copy the design's value, name it) or record in `notes.md` why it stays (e.g. the ♩/♪ row is absent by decision).
- [ ] 4. `pnpm check` — green.

**Verify** — `ls .sdd/design-review/` lists `*-prototype.png` and `*-app.png` for all four new states; `notes.md` has a line per accepted divergence.

## Phase 4 — Hardening

### T017 · — · Every row of the proposal's edge-case table has a test

**Status:** todo

**Files**
- Test: `tests/practice/scenarios/edge-cases.test.ts`, `tests/ui/scenarios/edge-cases.test.tsx`

**Steps**
- [ ] 1. RED → GREEN, practice: "arpeggio selected, then an arpeggio-ineligible scale is chosen while playing" — `sessionOn("G", "flute-concert", { direction: "up", octaves: { kind: "count", count: 1 }, shape: "arpeggio" }, defaultSessionSettings)`, `session.start()`, advance past the count-in to position 2, `session.setScaleChoice({ ...defaultScaleChoice, major: "blues" })` — expect `transport` `{ kind: "playing", position: 0 }`, `effectiveShape` `"scale"`, and the run's first note `G4` (blues on G major's ring is offered from the minor ring only — so use the minor ring instead: `sessionOn("Gm", …, { …, shape: "arpeggio" }, …)` with `setScaleChoice({ ...defaultScaleChoice, minor: "blues" })`; the run is then `G4 B♭4 C5 C♯5 D5 F5 G5`).
- [ ] 2. RED → GREEN, practice: "the chosen scale's tonic has no whole-octave fit" — `sessionOn("F#", "ocarina-bass-c", defaultTraversal, defaultSessionSettings, { ...defaultScaleChoice, major: "major-pentatonic" })` — expect `fittingCounts` `[]`, `effectiveOctaves` `{ kind: "full" }`, caption `"9 notes · A♯3–D♯5"` (compute: F♯ major pentatonic is F♯ G♯ A♯ C♯ D♯; in A3–F5 the in-range notes are A♯3 C♯4 D♯4 F♯4 G♯4 A♯4 C♯5 D♯5 — 8 notes; if the count differs, the test's expected value is the sequence length the session reports for ↑↓, `2 × 8 − 1 = 15`, and the caption `"15 notes · A♯3–D♯5"`; write the test against the ↑↓ default traversal and the corrected numbers).
- [ ] 3. RED → GREEN, ui: "stored state predates this change (no scale choice)" is already T010/T012's REQ-011/S4 — add a one-line reference test in `tests/ui/scenarios/edge-cases.test.tsx` that renders `App` with a v2 payload and asserts the heading `C major` / `G major` per its key and `scale-row-formula` `1 2 3 4 5 6 7`.
- [ ] 4. `pnpm check` — green.

**Verify** — `pnpm vitest run tests/practice/scenarios/edge-cases.test.ts tests/ui/scenarios/edge-cases.test.tsx` → all passed; test names list the three edge-case rows.

### T018 · — · `AGENTS.md` architecture, scenario coverage, timing

**Status:** todo

**Files**
- Modify: `AGENTS.md` (Architecture: `src/theory/` list gains "scales (the catalogue), notation"; the `Healthy output` block is re-pasted from a fresh `pnpm check`)

**Steps**
- [ ] 1. Run `./scripts/check-scenarios.sh changes/005-scale-selection` — every scenario ID in the two deltas is attributed to a test; fix any name that does not cite its ID verbatim.
- [ ] 2. Run `./scripts/check-contexts.sh` — no cross-context import (the UI imports only `theory/published` and `practice/published`).
- [ ] 3. Run `pnpm check`; paste the last eight lines into `AGENTS.md`'s healthy-output block; update the Architecture sentence.
- [ ] 4. Run `pnpm test:timing` — expect `test:timing: PASS` at 40/96/200 bpm (the transport is unchanged; this is the regression guard).

**Verify** — `./scripts/check-scenarios.sh changes/005-scale-selection` → no gaps; `pnpm test:timing` → `PASS`.

### T019 · — · Converge

**Status:** todo

**Steps**
- [ ] 1. Run `sdd-converge`; append any gap it finds as new tasks here.

**Verify** — the convergence report says Converged, or new tasks exist below.

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-012 (ADDED) — S1 T012 · S2 T011 · S3 T008, T014 · S4 T013 · S5 T002 | T002, T008, T011, T012, T013, T014 | ✅ |
| practice.session/REQ-001 (MODIFIED) — S1–S4 existing tests kept · S5 T014 (+T008 session-level) | T008, T014 | ✅ |
| practice.session/REQ-007 (MODIFIED) — S1–S3 existing · S4 T009 | T009 | ✅ |
| practice.session/REQ-011 (MODIFIED) — S1 T010, T012 · S2 T012 · S3 T010 · S4 T010, T012 | T010, T012 | ✅ |
| theory.circle-of-fifths/REQ-003 (MODIFIED) — S1, S2, S4 existing · S3 T002, T007, T013, T015 · S5 T003 · S6 T005, T007, T015 | T001, T002, T003, T005, T007, T013, T015 | ✅ |
| theory.circle-of-fifths/REQ-012 (MODIFIED) — S1–S4 existing · S5 T006 · S6 T005 · S7 T004 | T004, T005, T006 | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `type Accidental = "doubleFlat" \| "flat" \| "natural" \| "sharp" \| "doubleSharp"` | T002, T007, T015 |
| T002 | `spelledScaleOf(key: Key, scale: Scale): SpelledScale` | T003, T004, T006, T008, T011, T013 |
| T002 | `scaleById(id: ScaleId): Scale` / `scalesForMode(mode: Mode): readonly Scale[]` / `SCALES` | T003–T015 |
| T003 | `keyView(key: Key, variant: Variant, scale: Scale): KeyView`; `KeyViewNote.degree/degreeLabel/altered` | T004, T012 |
| T003 | `rangedNotesOf(scaleNotes: readonly ScaleNote[], tonic: PitchClass, variant: Variant): readonly KeyViewNote[]` (domain-internal) | T004, T005 |
| T004 | `traversalOf(key: Key, variant: Variant, scale: Scale, traversal: Traversal): TraversalNotes` | T005, T006, T007, T008, T015 |
| T004 | `fittingOctaveCounts(key, variant, scale)` / `effectiveOctavesOf(key, variant, scale, octaves)` | T006, T008 |
| T007 | `inlineAccidentalsOf(signature: Signature, run: readonly KeyViewNote[]): readonly (Accidental \| null)[]` | T015 |
| T008 | `createSession(context, traversal, scaleChoice: ScaleChoice, settings, deps)`; `Session.setScaleChoice(choice: ScaleChoice)`; `SessionSnapshot.scale/spelledScale/scaleChoice/effectiveShape`; `defaultScaleChoice`; `chosenScaleIdFor` | T009, T012, T017 |
| T008 | `summaryLineOf(traversal, effectiveOctaves, effectiveShape: Shape, settings)` | T012 (via snapshot), existing call sites |
| T010 | `StoredSelection.schemaVersion: 4`, `.scale: { major: ScaleId; minor: ScaleId }`, `firstRunDefaults.scale` | T012, T017 |
| T011 | `ScaleSheet({ open, key_, chosenId, onPick, onClose })`, `ScaleRow({ formulaLine, onOpen })` | T012 |
| T012 | `keyLabel(key: Key, scale: Scale): string`, `keyNameFontSizeOf(label: string): number` | — |
| T013 | `NamesView` prop `scale: Scale` | T012 |
| T014 | `TraversalSheet` props `effectiveShape: Shape`, `arpeggioOffered: boolean` | T012 |

## Deferred

- Beaming or a different glyph for the 12-column chromatic names view on a
  phone — the design sets 15px and stops there; judge at acceptance.
- Widening `NOTE_STRING_PATTERN` (instrument data files) to double
  accidentals — no variant needs one; a data-file change when one does.
