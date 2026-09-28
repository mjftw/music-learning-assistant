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
