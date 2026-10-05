---
type: Implementation Report
title: C008_T017 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T017.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T017.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-04T06:32:43Z
sdd_id: 008-learner-leads
---

TASK: C008_T017
STATUS: DONE_WITH_CONCERNS
COMMIT: 21bd837
FILES:
tests/ui/scenarios/app-session.test.tsx
tests/ui/scenarios/lead-app-helpers.tsx
tests/ui/scenarios/traversal-sheet-lead.test.tsx
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  07:31:40
   Duration  2.96s (tests 67%, transform 15%, environment 10%, import 8%)
CHECK:
 Test Files  92 passed (92)
      Tests  446 passed (446)
   Start at  07:32:01
   Duration  22.53s (tests 59%, environment 27%, import 8%, transform 5%)

Environment  jsdom was created 92 times · 97.32s total, 27% of tracked time
             create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
             learn more: https://vitest.dev/guide/improving-performance#test-environments
[... cargo fmt --check, cargo clippy -D warnings, cargo test — all clean/ok, ending:]
   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
CONCERNS:
- The brief's Files list named `tests/ui/scenarios/selection-persistence.test.tsx` as the test to extend, but that file has no REQ-011/S1–S5 tests at all (confirmed by grep) — the real S1/S2/S3/S4 REQ-011 tests the brief says to extend live in `tests/ui/scenarios/app-session.test.tsx`. I added the brief's four new RED tests and the S3/S4 extensions there instead, per the "a Files list can omit a file the change necessarily ripples into" guidance, and ran the brief's literal Verify line against `selection-persistence.test.tsx` too (still 5/5 green, untouched).
- One run of the full `pnpm check` showed `app-drone.test.tsx`'s REQ-001/S4 test time out at 5000ms under system load; it is untouched by this task, passes alone and on a clean stash of my changes it is absent from the slow run too — a second full `pnpm check` run (pasted above) was fully green, confirming pre-existing flakiness under load, not a regression from this task.
- Confirming the context note: every Produces item (`createSession(..., initialSettingsOf(stored), ...)` carrying `lead`; `handleSessionSettings`/the save effect writing the whole `SessionSettings` including `lead`; never calling `start()` on load) was already implemented by T001/T004/T012/T016 before this task — no production code in `src/ui/App.tsx` needed changing. All of the brief's new RED tests except two assertion-site bugs of my own making (an ambiguous `getByText("Allegro")` and forgetting to switch to "I lead" before reading the sheet's Hold/In tune/Cues rows in the S3/S4 extensions) passed on the first run, confirming the restore/store path is already correct; I fixed those two test bugs, not production code.
CHOICES MADE:
- Moved `openSheet`, `pill`, `pillSelected` into `lead-app-helpers.tsx` as the brief directs; also moved `row` (both pill helpers depend on it) to avoid a duplicate — `traversal-sheet-lead.test.tsx` now imports `row` for its own local `rows()`/`hintOf()` and no longer defines any of the four itself.
- Added the brief's four new tests and the S3/S4 extensions to `app-session.test.tsx` (where the existing REQ-011/S1–S5 tests actually live) rather than `selection-persistence.test.tsx` (named in the brief but containing no REQ-011 scenario tests); still ran the brief's literal Verify command against `selection-persistence.test.tsx` to confirm it stays green.
- For the REQ-011/S5 test, inlined the same literal v5 payload `selection-store.test.ts`'s own `v5Document` fixture carries (flute Concert, G major, ↓ 2 oct arpeggio, metronome, loop off, count-in off, rest bar on, 132 bpm, Dorian, drone octave 5 warm) directly in the new app-level test rather than importing a fixture across test files.
- Used `screen.getByRole("button", { name: "Allegro" })` instead of the brief's literal `screen.getByText("Allegro")`, which was ambiguous (the tempo button and a separate `tempo-term-name` div both render "Allegro" text) — matches the convention the file's existing REQ-011/S1 test already uses.

<!-- recorded 2026-10-04T06:36:30Z by scripts/record.sh -->
