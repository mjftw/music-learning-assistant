---
type: Task Review
title: Review package — T032 · 007-hear-me
description: The diff produced for T032, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T032.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T032.md
  - resource: git:66787651e5913c658b6ea366f14b9f975aaaa894..212eaa14b7bac42fbb73882b5709cb44a009c79c
generated:
  by: process:review-package.sh
  at: 2026-09-29T18:55:53Z
sdd_id: 007-hear-me
---

# Review package — T032 · 007-hear-me

base: `66787651e5913c658b6ea366f14b9f975aaaa894` → head: `212eaa14b7bac42fbb73882b5709cb44a009c79c`

## Files changed

- M	changes/007-hear-me/notes.md
- A	changes/007-hear-me/record/tasks/T031-report-1.md
- A	changes/007-hear-me/record/tasks/T031-review-1.md
- M	changes/007-hear-me/tasks.md
- M	src/ui/App.tsx
- M	src/ui/TunerLevel.tsx
- M	src/ui/TunerScreen.tsx
- M	src/ui/TunerStave.tsx
- M	src/ui/main.tsx
- M	src/ui/use-measured-size.ts
- D	tests/ui/scenarios/tuner-fit-variants.test.tsx
- A	tests/ui/scenarios/tuner-layout.test.tsx
- M	tests/ui/scenarios/tuner-screen.test.tsx

## Diff

```diff
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 53b1d4e..b1d8fea 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -614,3 +614,18 @@ For converge:
   the scrim and the head's `.18s` do not.
 - The in-tune band on the stave strip is drawn only while a note sounds
   and does not linger with the head.
+
+## T031 — the last reading lingers and fades (2026-09-29)
+
+- `motion.lingerHoldMs` 600, `motion.lingerFadeMs` 200 in
+  `src/ui/theme.ts`; promoted to docs/design.md §8 at the loop's exit.
+- A failed or refused microphone does not linger (REQ-007 clears the
+  reading; the "Can't hear" card shows at once). A hidden page lingers
+  unseen. With a target pinned "Play a note" shows at once under the
+  greyed name while the rest lingers (REQ-003/S6).
+- For converge (T031's review): the S4 test does not assert the grey
+  state on the big name; a real browser throttling timers in a
+  backgrounded tab during a linger is unverified.
+- `.claude/worktrees/deploy/` (another session's worktree, branch
+  `chore/deploy-cloudflare`) was being linted by `eslint .`; eslint now
+  ignores `.claude/`, as prettier does (7106bf1).
diff --git a/changes/007-hear-me/record/tasks/T031-report-1.md b/changes/007-hear-me/record/tasks/T031-report-1.md
new file mode 100644
index 0000000..a82b934
--- /dev/null
+++ b/changes/007-hear-me/record/tasks/T031-report-1.md
@@ -0,0 +1,120 @@
+---
+type: Implementation Report
+title: T031 — implementation report
+resource: /.sdd/reports/007-hear-me/T031.md
+status: draft
+tags: [sdd, report, "change:007-hear-me"]
+sources:
+  - resource: /.sdd/briefs/007-hear-me/T031.md
+generated:
+  by: claude-code/claude-sonnet-5
+  at: 2026-09-29T18:22:39Z
+sdd_id: 007-hear-me
+---
+
+TASK: T031
+STATUS: DONE_WITH_CONCERNS
+COMMIT: none (not committed, per instructions)
+FILES:
+src/ui/TunerScreen.tsx
+src/ui/TunerLevel.tsx
+src/ui/TunerStave.tsx
+src/ui/tuner-silence.ts
+src/ui/App.tsx
+src/ui/main.tsx
+src/ui/theme.ts
+tests/ui/scenarios/tuner-helpers.ts
+tests/ui/scenarios/tuner-screen.test.tsx
+tests/ui/scenarios/tuner-stave.test.tsx
+tests/ui/scenarios/tuner-linger.test.tsx (new — replaces tuner-silence-variants.test.tsx)
+tests/ui/scenarios/tuner-silence-variants.test.tsx (deleted)
+
+VERIFY:
+
+1) `pnpm vitest run tests/ui`
+```
+ RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
+
+ Test Files  26 passed (26)
+      Tests  138 passed (138)
+   Start at  19:22:06
+   Duration  7.60s (tests 59%, environment 20%, import 10%, transform 10%)
+```
+
+2) `pnpm vitest run tests/practice tests/ui`
+```
+ Test Files  60 passed (60)
+      Tests  276 passed (276)
+   Start at  19:22:19
+   Duration  10.04s (tests 55%, environment 29%, import 9%, transform 7%)
+```
+
+3a) `grep -rn "design-loop variant (007 round 4" src tests` — no output (clean).
+
+3b) `grep -rn "silence=\|lingerMs\|\"ghost\"\|\"cut\"" src tests` — no output (clean). Nothing left to explain — the whole `silence`/`lingerMs`/`lingerFadeMs` prop surface, the `"ghost"` data-state and the `"cut"` mode are gone.
+
+4) `grep -rn "design-loop variant (007 round 5)" src tests | wc -l` → `19` — unchanged from before this task (not decreased); every round-5 line (`src/ui/use-measured-size.ts`, `TunerStave.tsx:338`, `App.tsx:259,691`, `TunerScreen.tsx:182,283,311,621`, `main.tsx:147`, `TunerLevel.tsx:36,118,195,235,305`, `tuner-fit-variants.test.tsx` ×4) left exactly as it was. `pnpm vitest run tests/ui/scenarios/tuner-fit-variants.test.tsx` (confirms `?fit=a` still works):
+```
+ Test Files  1 passed (1)
+      Tests  4 passed (4)
+```
+
+5) `./scripts/check-scenarios.sh --change changes/007-hear-me | grep -c "❌"` → `0`. `practice.tuner/REQ-003/S1`–`S6` all show `✅ ... tested`.
+
+6) `./scripts/check-contexts.sh`
+```
+✅ context boundaries respected
+```
+
+7) `bash -c "source ~/.cargo/env && pnpm check"` — the composite command is currently blocked at the `eslint .` step by an **unrelated, external** worktree that appeared under `.claude/worktrees/deploy/` during this session (a concurrent Claude Desktop "cowork" VM process running elsewhere in this same checkout — confirmed via `ps aux`, and the path is explicitly listed in `.git/info/exclude`, i.e. known SDD-tooling infrastructure, not something this task touches or created). `git status --short` shows my change set is exactly the files listed above; that worktree directory is untracked and contains none of my files. To demonstrate the actual state, I ran each step of `check` individually:
+
+- `prettier --check .` → `All matched files use Prettier code style!`
+- `eslint . --ignore-pattern '.claude/worktrees/**'` → no output (clean) — confirms the *only* failures come from that external directory (`eslint .` unscoped reports 7 parsing errors, all under `.claude/worktrees/deploy/...`).
+- `tsc --noEmit` → no output (clean).
+- `pnpm vitest run` (the full suite):
+```
+ Test Files  77 passed (77)
+      Tests  337 passed (337)
+```
+- `cargo fmt --check` → clean (exit 0).
+- `cargo clippy --all-targets -- -D warnings` → `Finished` dev profile, no warnings.
+- `cargo test` → `test result: ok. 13 passed; 0 failed; 1 ignored` (listening) and `test result: ok. 24 passed; 0 failed; 1 ignored` (sound); doc-tests 0/0 both crates. Unaffected (no Rust files touched).
+
+CHECK:
+```
+ Test Files  77 passed (77)
+      Tests  337 passed (337)
+```
+(from `pnpm vitest run`, the vitest leg of `check`; see VERIFY 7 above for why the composite `pnpm check` command itself cannot complete this session, and for the per-step evidence that everything besides the external worktree noise is green.)
+
+## Decisions made
+
+- **`practice.tuner/REQ-003/S4`–`S6` and the reduced-motion test live in a new `tests/ui/scenarios/tuner-linger.test.tsx`** (the brief's own "your choice; say which"), replacing `tuner-silence-variants.test.tsx` outright rather than merging into `tuner-screen.test.tsx`/`tuner-stave.test.tsx` — these eight tests are all specifically about the linger/fade rule (REQ-003's own new clause), so one file that says what it is reads better than splitting them across the two screen files that already carry REQ-002/REQ-005's own scenarios.
+- **`src/ui/tuner-silence.ts` kept, same name.** Its whole content — the `StaleReading` type, `staleAttrs()`, `prefersReducedMotion()` — is still shared by `TunerScreen`/`TunerLevel`/`TunerStave` and the name still fits: it's still "what the screen does about a reading during silence", now stating the one rule instead of the exploration. I trimmed `dataState`/`grey` off `StaleReading` entirely (both are now constants — `data-state` is always `"fading"`, and lingering is always grey), simplifying every read site (`stale?.grey` → `stale !== undefined`).
+- **REQ-007/S3 (mic failure) does not linger.** The brief's own rule text ties the trigger to "the session's `tuner.reading` becomes null, 300 ms after the last detected pitch" — i.e. REQ-003's own clearing, not any clearing. The pre-existing `TunerScreen` code (from the round-4 exploration) triggered the stale/linger phase on *any* `tuner.reading` transition to null, with no such distinction. Left as-is, the existing untouched test `practice.tuner/REQ-007/S3 — failed while listening` (`tests/ui/scenarios/tuner-screen.test.tsx`, asserting `tuner-line` is `null` immediately after `listening.end()`, no wait) would have broken, and the brief's own "reads the SILENT state right after **the gap**" carve-out (for adding a wait) explicitly doesn't cover it — this is a different transition (mic failure), not the 300 ms gap. I added one condition to the phase effect: `tuner.listening.kind === "cannot-hear"` now short-circuits straight to `"empty"`, same as "nothing was ever heard" — matching REQ-007's own plain "the last reading is cleared" (immediate, no mention of any linger). This is a necessary ripple the brief's prose didn't spell out but the existing test required; flagging it here per AGENTS.md's own guidance on ripples the Files list doesn't name.
+- **`tuner-empty` ("Play a note") now also considers `targetPinnedSilent`.** REQ-003/S6 requires it to show *at once* alongside a target's greyed name while the line/tag/head still linger and fade (S2's own behaviour, unconditional). The old condition (`reading === null && (stale === undefined || stale.dataState === "ghost")`) would have kept "Play a note" hidden while `stale` was still defined, even with a target pinned — wrong for S6. Changed to `reading === null && (targetPinnedSilent || stale === undefined)`; verified this reproduces REQ-003/S2's own pre-round-4 behaviour when `stale` is always `undefined` (no target, no linger in flight).
+- **`enterTuner`/`enterAndHear` now always inject a deterministic linger timer** (`timer`, a `manualAnimationClock()` instance, wired as `setTimer`/`clearTimer` before `...extraProps` so a scenario's own override still wins). Before this task, `silence` defaulted to `"cut"`, which made TunerScreen's whole phase effect a no-op (`if (silence === "cut") return;`) — no timer was ever scheduled, so every existing test's use of the *real* `window.setTimeout` default never actually fired. Now that linger is the only path, every entered-tuner test schedules a real timer unless given a fake one; switching the default to an inert, explicitly-advanceable fake (rather than real wall-clock time) keeps every test deterministic with no behaviour change for tests that never advance it.
+- **`letLingerPass(f)`** (`tests/ui/scenarios/tuner-helpers.ts`) advances that timer past `motion.lingerHoldMs` then `motion.lingerFadeMs` **in two separate `advanceMs` calls**, not one combined `800`. `manualAnimationClock`'s `advanceMs` sets its virtual "now" to the target *before* firing anything due, so a timer a callback schedules mid-fire (the hold's own callback scheduling the fade) is due against that already-advanced "now" and only fires on a *later* `advanceMs` call unless the new delay is `0`. I corrected the helper's own stale comment (previously claimed a real-delay chain fires "within the same advance", which — checked against the pre-existing "b" test, which always used two separate calls too — was never actually true nor exercised).
+- **Colour assertions in the new tests compare against `rgb(...)`, not the theme's hex string.** jsdom's inline-style CSSOM canonicalises a hex colour (`paper.faint = "#9a9186"`) to `rgb(154, 145, 134)` but leaves a CSS function colour (`oklch(...)`, used by the existing sharp/flat/in-tune assertions) untouched — a small local `rgbOf()` helper in the test file reproduces the conversion from the theme token rather than hardcoding the converted string.
+
+## Existing tests touched, and why
+
+- `tests/ui/scenarios/tuner-screen.test.tsx` — `practice.tuner/REQ-003/S1 — silence on auto`: added `letLingerPass(f);` right after the existing 300 ms gap advance, before the silent-state assertions (unchanged). Reason: the linger is now the only behaviour, so the silent state ("Play a note", no line, no tag) is only reached 0.8 s after the gap, not immediately.
+- `tests/ui/scenarios/tuner-stave.test.tsx` — `practice.tuner/REQ-005/S5 — the trail outlives the note`: added `letLingerPass(f);` right after `letGapPass(f)`, before the first block of silent-state assertions (`heard-head`/`strip-cents`/`heard-hz`, all unchanged). Same reason. The rest of the test (the trail's own xs/`animClock.pending` assertions) is untouched and unaffected — the trail is driven by a separate clock (`animClock`, not `f.timer`) and reads `trailRef`, not `stale`.
+- No other existing test needed a change. I checked every test in `tests/ui/scenarios/` that calls `enterTuner`/`enterAndHear`/`letGapPass` (`target-sheet.test.tsx`'s two `letGapPass` uses, `tuner-fit-variants.test.tsx`, the rest of `tuner-screen.test.tsx`/`tuner-stave.test.tsx`) and none of them read the DOM elements the linger affects (`tuner-line`/`tuner-tag`/`heard-head`/`strip-cents`/`heard-hz`/`tuner-empty`) in a way the linger changes.
+- No assertion anywhere was loosened or its expected value changed — only waits were added, both cited above.
+
+## Tests added (practice.tuner/REQ-003, `tests/ui/scenarios/tuner-linger.test.tsx`)
+
+- `S4 — the last reading lingers, then goes` — grey+present right after the gap (data-state, aria-hidden, colour), still present 0.5 s later, gone with "Play a note" 0.8 s after they turned grey; covers the big name, the line, the tag, the stave's head, its cents and the Hz, per the brief.
+- `S5 — a note during the linger` — C5 shown at once at full strength, nothing `data-state="fading"` left, "Play a note" never appeared in between, the pending linger timer is cancelled.
+- `S6 — lingering with a target` — the big name follows S2 at once (with "Play a note" beneath, immediately); the line/tag/head/Hz linger and fade exactly as S4.
+- `reduced motion removes the linger at 0.8 s without fading` — `window.matchMedia` stubbed (`vi.stubGlobal`); no `style.transition` at any point, elements gone after the same 0.6 s + 0.2 s, "Play a note" then shown.
+- Kept, renamed to `practice.tuner/REQ-003 — ...`: the ledger lines, the accidental glyph, the octave mark (all linger with the head, then fade/are gone), and the head-does-not-jump test. Deleted: the "a"/"b"/"c"/"a, interrupted"/"default" tests and the old follow-up-2 timing test — all tested treatments or a "cut" default that no longer exist.
+
+## CONCERNS
+
+- `pnpm check`'s composite command cannot complete this session because `eslint .` fails on files under `.claude/worktrees/deploy/` — a directory that appeared during this session from what `ps aux` shows is a concurrent Claude Desktop "cowork" VM process, not anything this task created or touched (`git status --short` confirms; the path is listed in `.git/info/exclude` as known SDD-tooling infrastructure). I ran every other step of `check` individually (prettier, tsc, the full vitest suite, cargo fmt/clippy/test) and all are green; `eslint . --ignore-pattern '.claude/worktrees/**'` is also clean across the whole repo. Flagging this so the controller can decide whether to re-run `pnpm check` once that external worktree is gone, rather than treating it as a defect in this task.
+- The REQ-007/S3 gating decision (linger does not apply on a mic failure) and the `tuner-empty`/`targetPinnedSilent` fix for S6 were both necessary to keep the brief's own scenarios and existing tests true, but neither is spelled out explicitly in the brief's prose — noted above under "Decisions made" for review.
+
+<!-- recorded 2026-09-29T18:34:37Z by scripts/record.sh -->
diff --git a/changes/007-hear-me/record/tasks/T031-review-1.md b/changes/007-hear-me/record/tasks/T031-review-1.md
new file mode 100644
index 0000000..6d8105c
--- /dev/null
+++ b/changes/007-hear-me/record/tasks/T031-review-1.md
@@ -0,0 +1,1428 @@
+---
+type: Task Review
+title: Review package — T031 · 007-hear-me
+description: The diff produced for T031, for the task reviewer.
+resource: /.sdd/reviews/007-hear-me/T031.md
+status: draft
+tags: [sdd, review, "change:007-hear-me"]
+sources:
+  - resource: /.sdd/briefs/007-hear-me/T031.md
+  - resource: git:ce230ad70630bed76da6d7c445ebaa24e193dd21..66787651e5913c658b6ea366f14b9f975aaaa894
+generated:
+  by: process:review-package.sh
+  at: 2026-09-29T18:26:04Z
+sdd_id: 007-hear-me
+---
+
+# Review package — T031 · 007-hear-me
+
+base: `ce230ad70630bed76da6d7c445ebaa24e193dd21` → head: `66787651e5913c658b6ea366f14b9f975aaaa894`
+
+## Files changed
+
+- M	eslint.config.js
+- M	src/ui/App.tsx
+- M	src/ui/TunerLevel.tsx
+- M	src/ui/TunerScreen.tsx
+- M	src/ui/TunerStave.tsx
+- M	src/ui/main.tsx
+- M	src/ui/theme.ts
+- M	src/ui/tuner-silence.ts
+- M	tests/ui/scenarios/tuner-helpers.ts
+- R052	tests/ui/scenarios/tuner-silence-variants.test.tsx	tests/ui/scenarios/tuner-linger.test.tsx
+- M	tests/ui/scenarios/tuner-screen.test.tsx
+- M	tests/ui/scenarios/tuner-stave.test.tsx
+
+## Diff
+
+```diff
+diff --git a/eslint.config.js b/eslint.config.js
+index 15acd98..31681da 100644
+--- a/eslint.config.js
++++ b/eslint.config.js
+@@ -5,12 +5,14 @@ export default tseslint.config(
+   // changes/ holds SDD artefacts and vendored design references, never
+   // lintable app code; scripts/*.mjs are plain Node tooling outside the
+   // app's TS project (tsconfig.json's `include`), not type-checked.
++  // .claude/ can hold another session's git worktree (a second checkout).
+   {
+     ignores: [
+       "dist/**",
+       "node_modules/**",
+       "changes/**",
+       ".sdd/**",
++      ".claude/**",
+       "scripts/*.mjs",
+     ],
+   },
+diff --git a/src/ui/App.tsx b/src/ui/App.tsx
+index d7ea103..63931c0 100644
+--- a/src/ui/App.tsx
++++ b/src/ui/App.tsx
+@@ -58,7 +58,6 @@ import { TransportCard } from "./TransportCard";
+ import { TraversalRow } from "./TraversalRow";
+ import { TraversalSheet } from "./TraversalSheet";
+ import { TunerScreen } from "./TunerScreen";
+-import type { SilenceMode } from "./tuner-silence";
+ 
+ const DEFAULT_VARIANT_ID = "flute-concert";
+ const DEFAULT_KEY_ID = "C-major";
+@@ -246,16 +245,11 @@ export function App(props: {
+   readonly now?: () => number;
+   readonly requestFrame?: (callback: FrameRequestCallback) => number;
+   readonly cancelFrame?: (handle: number) => void;
+-  // design-loop variant (007 round 4) — optional, additive, forwarded
+-  // straight to TunerScreen: the silence treatment and its own injectable
+-  // timer. TEMPORARY — deleted along with the rest of this exploration.
+-  readonly silence?: SilenceMode;
++  // practice.tuner/REQ-003 — optional, additive, forwarded straight to
++  // TunerScreen: the linger's own injectable timer, real setTimeout/
++  // clearTimeout by default — a test's own route to it.
+   readonly setTimer?: (callback: () => void, delayMs: number) => number;
+   readonly clearTimer?: (handle: number) => void;
+-  // design-loop variant (007 round 4, follow-up 2) — the linger treatment's
+-  // own hold/fade timing, forwarded the same way.
+-  readonly lingerMs?: number;
+-  readonly lingerFadeMs?: number;
+   // design-loop variant (007 round 5) — optional, additive, forwarded
+   // straight to TunerScreen: the two layout treatments' own switch.
+   // TEMPORARY — deleted along with the rest of this exploration.
+@@ -270,11 +264,8 @@ export function App(props: {
+     now,
+     requestFrame,
+     cancelFrame,
+-    silence,
+     setTimer,
+     clearTimer,
+-    lingerMs,
+-    lingerFadeMs,
+     fit,
+   } = props;
+   const [selection, setSelection] = useState<Selection>(() =>
+@@ -723,11 +714,8 @@ export function App(props: {
+           {...(now !== undefined ? { now } : {})}
+           {...(requestFrame !== undefined ? { requestFrame } : {})}
+           {...(cancelFrame !== undefined ? { cancelFrame } : {})}
+-          {...(silence !== undefined ? { silence } : {})}
+           {...(setTimer !== undefined ? { setTimer } : {})}
+           {...(clearTimer !== undefined ? { clearTimer } : {})}
+-          {...(lingerMs !== undefined ? { lingerMs } : {})}
+-          {...(lingerFadeMs !== undefined ? { lingerFadeMs } : {})}
+           {...(fit !== undefined ? { fit } : {})}
+         />
+       ) : (
+diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
+index f86d7f0..53f4fa7 100644
+--- a/src/ui/TunerLevel.tsx
++++ b/src/ui/TunerLevel.tsx
+@@ -15,14 +15,10 @@ import {
+   type SpellingPreference,
+ } from "../theory/published";
+ import { formatCents } from "./cents-label";
+-import { fonts, paper, tuner } from "./theme";
++import { fonts, motion, paper, tuner } from "./theme";
+ import { staleAttrs, type StaleReading } from "./tuner-silence";
+ import { useMeasuredSize } from "./use-measured-size";
+ 
+-// design-loop variant (007 round 4) — "Play a note"'s own entrance once a's
+-// or b's own fade has finished (TunerScreen's `emptyOpacity` prop, below).
+-const EMPTY_FADE_IN_MS = 200;
+-
+ // Geometry below is copied verbatim from the vendored visual reference
+ // (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
+ // 142-181, and the `level()` helper at lines 1130-1138: `L4 = level(536,
+@@ -225,11 +221,10 @@ export function levelGeometryFor(areaHeight: number): LevelGeometry {
+ export function TunerLevel(props: {
+   readonly tuner: TunerSnapshot;
+   readonly spelling: SpellingPreference;
+-  // design-loop variant (007 round 4) — `stale` is the last reading, still
+-  // shown fading or ghosted (`undefined` when nothing is: live, "cut", or
+-  // truly nothing to show); `emptyOpacity` drives "Play a note"'s own
+-  // entrance once a's/b's fade has ended (`undefined` outside that moment —
+-  // no style change, exactly today's behaviour).
++  // practice.tuner/REQ-003 — `stale` is the last reading, still lingering
++  // (`undefined` when nothing is: live, or truly nothing to show);
++  // `emptyOpacity` drives "Play a note"'s own entrance once the linger's
++  // fade has ended (`undefined` outside that moment — no style change).
+   readonly stale?: StaleReading;
+   readonly emptyOpacity?: number;
+   // design-loop variant (007 round 5) — "fixed" (today, the default): the
+@@ -250,18 +245,18 @@ export function TunerLevel(props: {
+   const cannotHear = snapshot.listening.kind === "cannot-hear";
+   const targetPinnedSilent = snapshot.targetNote !== null && reading === null;
+ 
+-  // design-loop variant (007 round 4) — with a target pinned, the big name
+-  // always follows REQ-003/S2 below, unaffected by the silence treatment
+-  // (`staleForName` stays `undefined`); with none pinned, `stale` (when
+-  // present) stands in for the reading that just cleared, so the name
+-  // doesn't disappear on its own ahead of the line/tag/stave.
++  // practice.tuner/REQ-003 — with a target pinned, the big name always
++  // follows REQ-003/S2 below, unaffected by the linger (`staleForName` stays
++  // `undefined` — REQ-003/S6); with none pinned, `stale` (when present)
++  // stands in for the reading that just cleared, so the name doesn't
++  // disappear on its own ahead of the line/tag/stave.
+   const staleForName = !targetPinnedSilent ? stale : undefined;
+ 
+   // The note the big name shows: the current reading's target (the
+   // pinned note, or the nearest note with hysteresis) when there is one,
+   // else the pinned target alone (practice.tuner/REQ-003/S2 — the target
+   // stays shown, greyed, through a silence), else the stale reading's own
+-  // target while fading/ghosted.
++  // target while it lingers.
+   const referenceNote: Note | null =
+     reading?.target ??
+     (snapshot.targetNote !== null
+@@ -279,20 +274,17 @@ export function TunerLevel(props: {
+       : noteLabel(noteAtPosition(referencePosition - 1, spelling));
+ 
+   // practice.tuner/REQ-003 — greyed once a target is pinned but nothing is
+-  // currently heard; otherwise the normal ink, except while an unpinned
+-  // stale reading is greyed too (b, c — design-loop variant, 007 round 4).
+-  const nameInk = targetPinnedSilent
+-    ? paper.faint
+-    : staleForName !== undefined && staleForName.grey
+-      ? paper.faint
+-      : paper.ink;
++  // currently heard, or while an unpinned stale reading lingers; otherwise
++  // the normal ink.
++  const nameInk =
++    targetPinnedSilent || staleForName !== undefined ? paper.faint : paper.ink;
+ 
+   const nameStaleAttrs = staleAttrs(staleForName);
+ 
+   // The "playing <heard note>" caption — only while pinned and the heard
+   // note differs from the target (practice.tuner/REQ-004/S1, S3). Reads off
+-  // `effectiveReading` (design-loop variant, 007 round 4) so it fades/ghosts
+-  // with the rest of the tag rather than vanishing ahead of it.
++  // `effectiveReading` so it lingers and fades with the rest of the tag
++  // rather than vanishing ahead of it.
+   const effectiveReading = reading ?? stale?.reading ?? null;
+   const captionText =
+     effectiveReading !== null &&
+@@ -325,13 +317,11 @@ export function TunerLevel(props: {
+           levelGeometry.areaMid,
+           levelGeometry.pxPerCent,
+         );
+-  // design-loop variant (007 round 4) — a's own fade keeps the verdict's own
+-  // colour (only opacity changes); b's/c's stale states grey it instead. Only
+-  // read when `geometry` is non-null (the line/tag's own render guard), so
+-  // the `paper.faint` fallback here is never actually shown.
+-  const displayTone = stale?.grey
+-    ? paper.faint
+-    : (geometry?.tone ?? paper.faint);
++  // practice.tuner/REQ-003 — grey while lingering. Only read when `geometry`
++  // is non-null (the line/tag's own render guard), so the `paper.faint`
++  // fallback here is never actually shown.
++  const displayTone =
++    stale !== undefined ? paper.faint : (geometry?.tone ?? paper.faint);
+   const lineTagStaleAttrs = staleAttrs(reading === null ? stale : undefined);
+ 
+   return (
+@@ -549,13 +539,13 @@ export function TunerLevel(props: {
+                   </div>
+                 </div>
+               )}
+-              {/* design-loop variant (007 round 4) — "Play a note" shows
+-                  whenever nothing live is heard, except while a/b's stale
+-                  reading is still fading (absent until its timer ends);
+-                  c's ghost shows it at once, alongside the still-ghosted
+-                  reading (REQ-003/S2's own layout, reused). */}
++              {/* practice.tuner/REQ-003 — "Play a note" shows whenever
++                  nothing live is heard, except while an unpinned reading is
++                  still lingering (absent until its own timer ends, S4);
++                  with a target pinned it shows at once, alongside the still-
++                  lingering line/tag/head (S2, S6). */}
+               {reading === null &&
+-                (stale === undefined || stale.dataState === "ghost") && (
++                (targetPinnedSilent || stale === undefined) && (
+                   <div
+                     data-testid="tuner-empty"
+                     style={{
+@@ -566,7 +556,7 @@ export function TunerLevel(props: {
+                       ...(emptyOpacity !== undefined
+                         ? {
+                             opacity: emptyOpacity,
+-                            transition: `opacity ${EMPTY_FADE_IN_MS}ms`,
++                            transition: `opacity ${motion.lingerFadeMs}ms`,
+                           }
+                         : {}),
+                     }}
+diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
+index 60590c3..b92d6f5 100644
+--- a/src/ui/TunerScreen.tsx
++++ b/src/ui/TunerScreen.tsx
+@@ -12,12 +12,8 @@ import type { NoteJudged, TunerSnapshot } from "../practice/published";
+ import type { NoteRange, SpellingPreference } from "../theory/published";
+ import { TargetPill } from "./TargetPill";
+ import { TargetSheet } from "./TargetSheet";
+-import { fonts, paper } from "./theme";
+-import {
+-  prefersReducedMotion,
+-  type SilenceMode,
+-  type StaleReading,
+-} from "./tuner-silence";
++import { fonts, motion, paper } from "./theme";
++import { prefersReducedMotion, type StaleReading } from "./tuner-silence";
+ import { TunerLevel } from "./TunerLevel";
+ import { TRAIL_MS, TunerStave, type TrailPoint } from "./TunerStave";
+ 
+@@ -34,12 +30,11 @@ function defaultCancelFrame(handle: number): void {
+   cancelAnimationFrame(handle);
+ }
+ 
+-// design-loop variant (007 round 4) — the silence treatments' own
+-// injectable timer (the moments that need JavaScript: removing a fade's
+-// elements once it has ended, starting linger's fade after its hold), in
+-// the same spirit as now/requestFrame/cancelFrame above: real setTimeout/
+-// clearTimeout by default, a fake, advanceable one in tests
+-// (manualAnimationClock's own setTimer/clearTimer).
++// practice.tuner/REQ-003 — the linger's own injectable timer (the moments
++// that need JavaScript: starting the fade after the hold, removing the
++// elements once it has ended), in the same spirit as now/requestFrame/
++// cancelFrame above: real setTimeout/clearTimeout by default, a fake,
++// advanceable one in tests (manualAnimationClock's own setTimer/clearTimer).
+ function defaultSetTimer(callback: () => void, delayMs: number): number {
+   return window.setTimeout(callback, delayMs);
+ }
+@@ -47,30 +42,18 @@ function defaultClearTimer(handle: number): void {
+   window.clearTimeout(handle);
+ }
+ 
+-// design-loop variant (007 round 4) — the durations named, not inlined
+-// (docs/design.md-style constants). FADE_MS is a's own fade; LINGER_MS and
+-// LINGER_FADE_MS are b's hold and its own fade. "Play a note"'s own entrance
+-// (EMPTY_FADE_IN_MS) is named in TunerLevel.tsx, the only place that reads
+-// it in a style — this file only decides *when* that entrance starts
+-// (`emptyOpacity`, below), via the same setTimer it schedules the fades with.
+-const FADE_MS = 600;
+-const LINGER_MS = 1000;
+-const LINGER_FADE_MS = 400;
+-
+-// design-loop variant (007 round 4) — the silence view's own phase: "live"
+-// while a reading sounds (or nothing has ever been heard), "stale" while
+-// the last reading lingers (fading or ghosted — the values here are exactly
++// practice.tuner/REQ-003 — the last reading's own phase once nothing more is
++// heard: "live" while a reading sounds (or nothing has ever been heard),
++// "stale" while it lingers (held, then fading — the values here are exactly
+ // StaleReading minus its `reading`, which comes from staleReadingRef,
+-// below), "empty" once nothing more is shown ("Play a note"; `enteredViaTimer`
+-// marks the transition a's/b's own fade-completion timer drove, the one
+-// that gets its own 200 ms entrance).
++// below), "empty" once nothing more is shown ("Play a note";
++// `enteredViaTimer` marks the transition the linger's own fade-completion
++// timer drove, the one that gets its own entrance fade below).
+ type SilencePhase =
+   | { readonly kind: "live" }
+   | {
+       readonly kind: "stale";
+-      readonly dataState: "fading" | "ghost";
+       readonly opacity: number;
+-      readonly grey: boolean;
+       readonly transitionMs: number | null;
+     }
+   | { readonly kind: "empty"; readonly enteredViaTimer: boolean };
+@@ -269,17 +252,10 @@ function TunerScreenComponent(props: {
+   readonly now?: () => number;
+   readonly requestFrame?: (callback: FrameRequestCallback) => number;
+   readonly cancelFrame?: (handle: number) => void;
+-  // design-loop variant (007 round 4) — the silence treatment; "cut" (today's
+-  // behaviour) by default. setTimer/clearTimer are the treatments' own
+-  // injectable timer, real setTimeout/clearTimeout by default.
+-  readonly silence?: SilenceMode;
++  // practice.tuner/REQ-003 — the linger's own injectable timer, real
++  // setTimeout/clearTimeout by default.
+   readonly setTimer?: (callback: () => void, delayMs: number) => number;
+   readonly clearTimer?: (handle: number) => void;
+-  // design-loop variant (007 round 4, follow-up 2) — the linger treatment's
+-  // own hold/fade durations, in place of LINGER_MS/LINGER_FADE_MS, so the
+-  // switch can offer several timings of the same treatment side by side.
+-  readonly lingerMs?: number;
+-  readonly lingerFadeMs?: number;
+   // design-loop variant (007 round 5) — "fixed" (today, the default): no
+   // change. "flex": the screen is exactly the viewport's visible height,
+   // the level takes whatever's left. "flex-compact": as "flex", and the
+@@ -301,11 +277,8 @@ function TunerScreenComponent(props: {
+     now = defaultNow,
+     requestFrame = defaultRequestFrame,
+     cancelFrame = defaultCancelFrame,
+-    silence = "cut",
+     setTimer = defaultSetTimer,
+     clearTimer = defaultClearTimer,
+-    lingerMs = LINGER_MS,
+-    lingerFadeMs = LINGER_FADE_MS,
+     fit = "fixed",
+   } = props;
+   // design-loop variant (007 round 5) — "flex-compact" only: the footer
+@@ -416,12 +389,10 @@ function TunerScreenComponent(props: {
+     };
+   });
+ 
+-  // design-loop variant (007 round 4) — the silence treatment's own view
+-  // state: the last reading shown (never updated while it is fading or
+-  // ghosted — this only ever advances while `tuner.reading` is non-null,
+-  // mirroring `lastReadingRef` above but never reset to null by a gap, since
+-  // its whole point is to survive one), and the phase that drives what
+-  // TunerLevel/TunerStave render while `silence !== "cut"`.
++  // practice.tuner/REQ-003 — the last reading shown, never updated once it
++  // starts lingering: this only ever advances while `tuner.reading` is
++  // non-null, mirroring `lastReadingRef` above but never reset to null by a
++  // gap, since its whole point is to survive one.
+   const staleReadingRef = useRef<NoteJudged | null>(null);
+   if (tuner.reading !== null) {
+     staleReadingRef.current = tuner.reading;
+@@ -431,8 +402,6 @@ function TunerScreenComponent(props: {
+   const reducedMotion = prefersReducedMotion();
+ 
+   useEffect(() => {
+-    if (silence === "cut") return;
+-
+     const clearPendingTimer = (): void => {
+       if (silenceTimerRef.current !== null) {
+         clearTimer(silenceTimerRef.current);
+@@ -442,81 +411,51 @@ function TunerScreenComponent(props: {
+ 
+     if (tuner.reading !== null) {
+       // A live reading is shown at once — no fade in, nothing stale left
+-      // pending (practice.tuner "a, interrupted").
++      // pending (practice.tuner/REQ-003/S5).
+       clearPendingTimer();
+       setPhase({ kind: "live" });
+       return;
+     }
+ 
+-    if (staleReadingRef.current === null) {
+-      // Silence before anything was ever heard — nothing to linger.
++    // practice.tuner/REQ-007/S3 — a microphone failure clears the reading at
++    // once: the "Can't hear" card takes over, not a lingering reading. Only
++    // an ordinary silence (REQ-003) lingers; and there is nothing to linger
++    // before anything has ever been heard.
++    if (
++      staleReadingRef.current === null ||
++      tuner.listening.kind === "cannot-hear"
++    ) {
+       setPhase({ kind: "empty", enteredViaTimer: false });
+       return;
+     }
+ 
+-    if (silence === "ghost") {
+-      // c — no timer at all: grey, held until the next reading or unmount.
+-      setPhase({
+-        kind: "stale",
+-        dataState: "ghost",
+-        opacity: 1,
+-        grey: true,
+-        transitionMs: null,
+-      });
+-      return;
+-    }
+-
+-    if (silence === "fade") {
+-      // a — opacity 1 → 0 over FADE_MS, in its original colour.
+-      setPhase({
+-        kind: "stale",
+-        dataState: "fading",
+-        opacity: reducedMotion ? 1 : 0,
+-        grey: false,
+-        transitionMs: reducedMotion ? null : FADE_MS,
+-      });
+-      silenceTimerRef.current = setTimer(() => {
+-        silenceTimerRef.current = null;
+-        setPhase({ kind: "empty", enteredViaTimer: true });
+-      }, FADE_MS);
+-      return clearPendingTimer;
+-    }
+-
+-    // b — grey at once, held lingerMs, then fades over lingerFadeMs
+-    // (design-loop variant, 007 round 4, follow-up 2 — the switch's own
+-    // timing per `?variant`, in place of the LINGER_MS/LINGER_FADE_MS
+-    // constants).
+-    setPhase({
+-      kind: "stale",
+-      dataState: "fading",
+-      opacity: 1,
+-      grey: true,
+-      transitionMs: null,
+-    });
++    // practice.tuner/REQ-003/S4 — grey at once, held for motion.lingerHoldMs,
++    // then faded out over motion.lingerFadeMs; reduced motion holds at
++    // opacity 1 throughout and is removed with no transition at the same
++    // 0.8 s mark instead.
++    setPhase({ kind: "stale", opacity: 1, transitionMs: null });
+     silenceTimerRef.current = setTimer(() => {
+       setPhase({
+         kind: "stale",
+-        dataState: "fading",
+         opacity: reducedMotion ? 1 : 0,
+-        grey: true,
+-        transitionMs: reducedMotion ? null : lingerFadeMs,
++        transitionMs: reducedMotion ? null : motion.lingerFadeMs,
+       });
+       silenceTimerRef.current = setTimer(() => {
+         silenceTimerRef.current = null;
+         setPhase({ kind: "empty", enteredViaTimer: true });
+-      }, lingerFadeMs);
+-    }, lingerMs);
++      }, motion.lingerFadeMs);
++    }, motion.lingerHoldMs);
+     return clearPendingTimer;
+     // `reducedMotion` is deliberately not a dependency: it's read fresh each
+-    // time this effect runs (whenever the reading or the mode itself
+-    // changes), and re-running the whole timer chain on every render were it
+-    // tracked (it isn't memoised) would restart an already-scheduled fade.
+-  }, [tuner.reading, silence, setTimer, clearTimer, lingerMs, lingerFadeMs]);
+-
+-  // design-loop variant (007 round 4) — "Play a note"'s own entrance once a
+-  // fade (a or b) has finished (`enteredViaTimer`): starts at opacity 0,
+-  // flips to 1 one (fake-timer-injectable) tick later so the CSS transition
+-  // in TunerLevel has something to animate from. Reduced motion: appears at
++    // time this effect runs (whenever the reading changes), and re-running
++    // the whole timer chain on every render were it tracked (it isn't
++    // memoised) would restart an already-scheduled fade.
++  }, [tuner.reading, tuner.listening.kind, setTimer, clearTimer]);
++
++  // practice.tuner/REQ-003 — "Play a note"'s own entrance once the linger's
++  // fade has finished (`enteredViaTimer`): starts at opacity 0, flips to 1
++  // one (fake-timer-injectable) tick later so the CSS transition in
++  // TunerLevel has something to animate from. Reduced motion: appears at
+   // once, no transition.
+   const [emptyFadingIn, setEmptyFadingIn] = useState(false);
+   const emptyTimerRef = useRef<number | null>(null);
+@@ -525,12 +464,7 @@ function TunerScreenComponent(props: {
+       clearTimer(emptyTimerRef.current);
+       emptyTimerRef.current = null;
+     }
+-    if (
+-      silence !== "cut" &&
+-      phase.kind === "empty" &&
+-      phase.enteredViaTimer &&
+-      !reducedMotion
+-    ) {
++    if (phase.kind === "empty" && phase.enteredViaTimer && !reducedMotion) {
+       setEmptyFadingIn(true);
+       emptyTimerRef.current = setTimer(() => {
+         emptyTimerRef.current = null;
+@@ -545,24 +479,19 @@ function TunerScreenComponent(props: {
+         emptyTimerRef.current = null;
+       }
+     };
+-  }, [phase, silence, reducedMotion, setTimer, clearTimer]);
++  }, [phase, reducedMotion, setTimer, clearTimer]);
+ 
+   const stale: StaleReading | undefined =
+     phase.kind === "stale" && staleReadingRef.current !== null
+       ? {
+           reading: staleReadingRef.current,
+-          dataState: phase.dataState,
+           opacity: phase.opacity,
+-          grey: phase.grey,
+           transitionMs: phase.transitionMs,
+         }
+       : undefined;
+ 
+   const emptyOpacity: number | undefined =
+-    silence !== "cut" &&
+-    phase.kind === "empty" &&
+-    phase.enteredViaTimer &&
+-    !reducedMotion
++    phase.kind === "empty" && phase.enteredViaTimer && !reducedMotion
+       ? emptyFadingIn
+         ? 0
+         : 1
+diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
+index e07d03e..1f5b46e 100644
+--- a/src/ui/TunerStave.tsx
++++ b/src/ui/TunerStave.tsx
+@@ -325,11 +325,8 @@ export function TunerStave(props: {
+   // TunerScreen's injectable "now" while silent and the trail is still
+   // aging (TunerScreen's own rAF-driven re-renders keep advancing it).
+   readonly nowMs: number;
+-  // design-loop variant (007 round 4) — the last reading, still shown
+-  // fading or ghosted; `undefined` when nothing is (live, "cut", or truly
+-  // nothing to show). Only the head, its cents and the Hz figure read it
+-  // (below) — the ledgers, guide and accidental stay tied to a live
+-  // `reading` only, disappearing at once as they always have.
++  // practice.tuner/REQ-003 — the last reading, still lingering; `undefined`
++  // when nothing is (live, or truly nothing to show).
+   readonly stale?: StaleReading;
+ }): JSX.Element {
+   const { tuner: snapshot, trail, nowMs, stale } = props;
+@@ -350,10 +347,9 @@ export function TunerStave(props: {
+   const { ref: sizeRef, size: cardSize } = useMeasuredSize<HTMLDivElement>();
+   const cardScale =
+     cardSize === null ? 1 : Math.min(1, cardSize.width / CARD_WIDTH);
+-  // design-loop variant (007 round 4) — the reading the head/cents/Hz
+-  // display: live when there is one, else the stale reading while it's
+-  // fading/ghosted, so those elements linger in place rather than
+-  // disappearing with the rest.
++  // practice.tuner/REQ-003 — the reading the head/cents/Hz display: live
++  // when there is one, else the last reading while it lingers, so those
++  // elements stay in place rather than disappearing with the rest.
+   const effectiveReading = reading ?? stale?.reading ?? null;
+ 
+   // The register decision is made once, from whichever note governs the
+@@ -385,10 +381,10 @@ export function TunerStave(props: {
+       ? null
+       : placeHeard(reading.heard.nearest, reading.heard.cents, adj);
+   const target = targetNote === null ? null : placeTarget(targetNote, adj);
+-  // design-loop variant (007 round 4) — the head/cents/Hz's own placement,
+-  // off `effectiveReading` rather than `heard` (which stays live-only, still
++  // practice.tuner/REQ-003 — the head/cents/Hz's own placement, off
++  // `effectiveReading` rather than `heard` (which stays live-only, still
+   // governing the ledgers/guide/accidental below): identical to `heard`
+-  // while live, and the last reading's placement while fading/ghosted.
++  // while live, and the last reading's placement while it lingers.
+   const heardStale =
+     effectiveReading === null
+       ? null
+@@ -400,20 +396,20 @@ export function TunerStave(props: {
+ 
+   const tone =
+     reading === null ? paper.faint : TONE_BY_VERDICT[reading.verdict];
+-  // design-loop variant (007 round 4) — a's own fade keeps the verdict's own
+-  // colour (only opacity changes); b's/c's stale states grey it instead.
+-  // Drives the head/cents/Hz only (`tone` above stays live-only, still
+-  // governing the trail gradient and the accidental).
+-  const displayTone = stale?.grey
+-    ? paper.faint
+-    : effectiveReading === null
++  // practice.tuner/REQ-003 — grey while lingering. Drives the head/cents/Hz
++  // only (`tone` above stays live-only, still governing the trail gradient
++  // and the accidental).
++  const displayTone =
++    stale !== undefined
+       ? paper.faint
+-      : TONE_BY_VERDICT[effectiveReading.verdict];
++      : effectiveReading === null
++        ? paper.faint
++        : TONE_BY_VERDICT[effectiveReading.verdict];
+   const headStaleAttrs = staleAttrs(reading === null ? stale : undefined);
+ 
+-  // design-loop variant (007 round 4, follow-up 1) — off `heardStale`, not
+-  // `heard`, so the octave mark lingers with the head; the same grey as the
+-  // lingering head in b/c, its own ink otherwise (never verdict-toned).
++  // practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the octave
++  // mark lingers with the head; the same grey as the lingering head, its
++  // own ink otherwise (never verdict-toned).
+   const heardStaleMarkY =
+     heardStale !== null && heardStale.position.mark !== ""
+       ? octaveMarkY(
+@@ -422,7 +418,7 @@ export function TunerStave(props: {
+           heardStale.hy,
+         )
+       : null;
+-  const headOctaveMarkColor = stale?.grey ? paper.faint : paper.inkSoft;
++  const headOctaveMarkColor = stale !== undefined ? paper.faint : paper.inkSoft;
+   const targetMarkYValue =
+     target !== null && target.position.mark !== ""
+       ? targetMarkY(target.position.mark, target.position.y)
+@@ -438,13 +434,11 @@ export function TunerStave(props: {
+   // stave-lines-only baseline, exactly as an empty reading always did.
+   // TRAIL_MS is used directly for all trail age calculations.
+   //
+-  // design-loop variant (007 round 4, follow-up 1) — off `heardStale`
+-  // first, not `heard`: while a/b/c's own lingering head (and its
+-  // furniture) is still drawn, the layout must keep seeing exactly that
+-  // head's own contribution, not the trail's (which can itself go empty —
+-  // c's own ghost outlives the 2.5 s trail) — the trail fallback below
+-  // only ever stands in once `heardStale` itself is `null` too (the
+-  // lingering head has actually been removed).
++  // practice.tuner/REQ-003 — off `heardStale` first, not `heard`: while the
++  // lingering head (and its furniture) is still drawn, the layout must keep
++  // seeing exactly that head's own contribution, not the trail's — the
++  // trail fallback below only ever stands in once `heardStale` itself is
++  // `null` too (the lingering head has actually been removed).
+   const layoutHeard =
+     heardStale !== null
+       ? heardStale
+@@ -469,8 +463,8 @@ export function TunerStave(props: {
+   // (lines 1271-1279), reproduced with our simplified single-clef model.
+   const tops: number[] = [82];
+   const bots: number[] = [136];
+-  // design-loop variant (007 round 4) — off `heardStale`, not `heard`, so
+-  // the cents figure stays in place through a's/b's/c's own fade/ghost.
++  // practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the cents
++  // figure stays in place through the linger.
+   const centsTop =
+     heardStale !== null
+       ? Math.min(heardStale.position.y, heardStale.hy) - CENTS_TOP_OFFSET
+@@ -544,8 +538,8 @@ export function TunerStave(props: {
+   const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
+   const referenceLabel =
+     referenceNote === null ? "— IS" : `${noteLabel(referenceNote)} IS`;
+-  // design-loop variant (007 round 4) — off `effectiveReading`, so the Hz
+-  // figure lingers with the rest through a's/b's/c's own fade/ghost.
++  // practice.tuner/REQ-003 — off `effectiveReading`, so the Hz figure
++  // lingers with the rest.
+   const heardHz = effectiveReading === null ? null : effectiveReading.heard.hz;
+ 
+   return (
+@@ -653,13 +647,13 @@ export function TunerStave(props: {
+               />
+             </>
+           )}
+-          {/* design-loop variant (007 round 4, follow-up 1) — the heard
+-              head's own furniture: gated on `heardStale`, not `heard`, and
+-              carrying the head's own data-state/aria-hidden/opacity, so the
+-              ledgers and the dotted guide linger with the head rather than
+-              vanishing out from under it (leaving it floating with no
+-              ledger lines). Colour untouched — neither is verdict-toned
+-              today, so only opacity animates. */}
++          {/* practice.tuner/REQ-003 — the heard head's own furniture: gated
++              on `heardStale`, not `heard`, and carrying the head's own
++              data-state/aria-hidden/opacity, so the ledgers and the dotted
++              guide linger with the head rather than vanishing out from
++              under it (leaving it floating with no ledger lines). Colour
++              untouched — neither is verdict-toned, so only opacity
++              animates. */}
+           {heardStale !== null && (
+             <>
+               {heardStale.ledgers.map((ledger, index) => (
+@@ -803,12 +797,11 @@ export function TunerStave(props: {
+               {ACCIDENTAL_GLYPH[targetNote.accidental]}
+             </div>
+           )}
+-        {/* design-loop variant (007 round 4, follow-up 1) — off
+-            `heardStale`/`effectiveReading`, not `heard`/`reading`, and
+-            `displayTone` (not `tone`, which the trail's gradient must keep
+-            reading unchanged), so the accidental lingers with the head at
+-            the colour/opacity/grey it carries, instead of losing its own
+-            sharp/flat while the head is still shown. */}
++        {/* practice.tuner/REQ-003 — off `heardStale`/`effectiveReading`, not
++            `heard`/`reading`, and `displayTone` (not `tone`, which the
++            trail's gradient must keep reading unchanged), so the accidental
++            lingers with the head at the colour/opacity it carries, instead
++            of losing its own sharp/flat while the head is still shown. */}
+         {heardStale !== null &&
+           effectiveReading !== null &&
+           effectiveReading.heard.nearest.accidental !== "natural" && (
+@@ -867,12 +860,10 @@ export function TunerStave(props: {
+               {formatCents(effectiveReading.heard.cents)}
+             </div>
+           )}
+-        {/* design-loop variant (007 round 4, follow-up 1) — off
+-            `heardStale`, not `heard` (and a new test id — there wasn't one
+-            today), so the octave mark lingers with the head; the same grey
+-            as the lingering head in b/c (`headOctaveMarkColor`), its own
+-            ink otherwise — it was never verdict-toned, so a's own fade
+-            leaves its colour alone too. */}
++        {/* practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the
++            octave mark lingers with the head; the same grey as the
++            lingering head (`headOctaveMarkColor`), its own ink otherwise —
++            it was never verdict-toned. */}
+         {heardStale !== null &&
+           heardStale.position.mark !== "" &&
+           heardStaleMarkY !== null && (
+diff --git a/src/ui/main.tsx b/src/ui/main.tsx
+index 2e04db2..4807264 100644
+--- a/src/ui/main.tsx
++++ b/src/ui/main.tsx
+@@ -24,7 +24,6 @@ import {
+ import { builtInCatalogue } from "../theory/published";
+ import { App } from "./App";
+ import { localStorageSelectionStore } from "./selection-store";
+-import type { SilenceMode } from "./tuner-silence";
+ 
+ const rootElement = document.getElementById("root");
+ if (rootElement === null) {
+@@ -113,37 +112,6 @@ exposeSoundForTiming(sound);
+ const listening = webAudioListening(audioContext);
+ exposeListeningForTiming(listening);
+ 
+-// design-loop variant (007 round 4) — the tuner's silence treatment,
+-// exploring "it's very abrupt how quickly everything disappears when going
+-// from hearing something to nothing" on the phone via `?variant=a|b|c`.
+-// TEMPORARY — deleted, along with every other block carrying this comment,
+-// once one treatment/timing is chosen.
+-//
+-// design-loop variant (007 round 4, follow-up 2) — the user picked b
+-// (linger) and asked to try it with a faster fade ("b but try with faster
+-// fade"), so all three letters are now the linger treatment at different
+-// timings rather than three different treatments: `a` fades twice as fast
+-// as `b` (the one the user tried), `c` also shortens the hold. Anything
+-// else, including no parameter, is still `"cut"`, today's behaviour,
+-// untouched — `lingerMs`/`lingerFadeMs` go unread in that case.
+-interface SilenceVariant {
+-  readonly silence: SilenceMode;
+-  readonly lingerMs: number;
+-  readonly lingerFadeMs: number;
+-}
+-function silenceVariantFromUrl(): SilenceVariant {
+-  const variant = new URLSearchParams(window.location.search).get("variant");
+-  if (variant === "a")
+-    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 200 };
+-  if (variant === "b")
+-    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 400 };
+-  if (variant === "c")
+-    return { silence: "linger", lingerMs: 600, lingerFadeMs: 200 };
+-  return { silence: "cut", lingerMs: 1000, lingerFadeMs: 400 };
+-}
+-
+-const silenceVariant = silenceVariantFromUrl();
+-
+ // design-loop variant (007 round 5) — the tuner's two layout treatments,
+ // explored on the phone via `?fit=a|b` alongside `?variant=` (round 4,
+ // above — the two switches work together in one URL, e.g. `?variant=c&fit=a`).
+@@ -175,9 +143,6 @@ createRoot(rootElement).render(
+         exposeNoteJudgedForTiming(session);
+       }}
+       onPaintAge={collectPaintAge}
+-      silence={silenceVariant.silence}
+-      lingerMs={silenceVariant.lingerMs}
+-      lingerFadeMs={silenceVariant.lingerFadeMs}
+       fit={fit}
+     />
+   </StrictMode>,
+diff --git a/src/ui/theme.ts b/src/ui/theme.ts
+index 4262dbe..9775630 100644
+--- a/src/ui/theme.ts
++++ b/src/ui/theme.ts
+@@ -36,3 +36,10 @@ export const tuner = {
+   targetHead: "#a39a8c",
+   ghostInk: "#8a8175",
+ } as const;
++
++// practice.tuner/REQ-003 — the last reading's own timing once it clears:
++// held grey for lingerHoldMs, then faded out over lingerFadeMs.
++export const motion = {
++  lingerHoldMs: 600,
++  lingerFadeMs: 200,
++} as const;
+diff --git a/src/ui/tuner-silence.ts b/src/ui/tuner-silence.ts
+index 969e3aa..572cf8d 100644
+--- a/src/ui/tuner-silence.ts
++++ b/src/ui/tuner-silence.ts
+@@ -1,40 +1,31 @@
+-// design-loop variant (007 round 4) — exploration for the tuner's silence
+-// treatment: today the reading is cleared 300 ms after the last pitch and
+-// the view removes everything at once. Three treatments (fade/linger/ghost)
+-// live behind `?variant=a|b|c`; `"cut"` (no param) is today's behaviour,
+-// untouched. TEMPORARY: one treatment becomes the rule in a later task and
+-// this whole file — along with every other block carrying this comment —
+-// is deleted then.
+-//
+-// A shared, dependency-free module (no import of TunerLevel/TunerStave,
+-// which both import TunerScreen — importing either from here would be
+-// circular) so the type and the one small helper below are defined once,
+-// not duplicated between TunerLevel.tsx and TunerStave.tsx.
++// practice.tuner/REQ-003 — the last reading's own view state once nothing
++// more is detected: it lingers where it was, greyed, for motion.lingerHoldMs,
++// then fades out over motion.lingerFadeMs. A shared, dependency-free module
++// (no import of TunerLevel/TunerStave, which both import TunerScreen —
++// importing either from here would be circular) so the type and the one
++// small helper below are defined once, not duplicated between
++// TunerLevel.tsx and TunerStave.tsx.
+ import type { NoteJudged } from "../practice/published";
+ 
+-export type SilenceMode = "cut" | "fade" | "linger" | "ghost";
+-
+ // The last reading TunerScreen showed, still being displayed after it
+-// cleared: fading opacity 1 → 0 (a), held grey then fading (b), or grey and
+-// held indefinitely (c, "ghost" — until the next reading or unmount).
++// cleared: held grey then fading opacity 1 → 0 (reduced motion: held at
++// opacity 1 throughout, then removed with no transition at all).
+ export interface StaleReading {
+   readonly reading: NoteJudged;
+-  readonly dataState: "fading" | "ghost";
+   readonly opacity: number;
+-  readonly grey: boolean;
+   // The CSS transition duration for `opacity`, or `null` for no animated
+-  // transition (prefers-reduced-motion, or a steady state with nothing
+-  // currently changing — c's ghost, or b's hold before its own fade).
++  // transition (prefers-reduced-motion, or the held phase before the fade
++  // has started).
+   readonly transitionMs: number | null;
+ }
+ 
+-// The data-state/aria-hidden/opacity/transition a stale element carries,
++// The data-state/aria-hidden/opacity/transition a lingering element carries,
+ // spread onto whichever element already carries its own data-testid.
+-// `undefined` when there is nothing stale to show (live, or the "cut"
+-// default, which renders exactly as it always has).
++// `undefined` when there is nothing stale to show (live, or truly nothing to
++// show).
+ export function staleAttrs(stale: StaleReading | undefined):
+   | {
+-      readonly "data-state": "fading" | "ghost";
++      readonly "data-state": "fading";
+       readonly "aria-hidden": "true";
+       readonly style: {
+         readonly opacity: number;
+@@ -44,7 +35,7 @@ export function staleAttrs(stale: StaleReading | undefined):
+   | undefined {
+   if (stale === undefined) return undefined;
+   return {
+-    "data-state": stale.dataState,
++    "data-state": "fading",
+     "aria-hidden": "true",
+     style: {
+       opacity: stale.opacity,
+diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
+index 15ad5c0..b14c178 100644
+--- a/tests/ui/scenarios/tuner-helpers.ts
++++ b/tests/ui/scenarios/tuner-helpers.ts
+@@ -6,6 +6,7 @@ import type { Session } from "../../../src/practice/published";
+ import { builtInCatalogue } from "../../../src/theory/published";
+ import { App } from "../../../src/ui/App";
+ import { localStorageSelectionStore } from "../../../src/ui/selection-store";
++import { motion } from "../../../src/ui/theme";
+ import {
+   FakeClock,
+   FakeListening,
+@@ -39,10 +40,18 @@ export async function enterTuner(
+   readonly listening: FakeListening;
+   readonly clock: FakeClock;
+   readonly session: Session;
++  readonly timer: ReturnType<typeof manualAnimationClock>;
+ }> {
+   cleanup();
+   localStorage.clear();
+   const { sessionDeps, listening, clock } = sessionDepsWithFakes();
++  // practice.tuner/REQ-003 — a deterministic default for the screen's own
++  // linger timer (TunerScreen's injectable setTimer/clearTimer), so an
++  // existing scenario can let it pass with letLingerPass below without
++  // depending on the real wall clock; overridden by a scenario that drives
++  // its own (finer-grained timing needs its own manualAnimationClock, e.g.
++  // tuner-linger.test.tsx's own S4-S6).
++  const timer = manualAnimationClock();
+   let session: Session | null = null;
+   render(
+     createElement(App, {
+@@ -52,6 +61,8 @@ export async function enterTuner(
+       onSessionReady: (readySession: Session) => {
+         session = readySession;
+       },
++      setTimer: timer.setTimer,
++      clearTimer: timer.clearTimer,
+       ...extraProps,
+     }),
+   );
+@@ -65,7 +76,7 @@ export async function enterTuner(
+   if (session === null) {
+     throw new Error("unreachable: onSessionReady was not called by render()");
+   }
+-  return { listening, clock, session };
++  return { listening, clock, session, timer };
+ }
+ 
+ // A scenario may call this more than once (tuner-stave.test.tsx's
+@@ -81,12 +92,16 @@ export async function enterAndHear(
+   readonly listening: FakeListening;
+   readonly clock: FakeClock;
+   readonly session: Session;
++  readonly timer: ReturnType<typeof manualAnimationClock>;
+ }> {
+-  const { listening, clock, session } = await enterTuner(spelling, extraProps);
++  const { listening, clock, session, timer } = await enterTuner(
++    spelling,
++    extraProps,
++  );
+   listening.feed(hz);
+   clock.advanceMs(1);
+   await act(async () => {});
+-  return { listening, clock, session };
++  return { listening, clock, session, timer };
+ }
+ 
+ // practice.tuner/REQ-004/S7, REQ-009/S3 — advances the fake clock past the
+@@ -102,6 +117,23 @@ export async function letGapPass(f: {
+   await act(async () => {});
+ }
+ 
++// practice.tuner/REQ-003 — advances the screen's own linger clock (`timer`,
++// from enterTuner/enterAndHear, or a scenario's own manualAnimationClock)
++// past the 0.6 s hold and the 0.2 s fade, in two calls (see the note on
++// `manualAnimationClock` below — a chain of two real delays needs one
++// `advanceMs` per boundary), so a scenario that reads the fully-silent state
++// after a gap doesn't have to know the two durations itself.
++export function letLingerPass(f: {
++  readonly timer: { readonly advanceMs: (deltaMs: number) => void };
++}): void {
++  act(() => {
++    f.timer.advanceMs(motion.lingerHoldMs);
++  });
++  act(() => {
++    f.timer.advanceMs(motion.lingerFadeMs);
++  });
++}
++
+ // practice.tuner/REQ-005/S5, S6 — the trail's own clock is TunerScreen's
+ // injectable `now`/`requestFrame`/`cancelFrame` (not the session's own
+ // `FakeClock` above, which drives the *session's* gap timer only, and never
+@@ -112,16 +144,15 @@ export async function letGapPass(f: {
+ // lets a scenario assert the loop is/isn't running without inspecting
+ // TunerScreen's own internals.
+ //
+-// design-loop variant (007 round 4) — extended with a fake setTimeout/
+-// clearTimeout pair (`setTimer`/`clearTimer`, `timerPending`) sharing this
+-// same `ms`, for TunerScreen's injectable silence-treatment timers (the
+-// fade/linger/ghost hold and fade-out). Unlike the frame slot above, more
+-// than one timer can be pending at once (mirroring real setTimeout), and
+-// `advanceMs` itself fires whatever is due — including one a just-fired
+-// timer schedules, if its own delay lands within the same advance (b's
+-// hold → fade chain) — so a scenario drives everything through the one
+-// `now`/`advanceMs` pair already in hand, exactly as the acceptance text
+-// describes ("advance 600 ms → they are gone").
++// Also carries a fake setTimeout/clearTimeout pair (`setTimer`/`clearTimer`,
++// `timerPending`) sharing this same `ms`, for TunerScreen's own injectable
++// linger timer (practice.tuner/REQ-003). Unlike the frame slot above, more
++// than one timer can be pending at once (mirroring real setTimeout).
++// `advanceMs` sets `ms` to its target before firing anything due, so a timer
++// a callback schedules mid-fire is due against that already-advanced `ms` —
++// it fires within the *same* `advanceMs` call only for a zero delay (the
++// "Play a note" entrance tick); the linger's own hold → fade chain (two real
++// delays) needs one `advanceMs` per boundary.
+ export function manualAnimationClock(startMs = 0): {
+   readonly now: () => number;
+   readonly requestFrame: (callback: FrameRequestCallback) => number;
+diff --git a/tests/ui/scenarios/tuner-silence-variants.test.tsx b/tests/ui/scenarios/tuner-linger.test.tsx
+similarity index 52%
+rename from tests/ui/scenarios/tuner-silence-variants.test.tsx
+rename to tests/ui/scenarios/tuner-linger.test.tsx
+index 0a1a815..5a150a1 100644
+--- a/tests/ui/scenarios/tuner-silence-variants.test.tsx
++++ b/tests/ui/scenarios/tuner-linger.test.tsx
+@@ -1,185 +1,195 @@
+-// design-loop variant (007 round 4) — exploration for the tuner's silence
+-// treatment (the problem: "it's very abrupt how quickly everything
+-// disappears when going from hearing something to nothing"). TEMPORARY:
+-// behind `?variant=a|b|c`; one treatment becomes the rule in a later task
+-// and this whole file is deleted along with every other block carrying
+-// this comment.
++// practice.tuner/REQ-003 — the last reading's own linger: once nothing more
++// is detected it stays where it was, grey, for motion.lingerHoldMs, then
++// fades out over motion.lingerFadeMs, before "Play a note" takes its place.
++// S4–S6 are the rule's own scenarios; the rest below were kept from the
++// design-loop exploration that arrived at it (rounds.md, round 4), renamed
++// to state the rule rather than the exploration that found it.
+ import { act, cleanup, screen } from "@testing-library/react";
+-import { afterEach, expect, test } from "vitest";
++import { afterEach, expect, test, vi } from "vitest";
++import { motion, paper } from "../../../src/ui/theme";
+ import {
+   enterAndHear,
+   letGapPass,
++  letLingerPass,
+   manualAnimationClock,
+ } from "./tuner-helpers";
+ 
++// jsdom's CSSOM canonicalises a hex colour set via an inline style object
++// to `rgb(...)` (but leaves a function colour like `oklch(...)` alone) —
++// this reproduces that canonicalisation from the theme's own hex tokens
++// rather than hardcoding the converted string.
++function rgbOf(hex: string): string {
++  const value = Number.parseInt(hex.slice(1), 16);
++  const r = (value >> 16) & 0xff;
++  const g = (value >> 8) & 0xff;
++  const b = value & 0xff;
++  return `rgb(${r}, ${g}, ${b})`;
++}
++
+ afterEach(() => {
+   cleanup();
++  vi.unstubAllGlobals();
+ });
+ 
+-test("design-loop variant (007 round 4) — a: fades over 600 ms, then Play a note", async () => {
++test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async () => {
+   const animClock = manualAnimationClock();
+   const f = await enterAndHear(445.0, undefined, {
+-    silence: "fade",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+   await letGapPass(f);
+ 
++  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+     "fading",
+   );
++  expect(screen.getByTestId("tuner-line").getAttribute("aria-hidden")).toBe(
++    "true",
++  );
+   expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
+     "fading",
+   );
++  expect(screen.getByTestId("tuner-tag").style.color).toBe(rgbOf(paper.faint));
+   expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
+     "fading",
+   );
+-  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
++  expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
++  expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
++  expect(screen.getByTestId("heard-hz").style.color).toBe(rgbOf(paper.faint));
+   expect(screen.queryByTestId("tuner-empty")).toBeNull();
+ 
++  // 0.5 s later they are still shown.
+   act(() => {
+-    animClock.advanceMs(600);
++    animClock.advanceMs(500);
+   });
++  expect(screen.getByTestId("tuner-line")).toBeTruthy();
++  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
++  expect(screen.getByTestId("heard-head")).toBeTruthy();
++  expect(screen.queryByTestId("tuner-empty")).toBeNull();
+ 
++  // 0.8 s after they turned grey they are gone and "Play a note" is shown:
++  // the remaining 0.1 s of the hold, then the 0.2 s fade.
++  act(() => {
++    animClock.advanceMs(motion.lingerHoldMs - 500);
++  });
++  act(() => {
++    animClock.advanceMs(motion.lingerFadeMs);
++  });
+   expect(screen.queryByTestId("tuner-line")).toBeNull();
+   expect(screen.queryByTestId("tuner-tag")).toBeNull();
+   expect(screen.queryByTestId("heard-head")).toBeNull();
++  expect(screen.queryByTestId("strip-cents")).toBeNull();
++  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
+   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+ });
+ 
+-test("design-loop variant (007 round 4) — b: lingers 1000 ms, then fades 400 ms more", async () => {
++test("practice.tuner/REQ-003/S5 — a note during the linger", async () => {
+   const animClock = manualAnimationClock();
+   const f = await enterAndHear(445.0, undefined, {
+-    silence: "linger",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+   await letGapPass(f);
+-
+   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+     "fading",
+   );
+-  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
+-    "fading",
+-  );
+-  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
+-    "fading",
+-  );
++  expect(animClock.timerPending).toBe(true); // the linger's own timer is armed
+ 
+-  act(() => {
+-    animClock.advanceMs(1000);
+-  });
+-  expect(screen.getByTestId("tuner-line")).toBeTruthy();
+-  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
+-  expect(screen.getByTestId("heard-head")).toBeTruthy();
+-  expect(screen.queryByTestId("tuner-empty")).toBeNull();
++  f.listening.feed(523.25); // C5
++  f.clock.advanceMs(1);
++  await act(async () => {});
+ 
+-  act(() => {
+-    animClock.advanceMs(400);
+-  });
+-  expect(screen.queryByTestId("tuner-line")).toBeNull();
+-  expect(screen.queryByTestId("tuner-tag")).toBeNull();
+-  expect(screen.queryByTestId("heard-head")).toBeNull();
+-  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
++  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
++  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
++  expect(screen.queryByTestId("tuner-empty")).toBeNull(); // never appeared in between
++  expect(animClock.timerPending).toBe(false); // the pending linger timer was cancelled
+ });
+ 
+-test("design-loop variant (007 round 4) — c: ghosts until the next reading, no timer", async () => {
++test("practice.tuner/REQ-003/S6 — lingering with a target", async () => {
+   const animClock = manualAnimationClock();
+-  const f = await enterAndHear(445.0, undefined, {
+-    silence: "ghost",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
++  const f = await enterAndHear(440.0, undefined, {
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
++  act(() => {
++    f.session.pinTarget(69); // A4
++  });
++  f.listening.feed(523.25); // C5, now measured from A4 (REQ-004/S3)
++  f.clock.advanceMs(1);
++  await act(async () => {});
++
+   await letGapPass(f);
+ 
+-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+-    "ghost",
+-  );
+-  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
+-    "ghost",
+-  );
+-  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
+-    "ghost",
+-  );
++  // The big name follows REQ-003/S2 at once — no linger of its own.
++  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+ 
+-  act(() => {
+-    animClock.advanceMs(10_000);
+-  });
++  // The line, the tag, the heard head and the Hz linger grey and fade, as S4.
+   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+-    "ghost",
++    "fading",
+   );
+   expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
+-    "ghost",
++    "fading",
+   );
+   expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
+-    "ghost",
++    "fading",
+   );
++  expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
+ 
+-  f.listening.feed(523.25); // C5
+-  f.clock.advanceMs(1);
+-  await act(async () => {});
+-
+-  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
+-  expect(document.querySelectorAll('[data-state="ghost"]').length).toBe(0);
++  letLingerPass({ timer: animClock });
++  expect(screen.queryByTestId("tuner-line")).toBeNull();
++  expect(screen.queryByTestId("tuner-tag")).toBeNull();
++  expect(screen.queryByTestId("heard-head")).toBeNull();
++  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+ });
+ 
+-test("design-loop variant (007 round 4) — a, interrupted: a new reading during the fade replaces it live at once", async () => {
++test("practice.tuner/REQ-003 — reduced motion removes the linger at 0.8 s without fading", async () => {
++  vi.stubGlobal("matchMedia", (query: string) => ({
++    matches: query === "(prefers-reduced-motion: reduce)",
++    media: query,
++    onchange: null,
++    addListener: () => {},
++    removeListener: () => {},
++    addEventListener: () => {},
++    removeEventListener: () => {},
++    dispatchEvent: () => false,
++  }));
++
+   const animClock = manualAnimationClock();
+   const f = await enterAndHear(445.0, undefined, {
+-    silence: "fade",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+   await letGapPass(f);
+-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+-    "fading",
+-  );
+-  expect(animClock.timerPending).toBe(true);
+ 
+-  f.listening.feed(523.25); // C5
+-  f.clock.advanceMs(1);
+-  await act(async () => {});
++  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
++  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();
+ 
+-  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
+-  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
+-  expect(animClock.timerPending).toBe(false);
+-});
++  act(() => {
++    animClock.advanceMs(motion.lingerHoldMs);
++  });
++  expect(screen.getByTestId("tuner-line")).toBeTruthy();
++  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
++  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();
+ 
+-test("design-loop variant (007 round 4) — default: no silence prop removes everything at once, as today", async () => {
+-  const f = await enterAndHear(445.0);
+-  await letGapPass(f);
++  act(() => {
++    animClock.advanceMs(motion.lingerFadeMs);
++  });
+   expect(screen.queryByTestId("tuner-line")).toBeNull();
++  expect(screen.queryByTestId("heard-head")).toBeNull();
+   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+ });
+ 
+-// design-loop variant (007 round 4, follow-up 1) — the heard head's own
+-// furniture (ledgers, accidental, octave mark, dotted guide) must linger
+-// with the head, not vanish out from under it while it still fades/holds/
+-// ghosts (a floating head with no ledger lines, or an accidental-less
++// The heard head's own furniture (ledgers, accidental, octave mark, dotted
++// guide) must linger with the head, not vanish out from under it while it
++// still fades (a floating head with no ledger lines, or an accidental-less
+ // sharp, reads as a different note).
+ 
+-test("design-loop variant (007 round 4, follow-up 1) — a: the ledger lines linger with the head, then fade with it", async () => {
++test("practice.tuner/REQ-003 — the ledger lines linger with the head, then fade with it", async () => {
+   const animClock = manualAnimationClock();
+   // C6 (two ledger lines above the stave — practice.tuner/REQ-005/S3's own
+   // register/ledger arithmetic).
+   const f = await enterAndHear(1046.5, undefined, {
+-    silence: "fade",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+@@ -195,20 +205,14 @@ test("design-loop variant (007 round 4, follow-up 1) — a: the ledger lines lin
+     "fading",
+   );
+ 
+-  act(() => {
+-    animClock.advanceMs(600);
+-  });
++  letLingerPass({ timer: animClock });
+   expect(screen.queryAllByTestId("heard-ledger")).toHaveLength(0);
+   expect(screen.queryByTestId("heard-guide")).toBeNull();
+ });
+ 
+-test("design-loop variant (007 round 4, follow-up 1) — a: the accidental glyph lingers with the head, then fades with it", async () => {
++test("practice.tuner/REQ-003 — the accidental glyph lingers with the head, then fades with it", async () => {
+   const animClock = manualAnimationClock();
+   const f = await enterAndHear(466.16, "sharp", {
+-    silence: "fade",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+@@ -219,20 +223,14 @@ test("design-loop variant (007 round 4, follow-up 1) — a: the accidental glyph
+     screen.getByTestId("heard-accidental").getAttribute("data-state"),
+   ).toBe("fading");
+ 
+-  act(() => {
+-    animClock.advanceMs(600);
+-  });
++  letLingerPass({ timer: animClock });
+   expect(screen.queryByTestId("heard-accidental")).toBeNull();
+ });
+ 
+-test("design-loop variant (007 round 4, follow-up 1) — c: the octave mark stays ghosted with the head", async () => {
++test("practice.tuner/REQ-003 — the octave mark lingers with the head", async () => {
+   const animClock = manualAnimationClock();
+   // E2, drawn under 8vb (practice.tuner/REQ-005/S3).
+   const f = await enterAndHear(82.41, undefined, {
+-    silence: "ghost",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+@@ -242,46 +240,12 @@ test("design-loop variant (007 round 4, follow-up 1) — c: the octave mark stay
+   expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
+   expect(
+     screen.getByTestId("heard-octave-mark").getAttribute("data-state"),
+-  ).toBe("ghost");
+-});
+-
+-test("design-loop variant (007 round 4, follow-up 2) — linger with its own timing (600 ms hold, 200 ms fade)", async () => {
+-  const animClock = manualAnimationClock();
+-  const f = await enterAndHear(445.0, undefined, {
+-    silence: "linger",
+-    lingerMs: 600,
+-    lingerFadeMs: 200,
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+-    setTimer: animClock.setTimer,
+-    clearTimer: animClock.clearTimer,
+-  });
+-  await letGapPass(f);
+-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
+-    "fading",
+-  );
+-
+-  act(() => {
+-    animClock.advanceMs(600);
+-  });
+-  expect(screen.getByTestId("tuner-line")).toBeTruthy();
+-  expect(screen.queryByTestId("tuner-empty")).toBeNull();
+-
+-  act(() => {
+-    animClock.advanceMs(200);
+-  });
+-  expect(screen.queryByTestId("tuner-line")).toBeNull();
+-  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
++  ).toBe("fading");
+ });
+ 
+-test("design-loop variant (007 round 4, follow-up 1) — a: the head does not jump between the last sounding render and the first silent one", async () => {
++test("practice.tuner/REQ-003 — the head does not jump between the last sounding render and the first silent one", async () => {
+   const animClock = manualAnimationClock();
+   const f = await enterAndHear(445.0, undefined, {
+-    silence: "fade",
+-    now: animClock.now,
+-    requestFrame: animClock.requestFrame,
+-    cancelFrame: animClock.cancelFrame,
+     setTimer: animClock.setTimer,
+     clearTimer: animClock.clearTimer,
+   });
+diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
+index 9217c8c..e9968fc 100644
+--- a/tests/ui/scenarios/tuner-screen.test.tsx
++++ b/tests/ui/scenarios/tuner-screen.test.tsx
+@@ -5,7 +5,7 @@ import { builtInCatalogue } from "../../../src/theory/published";
+ import { App } from "../../../src/ui/App";
+ import { localStorageSelectionStore } from "../../../src/ui/selection-store";
+ import { sessionDepsWithFakes } from "../../practice/fakes";
+-import { enterAndHear } from "./tuner-helpers";
++import { enterAndHear, letLingerPass } from "./tuner-helpers";
+ 
+ // No global `afterEach` in scope (vitest globals are off), so
+ // @testing-library/react's automatic cleanup never registers itself; without
+@@ -82,6 +82,7 @@ test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
+   const f = await enterAndHear(445.0);
+   f.clock.advanceMs(300);
+   await act(async () => {});
++  letLingerPass(f); // the last reading lingers, then goes (S4)
+   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+   expect(screen.queryByTestId("tuner-line")).toBeNull();
+   expect(screen.queryByTestId("tuner-tag")).toBeNull();
+diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
+index 6fac2a1..94da0fd 100644
+--- a/tests/ui/scenarios/tuner-stave.test.tsx
++++ b/tests/ui/scenarios/tuner-stave.test.tsx
+@@ -4,6 +4,7 @@ import {
+   enterAndHear,
+   enterTuner,
+   letGapPass,
++  letLingerPass,
+   manualAnimationClock,
+ } from "./tuner-helpers";
+ 
+@@ -140,6 +141,7 @@ test("practice.tuner/REQ-005/S5 — the trail outlives the note", async () => {
+     animClock.advanceMs(500);
+   }
+   await letGapPass(f); // the session's own 300 ms gap — the reading clears
++  letLingerPass(f); // the last reading lingers, then goes (REQ-003/S4)
+   expect(screen.queryByTestId("heard-head")).toBeNull();
+   expect(screen.queryByTestId("strip-cents")).toBeNull();
+   expect(screen.getByTestId("heard-hz").textContent).toBe("—");
+```
+
+## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-29)
+
+SPEC: PASS · QUALITY: PASS
+
+- Every element the requirement lists lingers grey and fades together; the hold and fade are `motion.lingerHoldMs` 600 and `motion.lingerFadeMs` 200 with no stray local numbers; reduced motion removes at 0.8 s without a transition; `aria-hidden` on every lingering element.
+- A failed or refused microphone does not linger — judged right: REQ-007 says the last reading is cleared, and the session sets the reading and `cannot-hear` in one change, so the screen never enters the linger. A hidden page falls through to the ordinary linger, unseen. Leaving the tuner unmounts the screen and the effect's cleanup cancels the timer.
+- "Play a note" at once beneath a pinned target's greyed name while the rest lingers — matches S6 with S2.
+- One timer in flight; cancelled on a new reading, on unmount and on a change of listening state; StrictMode cannot double-schedule; the fake timer lives only in the test helper.
+- The trail and the spiral's needle unchanged. No round-4 leftovers; the 19 round-5 lines untouched.
+- The two existing tests touched gained only `letLingerPass`; no assertion changed.
+- [minor, may-defer] the S4 test asserts the grey state on the line, the tag and the Hz but not on the big name (`tuner-name`), which S4 lists; the code greys it. **Noted for converge.**
+- Unverified: a real browser throttling `setTimeout` in a backgrounded tab during a linger — acceptance-level.
+
+The reviewer ran no tests (the next task was editing the tree); the controller's `pnpm check` at the T031 state: exit 0, 77 files, 337 tests, cargo green. `eslint.config.js` in the package's range is the controller's separate commit 7106bf1, not T031's.
+
+<!-- recorded 2026-09-29T18:34:37Z by scripts/record.sh -->
diff --git a/changes/007-hear-me/tasks.md b/changes/007-hear-me/tasks.md
index 55345e0..ae4e8b4 100644
--- a/changes/007-hear-me/tasks.md
+++ b/changes/007-hear-me/tasks.md
@@ -1423,7 +1423,7 @@ _Ends with the tuner reachable from the header, grey and correct against 4a / 5c
 > amended with the user's approval (the linger clause, S4–S6, S1 and S3
 > reworded).
 
-**Status:** in-progress
+**Status:** done
 
 **Files**
 - Modify: `src/ui/TunerScreen.tsx`, `src/ui/TunerLevel.tsx`, `src/ui/TunerStave.tsx` (linger 600 ms grey, fade 200 ms, as the one rule; the "fade" and "ghost" treatments, the `silence` / `lingerMs` / `lingerFadeMs` props and every `design-loop variant (007 round 4)` marker removed), `src/ui/tuner-silence.ts` (kept only if still needed, renamed if not the right home), `src/ui/App.tsx`, `src/ui/main.tsx` (the `?variant` switch removed)
@@ -1443,7 +1443,7 @@ _Ends with the tuner reachable from the header, grey and correct against 4a / 5c
 > requirement names a size; the level's rule (REQ-002: a linear ±50 ¢
 > rule, the ±5 ¢ band) keeps its proportions at any height.
 
-**Status:** todo
+**Status:** in-progress
 
 **Files**
 - Modify: `src/ui/TunerScreen.tsx`, `src/ui/TunerLevel.tsx` (the level takes the height left over, its geometry from its measured height, 536 px when unmeasured, 300 px at least; the "fixed" and "flex-compact" treatments, the `fit` prop and every `design-loop variant (007 round 5)` marker removed), `src/ui/App.tsx` (the column takes the visible height while the tuner shows), `src/ui/main.tsx` (the `?fit` switch removed), `src/ui/global.css` (`.visible-height`), `src/ui/use-measured-size.ts`, `src/ui/TunerStave.tsx` (the card fits the column)
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 63931c0..77d681f 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -250,10 +250,6 @@ export function App(props: {
   // clearTimeout by default — a test's own route to it.
   readonly setTimer?: (callback: () => void, delayMs: number) => number;
   readonly clearTimer?: (handle: number) => void;
-  // design-loop variant (007 round 5) — optional, additive, forwarded
-  // straight to TunerScreen: the two layout treatments' own switch.
-  // TEMPORARY — deleted along with the rest of this exploration.
-  readonly fit?: "fixed" | "flex" | "flex-compact";
 }): JSX.Element {
   const {
     catalogue,
@@ -266,7 +262,6 @@ export function App(props: {
     cancelFrame,
     setTimer,
     clearTimer,
-    fit,
   } = props;
   const [selection, setSelection] = useState<Selection>(() =>
     initialSelection(catalogue, selectionStore),
@@ -679,19 +674,22 @@ export function App(props: {
     [session, selection.mode],
   );
 
-  // design-loop variant (007 round 5)
-  const fitsVisibleHeight =
-    screen === "tuner" && fit !== undefined && fit !== "fixed";
+  // The tuner screen is always exactly the viewport's visible height
+  // (practice.tuner/REQ-002, design round 5): the column carries
+  // `.visible-height` (global.css) instead of its usual inline
+  // `minHeight`, and lets TunerScreen's own flex children — the level's
+  // height among them — size to what's left.
+  const tunerShowing = screen === "tuner";
 
   return (
     <div
-      className={fitsVisibleHeight ? "visible-height" : undefined}
+      className={tunerShowing ? "visible-height" : undefined}
       style={{
         position: "relative",
         display: "flex",
         flexDirection: "column",
         maxWidth: COLUMN_MAX_WIDTH,
-        ...(fitsVisibleHeight ? {} : { minHeight: COLUMN_MIN_HEIGHT }),
+        ...(tunerShowing ? {} : { minHeight: COLUMN_MIN_HEIGHT }),
         margin: COLUMN_CENTERING_MARGIN,
         overflow: "hidden",
         background: COLUMN_BACKGROUND,
@@ -699,7 +697,7 @@ export function App(props: {
         fontFamily: fonts.body,
       }}
     >
-      {screen === "tuner" && snapshot !== null && variant !== undefined ? (
+      {tunerShowing && snapshot !== null && variant !== undefined ? (
         <TunerScreen
           tuner={snapshot.tuner}
           spelling={selection.spelling}
@@ -716,7 +714,6 @@ export function App(props: {
           {...(cancelFrame !== undefined ? { cancelFrame } : {})}
           {...(setTimer !== undefined ? { setTimer } : {})}
           {...(clearTimer !== undefined ? { clearTimer } : {})}
-          {...(fit !== undefined ? { fit } : {})}
         />
       ) : (
         <>
diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
index 53f4fa7..4b33f7b 100644
--- a/src/ui/TunerLevel.tsx
+++ b/src/ui/TunerLevel.tsx
@@ -29,9 +29,9 @@ const PX_PER_CENT = 5.1; // level()'s `lin(5.1)` map
 
 const CENTRE_LINE_HEIGHT = 2;
 
-// design-loop variant (007 round 5) — the level's own minimum height while
-// flexible ("flex"/"flex-compact"): below it the page scrolls vertically,
-// exactly as it does today whenever the fixed layout doesn't fit.
+// The level's own minimum height (practice.tuner/REQ-002, design round 5):
+// below it the page scrolls vertically rather than the level shrinking
+// further.
 const LEVEL_MIN_HEIGHT = 300;
 
 // Ticks every 5 ¢; the three labelled radii (10, 25, 50) draw wider and
@@ -111,11 +111,9 @@ interface Tick {
   readonly labelTop: number;
 }
 
-// design-loop variant (007 round 5) — `areaMid`/`pxPerCent` are parameters,
-// not the old module-level `AREA_MID`/`PX_PER_CENT` constants, so the same
-// arithmetic serves "fixed" (called with today's exact numbers, below) and
-// "flex"/"flex-compact" (called with the scaled-to-height pair `levelGeometryFor`
-// derives).
+// `areaMid`/`pxPerCent` are parameters (derived by `levelGeometryFor` below
+// from the level's own rendered height), not fixed constants, so the rule's
+// ticks keep their proportions at any height.
 function buildTicks(areaMid: number, pxPerCent: number): readonly Tick[] {
   const ticks: Tick[] = [];
   for (let cents = -50; cents <= 50; cents += TICK_STEP_CENTS) {
@@ -147,7 +145,7 @@ function roundPx(value: number): number {
 // The reading's line + tag, clamped to the rule's ±50 ¢ edge when a pinned
 // target's offset runs past it (practice.tuner/REQ-004) — the line stays
 // at the edge and the tag switches to "▲ N st" / "▼ N st". `areaMid`/
-// `pxPerCent` parameterised the same way `buildTicks` is (007 round 5).
+// `pxPerCent` parameterised the same way `buildTicks` is.
 function readingGeometry(
   reading: NoteJudged,
   areaMid: number,
@@ -188,18 +186,14 @@ export interface LevelGeometry {
   readonly nameAreaHeight: number;
 }
 
-// design-loop variant (007 round 5) — the level's whole geometry as a
-// function of its own rendered height: "fixed" always calls this with
-// AREA_HEIGHT (536) — the ratio below is then exactly 1, reproducing every
-// one of today's numbers bit-for-bit; "flex"/"flex-compact" call it with the
-// container's own measured height, keeping the same ratio of span (cents) to
-// height throughout (today's 5.1 px/¢ at 536 px — "keep the same ratio of
-// span to height" per the round's own brief). `NAME_AREA_TOP`/
-// `NAME_AREA_HEIGHT` (183/170) sit exactly centred on `AREA_HEIGHT`'s own mid
-// (183 + 170/2 = 268), so the name area scales the same way, centred on
-// `areaMid` at any height. Exported so the shape can be tested directly —
-// jsdom does no layout, so a rendered TunerLevel never actually measures
-// anything but this same 536 px fallback.
+// The level's whole geometry as a function of its own rendered height
+// (practice.tuner/REQ-002: "a linear ±50 ¢ rule ... keeps its proportions
+// at any height"): `ratio` keeps today's 5.1 px/¢ at 536 px throughout.
+// `NAME_AREA_TOP`/`NAME_AREA_HEIGHT` (183/170) sit exactly centred on
+// `AREA_HEIGHT`'s own mid (183 + 170/2 = 268), so the name area scales the
+// same way, centred on `areaMid` at any height. Exported so the shape can
+// be tested directly — jsdom does no layout, so a rendered TunerLevel never
+// actually measures anything but the 536 px fallback.
 export function levelGeometryFor(areaHeight: number): LevelGeometry {
   const ratio = areaHeight / AREA_HEIGHT;
   const areaMid = areaHeight / 2;
@@ -227,20 +221,8 @@ export function TunerLevel(props: {
   // fade has ended (`undefined` outside that moment — no style change).
   readonly stale?: StaleReading;
   readonly emptyOpacity?: number;
-  // design-loop variant (007 round 5) — "fixed" (today, the default): the
-  // level is exactly AREA_HEIGHT (536px) tall, unmeasured. "flex"/
-  // "flex-compact": the level takes all the height its container leaves it
-  // (`flex: 1, minHeight: LEVEL_MIN_HEIGHT`), measured via ResizeObserver so
-  // `levelGeometryFor` can scale the rule to fit.
-  readonly fit?: "fixed" | "flex" | "flex-compact";
 }): JSX.Element {
-  const {
-    tuner: snapshot,
-    spelling,
-    stale,
-    emptyOpacity,
-    fit = "fixed",
-  } = props;
+  const { tuner: snapshot, spelling, stale, emptyOpacity } = props;
   const reading = snapshot.reading;
   const cannotHear = snapshot.listening.kind === "cannot-hear";
   const targetPinnedSilent = snapshot.targetNote !== null && reading === null;
@@ -294,16 +276,12 @@ export function TunerLevel(props: {
       ? `playing ${noteLabel(effectiveReading.heard.nearest)}`
       : "";
 
-  // design-loop variant (007 round 5) — "fixed" never measures (`sizeRef`
-  // stays unattached — see the container `ref` below) and always uses
-  // AREA_HEIGHT, so its geometry is bit-for-bit today's; "flex"/
-  // "flex-compact" fall back to the same AREA_HEIGHT until the container has
-  // actually been measured (mount, and jsdom — this repo's test environment
-  // implements no ResizeObserver, so every existing test keeps exercising
-  // exactly today's numbers).
+  // The level's own measured height, falling back to AREA_HEIGHT until the
+  // container has actually been measured (mount, and jsdom — this repo's
+  // test environment implements no ResizeObserver, so every existing test
+  // keeps exercising exactly today's numbers).
   const { ref: sizeRef, size } = useMeasuredSize<HTMLDivElement>();
-  const areaHeight =
-    fit === "fixed" ? AREA_HEIGHT : (size?.height ?? AREA_HEIGHT);
+  const areaHeight = size?.height ?? AREA_HEIGHT;
   const levelGeometry = useMemo(
     () => levelGeometryFor(areaHeight),
     [areaHeight],
@@ -326,12 +304,11 @@ export function TunerLevel(props: {
 
   return (
     <div
-      ref={fit === "fixed" ? undefined : sizeRef}
+      ref={sizeRef}
       style={{
         position: "relative",
-        ...(fit === "fixed"
-          ? { height: AREA_HEIGHT, flex: "none" }
-          : { flex: 1, minHeight: LEVEL_MIN_HEIGHT }),
+        flex: 1,
+        minHeight: LEVEL_MIN_HEIGHT,
       }}
     >
       <div
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index b92d6f5..95c9b44 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -114,14 +114,15 @@ const NO_MIC_INK = paper.faint;
 const NO_MIC_DOT = "transparent";
 const NO_MIC_RING = paper.faint;
 
-// The "Can't hear" card (practice.tuner/REQ-007) — geometry and text copied
-// verbatim from the vendored visual reference (Tuner.dc.html, the
-// `cannotHear` sc-if at markup lines 169-172): absolutely positioned over
-// the level/strip/target row rather than replacing them (REQ-007's own
-// text: "visible, non-interrupting, no modal" — the level, strip and
-// footer stay drawn underneath, S1).
-const CARD_TOP = 440;
+// The "Can't hear" card (practice.tuner/REQ-007) — text copied verbatim
+// from the vendored visual reference (Tuner.dc.html, the `cannotHear`
+// sc-if at markup lines 169-172): absolutely positioned over the level
+// rather than replacing it (REQ-007's own text: "visible, non-interrupting,
+// no modal" — the level, strip and footer stay drawn underneath, S1).
+// Sits in the lower part of the level, above the "↓ flat" label and below
+// the "–", so both remain visible (practice.tuner/REQ-007).
 const CARD_SIDE = 16;
+const CARD_BOTTOM = 38;
 const CARD_PADDING = "13px 16px 14px";
 const CARD_RADIUS = 14;
 const CARD_GAP = 5;
@@ -162,10 +163,9 @@ const FLAT_GLYPH = "♭";
 // the spiral's needle trail: the newest 50 readings of the current run
 const SPIRAL_TRAIL_READINGS = 50;
 
-// design-loop variant (007 round 5) — the ♯/♭ segmented control's own
-// markup, extracted so "flex-compact" (the header) and "fixed"/"flex" (the
-// footer, below) render the identical control rather than two copies of it
-// (AGENTS.md "Things agents get wrong here" — extract, don't duplicate).
+// The footer's ♯/♭ segmented control — its own function so it isn't
+// duplicated if another part of the screen ever needs it too (AGENTS.md
+// "Things agents get wrong here" — extract, don't duplicate).
 function SpellingToggle(props: {
   readonly sharpSelected: boolean;
   readonly onSpellingChange: (preference: SpellingPreference) => void;
@@ -256,12 +256,6 @@ function TunerScreenComponent(props: {
   // setTimeout/clearTimeout by default.
   readonly setTimer?: (callback: () => void, delayMs: number) => number;
   readonly clearTimer?: (handle: number) => void;
-  // design-loop variant (007 round 5) — "fixed" (today, the default): no
-  // change. "flex": the screen is exactly the viewport's visible height,
-  // the level takes whatever's left. "flex-compact": as "flex", and the
-  // footer's two parts move into the header row (below). Forwarded to
-  // TunerLevel unchanged.
-  readonly fit?: "fixed" | "flex" | "flex-compact";
 }): JSX.Element {
   const {
     tuner,
@@ -279,11 +273,7 @@ function TunerScreenComponent(props: {
     cancelFrame = defaultCancelFrame,
     setTimer = defaultSetTimer,
     clearTimer = defaultClearTimer,
-    fit = "fixed",
   } = props;
-  // design-loop variant (007 round 5) — "flex-compact" only: the footer
-  // row is removed, its two parts moved into the header (below).
-  const compactFooter = fit === "flex-compact";
   const listening = isListening(tuner);
   const cannotHear = tuner.listening.kind === "cannot-hear";
   const sharpSelected = spelling === "sharp";
@@ -547,8 +537,10 @@ function TunerScreenComponent(props: {
 
   return (
     <div
-      // design-loop variant (007 round 5)
-      className={fit === "fixed" ? undefined : "visible-height"}
+      // The screen is always exactly the viewport's visible height
+      // (practice.tuner/REQ-002, design round 5); `.visible-height` follows
+      // the browser's bars showing/hiding (global.css).
+      className="visible-height"
       style={{
         position: "relative",
         display: "flex",
@@ -597,31 +589,54 @@ function TunerScreenComponent(props: {
             Practice
           </span>
         </button>
-        {compactFooter ? (
+        {micIndicator}
+      </div>
+      <div
+        style={{
+          position: "relative",
+          display: "flex",
+          flexDirection: "column",
+          flex: 1,
+        }}
+      >
+        <TunerLevel
+          tuner={tuner}
+          spelling={spelling}
+          {...(stale !== undefined ? { stale } : {})}
+          {...(emptyOpacity !== undefined ? { emptyOpacity } : {})}
+        />
+        {cannotHear && (
           <div
+            data-testid="cannot-hear"
             style={{
+              position: "absolute",
+              left: CARD_SIDE,
+              right: CARD_SIDE,
+              bottom: CARD_BOTTOM,
+              padding: CARD_PADDING,
+              background: paper.card,
+              border: `1px solid ${paper.borderSoft}`,
+              borderRadius: CARD_RADIUS,
               display: "flex",
-              alignItems: "center",
-              gap: HEADER_ROW_GAP,
+              flexDirection: "column",
+              gap: CARD_GAP,
             }}
           >
-            {micIndicator}
-            <SpellingToggle
-              sharpSelected={sharpSelected}
-              onSpellingChange={onSpellingChange}
-            />
+            <div style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
+              {CARD_TITLE_TEXT}
+            </div>
+            <div
+              style={{
+                fontSize: CARD_BODY_FONT_SIZE,
+                lineHeight: CARD_BODY_LINE_HEIGHT,
+                color: paper.muted,
+              }}
+            >
+              {CARD_BODY_TEXT}
+            </div>
           </div>
-        ) : (
-          micIndicator
         )}
       </div>
-      <TunerLevel
-        tuner={tuner}
-        spelling={spelling}
-        fit={fit}
-        {...(stale !== undefined ? { stale } : {})}
-        {...(emptyOpacity !== undefined ? { emptyOpacity } : {})}
-      />
       <TargetPill
         tuner={tuner}
         onOpen={handleOpenTarget}
@@ -636,64 +651,31 @@ function TunerScreenComponent(props: {
           {...(stale !== undefined ? { stale } : {})}
         />
       </div>
-      {cannotHear && (
-        <div
-          data-testid="cannot-hear"
-          style={{
-            position: "absolute",
-            left: CARD_SIDE,
-            right: CARD_SIDE,
-            top: CARD_TOP,
-            padding: CARD_PADDING,
-            background: paper.card,
-            border: `1px solid ${paper.borderSoft}`,
-            borderRadius: CARD_RADIUS,
-            display: "flex",
-            flexDirection: "column",
-            gap: CARD_GAP,
-          }}
-        >
-          <div style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
-            {CARD_TITLE_TEXT}
-          </div>
-          <div
-            style={{
-              fontSize: CARD_BODY_FONT_SIZE,
-              lineHeight: CARD_BODY_LINE_HEIGHT,
-              color: paper.muted,
-            }}
-          >
-            {CARD_BODY_TEXT}
-          </div>
-        </div>
-      )}
-      {!compactFooter && (
+      <div
+        style={{
+          marginTop: "auto",
+          padding: FOOTER_PADDING,
+          display: "flex",
+          alignItems: "center",
+          justifyContent: "space-between",
+          gap: FOOTER_GAP,
+        }}
+      >
         <div
           style={{
-            marginTop: "auto",
-            padding: FOOTER_PADDING,
-            display: "flex",
-            alignItems: "center",
-            justifyContent: "space-between",
-            gap: FOOTER_GAP,
+            fontFamily: fonts.mono,
+            fontSize: FOOTER_TEXT_FONT_SIZE,
+            letterSpacing: FOOTER_TEXT_LETTER_SPACING,
+            color: paper.muted,
           }}
         >
-          <div
-            style={{
-              fontFamily: fonts.mono,
-              fontSize: FOOTER_TEXT_FONT_SIZE,
-              letterSpacing: FOOTER_TEXT_LETTER_SPACING,
-              color: paper.muted,
-            }}
-          >
-            {FOOTER_TEXT}
-          </div>
-          <SpellingToggle
-            sharpSelected={sharpSelected}
-            onSpellingChange={onSpellingChange}
-          />
+          {FOOTER_TEXT}
         </div>
-      )}
+        <SpellingToggle
+          sharpSelected={sharpSelected}
+          onSpellingChange={onSpellingChange}
+        />
+      </div>
       <TargetSheet
         open={targetSheetOpen}
         tuner={tuner}
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index 1f5b46e..8775990 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -332,18 +332,14 @@ export function TunerStave(props: {
   const { tuner: snapshot, trail, nowMs, stale } = props;
   const reading = snapshot.reading;
   const targetNote = snapshot.targetNote;
-  // design-loop variant (007 round 5) — the structural fix (not behind the
-  // switch): at any column width down to 360px the card must fit inside it
-  // (the design's own CARD_WIDTH, 358, was sized for the 390px column) —
-  // rather than changing TRAIL_X_START/TRAIL_X_END or any other of this
-  // file's own fixed coordinates, the drawing (the `<svg>` and the HTML
-  // glyphs beside it that share its coordinate space — the clef, the
-  // octave marks, the accidentals, the cents figure) is measured and
-  // scaled down as one unit, preserving its aspect ratio, leaving the
-  // HEARD/IS column (a separate element, positioned by left/right, not by
-  // this scale) at its own font sizes. `null` before the first measurement
-  // and always in jsdom (this repo's test environment implements no
-  // ResizeObserver) — the fallback (1, unscaled) is exactly today's card.
+  // The card fits the column at any width down to 360px (CARD_WIDTH, 358,
+  // was sized for the 390px column): the drawing (the `<svg>` and the HTML
+  // glyphs beside it that share its coordinate space — the clef, octave
+  // marks, accidentals, cents figure) is measured and scaled down as one
+  // unit, preserving aspect ratio; the HEARD/IS column (positioned by
+  // left/right, not by this scale) keeps its own font sizes. `null` before
+  // the first measurement and always in jsdom (no ResizeObserver there) —
+  // the fallback (1, unscaled) is exactly today's card.
   const { ref: sizeRef, size: cardSize } = useMeasuredSize<HTMLDivElement>();
   const cardScale =
     cardSize === null ? 1 : Math.min(1, cardSize.width / CARD_WIDTH);
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 4807264..417a2f2 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -112,20 +112,6 @@ exposeSoundForTiming(sound);
 const listening = webAudioListening(audioContext);
 exposeListeningForTiming(listening);
 
-// design-loop variant (007 round 5) — the tuner's two layout treatments,
-// explored on the phone via `?fit=a|b` alongside `?variant=` (round 4,
-// above — the two switches work together in one URL, e.g. `?variant=c&fit=a`).
-// TEMPORARY — deleted, along with every other block carrying this comment,
-// once one treatment is chosen.
-function fitFromUrl(): "fixed" | "flex" | "flex-compact" {
-  const fit = new URLSearchParams(window.location.search).get("fit");
-  if (fit === "a") return "flex";
-  if (fit === "b") return "flex-compact";
-  return "fixed";
-}
-
-const fit = fitFromUrl();
-
 createRoot(rootElement).render(
   <StrictMode>
     <App
@@ -143,7 +129,6 @@ createRoot(rootElement).render(
         exposeNoteJudgedForTiming(session);
       }}
       onPaintAge={collectPaintAge}
-      fit={fit}
     />
   </StrictMode>,
 );
diff --git a/src/ui/use-measured-size.ts b/src/ui/use-measured-size.ts
index 02b4bbf..0541dc5 100644
--- a/src/ui/use-measured-size.ts
+++ b/src/ui/use-measured-size.ts
@@ -1,12 +1,11 @@
 import { useEffect, useRef, useState } from "react";
 
-// design-loop variant (007 round 5) — measures an element's own rendered
-// content box via ResizeObserver: `null` before the first measurement, and
-// always in this repo's test environment (jsdom implements no layout and no
-// ResizeObserver), so a caller's own fallback to today's fixed geometry is
-// exercised untouched by every existing test. Shared by TunerStave's
-// width-fit (Part 1, unconditional — the card must never run off the side)
-// and TunerLevel's height-following geometry ("flex"/"flex-compact", Part 2).
+// Measures an element's own rendered content box via ResizeObserver: `null`
+// before the first measurement, and always in this repo's test environment
+// (jsdom implements no layout and no ResizeObserver), so a caller's own
+// fallback to a fixed geometry is exercised untouched by every existing
+// test. Shared by TunerStave's width-fit (the card must never run off the
+// side) and TunerLevel's height-following geometry.
 export function useMeasuredSize<T extends Element>(): {
   readonly ref: React.RefObject<T | null>;
   readonly size: { readonly width: number; readonly height: number } | null;
diff --git a/tests/ui/scenarios/tuner-fit-variants.test.tsx b/tests/ui/scenarios/tuner-fit-variants.test.tsx
deleted file mode 100644
index d806015..0000000
--- a/tests/ui/scenarios/tuner-fit-variants.test.tsx
+++ /dev/null
@@ -1,83 +0,0 @@
-// design-loop variant (007 round 5) — exploration for the tuner screen's
-// layout on a phone too short for the fixed 844px design (the problem: "The
-// screen is a bit too tall and doesn't fit on my phone without scrolling up
-// and down"). TEMPORARY: behind `?fit=a|b`; one treatment becomes the rule
-// in a later task and this whole file is deleted along with every other
-// block carrying this comment.
-import { act, cleanup, screen } from "@testing-library/react";
-import userEvent from "@testing-library/user-event";
-import { afterEach, expect, test } from "vitest";
-import { levelGeometryFor } from "../../../src/ui/TunerLevel";
-import { enterAndHear } from "./tuner-helpers";
-
-afterEach(() => {
-  cleanup();
-});
-
-test("design-loop variant (007 round 5) — the level's geometry follows its own height, keeping today's ratio of span to height", () => {
-  // "at height 352 the centre is at 176, ... a reading of +20 cents sits
-  // 20 × (352 × 5.1 / 536) px above the centre" (this round's own brief) —
-  // the centre (`areaMid`) and the scale (`pxPerCent`) are the two numbers
-  // everything else on the level (the ticks, the band, the reading line/tag,
-  // the name area) is placed from; a reading N cents above the centre sits
-  // at `areaMid - N * pxPerCent`, so testing the two directly covers it.
-  const geometry = levelGeometryFor(352);
-  expect(geometry.areaMid).toBeCloseTo(176, 5);
-  const expectedPxPerCent = (352 * 5.1) / 536;
-  expect(geometry.pxPerCent).toBeCloseTo(expectedPxPerCent, 5);
-
-  // "fixed" always calls this with today's own AREA_HEIGHT (536) — the
-  // ratio is then exactly 1, reproducing today's numbers bit-for-bit (the
-  // fallback every existing test — many assert pixel positions on the
-  // level — keeps exercising in jsdom, which measures nothing).
-  const today = levelGeometryFor(536);
-  expect(today.areaMid).toBe(268);
-  expect(today.pxPerCent).toBe(5.1);
-  expect(today.bandTop).toBe(242.5);
-  expect(today.bandHeight).toBe(51);
-  expect(today.nameAreaTop).toBe(183);
-  expect(today.nameAreaHeight).toBe(170);
-});
-
-test('design-loop variant (007 round 5) — flex-compact: the sharp/flat toggle sits in the header, no footer row, and tapping "flat" still changes the spelling', async () => {
-  const f = await enterAndHear(466.16, undefined, { fit: "flex-compact" });
-
-  // No footer row: its own text is gone entirely (this round's own choice —
-  // see the report — rather than a second line under LISTENING, given how
-  // little room three groups already leave at 360px).
-  expect(screen.queryByText("A4 = 440 Hz · in tune ±5 ¢")).toBeNull();
-
-  // The toggle sits above the level (in the header), not below it (where
-  // the footer used to be).
-  const flatButton = screen.getByRole("button", { name: "flat" });
-  const level = screen.getByTestId("tuner-reading");
-  expect(
-    level.compareDocumentPosition(flatButton) &
-      Node.DOCUMENT_POSITION_PRECEDING,
-  ).toBeTruthy();
-
-  // Tapping "flat" still changes the spelling (practice.tuner/REQ-002/S5's
-  // own pattern).
-  expect(screen.getByTestId("tuner-name").textContent).toBe("A♯4");
-  await userEvent.click(flatButton);
-  f.listening.feed(466.16);
-  f.clock.advanceMs(1);
-  await act(async () => {});
-  expect(screen.getByTestId("tuner-name").textContent).toBe("B♭4");
-});
-
-test("design-loop variant (007 round 5) — fixed (no prop): the level is 536px tall and the footer is where it is today", async () => {
-  await enterAndHear(440.0);
-  const levelContainer = screen.getByTestId("tuner-reading").parentElement!;
-  expect(levelContainer.style.height).toBe("536px");
-  expect(screen.getByText("A4 = 440 Hz · in tune ±5 ¢")).toBeTruthy();
-});
-
-test("design-loop variant (007 round 5) — the screen takes the visible height by class, not by an inline height", async () => {
-  await enterAndHear(440.0, undefined, { fit: "flex" });
-  const visibleHeightElement = document.querySelector(".visible-height");
-  expect(visibleHeightElement).toBeTruthy();
-  if (visibleHeightElement !== null) {
-    expect((visibleHeightElement as HTMLElement).style.minHeight).toBe("");
-  }
-});
diff --git a/tests/ui/scenarios/tuner-layout.test.tsx b/tests/ui/scenarios/tuner-layout.test.tsx
new file mode 100644
index 0000000..fb30061
--- /dev/null
+++ b/tests/ui/scenarios/tuner-layout.test.tsx
@@ -0,0 +1,75 @@
+// practice.tuner/REQ-002 — the tuner screen's one and only layout (design
+// round 5's chosen treatment, T032): the screen and the column that wraps
+// it take the visible height, the header row, the target pill row, the
+// stave strip card and the footer keep their heights, and the level takes
+// whatever's left, its geometry (`levelGeometryFor`) scaling to fit.
+import { cleanup, render, screen } from "@testing-library/react";
+import { afterEach, expect, test } from "vitest";
+import { levelGeometryFor } from "../../../src/ui/TunerLevel";
+import { builtInCatalogue } from "../../../src/theory/published";
+import { App } from "../../../src/ui/App";
+import { localStorageSelectionStore } from "../../../src/ui/selection-store";
+import { sessionDepsWithFakes } from "../../practice/fakes";
+import { enterAndHear } from "./tuner-helpers";
+
+afterEach(() => {
+  cleanup();
+});
+
+test("practice.tuner/REQ-002 — the level's geometry follows its own height, keeping today's ratio of span to height", () => {
+  // At height 352 the centre (`areaMid`) is at 176, and a reading of +20
+  // cents sits 20 × (352 × 5.1 / 536) px above the centre — the scale
+  // (`pxPerCent`) and the centre are the two numbers everything else on the
+  // level (ticks, band, reading line/tag, name area) is placed from.
+  const geometry = levelGeometryFor(352);
+  expect(geometry.areaMid).toBeCloseTo(176, 5);
+  const expectedPxPerCent = (352 * 5.1) / 536;
+  expect(geometry.pxPerCent).toBeCloseTo(expectedPxPerCent, 5);
+  expect(geometry.areaMid - 20 * geometry.pxPerCent).toBeCloseTo(
+    176 - 20 * expectedPxPerCent,
+    5,
+  );
+  // The ±5 ¢ band's height keeps the same proportion.
+  expect(geometry.bandHeight).toBeCloseTo(10 * expectedPxPerCent, 5);
+
+  // At 536 (today's own AREA_HEIGHT) the ratio is exactly 1, reproducing
+  // every one of today's numbers bit-for-bit.
+  const today = levelGeometryFor(536);
+  expect(today.areaMid).toBe(268);
+  expect(today.pxPerCent).toBe(5.1);
+  expect(today.bandTop).toBe(242.5);
+  expect(today.bandHeight).toBe(51);
+  expect(today.nameAreaTop).toBe(183);
+  expect(today.nameAreaHeight).toBe(170);
+});
+
+test("practice.tuner/REQ-002 — the screen and the column carry visible-height and no inline minHeight while the tuner shows", async () => {
+  await enterAndHear(440.0);
+  const visibleHeightElements = document.querySelectorAll(".visible-height");
+  // The App column and TunerScreen's own root each carry the class.
+  expect(visibleHeightElements.length).toBe(2);
+  for (const element of visibleHeightElements) {
+    expect((element as HTMLElement).style.minHeight).toBe("");
+  }
+});
+
+test("practice.tuner/REQ-002 — on the practice screen the column has its inline minHeight and no visible-height class", () => {
+  localStorage.clear();
+  const { sessionDeps } = sessionDepsWithFakes();
+  const { container } = render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={sessionDeps}
+    />,
+  );
+  const column = container.firstElementChild as HTMLElement;
+  expect(column.className).toBe("");
+  expect(column.style.minHeight).toBe("100vh");
+});
+
+test("practice.tuner/REQ-002 — the level's minimum height is 300", async () => {
+  await enterAndHear(440.0);
+  const levelContainer = screen.getByTestId("tuner-reading").parentElement!;
+  expect(levelContainer.style.minHeight).toBe("300px");
+});
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index e9968fc..826cf12 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -124,6 +124,27 @@ test("practice.tuner/REQ-007/S1 — refused", async () => {
   expect(practiceButton.disabled).toBe(false);
 });
 
+test("practice.tuner/REQ-007 — the card sits in the lower part of the level, leaving the dash visible", async () => {
+  const { sessionDeps, listening } = sessionDepsWithFakes();
+  listening.failWith = "refused";
+  localStorage.clear();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={sessionDeps}
+    />,
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await waitFor(() =>
+    expect(screen.getByTestId("mic-indicator").textContent).toBe("NO MIC"),
+  );
+  const card = screen.getByTestId("cannot-hear");
+  expect(card.style.bottom).toBe("38px");
+  expect(card.style.top).toBe("");
+  expect(card.style.transform).toBe("");
+});
+
 test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
   const { sessionDeps, listening } = sessionDepsWithFakes();
   listening.failWith = "refused";
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/007-hear-me/index.md b/changes/007-hear-me/index.md
index 1def302..b188858 100644
--- a/changes/007-hear-me/index.md
+++ b/changes/007-hear-me/index.md
@@ -4,5 +4,5 @@
 - [007-hear-me — notes](notes.md) — Implementation Notes — Decisions taken during implementation that the plan did not cover.
 - [Hear me — plan](plan.md) — Implementation Plan · approved — A zero-crate Rust listening crate in the shared AudioWorklet detects pitch by normalised autocorrelation (MPM) and publishes PitchDetected; the session aggregate owns the tuner beside the transport and the drone so nothing sounds while it listens; a second screen in the UI; a Playwright harness feeds the microphone from the page's own AudioContext and measures the 100 ms budget.
 - [Hear me — a tuner that proves listening](proposal.md) — Change Proposal · approved — A tuner screen hears the instrument and shows the nearest note and how far sharp or flat, within 100 ms, with an optional pinned target — the listening context's first capability, measured against Article V.
-- [Hear me — tasks](tasks.md) — Task List · approved — 25 tasks across 5 phases — the listening crate and its contract, the session holding the tuner, the tuner screen, the measured harness, hardening.
+- [Hear me — tasks](tasks.md) — Task List · in-progress — 25 tasks across 5 phases — the listening crate and its contract, the session holding the tuner, the tuner screen, the measured harness, hardening.
 - [record/](record/index.md)
diff --git a/changes/007-hear-me/record/index.md b/changes/007-hear-me/record/index.md
index 53988c5..04885c4 100644
--- a/changes/007-hear-me/record/index.md
+++ b/changes/007-hear-me/record/index.md
@@ -1,2 +1,3 @@
 # Record: 007-hear-me
 
+- [tasks/](tasks/index.md)
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-29)

SPEC: PASS · QUALITY: PASS — reviewed at 212eaa1 (1914370 with the controller's card fix on top).

- The flexing level is the only layout; the switch, the `fit` prop and the unchosen treatments are gone; `main.tsx` is what it was before any design-round switch. `levelGeometryFor(536)` gives the fixed layout's numbers exactly; no existing pixel-asserting test was modified.
- REQ-007 at 360 × 660: the card overlaps only the empty lower part of the name's line box; the drawn dash clears the card's top by about 34 px. Both visible.
- The observer disconnects on unmount; no feedback loop; the first commit draws at the 536 px fallback for one frame before the first measurement.
- The class and the inline min-height on the column come from one boolean; never both, never left behind.
- The stave card's `scale(…) translateY(…)` composes correctly; the trail, the head and the overlays share the scaled space.
- [important, may-defer] at the level's 300 px minimum the card's clearance above the dash falls to about 8 px (margin = height/2 − 38 − ~104); reachable only on a viewport about 400 px tall. **Noted for converge.**
- [important, may-defer] the REQ-007 test pins the card's inline style only; the proof of no overlap is the browser measurement, which was not recorded durably. **Accepted: the measurement is now in notes.md.**
- [minor] at 300 px the tick labels close in on the fixed-size name and the "↑ sharp" row; not shown to collide. **Noted for converge.**

Reviewer's commands: `pnpm vitest run tests/ui` 26 files, 139 tests; `check-contexts.sh` clean; scenario gaps 0; `check-design.sh` clean for the interface, 3 hard-coded values in `global.css` predating the task. Controller's `pnpm check` at 212eaa1: exit 0, 77 files, 338 tests.

<!-- recorded 2026-09-29T19:06:04Z by scripts/record.sh -->
