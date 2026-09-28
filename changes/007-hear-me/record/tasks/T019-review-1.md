---
type: Task Review
title: Review package — T019 · 007-hear-me
description: The diff produced for T019, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T019.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T019.md
  - resource: git:41190678656548681a933703278e5336ede47126..41190678656548681a933703278e5336ede47126
generated:
  by: process:review-package.sh
  at: 2026-09-28T13:08:49Z
sdd_id: 007-hear-me
---

# Review package — T019 · 007-hear-me

base: `41190678656548681a933703278e5336ede47126` → head: `41190678656548681a933703278e5336ede47126`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index d379d6a..ba09654 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -232,8 +232,15 @@ export function App(props: {
   // hook. Keeping it optional and additive leaves App fully testable
   // without it.
   readonly onSessionReady?: (session: Session) => void;
+  // Optional: practice.tuner/REQ-006 — the age (ms) of each reading at the
+  // instant it was painted, one call per `TunerScreen.onReadingShown`
+  // (T019's own `useLayoutEffect`). main.tsx collects these into the
+  // dev-only `window.__paintAgesMs` the measured harness reads; App stays
+  // fully testable without it, as `onSessionReady` does above.
+  readonly onPaintAge?: (ageMs: number) => void;
 }): JSX.Element {
-  const { catalogue, selectionStore, sessionDeps, onSessionReady } = props;
+  const { catalogue, selectionStore, sessionDeps, onSessionReady, onPaintAge } =
+    props;
   const [selection, setSelection] = useState<Selection>(() =>
     initialSelection(catalogue, selectionStore),
   );
@@ -528,6 +535,18 @@ export function App(props: {
     () => session?.clearTarget(),
     [session],
   );
+  // practice.tuner/REQ-006 — TunerScreen reports each painted reading back
+  // here; the session turns the frame it was painted at into the reading's
+  // age at that instant, and this forwards it to `onPaintAge` for the
+  // harness (main.tsx) to collect. A no-op before the session-creating
+  // effect has run, mirroring every other session-reaching handler above.
+  const handleReadingShown = useCallback(
+    (atFrame: number) => {
+      if (session === null) return;
+      onPaintAge?.(session.readingShown(atFrame));
+    },
+    [session, onPaintAge],
+  );
 
   const handleSelectKey = useCallback((selectedWedgeKey: Key) => {
     setSelection((current) => {
@@ -659,6 +678,7 @@ export function App(props: {
           onStep={handleStepTarget}
           onClear={handleClearTarget}
           onSpellingChange={handleSelectSpelling}
+          onReadingShown={handleReadingShown}
         />
       ) : (
         <>
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 6ba697f..05551bb 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -1,4 +1,11 @@
-import { memo, useCallback, useRef, useState, type JSX } from "react";
+import {
+  memo,
+  useCallback,
+  useLayoutEffect,
+  useRef,
+  useState,
+  type JSX,
+} from "react";
 import type { NoteJudged, TunerSnapshot } from "../practice/published";
 import type { NoteRange, SpellingPreference } from "../theory/published";
 import { TargetPill } from "./TargetPill";
@@ -126,6 +133,7 @@ function TunerScreenComponent(props: {
   readonly onStep: (delta: -1 | 1) => void;
   readonly onClear: () => void;
   readonly onSpellingChange: (preference: SpellingPreference) => void;
+  readonly onReadingShown: (atFrame: number) => void;
 }): JSX.Element {
   const {
     tuner,
@@ -137,6 +145,7 @@ function TunerScreenComponent(props: {
     onStep,
     onClear,
     onSpellingChange,
+    onReadingShown,
   } = props;
   const listening = isListening(tuner);
   const cannotHear = tuner.listening.kind === "cannot-hear";
@@ -187,6 +196,17 @@ function TunerScreenComponent(props: {
     trailRef.current = appendToTrail(trailRef.current, tuner.reading);
   }
 
+  // practice.tuner/REQ-006 — the paint is reported once per distinct
+  // reading, right after React has committed it (useLayoutEffect, not
+  // useEffect, so the report reflects this exact commit rather than a
+  // later one); the dependency is the reading's own `atFrame`, not the
+  // `NoteJudged` object, so two commits of the same reading (a re-render
+  // with nothing new) report only once. No reading, nothing to report.
+  const atFrame = tuner.reading?.atFrame;
+  useLayoutEffect(() => {
+    if (atFrame !== undefined) onReadingShown(atFrame);
+  }, [atFrame, onReadingShown]);
+
   return (
     <div
       style={{
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 6777a23..e3cfbc2 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -61,6 +61,17 @@ function exposeListeningForTiming(
   ).__listening = listening;
 }
 
+// T019 — practice.tuner/REQ-006's measured harness (pnpm test:tuner) reads
+// every painted reading's age back from `window.__paintAgesMs`, alongside
+// `__session`/`__sound`/`__listening` above; App's `onPaintAge` reports one
+// age per painted reading via this array's push, dev-only, same guard as
+// the other three.
+function collectPaintAge(ageMs: number): void {
+  if (!import.meta.env.DEV) return;
+  const withPaintAges = window as unknown as { __paintAgesMs?: number[] };
+  (withPaintAges.__paintAgesMs ??= []).push(ageMs);
+}
+
 // One AudioContext for both worklets (ADR 0006): one audio thread, one
 // clock. `webAudioSound` and `webAudioListening` each call this on their
 // own first `start()` — whichever runs first creates it, the other gets the
@@ -99,6 +110,7 @@ createRoot(rootElement).render(
         listening,
       }}
       onSessionReady={exposeSessionForTiming}
+      onPaintAge={collectPaintAge}
     />
   </StrictMode>,
 );
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index 73cf45b..8f61938 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -153,6 +153,19 @@ test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
   expect(screen.queryByTestId("tuner-line")).toBeNull();
 });
 
+test("practice.tuner/REQ-006 — every painted reading is reported with its age", async () => {
+  const ages: number[] = [];
+  const f = await enterAndHear(440.0, "sharp", {
+    onPaintAge: (ms) => ages.push(ms),
+  });
+  f.listening.frame = 4800;
+  f.listening.feed(440.0, 4800);
+  f.clock.advanceMs(1);
+  f.listening.frame = 4800 + 480;
+  await act(async () => {});
+  expect(ages.at(-1)).toBe(10);
+});
+
 test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
   const f = await enterAndHear(466.16);
   expect(screen.getByTestId("tuner-name").textContent).toBe("A♯4");
```

<!-- recorded 2026-09-28T13:11:46Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] why two readings never share an atFrame (monotonic now_frame+127) is true but unstated at the effect.
