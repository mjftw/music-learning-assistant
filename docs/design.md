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
  - by: human:merlin-webster
    at: 2026-09-27T22:18:38Z
  - by: human:merlin-webster
    at: 2026-09-29T19:10:23Z
  - by: human:merlin-webster
    at: 2026-09-29T22:21:12Z
  - by: human:merlin-webster
    at: 2026-10-05T12:00:15Z
  - by: human:merlin-webster
    at: 2026-10-05T13:00:03Z
sdd_phase: approved
sdd_version: 1.2.0
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

- **UI stack:** TypeScript (strict) SPA — React 19 + Vite, one
  phone-proportioned column (390 px) centred on wider viewports; chosen at
  001's plan, recorded here at 007's (the first plan after this file
  existed).
- **Components:** hand-rolled. Six shipped changes have needed no library;
  the design's controls are plain shapes (pills, sheets, a drawer, SVG for
  the circle, the stave and the spiral). The shared pieces live in
  `src/ui/overlay.tsx` (`BottomSheet`, `OverlayScrim`, `OverlayHeader`).
- **Styling:** inline style objects built from named constants at the top
  of each component; every colour, font, radius and duration comes from
  the tokens file **`src/ui/theme.ts`** (`paper`, `fonts`, and from 007
  `tuner`). Self-hosted fonts via `@fontsource` (no runtime network —
  Article VII). Global CSS is `src/ui/global.css` only (page background,
  tap-highlight, focus, button font inheritance).
- **Wireframe fidelity for new screens:** grey boxes, or the vendored
  Claude Design prototype where the change imported one, until the
  refinement loop on the live build (entry point D).

## 8. Tokens

> The only values screens may use. `scripts/check-design.sh` warns about
> hard-coded colours, sizes and fonts outside the tokens file. A value that a
> refinement loop settled is promoted here at the loop's exit.

Promoted at 007's plan from what 001–006 already used (`src/ui/theme.ts`
is authoritative for the values; this table names the roles). The lead
rows were promoted at 008's exit from the Learner Leads handoff.

| Token | Value | Used for |
|---|---|---|
| `paper.frame` | `#efe9dc` | the app column's background |
| `paper.card` | `#f7f3ea` | cards, sheets, the drawer, pills |
| `paper.disc` | `#fbf8f1` | the circle's centre disc, the tempo stepper, the spiral hub |
| `paper.ink` | `#1c1916` | primary text, the big note name |
| `paper.inkSoft` | `#2b2620` | stave lines, noteheads, clefs |
| `paper.muted` | `#6f675c` | secondary text, hints, "halfway to" |
| `paper.mutedMore` | `#7a7167` | the header's range label, ‹ |
| `paper.faint` | `#9a9186` | chevrons, tick labels, "Play a note", a greyed target name, LISTENING when off |
| `paper.border` | `#cfc6b4` | pill and column borders |
| `paper.borderSoft` | `#ddd4c2` | card borders, the level's centre line, the progress track |
| `paper.drawerBorder` | `#d5cbb8` | sheet and drawer edges; the "cannot hear" dash |
| `paper.hairline` | `#e6ddcc` | row separators (strong) |
| `paper.hairlineSoft` | `#ece4d5` | row separators (soft) |
| `paper.pillActive` | `#e7dcc6` | the selected pill in a segmented control |
| `paper.pillInk` | `#756c60` | an unselected pill's label in a segmented control |
| `paper.accent` | `#8a4b2a` | ▶, the sounding note, the tonic, the distance ring's warm end, TARGET when pinned |
| `paper.trackOff` | `#c8bfad` | a switch's off track |
| `paper.scrim` | `rgba(28,25,22,.32)` | behind sheets and the drawer |
| `tuner.sharp` | `oklch(0.55 0.11 28)` | a sharp reading — line, tag, cents, head (warm, as the circle's sharpward end) |
| `tuner.flat` | `oklch(0.55 0.11 258)` | a flat reading (cool, as the circle's flatward end) |
| `tuner.inTune` | `oklch(0.55 0.11 150)` | a reading inside the in-tune band |
| `tuner.band` | `oklch(0.90 0.045 150)` | the in-tune band behind the level and the stave |
| `tuner.targetHead` | `#a39a8c` | the pinned target's grey notehead |
| `tuner.ghostInk` | `#8a8175` | the target head's accidental and octave mark |
| `lead.holdFill` | `oklch(0.80 0.07 150)` | the hold filling the in-tune band on the target note, left to right (the band, line and verdict colours of a lead run are `tuner.band` / `tuner.inTune` / `tuner.flat` / `tuner.sharp` — one value per role) |
| `modeWords.glyphCentre` | `#f9f4e9` | a glyph on the accent circle — ▶, ❚❚, ■, the Tuner glyph's centre bar |
| `modeWords.glyphOuter` | `rgba(249,244,233,.6)` | the Tuner glyph's two outer bars |
| `modeWords` (metrics) | gap 16 · underline 2 px, 4 px below · 4 px vertical padding · glyph bars 3 px wide, 3 px apart, 10 / 20 / 10 px tall, bottom-aligned | the "play along / I lead" words under the caption; the Tuner glyph in the start circle |
| `leadCard` (metrics) | target letter 40 (display) · octave 12 (mono 600) · no-mic title 14 / 600 · body 12.5, line-height 1.45 | the live lead card and the no-microphone card |
| `noteMeter` (metrics) | box 40 px tall = ±50 ¢ (0.4 px per cent) · stave band 26 px wide, line 2 px past it each side · names band inset 6, line inset 3, box 13 px from the cell's top · band radius 3 · line 2 px, radius 1 | the meter on the target note, stave and names |
| `sheetRow` (metrics) | row 62 px, padding 0 18 · label 13 / 600 · hint 11 on a 14 px line in a 28 px two-line box · pill padding 9 10 10, radius 10, 12.5 / 600 · switch 36 × 20, knob 14 at 3 / 19 · ✕ 28 px | a sheet row with a hint: label and hint left, control right; a sheet built from these never changes height |
| `fonts.body` | Public Sans (400/500/600/700) | labels, buttons, prose |
| `fonts.display` | Instrument Serif | the key name, the big note name (164 px on the tuner), sheet titles' numerals |
| `fonts.mono` | JetBrains Mono (400/500/600) | captions, cents, Hz, tempo, formulas, tick labels, TARGET |
| `fonts.music` | Noto Music | clefs, accidentals, note-length glyphs |
| type scale | 164 · 40 · 22 · 20 · 17 · 15 · 14.5 · 14 · 13 · 12.5 · 12 · 11.5 · 11 · 10.5 · 10 · 9.5 px | the sizes the designs use; a new size is a departure noted in `notes.md` |
| spacing | 2 · 4 · 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 24 px | gaps and padding |
| radii | 999 (pill) · 18 (the column) · 16 (transport card) · 14 (cards, sheets' rows) · 12 (tiles) · 10 (segmented pills) · 6 (tags) · 4 (the level's line) · 3 (the meter's band) · 1 (the meter's line) | corners |
| motion | sheet slide `.34s cubic-bezier(.32,.72,0,1)` · scrim `.26s ease` · the tuner head and cents, and the meter's line on the note, `.18s cubic-bezier(.3,.7,.3,1)` · drone pill `.2s ease` | the only animations; every one shows a state change or time passing (§3 Unhurried) |
| `motion.lingerHoldMs` | 600 ms | how long a reading that has stopped stays, grey, before it fades |
| `motion.lingerFadeMs` | 200 ms | the fade of a lingering reading; "Play a note" coming in |

## 9. Patterns

> Things that won a refinement loop and should be reused, not re-decided.
> One row each: what it is, which change settled it, the reference screen.

| Pattern | Settled by | Reference | Rule |
|---|---|---|---|
| A screen fits the visible height | 007 round 5 | `changes/007-hear-me/design/reference/tuner--listening--360x660.png` | The screen is exactly the visible height, following the browser's bars (`.visible-height`: `100vh`, then `100dvh`). Blocks of fixed height keep their size and one region flexes, its scale shrinking with it. Text never shrinks. Below the flexing region's minimum the page scrolls. |
| What was heard goes grey | 007 rounds 2–4 | `changes/007-hear-me/design/reference/tuner--target-pinned.png` | Anything that shows a past sound rather than a live one is grey (`paper.faint`, `tuner.ghostInk`) and is not updated: the lingering reading, the trail in silence, the spiral's needle on the last note heard. It is hidden from assistive technology. |
| A live reading is never delayed by motion | 007 round 4 | `changes/007-hear-me/design/reference/tuner--listening.png` | Holds and fades apply only to what is going away. A new reading appears at once, at full strength. Reduced motion removes what is going away at the end of the same time, without fading. |
| Readings are smoothed, jumps are not | 007 round 1 | `changes/007-hear-me/design/reference/tuner--listening.png` | A live value that jitters is low-pass filtered (a tenth of the way per reading); a change larger than the jitter (25 ¢) is shown at once, as is the first reading after silence. |
| The reading is on the note | 008 (the Learner Leads handoff) | `changes/008-learner-leads/design/reference/practice--holding.png` | When the learner is judged against a note, the judgement is drawn on that note — band behind it, line in front, fill for time held — so there is one place to look. The card repeats it in words; it never carries a second meter. Paint order is DOM order, never a negative z-index. |
| A card keeps one structure in every state | 008 (decided 2026-10-02, kept 2026-10-05) | `changes/008-learner-leads/design/reference/practice--listening-silent.png` | The transport card carries the same rows idle, playing, leading, complete and without a microphone: the circle, the caption column with the mode words beneath it, the tempo. A state changes what a row says, not which rows exist — so nothing moves under the finger. Where a prototype's state omits a row, the row stays (the live lead card is about 40 px taller than the prototype's, accepted). |
| A sheet never changes height | 008 (the Learner Leads handoff) | `changes/008-learner-leads/design/reference/practice--sheet-i-lead.png` | Rows that depend on a mode swap in place, the same number either way, every row the same height with its hint; the close control lives in the first row. |

## Screens

> The living index of screens and states as they are now, with the reference
> screenshot each one converged to. Updated at `sdd-finish` from the change's
> `design/reference/`. The fidelity pass compares against these.

| Screen | State | Route | Reference | Since |
|---|---|---|---|---|
| `practice` | `way-in` — the Tuner pill in the header | `/` | `docs/design/screens/practice--way-in.png` | 007-hear-me |
| `tuner` | `listening` | `/` then the Tuner pill | `docs/design/screens/tuner--listening.png` (at 360 × 660: `tuner--listening--360x660.png`) | 007-hear-me |
| `tuner` | `silent` | `/` then the Tuner pill, no signal | `docs/design/screens/tuner--silent.png` | 007-hear-me |
| `tuner` | `cannot-hear` | `/` then the Tuner pill, microphone refused | `docs/design/screens/tuner--cannot-hear.png` (at 360 × 660: `tuner--cannot-hear--360x660.png`) | 007-hear-me |
| `tuner` | `target-pinned` | `/` then the Tuner pill, then Hold or a wedge | `docs/design/screens/tuner--target-pinned.png` | 007-hear-me |
| `tuner` | `target-sheet` | `/` then the Tuner pill, then TARGET | `docs/design/screens/tuner--target-sheet.png` | 007-hear-me |
| `practice` | `idle-play-along` — the mode words under the caption, play along underlined | `/` | `docs/design/screens/practice--idle-play-along.png` | 008-learner-leads |
| `practice` | `idle-i-lead` — the Tuner glyph in the circle, "hold N beat(s) · <tolerance> tuning" | `/` then "I lead" | `docs/design/screens/practice--idle-i-lead.png` | 008-learner-leads |
| `practice` | `playing-play-along` — ❚❚, "<note> · k of N", the mode words where the progress bar was | `/` then ▶ | `docs/design/screens/practice--playing-play-along.png` | 008-learner-leads |
| `practice` | `listening-silent` — ■, the target letter, "Play <target>"; the band on the target, no line | `/` then "I lead", the circle; no signal | `docs/design/screens/practice--listening-silent.png` | 008-learner-leads |
| `practice` | `heard-out-of-tune` — the line outside the band in the flat or sharp colour | as `listening-silent`, a tone off the target | `docs/design/screens/practice--heard-out-of-tune.png` | 008-learner-leads |
| `practice` | `holding` — "in tune · holding", the band filling | as `listening-silent`, an in-tune tone held | `docs/design/screens/practice--holding.png` | 008-learner-leads |
| `practice` | `holding-meter-off` — Cues → meter off: the highlight and the judgement, no band, fill or line | the sheet → Cues → meter off, then as `holding` | `docs/design/screens/practice--holding-meter-off.png` | 008-learner-leads |
| `practice` | `advanced` — the held note ink, the next the target, "<note> held ✓" | as `holding`, to the advance | `docs/design/screens/practice--advanced.png` | 008-learner-leads |
| `practice` | `complete` — "N of N held · <range>", "All held", the start circle back | loop off, every note held | `docs/design/screens/practice--complete.png` | 008-learner-leads |
| `practice` | `no-microphone` — "Can't hear — no microphone" beside the circle, its line below | `/` then "I lead", the circle; microphone refused | `docs/design/screens/practice--no-microphone.png` | 008-learner-leads |
| `practice` | `sheet-play-along` — Who leads, Sound, Count-in, Rest bar, the hairline, Direction, Octaves, Shape, Loop | `/` then edit › in play along | `docs/design/screens/practice--sheet-play-along.png` | 008-learner-leads |
| `practice` | `sheet-i-lead` — Who leads, Hold, In tune, Cues, the hairline, the shared rows; the same height | `/` then edit › in I lead | `docs/design/screens/practice--sheet-i-lead.png` | 008-learner-leads |

## Refinement log

| Date | Change | Section | What changed | Why |
|---|---|---|---|---|
| 2026-09-28 | 007-hear-me | §9 | Round 1: the shown offset is low-pass filtered; a jump of more than 25 ¢ is shown at once | "it jumps around 'in tune' a lot and it's quite jarring" |
| 2026-09-28 | 007-hear-me | §9 | Round 2: Hold and the spiral's needle remember the last note heard, greyed | "press hold … without needing to press while you're playing which is often not possible" |
| 2026-09-28 | 007-hear-me | §9 | Round 3: the stave's trail is 2.5 s, placed by age, and drifts off in silence | the trail "gets wiped as soon as no note which feels jarring" |
| 2026-09-28 | 007-hear-me | §8, §9 | Round 4: the last reading lingers grey 0.6 s and fades over 0.2 s — `motion.lingerHoldMs`, `motion.lingerFadeMs` | "very abrupt how quickly everything disappears … could it do more of a soft fade out?" |
| 2026-09-29 | 007-hear-me | §9 | Round 5: the tuner fits the visible height; the level flexes | "too tall and doesn't fit on my phone without scrolling" (Galaxy S24, 360 px wide) |
| 2026-09-29 | 007-hear-me | §8 | The motion row no longer lists the strip's `.35s` vertical centring | the code never had it; nobody missed it |
| 2026-10-05 | 008-learner-leads | §8 | `paper.pillInk`, `lead.holdFill`, the two glyph colours, the `modeWords` / `leadCard` / `noteMeter` / `sheetRow` metrics, radii 3 and 1, the meter line's motion | "Promote all" — what the Learner Leads handoff specified and the build used |
| 2026-10-05 | 008-learner-leads | §9 | The reading is on the note; a card keeps one structure in every state; a sheet never changes height | the handoff's "the learner looks in one place only"; the mode words kept on the live card over the prototype's shorter one ("Keep the words") |
