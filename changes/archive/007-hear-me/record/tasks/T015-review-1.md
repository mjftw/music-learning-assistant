---
type: Task Review
title: Review package — T015 · 007-hear-me
description: The diff produced for T015, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T015.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T015.md
  - resource: git:901e066e0211955287e693b7ae59123143b4883d..901e066e0211955287e693b7ae59123143b4883d
generated:
  by: process:review-package.sh
  at: 2026-09-28T11:11:47Z
sdd_id: 007-hear-me
---

# Review package — T015 · 007-hear-me

base: `901e066e0211955287e693b7ae59123143b4883d` → head: `901e066e0211955287e693b7ae59123143b4883d`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 0bcd35e..0e12e7d 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -627,7 +627,11 @@ export function App(props: {
       }}
     >
       {screen === "tuner" && snapshot !== null ? (
-        <TunerScreen tuner={snapshot.tuner} onLeave={handleLeaveTuner} />
+        <TunerScreen
+          tuner={snapshot.tuner}
+          spelling={selection.spelling}
+          onLeave={handleLeaveTuner}
+        />
       ) : (
         <>
           <Header
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 4eca778..9ab0979 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -1,6 +1,8 @@
 import { memo, type JSX } from "react";
 import type { TunerSnapshot } from "../practice/published";
+import type { SpellingPreference } from "../theory/published";
 import { fonts, paper } from "./theme";
+import { TunerLevel } from "./TunerLevel";
 
 // The header row — copied verbatim from the vendored visual reference
 // (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
@@ -54,9 +56,10 @@ function isListening(tuner: TunerSnapshot): boolean {
 // target row (T017) and the footer (T018). Empty now.
 function TunerScreenComponent(props: {
   readonly tuner: TunerSnapshot;
+  readonly spelling: SpellingPreference;
   readonly onLeave: () => void;
 }): JSX.Element {
-  const { tuner, onLeave } = props;
+  const { tuner, spelling, onLeave } = props;
   const listening = isListening(tuner);
 
   return (
@@ -130,8 +133,7 @@ function TunerScreenComponent(props: {
           <span>{listening ? "LISTENING" : "NO MIC"}</span>
         </span>
       </div>
-      {/* T015 — the level area */}
-      <div />
+      <TunerLevel tuner={tuner} spelling={spelling} />
       {/* T016 — the stave strip */}
       <div />
       {/* T017 — the target row */}
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index a9f39c3..6ebd754 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -1,10 +1,15 @@
-import { cleanup, render, screen, waitFor } from "@testing-library/react";
+import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { afterEach, expect, test } from "vitest";
+import type { Session } from "../../../src/practice/published";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
-import { sessionDepsWithFakes } from "../../practice/fakes";
+import {
+  FakeClock,
+  FakeListening,
+  sessionDepsWithFakes,
+} from "../../practice/fakes";
 
 // No global `afterEach` in scope (vitest globals are off), so
 // @testing-library/react's automatic cleanup never registers itself; without
@@ -14,6 +19,52 @@ afterEach(() => {
   cleanup();
 });
 
+// T015's shared fixture (reused by T017/T018): renders `<App>`, opens the
+// tuner, and feeds one steady pitch through the fake listening port —
+// `listening.feed(hz)` publishes it, `clock.advanceMs(1)` runs the
+// session's commit-on-next-tick timer (domain/session.ts's
+// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
+// state update. `spelling` optionally taps the circle's ♭ control before
+// entering (theory.circle-of-fifths/REQ-002, exercised the same way
+// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
+// without duplicating the render/open dance.
+async function enterAndHear(
+  hz: number,
+  spelling?: "sharp" | "flat",
+): Promise<{
+  readonly listening: FakeListening;
+  readonly clock: FakeClock;
+  readonly session: Session;
+}> {
+  localStorage.clear();
+  const { sessionDeps, listening, clock } = sessionDepsWithFakes();
+  let session: Session | null = null;
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={sessionDeps}
+      onSessionReady={(readySession) => {
+        session = readySession;
+      }}
+    />,
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
+
 test("practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows", async () => {
   localStorage.clear();
   const { sessionDeps, listening } = sessionDepsWithFakes();
@@ -49,3 +100,36 @@ test("practice.tuner/REQ-001/S4 — out: ‹ Practice returns to the practice sc
   expect(screen.getByTestId("current-key").textContent).toBe("G major");
   expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
 });
+
+test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
+  await enterAndHear(445.0);
+  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+  expect(screen.getByTestId("tuner-tag").textContent).toBe("+20sharp");
+  expect(screen.getByTestId("tuner-tag").style.color).toBe(
+    "oklch(0.55 0.11 28)",
+  );
+  expect(screen.getByTestId("tuner-line").style.top).toBe("162.5px");
+  // Both edges of the rule read "halfway to" (above *and* below the
+  // reading — REQ-002/S1's own text: "'halfway to A♯4' above and 'halfway
+  // to G♯4' below"), so this is a multiple match, not a single one.
+  expect(screen.getAllByText("halfway to")).toHaveLength(2);
+  expect(screen.getByText("A♯4")).toBeTruthy();
+  expect(screen.getByText("G♯4")).toBeTruthy();
+});
+
+test("practice.tuner/REQ-002/S2 — in tune", async () => {
+  await enterAndHear(441.0);
+  expect(screen.getByTestId("tuner-tag").textContent).toBe("+4in tune");
+  expect(screen.getByTestId("tuner-tag").style.color).toBe(
+    "oklch(0.55 0.11 150)",
+  );
+});
+
+test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
+  const f = await enterAndHear(445.0);
+  f.clock.advanceMs(300);
+  await act(async () => {});
+  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
+  expect(screen.queryByTestId("tuner-line")).toBeNull();
+  expect(screen.queryByTestId("tuner-tag")).toBeNull();
+});
```

<!-- recorded 2026-09-28T11:17:22Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] the report cited a brief section that lives in the controller's dispatch for pitchClassLabel. Geometry, colours, test ids, the pinned/beyond-±50 form reasoned against REQ-004 — all confirmed.
