---
type: Implementation Report
title: C008_T023 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T023.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T023.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-04T10:20:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T023
STATUS: DONE_WITH_CONCERNS
COMMIT: c8bec27
FILES:
src/ui/TransportCard.tsx
src/practice/domain/session.ts
scripts/design_snapshot.py
tests/ui/scenarios/transport-card-lead.test.tsx
tests/practice/scenarios/lead-meter.test.ts
(regenerated, not staged: changes/008-learner-leads/design/rounds/shots/{idle-i-lead,complete,no-microphone,advanced}.app.png)
VERIFY:
RED first: 3 failed | 18 passed (glyph alignItems, position-caption still present, reading not null after advance).
GREEN: `pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx tests/practice/scenarios/lead-meter.test.ts` -> Test Files 2 passed (2), Tests 21 passed (21).
`pnpm vitest run tests/practice tests/ui` -> Test Files 75 passed (75), Tests 389 passed (389).
CHECK:
pnpm check: Test Files 92 passed (92), Tests 450 passed (450); prettier, eslint, tsc, cargo fmt/clippy/test all green (last lines: cargo doc-tests "test result: ok. 0 passed").
pnpm test:lead:
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   5.35                  8.02                94.21           0                              16.02                    PASS
tone cue fed back  3        62.33                   8.02                  5.35                82.92           0                              5.35                     PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone

PER-STATE VERDICTS (after re-shoot, rounds/shots pairs read against the prototype):
- idle-i-lead: CLOSED — the Tuner glyph is three bare bottom-aligned bars (10/20/10, dim outer, bright centre), no ring; matches the prototype.
- complete: CLOSED — the same glyph in the circle is now as drawn; the caption / "All held" / mode words unchanged.
- no-microphone: CLOSED — "Can't hear — no microphone" now sits beside the circle in place of the caption (wrapping to two lines as in the prototype), the mode words beneath it, the body line below the top row. (Live card is still taller overall because of the mode words: finding 2, not this task.)
- advanced: CLOSED — D4's band is drawn with no stale pitch line (as in the prototype), "C4 held ✓" in green.

CONCERNS:
- Spec tension, not changed: REQ-017/S4 reads "D4 is highlighted with its band and the line pinned at the band box's bottom edge in the flat colour ... and the card reads 'C4 held ✓' until the first reading against D4". "held ✓" is shown only until the first reading against D4, and that reading is what draws the pinned line, so the two cannot be on screen together; my fix matches that reading of the spec and the prototype. No existing scenario asserted the reading survives an advance (grep of lead.reading in tests/practice and the S4 card/practice tests), so no DECISION_NEEDED. The S4 wording may deserve a clarification at finish.
- The no-mic `no-mic-card` testid now wraps the top row and the body (inside the `transport-card` shell), so it contains the start circle and mode words as well as the text; the existing assertions (text contained) still hold.
- The completing reading is still emitted as NoteJudged (REQ-016/S1), only its display is withheld; a completing reading that coalesces with a later reading in the same tick is replaced by it and shown normally.
- The 5173 dev server of design:shots was left running after it finished (not stopped by the script); I killed it and my own dev server.
CHOICES MADE:
- Clear implemented in commitLeadReading via a `leadPendingCompleted` flag set from `advanced` on each reading, rather than nulling the pending reading, so NoteJudged emission, timing and the hold are untouched.
- Dropped the no-mic body's old 10 px top margin in favour of a 12 px (CARD_GAP) column gap, matching the prototype's spacing.
- Used ModeWordsRow (existing) in the no-mic card; split NoMicMessage into NoMicTitle and NoMicBody; NoMicCard is 41 lines, IdleCard/LiveCard unchanged in size.
- Bar colours chosen by index (centre vs outer) from modeWords tokens; no theme.ts change needed.
- Test names for the two UI tests carry a descriptive suffix after the scenario ID so they do not collide with the existing S1 (card) tests.
- Read the pairs from rounds/shots (design:shots); also ran design_snapshot.py live against a dev server with the cached venv's Playwright 1.63.0 — it completed all 12 states.

<!-- recorded 2026-10-04T09:17:30Z by scripts/record.sh -->
