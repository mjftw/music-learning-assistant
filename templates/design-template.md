---
type: Design Principles
title: Design
description: How this product looks and behaves — where it is used, its tone, its interaction rules; and, once the first plan has chosen the UI stack, the tokens and patterns every screen is built from.
resource: /docs/design.md
status: draft
tags: [sdd, design]
sources:
  - resource: conversation:YYYY-MM-DD
  - resource: /docs/product.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_phase: draft          # draft | principles | approved
sdd_version: 0.1.0
sdd_interface: unknown    # yes | no | unknown
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

**Does this product have an interface people look at?** <yes / no — one line
on what kind: a phone web app, a desktop app, a terminal UI, a dashboard, an
e-ink display, none>

## 2. Situations of use

> Where the person is, what else they are doing, what their hands and eyes are
> free for. Each row constrains every screen. From `docs/product.md`.

| Situation | Device / distance | Hands | Attention | Consequence for the interface |
|---|---|---|---|---|
| | | | | |

## 3. Tone

<Three to five words the user chose, and one sentence each on what they rule
out. "Calm" rules out badges, streaks, red dots. "Instrument-like" rules out
chrome, marketing, onboarding tours.>

## 4. Density and hierarchy

<One paragraph: how much is on a screen at once, what is always visible, what
is one tap away, what is hidden. What the eye must find first on every screen.>

## 5. Interaction conventions

> Rules that hold on every screen. Each is testable and most become
> requirements in the deltas that touch a screen.

- <e.g. Nothing requires a precise tap while the instrument is being played.>
- <e.g. Every state is reachable with one hand.>
- <e.g. No timed interactions; nothing disappears on its own.>

## 6. Accessibility baseline

<The floor. Contrast, target size, motion, text scaling, screen reader. Name
the standard if there is one (WCAG 2.1 AA), and any situation-specific
additions from §2 (readable at arm's length, usable in a dim room).>

## Taste (cross-project)

> What the user likes and hates, wherever the product. Seeded from
> `~/.config/sdd/design-taste.md` if it exists; refined over time and synced
> back on request. Never a decision for this product; an input to §7–§9.

<taste>

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
