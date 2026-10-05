# 008-learner-leads: Learner leads

## Outcome

The practice screen has a second way to practise, chosen by two words under the transport caption: **play along** (as shipped) and **I lead**. In I lead, tapping the start circle opens the microphone and shows the first note of the chosen traversal as the target: the big letter on the card, and the highlighted note on the stave or in the names view. As the learner plays, a pitch line on the target note moves sharp or flat against a pale green band the width of the chosen tolerance. Once the note sits inside the band, the band fills from left to right. When the note has been held in tune for the chosen number of beats, the target moves to the next note. The run ends "All held", or loops.

The Traversal sheet holds three new settings and keeps the same height in either mode:
- **Hold:** 1, 2 or 4 beats.
- **In tune:** lenient ±15 ¢, medium ±10 ¢ or accurate ±5 ¢.
- **Cues:** the meter on the note, and a short tone as each target appears.

Every readout meets 007's latency budget, measured. While the tool listens it sounds nothing except the optional tone cue, and the cue is never judged as the learner's playing.

## Capability changes

- `practice.session` v0.4.0 → **v0.5.0**: 9 requirements added, 4 modified, 0 removed.
  - **Added:**
    - REQ-014: the mode.
    - REQ-015: a lead run.
    - REQ-016: the judgement and the hold.
    - REQ-017: the meter on the note and the live card.
    - REQ-018: cues.
    - REQ-019: changes while leading.
    - REQ-020: the rebuilt Traversal sheet.
    - REQ-021: the Article V budget.
    - REQ-022: no microphone.
  - **Modified:**
    - REQ-002: the progress bar is retired; the mode words appear in every state.
    - REQ-009: a hidden page also stops a lead run.
    - REQ-011: the five lead settings are remembered, migrated from 007's stored state.
    - REQ-013: tapped notes are ignored while leading.
- Affects, applied at finish:
  - `docs/domain.md`: Session settings, and the never-both invariant extended to a lead run.
  - `docs/glossary.md`: new terms Lead run, Hold, Tolerance, Cue and Tone cue; In-tune band and Mode amended.
  - `docs/design.md` v1.2.0: the tokens, three patterns, and twelve screen states with reference screenshots.

## Convergence

**Converged** at cycle 3 (`record/converge-3.md`) with 0 critical and 0 warnings, on commit 5ee270b.
- `pnpm check`: 476 tests passed.
- `pnpm test:timing`: PASS; at 200 bpm the highlight was 29.33 ms from the audible onset, against a ±30 ms budget.
- `pnpm test:tuner`: PASS.
- `pnpm test:lead`: PASS; first readout at most 70 ms, max gap between readings 10.67 ms, advance lateness 0 frames.
- `check-scenarios`, `check-contexts` and `check-design` are clean.
- All twelve screen states match the references.

Earlier cycles:
- **Cycle 1:** 2 critical, 6 warnings.
  - **Critical:** a finished or no-mic lead card survived the switch to play along; the first reading after silence was smoothed.
  - **Warnings:** note opacity was applied twice on the stave; test:lead gated only the average reading rate; a second tap during the microphone prompt did nothing. These were all fixed.
  - The other three warnings were settled by the user: keep the mode words on the live card, the design tokens promoted, and the tone cue walked on the phone.
- **Cycle 2:** 1 warning, a microphone that a stop → start race could leave open. Fixed in the listening adapter, its wrapper and the session.

## Acceptance (the user, on a Galaxy S24, with the flute)

- **Phone walk, 2026-10-04:**
  - ■ did nothing while leading. Fixed in T024, then "Looks like it's working".
  - A count-in stuck at 4 in play along did not reproduce afterwards. Its likely cause, a lead card surviving the mode switch, was fixed in T025.
- **Tone cue on the phone, 2026-10-05:** "Nope it did not detect the cue it played all good."

## Decisions

The decider ruled on these during the unattended run; all are two-way doors and are recorded under `record/decisions/`:
- **D001:** REQ-016/S4's wording was tightened to one reading interval.
- **D002:** REQ-017/S4's contradiction was removed: no pitch line beside "held ✓" until the first reading against the new target.
- **D003:** in play along, ▶ does nothing on a key with no notes in range.
- **D004:** the proposal's Affects were applied.

The user's decisions are recorded in `docs/decisions.md`:
- keep the mode words on the live card, about 40 px taller than the prototype;
- promote the design tokens and patterns;
- defer the ocarina ranges to a separate fix after this MR.

## Not in this MR

- **Ocarina ranges:** the user found the ranges of both ocarinas wrong. This will be a separate fix.
- **Info items from converge 3:**
  - a REQ-016/S10 scenario is recommended ("a breath, then out of tune");
  - real concurrent microphone-permission prompts have not been tried on a device;
  - three hard-coded values in `src/ui/global.css` pre-date this change.

ADRs proposed: none.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
