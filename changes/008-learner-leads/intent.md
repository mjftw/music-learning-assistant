---
type: Intent
title: learner-leads — intent
description: I lead: the tool shows each target note on the practice screen, listens, and moves on once the note has been held in tune for N beats
resource: /changes/008-learner-leads/intent.md
status: draft
tags: [sdd, intent, "change:008-learner-leads"]
sources:
  - resource: conversation:2026-10-02
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T15:26:26Z
verified: []
sdd_id: 008-learner-leads
sdd_context: practice
sdd_phase: draft          # draft | resolved
---

# Intent: learner-leads

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

The product has had two modes since init (decision 2026-09-19: "tool leads
(plays, learner follows) and learner leads (tool shows note, listens,
advances when nailed) · matches how practice actually flows"), and only the
first exists. 007 proved listening and pays its way as a tuner, but the
tuner names whatever is played; nothing yet tells the learner *which* note
to play next and waits until it is held in tune. The user, at 007's grill:
"The mode switch would be that the app says which note to play (and
possibly also sounds it briefly, as a toggleable setting) and the learner
plays the note. The app gives visual feedback so the learner knows how high
or low they are, and once they get it within a given set of cents (again
another setting, e.g. lenient / medium / accurate) the app moves to the
next note." 007 cut exactly this out to build later; 008 is that later.

## Proposed outcome

"008 adds a second way to practise on the existing practice screen.
Play along (as shipped): the tool plays the run and the learner follows.
I lead (new): the tool shows each target note and listens. Once the learner
has held it in tune for N beats, it moves on to the next note. Everything
lives on the practice screen. There is no new screen." (`design/handoff.md`)

The design is settled: `design/handoff.md` is "the build spec … the source
of truth for copy, sizes, colours, states and behaviour"; `design/Learner
Leads Final.dc.html` is the eleven screens and states to build (11 a live
demo of the hold/advance logic); `design/Learner Leads Practice.dc.html`
is the prototype behind them — "reference only; do not port its code.
Recreate the design in src/ui with our existing React patterns and
theme.ts tokens."

## Affected users and systems

- The one user, on the phone on the stand with the flute (and the
  ocarinas), hands on the instrument — Article VI: nothing needs a tap
  while a run is in progress.
- `practice.session` (modifies): a Mode on the Session (the domain map has
  named it since init), the lead run beside the play-along run, the hold
  rule, five new persisted settings, the transport card and the Traversal
  sheet.
- `listening.pitch-detection`: consumed unchanged — "Reuse 007's
  PitchDetected stream unchanged (ADR 0006)."
- `practice.tuner`: untouched; it keeps its own screen. The mic-request,
  no-mic, hidden-page and wake-lock patterns are reused.
- `practice.drone`: the never-both invariant now has a third party — a
  lead run listens, so nothing may sound over it (decision 2026-09-27:
  nothing sounds while the tuner listens).
- `theory.temperament`: the nearest-note / cents lookup of 007, now from a
  fixed target.
- `src/ui`: TransportCard, StaveView / NamesView (the meter on the target
  note), TraversalSheet. "No new screen."
- `docs/design.md` §8 and `src/ui/theme.ts`: the five new colour tokens
  the README lists.

## Constraints

- "Follow the repo's spec-first process: write the change spec/delta for
  008 first, get my sign-off, then build."
- "Reuse 007's PitchDetected stream unchanged (ADR 0006)."
- "Changes stay on the practice screen: TransportCard, the stave/names
  panel and TraversalSheet. No new screen."
- "Add the new colour tokens listed in the README to theme.ts and
  docs/design.md §8."
- "The Traversal sheet must keep the same height when switching play along
  ↔ I lead. Nothing may move under the user's finger."
- "Hold logic: accumulate while |cents| ≤ tolerance, reset on leaving
  tolerance, pause on silence, advance at beats × 60000 / tempo ms. Cover
  this with unit tests."
- "Ask me before deviating from the README."
- Article V (latency): the meter on the note is a readout of the learner's
  own sound; 007's 100 ms budget is the precedent.
- Article VI / design rule (2026-09-27): nothing needs a tap while sound
  or listening is in progress; nothing disappears on its own except to
  show time passing.
- Domain invariants: the target is always a member of the active sequence;
  in learner-leads mode the target never advances unless the note was held
  in tune for the required duration; a sequence note or click and the
  drone never sound at once.
- Decisions already made and not re-asked: the mode switch, show-the-note,
  the optional brief sounding, hold-to-advance and the lenient / medium /
  accurate tolerance all belong to 008 (2026-09-27); vocabulary "in tune"
  and "held", not "nailed" (2026-09-19); learner-leads is a mode of the
  session, not a parallel capability (2026-09-19); the microphone is asked
  for only when listening starts, never before (2026-09-27).

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: While the target tone (`Cues → tone`) sounds, what does the lead run do with what it hears?

The tone is the target's own pitch through the phone's speaker; the mic
would read it as in tune and bank it toward the hold (at 1 beat and 150
bpm the tone alone would advance the run). Decision 2026-09-27: nothing
sounds while the tuner listens.

**Recommended:** Judge nothing until the tone has ended — detections are
ignored from the tone's onset until it has finished and released plus
about 100 ms of tail, the meter shows nothing in that window, and hold time
cannot accrue — because the tool's sound is never judged as the learner's
and listening never restarts (a restart re-gates the detector and costs a
hop or two of first readout on every note). Alternatives offered: mute the
mic for the tone; drop the tone cue from 008.
**Answer:** Judge nothing until the tone has ended.
**Status:** decided

### Q2: How do a lead run and the drone (and tapped notes) interact?

Today ▶ stops the drone before the count-in (`practice.drone/REQ-004`)
and entering the tuner stops playback and the drone before the mic opens.

**Recommended:** A lead run and the drone exclude each other, either way:
starting I lead stops the drone first (as ▶ does); switching the drone on
mid-run stops the run first (as it stops playback); tapping a notehead or
column while leading is ignored, as it is while playing — because it is
the tuner's never-both rule applied to the run, symmetric with drone
REQ-004, with no disabled control. Alternatives offered: one direction
only with the pill disabled while leading; allow the drone under a run
(the detector would hear it).
**Answer:** Lead run and drone exclude each other, either way.
**Status:** decided

### Q3: The page is hidden in the middle of a lead run — what happens when it is shown again?

Playback stops and goes idle on hidden (`practice.session/REQ-009`); the
tuner stops listening and resumes without a tap (`practice.tuner/REQ-008`).
A lead run is both.

**Recommended:** Stop and go idle, like playback — listening ends, the mic
is released, the run returns to idle at note 1 with the I lead idle
caption; the circle starts afresh — because the learner put the phone
down, and a run resumed on its own would breach "nothing changes on its
own". Alternative offered: resume listening at the same note, like the
tuner.
**Answer:** Stop and go idle, like playback.
**Status:** decided

### Q4: Is the hold accumulated from the smoothed offset (what the line shows) or from each raw detection?

007 smooths the shown offset (`practice.tuner/REQ-002`, design round 1:
the raw reading "jumps around 'in tune' a lot"). The README says the
cents are "the nearest-cents error from 007's detector" against the target
but not raw or smoothed.

**Recommended:** The smoothed offset, same as the tuner — one judgement
per reading drives the pitch line and the hold, filtered as 007 does (one
tenth of the way per reading; a jump of more than 25 ¢ shown at once; the
first reading after silence or a new target as detected) — because what
is seen filling is what is being counted, and one outlier reading cannot
reset the hold. Alternative offered: raw detections (resets on any single
wobble; at accurate ±5 ¢ likely unfair on a wind instrument).
**Answer:** The smoothed offset, same as the tuner.
**Status:** decided

### Q5: What is the acceptance test for 008?

The user asked for unit tests on the hold rule. 007's precedent is a
measured harness at converge and finish plus the user's flute walk; the
meter on the note is a readout of the learner's sound, so Article V's
budget applies to it as to the tuner.

**Recommended:** The hold rule by exhaustive unit tests; the measured
harness extended with a scripted lead run (tones fed as the microphone:
silence, a flat entry, settling, a drift) gating the meter's first readout
≤ 100 ms and the advance landing exactly at beats × 60000 / tempo of
accumulated in-tune time; then the user's walk on the phone up and down C
major, and the user signs off. Alternative offered: unit tests and the
walk only, the new readout unmeasured.
**Answer:** Unit tests + an extended harness + the flute walk.
**Status:** decided

### Q6: The README's shared rows read "Octaves: 1 / 2" and "Direction: up / down / up and back" — which controls do we build?

The shipped sheet offers 1–4 oct + full (`practice.session/REQ-001`,
decided at 003) and ↑ ↓ ↑↓ pills; the prototype itself still draws ↑ ↓
↑↓. The README calls the shared rows "unchanged". Raised because the
user asked to be asked before any deviation from the README.

**Recommended:** The shipped controls in the README's row frame — ↑ ↓ ↑↓,
1–4 oct + full, scale / arpeggio and the Loop switch behaving exactly as
today, every row restyled to the 62 px frame with the README's hint text —
because "1 / 2" is the prototype's placeholder, not a decision to drop 3,
4 and full. Alternative offered: exactly as listed (a REMOVED delta on
REQ-001).
**Answer:** Shipped controls, README's row frame and hints.
**Status:** decided

## Resolved

- 008 is a Mode on the practice screen's Session — play along (as
  shipped) and I lead — with no new screen; `practice.session` modifies,
  `listening.pitch-detection` consumed unchanged, `practice.tuner` and
  `practice.drone` untouched except where the never-both rule names them —
  because the domain map and the init decision put learner-leads inside
  the session, and the user's brief says so.
- `design/handoff.md` is the source of truth for copy, sizes, colours,
  states and behaviour; `Learner Leads Final.dc.html` the eleven states;
  the prototype's code is reference only — the user's brief.
- The hold rule: accumulate while |cents| ≤ tolerance, reset on leaving
  tolerance, pause on silence, advance at beats × 60000 / tempo ms; lenient
  ±15, medium ±10, accurate ±5; default medium, 2 beats — the brief and
  the README.
- The hold and the pitch line are driven by the smoothed offset, filtered
  as the tuner's (Q4) — what is seen filling is what is counted.
- While the target tone sounds nothing is judged: detections are ignored
  from its onset until it has ended plus a short tail, the meter shows
  nothing, hold cannot accrue (Q1) — the tool's sound is never the
  learner's.
- A lead run and the drone exclude each other either way, and tapped
  notes are ignored while leading (Q2) — the never-both rule on the run.
- Hidden page: the run stops and goes idle like playback (Q3).
- Acceptance: exhaustive unit tests on the hold rule, the measured harness
  extended with a scripted lead run, the user's flute walk on the phone
  (Q5).
- The shared sheet rows keep the shipped controls inside the README's 62
  px row frame with its hints (Q6); the Traversal sheet never changes
  height on the mode switch and nothing moves under the finger — the
  brief.
- The five new colour tokens go into `theme.ts` and `docs/design.md` §8 —
  the brief.

## Assumptions carried

- In I lead there is no count-in, rest bar, metronome or sound mode (the
  rows swap out): a run starts waiting silently on note 1 — risk if wrong:
  the sheet gains a row and loses its fixed height.
- Loop on: after the last note is held the run goes straight back to note
  1 (no complete card); loop off: the complete state ("n of n held ·
  span", "All held") with the start circle back — risk if wrong: a
  scenario rewrite, nothing structural.
- The start circle in I lead shows the Tuner glyph idle and after
  completion; the README's "▶ returns" means that circle — risk: copy.
- The five settings (lead, holdBeats, tolerance, cueMeter, cueTone) persist
  with the session settings — one schema bump, defaults tool / 2 / medium /
  on / off (REQ-011 pattern); the tool opens idle in the stored mode and
  never stores a run in progress — risk: none beyond a migration test.
- The mic is asked for when the first lead run starts (never before),
  released when the run stops, completes with loop off, or the page hides;
  refused, none or failed → the README's no-mic card, the run idle, the
  next start retries; failure mid-run shows it within 500 ms (tuner
  REQ-007 pattern); the screen stays awake while leading — risk: none,
  007's patterns.
- The Tuner pill during a lead run stops the run as it stops playback
  (tuner REQ-001) — risk: none.
- Changing key, variant, scale or traversal mid-run restarts the lead run
  at note 1, still listening (REQ-007 pattern); changing tempo, Hold, In
  tune or Cues mid-run applies at once — the required hold is recomputed
  and the accumulated time kept — risk if wrong: a scenario change.
- Cents are measured from the target's pitch under `theory.temperament`
  (A4 = 440, equal), with no nearest-note hand-over; beyond ±50 ¢ the line
  pins at the band box's edge; a note an octave off simply pins; there is
  no wrong-note display (README: explored and rejected) — risk: an octave
  error on the flute reads as "far flat/sharp", accepted by the design.
- Silence is the tuner's rule: no detection for 300 ms clears the line
  and pauses the hold; "<note> held ✓" shows on the card until the first
  reading on the new target or for 0.4 s of silence, whichever first, as
  the prototype does — risk: the "nothing changes on its own" rule; the
  design loop can retune it.
- Past / future styling follows the prototype: notes below the target in
  the run ink, above it faint (run position, not sequence position) — risk:
  feels wrong on the descent of ↑↓; retune at the design loop.
- Hold time is accumulated as elapsed time between in-tolerance readings
  from their timestamps, not by counting readings — risk: none; it makes
  the feel independent of the reading rate.
- The meter on the note and each reading meet 007's budget: first readout
  ≤ 100 ms, ≥ 20 readings/s, a late reading dropped (Article V) — risk:
  measured at converge; if the stave re-render is too slow the plan must
  cheapen it.
- Screen 11 (the simulated player) is a design demo, not a feature —
  risk: none.
- The traversal summary line keeps its copy (no mode, no hold) — README.

## Still open

- The tail after the tone before judging resumes (~100 ms) and the 0.4 s
  of "held ✓" — tuned on the live build in the design loop; blocks nothing.

## Riskiest unknown

Whether the hold feels fair on the flute — medium ±10 ¢ against a real
tone's wobble and the detector's noise, with the smoothing — which only
the walk on the phone can judge; everything else is 007's pipeline with a
fixed target.
