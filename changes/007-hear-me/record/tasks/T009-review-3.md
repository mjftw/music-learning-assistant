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
  at: 2026-09-28T09:16:34Z
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
index d8b72cc..c505405 100644
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
@@ -246,6 +260,39 @@ function transportEqual(a: TransportState, b: TransportState): boolean {
   }
 }
 
+// Structural equality for the tuner's target (T032; round-2 fixer for
+// T009's review) — mirrors transportEqual above; kept by-value (rather than
+// relying on `tunerTarget`'s reference staying stable between snapshots) so
+// the pairing with targetNoteEqual below reads the same way at every call
+// site.
+function targetEqual(a: TunerTarget, b: TunerTarget): boolean {
+  switch (a.kind) {
+    case "auto":
+      return b.kind === "auto";
+    case "pinned":
+      return b.kind === "pinned" && a.position === b.position;
+  }
+}
+
+// Field-by-field equality for a Note (round-2 fixer for T009's review) —
+// theory publishes no note-equality helper, so a small private one here.
+function sameNote(a: Note, b: Note): boolean {
+  return (
+    a.letter === b.letter &&
+    a.accidental === b.accidental &&
+    a.octave === b.octave
+  );
+}
+
+// snapshotsMateriallyEqual's comparison for `tuner.targetNote` — buildSnapshot()
+// now derives it with noteAtPosition() on every call, which returns a fresh
+// object each time, so two structurally equal notes are never the same
+// reference; compares by value instead (round-2 fixer for T009's review).
+function targetNoteEqual(a: Note | null, b: Note | null): boolean {
+  if (a === null || b === null) return a === b;
+  return sameNote(a, b);
+}
+
 // The fields a listener can actually observe (T032) — everything else on
 // `SessionSnapshot` (effectiveOctaves, fittingCounts, sequence, summaryLine,
 // tempoTerm, scale, spelledScale, effectiveShape) is derived from
@@ -273,13 +320,18 @@ function snapshotsMateriallyEqual(
     noteLabel(a.drone.note) === noteLabel(b.drone.note) &&
     a.drone.settings === b.drone.settings &&
     a.tappedRunIndex === b.tappedRunIndex &&
-    // practice.tuner/REQ-001 — each field is only ever reassigned by
-    // enterTuner()/leaveTuner() (never mutated in place), so reference
-    // equality is enough, the same reasoning as settings/traversal/run above.
+    // practice.tuner/REQ-001 — `active`, `listening` and `reading` are only
+    // ever reassigned by enterTuner()/leaveTuner()/commitTunerReading()
+    // (never mutated in place), so reference equality is enough, the same
+    // reasoning as settings/traversal/run above; `target` and `targetNote`
+    // compare by value (targetEqual/targetNoteEqual, above) — targetNote is
+    // now derived fresh on every buildSnapshot() call and would otherwise
+    // never compare equal, and comparing target by value too keeps a
+    // scheduler poll while pinned from ever firing a spurious notify.
     a.tuner.active === b.tuner.active &&
     a.tuner.listening === b.tuner.listening &&
-    a.tuner.target === b.tuner.target &&
-    a.tuner.targetNote === b.tuner.targetNote &&
+    targetEqual(a.tuner.target, b.tuner.target) &&
+    targetNoteEqual(a.tuner.targetNote, b.tuner.targetNote) &&
     a.tuner.reading === b.tuner.reading
   );
 }
@@ -379,7 +431,6 @@ export function createSession(
   let tunerActive = false;
   let tunerListeningState: ListeningState = { kind: "off" };
   let tunerTarget: TunerTarget = { kind: "auto" };
-  let tunerTargetNote: Note | null = null;
   let tunerReading: NoteJudged | null = null;
   // practice.tuner/REQ-002 — the shown-note hysteresis position
   // (nearestWithHandover's `shown`), reset alongside `tunerReading` on a gap
@@ -870,7 +921,14 @@ export function createSession(
         active: tunerActive,
         listening: tunerListeningState,
         target: tunerTarget,
-        targetNote: tunerTargetNote,
+        // practice.tuner/REQ-004 — derived, not stored: `tunerTarget` is the
+        // only source of truth for the pinned position, so a spelling
+        // change (setContext) re-spells this for free rather than needing
+        // its own sync site (the round-1 bug: setContext forgot to).
+        targetNote:
+          tunerTarget.kind === "pinned"
+            ? noteAtPosition(tunerTarget.position, currentContext.spelling)
+            : null,
         reading: tunerReading,
         canStepDown: canStepTarget(tunerTarget, -1),
         canStepUp: canStepTarget(tunerTarget, 1),
@@ -1261,6 +1319,10 @@ export function createSession(
   function setContext(newContext: SessionContext): void {
     invalidateSnapshot();
     currentContext = newContext;
+    // practice.tuner/REQ-002/S5, REQ-009/S1 — a spelling change while a
+    // target is pinned re-spells it for free: `tuner.targetNote` is derived
+    // in buildSnapshot() from `tunerTarget` and `currentContext.spelling`,
+    // so there is nothing to re-sync here.
     recomputeAndRetune();
     restartIfPlaying();
     notifyChange();
@@ -1355,13 +1417,61 @@ export function createSession(
     tunerActive = false;
     tunerListeningState = { kind: "off" };
     tunerTarget = { kind: "auto" };
-    tunerTargetNote = null;
     tunerReading = null;
     tunerShownPosition = null;
     releaseWakeLockIfSilent();
     notifyChange();
   }
 
+  // Shared by every target verb below: pins `tunerTarget` at `position`,
+  // bracketed by invalidateSnapshot()/notifyChange() — `targetNote` needs no
+  // sync here any more, since buildSnapshot() derives it from `tunerTarget`
+  // itself (practice.tuner/REQ-004).
+  function pinTargetAt(position: number): void {
+    invalidateSnapshot();
+    tunerTarget = { kind: "pinned", position };
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
+    notifyChange();
+  }
+
   function onNoteJudged(listener: (event: NoteJudged) => void): () => void {
     noteJudgedListeners.add(listener);
     return () => noteJudgedListeners.delete(listener);
@@ -1413,6 +1523,10 @@ export function createSession(
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

<!-- recorded 2026-09-28T09:16:59Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] sameNote reimplements note equality where the file compares the drone's note via noteLabel. Derived targetNote; value comparison in snapshotsMateriallyEqual; all rounds closed.
