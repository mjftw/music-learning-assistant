---
type: Implementation Report
title: T020 — implementation report
resource: /.sdd/reports/007-hear-me/T020.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T020.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T13:35:47Z
sdd_id: 007-hear-me
---

TASK: T020
STATUS: DONE
COMMIT: 1345368
FILES:
scripts/design-shots.mjs
changes/007-hear-me/notes.md

VERIFY:
```
$ ls .sdd/design-review/*.png | wc -l
12

$ ls .sdd/design-review/*.png
.sdd/design-review/practice-way-in.app.png
.sdd/design-review/practice-way-in.prototype.png
.sdd/design-review/tuner-cannot-hear.app.png
.sdd/design-review/tuner-cannot-hear.prototype.png
.sdd/design-review/tuner-listening.app.png
.sdd/design-review/tuner-listening.prototype.png
.sdd/design-review/tuner-silent.app.png
.sdd/design-review/tuner-silent.prototype.png
.sdd/design-review/tuner-target-pinned.app.png
.sdd/design-review/tuner-target-pinned.prototype.png
.sdd/design-review/tuner-target-sheet.app.png
.sdd/design-review/tuner-target-sheet.prototype.png
```
`changes/007-hear-me/notes.md` lists the structural differences per pair
under `## T020 — design shots` (see below).

Command used: `APP_URL=https://localhost:5173 pnpm design:shots`, run
against the already-running `pnpm dev:phone` server (not killed). All six
states wrote both sides with no driver-failure warnings:
```
[design-shots] wrote practice-way-in.{prototype,app}.png
[design-shots] wrote tuner-listening.{prototype,app}.png
[design-shots] wrote tuner-silent.{prototype,app}.png
[design-shots] wrote tuner-cannot-hear.{prototype,app}.png
[design-shots] wrote tuner-target-pinned.{prototype,app}.png
[design-shots] wrote tuner-target-sheet.{prototype,app}.png
```

CHECK (`pnpm check`, PATH needed `~/.cargo/bin` — cargo isn't on PATH by
default in this shell):
```
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  72 passed (72)
      Tests  303 passed (303)
   Start at  14:35:04
   Duration  10.15s (tests 50%, environment 33%, import 10%, transform 7%)
...
   Doc-tests listening
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
running 0 tests
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(eslint, tsc, cargo fmt/clippy/test all passed silently — full cargo unit
test output for `listening`/`sound` also green, 10 and 24 passed
respectively, 1 ignored each intentionally). No ELIFECYCLE/error anywhere
in the log. `scripts/*.mjs` is excluded from `eslint .`'s scope (see
`eslint.config.js`'s `ignores`) but is covered by `prettier --check .`,
which passed.

## What changed in scripts/design-shots.mjs

- `PROTOTYPE_PATH` (a single constant) replaced by a per-state
  `prototypePath`: `PRACTICE_PROTOTYPE_PATH` (Practice.dc.html) and
  `TUNER_PROTOTYPE_PATH` (Tuner.dc.html).
- The 004-specific `fulfillSiblingComponentFetch`/`DRONE_COMPONENT_NAME`/
  `DRONE_COMPONENT_PATH` shim removed — it referenced `Drone.dc.html`,
  which doesn't exist under `changes/007-hear-me/design/`, so keeping it
  would have thrown at runtime; it wasn't needed for the frames this task
  captures anyway (documented at the new path constants).
- `PHONE_FRAME_SELECTOR_SUFFIX` (a suffix appended to an `[id="…"]`
  container, 004's pattern) renamed to `PHONE_FRAME_SELECTOR` and used
  standalone for Practice.dc.html's single frame; Tuner.dc.html's frames
  are addressed directly by `data-screen-label`.
- `captureFrame`'s readiness check no longer assumes a ▶/■ pill glyph
  (003/004's UI); it now waits for a non-zero box with no unresolved
  `{{ … }}` template text left in it — file-agnostic.
- New `applyPrototypeState`: drives a state via the dc-runtime's own
  `window.__dcSetProps(name, overrides)` / `window.__dcRootName()` bridge
  (support.js's `Object.assign(window, api)` — the same bridge its host
  editor's "Tweaks" panel uses), confirmed working for `state: "sweep"`,
  `"silent"`, `"cannot hear"`; falls back to a `prototypeDriver(frame)`
  for target-pinned (open the sheet, tap Hold — no Tweak covers this).
- The app side gained `appNeedsMic` per state and a second, separately
  launched browser (`--use-fake-ui-for-media-stream` +
  `--use-fake-device-for-media-stream`) for the four states that need a
  granted microphone to reach the tuner's LISTENING state at all;
  tuner-cannot-hear is deliberately taken from the *other* browser (no
  flag), so the permission prompt is left denied — confirmed empirically
  this environment auto-denies getUserMedia without it.
- `screenshotPrototype`'s clip switched from a fixed `VIEWPORT` box to the
  frame's own measured box (4a is 844 tall, 5c is 700, Practice's card is
  863 — not uniform like 004's frames were), and — a bug found and fixed
  mid-task — the box is converted from viewport-relative back to
  document-absolute coordinates using the page's scroll position at
  capture time before it's used as a `fullPage` clip; without this,
  `tuner-target-pinned`'s prototype shot (whose driver scrolls the page
  to reach "Hold", deep in a >2500px-tall canvas) clipped the wrong
  region entirely (confirmed and fixed with a screenshot before/after).

## T020 — design shots (notes.md, verbatim)

**Structural differences, by pair** (colour/spacing/size/type differences
are taste, left to the refinement loop):

- **practice-way-in** — the design's bottom summary row reads "↑↓ · 1 oct
  · scale · ♩ · loop" (a fifth segment, a quarter-note glyph); the app's
  reads "↑↓ · 1 oct · scale · loop" — missing. Confirmed absent from
  `src/ui/` entirely (not state-gated), not owned by 007-hear-me's own
  Files (the practice screen's run/traversal summary chip, from an
  earlier change) — flagged here since this comparison surfaced it.
- **tuner-listening** — structural: the "TARGET auto · nearest" pill and
  the stave card are swapped. The design (4a) places the pill *between*
  the level and the stave card; `TunerScreen.tsx` (line ~288-297) renders
  `TunerLevel`, then `TunerStave`, then `TargetPill` — the pill draws
  *below* the card, not above it.
- **tuner-silent** — the same pill/stave-card order swap. Also,
  borderline: the design's stave card reads "— IS" (dash standing for the
  unknown note name, keeping the word "IS") with nothing pinned/detected;
  the app shows a bare "—", dropping "IS"
  (`TunerStave.tsx`: `referenceNote === null ? "—" : ...`). A text/content
  gap rather than a missing element, but source-confirmed.
- **tuner-cannot-hear** — the same pill/stave-card order swap. The "Can't
  hear — no microphone" card's position, copy and layout otherwise match.
- **tuner-target-pinned** — the same pill/stave-card order swap. The
  pinned pill's own layout, the stave's grey target head and "A4 IS
  440.0 Hz" all match.
- **tuner-target-sheet** — none. Header, Auto/Hold cards, "Or tap a note"
  row, range caption, and the pitch spiral (wedges, dimming, hub) all
  match.

The pill/stave-card order swap is one root cause (`TunerScreen.tsx`'s
render order) surfacing in all four 4a-based pairs, not four separate
findings.

CONCERNS:
Headless Chromium has no real microphone signal, so tuner-listening and
tuner-silent's app screenshots are identical (both silence/"Play a note")
— documented in both the script's comments and notes.md, and this is
inherent to the harness, not a fixable gap within this task's scope.
The pill/stave-card structural finding (TargetPill rendered after
TunerStave instead of before it) is a real, source-confirmed layout bug
in `TunerScreen.tsx`, but fixing it is out of this task's Files list
("Produces: nothing new") — flagged in notes.md per the brief's Step 3
for whichever task/review picks it up.
The "— IS" vs "—" caption gap in TunerStave.tsx is a smaller, more
debatable case — noted as borderline (text/content, not a missing
element) rather than asserted as a firm structural bug.

Files touched beyond the brief's exact Files line: none beyond what the
brief itself names (`scripts/design-shots.mjs`) plus `notes.md`, which
Step 3 explicitly directs the findings to.

<!-- recorded 2026-09-28T13:45:57Z by scripts/record.sh -->
