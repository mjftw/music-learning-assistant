---
type: Task Review
title: Review package — T031 · 007-hear-me
description: The diff produced for T031, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T031.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T031.md
  - resource: git:ce230ad70630bed76da6d7c445ebaa24e193dd21..66787651e5913c658b6ea366f14b9f975aaaa894
generated:
  by: process:review-package.sh
  at: 2026-09-29T18:26:04Z
sdd_id: 007-hear-me
---

# Review package — T031 · 007-hear-me

base: `ce230ad70630bed76da6d7c445ebaa24e193dd21` → head: `66787651e5913c658b6ea366f14b9f975aaaa894`

## Files changed

- M	eslint.config.js
- M	src/ui/App.tsx
- M	src/ui/TunerLevel.tsx
- M	src/ui/TunerScreen.tsx
- M	src/ui/TunerStave.tsx
- M	src/ui/main.tsx
- M	src/ui/theme.ts
- M	src/ui/tuner-silence.ts
- M	tests/ui/scenarios/tuner-helpers.ts
- R052	tests/ui/scenarios/tuner-silence-variants.test.tsx	tests/ui/scenarios/tuner-linger.test.tsx
- M	tests/ui/scenarios/tuner-screen.test.tsx
- M	tests/ui/scenarios/tuner-stave.test.tsx

## Diff

```diff
diff --git a/eslint.config.js b/eslint.config.js
index 15acd98..31681da 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -5,12 +5,14 @@ export default tseslint.config(
   // changes/ holds SDD artefacts and vendored design references, never
   // lintable app code; scripts/*.mjs are plain Node tooling outside the
   // app's TS project (tsconfig.json's `include`), not type-checked.
+  // .claude/ can hold another session's git worktree (a second checkout).
   {
     ignores: [
       "dist/**",
       "node_modules/**",
       "changes/**",
       ".sdd/**",
+      ".claude/**",
       "scripts/*.mjs",
     ],
   },
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index d7ea103..63931c0 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -58,7 +58,6 @@ import { TransportCard } from "./TransportCard";
 import { TraversalRow } from "./TraversalRow";
 import { TraversalSheet } from "./TraversalSheet";
 import { TunerScreen } from "./TunerScreen";
-import type { SilenceMode } from "./tuner-silence";
 
 const DEFAULT_VARIANT_ID = "flute-concert";
 const DEFAULT_KEY_ID = "C-major";
@@ -246,16 +245,11 @@ export function App(props: {
   readonly now?: () => number;
   readonly requestFrame?: (callback: FrameRequestCallback) => number;
   readonly cancelFrame?: (handle: number) => void;
-  // design-loop variant (007 round 4) — optional, additive, forwarded
-  // straight to TunerScreen: the silence treatment and its own injectable
-  // timer. TEMPORARY — deleted along with the rest of this exploration.
-  readonly silence?: SilenceMode;
+  // practice.tuner/REQ-003 — optional, additive, forwarded straight to
+  // TunerScreen: the linger's own injectable timer, real setTimeout/
+  // clearTimeout by default — a test's own route to it.
   readonly setTimer?: (callback: () => void, delayMs: number) => number;
   readonly clearTimer?: (handle: number) => void;
-  // design-loop variant (007 round 4, follow-up 2) — the linger treatment's
-  // own hold/fade timing, forwarded the same way.
-  readonly lingerMs?: number;
-  readonly lingerFadeMs?: number;
   // design-loop variant (007 round 5) — optional, additive, forwarded
   // straight to TunerScreen: the two layout treatments' own switch.
   // TEMPORARY — deleted along with the rest of this exploration.
@@ -270,11 +264,8 @@ export function App(props: {
     now,
     requestFrame,
     cancelFrame,
-    silence,
     setTimer,
     clearTimer,
-    lingerMs,
-    lingerFadeMs,
     fit,
   } = props;
   const [selection, setSelection] = useState<Selection>(() =>
@@ -723,11 +714,8 @@ export function App(props: {
           {...(now !== undefined ? { now } : {})}
           {...(requestFrame !== undefined ? { requestFrame } : {})}
           {...(cancelFrame !== undefined ? { cancelFrame } : {})}
-          {...(silence !== undefined ? { silence } : {})}
           {...(setTimer !== undefined ? { setTimer } : {})}
           {...(clearTimer !== undefined ? { clearTimer } : {})}
-          {...(lingerMs !== undefined ? { lingerMs } : {})}
-          {...(lingerFadeMs !== undefined ? { lingerFadeMs } : {})}
           {...(fit !== undefined ? { fit } : {})}
         />
       ) : (
diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
index f86d7f0..53f4fa7 100644
--- a/src/ui/TunerLevel.tsx
+++ b/src/ui/TunerLevel.tsx
@@ -15,14 +15,10 @@ import {
   type SpellingPreference,
 } from "../theory/published";
 import { formatCents } from "./cents-label";
-import { fonts, paper, tuner } from "./theme";
+import { fonts, motion, paper, tuner } from "./theme";
 import { staleAttrs, type StaleReading } from "./tuner-silence";
 import { useMeasuredSize } from "./use-measured-size";
 
-// design-loop variant (007 round 4) — "Play a note"'s own entrance once a's
-// or b's own fade has finished (TunerScreen's `emptyOpacity` prop, below).
-const EMPTY_FADE_IN_MS = 200;
-
 // Geometry below is copied verbatim from the vendored visual reference
 // (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
 // 142-181, and the `level()` helper at lines 1130-1138: `L4 = level(536,
@@ -225,11 +221,10 @@ export function levelGeometryFor(areaHeight: number): LevelGeometry {
 export function TunerLevel(props: {
   readonly tuner: TunerSnapshot;
   readonly spelling: SpellingPreference;
-  // design-loop variant (007 round 4) — `stale` is the last reading, still
-  // shown fading or ghosted (`undefined` when nothing is: live, "cut", or
-  // truly nothing to show); `emptyOpacity` drives "Play a note"'s own
-  // entrance once a's/b's fade has ended (`undefined` outside that moment —
-  // no style change, exactly today's behaviour).
+  // practice.tuner/REQ-003 — `stale` is the last reading, still lingering
+  // (`undefined` when nothing is: live, or truly nothing to show);
+  // `emptyOpacity` drives "Play a note"'s own entrance once the linger's
+  // fade has ended (`undefined` outside that moment — no style change).
   readonly stale?: StaleReading;
   readonly emptyOpacity?: number;
   // design-loop variant (007 round 5) — "fixed" (today, the default): the
@@ -250,18 +245,18 @@ export function TunerLevel(props: {
   const cannotHear = snapshot.listening.kind === "cannot-hear";
   const targetPinnedSilent = snapshot.targetNote !== null && reading === null;
 
-  // design-loop variant (007 round 4) — with a target pinned, the big name
-  // always follows REQ-003/S2 below, unaffected by the silence treatment
-  // (`staleForName` stays `undefined`); with none pinned, `stale` (when
-  // present) stands in for the reading that just cleared, so the name
-  // doesn't disappear on its own ahead of the line/tag/stave.
+  // practice.tuner/REQ-003 — with a target pinned, the big name always
+  // follows REQ-003/S2 below, unaffected by the linger (`staleForName` stays
+  // `undefined` — REQ-003/S6); with none pinned, `stale` (when present)
+  // stands in for the reading that just cleared, so the name doesn't
+  // disappear on its own ahead of the line/tag/stave.
   const staleForName = !targetPinnedSilent ? stale : undefined;
 
   // The note the big name shows: the current reading's target (the
   // pinned note, or the nearest note with hysteresis) when there is one,
   // else the pinned target alone (practice.tuner/REQ-003/S2 — the target
   // stays shown, greyed, through a silence), else the stale reading's own
-  // target while fading/ghosted.
+  // target while it lingers.
   const referenceNote: Note | null =
     reading?.target ??
     (snapshot.targetNote !== null
@@ -279,20 +274,17 @@ export function TunerLevel(props: {
       : noteLabel(noteAtPosition(referencePosition - 1, spelling));
 
   // practice.tuner/REQ-003 — greyed once a target is pinned but nothing is
-  // currently heard; otherwise the normal ink, except while an unpinned
-  // stale reading is greyed too (b, c — design-loop variant, 007 round 4).
-  const nameInk = targetPinnedSilent
-    ? paper.faint
-    : staleForName !== undefined && staleForName.grey
-      ? paper.faint
-      : paper.ink;
+  // currently heard, or while an unpinned stale reading lingers; otherwise
+  // the normal ink.
+  const nameInk =
+    targetPinnedSilent || staleForName !== undefined ? paper.faint : paper.ink;
 
   const nameStaleAttrs = staleAttrs(staleForName);
 
   // The "playing <heard note>" caption — only while pinned and the heard
   // note differs from the target (practice.tuner/REQ-004/S1, S3). Reads off
-  // `effectiveReading` (design-loop variant, 007 round 4) so it fades/ghosts
-  // with the rest of the tag rather than vanishing ahead of it.
+  // `effectiveReading` so it lingers and fades with the rest of the tag
+  // rather than vanishing ahead of it.
   const effectiveReading = reading ?? stale?.reading ?? null;
   const captionText =
     effectiveReading !== null &&
@@ -325,13 +317,11 @@ export function TunerLevel(props: {
           levelGeometry.areaMid,
           levelGeometry.pxPerCent,
         );
-  // design-loop variant (007 round 4) — a's own fade keeps the verdict's own
-  // colour (only opacity changes); b's/c's stale states grey it instead. Only
-  // read when `geometry` is non-null (the line/tag's own render guard), so
-  // the `paper.faint` fallback here is never actually shown.
-  const displayTone = stale?.grey
-    ? paper.faint
-    : (geometry?.tone ?? paper.faint);
+  // practice.tuner/REQ-003 — grey while lingering. Only read when `geometry`
+  // is non-null (the line/tag's own render guard), so the `paper.faint`
+  // fallback here is never actually shown.
+  const displayTone =
+    stale !== undefined ? paper.faint : (geometry?.tone ?? paper.faint);
   const lineTagStaleAttrs = staleAttrs(reading === null ? stale : undefined);
 
   return (
@@ -549,13 +539,13 @@ export function TunerLevel(props: {
                   </div>
                 </div>
               )}
-              {/* design-loop variant (007 round 4) — "Play a note" shows
-                  whenever nothing live is heard, except while a/b's stale
-                  reading is still fading (absent until its timer ends);
-                  c's ghost shows it at once, alongside the still-ghosted
-                  reading (REQ-003/S2's own layout, reused). */}
+              {/* practice.tuner/REQ-003 — "Play a note" shows whenever
+                  nothing live is heard, except while an unpinned reading is
+                  still lingering (absent until its own timer ends, S4);
+                  with a target pinned it shows at once, alongside the still-
+                  lingering line/tag/head (S2, S6). */}
               {reading === null &&
-                (stale === undefined || stale.dataState === "ghost") && (
+                (targetPinnedSilent || stale === undefined) && (
                   <div
                     data-testid="tuner-empty"
                     style={{
@@ -566,7 +556,7 @@ export function TunerLevel(props: {
                       ...(emptyOpacity !== undefined
                         ? {
                             opacity: emptyOpacity,
-                            transition: `opacity ${EMPTY_FADE_IN_MS}ms`,
+                            transition: `opacity ${motion.lingerFadeMs}ms`,
                           }
                         : {}),
                     }}
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 60590c3..b92d6f5 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -12,12 +12,8 @@ import type { NoteJudged, TunerSnapshot } from "../practice/published";
 import type { NoteRange, SpellingPreference } from "../theory/published";
 import { TargetPill } from "./TargetPill";
 import { TargetSheet } from "./TargetSheet";
-import { fonts, paper } from "./theme";
-import {
-  prefersReducedMotion,
-  type SilenceMode,
-  type StaleReading,
-} from "./tuner-silence";
+import { fonts, motion, paper } from "./theme";
+import { prefersReducedMotion, type StaleReading } from "./tuner-silence";
 import { TunerLevel } from "./TunerLevel";
 import { TRAIL_MS, TunerStave, type TrailPoint } from "./TunerStave";
 
@@ -34,12 +30,11 @@ function defaultCancelFrame(handle: number): void {
   cancelAnimationFrame(handle);
 }
 
-// design-loop variant (007 round 4) — the silence treatments' own
-// injectable timer (the moments that need JavaScript: removing a fade's
-// elements once it has ended, starting linger's fade after its hold), in
-// the same spirit as now/requestFrame/cancelFrame above: real setTimeout/
-// clearTimeout by default, a fake, advanceable one in tests
-// (manualAnimationClock's own setTimer/clearTimer).
+// practice.tuner/REQ-003 — the linger's own injectable timer (the moments
+// that need JavaScript: starting the fade after the hold, removing the
+// elements once it has ended), in the same spirit as now/requestFrame/
+// cancelFrame above: real setTimeout/clearTimeout by default, a fake,
+// advanceable one in tests (manualAnimationClock's own setTimer/clearTimer).
 function defaultSetTimer(callback: () => void, delayMs: number): number {
   return window.setTimeout(callback, delayMs);
 }
@@ -47,30 +42,18 @@ function defaultClearTimer(handle: number): void {
   window.clearTimeout(handle);
 }
 
-// design-loop variant (007 round 4) — the durations named, not inlined
-// (docs/design.md-style constants). FADE_MS is a's own fade; LINGER_MS and
-// LINGER_FADE_MS are b's hold and its own fade. "Play a note"'s own entrance
-// (EMPTY_FADE_IN_MS) is named in TunerLevel.tsx, the only place that reads
-// it in a style — this file only decides *when* that entrance starts
-// (`emptyOpacity`, below), via the same setTimer it schedules the fades with.
-const FADE_MS = 600;
-const LINGER_MS = 1000;
-const LINGER_FADE_MS = 400;
-
-// design-loop variant (007 round 4) — the silence view's own phase: "live"
-// while a reading sounds (or nothing has ever been heard), "stale" while
-// the last reading lingers (fading or ghosted — the values here are exactly
+// practice.tuner/REQ-003 — the last reading's own phase once nothing more is
+// heard: "live" while a reading sounds (or nothing has ever been heard),
+// "stale" while it lingers (held, then fading — the values here are exactly
 // StaleReading minus its `reading`, which comes from staleReadingRef,
-// below), "empty" once nothing more is shown ("Play a note"; `enteredViaTimer`
-// marks the transition a's/b's own fade-completion timer drove, the one
-// that gets its own 200 ms entrance).
+// below), "empty" once nothing more is shown ("Play a note";
+// `enteredViaTimer` marks the transition the linger's own fade-completion
+// timer drove, the one that gets its own entrance fade below).
 type SilencePhase =
   | { readonly kind: "live" }
   | {
       readonly kind: "stale";
-      readonly dataState: "fading" | "ghost";
       readonly opacity: number;
-      readonly grey: boolean;
       readonly transitionMs: number | null;
     }
   | { readonly kind: "empty"; readonly enteredViaTimer: boolean };
@@ -269,17 +252,10 @@ function TunerScreenComponent(props: {
   readonly now?: () => number;
   readonly requestFrame?: (callback: FrameRequestCallback) => number;
   readonly cancelFrame?: (handle: number) => void;
-  // design-loop variant (007 round 4) — the silence treatment; "cut" (today's
-  // behaviour) by default. setTimer/clearTimer are the treatments' own
-  // injectable timer, real setTimeout/clearTimeout by default.
-  readonly silence?: SilenceMode;
+  // practice.tuner/REQ-003 — the linger's own injectable timer, real
+  // setTimeout/clearTimeout by default.
   readonly setTimer?: (callback: () => void, delayMs: number) => number;
   readonly clearTimer?: (handle: number) => void;
-  // design-loop variant (007 round 4, follow-up 2) — the linger treatment's
-  // own hold/fade durations, in place of LINGER_MS/LINGER_FADE_MS, so the
-  // switch can offer several timings of the same treatment side by side.
-  readonly lingerMs?: number;
-  readonly lingerFadeMs?: number;
   // design-loop variant (007 round 5) — "fixed" (today, the default): no
   // change. "flex": the screen is exactly the viewport's visible height,
   // the level takes whatever's left. "flex-compact": as "flex", and the
@@ -301,11 +277,8 @@ function TunerScreenComponent(props: {
     now = defaultNow,
     requestFrame = defaultRequestFrame,
     cancelFrame = defaultCancelFrame,
-    silence = "cut",
     setTimer = defaultSetTimer,
     clearTimer = defaultClearTimer,
-    lingerMs = LINGER_MS,
-    lingerFadeMs = LINGER_FADE_MS,
     fit = "fixed",
   } = props;
   // design-loop variant (007 round 5) — "flex-compact" only: the footer
@@ -416,12 +389,10 @@ function TunerScreenComponent(props: {
     };
   });
 
-  // design-loop variant (007 round 4) — the silence treatment's own view
-  // state: the last reading shown (never updated while it is fading or
-  // ghosted — this only ever advances while `tuner.reading` is non-null,
-  // mirroring `lastReadingRef` above but never reset to null by a gap, since
-  // its whole point is to survive one), and the phase that drives what
-  // TunerLevel/TunerStave render while `silence !== "cut"`.
+  // practice.tuner/REQ-003 — the last reading shown, never updated once it
+  // starts lingering: this only ever advances while `tuner.reading` is
+  // non-null, mirroring `lastReadingRef` above but never reset to null by a
+  // gap, since its whole point is to survive one.
   const staleReadingRef = useRef<NoteJudged | null>(null);
   if (tuner.reading !== null) {
     staleReadingRef.current = tuner.reading;
@@ -431,8 +402,6 @@ function TunerScreenComponent(props: {
   const reducedMotion = prefersReducedMotion();
 
   useEffect(() => {
-    if (silence === "cut") return;
-
     const clearPendingTimer = (): void => {
       if (silenceTimerRef.current !== null) {
         clearTimer(silenceTimerRef.current);
@@ -442,81 +411,51 @@ function TunerScreenComponent(props: {
 
     if (tuner.reading !== null) {
       // A live reading is shown at once — no fade in, nothing stale left
-      // pending (practice.tuner "a, interrupted").
+      // pending (practice.tuner/REQ-003/S5).
       clearPendingTimer();
       setPhase({ kind: "live" });
       return;
     }
 
-    if (staleReadingRef.current === null) {
-      // Silence before anything was ever heard — nothing to linger.
+    // practice.tuner/REQ-007/S3 — a microphone failure clears the reading at
+    // once: the "Can't hear" card takes over, not a lingering reading. Only
+    // an ordinary silence (REQ-003) lingers; and there is nothing to linger
+    // before anything has ever been heard.
+    if (
+      staleReadingRef.current === null ||
+      tuner.listening.kind === "cannot-hear"
+    ) {
       setPhase({ kind: "empty", enteredViaTimer: false });
       return;
     }
 
-    if (silence === "ghost") {
-      // c — no timer at all: grey, held until the next reading or unmount.
-      setPhase({
-        kind: "stale",
-        dataState: "ghost",
-        opacity: 1,
-        grey: true,
-        transitionMs: null,
-      });
-      return;
-    }
-
-    if (silence === "fade") {
-      // a — opacity 1 → 0 over FADE_MS, in its original colour.
-      setPhase({
-        kind: "stale",
-        dataState: "fading",
-        opacity: reducedMotion ? 1 : 0,
-        grey: false,
-        transitionMs: reducedMotion ? null : FADE_MS,
-      });
-      silenceTimerRef.current = setTimer(() => {
-        silenceTimerRef.current = null;
-        setPhase({ kind: "empty", enteredViaTimer: true });
-      }, FADE_MS);
-      return clearPendingTimer;
-    }
-
-    // b — grey at once, held lingerMs, then fades over lingerFadeMs
-    // (design-loop variant, 007 round 4, follow-up 2 — the switch's own
-    // timing per `?variant`, in place of the LINGER_MS/LINGER_FADE_MS
-    // constants).
-    setPhase({
-      kind: "stale",
-      dataState: "fading",
-      opacity: 1,
-      grey: true,
-      transitionMs: null,
-    });
+    // practice.tuner/REQ-003/S4 — grey at once, held for motion.lingerHoldMs,
+    // then faded out over motion.lingerFadeMs; reduced motion holds at
+    // opacity 1 throughout and is removed with no transition at the same
+    // 0.8 s mark instead.
+    setPhase({ kind: "stale", opacity: 1, transitionMs: null });
     silenceTimerRef.current = setTimer(() => {
       setPhase({
         kind: "stale",
-        dataState: "fading",
         opacity: reducedMotion ? 1 : 0,
-        grey: true,
-        transitionMs: reducedMotion ? null : lingerFadeMs,
+        transitionMs: reducedMotion ? null : motion.lingerFadeMs,
       });
       silenceTimerRef.current = setTimer(() => {
         silenceTimerRef.current = null;
         setPhase({ kind: "empty", enteredViaTimer: true });
-      }, lingerFadeMs);
-    }, lingerMs);
+      }, motion.lingerFadeMs);
+    }, motion.lingerHoldMs);
     return clearPendingTimer;
     // `reducedMotion` is deliberately not a dependency: it's read fresh each
-    // time this effect runs (whenever the reading or the mode itself
-    // changes), and re-running the whole timer chain on every render were it
-    // tracked (it isn't memoised) would restart an already-scheduled fade.
-  }, [tuner.reading, silence, setTimer, clearTimer, lingerMs, lingerFadeMs]);
-
-  // design-loop variant (007 round 4) — "Play a note"'s own entrance once a
-  // fade (a or b) has finished (`enteredViaTimer`): starts at opacity 0,
-  // flips to 1 one (fake-timer-injectable) tick later so the CSS transition
-  // in TunerLevel has something to animate from. Reduced motion: appears at
+    // time this effect runs (whenever the reading changes), and re-running
+    // the whole timer chain on every render were it tracked (it isn't
+    // memoised) would restart an already-scheduled fade.
+  }, [tuner.reading, tuner.listening.kind, setTimer, clearTimer]);
+
+  // practice.tuner/REQ-003 — "Play a note"'s own entrance once the linger's
+  // fade has finished (`enteredViaTimer`): starts at opacity 0, flips to 1
+  // one (fake-timer-injectable) tick later so the CSS transition in
+  // TunerLevel has something to animate from. Reduced motion: appears at
   // once, no transition.
   const [emptyFadingIn, setEmptyFadingIn] = useState(false);
   const emptyTimerRef = useRef<number | null>(null);
@@ -525,12 +464,7 @@ function TunerScreenComponent(props: {
       clearTimer(emptyTimerRef.current);
       emptyTimerRef.current = null;
     }
-    if (
-      silence !== "cut" &&
-      phase.kind === "empty" &&
-      phase.enteredViaTimer &&
-      !reducedMotion
-    ) {
+    if (phase.kind === "empty" && phase.enteredViaTimer && !reducedMotion) {
       setEmptyFadingIn(true);
       emptyTimerRef.current = setTimer(() => {
         emptyTimerRef.current = null;
@@ -545,24 +479,19 @@ function TunerScreenComponent(props: {
         emptyTimerRef.current = null;
       }
     };
-  }, [phase, silence, reducedMotion, setTimer, clearTimer]);
+  }, [phase, reducedMotion, setTimer, clearTimer]);
 
   const stale: StaleReading | undefined =
     phase.kind === "stale" && staleReadingRef.current !== null
       ? {
           reading: staleReadingRef.current,
-          dataState: phase.dataState,
           opacity: phase.opacity,
-          grey: phase.grey,
           transitionMs: phase.transitionMs,
         }
       : undefined;
 
   const emptyOpacity: number | undefined =
-    silence !== "cut" &&
-    phase.kind === "empty" &&
-    phase.enteredViaTimer &&
-    !reducedMotion
+    phase.kind === "empty" && phase.enteredViaTimer && !reducedMotion
       ? emptyFadingIn
         ? 0
         : 1
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index e07d03e..1f5b46e 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -325,11 +325,8 @@ export function TunerStave(props: {
   // TunerScreen's injectable "now" while silent and the trail is still
   // aging (TunerScreen's own rAF-driven re-renders keep advancing it).
   readonly nowMs: number;
-  // design-loop variant (007 round 4) — the last reading, still shown
-  // fading or ghosted; `undefined` when nothing is (live, "cut", or truly
-  // nothing to show). Only the head, its cents and the Hz figure read it
-  // (below) — the ledgers, guide and accidental stay tied to a live
-  // `reading` only, disappearing at once as they always have.
+  // practice.tuner/REQ-003 — the last reading, still lingering; `undefined`
+  // when nothing is (live, or truly nothing to show).
   readonly stale?: StaleReading;
 }): JSX.Element {
   const { tuner: snapshot, trail, nowMs, stale } = props;
@@ -350,10 +347,9 @@ export function TunerStave(props: {
   const { ref: sizeRef, size: cardSize } = useMeasuredSize<HTMLDivElement>();
   const cardScale =
     cardSize === null ? 1 : Math.min(1, cardSize.width / CARD_WIDTH);
-  // design-loop variant (007 round 4) — the reading the head/cents/Hz
-  // display: live when there is one, else the stale reading while it's
-  // fading/ghosted, so those elements linger in place rather than
-  // disappearing with the rest.
+  // practice.tuner/REQ-003 — the reading the head/cents/Hz display: live
+  // when there is one, else the last reading while it lingers, so those
+  // elements stay in place rather than disappearing with the rest.
   const effectiveReading = reading ?? stale?.reading ?? null;
 
   // The register decision is made once, from whichever note governs the
@@ -385,10 +381,10 @@ export function TunerStave(props: {
       ? null
       : placeHeard(reading.heard.nearest, reading.heard.cents, adj);
   const target = targetNote === null ? null : placeTarget(targetNote, adj);
-  // design-loop variant (007 round 4) — the head/cents/Hz's own placement,
-  // off `effectiveReading` rather than `heard` (which stays live-only, still
+  // practice.tuner/REQ-003 — the head/cents/Hz's own placement, off
+  // `effectiveReading` rather than `heard` (which stays live-only, still
   // governing the ledgers/guide/accidental below): identical to `heard`
-  // while live, and the last reading's placement while fading/ghosted.
+  // while live, and the last reading's placement while it lingers.
   const heardStale =
     effectiveReading === null
       ? null
@@ -400,20 +396,20 @@ export function TunerStave(props: {
 
   const tone =
     reading === null ? paper.faint : TONE_BY_VERDICT[reading.verdict];
-  // design-loop variant (007 round 4) — a's own fade keeps the verdict's own
-  // colour (only opacity changes); b's/c's stale states grey it instead.
-  // Drives the head/cents/Hz only (`tone` above stays live-only, still
-  // governing the trail gradient and the accidental).
-  const displayTone = stale?.grey
-    ? paper.faint
-    : effectiveReading === null
+  // practice.tuner/REQ-003 — grey while lingering. Drives the head/cents/Hz
+  // only (`tone` above stays live-only, still governing the trail gradient
+  // and the accidental).
+  const displayTone =
+    stale !== undefined
       ? paper.faint
-      : TONE_BY_VERDICT[effectiveReading.verdict];
+      : effectiveReading === null
+        ? paper.faint
+        : TONE_BY_VERDICT[effectiveReading.verdict];
   const headStaleAttrs = staleAttrs(reading === null ? stale : undefined);
 
-  // design-loop variant (007 round 4, follow-up 1) — off `heardStale`, not
-  // `heard`, so the octave mark lingers with the head; the same grey as the
-  // lingering head in b/c, its own ink otherwise (never verdict-toned).
+  // practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the octave
+  // mark lingers with the head; the same grey as the lingering head, its
+  // own ink otherwise (never verdict-toned).
   const heardStaleMarkY =
     heardStale !== null && heardStale.position.mark !== ""
       ? octaveMarkY(
@@ -422,7 +418,7 @@ export function TunerStave(props: {
           heardStale.hy,
         )
       : null;
-  const headOctaveMarkColor = stale?.grey ? paper.faint : paper.inkSoft;
+  const headOctaveMarkColor = stale !== undefined ? paper.faint : paper.inkSoft;
   const targetMarkYValue =
     target !== null && target.position.mark !== ""
       ? targetMarkY(target.position.mark, target.position.y)
@@ -438,13 +434,11 @@ export function TunerStave(props: {
   // stave-lines-only baseline, exactly as an empty reading always did.
   // TRAIL_MS is used directly for all trail age calculations.
   //
-  // design-loop variant (007 round 4, follow-up 1) — off `heardStale`
-  // first, not `heard`: while a/b/c's own lingering head (and its
-  // furniture) is still drawn, the layout must keep seeing exactly that
-  // head's own contribution, not the trail's (which can itself go empty —
-  // c's own ghost outlives the 2.5 s trail) — the trail fallback below
-  // only ever stands in once `heardStale` itself is `null` too (the
-  // lingering head has actually been removed).
+  // practice.tuner/REQ-003 — off `heardStale` first, not `heard`: while the
+  // lingering head (and its furniture) is still drawn, the layout must keep
+  // seeing exactly that head's own contribution, not the trail's — the
+  // trail fallback below only ever stands in once `heardStale` itself is
+  // `null` too (the lingering head has actually been removed).
   const layoutHeard =
     heardStale !== null
       ? heardStale
@@ -469,8 +463,8 @@ export function TunerStave(props: {
   // (lines 1271-1279), reproduced with our simplified single-clef model.
   const tops: number[] = [82];
   const bots: number[] = [136];
-  // design-loop variant (007 round 4) — off `heardStale`, not `heard`, so
-  // the cents figure stays in place through a's/b's/c's own fade/ghost.
+  // practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the cents
+  // figure stays in place through the linger.
   const centsTop =
     heardStale !== null
       ? Math.min(heardStale.position.y, heardStale.hy) - CENTS_TOP_OFFSET
@@ -544,8 +538,8 @@ export function TunerStave(props: {
   const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
   const referenceLabel =
     referenceNote === null ? "— IS" : `${noteLabel(referenceNote)} IS`;
-  // design-loop variant (007 round 4) — off `effectiveReading`, so the Hz
-  // figure lingers with the rest through a's/b's/c's own fade/ghost.
+  // practice.tuner/REQ-003 — off `effectiveReading`, so the Hz figure
+  // lingers with the rest.
   const heardHz = effectiveReading === null ? null : effectiveReading.heard.hz;
 
   return (
@@ -653,13 +647,13 @@ export function TunerStave(props: {
               />
             </>
           )}
-          {/* design-loop variant (007 round 4, follow-up 1) — the heard
-              head's own furniture: gated on `heardStale`, not `heard`, and
-              carrying the head's own data-state/aria-hidden/opacity, so the
-              ledgers and the dotted guide linger with the head rather than
-              vanishing out from under it (leaving it floating with no
-              ledger lines). Colour untouched — neither is verdict-toned
-              today, so only opacity animates. */}
+          {/* practice.tuner/REQ-003 — the heard head's own furniture: gated
+              on `heardStale`, not `heard`, and carrying the head's own
+              data-state/aria-hidden/opacity, so the ledgers and the dotted
+              guide linger with the head rather than vanishing out from
+              under it (leaving it floating with no ledger lines). Colour
+              untouched — neither is verdict-toned, so only opacity
+              animates. */}
           {heardStale !== null && (
             <>
               {heardStale.ledgers.map((ledger, index) => (
@@ -803,12 +797,11 @@ export function TunerStave(props: {
               {ACCIDENTAL_GLYPH[targetNote.accidental]}
             </div>
           )}
-        {/* design-loop variant (007 round 4, follow-up 1) — off
-            `heardStale`/`effectiveReading`, not `heard`/`reading`, and
-            `displayTone` (not `tone`, which the trail's gradient must keep
-            reading unchanged), so the accidental lingers with the head at
-            the colour/opacity/grey it carries, instead of losing its own
-            sharp/flat while the head is still shown. */}
+        {/* practice.tuner/REQ-003 — off `heardStale`/`effectiveReading`, not
+            `heard`/`reading`, and `displayTone` (not `tone`, which the
+            trail's gradient must keep reading unchanged), so the accidental
+            lingers with the head at the colour/opacity it carries, instead
+            of losing its own sharp/flat while the head is still shown. */}
         {heardStale !== null &&
           effectiveReading !== null &&
           effectiveReading.heard.nearest.accidental !== "natural" && (
@@ -867,12 +860,10 @@ export function TunerStave(props: {
               {formatCents(effectiveReading.heard.cents)}
             </div>
           )}
-        {/* design-loop variant (007 round 4, follow-up 1) — off
-            `heardStale`, not `heard` (and a new test id — there wasn't one
-            today), so the octave mark lingers with the head; the same grey
-            as the lingering head in b/c (`headOctaveMarkColor`), its own
-            ink otherwise — it was never verdict-toned, so a's own fade
-            leaves its colour alone too. */}
+        {/* practice.tuner/REQ-003 — off `heardStale`, not `heard`, so the
+            octave mark lingers with the head; the same grey as the
+            lingering head (`headOctaveMarkColor`), its own ink otherwise —
+            it was never verdict-toned. */}
         {heardStale !== null &&
           heardStale.position.mark !== "" &&
           heardStaleMarkY !== null && (
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 2e04db2..4807264 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -24,7 +24,6 @@ import {
 import { builtInCatalogue } from "../theory/published";
 import { App } from "./App";
 import { localStorageSelectionStore } from "./selection-store";
-import type { SilenceMode } from "./tuner-silence";
 
 const rootElement = document.getElementById("root");
 if (rootElement === null) {
@@ -113,37 +112,6 @@ exposeSoundForTiming(sound);
 const listening = webAudioListening(audioContext);
 exposeListeningForTiming(listening);
 
-// design-loop variant (007 round 4) — the tuner's silence treatment,
-// exploring "it's very abrupt how quickly everything disappears when going
-// from hearing something to nothing" on the phone via `?variant=a|b|c`.
-// TEMPORARY — deleted, along with every other block carrying this comment,
-// once one treatment/timing is chosen.
-//
-// design-loop variant (007 round 4, follow-up 2) — the user picked b
-// (linger) and asked to try it with a faster fade ("b but try with faster
-// fade"), so all three letters are now the linger treatment at different
-// timings rather than three different treatments: `a` fades twice as fast
-// as `b` (the one the user tried), `c` also shortens the hold. Anything
-// else, including no parameter, is still `"cut"`, today's behaviour,
-// untouched — `lingerMs`/`lingerFadeMs` go unread in that case.
-interface SilenceVariant {
-  readonly silence: SilenceMode;
-  readonly lingerMs: number;
-  readonly lingerFadeMs: number;
-}
-function silenceVariantFromUrl(): SilenceVariant {
-  const variant = new URLSearchParams(window.location.search).get("variant");
-  if (variant === "a")
-    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 200 };
-  if (variant === "b")
-    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 400 };
-  if (variant === "c")
-    return { silence: "linger", lingerMs: 600, lingerFadeMs: 200 };
-  return { silence: "cut", lingerMs: 1000, lingerFadeMs: 400 };
-}
-
-const silenceVariant = silenceVariantFromUrl();
-
 // design-loop variant (007 round 5) — the tuner's two layout treatments,
 // explored on the phone via `?fit=a|b` alongside `?variant=` (round 4,
 // above — the two switches work together in one URL, e.g. `?variant=c&fit=a`).
@@ -175,9 +143,6 @@ createRoot(rootElement).render(
         exposeNoteJudgedForTiming(session);
       }}
       onPaintAge={collectPaintAge}
-      silence={silenceVariant.silence}
-      lingerMs={silenceVariant.lingerMs}
-      lingerFadeMs={silenceVariant.lingerFadeMs}
       fit={fit}
     />
   </StrictMode>,
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index 4262dbe..9775630 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -36,3 +36,10 @@ export const tuner = {
   targetHead: "#a39a8c",
   ghostInk: "#8a8175",
 } as const;
+
+// practice.tuner/REQ-003 — the last reading's own timing once it clears:
+// held grey for lingerHoldMs, then faded out over lingerFadeMs.
+export const motion = {
+  lingerHoldMs: 600,
+  lingerFadeMs: 200,
+} as const;
diff --git a/src/ui/tuner-silence.ts b/src/ui/tuner-silence.ts
index 969e3aa..572cf8d 100644
--- a/src/ui/tuner-silence.ts
+++ b/src/ui/tuner-silence.ts
@@ -1,40 +1,31 @@
-// design-loop variant (007 round 4) — exploration for the tuner's silence
-// treatment: today the reading is cleared 300 ms after the last pitch and
-// the view removes everything at once. Three treatments (fade/linger/ghost)
-// live behind `?variant=a|b|c`; `"cut"` (no param) is today's behaviour,
-// untouched. TEMPORARY: one treatment becomes the rule in a later task and
-// this whole file — along with every other block carrying this comment —
-// is deleted then.
-//
-// A shared, dependency-free module (no import of TunerLevel/TunerStave,
-// which both import TunerScreen — importing either from here would be
-// circular) so the type and the one small helper below are defined once,
-// not duplicated between TunerLevel.tsx and TunerStave.tsx.
+// practice.tuner/REQ-003 — the last reading's own view state once nothing
+// more is detected: it lingers where it was, greyed, for motion.lingerHoldMs,
+// then fades out over motion.lingerFadeMs. A shared, dependency-free module
+// (no import of TunerLevel/TunerStave, which both import TunerScreen —
+// importing either from here would be circular) so the type and the one
+// small helper below are defined once, not duplicated between
+// TunerLevel.tsx and TunerStave.tsx.
 import type { NoteJudged } from "../practice/published";
 
-export type SilenceMode = "cut" | "fade" | "linger" | "ghost";
-
 // The last reading TunerScreen showed, still being displayed after it
-// cleared: fading opacity 1 → 0 (a), held grey then fading (b), or grey and
-// held indefinitely (c, "ghost" — until the next reading or unmount).
+// cleared: held grey then fading opacity 1 → 0 (reduced motion: held at
+// opacity 1 throughout, then removed with no transition at all).
 export interface StaleReading {
   readonly reading: NoteJudged;
-  readonly dataState: "fading" | "ghost";
   readonly opacity: number;
-  readonly grey: boolean;
   // The CSS transition duration for `opacity`, or `null` for no animated
-  // transition (prefers-reduced-motion, or a steady state with nothing
-  // currently changing — c's ghost, or b's hold before its own fade).
+  // transition (prefers-reduced-motion, or the held phase before the fade
+  // has started).
   readonly transitionMs: number | null;
 }
 
-// The data-state/aria-hidden/opacity/transition a stale element carries,
+// The data-state/aria-hidden/opacity/transition a lingering element carries,
 // spread onto whichever element already carries its own data-testid.
-// `undefined` when there is nothing stale to show (live, or the "cut"
-// default, which renders exactly as it always has).
+// `undefined` when there is nothing stale to show (live, or truly nothing to
+// show).
 export function staleAttrs(stale: StaleReading | undefined):
   | {
-      readonly "data-state": "fading" | "ghost";
+      readonly "data-state": "fading";
       readonly "aria-hidden": "true";
       readonly style: {
         readonly opacity: number;
@@ -44,7 +35,7 @@ export function staleAttrs(stale: StaleReading | undefined):
   | undefined {
   if (stale === undefined) return undefined;
   return {
-    "data-state": stale.dataState,
+    "data-state": "fading",
     "aria-hidden": "true",
     style: {
       opacity: stale.opacity,
diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
index 15ad5c0..b14c178 100644
--- a/tests/ui/scenarios/tuner-helpers.ts
+++ b/tests/ui/scenarios/tuner-helpers.ts
@@ -6,6 +6,7 @@ import type { Session } from "../../../src/practice/published";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
+import { motion } from "../../../src/ui/theme";
 import {
   FakeClock,
   FakeListening,
@@ -39,10 +40,18 @@ export async function enterTuner(
   readonly listening: FakeListening;
   readonly clock: FakeClock;
   readonly session: Session;
+  readonly timer: ReturnType<typeof manualAnimationClock>;
 }> {
   cleanup();
   localStorage.clear();
   const { sessionDeps, listening, clock } = sessionDepsWithFakes();
+  // practice.tuner/REQ-003 — a deterministic default for the screen's own
+  // linger timer (TunerScreen's injectable setTimer/clearTimer), so an
+  // existing scenario can let it pass with letLingerPass below without
+  // depending on the real wall clock; overridden by a scenario that drives
+  // its own (finer-grained timing needs its own manualAnimationClock, e.g.
+  // tuner-linger.test.tsx's own S4-S6).
+  const timer = manualAnimationClock();
   let session: Session | null = null;
   render(
     createElement(App, {
@@ -52,6 +61,8 @@ export async function enterTuner(
       onSessionReady: (readySession: Session) => {
         session = readySession;
       },
+      setTimer: timer.setTimer,
+      clearTimer: timer.clearTimer,
       ...extraProps,
     }),
   );
@@ -65,7 +76,7 @@ export async function enterTuner(
   if (session === null) {
     throw new Error("unreachable: onSessionReady was not called by render()");
   }
-  return { listening, clock, session };
+  return { listening, clock, session, timer };
 }
 
 // A scenario may call this more than once (tuner-stave.test.tsx's
@@ -81,12 +92,16 @@ export async function enterAndHear(
   readonly listening: FakeListening;
   readonly clock: FakeClock;
   readonly session: Session;
+  readonly timer: ReturnType<typeof manualAnimationClock>;
 }> {
-  const { listening, clock, session } = await enterTuner(spelling, extraProps);
+  const { listening, clock, session, timer } = await enterTuner(
+    spelling,
+    extraProps,
+  );
   listening.feed(hz);
   clock.advanceMs(1);
   await act(async () => {});
-  return { listening, clock, session };
+  return { listening, clock, session, timer };
 }
 
 // practice.tuner/REQ-004/S7, REQ-009/S3 — advances the fake clock past the
@@ -102,6 +117,23 @@ export async function letGapPass(f: {
   await act(async () => {});
 }
 
+// practice.tuner/REQ-003 — advances the screen's own linger clock (`timer`,
+// from enterTuner/enterAndHear, or a scenario's own manualAnimationClock)
+// past the 0.6 s hold and the 0.2 s fade, in two calls (see the note on
+// `manualAnimationClock` below — a chain of two real delays needs one
+// `advanceMs` per boundary), so a scenario that reads the fully-silent state
+// after a gap doesn't have to know the two durations itself.
+export function letLingerPass(f: {
+  readonly timer: { readonly advanceMs: (deltaMs: number) => void };
+}): void {
+  act(() => {
+    f.timer.advanceMs(motion.lingerHoldMs);
+  });
+  act(() => {
+    f.timer.advanceMs(motion.lingerFadeMs);
+  });
+}
+
 // practice.tuner/REQ-005/S5, S6 — the trail's own clock is TunerScreen's
 // injectable `now`/`requestFrame`/`cancelFrame` (not the session's own
 // `FakeClock` above, which drives the *session's* gap timer only, and never
@@ -112,16 +144,15 @@ export async function letGapPass(f: {
 // lets a scenario assert the loop is/isn't running without inspecting
 // TunerScreen's own internals.
 //
-// design-loop variant (007 round 4) — extended with a fake setTimeout/
-// clearTimeout pair (`setTimer`/`clearTimer`, `timerPending`) sharing this
-// same `ms`, for TunerScreen's injectable silence-treatment timers (the
-// fade/linger/ghost hold and fade-out). Unlike the frame slot above, more
-// than one timer can be pending at once (mirroring real setTimeout), and
-// `advanceMs` itself fires whatever is due — including one a just-fired
-// timer schedules, if its own delay lands within the same advance (b's
-// hold → fade chain) — so a scenario drives everything through the one
-// `now`/`advanceMs` pair already in hand, exactly as the acceptance text
-// describes ("advance 600 ms → they are gone").
+// Also carries a fake setTimeout/clearTimeout pair (`setTimer`/`clearTimer`,
+// `timerPending`) sharing this same `ms`, for TunerScreen's own injectable
+// linger timer (practice.tuner/REQ-003). Unlike the frame slot above, more
+// than one timer can be pending at once (mirroring real setTimeout).
+// `advanceMs` sets `ms` to its target before firing anything due, so a timer
+// a callback schedules mid-fire is due against that already-advanced `ms` —
+// it fires within the *same* `advanceMs` call only for a zero delay (the
+// "Play a note" entrance tick); the linger's own hold → fade chain (two real
+// delays) needs one `advanceMs` per boundary.
 export function manualAnimationClock(startMs = 0): {
   readonly now: () => number;
   readonly requestFrame: (callback: FrameRequestCallback) => number;
diff --git a/tests/ui/scenarios/tuner-silence-variants.test.tsx b/tests/ui/scenarios/tuner-linger.test.tsx
similarity index 52%
rename from tests/ui/scenarios/tuner-silence-variants.test.tsx
rename to tests/ui/scenarios/tuner-linger.test.tsx
index 0a1a815..5a150a1 100644
--- a/tests/ui/scenarios/tuner-silence-variants.test.tsx
+++ b/tests/ui/scenarios/tuner-linger.test.tsx
@@ -1,185 +1,195 @@
-// design-loop variant (007 round 4) — exploration for the tuner's silence
-// treatment (the problem: "it's very abrupt how quickly everything
-// disappears when going from hearing something to nothing"). TEMPORARY:
-// behind `?variant=a|b|c`; one treatment becomes the rule in a later task
-// and this whole file is deleted along with every other block carrying
-// this comment.
+// practice.tuner/REQ-003 — the last reading's own linger: once nothing more
+// is detected it stays where it was, grey, for motion.lingerHoldMs, then
+// fades out over motion.lingerFadeMs, before "Play a note" takes its place.
+// S4–S6 are the rule's own scenarios; the rest below were kept from the
+// design-loop exploration that arrived at it (rounds.md, round 4), renamed
+// to state the rule rather than the exploration that found it.
 import { act, cleanup, screen } from "@testing-library/react";
-import { afterEach, expect, test } from "vitest";
+import { afterEach, expect, test, vi } from "vitest";
+import { motion, paper } from "../../../src/ui/theme";
 import {
   enterAndHear,
   letGapPass,
+  letLingerPass,
   manualAnimationClock,
 } from "./tuner-helpers";
 
+// jsdom's CSSOM canonicalises a hex colour set via an inline style object
+// to `rgb(...)` (but leaves a function colour like `oklch(...)` alone) —
+// this reproduces that canonicalisation from the theme's own hex tokens
+// rather than hardcoding the converted string.
+function rgbOf(hex: string): string {
+  const value = Number.parseInt(hex.slice(1), 16);
+  const r = (value >> 16) & 0xff;
+  const g = (value >> 8) & 0xff;
+  const b = value & 0xff;
+  return `rgb(${r}, ${g}, ${b})`;
+}
+
 afterEach(() => {
   cleanup();
+  vi.unstubAllGlobals();
 });
 
-test("design-loop variant (007 round 4) — a: fades over 600 ms, then Play a note", async () => {
+test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async () => {
   const animClock = manualAnimationClock();
   const f = await enterAndHear(445.0, undefined, {
-    silence: "fade",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
   await letGapPass(f);
 
+  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
     "fading",
   );
+  expect(screen.getByTestId("tuner-line").getAttribute("aria-hidden")).toBe(
+    "true",
+  );
   expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
     "fading",
   );
+  expect(screen.getByTestId("tuner-tag").style.color).toBe(rgbOf(paper.faint));
   expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
     "fading",
   );
-  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+  expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
+  expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
+  expect(screen.getByTestId("heard-hz").style.color).toBe(rgbOf(paper.faint));
   expect(screen.queryByTestId("tuner-empty")).toBeNull();
 
+  // 0.5 s later they are still shown.
   act(() => {
-    animClock.advanceMs(600);
+    animClock.advanceMs(500);
   });
+  expect(screen.getByTestId("tuner-line")).toBeTruthy();
+  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
+  expect(screen.getByTestId("heard-head")).toBeTruthy();
+  expect(screen.queryByTestId("tuner-empty")).toBeNull();
 
+  // 0.8 s after they turned grey they are gone and "Play a note" is shown:
+  // the remaining 0.1 s of the hold, then the 0.2 s fade.
+  act(() => {
+    animClock.advanceMs(motion.lingerHoldMs - 500);
+  });
+  act(() => {
+    animClock.advanceMs(motion.lingerFadeMs);
+  });
   expect(screen.queryByTestId("tuner-line")).toBeNull();
   expect(screen.queryByTestId("tuner-tag")).toBeNull();
   expect(screen.queryByTestId("heard-head")).toBeNull();
+  expect(screen.queryByTestId("strip-cents")).toBeNull();
+  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
 });
 
-test("design-loop variant (007 round 4) — b: lingers 1000 ms, then fades 400 ms more", async () => {
+test("practice.tuner/REQ-003/S5 — a note during the linger", async () => {
   const animClock = manualAnimationClock();
   const f = await enterAndHear(445.0, undefined, {
-    silence: "linger",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
   await letGapPass(f);
-
   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
     "fading",
   );
-  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
-    "fading",
-  );
-  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
-    "fading",
-  );
+  expect(animClock.timerPending).toBe(true); // the linger's own timer is armed
 
-  act(() => {
-    animClock.advanceMs(1000);
-  });
-  expect(screen.getByTestId("tuner-line")).toBeTruthy();
-  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
-  expect(screen.getByTestId("heard-head")).toBeTruthy();
-  expect(screen.queryByTestId("tuner-empty")).toBeNull();
+  f.listening.feed(523.25); // C5
+  f.clock.advanceMs(1);
+  await act(async () => {});
 
-  act(() => {
-    animClock.advanceMs(400);
-  });
-  expect(screen.queryByTestId("tuner-line")).toBeNull();
-  expect(screen.queryByTestId("tuner-tag")).toBeNull();
-  expect(screen.queryByTestId("heard-head")).toBeNull();
-  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
+  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
+  expect(screen.queryByTestId("tuner-empty")).toBeNull(); // never appeared in between
+  expect(animClock.timerPending).toBe(false); // the pending linger timer was cancelled
 });
 
-test("design-loop variant (007 round 4) — c: ghosts until the next reading, no timer", async () => {
+test("practice.tuner/REQ-003/S6 — lingering with a target", async () => {
   const animClock = manualAnimationClock();
-  const f = await enterAndHear(445.0, undefined, {
-    silence: "ghost",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
+  const f = await enterAndHear(440.0, undefined, {
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
+  act(() => {
+    f.session.pinTarget(69); // A4
+  });
+  f.listening.feed(523.25); // C5, now measured from A4 (REQ-004/S3)
+  f.clock.advanceMs(1);
+  await act(async () => {});
+
   await letGapPass(f);
 
-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
-    "ghost",
-  );
-  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
-    "ghost",
-  );
-  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
-    "ghost",
-  );
+  // The big name follows REQ-003/S2 at once — no linger of its own.
+  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
 
-  act(() => {
-    animClock.advanceMs(10_000);
-  });
+  // The line, the tag, the heard head and the Hz linger grey and fade, as S4.
   expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
-    "ghost",
+    "fading",
   );
   expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
-    "ghost",
+    "fading",
   );
   expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
-    "ghost",
+    "fading",
   );
+  expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
 
-  f.listening.feed(523.25); // C5
-  f.clock.advanceMs(1);
-  await act(async () => {});
-
-  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
-  expect(document.querySelectorAll('[data-state="ghost"]').length).toBe(0);
+  letLingerPass({ timer: animClock });
+  expect(screen.queryByTestId("tuner-line")).toBeNull();
+  expect(screen.queryByTestId("tuner-tag")).toBeNull();
+  expect(screen.queryByTestId("heard-head")).toBeNull();
+  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
 });
 
-test("design-loop variant (007 round 4) — a, interrupted: a new reading during the fade replaces it live at once", async () => {
+test("practice.tuner/REQ-003 — reduced motion removes the linger at 0.8 s without fading", async () => {
+  vi.stubGlobal("matchMedia", (query: string) => ({
+    matches: query === "(prefers-reduced-motion: reduce)",
+    media: query,
+    onchange: null,
+    addListener: () => {},
+    removeListener: () => {},
+    addEventListener: () => {},
+    removeEventListener: () => {},
+    dispatchEvent: () => false,
+  }));
+
   const animClock = manualAnimationClock();
   const f = await enterAndHear(445.0, undefined, {
-    silence: "fade",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
   await letGapPass(f);
-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
-    "fading",
-  );
-  expect(animClock.timerPending).toBe(true);
 
-  f.listening.feed(523.25); // C5
-  f.clock.advanceMs(1);
-  await act(async () => {});
+  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
+  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();
 
-  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
-  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
-  expect(animClock.timerPending).toBe(false);
-});
+  act(() => {
+    animClock.advanceMs(motion.lingerHoldMs);
+  });
+  expect(screen.getByTestId("tuner-line")).toBeTruthy();
+  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
+  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();
 
-test("design-loop variant (007 round 4) — default: no silence prop removes everything at once, as today", async () => {
-  const f = await enterAndHear(445.0);
-  await letGapPass(f);
+  act(() => {
+    animClock.advanceMs(motion.lingerFadeMs);
+  });
   expect(screen.queryByTestId("tuner-line")).toBeNull();
+  expect(screen.queryByTestId("heard-head")).toBeNull();
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
 });
 
-// design-loop variant (007 round 4, follow-up 1) — the heard head's own
-// furniture (ledgers, accidental, octave mark, dotted guide) must linger
-// with the head, not vanish out from under it while it still fades/holds/
-// ghosts (a floating head with no ledger lines, or an accidental-less
+// The heard head's own furniture (ledgers, accidental, octave mark, dotted
+// guide) must linger with the head, not vanish out from under it while it
+// still fades (a floating head with no ledger lines, or an accidental-less
 // sharp, reads as a different note).
 
-test("design-loop variant (007 round 4, follow-up 1) — a: the ledger lines linger with the head, then fade with it", async () => {
+test("practice.tuner/REQ-003 — the ledger lines linger with the head, then fade with it", async () => {
   const animClock = manualAnimationClock();
   // C6 (two ledger lines above the stave — practice.tuner/REQ-005/S3's own
   // register/ledger arithmetic).
   const f = await enterAndHear(1046.5, undefined, {
-    silence: "fade",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
@@ -195,20 +205,14 @@ test("design-loop variant (007 round 4, follow-up 1) — a: the ledger lines lin
     "fading",
   );
 
-  act(() => {
-    animClock.advanceMs(600);
-  });
+  letLingerPass({ timer: animClock });
   expect(screen.queryAllByTestId("heard-ledger")).toHaveLength(0);
   expect(screen.queryByTestId("heard-guide")).toBeNull();
 });
 
-test("design-loop variant (007 round 4, follow-up 1) — a: the accidental glyph lingers with the head, then fades with it", async () => {
+test("practice.tuner/REQ-003 — the accidental glyph lingers with the head, then fades with it", async () => {
   const animClock = manualAnimationClock();
   const f = await enterAndHear(466.16, "sharp", {
-    silence: "fade",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
@@ -219,20 +223,14 @@ test("design-loop variant (007 round 4, follow-up 1) — a: the accidental glyph
     screen.getByTestId("heard-accidental").getAttribute("data-state"),
   ).toBe("fading");
 
-  act(() => {
-    animClock.advanceMs(600);
-  });
+  letLingerPass({ timer: animClock });
   expect(screen.queryByTestId("heard-accidental")).toBeNull();
 });
 
-test("design-loop variant (007 round 4, follow-up 1) — c: the octave mark stays ghosted with the head", async () => {
+test("practice.tuner/REQ-003 — the octave mark lingers with the head", async () => {
   const animClock = manualAnimationClock();
   // E2, drawn under 8vb (practice.tuner/REQ-005/S3).
   const f = await enterAndHear(82.41, undefined, {
-    silence: "ghost",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
@@ -242,46 +240,12 @@ test("design-loop variant (007 round 4, follow-up 1) — c: the octave mark stay
   expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
   expect(
     screen.getByTestId("heard-octave-mark").getAttribute("data-state"),
-  ).toBe("ghost");
-});
-
-test("design-loop variant (007 round 4, follow-up 2) — linger with its own timing (600 ms hold, 200 ms fade)", async () => {
-  const animClock = manualAnimationClock();
-  const f = await enterAndHear(445.0, undefined, {
-    silence: "linger",
-    lingerMs: 600,
-    lingerFadeMs: 200,
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
-    setTimer: animClock.setTimer,
-    clearTimer: animClock.clearTimer,
-  });
-  await letGapPass(f);
-  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
-    "fading",
-  );
-
-  act(() => {
-    animClock.advanceMs(600);
-  });
-  expect(screen.getByTestId("tuner-line")).toBeTruthy();
-  expect(screen.queryByTestId("tuner-empty")).toBeNull();
-
-  act(() => {
-    animClock.advanceMs(200);
-  });
-  expect(screen.queryByTestId("tuner-line")).toBeNull();
-  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+  ).toBe("fading");
 });
 
-test("design-loop variant (007 round 4, follow-up 1) — a: the head does not jump between the last sounding render and the first silent one", async () => {
+test("practice.tuner/REQ-003 — the head does not jump between the last sounding render and the first silent one", async () => {
   const animClock = manualAnimationClock();
   const f = await enterAndHear(445.0, undefined, {
-    silence: "fade",
-    now: animClock.now,
-    requestFrame: animClock.requestFrame,
-    cancelFrame: animClock.cancelFrame,
     setTimer: animClock.setTimer,
     clearTimer: animClock.clearTimer,
   });
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index 9217c8c..e9968fc 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -5,7 +5,7 @@ import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
 import { sessionDepsWithFakes } from "../../practice/fakes";
-import { enterAndHear } from "./tuner-helpers";
+import { enterAndHear, letLingerPass } from "./tuner-helpers";
 
 // No global `afterEach` in scope (vitest globals are off), so
 // @testing-library/react's automatic cleanup never registers itself; without
@@ -82,6 +82,7 @@ test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
   const f = await enterAndHear(445.0);
   f.clock.advanceMs(300);
   await act(async () => {});
+  letLingerPass(f); // the last reading lingers, then goes (S4)
   expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
   expect(screen.queryByTestId("tuner-line")).toBeNull();
   expect(screen.queryByTestId("tuner-tag")).toBeNull();
diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
index 6fac2a1..94da0fd 100644
--- a/tests/ui/scenarios/tuner-stave.test.tsx
+++ b/tests/ui/scenarios/tuner-stave.test.tsx
@@ -4,6 +4,7 @@ import {
   enterAndHear,
   enterTuner,
   letGapPass,
+  letLingerPass,
   manualAnimationClock,
 } from "./tuner-helpers";
 
@@ -140,6 +141,7 @@ test("practice.tuner/REQ-005/S5 — the trail outlives the note", async () => {
     animClock.advanceMs(500);
   }
   await letGapPass(f); // the session's own 300 ms gap — the reading clears
+  letLingerPass(f); // the last reading lingers, then goes (REQ-003/S4)
   expect(screen.queryByTestId("heard-head")).toBeNull();
   expect(screen.queryByTestId("strip-cents")).toBeNull();
   expect(screen.getByTestId("heard-hz").textContent).toBe("—");
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-29)

SPEC: PASS · QUALITY: PASS

- Every element the requirement lists lingers grey and fades together; the hold and fade are `motion.lingerHoldMs` 600 and `motion.lingerFadeMs` 200 with no stray local numbers; reduced motion removes at 0.8 s without a transition; `aria-hidden` on every lingering element.
- A failed or refused microphone does not linger — judged right: REQ-007 says the last reading is cleared, and the session sets the reading and `cannot-hear` in one change, so the screen never enters the linger. A hidden page falls through to the ordinary linger, unseen. Leaving the tuner unmounts the screen and the effect's cleanup cancels the timer.
- "Play a note" at once beneath a pinned target's greyed name while the rest lingers — matches S6 with S2.
- One timer in flight; cancelled on a new reading, on unmount and on a change of listening state; StrictMode cannot double-schedule; the fake timer lives only in the test helper.
- The trail and the spiral's needle unchanged. No round-4 leftovers; the 19 round-5 lines untouched.
- The two existing tests touched gained only `letLingerPass`; no assertion changed.
- [minor, may-defer] the S4 test asserts the grey state on the line, the tag and the Hz but not on the big name (`tuner-name`), which S4 lists; the code greys it. **Noted for converge.**
- Unverified: a real browser throttling `setTimeout` in a backgrounded tab during a linger — acceptance-level.

The reviewer ran no tests (the next task was editing the tree); the controller's `pnpm check` at the T031 state: exit 0, 77 files, 337 tests, cargo green. `eslint.config.js` in the package's range is the controller's separate commit 7106bf1, not T031's.

<!-- recorded 2026-09-29T18:34:37Z by scripts/record.sh -->
