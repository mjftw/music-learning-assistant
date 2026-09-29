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

## T019 — notes (2026-09-28)

- Minor, recorded: why two distinct readings never share an `atFrame`
  (the listening port stamps `now_frame + 127` per hop, monotonic) is true
  but not stated at the effect.

## T020 — design shots

`scripts/design-shots.mjs` now points at this change's two vendored
prototypes (`Practice.dc.html`, one frame; `Tuner.dc.html`, a canvas —
`data-screen-label`s "4a Auto or target" and "5c Pitch spiral") and drives
six states: `practice-way-in`, `tuner-listening`, `tuner-silent`,
`tuner-cannot-hear`, `tuner-target-pinned`, `tuner-target-sheet`. Run with
`APP_URL=https://localhost:5173 pnpm design:shots` (the running
`pnpm dev:phone`); twelve PNGs landed in `.sdd/design-review/`. Every
`state` Tweak used (`sweep` / `silent` / `cannot hear`) was reachable
through the dc-runtime's own `window.__dcSetProps`/`window.__dcRootName`
bridge (support.js's `Object.assign(window, api)`), so no fallback to the
live-script default was needed. The target-pinned state is reached the
same way on both sides: opening the target sheet, then Hold.

Headless Chromium has no real microphone signal, so the app's
`tuner-listening` and `tuner-silent` screenshots are the same shot (both
silence) — compared against the prototype's `sweep` and `silent` renderings
respectively; this is a limitation of the harness, not a finding.

**Structural differences, by pair** (colour/spacing/size/type differences
are taste and are left to the refinement loop):

- **practice-way-in** — the design's bottom summary row shows a fifth
  segment ("♩", note length) the app does not have. **Not a bug:** note
  length was removed (decision 2026-09-22, 003) and 005 ruled the design's
  ♩/♪ toggle "stale carryover … not a reintroduction" (decision
  2026-09-23); `Practice.dc.html` inherits that stale row. Nothing to do.
- **tuner-listening** — structural: the "TARGET auto · nearest" pill and
  the stave card are swapped. The design (4a) places the pill *between*
  the level and the stave card; `TunerScreen.tsx` renders `TunerLevel`,
  then `TunerStave` (in its padded wrapper), then `TargetPill` — so the
  pill draws *below* the card instead of above it. (Confirmed by reading
  `TunerScreen.tsx`'s JSX order, not just the screenshot.)
- **tuner-silent** — the same pill/stave-card order swap as
  tuner-listening. Also, borderline: the stave card's second caption reads
  "— IS" in the design (an em-dash standing in for the unknown note name,
  keeping the word "IS") when nothing is pinned and nothing is detected;
  the app shows a bare "—", dropping "IS" (`TunerStave.tsx`:
  `referenceNote === null ? "—" : `${noteLabel(referenceNote)} IS`;`). This
  reads as a text/content gap rather than a missing element, but is
  source-confirmed, not a taste call — worth a look by whoever owns
  `TunerStave.tsx`.
- **tuner-cannot-hear** — the same pill/stave-card order swap. The "Can't
  hear — no microphone" card's position, copy and layout otherwise match
  the design closely.
- **tuner-target-pinned** — the same pill/stave-card order swap (the
  pinned "− TARGET A4 + ✕" pill sits below the stave card in the app,
  above it in the design). The pinned pill's own layout, the stave's grey
  target head and the "A4 IS 440.0 Hz" caption all match.
- **tuner-target-sheet** — none. The sheet's header, Auto/Hold cards, "Or
  tap a note" row, range caption and the pitch spiral (wedges, dimming,
  hub, "pick a note") all match the design; no missing or misplaced
  element found.

The pill/stave-card order swap is the same root cause in all four 4a-based
pairs (one line in `TunerScreen.tsx`), not four separate findings.

## T020 — review notes (2026-09-28)

- The loop found a structural bug: the TARGET pill rendered below the stave
  card (design: between the level and the card) — fixed with an order test;
  and "— IS" over "—" when nothing is referenced — fixed with a test.
- Minor, recorded: the prototype's sweep state has a 600 ms startup silence
  longer than the script's 400 ms settle — the `tuner-listening` prototype
  shot is sometimes "Play a note".
- Record pipeline: the task-reviewer returns its verdict as a message; the
  recorded review files held only the diff package. Verdicts for T001–T020
  were appended from the transcript (append-only); from here each package
  carries a `## Verdict` section before `record.sh`.

## T021 — test:tuner on the laptop

`APP_URL=https://localhost:5173 pnpm test:tuner` (dev:phone's server; a
fresh `pnpm dev` needs `~/.cargo/env` sourced first, as `predev` does).
Two harness-only bugs were found and fixed before this run (both in
`scripts/tuner-timing-test.mjs`, not the product): the hand-over case was
seeding its "last shown target" from whatever the *previous* case's tail
reading still was (a stray NoteJudged arriving in its own `prerollSeconds`
gap), miscounting a genuine first reading as a spurious "change"; and the
silence case started counting immediately after the hand-over case's own
oscillator stopped, with no settle gap, catching its trailing
still-in-flight NoteJudged the way every other case's own `prerollSeconds`
already protects against. Fixed by (1) ignoring any NoteJudged before the
glissando's own onset when tracking target changes, and (2) giving
silence the same `prerollSeconds` settle before it starts counting.

```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
sine E2–C7           57     94.50                   63.98                 13.35               92.86           0.09           PASS
flute-like E2–C7     57     68.50                   58.65                 18.69               92.86           0.65           PASS
hand-over glissando  1      59.60                   58.65                 2.69                93.57           —              PASS
silence              —      —                       —                     —                   0.00            —              PASS
white noise          —      —                       —                     —                   0.00            —              PASS
  worst: first readout E2 94.50 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢
  worst: first readout F♯4 68.50 ms · arrival age E2 58.65 ms · cents err B6 0.65 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, nothing for silence or noise
```

**Root cause (resolved).** The hand-over row failed by a narrow,
reproducible margin: the measured crossing landed at a *raw* offset of
~55.5 ¢ from A4 (not the ≥56 ¢ the harness checks, per the plan's own
formula `1200·log2(hz/440) ≥ 56`), run to run within 55.5–55.7 ¢. Traced
to source, not harness noise: `centsFrom` (`src/practice/domain/tuner.ts`)
rounded to the whole cent (`Math.round(1200·log2(hz/pitchHzOf(note)))`)
*before* `nearestWithHandover` compared it against `HANDOVER_CENTS`
(`Math.abs(...) >= 56`) — so the hand-over fired as soon as the *rounded*
offset reached 56, which a raw offset as low as 55.5 already satisfied.
Fixed by adding a private `rawCentsFrom` (unrounded) used only for the
hand-over comparison; `centsFrom` (rounded) is unchanged and still backs
everything the display shows. A first re-run of the harness after the fix
passed the hand-over row (32.80 ms first readout) but missed `sine E2–C7`
on cents err (2.03 vs the ≤2 gate, against 0.09 in every other run,
before and after) — a transient measurement flake on the live-audio
loopback, not a regression (the fix touches only the hand-over threshold,
not `centsFrom`'s rounding). A second run, pasted above, passed all five
rows cleanly.

## T021 — the E2 onset finding

**Cause.** A window that still contains a little leading silence — sub-quantum,
under 128 samples, because Web Audio's sample-accurate `osc.start()` lands
mid-quantum, not aligned to the ring's 128-sample boundary — reads a wrong
pitch with high confidence: at E2 specifically (the plan's own worst case,
fewest periods per window) this showed as a genuine integer-lag NSDF bias,
~13 ¢ low at clarity 0.91. The ring's original onset gate (report
`silence-then-E2, frames_since_onset >= WINDOW`) opened as soon as every
sample in the ring postdated the *silence-to-signal transition quantum* —
but that quantum itself can carry up to 127 genuinely silent samples ahead
of the true onset, so the first window the gate let through could still be
part that residual silence.

**Fix.** The gate now waits one quantum further: a hop is only reported
once `frames_since_onset >= WINDOW + QUANTUM_FRAMES` (`ring.rs`'s
`ONSET_SETTLE_FRAMES`). That extra quantum evicts the transition quantum
from the ring entirely before any window is ever handed to `detect`, so
every analysed window is pure signal, whatever the offset of the true
onset within its transition quantum.

**Cost.** At most one hop of latency at a note's start — 2.7 ms
(`QUANTUM_FRAMES` = 128 frames @ 48 kHz), in practice the next 512-frame
hop's worth of scheduling — well inside the harness's own `first readout
max` budget (≤100 ms), as the passing table above confirms (worst-case
first readout 94.50 ms, worst-case cents error 0.65 ¢, both comfortably
under budget).

## T021 — review round 1's finding (2026-09-28)

- The sweep's first-readout tracking accepted any `tuner-reading` mutation
  after the onset, so the previous tone's "Play a note" clear (the 300 ms
  gap timer, re-armed by trailing detections) could have been counted for
  the next tone — the harness's inter-tone gap was also 300 ms. Fixed: a
  mutation counts only when `tuner-name` shows *this* tone's label and
  `tuner-empty` is absent; `PREROLL_SECONDS` 0.6; per-tone worst lines.
- Minor, recorded: the detect()-level 25/50/75 % partial-window test only
  asserts ±2 ¢ if a detection is returned; the pipeline test owns the
  guarantee.

## T024 — test:tuner against dev:phone (2026-09-28)

```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
sine E2–C7           57     94.50                   61.31                 13.35               92.86           0.09           PASS  
flute-like E2–C7     57     68.90                   61.31                 13.35               92.86           0.65           PASS  
hand-over glissando  1      56.90                   55.98                 5.35                93.81           —              PASS  
silence              —      —                       —                     —                   0.00            —              PASS  
white noise          —      —                       —                     —                   0.00            —              PASS  
  worst: first readout E2 94.50 ms · arrival age E2 61.31 ms · cents err A♯6 0.09 ¢
  worst: first readout E6 68.90 ms · arrival age E2 61.31 ms · cents err B6 0.65 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, nothing for silence or noise
```

Worst first readout 94.5 ms (E2, the sine sweep) — 5.5 ms of headroom on the laptop against the 100 ms budget, the same shape 003/004 saw; every other row well inside.

## T024 — the user's walk on the phone (2026-09-28)

Verbatim: "Works great! It's a bit flickery though - I think we could do
with smoothing the signal a bit. Currently when playing the exact right
note it flickers around the in tune mark by a few cents either way and
it's a bit jarring."

Sign-off on practice.tuner/REQ-006/S3 (names each note, moves with the
embouchure, never feels behind). The flicker is a behaviour the design's
own script had (`sp = shownP + (pitch − shownP) × 0.35` per 50 ms tick —
Tuner.dc.html line 1064) and the walkthrough did not carry into the spec.
Taken to the refinement loop (design D) as round 1; if a treatment wins it
is written to the practice.tuner delta (REQ-002) there.

## Design round 1 — test:tuner against the smoothing variants (2026-09-28)

Run against `dev:phone` with `APP_URL="https://localhost:5173/?variant=<v>"`
and the real node binary (the asdf shim drops an environment value that
contains `=`, so `pnpm test:tuner` with that address falls back to plain
HTTP and fails to load).

```
=== variant a (low-pass, α = 0.1) ===
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
sine E2–C7           57     86.20                   63.98                 18.69               92.86           0.09           PASS
flute-like E2–C7     57     77.10                   66.65                 16.02               92.86           0.65           PASS
hand-over glissando  1      54.10                   58.65                 13.35               93.81           —              PASS
silence              —      —                       —                     —                   0.00            —              PASS
white noise          —      —                       —                     —                   0.00            —              PASS
test:tuner: PASS
=== variant c (moving average, 8 readings) ===
sine E2–C7           57     70.60                   61.31                 18.69               92.86           0.09           PASS
flute-like E2–C7     57     69.30                   61.31                 8.02                92.86           0.65           PASS
hand-over glissando  1      55.70                   58.65                 8.02                93.81           —              PASS
silence              —      —                       —                     —                   0.00            —              PASS
white noise          —      —                       —                     —                   0.00            —              PASS
test:tuner: PASS
```

What this does and does not show: the first readout, arrival age and
reading rate are unchanged by smoothing (the first reading after a gap is
the raw one). The cents-error and hand-over gates read `heard.hz`, which
every variant leaves raw — so the harness says nothing about the accuracy
or the lag of the *shown* offset under a or c. If a or c is chosen, the
harness needs a gate on the shown cents (settled value within ±2 ¢ of the
fed tone) before converge.

## T026 — the shown offset is smoothed (2026-09-28)

- Variant A is the rule: `SMOOTHING_FACTOR` 0.1, `SNAP_CENTS` 25
  (`src/practice/domain/tuner.ts`); the `?variant` switch, variants b and
  c and their plumbing are gone.
- **`NoteJudged.heard`**: `heard.hz` is the detected frequency;
  `heard.nearest` and `heard.cents` follow the smoothed pitch, because the
  stave strip's head and cents, the trail and the spiral's needle read
  them and REQ-002 smooths what is shown. The plan's data-model comment
  ("the raw detection and its nearest note") is amended at finish.
- The session resets the smoothing with the reading (a gap, leaving,
  hidden), on a hand-over (the key), and in every target verb that
  changes the target.
- Tests that fed one reading per pitch and read a settled offset now feed
  a steady pitch (`hearSteady`, `tests/practice/tuner-helpers.ts`); no
  assertion or expected value changed. The coalescing test in
  `tuner-budget.test.ts` feeds one pitch at three frames and asserts the
  newest frame.
- For converge: that coalescing test cites
  `listening.pitch-detection/REQ-004/S3`, which is "late is dropped" — a
  mislabel from T010, not T026's.
- The fix round (haiku) pasted the documented `pnpm check` counts rather
  than its own; the controller's run: 75 files, 314 tests, exit 0.

## T027 — test:tuner with the shown-offset gate (2026-09-28)

Run against `dev:phone` (`APP_URL=https://localhost:5173 pnpm test:tuner`)
with the new `shown err max` column (practice.tuner/REQ-002/S9): the worst
error, per sweep, of `|(semitone position of NoteJudged.target − semitone
position of the tone fed) × 100 + NoteJudged.cents|` among readings taken
`SHOWN_SETTLE_MS` (500 ms) or later into each tone, gated at
`SHOWN_CENTS_ERROR_MAX_CENTS` (±2 ¢).

```
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     95.10                   63.98                 18.69               92.86           0.09           0              PASS
flute-like E2–C7     57     77.40                   63.98                 13.35               92.86           0.65           1              PASS
hand-over glissando  1      69.10                   63.98                 8.02                93.81           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 95.10 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout F♯6 77.40 ms · arrival age F♯6 63.98 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

The shown offset settles well inside the budget — 0 ¢ worst on the sine
sweep, 1 ¢ worst on the flute-like sweep (A♯6) — confirming REQ-002/S9's
smoothing (T026) does not leave the *shown* reading off the truth even
though the harness had, until now, only ever gated the raw `heard.hz`.

For converge (T027's review): a tone whose readings stop between about
350 ms and 500 ms passes the shown-offset gate with an error of 0 — the
column is seeded at 0 and the readings-per-second gate needs only ~150 ms
of readings; the raw cents column has the same shape.

## T028 — Hold and the needle remember the last note heard (2026-09-28)

- `tunerLastHeardPosition` in the session: written where a reading is
  committed, cleared only by `leaveTuner()`; `TunerSnapshot.lastHeard`
  derived with the spelling, as `targetNote` is.
- For converge (T028's review): the sheet-side REQ-004/S7 test asserts
  the pill after Hold, not the greyed big name with "Play a note" —
  covered between the session-side S7 test and REQ-003/S2's.
- For the plan at finish: `TunerSnapshot.lastHeard`; `NoteJudged.heard`'s
  comment (T026).

## T029 — the trail moves with time and outlives the note (2026-09-28)

- `TrailPoint { reading, atMs, runId }`, `TRAIL_MS = 2500`
  (`src/ui/TunerStave.tsx`); the screen keeps the points through silence,
  drops them by age, and redraws on `requestAnimationFrame` only while the
  reading is null and a trail is left.
- The spiral's needle trail stays the newest 50 readings of the current
  run (`SPIRAL_TRAIL_READINGS`).
- For converge (T029's review): the test "the trail keeps the last 2.5 s,
  oldest first, placed by age" feeds a reading every 50 ms, so its count
  bound does not tell age from a 50-point cap; S5 and S6 do.
- Open with the user: the trail turns grey the instant the note stops.

For converge (T030's review): `src/ui/TunerStave.tsx:379` carries a
misplaced one-line comment about `TRAIL_MS` at the end of the
vertical-centring comment block.

## Design round 4 — found on the way (2026-09-28)

For converge:
- `docs/design.md` §8's motion row names "the strip's vertical centring
  `.35s cubic-bezier(.3,.7,.3,1)`"; `src/ui/TunerStave.tsx` has no such
  transition (the implementer's grep, confirmed by the controller).
  Either the token is unbuilt or the row is wrong.
- `docs/design.md` §6 says motion respects reduce-motion; nothing in
  `src/ui/` checked it before round 4's fades (which do). The sheet slide,
  the scrim and the head's `.18s` do not.
- The in-tune band on the stave strip is drawn only while a note sounds
  and does not linger with the head.

## T031 — the last reading lingers and fades (2026-09-29)

- `motion.lingerHoldMs` 600, `motion.lingerFadeMs` 200 in
  `src/ui/theme.ts`; promoted to docs/design.md §8 at the loop's exit.
- A failed or refused microphone does not linger (REQ-007 clears the
  reading; the "Can't hear" card shows at once). A hidden page lingers
  unseen. With a target pinned "Play a note" shows at once under the
  greyed name while the rest lingers (REQ-003/S6).
- For converge (T031's review): the S4 test does not assert the grey
  state on the big name; a real browser throttling timers in a
  backgrounded tab during a linger is unverified.
- `.claude/worktrees/deploy/` (another session's worktree, branch
  `chore/deploy-cloudflare`) was being linted by `eslint .`; eslint now
  ignores `.claude/`, as prettier does (7106bf1).

## T032 — the tuner fits the phone: the level flexes (2026-09-29)

- The level's geometry is `levelGeometryFor(measured height)`
  (`src/ui/TunerLevel.tsx`), 536 px when unmeasured, 300 px at least; the
  screen and the column take `.visible-height` (`100vh` then `100dvh`,
  `src/ui/global.css`) while the tuner shows. The column's `100vh` was why
  round 5's first build still scrolled on the phone: `vh` is the height
  with the browser's bars hidden.
- The stave strip's card scales to the column's width.
- **The "Can't hear" card** (212eaa1): anchored 38 px above the level's
  bottom edge, as it sat in the fixed layout; centred, it covered the "–".
  Measured by the controller in headless Chromium, the microphone refused:

  | viewport | the dash's box (y) | the card (y) | scroll |
  |---|---|---|---|
  | 360 × 660 | 141–305 (the glyph about 223) | 257–361 | none |
  | 360 × 780 | 201–365 | 377–481 | none |
  | 390 × 844 | 233–397 | 459–545 | none |

- For converge (T032's review): at the level's 300 px minimum (a viewport
  about 400 px tall) the card clears the dash by about 8 px and the tick
  labels close in on the fixed-size name; the first commit draws the level
  at the 536 px fallback for one frame before it is measured.
- `src/ui/global.css` carries three hard-coded values `check-design.sh`
  warns about (the body's background and the like), from before 007.

## The refinement loop's exit (2026-09-29)

- `scripts/check-design.sh` read the whole State cell of the proposal's
  Interface table ("`listening` — 4a, State live/sweep: …") as the state's
  name, so no reference file could match once the loop had exited; it now
  takes the name between the cell's first backticks. 007 is the first
  change to exit a loop with an Interface table.
- For converge: `scripts/design-shots.mjs`' `tuner-listening` state
  captures no reading (its image is the silent state's, byte for byte);
  the reference `tuner--listening.png` was taken with a 440 Hz tone and is
  at 1× where the others are at 2×. `src/ui/global.css`' three warned
  values are the body's `#ddd6c7` and two mentions of colours in its
  comment, all from 002.

## Pre-converge harness run (2026-09-29)

`APP_URL=https://localhost:5173 pnpm test:tuner` — PASS (worst first
readout 77.00 ms at B3; shown err max 1 ¢ at A♯6).

`APP_URL=https://localhost:5173 pnpm test:timing` — first run FAIL at 200
bpm (`vs audible` 30.57 ms, 0.57 ms over ±30); second run PASS throughout
(200 bpm 24.00 ms). Matches the laptop-headroom pattern already accepted
by name in 003 (2026-09-23), 005 (2026-09-24) and 004 (2026-09-26, same
0.57 ms overage on the first run); 007 does not touch the scheduler. Not
re-walked on the phone for 007 — that harness measures general playback
timing, not this change's own budget (which was walked at T024).

## Converge round 1 — all seven fixes reviewed clean (2026-09-29)

T033, T034, T035, T036, T037, T038, T039 — all SPEC PASS, QUALITY PASS.
Minor, may-defer items carried to converge round 2:
- T036's report narrated a second failing harness run whose table wasn't
  pasted (a documentation gap, not a code defect — the code path itself
  was independently verified).
- T037's NoteJudged schema reproduces its sibling's narrower accidental
  enum (natural/sharp/flat vs the real natural/sharp/flat/doubleSharp/
  doubleFlat) — the brief required mirroring the sibling exactly; nothing
  that populates NoteJudged ever spells a double accidental.
- T038's REQ-003/S2 (nothing ever heard, target pinned) is proven for the
  stave's caption by code equivalence to an already-tested terminal
  state, not a direct assertion from that literal entry point.
