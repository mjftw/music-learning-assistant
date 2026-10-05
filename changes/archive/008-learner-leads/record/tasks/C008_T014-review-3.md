---
type: Task Review
title: Review package — C008_T014 · 008-learner-leads
description: The diff produced for C008_T014, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T014.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T014.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T014.md
  - resource: git:fdec2bf72a889f48c5bf735d44d158bc08c6b48f..0e110132896ea7fa595af17e0d8dbb9aab4e836d
  - resource: /changes/008-learner-leads/record/tasks/C008_T014-review-2.md
generated:
  by: process:review-package.sh
  at: 2026-10-04T00:08:31Z
sdd_id: 008-learner-leads
---

# Review package — C008_T014 · 008-learner-leads

base: `fdec2bf72a889f48c5bf735d44d158bc08c6b48f` → head: `0e110132896ea7fa595af17e0d8dbb9aab4e836d`

**Incremental review.** The previous attempt (head `19d61fef9df4abe2cf9639f00edd9a09dd71b0ab`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict



TASK: C008_T014
SPEC: FAIL
QUALITY: PASS
FINDINGS:
- [important] src/ui/App.tsx:310-313 (`selectedKey = spelledMajorAt(position, selection.spelling)`, fed by `circleOfFifths()[selection.positionIndex]` called inline every render, uncached) — the plan's binding constraint for this task, repeated in this round's own code comments ("the stave must not re-render per reading … every other prop (notes, variant, onTapNote, onTargetBox) is already stable across a reading"), is not met: `circleOfFifths()` rebuilds its whole position/Key tree from scratch on every call (`src/theory/domain/circle.ts:71-80`, `majors.map((tonic) => ({ tonic, mode: "major" as const }))` — fresh object literals, no memoization), so `selectedKey` — passed to `StaveView` as `key_` — is a new object reference on every single `App` render, i.e. every reading while a lead run is in progress. `React.memo`'s default shallow comparison sees this prop change and re-renders `StaveView` (and re-runs the whole `buildStave()` geometry computation) regardless of the `leadTarget` memoization. The fixer's list of "already stable" props omits `key_` entirely — the claim is incorrect for the one object-typed prop that actually matters here. Confirmed by reading `circleOfFifths()`/`spelledMajorAt` directly (no test exercises per-render identity, so `pnpm vitest run` cannot show this). This is not a new regression this round introduced, but it means this round's fix does not actually deliver the constraint it was built to satisfy, and the report overstates what was achieved.
- [minor, carried from the previous review, unchanged by this diff] src/ui/StaveView.tsx — `cx`/`cy`/`rx`/`fill`/`opacity` on `<g data-testid="stave-note">` remain production markup shaped for test convenience; harmless, not blocking.
UNVERIFIED:
- practice.session/REQ-017 (`design_snapshot.py … live` → `practice--holding.png`/`practice--holding-meter-off.png` match) — still not run by this package or the implementer; closed instead by a real-Chromium reproduction (mine, below) of the exact stacking mechanism plus the implementer's own silent-state pixel check. Treat the design-fidelity screenshot comparison itself as still open.
COMMANDS:
Playwright (Chromium) render of a minimal page reproducing `KeyPanel`'s exact DOM/CSS shape — opaque card background, a `position:relative` wrapper, an absolutely-positioned band (no z-index) before the stave content, an absolutely-positioned line (no z-index) after it — screenshotted and pixel-cropped: the pale green band is visible beside the notehead (not occluded by the card's opaque background), and the green line paints over the brown notehead where they cross, confirming DOM-order stacking delivers "band behind, line in front" exactly as the fixer's reasoning claims.


## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  18 passed (18)
   Start at  01:08:31
   Duration  2.14s (tests 47%, environment 23%, transform 18%, import 12%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::click_lasts_25_ms ... ok
test click::tests::accent_is_louder_and_lower ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

## Files changed

- M	src/ui/App.tsx
- M	src/ui/KeyPanel.tsx
- A	src/ui/NoteMeter.tsx
- M	src/ui/StaveView.tsx
- M	src/ui/theme.ts
- A	tests/ui/scenarios/note-meter.test.tsx
- M	tests/ui/scenarios/stave-view.test.tsx
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff since the previous attempt (`19d61fef9df4abe2cf9639f00edd9a09dd71b0ab` → head)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 8f8509d..512664d 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -303,14 +303,22 @@ export function App(props: {
   // leaveTuner() through a render decision.
   const [screen, setScreen] = useState<"practice" | "tuner">("practice");
 
-  const position = circleOfFifths()[selection.positionIndex];
-  if (position === undefined) {
-    throw new Error("unreachable: selection position index out of range");
-  }
-  const selectedKey =
-    selection.mode === "major"
+  // practice.session/REQ-017 — memoized on the primitive selection fields,
+  // not recomputed every render: `circleOfFifths()` rebuilds its whole
+  // position/Key tree on every call, so without this `selectedKey` (passed
+  // to `StaveView` as `key_`) would be a fresh object identity on every
+  // `App` render — every reading while a lead run is in progress — and
+  // `React.memo` would re-render the stave regardless of `leadTarget`'s own
+  // memoization (a fixer finding, round 2).
+  const selectedKey = useMemo(() => {
+    const position = circleOfFifths()[selection.positionIndex];
+    if (position === undefined) {
+      throw new Error("unreachable: selection position index out of range");
+    }
+    return selection.mode === "major"
       ? spelledMajorAt(position, selection.spelling)
       : spelledMinorAt(position, selection.spelling);
+  }, [selection.positionIndex, selection.mode, selection.spelling]);
 
   // initialSelection already resolved variantId to a value that exists in
   // this catalogue (falling back to the default when it didn't), so this
diff --git a/src/ui/StaveView.tsx b/src/ui/StaveView.tsx
index 852e053..c5c34e6 100644
--- a/src/ui/StaveView.tsx
+++ b/src/ui/StaveView.tsx
@@ -411,9 +411,10 @@ function buildStave(
 // variant via `traversalOf` before passing `notes` down.
 // A fixer finding (REQ-017): the stave must not re-render per reading (the
 // plan's constraint) — `App` re-renders on every reading (the live card),
-// and `leadTarget` is now memoized on the run index alone, but `React.memo`
-// here is the belt as well as the braces, since every other prop (`notes`,
-// `variant`, `onTapNote`, `onTargetBox`) is already stable across a reading.
+// so every prop passed down must keep its reference across one (`leadTarget`
+// memoized on the run index, `key_` memoized in `App` on the selection's
+// primitive fields, `notes`/`variant`/`onTapNote`/`onTargetBox` stable by
+// construction); `React.memo` here is the belt as well as the braces.
 export const StaveView = memo(function StaveView(props: {
   readonly key_: Key;
   readonly variant: Variant;
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T014.md b/changes/008-learner-leads/tasks/C008_T014.md
index 639b5e3..47404f4 100644
--- a/changes/008-learner-leads/tasks/C008_T014.md
+++ b/changes/008-learner-leads/tasks/C008_T014.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T014
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-017, practice.session/REQ-018]
 sdd_depends_on: []
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T014 · `NoteMeter` and the stave: the band, the fill, the line on the target notehead; ink behind, faint ahead
```

## Verdict

_The task reviewer appends its verdict here._

TASK: C008_T014
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor, carried, unchanged by this diff] src/ui/StaveView.tsx — `cx`/`cy`/`rx`/`fill`/`opacity` on `<g data-testid="stave-note">` remain production markup shaped for test convenience; harmless, not blocking.
UNVERIFIED:
- none new this round — the design-fidelity screenshot comparison (`design_snapshot.py … live`) remains unrun by the package/implementer, as noted in the previous verdict; the previous review already treated the stacking mechanism as confirmed by an independent reproduction.
COMMANDS:
package only (traced `selectedKey`'s useMemo deps against `circleOfFifths`/`spelledMajorAt`/`spelledMinorAt` — all pure, no hidden inputs — and every other StaveView prop's identity at the call site in App.tsx; confirmed via `git status --short` that no throwaway counter/test artifacts remain)

<!-- recorded 2026-10-04T00:10:27Z by scripts/record.sh -->
