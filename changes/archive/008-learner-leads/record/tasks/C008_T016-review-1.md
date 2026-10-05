---
type: Task Review
title: Review package — C008_T016 · 008-learner-leads
description: The diff produced for C008_T016, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T016.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T016.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T016.md
  - resource: git:92befb7d5e55be3086de107e406342104a96c577..ca10dcaefff44de05dd5058d3e70d2b3129cbd86
generated:
  by: process:review-package.sh
  at: 2026-10-04T06:08:31Z
sdd_id: 008-learner-leads
---

# Review package — C008_T016 · 008-learner-leads

base: `92befb7d5e55be3086de107e406342104a96c577` → head: `ca10dcaefff44de05dd5058d3e70d2b3129cbd86`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/traversal-sheet-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  07:08:31
   Duration  2.11s (tests 61%, transform 17%, environment 13%, import 9%)

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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
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
- A	src/ui/Switch.tsx
- M	src/ui/TraversalSheet.tsx
- M	src/ui/overlay.tsx
- M	src/ui/theme.ts
- A	tests/ui/scenarios/traversal-sheet-lead.test.tsx
- M	tests/ui/scenarios/traversal-sheet.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index c8ff2cf..665d5ca 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -1051,6 +1051,7 @@ export function App(props: {
             effectiveOctaves={snapshot.effectiveOctaves}
             fittingCounts={snapshot.fittingCounts}
             settings={snapshot.settings}
+            tempoBpm={snapshot.settings.tempoBpm}
             onTraversal={handleTraversal}
             onSettings={handleSessionSettings}
             onClose={handleCloseTraversalSheet}
diff --git a/src/ui/Switch.tsx b/src/ui/Switch.tsx
new file mode 100644
index 0000000..6a732ce
--- /dev/null
+++ b/src/ui/Switch.tsx
@@ -0,0 +1,47 @@
+import type { JSX } from "react";
+import { paper, sheetRow } from "./theme";
+
+// A 36×20 on/off switch for the Traversal sheet's Count-in, Rest bar and
+// Loop rows (practice.session/REQ-020) — track `paper.accent` on /
+// `paper.trackOff` off, a 14 px `paper.card` knob at left 3 (off) or 19
+// (on). Never opens or closes itself (Article VI) — `on` is the caller's.
+export function Switch(props: {
+  readonly on: boolean;
+  readonly onToggle: () => void;
+  readonly label: string;
+}): JSX.Element {
+  const { on, onToggle, label } = props;
+
+  return (
+    <button
+      type="button"
+      role="switch"
+      aria-checked={on}
+      aria-label={label}
+      onClick={onToggle}
+      style={{
+        position: "relative",
+        width: sheetRow.switchWidth,
+        height: sheetRow.switchHeight,
+        borderRadius: sheetRow.switchHeight / 2,
+        border: "none",
+        padding: 0,
+        cursor: "pointer",
+        background: on ? paper.accent : paper.trackOff,
+      }}
+    >
+      <span
+        style={{
+          position: "absolute",
+          top: sheetRow.knobInset,
+          left: on ? sheetRow.knobOnLeft : sheetRow.knobInset,
+          width: sheetRow.knob,
+          height: sheetRow.knob,
+          borderRadius: sheetRow.knob / 2,
+          background: paper.card,
+          transition: "left .15s ease",
+        }}
+      />
+    </button>
+  );
+}
diff --git a/src/ui/TraversalSheet.tsx b/src/ui/TraversalSheet.tsx
index 7a581b6..025b8c8 100644
--- a/src/ui/TraversalSheet.tsx
+++ b/src/ui/TraversalSheet.tsx
@@ -6,26 +6,37 @@ import type {
   Shape,
   Traversal,
 } from "../theory/published";
-import type { SessionSettings, SoundMode } from "../practice/published";
-import { fonts, paper } from "./theme";
-import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";
+import type {
+  HoldBeats,
+  LeadSettings,
+  SessionSettings,
+  SoundMode,
+  Tolerance,
+} from "../practice/published";
+import {
+  cuesHintOf,
+  holdHintOf,
+  toleranceHintOf,
+  whoHintOf,
+} from "../practice/published";
+import { fonts, paper, sheetRow } from "./theme";
+import { BottomSheet, OverlayCloseButton, OverlayScrim } from "./overlay";
+import { Switch } from "./Switch";
 
 // Geometry and colour below are copied verbatim from the vendored visual
 // reference (changes/003-hear-the-scale/design/hear-the-scale.dc.html,
 // markup lines 145-193, pill/toggle paints script lines 573-584, pill lists
-// script lines 692-715) — named here rather than re-derived by eye.
+// script lines 692-715) and from the Traversal sheet's rebuild
+// (changes/008-learner-leads/design/handoff.md, "Traversal sheet (09, 10)")
+// — named here rather than re-derived by eye.
 const SCRIM_Z_INDEX = 9;
 const SHEET_Z_INDEX = 10;
 const SHEET_PADDING_BOTTOM = 16;
 
-const HEADER_PADDING = "16px 18px 12px";
-
-const ROW_PADDING = "14px 18px";
-const ROW_LABEL_FONT_SIZE = 13;
 const ROW_LABEL_FONT_WEIGHT = 600;
 
 const PILL_ACTIVE_INK = "#4a4136";
-const PILL_INACTIVE_INK = "#756c60";
+const PILL_INACTIVE_INK = paper.pillInk;
 // changes/005-scale-selection/design/hear-the-scale.dc.html, `kindPills`
 // (script lines 819-822) — the arpeggio pill when the chosen scale does not
 // offer one: transparent background, no-op pick, this ink.
@@ -33,16 +44,16 @@ const PILL_DISABLED_INK = "#c3baab";
 
 const DIRECTION_PILL_GEOMETRY: CSSProperties = {
   minWidth: 46,
-  padding: "9px 10px 10px",
-  borderRadius: 10,
+  padding: sheetRow.pillPadding,
+  borderRadius: sheetRow.pillRadius,
   fontSize: 14,
   fontWeight: 600,
 };
 
 const OCTAVE_PILL_GEOMETRY: CSSProperties = {
   minWidth: 46,
-  padding: "9px 10px 10px",
-  borderRadius: 10,
+  padding: sheetRow.pillPadding,
+  borderRadius: sheetRow.pillRadius,
   fontFamily: fonts.mono,
   fontSize: 12,
   fontWeight: 600,
@@ -52,34 +63,52 @@ const OCTAVE_PILL_GEOMETRY: CSSProperties = {
 const SHAPE_PILL_GEOMETRY: CSSProperties = {
   minWidth: 46,
   padding: "9px 12px 10px",
-  borderRadius: 10,
-  fontSize: 12.5,
+  borderRadius: sheetRow.pillRadius,
+  fontSize: sheetRow.pillSize,
   fontWeight: 600,
   whiteSpace: "nowrap",
 };
 
 const SOUND_PILL_GEOMETRY: CSSProperties = {
   padding: "9px 11px 10px",
-  borderRadius: 10,
-  fontSize: 12.5,
+  borderRadius: sheetRow.pillRadius,
+  fontSize: sheetRow.pillSize,
   fontWeight: 600,
   whiteSpace: "nowrap",
 };
 
-const TOGGLE_ROW_PADDING = "14px 18px 4px";
-const TOGGLE_GAP = 6;
-const TOGGLE_GEOMETRY: CSSProperties = {
-  padding: "8px 12px 9px",
-  borderRadius: 999,
+const WHO_PILL_GEOMETRY: CSSProperties = {
+  padding: "9px 11px 10px",
+  borderRadius: sheetRow.pillRadius,
+  fontSize: sheetRow.pillSize,
+  fontWeight: 600,
+  whiteSpace: "nowrap",
+};
+
+const HOLD_PILL_GEOMETRY: CSSProperties = {
+  minWidth: 26,
+  padding: sheetRow.pillPadding,
+  borderRadius: sheetRow.pillRadius,
   fontFamily: fonts.mono,
-  fontSize: 11,
+  fontSize: 12,
   fontWeight: 600,
-  lineHeight: 1.2,
 };
-const TOGGLE_ON_INK = paper.accent;
-const TOGGLE_ON_BACKGROUND = "rgba(138,75,42,.10)";
-const TOGGLE_ON_BORDER = "rgba(138,75,42,.35)";
-const TOGGLE_OFF_INK = "#8a8175";
+
+const TOLERANCE_PILL_GEOMETRY: CSSProperties = {
+  padding: "9px 11px 10px",
+  borderRadius: sheetRow.pillRadius,
+  fontSize: sheetRow.pillSize,
+  fontWeight: 600,
+  whiteSpace: "nowrap",
+};
+
+const CUE_PILL_GEOMETRY: CSSProperties = {
+  padding: "9px 11px 10px",
+  borderRadius: sheetRow.pillRadius,
+  fontSize: sheetRow.pillSize,
+  fontWeight: 600,
+  whiteSpace: "nowrap",
+};
 
 const DIRECTIONS: readonly {
   readonly value: Direction;
@@ -104,6 +133,17 @@ const SOUND_MODES: readonly {
   { value: "metronome", label: "metronome" },
 ];
 
+const HOLD_BEATS: readonly HoldBeats[] = [1, 2, 4];
+
+const TOLERANCES: readonly {
+  readonly value: Tolerance;
+  readonly label: string;
+}[] = [
+  { value: "lenient", label: "lenient" },
+  { value: "medium", label: "medium" },
+  { value: "accurate", label: "accurate" },
+];
+
 function octavesEqual(a: Octaves, b: Octaves): boolean {
   if (a.kind === "full" || b.kind === "full") return a.kind === b.kind;
   return a.count === b.count;
@@ -121,31 +161,61 @@ function octaveOptionsOf(
   ];
 }
 
+// Every row — fixed height (62 px), the label and its two-line hint box on
+// the left, the control on the right, and (who-leads only) a trailing slot
+// for the sheet's ✕ — practice.session/REQ-020.
 function Row(props: {
+  readonly dataRow: string;
   readonly label: string;
-  readonly children: ReactNode;
+  readonly hint: string;
+  readonly control: ReactNode;
+  readonly trailing?: ReactNode;
 }): JSX.Element {
-  const { label, children } = props;
+  const { dataRow, label, hint, control, trailing } = props;
   return (
     <div
+      data-testid="sheet-row"
+      data-row={dataRow}
       style={{
+        boxSizing: "border-box",
+        height: sheetRow.height,
         display: "flex",
         alignItems: "center",
         justifyContent: "space-between",
         gap: 12,
-        padding: ROW_PADDING,
+        padding: `0 ${sheetRow.paddingX}px`,
         borderBottom: `1px solid ${paper.hairlineSoft}`,
       }}
     >
-      <div
-        style={{
-          fontSize: ROW_LABEL_FONT_SIZE,
-          fontWeight: ROW_LABEL_FONT_WEIGHT,
-        }}
-      >
-        {label}
+      <div style={{ flex: 1, minWidth: 0 }}>
+        <div
+          style={{
+            fontSize: sheetRow.labelSize,
+            fontWeight: ROW_LABEL_FONT_WEIGHT,
+          }}
+        >
+          {label}
+        </div>
+        <div
+          data-testid="row-hint"
+          style={{
+            fontSize: sheetRow.hintSize,
+            lineHeight: `${sheetRow.hintLineHeight}px`,
+            height: sheetRow.hintBoxHeight,
+            color: paper.muted,
+            overflow: "hidden",
+            display: "-webkit-box",
+            WebkitLineClamp: 2,
+            WebkitBoxOrient: "vertical",
+          }}
+        >
+          {hint}
+        </div>
+      </div>
+      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
+        {control}
+        {trailing}
       </div>
-      <div style={{ display: "flex", gap: 4 }}>{children}</div>
     </div>
   );
 }
@@ -183,30 +253,6 @@ function Pill(props: {
   );
 }
 
-function TogglePill(props: {
-  readonly label: string;
-  readonly on: boolean;
-  readonly onClick: () => void;
-}): JSX.Element {
-  const { label, on, onClick } = props;
-  return (
-    <button
-      type="button"
-      aria-pressed={on}
-      onClick={onClick}
-      style={{
-        ...TOGGLE_GEOMETRY,
-        border: `1px solid ${on ? TOGGLE_ON_BORDER : paper.borderSoft}`,
-        color: on ? TOGGLE_ON_INK : TOGGLE_OFF_INK,
-        background: on ? TOGGLE_ON_BACKGROUND : "transparent",
-        cursor: "pointer",
-      }}
-    >
-      {label}
-    </button>
-  );
-}
-
 // Never opens itself (Article VI) — `open` is driven entirely by the
 // caller's state; this component only ever asks to close, via `onClose`.
 // Wrapped in `React.memo` (T032) — `traversal`/`settings`/`effectiveOctaves`/
@@ -221,6 +267,7 @@ function TraversalSheetComponent(props: {
   readonly effectiveOctaves: Octaves;
   readonly fittingCounts: readonly OctaveCount[];
   readonly settings: SessionSettings;
+  readonly tempoBpm: number;
   readonly onTraversal: (t: Traversal) => void;
   readonly onSettings: (s: SessionSettings) => void;
   readonly onClose: () => void;
@@ -233,12 +280,18 @@ function TraversalSheetComponent(props: {
     effectiveOctaves,
     fittingCounts,
     settings,
+    tempoBpm,
     onTraversal,
     onSettings,
     onClose,
   } = props;
 
   const octaveOptions = octaveOptionsOf(fittingCounts);
+  const lead = settings.lead;
+
+  function setLead(next: Partial<LeadSettings>): void {
+    onSettings({ ...settings, lead: { ...lead, ...next } });
+  }
 
   return (
     <>
@@ -248,14 +301,147 @@ function TraversalSheetComponent(props: {
         zIndex={SHEET_Z_INDEX}
         paddingBottom={SHEET_PADDING_BOTTOM}
       >
-        <OverlayHeader
-          title="Traversal"
-          padding={HEADER_PADDING}
-          closeAriaLabel="Close traversal sheet"
-          onClose={onClose}
+        <Row
+          dataRow="who-leads"
+          label="Who leads"
+          hint={whoHintOf(lead.who)}
+          control={
+            <>
+              <Pill
+                label="play along"
+                active={lead.who === "tool"}
+                geometry={WHO_PILL_GEOMETRY}
+                onClick={() => setLead({ who: "tool" })}
+              />
+              <Pill
+                label="I lead"
+                active={lead.who === "me"}
+                geometry={WHO_PILL_GEOMETRY}
+                onClick={() => setLead({ who: "me" })}
+              />
+            </>
+          }
+          trailing={
+            <OverlayCloseButton
+              ariaLabel="Close traversal sheet"
+              onClose={onClose}
+              testId="sheet-close"
+            />
+          }
         />
-        <Row label="Direction">
-          {DIRECTIONS.map((option) => (
+        {lead.who === "tool" ? (
+          <>
+            <Row
+              dataRow="sound"
+              label="Sound"
+              hint="What it plays for you"
+              control={SOUND_MODES.map((option) => (
+                <Pill
+                  key={option.value}
+                  label={option.label}
+                  active={settings.soundMode === option.value}
+                  geometry={SOUND_PILL_GEOMETRY}
+                  onClick={() =>
+                    onSettings({ ...settings, soundMode: option.value })
+                  }
+                />
+              ))}
+            />
+            <Row
+              dataRow="count-in"
+              label="Count-in"
+              hint="A bar of clicks before it starts"
+              control={
+                <Switch
+                  label="Count-in"
+                  on={settings.countIn}
+                  onToggle={() =>
+                    onSettings({ ...settings, countIn: !settings.countIn })
+                  }
+                />
+              }
+            />
+            <Row
+              dataRow="rest-bar"
+              label="Rest bar"
+              hint="A bar's rest before each loop"
+              control={
+                <Switch
+                  label="Rest bar"
+                  on={settings.restBar}
+                  onToggle={() =>
+                    onSettings({ ...settings, restBar: !settings.restBar })
+                  }
+                />
+              }
+            />
+          </>
+        ) : (
+          <>
+            <Row
+              dataRow="hold"
+              label="Hold"
+              hint={holdHintOf(lead.holdBeats, tempoBpm)}
+              control={HOLD_BEATS.map((beats) => (
+                <Pill
+                  key={beats}
+                  label={String(beats)}
+                  active={lead.holdBeats === beats}
+                  geometry={HOLD_PILL_GEOMETRY}
+                  onClick={() => setLead({ holdBeats: beats })}
+                />
+              ))}
+            />
+            <Row
+              dataRow="in-tune"
+              label="In tune"
+              hint={toleranceHintOf(lead.tolerance)}
+              control={TOLERANCES.map((option) => (
+                <Pill
+                  key={option.value}
+                  label={option.label}
+                  active={lead.tolerance === option.value}
+                  geometry={TOLERANCE_PILL_GEOMETRY}
+                  onClick={() => setLead({ tolerance: option.value })}
+                />
+              ))}
+            />
+            <Row
+              dataRow="cues"
+              label="Cues"
+              hint={cuesHintOf(lead.cueMeter, lead.cueTone)}
+              control={
+                <>
+                  <Pill
+                    label="meter"
+                    active={lead.cueMeter}
+                    geometry={CUE_PILL_GEOMETRY}
+                    onClick={() => setLead({ cueMeter: !lead.cueMeter })}
+                  />
+                  <Pill
+                    label="tone"
+                    active={lead.cueTone}
+                    geometry={CUE_PILL_GEOMETRY}
+                    onClick={() => setLead({ cueTone: !lead.cueTone })}
+                  />
+                </>
+              }
+            />
+          </>
+        )}
+        <div
+          data-testid="sheet-hairline"
+          style={{
+            height: 1,
+            marginTop: -1,
+            background: sheetRow.hairline,
+          }}
+        />
+        <Row
+          dataRow="direction"
+          label="Direction"
+          hint="Up, down, or up and back"
+          control={DIRECTIONS.map((option) => (
             <Pill
               key={option.value}
               label={option.label}
@@ -266,9 +452,12 @@ function TraversalSheetComponent(props: {
               }
             />
           ))}
-        </Row>
-        <Row label="Octaves">
-          {octaveOptions.map((option) => (
+        />
+        <Row
+          dataRow="octaves"
+          label="Octaves"
+          hint="How far the run goes"
+          control={octaveOptions.map((option) => (
             <Pill
               key={option.label}
               label={option.label}
@@ -279,9 +468,12 @@ function TraversalSheetComponent(props: {
               }
             />
           ))}
-        </Row>
-        <Row label="Shape">
-          {SHAPES.map((option) => {
+        />
+        <Row
+          dataRow="shape"
+          label="Shape"
+          hint="Every note, or 1 3 5"
+          control={SHAPES.map((option) => {
             const disabled = option.value === "arpeggio" && !arpeggioOffered;
             return (
               <Pill
@@ -296,49 +488,19 @@ function TraversalSheetComponent(props: {
               />
             );
           })}
-        </Row>
-        <Row label="Sound">
-          {SOUND_MODES.map((option) => (
-            <Pill
-              key={option.value}
-              label={option.label}
-              active={settings.soundMode === option.value}
-              geometry={SOUND_PILL_GEOMETRY}
-              onClick={() =>
-                onSettings({ ...settings, soundMode: option.value })
-              }
+        />
+        <Row
+          dataRow="loop"
+          label="Loop"
+          hint="Start again at the end"
+          control={
+            <Switch
+              label="Loop"
+              on={settings.loop}
+              onToggle={() => onSettings({ ...settings, loop: !settings.loop })}
             />
-          ))}
-        </Row>
-        <div
-          style={{
-            display: "flex",
-            alignItems: "center",
-            gap: TOGGLE_GAP,
-            flexWrap: "wrap",
-            padding: TOGGLE_ROW_PADDING,
-          }}
-        >
-          <TogglePill
-            label="loop"
-            on={settings.loop}
-            onClick={() => onSettings({ ...settings, loop: !settings.loop })}
-          />
-          <TogglePill
-            label="count-in"
-            on={settings.countIn}
-            onClick={() =>
-              onSettings({ ...settings, countIn: !settings.countIn })
-            }
-          />
-          <TogglePill
-            label="rest bar"
-            on={settings.restBar}
-            onClick={() =>
-              onSettings({ ...settings, restBar: !settings.restBar })
-            }
-          />
-        </div>
+          }
+        />
       </BottomSheet>
     </>
   );
diff --git a/src/ui/overlay.tsx b/src/ui/overlay.tsx
index ac92ba4..30597c6 100644
--- a/src/ui/overlay.tsx
+++ b/src/ui/overlay.tsx
@@ -103,16 +103,22 @@ export function OverlayScrim(props: {
   );
 }
 
-function OverlayCloseButton(props: {
+// Exported (beyond OverlayHeader's own use) for the Traversal sheet's
+// Who-leads row, which has no title row to host it (C008_T016,
+// practice.session/REQ-020) — the same 28 px circle, reused rather than
+// duplicated.
+export function OverlayCloseButton(props: {
   readonly ariaLabel: string;
   readonly onClose: () => void;
+  readonly testId?: string;
 }): JSX.Element {
-  const { ariaLabel, onClose } = props;
+  const { ariaLabel, onClose, testId } = props;
 
   return (
     <button
       type="button"
       aria-label={ariaLabel}
+      data-testid={testId}
       onClick={onClose}
       style={{
         width: CLOSE_SIZE,
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index 4e8f3b5..7f21f58 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -14,6 +14,10 @@ export const paper = {
   hairline: "#e6ddcc",
   hairlineSoft: "#ece4d5",
   pillActive: "#e7dcc6",
+  // The Traversal sheet's unselected pill ink — carried over verbatim from
+  // TraversalSheet.tsx's own PILL_INACTIVE_INK (changes/003, the vendored
+  // reference) and promoted to a token here per C008_T016's brief.
+  pillInk: "#756c60",
   accent: "#8a4b2a",
   trackOff: "#c8bfad",
   scrim: "rgba(28,25,22,.32)",
@@ -85,6 +89,27 @@ export const leadCard = {
   noMicLineHeight: 1.45,
 } as const;
 
+// practice.session/REQ-020 — the Traversal sheet's fixed row frame (label,
+// two-line hint box, pills and switches) and the Who-leads row's ✕.
+export const sheetRow = {
+  height: 62,
+  paddingX: 18,
+  labelSize: 13,
+  hintSize: 11,
+  hintLineHeight: 14,
+  hintBoxHeight: 28,
+  pillPadding: "9px 10px 10px",
+  pillRadius: 10,
+  pillSize: 12.5,
+  switchWidth: 36,
+  switchHeight: 20,
+  knob: 14,
+  knobInset: 3,
+  knobOnLeft: 19,
+  closeSize: 28,
+  hairline: paper.borderSoft,
+} as const;
+
 // practice.session/REQ-014 — the mode words beneath the caption, and the
 // Tuner glyph drawn in the start circle while I lead is idle.
 export const modeWords = {
diff --git a/tests/ui/scenarios/traversal-sheet-lead.test.tsx b/tests/ui/scenarios/traversal-sheet-lead.test.tsx
new file mode 100644
index 0000000..da204ec
--- /dev/null
+++ b/tests/ui/scenarios/traversal-sheet-lead.test.tsx
@@ -0,0 +1,197 @@
+import { screen, within } from "@testing-library/react";
+import { afterEach, expect, test } from "vitest";
+import { cleanup } from "@testing-library/react";
+import type { StoredSelection } from "../../../src/ui/selection-store";
+import {
+  renderLeadApp,
+  storedCMajor,
+  STORAGE_KEY,
+  type LeadApp,
+} from "./lead-app-helpers";
+
+function storedSelection(): StoredSelection {
+  return JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection;
+}
+
+afterEach(() => {
+  cleanup();
+  localStorage.clear();
+});
+
+async function openSheet(app: LeadApp): Promise<void> {
+  await app.user.click(screen.getByRole("button", { name: "Edit traversal" }));
+}
+
+function rows(): (string | undefined)[] {
+  return screen.getAllByTestId("sheet-row").map((r) => r.dataset.row);
+}
+
+function row(name: string): HTMLElement {
+  return screen
+    .getAllByTestId("sheet-row")
+    .find((r) => r.dataset.row === name)!;
+}
+
+function hintOf(name: string): string | null {
+  return within(row(name)).getByTestId("row-hint").textContent;
+}
+
+function pill(name: string, label: string): HTMLElement {
+  return within(row(name)).getByText(label);
+}
+
+function pillSelected(name: string, label: string): boolean {
+  return pill(name, label).style.background === "rgb(231, 220, 198)";
+}
+
+test("practice.session/REQ-020/S1 — play along's rows", async () => {
+  const app = renderLeadApp();
+  await openSheet(app);
+  expect(rows()).toEqual([
+    "who-leads",
+    "sound",
+    "count-in",
+    "rest-bar",
+    "direction",
+    "octaves",
+    "shape",
+    "loop",
+  ]);
+  expect(screen.queryByText("Traversal")).toBeNull();
+  expect(
+    screen
+      .getByTestId("sheet-close")
+      .closest("[data-row]")!
+      .getAttribute("data-row"),
+  ).toBe("who-leads");
+  expect(hintOf("who-leads")).toBe("It plays, you follow");
+  expect(
+    screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px"),
+  ).toBe(true);
+  expect(
+    screen
+      .getByTestId("sheet-hairline")
+      .previousElementSibling!.getAttribute("data-row"),
+  ).toBe("rest-bar");
+});
+
+test("practice.session/REQ-020/S2 — I lead's rows", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      { who: "me" },
+      { session: { ...storedCMajor().session, tempoBpm: 120 } },
+    ),
+  );
+  await openSheet(app);
+  expect(rows()).toEqual([
+    "who-leads",
+    "hold",
+    "in-tune",
+    "cues",
+    "direction",
+    "octaves",
+    "shape",
+    "loop",
+  ]);
+  expect(
+    [
+      "who-leads",
+      "hold",
+      "in-tune",
+      "cues",
+      "direction",
+      "octaves",
+      "shape",
+      "loop",
+    ].map(hintOf),
+  ).toEqual([
+    "It listens, you play",
+    "Beats in tune, then the next · 1.0 s",
+    "Within 10% of the way to the next note",
+    "Shows sharp or flat on the note",
+    "Up, down, or up and back",
+    "How far the run goes",
+    "Every note, or 1 3 5",
+    "Start again at the end",
+  ]);
+  expect(pillSelected("hold", "2")).toBe(true);
+  expect(pillSelected("in-tune", "medium")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(true);
+  expect(pillSelected("cues", "tone")).toBe(false);
+});
+
+test("practice.session/REQ-020/S3 — nothing moves under the finger", async () => {
+  const app = renderLeadApp();
+  await openSheet(app);
+  const before = rows();
+  const closeBefore = screen.getByTestId("sheet-close");
+  await app.user.click(pill("who-leads", "I lead"));
+  const after = rows();
+  expect(after.slice(0, 1)).toEqual(before.slice(0, 1));
+  expect(after.slice(4)).toEqual(before.slice(4));
+  expect(after.length).toBe(before.length);
+  expect(after.slice(1, 4)).toEqual(["hold", "in-tune", "cues"]);
+  expect(screen.getByTestId("sheet-close")).toBe(closeBefore); // the same element, not re-mounted
+  expect(
+    screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px"),
+  ).toBe(true);
+  await app.user.click(pill("who-leads", "play along"));
+  expect(rows()).toEqual(before);
+});
+
+test("practice.session/REQ-020/S4 — the hints follow the settings", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await openSheet(app);
+  await app.user.click(pill("hold", "1"));
+  expect(hintOf("hold")).toBe("Beats in tune, then the next · 0.6 s");
+  await app.user.click(pill("hold", "2"));
+  expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.3 s");
+  await app.user.click(pill("hold", "4"));
+  expect(hintOf("hold")).toBe("Beats in tune, then the next · 2.5 s");
+  await app.user.click(pill("in-tune", "lenient"));
+  expect(hintOf("in-tune")).toBe("Within 15% of the way to the next note");
+  await app.user.click(pill("in-tune", "accurate"));
+  expect(hintOf("in-tune")).toBe("Within 5% of the way to the next note");
+  await app.user.click(pill("hold", "2"));
+  await app.user.click(screen.getByTestId("sheet-close"));
+  const tempoUp = within(screen.getByTestId("transport-card")).getByText("+"); // 96 → 120
+  for (let i = 0; i < 12; i += 1) await app.user.click(tempoUp);
+  await openSheet(app);
+  expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.0 s");
+});
+
+test("practice.session/REQ-018/S5 (sheet) — the Cues hint follows the pills", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await openSheet(app);
+  await app.user.click(pill("cues", "tone"));
+  expect(hintOf("cues")).toBe("Sharp/flat on the note · a tone per note");
+  await app.user.click(pill("cues", "meter"));
+  expect(hintOf("cues")).toBe("A short tone as each note comes up");
+  await app.user.click(pill("cues", "tone"));
+  expect(hintOf("cues")).toBe("Just the note highlight");
+});
+
+test("practice.session/REQ-020/S5 — the shared rows still do what they did", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await openSheet(app);
+  expect(
+    within(row("octaves"))
+      .getAllByRole("button")
+      .map((b) => b.textContent),
+  ).toEqual(["1 oct", "2 oct", "3 oct", "full"]);
+  await app.user.click(pill("octaves", "2 oct"));
+  expect(screen.getByText("↑↓ · 2 oct · scale · loop")).toBeTruthy();
+});
+
+test("practice.session/REQ-020 — the switches", async () => {
+  const app = renderLeadApp();
+  await openSheet(app);
+  const countIn = within(row("count-in")).getByRole("switch");
+  expect(countIn.getAttribute("aria-checked")).toBe("true");
+  await app.user.click(countIn);
+  expect(countIn.getAttribute("aria-checked")).toBe("false");
+  expect(storedSelection().session.countIn).toBe(false);
+  const loop = within(row("loop")).getByRole("switch");
+  await app.user.click(loop);
+  expect(storedSelection().session.loop).toBe(false);
+});
diff --git a/tests/ui/scenarios/traversal-sheet.test.tsx b/tests/ui/scenarios/traversal-sheet.test.tsx
index 41cb30b..4b837d0 100644
--- a/tests/ui/scenarios/traversal-sheet.test.tsx
+++ b/tests/ui/scenarios/traversal-sheet.test.tsx
@@ -43,6 +43,7 @@ test("practice.session/REQ-001/S1 (UI) — Octaves offers a pill for each fittin
       effectiveOctaves={{ kind: "count", count: 2 }}
       fittingCounts={[1, 2, 3]}
       settings={baseSettings()}
+      tempoBpm={96}
       onTraversal={noop}
       onSettings={noop}
       onClose={noop}
@@ -67,6 +68,7 @@ test("practice.session/REQ-001/S1 (UI) — Octaves offers a pill for each fittin
       effectiveOctaves={{ kind: "full" }}
       fittingCounts={[]}
       settings={baseSettings()}
+      tempoBpm={96}
       onTraversal={noop}
       onSettings={noop}
       onClose={noop}
@@ -91,6 +93,7 @@ test("practice.session/REQ-001/S1 (UI) — picking full, ↓ and arpeggio calls
       effectiveOctaves={effectiveOctaves}
       fittingCounts={[1, 2, 3]}
       settings={baseSettings()}
+      tempoBpm={96}
       onTraversal={onTraversal}
       onSettings={noop}
       onClose={noop}
@@ -128,18 +131,19 @@ test("practice.session/REQ-003 (UI) — the settings pills and toggles call onSe
       effectiveOctaves={defaultTraversal.octaves}
       fittingCounts={[1]}
       settings={settings}
+      tempoBpm={96}
       onTraversal={noop}
       onSettings={onSettings}
       onClose={noop}
     />,
   );
 
-  const countInButton = screen.getByRole("button", { name: "count-in" });
-  expect(countInButton.getAttribute("aria-pressed")).toBe("true");
+  const countInSwitch = screen.getByRole("switch", { name: "Count-in" });
+  expect(countInSwitch.getAttribute("aria-checked")).toBe("true");
 
   await userEvent.click(screen.getByRole("button", { name: "metronome" }));
-  await userEvent.click(screen.getByRole("button", { name: "rest bar" }));
-  await userEvent.click(countInButton);
+  await userEvent.click(screen.getByRole("switch", { name: "Rest bar" }));
+  await userEvent.click(countInSwitch);
 
   expect(onSettings).toHaveBeenNthCalledWith(1, {
     ...settings,
@@ -182,6 +186,7 @@ test("practice.session/REQ-001/S5 — arpeggio unavailable in the Traversal shee
       effectiveOctaves={{ kind: "count", count: 1 }}
       fittingCounts={[1, 2]}
       settings={baseSettings()}
+      tempoBpm={96}
       onTraversal={onTraversal}
       onSettings={noop}
       onClose={noop}
@@ -206,6 +211,7 @@ test("practice.session/REQ-012/S3 (UI) — an offered arpeggio is pressable agai
       effectiveOctaves={{ kind: "count", count: 1 }}
       fittingCounts={[1, 2]}
       settings={baseSettings()}
+      tempoBpm={96}
       onTraversal={onTraversal}
       onSettings={noop}
       onClose={noop}
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T016.md b/changes/008-learner-leads/tasks/C008_T016.md
index 7d572be..ab01ab5 100644
--- a/changes/008-learner-leads/tasks/C008_T016.md
+++ b/changes/008-learner-leads/tasks/C008_T016.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T016
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-020, practice.session/REQ-018]
 sdd_depends_on: [C008_T001]
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T016 · The Traversal sheet rebuilt: fixed rows with hints, Who leads with ✕, the three mode rows, the hairline, switches
```

## Verdict

_The task reviewer appends its verdict here._
SPEC: PASS
QUALITY: PASS

Findings:
- [minor] src/ui/TraversalSheet.tsx:72,80,97,105 — `SOUND_PILL_GEOMETRY`, `WHO_PILL_GEOMETRY`, `TOLERANCE_PILL_GEOMETRY` and `CUE_PILL_GEOMETRY` are four byte-for-byte identical `CSSProperties` objects (`padding: "9px 11px 10px"`, `borderRadius: sheetRow.pillRadius`, `fontSize: sheetRow.pillSize`, `fontWeight: 600`, `whiteSpace: "nowrap"`); a single shared constant would remove the duplication. Not blocking — none of these values diverge from what the brief implies, and the names aid readability per row.
- [minor] src/ui/theme.ts:72 — `sheetRow.closeSize` (28) is part of the exact `Produces` signature and is set correctly, but nothing in the diff reads it; the ✕ button still sizes itself from `overlay.tsx`'s own `CLOSE_SIZE = 28` (same value, pre-existing, unchanged). Values agree; just note for a future task that wires the two together.

Verified:
- `screen.getByText("+")` deviation: confirmed `src/ui/DronePill.tsx:167` renders a second, unrelated "+" (drone octave-up); `src/ui/TransportCard.tsx:384` is the tempo stepper's "+", inside `data-testid="transport-card"` (TransportCard.tsx:544). The `within(screen.getByTestId("transport-card"))` scoping is correct, minimal, and documented in the report and test comment.
- `paper.pillInk` (#756c60) is a true promotion of the pre-existing local `PILL_INACTIVE_INK` value (verified unchanged value, diff swaps the literal for the token). All other named tokens — `trackOff`, `hairlineSoft`, `borderSoft`, `pillActive`, `inkMid`, `border` — already existed in theme.ts at the brief's values; `paper.inkMid` (#4a4136) matches the pre-existing, untouched `PILL_ACTIVE_INK` local constant by value (not literally re-pointed to the token, but that line is outside this diff's hunk and not part of this task's required change).
- `OverlayCloseButton` export: a real, minimal ripple into `overlay.tsx` (added `testId?` prop, kept default behaviour for existing callers InstrumentSheet/DroneSheet/ScaleSheet/TempoSheet/SettingsDrawer/TargetSheet, confirmed `OverlayHeader` and its internal close button usage are untouched and still work).
- `./scripts/check-contexts.sh` → "✅ context boundaries respected" (re-run to confirm; package's own check output doesn't call it out separately).
- `scripts/check-design.sh` flags 3 pre-existing hard-coded values in `src/ui/global.css`, untouched by this diff (confirmed file not in the changed-files list) — not introduced here.
- Row ids/order for both modes, the hairline's position (previousElementSibling → "rest-bar"), 62px row heights, the switches' role/aria-checked/aria-label, Produces' `sheetRow` object and `Switch` signature all match the brief's `Produces` block character-for-character against the diff.
- `traversal-sheet.test.tsx` diff: every pre-existing behavioural assertion (onTraversal/onSettings call arguments, pill availability, summary line) is unchanged; only the toggle-pill→switch form and the added `tempoBpm` prop changed, as the brief specified.
- `tests/ui/scenarios/lead-app-helpers.tsx` (pre-existing from an earlier task) already supports `storedCMajor(lead, rest)`, `renderLeadApp`, `STORAGE_KEY` exactly as the brief's RED step calls them — no modification needed or made here.

UNVERIFIED:
- practice.session/REQ-020/S3's full "position of every row, pill, switch and the ✕" claim — the diff's own test checks row order/count/height and the close button's identity, but does not pixel-measure static positions (left/top) of the shared rows and ✕ across the toggle. The brief's Verify step defers the structural/visual confirmation to `design_snapshot.py … live`, run by the controller, not in this package.
- REQ-018/S1–S4 (the meter/tone behaviour itself) — out of this task's scope (covered by other tasks); only S5's hint-text scenario is exercised here, as the brief directs.

<!-- recorded 2026-10-04T06:12:19Z by scripts/record.sh -->
