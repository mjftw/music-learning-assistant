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
  at: 2026-10-05T11:15:23Z
sdd_id: 008-learner-leads
---

## Convergence report — 008-learner-leads
Run: 2026-10-05 · Commit: 1ac50bd (branch `008-learner-leads`) · Cycle 1, full audit (no earlier converge report)

**Secrets:** none. `git ls-files` has no `.env*`/`*.pem`/`*.key`/`*secret*`/`*credential*`; a pattern scan (AWS/GitHub/OpenAI key shapes, PEM private keys, `key|secret|password|token = "<16+ chars>"`) found nothing; the diff adds no `fetch`/XHR/WebSocket/URL egress under `src/`.

Audited against `.sdd/target/008-learner-leads/practice/session.md` (the preview with D001/D002 applied), the approved proposal, delta, plan, tasks, constitution 1.0.0, `docs/engineering.md`, `docs/domain.md`, `docs/design.md`, `docs/decisions.md` (181–197), `notes.md` and `record/decisions/D001–D003`. Two behaviours were confirmed by running throwaway probe tests (in the scratchpad, against `tests/practice/lead-helpers.ts` and `practice/published` only — nothing written to the tree); their output is quoted under the findings.

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| practice.session/REQ-014 the mode | ✅ session.ts:1617-1627, 2118-2139; TransportCard.tsx:421-473 | ✅ lead-mode.test.ts, transport-card-lead.test.tsx | ❌ "show the new mode idle" fails after a complete or no-mic run (C1) |
| practice.session/REQ-015 a lead run | ✅ session.ts:2215-2302, 1693-1719, 1115-1122 | ✅ lead-run.test.ts, never-both.test.ts, target-in-sequence.test.ts | ❌ complete card survives a mode change (C1) |
| practice.session/REQ-016 judgement and hold | ✅ lead.ts:151-190; session.ts:983-1131 | ✅ lead-hold.test.ts, lead-reducer.test.ts, hold-never-early.test.ts | ❌ first reading after silence is smoothed, not as detected (C2) |
| practice.session/REQ-017 meter and card | ✅ NoteMeter.tsx; StaveView.tsx; NamesView.tsx; TransportCard.tsx:478-527; cents-label.ts | ✅ note-meter.test.tsx, lead-meter.test.ts, transport-card-lead.test.tsx, stave-view/names-view tests | ⚠️ faint notes drawn at 0.09, not 0.3 (W1) |
| practice.session/REQ-018 cues | ✅ session.ts:1285-1336, 1031-1034; lead.ts:55-60 | ✅ lead-cues.test.ts, traversal-sheet-lead.test.tsx, `pnpm test:lead` row 2 | ✅ |
| practice.session/REQ-019 changes while leading | ✅ session.ts:2026-2056, 2058-2116 | ✅ lead-changes.test.ts | ✅ |
| practice.session/REQ-020 Traversal sheet | ✅ TraversalSheet.tsx, Switch.tsx | ✅ traversal-sheet-lead.test.tsx | ✅ (structurally; pixel height by screenshot) |
| practice.session/REQ-021 the budget | ✅ session.ts:967-972, 1091-1123 | ✅ lead-budget.test.ts; `pnpm test:lead` PASS (below); `pnpm test:timing` PASS; phone walk docs/decisions.md:195 | ⚠️ the "every 50 ms" clause is gated as an average (W3) |
| practice.session/REQ-022 no microphone | ✅ session.ts:2284-2297, 1350-1378; TransportCard.tsx:532-568 | ✅ lead-cannot-hear.test.ts, transport-card-lead.test.tsx | ❌ no-mic card shown in play along after a mode change (C1) |
| practice.session/REQ-002 (mod) play and stop | ✅ progress removed; ModeWordsRow every card | ✅ session-transport.test.ts, transport-card-lead.test.tsx | ❌ play-along card shows the lead complete / no-mic card after a mode change (C1) |
| practice.session/REQ-009 (mod) hidden, awake | ✅ session.ts:945-961, 918-927 | ✅ session-hidden-awake.test.ts | ✅ |
| practice.session/REQ-011 (mod) remembered | ✅ selection-store.ts (v6, `.catch` defaults, migrateFromV5) | ✅ app-session.test.tsx, selection-store.test.ts | ✅ |
| practice.session/REQ-013 (mod) tapped note | ✅ session.ts:1933 | ✅ session-tap.test.ts | ✅ |

| Scenario | Test | Through public interface? |
|---|---|---|
| REQ-014/S1–S5 | ✅ lead-mode.test.ts, transport-card-lead.test.tsx, session-transport.test.ts | ✅ |
| REQ-015/S1–S8 | ✅ lead-run.test.ts (S6: never-both.test.ts enumeration) | ✅ |
| REQ-016/S1–S9 | ✅ lead-hold.test.ts, lead-reducer.test.ts; S6 hold-never-early.test.ts (reducer via `practice/published`) | ✅ |
| REQ-017/S1–S8 | ✅ note-meter.test.tsx, lead-meter.test.ts, transport-card-lead.test.tsx, stave-view.test.tsx, names-view.test.tsx | ✅ (rendered DOM / snapshot) |
| REQ-018/S1–S5 | ✅ lead-cues.test.ts, traversal-sheet-lead.test.tsx; S3 measured by `pnpm test:lead` | ✅ |
| REQ-019/S1–S5 | ✅ lead-changes.test.ts | ✅ |
| REQ-020/S1–S5 | ✅ traversal-sheet-lead.test.tsx | ✅ |
| REQ-021/S1, S3, S4 | ✅ header-guard test lead-edge-cases.test.ts:89 + `pnpm test:lead` / `pnpm test:timing` / phone walk | ✅ (007's tuner-harness precedent) |
| REQ-021/S2 | ✅ lead-budget.test.ts | ✅ |
| REQ-022/S1–S4 | ✅ lead-cannot-hear.test.ts, transport-card-lead.test.tsx | ✅ |
| REQ-002/S1–S5, REQ-009/S1–S3, REQ-011/S1–S5, REQ-013/S1–S7 | ✅ (check-scenarios: every one tested) | ✅ |

`check-scenarios.sh`: every scenario of practice.session REQ-001…REQ-022 tested; "✅ scenario coverage complete". No test imports a context's internals (one comment mentions `domain/lead.ts`; the import is `practice/published`); no `.skip`/`.only`/`.todo`; the four `toHaveBeenCalled` assertions are on UI callback props in pre-existing component tests, not on ports.

Domain boundaries: `check-contexts.sh` ✅ ("context boundaries respected"). `TargetAdvanced`/`NoteJudged` schemas unchanged under `practice/published`; `PitchDetected` translated in session.ts:983-1131 and never reaches the view; invariants "target always a member" (target-in-sequence.test.ts), "never advances unless held" (hold-never-early.test.ts, 3.5 M events), never-both widened (never-both.test.ts, 16 104 sequences) each have a test that tries to break them.

Design fidelity (3c). No `design/reference/` exists yet (the refinement loop's exit has not run), so states were judged against the vendored prototype (`Learner Leads Final.dc.html` #s01–#s10, `Learner Leads Practice.dc.html` for the two non-canvas rows) and `design/handoff.md`. Live shots: `scripts/design_snapshot.py changes/008-learner-leads live --base http://localhost:5173 --out <scratchpad>/live` (Python Playwright 1.63.0 in a scratchpad venv) — all twelve states reached; pairs regenerated by `pnpm design:shots` under `changes/008-learner-leads/design/rounds/shots/`. I Read the pairs for listening-silent, holding, playing-play-along, idle-i-lead, no-microphone and sheet-i-lead, and the app shots for heard-out-of-tune, holding-meter-off, advanced, complete and sheet-play-along; idle-play-along was shot but not Read.

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| practice · idle-play-along | prototype #s01 | rounds/shots/idle-play-along.app.png | — shot taken, not Read this cycle (same IdleCard as idle-i-lead with ▶ and the sequence caption; its structure is asserted by transport-card-lead.test.tsx) | — |
| practice · idle-i-lead | prototype #s02 | idle-i-lead.app.png | ✅ Tuner glyph (bare bottom-aligned bars), caption, words; both truncate the caption to "hold 2 beats · medium t…" at 390 px (Info) | — |
| practice · playing-play-along | not drawn (decision 191) | playing-play-along.app.png | ⚠️ the dimmed notes are 0.52, not the shipped 0.72 (W1) | — |
| practice · listening-silent | #s03 | listening-silent.app.png | ⚠️ the mode-words row (W2); faint notes ≈0.09 vs 0.3 (W1); octave inline, not superscript (I) | — |
| practice · heard-out-of-tune | #s04 | heard-out-of-tune.app.png | ⚠️ flat line below the band in the flat colour, "↓ 18 ¢ flat" ✅; W1, W2 | — |
| practice · holding | #s05 | holding.app.png | ⚠️ W1, W2; band, fill, line, judgement ✅ | — |
| practice · holding-meter-off | Practice canvas | holding-meter-off.app.png | ⚠️ highlight, no band/fill/line, "in tune · holding" ✅; W1, W2 | — |
| practice · advanced | #s06 | advanced.app.png | ⚠️ W1, W2; band, no line, "C4 held ✓" ✅ (D002) | — |
| practice · complete | #s07 | complete.app.png | ✅ every note ink, "15 of 15 held · C4–C5", "All held", Tuner glyph; plus the mode words (W2) | — |
| practice · no-microphone | #s08 | no-microphone.app.png | ✅ title beside the circle, body below; plus the mode words (REQ-022 asks for them) | — |
| practice · sheet-play-along | #s09 | sheet-play-along.app.png | ✅ Who leads + ✕, Sound, Count-in, Rest bar, hairline, the four shared rows; the shared rows sit where sheet-i-lead's do | — |
| practice · sheet-i-lead | #s10 | sheet-i-lead.app.png | ✅ rows, order, hints, hairline, ✕ | — |
| practice · way-in, tuner · silent, tuner · cannot-hear (unlisted) | docs/design/screens/ | scratchpad shots | — | ✅ unchanged (tuner files untouched; overlay.tsx only exports the ✕ with an optional test id; `tuner.band` re-spelled 0.90→0.9, same colour). tuner · listening / target-pinned / target-sheet not shot: no file they render was changed visibly |

Design: `check-design.sh --change` ✅ ("design checks clean"; its only warning is 3 hard-coded values in `src/ui/global.css`, a file this change does not touch) · tokens only ✅ in code (new values are `theme.ts` tokens) / ⚠️ `docs/design.md` §8 not updated (W4).

### Critical (2)

- **C1 — a finished or failed lead run's card survives the switch to play along.** — src/practice/domain/session.ts:2118-2139 (`setSettings` stops a run only when `transport.kind !== "idle" || listeningOwner === "lead"`; a `complete` or `cannot-hear` phase has `listeningOwner === "none"`, so `leadPhase` is left as it was); src/ui/TransportCard.tsx:430-438 (`IdleCard` uses `completeCaption` and "All held" whenever `lead.phase === "complete"`, whatever `who` is) and :615-617 (`NoMicCard` whenever `lead.phase === "cannot-hear"`, whatever `who` is). — Requires: REQ-015 "show the complete card … until the circle is tapped again or **the mode**, key, variant, scale or traversal changes"; REQ-014 "WHEN a mode word is tapped THE SYSTEM SHALL select that mode … and show the new mode idle"; REQ-002 "WHILE idle in play along … caption the sequence as '<N> notes · <lowest>–<highest>'" and, playing, "<note> · k of N" with ❚❚. — Does: probe through `practice/published`:
  ```
  PROBE ["after 15:","complete","15 of 15 held · C4–C5"]
  PROBE ["after play along tapped:","tool","complete","15 of 15 held · C4–C5","15 notes · C4–C5"]
  PROBE ["refused:","cannot-hear"]
  PROBE ["cannot-hear -> tool:","tool","cannot-hear"]
  PROBE ["then start():","countingIn","cannot-hear"]
  ```
  So after "All held", tapping "play along" shows ▶ with "15 of 15 held · C4–C5 / All held" under "play along" (and keeps that caption while play along then plays, instead of "<note> · k of N"); after a refused microphone, tapping "play along" keeps the "Can't hear — no microphone" card with the Tuner glyph, and ▶ then starts a count-in and a run behind that card with no ❚❚ shown. Reachable from the UI in two taps; no test switches mode from `complete` or `cannot-hear`. (Whether this is what the user saw as "count-in stuck at 4" on the phone, decisions.md:195, is not established.)

- **C2 — after silence, the first reading of a lead run is blended into the old smoothed pitch instead of shown as detected.** — src/practice/domain/session.ts:1208-1217 (`armLeadGapTimer` clears `leadReading` and applies `applySilence`, but never resets `leadSmoothing`; compare the tuner's gap, :1182-1190 → `clearTunerReading()` :1172-1177, which resets `tunerSmoothingState`); the next detection goes through `smoothedPitchHzOf(leadSmoothing, …)` at :1052-1058, which continues the old EMA when the step is under 25 ¢ (tuner.ts:196-205). — Requires: REQ-016 "smoothed exactly as practice.tuner/REQ-002 smooths (… **the first reading after nothing was heard** or after a new target **as detected**)", and "SHALL reset it to zero on a reading that is not in tune". — Does: probe (C4 target, medium, +6 ¢ for 500 ms, 500 ms of silence so the 300 ms gap fires, then one reading at +16 ¢):
  ```
  PROBE ["before silence last:",{"cents":6,"verdict":"in-tune"},"held",0.3925333333333333]
  PROBE ["after gap reading:",null]
  PROBE ["first reading after silence (+16 c fed):",{"cents":7,"verdict":"in-tune"},"held",0.3925333333333333]
  ```
  The spec's reading is +16 ¢ sharp with the hold reset to zero; the code emits `NoteJudged` +7 in tune and keeps 39 % of the hold, so a note re-entered out of tune after a breath keeps counting toward the advance for several readings. REQ-016/S4 does not catch it because it returns at the same pitch. This is the hold rule, the same one the "never advances unless held" invariant protects, though the S6 enumeration tests the reducer and so cannot see it.

### Warning (6)

- **W1 — the stave squares its own opacity: faint-ahead notes render at ≈0.09 and play along's dimmed notes at ≈0.52.** — src/ui/StaveView.tsx:536-540 puts `fill` and `opacity={head.opacity}` on the `stave-note` `<g>` "as read-only probes … they carry no visual meaning on a `<g>`" (comment :532-535). That is wrong for SVG: `opacity` on a `<g>` is group opacity and multiplies with the same `opacity` on the stem (:549) and ellipse (:567). — Requires: handoff.md "Future notes: faint (the stave's 'progress' feedback style)", which is the prototype's `op = … : 0.3`, and `LEAD_FAINT_OPACITY = 0.3` (:117); the shipped REQ-006 dim is `DIM_OPACITY = 0.72` (:110), which this change does not modify. — Does: effective 0.3 × 0.3 = 0.09 (listening-silent/holding/advanced app shots: D4–C5 almost invisible next to the prototype's) and 0.72 × 0.72 = 0.52 while play along plays, a regression of a shipped look that no requirement asked for. The inline accidentals (:657) stay at a single 0.3, so a faint note's ♯/♭ is now darker than its head. Introduced by T014's test-shaped attributes, which notes.md (T014) lists as a minor.

- **W2 — the live lead card carries the mode words the prototype's live card does not draw (known item 1).** — src/ui/TransportCard.tsx:518 (`ModeWordsRow` in `LiveCard`), and likewise in the complete and no-mic cards. — Requires: REQ-014 "… beneath the caption … in every transport state" and REQ-002 "in every state the card SHALL carry the mode words", decision 190/191; the prototype #s03–#s06 draws no words row on the live card. — Does: follows the spec; the card is ~40 px taller than the prototype's, and at 390×844 the summary row ends near the fold (listening-silent.app.png). The code agrees with the approved spec, so this is a spec/design disagreement for the user to settle, not something to fix in code: accept by name, or amend REQ-014/REQ-002 for the live card. The user was asked on the phone walk and has not answered.

- **W3 — REQ-021's "at least every 50 ms" is gated as an average.** — scripts/lead-timing-test.mjs:331, 711, 728 (`readingsPerSecond` over each steady span, then a minimum across targets ≥ 20). — Requires: REQ-021 "SHALL refresh them at least every 50 ms while a steady note is heard"; Article V, "a measured test that fails when the budget is exceeded". — Does: one 200 ms gap among ~90 readings/s still passes. S1's own Then ("at least 20 readings … per second") is gated as written; the requirement's max-gap clause is not. Measured today: min 93.80 and 82.92 readings/s.

- **W4 — `docs/design.md` §8 does not have the tokens 008 promoted (known item 2).** — docs/design.md:159-202 against src/ui/theme.ts. — Requires: decision 182/193 (holdFill "goes into theme.ts and docs/design.md §8"), design.md §8 "the only values screens may use", the proposal's Affects row. — Missing from §8: `lead.holdFill` `oklch(0.80 0.07 150)` (theme.ts:60); `paper.pillInk` `#756c60` (:20); `modeWords` (:115-126: gap 16, bar 2/offset 4/padding 4, glyph bar 3 / gap 3 / heights 10·20·10, and two new colours `glyphOuter` `rgba(249,244,233,.6)` and `glyphCentre` `#f9f4e9`, the latter equal to TransportCard's hard-coded `PLAY_INK`); `noteMeter` (:68-80: box 40, 0.4 px/¢, stave band 26, line overhang 2, column insets 6/3, box top 13, radii 3 and 1, which are not on §8's radius scale, line 2 px, transition `top .18s cubic-bezier(.3,.7,.3,1)`); `leadCard` (:84-90: 40, 12, 14, 12.5, line-height 1.45); `sheetRow` (:94-111: 62 px row, padding 18, 13/11 type, hint line 14 / box 28, pill padding `9px 10px 10px` / radius 10 / 12.5, switch 36×20, knob 14 / inset 3 / on-left 19, close 28 (unread), hairline = `paper.borderSoft`); and a note that the meter shares `tuner.band/inTune/flat/sharp`. §8's `tuner.band` row says "behind the level and the stave" and does not mention the note meter. This belongs to the design skill's exit/sdd-finish, but it must happen before `shipped`.

- **W5 — the mic-request window: the second tap does nothing, and no ■ is shown.** — src/ui/App.tsx:575-576 (`inProgress` only for `lead.phase === "listening"`), session.ts:2217 (`startLead` returns while `listeningOwner === "lead"`). — Requires: the proposal's edge-case row "the circle tapped while already leading: the second tap is the stop" (REQ-015). — Does: between the tap and `listening.start()` resolving (the permission prompt on a first run), the card stays the idle card with the Tuner glyph and a second tap is a no-op. It is not a stop. Recorded at T024 as a minor and not pinned by any test. The window is short once permission is granted.

- **W6 — the measured tone-cue check and the phone walk leave REQ-018/S3's acoustic path unverified.** — scripts/lead-timing-test.mjs (the bleed is injected with zero speaker-to-mic latency, notes T019); docs/decisions.md:195 records the walk's sign-off ("Looks like it's working") but not a walk with Cues → tone on. — Requires: REQ-018 "from that tone's onset until it has ended with its release plus about 100 ms THE SYSTEM SHALL judge nothing"; the proposal's assumption "the tone cue's tail (~100 ms after its release) is enough for the phone's speaker-to-mic path". — Does: `mutedUntilMs` is set from the scheduled onset in context frames (session.ts:1305-1310) with no output/input latency added. A real phone's output and input latency can push the tone's tail past the window, where it would bank as in tune. Needs a phone check with tone on, or the user's explicit acceptance.

### Info (12)

- REQ-021/S4 (acceptance): the user walked the final code on the phone on 2026-10-04 (T024's ■ fix, then "Looks like it's working", docs/decisions.md:195). No commit after it touches `src/`. I take this as the sign-off. C1 and C2 were not exercised by that walk.
- The ocarina ranges were reported wrong by the user and explicitly deferred to a separate fix after the MR (docs/decisions.md:196). Out of scope, untouched.
- D001, D002 and D003 re-checked against AUTONOMY's four questions. All three are two-way. D001's and D002's amendments are applied to the delta verbatim (delta session.md:185-191, :213-222, :281-315). D003's guard is at session.ts:1632 with its test at lead-edge-cases.test.ts:43 (`sdd_amends: none`, so there is nothing to apply). No escalated verdicts and no parked tasks (4a: n/a). `tasks/index.md`: 24/24 done.
- After a non-looping run completes, `leadListeningState` stays `{kind: "listening"}` (session.ts:1115-1122 never resets it), so `snapshot.lead.listening` says "listening" beside `phase: "complete"`. Nothing reads it today.
- `restartLeadIfRunning` calls `targetAt(sequence, 1)` (session.ts:2038), which throws a RangeError on an empty sequence. That is unreachable with the built-in catalogue (lead-helpers.ts and D003 record this), but `setContext`/`setTraversal` would throw rather than idle.
- The I-lead idle caption is clipped by the card's `text-overflow: ellipsis` (TransportCard.tsx:590-600) to "hold 2 beats · medium t…" at 390 px. The prototype clips it identically, and the DOM text is the full REQ-014 string; noted for the design loop.
- The live card's octave sits inline at the letter's baseline (TransportCard.tsx `TargetLetterOctave`); the prototype sets it as a superscript ("E⁴"). Same elements, different placement.
- Stale comment: session.ts:130-134 says `reading` and `justHeld` "are always null until T006 and T011 wire …". Both are wired.
- Plan deviations, all recorded in notes.md: `CUE_TAG_BASE` lives in session.ts, not lead.ts; `NoteMeter`'s props differ from the plan's `MeterFrame`; the REQ-011 UI scenarios live in app-session.test.tsx; `scripts/design-shots-page.mjs` and the `KeyPanel` underlay/overlay slots are new; `NoteJudged` is emitted once per committed (coalesced) reading, as the plan chose. The branch also carries SDD-template tooling commits (`scripts/task.py`, `review-package.sh`, … — 4bfbbe0, f1c670e, 34f3be1) that are workflow, not product.
- `cargo test` shows two `#[ignore]`d benchmark tests (`cost_of_one_analysis`, `reed_drone_render_cost`). Both predate this change.
- Pass 8, notes fold-back. T014's "no z-index; paint by DOM order" and the "React.memo needs stable props" lesson are local. T021's vitest `pool: 'vmThreads'` option and T020's "Python Playwright must equal node's" are tooling notes for AGENTS.md (local). The T023 note that REQ-017/S4 was self-contradictory was a spec amendment, done (D002). There is no ADR-worthy note. One engineering-preference refinement to propose, not apply: "no test-only attributes on production DOM that carry rendering semantics" (W1 came from exactly that).
- style: `cardShellColumnStyle()` repeats `cardShellStyle()`'s first three properties (TransportCard.tsx:402-416); four identical pill-geometry constants in TraversalSheet.tsx; `sheetRow.closeSize` exported but unread (theme.ts:109); the stage drivers and timing constants exist twice (design-shots.mjs and design_snapshot.py); `nextPhaseAfterHold` builds the listening phase in two branches (lead.ts:128-143). Style: 0 further nits omitted.

### Commands

`pnpm check` (real node, `source ~/.cargo/env`), exit 0:
```
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
Checking formatting...
All matched files use Prettier code style!
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
 Test Files  93 passed (93)
      Tests  455 passed (455)
   Start at  12:03:38
   Duration  20.66s (tests 60%, environment 26%, import 8%, transform 5%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.58s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
EXIT 0
```
(eslint and tsc print nothing on success; the chain reached vitest and cargo, so both passed.)

`pnpm test:timing`, exit 0, first run, no rerun needed:
```
measuring 3 tempos sequentially, 60 s each
pre-flight: AudioContexts constructed: 1 (expected 1) — PASS
bpm  onsets  max onset dev (ms)  drift (ms, |slope·span|)  highlights  vs audible (ms)  vs scheduled (ms)  status
40   82      0.00                0.00                      40          18.67            46.67              PASS
96   194     1.33                0.08                      94          27.67            44.20              PASS
200  402     0.00                0.00                      195         26.67            54.77              PASS
test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
```

`pnpm test:tuner`, exit 0:
```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     79.30                   66.65                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     77.90                   66.65                 10.69               92.86           0.65           1              PASS
hand-over glissando  1      57.90                   61.31                 8.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout D♯6 79.30 ms · arrival age D♯6 66.65 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout A♯4 77.90 ms · arrival age E2 66.65 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

`pnpm test:lead`, exit 0:
```
driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   8.02                  8.02                93.80           0                              18.69                    PASS
tone cue fed back  3        70.33                   5.35                  5.35                82.92           0                              13.35                    PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
```

`./scripts/check-scenarios.sh --change changes/008-learner-leads`, exit 0: every scenario of `practice.session` REQ-001…REQ-022 "✅ … tested" (REQ-014/S1–S5 … REQ-022/S1–S4 all listed), ending `✅ scenario coverage complete`.

`./scripts/check-contexts.sh`, exit 0: `✅ context boundaries respected`.

`./scripts/check-design.sh --change changes/008-learner-leads`, exit 0:
```
Design
  interface: yes · design.md approved v1.1.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 008-learner-leads
✅ design checks clean
```

`design_snapshot.py … live --base http://localhost:5173` wrote all twelve `practice--<state>.png`. `pnpm design:shots` wrote all twelve `{prototype,app}` pairs (holding: "fill at the shot ≈ 0.58"). The dev server already on :5173 was used and left running.

### Verdict
Not converged — 2 critical, 6 warning

<!-- recorded 2026-10-05T11:18:34Z by scripts/record.sh -->
