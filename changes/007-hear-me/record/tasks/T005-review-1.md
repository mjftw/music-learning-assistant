---
type: Task Review
title: Review package — T005 · 007-hear-me
description: The diff produced for T005, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T005.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T005.md
  - resource: git:12608e56a46597d2c61e1d9dfc78350cd5c56af1..12608e56a46597d2c61e1d9dfc78350cd5c56af1
generated:
  by: process:review-package.sh
  at: 2026-09-28T07:39:50Z
sdd_id: 007-hear-me
---

# Review package — T005 · 007-hear-me

base: `12608e56a46597d2c61e1d9dfc78350cd5c56af1` → head: `12608e56a46597d2c61e1d9dfc78350cd5c56af1`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/adapters/page-visibility.ts b/src/practice/adapters/page-visibility.ts
index 603b678..f29b9b4 100644
--- a/src/practice/adapters/page-visibility.ts
+++ b/src/practice/adapters/page-visibility.ts
@@ -1,7 +1,9 @@
 import type { VisibilityPort } from "../ports/visibility";
 
 // Reports when the page is hidden — practice.session/REQ-009, so the
-// session can stop playback rather than run unseen.
+// session can stop playback rather than run unseen — and when it is shown
+// again — practice.tuner/REQ-008, so the tuner can resume listening without
+// a new request.
 export function pageVisibility(documentLike: Document): VisibilityPort {
   return {
     onHidden(listener: () => void): () => void {
@@ -15,5 +17,16 @@ export function pageVisibility(documentLike: Document): VisibilityPort {
           handleVisibilityChange,
         );
     },
+    onShown(listener: () => void): () => void {
+      function handleVisibilityChange(): void {
+        if (!documentLike.hidden) listener();
+      }
+      documentLike.addEventListener("visibilitychange", handleVisibilityChange);
+      return () =>
+        documentLike.removeEventListener(
+          "visibilitychange",
+          handleVisibilityChange,
+        );
+    },
   };
 }
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index ff70ccb..1f11b53 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -34,6 +34,7 @@ import {
 import type { TickPlan } from "../adapters/lookahead-scheduler";
 import { createLookaheadScheduler } from "../adapters/lookahead-scheduler";
 import type { ClockPort } from "../ports/clock";
+import type { ListeningPort } from "../ports/listening";
 import type { Result } from "../ports/result";
 import type { SoundPort } from "../ports/sound";
 import type { VisibilityPort } from "../ports/visibility";
@@ -59,6 +60,9 @@ export interface SessionDeps {
   readonly clock: ClockPort;
   readonly wakeLock: WakeLockPort;
   readonly visibility: VisibilityPort;
+  // practice.tuner/REQ-001 — wired by a later task (T007); stored here only
+  // so every SessionDeps carries it from this task on.
+  readonly listening: ListeningPort;
 }
 
 export interface TargetAdvanced {
@@ -260,6 +264,9 @@ export function createSession(
   droneSettings: DroneSettings,
   deps: SessionDeps,
 ): Session {
+  // `deps.listening` is accepted here (SessionDeps requires it) but not yet
+  // wired to anything — T007 reaches through `deps` to add
+  // enterTuner/leaveTuner and the reading pipeline.
   const { sound, clock, wakeLock, visibility } = deps;
   const scheduler = createLookaheadScheduler(sound, clock);
 
diff --git a/src/practice/ports/visibility.ts b/src/practice/ports/visibility.ts
index 63fa8fe..1b17268 100644
--- a/src/practice/ports/visibility.ts
+++ b/src/practice/ports/visibility.ts
@@ -1,5 +1,8 @@
 // Reports when the page is hidden — practice.session/REQ-009, so the
-// session can stop playback rather than run unseen.
+// session can stop playback rather than run unseen — and when it is shown
+// again — practice.tuner/REQ-008, so the tuner can resume listening without
+// a new request.
 export interface VisibilityPort {
   onHidden(listener: () => void): () => void;
+  onShown(listener: () => void): () => void;
 }
diff --git a/src/practice/published/index.ts b/src/practice/published/index.ts
index 59e11e9..8db407e 100644
--- a/src/practice/published/index.ts
+++ b/src/practice/published/index.ts
@@ -44,6 +44,7 @@ export {
 // practice/published rather than reaching into practice/ports directly
 // (docs/engineering.md §6: contexts communicate only through published/).
 export type { ClockPort } from "../ports/clock";
+export type { ListeningPort } from "../ports/listening";
 export type { Result } from "../ports/result";
 export type { SoundPort } from "../ports/sound";
 export type { VisibilityPort } from "../ports/visibility";
@@ -52,6 +53,7 @@ export type { WakeLockPort } from "../ports/wake-lock";
 // implementation main.tsx needs to wire up (T016) is re-exported here.
 export { fallbackSound } from "../adapters/fallback-sound";
 export { webAudioSound } from "../adapters/web-audio-sound";
+export { webAudioListening } from "../adapters/web-audio-listening";
 export { silentSound } from "../adapters/silent-sound";
 export { screenWakeLock } from "../adapters/screen-wake-lock";
 export { pageVisibility } from "../adapters/page-visibility";
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 143009e..489edad 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -16,6 +16,7 @@ import {
   pageVisibility,
   screenWakeLock,
   silentSound,
+  webAudioListening,
   webAudioSound,
   type Session,
 } from "../practice/published";
@@ -73,6 +74,11 @@ createRoot(rootElement).render(
         clock: browserClock(),
         wakeLock: screenWakeLock(navigator),
         visibility: pageVisibility(document),
+        // T014 replaces this with the same memoised AudioContext factory
+        // `sound` shares (main.tsx: `const audioContext = memoised(() =>
+        // new AudioContext())`, passed to both) — for now the tuner's own
+        // context is created on its own first start().
+        listening: webAudioListening(() => new AudioContext()),
       }}
       onSessionReady={exposeSessionForTiming}
     />
diff --git a/tests/practice/fakes.ts b/tests/practice/fakes.ts
index 91dc9b2..9229892 100644
--- a/tests/practice/fakes.ts
+++ b/tests/practice/fakes.ts
@@ -6,6 +6,7 @@
 import type {
   ClockPort,
   DroneSettings,
+  ListeningPort,
   Result,
   ScaleChoice,
   Session,
@@ -20,6 +21,11 @@ import {
   defaultDroneSettings,
   defaultScaleChoice,
 } from "../../src/practice/published";
+import type {
+  ListeningEnded,
+  ListeningUnavailable,
+  PitchDetected,
+} from "../../src/listening/published/pitch-detected.schema";
 import type {
   OnsetReport,
   SoundCommand,
@@ -234,6 +240,7 @@ export class FakeWakeLock implements WakeLockPort {
 
 export class FakeVisibility implements VisibilityPort {
   private readonly listeners = new Set<() => void>();
+  private readonly shownListeners = new Set<() => void>();
 
   // Observable subscription count — the regression coverage for T016's
   // fixer round asserts this returns to 0 after `<App>` unmounts, proving
@@ -247,9 +254,87 @@ export class FakeVisibility implements VisibilityPort {
     return () => this.listeners.delete(listener);
   }
 
+  onShown(listener: () => void): () => void {
+    this.shownListeners.add(listener);
+    return () => this.shownListeners.delete(listener);
+  }
+
   hide(): void {
     for (const listener of this.listeners) listener();
   }
+
+  // practice.tuner/REQ-008 — the page becoming visible again.
+  show(): void {
+    for (const listener of this.shownListeners) listener();
+  }
+}
+
+// A fake ListeningPort — practice.tuner/REQ-002, REQ-006, REQ-007. `feed`
+// publishes a PitchDetected to every onPitch subscriber (a no-op unless
+// `listening`, mirroring the real Listener's silence once stopped/torn
+// down); `end` mimics the track ending mid-session (REQ-006/S3): fires
+// onEnded and stops listening, so the next start() must ask again.
+export class FakeListening implements ListeningPort {
+  startCalls = 0;
+  stopCalls = 0;
+  listening = false;
+  frame = 0;
+  // While set, start() resolves { ok: false, error: { reason, detail:
+  // "fake" } } instead of succeeding — REQ-006/REQ-007's refused/none/failed
+  // scenarios.
+  failWith: ListeningUnavailable["reason"] | null = null;
+  private readonly pitchListeners = new Set<(pitch: PitchDetected) => void>();
+  private readonly endedListeners = new Set<(ended: ListeningEnded) => void>();
+
+  start(): Promise<Result<void, ListeningUnavailable>> {
+    this.startCalls += 1;
+    if (this.failWith !== null) {
+      return Promise.resolve({
+        ok: false,
+        error: { reason: this.failWith, detail: "fake" },
+      });
+    }
+    this.listening = true;
+    return Promise.resolve({ ok: true, value: undefined });
+  }
+
+  stop(): void {
+    this.stopCalls += 1;
+    this.listening = false;
+  }
+
+  currentFrame(): number {
+    return this.frame;
+  }
+
+  sampleRate(): number {
+    return 48000;
+  }
+
+  onPitch(listener: (pitch: PitchDetected) => void): () => void {
+    this.pitchListeners.add(listener);
+    return () => this.pitchListeners.delete(listener);
+  }
+
+  onEnded(listener: (ended: ListeningEnded) => void): () => void {
+    this.endedListeners.add(listener);
+    return () => this.endedListeners.delete(listener);
+  }
+
+  feed(hz: number, atFrame: number = this.frame, confidence = 0.95): void {
+    if (!this.listening) return;
+    const pitch: PitchDetected = { hz, confidence, atFrame };
+    for (const listener of this.pitchListeners) listener(pitch);
+  }
+
+  end(): void {
+    this.listening = false;
+    const ended: ListeningEnded = {
+      reason: "failed",
+      detail: "fake track ended",
+    };
+    for (const listener of this.endedListeners) listener(ended);
+  }
 }
 
 // The `SessionDeps` fakes a rendered `<App>` needs to satisfy its
@@ -258,11 +343,15 @@ export class FakeVisibility implements VisibilityPort {
 // scenario that drives sound/clock directly or inspects the visibility
 // subscription (`tests/ui/scenarios/app-session.test.tsx`,
 // `app-drone.test.tsx`).
-export function sessionDepsWithFakes(sound = new FakeSound()): {
+export function sessionDepsWithFakes(
+  sound = new FakeSound(),
+  listening = new FakeListening(),
+): {
   readonly sessionDeps: SessionDeps;
   readonly sound: FakeSound;
   readonly clock: FakeClock;
   readonly visibility: FakeVisibility;
+  readonly listening: FakeListening;
 } {
   const clock = new FakeClock(sound);
   const visibility = new FakeVisibility();
@@ -272,10 +361,12 @@ export function sessionDepsWithFakes(sound = new FakeSound()): {
       clock,
       wakeLock: new FakeWakeLock(),
       visibility,
+      listening,
     },
     sound,
     clock,
     visibility,
+    listening,
   };
 }
 
@@ -319,6 +410,7 @@ export interface SessionFixture {
   readonly clock: FakeClock;
   readonly wake: FakeWakeLock;
   readonly visibility: FakeVisibility;
+  readonly listening: FakeListening;
 }
 
 export function sessionOn(
@@ -333,7 +425,14 @@ export function sessionOn(
   const clock = new FakeClock(sound);
   const wake = new FakeWakeLock();
   const visibility = new FakeVisibility();
-  const deps: SessionDeps = { sound, clock, wakeLock: wake, visibility };
+  const listening = new FakeListening();
+  const deps: SessionDeps = {
+    sound,
+    clock,
+    wakeLock: wake,
+    visibility,
+    listening,
+  };
   const session = createSession(
     { key: keyOf(keyLetter), variant: variantOf(variantId) },
     traversal,
@@ -342,7 +441,7 @@ export function sessionOn(
     droneSettings,
     deps,
   );
-  return { session, sound, clock, wake, visibility };
+  return { session, sound, clock, wake, visibility, listening };
 }
 
 // Drives startDrone() through its two internal awaits (sound.start(), then
diff --git a/tests/practice/invariants/target-in-sequence.test.ts b/tests/practice/invariants/target-in-sequence.test.ts
index da39dde..a896a0e 100644
--- a/tests/practice/invariants/target-in-sequence.test.ts
+++ b/tests/practice/invariants/target-in-sequence.test.ts
@@ -26,7 +26,13 @@ import type {
   Shape,
   Variant,
 } from "../../../src/theory/published";
-import { FakeClock, FakeSound, FakeVisibility, FakeWakeLock } from "../fakes";
+import {
+  FakeClock,
+  FakeListening,
+  FakeSound,
+  FakeVisibility,
+  FakeWakeLock,
+} from "../fakes";
 
 const SHAPES: readonly Shape[] = ["scale", "arpeggio"];
 const DIRECTIONS: readonly Direction[] = ["up", "down", "updown"];
@@ -80,13 +86,14 @@ test("practice.session/REQ-006/S5 — the target is always in the sequence (inva
               const clock = new FakeClock(sound);
               const wakeLock = new FakeWakeLock();
               const visibility = new FakeVisibility();
+              const listening = new FakeListening();
               const session = createSession(
                 { key, variant },
                 traversal,
                 scaleChoice,
                 { ...defaultSessionSettings, countIn: false, loop: false },
                 defaultDroneSettings,
-                { sound, clock, wakeLock, visibility },
+                { sound, clock, wakeLock, visibility, listening },
               );
 
               const events: TargetAdvanced[] = [];
diff --git a/tests/ui/scenarios/edge-cases.test.tsx b/tests/ui/scenarios/edge-cases.test.tsx
index 30cfd72..72b32e3 100644
--- a/tests/ui/scenarios/edge-cases.test.tsx
+++ b/tests/ui/scenarios/edge-cases.test.tsx
@@ -35,6 +35,7 @@ import { App } from "../../../src/ui/App";
 import { localStorageSelectionStore } from "../../../src/ui/selection-store";
 import {
   FakeClock,
+  FakeListening,
   FakeSound,
   FakeVisibility,
   FakeWakeLock,
@@ -55,6 +56,7 @@ test("practice.session/REQ-002/S2 (app) — ▶ tapped while playing is stop", a
     clock,
     wakeLock: new FakeWakeLock(),
     visibility: new FakeVisibility(),
+    listening: new FakeListening(),
   };
 
   render(
@@ -96,6 +98,7 @@ test("practice.session/REQ-011/S4 (ui) — a v2 payload predating scale choice r
     clock: new FakeClock(sound),
     wakeLock: new FakeWakeLock(),
     visibility: new FakeVisibility(),
+    listening: new FakeListening(),
   };
 
   render(
```

<!-- recorded 2026-09-28T07:42:46Z by scripts/record.sh -->
