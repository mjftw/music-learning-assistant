---
type: Task Review
title: Review package — T030 · 007-hear-me
description: The diff produced for T030, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T030.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T030.md
  - resource: git:b370c88c62ca8d0c677eea4d058565c88560f01e..58fd471100510565b550dae772cf61b29518697d
generated:
  by: process:review-package.sh
  at: 2026-09-28T22:21:35Z
sdd_id: 007-hear-me
---

# Review package — T030 · 007-hear-me

base: `b370c88c62ca8d0c677eea4d058565c88560f01e` → head: `58fd471100510565b550dae772cf61b29518697d`

## Files changed

- M	src/ui/App.tsx
- M	src/ui/TunerScreen.tsx
- M	src/ui/TunerStave.tsx
- M	src/ui/main.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index d218668..363de0e 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -240,9 +240,8 @@ export function App(props: {
   readonly onPaintAge?: (ageMs: number) => void;
   // Optional, additive, forwarded straight to TunerScreen (practice.tuner/
   // REQ-005/S5, S6) — TunerScreen already carries its own real defaults, so
-  // App need only pass these through for a test (or main.tsx's design-loop
-  // switch, T029/T030) to reach them; nothing here reads or resolves them.
-  readonly trailMs?: number;
+  // App need only pass these through for a test to reach them; nothing here
+  // reads or resolves them.
   readonly now?: () => number;
   readonly requestFrame?: (callback: FrameRequestCallback) => number;
   readonly cancelFrame?: (handle: number) => void;
@@ -253,7 +252,6 @@ export function App(props: {
     sessionDeps,
     onSessionReady,
     onPaintAge,
-    trailMs,
     now,
     requestFrame,
     cancelFrame,
@@ -696,7 +694,6 @@ export function App(props: {
           onClear={handleClearTarget}
           onSpellingChange={handleSelectSpelling}
           onReadingShown={handleReadingShown}
-          {...(trailMs !== undefined ? { trailMs } : {})}
           {...(now !== undefined ? { now } : {})}
           {...(requestFrame !== undefined ? { requestFrame } : {})}
           {...(cancelFrame !== undefined ? { cancelFrame } : {})}
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index f9bb5f1..147624c 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -34,21 +34,19 @@ function appendTrailPoint(
   reading: NoteJudged,
   atMs: number,
   runId: number,
-  trailMs: number,
 ): readonly TrailPoint[] {
-  return prunedByAge([...trail, { reading, atMs, runId }], atMs, trailMs);
+  return prunedByAge([...trail, { reading, atMs, runId }], atMs);
 }
 
-// Drops points older than `trailMs` relative to `nowMs` — called both when
+// Drops points older than TRAIL_MS relative to `nowMs` — called both when
 // a fresh reading is appended (bounding the trail's memory while sounding)
 // and on every silent render (this is what lets the animation stop: once
 // this returns `[]` there is nothing left to re-draw).
 function prunedByAge(
   trail: readonly TrailPoint[],
   nowMs: number,
-  trailMs: number,
 ): readonly TrailPoint[] {
-  return trail.filter((point) => nowMs - point.atMs <= trailMs);
+  return trail.filter((point) => nowMs - point.atMs <= TRAIL_MS);
 }
 
 // The header row — copied verbatim from the vendored visual reference
@@ -160,11 +158,10 @@ function TunerScreenComponent(props: {
   readonly onClear: () => void;
   readonly onSpellingChange: (preference: SpellingPreference) => void;
   readonly onReadingShown: (atFrame: number) => void;
-  // practice.tuner/REQ-005/S5, S6 — the trail's length and its injectable
-  // clock/frame scheduler; all optional with real defaults (T029's brief)
-  // so a test can drive the trail's ageing without depending on wall-clock
-  // time, and production code never has to pass any of them.
-  readonly trailMs?: number;
+  // practice.tuner/REQ-005/S5, S6 — the injectable clock/frame scheduler;
+  // all optional with real defaults so a test can drive the trail's ageing
+  // without depending on wall-clock time, and production code never has to
+  // pass any of them.
   readonly now?: () => number;
   readonly requestFrame?: (callback: FrameRequestCallback) => number;
   readonly cancelFrame?: (handle: number) => void;
@@ -180,7 +177,6 @@ function TunerScreenComponent(props: {
     onClear,
     onSpellingChange,
     onReadingShown,
-    trailMs = TRAIL_MS,
     now = defaultNow,
     requestFrame = defaultRequestFrame,
     cancelFrame = defaultCancelFrame,
@@ -215,7 +211,7 @@ function TunerScreenComponent(props: {
   );
 
   // The strip's trail (practice.tuner/REQ-005/S5, S6) — points of the last
-  // `trailMs`, kept here (not in the session) so it is pure view state:
+  // TRAIL_MS, kept here (not in the session) so it is pure view state:
   // appended whenever `tuner.reading` becomes a genuinely new reading (a
   // fresh object each commit — domain/session.ts's `commitTunerReading`),
   // kept (not reset) on a gap ("Play a note" — REQ-003/S3) so it can carry
@@ -243,7 +239,7 @@ function TunerScreenComponent(props: {
     wasSilentRef.current = true;
     lastReadingRef.current = null;
     nowMs = now();
-    trailRef.current = prunedByAge(trailRef.current, nowMs, trailMs);
+    trailRef.current = prunedByAge(trailRef.current, nowMs);
   } else if (tuner.reading !== lastReadingRef.current) {
     const atMs = now();
     if (wasSilentRef.current) runIdRef.current += 1;
@@ -254,7 +250,6 @@ function TunerScreenComponent(props: {
       tuner.reading,
       atMs,
       runIdRef.current,
-      trailMs,
     );
     nowMs = atMs;
   } else {
@@ -395,12 +390,7 @@ function TunerScreenComponent(props: {
         onClear={onClear}
       />
       <div style={{ padding: "10px 16px 0" }}>
-        <TunerStave
-          tuner={tuner}
-          trail={trailRef.current}
-          nowMs={nowMs}
-          trailMs={trailMs}
-        />
+        <TunerStave tuner={tuner} trail={trailRef.current} nowMs={nowMs} />
       </div>
       {cannotHear && (
         <div
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index 89fcf93..ff88909 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -208,11 +208,9 @@ const TRAIL_X_END = 140;
 const TRAIL_STROKE_WIDTH = 2.2;
 const TRAIL_GRADIENT_ID = "tuner-stave-trail-fade";
 
-// practice.tuner/REQ-005 — the trail's default length in time: age 0 sits
+// practice.tuner/REQ-005 — the trail's length in time: 2.5 s. Age 0 sits
 // at TRAIL_X_END (the head), age TRAIL_MS sits at TRAIL_X_START, linear in
-// between (trailXOf below). The design-loop switch (main.tsx, T029/T030)
-// overrides this by passing a `trailMs` prop through App and TunerScreen;
-// this is only the default when none is passed.
+// between (trailXOf below).
 export const TRAIL_MS = 2500;
 
 // A trail point remembers the reading it came from, when it was taken (an
@@ -227,11 +225,11 @@ export interface TrailPoint {
   readonly runId: number;
 }
 
-// x by age: age 0 (the newest point) sits at TRAIL_X_END, age trailMs sits
-// at TRAIL_X_START; a point older than trailMs (a negative or >TRAIL_X_END-
+// x by age: age 0 (the newest point) sits at TRAIL_X_END, age TRAIL_MS sits
+// at TRAIL_X_START; a point older than TRAIL_MS (a negative or >TRAIL_X_END-
 // clamped x) is filtered out where `trailRenderPoints` is built, below.
-function trailXOf(age: number, trailMs: number): number {
-  return TRAIL_X_END - (age / trailMs) * (TRAIL_X_END - TRAIL_X_START);
+function trailXOf(age: number): number {
+  return TRAIL_X_END - (age / TRAIL_MS) * (TRAIL_X_END - TRAIL_X_START);
 }
 
 const COLUMN_LEFT = 214;
@@ -311,7 +309,7 @@ function referenceNoteOf(
 
 // The treble stave strip (practice.tuner/REQ-005): the heard note as a
 // drifting whole-note head along a dotted guide, its cents, a trail of the
-// last `trailMs` by TIME (x by age, oldest first, dropped past `trailMs`),
+// last TRAIL_MS by TIME (x by age, oldest first, dropped past TRAIL_MS),
 // the pinned target as a grey head to the right, 8va/8vb/15ma/15mb past the
 // ledger range, and the HEARD / "<note> IS" Hz column. WHILE nothing is
 // heard the head/cents/Hz clear as before but the trail carries on moving
@@ -325,9 +323,8 @@ export function TunerStave(props: {
   // TunerScreen's injectable "now" while silent and the trail is still
   // aging (TunerScreen's own rAF-driven re-renders keep advancing it).
   readonly nowMs: number;
-  readonly trailMs: number;
 }): JSX.Element {
-  const { tuner: snapshot, trail, nowMs, trailMs } = props;
+  const { tuner: snapshot, trail, nowMs } = props;
   const reading = snapshot.reading;
   const targetNote = snapshot.targetNote;
 
@@ -379,6 +376,7 @@ export function TunerStave(props: {
   // the same shape of contribution across the note stopping. Once the
   // trail has emptied too, this is `null` and the layout falls back to the
   // stave-lines-only baseline, exactly as an empty reading always did.
+  // TRAIL_MS is used directly for all trail age calculations.
   const layoutHeard =
     heard !== null
       ? heard
@@ -432,15 +430,15 @@ export function TunerStave(props: {
     bot - top > CARD_HEIGHT - 16 ? 8 - top : CARD_HEIGHT / 2 - (top + bot) / 2;
 
   // x by age (practice.tuner/REQ-005/S5, S6) — each point placed by how old
-  // it is relative to `nowMs` (age 0 at TRAIL_X_END, `trailMs` at
-  // TRAIL_X_START), points older than `trailMs` dropped; the whole trail is
+  // it is relative to `nowMs` (age 0 at TRAIL_X_END, TRAIL_MS at
+  // TRAIL_X_START), points older than TRAIL_MS dropped; the whole trail is
   // drawn with `trailAdj` (not a fresh register decision per point) so it
   // never jumps mid-trail as a historical point crosses a register
   // threshold on its own — matching the design's own `p.tot` applied
   // uniformly across `hist` (lines 1257-1264).
   const trailRenderPoints = trail
     .map((point) => ({
-      x: trailXOf(nowMs - point.atMs, trailMs),
+      x: trailXOf(nowMs - point.atMs),
       y: placeHeard(
         point.reading.heard.nearest,
         point.reading.heard.cents,
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index e619d73..417a2f2 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -112,25 +112,6 @@ exposeSoundForTiming(sound);
 const listening = webAudioListening(audioContext);
 exposeListeningForTiming(listening);
 
-// design-loop variant (007 round 3)
-// The tuner strip's trail length is being tried live on the phone
-// (practice.tuner/REQ-005's amendment) via `?variant=a|b|c`; anything else,
-// including no parameter, is the requirement's own 2.5 s. T030 removes this
-// switch once the user has chosen a length.
-function trailMsFromVariant(search: URLSearchParams): number {
-  switch (search.get("variant")) {
-    case "a":
-      return 2500;
-    case "b":
-      return 1200;
-    case "c":
-      return 550;
-    default:
-      return 2500;
-  }
-}
-const trailMs = trailMsFromVariant(new URLSearchParams(window.location.search));
-
 createRoot(rootElement).render(
   <StrictMode>
     <App
@@ -148,7 +129,6 @@ createRoot(rootElement).render(
         exposeNoteJudgedForTiming(session);
       }}
       onPaintAge={collectPaintAge}
-      trailMs={trailMs}
     />
   </StrictMode>,
 );
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-28)

SPEC: PASS · QUALITY: PASS

- No `trailMs`, marker or switch left in `src` or `tests`; `main.tsx` is what it was before the switch; no test file in the diff; `TRAIL_MS = 2500` unchanged; the injectable clock props untouched.
- [minor, may-defer] `src/ui/TunerStave.tsx:379` — "TRAIL_MS is used directly for all trail age calculations." was appended to an unrelated comment block about vertical centring; misplaced, adds nothing. **Noted for converge.**

Reviewer's commands: `pnpm vitest run tests/ui` 24 files, 126 tests; `check-contexts.sh` clean. Controller's `pnpm check` at 58fd471: exit 0, 75 files, 325 tests.

<!-- recorded 2026-09-28T22:23:40Z by scripts/record.sh -->
