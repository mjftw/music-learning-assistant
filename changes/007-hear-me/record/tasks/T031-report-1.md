---
type: Implementation Report
title: T031 — implementation report
resource: /.sdd/reports/007-hear-me/T031.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T031.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-29T18:22:39Z
sdd_id: 007-hear-me
---

TASK: T031
STATUS: DONE_WITH_CONCERNS
COMMIT: none (not committed, per instructions)
FILES:
src/ui/TunerScreen.tsx
src/ui/TunerLevel.tsx
src/ui/TunerStave.tsx
src/ui/tuner-silence.ts
src/ui/App.tsx
src/ui/main.tsx
src/ui/theme.ts
tests/ui/scenarios/tuner-helpers.ts
tests/ui/scenarios/tuner-screen.test.tsx
tests/ui/scenarios/tuner-stave.test.tsx
tests/ui/scenarios/tuner-linger.test.tsx (new — replaces tuner-silence-variants.test.tsx)
tests/ui/scenarios/tuner-silence-variants.test.tsx (deleted)

VERIFY:

1) `pnpm vitest run tests/ui`
```
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant

 Test Files  26 passed (26)
      Tests  138 passed (138)
   Start at  19:22:06
   Duration  7.60s (tests 59%, environment 20%, import 10%, transform 10%)
```

2) `pnpm vitest run tests/practice tests/ui`
```
 Test Files  60 passed (60)
      Tests  276 passed (276)
   Start at  19:22:19
   Duration  10.04s (tests 55%, environment 29%, import 9%, transform 7%)
```

3a) `grep -rn "design-loop variant (007 round 4" src tests` — no output (clean).

3b) `grep -rn "silence=\|lingerMs\|\"ghost\"\|\"cut\"" src tests` — no output (clean). Nothing left to explain — the whole `silence`/`lingerMs`/`lingerFadeMs` prop surface, the `"ghost"` data-state and the `"cut"` mode are gone.

4) `grep -rn "design-loop variant (007 round 5)" src tests | wc -l` → `19` — unchanged from before this task (not decreased); every round-5 line (`src/ui/use-measured-size.ts`, `TunerStave.tsx:338`, `App.tsx:259,691`, `TunerScreen.tsx:182,283,311,621`, `main.tsx:147`, `TunerLevel.tsx:36,118,195,235,305`, `tuner-fit-variants.test.tsx` ×4) left exactly as it was. `pnpm vitest run tests/ui/scenarios/tuner-fit-variants.test.tsx` (confirms `?fit=a` still works):
```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

5) `./scripts/check-scenarios.sh --change changes/007-hear-me | grep -c "❌"` → `0`. `practice.tuner/REQ-003/S1`–`S6` all show `✅ ... tested`.

6) `./scripts/check-contexts.sh`
```
✅ context boundaries respected
```

7) `bash -c "source ~/.cargo/env && pnpm check"` — the composite command is currently blocked at the `eslint .` step by an **unrelated, external** worktree that appeared under `.claude/worktrees/deploy/` during this session (a concurrent Claude Desktop "cowork" VM process running elsewhere in this same checkout — confirmed via `ps aux`, and the path is explicitly listed in `.git/info/exclude`, i.e. known SDD-tooling infrastructure, not something this task touches or created). `git status --short` shows my change set is exactly the files listed above; that worktree directory is untracked and contains none of my files. To demonstrate the actual state, I ran each step of `check` individually:

- `prettier --check .` → `All matched files use Prettier code style!`
- `eslint . --ignore-pattern '.claude/worktrees/**'` → no output (clean) — confirms the *only* failures come from that external directory (`eslint .` unscoped reports 7 parsing errors, all under `.claude/worktrees/deploy/...`).
- `tsc --noEmit` → no output (clean).
- `pnpm vitest run` (the full suite):
```
 Test Files  77 passed (77)
      Tests  337 passed (337)
```
- `cargo fmt --check` → clean (exit 0).
- `cargo clippy --all-targets -- -D warnings` → `Finished` dev profile, no warnings.
- `cargo test` → `test result: ok. 13 passed; 0 failed; 1 ignored` (listening) and `test result: ok. 24 passed; 0 failed; 1 ignored` (sound); doc-tests 0/0 both crates. Unaffected (no Rust files touched).

CHECK:
```
 Test Files  77 passed (77)
      Tests  337 passed (337)
```
(from `pnpm vitest run`, the vitest leg of `check`; see VERIFY 7 above for why the composite `pnpm check` command itself cannot complete this session, and for the per-step evidence that everything besides the external worktree noise is green.)

## Decisions made

- **`practice.tuner/REQ-003/S4`–`S6` and the reduced-motion test live in a new `tests/ui/scenarios/tuner-linger.test.tsx`** (the brief's own "your choice; say which"), replacing `tuner-silence-variants.test.tsx` outright rather than merging into `tuner-screen.test.tsx`/`tuner-stave.test.tsx` — these eight tests are all specifically about the linger/fade rule (REQ-003's own new clause), so one file that says what it is reads better than splitting them across the two screen files that already carry REQ-002/REQ-005's own scenarios.
- **`src/ui/tuner-silence.ts` kept, same name.** Its whole content — the `StaleReading` type, `staleAttrs()`, `prefersReducedMotion()` — is still shared by `TunerScreen`/`TunerLevel`/`TunerStave` and the name still fits: it's still "what the screen does about a reading during silence", now stating the one rule instead of the exploration. I trimmed `dataState`/`grey` off `StaleReading` entirely (both are now constants — `data-state` is always `"fading"`, and lingering is always grey), simplifying every read site (`stale?.grey` → `stale !== undefined`).
- **REQ-007/S3 (mic failure) does not linger.** The brief's own rule text ties the trigger to "the session's `tuner.reading` becomes null, 300 ms after the last detected pitch" — i.e. REQ-003's own clearing, not any clearing. The pre-existing `TunerScreen` code (from the round-4 exploration) triggered the stale/linger phase on *any* `tuner.reading` transition to null, with no such distinction. Left as-is, the existing untouched test `practice.tuner/REQ-007/S3 — failed while listening` (`tests/ui/scenarios/tuner-screen.test.tsx`, asserting `tuner-line` is `null` immediately after `listening.end()`, no wait) would have broken, and the brief's own "reads the SILENT state right after **the gap**" carve-out (for adding a wait) explicitly doesn't cover it — this is a different transition (mic failure), not the 300 ms gap. I added one condition to the phase effect: `tuner.listening.kind === "cannot-hear"` now short-circuits straight to `"empty"`, same as "nothing was ever heard" — matching REQ-007's own plain "the last reading is cleared" (immediate, no mention of any linger). This is a necessary ripple the brief's prose didn't spell out but the existing test required; flagging it here per AGENTS.md's own guidance on ripples the Files list doesn't name.
- **`tuner-empty` ("Play a note") now also considers `targetPinnedSilent`.** REQ-003/S6 requires it to show *at once* alongside a target's greyed name while the line/tag/head still linger and fade (S2's own behaviour, unconditional). The old condition (`reading === null && (stale === undefined || stale.dataState === "ghost")`) would have kept "Play a note" hidden while `stale` was still defined, even with a target pinned — wrong for S6. Changed to `reading === null && (targetPinnedSilent || stale === undefined)`; verified this reproduces REQ-003/S2's own pre-round-4 behaviour when `stale` is always `undefined` (no target, no linger in flight).
- **`enterTuner`/`enterAndHear` now always inject a deterministic linger timer** (`timer`, a `manualAnimationClock()` instance, wired as `setTimer`/`clearTimer` before `...extraProps` so a scenario's own override still wins). Before this task, `silence` defaulted to `"cut"`, which made TunerScreen's whole phase effect a no-op (`if (silence === "cut") return;`) — no timer was ever scheduled, so every existing test's use of the *real* `window.setTimeout` default never actually fired. Now that linger is the only path, every entered-tuner test schedules a real timer unless given a fake one; switching the default to an inert, explicitly-advanceable fake (rather than real wall-clock time) keeps every test deterministic with no behaviour change for tests that never advance it.
- **`letLingerPass(f)`** (`tests/ui/scenarios/tuner-helpers.ts`) advances that timer past `motion.lingerHoldMs` then `motion.lingerFadeMs` **in two separate `advanceMs` calls**, not one combined `800`. `manualAnimationClock`'s `advanceMs` sets its virtual "now" to the target *before* firing anything due, so a timer a callback schedules mid-fire (the hold's own callback scheduling the fade) is due against that already-advanced "now" and only fires on a *later* `advanceMs` call unless the new delay is `0`. I corrected the helper's own stale comment (previously claimed a real-delay chain fires "within the same advance", which — checked against the pre-existing "b" test, which always used two separate calls too — was never actually true nor exercised).
- **Colour assertions in the new tests compare against `rgb(...)`, not the theme's hex string.** jsdom's inline-style CSSOM canonicalises a hex colour (`paper.faint = "#9a9186"`) to `rgb(154, 145, 134)` but leaves a CSS function colour (`oklch(...)`, used by the existing sharp/flat/in-tune assertions) untouched — a small local `rgbOf()` helper in the test file reproduces the conversion from the theme token rather than hardcoding the converted string.

## Existing tests touched, and why

- `tests/ui/scenarios/tuner-screen.test.tsx` — `practice.tuner/REQ-003/S1 — silence on auto`: added `letLingerPass(f);` right after the existing 300 ms gap advance, before the silent-state assertions (unchanged). Reason: the linger is now the only behaviour, so the silent state ("Play a note", no line, no tag) is only reached 0.8 s after the gap, not immediately.
- `tests/ui/scenarios/tuner-stave.test.tsx` — `practice.tuner/REQ-005/S5 — the trail outlives the note`: added `letLingerPass(f);` right after `letGapPass(f)`, before the first block of silent-state assertions (`heard-head`/`strip-cents`/`heard-hz`, all unchanged). Same reason. The rest of the test (the trail's own xs/`animClock.pending` assertions) is untouched and unaffected — the trail is driven by a separate clock (`animClock`, not `f.timer`) and reads `trailRef`, not `stale`.
- No other existing test needed a change. I checked every test in `tests/ui/scenarios/` that calls `enterTuner`/`enterAndHear`/`letGapPass` (`target-sheet.test.tsx`'s two `letGapPass` uses, `tuner-fit-variants.test.tsx`, the rest of `tuner-screen.test.tsx`/`tuner-stave.test.tsx`) and none of them read the DOM elements the linger affects (`tuner-line`/`tuner-tag`/`heard-head`/`strip-cents`/`heard-hz`/`tuner-empty`) in a way the linger changes.
- No assertion anywhere was loosened or its expected value changed — only waits were added, both cited above.

## Tests added (practice.tuner/REQ-003, `tests/ui/scenarios/tuner-linger.test.tsx`)

- `S4 — the last reading lingers, then goes` — grey+present right after the gap (data-state, aria-hidden, colour), still present 0.5 s later, gone with "Play a note" 0.8 s after they turned grey; covers the big name, the line, the tag, the stave's head, its cents and the Hz, per the brief.
- `S5 — a note during the linger` — C5 shown at once at full strength, nothing `data-state="fading"` left, "Play a note" never appeared in between, the pending linger timer is cancelled.
- `S6 — lingering with a target` — the big name follows S2 at once (with "Play a note" beneath, immediately); the line/tag/head/Hz linger and fade exactly as S4.
- `reduced motion removes the linger at 0.8 s without fading` — `window.matchMedia` stubbed (`vi.stubGlobal`); no `style.transition` at any point, elements gone after the same 0.6 s + 0.2 s, "Play a note" then shown.
- Kept, renamed to `practice.tuner/REQ-003 — ...`: the ledger lines, the accidental glyph, the octave mark (all linger with the head, then fade/are gone), and the head-does-not-jump test. Deleted: the "a"/"b"/"c"/"a, interrupted"/"default" tests and the old follow-up-2 timing test — all tested treatments or a "cut" default that no longer exist.

## CONCERNS

- `pnpm check`'s composite command cannot complete this session because `eslint .` fails on files under `.claude/worktrees/deploy/` — a directory that appeared during this session from what `ps aux` shows is a concurrent Claude Desktop "cowork" VM process, not anything this task created or touched (`git status --short` confirms; the path is listed in `.git/info/exclude` as known SDD-tooling infrastructure). I ran every other step of `check` individually (prettier, tsc, the full vitest suite, cargo fmt/clippy/test) and all are green; `eslint . --ignore-pattern '.claude/worktrees/**'` is also clean across the whole repo. Flagging this so the controller can decide whether to re-run `pnpm check` once that external worktree is gone, rather than treating it as a defect in this task.
- The REQ-007/S3 gating decision (linger does not apply on a mic failure) and the `tuner-empty`/`targetPinnedSilent` fix for S6 were both necessary to keep the brief's own scenarios and existing tests true, but neither is spelled out explicitly in the brief's prose — noted above under "Decisions made" for review.

<!-- recorded 2026-09-29T18:34:37Z by scripts/record.sh -->
