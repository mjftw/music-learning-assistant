---
type: Design Principles
title: Design
description: How this product looks and behaves — where it is used, its tone, its interaction rules; and, once the first plan has chosen the UI stack, the tokens and patterns every screen is built from.
resource: /docs/design.md
status: stable
tags: [sdd, design]
sources:
  - resource: conversation:2026-09-27
  - resource: /docs/product.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-27T10:45:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T11:13:59Z
sdd_phase: principles
sdd_version: 0.1.0
sdd_interface: yes
master: ~/.config/sdd/design-taste.md
---

# Design

> Two halves, filled at different times. **Principles** (§1–§6) are gathered
> at `sdd-init`, in the user's words, with no technology in them; they say
> where the product is used and how it should feel. **System** (§7–§9) is
> filled at the first `sdd-plan` that touches a screen, once the UI stack is
> chosen; it is the tokens and patterns every screen is built from, and it
> grows as refinement loops settle things. `sdd-design` owns this file.
>
> If `sdd_interface` is `no`, only §1 is filled and every change skips design.

## 1. Interface

**Does this product have an interface people look at?** Yes — a phone-first
web app, one phone-proportioned column, also used on a laptop; six shipped
changes (001–006) already have screens. Written from that evidence at the
first change to add a screen after this file existed (007), not asked.

## 2. Situations of use

> Where the person is, what else they are doing, what their hands and eyes are
> free for. Each row constrains every screen. From `docs/product.md`.

| Situation | Device / distance | Hands | Attention | Consequence for the interface |
|---|---|---|---|---|
| Practising — playing along with a run, or against the drone | Phone on a music stand, arm's length (~60–80 cm) | On the instrument | Mostly on the instrument; the screen is glanced at | Large targets; readable at arm's length; nothing timed; nothing that needs a tap mid-sequence; the important thing glanceable |
| Setting up / exploring the theory — choosing key, scale, traversal, tempo; reading the circle | Phone in hand, or laptop at a table | Free | Full | Sheets and the drawer may carry detail; the laptop shows the same phone-proportioned column, centred |
| Tuning (from 007) — playing long tones and checking them | Phone on the stand, arm's length | On the instrument | Glancing between breaths | One thing on screen; the reading legible in the corner of the eye; motion that tracks the breath without jitter |

Later, not yet a row: a tablet mode (larger screen, likely landscape) and a
real laptop layout — the user's stated intent (2026-09-27), to be added when
that change is grilled.

## 3. Tone

- **Calm** — rules out badges, streaks, red dots, celebrations, anything that
  pulses for attention.
- **Instrument-like** — rules out chrome, marketing, onboarding tours,
  empty-state illustrations; controls feel like parts of a tool.
- **Paper-like** — the circle and the stave read like the paper on the stand;
  rules out glossy cards, gradients and shadows for their own sake.
- **Unhurried** — nothing times out, nothing auto-advances the interface,
  nothing animates unless it shows time passing (the sounding note, a
  needle).
- **Teaching** — the theory is visible, not hidden behind help; but never a
  lecture in the practice view.

## 4. Density and hierarchy

Lots of functionality on a very simple to understand UI which is intuitive
to use (the user's own principle). On the practice screen, always visible:
the circle with the key selected, the drone pill in its centre, the key
panel (stave or names), the transport with the sounding note and tempo, and
the one-line summaries that open the sheets. One tap away: the Traversal,
Scale, Tempo and Drone sheets, and the instrument picker. Hidden until
asked for: the settings drawer (display preferences); notices only when
something is wrong. The first thing the eye must find — idle: the selected
key on the circle; playing: the sounding note; on the tuner: the reading —
and nothing else competes with it.

## 5. Interaction conventions

> Rules that hold on every screen. Each is testable and most become
> requirements in the deltas that touch a screen.

- Nothing needs a tap while sound is in progress: a run, the drone or the
  tuner never asks for interaction; a control mid-sequence is optional,
  never required.
- Opening a sheet, the drawer or the picker never stops sound or listening.
  (The tuner is the one exception in reverse: entering it is what stops
  sound.)
- Every control is reachable one-handed on the phone and hit-able at arm's
  length: targets no smaller than a fingertip; no long-press or drag as the
  only way to do anything.
- Nothing disappears or changes on its own except to show time passing: no
  timed toasts, no auto-dismiss; a notice stays until what it reports is
  fixed or it is dismissed; the sounding note and the tuner reading are the
  only things that move unasked.

## 6. Accessibility baseline

WCAG 2.1 AA is the aim, not a gate, while the app is the user's own
(2026-09-27): colour is used to the full, and a secondary indicator (a
shape, a word, a position) is preferred wherever it costs nothing, never
required. Revisit — AA as the floor — when the app is shared with others.
Held regardless, from §2: the first thing on every screen is legible at
60–80 cm on a phone; usable in a dim room under a stand light, so no thin
hairlines carry meaning; text scales with the phone's setting; motion
respects reduce-motion except where the motion is the information; and no
sound is ever the only signal of anything — every notice is visible.

## Taste (cross-project)

> What the user likes and hates, wherever the product. Seeded from
> `~/.config/sdd/design-taste.md` if it exists; refined over time and synced
> back on request. Never a decision for this product; an input to §7–§9.

**Likes:** quiet, paper-like surfaces; a few strong accents; everything on
one screen, with sheets for detail; dense information laid out so it reads
at a glance; controls that look like the tool they are.

**Hates:** gamified nudges (streaks, confetti, badges); onboarding tours;
modal dialogs for things that are not decisions; chrome and marketing
inside a tool; motion for its own sake.

---

## 7. Approach

> Filled at the first plan that touches a screen. Technology lives here and
> nowhere above this line.

- **UI stack:** <from `plan.md`; the plan chose it, this records it>
- **Components:** <a library, or hand-rolled; if a library, which and why>
- **Styling:** <how styles are written; where the tokens file lives>
- **Wireframe fidelity for new screens:** <grey boxes only, until the loop>

## 8. Tokens

> The only values screens may use. `scripts/check-design.sh` warns about
> hard-coded colours, sizes and fonts outside the tokens file. A value that a
> refinement loop settled is promoted here at the loop's exit.

| Token | Value | Used for |
|---|---|---|
| | | |

## 9. Patterns

> Things that won a refinement loop and should be reused, not re-decided.
> One row each: what it is, which change settled it, the reference screen.

| Pattern | Settled by | Reference | Rule |
|---|---|---|---|
| | | | |

## Screens

> The living index of screens and states as they are now, with the reference
> screenshot each one converged to. Updated at `sdd-finish` from the change's
> `design/reference/`. The fidelity pass compares against these.

| Screen | State | Route | Reference | Since |
|---|---|---|---|---|
| | | | | |

## Refinement log

| Date | Change | Section | What changed | Why |
|---|---|---|---|---|
