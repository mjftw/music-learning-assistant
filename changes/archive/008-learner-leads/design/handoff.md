# Handoff: 008 Learner leads

## Overview
008 adds a second way to practise on the existing practice screen.

- **Play along** (as shipped): the tool plays the run and the learner follows.
- **I lead** (new): the tool shows each target note and listens. Once the learner has held it in tune for N beats, it moves on to the next note.

Everything lives on the practice screen. There is no new screen. The pitch detection is 007's `PitchDetected` (ADR 0006), unchanged.

## About the design files
The files here are **design references built in HTML**. They are prototypes that show the intended look and behaviour, not production code. Recreate them in the existing app (`src/ui/*.tsx`, React + inline styles, `theme.ts` tokens), following its established patterns.

`Learner Leads Final.dc.html` shows all 11 screens. Open it in a browser next to `support.js`.

## Fidelity
**High fidelity.** Colours, type, sizes and copy are final. The base screen is the shipped 007 practice screen, and only the parts described below change.

## Screens / states (see the Final canvas, 01–11)

### Transport card — idle (01, 02)
- The card is as shipped: a 56 px ▶ circle in `#8a4b2a` with glyph `#f9f4e9`, then the caption column, then the tempo stepper and term.
- **Mode words:** under the caption, at the position of the old progress line, sits a flex row with gap 16:
  - It reads `play along` and `I lead` in Public Sans 12.5 / 600.
  - The selected word is ink `#1c1916` with a 2 px `#8a4b2a` underline (radius 2, 4 px below the text).
  - The unselected word is `#9a9186` with no underline.
  - Tap targets get 4 px of vertical padding.
- **When I lead is selected:**
  - The ▶ glyph in the big circle swaps for the Tuner glyph. It is three bars, each 3 px wide with a 3 px gap, at heights 10 / 20 / 10 px: the outer bars `rgba(249,244,233,.6)`, the centre bar `#f9f4e9`.
  - The caption becomes `hold {N} beat(s) · {tolerance} tuning`, for example `hold 2 beats · medium tuning`.
  - The page background does **not** change.
- **Behaviour:** one tap on a word selects the mode, and one tap on the circle starts it. The mode persists like the other traversal settings.

### Transport card — live (03–06)
- **Left:** a 56 px ■ stop circle.
- **Middle, the target line:**
  - The target letter is Instrument Serif 40 in `#8a4b2a`, with the octave in JetBrains Mono 12 / 600.
  - Beside it: the caption `{i} of {n}` in Mono 10.5 `#6f675c`, and the judgement in Public Sans 12.5 / 600.
- **Judgement copy and colour:**
  - Silent: `Play E4` in `#9a9186`.
  - Out of tune: `↓ 18 ¢ flat` in flat `oklch(0.55 0.11 258)`, or `↑ 12 ¢ sharp` in sharp `oklch(0.55 0.11 28)`.
  - Holding: `in tune · holding` in green `oklch(0.55 0.11 150)`.
  - Advanced: `E4 held ✓` in green.
- **Right:** the tempo stepper.
- **No meter in this card.** The meter lives on the note (next section).

### The meter on the target note (stave and names)
This is the core of the design: the learner looks in one place only.

- **Scale:** ±50 ¢ spans 40 px, centred on the target. Sharp is up and flat is down.
- **Band:** a pale green band, `oklch(0.90 0.045 150)` with radius 3. It spans ±tolerance vertically (medium ±10 ¢ = 8 px tall) and is drawn **behind** the notehead or name.
  - Stave: the band is 26 px wide, centred on the notehead x.
  - Names: the band spans the cell width minus 6 px each side, centred on the letter.
- **Hold fill:** the band fills from left to right in `oklch(0.80 0.07 150)`, width = held time ÷ required hold. If the learner leaves the band, the fill resets to 0.
- **Pitch line:** a 2 px line with radius 1, drawn **in front of** the note.
  - It extends 2 px past the band on each side on the stave, and 3 px in from the cell edge in names view.
  - Its vertical position is the detected cents, clamped to ±50.
  - Colour: green when within tolerance, flat colour below, sharp colour above.
  - It is hidden while silent.
  - Transition: `top .18s cubic-bezier(.3,.7,.3,1)`.
- **Target styling:** keep the existing current-note treatment: a ×1.25 notehead and the accent halo, or the highlighted names cell.
  - Past notes: ink.
  - Future notes: faint (the stave's `"progress"` feedback style).
- **Off switch:** when `Cues → meter` is off, hide the band, fill and line. The note keeps its highlight, and the card judgement still shows.

### Run complete (07) and no microphone (08)
- **Complete:** the card caption reads `{n} of {n} held · C4–C5`, with the sub-line `All held`, and ▶ returns.
- **No mic:** the card reads `Can't hear — no microphone` (14 / 600), then `It was refused or isn't there. Allow the microphone for this site, then press I lead again.` (12.5, `#6f675c`, line-height 1.45).

### Traversal sheet (09, 10)
- **Frame:** the sheet is as shipped (bottom sheet, `#f7f3ea`, radius 20 20 0 0, top border `#d5cbb8`, shadow `0 -10px 30px rgba(28,25,22,.16)`). The "Traversal" title row is **removed**.
- **Rows:** every row is exactly **62 px** tall, with padding 0 18 and bottom border `#ece4d5`.
  - Left: the label (13 / 600), and under it a hint (11 / line-height 14 px, `#6f675c`) in a **fixed 28 px box** (2 lines, line-clamp 2). The label column is `flex:1`.
  - Right: the control. Pills are radius 10, padding 9×10, 12.5 / 600; selected is bg `#e7dcc6`, ink `#4a4136`; unselected is transparent, ink `#756c60`.
  - Switches are 36×20, track `#8a4b2a` when on or `#c8bfad` when off, with a 14 px knob `#f7f3ea`.

Row order:

1. **Who leads**: pills `play along` | `I lead`, with a ✕ close button (28 px circle, border `#cfc6b4`) at the right. Hint: `It plays, you follow` or `It listens, you play`.
2–4. **Rows that swap with the mode.** Each mode has exactly three rows, so the sheet never changes height and nothing moves:
   - **Play along:**
     - `Sound`: notes / both / metronome. Hint `What it plays for you`.
     - `Count-in`: switch. Hint `A bar of clicks before it starts`.
     - `Rest bar`: switch. Hint `A bar's rest before each loop`.
   - **I lead:**
     - `Hold`: pills `1` `2` `4` in Mono 12. Hint `Beats in tune, then the next · {s} s`, where s = beats × 60 / tempo, to one decimal place.
     - `In tune`: pills `lenient` `medium` `accurate`. Hint `Within {c}% of the way to the next note` (cents are percent of a semitone, so ±10 ¢ = 10%; no cents shown to the learner).
     - `Cues`: two independent toggle pills, `meter` (default on) and `tone` (default off). The hint changes with the selection:
       - both: `Sharp/flat on the note · a tone per note`
       - meter only: `Shows sharp or flat on the note`
       - tone only: `A short tone as each note comes up`
       - neither: `Just the note highlight`
- **Divider:** a 1 px `#ddd4c2` hairline, drawn over the row border, separates the rows that swap from the shared rows below.
5. **Shared rows:**
   - `Direction`: up / down / up and back. Hint `Up, down, or up and back`.
   - `Octaves`: 1 / 2. Hint `How far the run goes`.
   - `Shape`: scale / arpeggio. Hint `Every note, or 1 3 5`.
   - `Loop`: switch. Hint `Start again at the end`.

**Traversal summary line** (the card under the transport): unchanged copy. It does not include hold or mode.

## Interactions & behaviour
- **Starting a lead run:**
  - It requests the mic (same flow as the Tuner), then waits silently on note 1.
  - `in tolerance` is |cents| ≤ tolerance.
  - Hold time accumulates while in tolerance and resets to 0 when the pitch leaves tolerance.
  - Silence pauses accumulation but does not reset it.
  - When accumulated time ≥ beats × 60000 / tempo ms, the run advances to the next note in traversal order (direction, octaves, shape).
  - After the last note: the complete state. If Loop is on, it restarts from note 1.
- **Cents** are measured against the **target** note, using the nearest-cents error from 007's detector. Beyond ±50 ¢ the line pins at the band box edge. There is no wrong-note display: it was explored and rejected as distracting.
- **`Cues → tone`:** a short tone of the target sounds as each new target appears, using the existing voice at about 400 ms.
- **The mode switch never reflows the sheet:** the three rows that swap are the same heights.
- **Tolerances:** lenient ±15 ¢, medium ±10 ¢, accurate ±5 ¢. Default: medium. Default hold: 2 beats.

## State
- **New persistent settings:**
  - `lead: "tool" | "me"`
  - `holdBeats: 1 | 2 | 4`
  - `tolerance: "lenient" | "medium" | "accurate"`
  - `cueMeter: boolean` (default true)
  - `cueTone: boolean` (default false)
- **Session state:** `targetIndex`, `heldMs`, `cents | null`, `phase: idle | listening | complete | noMic`.

## Design tokens (new for 008; add to `docs/design.md` §8 / `theme.ts`)
- Hold fill, mid green: `oklch(0.80 0.07 150)`
- Band, pale green: `oklch(0.90 0.045 150)`, i.e. `tuner.band`
- In tune: `oklch(0.55 0.11 150)`
- Flat: `oklch(0.55 0.11 258)`
- Sharp: `oklch(0.55 0.11 28)`
- Everything else uses the existing paper tokens: `#efe9dc` frame, `#f7f3ea` card, `#fbf8f1` disc, `#1c1916` ink, `#8a4b2a` accent, `#ddd4c2` / `#e0d7c5` / `#ece4d5` lines, `#6f675c` / `#9a9186` secondary ink.
- Fonts: Public Sans, Instrument Serif, JetBrains Mono and Noto Music, as already in the app.

## Assets
No new assets. The Tuner glyph is drawn with three bars, as in the header pill.

## Files
- `Learner Leads Final.dc.html`: the 11 screens to build. Start here.
- `Learner Leads Practice.dc.html`: the interactive practice screen behind them. It contains only the chosen design. The props are `mode` (tool/me) and `llState` (which state to show, or `demo`).
- `support.js`: the runtime needed to open the `.dc.html` files in a browser.
