---
type: Change Proposal
title: Hear me — a tuner that proves listening
description: A tuner screen hears the instrument and shows the nearest note and how far sharp or flat, within 100 ms, with an optional pinned target — the listening context's first capability, measured against Article V.
resource: /changes/007-hear-me/proposal.md
status: stable
tags: [sdd, proposal, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/intent.md
  - resource: /changes/007-hear-me/design/rounds.md
  - resource: /docs/product.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T23:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T22:05:29Z
sdd_id: 007-hear-me
sdd_context: listening
sdd_phase: approved
sdd_constitution: 1.0.0
---

# Proposal: Hear me

> **WHAT and WHY only.** No library names, no schema, no file paths. The
> requirements themselves are in `delta/`; this document says why the change
> exists, what it touches, and what is out of scope.

## Problem

Pitch is checked by ear alone today; there is no way to verify it. The
product's riskiest unknown — whether the tool can hear the note being played
and say so fast enough to be useful ("if feedback arrives slightly too late
it completely throws off the practice") — has nothing built at the
microphone boundary, and learner-leads (008) cannot start until it has.

## Outcome

A **Tuner** pill in the practice screen's header opens a tuner screen:
playback and the drone stop, the microphone is asked for, and as the learner
plays, the screen names the nearest note with its octave, draws how far
sharp or flat it is on a ±50 ¢ level with a ±5 ¢ in-tune band, and writes
the heard note on a small stave with the offset in cents above it — every
readout within 100 ms of the sound, for any note from E2 to C7, within ±2 ¢
on a steady tone, measured. A target can be pinned (Hold what is playing, or
a note picked from a pitch spiral) so everything is measured from it
instead; it is forgotten on leaving. Silence shows "Play a note"; a refused
or missing microphone shows "Can't hear" without interrupting anything;
‹ Practice returns to the practice screen idle and silent. Nothing sounds
while the tuner listens, nothing is stored, and the tool never opens on it.

## Users and context

| Actor | Needs to be able to | Cares most about |
|---|---|---|
| The learner (the user), phone on the stand, flute in hand | Enter the tuner, play long tones, see the note and how far off, leave | The reading never feels behind the breath; the name does not flicker; nothing to tap mid-note |
| The same learner, tuning a string instrument later | Pin a target and see the distance to it, even semitones away | The reading is measured from the note wanted, not the note nearest |

## Scope

**In scope**
- `listening.pitch-detection` (new): the microphone opened only on request
  and released on demand; a detected pitch (frequency, confidence, time)
  published while a pitch is heard, at least every 50 ms, never late;
  nothing published for silence, breath or noise; E2–C7 within ±2 ¢ on a
  steady sine and a harmonic-rich flute-like tone; capture stops while the
  page is hidden; a refused, absent or failing microphone is reported, not
  thrown.
- `practice.tuner` (new): the way in and out (the Tuner pill; ‹ Practice);
  the reading — nearest note + octave spelled per the global preference, the
  offset to the whole cent, in tune within ±5 ¢, sharp/flat beyond; hand-over
  hysteresis; the level with "halfway to" neighbours; the stave strip with a
  drifting whole-note head, cents, trail, 8va/8vb; HEARD / "<note> IS" Hz;
  the target (Auto · nearest, Hold, the pitch spiral, −/+ a semitone, ✕,
  semitone counts beyond ±50 ¢, forgotten on leaving); the 100 ms budget,
  measured; "Play a note"; "Can't hear"; LISTENING / NO MIC; hidden → stop,
  visible → resume; screen awake; nothing stored; nothing sounds while the
  tuner listens.
- `theory.temperament` (+1): the nearest note to a frequency and the offset
  in cents — the inverse of REQ-001.
- The **design** (`design/Practice.dc.html`, `design/Tuner.dc.html` 4a + 5c)
  is the source of truth for both screens.

**Explicitly out of scope** <!-- the most valuable section in this document -->
- The mode switch, show-the-note, its optional brief sounding,
  hold-to-advance and the lenient/medium/accurate tolerance setting —
  learner-leads (008).
- A reference-pitch setting (A4 = 440 Hz stays fixed) and temperament choice
  (009).
- An in-tune band setting: the band is ±5 ¢, fixed (the design's ±3/±10 are
  exploration knobs).
- Hz in the big readout (the design's showHz knob); Hz appear in the stave
  strip only.
- Transposing instruments and other clefs: every catalogued variant is
  treble (2026-09-19); the design's guitar treble-8 and cello bass rows are
  knobs until such an instrument is catalogued. The 8va/8vb rule stays.
- A reference tone from the tuner (the drone lives on the practice screen);
  pitch history beyond the strip's 2.5 s trail; a graph; calibration.
- Any change to the circle, the scale catalogue, the transport, the drone's
  own behaviour, or stored state. Practice.dc.html's "Note length" row is
  the stale carryover 005 ruled on, and its drone pill a stand-in.
- Tablet or laptop layouts (design §2, later).

## Relationship to other slices

| | Slice | How |
|---|---|---|
| Depends on | 003 hear-the-scale, 004 the-drone | The exclusion: entering the tuner stops playback (`practice.session/REQ-002`'s ❚❚) and the drone (`practice.drone/REQ-001`'s ■); the notice pattern (`practice.session/REQ-010`); hidden/awake (`REQ-009`, `practice.drone/REQ-007`); the spelling preference (`theory.circle-of-fifths/REQ-002`); pitches (`theory.temperament/REQ-001`) |
| Affects | 008 learner-leads | Builds on `listening.pitch-detection` and the judgement rules here (band, hysteresis, semitone counts); adds the target from the sequence |
| Affects | 009 temperament | The tuner's "A4 = 440 Hz" footer and the nearest-note lookup gain a temperament |
| Shares terms | — | Detected pitch, Cents, Note, Instrument, Target note, Judgement, Range (from `docs/glossary.md`); new: Tuner, Nearest note, In-tune band |

## Domain

> From `docs/domain.md`. One context per slice. If this slice needs two, stop:
> either it is two slices, or it is an integration slice whose only job is the
> event/interface between them.

This is the map's integration slice made real: `listening` publishes
`PitchDetected`; `practice` consumes it and judges it against a target —
the exact seam the map was drawn around (decision 2026-09-19: "listening
reports raw PitchDetected only; practice judges sharp/flat/in tune"). The
core is `listening`; the tuner's rules are `practice`'s by the map's Owns
column (Judgement, Target note); `theory` answers one timeless question.
The same three-context shape shipped in 003 (practice.session +
theory.temperament + the circle).

- **Context:** `listening` (creates `pitch-detection`); `practice` (creates
  `tuner`); `theory` (`temperament` +1)
- **Nouns touched:** Detected pitch (`listening`); Judgement, Target note,
  Instrument, Note, Cents (`practice`); Note, Temperament (`theory`)
- **Events emitted:** `PitchDetected` (`listening`) — each time a pitch is
  heard, at least every 50 ms while it lasts, carrying frequency,
  confidence, time; `NoteJudged` (`practice`) — each reading the tuner
  shows: the target note (nearest or pinned), the offset in cents, the
  verdict sharp / flat / in tune
- **Events consumed:** `PitchDetected` from `listening` — translated into a
  Judgement against the tuner's target
- **Invariants this slice must preserve:** `listening` — a PitchDetected
  always carries a positive frequency and a confidence
  (`listening.pitch-detection/REQ-003`); pitch feedback is emitted within a
  bound that feels instant, or not at all (`REQ-004`,
  `practice.tuner/REQ-006`); `practice` — a sequence note or click and the
  drone never sound at once — extended: nothing sounds while the tuner
  listens (`practice.tuner/REQ-001`)
- **New invariants this slice introduces:** none in the map; "nothing sounds
  while the tuner listens" is the existing never-both rule reaching one more
  state

## Changes

> Requirements live in the delta files, not here. One row per capability this
> change touches. `sdd-specify` writes the deltas from the intent; this table
> is the map.

| Capability | Delta file | Adds | Modifies | Removes | Why |
|---|---|---|---|---|---|
| `listening.pitch-detection` | `delta/listening/pitch-detection.md` | 6 | 0 | 0 | The context's first capability: capture, detection, its bound, its failures |
| `practice.tuner` | `delta/practice/tuner.md` | 9 | 0 | 0 | The tuner screen: way in/out, reading, silence, target, stave strip, budget, cannot hear, hidden/awake, memory |
| `theory.temperament` | `delta/theory/temperament.md` | 1 | 0 | 0 | The nearest note to a frequency, with the offset in cents |

`practice.session` and `practice.drone` are not modified: the exclusion is
stated on the tuner's side only, as 004 stated the drone's on the drone's
side.

## Affects

> Living documents this change modifies, other than the capability specs.
> Each is a gated re-approval at `sdd-finish`, never a silent edit.

| Document | Change | Approved at finish? |
|---|---|---|
| `docs/domain.md` | none — `listening`'s nouns, `PitchDetected`, `NoteJudged` and both invariants are already on the map; `practice` gains a capability, not a noun | |
| `docs/glossary.md` | add **Tuner** (UI: the screen that listens and shows the detected pitch against the nearest or a pinned note), **Nearest note** (`theory`: the note whose pitch under the temperament is closest to a detected pitch, with the offset in cents), **In-tune band** (`practice`: the ±5 ¢ within which a judgement is in tune); note under Target note that in the tuner it is the nearest note unless one is pinned | |
| `docs/product.md` | none | |

## Interface

> Every screen and state this change adds or alters, or the single word
> `none`. Filled by `sdd-design` before the requirements are written, because
> walking the scenarios across these screens is what finds the missing ones.
> **Design** is the wireframe or imported reference in `design/`; **Route** is
> filled at the plan, once the app has one; the refinement loop's reference
> screenshot lands in `design/reference/<screen>--<state>.png` at its exit.
> `scripts/check-design.sh` checks the files exist and the citations resolve.

| Screen | State | Route | Design | Requirements seen here |
|---|---|---|---|---|
| `practice` | `way-in` — the Tuner pill in the header beside ⚙ (1d) | `/` (screen: practice — the app has no URL routes; `design-shots`/`design_snapshot` reach a state by driving the UI) | `design/Practice.dc.html` | `practice.tuner/REQ-001` |
| `tuner` | `listening` — 4a, State live/sweep: the reading, the level, the stave strip, LISTENING | `/` then the Tuner pill (screen: tuner) | `design/Tuner.dc.html` | `practice.tuner/REQ-001` `practice.tuner/REQ-002` `practice.tuner/REQ-005` `practice.tuner/REQ-006` `practice.tuner/REQ-008` `theory.temperament/REQ-002` |
| `tuner` | `silent` — 4a, State silent: "Play a note" | `/` then the Tuner pill, no signal | `design/Tuner.dc.html` | `practice.tuner/REQ-003` |
| `tuner` | `cannot-hear` — 4a, State cannot hear: "–", NO MIC, the card | `/` then the Tuner pill, microphone refused | `design/Tuner.dc.html` | `practice.tuner/REQ-007` |
| `tuner` | `target-pinned` — 4a with a target: the pill with − / + / ✕, the grey target head, "▲ N st" beyond 50 ¢ | `/` then the Tuner pill, then Hold or a wedge | `design/Tuner.dc.html` | `practice.tuner/REQ-004` `practice.tuner/REQ-005` |
| `tuner` | `target-sheet` — 5c: Auto / Hold / the pitch spiral | `/` then the Tuner pill, then TARGET | `design/Tuner.dc.html` | `practice.tuner/REQ-004` `practice.tuner/REQ-009` |

## Non-functional requirements

> Only ones with a number in them. "Fast" is not a requirement; "renders in
> under 200 ms at p95 on a cold cache" is. Delete any line you cannot measure.

| Concern | Requirement | How measured |
|---|---|---|
| Latency (Article V) | Every readout shown is within 100 ms of the sound it reflects, from the note's start in the microphone signal; a readout that would be older is dropped, never shown | A harness feeds known tones as the microphone and timestamps each readout against the tone's onset; run at converge and finish like `test:timing`, and against the phone at acceptance (`practice.tuner/REQ-006`) |
| Refresh | While a steady note is heard the readout refreshes at least every 50 ms | The same harness counts readouts per second (`listening.pitch-detection/REQ-004`) |
| Accuracy | Every note E2–C7; within ±2 ¢ of the true pitch on a steady sine and a harmonic-rich flute-like tone; never the octave above or below | The harness sweeps E2–C7 in semitones with both tones (`listening.pitch-detection/REQ-002`) |
| Stability | The nearest note changes only once the pitch is 56 ¢ from the shown note | Harness: a glissando across a note boundary (`practice.tuner/REQ-002/S4`) |
| Privacy | Microphone audio never leaves the device and is never stored; the microphone is open only while the tuner screen is showing and visible | Article VII; `listening.pitch-detection/REQ-001`, `REQ-005` |
| Accessibility | The note name and the level are legible at 60–80 cm on the phone (design §6); sharp and flat are told apart by position and word as well as colour | The user's walk on the stand |

## Edge cases and failure modes

| Situation | Expected behaviour | Requirement |
|---|---|---|
| First entry, permission not yet given | The browser's own prompt appears then, never before; refusal → "Can't hear" | `listening.pitch-detection/REQ-001`, `practice.tuner/REQ-007` |
| Silence, breath, noise, several pitches at once | No PitchDetected; "Play a note"; with a target, its name greyed | `listening.pitch-detection/REQ-003`, `practice.tuner/REQ-003` |
| A note outside E2–C7 | Nothing is guaranteed; whatever is published is still a positive frequency with a confidence | `listening.pitch-detection/REQ-002/S5` |
| The pitch sits on a boundary between two notes | The shown note holds until the pitch is 56 ¢ away; the reading never exceeds ±50 ¢ on auto | `practice.tuner/REQ-002/S4` |
| A target is pinned and a different note is played | The line pins to the edge, the tag counts semitones, "playing <note>" is captioned | `practice.tuner/REQ-004/S3` |
| Entering while a run plays or the drone sounds | Both silent within 50 ms; the practice screen is left idle at the first note, the pill off | `practice.tuner/REQ-001/S2` |
| The microphone fails mid-session (unplugged, revoked) | The tuner shows it cannot hear; re-entry retries | `listening.pitch-detection/REQ-006/S3`, `practice.tuner/REQ-007/S3` |
| Page hidden while listening | Capture stops; a visible tuner resumes without a tap | `listening.pitch-detection/REQ-005`, `practice.tuner/REQ-008` |
| A detection arrives too late to meet the budget | Dropped, never shown | `listening.pitch-detection/REQ-004/S3`, `practice.tuner/REQ-006/S2` |
| Leaving and returning | The target is gone, Auto again; the practice screen is as it was, idle | `practice.tuner/REQ-009` |

## Assumptions

> Things we are taking as true without having verified them. Each one is a risk.
- The harness can feed a known tone to the page as its microphone, as
  playback's harness timestamps onsets today — risk: the measurement needs
  another route, found at the plan's spike.
- A detector that reaches E2 fits in 100 ms with the phone's own capture
  latency — risk: the E2 end is the first cut (intent Q10), the budget stands.
- The harmonic-rich test tone stands in for a flute well enough that the
  phone walk agrees with the harness — risk: octave errors on the real
  instrument that the harness never saw.
- The nearest-note lookup belongs to `theory.temperament` (the inverse of
  its REQ-001) — risk: none to behaviour; the plan may place it either way.

## Open questions

> Anything unresolved. **An agent must not answer these on its own** — it raises
> them. An empty section is a claim that nothing is ambiguous; be honest.

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | How is the 100 ms split between `listening` (capture + detection) and `practice`/the screen (judgement + paint)? The specs state the end-to-end bound and the 50 ms refresh; the split is a plan decision the harness will measure | nothing in the spec; the plan | Measure first (the plan's spike), then fix listening's share as a number in the plan |
| 2 | What confidence threshold separates "a pitch" from "nothing"? The spec states the observable outcomes (a sine is heard, noise is not); the number is tuning | nothing in the spec; the plan | Chosen at the plan's spike against the harness's silence / noise / tone cases and the flute walk |

## Out of band

- Decided while writing this (not in the intent): −/+ on a pinned target
  move within the tuner's own range E2–C7, not the instrument's range as the
  prototype's script clamps — the spiral already lets a note outside the
  instrument's range be pinned, and clamping −/+ to the instrument would
  jump a below-range target up to the instrument's lowest note.
- The reading's hysteresis (56 ¢) and the ±50 ¢ clamp on auto are the
  prototype's own numbers (`Tuner.dc.html`, `tick()`), confirmed at the
  walkthrough.
- The design canvas keeps Turns 1–3 and 5a as the path to 4a + 5c;
  `design/rounds.md › Origin` records the choice and every walkthrough ruling.
- Article V was adopted for playback (003) though playback is not feedback;
  this is the first slice it was written for.
- Prior art: 003's timing harness (`pnpm test:timing`) is the shape this
  slice's measured test follows; 004's converge chose to measure on the phone
  rather than accept laptop headroom — the same rule applies here.
