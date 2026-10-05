---
type: Run Report
title: 008-learner-leads — run report
description: What an unattended run did, what it decided, and what needs the user.
resource: /changes/archive/008-learner-leads/record/run-report.md
status: stable
tags: [sdd, report, "change:008-learner-leads"]
generated:
  by: process:report.sh
  at: 2026-10-05T13:10:35Z
sdd_id: 008-learner-leads
---

# Run report — 008-learner-leads

## Needs you

**Visual check.** This change added or altered the screens below. Look at each on the real device
(docs/design.md §2 says where it is used). Reply with what you want different, or "looks right".
Changes become design rounds on this branch before merge (sdd-design D), or a --design change after.

| Screen | State | Route | Live screenshot | Wireframe |
|---|---|---|---|---|
| practice | idle-play-along` — 01: the shipped card plus the mode words, play along underlined | /` (screen: practice — no URL routes; `design-shots`/`design_snapshot` drive the UI) | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | idle-i-lead` — 02: I lead underlined, the Tuner glyph in the circle, "hold 2 beats · medium tuning" | /` then "I lead" | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | playing-play-along` — the shipped live card (❚❚, "<note> · k of N") with the mode words row in place of the progress bar; not drawn on the canvas, ruled at the walkthrough | /` then ▶ | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Practice.dc.html |
| practice | listening-silent` — 03: ■, the target letter, "1 of 15", "Play C4"; the target highlighted, band drawn, no line | /` then "I lead", the circle; no signal | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | heard-out-of-tune` — 04: "↓ 18 ¢ flat" / "↑ 12 ¢ sharp", the line outside the band in the flat / sharp colour, no fill | /` then "I lead", the circle; a tone −18 ¢ / +12 ¢ from the target fed as the microphone | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | holding` — 05: "in tune · holding", the line in the band, the band filling left to right | /` then "I lead", the circle; an in-tune tone held | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | holding-meter-off` — 05 with Cues → meter off: the highlight and the card judgement, no band, fill or line (reachable on any canvas phone through the sheet) | /` then the sheet → Cues → meter off, then as `holding | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Practice.dc.html |
| practice | advanced` — 06: the held note ink, the next the target, "E4 held ✓" | /` then "I lead", the circle; the first note held to its advance | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | complete` — 07: "15 of 15 held · C4–C5", "All held", the start circle back | /` with loop off, every note held | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | no-microphone` — 08: "Can't hear — no microphone" and its line | /` then "I lead", the circle; microphone refused | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | sheet-play-along` — 09: Who leads, Sound, Count-in, Rest bar, hairline, Direction, Octaves, Shape, Loop | /` then the summary row (edit ›) in play along | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |
| practice | sheet-i-lead` — 10: Who leads, Hold, In tune, Cues, hairline, the shared rows; the same height | /` then the summary row in I lead | (run design_snapshot.py changes/archive/008-learner-leads live) | design/Learner Leads Final.dc.html |

## Decided for you

| # | Task | Verdict | Door | Decision | Amends | Applied |
|---|---|---|---|---|---|---|
| D001 | T006 | decided | two-way | REQ-016/S1 and S4 session tests — fix the test windows for reading quantisation; the reducer stands; S4's "350 ms after" qualified by the reading interval | practice.session/REQ-016 | true |
| D002 | C008_T023 | decided | two-way | REQ-017/S4 — the pinned line belongs to the first reading against D4, not to the instant of the advance; wording-only amendment | practice.session/REQ-017 | true |
| D003 | C008_T021 | decided | two-way | Empty run in play along — add the one-line guard so the approved edge-case row ("does nothing in either mode") is true | none | false |
| D004 | finish | decided | two-way | The proposal's Affects applied at finish — docs/domain.md and docs/glossary.md | none | true |

Each is in `record/decisions/` with its options, the four-question judgement, and how to undo it.

## Spec amendments

- practice.session/REQ-016 — REQ-016/S1 and S4 session tests — fix the test windows for reading quantisation; the reducer stands; S4's "350 ms after" qualified by the reading interval — applied: true
- practice.session/REQ-017 — REQ-017/S4 — the pinned line belongs to the first reading against D4, not to the instant of the advance; wording-only amendment — applied: true

## Result

- Tasks: 30 done, 0 todo
- Convergence: Converged — 0 critical, 0 warning (converge-3.md)
