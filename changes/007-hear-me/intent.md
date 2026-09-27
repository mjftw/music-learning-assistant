---
type: Intent
title: hear-me — intent
description: Hear the learner: a live pitch readout — nearest note, sharp or flat in cents — inside the latency budget, useful alone as a tuner
resource: /changes/007-hear-me/intent.md
status: draft
tags: [sdd, intent, "change:007-hear-me"]
sources:
  - resource: conversation:2026-09-27
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T09:56:35Z
verified: []
sdd_id: 007-hear-me
sdd_context: listening
sdd_phase: draft          # draft | resolved
---

# Intent: hear-me

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

Pitch is checked by ear alone today, with no way to verify it. The riskiest
unknown of the whole product is whether the tool can hear the note being
played and say so fast enough to be useful — "if feedback arrives slightly
too late it completely throws off the practice; it needs to work really
smoothly, or it's not useful." Nothing has been built at the microphone
boundary yet, and learner-leads (008) cannot start until it has.

## Proposed outcome

A dedicated tuner screen: enter it, play, and see which note you are
playing and how far sharp or flat you are, within 100 ms of the sound, for
any note from E2 to C7; leave it and the practice screen is as it was.
Nothing sounds while it listens. It proves the listening context — the
microphone heard, the pitch detected and published inside a measured budget
— "to prove out listening, and then the learner-leads mode later." A fuller
dedicated tuner may come later; 008 builds the readout under a target note
on what this slice proves.

## Affected users and systems

- The user alone, phone on the stand or laptop.
- `listening` gains `listening.pitch-detection` — capturing the instrument
  and publishing `PitchDetected` (frequency, confidence, time) inside the
  budget — the first code in `src/listening/` (Rust→WASM, ADR 0001 / 0003).
- `theory.temperament` is expected to gain the inverse of its REQ-001: the
  nearest note to a frequency and the offset in cents (an assumption below).
- The UI gains the tuner screen and the way in and out; the practice screen
  gains only the way in.
- `practice.session` and `practice.drone` are touched by stop-on-entry —
  nothing sounds while the tuner listens; `sdd-specify` decides whether that
  is stated in the tuner's own spec or as a modification of theirs.
- Not touched: the circle, the scale catalogue, the transport, the drone's
  own behaviour, stored state (this slice stores nothing).

## Constraints

- Article V: a budget of 100 ms, sound made → readout perceivable, for every
  readout shown; a readout that would be late is dropped; measured.
- Article VI: no interaction is demanded; the tuner is a screen the learner
  chooses to enter; the practice screen changes only by the way in.
- Article VII: everything runs in the browser on the device's own microphone.
- Decided earlier and not re-asked: listening publishes raw `PitchDetected`
  only, judgement against a target is practice's (008); A4 = 440 Hz, equal
  temperament (just is 009); ♯/♭ follow the global spelling preference;
  Cents is the shared unit; Rust owns listening (ADR 0001, ADR 0003);
  nothing sounds and nothing is asked before the first gesture — the
  microphone included.
- Nothing sounds while the tuner listens; entering stops playback and the
  drone (Q5).
- The tuner screen's design is a Claude Design prototype, vendored under
  `design/`, the source of truth for the screen (Q11); `docs/design.md`
  does not yet exist, so `sdd-design` A runs before B.
- A fact for the plan, not a decision here: the microphone needs a secure
  context on the phone, as the AudioWorklet did (`pnpm dev:phone`).

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: What is the tuner for at the stand, in this slice?

Already decided (2026-09-19): 007 exists to de-risk live pitch (Article V,
measured) and to be useful alone as a tuner; listening reports raw
`PitchDetected` only. Today pitch is checked by ear alone, with no way to
verify.

**Recommended:** A glanceable readout on the existing screen — mic on, a
live readout of what is heard sits on the practice screen; no separate
tuner page — because Article VI (nothing to switch into mid-practice) and
008 will need exactly this readout under the target note.
**Answer:** "Your recommendation, as I want it to show pitch heard on the
existing UI (e.g. how high / low from target visually, with only
modifications to existing UI — e.g. to add a pitch indicator or similar).
I will want a dedicated tuner in future though, so bear that in mind."
**Status:** decided

### Q2: What is the readout measured against?

The user said "from target"; in 007 as the roadmap cuts it there is no
target — the judgement against a target is 008 learner-leads.

**Recommended:** The nearest note — a tuner: name the note nearest to what
is heard and show cents sharp or flat of it (±50) — because it needs no
target, touches practice not at all, and is exactly what a tuner is.
**Answer:** "The intention is that this will be another mode alongside how
we can currently have it play through the notes in the scale selected
(where the expectation is the learner plays along to the app leading the
sound). The mode switch would be that the app says which note to play (and
possibly also sounds it briefly, as a toggleable setting) and the learner
plays the note. The app gives visual feedback so the learner knows how
high or low they are, and once they get it within a given set of cents
(again another setting, e.g. lenient / medium / accurate) the app moves to
the next note. The nearest note could possibly be shown somehow as part of
the visual feedback but we'll need to try that out in the design stage.
Nearest note will be useful for the planned later dedicated tuner mode."
**Status:** open — the answer describes 008 learner-leads; the scope of
007 is re-cut at Q3

### Q3: How do we cut 007, given that Q2 described 008?

The roadmap split 007 off from learner-leads on purpose — "the riskiest
unknown de-risked first, paying its way as a tuner" — so that detection and
its latency budget are proven before a mode is built on them.

**Recommended:** Detection plus sharp/flat against the note the tool is
sounding (tool-leads run or a tapped note), on the existing screen; no
mode switch, no advancing, no tolerance setting — because it proves the
risky part first and the visible payoff is the one the user wants.
Alternatives offered: merge 007 and 008; keep 007 a pure tuner.
**Answer:** "Okay, I forgot that. Let's build a dedicated tuner mode now
to prove out listening, and then the learner-leads mode later."
**Status:** decided — 007 is a dedicated tuner mode (nearest note); the
mode switch, show-the-note, optional brief sounding, hold-to-advance and
the tolerance setting all stay in 008. Supersedes Q1's "on the existing
UI, no separate tuner": the readout of Q1 arrives with 008 under the
target note; the tuner is its own mode now.

### Q4: Where does the tuner mode live, and what does turning it on do?

**Recommended:** A mode on the practice screen — one control turns the
mic on and shows the tuner in the transport card's place while the circle
and the drone pill stay in view — because the phone stays on one screen
(Article VI) and a guitar can later be tuned against the key's own notes.
Alternatives offered: a separate tuner screen; an always-on readout.
**Answer:** "I think a separate tuner screen, as I'm not sure the circle,
key selection, scale etc. are going to be useful UI elements when in
tuner mode."
**Status:** decided — the tuner is its own screen; which existing
elements, if any, it carries is for the design stage

### Q5: What happens to playback and the drone on entering the tuner, and can anything sound while it listens?

Known: the phone's mic hears the phone's own speaker, so the tool's own
tones would be detected as the learner's playing.

**Recommended:** Nothing sounds while the tuner listens — entering the
tuner stops playback and the drone (silent within 50 ms, the
drone/playback exclusion pattern), the tool makes no sound while the tuner
screen shows, and leaving it returns to the practice screen idle and
silent — because the mic must hear only the instrument, and the never-both
invariant extends naturally. Alternatives offered: the drone may sound
while the tuner listens; sound carries on regardless.
**Answer:** The recommendation.
**Status:** decided

### Q6: What does the readout say for a heard pitch?

Known and not re-asked: A4 = 440 Hz, equal temperament (just temperament
is 009); ♯/♭ follow the global spelling preference (002); Cents is the
shared unit.

**Recommended:** The nearest note's name and octave (spelled per the
preference), the offset to the whole cent from −50 to +50, and a fixed
in-tune band of ±5 cents shown as such; any note A0–C8 whatever the
selected instrument; no Hz — because that is what a tuner is, and 008's
lenient/medium/accurate setting arrives later without changing it.
Alternatives offered: no in-tune band; add the frequency in Hz.
**Answer:** "We'll leave this to the design phase to decide."
**Status:** open — the design stage (`sdd-design` B, before the proposal)
decides what the readout shows: note name and octave, the cents offset, an
in-tune band and its width, Hz or not, and whether the nearest note is
shown at all. The facts above (A440, equal, spelling preference, cents)
hold whatever it chooses.

### Q7: What is the latency budget — sound made → readout perceivable?

Article V: a numbered end-to-end budget with a measured test; feedback
that would miss it is suppressed, never shown late. Playback's budget is
±5 ms onsets and a 30 ms highlight.

**Recommended:** 100 ms for every readout shown — from the instant a note
starts in the microphone signal to the readout showing it; while a steady
note is heard the readout refreshes at least every 50 ms; a readout that
would be older than 100 ms is dropped; measured on the laptop in a harness
(a known tone fed as the microphone) and on the phone at acceptance, like
playback's — because ~100 ms is where visual feedback stops feeling
instant, and mic input + a detection window + paint fits with little to
spare. Alternatives offered: 50 ms; 150 ms.
**Answer:** The recommendation — 100 ms, every shown readout.
**Status:** decided

### Q8: What must it hear, and how accurately?

Known: the catalogued variants span A3–C7; guitar (E2 = 82 Hz) is a
possible later instrument; the tuner is instrument-agnostic. The lower the
note, the longer the window needed to hear it, which eats the budget.

**Recommended:** Every note from E2 to C7 is heard, and on a steady
synthesised tone — a sine and a harmonic-rich flute-like tone — the
readout is within ±2 cents of the true pitch, measured in the harness —
because it covers every instrument named at a tuner's usual accuracy, and
±2 cents sits inside any in-tune band the design might choose.
Alternatives offered: only the catalogued ranges (A3–C7); the whole piano
A0–C8.
**Answer:** The recommendation — E2–C7, within ±2 cents on a steady tone.
**Status:** decided

### Q9: States and failure

**Recommended:** (1) the microphone is asked for only when the tuner
screen is entered — a gesture — never before, like sound; (2) permission
refused, no microphone, or capture failing → a visible non-interrupting
notice, the tuner shows it cannot hear, and each re-entry tries again;
(3) silence, breath, noise or several pitches at once → the readout shows
nothing rather than a guess; (4) page hidden → the mic stops; back on a
visible tuner screen it resumes without a tap; (5) the screen stays awake
while the tuner listens; (6) leaving the tuner releases the mic and
returns to the practice screen as it was, idle; (7) nothing is stored —
the tool never opens on the tuner — because each follows a rule the tool
already has (`practice.session/REQ-009`, `REQ-010`; `practice.drone/REQ-007`,
`REQ-008`). Alternative offered: resuming after hidden needs a tap.
**Answer:** All seven, as proposed.
**Status:** decided

### Q10: What is explicitly not in 007, and what is cut first?

**Recommended:** Not in 007: a reference-pitch setting (A = 440 stays
fixed), temperament choice (009), a tolerance setting (008), transposing
instruments (everything catalogued is concert pitch), a reference tone
from the tuner itself (the drone lives on the practice screen), pitch
history or a graph, calibration, and any nearest-note lock or target.
Smallest useful version: enter, play, see the note and how far off, leave.
Cut first under pressure: the E2 low end (catalogued ranges only), then
the flute-like harmonic test tone — because of Article VIII, and 008/009
already own the settings.
**Answer:** Agree, as listed.
**Status:** decided

### Q11: Where does the tuner screen's design come from?

Known: there is no `docs/design.md` yet — the first change that adds a
screen runs `sdd-design` A, then B for this screen; 003, 004 and 005 each
vendored a Claude Design prototype the user iterated, imported via the
design MCP, as the source of truth for the screen.

**Recommended:** A Claude Design prototype, as before — iterated by the
user, imported and vendored under `design/`; it decides the readout (Q6)
and the way in and out, and `sdd-specify` waits for it — because that is
the pattern that has worked three times, and Q6 is a decision the user
wants to try out live. Alternatives offered: wireframes in the repo; build
it plain and design later.
**Answer:** A Claude Design prototype, as before.
**Status:** decided

### Q12: What proves 007 works, and who signs it off?

Precedent: playback's measured harness (`pnpm test:timing`) is mandatory
at converge and finish, plus the user's own walk on the phone, with a phone
measurement when the laptop's headroom was thin (004 / T024).

**Recommended:** (a) A harness feeds known tones as the microphone and
fails if any shown readout is later than 100 ms, any steady tone E2–C7
reads outside ±2 cents, or nothing is shown for a tone within the budget;
run at converge and finish like `test:timing`, and against the phone at
acceptance. (b) The user, on the phone on the stand: long tones up and down
the flute — the readout names each note, moves with the embouchure, never
feels behind; silence shows nothing. The user signs off — because Article V
accepts only the measurement, and the feel is the user's to judge.
Alternatives offered: harness only; the walk only.
**Answer:** The recommendation — measured harness plus the walk on the
phone with the flute.
**Status:** decided

## Resolved

- 007 is a dedicated tuner screen that names the nearest note, not the
  readout under a target note — that readout, the mode switch, show-the-note,
  the optional brief sounding of it, hold-to-advance and the
  lenient/medium/accurate tolerance setting all stay in 008 learner-leads —
  because the riskiest unknown is proven first and the roadmap split was
  deliberate (Q3; supersedes Q1's "on the existing UI").
- The tuner is its own screen; whether any of the circle, key or scale
  appears on it is for the design (Q4).
- Nothing sounds while the tuner listens: entering it stops playback and the
  drone, silent within 50 ms, as the drone/playback exclusion does; leaving
  it returns to the practice screen idle and silent (Q5).
- Budget: 100 ms from the note starting in the microphone signal to the
  readout showing it, for every readout shown; a steady note refreshes the
  readout at least every 50 ms; a readout that would be older than 100 ms is
  dropped; measured on the laptop, and on the phone at acceptance (Q7).
- Range and accuracy: every note E2–C7 is heard; on a steady synthesised
  tone — a sine and a harmonic-rich flute-like tone — the readout is within
  ±2 cents of the true pitch, measured (Q8).
- States: the microphone is asked for only on entering the tuner, never
  before; refused, absent or failing → a non-interrupting notice, the tuner
  shows it cannot hear, each re-entry retries; silence, breath, noise or
  several pitches → the readout shows nothing; page hidden → the mic stops
  and a visible tuner resumes without a tap; the screen stays awake while
  the tuner listens; leaving releases the mic; nothing is stored and the
  tool never opens on the tuner (Q9).
- Not in 007: a reference-pitch setting, temperament choice (009), a
  tolerance setting (008), transposing instruments, a reference tone from
  the tuner, pitch history or a graph, calibration, a nearest-note lock or
  target. Cut first under pressure: the E2 low end, then the harmonic test
  tone (Q10).
- The tuner screen's design is a Claude Design prototype iterated by the
  user, imported and vendored under `design/`; it decides the readout and
  the way in and out; `sdd-specify` waits for it (Q11).
- Acceptance: the measured harness at converge and finish and against the
  phone, plus the user's walk on the phone with the flute; the user signs
  off (Q12).
- Vocabulary proposed for the glossary: **Tuner** (UI) — the screen that
  listens and shows the detected pitch against the nearest note; **Nearest
  note** (`theory`) — the note whose pitch under the temperament is closest
  to a detected pitch, with the offset in cents. "Detected pitch" and
  "Cents" already exist and are used unchanged.

## Assumptions carried

- The nearest note to a frequency, and the cents offset, is a
  `theory.temperament` fact (the inverse of its REQ-001), not arithmetic in
  the view — risk if wrong: a theory question ends up in the UI;
  `sdd-specify` can place it either way without changing behaviour.
- A detector that reaches E2 fits inside 100 ms alongside the phone's own
  microphone capture latency — risk if wrong: the low end is the first cut
  (Q10) and the budget stands.
- The harness can feed a known tone to the page as its microphone in
  headless Chromium, as playback's harness timestamps onsets today — risk if
  wrong: the measurement needs another route, found at the plan's spike.

## Still open

- What the readout shows — note name and octave, the cents offset, an
  in-tune band and its width, Hz or not, whether the nearest note is named
  at all — blocks: the proposal's readout requirement; the design decides
  before `sdd-specify` (Q6).
- The way in and out — which control on the practice screen enters the
  tuner and how it is left — blocks: the same; the design decides (Q4, Q11).

## Riskiest unknown

Whether a flute — and a low E2 — can be heard and named on the phone within
100 ms of the sound, every time, with the microphone's own capture latency
already spent before detection begins.
