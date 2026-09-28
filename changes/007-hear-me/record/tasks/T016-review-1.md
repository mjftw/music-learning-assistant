---
type: Task Review
title: Review package — T016 · 007-hear-me
description: The diff produced for T016, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T016.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T016.md
  - resource: git:31307687122b6d458652a262dbbb3aa200d1d79a..a5673c8635d2e0615a771da1d3ec71e5e3cd9240
generated:
  by: process:review-package.sh
  at: 2026-09-28T11:43:06Z
sdd_id: 007-hear-me
---

# Review package — T016 · 007-hear-me

base: `31307687122b6d458652a262dbbb3aa200d1d79a` → head: `a5673c8635d2e0615a771da1d3ec71e5e3cd9240`

## Files changed

- M	src/ui/App.tsx
- M	src/ui/StaveView.tsx
- M	src/ui/TunerScreen.tsx
- A	src/ui/TunerStave.tsx
- M	src/ui/key-label.ts
- A	tests/ui/scenarios/tuner-helpers.ts
- M	tests/ui/scenarios/tuner-screen.test.tsx
- A	tests/ui/scenarios/tuner-stave.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 0e12e7d..20f0b96 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -335,11 +335,17 @@ export function App(props: {
 
   const session = sessionRef.current;
 
-  // Key or variant change → setContext (practice.session/REQ-007). Depends
-  // on the primitive ids, not the `selectedKey`/`variant` objects — those
-  // are freshly derived every render, so depending on them directly would
-  // fire this on every unrelated re-render (e.g. every tick while playing)
-  // and restart the sequence each time.
+  // Key or variant change → setContext (practice.session/REQ-007), and a
+  // spelling-only change too (practice.tuner/REQ-002/S5: the session's own
+  // `currentContext.spelling` is what `judge()` spells a reading with —
+  // tuner-reading.test.ts/REQ-002/S5 drives `setContext` directly and
+  // passes; this effect is the UI's only route to it, and `selection.
+  // spelling` was missing from the list below — a spelling toggle on a
+  // spelling-invariant key, e.g. C major, changed nothing the session saw).
+  // Depends on the primitive ids/values, not the `selectedKey`/`variant`
+  // objects — those are freshly derived every render, so depending on them
+  // directly would fire this on every unrelated re-render (e.g. every tick
+  // while playing) and restart the sequence each time.
   useEffect(() => {
     if (variant === undefined || session === null) return;
     session.setContext({
@@ -347,7 +353,7 @@ export function App(props: {
       variant,
       spelling: selection.spelling,
     });
-  }, [session, keyIdOf(selectedKey), variant?.variantId]);
+  }, [session, keyIdOf(selectedKey), variant?.variantId, selection.spelling]);
 
   useEffect(() => {
     // Nothing to persist yet on the render before the session-creating
diff --git a/src/ui/StaveView.tsx b/src/ui/StaveView.tsx
index ef2e538..20ce04b 100644
--- a/src/ui/StaveView.tsx
+++ b/src/ui/StaveView.tsx
@@ -6,10 +6,9 @@ import {
   type Key,
   type KeyViewNote,
   type Note,
-  type NoteLetter,
   type Variant,
 } from "../theory/published";
-import { noteLabel, pitchClassLabel } from "./key-label";
+import { diatonicIndex, noteLabel, pitchClassLabel } from "./key-label";
 import { fonts, paper } from "./theme";
 
 // Geometry and colour below are copied verbatim from the vendored visual
@@ -27,8 +26,6 @@ const PANEL_SIG_X0 = 42;
 const PANEL_SIG_DX = 8.5;
 const PANEL_NOTES_END = 318;
 
-const LETTERS: readonly NoteLetter[] = ["C", "D", "E", "F", "G", "A", "B"];
-
 const STAVE_LINE_X1 = 10;
 const STAVE_LINE_X2 = 332;
 const STAVE_LINE_STROKE = paper.inkSoft;
@@ -127,10 +124,6 @@ const HIT_RECT_MIN_WIDTH = 16;
 const HIT_RECT_Y_INSET = 14;
 const HIT_RECT_HEIGHT_PAD = 28;
 
-function diatonicIndex(note: Note): number {
-  return note.octave * 7 + LETTERS.indexOf(note.letter);
-}
-
 interface StaveHead {
   readonly x: number;
   readonly y: number;
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 9ab0979..098453a 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -1,8 +1,13 @@
-import { memo, type JSX } from "react";
-import type { TunerSnapshot } from "../practice/published";
+import { memo, useRef, type JSX } from "react";
+import type { NoteJudged, TunerSnapshot } from "../practice/published";
 import type { SpellingPreference } from "../theory/published";
 import { fonts, paper } from "./theme";
 import { TunerLevel } from "./TunerLevel";
+import { TunerStave } from "./TunerStave";
+
+// practice.tuner/REQ-005 — the strip's 2.5 s trail is the last 50 readings,
+// oldest first (T016's brief).
+const TRAIL_CAPACITY = 50;
 
 // The header row — copied verbatim from the vendored visual reference
 // (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
@@ -62,6 +67,30 @@ function TunerScreenComponent(props: {
   const { tuner, spelling, onLeave } = props;
   const listening = isListening(tuner);
 
+  // The strip's trail (practice.tuner/REQ-005) — a ring of the last 50
+  // NoteJudged, oldest first, kept here (not in the session) so it is pure
+  // view state: appended whenever `tuner.reading` becomes a genuinely new
+  // reading (a fresh object each commit — domain/session.ts's
+  // `commitTunerReading`), reset on a gap ("Play a note" — REQ-003/S3) or on
+  // leaving the tuner (this component unmounts, discarding the ref, since
+  // App only renders it while `screen === "tuner"`). Mutated directly during
+  // render, not in an effect, because the trail this render hands to
+  // TunerStave must already include the reading this same render just
+  // received.
+  const trailRef = useRef<readonly NoteJudged[]>([]);
+  const lastReadingRef = useRef<NoteJudged | null>(null);
+  if (tuner.reading === null) {
+    trailRef.current = [];
+    lastReadingRef.current = null;
+  } else if (tuner.reading !== lastReadingRef.current) {
+    lastReadingRef.current = tuner.reading;
+    const appended = [...trailRef.current, tuner.reading];
+    trailRef.current =
+      appended.length > TRAIL_CAPACITY
+        ? appended.slice(appended.length - TRAIL_CAPACITY)
+        : appended;
+  }
+
   return (
     <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
       <div
@@ -134,8 +163,9 @@ function TunerScreenComponent(props: {
         </span>
       </div>
       <TunerLevel tuner={tuner} spelling={spelling} />
-      {/* T016 — the stave strip */}
-      <div />
+      <div style={{ padding: "10px 16px 0" }}>
+        <TunerStave tuner={tuner} trail={trailRef.current} />
+      </div>
       {/* T017 — the target row */}
       <div />
       {/* T018 — the footer */}
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
new file mode 100644
index 0000000..3e1e0da
--- /dev/null
+++ b/src/ui/TunerStave.tsx
@@ -0,0 +1,680 @@
+import type { JSX } from "react";
+import type { NoteJudged, TunerSnapshot, Verdict } from "../practice/published";
+import {
+  noteLabel,
+  pitchHzOf,
+  type Accidental,
+  type Note,
+} from "../theory/published";
+import { diatonicIndex } from "./key-label";
+import { fonts, paper, tuner } from "./theme";
+
+// Geometry below is copied verbatim from the vendored visual reference
+// (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
+// 204-275, and the `st4` block's arithmetic at lines 1222-1279) — named
+// here rather than re-derived by eye or copied as markup. `diatonicIndex`
+// itself is shared with StaveView.tsx (./key-label.ts) rather than
+// duplicated.
+const CARD_WIDTH = 358;
+const CARD_HEIGHT = 144;
+const SVG_HEIGHT = 176;
+
+const STAVE_LINE_X1 = 12;
+const STAVE_LINE_X2 = 196;
+const STAVE_TOP_LINE_Y = 86;
+const STAVE_BOTTOM_LINE_Y = 126;
+const STAVE_LINE_YS: readonly number[] = [86, 96, 106, 116, 126];
+const STAVE_LINE_STROKE_WIDTH = 1;
+const END_BAR_STROKE_WIDTH = 1.6;
+
+const CLEF_X = 28;
+const CLEF_Y = 108;
+const CLEF_GLYPH = "𝄞";
+const CLEF_FONT_SIZE = 36;
+
+// y(i) = 126 − (i − 30)·5 — index 30 (E4) is the stave's bottom line, at
+// the card's own y = 126; each diatonic step is 5 px.
+const BASE_Y = 126;
+const BOTTOM_LINE_INDEX = 30; // E4
+const Y_STEP = 5;
+function writtenY(index: number): number {
+  return BASE_Y - (index - BOTTOM_LINE_INDEX) * Y_STEP;
+}
+
+// A note beyond the ledger range is instead written an octave (or two) in,
+// under an 8va/15ma (too high) or 8vb/15mb (too low) mark — the design's
+// own wrap bounds (`bottom + 19`, `bottom - 7`), reproduced as named
+// constants derived the same way from BOTTOM_LINE_INDEX.
+const WRAP_HIGH_INDEX = BOTTOM_LINE_INDEX + 19; // 49 — C7 fits exactly; above it wraps
+const WRAP_LOW_INDEX = BOTTOM_LINE_INDEX - 7; // 23 — E3 fits exactly; below it wraps
+const OCTAVE_SHIFT = 7; // diatonic steps in one octave
+
+type OctaveMark = "" | "8va" | "15ma" | "8vb" | "15mb";
+
+interface WrittenPosition {
+  readonly index: number;
+  readonly y: number;
+  readonly mark: OctaveMark;
+}
+
+function writtenPositionOf(rawIndex: number): WrittenPosition {
+  let index = rawIndex;
+  let shift = 0;
+  while (index > WRAP_HIGH_INDEX) {
+    index -= OCTAVE_SHIFT;
+    shift -= OCTAVE_SHIFT;
+  }
+  while (index < WRAP_LOW_INDEX) {
+    index += OCTAVE_SHIFT;
+    shift += OCTAVE_SHIFT;
+  }
+  const mark: OctaveMark =
+    shift === 0
+      ? ""
+      : shift < 0
+        ? shift <= -2 * OCTAVE_SHIFT
+          ? "15ma"
+          : "8va"
+        : shift >= 2 * OCTAVE_SHIFT
+          ? "15mb"
+          : "8vb";
+  return { index, y: writtenY(index), mark };
+}
+
+interface Ledger {
+  readonly x1: number;
+  readonly x2: number;
+  readonly y: number;
+}
+
+const LEDGER_LOW_START = BOTTOM_LINE_INDEX - 2; // 28
+const LEDGER_HIGH_START = BOTTOM_LINE_INDEX + 10; // 40
+const LEDGER_X_HALF = 12;
+const LEDGER_STROKE_WIDTH = 1.1;
+
+function ledgersFor(writtenIndex: number, x: number): readonly Ledger[] {
+  const ledgers: Ledger[] = [];
+  for (let v = LEDGER_LOW_START; v >= writtenIndex; v -= 2) {
+    ledgers.push({
+      x1: x - LEDGER_X_HALF,
+      x2: x + LEDGER_X_HALF,
+      y: writtenY(v),
+    });
+  }
+  for (let v = LEDGER_HIGH_START; v <= writtenIndex; v += 2) {
+    ledgers.push({
+      x1: x - LEDGER_X_HALF,
+      x2: x + LEDGER_X_HALF,
+      y: writtenY(v),
+    });
+  }
+  return ledgers;
+}
+
+const HEARD_X = 150;
+const TARGET_X = 182;
+
+const HEAD_RX = 8.2;
+const HEAD_RY = 5.4;
+const HEAD_INNER_RX = 4.4;
+const HEAD_INNER_RY = 3;
+const HEAD_INNER_ROTATE_DEGREES = -35;
+
+// hy = guideY − cents·CENTS_TO_PX_DRIFT — at most ±50 cents (nearestNoteOf's
+// own range), so the drift never exceeds ±3.5 px, never as far as the next
+// staff position (practice.tuner/REQ-005).
+const CENTS_TO_PX_DRIFT = 0.07;
+const MAX_DRIFT_CENTS = 50;
+
+const ACCIDENTAL_X_HEARD = 133;
+const ACCIDENTAL_X_TARGET = 167;
+const ACCIDENTAL_FONT_SIZE = 20;
+const ACCIDENTAL_LOWERED_Y_ADJUST = -3; // a flat's descender needs a nudge up
+
+const ACCIDENTAL_GLYPH: Record<Accidental, string> = {
+  doubleFlat: "𝄫",
+  flat: "♭",
+  natural: "",
+  sharp: "♯",
+  doubleSharp: "𝄪",
+};
+
+const GUIDE_X1 = 52;
+const GUIDE_X2 = 166;
+const GUIDE_DASH = "2 4";
+const GUIDE_STROKE_WIDTH = 1;
+
+// The ±5 ¢ in-tune band's rect, shaded around the guide — a fixed geometry
+// constant local to this view (the Produces interface consumes no
+// practice/published constant), matching the design's own literal band
+// arithmetic (`band` = 5, `PXC` = 0.07).
+const BAND_HALF_WIDTH_CENTS = 5;
+const BAND_X = 126;
+const BAND_WIDTH = 48;
+const BAND_RADIUS = 6;
+const BAND_TOP_OFFSET = BAND_HALF_WIDTH_CENTS * CENTS_TO_PX_DRIFT + 6;
+const BAND_HEIGHT = BAND_HALF_WIDTH_CENTS * CENTS_TO_PX_DRIFT * 2 + 12;
+
+const CENTS_X = HEARD_X;
+const CENTS_FONT_SIZE = 11;
+const CENTS_TOP_OFFSET = 27;
+
+const OCTAVE_MARK_FONT_SIZE = 14;
+const OCTAVE_MARK_BELOW_OFFSET = 12;
+const OCTAVE_MARK_ABOVE_OFFSET = 44;
+const TARGET_MARK_BELOW_OFFSET = 12;
+const TARGET_MARK_ABOVE_OFFSET = 30;
+const OCTAVE_MARK_HEIGHT = 14; // for the centring pass below
+
+const TRAIL_X_START = 52;
+const TRAIL_X_END = 140;
+const TRAIL_STROKE_WIDTH = 2.2;
+const TRAIL_GRADIENT_ID = "tuner-stave-trail-fade";
+
+const COLUMN_LEFT = 214;
+const COLUMN_RIGHT = 12;
+const COLUMN_TOP = 30;
+const COLUMN_BOTTOM = 30;
+const COLUMN_CAPTION_FONT_SIZE = 9.5;
+const COLUMN_CAPTION_LETTER_SPACING = "0.08em";
+const COLUMN_VALUE_FONT_SIZE = 15;
+// Module-local one-off colour, matching the reference's reference-value ink
+// — not lifted into theme.ts (the same pattern StaveView.tsx's NAME_INK
+// follows).
+const REFERENCE_VALUE_INK = "#4a4136";
+
+const TONE_BY_VERDICT: Record<Verdict, string> = {
+  sharp: tuner.sharp,
+  flat: tuner.flat,
+  "in-tune": tuner.inTune,
+};
+
+// "+12" / "−16" / "0" — U+2212 MINUS SIGN, matching TunerLevel's own
+// `formatCents` (not imported: TunerLevel.tsx is outside this task's file
+// list, and the formatter is a four-line, side-effect-free expression).
+function formatCents(cents: number): string {
+  if (cents > 0) return `+${cents}`;
+  if (cents < 0) return `−${-cents}`;
+  return "0";
+}
+
+function pxValue(value: number): string {
+  return `${Number(value.toFixed(2))}px`;
+}
+
+function hzText(hz: number | null): string {
+  return hz === null ? "—" : `${hz.toFixed(1)} Hz`;
+}
+
+interface HeardPlacement {
+  readonly position: WrittenPosition;
+  readonly hy: number;
+  readonly ledgers: readonly Ledger[];
+}
+
+function placeHeard(note: Note, cents: number): HeardPlacement {
+  const position = writtenPositionOf(diatonicIndex(note));
+  const clampedCents = Math.max(
+    -MAX_DRIFT_CENTS,
+    Math.min(MAX_DRIFT_CENTS, cents),
+  );
+  return {
+    position,
+    hy: position.y - clampedCents * CENTS_TO_PX_DRIFT,
+    ledgers: ledgersFor(position.index, HEARD_X),
+  };
+}
+
+interface TargetPlacement {
+  readonly position: WrittenPosition;
+  readonly ledgers: readonly Ledger[];
+}
+
+function placeTarget(note: Note): TargetPlacement {
+  const position = writtenPositionOf(diatonicIndex(note));
+  return { position, ledgers: ledgersFor(position.index, TARGET_X) };
+}
+
+function octaveMarkY(mark: OctaveMark, top: number, bottom: number): number {
+  return mark.endsWith("b")
+    ? Math.max(top, bottom) + OCTAVE_MARK_BELOW_OFFSET
+    : Math.min(top, bottom) - OCTAVE_MARK_ABOVE_OFFSET;
+}
+
+function targetMarkY(mark: OctaveMark, y: number): number {
+  return mark.endsWith("b")
+    ? y + TARGET_MARK_BELOW_OFFSET
+    : y - TARGET_MARK_ABOVE_OFFSET;
+}
+
+// Note (letter/octave) that governs the "<note> IS" caption and its Hz —
+// the pinned target when there is a reading or one is pinned silently
+// (practice.tuner/REQ-003/S2), else the reading's own nearest note
+// (`reading.target` already carries whichever governs measurement — the
+// pinned target, or the hysteresis-tracked nearest note on auto).
+function referenceNoteOf(
+  reading: NoteJudged | null,
+  targetNote: Note | null,
+): Note | null {
+  return reading?.target ?? targetNote;
+}
+
+// The treble stave strip (practice.tuner/REQ-005): the heard note as a
+// drifting whole-note head along a dotted guide, its cents, a trail of the
+// last 2.5 s (the last 50 readings TunerScreen keeps), the pinned target as
+// a grey head to the right, 8va/8vb/15ma/15mb past the ledger range, and
+// the HEARD / "<note> IS" Hz column.
+export function TunerStave(props: {
+  readonly tuner: TunerSnapshot;
+  readonly trail: readonly NoteJudged[];
+}): JSX.Element {
+  const { tuner: snapshot, trail } = props;
+  const reading = snapshot.reading;
+  const targetNote = snapshot.targetNote;
+
+  const heard =
+    reading === null
+      ? null
+      : placeHeard(reading.heard.nearest, reading.heard.cents);
+  const target = targetNote === null ? null : placeTarget(targetNote);
+
+  const tone =
+    reading === null ? tuner.inTune : TONE_BY_VERDICT[reading.verdict];
+
+  const heardMarkY =
+    heard !== null && heard.position.mark !== ""
+      ? octaveMarkY(heard.position.mark, heard.position.y, heard.hy)
+      : null;
+  const targetMarkYValue =
+    target !== null && target.position.mark !== ""
+      ? targetMarkY(target.position.mark, target.position.y)
+      : null;
+
+  // Centre whatever is drawn (clef, lines, heads, ledgers, labels) in the
+  // 144-tall card; top-align if it can't fit — the design's own pass
+  // (lines 1271-1279), reproduced with our simplified single-clef model.
+  const tops: number[] = [82];
+  const bots: number[] = [136];
+  let centsTop: number | null = null;
+  if (heard !== null) {
+    centsTop = Math.min(heard.position.y, heard.hy) - CENTS_TOP_OFFSET;
+    tops.push(centsTop, heard.hy - 8);
+    bots.push(heard.hy + 8, heard.position.y + 8);
+    if (heardMarkY !== null) {
+      tops.push(heardMarkY);
+      bots.push(heardMarkY + OCTAVE_MARK_HEIGHT);
+    }
+  }
+  if (target !== null) {
+    tops.push(target.position.y - 8);
+    bots.push(target.position.y + 8);
+    if (targetMarkYValue !== null) {
+      tops.push(targetMarkYValue);
+      bots.push(targetMarkYValue + OCTAVE_MARK_HEIGHT);
+    }
+  }
+  const top = Math.min(...tops);
+  const bot = Math.max(...bots);
+  const shift =
+    bot - top > CARD_HEIGHT - 16 ? 8 - top : CARD_HEIGHT / 2 - (top + bot) / 2;
+
+  // x runs from TRAIL_X_START (oldest, index 0) to TRAIL_X_END (newest, the
+  // last entry) — only meaningful with at least two points, so the branch
+  // above already guarantees `trail.length - 1` is never zero here.
+  const trailPoints =
+    heard === null || trail.length < 2
+      ? []
+      : trail.map((entry, index) => {
+          const placement = placeHeard(entry.heard.nearest, entry.heard.cents);
+          const x =
+            TRAIL_X_START +
+            index * ((TRAIL_X_END - TRAIL_X_START) / (trail.length - 1));
+          return `${x} ${placement.hy}`;
+        });
+  const trailPath =
+    trailPoints.length > 1 ? `M ${trailPoints.join(" L ")}` : null;
+
+  const referenceNote = referenceNoteOf(reading, targetNote);
+  const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
+  const referenceLabel =
+    referenceNote === null ? "—" : `${noteLabel(referenceNote)} IS`;
+  const heardHz = reading === null ? null : reading.heard.hz;
+
+  return (
+    <div
+      style={{
+        position: "relative",
+        width: CARD_WIDTH,
+        height: CARD_HEIGHT,
+        background: paper.card,
+        border: `1px solid ${paper.borderSoft}`,
+        borderRadius: 14,
+        boxSizing: "border-box",
+        overflow: "hidden",
+      }}
+    >
+      <div
+        style={{
+          position: "absolute",
+          top: 0,
+          left: 0,
+          right: 0,
+          height: SVG_HEIGHT,
+          transform: `translateY(${shift}px)`,
+        }}
+      >
+        <svg
+          viewBox={`0 0 ${CARD_WIDTH} ${SVG_HEIGHT}`}
+          width={CARD_WIDTH}
+          height={SVG_HEIGHT}
+          style={{ position: "absolute", top: -1, left: -1 }}
+        >
+          <defs>
+            <linearGradient
+              id={TRAIL_GRADIENT_ID}
+              gradientUnits="userSpaceOnUse"
+              x1={TRAIL_X_START}
+              y1={0}
+              x2={TRAIL_X_END}
+              y2={0}
+            >
+              <stop offset="0" stopColor={tone} stopOpacity={0} />
+              <stop offset="1" stopColor={tone} stopOpacity={0.75} />
+            </linearGradient>
+          </defs>
+          {heard !== null && (
+            <rect
+              x={BAND_X}
+              y={heard.position.y - BAND_TOP_OFFSET}
+              width={BAND_WIDTH}
+              height={BAND_HEIGHT}
+              rx={BAND_RADIUS}
+              fill={tuner.band}
+            />
+          )}
+          {STAVE_LINE_YS.map((y) => (
+            <line
+              key={y}
+              x1={STAVE_LINE_X1}
+              y1={y}
+              x2={STAVE_LINE_X2}
+              y2={y}
+              stroke={paper.inkSoft}
+              strokeWidth={STAVE_LINE_STROKE_WIDTH}
+            />
+          ))}
+          <line
+            x1={STAVE_LINE_X2}
+            y1={STAVE_TOP_LINE_Y}
+            x2={STAVE_LINE_X2}
+            y2={STAVE_BOTTOM_LINE_Y}
+            stroke={paper.inkSoft}
+            strokeWidth={END_BAR_STROKE_WIDTH}
+          />
+          {target !== null && (
+            <>
+              {target.ledgers.map((ledger, index) => (
+                <line
+                  key={index}
+                  x1={ledger.x1}
+                  y1={ledger.y}
+                  x2={ledger.x2}
+                  y2={ledger.y}
+                  stroke={paper.inkSoft}
+                  strokeWidth={LEDGER_STROKE_WIDTH}
+                />
+              ))}
+              <ellipse
+                data-testid="target-head"
+                cx={TARGET_X}
+                cy={target.position.y}
+                rx={HEAD_RX}
+                ry={HEAD_RY}
+                fill={tuner.targetHead}
+              />
+              <ellipse
+                cx={TARGET_X}
+                cy={target.position.y}
+                rx={HEAD_INNER_RX}
+                ry={HEAD_INNER_RY}
+                transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${TARGET_X} ${target.position.y})`}
+                fill={paper.card}
+              />
+            </>
+          )}
+          {heard !== null && (
+            <>
+              {heard.ledgers.map((ledger, index) => (
+                <line
+                  key={index}
+                  x1={ledger.x1}
+                  y1={ledger.y}
+                  x2={ledger.x2}
+                  y2={ledger.y}
+                  stroke={paper.inkSoft}
+                  strokeWidth={LEDGER_STROKE_WIDTH}
+                />
+              ))}
+              <line
+                x1={GUIDE_X1}
+                y1={heard.position.y}
+                x2={GUIDE_X2}
+                y2={heard.position.y}
+                stroke={paper.faint}
+                strokeWidth={GUIDE_STROKE_WIDTH}
+                strokeDasharray={GUIDE_DASH}
+              />
+              {trailPath !== null && (
+                <path
+                  data-testid="trail"
+                  d={trailPath}
+                  fill="none"
+                  stroke={`url(#${TRAIL_GRADIENT_ID})`}
+                  strokeWidth={TRAIL_STROKE_WIDTH}
+                  strokeLinecap="round"
+                  strokeLinejoin="round"
+                />
+              )}
+              <g
+                data-testid="heard-head"
+                style={{ transform: `translateY(${pxValue(heard.hy)})` }}
+              >
+                <ellipse
+                  cx={HEARD_X}
+                  cy={0}
+                  rx={HEAD_RX}
+                  ry={HEAD_RY}
+                  fill={tone}
+                />
+                <ellipse
+                  cx={HEARD_X}
+                  cy={0}
+                  rx={HEAD_INNER_RX}
+                  ry={HEAD_INNER_RY}
+                  transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${HEARD_X} 0)`}
+                  fill={paper.card}
+                />
+              </g>
+            </>
+          )}
+        </svg>
+        <div
+          style={{
+            position: "absolute",
+            left: CLEF_X,
+            top: CLEF_Y,
+            transform: "translate(-50%,-50%)",
+            fontFamily: fonts.music,
+            fontSize: CLEF_FONT_SIZE,
+            lineHeight: 1,
+            color: paper.inkSoft,
+          }}
+        >
+          {CLEF_GLYPH}
+        </div>
+        {target !== null &&
+          target.position.mark !== "" &&
+          targetMarkYValue !== null && (
+            <div
+              style={{
+                position: "absolute",
+                left: TARGET_X,
+                top: targetMarkYValue,
+                transform: "translateX(-50%)",
+                fontFamily: fonts.display,
+                fontSize: OCTAVE_MARK_FONT_SIZE,
+                fontStyle: "italic",
+                lineHeight: 1,
+                color: tuner.ghostInk,
+              }}
+            >
+              {target.position.mark}
+            </div>
+          )}
+        {target !== null &&
+          targetNote !== null &&
+          targetNote.accidental !== "natural" && (
+            <div
+              data-testid="target-accidental"
+              style={{
+                position: "absolute",
+                left: ACCIDENTAL_X_TARGET,
+                top:
+                  target.position.y +
+                  (targetNote.accidental === "flat"
+                    ? ACCIDENTAL_LOWERED_Y_ADJUST
+                    : 0),
+                transform: "translate(-50%,-50%)",
+                fontFamily: fonts.music,
+                fontSize: ACCIDENTAL_FONT_SIZE,
+                lineHeight: 1,
+                color: tuner.ghostInk,
+              }}
+            >
+              {ACCIDENTAL_GLYPH[targetNote.accidental]}
+            </div>
+          )}
+        {heard !== null &&
+          reading !== null &&
+          reading.heard.nearest.accidental !== "natural" && (
+            <div
+              data-testid="heard-accidental"
+              style={{
+                position: "absolute",
+                left: ACCIDENTAL_X_HEARD,
+                top:
+                  heard.hy +
+                  (reading.heard.nearest.accidental === "flat"
+                    ? ACCIDENTAL_LOWERED_Y_ADJUST
+                    : 0),
+                transform: "translate(-50%,-50%)",
+                fontFamily: fonts.music,
+                fontSize: ACCIDENTAL_FONT_SIZE,
+                lineHeight: 1,
+                color: tone,
+              }}
+            >
+              {ACCIDENTAL_GLYPH[reading.heard.nearest.accidental]}
+            </div>
+          )}
+        {heard !== null && reading !== null && centsTop !== null && (
+          <div
+            data-testid="strip-cents"
+            style={{
+              position: "absolute",
+              left: CENTS_X,
+              top: centsTop,
+              transform: "translateX(-50%)",
+              fontFamily: fonts.mono,
+              fontSize: CENTS_FONT_SIZE,
+              fontWeight: 600,
+              lineHeight: 1,
+              color: tone,
+              whiteSpace: "nowrap",
+            }}
+          >
+            {formatCents(reading.heard.cents)}
+          </div>
+        )}
+        {heard !== null &&
+          heard.position.mark !== "" &&
+          heardMarkY !== null && (
+            <div
+              style={{
+                position: "absolute",
+                left: HEARD_X,
+                top: heardMarkY,
+                transform: "translateX(-50%)",
+                fontFamily: fonts.display,
+                fontSize: OCTAVE_MARK_FONT_SIZE,
+                fontStyle: "italic",
+                lineHeight: 1,
+                color: paper.inkSoft,
+              }}
+            >
+              {heard.position.mark}
+            </div>
+          )}
+      </div>
+      <div
+        style={{
+          position: "absolute",
+          left: COLUMN_LEFT,
+          right: COLUMN_RIGHT,
+          top: COLUMN_TOP,
+          bottom: COLUMN_BOTTOM,
+          display: "flex",
+          flexDirection: "column",
+          justifyContent: "space-between",
+        }}
+      >
+        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
+          <div
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: COLUMN_CAPTION_FONT_SIZE,
+              letterSpacing: COLUMN_CAPTION_LETTER_SPACING,
+              color: paper.faint,
+            }}
+          >
+            HEARD
+          </div>
+          <div
+            data-testid="heard-hz"
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: COLUMN_VALUE_FONT_SIZE,
+              fontWeight: 600,
+              color: tone,
+            }}
+          >
+            {hzText(heardHz)}
+          </div>
+        </div>
+        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
+          <div
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: COLUMN_CAPTION_FONT_SIZE,
+              letterSpacing: COLUMN_CAPTION_LETTER_SPACING,
+              color: paper.faint,
+            }}
+          >
+            {referenceLabel}
+          </div>
+          <div
+            data-testid="reference-hz"
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: COLUMN_VALUE_FONT_SIZE,
+              fontWeight: 600,
+              color: REFERENCE_VALUE_INK,
+            }}
+          >
+            {hzText(referenceHz)}
+          </div>
+        </div>
+      </div>
+    </div>
+  );
+}
diff --git a/src/ui/key-label.ts b/src/ui/key-label.ts
index cde5c10..aca5c33 100644
--- a/src/ui/key-label.ts
+++ b/src/ui/key-label.ts
@@ -1,8 +1,30 @@
-import type { Key, Scale } from "../theory/published";
+import type { Key, Note, NoteLetter, Scale } from "../theory/published";
 import { pitchClassLabel } from "../theory/published";
 
 export { pitchClassLabel, noteLabel } from "../theory/published";
 
+const DIATONIC_LETTERS: readonly NoteLetter[] = [
+  "C",
+  "D",
+  "E",
+  "F",
+  "G",
+  "A",
+  "B",
+];
+
+// The diatonic staff-position index shared by every hand-drawn stave in
+// this app (StaveView's run, TunerStave's strip, T016): natural staff steps
+// from C0, so consecutive natural letters are always 1 apart regardless of
+// accidental. Extracted from StaveView.tsx's own private `diatonicIndex()`
+// (itself copied verbatim from the vendored visual reference — see that
+// file's module comment) once TunerStave needed the same arithmetic, rather
+// than duplicating it (docs/engineering.md, AGENTS.md "things agents get
+// wrong here").
+export function diatonicIndex(note: Note): number {
+  return note.octave * 7 + DIATONIC_LETTERS.indexOf(note.letter);
+}
+
 // practice.session/REQ-012 — the heading names the tonic and the chosen
 // scale's own title, not a fixed "major"/"minor" suffix: the two home
 // scales' titles ("major", "minor") reproduce the old heading exactly,
diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
new file mode 100644
index 0000000..05591c1
--- /dev/null
+++ b/tests/ui/scenarios/tuner-helpers.ts
@@ -0,0 +1,74 @@
+import { createElement, type ComponentProps } from "react";
+import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { expect } from "vitest";
+import type { Session } from "../../../src/practice/published";
+import { builtInCatalogue } from "../../../src/theory/published";
+import { App } from "../../../src/ui/App";
+import { localStorageSelectionStore } from "../../../src/ui/selection-store";
+import {
+  FakeClock,
+  FakeListening,
+  sessionDepsWithFakes,
+} from "../../practice/fakes";
+
+// Shared by tuner-screen.test.tsx (T015) and tuner-stave.test.tsx (T016) —
+// moved out of tuner-screen.test.tsx once a second file needed it. Renders
+// <App>, opens the tuner, and feeds one steady pitch through the fake
+// listening port — `listening.feed(hz)` publishes it, `clock.advanceMs(1)`
+// runs the session's commit-on-next-tick timer (domain/session.ts's
+// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
+// state update. `spelling` optionally taps the circle's ♭ control before
+// entering (theory.circle-of-fifths/REQ-002, exercised the same way
+// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
+// without duplicating the render/open dance. `extraProps` lets a scenario
+// override any of <App>'s own props (e.g. a different catalogue) without
+// re-deriving the whole render/open dance itself.
+//
+// Plain `.ts` (not `.tsx`) per the brief — `createElement` stands in for
+// JSX so the file needs no JSX transform.
+//
+// A scenario may call this more than once (tuner-stave.test.tsx's
+// REQ-005/S3 feeds two separate frequencies to see how the strip writes
+// each) — `cleanup()` here tears down any previous render first, so a
+// second call gets a fresh `<App>` rather than a second one stacked beside
+// it (each test file's own `afterEach(cleanup)` still handles the last one).
+export async function enterAndHear(
+  hz: number,
+  spelling?: "sharp" | "flat",
+  extraProps?: Partial<ComponentProps<typeof App>>,
+): Promise<{
+  readonly listening: FakeListening;
+  readonly clock: FakeClock;
+  readonly session: Session;
+}> {
+  cleanup();
+  localStorage.clear();
+  const { sessionDeps, listening, clock } = sessionDepsWithFakes();
+  let session: Session | null = null;
+  render(
+    createElement(App, {
+      catalogue: builtInCatalogue(),
+      selectionStore: localStorageSelectionStore(localStorage),
+      sessionDeps,
+      onSessionReady: (readySession: Session) => {
+        session = readySession;
+      },
+      ...extraProps,
+    }),
+  );
+  if (spelling === "flat") {
+    await userEvent.click(screen.getByRole("button", { name: "flat" }));
+  }
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await waitFor(() =>
+    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
+  );
+  listening.feed(hz);
+  clock.advanceMs(1);
+  await act(async () => {});
+  if (session === null) {
+    throw new Error("unreachable: onSessionReady was not called by render()");
+  }
+  return { listening, clock, session };
+}
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index 6ebd754..742b6c6 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -1,15 +1,11 @@
 import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { afterEach, expect, test } from "vitest";
-import type { Session } from "../../../src/practice/published";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
-import {
-  FakeClock,
-  FakeListening,
-  sessionDepsWithFakes,
-} from "../../practice/fakes";
+import { sessionDepsWithFakes } from "../../practice/fakes";
+import { enterAndHear } from "./tuner-helpers";
 
 // No global `afterEach` in scope (vitest globals are off), so
 // @testing-library/react's automatic cleanup never registers itself; without
@@ -19,51 +15,8 @@ afterEach(() => {
   cleanup();
 });
 
-// T015's shared fixture (reused by T017/T018): renders `<App>`, opens the
-// tuner, and feeds one steady pitch through the fake listening port —
-// `listening.feed(hz)` publishes it, `clock.advanceMs(1)` runs the
-// session's commit-on-next-tick timer (domain/session.ts's
-// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
-// state update. `spelling` optionally taps the circle's ♭ control before
-// entering (theory.circle-of-fifths/REQ-002, exercised the same way
-// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
-// without duplicating the render/open dance.
-async function enterAndHear(
-  hz: number,
-  spelling?: "sharp" | "flat",
-): Promise<{
-  readonly listening: FakeListening;
-  readonly clock: FakeClock;
-  readonly session: Session;
-}> {
-  localStorage.clear();
-  const { sessionDeps, listening, clock } = sessionDepsWithFakes();
-  let session: Session | null = null;
-  render(
-    <App
-      catalogue={builtInCatalogue()}
-      selectionStore={localStorageSelectionStore(localStorage)}
-      sessionDeps={sessionDeps}
-      onSessionReady={(readySession) => {
-        session = readySession;
-      }}
-    />,
-  );
-  if (spelling === "flat") {
-    await userEvent.click(screen.getByRole("button", { name: "flat" }));
-  }
-  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
-  await waitFor(() =>
-    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
-  );
-  listening.feed(hz);
-  clock.advanceMs(1);
-  await act(async () => {});
-  if (session === null) {
-    throw new Error("unreachable: onSessionReady was not called by render()");
-  }
-  return { listening, clock, session };
-}
+// T015's shared fixture (reused by T016/T017/T018) — moved to
+// ./tuner-helpers.ts once tuner-stave.test.tsx needed it too.
 
 test("practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows", async () => {
   localStorage.clear();
diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
new file mode 100644
index 0000000..b2bddfb
--- /dev/null
+++ b/tests/ui/scenarios/tuner-stave.test.tsx
@@ -0,0 +1,73 @@
+import { act, cleanup, screen } from "@testing-library/react";
+import { afterEach, expect, test } from "vitest";
+import { enterAndHear } from "./tuner-helpers";
+
+// No global `afterEach` in scope (vitest globals are off), so
+// @testing-library/react's automatic cleanup never registers itself; without
+// this, each test's render would still be in the DOM for the next test
+// (the pattern of tuner-screen.test.tsx).
+afterEach(() => {
+  cleanup();
+});
+
+test("practice.tuner/REQ-005/S1 — A4 a little sharp", async () => {
+  await enterAndHear(445.0);
+  expect(screen.getByTestId("heard-head").style.transform).toBe(
+    "translateY(109.6px)",
+  ); // A4: i = 33, guide y = 111, −20·0.07
+  expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
+  expect(screen.getByTestId("strip-cents").style.color).toBe(
+    "oklch(0.55 0.11 28)",
+  );
+  expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
+  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
+  expect(screen.getByText("A4 IS")).toBeTruthy();
+  expect(screen.queryByText("8va")).toBeNull();
+});
+
+test("practice.tuner/REQ-005/S2 — a flat accidental", async () => {
+  await enterAndHear(461.0, "flat");
+  expect(screen.getByTestId("heard-accidental").textContent).toBe("♭");
+  expect(screen.getByTestId("heard-head").style.transform).toBe(
+    "translateY(107.33px)",
+  ); // B♭4: i = 34, guide 106, −(−19)·0.07 = +1.33
+  expect(screen.getByTestId("strip-cents").textContent).toBe("−19");
+});
+
+test("practice.tuner/REQ-005/S3 — the low end takes 8vb", async () => {
+  await enterAndHear(82.41);
+  expect(screen.getByText("8vb")).toBeTruthy();
+  expect(screen.getByTestId("heard-head").style.transform).toBe(
+    "translateY(161px)",
+  ); // written at E3, i = 23
+  await enterAndHear(65.41);
+  expect(screen.getByText("15mb")).toBeTruthy(); // C2 → written C4, i = 28 → y 136
+});
+
+test("practice.tuner/REQ-005/S4 — the target beside the heard note", async () => {
+  const f = await enterAndHear(440.0);
+  act(() => {
+    f.session.pinTarget(69);
+  });
+  f.listening.feed(523.25);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("heard-head").style.transform).toBe(
+    "translateY(101px)",
+  ); // C5, i = 35
+  expect(screen.getByTestId("target-head").getAttribute("cy")).toBe("111");
+  expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
+  expect(screen.getByText("A4 IS")).toBeTruthy();
+});
+
+test("practice.tuner/REQ-005 — the trail keeps the last 50 readings, oldest first", async () => {
+  const f = await enterAndHear(440.0);
+  for (let k = 0; k < 60; k += 1) {
+    f.listening.feed(440.0 + k * 0.1);
+    f.clock.advanceMs(1);
+    await act(async () => {});
+  }
+  expect(
+    screen.getByTestId("trail").getAttribute("d")!.split(" L "),
+  ).toHaveLength(50);
+});
```

<!-- recorded 2026-09-28T11:52:58Z by scripts/record.sh -->
