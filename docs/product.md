---
type: Product Brief
title: Music Learning Assistant
description: Helps to learn music on an instrument
resource: /docs/product.md
status: stable
tags: [sdd, product-brief]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/intent-product.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T16:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:28:50Z
sdd_phase: approved
---

# Music Learning Assistant

> What this is, for whom, and under what constraints. Written from the user's
> answers, in the user's words. Every later artefact reads this first.

## In one sentence

An app that plays the notes of scales and arpeggios for you to play along
with on your instrument, organised around the circle of fifths, teaching the
music theory behind what you are playing as you go.

## Problem

Learning scales, arpeggios and music theory on an instrument without a
teacher: there is nothing to play along with, so practising alone is
unguided. Theory stays on paper instead of being learned through the
instrument.

## Who it is for

| Who | Situation | What they need to be able to do |
|---|---|---|
| The developer (self-taught multi-instrumentalist) | Learning flute and music theory at the same time; also plays ocarina; no teacher or lessons; practice mixes sight-reading real music with theory work (currently scales and arpeggios) on the instrument; learns by understanding patterns and heuristics, not rote | Pick an instrument and a scale or arpeggio, hear its notes played within the instrument's range, play along, and absorb the theory (via the circle of fifths and explanations) while doing it |

**Explicitly not for:**
- People who want a gamified learning app (streaks, scores, levels).
- Learning or performing songs / sheet music.
- Anyone wanting progress tracking or a structured curriculum.

## What they do today instead

Practice mixes playing real music from sheet music (sight reading basic
pieces, improving but still error-prone) with theory work on the instrument,
so the patterns found in music become natural and reading comes easier. For
the theory half: a physical circle of fifths on the stand — find the scale's
root on the circle, work out which new sharp or flat this scale introduces
relative to the previous one, then play the scale and arpeggios up and down,
sometimes with a metronome. Pitch is checked by ear alone (experienced ear
from playing and singing, but no way to verify). The cost: nothing to play
along with, no confirmation of pitch, and the connecting patterns — the
heuristics that make theory understandable rather than rote-learned — have
to be worked out and remembered unaided. This tool serves the theory half of
that mix; playing from sheet music stays outside it.

## Success

Version one is a success when a real flute practice session — working
through the current scales and arpeggios playing along with the tool — is
better than practising without it, enough that the user reaches for it at
the next session unprompted.

## Out of scope — for the whole project

- Gamification of any kind: streaks, points, levels, scores.
- Playing or displaying sheet music / songs.
- Progress tracking and practice diaries.
- A structured curriculum or lessons; the user sets their own pace.
- Designing for other users' needs; others may use it, but it is built for
  one person.

## Constraints that exist before any code

> Only what is *imposed*: by the users, the environment, the law, the budget,
> the calendar. Anything you are free to choose is left blank here and chosen
> in the first plan, from the whole picture. "I'd like to use X" is a
> preference and goes in `docs/engineering.md`, not here.

| Constraint | Detail | Source |
|---|---|---|
| Must run on / where it has to live | A laptop at least (performance); a phone on a music stand is the preferred practice-time interface — both is the goal, which feels best to be discovered. Used at home only. | User |
| Instrument-agnostic, range-aware | Not tied to the flute; must be usable across the instruments the user plays — ocarina too (similar to flute, smaller range), guitar possibly later. The instrument is selectable and constrains the note range: it must never ask for a note the selected instrument cannot play. | User |
| Must not distract | The instrument is the focus; the app is an aid. Too complicated or too distracting during practice is the abandonment condition. | User |
| Live pitch feedback must be immediate | Feedback that arrives even slightly late throws off practice entirely; if it cannot be smooth it is not useful. | User |
| Data location / sovereignty | Personal use, home only; no imposed requirement. | — |
| Must integrate with | Nothing imposed. | — |
| Licensing | Nothing imposed. | — |
| Deadline / budget | None imposed. | — |

## Lifecycle

- **Deploy:** The user deploys it themselves, whenever they like; rollback is
  running the previous version.
- **Operate:** The user is the operator. "Broken" means it got in the way of
  a practice session.
- **Retire:** Abandoned if it becomes too complicated or too distracting
  during practice. No data of consequence to migrate or preserve.

## Open questions

| # | Question | Recommended answer |
|---|---|---|
| 1 | How tightly does "usable on a phone" bind v1? | Discover by using it — laptop first, phone when it earns its place. |
| 2 | Per-instrument fingerings for notes? | Deliberately deferred — a later feature, not needed now. |
