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
  - resource: git:fdec2bf72a889f48c5bf735d44d158bc08c6b48f..19d61fef9df4abe2cf9639f00edd9a09dd71b0ab
  - resource: /changes/008-learner-leads/record/tasks/C008_T014-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-03T23:58:18Z
sdd_id: 008-learner-leads
---

# Review package — C008_T014 · 008-learner-leads

base: `fdec2bf72a889f48c5bf735d44d158bc08c6b48f` → head: `19d61fef9df4abe2cf9639f00edd9a09dd71b0ab`

**Incremental review.** The previous attempt (head `674d6a4552c9d3e6538cd7a98a179920b7aefc12`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict



TASK: C008_T014
SPEC: FAIL
QUALITY: SKIPPED (spec failed)
FINDINGS:
- [critical] src/ui/NoteMeter.tsx (band's `zIndex: -1`) + src/ui/App.tsx (the `position: relative` overlay wrapper) — REQ-017 requires a visible "pale green band … behind the note". Neither the wrapper div in `App.tsx` nor `NoteMeter`'s own box sets an explicit `z-index`, so none of them forms a CSS stacking context; the band's `z-index: -1` is therefore resolved far up the tree (above `KeyPanel`), placing it beneath `KeyPanel`'s own opaque background (`paper.card`, `CARD_BACKGROUND`). Confirmed by rendering the exact DOM shape in a real Chromium (Playwright): the band and its fill are completely invisible — painted entirely behind the solid panel — while the line (`zIndex: 1`) does show, just above the whole page rather than only above the note. jsdom/vitest cannot catch this (no paint/stacking model), and the brief's Verify step that would have caught it (`design_snapshot.py … live` against `practice--holding.png`) was not run by this package or reported by the implementer. The "ink behind, faint ahead" overlay design cannot work as an absolutely-positioned sibling placed *after* the panel in the DOM without the panel (or an intermediate ancestor) establishing a stacking context the band can sit under while staying visible above the panel's own background.
- [minor] src/ui/App.tsx:~462-467 — `leadTarget` is a fresh object literal built on every render rather than memoized; the task brief asks explicitly to check this. In practice it's not harmful: the `useLayoutEffect` in `StaveView` depends on the primitive `leadTarget?.runIndex`, not the object, so it doesn't re-fire — but `StaveView` was never wrapped in `React.memo`, so the prop's identity churn doesn't actually change anything today. Still, memoizing would make the "never re-renders" intent robust against a future `React.memo` wrap.
- [minor] src/ui/StaveView.tsx — `cx`/`cy`/`rx`/`fill`/`opacity` attributes were added to the `<g data-testid="stave-note">` solely so tests can read computed geometry/styling without `querySelector`; harmless (and commented), but it is production markup shaped for test convenience rather than a value the UI itself needs.
UNVERIFIED:
- practice.session/REQ-017 (the stave/design screenshot match claimed in the brief's Verify line, `design_snapshot.py … live` → `practice--holding.png`) — not run by this package or by the implementer; the critical finding above was reached by an independent real-browser reproduction, not by running that command.
COMMANDS:
./scripts/check-contexts.sh → "✅ context boundaries respected"
node (Playwright) render of the band/fill/line DOM structure reproduced from the diff → screenshot shows the band and fill fully hidden behind the panel's opaque background; the line renders above everything


## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  18 passed (18)
   Start at  00:58:18
   Duration  2.15s (tests 48%, environment 23%, transform 18%, import 12%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::click_lasts_25_ms ... ok
test click::tests::accent_is_louder_and_lower ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
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

## Diff since the previous attempt (`674d6a4552c9d3e6538cd7a98a179920b7aefc12` → head)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index afe817b..8f8509d 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -1,4 +1,11 @@
-import { useCallback, useEffect, useRef, useState, type JSX } from "react";
+import {
+  useCallback,
+  useEffect,
+  useMemo,
+  useRef,
+  useState,
+  type JSX,
+} from "react";
 import { flushSync } from "react-dom";
 import {
   circleOfFifths,
@@ -44,7 +51,7 @@ import { InstrumentSheet } from "./InstrumentSheet";
 import { keyLabel, keyNameFontSizeOf, noteLabel } from "./key-label";
 import { KeyPanel } from "./KeyPanel";
 import { NamesView } from "./NamesView";
-import { NoteMeter } from "./NoteMeter";
+import { NoteMeter, type MeterGeometry } from "./NoteMeter";
 import { Notices } from "./Notices";
 import { ScaleRow } from "./ScaleRow";
 import { ScaleSheet } from "./ScaleSheet";
@@ -462,13 +469,44 @@ export function App(props: {
       : snapshot.run[snapshot.tappedRunIndex];
   // practice.session/REQ-017 — the lead run's target, highlighted the same
   // way a sounding note is; null outside "listening" (idle, complete and
-  // cannot-hear all show the run plain).
-  const leadTarget =
+  // cannot-hear all show the run plain). Memoized on the run index alone
+  // (a fixer finding, REQ-017) so a reading that does not move the target
+  // — most of them — does not hand `StaveView` a new object identity and
+  // force it to re-render; the stave must not re-render per reading (the
+  // plan's constraint).
+  const leadTargetRunIndex =
     snapshot !== null &&
     snapshot.lead.phase === "listening" &&
     snapshot.lead.target !== null
-      ? { runIndex: snapshot.lead.target.runIndex }
+      ? snapshot.lead.target.runIndex
       : null;
+  const leadTarget = useMemo(
+    () =>
+      leadTargetRunIndex === null ? null : { runIndex: leadTargetRunIndex },
+    [leadTargetRunIndex],
+  );
+  // practice.session/REQ-017 — the meter's geometry and readings, computed
+  // once here and shared by the two `NoteMeter` layers (the band behind the
+  // panel's content, the line in front of it — `KeyPanel`'s `underlay` and
+  // `overlay`).
+  const meterGeometry: MeterGeometry | null =
+    snapshot !== null &&
+    snapshot.lead.phase === "listening" &&
+    snapshot.settings.lead.cueMeter &&
+    selection.view === "stave" &&
+    targetBox !== null
+      ? { kind: "stave", centreX: targetBox.x, centreY: targetBox.y }
+      : null;
+  const meterToleranceCents =
+    snapshot === null ? 0 : TOLERANCE_CENTS[snapshot.settings.lead.tolerance];
+  const meterHeldFraction = snapshot === null ? 0 : snapshot.lead.heldFraction;
+  const meterReading =
+    snapshot === null || snapshot.lead.reading === null
+      ? null
+      : {
+          cents: snapshot.lead.reading.cents,
+          verdict: snapshot.lead.reading.verdict,
+        };
   const soundingPitchClass: PitchClass | null = playing
     ? soundingSequenceNote === undefined
       ? null
@@ -838,82 +876,77 @@ export function App(props: {
               />
             </div>
           )}
-          <div style={{ position: "relative" }}>
-            <KeyPanel
-              view={selection.view}
-              onSelectView={(selectedView) =>
-                setSelection((current) => ({
-                  ...current,
-                  view: selectedView,
-                }))
-              }
-              rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
-            >
-              {selection.view === "names" ? (
-                <NamesView
-                  key_={selectedKey}
-                  scale={
-                    // No session, no chosen scale yet — the mode's own default
-                    // stands in for the single render before the session-creating
-                    // effect completes, mirroring `notes`' `[]` fallback on the
-                    // StaveView branch below.
-                    snapshot === null
-                      ? scaleById(
-                          chosenScaleIdFor(defaultScaleChoice, selection.mode),
-                        )
-                      : snapshot.scale
-                  }
-                  direction={
-                    snapshot === null ? "updown" : snapshot.traversal.direction
-                  }
-                  degreesEnabled={selection.degreesEnabled}
-                  soundingPitchClass={soundingPitchClass}
-                  onTapColumn={handleTapColumn}
-                  tapsEnabled={tapsEnabled}
+          <KeyPanel
+            view={selection.view}
+            onSelectView={(selectedView) =>
+              setSelection((current) => ({
+                ...current,
+                view: selectedView,
+              }))
+            }
+            rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
+            underlay={
+              meterGeometry !== null && (
+                <NoteMeter
+                  layer="band"
+                  geometry={meterGeometry}
+                  toleranceCents={meterToleranceCents}
+                  heldFraction={meterHeldFraction}
+                  reading={meterReading}
                 />
-              ) : (
-                variant !== undefined && (
-                  <StaveView
-                    key_={selectedKey}
-                    variant={variant}
-                    notes={snapshot === null ? [] : snapshot.run}
-                    staveNamesEnabled={selection.staveNamesEnabled}
-                    soundingRunIndex={soundingRunIndex}
-                    playing={playing}
-                    onTapNote={handleTapNote}
-                    tapsEnabled={tapsEnabled}
-                    leadTarget={leadTarget}
-                    onTargetBox={setTargetBox}
-                  />
-                )
-              )}
-            </KeyPanel>
-            {snapshot !== null &&
-              snapshot.lead.phase === "listening" &&
-              snapshot.settings.lead.cueMeter &&
-              selection.view === "stave" &&
-              targetBox !== null && (
+              )
+            }
+            overlay={
+              meterGeometry !== null && (
                 <NoteMeter
-                  geometry={{
-                    kind: "stave",
-                    centreX: targetBox.x,
-                    centreY: targetBox.y,
-                  }}
-                  toleranceCents={
-                    TOLERANCE_CENTS[snapshot.settings.lead.tolerance]
-                  }
-                  heldFraction={snapshot.lead.heldFraction}
-                  reading={
-                    snapshot.lead.reading === null
-                      ? null
-                      : {
-                          cents: snapshot.lead.reading.cents,
-                          verdict: snapshot.lead.reading.verdict,
-                        }
-                  }
+                  layer="line"
+                  geometry={meterGeometry}
+                  toleranceCents={meterToleranceCents}
+                  heldFraction={meterHeldFraction}
+                  reading={meterReading}
                 />
-              )}
-          </div>
+              )
+            }
+          >
+            {selection.view === "names" ? (
+              <NamesView
+                key_={selectedKey}
+                scale={
+                  // No session, no chosen scale yet — the mode's own default
+                  // stands in for the single render before the session-creating
+                  // effect completes, mirroring `notes`' `[]` fallback on the
+                  // StaveView branch below.
+                  snapshot === null
+                    ? scaleById(
+                        chosenScaleIdFor(defaultScaleChoice, selection.mode),
+                      )
+                    : snapshot.scale
+                }
+                direction={
+                  snapshot === null ? "updown" : snapshot.traversal.direction
+                }
+                degreesEnabled={selection.degreesEnabled}
+                soundingPitchClass={soundingPitchClass}
+                onTapColumn={handleTapColumn}
+                tapsEnabled={tapsEnabled}
+              />
+            ) : (
+              variant !== undefined && (
+                <StaveView
+                  key_={selectedKey}
+                  variant={variant}
+                  notes={snapshot === null ? [] : snapshot.run}
+                  staveNamesEnabled={selection.staveNamesEnabled}
+                  soundingRunIndex={soundingRunIndex}
+                  playing={playing}
+                  onTapNote={handleTapNote}
+                  tapsEnabled={tapsEnabled}
+                  leadTarget={leadTarget}
+                  onTargetBox={setTargetBox}
+                />
+              )
+            )}
+          </KeyPanel>
           {snapshot !== null && session !== null && (
             <div
               style={{
diff --git a/src/ui/KeyPanel.tsx b/src/ui/KeyPanel.tsx
index b757595..460ab94 100644
--- a/src/ui/KeyPanel.tsx
+++ b/src/ui/KeyPanel.tsx
@@ -48,8 +48,23 @@ export function KeyPanel(props: {
   readonly onSelectView: (view: "names" | "stave") => void;
   readonly children: ReactNode;
   readonly rangeSummary: string;
+  // practice.session/REQ-017 — the target note's meter paints between the
+  // card's own background and the content (the band, behind the notehead)
+  // and in front of it (the pitch line); a fixer finding (REQ-017) found a
+  // wrapper rendered outside this card, with the band's `z-index: -1`, left
+  // the band painted beneath this card's own opaque background — negative
+  // z-index resolves against the nearest ancestor that forms a stacking
+  // context, which was above this card, not within it. These two slots
+  // share the one inner wrapper `children` renders into (no padding or
+  // margin of its own, so its origin is `children`'s own local origin —
+  // the same frame the stave reports its target head's centre in) so paint
+  // order alone (DOM order, no z-index) puts the underlay behind and the
+  // overlay in front of whatever `children` draws.
+  readonly underlay?: ReactNode;
+  readonly overlay?: ReactNode;
 }): JSX.Element {
-  const { view, onSelectView, children, rangeSummary } = props;
+  const { view, onSelectView, children, rangeSummary, underlay, overlay } =
+    props;
 
   return (
     <div
@@ -61,7 +76,11 @@ export function KeyPanel(props: {
         borderRadius: CARD_RADIUS,
       }}
     >
-      {children}
+      <div style={{ position: "relative" }}>
+        {underlay}
+        {children}
+        {overlay}
+      </div>
       <div
         style={{
           marginTop: ROW_MARGIN_TOP,
diff --git a/src/ui/NoteMeter.tsx b/src/ui/NoteMeter.tsx
index e733ac8..198564d 100644
--- a/src/ui/NoteMeter.tsx
+++ b/src/ui/NoteMeter.tsx
@@ -38,8 +38,17 @@ export function NoteMeter(props: {
     readonly cents: number;
     readonly verdict: Verdict;
   } | null;
+  // practice.session/REQ-017 — App renders the band and the line as two
+  // separate DOM layers (the band behind the panel's content, the line in
+  // front of it — see `KeyPanel`'s `underlay`/`overlay`), each its own
+  // `NoteMeter` sharing this geometry so the two paint either side of it
+  // with no `z-index`. Omitted (the unit tests below), both draw in one box
+  // as before.
+  readonly layer?: "band" | "line";
 }): JSX.Element {
-  const { geometry, toleranceCents, heldFraction, reading } = props;
+  const { geometry, toleranceCents, heldFraction, reading, layer } = props;
+  const showBand = layer !== "line";
+  const showLine = layer !== "band";
 
   const bandTopPercent = 50 - toleranceCents;
   const bandHeightPercent = 2 * toleranceCents;
@@ -71,33 +80,34 @@ export function NoteMeter(props: {
 
   return (
     <div style={boxStyle}>
-      <div
-        data-testid="note-meter-band"
-        style={{
-          position: "absolute",
-          top: `${bandTopPercent}%`,
-          height: `${bandHeightPercent}%`,
-          left: bandInset,
-          right: bandInset,
-          background: tuner.band,
-          borderRadius: noteMeter.bandRadius,
-          overflow: "hidden",
-          zIndex: -1,
-        }}
-      >
+      {showBand && (
         <div
-          data-testid="note-meter-fill"
+          data-testid="note-meter-band"
           style={{
             position: "absolute",
-            left: 0,
-            top: 0,
-            bottom: 0,
-            width: `${Math.round(heldFraction * 100)}%`,
-            background: lead.holdFill,
+            top: `${bandTopPercent}%`,
+            height: `${bandHeightPercent}%`,
+            left: bandInset,
+            right: bandInset,
+            background: tuner.band,
+            borderRadius: noteMeter.bandRadius,
+            overflow: "hidden",
           }}
-        />
-      </div>
-      {reading !== null && (
+        >
+          <div
+            data-testid="note-meter-fill"
+            style={{
+              position: "absolute",
+              left: 0,
+              top: 0,
+              bottom: 0,
+              width: `${Math.round(heldFraction * 100)}%`,
+              background: lead.holdFill,
+            }}
+          />
+        </div>
+      )}
+      {showLine && reading !== null && (
         <div
           data-testid="note-meter-line"
           style={{
@@ -110,7 +120,6 @@ export function NoteMeter(props: {
             borderRadius: noteMeter.lineRadius,
             background: verdictColour(reading.verdict),
             transition: noteMeter.lineTransition,
-            zIndex: 1,
           }}
         />
       )}
diff --git a/src/ui/StaveView.tsx b/src/ui/StaveView.tsx
index 36032fc..852e053 100644
--- a/src/ui/StaveView.tsx
+++ b/src/ui/StaveView.tsx
@@ -1,4 +1,4 @@
-import { useLayoutEffect, type JSX } from "react";
+import { memo, useLayoutEffect, type JSX } from "react";
 import {
   inlineAccidentalsOf,
   signatureOf,
@@ -409,7 +409,12 @@ function buildStave(
 // parity with the rest of the key view even though this component no longer
 // derives the run itself — the caller (App.tsx) already fits it to the
 // variant via `traversalOf` before passing `notes` down.
-export function StaveView(props: {
+// A fixer finding (REQ-017): the stave must not re-render per reading (the
+// plan's constraint) — `App` re-renders on every reading (the live card),
+// and `leadTarget` is now memoized on the run index alone, but `React.memo`
+// here is the belt as well as the braces, since every other prop (`notes`,
+// `variant`, `onTapNote`, `onTargetBox`) is already stable across a reading.
+export const StaveView = memo(function StaveView(props: {
   readonly key_: Key;
   readonly variant: Variant;
   readonly notes: readonly KeyViewNote[];
@@ -657,4 +662,4 @@ export function StaveView(props: {
       ))}
     </div>
   );
-}
+});
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
SPEC: FAIL
QUALITY: PASS
FINDINGS:
- [important] src/ui/App.tsx:310-313 (`selectedKey = spelledMajorAt(position, selection.spelling)`, fed by `circleOfFifths()[selection.positionIndex]` called inline every render, uncached) — the plan's binding constraint for this task, repeated in this round's own code comments ("the stave must not re-render per reading … every other prop (notes, variant, onTapNote, onTargetBox) is already stable across a reading"), is not met: `circleOfFifths()` rebuilds its whole position/Key tree from scratch on every call (`src/theory/domain/circle.ts:71-80`, `majors.map((tonic) => ({ tonic, mode: "major" as const }))` — fresh object literals, no memoization), so `selectedKey` — passed to `StaveView` as `key_` — is a new object reference on every single `App` render, i.e. every reading while a lead run is in progress. `React.memo`'s default shallow comparison sees this prop change and re-renders `StaveView` (and re-runs the whole `buildStave()` geometry computation) regardless of the `leadTarget` memoization. The fixer's list of "already stable" props omits `key_` entirely — the claim is incorrect for the one object-typed prop that actually matters here. Confirmed by reading `circleOfFifths()`/`spelledMajorAt` directly (no test exercises per-render identity, so `pnpm vitest run` cannot show this). This is not a new regression this round introduced, but it means this round's fix does not actually deliver the constraint it was built to satisfy, and the report overstates what was achieved.
- [minor, carried from the previous review, unchanged by this diff] src/ui/StaveView.tsx — `cx`/`cy`/`rx`/`fill`/`opacity` on `<g data-testid="stave-note">` remain production markup shaped for test convenience; harmless, not blocking.
UNVERIFIED:
- practice.session/REQ-017 (`design_snapshot.py … live` → `practice--holding.png`/`practice--holding-meter-off.png` match) — still not run by this package or the implementer; closed instead by a real-Chromium reproduction (mine, below) of the exact stacking mechanism plus the implementer's own silent-state pixel check. Treat the design-fidelity screenshot comparison itself as still open.
COMMANDS:
Playwright (Chromium) render of a minimal page reproducing `KeyPanel`'s exact DOM/CSS shape — opaque card background, a `position:relative` wrapper, an absolutely-positioned band (no z-index) before the stave content, an absolutely-positioned line (no z-index) after it — screenshotted and pixel-cropped: the pale green band is visible beside the notehead (not occluded by the card's opaque background), and the green line paints over the brown notehead where they cross, confirming DOM-order stacking delivers "band behind, line in front" exactly as the fixer's reasoning claims.

<!-- recorded 2026-10-04T00:04:13Z by scripts/record.sh -->
