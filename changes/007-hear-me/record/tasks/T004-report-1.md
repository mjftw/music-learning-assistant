---
type: Implementation Report
title: T004 — implementation report
resource: /.sdd/reports/007-hear-me/T004.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T004.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-27T23:45:46Z
sdd_id: 007-hear-me
---

TASK: T004
STATUS: BLOCKED
COMMIT: none
FILES:
src/theory/domain/notes.ts
src/theory/domain/temperament.ts
src/theory/published/index.ts
tests/theory/scenarios/temperament.test.ts
tests/theory/invariants/nearest-note-inverse.test.ts

VERIFY:
```
$ pnpm vitest run tests/theory

 ❯ tests/theory/scenarios/temperament.test.ts (7 tests | 1 failed) 29ms
   × theory.temperament/REQ-002/S4 — halfway belongs to the note above 9ms

 FAIL  tests/theory/scenarios/temperament.test.ts > theory.temperament/REQ-002/S4 — halfway belongs to the note above
AssertionError: expected [ 'A4', 50 ] to deeply equal [ 'A♯4', -50 ]

- Expected
+ Received

  [
-   "A♯4",
-   -50,
+   "A4",
+   50,
  ]

 ❯ tests/theory/scenarios/temperament.test.ts:98:24
     96|
     97| test("theory.temperament/REQ-002/S4 — halfway belongs to the note abov…
     98|   expect(near(452.89)).toEqual(["A♯4", -50]);
       |                        ^
     99|   expect(near(452.8)).toEqual(["A4", 50]);
    100| });

 Test Files  1 failed | 14 passed (15)
      Tests  1 failed | 53 passed (54)
```

CHECK:
```
$ pnpm check

 ❯ tests/theory/scenarios/temperament.test.ts (7 tests | 1 failed) 29ms
   × theory.temperament/REQ-002/S4 — halfway belongs to the note above 9ms
 FAIL  tests/theory/scenarios/temperament.test.ts > theory.temperament/REQ-002/S4 — halfway belongs to the note above
AssertionError: expected [ 'A4', 50 ] to deeply equal [ 'A♯4', -50 ]
 ❯ tests/theory/scenarios/temperament.test.ts:98:24

 Test Files  1 failed | 59 passed (60)
      Tests  1 failed | 241 passed (242)
   Start at  00:45:11
   Duration  8.25s (tests 45%, environment 37%, import 10%, transform 7%)
 ELIFECYCLE  Command failed with exit code 1.
```
(prettier and eslint passed silently before vitest ran; tsc, cargo fmt/clippy/test never ran because the chain stopped at the failing vitest step.)

Everything else built and implemented cleanly: `noteAtPosition` (a fixed
12-entry pitch-class table per spelling, in `notes.ts`) and `nearestNoteOf`
(in `temperament.ts`, using exactly the two formulas given in Interfaces),
both exported from `theory/published`. REQ-002/S1, S2, S3, S5 (the A0–C8
inverse invariant) and the *second* assertion of S4 (`near(452.8) →
["A4", 50]`) all pass. Only the *first* assertion of S4 fails, and I
believe it cannot pass under the literal formula given — see below.

CONCERNS:
- Fixed a `-0` vs `0` mismatch in `nearestNoteOf`'s cents (S3:
  `near(466.16, "sharp")` was returning `-0` because 466.16 sits an
  insignificant sliver below A♯4's exact 466.1637615… Hz, and
  `Math.round` of a small negative fraction is `-0`, which `toEqual`
  treats as unequal to `0`). Fixed with `Math.round(...) + 0` (IEEE-754
  folds `-0 + 0` to `+0`), commented in place. This is not a rounding-rule
  change — `Math.round` is still exactly as specified — just a sign-of-zero
  normalisation, and it is covered by the S3 test.

QUESTION: theory.temperament/REQ-002/S4's first assertion —
`near(452.89) → ["A♯4", -50]` — cannot be satisfied by the literal formula
in Interfaces (`position = Math.round(69 + 12 * Math.log2(hz / 440))`).
At full IEEE-754 double precision, `12 * Math.log2(452.89 / 440) =
0.499885928182109751`, i.e. 452.89 Hz sits ~0.0114 cents *below* the true
A4–A♯4 halfway point (`440 * 2**(0.5/12) = 452.8929841231365` Hz), so
`Math.round(69.499885928…) = 69` (A4), and `Math.round(1200 *
Math.log2(452.89/440)) = 50` — giving `["A4", 50]`, not `["A♯4", -50]`.
This isn't a floating-point artefact of Node's `Math.log2` (I cross-checked
with 60-digit-precision decimal arithmetic and got the same figure to 15
significant digits); 452.89 genuinely is not exactly halfway once carried
past 2 decimal places. I could not find any rounding order that satisfies
both assertions in the same test: whichever way you round *whole cents*
before deciding the note, `452.89`'s cents-from-A4 (49.9886) and `452.8`'s
(49.6445) both round to the same whole cent (50), so a rule keyed on
"rounds to 50 → bump to the note above" bumps both, and the second
assertion (`near(452.8) → ["A4", 50]`, no bump) then fails instead. Only
rounding the *continuous* semitone offset directly (as literally specified)
gets the second assertion right — and that is what my implementation does.
452.90 Hz *does* cross the boundary cleanly under the same formula
(`Math.round(69.500268…) = 70`, cents `Math.round(-49.973…) = -50`,
giving `["A♯4", -50]`) if the scenario's first value needs correcting.
Is the fix to correct 452.89 to 452.90 (or another value that actually
straddles the exact halfway point) in the scenario, or is there a
tolerance/rounding rule for "close enough to halfway" that the brief
doesn't state and I should implement? I did not invent one rather than
guess at an unstated value.

<!-- recorded 2026-09-28T07:31:28Z by scripts/record.sh -->
