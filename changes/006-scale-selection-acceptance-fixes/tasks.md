---
type: Task List
title: scale-selection-acceptance-fixes — tasks
description: 3 tasks — stave keys, names-view descent, converge
resource: /changes/006-scale-selection-acceptance-fixes/tasks.md
status: stable
tags: [sdd, tasks, "change:006-scale-selection-acceptance-fixes"]
sources:
  - resource: /changes/006-scale-selection-acceptance-fixes/plan.md
  - resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
generated:
  by: claude-code/unknown
  at: 2026-09-24T07:52:50Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:56:34Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: practice
sdd_phase: in-progress
---

# Tasks: <Feature name>

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

## Phase 1 — The fixes

Shared conventions: tests import only from `src/theory/published`, `src/practice/published` or `src/ui/*`; test names begin with the qualified scenario ID; `pnpm vitest run path/to/file` runs one file; `pnpm check` (with `export PATH="$HOME/.cargo/bin:$PATH"`) is the gate.

### T001 · theory.circle-of-fifths/REQ-003 · The stave keys noteheads by run position; no artefact survives a scale change

**Status:** todo

**Files**
- Modify: `src/ui/StaveView.tsx:434-437` (the `stave.heads.map` `key`), and any other `key={noteLabel(…)}` in that file (`grep -n "key=" src/ui/StaveView.tsx`)
- Test: `tests/ui/scenarios/stave-view.test.tsx`

**Interfaces**
- Consumes: `traversalOf(key, variant, scale, traversal).run`, `scaleById`, the file's `flute()` helper and `gMajor`-style keys; `StaveView` props unchanged
- Produces: noteheads (and any list keyed by label) keyed by the run index

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-003/S7: append to `tests/ui/scenarios/stave-view.test.tsx`:
  ```tsx
  test("theory.circle-of-fifths/REQ-003/S7 — the stave after a scale change is exactly the new run", () => {
    const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
    const oneOctUpDown = { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" } as const;
    const runFor = (id: ScaleId) => traversalOf(gMinor, flute(), scaleById(id), oneOctUpDown).run;
    const heads = () => screen.getAllByTestId("stave-note").length;
    const { rerender } = render(<StaveView key_={gMinor} variant={flute()} notes={runFor("melodic-minor-classical")} staveNamesEnabled soundingRunIndex={null} playing={false} />);
    expect(heads()).toBe(15);
    for (const [id, count] of [["natural-minor", 8], ["harmonic-minor", 8], ["blues", 7]] as const) {
      rerender(<StaveView key_={gMinor} variant={flute()} notes={runFor(id)} staveNamesEnabled soundingRunIndex={null} playing={false} />);
      expect(heads()).toBe(count);
      expect(screen.getAllByTestId("stave-name").length).toBe(count);
    }
    expect(screen.getAllByTestId("inline-accidental").map((g) => g.getAttribute("data-glyph"))).toEqual(["♮", "♭"]);
  });
  ```
  (`stave-name` is the name-label test id — confirm with `grep -n 'data-testid="stave-name' src/ui/StaveView.tsx` and use the real id; the blues run is G4 B♭4 C5 D♭5 D5 F5 G5 — D♭5 needs an inline ♭ and D5 an inline ♮ after it, in that order.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` — expect FAIL: a React "Encountered two children with the same key" warning on the melodic render and a head/name count that does not match after the rerenders (the artefact).
- [ ] 3. GREEN — `key={head.runIndex}` (add `runIndex` to the head geometry if absent — it is the index in `notes`); key the names row by index if it is not already.
- [ ] 4. Run the file — expect PASS with no key warning. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` → all passed, no "same key" warning in the output.

### T002 · practice.session/REQ-012 · The names view shows a split-direction scale's descent

**Status:** todo

**Files**
- Modify: `src/ui/NamesView.tsx` (props gain `direction: Direction`; the alt row and `altOf`/`altIsSounding` go; a ↓ group is appended), `src/ui/App.tsx` (pass `direction={snapshot === null ? "updown" : snapshot.traversal.direction}` at the `<NamesView>` call site)
- Test: `tests/ui/scenarios/names-view.test.tsx` (replace the REQ-012/S4 test; add `direction="updown"` to every existing `<NamesView …>` render)

**Interfaces**
- Consumes: `spelledScaleOf(key, scale).ascending/.descending`, `type Direction` (`"up" | "down" | "updown"`) from `src/theory/published`
- Produces: `NamesView(props: { key_: Key; scale: Scale; direction: Direction; degreesEnabled: boolean; soundingPitchClass: PitchClass | null })`. Columns: `direction === "down"` and `descending !== null` → the descending form's notes (marks/degree labels/altered from those notes); otherwise the ascending form; then, when `direction === "updown"` and `descending !== null`, the descending form's notes whose pitch class differs from the ascending note of the same degree, in descending playing order (highest degree first), each rendered as a column with `data-testid="names-column"`, `data-descent="true"`, the name prefixed by "↓" in a `data-testid="descent-mark"` element (mono, 10px, muted — the `note-mark` row's slot), the same `column-name`/`note-degree` children; no `note-alt` row anywhere. Font size steps by the total column count (26 ≤7 / 21 ≤9 / 15). Sounding highlight matches any column whose pitch class is the sounding one.

**Steps**
- [ ] 1. RED — practice.session/REQ-012/S4: replace the existing S4 test in `tests/ui/scenarios/names-view.test.tsx` with:
  ```tsx
  test("practice.session/REQ-012/S4 — the descent of a split-direction scale in the names view", () => {
    const gMinor: Key = { tonic: { letter: "G", accidental: "natural" }, mode: "naturalMinor" };
    const melodic = scaleById("melodic-minor-classical");
    render(<NamesView key_={gMinor} scale={melodic} direction="updown" degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().map((c) => [c.name, c.descent])).toEqual([
      ["G", "false"], ["A", "false"], ["B♭", "false"], ["C", "false"], ["D", "false"], ["E", "false"], ["F♯", "false"], ["F", "true"], ["E♭", "true"],
    ]);
    expect(screen.queryAllByTestId("note-alt")).toHaveLength(0);
    cleanup();
    render(<NamesView key_={gMinor} scale={melodic} direction="up" degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().map((c) => c.name)).toEqual(["G", "A", "B♭", "C", "D", "E", "F♯"]);
    cleanup();
    render(<NamesView key_={gMinor} scale={melodic} direction="down" degreesEnabled soundingPitchClass={null} />);
    expect(readColumns().map((c) => c.name)).toEqual(["G", "A", "B♭", "C", "D", "E♭", "F"]);
    cleanup();
    render(<NamesView key_={gMinor} scale={scaleById("natural-minor")} direction="updown" degreesEnabled soundingPitchClass={null} />);
    expect(readColumns()).toHaveLength(7);
  });
  ```
  and in `readColumns` replace the `alt` reading with `descent: column.getAttribute("data-descent")`.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` — expect FAIL: 7 columns, `descent` null.
- [ ] 3. GREEN — implement per Interfaces; wire `direction` in App.tsx.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — delete the alt-row constants that no longer have a use.

**Verify** — `pnpm vitest run tests/ui/scenarios/names-view.test.tsx tests/ui/scenarios/app-session.test.tsx` → all passed.

### T003 · — · Converge

**Status:** todo

**Steps**
- [ ] 1. Run `sdd-converge`; append any gap as new tasks here.

**Verify** — the convergence report says Converged, or new tasks exist below.

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-012 (MODIFIED) — S4 T002; S1–S3, S5 existing tests kept | T002 | ✅ |
| theory.circle-of-fifths/REQ-003 (MODIFIED) — S7 T001; S1–S6 existing tests kept | T001 | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T002 | `NamesView` prop `direction: Direction` | App.tsx (T002) |

## Deferred

- None.
