---
type: Task Review
title: Review package — T013 · 007-hear-me
description: The diff produced for T013, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T013.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T013.md
  - resource: git:606b877016b59f352cb3ae820ec75261cecb9768..606b877016b59f352cb3ae820ec75261cecb9768
generated:
  by: process:review-package.sh
  at: 2026-09-28T10:02:12Z
sdd_id: 007-hear-me
---

# Review package — T013 · 007-hear-me

base: `606b877016b59f352cb3ae820ec75261cecb9768` → head: `606b877016b59f352cb3ae820ec75261cecb9768`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index e88f571..a996886 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -1484,6 +1484,16 @@ export function createSession(
   // is caught by startListening()'s own check.
   function enterTuner(): void {
     if (transport.kind !== "idle") stop();
+    // Bumped unconditionally — mirrors start()'s own T022 fix: a
+    // startDrone() that is only still pending (droneOn still false,
+    // awaiting sound.start()/wakeLock.acquire()) is not caught by the
+    // `if (droneOn) stopDrone()` below, since droneOn only flips true once
+    // that call's own post lands; without this, its continuation would
+    // pass its own generation check and post a drone after tunerActive is
+    // already true (found by T013's widened never-both enumeration:
+    // droneOnPending → enterTuner). stopDrone() below bumps it again when
+    // the drone was actually on; a second bump there is harmless.
+    droneGeneration += 1;
     if (droneOn) stopDrone();
     invalidateSnapshot();
     tunerActive = true;
diff --git a/tests/practice/invariants/never-both.test.ts b/tests/practice/invariants/never-both.test.ts
index fe0b6b1..7e463d0 100644
--- a/tests/practice/invariants/never-both.test.ts
+++ b/tests/practice/invariants/never-both.test.ts
@@ -1,6 +1,10 @@
 // practice.drone/REQ-004/S3 — every interleaving of ▶ / ❚❚ on the transport
 // with ▶ / ■ on the pill, up to four taps long, from idle: at no instant is
 // a sequence tone or a click sounding while the drone is.
+//
+// practice.tuner/REQ-001/S3 — the same enumeration, widened with the
+// tuner's two verbs (enterTuner, leaveTuner): at no instant is a sequence
+// tone, a click or the drone sounding while the tuner is active.
 
 import { expect, test } from "vitest";
 import {
@@ -19,17 +23,30 @@ import {
   startDroneAndFlush,
 } from "../fakes";
 
-type Action = "play" | "pause" | "droneOn" | "droneOff" | "droneOnPending";
+type Action =
+  | "play"
+  | "pause"
+  | "droneOn"
+  | "droneOff"
+  | "droneOnPending"
+  | "enterTuner"
+  | "leaveTuner";
 const ACTIONS: readonly Action[] = [
   "play",
   "pause",
   "droneOn",
   "droneOff",
   "droneOnPending",
+  "enterTuner",
+  "leaveTuner",
 ];
 const GAP_MS = 300;
 const CLICK_MS = 25;
 const STOP_FADE_MS = 5;
+// Sequences of length 1 to 4 over ACTIONS.length verbs — the file's own
+// timeout budget for the exhaustive walk below (`sequences()`'s sum for
+// however many verbs ACTIONS currently holds).
+const TEST_TIMEOUT_MS = 20_000;
 
 // Every sequence of exactly `length` actions over ACTIONS, recursively:
 // length 0 is the single empty sequence; each longer sequence is one action
@@ -84,6 +101,23 @@ async function apply(session: Session, action: Action): Promise<void> {
       // synchronous call lands inside that window.
       session.startDrone();
       return;
+    case "enterTuner":
+      // Mirrors droneOnPending — enterTuner() is async internally (awaits
+      // the wake lock, then listening.start()); returning without flushing
+      // leaves it mid-flight so the next action's own call lands while the
+      // tuner's start is pending (practice.tuner/REQ-001/S3's own version
+      // of the T022 race — see brief T013).
+      session.enterTuner();
+      return;
+    case "leaveTuner":
+      // leaveTuner() itself is synchronous, but flushing here (as pause and
+      // droneOff do) gives any still-pending enterTuner/droneOnPending from
+      // an earlier action a chance to settle sooner rather than piling up
+      // unflushed across the whole sequence.
+      session.leaveTuner();
+      await Promise.resolve();
+      await Promise.resolve();
+      return;
   }
 }
 
@@ -160,35 +194,155 @@ function sequenceIntervals(
   return intervals;
 }
 
-test("practice.drone/REQ-004/S3 — never both (invariant)", async () => {
-  let checked = 0;
-  for (let length = 1; length <= 4; length += 1)
-    for (const sequence of sequences(length)) {
-      const { session, sound, clock } = sessionOn(
-        "G",
-        "flute-concert",
-        defaultTraversal,
-        { ...defaultSessionSettings, countIn: false },
-      );
-      for (const action of sequence) {
-        await apply(session, action);
-        clock.advance(GAP_MS);
+// The file's notion of "live at a frame": posted (onsetFrame ≤ frame) and
+// not yet stopped before the frame minus its release — the same rule
+// droneIntervals/sequenceIntervals above already encode as [from, to)
+// pairs across the whole timeline, here queried at a single instant. Used
+// by the tuner-silence assertion below (practice.tuner/REQ-001/S3): "is
+// anything live right now", asked at every step of every sequence.
+function liveVoicesAt(
+  sound: { readonly posts: readonly PostedCommand[]; sampleRate(): number },
+  atFrame: number,
+): readonly PostedCommand[] {
+  const sampleRate = sound.sampleRate();
+  const droneReleaseFrames = (DRONE_RELEASE_MS * sampleRate) / 1000;
+  const stopFadeFrames = (STOP_FADE_MS * sampleRate) / 1000;
+  const clickFrames = (CLICK_MS * sampleRate) / 1000;
+  const posts = sound.posts;
+  const live: PostedCommand[] = [];
+  posts.forEach((post, index) => {
+    const command = post.command;
+    if (!isTone(command) && !isClick(command) && !isDrone(command)) return;
+    const from = command.onsetFrame;
+    if (from > atFrame) return; // not yet begun
+    const naturalTo = isDrone(command)
+      ? Infinity
+      : isTone(command)
+        ? from + command.durationFrames
+        : from + clickFrames;
+    let stopFrame = Infinity;
+    for (let later = index + 1; later < posts.length; later += 1) {
+      const candidate = posts[later]!;
+      if (
+        isDrone(command) &&
+        isStop(candidate.command) &&
+        candidate.command.tag === command.tag
+      ) {
+        stopFrame = Math.min(stopFrame, candidate.atFrame);
+      } else if (candidate.command.kind === "stopAll") {
+        stopFrame = Math.min(stopFrame, candidate.atFrame);
+      }
+    }
+    // Mirrors sequenceIntervals: a stopAll posted before this command's own
+    // onset — still queued in the lookahead scheduler's window, never yet
+    // sounded — cancels it outright rather than cutting it short.
+    if (stopFrame < from) return;
+    const release = isDrone(command) ? droneReleaseFrames : stopFadeFrames;
+    const to = Math.min(naturalTo, stopFrame + release);
+    if (from <= atFrame && atFrame < to) live.push(post);
+  });
+  return live;
+}
+
+test(
+  "practice.drone/REQ-004/S3 — never both (invariant)",
+  async () => {
+    let checked = 0;
+    for (let length = 1; length <= 4; length += 1)
+      for (const sequence of sequences(length)) {
+        const { session, sound, clock } = sessionOn(
+          "G",
+          "flute-concert",
+          defaultTraversal,
+          { ...defaultSessionSettings, countIn: false },
+        );
+        for (const action of sequence) {
+          await apply(session, action);
+          clock.advance(GAP_MS);
+        }
+        // A trailing droneOnPending/enterTuner never flushes on its own —
+        // settle it before reading the timeline, or its eventual post
+        // would land after the assertions ran.
+        await Promise.resolve();
+        await Promise.resolve();
+        clock.advance(2000);
+        const drones = droneIntervals(sound.posts, sound.sampleRate());
+        for (const voice of sequenceIntervals(sound.posts, sound.sampleRate()))
+          for (const drone of drones)
+            expect(
+              voice.from < drone.to && drone.from < voice.to,
+              `overlap in ${sequence.join(" → ")}`,
+            ).toBe(false);
+        session.dispose();
+        checked += 1;
       }
-      // A trailing droneOnPending never flushes on its own — settle it
-      // before reading the timeline, or its eventual post would land after
-      // the assertions ran.
-      await Promise.resolve();
-      await Promise.resolve();
-      clock.advance(2000);
-      const drones = droneIntervals(sound.posts, sound.sampleRate());
-      for (const voice of sequenceIntervals(sound.posts, sound.sampleRate()))
-        for (const drone of drones)
+    expect(checked).toBe(
+      ACTIONS.length +
+        ACTIONS.length ** 2 +
+        ACTIONS.length ** 3 +
+        ACTIONS.length ** 4,
+    );
+  },
+  TEST_TIMEOUT_MS,
+);
+
+test(
+  "practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant)",
+  async () => {
+    let checked = 0;
+    for (let length = 1; length <= 4; length += 1)
+      for (const sequence of sequences(length)) {
+        const { session, sound, clock } = sessionOn(
+          "G",
+          "flute-concert",
+          defaultTraversal,
+          { ...defaultSessionSettings, countIn: false },
+        );
+        for (const action of sequence) {
+          await apply(session, action);
+          if (session.snapshot().tuner.active) {
+            // REQ-001 grants playback up to 50 ms and the drone up to
+            // DRONE_RELEASE_MS (500 ms) to fall silent as *part of*
+            // entering — wait that out before judging "still sounding", or
+            // this flags the transition's own budgeted release (a tone or
+            // the drone stopped this same step, still inside its own
+            // stop-fade tail) rather than a real violation.
+            clock.advance(DRONE_RELEASE_MS);
+            const liveAt = sound.frame;
+            expect(
+              liveVoicesAt(sound, liveAt).filter(
+                (v) =>
+                  isTone(v.command) || isClick(v.command) || isDrone(v.command),
+              ),
+              `sounding while the tuner is active in ${sequence.join(" → ")}`,
+            ).toEqual([]);
+          }
+          clock.advance(GAP_MS);
+        }
+        // As above — settle a trailing droneOnPending/enterTuner before the
+        // final check, so a post it makes only once flushed is not missed.
+        await Promise.resolve();
+        await Promise.resolve();
+        clock.advance(2000);
+        if (session.snapshot().tuner.active) {
+          const liveAt = sound.frame;
           expect(
-            voice.from < drone.to && drone.from < voice.to,
-            `overlap in ${sequence.join(" → ")}`,
-          ).toBe(false);
-      session.dispose();
-      checked += 1;
-    }
-  expect(checked).toBe(5 + 25 + 125 + 625);
-});
+            liveVoicesAt(sound, liveAt).filter(
+              (v) =>
+                isTone(v.command) || isClick(v.command) || isDrone(v.command),
+            ),
+            `sounding while the tuner is active after ${sequence.join(" → ")}`,
+          ).toEqual([]);
+        }
+        session.dispose();
+        checked += 1;
+      }
+    expect(checked).toBe(
+      ACTIONS.length +
+        ACTIONS.length ** 2 +
+        ACTIONS.length ** 3 +
+        ACTIONS.length ** 4,
+    );
+  },
+  TEST_TIMEOUT_MS,
+);
```

<!-- recorded 2026-09-28T10:08:36Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: FAIL
- QUALITY: SKIPPED
- Findings: [critical] the enumeration omitted tapNote, hiding two REQ-001 violations: a sounding tap not ended by enterTuner; a first-ever tap's pending start posting after entry (reproduced). [minor] stopAll-before-onset treated as a full cancel.
