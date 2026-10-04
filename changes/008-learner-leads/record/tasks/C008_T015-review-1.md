---
type: Task Review
title: Review package — C008_T015 · 008-learner-leads
description: The diff produced for C008_T015, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T015.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T015.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T015.md
  - resource: git:d160793736009de257627b464ba3ac23ed3f5e64..f0d423110e1deba598268a5deee621201a491b9b
generated:
  by: process:review-package.sh
  at: 2026-10-04T00:22:09Z
sdd_id: 008-learner-leads
---

# Review package — C008_T015 · 008-learner-leads

base: `d160793736009de257627b464ba3ac23ed3f5e64` → head: `f0d423110e1deba598268a5deee621201a491b9b`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/names-view.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  11 passed (11)
   Start at  01:22:09
   Duration  1.85s (tests 45%, transform 27%, environment 16%, import 12%)

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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

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
- M	src/ui/NamesView.tsx
- M	tests/ui/scenarios/names-view.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 512664d..c8ff2cf 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -50,7 +50,7 @@ import { Header } from "./Header";
 import { InstrumentSheet } from "./InstrumentSheet";
 import { keyLabel, keyNameFontSizeOf, noteLabel } from "./key-label";
 import { KeyPanel } from "./KeyPanel";
-import { NamesView } from "./NamesView";
+import { NamesView, targetColumnIndexOf } from "./NamesView";
 import { NoteMeter, type MeterGeometry } from "./NoteMeter";
 import { Notices } from "./Notices";
 import { ScaleRow } from "./ScaleRow";
@@ -515,6 +515,43 @@ export function App(props: {
           cents: snapshot.lead.reading.cents,
           verdict: snapshot.lead.reading.verdict,
         };
+  // practice.session/REQ-017 — the names view shows one octave's worth of
+  // columns regardless of how many the run traverses, so the lead target's
+  // run position is resolved to that view's own column index by pitch
+  // class (`targetColumnIndexOf`, the same match `isSounding` already
+  // makes) rather than reused as-is from the stave's `leadTarget`.
+  const namesLeadTargetColumnIndex =
+    snapshot !== null &&
+    snapshot.lead.phase === "listening" &&
+    snapshot.lead.target !== null
+      ? targetColumnIndexOf(
+          selectedKey,
+          snapshot.scale,
+          snapshot.traversal.direction,
+          {
+            letter: snapshot.lead.target.note.letter,
+            accidental: snapshot.lead.target.note.accidental,
+          },
+        )
+      : null;
+  const namesLeadTarget = useMemo(
+    () =>
+      namesLeadTargetColumnIndex === null
+        ? null
+        : { runIndex: namesLeadTargetColumnIndex },
+    [namesLeadTargetColumnIndex],
+  );
+  const namesMeter =
+    snapshot !== null &&
+    snapshot.lead.phase === "listening" &&
+    snapshot.settings.lead.cueMeter &&
+    selection.view === "names"
+      ? {
+          toleranceCents: meterToleranceCents,
+          heldFraction: meterHeldFraction,
+          reading: meterReading,
+        }
+      : null;
   const soundingPitchClass: PitchClass | null = playing
     ? soundingSequenceNote === undefined
       ? null
@@ -937,6 +974,8 @@ export function App(props: {
                 soundingPitchClass={soundingPitchClass}
                 onTapColumn={handleTapColumn}
                 tapsEnabled={tapsEnabled}
+                leadTarget={namesLeadTarget}
+                meter={namesMeter}
               />
             ) : (
               variant !== undefined && (
diff --git a/src/ui/NamesView.tsx b/src/ui/NamesView.tsx
index b1ff607..cd97fa4 100644
--- a/src/ui/NamesView.tsx
+++ b/src/ui/NamesView.tsx
@@ -1,4 +1,5 @@
 import type { JSX } from "react";
+import type { Verdict } from "../practice/published";
 import {
   signatureOf,
   spelledScaleOf,
@@ -9,6 +10,7 @@ import {
   type ScaleNote,
 } from "../theory/published";
 import { pitchClassLabel } from "./key-label";
+import { NoteMeter } from "./NoteMeter";
 import { fonts, paper } from "./theme";
 
 // Mirrors the vendored visual reference's `scale:` mapping in renderVals()
@@ -48,6 +50,12 @@ const DESCENT_SYMBOL = "↓";
 const SOUNDING_BACKGROUND = "rgba(138,75,42,.10)";
 const SOUNDING_INK = paper.accent;
 
+// practice.session/REQ-017 — while a lead run is in progress, every column
+// but the target's dims (the prototype's `op`); the target itself keeps
+// full opacity and carries the meter.
+const LEAD_OTHER_OPACITY = 0.4;
+const FULL_OPACITY = 1;
+
 interface ColumnData {
   readonly name: string;
   readonly pitchClass: PitchClass;
@@ -158,6 +166,23 @@ function columnsOf(
   return [...mainColumns, ...descentColumns];
 }
 
+// practice.session/REQ-017 — App resolves a lead run's target (a position
+// in the session's run, with its own octave) down to this view's own
+// column index by the same pitch-class match `isSounding` already uses:
+// the names view shows one octave's worth of columns regardless of how
+// many the run actually traverses.
+export function targetColumnIndexOf(
+  key_: Key,
+  scale: Scale,
+  direction: Direction,
+  pitchClass: PitchClass,
+): number | null {
+  const index = columnsOf(key_, scale, direction, null).findIndex((column) =>
+    samePitchClass(column.pitchClass, pitchClass),
+  );
+  return index === -1 ? null : index;
+}
+
 function nameFontSizeOf(columnCount: number): number {
   if (columnCount <= 7) return NAME_FONT_SIZE_UP_TO_SEVEN_COLUMNS;
   if (columnCount <= 9) return NAME_FONT_SIZE_UP_TO_NINE_COLUMNS;
@@ -172,6 +197,20 @@ export function NamesView(props: {
   readonly soundingPitchClass: PitchClass | null;
   readonly onTapColumn: (pitchClass: PitchClass) => void;
   readonly tapsEnabled: boolean;
+  // practice.session/REQ-017 — the lead run's target, as this view's own
+  // column index (App resolves the session's run position to it via
+  // `targetColumnIndexOf`); null outside a listening lead run.
+  readonly leadTarget?: { readonly runIndex: number } | null;
+  // practice.session/REQ-017 — null when the meter cue is off or no lead
+  // run is in progress; otherwise drawn inside the target's own column.
+  readonly meter?: {
+    readonly toleranceCents: number;
+    readonly heldFraction: number;
+    readonly reading: {
+      readonly cents: number;
+      readonly verdict: Verdict;
+    } | null;
+  } | null;
 }): JSX.Element {
   const {
     key_,
@@ -181,96 +220,126 @@ export function NamesView(props: {
     soundingPitchClass,
     onTapColumn,
     tapsEnabled,
+    leadTarget = null,
+    meter = null,
   } = props;
   const columns = columnsOf(key_, scale, direction, soundingPitchClass);
   const nameFontSize = nameFontSizeOf(columns.length);
 
   return (
     <div style={{ display: "flex", alignItems: "flex-end", gap: ROW_FLEX_GAP }}>
-      {columns.map((column, index) => (
-        <button
-          key={`${column.name}-${index}`}
-          type="button"
-          data-testid="names-column"
-          data-descent={column.isDescent ? "true" : "false"}
-          data-sounding={column.isSounding ? "true" : "false"}
-          aria-label={column.name}
-          aria-disabled={tapsEnabled ? undefined : "true"}
-          onClick={
-            tapsEnabled ? () => onTapColumn(column.pitchClass) : undefined
-          }
-          style={{
-            flex: 1,
-            display: "flex",
-            flexDirection: "column",
-            alignItems: "center",
-            gap: COLUMN_GAP,
-            background: column.isSounding ? SOUNDING_BACKGROUND : "transparent",
-            border: "none",
-            padding: 0,
-            font: "inherit",
-          }}
-        >
-          {column.isDescent ? (
+      {columns.map((column, index) => {
+        const isLeadTarget =
+          leadTarget !== null && leadTarget.runIndex === index;
+        const highlighted = column.isSounding || isLeadTarget;
+        return (
+          <button
+            key={`${column.name}-${index}`}
+            type="button"
+            data-testid="names-column"
+            data-descent={column.isDescent ? "true" : "false"}
+            data-sounding={column.isSounding ? "true" : "false"}
+            aria-label={column.name}
+            aria-disabled={tapsEnabled ? undefined : "true"}
+            onClick={
+              tapsEnabled ? () => onTapColumn(column.pitchClass) : undefined
+            }
+            style={{
+              position: "relative",
+              flex: 1,
+              display: "flex",
+              flexDirection: "column",
+              alignItems: "center",
+              gap: COLUMN_GAP,
+              background: highlighted ? SOUNDING_BACKGROUND : "transparent",
+              border: "none",
+              padding: 0,
+              font: "inherit",
+            }}
+          >
+            {isLeadTarget && meter !== null && (
+              <NoteMeter
+                layer="band"
+                geometry={{ kind: "column" }}
+                toleranceCents={meter.toleranceCents}
+                heldFraction={meter.heldFraction}
+                reading={meter.reading}
+              />
+            )}
+            {column.isDescent ? (
+              <div
+                data-testid="descent-mark"
+                style={{
+                  fontFamily: fonts.mono,
+                  fontSize: MARK_FONT_SIZE,
+                  fontWeight: MARK_WEIGHT_PLAIN,
+                  color: MARK_INK_PLAIN,
+                  lineHeight: 1,
+                  height: MARK_ROW_HEIGHT,
+                }}
+              >
+                {DESCENT_SYMBOL}
+              </div>
+            ) : (
+              <div
+                data-testid="note-mark"
+                data-accented={column.accented ? "true" : "false"}
+                style={{
+                  fontFamily: fonts.mono,
+                  fontSize: MARK_FONT_SIZE,
+                  fontWeight: column.accented
+                    ? MARK_WEIGHT_ACCENTED
+                    : MARK_WEIGHT_PLAIN,
+                  color: column.accented ? MARK_INK_ACCENTED : MARK_INK_PLAIN,
+                  lineHeight: 1,
+                  height: MARK_ROW_HEIGHT,
+                }}
+              >
+                {column.mark}
+              </div>
+            )}
             <div
-              data-testid="descent-mark"
+              data-testid="column-name"
               style={{
-                fontFamily: fonts.mono,
-                fontSize: MARK_FONT_SIZE,
-                fontWeight: MARK_WEIGHT_PLAIN,
-                color: MARK_INK_PLAIN,
+                fontSize: nameFontSize,
+                fontWeight: NAME_FONT_WEIGHT,
+                letterSpacing: NAME_LETTER_SPACING,
+                color: highlighted ? SOUNDING_INK : NAME_INK,
                 lineHeight: 1,
-                height: MARK_ROW_HEIGHT,
+                opacity:
+                  leadTarget !== null && !isLeadTarget
+                    ? LEAD_OTHER_OPACITY
+                    : FULL_OPACITY,
               }}
             >
-              {DESCENT_SYMBOL}
+              {column.name}
             </div>
-          ) : (
             <div
-              data-testid="note-mark"
-              data-accented={column.accented ? "true" : "false"}
+              data-testid="note-degree"
+              data-altered={column.altered ? "true" : "false"}
               style={{
                 fontFamily: fonts.mono,
-                fontSize: MARK_FONT_SIZE,
-                fontWeight: column.accented
-                  ? MARK_WEIGHT_ACCENTED
-                  : MARK_WEIGHT_PLAIN,
-                color: column.accented ? MARK_INK_ACCENTED : MARK_INK_PLAIN,
+                fontSize: DEGREE_FONT_SIZE,
+                fontWeight: DEGREE_FONT_WEIGHT,
+                color: column.altered ? DEGREE_INK_ACCENTED : DEGREE_INK_PLAIN,
                 lineHeight: 1,
-                height: MARK_ROW_HEIGHT,
+                height: DEGREE_ROW_HEIGHT,
               }}
             >
-              {column.mark}
+              {degreesEnabled ? column.degreeLabel : ""}
             </div>
-          )}
-          <div
-            data-testid="column-name"
-            style={{
-              fontSize: nameFontSize,
-              fontWeight: NAME_FONT_WEIGHT,
-              letterSpacing: NAME_LETTER_SPACING,
-              color: column.isSounding ? SOUNDING_INK : NAME_INK,
-              lineHeight: 1,
-            }}
-          >
-            {column.name}
-          </div>
-          <div
-            data-testid="note-degree"
-            data-altered={column.altered ? "true" : "false"}
-            style={{
-              fontFamily: fonts.mono,
-              fontSize: DEGREE_FONT_SIZE,
-              fontWeight: DEGREE_FONT_WEIGHT,
-              color: column.altered ? DEGREE_INK_ACCENTED : DEGREE_INK_PLAIN,
-              lineHeight: 1,
-              height: DEGREE_ROW_HEIGHT,
-            }}
-          >
-            {degreesEnabled ? column.degreeLabel : ""}
-          </div>
-        </button>
-      ))}
+            {isLeadTarget && meter !== null && (
+              <NoteMeter
+                layer="line"
+                geometry={{ kind: "column" }}
+                toleranceCents={meter.toleranceCents}
+                heldFraction={meter.heldFraction}
+                reading={meter.reading}
+              />
+            )}
+          </button>
+        );
+      })}
     </div>
   );
 }
diff --git a/tests/ui/scenarios/names-view.test.tsx b/tests/ui/scenarios/names-view.test.tsx
index dc822c2..a9c5d7d 100644
--- a/tests/ui/scenarios/names-view.test.tsx
+++ b/tests/ui/scenarios/names-view.test.tsx
@@ -1,5 +1,6 @@
 import { cleanup, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
+import type { ComponentProps } from "react";
 import { afterEach, expect, test } from "vitest";
 import {
   builtInCatalogue,
@@ -253,6 +254,71 @@ test("practice.session/REQ-012/S4 — the descent of a split-direction scale in
   expect(readColumns()).toHaveLength(7);
 });
 
+// practice.session/REQ-017 — base props shared by the names-view meter
+// scenarios below: the C major scale, direction ↑↓, degrees on, no sound
+// and no taps, idle of a lead target and a meter.
+type NamesViewProps = ComponentProps<typeof NamesView>;
+
+const baseNamesProps = (): NamesViewProps => ({
+  key_: {
+    tonic: { letter: "C", accidental: "natural" },
+    mode: "major",
+  },
+  scale: scaleById("major"),
+  direction: "updown",
+  degreesEnabled: true,
+  soundingPitchClass: null,
+  onTapColumn: () => {},
+  tapsEnabled: false,
+  leadTarget: null,
+  meter: null,
+});
+
+const renderNames = (extra: Partial<NamesViewProps>) =>
+  render(<NamesView {...baseNamesProps()} {...extra} />);
+
+test("practice.session/REQ-017/S6 — the names view: band inset 6, fill 40 %, line inset 3 at +5 ¢", () => {
+  renderNames({
+    leadTarget: { runIndex: 2 },
+    meter: {
+      toleranceCents: 10,
+      heldFraction: 0.4,
+      reading: { cents: 5, verdict: "in-tune" },
+    },
+  });
+  const columns = screen.getAllByTestId("names-column");
+  const band = within(columns[2]!).getByTestId("note-meter-band");
+  expect(band.style.left).toBe("6px");
+  expect(band.style.right).toBe("6px");
+  expect(band.style.height).toBe("20%");
+  expect(within(columns[2]!).getByTestId("note-meter-fill").style.width).toBe(
+    "40%",
+  );
+  const line = within(columns[2]!).getByTestId("note-meter-line");
+  expect(line.style.left).toBe("3px");
+  expect(line.style.right).toBe("3px");
+  expect(line.style.top).toBe("45%");
+  expect(screen.getAllByTestId("note-meter-band")).toHaveLength(1);
+  expect(columns[2]!.style.background).not.toBe("transparent");
+});
+
+test("practice.session/REQ-017/S1 (names) — silent: the column highlighted, the band, no line", () => {
+  renderNames({
+    leadTarget: { runIndex: 0 },
+    meter: { toleranceCents: 10, heldFraction: 0, reading: null },
+  });
+  const columns = screen.getAllByTestId("names-column");
+  expect(within(columns[0]!).getByTestId("note-meter-band")).toBeTruthy();
+  expect(screen.queryByTestId("note-meter-line")).toBeNull();
+  expect(
+    columns
+      .slice(1)
+      .every(
+        (c) => within(c).getByTestId("column-name").style.opacity === "0.4",
+      ),
+  ).toBe(true);
+});
+
 test("theory.circle-of-fifths/REQ-003/S5 (UI) — a five-note scale shows five columns", () => {
   render(
     <NamesView
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T015.md b/changes/008-learner-leads/tasks/C008_T015.md
index cce7fff..c92d250 100644
--- a/changes/008-learner-leads/tasks/C008_T015.md
+++ b/changes/008-learner-leads/tasks/C008_T015.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T015
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-017]
 sdd_depends_on: [C008_T014]
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T015 · The names view: the meter in the target column
```

## Verdict

_The task reviewer appends its verdict here._

TASK: C008_T015
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] src/ui/NamesView.tsx:200-213 — Produces types `leadTarget`/`meter` as required props with unqualified `reading` fields; the code makes them optional (`?`) and adds `readonly` to `cents`/`verdict`. Not a defect: the optional form matches `StaveView`'s established `leadTarget` precedent from T014 (src/ui/StaveView.tsx:427), and the added `readonly` is consistent with the file's otherwise-exhaustive immutability.
UNVERIFIED:
- practice.session/REQ-017 (names view) — `design_snapshot.py … live` → `practice--holding.png` matching phone 05 switched to names is not run by this package or the implementer, consistent with the precedent set at T014's review (treated there as a standing gap, not a per-task blocker).

<!-- recorded 2026-10-04T05:56:36Z by scripts/record.sh -->
