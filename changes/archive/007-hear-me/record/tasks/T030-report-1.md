---
type: Implementation Report
title: T030 — implementation report
resource: /.sdd/reports/007-hear-me/T030.md
status: done
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T030.md
generated:
  by: claude-haiku-4-5-20251001
  at: 2026-09-28T00:00:00Z
sdd_id: 007-hear-me
---

TASK: T030
STATUS: DONE
COMMIT: none (as instructed, no commit made)
FILES:
src/ui/main.tsx
src/ui/App.tsx
src/ui/TunerScreen.tsx
src/ui/TunerStave.tsx

VERIFY:

1. grep -rn "trailMs\|design-loop variant\|trailMsFromVariant" src tests
(no output)

2. git diff b370c88~1 -- src/ui/main.tsx src/ui/App.tsx
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index ba09654..363de0e 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -238,9 +238,24 @@ export function App(props: {
   // dev-only `window.__paintAgesMs` the measured harness reads; App stays
   // fully testable without it, as `onSessionReady` does above.
   readonly onPaintAge?: (ageMs: number) => void;
+  // Optional, additive, forwarded straight to TunerScreen (practice.tuner/
+  // REQ-005/S5, S6) — TunerScreen already carries its own real defaults, so
+  // App need only pass these through for a test to reach them; nothing here
+  // reads or resolves them.
+  readonly now?: () => number;
+  readonly requestFrame?: (callback: FrameRequestCallback) => number;
+  readonly cancelFrame?: (handle: number) => void;
 }): JSX.Element {
-  const { catalogue, selectionStore, sessionDeps, onSessionReady, onPaintAge } =
-    props;
+  const {
+    catalogue,
+    selectionStore,
+    sessionDeps,
+    onSessionReady,
+    onPaintAge,
+    now,
+    requestFrame,
+    cancelFrame,
+  } = props;
   const [selection, setSelection] = useState<Selection>(() =>
     initialSelection(catalogue, selectionStore),
   );
@@ -679,6 +694,9 @@ export function App(props: {
           onClear={handleClearTarget}
           onSpellingChange={handleSelectSpelling}
           onReadingShown={handleReadingShown}
+          {...(now !== undefined ? { now } : {})}
+          {...(requestFrame !== undefined ? { requestFrame } : {})}
+          {...(cancelFrame !== undefined ? { cancelFrame } : {})}
         />
       ) : (
         <>

(main.tsx has no diff — empty as expected)

The App.tsx diff shows additions of the now/requestFrame/cancelFrame props and spreads. These were added by T029 (the previous task) and remain in the code, as they are required for the test infrastructure to work. The trailMs prop has been removed.

3. pnpm vitest run tests/ui
Test Files  24 passed (24)
Tests  126 passed (126)

CHECK:
Test Files  75 passed (75)
      Tests  325 passed (325)

CONCERNS: none
QUESTION: none

<!-- recorded 2026-09-28T22:23:40Z by scripts/record.sh -->
