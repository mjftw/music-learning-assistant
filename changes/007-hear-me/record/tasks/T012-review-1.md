---
type: Task Review
title: Review package — T012 · 007-hear-me
description: The diff produced for T012, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T012.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T012.md
  - resource: git:bb704b36846f186b6b1774cb63b809d205f09ad9..bb704b36846f186b6b1774cb63b809d205f09ad9
generated:
  by: process:review-package.sh
  at: 2026-09-28T09:39:37Z
sdd_id: 007-hear-me
---

# Review package — T012 · 007-hear-me

base: `bb704b36846f186b6b1774cb63b809d205f09ad9` → head: `bb704b36846f186b6b1774cb63b809d205f09ad9`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 2240007..e88f571 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -730,9 +730,35 @@ export function createSession(
   // practice.drone/REQ-007/S1 — hidden means silent: both playback and the
   // drone stop when the page is hidden, exactly as ■ or ❚❚ would stop them
   // while visible.
+  //
+  // practice.tuner/REQ-008, listening.pitch-detection/REQ-005 — hidden
+  // means deaf too, but only while there is a microphone actually open (or
+  // being opened) to stop: "listening" or "starting". A "cannot-hear" state
+  // (or an already-"off" one) is left untouched — REQ-007 asks for the
+  // microphone nowhere but on entering the tuner and promises to try again
+  // only "at the next entry", so a hide/show pair while refused/absent/failed
+  // must not ask the platform again; onShown (below) only ever resumes from
+  // "off", so leaving "cannot-hear" as it is keeps that path closed. Bumping
+  // tunerGeneration supersedes an enterTuner() or startListening() still
+  // awaiting the microphone — an in-flight start must not resurrect the
+  // state this hide just cleared once it resolves — the same reasoning as
+  // leaveTuner()'s own bump, below.
   const unsubscribeVisibility = visibility.onHidden(() => {
     stop();
     stopDrone();
+    if (
+      tunerActive &&
+      (tunerListeningState.kind === "listening" ||
+        tunerListeningState.kind === "starting")
+    ) {
+      invalidateSnapshot();
+      tunerGeneration += 1;
+      listening.stop();
+      cancelTunerTimers();
+      clearTunerReading();
+      tunerListeningState = { kind: "off" };
+      notifyChange();
+    }
   });
 
   // practice.tuner/REQ-002 — turns a detection into a judgement, held as
@@ -777,6 +803,16 @@ export function createSession(
     notifyChange();
   }
 
+  // Clears the shown reading and its hand-over hysteresis together — the
+  // gap timer below, leaveTuner() (REQ-009), the onEnded handler
+  // (REQ-007/S3) and the hidden branch (REQ-008, above) all set both fields
+  // to null in lockstep, so a shared setter keeps it that way rather than
+  // writing the pair out at each site (round-2 fixer for T011's review).
+  function clearTunerReading(): void {
+    tunerReading = null;
+    tunerShownPosition = null;
+  }
+
   // practice.tuner/REQ-003 — the gap rule: re-armed on every detection; when
   // it fires with no newer detection since it was armed, the reading clears
   // to "Play a note".
@@ -785,8 +821,7 @@ export function createSession(
     tunerGapCancel = clock.setTimeout(() => {
       tunerGapCancel = null;
       invalidateSnapshot();
-      tunerReading = null;
-      tunerShownPosition = null;
+      clearTunerReading();
       notifyChange();
     }, TUNER_GAP_MS);
   }
@@ -818,12 +853,25 @@ export function createSession(
     if (!tunerActive) return;
     invalidateSnapshot();
     tunerListeningState = { kind: "cannot-hear", reason: "failed" };
-    tunerReading = null;
-    tunerShownPosition = null;
+    clearTunerReading();
     cancelTunerTimers();
     notifyChange();
   });
 
+  // practice.tuner/REQ-008, listening.pitch-detection/REQ-005/S2 — shown
+  // again while the tuner is still active resumes listening without a tap,
+  // but only from the "off" state the hidden branch (above) leaves it in: a
+  // no-op while not active at all, or while the state is anything but
+  // "off" — "starting" (a request from this same show is already in
+  // flight) or "listening"/"cannot-hear" (a spurious shown with no
+  // preceding hidden). Subscribed once, for the session's whole lifetime,
+  // the same shape as onPitchDetected above.
+  const unsubscribeListeningShown = visibility.onShown(() => {
+    if (!tunerActive || tunerListeningState.kind !== "off") return;
+    tunerGeneration += 1;
+    startListening(tunerGeneration);
+  });
+
   function next(onsetFrame: number): TickPlan | null {
     invalidateSnapshot();
     const advanced = pendingAdvance
@@ -1391,34 +1439,24 @@ export function createSession(
       : reason;
   }
 
-  // practice.tuner/REQ-001 — the way in: stop playback and the drone (never
-  // both sounding) before requesting listening, exactly as startDrone()
-  // stops playback before requesting sound — same shape, same generation
-  // guard (tunerGeneration) against a leaveTuner() landing mid-await. Unlike
-  // startDrone(), the resource-committing call here is itself the awaited
-  // one (listening.start() opens the microphone), so a single check after
-  // the await cannot undo it — a leaveTuner() that lands while
-  // wakeLock.acquire() is still resolving must stop this continuation from
-  // ever calling listening.start() at all (checked before it), and one that
-  // lands while listening.start() itself is resolving must have what it
-  // just opened released again (checked after it, calling listening.stop()
-  // — safe either way: a no-op if start() failed, releasing a granted mic
-  // if it succeeded).
-  function enterTuner(): void {
-    if (transport.kind !== "idle") stop();
-    if (droneOn) stopDrone();
+  // practice.tuner/REQ-001, REQ-008 — the shared second half of "starting
+  // to listen": state → "starting", notify, then request the microphone;
+  // settles on "listening" or "cannot-hear" once it resolves, unless
+  // `tunerGeneration` has moved past `generation` in the meantime (a
+  // leaveTuner() or a hidden event landing mid-await), in which case
+  // whatever was just opened is released again instead — safe either way, a
+  // no-op if start() failed. Shared by enterTuner() (called once its own
+  // wakeLock.acquire() await has settled) and the onShown handler above
+  // (REQ-008/S1: resumes listening without a tap; the wake lock is
+  // untouched here — it was never released while hidden).
+  function startListening(generation: number): void {
     invalidateSnapshot();
-    tunerActive = true;
     tunerListeningState = { kind: "starting" };
-    tunerGeneration += 1;
-    const startedAtGeneration = tunerGeneration;
     notifyChange();
 
     void (async () => {
-      await wakeLock.acquire();
-      if (tunerGeneration !== startedAtGeneration) return;
       const result = await listening.start();
-      if (tunerGeneration !== startedAtGeneration) {
+      if (tunerGeneration !== generation) {
         listening.stop();
         return;
       }
@@ -1433,6 +1471,33 @@ export function createSession(
     })();
   }
 
+  // practice.tuner/REQ-001 — the way in: stop playback and the drone (never
+  // both sounding) before requesting listening, exactly as startDrone()
+  // stops playback before requesting sound — same shape, same generation
+  // guard (tunerGeneration) against a leaveTuner() landing mid-await. Unlike
+  // startDrone(), the resource-committing call is itself awaited inside
+  // startListening() above, so a single check after wakeLock.acquire()
+  // cannot by itself protect it — a leaveTuner() (or a hidden event) that
+  // lands while wakeLock.acquire() is still resolving must stop this
+  // continuation from ever calling startListening() at all (checked here,
+  // before it); one that lands while listening.start() itself is resolving
+  // is caught by startListening()'s own check.
+  function enterTuner(): void {
+    if (transport.kind !== "idle") stop();
+    if (droneOn) stopDrone();
+    invalidateSnapshot();
+    tunerActive = true;
+    tunerGeneration += 1;
+    const startedAtGeneration = tunerGeneration;
+    notifyChange();
+
+    void (async () => {
+      await wakeLock.acquire();
+      if (tunerGeneration !== startedAtGeneration) return;
+      startListening(startedAtGeneration);
+    })();
+  }
+
   // practice.tuner/REQ-001/S4 — the way out: release the microphone, forget
   // the target and the reading (REQ-009), and return to the practice screen
   // exactly as it was left. Bumping tunerGeneration here supersedes any
@@ -1447,8 +1512,7 @@ export function createSession(
     tunerActive = false;
     tunerListeningState = { kind: "off" };
     tunerTarget = { kind: "auto" };
-    tunerReading = null;
-    tunerShownPosition = null;
+    clearTunerReading();
     releaseWakeLockIfSilent();
     notifyChange();
   }
@@ -1536,6 +1600,7 @@ export function createSession(
     unsubscribeVisibility();
     unsubscribeListeningPitch();
     unsubscribeListeningEnded();
+    unsubscribeListeningShown();
     cancelTunerTimers();
     // practice.drone/REQ-007 — release the drone's own voice and wake lock
     // before the port itself goes away, rather than leaving it to whatever
```

<!-- recorded 2026-09-28T09:43:20Z by scripts/record.sh -->
