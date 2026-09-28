---
type: Implementation Notes
title: 007-hear-me — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/007-hear-me/notes.md
status: draft
tags: [sdd, notes, "change:007-hear-me"]
sdd_id: 007-hear-me
---

# Notes — 007-hear-me

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.


## Design check — hard-coded values outside the tokens file (2026-09-28)

`scripts/check-design.sh` warns that `src/ui/global.css` carries three
hard-coded values. They are justified, not promoted: the page background
outside the app column (`#ddd6c7`, the design's `body` background — CSS
cannot read `theme.ts`, and it is the one colour that is not part of a
screen), `-webkit-tap-highlight-color: transparent`, and `font: inherit`
on `button`. Nothing under `src/ui/*.tsx` is checked by the glob; those
read `theme.ts` by construction.


## T001 — cost of one analysis

`cargo test -p listening --release -- --ignored --nocapture
cost_of_one_analysis` (1000 calls to `detect` on a synthesised flute-like
tone at 440 Hz, 2048-sample window): **631.87 µs per analysis** on the
laptop. Well under the 10 ms budget for one hop (`HOP = 512` frames,
10.7 ms @ 48 kHz) — the phone, not the laptop, decides whether the margin
holds in practice.

## T001 — notes from implementation and review (2026-09-28)

- Plan wording (Article IX, for the finish): the NSDF *walk* starts at
  τ = 1 to find the true first positive-going zero crossing; only the
  *candidate* key maxima are restricted to τ ≥ lag_min. Read literally, the
  plan's "over lags [ceil(sr/MAX_HZ), floor(sr/MIN_HZ)]" as the search
  range gave an octave error on a low pure sine (E2 read as ~2134 Hz); only
  REQ-002/S5's sweep caught it — S5 is load-bearing.
- Three review rounds: round 1 found two `Vec`s on the audio path; round 2
  found the fixed array's bound justified wrongly and unguarded; round 3
  clean. `MAX_MAXIMA = NSDF_CAPACITY / 2` (floor(767/2) = 383 < 384) with
  an assert before every write.
- Minor, recorded: `lib.rs` already re-exports the detector's public items
  (needed by T002's ABI anyway).

## T002 — notes (2026-09-28)

- Minor, recorded: `#[allow(clippy::chunks_exact_to_as_chunks)]` scoped to
  the test helper `feed` (clippy 1.98 lint) to keep the brief's test code
  verbatim; function-level, justified in a comment.

## T003 — notes (2026-09-28)

- To confirm at T014's real-browser check: the listening `AudioWorkletNode`
  is created with `numberOfOutputs: 0` and is not connected to
  `context.destination`. If LISTENING shows but no reading ever arrives,
  the first fix is `numberOfOutputs: 1`, silence written, connected to the
  destination.
- Plan sketch vs brief: `ListeningEnded` carries `detail: string` (the
  brief's Interfaces block; the plan's data-model sketch lacked it) — fold
  into the plan at finish.
- The jsdom test stubs `WebAssembly.compileStreaming` so that it consumes
  the rejected `fetch` promise (root-relative `?url` paths do not resolve
  under Node); production code is unchanged and mirrors `sound`.
- Untested by scenario (recorded): the `invalid-pitch-report` problem path.

## T004 — notes (2026-09-28)

- Spec correction (decisions.md): REQ-002/S4's example 452.89 → 452.90 Hz.
- `nearestNoteOf` normalises `-0` to `0` (`Math.round(...) + 0`), commented.
- Minor, recorded: the `hz > 0` guard's comment refers to the listening
  schema by name from theory's domain code — a forward reference in prose
  only.

## T005 — notes (2026-09-28)

- Ripple beyond the brief's Files list (AGENTS.md rule): `src/ui/main.tsx`
  (a temporary `webAudioListening(() => new AudioContext())`, replaced by
  the shared memoised factory at T014), `tests/practice/invariants/
  target-in-sequence.test.ts` and `tests/ui/scenarios/edge-cases.test.tsx`
  (hand-built `SessionDeps` gained a `FakeListening`).
- `webAudioListening.start()` calls `listener.start()` every time and
  memoises only `createListener` — REQ-006/S3's "each later request tries
  again"; a `resume()` failure maps to reason `"failed"` (no dedicated
  no-audio-context reason in `ListeningUnavailable`).

## T006 — notes (2026-09-28)

- Minor, recorded: `centsFrom` in `practice/domain/tuner.ts` inlines the
  same one-line cents formula as theory's `nearestNoteOf` (theory exposes
  no arbitrary-note-to-cents primitive; candidate for one if it recurs).
- Deliberate, recorded for the finish: the `NoteJudged` interface lives in
  `practice/published/note-judged.schema.ts` (the brief's placement), where
  the sibling `TargetAdvanced` interface lives in `domain/session.ts` with
  a Zod mirror in `published/`.
- `judge` while pinned returns `shown` = the nearest note's position so the
  hand-over state is warm for a later `clearTarget` (commented; exercised
  at T009).

## T007 — notes (2026-09-28)

- Round 1 found a real race (critical): `leaveTuner()` during `enterTuner()`'s
  pending `wakeLock.acquire()` left the microphone open, because the
  generation check ran only after `listening.start()` — the mic-opening
  call — unlike `startDrone()` where the committing call comes after the
  check. Fixed with a two-sided check (before `start()`, and `stop()` when
  stale after it), covered by the added "leaving before the microphone was
  granted still releases it" test under REQ-001/S4.
- Fixture ripples: the brief's test used `sound.posted[i].command`; the
  fake's frame-paired array is `sound.posts` — the test uses that.
  `sessionOn` gained default traversal/settings and returns `context`;
  `SessionContext.spelling` rippled `spelling: "sharp"` into seven test
  files and both `App.tsx` context objects.
- Minor, recorded: the race test cites REQ-001/S4 though it is a regression
  scenario, not the spec's literal S4 text.

## T008 — notes (2026-09-28)

- The first attempt set the gap constant to 301 ms to fit the test's clock
  arithmetic; corrected to the spec's 300 ms with the test measured from
  the detection (the `hear()` helper spends 1 ms on the commit tick, so
  REQ-003/S3 advances 298 then 1). Rule for later tasks: a fixture timing
  quirk is fixed in the test, never in a spec number.
- The implementer committed 6d0550e itself (the brief said not to); the fix
  is a separate commit on top.

## T009 — notes (2026-09-28)

- Three review rounds. Round 1 (critical): a spelling change did not re-spell
  a pinned `targetNote` (REQ-002/S5, REQ-009/S1) — covered by the added test
  "a spelling change re-spells the pinned target". Round 2 (important): the
  note was denormalised state re-synced in three places — now derived in
  `buildSnapshot()`; `snapshotsMateriallyEqual` compares `target` and
  `targetNote` by value. Round 3 clean.
- Minor, recorded: `sameNote` compares fields where the file already uses
  `noteLabel(a) === noteLabel(b)` for the drone's note — two equality idioms
  in one function.
- The target verbs do not gate on `tuner.active`; unreachable from the UI
  outside the tuner screen.
- REQ-003/S2 was un-todoed with an equivalent test (pin, hear, gap) rather
  than T008's literal hold-based one.

## T010 — notes (2026-09-28)

- A dropped (late) detection re-arms neither the commit tick nor the gap
  timer: a sustained stall reads as silence ("Play a note") after 300 ms
  rather than a stale reading — Article V's "silence beats late feedback";
  no scenario pins the sustained-stall case; recorded for converge.
- Minor, recorded: the report's justification for dropping an unused test
  helper cited a note the brief did not contain; the outcome (no dead code,
  tests verbatim) is right.

## T011 — notes (2026-09-28)

- Minor, recorded: `tunerReading = null; tunerShownPosition = null;` now
  appears in three places (gap timer, `leaveTuner`, `onEnded`) — a
  `clearTunerReading()` extraction is a candidate for T012 or hardening.
- The `onEnded` guard when the tuner is not active is untested (the brief
  asked for no scenario); the wake lock stays held in `cannot-hear` (the
  tuner is still showing).

## T012 — notes (2026-09-28)

- Spec reading settled during the task (no delta change): hidden/shown moves
  the tuner only between `listening`/`starting` and `off`; a `cannot-hear`
  state survives a hide, so a show never re-asks for the microphone
  (REQ-007 "nowhere but on entering the tuner"). Covered by the added test
  "a hide while the microphone cannot be used does not ask for it again on
  show" under REQ-008.
- The wake lock is held across hide/show while the tuner is active (never
  released on hide); commented in the shown handler.
- Extractions: `clearTunerReading()` (four sites) and `startListening(
  generation)` shared by `enterTuner` and the shown handler.

## T013 — notes (2026-09-28)

- Round 1's enumeration omitted `tapNote`, hiding two REQ-001 violations
  (a sounding tap not ended by `enterTuner`; a first-ever tap's pending
  `sound.start()` posting after entry) and, once added, a third (a second
  pending tap orphaning the first). Fixed: `enterTuner` ends the tap and
  bumps a new `tapGeneration`; `tapNote`'s continuation checks it. Nine
  verbs, 7380 sequences, ~1.5 s.
- The drone invariant's `sequenceIntervals` now exempts tapped tones
  (`practice.drone/REQ-004`: the one thing that sounds over the drone).
- **For converge (pre-existing, practice.session):** a pending first-ever
  tap racing ▶ or ❚❚ is not superseded — `start()`/`stop()` do not bump
  `tapGeneration`; REQ-013 covers a new tap while playing, not a pending
  tap's late post. Outside 007's requirements; reported, not fixed here.
- Minor, recorded: the test duplicates `TAP_TAG_BASE = 2_000_000` (private
  to session.ts; the session-tap test does the same). A stale "(500 ms)"
  comment gloss corrected to 80 ms by the controller (trivial).

## T014 — the phone's track settings

Pending the user's phone check.

## T014 — notes (2026-09-28)

- Real-browser check (headless Chromium, `--use-fake-ui-for-media-stream`,
  the real worklet): clicking Tuner logs `listening: track settings
  {autoGainControl: false, channelCount: 2, deviceId: default,
  echoCancellation: false, groupId: …}` to the console, and no
  `PitchDetected`-related error appears — T003's "first fix if LISTENING
  shows but no reading ever arrives" note is not needed yet.
- Ripple beyond the brief's Files list (AGENTS.md rule): `tests/ui/
  scenarios/circle-interaction.test.tsx`'s Tab-order test — the new Tuner
  pill adds a tab stop before the circle, so its comment/tab count moved
  from three tabs to four.
- The brief's verbatim RED test code uses jest-dom matchers
  (`toHaveTextContent`, `toBeInTheDocument`) that are not installed/
  configured in this repo (no `@testing-library/jest-dom` dependency, no
  vitest `setupFiles`) — confirmed by grep and by running the literal
  code (`Invalid Chai property: toHaveTextContent`). Adapted to the
  convention every other UI scenario test already uses instead
  (`.textContent`/`toBeTruthy()` — see app-drone.test.tsx, app-session.
  test.tsx); the scenario IDs, structure and assertions are otherwise
  unchanged.

## T014 — review notes (2026-09-28)

- Structural screenshots produced with the repo's Node Playwright
  (`.sdd/design/007-hear-me/live/`) — Playwright for Python is not
  installed, so `design_snapshot.py` is unavailable on this machine.
- Headless Chromium with the real worklet: the mic was granted, `listening:
  track settings` logged (echoCancellation/noiseSuppression/autoGainControl
  all false), no errors.
- Minor, recorded: `isListening()`'s comment says the `off` state never
  reaches the render; it can, for one microtask at entry (harmless).
- No jest-dom in this repo: the briefs' `toHaveTextContent`/
  `toBeInTheDocument` are adapted to `.textContent`/`toBeTruthy()` in every
  UI task from here.

## T015 — notes (2026-09-28)

- The beyond-±50 / pinned form ("▲ N st", `playing <note>`, the greyed
  name in silence) is built from the spec prose here and first exercised
  by T017's tests.
- Reviewer's aside: the report attributed `pitchClassLabel`'s use to a
  brief section that lives in the controller's dispatch, not the brief —
  the choice itself is necessary (the name and octave render separately).

## T016 — notes (2026-09-28)

- Ripple bug found and fixed: `App.tsx`'s `setContext` effect lacked
  `selection.spelling` in its dependency array (from T007's ripple), so a
  spelling-only toggle on C major never reached the session.
- Round 1 found the design's two-tier low-register rule collapsed into one
  threshold (E3 written wrongly) — reproduced exactly (`REGISTER_*` 49/24
  from the reference note; the heard head's own `WRAP_*` loop 49/23), with
  an added E3 test; and copy-pasted helpers — `formatCents` now lives in
  `src/ui/cents-label.ts`, the accidental glyph map in `key-label.ts`
  beside `diatonicIndex`, and `#4a4136` is promoted to `paper.inkMid`
  (used in TunerStave, StaveView, Header; six other files still carry the
  literal — a hardening candidate for design.md §8).
- The trail applies the current reading's register shift uniformly, as the
  design's `p.tot` does.

## T017 — notes (2026-09-28)

- **For the refinement loop (design §5):** the spiral's innermost ring
  wedges are ~25 px on the flute (dr ≈ 24.7), under a fingertip; the
  geometry is the design's own — the user decides on the live build.
- Round 1 found two duplications (the published E2/C7 constants copied;
  the trail block re-implemented in the sheet) — fixed: imported, and the
  trail passed as a prop from `TunerScreen`.
- `TargetSheet` gates its content on `open` (siblings rely on display:none)
  because the brief's S1 assertion uses `queryByText`; commented. Its ✕ is
  labelled "Close" where siblings say "Close <x> sheet".
- The design's `spSep` separator spiral is dead code in the design's own
  markup — not drawn. Hover state not built (Article VIII).
- Minor, recorded: the FIFTHS hue formula re-derived in `PitchSpiral`
  (`CircleOfFifths.wedgeHue` is position-indexed); terse `pol`/`f1` names;
  the hub circle radius 35.5 vs the design's 34.
- Ripple: `TunerLevel` gained `roundPx` (a float artefact at the ±50 edge).

## T018 — notes (2026-09-28)

- The tuner's ♯/♭ buttons carry the circle's own accessible names ("sharp"
  / "flat"), not the brief's "Sharp spelling" / "Flat spelling".
- Minor, recorded (token candidates for design.md §8 at hardening): the
  segmented-control border `#e0d7c5` and inactive ink `#756c60` are hex
  literals shared with `CircleOfFifths.tsx`; the ♯/♭ toggle markup is
  duplicated between the circle and the tuner footer — a `SpellingToggle`
  extraction would touch `CircleOfFifths.tsx`.
- Ripple: `TunerLevel` shows "–" (`paper.drawerBorder`) while cannot-hear.
