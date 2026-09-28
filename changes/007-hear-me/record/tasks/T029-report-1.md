---
type: Implementation Report
title: T029 — implementation report
resource: /.sdd/reports/007-hear-me/T029.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T029.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T22:04:39Z
sdd_id: 007-hear-me
---

TASK: T029
STATUS: DONE_WITH_CONCERNS
COMMIT: none (brief says "Do not commit")
FILES:
src/ui/TunerScreen.tsx
src/ui/TunerStave.tsx
src/ui/App.tsx
src/ui/main.tsx
tests/ui/scenarios/tuner-helpers.ts
tests/ui/scenarios/tuner-stave.test.tsx

DECISIONS:
- The clock/scheduler: TunerScreen takes optional `now`/`requestFrame`/
  `cancelFrame` props with real defaults (`performance.now`,
  `requestAnimationFrame`, `cancelAnimationFrame`, each wrapped in a named
  function so neither depends on being called with a particular `this`).
  Chosen over Vitest fake timers because this app's `requestAnimationFrame`
  usage is new (grep found none elsewhere) and jsdom's own rAF support is
  inconsistent across environments; an injectable prop is simpler, needs no
  environment probing, and matches the existing `onPaintAge`/`onSessionReady`
  pattern already threaded through App. Tests get a `manualAnimationClock()`
  helper (tests/ui/scenarios/tuner-helpers.ts) — a single-slot fake scheduler
  (matches rAF's own one-shot contract) with `advanceMs`/`runFrame`/`pending`.
- Vertical placement in silence: introduced `layoutHeard` (TunerStave.tsx) —
  `heard` itself while a reading shows; once it clears, the newest trail
  point's own placement (at the same `trailAdj` the trail itself draws with)
  stands in for computing `tops`/`bots`/`shift` only. The actual head/cents/
  accidental/guide stay gated on `heard !== null` exactly as before (REQ-003)
  — only the vertical-centring inputs are kept steady across the note
  stopping, the smallest change I found that stops the trail jumping the
  instant the reading clears.
- The trail's own register decision (`trailAdj`): equals the existing `adj`
  whenever something governs it (a target, or the live reading — the same
  value while sounding, so S1–S4 are unaffected); in silence with no target,
  falls back to `registerAdjOf` of the newest trail point's own heard note,
  per the requirement's amendment ("use the adjustment of the newest point's
  reading").
- What TargetSheet/PitchSpiral receive: TargetSheet's and PitchSpiral's own
  prop types are untouched (`readonly NoteJudged[]`) — TunerScreen derives
  `spiralTrail` by filtering its `TrailPoint[]` to the current run
  (`runId === runIdRef.current`) and mapping to `.reading`, so a new run
  is never joined into what the spiral draws (mirrors REQ-005/S6) and the
  spiral's own gating (`reading !== null`) is untouched. I did not touch
  TargetSheet.tsx or PitchSpiral.tsx.
- `TRAIL_MS = 2500` and the `TrailPoint` type live in TunerStave.tsx, next to
  the trail's other geometry constants (TRAIL_X_START/TRAIL_X_END); TunerScreen
  imports both. The design-loop `?variant=a|b|c` switch lives in main.tsx only,
  marked with the single line `// design-loop variant (007 round 3)` above the
  whole switch function + its call, per the brief; nothing else is marked.
- The silence-redraw effect in TunerScreen (`useEffect(() => {...})`, no
  dependency array) intentionally re-evaluates after every render: its
  condition depends on `trailRef.current` (a ref this render's own age-based
  pruning may have just emptied), not on anything already tracked as a
  dependency. It schedules a frame only if `shouldAnimate` and none is
  already pending, cancels one only if `!shouldAnimate` and one is pending,
  and always cancels on cleanup (covers unmount). Verified this never fires
  while a note sounds and stops for good once the trail empties (dedicated
  test + traced by hand in REQ-005/S5).

CONCERNS:
- I could not literally demonstrate RED by reverting TunerStave.tsx/
  TunerScreen.tsx to their pre-change content and running the new tests
  against them: the sandbox's auto-mode classifier denied the `vitest run`
  invocation right after a file-revert step ("Irreversible Local
  Destruction"), even though the revert itself (a plain `cp`, not git) had
  already succeeded and I restored the real implementation immediately
  after. I did not retry through another route, per the denial's own
  instructions. I did trace the S5/S6 arithmetic by hand against the actual
  passing implementation (shown in my working, not reproduced here) and am
  confident of what each test exercises, but the classic "watch it fail for
  the stated reason" step is missing an actual terminal transcript against
  the old code.
- During silence the trail's colour follows the existing `tone` variable,
  which is `paper.faint` whenever `reading === null` — so a trail that was
  green/warm/cool while sounding turns grey the instant the note stops, for
  as long as it keeps ageing off the strip. The brief only asked that "the
  existing fade gradient... stays as it is" (the TRAIL_X_START→TRAIL_X_END
  fade shape); it did not say whether the trail should keep the last
  verdict's colour into silence. I judged recolouring on stop to be the
  smaller, already-existing behaviour and left it, but it is a visible
  choice a human should glance at on the phone.
- `spiralTrail` (passed to TargetSheet → PitchSpiral) is no longer capped at
  50 points the way the old `trailRef.current` implicitly was (it was wiped
  every silence, so a live run was never more than 50 readings). Now, within
  a single continuous run, it is bounded only by `trailMs` (2.5 s ≈ ~230
  readings at the tuner's ~93/s). PitchSpiral itself doesn't cap what it's
  given and no test asserts a point count, so this is not a correctness
  regression, but it is a quantitative change from "today" worth a human's
  eyes on the phone (more points on the needle's short trail during a long
  held note).

VERIFY (tests/ui/scenarios/tuner-stave.test.tsx tests/ui/scenarios/tuner-screen.test.tsx):
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  2 passed (2)
      Tests  21 passed (21)
   Start at  23:03:33
   Duration  2.67s (tests 68%, transform 13%, environment 10%, import 8%)

VERIFY (tests/practice tests/ui):
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  58 passed (58)
      Tests  263 passed (263)
   Start at  23:03:38
   Duration  9.37s (tests 53%, environment 30%, import 9%, transform 7%)

VERIFY (check-scenarios.sh --change changes/007-hear-me | grep -c "❌"):
0
(REQ-005/S5 and REQ-005/S6 both listed ✅ tested in the full output)

VERIFY (check-contexts.sh):
✅ context boundaries respected

VERIFY (check-design.sh --change changes/007-hear-me):
Design
  interface: yes · design.md approved v1.0.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 007-hear-me
✅ design checks clean
(The 3 global.css warnings predate this task — last touched at commit
f831ab1, "002-circle-redesign" — and are outside src/ui/TunerScreen.tsx/
TunerStave.tsx/App.tsx/main.tsx, so left as-is per the brief.)

CHECK (source ~/.cargo/env && pnpm check):
 Test Files  75 passed (75)
      Tests  324 passed (324)
   Start at  23:01:15
   Duration  10.64s (tests 51%, environment 33%, import 10%, transform 6%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.16s (listening crate)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s (sound crate)
Doc-tests listening: ok. 0 passed; 0 failed
Doc-tests sound: ok. 0 passed; 0 failed
(prettier, eslint, tsc --noEmit, vitest, cargo fmt --check, cargo clippy
-D warnings all ran and passed before this, no output = clean)

<!-- recorded 2026-09-28T22:16:07Z by scripts/record.sh -->
