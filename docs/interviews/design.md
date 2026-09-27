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
sdd_phase: open           # open | closed
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

## Not asked

> Questions the interview deliberately skipped, and why (already decided in
> `docs/decisions.md`, out of scope, deferred to a later phase). Each is a
> line. This is what a future reader checks before re-asking.

- "Does this product have an interface people look at?" — six shipped
  changes with screens answer it (a phone-first web app, also used on a
  laptop); §1 is written from that, not asked.
- Colours, fonts, components, tokens — §7–§9 are asked at the plan, never
  here.
