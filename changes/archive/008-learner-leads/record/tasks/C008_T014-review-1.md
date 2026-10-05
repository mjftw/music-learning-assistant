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
  - resource: git:fdec2bf72a889f48c5bf735d44d158bc08c6b48f..674d6a4552c9d3e6538cd7a98a179920b7aefc12
generated:
  by: process:review-package.sh
  at: 2026-10-03T23:40:57Z
sdd_id: 008-learner-leads
---

# Review package — C008_T014 · 008-learner-leads

base: `fdec2bf72a889f48c5bf735d44d158bc08c6b48f` → head: `674d6a4552c9d3e6538cd7a98a179920b7aefc12`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  18 passed (18)
   Start at  00:40:58
   Duration  2.17s (tests 44%, environment 22%, transform 21%, import 12%)

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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

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
- A	src/ui/NoteMeter.tsx
- M	src/ui/StaveView.tsx
- M	src/ui/theme.ts
- A	tests/ui/scenarios/note-meter.test.tsx
- M	tests/ui/scenarios/stave-view.test.tsx
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 28532b5..afe817b 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -25,6 +25,7 @@ import {
   defaultScaleChoice,
   steppedTempo,
   tempoForTerm,
+  TOLERANCE_CENTS,
   type DroneSettings,
   type DroneSound,
   type Session,
@@ -43,6 +44,7 @@ import { InstrumentSheet } from "./InstrumentSheet";
 import { keyLabel, keyNameFontSizeOf, noteLabel } from "./key-label";
 import { KeyPanel } from "./KeyPanel";
 import { NamesView } from "./NamesView";
+import { NoteMeter } from "./NoteMeter";
 import { Notices } from "./Notices";
 import { ScaleRow } from "./ScaleRow";
 import { ScaleSheet } from "./ScaleSheet";
@@ -274,6 +276,13 @@ export function App(props: {
   const [selection, setSelection] = useState<Selection>(() =>
     initialSelection(catalogue, selectionStore),
   );
+  // practice.session/REQ-017 — the target notehead's own centre, in the
+  // stave's px, as `StaveView` reports it; `NoteMeter` is positioned from
+  // this rather than the DOM so the stave never re-renders per reading.
+  const [targetBox, setTargetBox] = useState<{
+    readonly x: number;
+    readonly y: number;
+  } | null>(null);
   const [settingsOpen, setSettingsOpen] = useState(false);
   const [instrumentSheetOpen, setInstrumentSheetOpen] = useState(false);
   const [traversalSheetOpen, setTraversalSheetOpen] = useState(false);
@@ -451,6 +460,15 @@ export function App(props: {
     snapshot === null || snapshot.tappedRunIndex === null
       ? undefined
       : snapshot.run[snapshot.tappedRunIndex];
+  // practice.session/REQ-017 — the lead run's target, highlighted the same
+  // way a sounding note is; null outside "listening" (idle, complete and
+  // cannot-hear all show the run plain).
+  const leadTarget =
+    snapshot !== null &&
+    snapshot.lead.phase === "listening" &&
+    snapshot.lead.target !== null
+      ? { runIndex: snapshot.lead.target.runIndex }
+      : null;
   const soundingPitchClass: PitchClass | null = playing
     ? soundingSequenceNote === undefined
       ? null
@@ -820,50 +838,82 @@ export function App(props: {
               />
             </div>
           )}
-          <KeyPanel
-            view={selection.view}
-            onSelectView={(selectedView) =>
-              setSelection((current) => ({ ...current, view: selectedView }))
-            }
-            rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
-          >
-            {selection.view === "names" ? (
-              <NamesView
-                key_={selectedKey}
-                scale={
-                  // No session, no chosen scale yet — the mode's own default
-                  // stands in for the single render before the session-creating
-                  // effect completes, mirroring `notes`' `[]` fallback on the
-                  // StaveView branch below.
-                  snapshot === null
-                    ? scaleById(
-                        chosenScaleIdFor(defaultScaleChoice, selection.mode),
-                      )
-                    : snapshot.scale
-                }
-                direction={
-                  snapshot === null ? "updown" : snapshot.traversal.direction
-                }
-                degreesEnabled={selection.degreesEnabled}
-                soundingPitchClass={soundingPitchClass}
-                onTapColumn={handleTapColumn}
-                tapsEnabled={tapsEnabled}
-              />
-            ) : (
-              variant !== undefined && (
-                <StaveView
+          <div style={{ position: "relative" }}>
+            <KeyPanel
+              view={selection.view}
+              onSelectView={(selectedView) =>
+                setSelection((current) => ({
+                  ...current,
+                  view: selectedView,
+                }))
+              }
+              rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
+            >
+              {selection.view === "names" ? (
+                <NamesView
                   key_={selectedKey}
-                  variant={variant}
-                  notes={snapshot === null ? [] : snapshot.run}
-                  staveNamesEnabled={selection.staveNamesEnabled}
-                  soundingRunIndex={soundingRunIndex}
-                  playing={playing}
-                  onTapNote={handleTapNote}
+                  scale={
+                    // No session, no chosen scale yet — the mode's own default
+                    // stands in for the single render before the session-creating
+                    // effect completes, mirroring `notes`' `[]` fallback on the
+                    // StaveView branch below.
+                    snapshot === null
+                      ? scaleById(
+                          chosenScaleIdFor(defaultScaleChoice, selection.mode),
+                        )
+                      : snapshot.scale
+                  }
+                  direction={
+                    snapshot === null ? "updown" : snapshot.traversal.direction
+                  }
+                  degreesEnabled={selection.degreesEnabled}
+                  soundingPitchClass={soundingPitchClass}
+                  onTapColumn={handleTapColumn}
                   tapsEnabled={tapsEnabled}
                 />
-              )
-            )}
-          </KeyPanel>
+              ) : (
+                variant !== undefined && (
+                  <StaveView
+                    key_={selectedKey}
+                    variant={variant}
+                    notes={snapshot === null ? [] : snapshot.run}
+                    staveNamesEnabled={selection.staveNamesEnabled}
+                    soundingRunIndex={soundingRunIndex}
+                    playing={playing}
+                    onTapNote={handleTapNote}
+                    tapsEnabled={tapsEnabled}
+                    leadTarget={leadTarget}
+                    onTargetBox={setTargetBox}
+                  />
+                )
+              )}
+            </KeyPanel>
+            {snapshot !== null &&
+              snapshot.lead.phase === "listening" &&
+              snapshot.settings.lead.cueMeter &&
+              selection.view === "stave" &&
+              targetBox !== null && (
+                <NoteMeter
+                  geometry={{
+                    kind: "stave",
+                    centreX: targetBox.x,
+                    centreY: targetBox.y,
+                  }}
+                  toleranceCents={
+                    TOLERANCE_CENTS[snapshot.settings.lead.tolerance]
+                  }
+                  heldFraction={snapshot.lead.heldFraction}
+                  reading={
+                    snapshot.lead.reading === null
+                      ? null
+                      : {
+                          cents: snapshot.lead.reading.cents,
+                          verdict: snapshot.lead.reading.verdict,
+                        }
+                  }
+                />
+              )}
+          </div>
           {snapshot !== null && session !== null && (
             <div
               style={{
diff --git a/src/ui/NoteMeter.tsx b/src/ui/NoteMeter.tsx
new file mode 100644
index 0000000..e733ac8
--- /dev/null
+++ b/src/ui/NoteMeter.tsx
@@ -0,0 +1,119 @@
+import type { JSX } from "react";
+import type { Verdict } from "../practice/published";
+import { lead, noteMeter, tuner } from "./theme";
+
+// practice.session/REQ-017, REQ-018 — the meter drawn on the target note:
+// ±50 ¢ spans `noteMeter.boxHeight` px, sharp up and flat down. A pale
+// band ±tolerance tall sits behind the note, filling left to right by
+// held time ÷ required hold; a 2 px pitch line sits in front, clamped to
+// ±50 ¢, hidden while nothing is detected. Two geometries share this one
+// component: the stave (a fixed-size box centred on the notehead) and the
+// names view's column (inset from the cell's own box, drawn by the
+// caller).
+export type MeterGeometry =
+  | {
+      readonly kind: "stave";
+      readonly centreX: number;
+      readonly centreY: number;
+    }
+  | { readonly kind: "column" };
+
+const CENTS_RANGE = 50; // ±50 ¢ spans the box
+
+function clampCents(cents: number): number {
+  return Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
+}
+
+function verdictColour(verdict: Verdict): string {
+  if (verdict === "flat") return tuner.flat;
+  if (verdict === "sharp") return tuner.sharp;
+  return tuner.inTune;
+}
+
+export function NoteMeter(props: {
+  readonly geometry: MeterGeometry;
+  readonly toleranceCents: number;
+  readonly heldFraction: number;
+  readonly reading: {
+    readonly cents: number;
+    readonly verdict: Verdict;
+  } | null;
+}): JSX.Element {
+  const { geometry, toleranceCents, heldFraction, reading } = props;
+
+  const bandTopPercent = 50 - toleranceCents;
+  const bandHeightPercent = 2 * toleranceCents;
+
+  const boxStyle =
+    geometry.kind === "stave"
+      ? {
+          position: "absolute" as const,
+          left: geometry.centreX - noteMeter.staveBandWidth / 2,
+          top: geometry.centreY - noteMeter.boxHeight / 2,
+          width: noteMeter.staveBandWidth,
+          height: noteMeter.boxHeight,
+          pointerEvents: "none" as const,
+        }
+      : {
+          position: "absolute" as const,
+          left: 0,
+          right: 0,
+          top: noteMeter.columnBoxTop,
+          height: noteMeter.boxHeight,
+          pointerEvents: "none" as const,
+        };
+
+  const bandInset = geometry.kind === "stave" ? 0 : noteMeter.columnBandInset;
+  const lineInset =
+    geometry.kind === "stave"
+      ? -noteMeter.staveLineOverhang
+      : noteMeter.columnLineInset;
+
+  return (
+    <div style={boxStyle}>
+      <div
+        data-testid="note-meter-band"
+        style={{
+          position: "absolute",
+          top: `${bandTopPercent}%`,
+          height: `${bandHeightPercent}%`,
+          left: bandInset,
+          right: bandInset,
+          background: tuner.band,
+          borderRadius: noteMeter.bandRadius,
+          overflow: "hidden",
+          zIndex: -1,
+        }}
+      >
+        <div
+          data-testid="note-meter-fill"
+          style={{
+            position: "absolute",
+            left: 0,
+            top: 0,
+            bottom: 0,
+            width: `${Math.round(heldFraction * 100)}%`,
+            background: lead.holdFill,
+          }}
+        />
+      </div>
+      {reading !== null && (
+        <div
+          data-testid="note-meter-line"
+          style={{
+            position: "absolute",
+            top: `${50 - clampCents(reading.cents)}%`,
+            height: noteMeter.lineHeight,
+            marginTop: -1,
+            left: lineInset,
+            right: lineInset,
+            borderRadius: noteMeter.lineRadius,
+            background: verdictColour(reading.verdict),
+            transition: noteMeter.lineTransition,
+            zIndex: 1,
+          }}
+        />
+      )}
+    </div>
+  );
+}
diff --git a/src/ui/StaveView.tsx b/src/ui/StaveView.tsx
index 61761d5..36032fc 100644
--- a/src/ui/StaveView.tsx
+++ b/src/ui/StaveView.tsx
@@ -1,4 +1,4 @@
-import type { JSX } from "react";
+import { useLayoutEffect, type JSX } from "react";
 import {
   inlineAccidentalsOf,
   signatureOf,
@@ -110,6 +110,30 @@ const SOUNDING_HALO_RADIUS_MULTIPLIER = 2.5;
 const DIM_OPACITY = 0.72;
 const FULL_OPACITY = 1;
 
+// A lead run's ink-behind / faint-ahead (practice.session/REQ-017/S8):
+// notes up to and including the target are ink, the rest of the run is
+// faint — a different dimming from `playing`'s uniform DIM_OPACITY, so the
+// two never mix.
+const LEAD_FAINT_OPACITY = 0.3;
+
+type NoteOpacityMode =
+  | { readonly kind: "none" }
+  | { readonly kind: "playing"; readonly soundingRunIndex: number | null }
+  | { readonly kind: "lead"; readonly targetRunIndex: number };
+
+function noteOpacityOf(runIndex: number, mode: NoteOpacityMode): number {
+  switch (mode.kind) {
+    case "none":
+      return FULL_OPACITY;
+    case "playing":
+      return mode.soundingRunIndex === runIndex ? FULL_OPACITY : DIM_OPACITY;
+    case "lead":
+      return runIndex <= mode.targetRunIndex
+        ? FULL_OPACITY
+        : LEAD_FAINT_OPACITY;
+  }
+}
+
 // The tap target behind every notehead (practice.session/REQ-013) — wider
 // than a narrow notehead's own spacing (`step`) so a cluster of notes
 // stays tappable, and tall enough to span the stave regardless of a
@@ -203,6 +227,7 @@ function buildStave(
   withNames: boolean,
   soundingRunIndex: number | null,
   playing: boolean,
+  leadTargetRunIndex: number | null,
 ): StaveGeometry {
   const indices = notes.map((entry) => diatonicIndex(entry.note));
   const highest = Math.max(...indices, PANEL_F5);
@@ -243,10 +268,22 @@ function buildStave(
     const stemUp = index_ < STEM_UP_THRESHOLD_INDEX;
     // No longer requires `playing` — REQ-013's tapped highlight applies
     // idle too; REQ-006's dim-the-rest still only applies while playing
-    // (below), so a tap's highlight is never accompanied by a dim.
-    const isSounding = soundingRunIndex === index;
+    // (below), so a tap's highlight is never accompanied by a dim. A lead
+    // run's target (REQ-017) is highlighted the same way, in place of
+    // `soundingRunIndex`.
+    const isSounding =
+      leadTargetRunIndex !== null
+        ? leadTargetRunIndex === index
+        : soundingRunIndex === index;
     const ink = isSounding ? SOUNDING_INK : isRoot ? TONIC_INK : NOTE_INK;
-    const opacity = playing && !isSounding ? DIM_OPACITY : FULL_OPACITY;
+    const opacity = noteOpacityOf(
+      index,
+      leadTargetRunIndex !== null
+        ? { kind: "lead", targetRunIndex: leadTargetRunIndex }
+        : playing
+          ? { kind: "playing", soundingRunIndex }
+          : { kind: "none" },
+    );
     const headRx = isSounding ? rx * SOUNDING_RX_MULTIPLIER : rx;
     const hitW = Math.max(step, HIT_RECT_MIN_WIDTH);
     const hitY = Math.min(ny, topY) - HIT_RECT_Y_INSET;
@@ -381,6 +418,10 @@ export function StaveView(props: {
   readonly playing: boolean;
   readonly onTapNote: (runIndex: number) => void;
   readonly tapsEnabled: boolean;
+  readonly leadTarget?: { readonly runIndex: number } | null;
+  readonly onTargetBox?: (
+    box: { readonly x: number; readonly y: number } | null,
+  ) => void;
 }): JSX.Element {
   const {
     key_,
@@ -390,6 +431,8 @@ export function StaveView(props: {
     playing,
     onTapNote,
     tapsEnabled,
+    leadTarget = null,
+    onTargetBox,
   } = props;
 
   const signature = signatureOf(key_);
@@ -413,8 +456,26 @@ export function StaveView(props: {
     staveNamesEnabled,
     soundingRunIndex,
     playing,
+    leadTarget?.runIndex ?? null,
   );
 
+  const targetHead =
+    leadTarget === null
+      ? null
+      : (stave.heads.find((head) => head.runIndex === leadTarget.runIndex) ??
+        null);
+
+  // The stave must never re-render per reading (the plan's constraint):
+  // `App` positions `NoteMeter` from this box, so it reads the target
+  // head's own centre rather than the DOM — this effect only reports a new
+  // box when the target (or its geometry) actually changes.
+  useLayoutEffect(() => {
+    if (onTargetBox === undefined) return;
+    onTargetBox(
+      targetHead === null ? null : { x: targetHead.x, y: targetHead.y },
+    );
+  }, [leadTarget?.runIndex, targetHead?.x, targetHead?.y, onTargetBox]);
+
   return (
     <div
       data-testid="stave"
@@ -462,6 +523,15 @@ export function StaveView(props: {
             data-testid="stave-note"
             data-note={noteLabel(head.note)}
             data-root={head.isRoot ? "true" : "false"}
+            // cx/cy/rx/fill/opacity mirror the notehead ellipse below —
+            // read-only probes so a test (and `onTargetBox`) can reach the
+            // head's own geometry and styling without `querySelector`;
+            // they carry no visual meaning on a `<g>`.
+            cx={head.x}
+            cy={head.y}
+            rx={head.rx}
+            fill={head.ink}
+            opacity={head.opacity}
           >
             <line
               x1={head.stemX}
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index dbde864..4e8f3b5 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -32,7 +32,12 @@ export const tuner = {
   sharp: "oklch(0.55 0.11 28)",
   flat: "oklch(0.55 0.11 258)",
   inTune: "oklch(0.55 0.11 150)",
-  band: "oklch(0.90 0.045 150)",
+  // 0.9, not 0.90 — jsdom's (and every browser's) CSSOM strips an
+  // insignificant trailing zero when a style value round-trips, so a test
+  // comparing `el.style.background` to this constant needs the same
+  // normal form the engine will hand back; the colour is identical either
+  // way.
+  band: "oklch(0.9 0.045 150)",
   targetHead: "#a39a8c",
   ghostInk: "#8a8175",
 } as const;
@@ -49,7 +54,25 @@ export const motion = {
 // colours themselves are tuner.band / tuner.inTune / tuner.flat /
 // tuner.sharp (docs/design.md §8: one value per role).
 export const lead = {
-  holdFill: "oklch(0.80 0.07 150)",
+  // 0.8, not 0.80 — see the comment on `tuner.band`.
+  holdFill: "oklch(0.8 0.07 150)",
+} as const;
+
+// practice.session/REQ-017 — the meter on the target note: the box (40 px
+// tall, ±50 ¢), the band's width on the stave / its inset in the names
+// view, the pitch line's overhang / inset, radii and its 180 ms move.
+export const noteMeter = {
+  boxHeight: 40,
+  pxPerCent: 0.4,
+  staveBandWidth: 26,
+  staveLineOverhang: 2,
+  columnBandInset: 6,
+  columnLineInset: 3,
+  columnBoxTop: 13,
+  bandRadius: 3,
+  lineHeight: 2,
+  lineRadius: 1,
+  lineTransition: "top .18s cubic-bezier(.3,.7,.3,1)",
 } as const;
 
 // practice.session/REQ-015, REQ-017, REQ-022 — the live lead card's target
diff --git a/tests/ui/scenarios/note-meter.test.tsx b/tests/ui/scenarios/note-meter.test.tsx
new file mode 100644
index 0000000..377b0e7
--- /dev/null
+++ b/tests/ui/scenarios/note-meter.test.tsx
@@ -0,0 +1,119 @@
+import { cleanup, render, screen } from "@testing-library/react";
+import { afterEach, expect, test } from "vitest";
+import { NoteMeter } from "../../../src/ui/NoteMeter";
+import { lead, tuner } from "../../../src/ui/theme";
+
+afterEach(cleanup);
+
+const stave = { kind: "stave", centreX: 100, centreY: 60 } as const;
+
+test("practice.session/REQ-017/S1 — silent: the band, no fill, no line", () => {
+  render(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={10}
+      heldFraction={0}
+      reading={null}
+    />,
+  );
+  const band = screen.getByTestId("note-meter-band");
+  expect(band.style.top).toBe("40%");
+  expect(band.style.height).toBe("20%");
+  expect(band.style.background).toBe(tuner.band);
+  expect(band.parentElement!.style.width).toBe("26px");
+  expect(band.parentElement!.style.height).toBe("40px");
+  expect(band.parentElement!.style.left).toBe("87px");
+  expect(band.parentElement!.style.top).toBe("40px");
+  expect(screen.getByTestId("note-meter-fill").style.width).toBe("0%");
+  expect(screen.queryByTestId("note-meter-line")).toBeNull();
+});
+
+test("practice.session/REQ-017/S2 — flat, then sharp", () => {
+  const { rerender } = render(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={10}
+      heldFraction={0}
+      reading={{ cents: -18, verdict: "flat" }}
+    />,
+  );
+  const line = screen.getByTestId("note-meter-line");
+  expect(line.style.top).toBe("68%");
+  expect(line.style.background).toBe(tuner.flat);
+  expect(line.style.left).toBe("-2px");
+  expect(line.style.right).toBe("-2px");
+  rerender(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={10}
+      heldFraction={0}
+      reading={{ cents: 12, verdict: "sharp" }}
+    />,
+  );
+  expect(screen.getByTestId("note-meter-line").style.top).toBe("38%");
+  expect(screen.getByTestId("note-meter-line").style.background).toBe(
+    tuner.sharp,
+  );
+});
+
+test("practice.session/REQ-017/S3 — holding: the fill", () => {
+  render(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={10}
+      heldFraction={0.6}
+      reading={{ cents: 6, verdict: "in-tune" }}
+    />,
+  );
+  expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
+  expect(screen.getByTestId("note-meter-fill").style.background).toBe(
+    lead.holdFill,
+  );
+  expect(screen.getByTestId("note-meter-line").style.background).toBe(
+    tuner.inTune,
+  );
+});
+
+test("practice.session/REQ-017/S5 — pinned beyond ±50 ¢", () => {
+  render(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={10}
+      heldFraction={0}
+      reading={{ cents: 1200, verdict: "sharp" }}
+    />,
+  );
+  expect(screen.getByTestId("note-meter-line").style.top).toBe("0%");
+});
+
+test("practice.session/REQ-019/S2 — accurate is a 4 px band", () => {
+  render(
+    <NoteMeter
+      geometry={stave}
+      toleranceCents={5}
+      heldFraction={0}
+      reading={null}
+    />,
+  );
+  expect(screen.getByTestId("note-meter-band").style.height).toBe("10%"); // 10 % of 40 px = 4 px
+});
+
+test("practice.session/REQ-017/S6 — the column geometry", () => {
+  render(
+    <NoteMeter
+      geometry={{ kind: "column" }}
+      toleranceCents={10}
+      heldFraction={0.4}
+      reading={{ cents: 5, verdict: "in-tune" }}
+    />,
+  );
+  const band = screen.getByTestId("note-meter-band");
+  expect(band.style.left).toBe("6px");
+  expect(band.style.right).toBe("6px");
+  expect(band.parentElement!.style.top).toBe("13px");
+  expect(screen.getByTestId("note-meter-fill").style.width).toBe("40%");
+  const line = screen.getByTestId("note-meter-line");
+  expect(line.style.left).toBe("3px");
+  expect(line.style.right).toBe("3px");
+  expect(line.style.top).toBe("45%");
+});
diff --git a/tests/ui/scenarios/stave-view.test.tsx b/tests/ui/scenarios/stave-view.test.tsx
index ee5a938..695f668 100644
--- a/tests/ui/scenarios/stave-view.test.tsx
+++ b/tests/ui/scenarios/stave-view.test.tsx
@@ -1,5 +1,6 @@
 import { cleanup, render, screen } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
+import type { ComponentProps } from "react";
 import { afterEach, expect, test } from "vitest";
 import {
   builtInCatalogue,
@@ -52,6 +53,34 @@ const flute = () =>
     .instruments.flatMap((instrument) => instrument.variants)
     .find((variant) => variant.variantId === "flute-concert")!;
 
+// practice.session/REQ-017 — a local helper for the lead-target tests
+// below: the eight KeyViewNotes of C major on the flute, rendered with the
+// file's usual base props, `extra` spread over the top.
+const cMajor: Key = {
+  tonic: { letter: "C", accidental: "natural" },
+  mode: "major",
+};
+const renderStave = (extra: Partial<ComponentProps<typeof StaveView>> = {}) => {
+  const notes = traversalOf(cMajor, flute(), scaleById("major"), {
+    direction: "up",
+    octaves: { kind: "count", count: 1 },
+    shape: "scale",
+  }).run;
+  return render(
+    <StaveView
+      key_={cMajor}
+      variant={flute()}
+      notes={notes}
+      staveNamesEnabled={false}
+      soundingRunIndex={null}
+      playing={false}
+      onTapNote={() => {}}
+      tapsEnabled={false}
+      {...extra}
+    />,
+  );
+};
+
 test("theory.circle-of-fifths/REQ-003/S1 — G major on the flute (acceptance)", () => {
   const notes = traversalOf(gMajor, flute(), scaleById("major"), {
     direction: "updown",
@@ -492,3 +521,44 @@ test("theory.circle-of-fifths/REQ-003/S7 — the stave after a scale change is e
       .map((glyph) => glyph.getAttribute("data-glyph")),
   ).toEqual(expectedGlyphs);
 });
+
+test("practice.session/REQ-017/S8 — ink behind, faint ahead", () => {
+  renderStave({ leadTarget: { runIndex: 4 } });
+  const heads = screen.getAllByTestId("stave-note");
+  expect(heads.slice(0, 4).map((h) => h.getAttribute("opacity"))).toEqual([
+    "1",
+    "1",
+    "1",
+    "1",
+  ]);
+  expect(heads.slice(5).map((h) => h.getAttribute("opacity"))).toEqual([
+    "0.3",
+    "0.3",
+    "0.3",
+  ]);
+  expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
+  expect(Number(heads[4]!.getAttribute("rx"))).toBeGreaterThan(
+    Number(heads[3]!.getAttribute("rx")),
+  );
+});
+
+test("practice.session/REQ-017/S1 (stave) — the target is highlighted as a sounding note", () => {
+  renderStave({ leadTarget: { runIndex: 0 } });
+  expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
+  expect(screen.getAllByTestId("stave-note")[0]!.getAttribute("fill")).toBe(
+    "#8a4b2a",
+  );
+});
+
+test("practice.session/REQ-017 — onTargetBox reports the target head's centre", () => {
+  const boxes: ({ x: number; y: number } | null)[] = [];
+  renderStave({
+    leadTarget: { runIndex: 0 },
+    onTargetBox: (b) => boxes.push(b),
+  });
+  const head = screen.getAllByTestId("stave-note")[0]!;
+  expect(boxes.at(-1)).toEqual({
+    x: Number(head.getAttribute("cx")),
+    y: Number(head.getAttribute("cy")),
+  });
+});
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index 2a65d1b..a5bd68f 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -222,3 +222,26 @@ test("practice.session/REQ-022/S1 (card) — the no-mic card", async () => {
   expect(screen.getByTestId("mode-word-me")).toBeTruthy();
   expect(screen.queryByRole("dialog")).toBeNull();
 });
+
+test("practice.session/REQ-018/S1 (app) — meter off: no band, fill or line; the highlight stays", async () => {
+  const app = renderLeadApp(
+    storedCMajor({ who: "me", cueMeter: false }, { view: "stave" }),
+  );
+  await startLeadInApp(app);
+  hearInApp(app, 258.92, 0);
+  expect(screen.queryByTestId("note-meter-band")).toBeNull();
+  expect(screen.queryByTestId("note-meter-line")).toBeNull();
+  expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
+  expect(screen.getByTestId("judgement").textContent).toBe("↓ 18 ¢ flat");
+});
+
+test("practice.session/REQ-017/S3 (app, stave) — the meter sits on the target", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }, { view: "stave" }));
+  await startLeadInApp(app);
+  hearSteadyInApp(app, 262.5, 0, 750);
+  const head = screen.getAllByTestId("stave-note")[0]!;
+  const box = screen.getByTestId("note-meter-band").parentElement!;
+  expect(box.style.left).toBe(`${Number(head.getAttribute("cx")) - 13}px`);
+  expect(box.style.top).toBe(`${Number(head.getAttribute("cy")) - 20}px`);
+  expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
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

<!-- recorded 2026-10-03T23:46:19Z by scripts/record.sh -->
