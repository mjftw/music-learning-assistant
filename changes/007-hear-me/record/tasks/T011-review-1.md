---
type: Task Review
title: Review package — T011 · 007-hear-me
description: The diff produced for T011, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T011.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T011.md
  - resource: git:1a563c8f296e9071b1ae71fb9e246673e7e25114..1a563c8f296e9071b1ae71fb9e246673e7e25114
generated:
  by: process:review-package.sh
  at: 2026-09-28T09:26:07Z
sdd_id: 007-hear-me
---

# Review package — T011 · 007-hear-me

base: `1a563c8f296e9071b1ae71fb9e246673e7e25114` → head: `1a563c8f296e9071b1ae71fb9e246673e7e25114`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 89c6da2..2240007 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -808,6 +808,22 @@ export function createSession(
   // unsubscribeVisibility above.
   const unsubscribeListeningPitch = listening.onPitch(onPitchDetected);
 
+  // practice.tuner/REQ-007/S3 — the microphone unplugged or its permission
+  // revoked mid-session: subscribed once, for the session's whole lifetime,
+  // the same shape as onPitchDetected above. Ignored unless the tuner is
+  // active — an onEnded firing after leaveTuner() (FakeListening.stop()
+  // does not itself fire onEnded, but a real track ending after release
+  // well might) must not resurrect a state leaveTuner() already cleared.
+  const unsubscribeListeningEnded = listening.onEnded(() => {
+    if (!tunerActive) return;
+    invalidateSnapshot();
+    tunerListeningState = { kind: "cannot-hear", reason: "failed" };
+    tunerReading = null;
+    tunerShownPosition = null;
+    cancelTunerTimers();
+    notifyChange();
+  });
+
   function next(onsetFrame: number): TickPlan | null {
     invalidateSnapshot();
     const advanced = pendingAdvance
@@ -1519,6 +1535,7 @@ export function createSession(
     cancelIdleTimer();
     unsubscribeVisibility();
     unsubscribeListeningPitch();
+    unsubscribeListeningEnded();
     cancelTunerTimers();
     // practice.drone/REQ-007 — release the drone's own voice and wake lock
     // before the port itself goes away, rather than leaving it to whatever
```

<!-- recorded 2026-09-28T09:28:43Z by scripts/record.sh -->
