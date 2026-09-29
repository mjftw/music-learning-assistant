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
  at: 2026-09-29T21:05:00Z
sdd_id: 007-hear-me
---

## Convergence report — 007-hear-me (round 2)
Run: 2026-09-29 · Commit: 6ac167c (working tree clean). Round 1 audited a6bac04; the only code commit since is 92bf8b4 (T033–T039).

Secrets: none. No `.env*`, key or credential material in the tree or the diff. The dev hooks are unchanged since round 1 and are still behind `import.meta.env.DEV`.

Target state: `.sdd/target/007-hear-me/` was written at 21:41, after the last delta commit (fa67bcd, 21:05). `practice/tuner.md` carries the REQ-003 S4/S6 amendment made at convergence, so the target state is current.

Scope of the fix round: `git diff --stat a6bac04..HEAD -- src/practice/domain src/listening src/sound src/theory` is empty. None of T033–T039 touched domain code, the worklets or theory. Code changes are limited to `src/ui/{TunerStave,TunerLevel,TargetSheet}.tsx`, `src/practice/published/note-judged.schema.ts`, `scripts/tuner-timing-test.mjs` and tests.

### Pass 1 — Spec compliance

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| listening.pitch-detection/REQ-001 | ✅ `src/listening/published/index.ts` | ✅ `tests/listening/scenarios/pitch-detection.test.ts` | ✅ |
| listening.pitch-detection/REQ-002 | ✅ `src/listening/src/detector.rs` (MPM), `ring.rs` (onset gate) | ✅ cargo `req_002_*`; S5 by harness (cents err max 0.09 / 0.65 ¢ this run) | ✅ |
| listening.pitch-detection/REQ-003 | ✅ | ✅ cargo `req_003_*`; harness silence and noise 0.00/s | ✅ |
| listening.pitch-detection/REQ-004 | ✅ | ✅ S1/S2 harness (≥92.86 readings/s, arrival ≤63.98 ms). **S3 is now cited by the test that proves it** (`tests/practice/scenarios/tuner-budget.test.ts:6`); the coalescing test at `:21` now cites S1 | ✅ (round-1 W3 fixed) |
| listening.pitch-detection/REQ-005 | ✅ | ✅ `tuner-hidden-awake.test.ts` | ✅ |
| listening.pitch-detection/REQ-006 | ✅ | ✅ `pitch-detection.test.ts` | ✅ |
| practice.tuner/REQ-001 | ✅ | ✅ way-in-out; never-both 9 verbs × lengths 1–4, exhaustive, re-run green | ✅ |
| practice.tuner/REQ-002 | ✅ `domain/tuner.ts`, `TunerLevel.tsx` | ✅ | ⚠️ W2: at 360×660 the tag hides "halfway to G♯4" from about −38 ¢ |
| practice.tuner/REQ-003 | ✅ `TunerScreen.tsx`, `TunerStave.tsx:572` | ✅ `tuner-linger.test.tsx` | ⚠️ W3: the "A4 IS" name neither fades nor is hidden from assistive technology |
| practice.tuner/REQ-004 | ✅ | ✅ | ⚠️ W4: Hold in the 50–56 ¢ band pins a note the big name does not show (round-1 W1 remainder) |
| practice.tuner/REQ-005 | ✅ `TunerStave.tsx` | ✅ `tuner-stave.test.tsx` (+ the new W1 test at `:60`) | ⚠️ W1 (new, from T033): after ✕/Auto the trail and a gap-held or lingering head are redrawn at the old pinned note |
| practice.tuner/REQ-006 | ✅ | ✅ S2 `tuner-budget.test.ts:6`; S3 T024 acceptance | ❌ **S1 measured gate FAILS on HEAD, 3 of 3 runs** (C1) |
| practice.tuner/REQ-007 | ✅ | ✅ | ✅ |
| practice.tuner/REQ-008 | ✅ | ✅ | ✅ |
| practice.tuner/REQ-009 | ✅ | ✅ | ✅ |
| theory.temperament/REQ-002 | ✅ `src/theory/domain/temperament.ts` | ✅ `temperament.test.ts`, `invariants/nearest-note-inverse.test.ts` | ✅ |

All three deltas are ADDED only. Nothing is MODIFIED or REMOVED, so there is no dead-test check to do.

| Scenario | Test | Through public interface? |
|---|---|---|
| listening.pitch-detection/REQ-001/S1–S3 | ✅ tests/listening/scenarios/pitch-detection.test.ts | ✅ |
| listening.pitch-detection/REQ-002/S1–S4 | ✅ src/listening/src/detector.rs (cargo) | ✅ the crate's pub `detect` (plan-approved) |
| listening.pitch-detection/REQ-002/S5 | ✅ scripts/tuner-timing-test.mjs + detector.rs | ✅ |
| listening.pitch-detection/REQ-003/S1–S4 | ✅ detector.rs, lib.rs, harness | ✅ |
| listening.pitch-detection/REQ-004/S1 | ✅ harness; tuner-budget.test.ts:21 (coalescing) | ✅ |
| listening.pitch-detection/REQ-004/S2 | ✅ harness | ✅ |
| listening.pitch-detection/REQ-004/S3 | ✅ tuner-budget.test.ts:6 (100.02 ms dropped, 100.00 ms shown) | ✅ |
| listening.pitch-detection/REQ-005/S1–S2 | ✅ tuner-hidden-awake.test.ts | ✅ |
| listening.pitch-detection/REQ-006/S1–S3 | ✅ pitch-detection.test.ts | ✅ |
| practice.tuner/REQ-001/S1–S4 | ✅ tuner-way-in-out, never-both, tuner-screen | ✅ |
| practice.tuner/REQ-002/S1–S8 | ✅ tuner-reading, tuner-smoothing, tuner-screen | ✅ |
| practice.tuner/REQ-002/S9 | ✅ harness `shown err max`; now requires ≥1 post-settle reading per tone | ✅ |
| practice.tuner/REQ-003/S1–S3 | ✅ tuner-reading, tuner-screen | ✅ |
| practice.tuner/REQ-003/S4–S6 | ✅ tuner-linger.test.tsx (asserts `reference-hz` lingering; not the "A4 IS" label, W3) | ✅ |
| practice.tuner/REQ-004/S1–S8 | ✅ tuner-target, target-sheet (S1 now also asserts tag top 45.5 px) | ✅ |
| practice.tuner/REQ-005/S1–S6 | ✅ tuner-stave, tuner-linger | ✅ |
| practice.tuner/REQ-006/S1 | ⚠️ harness exists and cites it, but **FAILS on HEAD** (C1) | ✅ |
| practice.tuner/REQ-006/S2 | ✅ tuner-budget.test.ts:6 (fake clock) | ✅ |
| practice.tuner/REQ-006/S3 | ✅ acceptance, T024 | — |
| practice.tuner/REQ-007/S1–S3, REQ-008/S1–S2, REQ-009/S1–S3 | ✅ | ✅ |
| theory.temperament/REQ-002/S1–S5 | ✅ | ✅ |

### Pass 2 — Constitution
- I (the user is the source of truth): ⚠️ see W5. The remaining W7 colours are recorded under `## Deferred` as "accepted", but `docs/decisions.md:176` records the user's decision as **fix** W7. No user decision narrows it.
- II–IV: ✅. The fixes cite their requirements, tests were run with output, and each task was reviewed by a separate agent.
- **V (live feedback has a numbered budget): ❌ the measured test fails on the current tree.** This is C1.
- VI: ✅. No change to the practice view.
- VII: ✅. No new egress.
- VIII: ✅. No dependency added; `zod` was already present.
- IX: ✅. The I6 spec amendment is recorded in the delta (`tuner.md` REQ-003 note) and in `decisions.md:178`.
- X: n/a.

### Pass 2b — Engineering preferences
- §8 (schema-first): ✅. `noteJudgedSchema` now exists (`src/practice/published/note-judged.schema.ts:59`); round-1 W5 is fixed. I2 notes a duplication in it.
- §6: W6 was accepted by the user by name (`decisions.md:176`). The code still matches what was accepted: `PitchDetected` is consumed in `domain/tuner.ts` and `session.ts`, and nothing changed there.
- §7: the new W2 tests call the newly exported `readingGeometry` directly (`tests/ui/scenarios/tuner-layout.test.tsx:85–136`). They carry no scenario IDs, so they do not inflate coverage (I3).

### Pass 3 — Plan conformance
Structure, stack and dependencies still match `plan.md`. `readingGeometry` is newly exported from `TunerLevel.tsx:165` for tests only. The plan drift listed in round 1 (pass 8) is unchanged.

### Pass 3b — Domain boundaries
`check-contexts.sh` ✅. Events are unchanged apart from `NoteJudged` gaining its schema.

I re-ran the invariant suites (`pnpm vitest run tests/practice/invariants`): 3 files, 4 tests, passed. They include never-both (every action sequence of length 1–4, exhaustive) and target-in-sequence. The positive-frequency invariant is still covered by cargo `req_003_s4` and the harness.

### Pass 3c — Design fidelity
`rounds.md` has `sdd_phase: exited` ✅. `design_snapshot.py` cannot run here (`ModuleNotFoundError: No module named 'playwright'` for Python), so I captured the screens with Node Playwright against `https://localhost:5173`. I fed the listening states a tone through a `getUserMedia` override, as the harness does. Captures are in `/tmp/claude-1000/-home-merlin-projects-music-learning-assistant/1770e9fb-e3e5-44c8-92c8-c6c90b7142e6/scratchpad/r2/shots/`. I compared each with a PIL pixel diff (a pixel counts if it differs by more than 24).

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| practice · way-in | design/reference/practice--way-in.png | r2/shots/practice--way-in.png | ✅ 0 px | ✅ (none indexed) |
| tuner · listening | design/reference/tuner--listening.png | r2/shots/tuner--listening.png | ✅ 101 px (0.031%), all inside the time-dependent trail box (108,709)–(143,712) | — |
| tuner · listening 360×660 | design/reference/tuner--listening--360x660.png | r2/shots/tuner--listening--360x660.png | ✅ structurally (the reference is 1×, the live shot 2×); no scroll (660/660) | — |
| tuner · silent | design/reference/tuner--silent.png | r2/shots/tuner--silent.png | ✅ 0 px | — |
| tuner · cannot-hear | design/reference/tuner--cannot-hear.png | r2/shots/tuner--cannot-hear.png | ✅ 0 px | — |
| tuner · cannot-hear 360×660 | design/reference/tuner--cannot-hear--360x660.png | r2/shots/tuner--cannot-hear--360x660.png | ✅ 0 px | — |
| tuner · target-pinned | design/reference/tuner--target-pinned.png | r2/shots/tuner--target-pinned.png | ✅ 0 px | — |
| tuner · target-sheet | design/reference/tuner--target-sheet.png | r2/shots/tuner--target-sheet.png | ✅ 0 px | — |

Untouched screens: the `docs/design.md › Screens` index is still empty and `docs/design/screens/` does not exist. The fix commit touched no screen outside the tuner, and `TargetSheet` is a listed state.

States that have no reference, judged by live measurement against the requirement text (the controller's items 1–3):
- Hand-over band (T033): ✅ the stave agrees with the level. Details below.
- IS caption linger (T038): ✅ for the Hz value; ⚠️ for the name part (W3).
- Tag placement (T034): ✅ the header is never covered; ⚠️ the "halfway to" label is covered at 360×660 (W2).

Design: `check-design.sh` ✅ ("design checks clean"). Tokens: ⚠️ `#ece4d5` is now `paper.hairlineSoft` (T039). The other W7 literals remain: `TargetSheet.tsx:38,42,45`, `TargetPill.tsx:15,29,30,34,46`, `TunerScreen.tsx:153,159` (W5).

### Critical (1)

- **C1 — `pnpm test:tuner` FAILS on HEAD, 3 of 3 runs. practice.tuner/REQ-006/S1's measured gate (Article V) is red.**
  - Where: `scripts/tuner-timing-test.mjs:645,669` (the `FIRST_READOUT_MAX_MS` gate), against the app at 6ac167c.
  - What the artefacts require:
    - REQ-006/S1: "every shown reading is within 100 ms" of the tone's start.
    - Article V: a measured test that fails when the budget is exceeded, and "only the measurement is evidence".
    - The task brief: both harnesses must PASS fresh on the current code.
  - What the harness reports: the sine sweep's first readout at E2 was 133.30 ms, then 204.90 ms, then 144.10 ms. Every other gate passed in all three runs:
    - arrival age ≤63.98 ms
    - ≥92.86 readings/s
    - cents error ≤0.65 ¢
    - shown error ≤1 ¢
    - the flute sweep (worst 67.70–76.30 ms), the hand-over glissando, silence and noise
  - The load average was about 1 for runs 2 and 3. Run 1 overlapped my own 2.5 s vitest run; runs 2 and 3 had nothing concurrent.
  - Diagnosis (my own probes, not a fix): it is always the **first tone after entering the tuner in a fresh browser**.
    - `r2/first.mjs`: in a fresh browser the first E2's first pitch reached the main thread 169.9 ms after the predicted onset. The same E2 fed as the second or third tone read out in 51.8–70.3 ms. A first tone at A4 read out in 71.3 ms.
    - `r2/first2.mjs`, 3 fresh browsers, one of them affected: in the affected one the AudioContext clock ran about 52 ms behind wall time between scheduling and the onset (`clockDriftMs` 51.3–54.5). The pitch's own age on the audio clock was 8 ms, and there were no long tasks on the main thread.
    - So the tone itself started late. The harness predicts `onsetPerfMs` from `currentTime` at scheduling (`tuner-timing-test.mjs:373`), so an audio-clock stall at cold start is counted as readout latency.
  - This points to a harness onset-anchoring artefact, not late feedback. Nothing in 92bf8b4 touches listening, the session, the worklets or the harness's first-readout path (T036 only added counters).
  - Round 1 and T036's final run passed with E2 at 77.00–84.90 ms, which leaves only ~15 ms of headroom on this first tone.
  - It still blocks: the gate is red on the current tree. Resolving it is the user's call:
    - (a) task a harness change that anchors each tone's onset on the audio clock after the fact, or plays a warm-up tone before the sweep. That is a change to an Article V test, so it needs the user's approval;
    - (b) investigate whether the phone shows a real cold-start stall on the first note after entry;
    - (c) re-measure on the phone (`APP_URL`) at acceptance.

### Warning (5)

- **W1 — Regression from T033: the head and trail are placed by the *current* target mode, not by the mode each reading was judged under. After ✕ or Auto, earlier trail points and a gap-held or lingering head are redrawn at the old pinned note.**
  - Where: `src/ui/TunerStave.tsx:128–135` (`headReadingOf(judged, targetNote)` switches on today's `snapshot.targetNote`), applied to every trail point at `:541` and to the stale head and cents at `:901`. `clearTarget` (`src/practice/domain/session.ts:1679–1685`) leaves the last pinned judgement as `snapshot.reading` until the next pitch.
  - What the artefacts require:
    - REQ-005: "a trail of the last 2.5 s of the head's movement" and "the offset in cents written above the head".
    - REQ-004/S5 is exactly this state: D5 pinned, 445 Hz, ✕.
  - What the code does, measured live:
    - D5 pinned, 445 Hz for 1.5 s: the trail y is 109.6 throughout (A4 +20).
    - After ✕, the same run's earlier points jump to y 99.5, the D5 position with the drift clamped at −50 ¢. The trail draws a step the head never made (`r2/trail-after-clear-crop.png`).
    - A4 pinned, C5 played, stopped, ✕ within 150 ms: the head moves from C5 (translateY 100.93, cents "+1") to A4 (107.5), and the strip cents read **"+301"** (`r2/linger-after-clear-crop.png`). This lasts through the 300 ms gap and the 0.8 s linger.
  - Before T033 the strip used `heard.*` for both modes and was self-consistent here.
  - No test changes the target while a trail or a held reading is present.

- **W2 — At 360×660, one of the reference viewports, the level's tag covers the "↓ flat · halfway to G♯4" label on auto from about −38 ¢ to −50 ¢, and overlaps the "↑ sharp" side's label by 6 px from +40 ¢.**
  - Where: `src/ui/TunerLevel.tsx:192–204`. The clamp margins are scaled by `ratio` (≈0.56 here), but the tag's own ~33 px height and the labels' positions are not.
  - What the artefacts require: REQ-002, the "halfway to <the note below>" label at the bottom. The 4a design at its fixed 536 px keeps them apart.
  - Measured live (`r2/flatlabel.mjs`):
    - 360×660, −40 ¢: tag 358–391 px against the label at 379–393 px. It overlaps and the label reads "halfw… 4" (`r2/flat--40-360x660.png`, `r2/tag-360x660-auto-54.png`).
    - 360×660, +40 ¢ and +45 ¢: tag top 67 px against the label bottom at 73 px.
    - 360×780 and 390×844: no overlap.
  - T034's own goal is met at all three viewports: `tag.top ≥ header.bottom` (36.5 px) for auto ±54 ¢, auto ±50/49 ¢, A4 pinned + C5 and A4 pinned + F4, with LISTENING fully visible (`r2/probe.mjs tag`).
  - The collision predates T034 (the pre-T034 `lineTop + 8` put the tag on the label too), but T034's clamp was meant to keep the tag inside the level at small heights and does not clear its labels.

- **W3 — During the linger, the "<note> IS" caption's name ("A4 IS") neither fades nor is hidden from assistive technology. It stays at opacity 1 and then snaps to "— IS" at 0.8 s, while "440.0 Hz" beneath it fades to 0.**
  - Where: `src/ui/TunerStave.tsx:978–988`. The label `<div>` gets no `headStaleAttrs`; only `reference-hz` does (`:990–1003`).
  - What the artefacts require: the amended REQ-003, "then fade it out over 0.2 s … the "HEARD" Hz and the "<note> IS" Hz caption", and "the lingering reading SHALL be hidden from assistive technology".
  - Measured live, 445 Hz then stop:
    - `heard-hz` and `reference-hz` turn grey together at t+376 ms. Their opacities are identical through the fade (0.42, 0.13, 0.017) and both clear at t+1179 ms. **Controller item 2: HEARD and the IS Hz go grey and vanish together; neither lags.**
    - The "A4 IS" label stays `opacity 1` and `aria-hidden` null throughout, until it becomes "— IS".
  - `tuner-linger.test.tsx` asserts only `reference-hz`.

- **W4 — Round-1 W1's Hold sub-item was neither fixed nor dispositioned. In the 50–56 ¢ hand-over band, Hold offers and pins a note the big name is not showing.**
  - Where: `src/ui/TargetSheet.tsx:233` (the Hold card's note) and `src/practice/domain/session.ts:1645` (`holdTarget` pins `heard.nearest`).
  - What was decided and briefed:
    - Round-1 W1 listed this explicitly ("Hold pins … A♯4 while the big name shows A4").
    - `decisions.md:176` says "fix W1".
    - T033's brief scoped W1 to the stave only, and `tasks.md` records no deferral.
  - What the code does: settled on A4 at 454 Hz, the level shows A4 +50 and the Hold card reads "Hold A♯4". Confirmed by code; the stave agreement itself is confirmed live, below.
  - REQ-004's "the note playing now" could be read as the raw nearest note. That is the user's ruling to make: task it, or accept it by name.

- **W5 — The rest of W7 is not accepted by the user by name, and the recorded reason is wrong for one colour.**
  - Where:
    - `changes/007-hear-me/tasks.md:1557,1630`: the narrowing, written by the controller.
    - `docs/decisions.md:176`, the user's own decision: "fix … W7 (11 hard-coded colours in the new screens)".
  - What the artefacts require: REVIEW › Thresholds, "every warning either tasked or accepted by the user by name"; Article I.
  - What the record says: the `## Deferred` entry calls `#e0d7c5`, `#756c60`, `#5e564c`, `#b0a797` and the rgba pair "pre-existing … present since 001–006".
    - `git grep` on `main` confirms this for four of them.
    - **`#b0a797` does not exist on `main`.** 007 introduced it in c0c7762 (T017) at `src/ui/TargetSheet.tsx:45`.
  - Needed: the user either accepts the narrowed W7 by name (with `#b0a797` correctly attributed) or tasks it.

### Info (6)
- **I1 — T036 (controller item 4).**
  - The diff (`tuner-timing-test.mjs:387–437, 655–717`) is sound. Each counter is incremented inside the same `if` that updates its maximum, and both counters must be non-zero for `passed`.
  - The report does paste one failing run: `no qualifying reading: cents err E2, F2 …`, sine row `Infinity`, load average ~19. The narrated second run has no table. That is a documentation gap only.
  - Nothing in the diff gives further reason for doubt. The failing run's E2 pattern (first tone after entry) matches C1.
- **I2 — Duplicated `noteSchema`.**
  - `note-judged.schema.ts:45–49` duplicates `target-advanced.schema.ts:9–13` within the same context's `published/`. AGENTS.md says extract rather than duplicate; the brief allowed "reused or duplicated".
  - The narrowed accidental enum means `noteJudgedSchema` refuses a valid double-sharp `Note`, although `satisfies z.ZodType<Note>` suggests the two are aligned. Nothing produces double sharps or flats today (notes.md:693).
- **I3 — `readingGeometry` is exported for tests** (`TunerLevel.tsx:165`). The four new `tuner-layout` tests assert on the function's output rather than the rendered view. They cite no scenario IDs, and REQ-004/S1's placement is asserted through the UI (`target-sheet.test.tsx:35`).
- **I4 — Style.** New comments narrate process history ("converge round 1 (W2)") rather than why (engineering §10). This is 1 of the 5-item style cap.
- **I5 — Round-1 info items I2–I5 and I7–I9 still stand as recorded, with no code change touching them.** Round-1 I1 (the test:timing flake) is accepted by name (`decisions.md:177`). This run of test:timing PASSES, 200 bpm `vs audible` 25.23 ms.
- **I6 — Live confirmation of T033 (controller item 1). The stave now agrees with the level in the hand-over band.** All captured with `r2/probe.mjs handover`:

  | Case | Level | Stave | Raw (snapshot) |
  |---|---|---|---|
  | E4 → 339.88 Hz (+53 ¢) | "E4", "+50 sharp" | head translateY 122.5 (E4's guide at 126, −50·0.07), no accidental, "+50" in warm `oklch(0.55 0.11 28)` | `heard` F4 −47 |
  | C5 → 539.83 Hz (+54 ¢) | C5 +50 | C5, "+50" warm | C♯5 −46 |
  | C5 → 507.18 Hz (−54 ¢) | C5 −50 | C5, "−50" cool `oklch(0.55 0.11 258)` | B4 +46 |
  | C5 → 540.76 Hz (+57 ¢, crossing) | C♯5 −43 | C♯5 with ♯, "−43" cool | — |

### Pass 4 — Bugs
C1 and W1–W4 above. I found nothing else in the diff.

### Pass 5 — Security
No new input surface, egress or secret. The schema is not parsed in production (by design, `note-judged.schema.ts:32–41`).

### Pass 6 — Scope
No code outside a requirement.

### Pass 7 — Hygiene
`pnpm check` exit 0. No `TODO`, `FIXME`, `.skip`, `.only` or `.todo` in `src/`, `tests/` or `scripts/`; the only `.skip(` matches are Rust iterator `skip`. No commented-out code in the diff.

### Pass 8 — Notes fold-back
The three new notes.md lines (682–699):
- T036's unpasted second run: local, no action (I1).
- T037's narrower accidental enum: local, or a plan note if `Note` ever gains double accidentals in the tuner (I2).
- T038's S2 proven by code equivalence: local. The S2 path is unchanged (`referenceNoteOf` falls back to `targetNote`), and the S6 test at `tuner-linger.test.tsx:166–171` asserts the post-linger "A4 IS 440.0 Hz" directly.

Carried from round 1, still open for finish:
- Plan amendments (T001, T003, T007, T021, T026, T028, coalescing).
- ADR 0006: the onset gate and the τ = 1 walk.
- docs/design.md: the §8 motion row and `paper.inkMid`.
- Two engineering refinements: the §6 port-event question, which W6's acceptance defers to `sdd-engineering`, and a `check-design.sh` scan of `.tsx`.

New refinement to propose (never applied here): the tuner harness should anchor each tone's onset on the audio clock rather than a `performance.now()` prediction (C1). This is a test-methodology note for engineering §7 and §11 ("the one real SLO … must be measurable").

### Commands

`./scripts/check-scenarios.sh --change changes/007-hear-me` (every line ✅; condensed):
```
listening.pitch-detection  ✅ REQ-001/S1 … REQ-006/S3 tested (20/20)
practice.tuner             ✅ REQ-001/S1 … REQ-009/S3 tested (46/46)
theory.temperament         ✅ REQ-001/S1 … REQ-002/S5 tested (8/8)
✅ scenario coverage complete
exit=0
```

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
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
All matched files use Prettier code style!
 Test Files  77 passed (77)
      Tests  345 passed (345)
   Duration  11.32s
running 14 tests   (listening)
test detector::tests::cost_of_one_analysis ... ignored
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.18s
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s   (sound)
```

`pnpm vitest run tests/practice/invariants`:
```
 Test Files  3 passed (3)
      Tests  4 passed (4)
```

`APP_URL=https://localhost:5173 pnpm test:tuner`:
- Run 1, 21:44, exit 1:
  ```
  sine E2–C7           57     133.30   61.31  13.35  92.86  0.09  0  FAIL
  flute-like E2–C7     57     67.70    61.31  10.69  92.86  0.65  1  PASS
  hand-over glissando  1      55.50    58.65  2.69   93.81  —     —  PASS
  silence / white noise                               0.00          PASS / PASS
    worst: first readout E2 133.30 ms · arrival age E2 61.31 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  ```
- Run 2, 21:47, load 1.10, nothing concurrent, exit 1:
  ```
  case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
  sine E2–C7           57     204.90                  63.98                 18.69               92.86           0.09           0              FAIL
  flute-like E2–C7     57     76.30                   66.65                 18.69               92.86           0.65           1              PASS
  hand-over glissando  1      56.70                   58.65                 2.69                93.81           —              —              PASS
  silence              —      —                       —                     —                   0.00            —              —              PASS
  white noise          —      —                       —                     —                   0.00            —              —              PASS
    worst: first readout E2 204.90 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
    worst: first readout D4 76.30 ms · arrival age D4 66.65 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
  test:tuner: FAIL — first readout exceeded 100 ms, … see the table above
   ELIFECYCLE  Command failed with exit code 1.
  ```
- Run 3, 21:56, load 1.06, nothing concurrent, exit 1:
  ```
  sine E2–C7           57     144.10                  63.98                 18.69               92.86           0.09           0              FAIL
  flute-like E2–C7     57     68.60                   61.31                 10.69               92.86           0.65           1              PASS
  hand-over glissando  1      61.20                   61.31                 10.69               93.81           —              —              PASS
  silence              —      —                       —                     —                   0.00            —              —              PASS
  white noise          —      —                       —                     —                   0.00            —              —              PASS
    worst: first readout E2 144.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  test:tuner: FAIL
  ```

`APP_URL=https://localhost:5173 pnpm test:timing` (exit 0):
```
measuring 3 tempos sequentially, 60 s each
pre-flight: AudioContexts constructed: 1 (expected 1) — PASS
bpm  onsets  max onset dev (ms)  drift (ms, |slope·span|)  highlights  vs audible (ms)  vs scheduled (ms)  status
40   82      0.00                0.00                      40          21.33            36.00              PASS
96   194     0.00                0.00                      94          22.67            54.67              PASS
200  402     0.00                0.00                      195         25.23            44.00              PASS
test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
```

Cold-start probes (`r2/first.mjs`, `r2/first2.mjs`; first tone per fresh browser):
```
fresh browser #1: E2 first readout 177.4 ms (pitch reached main thread 169.9 ms); 2nd E2 64.7 ms; 3rd E2 70.3 ms
fresh browser, A4 first: 71.3 ms; then E2 67.7 ms
affected cold start: first pitch arrival 120.9 ms, atFrame +61.3 ms, audio-clock age 8 ms, clock drift vs wall +51.6 ms, no long tasks
```

### Verdict
Not converged — 1 critical, 5 warning.

The controller's six checks:
1. **T033 is fixed live.** E4 → +53 ¢ and C5 → ±54 ¢ both agree (I6). It introduced W1.
2. **HEARD and IS Hz grey and fade together.** The "A4 IS" name does not (W3).
3. **The tag never covers the header** at 360×660, 360×780 and 390×844, sharp or flat, auto or pinned. It covers the bottom "halfway to" label at 360×660 (W2).
4. **Nothing further to doubt about T036** (I1).
5. **`src/practice/domain/` is untouched by T033–T039**, and never-both's exhaustive walk passes.
6. **test:timing PASSES; test:tuner FAILS 3 of 3** at the first tone (C1). The evidence points at the harness's onset anchoring, but the gate is red.

To reach Converged:
- Resolve C1: a harness task, or a phone measurement the user rules on. A critical cannot simply be accepted.
- Task or accept by name each of W1 (the new trail/head regression after ✕), W2, W3, W4 and W5.

<!-- recorded 2026-09-29T21:08:40Z by scripts/record.sh -->
