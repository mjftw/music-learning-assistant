---
type: Interview Record
title: design — interview record
description: Every question asked in the design interview, the recommendation offered, and the user's answer in their own words — so the reasoning behind docs/design.md is never only in a chat window.
resource: /docs/interviews/design.md
status: draft
tags: [sdd, interview, "phase:design"]
sources:
  - resource: conversation:2026-09-27
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T10:45:00Z
verified: []
sdd_phase: closed
---

# Interview record — design

> Written as the interview happens, one block per question, in the same
> shape `grill` uses for an intent. The artefact this interview produced is
> the summary; this file is the evidence. Recommendations the user overrode
> are the most valuable lines here: they are the places the agent would have
> got it wrong.
>
> Blocks are appended, never edited. A question asked again in a later
> session gets a new block that names the earlier one.

**Produced:** `docs/design.md`

## Questions

### Q1: §2 — What are the situations of use, and what does each demand of every screen?
**Recommended:** Three rows from the product brief: (1) Practising — phone
on a music stand at arm's length (~60–80 cm), hands on the instrument,
eyes mostly on the instrument → large targets, readable at arm's length,
nothing timed, nothing that needs a tap mid-sequence, the important thing
glanceable. (2) Setting up / exploring the theory — phone in hand or laptop
at a table, hands free, full attention → sheets and the drawer may carry
detail; the phone-proportioned column is what the laptop shows. (3) Tuning
(new with 007) — phone on the stand, playing long tones, glancing between
breaths → one thing on screen, the reading legible in the corner of the
eye, motion that tracks the breath without jitter. Because the brief says
phone-on-the-stand preferred, laptop at least, home only; and 002–004 were
designed and accepted that way.
**Answer:** All three, as proposed.
**Status:** decided
**Became:** `docs/design.md` §2, three rows

### Q2: §3 — Which words describe the tone, and what does each rule out?
**Recommended:** Five, drawn from the intents and the prototypes the user
chose ("Function Paper", the woody click, the friendly tone, "the
instrument is the focus"): Calm — no badges, streaks, red dots,
celebrations, nothing that pulses for attention; Instrument-like — no
chrome, marketing, onboarding tours, empty-state illustrations, controls
feel like parts of a tool; Paper-like — the circle and the stave read like
the paper on the stand, no glossy cards, gradients or shadows for their
own sake; Unhurried — nothing times out, nothing auto-advances the
interface, nothing animates unless it shows time passing (the sounding
note, a needle); Teaching — the theory is visible, not hidden behind help,
but never a lecture in the practice view.
**Answer:** All five.
**Status:** decided
**Became:** `docs/design.md` §3

### Q3: §4 — How much is on a screen at once; what is always visible, one tap away, hidden; what must the eye find first?
**Recommended:** From the shipped screens — always visible on the practice
screen: the circle with the key selected, the drone pill in its centre, the
key panel (stave or names), the transport with the sounding note and
tempo, and the one-line summaries that open the sheets; one tap away: the
Traversal, Scale, Tempo and Drone sheets and the instrument picker; hidden
until asked for: the settings drawer, and notices only when something is
wrong; first thing the eye must find: idle → the selected key on the
circle, playing → the sounding note, tuner → the reading, and nothing
competes with that thing.
**Answer:** "Yes, agree with all of that. A design principle is for it to
have lots of functionality on a very simple to understand UI which is
intuitive to use."
**Status:** decided
**Became:** `docs/design.md` §4, with the user's principle as its first
sentence

### Q4: §5 — Which interaction rules hold on every screen?
**Recommended:** Four, from §2–§4 and Article VI: (1) nothing needs a tap
while sound is in progress — a run, the drone or the tuner never asks for
interaction; (2) opening a sheet, the drawer or the picker never stops
sound or listening — already true of playback and the drone; the tuner is
the one exception in reverse, entering it is what stops sound; (3) every
control is reachable one-handed on the phone and hit-able at arm's length —
targets no smaller than a fingertip, no long-press or drag as the only way
to do anything; (4) nothing disappears or changes on its own except to
show time passing — no timed toasts, no auto-dismiss, a notice stays until
fixed or dismissed; the sounding note and the tuner reading are the only
things that move unasked.
**Answer:** All four.
**Status:** decided
**Became:** `docs/design.md` §5, four rules

### Q5: §6 — What is the accessibility floor?
**Recommended:** WCAG 2.1 AA as the floor (4.5:1 text, 3:1 noteheads,
needle and controls; text scales with the phone's setting; no information
by colour alone — the distance ring and the tuner reading carry a shape or
a word too; motion respects reduce-motion except where it is the
information), plus from §2: readable at arm's length (the first thing is
legible at 60–80 cm), usable in a dim room under a stand light (no thin
hairlines carrying meaning), no sound as the only signal of anything.
**Answer:** "The app is primarily for me. While I would like AA, I also
want to make sure we make best use of colour, and having a secondary
indicator where possible is better, but I personally don't need it. I'll
share the app with others eventually and that will be more of a concern,
but not quite yet. Also I am planning to do a tablet mode at some point,
so larger screen, likely landscape, and possibly make it work on laptop
too."
**Status:** decided — AA is the aim, not a gate: colour is used to the
full and a secondary indicator is preferred where it costs nothing, never
required; revisit when the app is shared. Tablet (landscape) and a real
laptop layout are later situations, noted in §2.
**Became:** `docs/design.md` §6; §2 gains a "later" line for tablet and
laptop layouts

### Q6: Taste — what do you like and hate in software interfaces, wherever the product?
**Recommended:** From what the user has chosen so far — likes: quiet,
paper-like surfaces; a few strong accents; everything on one screen with
sheets for detail; dense information laid out so it reads at a glance;
controls that look like the tool they are. Hates: gamified nudges
(streaks, confetti, badges); onboarding tours; modal dialogs for things
that are not decisions; chrome and marketing inside a tool; motion for its
own sake. Offered to save them to `~/.config/sdd/design-taste.md`.
**Answer:** Right, and save them.
**Status:** decided
**Became:** `docs/design.md` › Taste; mastered at
`~/.config/sdd/design-taste.md`

### Q7: §7–§8 (asked at 007's plan, sdd-design C) — the UI stack as the plan chose it, and the tokens
**Recommended:** §7: React 19 + Vite as the repo (the plan records it);
components hand-rolled (six shipped changes have no library; the design's
controls are plain shapes); styles as inline style objects built from
constants, with `src/ui/theme.ts` the tokens file (the `paper` palette and
`fonts` already live there and every screen reads them); new screens built
grey against the vendored design until the refinement loop. §8: the
existing `paper` palette (17 roles) and the four fonts promoted as they
are; the tuner adds four colours from the design — sharp
`oklch(0.55 0.11 28)`, flat `oklch(0.55 0.11 258)`, in-tune
`oklch(0.55 0.11 150)`, band `oklch(0.90 0.045 150)` — and two greys the
stave strip uses (target head `#a39a8c`, ghost ink `#8a8175`); the type
scale, spacing, radii and motion durations the shipped screens already
use, named. Because the repo has chosen all of this six times over; the
only new values are the tuner's.
**Answer:** Agree, as proposed.
**Status:** decided
**Became:** `docs/design.md` §7–§8; `scripts/check-design.sh` STYLE_GLOB /
TOKENS_FILE

### Q8: 007 design round 1 (sdd-design D) — the smoothing amendment to practice.tuner/REQ-002
**Recommended:** Approve as worded: the shown offset follows the detected
pitch through a low-pass filter (one tenth of the way per reading, about
100 ms), a detected pitch more than 25 ¢ from the shown pitch is shown as
detected at once, the first reading after silence / a change of shown note
/ a change of target is as detected, the Hz in the stave strip stays the
detected pitch; scenarios S6–S9. Because it is variant A as the user tried
it on the phone and chose it ("A is pretty good, I think a bit better than
C"; "B is bad"), and the first-readout budget is untouched. Offered
alongside: smooth the Hz too; lighter smoothing (one fifth per reading);
revise.
**Answer:** Approve (Recommended).
**Status:** decided
**Became:** `changes/007-hear-me/delta/practice/tuner.md` REQ-002 (the
smoothing clause, S6–S9); `changes/007-hear-me/design/rounds.md` round 1

### Q9: 007 design round 2 (sdd-design D) — Hold after the note has stopped (practice.tuner/REQ-004)
**Recommended:** Approve, the needle stays greyed: Hold pins the note
playing now or, while nothing is heard, the last note heard since the
tuner was entered; the Hold card names it ("what you're playing" / "the
last note you played" / "play a note first"); the spiral's needle stays
greyed on the last note heard; leaving forgets it. Because the hands are
on the flute while a note sounds (design §2), and the needle shows what
Hold will pin before it is tapped.
**Answer:** Approve, needle stays greyed (Recommended).
**Status:** decided
**Became:** `changes/007-hear-me/delta/practice/tuner.md` REQ-004 (S7,
S8), REQ-009/S3, REQ-003's last clause

### Q10: 007 design round 3 (sdd-design D) — the trail outlives the note (practice.tuner/REQ-005), and its length
**Recommended:** Approve, and try the lengths live: the trail moves left
with time; in silence nothing is added and what is drawn carries on
leftward until it has left the strip; a new note starts a new trail apart
from the old; the head, cents and Hz still clear. The build's trail is
about 0.5 s (50 readings at ~93 a second), the spec's 2.5 s (50 at the
prototype's 20 a second) — 2.5 s, 1.2 s and 0.5 s behind a temporary
switch, the length written to the delta after the choice. Because the
user has only seen the short one.
**Answer:** Approve, try lengths live (Recommended).
**Status:** decided
**Became:** `changes/007-hear-me/delta/practice/tuner.md` REQ-005 (S5,
S6), REQ-003's last clause; the length pending the live choice

### Q11: 007 design round 4 (sdd-design D) — the last reading lingers and fades (practice.tuner/REQ-003)
**Recommended:** Approve as worded: when the detected pitch stops the
last reading stays where it was, greyed and no longer updated, for 0.6 s,
fades over 0.2 s, and only then "Play a note" shows; a pitch detected
meanwhile is shown at once at full strength; reduced motion removes it at
the end of the same 0.8 s without fading; hidden from assistive
technology. Because it is the treatment and the timing the user chose on
the phone ("b but try with faster fade"; "Variant C is the best btw").
Offered alongside: the in-tune band on the strip lingering too; revise.
**Answer:** Approve (Recommended).
**Status:** decided
**Became:** `changes/007-hear-me/delta/practice/tuner.md` REQ-003 (the
linger clause, S4–S6, S1 and S3 reworded)

### Q12: 007 refinement loop, exit (sdd-design D) — what is promoted to docs/design.md
**Recommended:** Promote all: tokens `motion.lingerHoldMs` 600 ms and
`motion.lingerFadeMs` 200 ms; the motion row corrected (the strip's
`.35s` vertical centring removed — the code never had it); patterns "A
screen fits the visible height", "What was heard goes grey", "A live
reading is never delayed by motion", "Readings are smoothed, jumps are
not"; a Refinement log row per round; the spiral's 25 px inner wedges
recorded as an accepted exception. Offered alongside: choose; build the
`.35s` centring instead of removing it; not done yet.
**Answer:** Promote all (Recommended).
**Status:** decided
**Became:** `docs/design.md` §8, §9, Refinement log (v1.1.0);
`changes/007-hear-me/design/rounds.md` › Exit

## Not asked

> Questions the interview deliberately skipped, and why (already decided in
> `docs/decisions.md`, out of scope, deferred to a later phase). Each is a
> line. This is what a future reader checks before re-asking.

- "Does this product have an interface people look at?" — six shipped
  changes with screens answer it (a phone-first web app, also used on a
  laptop); §1 is written from that, not asked.
- Colours, fonts, components, tokens — §7–§9 are asked at the plan, never
  here.
