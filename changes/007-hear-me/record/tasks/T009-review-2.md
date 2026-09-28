---
type: Task Review
title: Review package — T009 · 007-hear-me
description: The diff produced for T009, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T009.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T009.md
  - resource: git:26cc3cef4c935ddb55f9c78d601fee913de808d9..26cc3cef4c935ddb55f9c78d601fee913de808d9
generated:
  by: process:review-package.sh
  at: 2026-09-28T09:00:53Z
sdd_id: 007-hear-me
---

# Review package — T009 · 007-hear-me

base: `26cc3cef4c935ddb55f9c78d601fee913de808d9` → head: `26cc3cef4c935ddb55f9c78d601fee913de808d9`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index d8b72cc..0400fc6 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -25,6 +25,7 @@ import type {
 import {
   effectiveOctavesOf,
   fittingOctaveCounts,
+  noteAtPosition,
   noteLabel,
   pitchHzOf,
   pitchPosition,
@@ -51,7 +52,12 @@ import { tempoTermFor } from "./tempo";
 import type { TransportState } from "./transport";
 import { advance, startTransport, tickOf } from "./transport";
 import type { ListeningState, TunerSnapshot, TunerTarget } from "./tuner";
-import { canStepTarget, judge } from "./tuner";
+import {
+  canStepTarget,
+  judge,
+  TUNER_HIGHEST_POSITION,
+  TUNER_LOWEST_POSITION,
+} from "./tuner";
 import type { NoteJudged } from "../published/note-judged.schema";
 import type { PitchDetected } from "../../listening/published/pitch-detected.schema";
 
@@ -139,6 +145,14 @@ export interface Session {
   // ends it and forgets the target.
   enterTuner(): void;
   leaveTuner(): void;
+  // practice.tuner/REQ-004 — the four target verbs: Hold pins the note
+  // playing now (a no-op without a reading), pinTarget pins a spiral wedge
+  // (clamped to E2–C7), stepTarget moves the pinned note a semitone (a
+  // no-op on auto or at the bounds), and clearTarget returns to auto.
+  holdTarget(): void;
+  pinTarget(position: number): void;
+  stepTarget(delta: -1 | 1): void;
+  clearTarget(): void;
   onNoteJudged(listener: (event: NoteJudged) => void): () => void;
   onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void;
   onChange(listener: () => void): () => void;
@@ -1261,6 +1275,18 @@ export function createSession(
   function setContext(newContext: SessionContext): void {
     invalidateSnapshot();
     currentContext = newContext;
+    // practice.tuner/REQ-002/S5, REQ-009/S1 — a spelling change while a
+    // target is pinned must re-spell it too: the reading's `target` field
+    // re-spells live (judge derives it from tunerTargetNote on the next
+    // detection), but the standalone `tuner.targetNote` — the greyed big
+    // name shown during silence — would otherwise stay stale until the
+    // next target verb.
+    if (tunerTarget.kind === "pinned") {
+      tunerTargetNote = noteAtPosition(
+        tunerTarget.position,
+        currentContext.spelling,
+      );
+    }
     recomputeAndRetune();
     restartIfPlaying();
     notifyChange();
@@ -1362,6 +1388,56 @@ export function createSession(
     notifyChange();
   }
 
+  // Shared by every target verb below: pins `tunerTarget` and re-spells
+  // `tunerTargetNote` from `position` and the current spelling preference —
+  // the single place that keeps the two in sync (practice.tuner/REQ-004).
+  function pinTargetAt(position: number): void {
+    invalidateSnapshot();
+    tunerTarget = { kind: "pinned", position };
+    tunerTargetNote = noteAtPosition(position, currentContext.spelling);
+    notifyChange();
+  }
+
+  // practice.tuner/REQ-004/S1 — Hold: pins the last committed reading's
+  // nearest note; a no-op while nothing has been heard yet.
+  function holdTarget(): void {
+    if (tunerReading === null) return;
+    pinTargetAt(pitchPosition(tunerReading.heard.nearest));
+  }
+
+  // practice.tuner/REQ-004/S2 — a wedge of the spiral: clamped to E2–C7 so a
+  // tap outside the instrument's drawn range still lands somewhere real.
+  function pinTarget(position: number): void {
+    pinTargetAt(
+      Math.max(
+        TUNER_LOWEST_POSITION,
+        Math.min(TUNER_HIGHEST_POSITION, position),
+      ),
+    );
+  }
+
+  // practice.tuner/REQ-004/S4 — − / + move the pinned note a semitone; a
+  // no-op on auto (canStepTarget already says no) or at either bound. The
+  // `tunerTarget.kind !== "pinned"` check (redundant with canStepTarget's
+  // own guard) is what lets TypeScript narrow `tunerTarget.position` below.
+  function stepTarget(delta: -1 | 1): void {
+    if (tunerTarget.kind !== "pinned" || !canStepTarget(tunerTarget, delta)) {
+      return;
+    }
+    pinTargetAt(tunerTarget.position + delta);
+  }
+
+  // practice.tuner/REQ-004/S5 — ✕ / Auto: back to the nearest note. The
+  // shown-note hysteresis (tunerShownPosition) needs no reset here: while
+  // pinned, judge() already keeps it at the nearest note of every detection
+  // (see tuner.ts), so it is never stale by the time auto reads it.
+  function clearTarget(): void {
+    invalidateSnapshot();
+    tunerTarget = { kind: "auto" };
+    tunerTargetNote = null;
+    notifyChange();
+  }
+
   function onNoteJudged(listener: (event: NoteJudged) => void): () => void {
     noteJudgedListeners.add(listener);
     return () => noteJudgedListeners.delete(listener);
@@ -1413,6 +1489,10 @@ export function createSession(
     tapNote,
     enterTuner,
     leaveTuner,
+    holdTarget,
+    pinTarget,
+    stepTarget,
+    clearTarget,
     onNoteJudged,
     onTargetAdvanced,
     onChange,
diff --git a/tests/practice/scenarios/tuner-reading.test.ts b/tests/practice/scenarios/tuner-reading.test.ts
index 47c2548..057c161 100644
--- a/tests/practice/scenarios/tuner-reading.test.ts
+++ b/tests/practice/scenarios/tuner-reading.test.ts
@@ -99,8 +99,15 @@ test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
   expect(f.session.snapshot().tuner.reading).toBeNull();
 });
 
-// holdTarget() arrives in T009; T009 un-todos this scenario.
-test.todo("practice.tuner/REQ-003/S2 — silence with a target");
+test("practice.tuner/REQ-003/S2 — silence with a target", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  f.session.pinTarget(69);
+  hear(f, 445.0);
+  f.clock.advanceMs(300);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
+});
 
 test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
   const f = sessionOn("G", "flute-concert");
```

<!-- recorded 2026-09-28T09:06:59Z by scripts/record.sh -->
