---
type: Implementation Report
title: C008_T020 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T020.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T020.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-04T09:05:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T020
STATUS: DONE_WITH_CONCERNS
COMMIT: 63466f9
FILES:
scripts/design-shots.mjs
scripts/design_snapshot.py
scripts/design-shots-page.mjs (new; shared in-page tone helpers, see CHOICES MADE)
(generated, not committed: changes/008-learner-leads/design/rounds/shots/*.png, 24 files; .sdd/design/008-learner-leads/live/*.png, 12 files)

TRUE COUNTS (resolved from the real sources, not the brief's numbers)
- The canvas `Learner Leads Final.dc.html` has eleven anchors, `#s01`..`#s11` (not `#s01`..`#s10`). 01 idle play along, 02 idle I lead, 03 listening silent, 04 heard out of tune, 05 holding, 06 advanced, 07 complete, 08 can't hear, 09 sheet play along, 10 sheet I lead, 11 demo (simulated player; nothing to build; no state, no row).
- The proposal's Interface table has twelve rows (the brief is right about twelve). Ten map to canvas phones 01-10 one for one. Two are not on the canvas and use `Learner Leads Practice.dc.html` (the one-phone prototype the canvas imports): `playing-play-along` (prototype: mode tool, ▶) and `holding-meter-off` (prototype: mode me, llState holding, sheet -> meter off -> close). Row -> state: idle-play-along 01, idle-i-lead 02, playing-play-along Practice, listening-silent 03, heard-out-of-tune 04, holding 05, holding-meter-off Practice, advanced 06, complete 07, no-microphone 08, sheet-play-along 09, sheet-i-lead 10.
- Verify's `24` is right: twelve rows = twelve pairs = 24 PNGs. No mismatch against the Verify line. (The brief's "#s01..#s10" is the only wrong number; 11 is a demo and has no row.)

VERIFY:
$ ls changes/008-learner-leads/design/rounds/shots/ | wc -l
24
$ python3 scripts/design_snapshot.py changes/008-learner-leads live --base http://localhost:5173
  (12 lines, one PNG per Interface row, no warnings; landed in .sdd/design/008-learner-leads/live/practice--<state>.png, the script's default dir)
  .sdd/design/008-learner-leads/live/practice--idle-play-along.png  <- http://localhost:5173/
  ... practice--idle-i-lead, --playing-play-along, --listening-silent, --heard-out-of-tune, --holding, --holding-meter-off, --advanced, --complete, --no-microphone, --sheet-play-along, --sheet-i-lead
$ node --check scripts/design-shots.mjs; node --check scripts/design-shots-page.mjs; python3 -m py_compile scripts/design_snapshot.py  -> clean
`pnpm design:shots` run end to end (dev server started by me, stopped afterwards): all twelve states, no driver warnings; holding's fill at the shot 0.589; advanced caught on the first attempt.
Verify's second clause ("notes.md lists the structural findings") is not done here, by instruction: the findings are below for the controller; notes.md untouched.

CHECK:
$ pnpm check   (exit 0)
 Test Files  92 passed (92)
      Tests  447 passed (447)
   Duration  22.39s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.09s
   Doc-tests listening / Doc-tests sound: 0 tests, ok
(prettier, eslint, tsc, vitest, cargo fmt/clippy/test all green)

STRUCTURAL FINDINGS (live vs prototype; structure only)
Compared all 12 pairs by eye (Read on every PNG). Pairs 01, 03 (band behind target, faint ahead), 04 (flat line below band, no fill), 05 (fill, green line), 05-meter-off (halo, judgement, no band/fill/line), 06 (target moved, "C4 held ✓"), 07 (caption, "All held", ▶ glyph back), 09 and 10 (sheet rows, order, hairline, same height) match structurally. Findings:
1. idle-i-lead, complete, no-microphone: the Tuner glyph in the start circle is drawn wrong. Prototype: three bare bars 3 px wide, 3 px gap, bottom-aligned, heights 10/20/10, outer bars rgba(249,244,233,.6), centre #f9f4e9. App: all three bars in the centre colour, each with a 2 px translucent ring (box-shadow), so they read as three outlined pills touching, vertically centred. Suspect: src/ui/TransportCard.tsx `TunerGlyph` (background glyphCentre on every bar, boxShadow ring, alignItems: center) and the modeWords tokens in src/ui/theme.ts (glyphOuter is only used as the ring). Shots: idle-i-lead, complete, no-microphone.
2. Every live lead card (listening-silent, heard-out-of-tune, holding, holding-meter-off, advanced) is taller than the prototype's: the mode words row sits under the judgement line (letter + "k of N" + judgement stacked, then the words below), whereas the prototype's live card is circle + letter + caption + judgement + tempo only, no words, same height as the idle card. The card grows about 40 px, so the traversal summary row ("↑↓ · 1 oct … edit ›") falls below the 844 px fold in the live shots (visible only in the full-page shot). This is a design-vs-spec conflict as much as a bug: REQ-014 says the words are shown "in every transport state". Flag for the controller to rule: keep the words and accept the growth (then REQ-002/S5's one-height claim only covers play along), or hide them while leading. Suspect: src/ui/TransportCard.tsx (the live card's layout/ModeWords placement).
3. no-microphone: the prototype puts "Can't hear — no microphone" beside the circle in place of the caption, with the mode words absent and the explanation line below spanning the card. The app keeps the idle caption ("hold 2 beats · medium t…", truncated) and the mode words beside the circle and puts the title and line in a separate block under them; the title is not where the caption was. REQ-022 says the circle and the mode words are still shown, so the words are right; the caption/title order is the difference. Suspect: src/ui/TransportCard.tsx (no-mic card layout).
4. advanced (transient, possible): right after the advance, with the microphone going silent, the previous target's green in-tune pitch line is still drawn across the new target D4 (centre, green) next to "C4 held ✓" until the 300 ms gap clears it; the prototype shows the new target with a band and no line. The spec only describes a pinned flat line against the new target once a reading against it arrives. Reproduced only because the shot silences the tone at the advance; with a continuing tone the next reading replaces it. Low severity; suspect the reading carried over the advance: src/practice/domain/session.ts (the advanced branch of onPitchDetected / pending reading) with src/ui/NoteMeter.tsx.
Not findings (prototype limits, noted so they are not chased): the prototype cannot draw a play-along run on its card (its card shows only the lead run; the stave highlights nothing at 3.2 s), so playing-play-along's prototype shot is the idle card, and the app side shows ❚❚ "D4 · 2 of 15" with the words, which is the ruled "not drawn on the canvas" state. The prototype's target is E4/F4 (index 2/3) in states 03-06, the live app's is C4/D4; the centre drone pill reads C4 on the prototype and C5 in the app. The complete shot's summary row reads "once" because the harness turns Loop off to reach complete (REQ-015/S3).

CONCERNS:
- Python live driver needs Playwright for Python at the same version as the repo's node playwright (1.63.0). 1.55.0 (what was cached on this machine) hangs forever in AudioWorklet addModule, so every mic state timed out until I installed 1.63.0 into a venv under the scratchpad (not in the repo, nothing added to the repo). The system python has no playwright at all; the first run of the documented command needs `pip install playwright==1.63.0` (and its chromium, already cached). Worth a line in docs/sdd-guide if the controller wants it.
- The live Python states and the node states now share scripts/design-shots-page.mjs; the committed PNGs are not committed (build artefacts) but `changes/008-learner-leads/design/rounds/` is now an untracked directory in the tree (24 PNGs). `.gitignore` does NOT exclude `design/rounds/shots/` (checked: `git check-ignore` returns nothing), so a careless `git add -A` would stage them; I did not edit .gitignore.
- The advanced state is a 650 ms audio burst tuned by experiment (660 ms lets a reading against the new target through); the driver verifies the "held ✓" is up before and after the shot and retries with 646/654/642 ms. It hit on the first try three times in a row but is timing-dependent by nature.
- changes/008-learner-leads/tasks/C008_T020.md was already modified in the tree before I started; I left it alone and did not stage it.
- Verify's "notes.md lists the structural findings" is left to the controller by instruction.

CHOICES MADE:
- New file scripts/design-shots-page.mjs (not in the Files list): the in-page tone feeding (feed / burst / playRunToComplete / setSettings / leadSnapshot) is injected by both the node and python drivers, so it exists once rather than being copied (AGENTS.md "extract, don't duplicate"). Named .mjs so it falls under the existing scripts/*.mjs lint ignore (it is plain page JS, not a module).
- design-shots.mjs: the local dev-server helpers are replaced by harness-lib's (ensureDevServer, stopDevServer, APP_URL, installMicrophoneOverride) rather than kept as a second copy.
- design-shots.mjs: state names are the proposal's Interface State names (idle-play-along ... sheet-i-lead), so the PNG names and the python live names line up; output dir is changes/008-learner-leads/design/rounds/shots/ (created; nothing existing touched).
- Prototype capture: the canvas is ~10 000 css px tall, so the old fullPage+clip comes back blank (past Chromium's texture limit). The prototype is now photographed in a 480x1000 viewport with the phone scrolled into view and clipped in viewport coordinates. The canvas's `dc-import` of the sibling Practice file also needed the same `window.__resourceBlobs` seeding 004's Drone canvas needed (file:// fetch is refused), added back as fulfillSiblingComponentFetch.
- App shots are full-page except the two sheet states (an overlay fixed to the viewport), so the summary row's position below a taller card is visible; the app is put on the stave view before every state because the canvas draws the stave and the meter is a thing on a notehead.
- Reached states: 03/04/05 hold with the microphone override + a sine (04 = -18 cents flat; 05 uses Hold 4 beats set through __session.setSettings so ~58% fill survives the shot; 06 a 650 ms in-tune burst then silence; 07 loop off, tempo 200, Hold 1, every note held, tempo set back to 96); 08 via the plain browser (permission never granted) in node, and via a rejecting getUserMedia init script in python (deterministic across browser builds); sheets via "edit ›". The mode word, start circle and "edit ›" are the visible controls; setSettings (the dev hook the harnesses already use) is used only for Hold/tempo/loop, not for choosing the mode.
- design_snapshot.py: a Route cell now yields its leading backticked token as the path (the 008 cells carry prose after it), the State cell may carry prose after its backticked name, and per-change drivers live in LIVE_DRIVERS keyed by change id then state name; rows without a driver behave as before. Each driven row opens in a fresh browser context.
- The live default output dir kept: .sdd/design/008-learner-leads/live/ (git-ignored by `.sdd/`).

COMMANDS RUN OUTSIDE THE BRIEF: I started `pnpm dev` once (setsid) to run the harnesses and stopped it when done (port 5173 free). Left running: nothing of mine.

<!-- recorded 2026-10-04T09:05:25Z by scripts/record.sh -->
