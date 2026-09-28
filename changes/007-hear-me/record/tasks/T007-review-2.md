---
type: Task Review
title: Review package — T007 · 007-hear-me
description: The diff produced for T007, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T007.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T007.md
  - resource: git:0106e8cbd13158172fdd319cc9eca76f347135df..0106e8cbd13158172fdd319cc9eca76f347135df
generated:
  by: process:review-package.sh
  at: 2026-09-28T08:16:23Z
sdd_id: 007-hear-me
---

# Review package — T007 · 007-hear-me

base: `0106e8cbd13158172fdd319cc9eca76f347135df` → head: `0106e8cbd13158172fdd319cc9eca76f347135df`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 1f11b53..ef526c0 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -18,6 +18,7 @@ import type {
   SequenceNote,
   Shape,
   SpelledScale,
+  SpellingPreference,
   Traversal,
   Variant,
 } from "../../theory/published";
@@ -49,10 +50,17 @@ import type { TempoTerm } from "./tempo";
 import { tempoTermFor } from "./tempo";
 import type { TransportState } from "./transport";
 import { advance, startTransport, tickOf } from "./transport";
+import type { ListeningState, TunerSnapshot, TunerTarget } from "./tuner";
+import { canStepTarget } from "./tuner";
+import type { NoteJudged } from "../published/note-judged.schema";
 
 export interface SessionContext {
   readonly key: Key;
   readonly variant: Variant;
+  // practice.tuner/REQ-002/S5 — the ♯/♭ preference the tuner spells the
+  // nearest note with; App passes selection.spelling, and setContext
+  // re-spells targetNote and the next reading (wired from T008).
+  readonly spelling: SpellingPreference;
 }
 
 export interface SessionDeps {
@@ -60,8 +68,7 @@ export interface SessionDeps {
   readonly clock: ClockPort;
   readonly wakeLock: WakeLockPort;
   readonly visibility: VisibilityPort;
-  // practice.tuner/REQ-001 — wired by a later task (T007); stored here only
-  // so every SessionDeps carries it from this task on.
+  // practice.tuner/REQ-001 — the tuner's microphone seam (enterTuner/leaveTuner).
   readonly listening: ListeningPort;
 }
 
@@ -105,6 +112,7 @@ export interface SessionSnapshot {
   readonly effectiveShape: Shape;
   readonly drone: DroneSnapshot;
   readonly tappedRunIndex: number | null;
+  readonly tuner: TunerSnapshot;
 }
 
 export interface Session {
@@ -120,6 +128,12 @@ export interface Session {
   stepDroneOctave(delta: -1 | 1): void;
   setDroneSound(sound: DroneSound): void;
   tapNote(runIndex: number): void;
+  // practice.tuner/REQ-001 — the way in and out: enterTuner stops playback
+  // and the drone (never both sounding) and requests listening; leaveTuner
+  // ends it and forgets the target.
+  enterTuner(): void;
+  leaveTuner(): void;
+  onNoteJudged(listener: (event: NoteJudged) => void): () => void;
   onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void;
   onChange(listener: () => void): () => void;
   dispose(): void;
@@ -252,7 +266,15 @@ function snapshotsMateriallyEqual(
     a.drone.on === b.drone.on &&
     noteLabel(a.drone.note) === noteLabel(b.drone.note) &&
     a.drone.settings === b.drone.settings &&
-    a.tappedRunIndex === b.tappedRunIndex
+    a.tappedRunIndex === b.tappedRunIndex &&
+    // practice.tuner/REQ-001 — each field is only ever reassigned by
+    // enterTuner()/leaveTuner() (never mutated in place), so reference
+    // equality is enough, the same reasoning as settings/traversal/run above.
+    a.tuner.active === b.tuner.active &&
+    a.tuner.listening === b.tuner.listening &&
+    a.tuner.target === b.tuner.target &&
+    a.tuner.targetNote === b.tuner.targetNote &&
+    a.tuner.reading === b.tuner.reading
   );
 }
 
@@ -264,10 +286,7 @@ export function createSession(
   droneSettings: DroneSettings,
   deps: SessionDeps,
 ): Session {
-  // `deps.listening` is accepted here (SessionDeps requires it) but not yet
-  // wired to anything — T007 reaches through `deps` to add
-  // enterTuner/leaveTuner and the reading pipeline.
-  const { sound, clock, wakeLock, visibility } = deps;
+  const { sound, clock, wakeLock, visibility, listening } = deps;
   const scheduler = createLookaheadScheduler(sound, clock);
 
   let currentContext = context;
@@ -348,6 +367,21 @@ export function createSession(
   // two are separate fields rather than one shared "sounding" index.
   let tappedRunIndex: number | null = null;
 
+  // practice.tuner/REQ-001 — the tuner's own state, off until enterTuner()
+  // is called and forgotten again on leaveTuner() (REQ-009: nothing about
+  // the tuner survives leaving it).
+  let tunerActive = false;
+  let tunerListeningState: ListeningState = { kind: "off" };
+  let tunerTarget: TunerTarget = { kind: "auto" };
+  let tunerTargetNote: Note | null = null;
+  let tunerReading: NoteJudged | null = null;
+  // Bumped by both enterTuner() and leaveTuner() — mirrors droneGeneration:
+  // a leaveTuner() that lands while enterTuner()'s wakeLock.acquire()/
+  // listening.start() awaits are still resolving must supersede that
+  // continuation, so it never overwrites the "off" state leaveTuner() just
+  // set with a stale "listening"/"cannot-hear".
+  let tunerGeneration = 0;
+
   let run: readonly KeyViewNote[] = [];
   let sequence: readonly SequenceNote[] = [];
   let effectiveOctaves: Octaves = { kind: "full" };
@@ -372,6 +406,7 @@ export function createSession(
 
   const changeListeners = new Set<() => void>();
   const targetAdvancedListeners = new Set<(event: TargetAdvanced) => void>();
+  const noteJudgedListeners = new Set<(event: NoteJudged) => void>();
 
   function recompute(): void {
     scale = scaleById(
@@ -600,12 +635,15 @@ export function createSession(
     cancelIdle = null;
   }
 
-  // practice.drone/REQ-004 — the wake lock is shared between playback and
-  // the drone: it is released only when neither remains, so stop(), the
-  // idle transition and stopDrone() all funnel through this one check
-  // rather than each deciding on its own.
+  // practice.drone/REQ-004, practice.tuner/REQ-001 — the wake lock is
+  // shared between playback, the drone and the tuner: it is released only
+  // when none remains, so stop(), the idle transition, stopDrone() and
+  // leaveTuner() all funnel through this one check rather than each
+  // deciding on its own.
   function releaseWakeLockIfSilent(): void {
-    if (transport.kind === "idle" && !droneOn) wakeLock.release();
+    if (transport.kind === "idle" && !droneOn && !tunerActive) {
+      wakeLock.release();
+    }
   }
 
   // practice.drone/REQ-007/S1 — hidden means silent: both playback and the
@@ -739,6 +777,15 @@ export function createSession(
         canStepUp: canStepDroneOctave(droneNote, 1),
       },
       tappedRunIndex,
+      tuner: {
+        active: tunerActive,
+        listening: tunerListeningState,
+        target: tunerTarget,
+        targetNote: tunerTargetNote,
+        reading: tunerReading,
+        canStepDown: canStepTarget(tunerTarget, -1),
+        canStepUp: canStepTarget(tunerTarget, 1),
+      },
     };
   }
 
@@ -777,6 +824,9 @@ export function createSession(
   }
 
   function start(): void {
+    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens:
+    // ▶ is refused outright rather than queued for when the tuner is left.
+    if (tunerActive) return;
     // practice.session/REQ-013 — ▶ ends any sounding tap the same way a
     // retap does, before anything else: a tap only ever sounds while idle,
     // and start() is about to leave idle.
@@ -875,6 +925,8 @@ export function createSession(
   // sounds forever (practice.drone/REQ-004/S3's invariant, sequence
   // droneOn → droneOn → play, caught this).
   function startDrone(): void {
+    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
+    if (tunerActive) return;
     if (droneOn) return;
     if (transport.kind !== "idle") stop();
     invalidateSnapshot();
@@ -1020,6 +1072,8 @@ export function createSession(
   // that stays written inline here rather than through a shared async
   // helper).
   function tapNote(runIndex: number): void {
+    // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens.
+    if (tunerActive) return;
     if (transport.kind !== "idle") return;
     const target = run[runIndex];
     if (target === undefined) return;
@@ -1145,6 +1199,83 @@ export function createSession(
     notifyChange();
   }
 
+  // listening.pitch-detection's worklet/wasm setup failures (the port
+  // never being reached at all) fold into the tuner's own "failed" reason —
+  // practice.tuner/REQ-007 shows the same "Can't hear" card either way.
+  function cannotHearReasonOf(
+    reason: "refused" | "none" | "failed" | "worklet-failed" | "wasm-failed",
+  ): "refused" | "none" | "failed" {
+    return reason === "worklet-failed" || reason === "wasm-failed"
+      ? "failed"
+      : reason;
+  }
+
+  // practice.tuner/REQ-001 — the way in: stop playback and the drone (never
+  // both sounding) before requesting listening, exactly as startDrone()
+  // stops playback before requesting sound — same shape, same generation
+  // guard (tunerGeneration) against a leaveTuner() landing mid-await. Unlike
+  // startDrone(), the resource-committing call here is itself the awaited
+  // one (listening.start() opens the microphone), so a single check after
+  // the await cannot undo it — a leaveTuner() that lands while
+  // wakeLock.acquire() is still resolving must stop this continuation from
+  // ever calling listening.start() at all (checked before it), and one that
+  // lands while listening.start() itself is resolving must have what it
+  // just opened released again (checked after it, calling listening.stop()
+  // — safe either way: a no-op if start() failed, releasing a granted mic
+  // if it succeeded).
+  function enterTuner(): void {
+    if (transport.kind !== "idle") stop();
+    if (droneOn) stopDrone();
+    invalidateSnapshot();
+    tunerActive = true;
+    tunerListeningState = { kind: "starting" };
+    tunerGeneration += 1;
+    const startedAtGeneration = tunerGeneration;
+    notifyChange();
+
+    void (async () => {
+      await wakeLock.acquire();
+      if (tunerGeneration !== startedAtGeneration) return;
+      const result = await listening.start();
+      if (tunerGeneration !== startedAtGeneration) {
+        listening.stop();
+        return;
+      }
+      invalidateSnapshot();
+      tunerListeningState = result.ok
+        ? { kind: "listening" }
+        : {
+            kind: "cannot-hear",
+            reason: cannotHearReasonOf(result.error.reason),
+          };
+      notifyChange();
+    })();
+  }
+
+  // practice.tuner/REQ-001/S4 — the way out: release the microphone, forget
+  // the target and the reading (REQ-009), and return to the practice screen
+  // exactly as it was left. Bumping tunerGeneration here supersedes any
+  // enterTuner() still awaiting wakeLock.acquire()/listening.start(), so its
+  // continuation cannot overwrite the "off" state this sets with a stale
+  // "listening"/"cannot-hear" once it resolves.
+  function leaveTuner(): void {
+    invalidateSnapshot();
+    tunerGeneration += 1;
+    listening.stop();
+    tunerActive = false;
+    tunerListeningState = { kind: "off" };
+    tunerTarget = { kind: "auto" };
+    tunerTargetNote = null;
+    tunerReading = null;
+    releaseWakeLockIfSilent();
+    notifyChange();
+  }
+
+  function onNoteJudged(listener: (event: NoteJudged) => void): () => void {
+    noteJudgedListeners.add(listener);
+    return () => noteJudgedListeners.delete(listener);
+  }
+
   function onTargetAdvanced(
     listener: (event: TargetAdvanced) => void,
   ): () => void {
@@ -1166,9 +1297,12 @@ export function createSession(
     // before the port itself goes away, rather than leaving it to whatever
     // sound.dispose() happens to do with a live voice.
     stopDrone();
+    // practice.tuner/REQ-001 — release the microphone too, the same reason.
+    if (tunerActive) listening.stop();
     sound.dispose();
     changeListeners.clear();
     targetAdvancedListeners.clear();
+    noteJudgedListeners.clear();
   }
 
   return {
@@ -1184,6 +1318,9 @@ export function createSession(
     stepDroneOctave,
     setDroneSound,
     tapNote,
+    enterTuner,
+    leaveTuner,
+    onNoteJudged,
     onTargetAdvanced,
     onChange,
     dispose,
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 1384041..f490e1a 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -277,7 +277,7 @@ export function App(props: {
     }
     const stored = selectionStore.load();
     const session = createSession(
-      { key: selectedKey, variant },
+      { key: selectedKey, variant, spelling: selection.spelling },
       initialTraversalOf(stored),
       stored?.scale ?? defaultScaleChoice,
       initialSettingsOf(stored),
@@ -335,7 +335,11 @@ export function App(props: {
   // and restart the sequence each time.
   useEffect(() => {
     if (variant === undefined || session === null) return;
-    session.setContext({ key: selectedKey, variant });
+    session.setContext({
+      key: selectedKey,
+      variant,
+      spelling: selection.spelling,
+    });
   }, [session, keyIdOf(selectedKey), variant?.variantId]);
 
   useEffect(() => {
diff --git a/tests/practice/fakes.ts b/tests/practice/fakes.ts
index 9229892..bc3dce1 100644
--- a/tests/practice/fakes.ts
+++ b/tests/practice/fakes.ts
@@ -10,6 +10,7 @@ import type {
   Result,
   ScaleChoice,
   Session,
+  SessionContext,
   SessionDeps,
   SessionSettings,
   SoundPort,
@@ -20,6 +21,7 @@ import {
   createSession,
   defaultDroneSettings,
   defaultScaleChoice,
+  defaultSessionSettings,
 } from "../../src/practice/published";
 import type {
   ListeningEnded,
@@ -138,6 +140,13 @@ export class FakeSound implements SoundPort {
     return this.latencyMs;
   }
 
+  // How many `{ kind: "stopAll" }` commands have been posted —
+  // practice.tuner/REQ-001/S2 asserts enterTuner() silenced a running
+  // sequence this way, the same command stop() itself posts.
+  get stopAllCalls(): number {
+    return this.posted.filter((command) => command.kind === "stopAll").length;
+  }
+
   post(command: SoundCommand): void {
     this.posted.push(command);
     this.posts.push({ command, atFrame: this.frame });
@@ -217,6 +226,12 @@ export class FakeClock implements ClockPort {
     this.setNow(target);
   }
 
+  // An alias for `advance` some scenarios reach for by a name that says
+  // what the unit is (practice.tuner/REQ-001/S2) — identical behaviour.
+  advanceMs(ms: number): void {
+    this.advance(ms);
+  }
+
   private setNow(ms: number): void {
     this.now = ms;
     this.linkedSound.frame = Math.round(
@@ -411,13 +426,25 @@ export interface SessionFixture {
   readonly wake: FakeWakeLock;
   readonly visibility: FakeVisibility;
   readonly listening: FakeListening;
+  readonly context: SessionContext;
 }
 
+// practice.tuner/REQ-001 — the traversal a fixture gets when a scenario
+// doesn't care what the run is, only that entering/leaving the tuner
+// behaves: two octaves of G major updown on flute Concert, the same run
+// `GMajorTwoOctaves` names in the session-transport/session-traversal
+// scenarios, producing "29 notes · G4–G6".
+const twoOctaveUpdownScale: Traversal = {
+  direction: "updown",
+  octaves: { kind: "count", count: 2 },
+  shape: "scale",
+};
+
 export function sessionOn(
   keyLetter: string,
   variantId: string,
-  traversal: Traversal,
-  settings: SessionSettings,
+  traversal: Traversal = twoOctaveUpdownScale,
+  settings: SessionSettings = defaultSessionSettings,
   scaleChoice: ScaleChoice = defaultScaleChoice,
   droneSettings: DroneSettings = defaultDroneSettings,
 ): SessionFixture {
@@ -426,6 +453,11 @@ export function sessionOn(
   const wake = new FakeWakeLock();
   const visibility = new FakeVisibility();
   const listening = new FakeListening();
+  const context: SessionContext = {
+    key: keyOf(keyLetter),
+    variant: variantOf(variantId),
+    spelling: "sharp",
+  };
   const deps: SessionDeps = {
     sound,
     clock,
@@ -434,14 +466,14 @@ export function sessionOn(
     listening,
   };
   const session = createSession(
-    { key: keyOf(keyLetter), variant: variantOf(variantId) },
+    context,
     traversal,
     scaleChoice,
     settings,
     droneSettings,
     deps,
   );
-  return { session, sound, clock, wake, visibility, listening };
+  return { session, sound, clock, wake, visibility, listening, context };
 }
 
 // Drives startDrone() through its two internal awaits (sound.start(), then
diff --git a/tests/practice/invariants/target-in-sequence.test.ts b/tests/practice/invariants/target-in-sequence.test.ts
index a896a0e..ae91ec6 100644
--- a/tests/practice/invariants/target-in-sequence.test.ts
+++ b/tests/practice/invariants/target-in-sequence.test.ts
@@ -88,7 +88,7 @@ test("practice.session/REQ-006/S5 — the target is always in the sequence (inva
               const visibility = new FakeVisibility();
               const listening = new FakeListening();
               const session = createSession(
-                { key, variant },
+                { key, variant, spelling: "sharp" },
                 traversal,
                 scaleChoice,
                 { ...defaultSessionSettings, countIn: false, loop: false },
diff --git a/tests/practice/scenarios/drone-octave.test.ts b/tests/practice/scenarios/drone-octave.test.ts
index 9264e7e..878edb1 100644
--- a/tests/practice/scenarios/drone-octave.test.ts
+++ b/tests/practice/scenarios/drone-octave.test.ts
@@ -85,11 +85,16 @@ test("practice.drone/REQ-002/S3 — the stepped octave follows the key and the i
     defaultSessionSettings,
   );
   session.stepDroneOctave(-1);
-  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("D"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
   expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
   session.setContext({
     key: keyOf("D"),
     variant: variantOf("ocarina-alto-c"),
+    spelling: "sharp",
   });
   expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
 });
@@ -111,11 +116,19 @@ test("practice.drone/REQ-002/S4 — the piano's ends", () => {
   for (let i = 0; i < 6; i += 1) session.stepDroneOctave(1);
   expect(noteLabel(session.snapshot().drone.note)).toBe("G7");
   expect(session.snapshot().drone.canStepUp).toBe(false);
-  session.setContext({ key: keyOf("C"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("C"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
   session.stepDroneOctave(1);
   expect(noteLabel(session.snapshot().drone.note)).toBe("C8");
   expect(session.snapshot().drone.canStepUp).toBe(false);
-  session.setContext({ key: keyOf("A"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("A"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
   for (let i = 0; i < 8; i += 1) session.stepDroneOctave(-1);
   expect(noteLabel(session.snapshot().drone.note)).toBe("A0");
   expect(session.snapshot().drone.canStepDown).toBe(false);
@@ -132,6 +145,7 @@ test("practice.drone/REQ-002/S6 — unpinned, the octave follows the instrument"
   session.setContext({
     key: keyOf("G"),
     variant: variantOf("ocarina-bass-c"),
+    spelling: "sharp",
   });
   expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
 });
diff --git a/tests/practice/scenarios/drone-tonic.test.ts b/tests/practice/scenarios/drone-tonic.test.ts
index 659c726..4ffbed2 100644
--- a/tests/practice/scenarios/drone-tonic.test.ts
+++ b/tests/practice/scenarios/drone-tonic.test.ts
@@ -59,7 +59,11 @@ test("practice.drone/REQ-003/S1 — a new key while sounding glides, never stopp
   );
   await startDroneAndFlush(session);
   const tag = sound.posted.filter(isDrone)[0]!.tag;
-  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("D"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
   expect(sound.posted.filter(isRetune)).toEqual([
     // vitest types expect.closeTo's return as `any`; cast to the field's
     // real type (number) so the object literal stays type-safe.
@@ -69,6 +73,7 @@ test("practice.drone/REQ-003/S1 — a new key while sounding glides, never stopp
   session.setContext({
     key: keyOf("Bm"),
     variant: variantOf("flute-concert"),
+    spelling: "sharp",
   });
   expect(sound.posted.filter(isRetune)[1]).toEqual({
     kind: "retune",
@@ -91,6 +96,7 @@ test("practice.drone/REQ-003/S2 — respelling keeps the pitch", async () => {
   session.setContext({
     key: keyOf("Gb"),
     variant: variantOf("flute-concert"),
+    spelling: "sharp",
   });
   expect(noteLabel(session.snapshot().drone.note)).toBe("G♭5");
   expect(sound.posted.filter(isRetune)).toHaveLength(0);
@@ -108,6 +114,7 @@ test("practice.drone/REQ-003/S3 — a new instrument while sounding, unpinned, r
   session.setContext({
     key: keyOf("G"),
     variant: variantOf("ocarina-bass-c"),
+    spelling: "sharp",
   });
   expect(sound.posted.filter(isRetune)).toEqual([
     {
diff --git a/tests/practice/scenarios/edge-cases.test.ts b/tests/practice/scenarios/edge-cases.test.ts
index 7b7f835..b8e1871 100644
--- a/tests/practice/scenarios/edge-cases.test.ts
+++ b/tests/practice/scenarios/edge-cases.test.ts
@@ -71,7 +71,11 @@ test("practice.session/REQ-007 — key changed during a count-in continues the c
     beatsLeft: 3,
   });
 
-  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("D"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
 
   // The count-in is untouched by the key change.
   expect(session.snapshot().transport).toEqual({
diff --git a/tests/practice/scenarios/session-target.test.ts b/tests/practice/scenarios/session-target.test.ts
index 23ad11d..f78093d 100644
--- a/tests/practice/scenarios/session-target.test.ts
+++ b/tests/practice/scenarios/session-target.test.ts
@@ -192,6 +192,7 @@ test("practice.session/REQ-007/S1 — a stale report from the superseded run doe
   session.setContext({
     key: keyOf("D"),
     variant: variantOf("flute-concert"),
+    spelling: "sharp",
   });
   expect(session.snapshot().transport).toEqual({
     kind: "playing",
diff --git a/tests/practice/scenarios/session-transport.test.ts b/tests/practice/scenarios/session-transport.test.ts
index 3c4e8ce..8423735 100644
--- a/tests/practice/scenarios/session-transport.test.ts
+++ b/tests/practice/scenarios/session-transport.test.ts
@@ -149,7 +149,11 @@ test("practice.session/REQ-007/S1 — a new key mid-scale", async () => {
   const postedCountBeforeRestart = sound.posted.length;
   const frameAtRestart = sound.frame;
 
-  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("D"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
 
   expect(session.snapshot().transport).toEqual({
     kind: "playing",
diff --git a/tests/practice/scenarios/session-traversal.test.ts b/tests/practice/scenarios/session-traversal.test.ts
index 75fee14..ac22b85 100644
--- a/tests/practice/scenarios/session-traversal.test.ts
+++ b/tests/practice/scenarios/session-traversal.test.ts
@@ -79,7 +79,11 @@ test("practice.session/REQ-001/S4 — an octave choice that no longer fits is cl
     defaultSessionSettings,
   );
 
-  session.setContext({ key: keyOf("C"), variant: variantOf("ocarina-alto-c") });
+  session.setContext({
+    key: keyOf("C"),
+    variant: variantOf("ocarina-alto-c"),
+    spelling: "sharp",
+  });
   const onOcarina = session.snapshot();
   expect(onOcarina.effectiveOctaves).toEqual({ kind: "count", count: 1 });
   expect(onOcarina.traversal.octaves).toEqual({ kind: "count", count: 3 });
@@ -94,7 +98,11 @@ test("practice.session/REQ-001/S4 — an octave choice that no longer fits is cl
     "C6",
   ]);
 
-  session.setContext({ key: keyOf("C"), variant: variantOf("flute-concert") });
+  session.setContext({
+    key: keyOf("C"),
+    variant: variantOf("flute-concert"),
+    spelling: "sharp",
+  });
   const backOnFlute = session.snapshot();
   expect(backOnFlute.run).toHaveLength(22);
   expect(noteLabel(backOnFlute.run[0]!.note)).toBe("C4");
diff --git a/tests/ui/scenarios/transport-card.test.tsx b/tests/ui/scenarios/transport-card.test.tsx
index d340e4e..6bba739 100644
--- a/tests/ui/scenarios/transport-card.test.tsx
+++ b/tests/ui/scenarios/transport-card.test.tsx
@@ -8,6 +8,7 @@ import {
   defaultTraversal,
   type SessionSnapshot,
   type TempoTerm,
+  type TunerSnapshot,
 } from "../../../src/practice/published";
 import {
   pitchHzOf,
@@ -38,6 +39,19 @@ const defaultScale = scaleById("major");
 // are T007+) — another valid placeholder, same reasoning as defaultScale.
 const placeholderDroneNote: Note = { ...keyOf("G").tonic, octave: 5 };
 
+// TransportCard renders nothing about the tuner either (the pill and
+// screen are T007+) — the default, off shape practice.tuner/REQ-001/S4
+// pins the snapshot to before enterTuner() is ever called.
+const placeholderTuner: TunerSnapshot = {
+  active: false,
+  listening: { kind: "off" },
+  target: { kind: "auto" },
+  targetNote: null,
+  reading: null,
+  canStepDown: false,
+  canStepUp: false,
+};
+
 function baseSnapshot(
   overrides: Partial<SessionSnapshot> = {},
 ): SessionSnapshot {
@@ -70,6 +84,7 @@ function baseSnapshot(
     // TransportCard renders nothing about a tapped note either (T007+) —
     // same reasoning as defaultScale/placeholderDroneNote above.
     tappedRunIndex: null,
+    tuner: placeholderTuner,
     ...overrides,
   };
 }
```

<!-- recorded 2026-09-28T08:22:29Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] the race test cites REQ-001/S4 though it is a regression scenario. Both race windows traced; one live start; wake lock released on stale paths.
