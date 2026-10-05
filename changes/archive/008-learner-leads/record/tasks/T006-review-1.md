---
type: Task Review
title: Review package — T006 · 008-learner-leads
description: The diff produced for T006, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/T006.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T006.md
  - resource: git:51f8788..51f87882a1366c5737d18ec301ea1a9b55ea178a
generated:
  by: process:review-package.sh
  at: 2026-10-02T20:33:44Z
sdd_id: 008-learner-leads
---

# Review package — T006 · 008-learner-leads

base: `51f8788` → head: `51f87882a1366c5737d18ec301ea1a9b55ea178a`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index e22cbb2..ad309bd 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -44,7 +44,16 @@ import type { WakeLockPort } from "../ports/wake-lock";
 import type { DroneSettings, DroneSound } from "./drone";
 import { canStepDroneOctave, droneNoteOf } from "./drone";
 import type { LeadPhase, LeadSettings, LeadTarget, Who } from "./lead";
-import { emptyHold, heldFractionOf, requiredHoldMs, targetAt } from "./lead";
+import {
+  applyJudgement,
+  applySilence,
+  emptyHold,
+  heldFractionOf,
+  LEAD_GAP_MS,
+  requiredHoldMs,
+  targetAt,
+  TOLERANCE_CENTS,
+} from "./lead";
 import type { ScaleChoice } from "./scale-choice";
 import { chosenScaleIdFor } from "./scale-choice";
 import type { SessionSettings } from "./settings";
@@ -67,6 +76,7 @@ import {
   smoothedPitchHzOf,
   TUNER_HIGHEST_POSITION,
   TUNER_LOWEST_POSITION,
+  verdictOf,
 } from "./tuner";
 import type { NoteJudged } from "../published/note-judged.schema";
 import type { PitchDetected } from "../../listening/published/pitch-detected.schema";
@@ -560,6 +570,21 @@ export function createSession(
   // continuation, so it never overwrites the state the newer call already
   // set with a stale "listening"/"cannot-hear".
   let leadGeneration = 0;
+  // practice.session/REQ-016 — the lead run's own smoothing filter, pinned
+  // to the target note (never `shown`, which has no meaning for a pinned
+  // target): reset on a new target (T006) and inside a muted window (T011);
+  // mirrors `tunerSmoothingState` above.
+  let leadSmoothing: SmoothingState = initialSmoothingState;
+  // The committed reading shown on the meter and the card, and the one
+  // still awaiting its commit-on-next-tick timer — mirrors
+  // `tunerReading`/`tunerPendingReading` above (the same coalescing: a
+  // burst of detections within one tick commits only the newest).
+  let leadReading: NoteJudged | null = null;
+  let leadPendingReading: NoteJudged | null = null;
+  // Cancels for the lead run's own two timers — mirrors
+  // `tunerCommitCancel`/`tunerGapCancel` above.
+  let leadCommitCancel: (() => void) | null = null;
+  let leadGapCancel: (() => void) | null = null;
 
   let run: readonly KeyViewNote[] = [];
   let sequence: readonly SequenceNote[] = [];
@@ -864,48 +889,156 @@ export function createSession(
     }
   });
 
-  // practice.tuner/REQ-002 — turns a detection into a judgement, held as
-  // `tunerPendingReading` until the next clock tick commits it (a burst of
-  // detections within one tick coalesces onto the newest). Ignored unless
-  // the tuner is active and actually listening — a detection that arrives
-  // after leaveTuner() (or before listening.start() resolves) is dropped.
-  function onPitchDetected(pitch: PitchDetected): void {
-    if (!tunerActive || tunerListeningState.kind !== "listening") return;
-    // practice.tuner/REQ-006 (Article V) — a detection older than the
-    // budget by the time it reaches here is dropped outright: no
-    // judgement, no NoteJudged, the pending reading (if any) untouched —
-    // silence beats a late reading.
+  // practice.tuner/REQ-006, practice.session/REQ-021 (Article V) — the age
+  // check shared by both subsystems: a detection already older than the
+  // budget by the time it reaches here is dropped outright, no matter who
+  // is listening — silence beats a late reading.
+  function isTooOld(pitch: PitchDetected): boolean {
     const ageMs =
       ((listening.currentFrame() - pitch.atFrame) / listening.sampleRate()) *
       1000;
-    if (ageMs > READING_MAX_AGE_MS) return;
-    // practice.tuner/REQ-002 — judge a smoothed pitch (never holding the
-    // reading back), but keep `heard.hz` the raw detected value: the
-    // measured harness reads it, and the spec says the Hz stays detected.
+    return ageMs > READING_MAX_AGE_MS;
+  }
+
+  // practice.tuner/REQ-002, practice.session/REQ-016 — turns a detection
+  // into a judgement for whichever subsystem is listening (the tuner and a
+  // lead run never listen at once — `listeningOwner` settles it), held as
+  // `tunerPendingReading`/`leadPendingReading` until the next clock tick
+  // commits it (a burst of detections within one tick coalesces onto the
+  // newest for display — the hold itself, below, applies to every one).
+  // Ignored unless the owning subsystem is active and actually listening —
+  // a detection that arrives after leaveTuner()/stop() (or before
+  // listening.start() resolves) is dropped.
+  function onPitchDetected(pitch: PitchDetected): void {
+    if (tunerActive && tunerListeningState.kind === "listening") {
+      if (isTooOld(pitch)) return;
+      // practice.tuner/REQ-002 — judge a smoothed pitch (never holding the
+      // reading back), but keep `heard.hz` the raw detected value: the
+      // measured harness reads it, and the spec says the Hz stays detected.
+      const { hz: smoothedHz, state } = smoothedPitchHzOf(
+        tunerSmoothingState,
+        tunerTarget,
+        tunerShownPosition,
+        pitch.hz,
+      );
+      tunerSmoothingState = state;
+      const result = judge(
+        { ...pitch, hz: smoothedHz },
+        tunerTarget,
+        tunerShownPosition,
+        currentContext.spelling,
+      );
+      tunerPendingReading = {
+        judged: {
+          ...result.judged,
+          heard: { ...result.judged.heard, hz: pitch.hz },
+        },
+        shown: result.shown,
+      };
+      if (tunerCommitCancel === null) {
+        tunerCommitCancel = clock.setTimeout(commitTunerReading, 0);
+      }
+      armTunerGapTimer();
+      return;
+    }
+
+    if (
+      listeningOwner !== "lead" ||
+      leadPhase.kind !== "listening" ||
+      leadListeningState.kind !== "listening"
+    ) {
+      return;
+    }
+    if (isTooOld(pitch)) return;
+
+    const atMs = (pitch.atFrame / listening.sampleRate()) * 1000;
+    // practice.session/REQ-018 (wired by T011) — a detection inside the
+    // tone cue's mute window is dropped the same way a stale one is, except
+    // the smoothing resets too, so the first reading once the window ends
+    // is shown as detected rather than blended across it. `mutedUntilMs` is
+    // null until T011 sets it, so this branch is never taken yet.
+    if (leadPhase.mutedUntilMs !== null && atMs < leadPhase.mutedUntilMs) {
+      leadSmoothing = initialSmoothingState;
+      return;
+    }
+
+    // practice.session/REQ-016, REQ-017 — judged against the target's own
+    // pitch, pinned (never auto): the smoothing and the judgement are the
+    // tuner's own pure functions, called with a pinned target and no shown
+    // hysteresis (a pinned target ignores it) — then the verdict is
+    // recomputed at the lead tolerance rather than the tuner's fixed band.
+    const pinned: TunerTarget = {
+      kind: "pinned",
+      position: pitchPosition(leadPhase.target.note),
+    };
     const { hz: smoothedHz, state } = smoothedPitchHzOf(
-      tunerSmoothingState,
-      tunerTarget,
-      tunerShownPosition,
+      leadSmoothing,
+      pinned,
+      null,
       pitch.hz,
     );
-    tunerSmoothingState = state;
-    const result = judge(
+    leadSmoothing = state;
+    const { judged } = judge(
       { ...pitch, hz: smoothedHz },
-      tunerTarget,
-      tunerShownPosition,
+      pinned,
+      null,
       currentContext.spelling,
     );
-    tunerPendingReading = {
-      judged: {
-        ...result.judged,
-        heard: { ...result.judged.heard, hz: pitch.hz },
-      },
-      shown: result.shown,
+    const reading: NoteJudged = {
+      ...judged,
+      heard: { ...judged.heard, hz: pitch.hz },
+      verdict: verdictOf(
+        judged.cents,
+        TOLERANCE_CENTS[currentSettings.lead.tolerance],
+      ),
     };
-    if (tunerCommitCancel === null) {
-      tunerCommitCancel = clock.setTimeout(commitTunerReading, 0);
+
+    // practice.session/REQ-016 — the hold rule runs on every reading that
+    // reaches here, not only the one later committed for display: a burst
+    // coalesced away for `NoteJudged` still counts, and still can reset or
+    // complete the hold.
+    const { phase, advanced } = applyJudgement(
+      leadPhase,
+      reading,
+      atMs,
+      currentSettings.lead,
+      currentSettings.tempoBpm,
+      sequence,
+      currentSettings.loop,
+    );
+    leadPhase = phase;
+
+    if (advanced) {
+      leadSmoothing = initialSmoothingState;
+      if (phase.kind === "listening") {
+        // practice.session/REQ-015 — `TargetAdvanced` is emitted here,
+        // synchronously, the instant the completing reading is judged —
+        // never deferred to the commit tick, which only coalesces what is
+        // shown.
+        const advancedEvent: TargetAdvanced = {
+          note: phase.target.note,
+          position: phase.target.position,
+          length: sequence.length,
+          atFrame: pitch.atFrame,
+        };
+        for (const listener of targetAdvancedListeners) {
+          listener(advancedEvent);
+        }
+      } else if (phase.kind === "complete") {
+        // practice.session/REQ-015/S3 — the last note of a non-looping run
+        // held: listening ends here, the same release stop()'s lead branch
+        // performs.
+        listening.stop();
+        listeningOwner = "none";
+        releaseWakeLockIfSilent();
+      }
+    }
+
+    leadPendingReading = reading;
+    if (leadCommitCancel === null) {
+      leadCommitCancel = clock.setTimeout(commitLeadReading, 0);
     }
-    armTunerGapTimer();
+    armLeadGapTimer();
   }
 
   // practice.tuner/REQ-002 — one commit per tick, the newest pending
@@ -926,6 +1059,21 @@ export function createSession(
     notifyChange();
   }
 
+  // practice.session/REQ-016, REQ-021 — one commit per tick for a lead run,
+  // mirroring commitTunerReading(): moves `leadPendingReading` into
+  // `leadReading` and emits NoteJudged. The hold rule above already applied
+  // every reading in the burst to `leadPhase`, committed or not — this only
+  // decides what is shown.
+  function commitLeadReading(): void {
+    leadCommitCancel = null;
+    if (leadPendingReading === null) return;
+    invalidateSnapshot();
+    leadReading = leadPendingReading;
+    leadPendingReading = null;
+    for (const listener of noteJudgedListeners) listener(leadReading);
+    notifyChange();
+  }
+
   // Clears the shown reading and its hand-over hysteresis together — the
   // gap timer below, leaveTuner() (REQ-009), the onEnded handler
   // (REQ-007/S3) and the hidden branch (REQ-008, above) all set both fields
@@ -962,6 +1110,34 @@ export function createSession(
     tunerPendingReading = null;
   }
 
+  // practice.session/REQ-017 — the gap rule for a lead run, mirroring
+  // armTunerGapTimer(): re-armed on every detection; when it fires with no
+  // newer detection since it was armed, the shown reading clears (the fill
+  // stays where it was — only the reading and the "last in tune at" marker
+  // are forgotten) and nothing is judged again until the next detection.
+  function armLeadGapTimer(): void {
+    leadGapCancel?.();
+    leadGapCancel = clock.setTimeout(() => {
+      leadGapCancel = null;
+      invalidateSnapshot();
+      leadReading = null;
+      leadPhase = applySilence(leadPhase);
+      notifyChange();
+    }, LEAD_GAP_MS);
+  }
+
+  // Cancels both of the lead run's timers and forgets any reading awaiting
+  // commit — stop()'s lead branch calls this so a stale commit or gap timer
+  // from a superseded run never fires afterwards, mirroring
+  // cancelTunerTimers().
+  function cancelLeadTimers(): void {
+    leadCommitCancel?.();
+    leadCommitCancel = null;
+    leadGapCancel?.();
+    leadGapCancel = null;
+    leadPendingReading = null;
+  }
+
   // practice.tuner/REQ-002 — subscribed once, for the session's whole
   // lifetime (not per enterTuner()/leaveTuner()): onPitchDetected itself
   // checks tunerActive and the listening state, the same shape as
@@ -1176,11 +1352,10 @@ export function createSession(
                 ),
               )
             : 0,
-        // T006 commits a judged reading onto this field the same way
-        // commitTunerReading() does for the tuner; T011 sets justHeld on an
-        // advance. Neither exists yet — a lead run so far only ever reaches
-        // "listening" at its first target, never a judged reading.
-        reading: null,
+        // commitLeadReading() commits a judged reading onto this field the
+        // same way commitTunerReading() does for the tuner. T011 sets
+        // justHeld on an advance — it does not exist yet.
+        reading: leadReading,
         justHeld: null,
         idleCaption: leadIdleCaptionOf(currentSettings.lead),
         completeCaption: leadCompleteCaptionOf(leadPhase),
@@ -1310,6 +1485,12 @@ export function createSession(
       listeningOwner = "none";
       leadListeningState = { kind: "off" };
       leadPhase = { kind: "idle" };
+      // practice.session/REQ-016 — hold forgotten: the reading, its
+      // smoothing and any commit/gap timer in flight go with it, the same
+      // reasoning as cancelTunerTimers()/clearTunerReading() on leaveTuner().
+      leadReading = null;
+      leadSmoothing = initialSmoothingState;
+      cancelLeadTimers();
       releaseWakeLockIfSilent();
       notifyChange();
       return;
```

## Verdict

SPEC: PASS · QUALITY: PASS · FINDINGS: [minor, not a defect] two commit/gap trios kept — the bodies differ (the tuner's commit updates hand-over state; its gap clears hysteresis where the lead's applies applySilence). D001's two test edits applied exactly; lead.ts and the delta untouched; the tuner branch unchanged.

<!-- recorded 2026-10-02T20:38:01Z by scripts/record.sh -->
