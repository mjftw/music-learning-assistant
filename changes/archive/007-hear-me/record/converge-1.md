---
type: Convergence Report
title: 007-hear-me — convergence report
resource: /.sdd/reports/007-hear-me/converge.md
status: draft
tags: [sdd, converge, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/proposal.md
  - resource: /REVIEW.md
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-09-29T19:40:00Z
sdd_id: 007-hear-me
---

## Convergence report — 007-hear-me
Run: 2026-09-29 · Commit: a6bac04. The audit started at 05a8f52; a6bac04 is a docs-only commit on top (notes.md and decisions.md), so every code result below holds for both.

Secrets: none found. No `.env*`, key or credential material in the diff. The dev hooks (`__session`, `__listening`, `__noteJudged`, `__paintAgesMs`) are all behind `import.meta.env.DEV` (`src/ui/main.tsx:38–87`).

Target state: `.sdd/target/007-hear-me/` was written 2026-09-29 20:14 BST, after the last delta change (2026-09-29 00:00), so it is current. I did not re-run `merge_delta.py` because it writes to the tree.

### Pass 1 — Spec compliance

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| listening.pitch-detection/REQ-001 | ✅ `src/listening/published/index.ts:114` (getUserMedia only in `start`), `:83` teardown | ✅ `tests/listening/scenarios/pitch-detection.test.ts` | ✅ |
| listening.pitch-detection/REQ-002 | ✅ `src/listening/src/detector.rs:41` (MPM), `ring.rs:27` onset gate | ✅ cargo `detector::tests::req_002_*`; S5 via `pnpm test:tuner` (57+57 tones, cents err max 0.65 ¢) | ✅ |
| listening.pitch-detection/REQ-003 | ✅ clarity threshold; schema `hz.positive()` (`pitch-detected.schema.ts:7`) | ✅ cargo `req_003_s1–s4`, `lib.rs` S3; harness silence/noise 0.00/s | ✅ |
| listening.pitch-detection/REQ-004 | ✅ HOP 512 in place (`lib.rs:70`); the drop is the session's (`session.ts:806–810`) | ⚠️ S1 and S2 via the harness (≥92.86 readings/s); **S3 is cited by a test that checks something else** (W3) | ✅ behaviour. S3's Then is exercised, but by the test citing practice.tuner/REQ-006/S2 |
| listening.pitch-detection/REQ-005 | ✅ `session.ts:778` onHidden → stop, `:923` onShown → start | ✅ `tuner-hidden-awake.test.ts` | ✅ |
| listening.pitch-detection/REQ-006 | ✅ `index.ts:128–136` refused/none/failed, `:171` track ended | ✅ `pitch-detection.test.ts` | ✅ |
| practice.tuner/REQ-001 | ✅ `session.ts:1566` enterTuner, `:1612` leaveTuner; `Header.tsx` pill | ✅ way-in-out, never-both (9 verbs, 7380 sequences), tuner-screen | ✅ |
| practice.tuner/REQ-002 | ✅ `domain/tuner.ts:57,112,186`; `TunerLevel.tsx` | ✅ tuner-reading, tuner-smoothing, tuner-screen; S9 via harness (shown err max 1 ¢) | ⚠️ In the hand-over band (auto, 50–56 ¢) the stave's cents disagree with the level and are coloured against their sign (W1) |
| practice.tuner/REQ-003 | ✅ `session.ts:873` gap; `TunerScreen.tsx:392–484` linger/fade; `tuner-silence.ts` | ✅ tuner-reading, tuner-linger; live probe: grey at 450 ms, fading at 950 ms, gone by 1350 ms | ✅ (see I6 on the "IS" caption) |
| practice.tuner/REQ-004 | ✅ `session.ts:1643/1655/1668/1679`; `TargetPill`, `TargetSheet`, `PitchSpiral` | ✅ tuner-target, target-sheet | ⚠️ Past ±50 ¢ the tag covers the header's LISTENING / NO MIC, which the 4a design avoids (W2) |
| practice.tuner/REQ-005 | ✅ `TunerStave.tsx` | ✅ tuner-stave, tuner-linger | ⚠️ W1 (head and cents ignore the hysteresis) |
| practice.tuner/REQ-006 | ✅ age check `session.ts:806–810`; per-tick coalescing `:834`; `readingShown` `:1691` | ✅ S1 harness PASS (worst first readout 77.00 ms, arrival 66.65 ms); S2 `tuner-budget.test.ts:6`; S3 walked at T024 | ✅ |
| practice.tuner/REQ-007 | ✅ `session.ts:906`; `TunerScreen.tsx:117` card | ✅ tuner-cannot-hear, tuner-screen | ✅ |
| practice.tuner/REQ-008 | ✅ `session.ts:778,923`; wake lock via `releaseWakeLockIfSilent` | ✅ tuner-hidden-awake | ✅ |
| practice.tuner/REQ-009 | ✅ `leaveTuner` resets target and lastHeard (`session.ts:1619–1623`) | ✅ tuner-memory, selection-persistence | ✅ |
| theory.temperament/REQ-002 | ✅ `src/theory/domain/temperament.ts:23`, `notes.ts:110` | ✅ `temperament.test.ts`, `invariants/nearest-note-inverse.test.ts` | ✅ |

No requirement is REMOVED or MODIFIED in any delta; all three deltas are ADDED only.

| Scenario | Test | Through public interface? |
|---|---|---|
| listening.pitch-detection/REQ-001/S1–S3 | ✅ tests/listening/scenarios/pitch-detection.test.ts | ✅ `createListener` with injected `mediaDevices` |
| listening.pitch-detection/REQ-002/S1–S4 | ✅ src/listening/src/detector.rs (cargo) | ✅ the crate's pub `detect` (plan-approved); also covered end to end by the S5 sweep |
| listening.pitch-detection/REQ-002/S5 | ✅ scripts/tuner-timing-test.mjs (+ detector.rs) | ✅ page microphone → real worklet |
| listening.pitch-detection/REQ-003/S1–S2 | ✅ detector.rs + harness | ✅ |
| listening.pitch-detection/REQ-003/S3 | ✅ src/listening/src/lib.rs `req_003_s3_a_breath_between_notes` | ✅ C ABI `push` |
| listening.pitch-detection/REQ-003/S4 | ✅ detector.rs enumeration | ✅ |
| listening.pitch-detection/REQ-004/S1–S2 | ✅ harness | ✅ |
| listening.pitch-detection/REQ-004/S3 | ⚠️ tests/practice/scenarios/tuner-budget.test.ts:21 cites it but tests coalescing (W3) | ✅ interface, ❌ wrong Then |
| listening.pitch-detection/REQ-005/S1–S2 | ✅ tests/practice/scenarios/tuner-hidden-awake.test.ts | ✅ practice/published + fakes |
| listening.pitch-detection/REQ-006/S1–S3 | ✅ pitch-detection.test.ts | ✅ |
| practice.tuner/REQ-001/S1–S4 | ✅ tuner-way-in-out, never-both, tuner-edge-cases, tuner-screen, transport-card | ✅ |
| practice.tuner/REQ-002/S1–S8 | ✅ tuner-reading, tuner-smoothing, tuner-edge-cases, tuner-screen | ✅ |
| practice.tuner/REQ-002/S9 | ✅ harness `shown err max` column | ✅ (the gate can pass on no data: W4) |
| practice.tuner/REQ-003/S1–S3 | ✅ tuner-reading, tuner-screen | ✅ |
| practice.tuner/REQ-003/S4–S6 | ✅ tests/ui/scenarios/tuner-linger.test.tsx | ✅ |
| practice.tuner/REQ-004/S1–S8 | ✅ tuner-target, target-sheet | ✅ |
| practice.tuner/REQ-005/S1–S6 | ✅ tests/ui/scenarios/tuner-stave.test.tsx (+ tuner-linger) | ✅ |
| practice.tuner/REQ-006/S1 | ✅ harness | ✅ |
| practice.tuner/REQ-006/S2 | ✅ tuner-budget.test.ts:6 (fake clock, as the plan mapped; I9) | ✅ |
| practice.tuner/REQ-006/S3 | ✅ acceptance, T024 (user sign-off, notes.md:475–482) | — |
| practice.tuner/REQ-007/S1–S3 | ✅ tuner-cannot-hear, tuner-screen | ✅ |
| practice.tuner/REQ-008/S1–S2 | ✅ tuner-hidden-awake | ✅ |
| practice.tuner/REQ-009/S1–S3 | ✅ selection-persistence, tuner-memory, target-sheet | ✅ |
| theory.temperament/REQ-002/S1–S4 | ✅ tests/theory/scenarios/temperament.test.ts | ✅ |
| theory.temperament/REQ-002/S5 | ✅ tests/theory/invariants/nearest-note-inverse.test.ts | ✅ |

### Pass 2 — Constitution
- I–IV: ✅. Every behaviour traces to the approved deltas and the amendments recorded in rounds.md and decisions.md. Tests were run with output; reviews were separate.
- **V (latency budget)**: ✅. The 100 ms budget is numbered in practice.tuner/REQ-006. `pnpm test:tuner` measures it on the current tree and it PASSES: first readout ≤77.00 ms, arrival age ≤66.65 ms, ≥92.86 readings/s. A late detection is dropped (`session.ts:806–810`; `tuner-budget.test.ts:6`: 100.02 ms dropped, 100.00 ms shown).
- VI: ✅. The tuner is a separate screen; the only addition to the practice view is one header pill, and the live shot matches the reference pixel for pixel.
- VII: ✅. No new network egress. `fetch(wasmUrl)` is the app's own asset; audio is never posted off the worklet except as the pitch triple.
- VIII: ✅. No new npm package and no crate (`src/listening/Cargo.toml`, `[dependencies]` empty).
- IX: ✅. Amendments are recorded in the deltas and decisions.md; plan drift is listed under pass 8.
- X: n/a.

### Pass 2b — Engineering preferences
- W5: §8 schema-first is not met for `NoteJudged`.
- W6: §6 says consumed events are translated at the adapter; here they are translated in domain code.
- Everything else follows. Errors are values (`Result` / `ListeningUnavailable`), the core is functional (`domain/tuner.ts`), states are sum types (`ListeningState`, `TunerTarget`), and there is no `any`.

### Pass 3 — Plan conformance
File structure, stack and dependencies match `plan.md` › Structure. The interface differences are plan drift, listed under pass 8. The coalescing rule and `readingShown` differ from the plan's prose but not from any requirement.

Domain boundaries: `check-contexts.sh` ✅. Emitted events `PitchDetected` and `NoteJudged` are past-tense and named in their own context's language, under `published/`. `NoteJudged` has no schema (W5). The consumed `PitchDetected` shape appears in practice domain code (W6). The invariants this slice could touch are each tested by trying to break them:
- never-both: 9 verbs, 7380 sequences.
- positive frequency and confidence: cargo enumeration plus the Zod `positive()`.
- within the bound or not at all: `tuner-budget.test.ts` plus the harness.
- target-in-sequence: still green.

### Pass 3c — Design fidelity
rounds.md: `sdd_phase: exited` ✅. docs/design.md: approved v1.1.0.

I captured the live screens with Node Playwright against `https://localhost:5173`. `design_snapshot.py` cannot run here because Playwright for Python is not installed. Captures are in `/tmp/claude-1000/-home-merlin-projects-music-learning-assistant/1770e9fb-e3e5-44c8-92c8-c6c90b7142e6/scratchpad/converge-shots/`. For tuner--listening I fed a 440 Hz tone through the harness's own `getUserMedia` override, because the design-shots silent capture has no reading. I compared each pair with a PIL pixel diff (pixels differing by more than 24).

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| practice · way-in | design/reference/practice--way-in.png | converge-shots/practice--way-in.png | ✅ 0 px differ | n/a (see below) |
| tuner · listening | design/reference/tuner--listening.png | converge-shots/tuner--listening.png | ✅ 114 px (0.035%) differ, all inside the trail box (25,637)–(144,712), which is time-dependent | — |
| tuner · listening 360×660 | design/reference/tuner--listening--360x660.png | converge-shots/tuner--listening--360x660.png | ✅ structurally (the reference is 1×, the live shot 2×); no scroll (660/660) | — |
| tuner · silent | design/reference/tuner--silent.png | converge-shots/tuner--silent.png | ✅ 0 px | — |
| tuner · cannot-hear | design/reference/tuner--cannot-hear.png | converge-shots/tuner--cannot-hear.png | ✅ 0 px | — |
| tuner · cannot-hear 360×660 | design/reference/tuner--cannot-hear--360x660.png | converge-shots/tuner--cannot-hear--360x660.png | ✅ 0 px | — |
| tuner · target-pinned | design/reference/tuner--target-pinned.png | converge-shots/tuner--target-pinned.png | ✅ 0 px (the reference is the silent pinned state; beyond ±50 ¢ see W2) | — |
| tuner · target-sheet | design/reference/tuner--target-sheet.png | converge-shots/tuner--target-sheet.png | ✅ 0 px | — |

Untouched screens: the `docs/design.md › Screens` index is empty and `docs/design/screens/` does not exist, so there is no baseline for unlisted screens. The only pre-existing screen this change alters is `practice` (the header pill), and that is listed.

Design: `check-design.sh` ✅ ("design checks clean"). Tokens: ⚠️ 11 hard-coded colours in 007's new `.tsx` files (W7). `check-design.sh` only scans `src/ui/**/*.css` (`scripts/check-design.sh:27`), so it cannot see them. The 3 values it does report in `global.css` predate this change (I4).

### Critical (0)
None.

### Warning (7)

- **W1 — In the hand-over band (auto, 50–56 ¢), the stave strip contradicts the level and colours its cents against their sign.**
  - Where: `src/ui/TunerStave.tsx:375–391, 856` (head, accidental and cents from `reading.heard.nearest` / `heard.cents`) against `src/ui/TunerLevel.tsx:242–243` (`reading.target` / `reading.cents`).
  - What the artefacts require:
    - practice.tuner/REQ-002: the shown note holds until 56 ¢, and "the line, tag and cents SHALL be coloured warm when sharp, cool when flat".
    - REQ-005: the head is "the nearest note … the offset in cents written above".
    - The 4a prototype draws both from the same hysteresis-held `(m, c)` (`design/Tuner.dc.html:1082`).
  - What the code does: `heard.nearest` is `nearestNoteOf(smoothed hz)`, which has no hysteresis. Measured live at 454 Hz after settling on A4, the level reads "A 4 +50 sharp", while the stave draws A♯4 with a ♯, writes "−46" in the sharp (warm) colour, and captions it "A4 IS 440.0 Hz". Screenshot: `converge-shots/zone-454.png`; snapshot `heard.nearest = A♯4, heard.cents = −46, target = A4, cents = 50`.
  - Also affected: in the same band, Hold pins `heard.nearest` (`src/ui/TargetSheet.tsx:233`, `session.ts:1643`), so it pins A♯4 while the big name shows A4.
  - No test covers the band on the strip. This is also my answer to the controller's question about `heard.nearest` / `heard.cents` (I10).

- **W2 — Past ±50 ¢ the level's tag covers the header's LISTENING / NO MIC indicator.**
  - Where: `src/ui/TunerLevel.tsx:166–167`.
  - What the design requires: the proposal names `design/Tuner.dc.html` 4a as the source of truth. 4a places the tag with `tagTop: over ? (dev > 0 ? lineTop + 36 : lineTop − 58) : Math.max(30, Math.min(536 − 62, tagTop))` (`Tuner.dc.html:1292`). That puts the tag below a line pinned at the top and clamps it inside the level.
  - What the code does: it implements only 3a's `v >= 0 ? ly − 36 : ly + 8` (`Tuner.dc.html:1137`), with no clamp and no "over" placement.
  - Live, in REQ-004/S3's own state (A4 pinned, C5 played): "playing C5 ▲ 3 st" sits over the header and only the final "G" of LISTENING shows (`converge-shots/tuner--target-pinned--far.png`). At auto +50 ¢ the same happens with "+50 sharp" (`zone-454.png`). The 4a prototype at `edge (+48 ¢)` keeps LISTENING visible (`converge-shots/proto-edge.png`).
  - The −50 edge follows the same unclamped rule; I did not capture it live.
  - The reference PNGs never showed an over-range reading, so the refinement loop could not have caught this.

- **W3 — A test cites `listening.pitch-detection/REQ-004/S3` but tests something else, so `check-scenarios.sh` reports S3 as tested when its citing test never checks its Then.**
  - Where: `tests/practice/scenarios/tuner-budget.test.ts:21`, titled "listening.pitch-detection/REQ-004/S3 — a burst before the commit is coalesced to the newest".
  - What REVIEW pass 1 requires: a test citing each scenario verbatim whose Then holds. S3's Then is "a late detection is not published; the next one that can meet the bound is".
  - What the test does: it feeds three fresh detections and asserts that only the newest is judged. That is coalescing, which belongs to REQ-004/S1 and practice.tuner/REQ-006. It never tests lateness.
  - S3's behaviour is exercised: `tuner-budget.test.ts:6` (cited as practice.tuner/REQ-006/S2) drops a detection 100.02 ms old and shows one 100.00 ms old, and `src/listening/src/lib.rs:133` covers the crate's "never queued" half. Nothing is untested; the trace is false.
  - Fix: add the REQ-004/S3 citation to the late-drop test and re-title the coalescing test. My judgement: this needs a task, not just a note, because it is the one scenario where the coverage tool is fooled.

- **W4 — The harness's S9 gate (and the raw cents-error column) can pass without taking a single reading.**
  - Where: `scripts/tuner-timing-test.mjs:386–402`.
  - What practice.tuner/REQ-002/S9 requires: the shown offset, read half a second into each tone, is within ±2 ¢.
  - What the code does: `maxShownCentsErr` starts at 0 and nothing requires at least one reading after `SHOWN_SETTLE_MS` = 500 ms. The readings-per-second gate only needs about 14 readings anywhere in the 200–900 ms window.
  - This run is not vacuous. Every tone reported ≥92.86 readings/s over the 0.7 s window, so its readings span past 500 ms. But a regression that stopped readings early would pass. notes.md T027 records the same concern.
  - Fix: require at least one post-settle reading per tone, and likewise after `CENTS_SKIP_MS`.

- **W5 — `NoteJudged` is not schema-first.**
  - Where: `src/practice/published/note-judged.schema.ts:15–25`.
  - What the artefacts require:
    - docs/domain.md › Events: "Schema-first — the schema is the contract", naming `src/practice/published/note-judged.schema`.
    - Engineering §8.
    - The plan's preferences table (§8 row): "`NoteJudged` schema under `practice/published`" — Follows.
  - What the code does: a plain TypeScript interface. Only `verdictSchema` is Zod, and a comment argues parsing is unnecessary. The sibling `TargetAdvanced` has a Zod schema (`target-advanced.schema.ts:15`).
  - The departure is not recorded as approved in the plan's table. Fix: add the schema, or record the departure for the user to accept.

- **W6 — The consumed event's shape appears in practice domain code.**
  - Where: `src/practice/domain/tuner.ts:15, 112–117` (`judge(pitch: PitchDetected …)`) and `src/practice/domain/session.ts:70, 801`. The port passes `PitchDetected` straight through (`src/practice/ports/listening.ts:1–17`).
  - What the artefacts require: REVIEW 3b, "consumed events are translated at an adapter and their shape does not appear in domain code"; engineering §6, "translated at the consumer's adapter".
  - The plan's §6 row describes translation "at the session" and labels it "Follows". The user approved that design, but the table mislabels a departure. Sound's types have been in `session.ts` the same way since 003, so this is the repository's established reading.
  - I have rated it a warning, not a boundary violation: `check-contexts.sh` is clean and only `published/` is imported. The user should accept it by name or task an adapter-side `HeardPitch` type, and I propose clarifying §6 under pass 8.

- **W7 — Hard-coded colours in 007's new UI, outside the docs/design.md §8 tokens.**
  - Where:
    - `src/ui/TunerScreen.tsx:153` `#e0d7c5`, `:159` `#756c60`
    - `src/ui/TargetPill.tsx:15, 46` `#e0d7c5`, `:29–30` `rgba(138,75,42,.35/.10)`, `:34` `#5e564c`
    - `src/ui/TargetSheet.tsx:38, 42` `#e0d7c5`, `:43` `#ece4d5`, `:45` `#b0a797`
  - What the artefacts require: AGENTS.md › Never, "style with a value that is not a token in docs/design.md §8 once it is approved" (§8 was approved at 007's plan, before these files); REVIEW 3c, a hard-coded value is a warning unless justified in notes.md.
  - Justification status:
    - `#e0d7c5` and `#756c60`: notes.md T018 records them only as "token candidates … at hardening", and they were not promoted at the loop's exit.
    - The rgba pair: justified only in a code comment.
    - `#5e564c` and `#b0a797`: no justification anywhere.
    - `#ece4d5`: exactly `paper.hairlineSoft`, a token that exists and was not used.

### Info (11)
- **I1 — test:timing at 200 bpm.** The controller's pre-converge run FAILED `vs audible` at 200 bpm with 30.57 ms. My two runs on the same tree PASSED (29.33 ms and 25.33 ms). 004's notes.md record the identical 30.57 / 29.33 pair (archive/004-the-drone/notes.md:41), and this change does not touch the transport or scheduler, so it is the pre-existing laptop headroom, not a 007 regression. The acceptance line a6bac04 adds to docs/decisions.md is marked "controller decision". It is not the user's own acceptance by name (Article I); confirm it at acceptance.
- **I2 — Reduced motion: no constitution or §6 violation in practice.** The constitution has no accessibility article.
  - The only animations 007 actually runs (the linger fade and "Play a note" fading in) check `prefers-reduced-motion` (`TunerScreen.tsx:392–484`, `tuner-silence.ts:58`).
  - The sheet slide never animates because `display` flips abruptly (`src/ui/overlay.tsx:39–45`, from 004).
  - The scrim has no transition.
  - The ".18s tuner head and cents" motion that docs/design.md §8 lists is not built anywhere.
  - So §8's motion row describes three animations the code does not run: a design.md amendment at finish, not a task.
- **I3 — "Can't hear" card clearance at the level's 300 px minimum.** About 8 px of clearance at a ~400 px-tall viewport is outside REVIEW's scope. §2 lists no landscape or short-viewport situation ("tablet … later"), §9's fit pattern allows scrolling below the minimum, and nothing overlaps. It is fine at 360×660, 360×780 and 390×844 (notes.md T032 and my 360×660 capture).
- **I4 — `src/ui/global.css`'s 3 warned values predate this change.** They are from 002 (`#ddd6c7` plus two mentions inside a comment), and design.md §7 names `global.css` as the sanctioned stylesheet for the page background. 007 adds only `.visible-height` (vh/dvh). This is 002's debt, not 007's.
- **I5 — The pending first-ever tap racing ▶ / ❚❚ is confirmed pre-existing.** On `main`, `tapNote`'s continuation posts after `await sound.start()` with no transport or generation check (`git show main:src/practice/domain/session.ts`, lines 1060–1079). 007 added `tapGeneration` only against `enterTuner`. It falls under practice.session/REQ-013, outside 007's requirements, and belongs in a separate change.
- **I6 — During the linger, "A4 IS 440.0 Hz" clears to "— IS —" at once while "HEARD 445.2 Hz" lingers grey** (live probe). REQ-003/S4 says "the Hz" without saying which, so the user should decide whether the IS caption lingers too.
- **I7 — `paper.inkMid` is missing from docs/design.md §8.** It exists in `src/ui/theme.ts` (promoted at T016) and is used in six places.
- **I8 — The user's REQ-006/S3 sign-off (T024) predates T026–T032.** Rounds 1–5 were judged on the phone, but a final walk at acceptance would close it.
- **I9 — practice.tuner/REQ-006/S2 is marked "(measured)" but its test uses a fake clock** (`tuner-budget.test.ts:6`), as the plan mapped. The harness never stalls a real device.
- **I10 — The controller's question on `NoteJudged.heard`.**
  - Against the spec: `heard.hz` raw with `heard.nearest` and `heard.cents` following the smoothed pitch is consistent. REQ-002 pins only the Hz as raw and the offset and verdict as smoothed.
  - Against the plan: its comment "the raw detection and its nearest note" (plan.md:214) needs amending.
  - For the consumers: `TunerStave` (head, cents, trail) and `PitchSpiral` (needle, `:101`) need the smoothed value, otherwise the strip flickers while the level does not. `TargetSheet` Hold is indifferent.
  - The real defect is not raw versus smoothed but missing hysteresis (W1).
- **I11 — Style (5 of the cap):**
  - A stray comment at `src/ui/TunerStave.tsx:431` (flagged at T030, still there).
  - Font sizes outside the §8 type scale: `TargetPill.tsx:22` (9) and `TunerStave.tsx:31` (36); and an inline literal `fontSize: 13` at `TargetSheet.tsx:123`.
  - For one frame the level draws at the 536 px fallback before it is measured (T032).
  - The session's listening state reads `off` for one microtask at entry (T014).

### Pass 8 — Notes fold-back

Plan amendments at finish (code right, plan text stale):
- The NSDF walk starts from τ = 1; only candidates are restricted to ≥ lag_min (T001).
- `ListeningEnded.detail` (T003).
- `SessionContext.spelling` replaces the plan's separate `createSession(…, spelling, deps)` argument (T007; `session.ts:83`).
- The hand-over compares raw, unrounded cents (T021; `tuner.ts:62–69, 80–83`).
- `TunerSnapshot.lastHeard` (T028).
- `NoteJudged.heard` follows the smoothed pitch (T026; plan.md:214).
- Coalescing is per clock tick (`session.ts:834–835`, commit on the next tick), not "while a reading is awaiting paint". `readingShown` returns the age and never drops the next reading (plan.md:296 against `session.ts:1691–1695`).
- NoteJudged placement (T006) matches the plan's own data-model block. The real gap is the missing schema (W5).

ADR-worthy:
- Amend ADR 0006 with the onset gate (`ring.rs:27`, `ONSET_SETTLE_FRAMES = WINDOW + QUANTUM_FRAMES`). It shapes first-readout latency and E2 accuracy (T021) and is absent from both the ADR and the plan.
- Also add the τ = 1 walk.

docs/design.md amendments:
- §8 motion row (I2).
- `paper.inkMid` (I7).
- Promote or justify the W7 colours.

Spec (for the user, not a code defect):
- REQ-003/S4 "the Hz" (I6).
- REQ-006/S2 "(measured)" against a fake clock (I9).

Local, no action: T002, T004, T008, T011, T012, T013 (the TAP_TAG_BASE duplication), T015, T017, T019, T020, T029, T031, and the loop-exit note.

For converge, now covered by findings above:
- T010 sustained stall: silence after 300 ms is consistent with Article V; info.
- T026 / T027 → W3, W4.
- T028: the sheet-side S7 test does not assert the greyed name; it is covered session-side; info.
- Round 4 → I2.
- T032 → I3, I4.

Engineering refinements to propose (via sdd-engineering › Refine, never applied here):
1. §6: say whether a port signature may carry the upstream context's published event type, as `SoundPort` and `ListeningPort` do, or whether the adapter must map it to a consumer-owned type. W6 turns on this.
2. §14 tooling: `check-design.sh` should scan colour and size literals in `src/ui/**/*.tsx` as well as CSS. AGENTS.md already says it warns on values "hard-coded elsewhere", and W7 went unseen.

### Commands

`./scripts/check-scenarios.sh --change changes/007-hear-me`:
```
listening.pitch-detection  ✅ REQ-001/S1 … REQ-006/S3 tested (20/20)
practice.tuner             ✅ REQ-001/S1 … REQ-009/S3 tested (46/46)
theory.temperament         ✅ REQ-001/S1 … REQ-002/S5 tested (8/8)
✅ scenario coverage complete
exit=0
```
(Condensed: every line was ✅. REQ-004/S3's ✅ is the false positive in W3.)

`./scripts/check-contexts.sh`:
```
✅ context boundaries respected
exit=0
```

`./scripts/check-design.sh --change changes/007-hear-me`:
```
Design
  interface: yes · design.md approved v1.1.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 007-hear-me
✅ design checks clean
exit=0
```

`bash -c "source ~/.cargo/env && pnpm check"` (exit 0):
```
Checking formatting...
All matched files use Prettier code style!
 Test Files  77 passed (77)
      Tests  338 passed (338)
   Duration  10.97s
running 14 tests   (listening)
test detector::tests::cost_of_one_analysis ... ignored   ← the --release benchmark, by design
test result: ok. 13 passed; 0 failed; 1 ignored
test result: ok. 24 passed; 0 failed; 1 ignored   (sound)
```
eslint, tsc, cargo fmt and clippy (`-D warnings`) are silent. There are no `.skip`, `.only`, `.todo`, `TODO` or `FIXME` in `src/`, `tests/` or the harness.

`APP_URL=https://localhost:5173 pnpm test:tuner` (controller's pre-converge run, 2026-09-29 20:11 BST, on the same code):
```
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     77.00                   66.65                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     73.00                   63.98                 10.69               92.86           0.65           1              PASS
hand-over glissando  1      63.00                   61.31                 2.69                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

`APP_URL=https://localhost:5173 pnpm test:timing`:
- Controller's run, FAIL:
  ```
  200  402  0.00  0.00  195  30.57  54.77  FAIL
  ```
- My run 1, PASS:
  ```
  40   82   0.00  0.00  40   22.67  36.10  PASS
  96   194  0.00  0.00  94   27.67  51.00  PASS
  200  402  0.00  0.00  195  29.33  41.33  PASS
  test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
  ```
- My run 2, PASS:
  ```
  40   82   0.00  0.00  40   21.33  34.67  PASS
  96   194  0.00  0.00  94   28.00  38.67  PASS
  200  402  0.00  0.00  195  25.33  44.00  PASS
  test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
  ```

Design fidelity: I captured the eight Interface states plus three diagnostic states (`zone-454`, `target-pinned--far`, the prototype's `edge (+48 ¢)`) and a linger probe. Six of eight pairs are pixel-identical; tuner--listening differs only in the trail; the 360×660 listening pair matches structurally.

### Verdict
Not converged — 0 critical, 7 warning.

To reach Converged, the user must either task each warning or accept it by name: W1 (stave vs level in the hand-over band), W2 (the edge tag covers LISTENING), W3 (the REQ-004/S3 mislabel), W4 (the vacuous S9 gate), W5 (NoteJudged has no schema), W6 (consumed shape in domain code), W7 (hard-coded colours). Nothing blocks. Both measured budgets currently PASS, the constitution holds, every scenario's Then holds with the exact values, and the screens match their references.

<!-- recorded 2026-09-29T19:42:04Z by scripts/record.sh -->
