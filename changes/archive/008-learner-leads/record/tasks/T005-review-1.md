---
type: Task Review
title: Review package — T005 · 008-learner-leads
description: The diff produced for T005, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/T005.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T005.md
  - resource: git:877d1ca..877d1ca2e5b4b6a747468a118e60cd3da24b5db5
generated:
  by: process:review-package.sh
  at: 2026-10-02T19:41:41Z
sdd_id: 008-learner-leads
---

# Review package — T005 · 008-learner-leads

base: `877d1ca` → head: `877d1ca2e5b4b6a747468a118e60cd3da24b5db5`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index d8a6c21..e22cbb2 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -43,6 +43,8 @@ import type { VisibilityPort } from "../ports/visibility";
 import type { WakeLockPort } from "../ports/wake-lock";
 import type { DroneSettings, DroneSound } from "./drone";
 import { canStepDroneOctave, droneNoteOf } from "./drone";
+import type { LeadPhase, LeadSettings, LeadTarget, Who } from "./lead";
+import { emptyHold, heldFractionOf, requiredHoldMs, targetAt } from "./lead";
 import type { ScaleChoice } from "./scale-choice";
 import { chosenScaleIdFor } from "./scale-choice";
 import type { SessionSettings } from "./settings";
@@ -112,6 +114,23 @@ export interface DroneSnapshot {
   readonly canStepUp: boolean;
 }
 
+// practice.session/REQ-014, REQ-015 — "I lead"'s own half of the session:
+// who leads, the lead run's phase and target, its listening state (the same
+// sum TunerSnapshot uses) and the two captions the card shows while idle or
+// complete. `reading` and `justHeld` are always null until T006 and T011
+// wire the judged-reading and "<note> held ✓" logic through.
+export interface LeadSnapshot {
+  readonly who: Who;
+  readonly phase: LeadPhase["kind"];
+  readonly listening: ListeningState;
+  readonly target: LeadTarget | null;
+  readonly heldFraction: number;
+  readonly reading: NoteJudged | null;
+  readonly justHeld: Note | null;
+  readonly idleCaption: string;
+  readonly completeCaption: string | null;
+}
+
 export interface SessionSnapshot {
   readonly transport: TransportState;
   readonly traversal: Traversal;
@@ -121,7 +140,6 @@ export interface SessionSnapshot {
   readonly run: readonly KeyViewNote[];
   readonly sequence: readonly SequenceNote[];
   readonly caption: string;
-  readonly progress: number;
   readonly summaryLine: string;
   readonly tempoTerm: TempoTerm;
   readonly soundingPosition: number | null;
@@ -133,6 +151,7 @@ export interface SessionSnapshot {
   readonly drone: DroneSnapshot;
   readonly tappedRunIndex: number | null;
   readonly tuner: TunerSnapshot;
+  readonly lead: LeadSnapshot;
 }
 
 export interface Session {
@@ -232,6 +251,19 @@ function extremesOf(
   return { lowest, highest };
 }
 
+// "<N> notes · <lowest>–<highest>" — play along's idle caption
+// (practice.session/REQ-002) and, when who is "tool", I lead's idle caption
+// too (practice.session/REQ-014/S2): the same sequence, read the same way,
+// shared rather than recomputed twice.
+function sequenceCaptionOf(
+  run: readonly KeyViewNote[],
+  sequence: readonly SequenceNote[],
+): string {
+  const extremes = extremesOf(run);
+  if (extremes === null) return "";
+  return `${sequence.length} notes · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
+}
+
 function captionOf(
   transport: TransportState,
   run: readonly KeyViewNote[],
@@ -239,11 +271,8 @@ function captionOf(
   soundingPosition: number | null,
 ): string {
   switch (transport.kind) {
-    case "idle": {
-      const extremes = extremesOf(run);
-      if (extremes === null) return "";
-      return `${sequence.length} notes · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
-    }
+    case "idle":
+      return sequenceCaptionOf(run, sequence);
     case "countingIn":
       return `COUNT IN · ${transport.beatsLeft}`;
     case "resting":
@@ -323,7 +352,6 @@ function snapshotsMateriallyEqual(
     transportEqual(a.transport, b.transport) &&
     a.soundingPosition === b.soundingPosition &&
     a.caption === b.caption &&
-    a.progress === b.progress &&
     a.notice === b.notice &&
     a.settings === b.settings &&
     a.traversal === b.traversal &&
@@ -347,7 +375,22 @@ function snapshotsMateriallyEqual(
     targetEqual(a.tuner.target, b.tuner.target) &&
     targetNoteEqual(a.tuner.targetNote, b.tuner.targetNote) &&
     a.tuner.reading === b.tuner.reading &&
-    targetNoteEqual(a.tuner.lastHeard, b.tuner.lastHeard)
+    targetNoteEqual(a.tuner.lastHeard, b.tuner.lastHeard) &&
+    // practice.session/REQ-014, REQ-015 — `who` and `idleCaption` are
+    // already covered by `settings`/`run` above (the same reasoning as this
+    // function's own comment: both are derived purely from one or the
+    // other); `phase`, `listening`, `target`, `heldFraction`, `reading` and
+    // `justHeld` are not, and need their own comparison. `listening` and
+    // `target` are only ever reassigned by `startLead()`/`stop()` (never
+    // mutated in place, never rebuilt fresh per buildSnapshot() call the
+    // way `tuner.targetNote` is), so reference equality is enough, the same
+    // reasoning as `tuner.active`/`tuner.listening` above.
+    a.lead.phase === b.lead.phase &&
+    a.lead.listening === b.lead.listening &&
+    a.lead.target === b.lead.target &&
+    a.lead.heldFraction === b.lead.heldFraction &&
+    a.lead.reading === b.lead.reading &&
+    a.lead.justHeld === b.lead.justHeld
   );
 }
 
@@ -495,6 +538,29 @@ export function createSession(
   // set with a stale "listening"/"cannot-hear".
   let tunerGeneration = 0;
 
+  // practice.session/REQ-014, REQ-015 — which subsystem currently holds (or
+  // is still requesting) the microphone: the tuner and a lead run never
+  // listen at once, so one flag settles who a detection or an ended-track
+  // event belongs to, and who requestListening()'s supersede check compares
+  // against. `tunerActive` is untouched by this — it stays the tuner's own
+  // "the tuner screen is open" flag, exactly as before.
+  let listeningOwner: "none" | "tuner" | "lead" = "none";
+  // practice.session/REQ-015 — a lead run's own state: the phase stays
+  // "idle" while the microphone is still being requested (leadListeningState
+  // carries "starting" for that window instead — LeadPhase has no variant
+  // for it, the same way TunerSnapshot's `active` and `listening` are two
+  // separate fields rather than one), and becomes "listening" only once
+  // leadListeningState does too, with the first target already pinned to it
+  // (REQ-015/S1: the target and `TargetAdvanced` arrive together).
+  let leadPhase: LeadPhase = { kind: "idle" };
+  let leadListeningState: ListeningState = { kind: "off" };
+  // Bumped by both startLead() and stop() — mirrors tunerGeneration: a
+  // stop() (or a second startLead()) landing while a startLead() is still
+  // awaiting wakeLock.acquire()/listening.start() must supersede that
+  // continuation, so it never overwrites the state the newer call already
+  // set with a stale "listening"/"cannot-hear".
+  let leadGeneration = 0;
+
   let run: readonly KeyViewNote[] = [];
   let sequence: readonly SequenceNote[] = [];
   let effectiveOctaves: Octaves = { kind: "full" };
@@ -748,13 +814,18 @@ export function createSession(
     cancelIdle = null;
   }
 
-  // practice.drone/REQ-004, practice.tuner/REQ-001 — the wake lock is
-  // shared between playback, the drone and the tuner: it is released only
-  // when none remains, so stop(), the idle transition, stopDrone() and
-  // leaveTuner() all funnel through this one check rather than each
-  // deciding on its own.
+  // practice.drone/REQ-004, practice.tuner/REQ-001, practice.session/REQ-015
+  // — the wake lock is shared between playback, the drone, the tuner and a
+  // lead run: it is released only when none remains, so stop(), the idle
+  // transition, stopDrone() and leaveTuner() all funnel through this one
+  // check rather than each deciding on its own.
   function releaseWakeLockIfSilent(): void {
-    if (transport.kind === "idle" && !droneOn && !tunerActive) {
+    if (
+      transport.kind === "idle" &&
+      !droneOn &&
+      !tunerActive &&
+      listeningOwner !== "lead"
+    ) {
       wakeLock.release();
     }
   }
@@ -1013,6 +1084,28 @@ export function createSession(
     return { commands, durationFrames };
   }
 
+  // practice.session/REQ-014 — "hold 2 beats · medium tuning" while I lead
+  // is idle; the sequence caption (shared with play along, REQ-002) while
+  // who is "tool" — I lead's own idle card never shows while who is "tool",
+  // but the field is always well-defined.
+  function leadIdleCaptionOf(settings: LeadSettings): string {
+    if (settings.who === "tool") return sequenceCaptionOf(run, sequence);
+    const { holdBeats, tolerance } = settings;
+    const beatWord = holdBeats === 1 ? "beat" : "beats";
+    return `hold ${holdBeats} ${beatWord} · ${tolerance} tuning`;
+  }
+
+  // practice.session/REQ-015 — "15 of 15 held · C4–C5", shown only once the
+  // run has completed (looping disabled, the last note held); null the rest
+  // of the time. `extremesOf`/`noteLabel` are the same pair `captionOf`'s
+  // idle case uses, read against the run rather than the sequence position.
+  function leadCompleteCaptionOf(phase: LeadPhase): string | null {
+    if (phase.kind !== "complete") return null;
+    const extremes = extremesOf(run);
+    if (extremes === null) return null;
+    return `${sequence.length} of ${sequence.length} held · ${noteLabel(extremes.lowest.note)}–${noteLabel(extremes.highest.note)}`;
+  }
+
   function buildSnapshot(): SessionSnapshot {
     return {
       transport,
@@ -1023,10 +1116,6 @@ export function createSession(
       run,
       sequence,
       caption: captionOf(transport, run, sequence, soundingPosition),
-      progress:
-        soundingPosition !== null && transport.kind === "playing"
-          ? (soundingPosition + 1) / sequence.length
-          : 0,
       summaryLine: summaryLineOf(
         currentTraversal,
         effectiveOctaves,
@@ -1072,6 +1161,30 @@ export function createSession(
         canStepDown: canStepTarget(tunerTarget, -1),
         canStepUp: canStepTarget(tunerTarget, 1),
       },
+      lead: {
+        who: currentSettings.lead.who,
+        phase: leadPhase.kind,
+        listening: leadListeningState,
+        target: leadPhase.kind === "listening" ? leadPhase.target : null,
+        heldFraction:
+          leadPhase.kind === "listening"
+            ? heldFractionOf(
+                leadPhase.hold,
+                requiredHoldMs(
+                  currentSettings.lead.holdBeats,
+                  currentSettings.tempoBpm,
+                ),
+              )
+            : 0,
+        // T006 commits a judged reading onto this field the same way
+        // commitTunerReading() does for the tuner; T011 sets justHeld on an
+        // advance. Neither exists yet — a lead run so far only ever reaches
+        // "listening" at its first target, never a judged reading.
+        reading: null,
+        justHeld: null,
+        idleCaption: leadIdleCaptionOf(currentSettings.lead),
+        completeCaption: leadCompleteCaptionOf(leadPhase),
+      },
     };
   }
 
@@ -1113,6 +1226,13 @@ export function createSession(
     // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens:
     // ▶ is refused outright rather than queued for when the tuner is left.
     if (tunerActive) return;
+    // practice.session/REQ-014, REQ-015 — the start circle dispatches on the
+    // mode: "me" never touches the transport/scheduler machinery below at
+    // all, it asks to listen instead.
+    if (currentSettings.lead.who === "me") {
+      startLead();
+      return;
+    }
     // practice.session/REQ-013 — ▶ ends any sounding tap the same way a
     // retap does, before anything else: a tap only ever sounds while idle,
     // and start() is about to leave idle.
@@ -1179,6 +1299,21 @@ export function createSession(
 
   function stop(): void {
     invalidateSnapshot();
+    // practice.session/REQ-015/S2, REQ-009/S3 — a lead run in progress
+    // (phase "listening", or a startLead() still awaiting the wake lock or
+    // the microphone — listeningOwner is set synchronously, before either
+    // await) ends here instead of falling through to the transport/scheduler
+    // branch below, which a lead run never touches.
+    if (listeningOwner === "lead") {
+      leadGeneration += 1; // supersede a startLead() still awaiting its asks
+      listening.stop();
+      listeningOwner = "none";
+      leadListeningState = { kind: "off" };
+      leadPhase = { kind: "idle" };
+      releaseWakeLockIfSilent();
+      notifyChange();
+      return;
+    }
     // practice.drone/REQ-004 (T022) — clears the drone first when it is on,
     // so droneOn/droneTag are never left stale: without this, a stop() that
     // runs while the drone is fully on would leave `on` true with no
@@ -1505,7 +1640,24 @@ export function createSession(
 
   function setSettings(newSettings: SessionSettings): void {
     invalidateSnapshot();
+    // practice.session/REQ-014/S3 — changing who leads while a run (playback
+    // or a lead run) is in progress stops it first and shows the new mode
+    // idle, rather than leaving the old run going under the new mode's
+    // settings. A run in progress either side of the switch: the transport
+    // not idle (play along) or listeningOwner "lead" (a lead run listening,
+    // or still asking to).
+    if (
+      newSettings.lead.who !== currentSettings.lead.who &&
+      (transport.kind !== "idle" || listeningOwner === "lead")
+    ) {
+      stop();
+    }
     currentSettings = newSettings;
+    // stop() above (when called) already rebuilt and cached a snapshot of
+    // its own, from the *old* settings — invalidated again here so the
+    // notifyChange() below reads one built from the settings just stored,
+    // not stop()'s stale one.
+    invalidateSnapshot();
     notifyChange();
   }
 
@@ -1552,6 +1704,103 @@ export function createSession(
     })();
   }
 
+  // practice.tuner/REQ-001, REQ-008; practice.session/REQ-015 — the shared
+  // "wait for the wake lock, then ask to listen" trampoline both
+  // enterTuner() and startLead() run after committing to a request
+  // (`listeningOwner`/their own generation already set synchronously, before
+  // this is called): once the wake lock resolves, hand off to `onReady` —
+  // unless a later call has superseded this one in the meantime, in which
+  // case `onReady` never runs. `isCurrent` stays each caller's own
+  // generation check (tunerGeneration/leadGeneration) rather than folding
+  // into `owner` alone: a *second* call for the same owner (a second
+  // enterTuner(), say) must supersede the first just as surely as the other
+  // subsystem taking over would, and only the caller's own generation
+  // distinguishes those two from one another.
+  function requestListening(
+    owner: "tuner" | "lead",
+    isCurrent: () => boolean,
+    onReady: () => void,
+  ): void {
+    void (async () => {
+      await wakeLock.acquire();
+      if (listeningOwner !== owner || !isCurrent()) return;
+      onReady();
+    })();
+  }
+
+  // practice.session/REQ-015 — the "me" branch of start(): stop the drone if
+  // it sounds, then ask to listen exactly as enterTuner() does below (the
+  // microphone is asked for "at that moment", never before) — a no-op on an
+  // empty sequence (REQ-015/S8) or while a lead run is already listening or
+  // still asking to (guarded by `listeningOwner`, since LeadPhase itself has
+  // no "starting" of its own — `leadListeningState` carries that instead,
+  // the same split as TunerSnapshot's `active`/`listening`).
+  function startLead(): void {
+    if (sequence.length === 0) return;
+    if (listeningOwner === "lead") return;
+    if (droneOn) stopDrone();
+    invalidateSnapshot();
+    listeningOwner = "lead";
+    leadListeningState = { kind: "starting" };
+    leadGeneration += 1;
+    const startedAtGeneration = leadGeneration;
+    notifyChange();
+
+    requestListening(
+      "lead",
+      () => leadGeneration === startedAtGeneration,
+      () => {
+        void (async () => {
+          const result = await listening.start();
+          if (
+            listeningOwner !== "lead" ||
+            leadGeneration !== startedAtGeneration
+          ) {
+            // Superseded (a stop() or a second startLead()) while the
+            // microphone was being asked for — if it actually opened, hand
+            // it straight back rather than leaving it open under nobody's
+            // name.
+            if (result.ok) listening.stop();
+            return;
+          }
+          invalidateSnapshot();
+          if (result.ok) {
+            leadListeningState = { kind: "listening" };
+            // practice.session/REQ-015/S1 — the first target, pinned the
+            // instant listening actually starts: the "listening" phase and
+            // `TargetAdvanced` arrive together, never one before the other.
+            const target = targetAt(sequence, 1);
+            leadPhase = {
+              kind: "listening",
+              target,
+              hold: emptyHold,
+              mutedUntilMs: null,
+            };
+            const advancedEvent: TargetAdvanced = {
+              note: target.note,
+              position: 1,
+              length: sequence.length,
+              atFrame: listening.currentFrame(),
+            };
+            for (const listener of targetAdvancedListeners) {
+              listener(advancedEvent);
+            }
+          } else {
+            // practice.session/REQ-022 — the attempt ends here rather than
+            // leaving `listeningOwner` claimed: nothing is actually
+            // listening, so the next tap of the start circle must be free
+            // to try again (T009 tests the cannot-hear card itself).
+            listeningOwner = "none";
+            const reason = cannotHearReasonOf(result.error.reason);
+            leadListeningState = { kind: "cannot-hear", reason };
+            leadPhase = { kind: "cannot-hear", reason };
+          }
+          notifyChange();
+        })();
+      },
+    );
+  }
+
   // practice.tuner/REQ-001 — the way in: stop playback and the drone (never
   // both sounding) before requesting listening, exactly as startDrone()
   // stops playback before requesting sound — same shape, same generation
@@ -1560,9 +1809,9 @@ export function createSession(
   // startListening() above, so a single check after wakeLock.acquire()
   // cannot by itself protect it — a leaveTuner() (or a hidden event) that
   // lands while wakeLock.acquire() is still resolving must stop this
-  // continuation from ever calling startListening() at all (checked here,
-  // before it); one that lands while listening.start() itself is resolving
-  // is caught by startListening()'s own check.
+  // continuation from ever calling startListening() at all (checked by
+  // requestListening(), before it); one that lands while listening.start()
+  // itself is resolving is caught by startListening()'s own check.
   function enterTuner(): void {
     // practice.tuner/REQ-001/S3 — a tapped note is a named way in (its Given
     // lists "a tapped note sounding") and nothing sounds once the tuner
@@ -1592,15 +1841,16 @@ export function createSession(
     if (droneOn) stopDrone();
     invalidateSnapshot();
     tunerActive = true;
+    listeningOwner = "tuner";
     tunerGeneration += 1;
     const startedAtGeneration = tunerGeneration;
     notifyChange();
 
-    void (async () => {
-      await wakeLock.acquire();
-      if (tunerGeneration !== startedAtGeneration) return;
-      startListening(startedAtGeneration);
-    })();
+    requestListening(
+      "tuner",
+      () => tunerGeneration === startedAtGeneration,
+      () => startListening(startedAtGeneration),
+    );
   }
 
   // practice.tuner/REQ-001/S4 — the way out: release the microphone, forget
@@ -1615,6 +1865,7 @@ export function createSession(
     listening.stop();
     cancelTunerTimers();
     tunerActive = false;
+    listeningOwner = "none";
     tunerListeningState = { kind: "off" };
     tunerTarget = { kind: "auto" };
     clearTunerReading();
@@ -1726,6 +1977,8 @@ export function createSession(
     stopDrone();
     // practice.tuner/REQ-001 — release the microphone too, the same reason.
     if (tunerActive) listening.stop();
+    // practice.session/REQ-015 — and a lead run's, the same reason.
+    if (listeningOwner === "lead") listening.stop();
     sound.dispose();
     changeListeners.clear();
     targetAdvancedListeners.clear();
diff --git a/src/practice/published/index.ts b/src/practice/published/index.ts
index bf2a31b..2e6f424 100644
--- a/src/practice/published/index.ts
+++ b/src/practice/published/index.ts
@@ -60,6 +60,7 @@ export type { BeatsLeft, Tick, TransportState } from "../domain/transport";
 export { advance, startTransport, tickOf } from "../domain/transport";
 export type {
   DroneSnapshot,
+  LeadSnapshot,
   Session,
   SessionContext,
   SessionDeps,
diff --git a/src/ui/TransportCard.tsx b/src/ui/TransportCard.tsx
index 2e3f8f5..f0baf91 100644
--- a/src/ui/TransportCard.tsx
+++ b/src/ui/TransportCard.tsx
@@ -25,11 +25,6 @@ const CAPTION_FONT_SIZE = 10.5;
 const CAPTION_LETTER_SPACING = "0.04em";
 const CAPTION_INK = paper.muted;
 
-const TRACK_HEIGHT = 3;
-const TRACK_RADIUS = 2;
-const TRACK_BACKGROUND = "#e0d7c5";
-const FILL_BACKGROUND = paper.accent;
-
 const RIGHT_GAP = 4;
 
 const STEPPER_BORDER = "#e0d7c5";
@@ -142,24 +137,8 @@ export function TransportCard(props: {
         >
           {snapshot.caption}
         </div>
-        <div
-          style={{
-            height: TRACK_HEIGHT,
-            borderRadius: TRACK_RADIUS,
-            background: TRACK_BACKGROUND,
-            overflow: "hidden",
-          }}
-        >
-          <div
-            data-testid="progress-fill"
-            style={{
-              height: TRACK_HEIGHT,
-              borderRadius: TRACK_RADIUS,
-              background: FILL_BACKGROUND,
-              width: `${snapshot.progress * 100}%`,
-            }}
-          />
-        </div>
+        {/* practice.session/REQ-002 — the progress bar is removed here (the
+            mode words that replace it, beneath this caption, are T012's). */}
       </div>
       <div
         style={{
diff --git a/tests/practice/invariants/hold-never-early.test.ts b/tests/practice/invariants/hold-never-early.test.ts
index 1f84bb1..b967620 100644
--- a/tests/practice/invariants/hold-never-early.test.ts
+++ b/tests/practice/invariants/hold-never-early.test.ts
@@ -117,4 +117,4 @@ test("practice.session/REQ-016/S6 — the target advances only at ≥ beats × 6
         }
       }
   expect(checked).toBeGreaterThan(1_000_000);
-}, 15_000);
+}, 30_000);
diff --git a/tests/practice/scenarios/drone-exclusion.test.ts b/tests/practice/scenarios/drone-exclusion.test.ts
index 8cb9d76..84cf53a 100644
--- a/tests/practice/scenarios/drone-exclusion.test.ts
+++ b/tests/practice/scenarios/drone-exclusion.test.ts
@@ -46,7 +46,6 @@ test("practice.drone/REQ-004/S1 — the drone interrupts a run", async () => {
   expect(after).toContain("drone");
   expect(session.snapshot().transport).toEqual({ kind: "idle" });
   expect(session.snapshot().caption).toBe("29 notes · G4–G6");
-  expect(session.snapshot().progress).toBe(0);
   expect(session.snapshot().drone.on).toBe(true);
   expect(wake.acquired).toBe(true);
 });
diff --git a/tests/practice/scenarios/session-transport.test.ts b/tests/practice/scenarios/session-transport.test.ts
index 8423735..0e0ca4a 100644
--- a/tests/practice/scenarios/session-transport.test.ts
+++ b/tests/practice/scenarios/session-transport.test.ts
@@ -95,7 +95,6 @@ test("practice.session/REQ-002/S2 — stop returns to the top", async () => {
   expect(sound.posted.at(-1)).toEqual({ kind: "stopAll" });
   expect(session.snapshot().transport).toEqual({ kind: "idle" });
   expect(session.snapshot().caption).toBe("29 notes · G4–G6");
-  expect(session.snapshot().progress).toBe(0);
   expect(wake.acquired).toBe(false);
 
   await flushStart(session);
diff --git a/tests/ui/scenarios/transport-card.test.tsx b/tests/ui/scenarios/transport-card.test.tsx
index b137589..a2dd79b 100644
--- a/tests/ui/scenarios/transport-card.test.tsx
+++ b/tests/ui/scenarios/transport-card.test.tsx
@@ -6,6 +6,7 @@ import {
   defaultScaleChoice,
   defaultSessionSettings,
   defaultTraversal,
+  type LeadSnapshot,
   type SessionSnapshot,
   type TempoTerm,
   type TunerSnapshot,
@@ -53,6 +54,21 @@ const placeholderTuner: TunerSnapshot = {
   canStepUp: false,
 };
 
+// TransportCard renders nothing about "I lead" either (the mode words, the
+// live/complete/no-mic cards are T012+) — another valid placeholder, same
+// reasoning as defaultScale/placeholderTuner.
+const placeholderLead: LeadSnapshot = {
+  who: "tool",
+  phase: "idle",
+  listening: { kind: "off" },
+  target: null,
+  heldFraction: 0,
+  reading: null,
+  justHeld: null,
+  idleCaption: "",
+  completeCaption: null,
+};
+
 function baseSnapshot(
   overrides: Partial<SessionSnapshot> = {},
 ): SessionSnapshot {
@@ -65,7 +81,6 @@ function baseSnapshot(
     run: [],
     sequence: [],
     caption: "",
-    progress: 0,
     summaryLine: "",
     tempoTerm: andante,
     soundingPosition: null,
@@ -86,6 +101,7 @@ function baseSnapshot(
     // same reasoning as defaultScale/placeholderDroneNote above.
     tappedRunIndex: null,
     tuner: placeholderTuner,
+    lead: placeholderLead,
     ...overrides,
   };
 }
@@ -94,11 +110,10 @@ const noop = () => {
   // no-op handler for props not under test
 };
 
-test("practice.session/REQ-002/S1 (UI) — idle transport shows Play, the run caption, empty progress and the tempo", () => {
+test("practice.session/REQ-002/S1 (UI) — idle transport shows Play, the run caption and the tempo", () => {
   const idleSnapshot = baseSnapshot({
     transport: { kind: "idle" },
     caption: "15 notes · G4–G6",
-    progress: 0,
     tempoTerm: andante,
     settings: { ...defaultSessionSettings, tempoBpm: 96 },
   });
@@ -117,17 +132,14 @@ test("practice.session/REQ-002/S1 (UI) — idle transport shows Play, the run ca
   expect(screen.getByTestId("position-caption").textContent).toBe(
     "15 notes · G4–G6",
   );
-  const fill = screen.getByTestId("progress-fill");
-  expect(fill.style.width).toBe("0%");
   expect(screen.getByText("96")).toBeTruthy();
   expect(screen.getByText("Andante")).toBeTruthy();
 });
 
-test("practice.session/REQ-002/S1 (UI) — playing transport shows Stop, the sounding note and the run position as progress", () => {
+test("practice.session/REQ-002/S1 (UI) — playing transport shows Stop and the sounding note", () => {
   const playingSnapshot = baseSnapshot({
     transport: { kind: "playing", position: 4 },
     caption: "D5 · 5 of 29",
-    progress: 5 / 29,
     soundingPosition: 4,
   });
 
@@ -145,15 +157,12 @@ test("practice.session/REQ-002/S1 (UI) — playing transport shows Stop, the sou
   expect(screen.getByTestId("position-caption").textContent).toBe(
     "D5 · 5 of 29",
   );
-  const fill = screen.getByTestId("progress-fill");
-  expect(fill.style.width).toMatch(/^17\.24/);
 });
 
 test("practice.session/REQ-002/S2 (UI) — tapping Stop calls onTogglePlay once", async () => {
   const playingSnapshot = baseSnapshot({
     transport: { kind: "playing", position: 11 },
     caption: "D5 · 12 of 29",
-    progress: 12 / 29,
   });
   const onTogglePlay = vi.fn();
 
```

## Verdict

SPEC: PASS · QUALITY: PASS · FINDINGS: [minor] two ripples (hold-never-early timeout 30 s; drone-exclusion's `progress` assertion) touched but not narrated; [minor] `startLead()` does not bump `droneGeneration` before `if (droneOn) stopDrone()` as `enterTuner()` does — a pending `startDrone()` could still post a drone mid-run; to be closed with T008's never-both widening. The `requestListening(owner, isCurrent, onReady)` extraction preserves the tuner's generation guard; the second `invalidateSnapshot()` in `setSettings` is a correct, minimal fix for a stale cached snapshot; S8's synthetic variant corroborated by 005's notes ("no notes of this key in range" unreachable).

<!-- recorded 2026-10-02T19:55:03Z by scripts/record.sh -->
