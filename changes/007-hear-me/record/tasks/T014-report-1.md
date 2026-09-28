---
type: Implementation Report
title: T014 — implementation report
resource: /.sdd/reports/007-hear-me/T014.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T014.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T10:52:32Z
sdd_id: 007-hear-me
---

TASK: T014
STATUS: DONE
COMMIT: none (brief said not to commit)
FILES:
src/ui/TunerScreen.tsx (new)
src/ui/Header.tsx
src/ui/App.tsx
src/ui/main.tsx
src/ui/theme.ts
tests/ui/scenarios/tuner-screen.test.tsx (new)
tests/ui/scenarios/circle-interaction.test.tsx (ripple — see CONCERNS)
changes/007-hear-me/notes.md

VERIFY:

RED (step 2), before any production change — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx`:

```
FAIL  tests/ui/scenarios/tuner-screen.test.tsx > practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Tuner"
 ❯ tests/ui/scenarios/tuner-screen.test.tsx:26:32
     24|   );
     25|   await userEvent.click(screen.getByRole("button", { name: "Tuner" }…
       |                                ^
 Test Files  1 failed (1)
      Tests  2 failed (2)
```

Failed for the stated reason (step 2's predicted message, verbatim). GREEN, after implementation — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx`:

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  11:51:57
   Duration  ~1.3s
```

`pnpm vitest run tests/ui` (final, after the circle-interaction.test.tsx ripple fix):

```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  22 passed (22)
      Tests  97 passed (97)
   Start at  11:51:57
   Duration  5.93s (tests 47%, environment 26%, import 13%, transform 13%)
```

Design-fidelity screenshots (Playwright for Python is not installed — confirmed
by `python3 -c "import playwright"` → `ModuleNotFoundError` — so per the
brief's override I wrote a throwaway Node script using the repo's installed
`playwright`, launched Chromium with `--use-fake-ui-for-media-stream`,
390×844 @2x, against `pnpm dev` on :5173, saved the two PNGs, then deleted
the script):

- `.sdd/design/007-hear-me/live/practice--way-in.png` — viewed: the header
  shows the instrument pill ("Flute Concert  C4–C7") · the Tuner pill (the
  three-bar glyph + "Tuner") · ⚙, left-to-right, matching
  `design/Practice.dc.html` lines 22-28's structure exactly.
- `.sdd/design/007-hear-me/live/tuner--listening.png` — viewed: `‹ Practice`
  pill top-left, "● LISTENING" (accent dot, mono letter-spaced) top-right,
  everything else on the screen empty — matching `design/Tuner.dc.html`
  frame #4a's header row (lines 131-141).

`notes.md` carries `## T014 — the phone's track settings` → "Pending the
user's phone check." (the phone half of step 5 is explicitly the user's per
the brief's override).

CHECK (last lines of `bash -c "source ~/.cargo/env && pnpm check"`, exit 0):

```
 Test Files  70 passed (70)
      Tests  283 passed (283)
   Start at  11:51:xx
   Duration  9.70s (tests 46%, environment 37%, import 10%, transform 7%)
...
running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.65s

running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```
prettier / eslint / tsc / cargo fmt / cargo clippy all passed with no
output before this (a non-zero exit anywhere would have short-circuited
the `&&` chain before reaching the vitest/cargo summaries above).

CONSOLE OBSERVATIONS (real worklet, headless Chromium, entering the tuner):
the console logged `listening: track settings {autoGainControl: false,
channelCount: 2, deviceId: default, echoCancellation: false, groupId: …}`
(recorded verbatim in notes.md's T014 notes entry), and no
`PitchDetected`-related error (or any page error) appeared — T003's "first
fix if LISTENING shows but no reading ever arrives" note is not needed at
this stage. This was headless Chromium's fake device, not the phone; the
phone's own settings are the user's own check per the brief.

CONCERNS:
- Ripple beyond the brief's Files list (AGENTS.md's documented pattern):
  `tests/ui/scenarios/circle-interaction.test.tsx`'s Tab-order test
  ("Tab-focusing a wedge…") asserted three tabs reach the first wedge; the
  new Tuner pill adds a tab stop before the circle, so I updated the test
  to four tabs and its comment. Recorded in notes.md's T014 entry too.
- The brief's step-1 test code (verbatim from tasks.md) uses jest-dom
  matchers `toHaveTextContent`/`toBeInTheDocument`. This repo has no
  `@testing-library/jest-dom` dependency and no vitest `setupFiles` —
  confirmed by grep and by actually running the literal code, which threw
  `Invalid Chai property: toHaveTextContent`. I adapted both assertions to
  the convention every other UI scenario test in this repo already uses
  (`.textContent`/`toBeTruthy()` — e.g. app-drone.test.tsx,
  app-session.test.tsx); scenario IDs, structure, and everything else are
  unchanged from the brief. Recorded in notes.md.
- The mic indicator treats the session's `"off"` listening state the same
  as `"listening"`/`"starting"` (renders "LISTENING", not "NO MIC") — the
  brief's Produces comment only specifies "LISTENING while
  listening/starting" and "NO MIC while cannot-hear", leaving "off"
  unstated. "off" only exists for the render before `enterTuner()`'s
  `wakeLock.acquire()` promise settles (App only renders `TunerScreen`
  once `session.enterTuner()` has already run), so in practice it's
  never visibly reached; documented in a code comment on
  `isListening()`. Flagging in case the intent was different.
- `theme.ts`'s new `tuner` token object is not yet imported anywhere (T015
  onward will use `sharp`/`flat`/`inTune`/`band`/`targetHead`/`ghostInk`) —
  exported per the brief's Produces block, unused for now by design.

<!-- recorded 2026-09-28T10:59:29Z by scripts/record.sh -->
