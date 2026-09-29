---
type: Task Review
title: Review package — T035 · 007-hear-me
description: The diff produced for T035, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T035.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T035.md
  - resource: git:fa67bcd9931bd39fc28d8c64dead010f5c9fe169..92bf8b407057c81c40c9a3078bec588241eb1baf
generated:
  by: process:review-package.sh
  at: 2026-09-29T20:36:18Z
sdd_id: 007-hear-me
---

# Review package — T035 · 007-hear-me

base: `fa67bcd9931bd39fc28d8c64dead010f5c9fe169` → head: `92bf8b407057c81c40c9a3078bec588241eb1baf`

## Files changed

- M	scripts/tuner-timing-test.mjs
- M	src/practice/published/note-judged.schema.ts
- M	src/ui/TargetSheet.tsx
- M	src/ui/TunerLevel.tsx
- M	src/ui/TunerStave.tsx
- M	tests/practice/scenarios/tuner-budget.test.ts
- M	tests/practice/scenarios/tuner-reading.test.ts
- M	tests/ui/scenarios/target-sheet.test.tsx
- M	tests/ui/scenarios/tuner-layout.test.tsx
- M	tests/ui/scenarios/tuner-linger.test.tsx
- M	tests/ui/scenarios/tuner-stave.test.tsx

## Diff

```diff
diff --git a/scripts/tuner-timing-test.mjs b/scripts/tuner-timing-test.mjs
index e9af67a..c5024da 100644
--- a/scripts/tuner-timing-test.mjs
+++ b/scripts/tuner-timing-test.mjs
@@ -384,10 +384,18 @@ function measureInPage(params) {
     let steadyCount = 0;
     let maxCentsErr = 0;
     let maxShownCentsErr = 0;
+    // converge round 1 (W4) — the cents-error and shown-offset gates below
+    // started each tone's worst-case at 0 and never checked that a
+    // qualifying reading actually arrived, so a regression that silenced
+    // readings after the settle point could pass silently. These count the
+    // readings each gate actually saw; sweepRow requires both non-zero.
+    let centsErrReadings = 0;
+    let shownErrReadings = 0;
     const unsubscribeJudged = noteJudgedSubscribe((event) => {
       const now = performance.now();
       if (now >= steadyStartMs && now < steadyEndMs) steadyCount += 1;
       if (now - onsetPerfMs >= centsSkipMs) {
+        centsErrReadings += 1;
         const err = Math.abs(1200 * Math.log2(event.heard.hz / hz));
         if (err > maxCentsErr) maxCentsErr = err;
       }
@@ -395,6 +403,7 @@ function measureInPage(params) {
       // sees: NoteJudged.target + .cents), read from SHOWN_SETTLE_MS into
       // the tone onward, against the tone actually fed.
       if (now - onsetPerfMs >= shownSettleMs) {
+        shownErrReadings += 1;
         const shownErr = Math.abs(
           (positionOfNote(event.target) - position) * 100 + event.cents,
         );
@@ -423,6 +432,8 @@ function measureInPage(params) {
         steadyCount / ((steadyEndFraction - steadyStartFraction) * toneSeconds),
       maxCentsErr,
       maxShownCentsErr,
+      centsErrReadings,
+      shownErrReadings,
     };
   }
 
@@ -641,12 +652,26 @@ function sweepRow(label, perTone) {
   );
   const centsErrMax = maxOf(perTone.map((tone) => tone.maxCentsErr));
   const shownCentsErrMax = maxOf(perTone.map((tone) => tone.maxShownCentsErr));
+  // converge round 1 (W4) — centsErrMax/shownCentsErrMax both start at 0 and
+  // a tone that never took a qualifying reading (its `if` above never ran)
+  // would silently report 0, the same value as a perfect reading. Requiring
+  // every tone's counter to be non-zero closes that hole.
+  const tonesWithNoCentsReading = perTone.filter(
+    (tone) => tone.centsErrReadings === 0,
+  );
+  const tonesWithNoShownReading = perTone.filter(
+    (tone) => tone.shownErrReadings === 0,
+  );
+  const everyToneRead =
+    tonesWithNoCentsReading.length === 0 &&
+    tonesWithNoShownReading.length === 0;
   const passed =
     firstReadoutMaxMs <= FIRST_READOUT_MAX_MS &&
     arrivalAgeMaxMs <= ARRIVAL_AGE_MAX_MS &&
     readingsPerSecondMin >= READINGS_PER_SECOND_MIN &&
     centsErrMax <= CENTS_ERROR_MAX_CENTS &&
-    shownCentsErrMax <= SHOWN_CENTS_ERROR_MAX_CENTS;
+    shownCentsErrMax <= SHOWN_CENTS_ERROR_MAX_CENTS &&
+    everyToneRead;
 
   const worstFirstReadout = worstToneOf(perTone, (tone) => tone.firstReadoutMs);
   const worstArrival = worstToneOf(perTone, (tone) => tone.arrivalAgeMs);
@@ -659,6 +684,20 @@ function sweepRow(label, perTone) {
     `${worstArrival.arrivalAgeMs === null ? "n/a" : worstArrival.arrivalAgeMs.toFixed(2)} ms · ` +
     `cents err ${noteLabelOfPosition(worstCents.position)} ${worstCents.maxCentsErr.toFixed(2)} ¢ · ` +
     `shown err ${noteLabelOfPosition(worstShown.position)} ${worstShown.maxShownCentsErr} ¢`;
+  // Only printed when the counter gate actually failed — names the tone(s)
+  // that took no qualifying reading, rather than the generic FAIL message
+  // restating the numeric gates (which would say nothing new here).
+  const noReadingLine = everyToneRead
+    ? undefined
+    : `  no qualifying reading: ` +
+      [
+        ...tonesWithNoCentsReading.map(
+          (tone) => `cents err ${noteLabelOfPosition(tone.position)}`,
+        ),
+        ...tonesWithNoShownReading.map(
+          (tone) => `shown err ${noteLabelOfPosition(tone.position)}`,
+        ),
+      ].join(", ");
 
   return {
     cells: [
@@ -674,6 +713,7 @@ function sweepRow(label, perTone) {
     ],
     passed,
     worstLine,
+    noReadingLine,
   };
 }
 
@@ -831,6 +871,7 @@ async function main() {
     // rather than lost in the row's aggregate max.
     for (const row of rows) {
       if (row.worstLine !== undefined) console.log(row.worstLine);
+      if (row.noReadingLine !== undefined) console.log(row.noReadingLine);
     }
     allPassed = rows.every((row) => row.passed);
   } catch (error) {
diff --git a/src/practice/published/note-judged.schema.ts b/src/practice/published/note-judged.schema.ts
index cb4e845..a5230fe 100644
--- a/src/practice/published/note-judged.schema.ts
+++ b/src/practice/published/note-judged.schema.ts
@@ -3,16 +3,25 @@ import type { Note } from "../../theory/published";
 
 // NoteJudged — practice.tuner/REQ-002, REQ-004: one per shown reading, the
 // tuner's translation of listening's PitchDetected into "how far off, from
-// what". It never crosses a network or worker boundary (unlike
-// PitchDetected, which does and so is Zod-parsed at that seam) — it is
-// produced in-process by this context's own pure functions (domain/tuner.ts)
-// and consumed by the UI, so it is a plain TS interface, not a Zod object
-// (docs/engineering.md §3: parsing is for untrusted input at a boundary,
-// not for values this context already typed correctly). Its wire shape, if
-// one is ever needed (a remote harness, say), is this interface.
+// what". docs/domain.md's Events table names this file as NoteJudged's
+// schema, same as every sibling published event (target-advanced.schema.ts,
+// listening's pitch-detected.schema.ts) — schema-first is the rule for a
+// published event regardless of whether it happens to cross a runtime
+// boundary today (docs/engineering.md §8). noteSchema mirrors
+// theory/published's Note — letters A–G, accidental natural|sharp|flat, an
+// integer octave — without importing theory's internals. NoteJudged is
+// produced and consumed in-process, so nothing here calls `.parse()` in
+// production; the schema exists as the documented contract, not as active
+// parsing of an in-process value.
 export const verdictSchema = z.enum(["sharp", "flat", "in-tune"]);
 export type Verdict = z.infer<typeof verdictSchema>;
 
+const noteSchema = z.object({
+  letter: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
+  accidental: z.enum(["natural", "sharp", "flat"]),
+  octave: z.number().int(),
+}) satisfies z.ZodType<Note>;
+
 export interface NoteJudged {
   readonly target: Note; // the pinned target, or the nearest note (with hysteresis) on auto
   readonly cents: number; // signed, whole cents from `target` — may exceed ±50 only when pinned
@@ -24,3 +33,15 @@ export interface NoteJudged {
   };
   readonly atFrame: number;
 }
+
+export const noteJudgedSchema = z.object({
+  target: noteSchema,
+  cents: z.number(),
+  verdict: verdictSchema,
+  heard: z.object({
+    hz: z.number(),
+    nearest: noteSchema,
+    cents: z.number(),
+  }),
+  atFrame: z.number().nonnegative(),
+}) satisfies z.ZodType<NoteJudged>;
diff --git a/src/ui/TargetSheet.tsx b/src/ui/TargetSheet.tsx
index 8cea338..6fc11df 100644
--- a/src/ui/TargetSheet.tsx
+++ b/src/ui/TargetSheet.tsx
@@ -40,7 +40,7 @@ const AUTO_CARD_BACKGROUND_ON = paper.pillActive;
 const AUTO_TICK_COLOR = paper.accent;
 
 const HOLD_CARD_BORDER_ON = "#e0d7c5";
-const HOLD_CARD_BORDER_OFF = "#ece4d5";
+const HOLD_CARD_BORDER_OFF = paper.hairlineSoft;
 const HOLD_TITLE_COLOR_ON = paper.ink;
 const HOLD_TITLE_COLOR_OFF = "#b0a797";
 const HOLD_NAME_FONT_SIZE = 13;
diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
index 4b33f7b..0e58a9c 100644
--- a/src/ui/TunerLevel.tsx
+++ b/src/ui/TunerLevel.tsx
@@ -78,10 +78,21 @@ const LINE_RADIUS = 4;
 const LINE_TOP_ADJUST = 3.5;
 const LINE_CENTS_LIMIT = 50;
 
-// The tag: tagTop = cents >= 0 ? lineTop - 36 : lineTop + 8.
+// The tag: tagTop = cents >= 0 ? lineTop - 36 : lineTop + 8, clamped within
+// the level's own height (converge round 1 W2, Tuner.dc.html:1292's
+// `Math.max(30, Math.min(536 - 62, L4.tagTop))`) so the tag never runs off
+// the level's own top or bottom edge. Past ±50 ¢ pinned (`over`, the line
+// pinned to the rule's edge) the tag instead swaps to the OPPOSITE side of
+// the line from the normal rule — sharp-over below it, flat-over above —
+// so it never covers the header's LISTENING / NO MIC: TAG_ABOVE_OFFSET
+// (36) is reused for the sharp-over case (same magnitude, other side);
+// TAG_OVER_ABOVE_OFFSET (58) is the flat-over case's own, larger offset.
 const TAG_RIGHT = 24;
 const TAG_ABOVE_OFFSET = 36;
 const TAG_BELOW_OFFSET = 8;
+const TAG_OVER_ABOVE_OFFSET = 58;
+const TAG_CLAMP_TOP_MARGIN = 30;
+const TAG_CLAMP_BOTTOM_MARGIN = 62;
 const TAG_GAP = 6;
 const TAG_PADDING = "2px 0";
 const TAG_RADIUS = 6;
@@ -145,10 +156,16 @@ function roundPx(value: number): number {
 // The reading's line + tag, clamped to the rule's ±50 ¢ edge when a pinned
 // target's offset runs past it (practice.tuner/REQ-004) — the line stays
 // at the edge and the tag switches to "▲ N st" / "▼ N st". `areaMid`/
-// `pxPerCent` parameterised the same way `buildTicks` is.
-function readingGeometry(
+// `pxPerCent` parameterised the same way `buildTicks` is; `areaHeight` is
+// threaded through explicitly (rather than assumed to be `2 * areaMid`) so
+// the clamp margins below can scale by the level's own `ratio` without
+// relying on that always holding. Exported, like `levelGeometryFor`, so its
+// own height-dependent shape can be tested directly — jsdom never actually
+// measures a rendered TunerLevel past the 536 px fallback.
+export function readingGeometry(
   reading: NoteJudged,
   areaMid: number,
+  areaHeight: number,
   pxPerCent: number,
 ): {
   readonly lineTop: number;
@@ -163,10 +180,30 @@ function readingGeometry(
     Math.min(LINE_CENTS_LIMIT, cents),
   );
   const lineTop = roundPx(areaMid - lineCents * pxPerCent - LINE_TOP_ADJUST);
-  const tagTop =
-    lineCents >= 0 ? lineTop - TAG_ABOVE_OFFSET : lineTop + TAG_BELOW_OFFSET;
-  const tone = TONE_BY_VERDICT[reading.verdict];
   const over = Math.abs(cents) > LINE_CENTS_LIMIT;
+  // converge round 1 (W2) — past ±50 ¢ pinned, the tag sits on the
+  // OPPOSITE side of the line from the normal rule (Tuner.dc.html:1292), so
+  // it never runs off the level's own top or bottom edge and never covers
+  // the header. Otherwise (not over), the normal rule's placement is
+  // additionally clamped within the level's own height, its two margins
+  // scaled by `ratio` the same way `levelGeometryFor` scales everything
+  // else, so the tag still clears the header at the level's minimum
+  // height too, not just at AREA_HEIGHT (536 px).
+  const ratio = areaHeight / AREA_HEIGHT;
+  const tagTop = over
+    ? cents > 0
+      ? lineTop + TAG_ABOVE_OFFSET
+      : lineTop - TAG_OVER_ABOVE_OFFSET
+    : Math.max(
+        ratio * TAG_CLAMP_TOP_MARGIN,
+        Math.min(
+          areaHeight - ratio * TAG_CLAMP_BOTTOM_MARGIN,
+          lineCents >= 0
+            ? lineTop - TAG_ABOVE_OFFSET
+            : lineTop + TAG_BELOW_OFFSET,
+        ),
+      );
+  const tone = TONE_BY_VERDICT[reading.verdict];
   const primaryText = over
     ? `${cents > 0 ? "▲" : "▼"} ${semitoneCountOf(cents)} st`
     : formatCents(cents);
@@ -293,6 +330,7 @@ export function TunerLevel(props: {
       : readingGeometry(
           effectiveReading,
           levelGeometry.areaMid,
+          levelGeometry.areaHeight,
           levelGeometry.pxPerCent,
         );
   // practice.tuner/REQ-003 — grey while lingering. Only read when `geometry`
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index 8775990..4ff0d2e 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -117,14 +117,35 @@ function heardWrittenPositionOf(
   return { index, y: writtenY(index), mark: octaveMarkOf(adj + ownShift) };
 }
 
+// practice.tuner/REQ-002, REQ-005 (converge round 1, W1) — the note and
+// cents the stave's head, its trail and its accidental show: pinned, "the
+// note nearest the detected pitch" (REQ-005) — the raw heard note, exactly
+// as before; on auto, the same hysteresis-held note and offset the level
+// itself shows (`judged.target`/`.cents`), not the raw nearest note
+// (`judged.heard.nearest`/`.cents`), so the stave never disagrees with the
+// level in the 50-56 ¢ hand-over band (`snapshot.targetNote`, non-null only
+// when pinned).
+function headReadingOf(
+  judged: NoteJudged,
+  targetNote: Note | null,
+): { readonly note: Note; readonly cents: number } {
+  return targetNote !== null
+    ? { note: judged.heard.nearest, cents: judged.heard.cents }
+    : { note: judged.target, cents: judged.cents };
+}
+
 // The raw index that governs the register decision: the pinned target when
-// there is one, else the heard note (the design's `ref`).
+// there is one, else the heard note (the design's `ref`) — the same note
+// `headReadingOf` would show, so the register never shifts under a note the
+// head itself no longer draws.
 function referenceRawIndexOf(
   targetNote: Note | null,
   reading: NoteJudged | null,
 ): number | null {
   if (targetNote !== null) return diatonicIndex(targetNote);
-  if (reading !== null) return diatonicIndex(reading.heard.nearest);
+  if (reading !== null) {
+    return diatonicIndex(headReadingOf(reading, targetNote).note);
+  }
   return null;
 }
 
@@ -302,6 +323,10 @@ function targetMarkY(mark: OctaveMark, y: number): number {
 // (practice.tuner/REQ-003/S2), else the reading's own nearest note
 // (`reading.target` already carries whichever governs measurement — the
 // pinned target, or the hysteresis-tracked nearest note on auto).
+// practice.tuner/REQ-003/S4, S6 (converge round 1, I6) — takes the
+// live-or-lingering reading (`effectiveReading`, not the live-only
+// `reading`), so the caption lingers and fades with the "HEARD" caption
+// rather than clearing to "— IS" the instant a reading goes null.
 function referenceNoteOf(
   reading: NoteJudged | null,
   targetNote: Note | null,
@@ -363,32 +388,47 @@ export function TunerStave(props: {
   // note stands in instead (practice.tuner/REQ-005's amendment) rather than
   // the trail snapping to the un-shifted register.
   const newestTrailPoint = trail.length > 0 ? trail[trail.length - 1]! : null;
+  // The same note/cents pair `headReadingOf` gives the live/lingering head,
+  // so the trail's own register fallback (below) and its newest-point
+  // placement (`layoutHeard`, below) never draw a note the head itself
+  // would disagree with.
+  const newestTrailHeadReading =
+    newestTrailPoint === null
+      ? null
+      : headReadingOf(newestTrailPoint.reading, targetNote);
   const trailReferenceRawIndex =
     referenceRawIndex !== null
       ? referenceRawIndex
-      : newestTrailPoint === null
+      : newestTrailHeadReading === null
         ? null
-        : diatonicIndex(newestTrailPoint.reading.heard.nearest);
+        : diatonicIndex(newestTrailHeadReading.note);
   const trailAdj =
     trailReferenceRawIndex === null ? 0 : registerAdjOf(trailReferenceRawIndex);
 
+  // practice.tuner/REQ-002, REQ-005 (converge round 1, W1) — `headReadingOf`
+  // is the raw heard note when pinned, the same hysteresis-held note/offset
+  // the level itself shows on auto: the head, its accidental and its cents
+  // text below all read off this, not `reading.heard`/`effectiveReading.
+  // heard` directly.
+  const headReading =
+    reading === null ? null : headReadingOf(reading, targetNote);
   const heard =
-    reading === null
+    headReading === null
       ? null
-      : placeHeard(reading.heard.nearest, reading.heard.cents, adj);
+      : placeHeard(headReading.note, headReading.cents, adj);
   const target = targetNote === null ? null : placeTarget(targetNote, adj);
   // practice.tuner/REQ-003 — the head/cents/Hz's own placement, off
   // `effectiveReading` rather than `heard` (which stays live-only, still
   // governing the ledgers/guide/accidental below): identical to `heard`
   // while live, and the last reading's placement while it lingers.
-  const heardStale =
+  const effectiveHeadReading =
     effectiveReading === null
       ? null
-      : placeHeard(
-          effectiveReading.heard.nearest,
-          effectiveReading.heard.cents,
-          adj,
-        );
+      : headReadingOf(effectiveReading, targetNote);
+  const heardStale =
+    effectiveHeadReading === null
+      ? null
+      : placeHeard(effectiveHeadReading.note, effectiveHeadReading.cents, adj);
 
   const tone =
     reading === null ? paper.faint : TONE_BY_VERDICT[reading.verdict];
@@ -438,11 +478,11 @@ export function TunerStave(props: {
   const layoutHeard =
     heardStale !== null
       ? heardStale
-      : newestTrailPoint === null
+      : newestTrailHeadReading === null
         ? null
         : placeHeard(
-            newestTrailPoint.reading.heard.nearest,
-            newestTrailPoint.reading.heard.cents,
+            newestTrailHeadReading.note,
+            newestTrailHeadReading.cents,
             trailAdj,
           );
   const layoutHeardMarkY =
@@ -497,15 +537,14 @@ export function TunerStave(props: {
   // threshold on its own — matching the design's own `p.tot` applied
   // uniformly across `hist` (lines 1257-1264).
   const trailRenderPoints = trail
-    .map((point) => ({
-      x: trailXOf(nowMs - point.atMs),
-      y: placeHeard(
-        point.reading.heard.nearest,
-        point.reading.heard.cents,
-        trailAdj,
-      ).hy,
-      runId: point.runId,
-    }))
+    .map((point) => {
+      const pointReading = headReadingOf(point.reading, targetNote);
+      return {
+        x: trailXOf(nowMs - point.atMs),
+        y: placeHeard(pointReading.note, pointReading.cents, trailAdj).hy,
+        runId: point.runId,
+      };
+    })
     .filter((point) => point.x >= TRAIL_X_START && point.x <= TRAIL_X_END);
 
   // One sub-path per run (S6) — a run with a single point draws nothing for
@@ -530,10 +569,16 @@ export function TunerStave(props: {
   flushCurrentRun();
   const trailPath = runSubpaths.length > 0 ? runSubpaths.join(" ") : null;
 
-  const referenceNote = referenceNoteOf(reading, targetNote);
+  const referenceNote = referenceNoteOf(effectiveReading, targetNote);
   const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
   const referenceLabel =
     referenceNote === null ? "— IS" : `${noteLabel(referenceNote)} IS`;
+  // practice.tuner/REQ-003/S4, S6 (converge round 1, I6) — greyed while the
+  // head lingers (`headStaleAttrs`, the same flag the "HEARD" value carries),
+  // full ink otherwise — including REQ-003/S2's silence-with-a-target case,
+  // where nothing has ever lingered and `headStaleAttrs` stays `undefined`.
+  const referenceInk =
+    headStaleAttrs !== undefined ? paper.faint : paper.inkMid;
   // practice.tuner/REQ-003 — off `effectiveReading`, so the Hz figure
   // lingers with the rest.
   const heardHz = effectiveReading === null ? null : effectiveReading.heard.hz;
@@ -799,8 +844,8 @@ export function TunerStave(props: {
             lingers with the head at the colour/opacity it carries, instead
             of losing its own sharp/flat while the head is still shown. */}
         {heardStale !== null &&
-          effectiveReading !== null &&
-          effectiveReading.heard.nearest.accidental !== "natural" && (
+          effectiveHeadReading !== null &&
+          effectiveHeadReading.note.accidental !== "natural" && (
             <div
               data-testid="heard-accidental"
               {...(headStaleAttrs !== undefined
@@ -814,7 +859,7 @@ export function TunerStave(props: {
                 left: ACCIDENTAL_X_HEARD,
                 top:
                   heardStale.hy +
-                  (effectiveReading.heard.nearest.accidental === "flat"
+                  (effectiveHeadReading.note.accidental === "flat"
                     ? ACCIDENTAL_LOWERED_Y_ADJUST
                     : 0),
                 transform: "translate(-50%,-50%)",
@@ -825,11 +870,11 @@ export function TunerStave(props: {
                 ...(headStaleAttrs?.style ?? {}),
               }}
             >
-              {ACCIDENTAL_GLYPH[effectiveReading.heard.nearest.accidental]}
+              {ACCIDENTAL_GLYPH[effectiveHeadReading.note.accidental]}
             </div>
           )}
         {heardStale !== null &&
-          effectiveReading !== null &&
+          effectiveHeadReading !== null &&
           centsTop !== null && (
             <div
               data-testid="strip-cents"
@@ -853,7 +898,7 @@ export function TunerStave(props: {
                 ...(headStaleAttrs?.style ?? {}),
               }}
             >
-              {formatCents(effectiveReading.heard.cents)}
+              {formatCents(effectiveHeadReading.cents)}
             </div>
           )}
         {/* practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the
@@ -943,11 +988,18 @@ export function TunerStave(props: {
           </div>
           <div
             data-testid="reference-hz"
+            {...(headStaleAttrs !== undefined
+              ? {
+                  "data-state": headStaleAttrs["data-state"],
+                  "aria-hidden": headStaleAttrs["aria-hidden"],
+                }
+              : {})}
             style={{
               fontFamily: fonts.mono,
               fontSize: COLUMN_VALUE_FONT_SIZE,
               fontWeight: 600,
-              color: paper.inkMid,
+              color: referenceInk,
+              ...(headStaleAttrs?.style ?? {}),
             }}
           >
             {hzText(referenceHz)}
diff --git a/tests/practice/scenarios/tuner-budget.test.ts b/tests/practice/scenarios/tuner-budget.test.ts
index fb0a9d6..9f633ae 100644
--- a/tests/practice/scenarios/tuner-budget.test.ts
+++ b/tests/practice/scenarios/tuner-budget.test.ts
@@ -3,7 +3,7 @@ import type { NoteJudged } from "../../../src/practice/published";
 import { sessionOn } from "../fakes";
 import { enter } from "../tuner-helpers";
 
-test("practice.tuner/REQ-006/S2 — late is dropped", async () => {
+test("practice.tuner/REQ-006/S2 · listening.pitch-detection/REQ-004/S3 — late is dropped", async () => {
   const f = sessionOn("G", "flute-concert");
   await enter(f.session);
   const judged: NoteJudged[] = [];
@@ -18,7 +18,7 @@ test("practice.tuner/REQ-006/S2 — late is dropped", async () => {
   expect(judged).toHaveLength(1);
 });
 
-test("listening.pitch-detection/REQ-004/S3 — a burst before the commit is coalesced to the newest", async () => {
+test("listening.pitch-detection/REQ-004/S1 — a burst before the commit is coalesced to the newest", async () => {
   const f = sessionOn("G", "flute-concert");
   await enter(f.session);
   const judged: NoteJudged[] = [];
diff --git a/tests/practice/scenarios/tuner-reading.test.ts b/tests/practice/scenarios/tuner-reading.test.ts
index 6205add..65c5b80 100644
--- a/tests/practice/scenarios/tuner-reading.test.ts
+++ b/tests/practice/scenarios/tuner-reading.test.ts
@@ -1,5 +1,6 @@
 import { expect, test } from "vitest";
 import type { NoteJudged } from "../../../src/practice/published";
+import { noteJudgedSchema } from "../../../src/practice/published/note-judged.schema";
 import { noteLabel } from "../../../src/theory/published";
 import { sessionOn } from "../fakes";
 import { enter, hear, hearSteady } from "../tuner-helpers";
@@ -110,3 +111,24 @@ test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
   hear(f, 445.0);
   expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
 });
+
+test("note judged schema — a valid NoteJudged parses; a non-integer octave is refused", () => {
+  const validNoteJudged: NoteJudged = {
+    target: { letter: "A", accidental: "natural", octave: 4 },
+    cents: 20,
+    verdict: "sharp",
+    heard: {
+      hz: 445.0,
+      nearest: { letter: "A", accidental: "natural", octave: 4 },
+      cents: 20,
+    },
+    atFrame: 0,
+  };
+  expect(noteJudgedSchema.safeParse(validNoteJudged).success).toBe(true);
+  expect(
+    noteJudgedSchema.safeParse({
+      ...validNoteJudged,
+      target: { ...validNoteJudged.target, octave: 4.5 },
+    }).success,
+  ).toBe(false);
+});
diff --git a/tests/ui/scenarios/target-sheet.test.tsx b/tests/ui/scenarios/target-sheet.test.tsx
index 199fcc2..50ee326 100644
--- a/tests/ui/scenarios/target-sheet.test.tsx
+++ b/tests/ui/scenarios/target-sheet.test.tsx
@@ -30,6 +30,23 @@ test("practice.tuner/REQ-004/S1 — Hold", async () => {
   expect(screen.getByTestId("tuner-tag").textContent).toContain("▲ 1 st");
   expect(screen.getByText("playing A♯4")).toBeTruthy();
   expect(screen.getByTestId("tuner-line").style.top).toBe("9.5px"); // pinned at +50: 268 − 255 − 3.5
+  // converge round 1 (W2) — sharp-over sits BELOW the line (lineTop + 36),
+  // not above it, so it never runs into the header's LISTENING / NO MIC.
+  expect(screen.getByTestId("tuner-tag").style.top).toBe("45.5px");
+});
+
+test("practice.tuner/REQ-004 — a pinned target flat past −50 ¢: the tag sits above the line, clear of the header (converge W2)", async () => {
+  const f = await enterAndHear(440.0);
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  await userEvent.click(screen.getByRole("button", { name: "Hold" }));
+  f.listening.feed(426.5); // −54 ¢ from the pinned A4 — past the ±50 edge
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("tuner-tag").textContent).toContain("▼ 1 st");
+  expect(screen.getByTestId("tuner-line").style.top).toBe("519.5px"); // pinned at −50: 268 + 255 − 3.5
+  // flat-over sits ABOVE the line (lineTop − 58), the mirror of the
+  // sharp-over case above.
+  expect(screen.getByTestId("tuner-tag").style.top).toBe("461.5px");
 });
 
 test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
diff --git a/tests/ui/scenarios/tuner-layout.test.tsx b/tests/ui/scenarios/tuner-layout.test.tsx
index fb30061..630ce92 100644
--- a/tests/ui/scenarios/tuner-layout.test.tsx
+++ b/tests/ui/scenarios/tuner-layout.test.tsx
@@ -5,10 +5,11 @@
 // whatever's left, its geometry (`levelGeometryFor`) scaling to fit.
 import { cleanup, render, screen } from "@testing-library/react";
 import { afterEach, expect, test } from "vitest";
-import { levelGeometryFor } from "../../../src/ui/TunerLevel";
+import { levelGeometryFor, readingGeometry } from "../../../src/ui/TunerLevel";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
+import type { NoteJudged } from "../../../src/practice/published";
 import { sessionDepsWithFakes } from "../../practice/fakes";
 import { enterAndHear } from "./tuner-helpers";
 
@@ -16,6 +17,19 @@ afterEach(() => {
   cleanup();
 });
 
+// A minimal NoteJudged — `readingGeometry` reads only `cents` and
+// `verdict`; target/heard/atFrame are filler to satisfy the type.
+function fakeReading(cents: number): NoteJudged {
+  const note = { letter: "A", accidental: "natural", octave: 4 } as const;
+  return {
+    target: note,
+    cents,
+    verdict: cents >= 0 ? "sharp" : "flat",
+    heard: { hz: 440, nearest: note, cents: 0 },
+    atFrame: 0,
+  };
+}
+
 test("practice.tuner/REQ-002 — the level's geometry follows its own height, keeping today's ratio of span to height", () => {
   // At height 352 the centre (`areaMid`) is at 176, and a reading of +20
   // cents sits 20 × (352 × 5.1 / 536) px above the centre — the scale
@@ -68,6 +82,59 @@ test("practice.tuner/REQ-002 — on the practice screen the column has its inlin
   expect(column.style.minHeight).toBe("100vh");
 });
 
+test("practice.tuner/REQ-004 — past +50 ¢ pinned, the tag sits below the line, not covering the header (converge round 1 W2)", () => {
+  const geometry = levelGeometryFor(536);
+  const g = readingGeometry(
+    fakeReading(81),
+    geometry.areaMid,
+    geometry.areaHeight,
+    geometry.pxPerCent,
+  );
+  expect(g.lineTop).toBeCloseTo(9.5, 2); // pinned at +50: 268 − 255 − 3.5
+  expect(g.tagTop).toBeCloseTo(45.5, 2); // sharp-over: lineTop + 36
+  expect(g.tagTop).toBeGreaterThan(g.lineTop);
+});
+
+test("practice.tuner/REQ-004 — past −50 ¢ pinned, the tag sits above the line (converge round 1 W2)", () => {
+  const geometry = levelGeometryFor(536);
+  const g = readingGeometry(
+    fakeReading(-81),
+    geometry.areaMid,
+    geometry.areaHeight,
+    geometry.pxPerCent,
+  );
+  expect(g.lineTop).toBeCloseTo(519.5, 2); // pinned at −50: 268 + 255 − 3.5
+  expect(g.tagTop).toBeCloseTo(461.5, 2); // flat-over: lineTop − 58
+  expect(g.tagTop).toBeLessThan(g.lineTop);
+});
+
+test("practice.tuner/REQ-002 — a non-over reading's tag keeps today's placement (converge round 1 W2)", () => {
+  const geometry = levelGeometryFor(536);
+  const g = readingGeometry(
+    fakeReading(20),
+    geometry.areaMid,
+    geometry.areaHeight,
+    geometry.pxPerCent,
+  );
+  expect(g.tagTop).toBeCloseTo(126.5, 2); // unchanged from today: lineTop − 36
+});
+
+test("practice.tuner/REQ-002 — the non-over tag's clamp margins scale with the level's own height, not fixed pixels (converge round 1 W2)", () => {
+  const geometry = levelGeometryFor(300);
+  const g = readingGeometry(
+    fakeReading(-50),
+    geometry.areaMid,
+    geometry.areaHeight,
+    geometry.pxPerCent,
+  );
+  // Unscaled (today's fixed 30/62 at 536 px), the raw tagTop (297.22) would
+  // clamp only against 536 − 62 = 474 and pass through untouched; scaled by
+  // this height's own ratio (300 / 536), the bottom margin shrinks to
+  // 300 − 0.56·62 ≈ 265.3, so the tag is pulled up to stay inside the level.
+  expect(g.tagTop).toBeCloseTo(265.3, 1);
+  expect(g.tagTop).toBeLessThan(474);
+});
+
 test("practice.tuner/REQ-002 — the level's minimum height is 300", async () => {
   await enterAndHear(440.0);
   const levelContainer = screen.getByTestId("tuner-reading").parentElement!;
diff --git a/tests/ui/scenarios/tuner-linger.test.tsx b/tests/ui/scenarios/tuner-linger.test.tsx
index 5a150a1..c3ffed5 100644
--- a/tests/ui/scenarios/tuner-linger.test.tsx
+++ b/tests/ui/scenarios/tuner-linger.test.tsx
@@ -56,6 +56,15 @@ test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async
   expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
   expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
   expect(screen.getByTestId("heard-hz").style.color).toBe(rgbOf(paper.faint));
+  // practice.tuner/REQ-003/S4 (converge round 1, I6) — the "<note> IS"
+  // caption lingers grey alongside "HEARD", not clearing to "— IS" at once.
+  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
+    "fading",
+  );
+  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
+  expect(screen.getByTestId("reference-hz").style.color).toBe(
+    rgbOf(paper.faint),
+  );
   expect(screen.queryByTestId("tuner-empty")).toBeNull();
 
   // 0.5 s later they are still shown.
@@ -65,6 +74,10 @@ test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async
   expect(screen.getByTestId("tuner-line")).toBeTruthy();
   expect(screen.getByTestId("tuner-tag")).toBeTruthy();
   expect(screen.getByTestId("heard-head")).toBeTruthy();
+  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
+  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
+    "fading",
+  );
   expect(screen.queryByTestId("tuner-empty")).toBeNull();
 
   // 0.8 s after they turned grey they are gone and "Play a note" is shown:
@@ -80,6 +93,8 @@ test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async
   expect(screen.queryByTestId("heard-head")).toBeNull();
   expect(screen.queryByTestId("strip-cents")).toBeNull();
   expect(screen.getByTestId("heard-hz").textContent).toBe("—");
+  expect(screen.getByTestId("reference-hz").textContent).toBe("—");
+  expect(screen.getByText("— IS")).toBeTruthy();
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
 });
 
@@ -135,12 +150,25 @@ test("practice.tuner/REQ-003/S6 — lingering with a target", async () => {
     "fading",
   );
   expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
+  // practice.tuner/REQ-003/S6 (converge round 1, I6) — "A4 IS 440.0 Hz"
+  // lingers grey and fades as in S4, even though the target's own name
+  // (above) never lingers — the two follow different rules.
+  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
+    "fading",
+  );
+  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
 
   letLingerPass({ timer: animClock });
   expect(screen.queryByTestId("tuner-line")).toBeNull();
   expect(screen.queryByTestId("tuner-tag")).toBeNull();
   expect(screen.queryByTestId("heard-head")).toBeNull();
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+  // Once gone, the strip shows only the target's grey head with "A4 IS
+  // 440.0 Hz" again (S2) — full strength, no longer fading.
+  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
+  expect(
+    screen.getByTestId("reference-hz").getAttribute("data-state"),
+  ).toBeNull();
 });
 
 test("practice.tuner/REQ-003 — reduced motion removes the linger at 0.8 s without fading", async () => {
diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
index 94da0fd..26dd039 100644
--- a/tests/ui/scenarios/tuner-stave.test.tsx
+++ b/tests/ui/scenarios/tuner-stave.test.tsx
@@ -45,6 +45,33 @@ test("practice.tuner/REQ-005/S1 — A4 a little sharp", async () => {
   expect(screen.queryByText("8va")).toBeNull();
 });
 
+// practice.tuner/REQ-002, practice.tuner/REQ-005 — converge round 1 (W1):
+// on auto the stave's head must agree with the level, not the raw heard
+// note. A4 settles at 440 Hz (the first reading is shown as detected,
+// REQ-002/S8, so a single feed already settles the smoothing filter); one
+// feed at 454 Hz then jumps the smoothed pitch straight to 454 (+54 ¢ raw,
+// past SNAP_CENTS's 25 ¢, so it snaps rather than creeps — no need to feed
+// it twice), 56 ¢ (HANDOVER_CENTS) short of crossing, so A4 is still shown,
+// clamped to +50 (tests/practice/scenarios/tuner-reading.test.ts's own
+// REQ-002/S4 confirms `reading.target`/`.cents` land on A4/+50 here). The
+// raw nearest note to 454 Hz is A♯4 at about −46 ¢ (`reading.heard.nearest`/
+// `.cents`) — the bug drew the head there instead of at the level's own A4
+// +50.
+test("practice.tuner/REQ-002, practice.tuner/REQ-005 — the stave head agrees with the level in the hand-over band (converge round 1, W1)", async () => {
+  const f = await enterAndHear(440.0);
+  f.listening.feed(454.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("heard-head").style.transform).toBe(
+    "translateY(107.5px)",
+  ); // A4: i = 33, guide y = 111, −50·0.07 — not A♯4's −(−46)·0.07
+  expect(screen.queryByTestId("heard-accidental")).toBeNull(); // A4 is natural, not A♯4's ♯
+  expect(screen.getByTestId("strip-cents").textContent).toBe("+50");
+  expect(screen.getByTestId("strip-cents").style.color).toBe(
+    "oklch(0.55 0.11 28)",
+  ); // the level's own warm/sharp colour (docs/design.md §8)
+});
+
 test("practice.tuner/REQ-005/S2 — a flat accidental", async () => {
   await enterAndHear(461.0, "flat");
   expect(screen.getByTestId("heard-accidental").textContent).toBe("♭");
@@ -234,9 +261,13 @@ test("practice.tuner/REQ-005 — the frame loop never runs while a note sounds,
 });
 
 test('practice.tuner/REQ-005 — nothing referenced reads "— IS" over "—"', async () => {
+  // practice.tuner/REQ-003/S4 (converge round 1, I6) — the "<note> IS"
+  // caption now lingers with the head (T038): nothing is truly referenced
+  // only once the screen's own linger has fully passed, not merely once the
+  // session's reading has cleared.
   const f = await enterAndHear(440.0);
-  f.clock.advanceMs(300);
-  await act(async () => {});
+  await letGapPass(f);
+  letLingerPass(f);
   expect(screen.getByText("— IS")).toBeTruthy();
   expect(screen.getByTestId("reference-hz").textContent).toBe("—");
 });
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-29)

SPEC: PASS · QUALITY: PASS — no findings. The diff is title-only; both tests prove what their new titles claim. check-scenarios.sh shows REQ-004/S1–S3 all tested.

<!-- recorded 2026-09-29T20:39:45Z by scripts/record.sh -->
