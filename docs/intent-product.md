---
type: Intent
title: Music Learning Assistant — product intent
description: Helps to learn music on an instrument
resource: /docs/intent-product.md
status: stable
tags: [sdd, intent, product]
sources:
  - resource: conversation:2026-09-19
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T16:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:14:28Z
sdd_phase: resolved
---

# Intent: Music Learning Assistant

> The user's words. A proto-product-brief: what is wanted, why, and under
> which constraints — captured before anything is formalised. `sdd-init`
> Step 3 reads this to draft `docs/product.md`; it does not re-ask what is
> answered here.

## Problem

Learning scales, arpeggios and music theory on an instrument without a
teacher: there is nothing to play along with, so practising them alone is
unguided.

## Proposed outcome

A tool that plays the notes of scales, arpeggios and similar theory material,
so the learner can play along on their instrument and learn the theory
through playing it. A session: pick a scale and how to traverse it; depending
on the mode, either the tool plays through the notes and the learner follows,
or the tool shows the note to play and follows the learner — advancing when
they nail the note for the right duration. The display is oriented around the
circle of fifths as well as the stave, with tooltips teaching the theory
behind what's shown. The tool can also hold a drone, and can listen to the
learner's pitch and say whether they are sharp or flat on the current note.

## Affected users and systems

The user themselves: self-taught, no lessons, learning music theory alongside
the instrument. Currently flute, but plays several instruments.

## Constraints

- Not tied to a single instrument — must be usable across the instruments the
  user plays.
- Must run on a laptop at least; being usable on a phone on a music stand is
  the preferred practice-time interface. Both is the goal; which feels best
  is to be discovered.
- The instrument is the main focus; the app is an aid. It must stay simple
  and must not distract during practice — a complicated or attention-grabbing
  tool defeats the purpose and is the abandonment condition.
- Sole developer is a principal software engineer: very comfortable with
  full-stack web apps and systems programming; no iOS/Android native app
  experience (context, not a stack choice — the stack is chosen at the first
  plan).

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: What's the itch — what's annoying, slow, or hard today?

**Recommended:** No feedback between lessons.
**Answer:** Self-taught, learning theory alongside the flute; currently on
scales and arpeggios. Wants a tool that plays the notes of scales etc. to
play along with — theory learned on the instrument, not on paper. Must not be
flute-only; will be used with other instruments.
**Status:** decided

### Q2: Describe a session as if it existed — pick a scale, tool plays notes, you play along, stave + note names shown?

**Recommended:** The sketch above (pick scale + tempo, tool plays notes, stave display).
**Answer:** Yes, plus: oriented around the circle of fifths, not just a
stave (finding it a very powerful tool). Options for how to traverse: up and
down one octave, two octaves, arpeggios in 1–2 octaves. Choice of just vs
equal temperament. Tooltips that teach the theory behind what's on screen.
A drone in different notes/scales — for pitching wind instruments and tuning
strings (guitar later, not the main focus). It should hear the learner and
say if they're sharp or flat on the current note, like a tuner app.
Modes: either the tool leads (plays notes, learner follows) or the learner
leads (tool shows the note, listens, and advances when the note is nailed
for the right duration).
**Status:** decided

### Q3: What is this definitely not?

**Recommended:** Not a gamified course, not a sheet-music/song player, not a practice diary.
**Answer:** Agreed on all three — hates gamified apps. Not for playing sheet
music. No progress tracking. It's a tool to understand and learn the
instrument and theory at your own pace.
**Status:** decided

### Q4: Who is this for — just you, or others?

**Recommended:** Just you, primarily.
**Answer:** Just me, primarily. If others can use it, fine, but no design
effort goes into other people's needs.
**Status:** decided

### Q5: What device(s) must it work on while practising?

**Recommended:** Laptop first, others a bonus.
**Answer:** Laptop at least, for performance reasons. When practising, a
small device on a music stand (phone) is the more helpful interface. Usable
on both would be good; will see what feels best.
**Status:** decided

### Q6: Smallest version still useful — what's the core, what's cut first?

**Recommended:** Core: pick a scale from the circle of fifths, choose the
traversal (1–2 octaves, up/down, arpeggio), the tool plays it, you play
along. Cut first: listening mode, drone, temperament choice, tooltips.
**Answer:** Agreed.
**Status:** decided

### Q7: What proves v1 works, and what would make you abandon it?

**Recommended:** Proof: a real practice session through your current scales
and arpeggios with the tool, good enough that you reach for it next session
unprompted.
**Answer:** Agreed on the proof. Abandon if it gets too complicated to use
or too distracting during practice — the instrument is the main focus, the
app is an aid. If it pulls concentration away from the instrument it
hinders learning.
**Status:** decided

### Q8: What are you most unsure about / expect to be hard?

**Recommended:** The listening features — hearing the flute reliably and
judging sharp/flat fast enough to be useful.
**Answer:** Exactly that: whether the app can hear the note pitch correctly
fast enough for live feedback. If feedback arrives slightly too late it
completely throws off the practice — it needs to work really smoothly, or
it's not useful.
**Status:** decided

## Resolved

- The product is a play-along theory-practice companion for scales,
  arpeggios and drones — because the user is self-taught and wants theory
  learned on the instrument, not on paper.
- Instrument-agnostic — because the user plays several instruments (flute
  now, guitar possibly later).
- Oriented around the circle of fifths as well as the stave — because the
  user finds the circle a powerful learning tool.
- Traversal options: 1 or 2 octaves, up/down, scales and arpeggios — stated
  directly.
- Two modes: tool leads (plays, learner follows) and learner leads (tool
  shows the note, listens, advances when nailed for the right duration).
- Also wanted: just vs equal temperament choice, theory tooltips, a drone in
  different notes/scales (wind pitching, string tuning).
- Not a gamified app, not a sheet-music/song player, no progress tracking —
  the user hates gamified apps; learning at their own pace.
- Primarily for the user alone; others are incidental.
- Runs on a laptop at least; a phone on a music stand is the preferred
  practice-time interface; both is the goal.
- Smallest useful version: pick a scale from the circle of fifths, choose
  traversal, tool plays it, learner plays along. Listening, drone,
  temperament and tooltips are cut first.
- v1 proof: a real practice session through current scales/arpeggios, good
  enough to reach for again unprompted.
- Abandonment condition: too complicated or too distracting during practice
  — the instrument must stay the focus.

## Assumptions carried

- No imposed deadline, budget, data-location or integration constraints —
  risk if wrong: constraints surface mid-build and force rework.
- Practising happens somewhere the device can hear the instrument clearly
  enough for pitch feedback — risk if wrong: the listening features
  underperform in the real practice room.

## Still open

- How tightly "usable on a phone" binds v1 — blocks: nothing yet; to be
  discovered by using it ("see what feels best").

## Riskiest unknown

Whether note pitch can be heard and judged fast enough for live feedback —
lag that arrives even slightly late throws off practice entirely.
