---
type: Implementation Report
title: T037 — implementation report
resource: /.sdd/reports/007-hear-me/T037.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T037.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T20:33:57Z
sdd_id: 007-hear-me
---

TASK: T037
STATUS: DONE
COMMIT: none (brief said do not commit)
FILES:
src/practice/published/note-judged.schema.ts
tests/practice/scenarios/tuner-reading.test.ts

VERIFY:
RED (before the schema existed — `noteJudgedSchema` undefined, run against the
new test added to `tests/practice/scenarios/tuner-reading.test.ts`):
```
 FAIL  tests/practice/scenarios/tuner-reading.test.ts > note judged schema — a valid NoteJudged parses; a non-integer octave is refused
TypeError: Cannot read properties of undefined (reading 'safeParse')
 ❯ tests/practice/scenarios/tuner-reading.test.ts:127:27
```

GREEN (`pnpm vitest run tests/practice/scenarios/tuner-reading.test.ts`,
after adding `noteJudgedSchema`):
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  21:09:20
   Duration  924ms (environment 43%, transform 36%, import 15%, tests 5%)
```

`pnpm vitest run tests/practice tests/ui`:
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  60 passed (60)
      Tests  284 passed (284)
   Start at  21:25:02
   Duration  12.33s (tests 54%, environment 28%, import 10%, transform 9%)
```

CHECK:
`bash -c "source ~/.cargo/env && pnpm check"`:
```
 Test Files  77 passed (77)
      Tests  345 passed (345)
   Start at  21:25:46
   Duration  13.69s (tests 54%, environment 30%, import 9%, transform 7%)

    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.03s
     Running unittests src/lib.rs (target/debug/deps/listening-5b95a1ddecce7a22)
running 14 tests
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.58s

     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)
running 25 tests
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
prettier and eslint reported no issues (silent pass before the vitest `RUN`
banner); tsc, cargo fmt --check and cargo clippy -D warnings all passed
(no output, no non-zero exit before the next stage ran).

CONCERNS:
- The working tree is shared with other concurrent sessions on this branch
  (`git status` shows unrelated modified files — `scripts/tuner-timing-test.mjs`,
  `src/ui/TargetSheet.tsx`, `src/ui/TunerLevel.tsx`, `src/ui/TunerStave.tsx`,
  and several test files — none of which I touched). The `pnpm check` run
  above therefore exercises that combined, uncommitted state, not my diff in
  isolation. My own diff is confined to the two files listed above; I did not
  stage, commit, or otherwise touch any other file. Re-running `pnpm check`
  once those other sessions land or are reverted would be a good idea before
  final merge, though it isn't something I can control from this task.
- `src/practice/published/index.ts` was checked and left untouched, per the
  brief's instruction: `targetAdvancedSchema` (the sibling this task mirrors)
  is not exported from `index.ts` — only the `TargetAdvanced` type is — so
  `noteJudgedSchema` was correspondingly not added to any export list either.
- The schema test doesn't have a scenario ID (it isn't a spec scenario, it's
  a unit test of the schema's shape) — named `"note judged schema — …"`,
  mirroring the one precedent of this exact test shape in the codebase
  (`web-audio-problems.test.ts`'s `"sound command schema — …"` test for
  `soundCommandSchema`). It lives in `tests/practice/scenarios/tuner-reading.test.ts`
  since that's the existing scenario file that already imports and exercises
  `NoteJudged` for `practice.tuner/REQ-002`.

<!-- recorded 2026-09-29T20:40:01Z by scripts/record.sh -->
