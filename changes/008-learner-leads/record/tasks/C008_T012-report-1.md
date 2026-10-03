---
type: Implementation Report
title: C008_T012 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T012.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T012.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-03T09:40:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T012
STATUS: DONE
COMMIT: d094b26
FILES:
src/ui/TransportCard.tsx
src/ui/theme.ts
src/ui/App.tsx
tests/ui/scenarios/transport-card.test.tsx
tests/ui/scenarios/transport-card-lead.test.tsx (new)
tests/ui/scenarios/lead-app-helpers.tsx (new)
VERIFY:
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:38:57
   Duration  1.28s (tests 29%, transform 26%, environment 26%, import 19%)
CHECK:
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.03s
    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running unittests src/lib.rs (target/debug/deps/sound-78e9f9124a5d1ff2)

running 25 tests
... (24 passed, 1 ignored)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

(prettier, eslint, tsc, vitest — 90 files / 415 tests passed — and cargo fmt/clippy/test all green; full `pnpm check` run, tail pasted above; `scripts/check-design.sh` separately run clean for src/ui/TransportCard.tsx and theme.ts — its one warning, 3 hard-coded values in src/ui/global.css, predates this task and is untouched by it)
CONCERNS:
- `scripts/check-design.sh` reports 3 pre-existing hard-coded values in src/ui/global.css, unrelated to this task's files (verified via `git diff`/`git log` — no change to that file). Flagging in case the controller wants it tracked separately.
- The brief's RED test S5 (practice.session/REQ-002/S5) requires the card's data-testid set to stay byte-identical across play-along idle, playing, and I-lead idle. This forced the tuner-glyph container to be always mounted (display:none when not the active glyph) rather than conditionally rendered, so that switching modes neither adds nor removes a DOM node. I believe this is the correct reading of the scenario (and it passed) but flagging the design choice since it is slightly unusual (a hidden-but-mounted node) — worth confirming the design-fidelity screenshots (controller's job, not mine) don't expect the glyph truly absent from the DOM in play-along mode.
CHOICES MADE:
- tuner-glyph bars rendered as plain divs with background modeWords.glyphCentre and boxShadow using modeWords.glyphOuter as a 2px ring, to produce the "outer"/"centre" two-tone look from flat theme values without SVG.
- Added `onWho` as a required TransportCard prop (matching the brief's Produces signature exactly) and updated the 4 existing call sites in transport-card.test.tsx with a `noop` handler, since the prop is new and required.
- `handleWho` in App.tsx guards on `session === null || snapshot === null`, mirroring the existing `handleTogglePlay` pattern in the same file.
- No helper rename was needed: `sessionDepsWithFactory` in the brief is `sessionDepsWithFakes`, already exported by tests/practice/fakes.ts exactly as named — imported as-is, no adaptation required.
- `progress-fill`/progress-track removal (step 3) was a no-op: grep found no `progress-fill` references anywhere in the UI tests or source already (it appears a prior task had already removed the progress bar's old implementation, leaving only the comment in TransportCard.tsx noting T012 would add the mode words in its place).

<!-- recorded 2026-10-03T09:44:10Z by scripts/record.sh -->
