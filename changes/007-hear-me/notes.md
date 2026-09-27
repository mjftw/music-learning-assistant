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
