---
type: Task Review
title: Review package — T010 · 007-hear-me
description: The diff produced for T010, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T010.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T010.md
  - resource: git:4f50a0b19c25e8bf1ec8bf2266444dbad094d67a..4f50a0b19c25e8bf1ec8bf2266444dbad094d67a
generated:
  by: process:review-package.sh
  at: 2026-09-28T09:20:59Z
sdd_id: 007-hear-me
---

# Review package — T010 · 007-hear-me

base: `4f50a0b19c25e8bf1ec8bf2266444dbad094d67a` → head: `4f50a0b19c25e8bf1ec8bf2266444dbad094d67a`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index c505405..89c6da2 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -55,6 +55,7 @@ import type { ListeningState, TunerSnapshot, TunerTarget } from "./tuner";
 import {
   canStepTarget,
   judge,
+  READING_MAX_AGE_MS,
   TUNER_HIGHEST_POSITION,
   TUNER_LOWEST_POSITION,
 } from "./tuner";
@@ -153,6 +154,11 @@ export interface Session {
   pinTarget(position: number): void;
   stepTarget(delta: -1 | 1): void;
   clearTarget(): void;
+  // practice.tuner/REQ-006 (Article V) — the UI reports that the reading
+  // with this atFrame has just been painted; returns that reading's age in
+  // ms at this instant (listening.currentFrame() − atFrame, at the port's
+  // sample rate). Used by the harness; never changes state.
+  readingShown(atFrame: number): number;
   onNoteJudged(listener: (event: NoteJudged) => void): () => void;
   onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void;
   onChange(listener: () => void): () => void;
@@ -736,6 +742,14 @@ export function createSession(
   // after leaveTuner() (or before listening.start() resolves) is dropped.
   function onPitchDetected(pitch: PitchDetected): void {
     if (!tunerActive || tunerListeningState.kind !== "listening") return;
+    // practice.tuner/REQ-006 (Article V) — a detection older than the
+    // budget by the time it reaches here is dropped outright: no
+    // judgement, no NoteJudged, the pending reading (if any) untouched —
+    // silence beats a late reading.
+    const ageMs =
+      ((listening.currentFrame() - pitch.atFrame) / listening.sampleRate()) *
+      1000;
+    if (ageMs > READING_MAX_AGE_MS) return;
     tunerPendingReading = judge(
       pitch,
       tunerTarget,
@@ -1472,6 +1486,16 @@ export function createSession(
     notifyChange();
   }
 
+  // practice.tuner/REQ-006 (Article V) — a pure read of the age of the
+  // reading painted at `atFrame`, against the listening port's own clock;
+  // never changes state. The UI calls this from a useLayoutEffect right
+  // after painting a reading, for the measured harness to read back.
+  function readingShown(atFrame: number): number {
+    return (
+      ((listening.currentFrame() - atFrame) / listening.sampleRate()) * 1000
+    );
+  }
+
   function onNoteJudged(listener: (event: NoteJudged) => void): () => void {
     noteJudgedListeners.add(listener);
     return () => noteJudgedListeners.delete(listener);
@@ -1527,6 +1551,7 @@ export function createSession(
     pinTarget,
     stepTarget,
     clearTarget,
+    readingShown,
     onNoteJudged,
     onTargetAdvanced,
     onChange,
```

<!-- recorded 2026-09-28T09:23:47Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] the report's justification for dropping an unused helper cited a note not in the brief. A dropped detection re-arms neither timer — Article V, not a finding.
