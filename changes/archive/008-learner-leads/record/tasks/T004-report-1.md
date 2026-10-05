---
type: Implementation Report
title: T004 — implementation report
resource: /.sdd/reports/008-learner-leads/T004.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T004.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T18:07:38Z
sdd_id: 008-learner-leads
---

TASK: T004
STATUS: DONE
COMMIT: none (brief says "Do not commit")
FILES:
src/ui/selection-store.ts
src/ui/theme.ts
src/ui/App.tsx
tests/ui/scenarios/selection-store.test.ts

VERIFY:
```
$ pnpm vitest run tests/ui/scenarios/selection-store.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  19:03:24
   Duration  620ms (environment 44%, transform 38%, import 15%, tests 3%, worker 1%)
```
All 14 tests pass, including the four new ones named after the brief's
scenario IDs (`practice.session/REQ-011/S5`, `/S1 (store)`, `/S2 (store)`,
and the unnumbered "a bad lead field falls back on its own" test).

Also ran, as step 4 asked:
```
$ pnpm vitest run tests/ui/scenarios/selection-store.test.ts tests/ui/scenarios/selection-persistence.test.tsx tests/ui/scenarios/app-session.test.tsx tests/ui/scenarios/names-tap.test.tsx

 Test Files  4 passed (4)
      Tests  35 passed (35)
```

CHECK:
```
$ source ~/.cargo/env && pnpm check
...
 Test Files  80 passed (80)
      Tests  365 passed (365)
   Start at  19:06:33
   Duration  16.73s (tests 56%, environment 29%, import 9%, transform 6%)
...
running 14 tests
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.20s
running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
```
`prettier --check`, `eslint`, `tsc --noEmit`, `vitest run`, `cargo fmt
--check`, `cargo clippy -D warnings` and `cargo test` all green, exit code 0.
Also ran `scripts/check-contexts.sh` (✅ context boundaries respected) and
`scripts/check-scenarios.sh` (✅ scenario coverage complete).

CONCERNS:
- One earlier `pnpm check` run (before the clean one pasted above) failed on
  `tests/practice/invariants/hold-never-early.test.ts`'s
  `practice.session/REQ-016/S6` with `Test timed out in 15000ms` under full
  test-suite parallel load. This test is pre-existing (committed at b67cc8d,
  before this task), its own comment already notes it is "over the 10 s
  budget on this machine," and I never touched `src/practice/` or
  `tests/practice/`. It passed standalone in 7.6s and the full suite passed
  cleanly (exit 0) on a clean rerun. Flagging it as a known-flaky timing test
  on this machine, not something T004 introduced or should mask.

CHOICES MADE:
- Kept the existing `SelectionStore.load()`/`.save()` method names rather
  than the brief's test pseudocode's `.read()`/`.write()` — the actual
  `SelectionStore` interface in this file has always been `load`/`save`
  (confirmed across every other call site: App.tsx, main.tsx, every other
  test file) and the brief's Interfaces › Produces section never asks for a
  rename, only for `StoredSelection`'s shape and the v6 schema. Adapting the
  brief's test snippet to the file's own method names, the same way the
  brief's own note licenses adapting fixture names.
- Likewise kept the file's existing lowercase `storageKey` local constant
  instead of introducing an exported/imported `STORAGE_KEY` (the brief's
  snippet used `STORAGE_KEY` loosely; no file in this codebase actually
  exports that name — every test file, including this one, declares its own
  local copy of the literal).
- `v5Document`/`v6Document` didn't already exist in the file (the closest
  existing fixtures, `v4Payload`/`migrateExpectation`, are for the v4→v5
  step), so I added them fresh, following the file's own fixture style
  (plain object literals with `as const` on narrow fields, as `v4Payload`
  does) and the exact field values the brief's comment described (flute
  Concert, G major, ↓ 2 oct arpeggio, metronome, loop off, count-in off,
  rest bar on, 132 bpm, Dorian on the minor ring, drone octave 5 warm).
- Extracted a named `storedSessionSchema` from v3's previously-inline
  `session: z.object({...})` so the v6 schema could `.extend()` it with
  `lead` instead of repeating its five fields (docs/engineering.md's "never
  duplicate a private helper" instinct, applied to a schema fragment within
  the same file).
- Introduced `migrateFromV5` and a `StoredSelectionV5` type alias
  (`z.infer<typeof storedSelectionV5Schema>`) to carry the v1–v5 chain
  through to v6; changed `migrateFromV4`'s return type annotation from
  `StoredSelection` (now v6-shaped) to `StoredSelectionV5`, since its actual
  output (schemaVersion 5, no `lead`) never changed.
- Fixed several pre-existing tests in this same file that constructed
  `StoredSelection` literals or asserted a literal expected object
  (`a v4 payload round-trips`, `a v3 payload migrates`, `a v2 payload
  migrates`, `empty storage loads as null; first-run defaults match the
  spec`, the two `practice.drone/REQ-009/S3`/`S4` tests, and the final
  round-trip test) — all of these would otherwise fail to compile or assert
  a now-wrong schemaVersion/session shape once `StoredSelection` became v6.
  Renamed "a v5 payload round-trips" → "a v6 payload round-trips" (and its
  local `v5`/`v6` variable) since it now is one. This is the same kind of
  ripple the context note calls out for App.tsx's write path, just inside
  the task's own test file.
- `theme.ts` gained only the `lead.holdFill` token the brief's Produces
  section names (plus a doc comment cross-referencing REQ-017 and the
  existing `tuner` tokens for band/line/verdict colours) — left the sheet
  row metrics and mode-word underline mentioned in the plan's Structure
  section for the task that actually builds `TraversalSheet`/`TransportCard`,
  since T004's own Interfaces › Produces block only names `lead`.
- `App.tsx`'s `initialSettingsOf` now reads `stored?.session.lead`, falling
  back to `defaultLeadSettings` only when nothing is stored at all (per the
  controller's note) — the spread of `stored?.session ?? firstRunDefaults.session`
  already carries a `lead` field now that both are v6-shaped, so the explicit
  `lead:` override is slightly redundant but makes the fallback rule
  textually explicit, matching the instruction literally.

<!-- recorded 2026-10-02T18:12:17Z by scripts/record.sh -->
