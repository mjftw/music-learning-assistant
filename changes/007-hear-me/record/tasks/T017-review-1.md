---
type: Task Review
title: Review package — T017 · 007-hear-me
description: The diff produced for T017, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T017.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T017.md
  - resource: git:4e948659bc58f06ea0872d6919785d000f3e56cb..c0c77629040600ca81cc7ddb5cd9d63490897f29
generated:
  by: process:review-package.sh
  at: 2026-09-28T12:28:41Z
sdd_id: 007-hear-me
---

# Review package — T017 · 007-hear-me

base: `4e948659bc58f06ea0872d6919785d000f3e56cb` → head: `c0c77629040600ca81cc7ddb5cd9d63490897f29`

## Files changed

- M	src/ui/App.tsx
- A	src/ui/PitchSpiral.tsx
- A	src/ui/TargetPill.tsx
- A	src/ui/TargetSheet.tsx
- M	src/ui/TunerLevel.tsx
- M	src/ui/TunerScreen.tsx
- A	tests/ui/scenarios/target-sheet.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 20f0b96..cdccf96 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -512,6 +512,22 @@ export function App(props: {
     session?.leaveTuner();
     setScreen("practice");
   }, [session]);
+  // practice.tuner/REQ-004 — the four target verbs, wired straight to the
+  // session (TunerScreen composes its own sheet-closing on top of these —
+  // opening/closing the Target sheet never reaches here, REQ-004/S6).
+  const handleHoldTarget = useCallback(() => session?.holdTarget(), [session]);
+  const handlePinTarget = useCallback(
+    (position: number) => session?.pinTarget(position),
+    [session],
+  );
+  const handleStepTarget = useCallback(
+    (delta: -1 | 1) => session?.stepTarget(delta),
+    [session],
+  );
+  const handleClearTarget = useCallback(
+    () => session?.clearTarget(),
+    [session],
+  );
 
   const handleSelectKey = useCallback((selectedWedgeKey: Key) => {
     setSelection((current) => {
@@ -632,11 +648,16 @@ export function App(props: {
         fontFamily: fonts.body,
       }}
     >
-      {screen === "tuner" && snapshot !== null ? (
+      {screen === "tuner" && snapshot !== null && variant !== undefined ? (
         <TunerScreen
           tuner={snapshot.tuner}
           spelling={selection.spelling}
+          range={variant.range}
           onLeave={handleLeaveTuner}
+          onHold={handleHoldTarget}
+          onPin={handlePinTarget}
+          onStep={handleStepTarget}
+          onClear={handleClearTarget}
         />
       ) : (
         <>
diff --git a/src/ui/PitchSpiral.tsx b/src/ui/PitchSpiral.tsx
new file mode 100644
index 0000000..418a347
--- /dev/null
+++ b/src/ui/PitchSpiral.tsx
@@ -0,0 +1,366 @@
+import type { JSX } from "react";
+import type { NoteJudged, TunerTarget, Verdict } from "../practice/published";
+import {
+  noteAtPosition,
+  noteLabel,
+  pitchClassLabel,
+  pitchHzOf,
+  pitchPosition,
+  type SpellingPreference,
+} from "../theory/published";
+import { fonts, paper, tuner } from "./theme";
+
+// Geometry below is copied verbatim from the vendored visual reference
+// (changes/007-hear-me/design/Tuner.dc.html, frame #5c, markup lines 85-113,
+// and the spiral's own arithmetic at script lines 1382-1429) — named here
+// rather than re-derived by eye or copied as markup. The octave-separator
+// spiral the script also computes (`spSep`, lines 1420-1424) is never drawn
+// by the reference's own markup (dead in the source — nothing in 86-96
+// renders it) and so is not reproduced here; the design is a spec, never a
+// source.
+const VIEWBOX_WIDTH = 358;
+const VIEWBOX_HEIGHT = 368;
+const SPIRAL_CENTER = { x: 179, y: 184 };
+const HUB_RADIUS = 36;
+const BAND_OUTER_RADIUS = 176;
+const HUB_STROKE_WIDTH = 1;
+
+const WEDGE_STROKE = paper.card;
+const WEDGE_STROKE_WIDTH = 1.8;
+const WEDGE_DIMMED_OPACITY = 0.4;
+const WEDGE_LABEL_LETTER_SPACING = "-0.02em";
+
+const NATURAL_LIGHTNESS = 0.855;
+const NATURAL_CHROMA = 0.068;
+const ACCIDENTAL_LIGHTNESS = 0.785;
+const ACCIDENTAL_CHROMA = 0.098;
+const PINNED_LIGHTNESS = 0.4;
+const PINNED_CHROMA = 0.125;
+
+// The circle-of-fifths hue order — the same 30°-per-fifth, 25°-offset
+// formula CircleOfFifths.tsx's own `wedgeHue` uses (docs/design.md §8's
+// token), reproduced here (module-local, per the codebase's own convention
+// for a small one-off formula — see DroneSheet.tsx's switch geometry
+// comment) rather than importing a UI sibling's private helper.
+const FIFTHS: readonly number[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
+const HUE_STEP_DEGREES = 30;
+const HUE_OFFSET_DEGREES = 25;
+const HUE_MODULUS = 360;
+
+const NEEDLE_HALO_WIDTH = 9;
+const NEEDLE_WIDTH = 4.5;
+const NEEDLE_INSET = 2;
+
+const TRAIL_STROKE_WIDTH = 3;
+const TRAIL_OPACITY = 0.5;
+
+const HUB_NAME_FONT_SIZE = 22;
+const HUB_HZ_FONT_SIZE = 9.5;
+const HUB_GAP = 4;
+
+const WEDGE_LABEL_MAX_SIZE = 15;
+const WEDGE_LABEL_SCALE_PINNED = 0.52;
+const WEDGE_LABEL_SCALE_PLAIN = 0.44;
+const WEDGE_LABEL_C_SCALE = 0.88;
+
+const TONE_BY_VERDICT: Record<Verdict, string> = {
+  sharp: tuner.sharp,
+  flat: tuner.flat,
+  "in-tune": tuner.inTune,
+};
+
+function f1(value: number): number {
+  return Number(value.toFixed(1));
+}
+
+function pol(deg: number, radius: number): readonly [number, number] {
+  const angle = ((deg - 90) * Math.PI) / 180;
+  return [
+    SPIRAL_CENTER.x + radius * Math.cos(angle),
+    SPIRAL_CENTER.y + radius * Math.sin(angle),
+  ];
+}
+
+function hueOf(pitchClass: number): number {
+  return (
+    (FIFTHS.indexOf(pitchClass) * HUE_STEP_DEGREES + HUE_OFFSET_DEGREES) %
+    HUE_MODULUS
+  );
+}
+
+function oklch(lightness: number, chroma: number, hue: number): string {
+  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
+}
+
+// The reading's fractional pitch position (whole semitones plus a cents
+// remainder) — the vendored reference's own `r.m + c/100`, shared by the
+// needle and the trail (both track the raw heard pitch, not whatever the
+// target measures it against).
+function fractionalPositionOf(entry: NoteJudged): number {
+  return pitchPosition(entry.heard.nearest) + entry.heard.cents / 100;
+}
+
+function clamp(value: number, low: number, high: number): number {
+  return Math.max(low, Math.min(high, value));
+}
+
+interface Wedge {
+  readonly position: number;
+  readonly d: string;
+  readonly fill: string;
+  readonly fillOpacity: number;
+  readonly dimmed: boolean;
+  readonly pinned: boolean;
+  readonly ariaLabel: string;
+  readonly visibleLabel: string;
+  readonly labelX: number;
+  readonly labelY: number;
+  readonly labelSize: number;
+  readonly labelWeight: number;
+  readonly labelColor: string;
+}
+
+// practice.tuner/REQ-004 — one ring of wedges per octave, E2–C7 ∪ the
+// instrument's range (`lowest`/`highest`, computed by the caller —
+// TargetSheet.tsx's `spiralSpanOf`), winding outward from the hub; wedges
+// outside `rangeLowest`..`rangeHighest` dimmed; a needle and a short trail
+// track the heard pitch; the hub names the target.
+export function PitchSpiral(props: {
+  readonly lowest: number;
+  readonly highest: number;
+  readonly rangeLowest: number;
+  readonly rangeHighest: number;
+  readonly target: TunerTarget;
+  readonly reading: NoteJudged | null;
+  readonly trail: readonly NoteJudged[];
+  readonly spelling: SpellingPreference;
+  readonly onPick: (position: number) => void;
+}): JSX.Element {
+  const {
+    lowest,
+    highest,
+    rangeLowest,
+    rangeHighest,
+    target,
+    reading,
+    trail,
+    spelling,
+    onPick,
+  } = props;
+
+  const span = highest - lowest;
+  const dr = (BAND_OUTER_RADIUS - HUB_RADIUS) / (span / 12 + 1);
+  const r0 = HUB_RADIUS + dr / 2;
+  const rAt = (q: number): number => r0 + ((q - lowest) / 12) * dr;
+
+  const wedges: Wedge[] = [];
+  for (let m = lowest; m <= highest; m += 1) {
+    const pitchClass = ((m % 12) + 12) % 12;
+    const note = noteAtPosition(m, spelling);
+    const pinned = target.kind === "pinned" && target.position === m;
+    const dimmed = m < rangeLowest || m > rangeHighest;
+    const hue = hueOf(pitchClass);
+    const fill = pinned
+      ? oklch(PINNED_LIGHTNESS, PINNED_CHROMA, hue)
+      : note.accidental === "natural"
+        ? oklch(NATURAL_LIGHTNESS, NATURAL_CHROMA, hue)
+        : oklch(ACCIDENTAL_LIGHTNESS, ACCIDENTAL_CHROMA, hue);
+
+    const outer: Array<readonly [number, number]> = [];
+    const inner: Array<readonly [number, number]> = [];
+    for (let k = 0; k <= 6; k += 1) {
+      const f = -0.5 + k / 6;
+      const deg = pitchClass * HUE_STEP_DEGREES + f * HUE_STEP_DEGREES;
+      const radius = rAt(m + f);
+      outer.push(pol(deg, radius + dr / 2));
+      inner.push(pol(deg, radius - dr / 2));
+    }
+    const points = [...outer, ...inner.reverse()];
+    const d = `M ${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} Z`;
+    const [labelX, labelY] = pol(pitchClass * HUE_STEP_DEGREES, rAt(m));
+
+    wedges.push({
+      position: m,
+      d,
+      fill,
+      fillOpacity: dimmed ? WEDGE_DIMMED_OPACITY : 1,
+      dimmed,
+      pinned,
+      ariaLabel: noteLabel(note),
+      visibleLabel:
+        note.letter === "C" ? noteLabel(note) : pitchClassLabel(note),
+      labelX: f1(labelX),
+      labelY: f1(labelY),
+      labelSize: f1(
+        Math.min(
+          WEDGE_LABEL_MAX_SIZE,
+          dr * (pinned ? WEDGE_LABEL_SCALE_PINNED : WEDGE_LABEL_SCALE_PLAIN),
+        ) * (pitchClass === 0 ? WEDGE_LABEL_C_SCALE : 1),
+      ),
+      labelWeight: pinned ? 700 : 600,
+      labelColor: pinned ? paper.card : paper.ink,
+    });
+  }
+
+  const needleQ =
+    reading === null
+      ? null
+      : clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5);
+  const needleTone = reading === null ? null : TONE_BY_VERDICT[reading.verdict];
+  let needleD = "";
+  if (needleQ !== null) {
+    const deg = (((needleQ % 12) + 12) % 12) * HUE_STEP_DEGREES;
+    const radius = rAt(needleQ);
+    const [ax, ay] = pol(deg, radius - dr / 2 + NEEDLE_INSET);
+    const [bx, by] = pol(deg, radius + dr / 2 - NEEDLE_INSET);
+    needleD = `M ${f1(ax)} ${f1(ay)} L ${f1(bx)} ${f1(by)}`;
+  }
+
+  const trailWithin = trail.filter((entry) => {
+    const q = fractionalPositionOf(entry);
+    return q >= lowest - 0.5 && q <= highest + 0.5;
+  });
+  const trailD =
+    trailWithin.length > 1
+      ? `M ${trailWithin
+          .map((entry) => {
+            const q = fractionalPositionOf(entry);
+            const deg = (((q % 12) + 12) % 12) * HUE_STEP_DEGREES;
+            const [x, y] = pol(deg, rAt(q));
+            return `${f1(x)} ${f1(y)}`;
+          })
+          .join(" L ")}`
+      : "";
+
+  const pinnedNote =
+    target.kind === "pinned" ? noteAtPosition(target.position, spelling) : null;
+
+  return (
+    <div
+      style={{
+        position: "relative",
+        width: VIEWBOX_WIDTH,
+        height: VIEWBOX_HEIGHT,
+        margin: "0 auto",
+      }}
+    >
+      <svg
+        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
+        width={VIEWBOX_WIDTH}
+        height={VIEWBOX_HEIGHT}
+        style={{ position: "absolute", top: 0, left: 0 }}
+      >
+        {wedges.map((wedge) => (
+          <path
+            key={wedge.position}
+            role="button"
+            aria-label={wedge.ariaLabel}
+            data-position={wedge.position}
+            data-dimmed={wedge.dimmed ? "true" : "false"}
+            d={wedge.d}
+            fill={wedge.fill}
+            fillOpacity={wedge.fillOpacity}
+            stroke={WEDGE_STROKE}
+            strokeWidth={WEDGE_STROKE_WIDTH}
+            strokeLinejoin="round"
+            onClick={() => onPick(wedge.position)}
+            style={{ cursor: "pointer" }}
+          />
+        ))}
+        <circle
+          cx={SPIRAL_CENTER.x}
+          cy={SPIRAL_CENTER.y}
+          r={HUB_RADIUS - HUB_STROKE_WIDTH / 2}
+          fill={paper.disc}
+          stroke={paper.border}
+          strokeWidth={HUB_STROKE_WIDTH}
+        />
+        {trailD !== "" && needleTone !== null && (
+          <path
+            data-testid="spiral-trail"
+            d={trailD}
+            fill="none"
+            stroke={needleTone}
+            strokeWidth={TRAIL_STROKE_WIDTH}
+            strokeLinecap="round"
+            strokeLinejoin="round"
+            opacity={TRAIL_OPACITY}
+            style={{ pointerEvents: "none" }}
+          />
+        )}
+        {needleQ !== null && needleTone !== null && (
+          <g data-testid="spiral-needle" style={{ pointerEvents: "none" }}>
+            <path
+              d={needleD}
+              stroke={paper.card}
+              strokeWidth={NEEDLE_HALO_WIDTH}
+              strokeLinecap="round"
+            />
+            <path
+              d={needleD}
+              stroke={needleTone}
+              strokeWidth={NEEDLE_WIDTH}
+              strokeLinecap="round"
+            />
+          </g>
+        )}
+      </svg>
+      {wedges.map((wedge) => (
+        <div
+          key={wedge.position}
+          style={{
+            position: "absolute",
+            left: wedge.labelX,
+            top: wedge.labelY,
+            transform: "translate(-50%,-50%)",
+            fontSize: wedge.labelSize,
+            fontWeight: wedge.labelWeight,
+            letterSpacing: WEDGE_LABEL_LETTER_SPACING,
+            color: wedge.labelColor,
+            lineHeight: 1,
+            pointerEvents: "none",
+            whiteSpace: "nowrap",
+          }}
+        >
+          {wedge.visibleLabel}
+        </div>
+      ))}
+      <div
+        data-testid="spiral-hub"
+        style={{
+          position: "absolute",
+          left: SPIRAL_CENTER.x,
+          top: SPIRAL_CENTER.y,
+          transform: "translate(-50%,-50%)",
+          display: "flex",
+          flexDirection: "column",
+          alignItems: "center",
+          gap: HUB_GAP,
+          pointerEvents: "none",
+        }}
+      >
+        <div
+          style={{
+            fontFamily: fonts.display,
+            fontSize: HUB_NAME_FONT_SIZE,
+            lineHeight: 1,
+            color: paper.ink,
+          }}
+        >
+          {pinnedNote === null ? "—" : noteLabel(pinnedNote)}
+        </div>
+        <div
+          style={{
+            fontFamily: fonts.mono,
+            fontSize: HUB_HZ_FONT_SIZE,
+            color: paper.muted,
+          }}
+        >
+          {pinnedNote === null
+            ? "pick a note"
+            : `${pitchHzOf(pinnedNote).toFixed(1)} Hz`}
+        </div>
+      </div>
+    </div>
+  );
+}
diff --git a/src/ui/TargetPill.tsx b/src/ui/TargetPill.tsx
new file mode 100644
index 0000000..d75d6d3
--- /dev/null
+++ b/src/ui/TargetPill.tsx
@@ -0,0 +1,256 @@
+import type { JSX } from "react";
+import type { TunerSnapshot } from "../practice/published";
+import { noteLabel } from "../theory/published";
+import { fonts, paper } from "./theme";
+
+// Geometry and colour below are copied verbatim from the vendored visual
+// reference (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup
+// lines 183-203) — named here rather than re-derived by eye or copied as
+// markup.
+const ROW_HEIGHT = 38;
+const ROW_PADDING = "6px 16px 0";
+
+const AUTO_PILL_GAP = 9;
+const AUTO_PILL_PADDING = "0 15px";
+const AUTO_PILL_BORDER = "#e0d7c5";
+const AUTO_PILL_BACKGROUND = paper.card;
+const AUTO_CAPTION_FONT_SIZE = 9.5;
+const AUTO_CAPTION_LETTER_SPACING = "0.08em";
+const AUTO_CAPTION_COLOR = paper.faint;
+const AUTO_LABEL_FONT_SIZE = 12;
+const AUTO_LABEL_COLOR = paper.inkMid;
+const AUTO_CHEVRON_FONT_SIZE = 9;
+const AUTO_CHEVRON_COLOR = paper.faint;
+
+// rgba(138,75,42,.35) / rgba(138,75,42,.10) — the accent colour (paper.accent
+// is the same #8a4b2a) at the reference's own alpha, kept as module-local
+// literals per the codebase's convention for a one-off tint (overlay.tsx's
+// CLOSE_ICON_COLOR) rather than added to theme.ts for a single caller.
+const PINNED_PILL_BORDER = "rgba(138,75,42,.35)";
+const PINNED_PILL_BACKGROUND = "rgba(138,75,42,.10)";
+const STEP_BUTTON_SIZE_WIDTH = 40;
+const STEP_BUTTON_SIZE_HEIGHT = 36;
+const STEP_BUTTON_FONT_SIZE = 17;
+const STEP_BUTTON_COLOR = "#5e564c";
+const STEP_BUTTON_DISABLED_OPACITY = 0.35; // not in the vendored reference (it draws no disabled state) — the minimum needed so REQ-004/S4's bounds read as inert, not just inactive
+const MIDDLE_BUTTON_GAP = 8;
+const MIDDLE_BUTTON_PADDING = "0 4px";
+const MIDDLE_BUTTON_HEIGHT = 36;
+const PINNED_CAPTION_FONT_SIZE = 9.5;
+const PINNED_CAPTION_LETTER_SPACING = "0.08em";
+const PINNED_CAPTION_COLOR = paper.accent;
+const PINNED_LABEL_FONT_SIZE = 13;
+const PINNED_LABEL_MIN_WIDTH = 30;
+const DIVIDER_WIDTH = 1;
+const DIVIDER_HEIGHT = 16;
+const DIVIDER_COLOR = "#e0d7c5";
+const CLEAR_BUTTON_FONT_SIZE = 11;
+
+// practice.tuner/REQ-004 — the target pill row: auto reads "TARGET auto ·
+// nearest ▼" and opens the Target sheet; pinned shows − / + (a semitone
+// within E2–C7, disabled at the bounds — `canStepDown`/`canStepUp`), the
+// pinned note (opens the sheet too), and ✕ (back to auto).
+export function TargetPill(props: {
+  readonly tuner: TunerSnapshot;
+  readonly onOpen: () => void;
+  readonly onStep: (delta: -1 | 1) => void;
+  readonly onClear: () => void;
+}): JSX.Element {
+  const { tuner, onOpen, onStep, onClear } = props;
+
+  if (tuner.target.kind === "auto") {
+    return (
+      <div
+        style={{
+          display: "flex",
+          justifyContent: "center",
+          padding: ROW_PADDING,
+          height: ROW_HEIGHT,
+        }}
+      >
+        <button
+          type="button"
+          aria-label="Target"
+          onClick={onOpen}
+          style={{
+            display: "flex",
+            alignItems: "center",
+            gap: AUTO_PILL_GAP,
+            height: ROW_HEIGHT,
+            boxSizing: "border-box",
+            padding: AUTO_PILL_PADDING,
+            border: `1px solid ${AUTO_PILL_BORDER}`,
+            borderRadius: 999,
+            background: AUTO_PILL_BACKGROUND,
+            cursor: "pointer",
+          }}
+        >
+          <span
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: AUTO_CAPTION_FONT_SIZE,
+              letterSpacing: AUTO_CAPTION_LETTER_SPACING,
+              color: AUTO_CAPTION_COLOR,
+            }}
+          >
+            TARGET
+          </span>
+          <span
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: AUTO_LABEL_FONT_SIZE,
+              fontWeight: 600,
+              color: AUTO_LABEL_COLOR,
+            }}
+          >
+            auto · nearest
+          </span>
+          <span
+            style={{
+              fontSize: AUTO_CHEVRON_FONT_SIZE,
+              color: AUTO_CHEVRON_COLOR,
+            }}
+          >
+            ▼
+          </span>
+        </button>
+      </div>
+    );
+  }
+
+  const targetLabel =
+    tuner.targetNote === null ? "" : noteLabel(tuner.targetNote);
+
+  return (
+    <div
+      style={{
+        display: "flex",
+        justifyContent: "center",
+        padding: ROW_PADDING,
+        height: ROW_HEIGHT,
+      }}
+    >
+      <div
+        style={{
+          display: "flex",
+          alignItems: "center",
+          height: ROW_HEIGHT,
+          boxSizing: "border-box",
+          border: `1px solid ${PINNED_PILL_BORDER}`,
+          borderRadius: 999,
+          background: PINNED_PILL_BACKGROUND,
+        }}
+      >
+        <button
+          type="button"
+          aria-label="Target down"
+          onClick={() => onStep(-1)}
+          disabled={!tuner.canStepDown}
+          style={{
+            width: STEP_BUTTON_SIZE_WIDTH,
+            height: STEP_BUTTON_SIZE_HEIGHT,
+            display: "flex",
+            alignItems: "center",
+            justifyContent: "center",
+            fontSize: STEP_BUTTON_FONT_SIZE,
+            lineHeight: 1,
+            color: STEP_BUTTON_COLOR,
+            background: "none",
+            border: "none",
+            cursor: tuner.canStepDown ? "pointer" : "default",
+            opacity: tuner.canStepDown ? 1 : STEP_BUTTON_DISABLED_OPACITY,
+          }}
+        >
+          −
+        </button>
+        <button
+          type="button"
+          aria-label="Target"
+          onClick={onOpen}
+          style={{
+            display: "flex",
+            alignItems: "center",
+            gap: MIDDLE_BUTTON_GAP,
+            height: MIDDLE_BUTTON_HEIGHT,
+            padding: MIDDLE_BUTTON_PADDING,
+            background: "none",
+            border: "none",
+            cursor: "pointer",
+          }}
+        >
+          <span
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: PINNED_CAPTION_FONT_SIZE,
+              letterSpacing: PINNED_CAPTION_LETTER_SPACING,
+              color: PINNED_CAPTION_COLOR,
+            }}
+          >
+            TARGET
+          </span>
+          <span
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: PINNED_LABEL_FONT_SIZE,
+              fontWeight: 600,
+              color: PINNED_CAPTION_COLOR,
+              minWidth: PINNED_LABEL_MIN_WIDTH,
+              textAlign: "center",
+            }}
+          >
+            {targetLabel}
+          </span>
+        </button>
+        <button
+          type="button"
+          aria-label="Target up"
+          onClick={() => onStep(1)}
+          disabled={!tuner.canStepUp}
+          style={{
+            width: STEP_BUTTON_SIZE_WIDTH,
+            height: STEP_BUTTON_SIZE_HEIGHT,
+            display: "flex",
+            alignItems: "center",
+            justifyContent: "center",
+            fontSize: STEP_BUTTON_FONT_SIZE,
+            lineHeight: 1,
+            color: STEP_BUTTON_COLOR,
+            background: "none",
+            border: "none",
+            cursor: tuner.canStepUp ? "pointer" : "default",
+            opacity: tuner.canStepUp ? 1 : STEP_BUTTON_DISABLED_OPACITY,
+          }}
+        >
+          +
+        </button>
+        <div
+          style={{
+            width: DIVIDER_WIDTH,
+            height: DIVIDER_HEIGHT,
+            background: DIVIDER_COLOR,
+          }}
+        />
+        <button
+          type="button"
+          aria-label="Auto"
+          onClick={onClear}
+          style={{
+            width: STEP_BUTTON_SIZE_WIDTH,
+            height: STEP_BUTTON_SIZE_HEIGHT,
+            display: "flex",
+            alignItems: "center",
+            justifyContent: "center",
+            fontSize: CLEAR_BUTTON_FONT_SIZE,
+            lineHeight: 1,
+            color: PINNED_CAPTION_COLOR,
+            background: "none",
+            border: "none",
+            cursor: "pointer",
+          }}
+        >
+          ✕
+        </button>
+      </div>
+    </div>
+  );
+}
diff --git a/src/ui/TargetSheet.tsx b/src/ui/TargetSheet.tsx
new file mode 100644
index 0000000..41c7e66
--- /dev/null
+++ b/src/ui/TargetSheet.tsx
@@ -0,0 +1,314 @@
+import { useRef, type JSX } from "react";
+import type { NoteJudged, TunerSnapshot } from "../practice/published";
+import {
+  noteAtPosition,
+  noteLabel,
+  pitchPosition,
+  type NoteRange,
+  type SpellingPreference,
+} from "../theory/published";
+import { PitchSpiral } from "./PitchSpiral";
+import { appendToTrail } from "./TunerScreen";
+import { BottomSheet, OverlayHeader, OverlayScrim } from "./overlay";
+import { fonts, paper } from "./theme";
+
+// Geometry and colour below are copied verbatim from the vendored visual
+// reference (changes/007-hear-me/design/Tuner.dc.html, frame #5c, markup
+// lines 69-84 — the header and the Auto/Hold cards are the same block 4a's
+// own target sheet uses, lines 290-306) — named here rather than re-derived
+// by eye or copied as markup.
+const SCRIM_Z_INDEX = 15;
+const SHEET_Z_INDEX = 16;
+const SHEET_PADDING_BOTTOM = 16;
+
+const HEADER_PADDING = "16px 18px 12px";
+const SUBTITLE_TEXT = "Measure from the nearest note, or pin one";
+
+const CARDS_ROW_PADDING = "14px 18px 6px";
+const CARDS_GAP = 8;
+const CARD_PADDING = "11px 13px 12px";
+const CARD_RADIUS = 12;
+const CARD_TITLE_FONT_SIZE = 14;
+const CARD_SUBTITLE_FONT_SIZE = 11.5;
+const CARD_SUBTITLE_COLOR = paper.muted;
+
+const AUTO_CARD_BORDER = "#e0d7c5";
+const AUTO_CARD_BACKGROUND_ON = paper.pillActive;
+const AUTO_TICK_COLOR = paper.accent;
+
+const HOLD_CARD_BORDER_ON = "#e0d7c5";
+const HOLD_CARD_BORDER_OFF = "#ece4d5";
+const HOLD_TITLE_COLOR_ON = paper.ink;
+const HOLD_TITLE_COLOR_OFF = "#b0a797";
+const HOLD_NAME_FONT_SIZE = 13;
+
+const TAP_ROW_PADDING = "10px 18px 0";
+const TAP_LABEL_FONT_SIZE = 13;
+const TAP_RANGE_FONT_SIZE = 11;
+const TAP_RANGE_COLOR = paper.muted;
+
+const SPIRAL_WRAPPER_PADDING = "0 0 10px";
+
+// practice.tuner/REQ-004 — E2–C7 (`TUNER_LOWEST_POSITION`/
+// `TUNER_HIGHEST_POSITION` from practice/published, reproduced here as the
+// plan's data model names them) ∪ the instrument's range ∪ wherever the
+// last reading or the pinned target sits — the vendored reference's own
+// `sLo`/`sHi` (script lines 1382-1384).
+const SPIRAL_FLOOR = 40; // E2
+const SPIRAL_CEILING = 96; // C7
+
+interface SpiralSpan {
+  readonly lowest: number;
+  readonly highest: number;
+}
+
+function spiralSpanOf(range: NoteRange, tuner: TunerSnapshot): SpiralSpan {
+  const rangeLowest = pitchPosition(range.lowest);
+  const rangeHighest = pitchPosition(range.highest);
+  const nowPosition =
+    tuner.reading === null ? null : pitchPosition(tuner.reading.heard.nearest);
+  const pinnedPosition =
+    tuner.target.kind === "pinned" ? tuner.target.position : null;
+  const candidates = [
+    SPIRAL_FLOOR,
+    rangeLowest,
+    ...(nowPosition === null ? [] : [nowPosition]),
+    ...(pinnedPosition === null ? [] : [pinnedPosition]),
+  ];
+  const highCandidates = [
+    SPIRAL_CEILING,
+    rangeHighest,
+    ...(nowPosition === null ? [] : [nowPosition]),
+    ...(pinnedPosition === null ? [] : [pinnedPosition]),
+  ];
+  return {
+    lowest: Math.min(...candidates),
+    highest: Math.max(...highCandidates),
+  };
+}
+
+function AutoCard(props: {
+  readonly auto: boolean;
+  readonly onAuto: () => void;
+}): JSX.Element {
+  const { auto, onAuto } = props;
+  return (
+    <button
+      type="button"
+      aria-label="Auto"
+      onClick={onAuto}
+      style={{
+        flex: 1,
+        minWidth: 0,
+        display: "flex",
+        alignItems: "center",
+        justifyContent: "space-between",
+        gap: 8,
+        padding: CARD_PADDING,
+        borderRadius: CARD_RADIUS,
+        border: `1px solid ${AUTO_CARD_BORDER}`,
+        background: auto ? AUTO_CARD_BACKGROUND_ON : "transparent",
+        cursor: "pointer",
+        textAlign: "left",
+      }}
+    >
+      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
+        <span style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
+          Auto
+        </span>
+        <span
+          style={{
+            fontSize: CARD_SUBTITLE_FONT_SIZE,
+            color: CARD_SUBTITLE_COLOR,
+          }}
+        >
+          nearest note
+        </span>
+      </span>
+      <span style={{ fontSize: 13, color: AUTO_TICK_COLOR }}>
+        {auto ? "✓" : ""}
+      </span>
+    </button>
+  );
+}
+
+function HoldCard(props: {
+  readonly hasReading: boolean;
+  readonly holdName: string;
+  readonly onHold: () => void;
+}): JSX.Element {
+  const { hasReading, holdName, onHold } = props;
+  return (
+    <button
+      type="button"
+      aria-label="Hold"
+      onClick={onHold}
+      style={{
+        flex: 1,
+        minWidth: 0,
+        display: "flex",
+        flexDirection: "column",
+        gap: 3,
+        padding: CARD_PADDING,
+        borderRadius: CARD_RADIUS,
+        border: `1px solid ${hasReading ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
+        background: "none",
+        cursor: "pointer",
+        textAlign: "left",
+      }}
+    >
+      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
+        <span
+          style={{
+            fontSize: CARD_TITLE_FONT_SIZE,
+            fontWeight: 600,
+            color: hasReading ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
+          }}
+        >
+          Hold
+        </span>
+        {hasReading && (
+          <span
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: HOLD_NAME_FONT_SIZE,
+              fontWeight: 600,
+              color: paper.inkMid,
+            }}
+          >
+            {holdName}
+          </span>
+        )}
+      </span>
+      <span
+        style={{
+          fontSize: CARD_SUBTITLE_FONT_SIZE,
+          color: CARD_SUBTITLE_COLOR,
+          whiteSpace: "nowrap",
+        }}
+      >
+        {hasReading ? "what you're playing" : "play a note first"}
+      </span>
+    </button>
+  );
+}
+
+// practice.tuner/REQ-004 — the Target sheet: Auto, Hold, and the pitch
+// spiral, on the shared BottomSheet shell. Never touches the session on
+// open or close (REQ-004/S6) — `onAuto`/`onHold`/`onPin` are the only calls
+// that reach the session, and only when the learner actually picks one.
+export function TargetSheet(props: {
+  readonly open: boolean;
+  readonly tuner: TunerSnapshot;
+  readonly spelling: SpellingPreference;
+  readonly range: NoteRange;
+  readonly onClose: () => void;
+  readonly onAuto: () => void;
+  readonly onHold: () => void;
+  readonly onPin: (position: number) => void;
+}): JSX.Element {
+  const { open, tuner, spelling, range, onClose, onAuto, onHold, onPin } =
+    props;
+
+  // The spiral's own trail (practice.tuner/REQ-004/S6) — the same shape and
+  // capping rule as TunerScreen's strip trail (`appendToTrail`), kept
+  // separately since the spiral is a different view of the same readings
+  // and this sheet has no access to TunerScreen's own ref.
+  const trailRef = useRef<readonly NoteJudged[]>([]);
+  const lastReadingRef = useRef<NoteJudged | null>(null);
+  if (tuner.reading === null) {
+    trailRef.current = [];
+    lastReadingRef.current = null;
+  } else if (tuner.reading !== lastReadingRef.current) {
+    lastReadingRef.current = tuner.reading;
+    trailRef.current = appendToTrail(trailRef.current, tuner.reading);
+  }
+
+  const span = spiralSpanOf(range, tuner);
+  const rangeLowest = pitchPosition(range.lowest);
+  const rangeHighest = pitchPosition(range.highest);
+  const rangeLabel = `${noteLabel(noteAtPosition(span.lowest, spelling))}–${noteLabel(
+    noteAtPosition(span.highest, spelling),
+  )} · low in the middle`;
+
+  const holdName =
+    tuner.reading === null ? "" : noteLabel(tuner.reading.heard.nearest);
+
+  return (
+    <>
+      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
+      <BottomSheet
+        open={open}
+        zIndex={SHEET_Z_INDEX}
+        paddingBottom={SHEET_PADDING_BOTTOM}
+      >
+        {/* BottomSheet itself always renders its children (its own doc
+            comment: `display` alone gates visibility, for every other
+            sheet's sake). This sheet additionally gates its own content on
+            `open` — REQ-004/S6 (closed means gone, not just off-screen: no
+            lingering "Measure from the nearest note…" text, no reachable
+            Auto/Hold/wedge buttons) and, practically, so the spiral's 57-
+            wedge geometry is never computed while nobody can see it. */}
+        {open && (
+          <>
+            <OverlayHeader
+              title="Target"
+              subtitle={SUBTITLE_TEXT}
+              padding={HEADER_PADDING}
+              closeAriaLabel="Close"
+              onClose={onClose}
+            />
+            <div
+              style={{
+                display: "flex",
+                gap: CARDS_GAP,
+                padding: CARDS_ROW_PADDING,
+              }}
+            >
+              <AutoCard auto={tuner.target.kind === "auto"} onAuto={onAuto} />
+              <HoldCard
+                hasReading={tuner.reading !== null}
+                holdName={holdName}
+                onHold={onHold}
+              />
+            </div>
+            <div
+              style={{
+                display: "flex",
+                alignItems: "baseline",
+                justifyContent: "space-between",
+                padding: TAP_ROW_PADDING,
+              }}
+            >
+              <div style={{ fontSize: TAP_LABEL_FONT_SIZE, fontWeight: 600 }}>
+                Or tap a note
+              </div>
+              <div
+                style={{
+                  fontFamily: fonts.mono,
+                  fontSize: TAP_RANGE_FONT_SIZE,
+                  color: TAP_RANGE_COLOR,
+                }}
+              >
+                {rangeLabel}
+              </div>
+            </div>
+            <div style={{ padding: SPIRAL_WRAPPER_PADDING }}>
+              <PitchSpiral
+                lowest={span.lowest}
+                highest={span.highest}
+                rangeLowest={rangeLowest}
+                rangeHighest={rangeHighest}
+                target={tuner.target}
+                reading={tuner.reading}
+                trail={trailRef.current}
+                spelling={spelling}
+                onPick={onPin}
+              />
+            </div>
+          </>
+        )}
+      </BottomSheet>
+    </>
+  );
+}
diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
index eb5e445..6fafc03 100644
--- a/src/ui/TunerLevel.tsx
+++ b/src/ui/TunerLevel.tsx
@@ -122,6 +122,16 @@ function buildTicks(): readonly Tick[] {
 
 const TICKS = buildTicks();
 
+// `AREA_MID - lineCents * PX_PER_CENT - LINE_TOP_ADJUST` at the pinned rule's
+// own edge (lineCents = ±50 — practice.tuner/REQ-004) lands on a value like
+// 9.500000000000028, not 9.5: PX_PER_CENT (5.1) has no exact binary
+// representation, so `50 * 5.1` is already off by a sliver before the
+// subtraction. Rounded to hundredths — far finer than a visible pixel, so
+// nothing on screen moves — so the style's own `px` string reads "9.5px".
+function roundPx(value: number): number {
+  return Math.round(value * 100) / 100;
+}
+
 // The reading's line + tag, clamped to the rule's ±50 ¢ edge when a pinned
 // target's offset runs past it (practice.tuner/REQ-004) — the line stays
 // at the edge and the tag switches to "▲ N st" / "▼ N st".
@@ -137,7 +147,7 @@ function readingGeometry(reading: NoteJudged): {
     -LINE_CENTS_LIMIT,
     Math.min(LINE_CENTS_LIMIT, cents),
   );
-  const lineTop = AREA_MID - lineCents * PX_PER_CENT - LINE_TOP_ADJUST;
+  const lineTop = roundPx(AREA_MID - lineCents * PX_PER_CENT - LINE_TOP_ADJUST);
   const tagTop =
     lineCents >= 0 ? lineTop - TAG_ABOVE_OFFSET : lineTop + TAG_BELOW_OFFSET;
   const tone = TONE_BY_VERDICT[reading.verdict];
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 098453a..c3424e5 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -1,13 +1,28 @@
-import { memo, useRef, type JSX } from "react";
+import { memo, useCallback, useRef, useState, type JSX } from "react";
 import type { NoteJudged, TunerSnapshot } from "../practice/published";
-import type { SpellingPreference } from "../theory/published";
+import type { NoteRange, SpellingPreference } from "../theory/published";
+import { TargetPill } from "./TargetPill";
+import { TargetSheet } from "./TargetSheet";
 import { fonts, paper } from "./theme";
 import { TunerLevel } from "./TunerLevel";
 import { TunerStave } from "./TunerStave";
 
 // practice.tuner/REQ-005 — the strip's 2.5 s trail is the last 50 readings,
-// oldest first (T016's brief).
-const TRAIL_CAPACITY = 50;
+// oldest first (T016's brief). Exported (with `appendToTrail`) so
+// TargetSheet.tsx's own trail — the same shape, fed to PitchSpiral rather
+// than TunerStave — can share the arithmetic instead of duplicating it
+// (docs/engineering.md, AGENTS.md "things agents get wrong here").
+export const TRAIL_CAPACITY = 50;
+
+export function appendToTrail(
+  trail: readonly NoteJudged[],
+  reading: NoteJudged,
+): readonly NoteJudged[] {
+  const appended = [...trail, reading];
+  return appended.length > TRAIL_CAPACITY
+    ? appended.slice(appended.length - TRAIL_CAPACITY)
+    : appended;
+}
 
 // The header row — copied verbatim from the vendored visual reference
 // (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
@@ -62,11 +77,42 @@ function isListening(tuner: TunerSnapshot): boolean {
 function TunerScreenComponent(props: {
   readonly tuner: TunerSnapshot;
   readonly spelling: SpellingPreference;
+  readonly range: NoteRange;
   readonly onLeave: () => void;
+  readonly onHold: () => void;
+  readonly onPin: (position: number) => void;
+  readonly onStep: (delta: -1 | 1) => void;
+  readonly onClear: () => void;
 }): JSX.Element {
-  const { tuner, spelling, onLeave } = props;
+  const { tuner, spelling, range, onLeave, onHold, onPin, onStep, onClear } =
+    props;
   const listening = isListening(tuner);
 
+  // practice.tuner/REQ-004/S6 — the Target sheet's open/closed state is
+  // local to this screen: opening or closing it never touches the session.
+  // Hold, Auto and a spiral wedge each close the sheet as they pin/clear the
+  // target (the vendored reference's own `pickAuto`/`holdNote`/wedge `pick`,
+  // each `sheet: false` alongside its target change) — composed here rather
+  // than in TargetSheet, which only knows the handlers it was given.
+  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
+  const handleOpenTarget = useCallback(() => setTargetSheetOpen(true), []);
+  const handleCloseTarget = useCallback(() => setTargetSheetOpen(false), []);
+  const handleAuto = useCallback(() => {
+    onClear();
+    setTargetSheetOpen(false);
+  }, [onClear]);
+  const handleHold = useCallback(() => {
+    onHold();
+    setTargetSheetOpen(false);
+  }, [onHold]);
+  const handlePin = useCallback(
+    (position: number) => {
+      onPin(position);
+      setTargetSheetOpen(false);
+    },
+    [onPin],
+  );
+
   // The strip's trail (practice.tuner/REQ-005) — a ring of the last 50
   // NoteJudged, oldest first, kept here (not in the session) so it is pure
   // view state: appended whenever `tuner.reading` becomes a genuinely new
@@ -84,15 +130,18 @@ function TunerScreenComponent(props: {
     lastReadingRef.current = null;
   } else if (tuner.reading !== lastReadingRef.current) {
     lastReadingRef.current = tuner.reading;
-    const appended = [...trailRef.current, tuner.reading];
-    trailRef.current =
-      appended.length > TRAIL_CAPACITY
-        ? appended.slice(appended.length - TRAIL_CAPACITY)
-        : appended;
+    trailRef.current = appendToTrail(trailRef.current, tuner.reading);
   }
 
   return (
-    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
+    <div
+      style={{
+        position: "relative",
+        display: "flex",
+        flexDirection: "column",
+        flex: 1,
+      }}
+    >
       <div
         style={{
           display: "flex",
@@ -166,10 +215,24 @@ function TunerScreenComponent(props: {
       <div style={{ padding: "10px 16px 0" }}>
         <TunerStave tuner={tuner} trail={trailRef.current} />
       </div>
-      {/* T017 — the target row */}
-      <div />
+      <TargetPill
+        tuner={tuner}
+        onOpen={handleOpenTarget}
+        onStep={onStep}
+        onClear={onClear}
+      />
       {/* T018 — the footer */}
       <div />
+      <TargetSheet
+        open={targetSheetOpen}
+        tuner={tuner}
+        spelling={spelling}
+        range={range}
+        onClose={handleCloseTarget}
+        onAuto={handleAuto}
+        onHold={handleHold}
+        onPin={handlePin}
+      />
     </div>
   );
 }
diff --git a/tests/ui/scenarios/target-sheet.test.tsx b/tests/ui/scenarios/target-sheet.test.tsx
new file mode 100644
index 0000000..ff536dd
--- /dev/null
+++ b/tests/ui/scenarios/target-sheet.test.tsx
@@ -0,0 +1,108 @@
+import { act, cleanup, screen } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { afterEach, expect, test } from "vitest";
+import { enterAndHear } from "./tuner-helpers";
+
+// No global `afterEach` in scope (vitest globals are off), so
+// @testing-library/react's automatic cleanup never registers itself; without
+// this, each test's render would still be in the DOM for the next test
+// (the pattern of tuner-screen.test.tsx / tuner-stave.test.tsx).
+afterEach(() => {
+  cleanup();
+});
+
+test("practice.tuner/REQ-004/S1 — Hold", async () => {
+  const f = await enterAndHear(445.0);
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  expect(screen.getByRole("button", { name: "Hold" }).textContent).toContain(
+    "A4",
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Hold" }));
+  expect(
+    screen.queryByText("Measure from the nearest note, or pin one"),
+  ).toBeNull(); // closed
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "TARGETA4",
+  );
+  f.listening.feed(461.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("tuner-tag").textContent).toContain("▲ 1 st");
+  expect(screen.getByText("playing A♯4")).toBeTruthy();
+  expect(screen.getByTestId("tuner-line").style.top).toBe("9.5px"); // pinned at +50: 268 − 255 − 3.5
+});
+
+test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
+  await enterAndHear(440.0);
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  expect(
+    screen
+      .getAllByRole("button")
+      .filter((button) => button.getAttribute("data-position") !== null),
+  ).toHaveLength(57); // E2–C7 on the flute
+  expect(
+    screen.getByRole("button", { name: "E2" }).getAttribute("data-dimmed"),
+  ).toBe("true");
+  expect(
+    screen.getByRole("button", { name: "D5" }).getAttribute("data-dimmed"),
+  ).not.toBe("true");
+  await userEvent.hover(screen.getByRole("button", { name: "D5" }));
+  await userEvent.click(screen.getByRole("button", { name: "D5" }));
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "TARGETD5",
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  expect(screen.getByTestId("spiral-hub").textContent).toContain("D5587.3 Hz");
+});
+
+test("practice.tuner/REQ-004/S4 — a semitone either way", async () => {
+  const f = await enterAndHear(440.0);
+  act(() => {
+    f.session.pinTarget(69);
+  });
+  await userEvent.click(screen.getByRole("button", { name: "Target up" }));
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "A♯4",
+  );
+  act(() => {
+    f.session.pinTarget(96);
+  });
+  const up: HTMLButtonElement = screen.getByRole("button", {
+    name: "Target up",
+  });
+  expect(up.disabled).toBe(true);
+  act(() => {
+    f.session.pinTarget(40);
+  });
+  const down: HTMLButtonElement = screen.getByRole("button", {
+    name: "Target down",
+  });
+  expect(down.disabled).toBe(true);
+});
+
+test("practice.tuner/REQ-004/S5 — back to auto", async () => {
+  const f = await enterAndHear(445.0);
+  act(() => {
+    f.session.pinTarget(74);
+  });
+  await userEvent.click(screen.getByRole("button", { name: "Auto" }));
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "auto · nearest",
+  );
+  f.listening.feed(445.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+});
+
+test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
+  const f = await enterAndHear(440.0);
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  f.listening.feed(445.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("spiral-needle")).toBeTruthy();
+  expect(f.listening.stopCalls).toBe(0);
+  await userEvent.click(screen.getByRole("button", { name: "Close" }));
+  expect(f.listening.stopCalls).toBe(0);
+});
```

<!-- recorded 2026-09-28T12:37:18Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: FAIL
- Findings: [important] local copies of TUNER_LOWEST/HIGHEST_POSITION instead of the published import. [important] the trail-tracking block re-implemented in TargetSheet instead of passed as a prop. UNVERIFIED: §5 fingertip targets — innermost spiral wedges ~25 px, for the refinement loop.
