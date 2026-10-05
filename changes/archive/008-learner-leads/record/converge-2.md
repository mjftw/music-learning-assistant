---
type: Convergence Report
title: 008-learner-leads — convergence report
resource: /.sdd/reports/008-learner-leads/converge.md
status: draft
tags: [sdd, converge, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /REVIEW.md
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-10-05T12:12:50Z
sdd_id: 008-learner-leads
---

## Convergence report — 008-learner-leads
Run: 2026-10-05 · Commit: 55c80e6 (branch `008-learner-leads`) · Cycle 2, incremental: started from converge-1's commit **1ac50bd** (`record/converge-1.md`, "Not converged — 2 critical, 6 warning"); audited `git diff 1ac50bd..55c80e6` (d6a151c, ddadb4b, 11642a3, 201c95e, 87aeafd, 289c7b5 and their record/docs commits); the suite, lint, typecheck, the three harnesses and the three scripts run in full on 55c80e6.

**Secrets:** none. Nothing the diff adds matches `.env*`/`*.pem`/`*.key`/`*secret*`/`*credential*`. A pattern scan of the non-PNG diff (AWS/GitHub/OpenAI key shapes, PEM private keys, `password|secret|token|api_key = "<16+ chars>"`) found nothing. The diff adds no `fetch`/XHR/WebSocket under `src/`, `tests/` or `scripts/`.

### Converge-1 findings re-verified

| Finding | Status | Evidence |
|---|---|---|
| C1: a finished or failed lead run's card survives the switch to play along | **fixed** | session.ts:2019-2022 `clearLeadCard()` (phase idle, listening off). session.ts:2148-2153: a changed `who` with `leadPhase.kind !== "idle"` clears it, after the stop at :2137-2142. session.ts:2038-2040: the restart path uses the same helper. Tests: lead-mode.test.ts:72 (complete → play along: phase idle, caption "15 notes · C4–C5", then `start()` counts in), :89 (same-`who` change keeps the complete card), :106 (cannot-hear cleared both ways). transport-card-lead.test.tsx:321, :345 cover the card: no "All held", ▶, and ❚❚ after ▶ |
| C2: after silence, the first lead reading is blended into the old smoothed pitch | **fixed** | session.ts:1214-1216: the gap timer resets `leadSmoothing = initialSmoothingState`. lead-hold.test.ts:147: +6 ¢ held, gap, +16 ¢ → `NoteJudged` +16 sharp, `heldFraction` 0 (the exact probe from converge-1, now with the spec's values) |
| W1: the stave squares its own opacity | **fixed** | StaveView.tsx:527-541: no `opacity` on the `stave-note` group. :550 and :568 set it once, on the stem and the ellipse, as `main` does. stave-view.test.tsx `effectiveOpacityOf` multiplies down the ancestors: lead [1,1,1,1,1,0.3,0.3], play along dim 0.72, accidentals the same. The live shots show D4–C5 at the prototype's faintness and play along's dim as shipped |
| W2: the live lead card carries the mode words | **accepted by the user by name** | docs/decisions.md (2026-10-05, "Keep the words — … converge-1's W2 accepted by name"); docs/interviews/design.md Q13; recorded as the §9 pattern "A card keeps one structure in every state" |
| W3: REQ-021's "at least every 50 ms" gated as an average | **fixed** | scripts/lead-timing-test.mjs:41 `MAX_GAP_MAX_MS = 50`. :346-356 compute the largest interval between consecutive `NoteJudged` inside a tone's sounding span. :764-769 fail the row on it. A target with fewer than two readings gives `null`, which `harness-lib.mjs:147 maxOf` turns into +∞ and so fails. Measured today: 10.67 ms in both rows |
| W4: `docs/design.md` §8 lacks 008's tokens | **fixed** | docs/design.md v1.2.0 §8 now has `paper.pillInk`, `lead.holdFill`, `modeWords.glyphCentre/glyphOuter`, and the `modeWords`, `leadCard`, `noteMeter` and `sheetRow` metric rows, radii 3 and 1, and the meter line in `motion`. Every value in src/ui/theme.ts:17-126 that 008 added appears in it. User answer "Promote all" (Q14) |
| W5: the mic-request window, where a second tap does nothing | **fixed** | App.tsx:577-580: `inProgress` also covers `snapshot.lead.listening.kind === "starting"`. session.ts:1696-1718 `stop()` covers `listeningOwner === "lead"` and bumps `leadGeneration`. session.ts:2273-2278 hands a late microphone back. Tests: lead-edge-cases.test.ts:77 and transport-card-lead.test.tsx:299, with `FakeListening.holdStart`/`resolveStart()` (fakes.ts:304-334). See new W1 for the real adapter's side of this window |
| W6: REQ-018/S3's acoustic path unverified | **closed by the user's phone walk** | docs/decisions.md, last line (2026-10-05, Cues → tone on: "Nope it did not detect the cue it played all good") |

### This cycle's diff through the passes

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| practice.session/REQ-014 the mode (mod. by T025) | ✅ session.ts:2135-2153 | ✅ lead-mode.test.ts:72,106; transport-card-lead.test.tsx:321,345 | ✅ |
| practice.session/REQ-015 a lead run (T025, T029) | ✅ session.ts:2019-2022, 2038-2040; App.tsx:577-580 | ✅ lead-mode.test.ts:72,89; lead-edge-cases.test.ts:77; transport-card-lead.test.tsx:299 | ⚠️ the microphone can stay open after ■ through the real adapter (new W1) |
| practice.session/REQ-016 judgement and hold (T026) | ✅ session.ts:1214-1216 | ✅ lead-hold.test.ts:147 (no scenario ID; see Info) | ✅ |
| practice.session/REQ-017 meter and card (T027) | ✅ StaveView.tsx:527-570 | ✅ stave-view.test.tsx (REQ-017/S8 ×2) | ✅ |
| practice.session/REQ-021 the budget (T028) | ✅ unchanged code; gate added | ✅ `pnpm test:lead` max gap 10.67 ms ≤ 50 | ✅ |
| practice.session/REQ-022 no microphone (T025) | ✅ session.ts:2148-2153 | ✅ lead-mode.test.ts:106; transport-card-lead.test.tsx:345 | ✅ (a key/traversal change leaves the card; spec silent, Info) |
| REQ-018, REQ-019, REQ-020, REQ-002/009/011/013 | untouched by the diff (converge-1 ✅) | ✅ check-scenarios | ✅ (REQ-018/S3 now also walked on the phone) |

| Scenario | Test | Through public interface? |
|---|---|---|
| every practice.session REQ-001…REQ-022 scenario | ✅ `check-scenarios.sh`: "✅ scenario coverage complete" (106 "tested" lines) | ✅. The new tests use `practice/published`, `FakeListening` (a port fake) and the rendered DOM. `stave-view.test.tsx` reads `opacity` off the rendered `<ellipse>`/`<line>` (DOM, not internals) |

No new test imports internals. There are no `.skip`, `.only` or `.todo` calls, and no TODO/FIXME in the diff.

Constitution (pass 2): no article is touched by the diff. Article V's budget now gates the 50 ms refresh as a maximum (W3), and the three harnesses pass. Article VII: no server and no egress. Engineering (2b): the diff follows `docs/engineering.md` (the fix lives in the domain, `published/` holds the snapshot field the UI reads, tests go through ports). Plan (3): no new file, dependency or interface; `FakeListening` gains two test-only members.

Domain boundaries: `check-contexts.sh` ✅ ("context boundaries respected"). No event schema changed. The "never advances unless held" invariant is still enumerated (hold-never-early.test.ts). C2's fix touches the smoothing that feeds the hold, and the scenario-level test at lead-hold.test.ts:147 now covers that.

Design fidelity (3c). `design/reference/` now holds twelve PNGs shot from the final build at 289c7b5. `python3 scripts/design_snapshot.py changes/008-learner-leads live --base …` (the scratchpad venv's Playwright 1.63.0) wrote all twelve under `.sdd/design/008-learner-leads/live/`. The plain-HTTP server on :5173 was **not listening** when the shots ran (`ERR_CONNECTION_REFUSED`; `ss` showed only :5174). The harnesses had run earlier, at a time I cannot place relative to the server going down. Per instructions I did not start a server on those ports, and shot against the running HTTPS server instead (`--base https://localhost:5174`; the script sets `ignore_https_errors=True`). All twelve live shots are **byte-identical** (`cmp`) to `design/reference/`. Because the references were shot from this build, that identity is expected. So I also Read listening-silent (live) beside `rounds/shots/listening-silent.prototype.png`, and playing-play-along (live). The faint-ahead notes now match the prototype's weight, and play along's dim is the shipped 0.72.

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| practice · all twelve Interface rows | design/reference/practice--<state>.png | .sdd/design/008-learner-leads/live/practice--<state>.png | ✅ byte-identical; structure judged against the prototype for listening-silent and playing-play-along (W1 fixed). The extra mode-words row is accepted (W2). Octave inline, not superscript (Info, carried over) | — |
| practice · way-in (unlisted) | docs/design/screens/practice--way-in.png | live idle-play-along (same header) | — | ✅ header and Tuner pill unchanged. The diff touches StaveView (only rendered on practice, and only reverting to `main`'s opacity), App.tsx's handler (no visual change) and session.ts |
| tuner · listening / silent / cannot-hear / target-pinned / target-sheet (unlisted) | docs/design/screens/ | not shot | — | ✅ by diff: no file they render changed since 1ac50bd (TunerStave does not use StaveView; it only shares key-label.ts, which is untouched) |

Design: `check-design.sh --change` ✅ ("design checks clean"). Its only warning is the 3 pre-existing literals in `src/ui/global.css`, which 008 does not touch and which rounds.md › Exit records as left for a later change. Tokens only ✅: §8 now matches theme.ts.

Pass 7b: no new decisions since cycle 1 (`record/decisions/` D001–D003, unchanged). 4a: no escalated verdicts and no parked tasks. `tasks/index.md`: 29/29 done.

### Critical (0)

### Warning (1)

- **W1: tap → stop → tap while the first `getUserMedia` is still pending can leave the microphone open after ■, through the real listening adapter.**
  - **Where:** src/listening/published/index.ts:114-117 (`start()` returns early only if `graph !== null`, checked on entry, before the `await getUserMedia`) and :176 (`graph = { … }` unconditionally overwrites any graph already set). session.ts:1705 (`stop()` → `listening.stop()` while the first request is pending tears nothing down, because `graph` is still null) and :2273-2278 (the superseded run's continuation calls `listening.stop()` when its start resolves).
  - **What the artefacts require:** REQ-015 says "WHEN ■ is tapped THE SYSTEM SHALL end listening (the microphone released within 200 ms)". listening.pitch-detection REQ-001 says stop releases the microphone. The proposal's edge-case row says "the second tap is the stop", and T029 (87aeafd, App.tsx:577-580) now makes that stop reachable from the circle itself during the request.
  - **What the code does:** run 1's request is pending, the second tap stops it, a third tap starts run 2, so there are two `getUserMedia` calls in flight. Whichever order they resolve in, the adapter's continuations each set `graph`, so the later one overwrites the earlier one without tearing it down. Run 1's superseded continuation then calls `listening.stop()`, which tears down whatever `graph` currently is. In one ordering it closes run 2's live graph while the orphan keeps its `port.onmessage` and live track. In the other it closes its own graph after run 2's has been orphaned. Either way one live `MediaStreamTrack` is no longer reachable from `teardown()`. ■ later releases nothing, and the orphan keeps publishing pitches.
  - **How it was found:** notes.md (T029) recorded it as out of scope. I confirmed it from the code; no test models two concurrent starts (`FakeListening` has one `answerStart` slot).
  - **How reachable:** it needs a slow permission prompt, so mainly a first run. The same window was already reachable before T029 through the mode words, the Tuner pill or a hidden page, and the tuner's own enter → leave → enter has the same shape. The microphone stays open (the browser's indicator stays lit) and REQ-015's release criterion fails. It does not block convergence if the user accepts it by name. Otherwise task it: the adapter, or the session, must not let a second `start()` race a pending one.

### Info (8)

- **C2's test, and whether REQ-016 needs a scenario.** lead-hold.test.ts:147 is named `practice.session/REQ-016 — the first reading after silence is as detected`, with no S-number. I do **not** consider a new scenario necessary for convergence. Pass 1 requires every requirement to be implemented and every scenario to be tested, and REQ-016's sentence ("the first reading after nothing was heard … as detected") is implemented (session.ts:1216) and exercised through the published interface. Recommendation (pass 8, spec amendment): at `sdd-finish` or in a follow-up change, add a REQ-016/S10 "a breath, then out of tune" (+6 ¢ held, 300 ms+ of silence, +16 ¢ → +16 sharp, hold 0). converge-1's C2 slipped past S4 because S4 returns at the same pitch. The approved delta cannot be edited in place except through a decider amendment, so this is the user's call.
- **Scenario IDs stretched to cover clauses they do not state.** lead-mode.test.ts:72 is named "REQ-015/S3 — the complete card goes when the mode changes", but S3's When/Then is the last note held, not a mode change. :106 is "REQ-022/S1 — the no-mic card goes when the mode changes", but S1's Then is the sheet, drone and pill still working. transport-card-lead.test.tsx:321/:345 file "after a finished run" and "after a refused microphone" under REQ-014/S2, whose Given is "I lead idle". The behaviour they test is REQ-015's "until … the mode … changes" sentence and REQ-014's "show the new mode idle", and neither has a scenario of its own. Recommendation: the same as above, a scenario for "the complete or no-mic card goes when the mode changes", so the tests can cite it truthfully.
- **A key/variant/scale/traversal change leaves a `cannot-hear` card in place.** restartLeadIfRunning (session.ts:2037-2041) clears only `complete`. REQ-022 does not say how long the card lasts; REQ-015's "until" clause names only the complete card. notes.md (T025) records this. Spec-silent, so a spec amendment is possible, not a defect.
- **The comment at App.tsx:572-576 is inaccurate.** It says ■ is "shown for the whole `listening` phase, the microphone request included". The request window shows the idle card with the Tuner glyph and no ■ (asserted by transport-card-lead.test.tsx:305), and the second tap there is a stop the learner cannot see. The rest of converge-1's W5 title ("no ■ is shown") stands as a UI observation. The spec puts ■ with the first target, which arrives with listening (REQ-015/S1), so it is not a requirement gap.
- **`cx`/`cy`/`rx`/`fill` remain on the `stave-note` `<g>` as test probes** (StaveView.tsx:538-541). They are harmless now: every child sets its own fill or stroke, and `cx`/`cy`/`rx` mean nothing on a `<g>`. But this is the pattern that produced converge-1's W1. The engineering-preference refinement proposed in cycle 1 still stands: "no test-only attributes on production DOM that carry rendering semantics". Propose, never apply.
- **The design references were shot from the final build** (rounds.md › Exit, 289c7b5). The fidelity pass against them is therefore an identity check (all twelve byte-identical). The structural comparison with the prototype was done in cycle 1 and spot-checked here. The user's visual check after the run remains the real gate (REVIEW.md 3c).
- **Carried over from converge-1 and not touched by this diff:** the octave is inline, not superscript. The I-lead caption is ellipsized at 390 px. `leadListeningState` reads "listening" after `complete`, unless a mode or key change clears it (clearLeadCard now resets it on those paths). `targetAt(sequence, 1)` throws on an empty sequence in `restartLeadIfRunning` (unreachable). The stale comment at session.ts:130-134. Two pre-existing `#[ignore]`d cargo benchmarks.
- **Pass 8 notes fold-back for the five new notes.md lines.** The converge-1 summary is local. T025's "a key change leaves cannot-hear" is a possible spec amendment (above). T026's missing scenario is a spec amendment recommendation (above). T027's probe attributes are an engineering-preference refinement (above). T028 is local, already in AGENTS.md. T029's adapter race is this report's W1, not ADR-worthy. No ADR-worthy note.

### Commands

`pnpm check` (`source ~/.cargo/env`; node v22.13.1), exit 0:
```
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
Checking formatting...
All matched files use Prettier code style!
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
 Test Files  93 passed (93)
      Tests  464 passed (464)
   Start at  13:03:04
   Duration  23.77s (tests 61%, environment 25%, import 8%, transform 6%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 5.10s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s
   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
EXIT 0
```
eslint, tsc, cargo fmt and clippy print nothing on success; the `&&` chain reached `cargo test`, so all of them passed.

`pnpm test:timing` (real node via `asdf which node`), exit 0. The first run passed with 1.33 ms margin at 96 bpm, so no rerun was needed:
```
measuring 3 tempos sequentially, 60 s each
pre-flight: AudioContexts constructed: 1 (expected 1) — PASS
bpm  onsets  max onset dev (ms)  drift (ms, |slope·span|)  highlights  vs audible (ms)  vs scheduled (ms)  status
40   82      0.00                0.00                      40          21.33            37.33              PASS
96   194     0.00                0.00                      94          28.67            44.67              PASS
200  402     0.00                0.00                      195         26.67            38.67              PASS
test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
```

`pnpm test:tuner`, exit 0:
```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     75.90                   61.31                 16.02               92.86           0.09           0              PASS
flute-like E2–C7     57     79.70                   61.31                 29.35               92.86           0.65           1              PASS
hand-over glissando  1      54.50                   53.31                 18.69               93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 75.90 ms · arrival age E2 61.31 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout A♯6 79.70 ms · arrival age G♯2 61.31 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

`pnpm test:lead`, exit 0, with the new `max gap` column:
```
driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  max gap (ms)  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   5.35                  5.35                94.21           10.67         0                              16.02                    PASS
tone cue fed back  3        67.67                   8.02                  8.02                83.40           10.67         0                              18.69                    PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
```
(A stale `lead.txt` from cycle 1 sat in the shared scratchpad without the column. The output above is from this run, read after my harness chain had finished.)

`./scripts/check-scenarios.sh --change changes/008-learner-leads`, exit 0. Every scenario of `practice.session` REQ-001…REQ-022 is "✅ … tested" (106 lines, …`REQ-022/S1`…`S4 tested`), ending `✅ scenario coverage complete`.

`./scripts/check-contexts.sh`, exit 0:
```
✅ context boundaries respected
```

`./scripts/check-design.sh --change changes/008-learner-leads`, exit 0:
```
Design
  interface: yes · design.md approved v1.2.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 008-learner-leads
✅ design checks clean
```

`python3 scripts/design_snapshot.py changes/008-learner-leads live --base http://localhost:5173` failed with `Page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/` (the :5173 server was down). The rerun with `--base https://localhost:5174` wrote all twelve `.sdd/design/008-learner-leads/live/practice--<state>.png`. `cmp` against `design/reference/`: all twelve IDENTICAL. `pnpm design:shots` and `reference` mode were not run.

### Verdict
Not converged — 0 critical, 1 warning

<!-- recorded 2026-10-05T12:14:35Z by scripts/record.sh -->
