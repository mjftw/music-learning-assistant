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
  at: 2026-09-28T10:33:38Z
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
index e88f571..feebb5f 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -386,6 +386,17 @@ export function createSession(
   // drone voice.
   let tappedTag: number | null = null;
   let tapCounter = 0;
+  // Bumped by tapNote() itself (every call, sync or async) and by
+  // enterTuner() — mirrors droneGeneration: a first-ever tapNote() still
+  // awaiting sound.start() compares this after its await and posts nothing
+  // if it no longer matches, so a second tapNote() landing before the
+  // first resolves (found by T013's fixer-round enumeration:
+  // tapNotePending → tapNote → enterTuner — the first tap's continuation
+  // would otherwise post after being superseded, orphaning its voice with
+  // no tag endTapIfSounding() still knows to stop) or an enterTuner()
+  // landing meanwhile (practice.tuner/REQ-001/S3's own race, brief T013's
+  // fixer round) is never overridden by a stale post arriving after it.
+  let tapGeneration = 0;
   // Cancel functions for the sounding tap's two timers (set tappedRunIndex
   // at the audible onset, clear it a beat later) — both cleared together
   // whenever the tap ends (a retap, start(), restartIfPlaying()), so a
@@ -1303,6 +1314,13 @@ export function createSession(
     const target = run[runIndex];
     if (target === undefined) return;
 
+    // Bumped unconditionally, before endTapIfSounding() — see tapGeneration
+    // above: this supersedes a still-pending earlier tapNote() (or an
+    // enterTuner() that bumps it too) the instant this call starts, exactly
+    // where start()'s own droneGeneration bump sits relative to stopDrone().
+    tapGeneration += 1;
+    const startedAtGeneration = tapGeneration;
+
     endTapIfSounding();
 
     // `target` is passed in rather than closed over: TypeScript does not
@@ -1362,6 +1380,19 @@ export function createSession(
         notifyChange();
         return;
       }
+      // practice.tuner/REQ-001/S3, practice.session/REQ-013 — the guards at
+      // the top of tapNote() only run once, synchronously, before this
+      // await: an enterTuner() (found by T013's fixer-round enumeration:
+      // tapNotePending → enterTuner) or a second tapNote() (tapNotePending
+      // → tapNote → enterTuner — the first tap's continuation would
+      // otherwise post an orphaned voice no later endTapIfSounding() still
+      // knows the tag of) that lands while this first-ever tap is still
+      // awaiting sound.start() would otherwise pass unnoticed. A plain
+      // `if (tunerActive) return` here would catch the first case but not
+      // the second (tunerActive is still false while only a later tap has
+      // superseded this one) — tapGeneration catches both, since
+      // enterTuner() bumps it too.
+      if (tapGeneration !== startedAtGeneration) return;
       post(target.note);
     })();
   }
@@ -1483,7 +1514,31 @@ export function createSession(
   // before it); one that lands while listening.start() itself is resolving
   // is caught by startListening()'s own check.
   function enterTuner(): void {
+    // practice.tuner/REQ-001/S3 — a tapped note is a named way in (its Given
+    // lists "a tapped note sounding") and nothing sounds once the tuner
+    // screen shows: end an already-*posted* tap the same way start() does,
+    // before anything else — stop() below only reaches a sounding tap when
+    // transport.kind is not "idle", but a tap only ever sounds while idle,
+    // so without this an already-posted tap left sounding on entry never
+    // gets silenced at all (found by T013's fixer-round enumeration:
+    // tapNote → enterTuner). Bumping tapGeneration too supersedes a tap
+    // that is only still *pending* (tappedTag still null, awaiting
+    // sound.start()) — endTapIfSounding() alone cannot reach that one,
+    // since it has no tag yet to stop (tapNotePending → enterTuner; see
+    // tapGeneration above).
+    endTapIfSounding();
+    tapGeneration += 1;
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
index fe0b6b1..a3ecd62 100644
--- a/tests/practice/invariants/never-both.test.ts
+++ b/tests/practice/invariants/never-both.test.ts
@@ -1,6 +1,12 @@
 // practice.drone/REQ-004/S3 — every interleaving of ▶ / ❚❚ on the transport
 // with ▶ / ■ on the pill, up to four taps long, from idle: at no instant is
 // a sequence tone or a click sounding while the drone is.
+//
+// practice.tuner/REQ-001/S3 — the same enumeration, widened with the
+// tuner's two verbs (enterTuner, leaveTuner) and, since S3's Given names a
+// tapped note among the ways in, two tap verbs (tapNote, tapNotePending):
+// at no instant is a sequence tone, a click or the drone sounding while
+// the tuner is active.
 
 import { expect, test } from "vitest";
 import {
@@ -19,17 +25,40 @@ import {
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
+  | "leaveTuner"
+  | "tapNote"
+  | "tapNotePending";
 const ACTIONS: readonly Action[] = [
   "play",
   "pause",
   "droneOn",
   "droneOff",
   "droneOnPending",
+  "enterTuner",
+  "leaveTuner",
+  "tapNote",
+  "tapNotePending",
 ];
 const GAP_MS = 300;
 const CLICK_MS = 25;
 const STOP_FADE_MS = 5;
+// practice.session/REQ-013 — a tapped note's tag range (session.ts's
+// TAP_TAG_BASE, private to the domain and not exported through
+// published/); hardcoded here the same way session-tap.test.ts already
+// does, to tell a tapped tone's own targeted stop(tag) apart from a
+// sequence tone's or a click's (which are only ever ended by a stopAll).
+const TAP_TAG_BASE = 2_000_000;
+// Sequences of length 1 to 4 over ACTIONS.length verbs — the file's own
+// timeout budget for the exhaustive walk below (`sequences()`'s sum for
+// however many verbs ACTIONS currently holds).
+const TEST_TIMEOUT_MS = 20_000;
 
 // Every sequence of exactly `length` actions over ACTIONS, recursively:
 // length 0 is the single empty sequence; each longer sequence is one action
@@ -84,6 +113,58 @@ async function apply(session: Session, action: Action): Promise<void> {
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
+    case "tapNote":
+      // practice.tuner/REQ-001/S3 — a way in named by S3's Given: "a tapped
+      // note sounding". Mirrors droneOn/startDroneAndFlush: drives
+      // tapNote() through its internal await (sound.start(), only on the
+      // first-ever tap of the session) so the posted tone and the updated
+      // snapshot are both settled afterwards. Run index 0 is always a real
+      // note of the default G major traversal.
+      session.tapNote(0);
+      await Promise.resolve();
+      await Promise.resolve();
+      return;
+    case "tapNotePending":
+      // Mirrors droneOnPending's shape — starts tapNote()'s internal
+      // `await sound.start()` round trip and returns without an explicit
+      // flush of its own. Every case above, including this one, returns
+      // without ever internally awaiting, so `apply(...)`'s own promise
+      // settles after exactly the one tick any `await apply(...)` costs
+      // its caller (the "await" cost is the caller's, not the callee's).
+      // That one tick is enough to also drain droneOnPending's *first*
+      // internal await (sound.start()), but startDrone()'s pending branch
+      // has a *second* internal await (wakeLock.acquire()) still queued
+      // behind it, so it genuinely survives an `await apply(...)` — the
+      // T022 race. tapNote()'s pending branch has only the one internal
+      // await, so an `await apply(session, "tapNotePending")` at the call
+      // site would itself drain it, and the tap would already be posted
+      // by the time control returned — never reproducing the reviewer's
+      // race (b), brief T013's fixer round. Both sequence loops below
+      // therefore call this one action un-awaited (`void apply(...)`)
+      // rather than through a uniform `await apply(...)`, leaving the
+      // tap's single pending tick to be drained by whatever the
+      // sequence's next actual await turns out to be — typically the
+      // next action's own `apply()` — landing after a later enterTuner()
+      // in between has already run synchronously.
+      session.tapNote(0);
+      return;
   }
 }
 
@@ -140,6 +221,14 @@ function sequenceIntervals(
   posts.forEach((post, index) => {
     const command = post.command;
     if (!isTone(command) && !isClick(command)) return;
+    // practice.drone/REQ-004 — "a tapped note ... is the one thing that
+    // sounds over the drone": a tapped tone (tag ≥ TAP_TAG_BASE) is exempt
+    // from this test's "never both" check, unlike a sequence tone or a
+    // click. Widening ACTIONS with tapNote/tapNotePending (T013's fixer)
+    // means this function now sees taps too, so the exemption has to be
+    // stated here or a legitimate tap-over-drone overlap would fail this
+    // test.
+    if (isTone(command) && command.tag >= TAP_TAG_BASE) return;
     const from = command.onsetFrame;
     const naturalTo = isTone(command)
       ? from + command.durationFrames
@@ -160,35 +249,168 @@ function sequenceIntervals(
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
+    // A tapped tone (tag ≥ TAP_TAG_BASE) is ended by its own targeted
+    // stop(tag) — endTapIfSounding() (session.ts) — the same as a drone
+    // voice, not only by a stopAll; a sequence tone's or a click's tag
+    // never appears on a stop command (only stopAll ever ends those), so
+    // this only ever matches a drone or a tap.
+    const endedByOwnStop =
+      isDrone(command) || (isTone(command) && command.tag >= TAP_TAG_BASE);
+    let stopFrame = Infinity;
+    for (let later = index + 1; later < posts.length; later += 1) {
+      const candidate = posts[later]!;
+      if (
+        endedByOwnStop &&
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
+          // tapNotePending must never itself be awaited — see its comment
+          // in apply() above.
+          if (action === "tapNotePending") void apply(session, action);
+          else await apply(session, action);
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
+          // tapNotePending must never itself be awaited — see its comment
+          // in apply() above.
+          if (action === "tapNotePending") void apply(session, action);
+          else await apply(session, action);
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

<!-- recorded 2026-09-28T10:41:24Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] a pending first-ever tap racing ▶/❚❚ is not superseded (start/stop do not bump tapGeneration) — outside REQ-001, for converge. [minor] TAP_TAG_BASE duplicated in the test. Comment gloss '(500 ms)' wrong (80 ms).
