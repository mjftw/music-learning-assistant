---
type: Implementation Report
title: C008_T019 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T019.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T019.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-04T09:05:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T019
STATUS: DONE_WITH_CONCERNS
COMMIT: 2335943
FILES:
AGENTS.md
package.json
scripts/lead-timing-test.mjs
scripts/tuner-timing-test.mjs
src/ui/App.tsx
tests/ui/scenarios/app-session.test.tsx
tests/ui/scenarios/lead-app-helpers.tsx
VERIFY:
Five `pnpm test:lead` runs in all (three consecutive after the final edit, one more for the AGENTS.md block, plus the earlier iterations); none failed once the harness was fixed. The three tails:

```
run 1
lead run C4–C5     15       70.33   5.35  5.35  94.21  0  16.02  PASS
tone cue fed back  3        65.00   8.02  8.02  83.40  0  13.35  PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
run 2
lead run C4–C5     15       70.33   5.35  8.02  94.21  0  16.02  PASS
tone cue fed back  3        62.33   5.35  5.35  82.92  0  16.02  PASS
test:lead: PASS — (same line)
run 3
lead run C4–C5     15       70.33   5.35  5.35  94.21  0  16.02  PASS
tone cue fed back  3        62.33   8.02  8.02  83.40  0  18.69  PASS
test:lead: PASS — (same line)
```
(columns: targets, first readout max ms, arrival age max ms, paint age max ms, readings/s min, advance lateness max frames, shown lateness max ms)

`grep -c "test:lead: PASS" AGENTS.md` -> 1
`pnpm vitest run tests/ui` -> Test Files 29 passed (29), Tests 187 passed (187)
`pnpm test:tuner` (shared lib still serves it) -> all five rows PASS, ends `test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise`
CHECK:
`pnpm check` exit 0: Test Files 92 passed (92), Tests 447 passed (447); cargo `test result: ok. 24 passed; 0 failed; 1 ignored`; doc-tests ok.
CONCERNS:
- The working tree held an earlier, unfinished attempt (an 880-line scripts/lead-timing-test.mjs with DEBUG output, plus the App.tsx useLayoutEffect, the app-session.test.tsx paint-age test and a renderLeadApp extraProps parameter in lead-app-helpers.tsx, all uncommitted). I kept the App/test/helper parts (they match the brief and pass) and reworked the script, because it failed on four harness defects, none of them a product fault: (1) shown lateness read before the rAF poll had run (Infinity); (2) the tone-cue case injected the speaker bleed ~300 ms after the advance instead of at it, so the cue's own bleed fell outside the mute window and was judged (heldFraction 0.53); (3) the mute-window check counted the reading at the advance's own frame, which is the reading that completed the hold (judged against the previous target); (4) shown frames were matched to advances by index.
- Brief step 5 says the window is [advance, advance + ...]; the script uses atFrame strictly greater than the advance's frame, because the reading at exactly the advance's frame is the completing reading of the previous target. A genuine NoteJudged for the new target cannot have the advance's own frame.
- The advance-lateness is 0 frames on every advance, every run (the completing reading is always a committed NoteJudged in these runs: `completingReadingMissing` was false for all 15 in the diagnostic I ran). The "expected" is computed from the recorded NoteJudged verdicts as the brief says. The script keeps a fallback for the case where a completing reading was coalesced away before display (session.ts commitLeadReading): it then assumes that reading was in tune (TargetAdvanced only fires on one) and prints a `note:` line with the count. It never triggered in any run. A lateness of exactly 0 for all targets is the expected result of a grid-quantised hold rule, not a vacuous check: the drift target (F4) was seen to reset the hold (19 in-tune, 41 flat, then 119 in-tune readings) and still computed 0.
- Negative control: with the tone cue switched off in the second case the script FAILs, naming 104 NoteJudged inside the window and a non-zero hold, so the REQ-018/S3 gate does bite.
- "Shown" for an advance is, per the brief, the rAF-polled change of `snapshot().lead.target.position` (model, not DOM); it is bounded below by one rAF (about 16 ms) and is a proxy for the React commit rather than a DOM observation. The paint-age column (from the real `onPaintAge` path) is printed alongside and also sits at 5-19 ms.
- Measured harnesses can flake on a cold AudioContext (007 history); no run failed here. The first target gets 300 ms more leading silence than the others, in place of a separate warm-up.
CHOICES MADE:
- No UI selection of C major / flute Concert / ↑↓ 1 oct: these are the fresh-browser defaults (REQ-011/S2), so the script asserts the exact sequence "C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4" instead of building a SessionContext in the page for setContext/setTraversal.
- Case 2 calls `window.__sound.start()` before the run, so the one-off sound-engine start-up does not delay the first cue's mute window (there would be no cue sounding, hence no bleed, before it finished).
- Case-level arrival age is the max over every recorded reading (not only those inside an advance's window).
- A `FAIL` line names each failed cell ("<case>: <gate> <value> > <bound>") instead of one generic sentence.
- Local `printTable` in the script (harness-lib's has the tuner's header and is outside my Files).
- Deleted the two "moved to harness-lib.mjs (C008_T018)" comments from tuner-timing-test.mjs (a review minor), and the test:lead comment line in AGENTS.md that promised the output "at 008's converge", since the output is now pasted. The AGENTS.md block sits after the test:tuner block, in its style.

<!-- recorded 2026-10-04T08:10:20Z by scripts/record.sh -->
