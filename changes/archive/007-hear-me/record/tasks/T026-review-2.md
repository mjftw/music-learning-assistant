---
type: Task Review
title: Review package — T026 · 007-hear-me
description: The diff produced for T026, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T026.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T026.md
  - resource: git:34eb3a5d9b08ad84b761a36ddc13f8525548b8b7..34eb3a5d9b08ad84b761a36ddc13f8525548b8b7
generated:
  by: process:review-package.sh
  at: 2026-09-28T21:06:52Z
sdd_id: 007-hear-me
---

# Review package — T026 · 007-hear-me

base: `34eb3a5d9b08ad84b761a36ddc13f8525548b8b7` → head: `34eb3a5d9b08ad84b761a36ddc13f8525548b8b7`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index feebb5f..87a7131 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -51,11 +51,18 @@ import type { TempoTerm } from "./tempo";
 import { tempoTermFor } from "./tempo";
 import type { TransportState } from "./transport";
 import { advance, startTransport, tickOf } from "./transport";
-import type { ListeningState, TunerSnapshot, TunerTarget } from "./tuner";
+import type {
+  ListeningState,
+  SmoothingState,
+  TunerSnapshot,
+  TunerTarget,
+} from "./tuner";
 import {
   canStepTarget,
+  initialSmoothingState,
   judge,
   READING_MAX_AGE_MS,
+  smoothedPitchHzOf,
   TUNER_HIGHEST_POSITION,
   TUNER_LOWEST_POSITION,
 } from "./tuner";
@@ -454,6 +461,10 @@ export function createSession(
   // or on leaveTuner(): a fresh reading after silence starts from the
   // nearest note again, not wherever the ear was before the gap.
   let tunerShownPosition: number | null = null;
+  // practice.tuner/REQ-002 — the smoothing filter's own state, reset
+  // alongside `tunerReading`/`tunerShownPosition` (see `clearTunerReading`
+  // below) and on enterTuner().
+  let tunerSmoothingState: SmoothingState = initialSmoothingState;
   // The most recently judged detection, awaiting its commit-on-next-tick
   // timer — a newer detection arriving before commit replaces this rather
   // than queuing, so at most one reading is ever in flight (plan.md's
@@ -787,12 +798,29 @@ export function createSession(
       ((listening.currentFrame() - pitch.atFrame) / listening.sampleRate()) *
       1000;
     if (ageMs > READING_MAX_AGE_MS) return;
-    tunerPendingReading = judge(
-      pitch,
+    // practice.tuner/REQ-002 — judge a smoothed pitch (never holding the
+    // reading back), but keep `heard.hz` the raw detected value: the
+    // measured harness reads it, and the spec says the Hz stays detected.
+    const { hz: smoothedHz, state } = smoothedPitchHzOf(
+      tunerSmoothingState,
+      tunerTarget,
+      tunerShownPosition,
+      pitch.hz,
+    );
+    tunerSmoothingState = state;
+    const result = judge(
+      { ...pitch, hz: smoothedHz },
       tunerTarget,
       tunerShownPosition,
       currentContext.spelling,
     );
+    tunerPendingReading = {
+      judged: {
+        ...result.judged,
+        heard: { ...result.judged.heard, hz: pitch.hz },
+      },
+      shown: result.shown,
+    };
     if (tunerCommitCancel === null) {
       tunerCommitCancel = clock.setTimeout(commitTunerReading, 0);
     }
@@ -822,6 +850,8 @@ export function createSession(
   function clearTunerReading(): void {
     tunerReading = null;
     tunerShownPosition = null;
+    // practice.tuner/REQ-002 — the smoothing filter resets in lockstep.
+    tunerSmoothingState = initialSmoothingState;
   }
 
   // practice.tuner/REQ-003 — the gap rule: re-armed on every detection; when
@@ -1579,6 +1609,8 @@ export function createSession(
   function pinTargetAt(position: number): void {
     invalidateSnapshot();
     tunerTarget = { kind: "pinned", position };
+    // practice.tuner/REQ-002 — the first reading after the target changes is as detected
+    tunerSmoothingState = initialSmoothingState;
     notifyChange();
   }
 
@@ -1618,6 +1650,8 @@ export function createSession(
   function clearTarget(): void {
     invalidateSnapshot();
     tunerTarget = { kind: "auto" };
+    // practice.tuner/REQ-002 — the first reading after the target changes is as detected
+    tunerSmoothingState = initialSmoothingState;
     notifyChange();
   }
 
diff --git a/src/practice/domain/tuner.ts b/src/practice/domain/tuner.ts
index 2f32f86..4b2172c 100644
--- a/src/practice/domain/tuner.ts
+++ b/src/practice/domain/tuner.ts
@@ -142,3 +142,57 @@ export function judge(
   // then resumes from wherever the ear actually was.
   return { judged, shown: pitchPosition(nearest.note) };
 }
+
+// practice.tuner/REQ-002 — the shown pitch is smoothed: each reading moves
+// the smoothed pitch a tenth of the way from where it was to the detected
+// pitch (an exponential low-pass filter, ~100 ms time constant at the
+// tuner's ~90 readings/s); a detected pitch more than SNAP_CENTS away is a
+// new pitch and is shown as detected, at once.
+export const SMOOTHING_FACTOR = 0.1;
+export const SNAP_CENTS = 25;
+
+export interface SmoothingState {
+  readonly key: number | null; // the shown/pinned position this state was built for
+  readonly emaHz: number | null; // the smoothed pitch, in Hz
+}
+
+export const initialSmoothingState: SmoothingState = { key: null, emaHz: null };
+
+// Which note `hz` is judged against: pinned, the target; auto, the same
+// hand-over `judge` itself would land on.
+function smoothingKeyOf(
+  target: TunerTarget,
+  shown: number | null,
+  hz: number,
+): number {
+  return target.kind === "pinned"
+    ? target.position
+    : nearestWithHandover(shown, hz);
+}
+
+/**
+ * practice.tuner/REQ-002 — moves the smoothed pitch a tenth of the way to
+ * `hz`, or snaps to `hz` at once: on the first reading after a reset
+ * (`state.emaHz === null`), when `hz` is more than SNAP_CENTS from the
+ * smoothed pitch, or when the shown note or target has changed since the
+ * last reading (the key mismatch).
+ */
+export function smoothedPitchHzOf(
+  state: SmoothingState,
+  target: TunerTarget,
+  shown: number | null,
+  hz: number,
+): { readonly hz: number; readonly state: SmoothingState } {
+  const continuedHz =
+    state.emaHz !== null
+      ? state.emaHz + (hz - state.emaHz) * SMOOTHING_FACTOR
+      : hz;
+  const jumped =
+    state.emaHz !== null &&
+    Math.abs(1200 * Math.log2(hz / state.emaHz)) > SNAP_CENTS;
+  const continuedKey = smoothingKeyOf(target, shown, continuedHz);
+  const continues = !jumped && state.key !== null && state.key === continuedKey;
+  const smoothedHz = continues ? continuedHz : hz;
+  const key = smoothingKeyOf(target, shown, smoothedHz);
+  return { hz: smoothedHz, state: { key, emaHz: smoothedHz } };
+}
diff --git a/tests/practice/scenarios/tuner-budget.test.ts b/tests/practice/scenarios/tuner-budget.test.ts
index 84ec8b1..fb0a9d6 100644
--- a/tests/practice/scenarios/tuner-budget.test.ts
+++ b/tests/practice/scenarios/tuner-budget.test.ts
@@ -1,18 +1,7 @@
 import { expect, test } from "vitest";
-import type { NoteJudged, Session } from "../../../src/practice/published";
+import type { NoteJudged } from "../../../src/practice/published";
 import { sessionOn } from "../fakes";
-
-const flush = () => new Promise((r) => setTimeout(r, 0));
-
-// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
-// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
-// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
-// `listening.listening` is true before a scenario feeds a pitch.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
+import { enter } from "../tuner-helpers";
 
 test("practice.tuner/REQ-006/S2 — late is dropped", async () => {
   const f = sessionOn("G", "flute-concert");
@@ -34,12 +23,17 @@ test("listening.pitch-detection/REQ-004/S3 — a burst before the commit is coal
   await enter(f.session);
   const judged: NoteJudged[] = [];
   f.session.onNoteJudged((e) => judged.push(e));
-  f.listening.feed(440.0);
-  f.listening.feed(441.0);
-  f.listening.feed(442.0);
+  // practice.tuner/REQ-002's smoothing is always on (T026): three
+  // detections of the same steady 442.0 Hz, at three different frames,
+  // arrive before the session's commit-on-next-tick timer fires — still
+  // only one NoteJudged, carrying the newest (last-fed) detection's frame.
+  f.listening.feed(442.0, 0);
+  f.listening.feed(442.0, 1);
+  f.listening.feed(442.0, 2);
   f.clock.advanceMs(1);
   expect(judged).toHaveLength(1);
   expect(judged[0]!.cents).toBe(8);
+  expect(judged[0]!.atFrame).toBe(2);
 });
 
 test("practice.tuner/REQ-006 — readingShown reports the age at paint", async () => {
diff --git a/tests/practice/scenarios/tuner-cannot-hear.test.ts b/tests/practice/scenarios/tuner-cannot-hear.test.ts
index 58b7863..32f8507 100644
--- a/tests/practice/scenarios/tuner-cannot-hear.test.ts
+++ b/tests/practice/scenarios/tuner-cannot-hear.test.ts
@@ -1,26 +1,6 @@
 import { expect, test } from "vitest";
-import type { Session } from "../../../src/practice/published";
-import { sessionOn, type SessionFixture } from "../fakes";
-
-const flush = () => new Promise((r) => setTimeout(r, 0));
-
-// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
-// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
-// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
-// `listening.listening` is true before a scenario feeds a pitch.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
-
-// Feeds a detected pitch and advances the fake clock past the session's
-// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
-// committed reading is visible in the snapshot right after this returns.
-function hear(f: SessionFixture, hz: number): void {
-  f.listening.feed(hz);
-  f.clock.advanceMs(1);
-}
+import { sessionOn } from "../fakes";
+import { enter, hear } from "../tuner-helpers";
 
 test("practice.tuner/REQ-007/S1 — refused", async () => {
   const f = sessionOn("G", "flute-concert");
diff --git a/tests/practice/scenarios/tuner-hidden-awake.test.ts b/tests/practice/scenarios/tuner-hidden-awake.test.ts
index 9429e37..6839ca8 100644
--- a/tests/practice/scenarios/tuner-hidden-awake.test.ts
+++ b/tests/practice/scenarios/tuner-hidden-awake.test.ts
@@ -1,27 +1,9 @@
 import { expect, test } from "vitest";
-import type { Session } from "../../../src/practice/published";
-import { sessionOn, type SessionFixture } from "../fakes";
+import { sessionOn } from "../fakes";
+import { enter, hear } from "../tuner-helpers";
 
 const flush = () => new Promise((r) => setTimeout(r, 0));
 
-// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
-// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
-// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
-// `listening.listening` is true before a scenario feeds a pitch.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
-
-// Feeds a detected pitch and advances the fake clock past the session's
-// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
-// committed reading is visible in the snapshot right after this returns.
-function hear(f: SessionFixture, hz: number): void {
-  f.listening.feed(hz);
-  f.clock.advanceMs(1);
-}
-
 test("practice.tuner/REQ-008/S1 — hidden means deaf, shown means listening", async () => {
   const f = sessionOn("G", "flute-concert");
   await enter(f.session);
diff --git a/tests/practice/scenarios/tuner-memory.test.ts b/tests/practice/scenarios/tuner-memory.test.ts
index 4b3d06e..a9d5694 100644
--- a/tests/practice/scenarios/tuner-memory.test.ts
+++ b/tests/practice/scenarios/tuner-memory.test.ts
@@ -1,17 +1,6 @@
 import { expect, test } from "vitest";
-import type { Session } from "../../../src/practice/published";
 import { sessionOn } from "../fakes";
-
-const flush = () => new Promise((r) => setTimeout(r, 0));
-
-// practice.tuner/REQ-009 — enters the tuner and drives it past both of
-// enterTuner()'s awaits (wakeLock.acquire(), then listening.start()), the
-// same "two flushes" shape tuner-reading.test.ts uses.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
+import { enter } from "../tuner-helpers";
 
 test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
   const f = sessionOn("G", "flute-concert");
diff --git a/tests/practice/scenarios/tuner-reading.test.ts b/tests/practice/scenarios/tuner-reading.test.ts
index 057c161..6205add 100644
--- a/tests/practice/scenarios/tuner-reading.test.ts
+++ b/tests/practice/scenarios/tuner-reading.test.ts
@@ -1,27 +1,8 @@
 import { expect, test } from "vitest";
-import type { NoteJudged, Session } from "../../../src/practice/published";
+import type { NoteJudged } from "../../../src/practice/published";
 import { noteLabel } from "../../../src/theory/published";
-import { sessionOn, type SessionFixture } from "../fakes";
-
-const flush = () => new Promise((r) => setTimeout(r, 0));
-
-// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
-// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
-// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
-// `listening.listening` is true before a scenario feeds a pitch.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
-
-// Feeds a detected pitch and advances the fake clock past the session's
-// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
-// committed reading is visible in the snapshot right after this returns.
-function hear(f: SessionFixture, hz: number): void {
-  f.listening.feed(hz);
-  f.clock.advanceMs(1);
-}
+import { sessionOn } from "../fakes";
+import { enter, hear, hearSteady } from "../tuner-helpers";
 
 test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
   const f = sessionOn("G", "flute-concert");
@@ -45,7 +26,10 @@ test("practice.tuner/REQ-002/S2 — in tune", async () => {
     cents: 4,
     verdict: "in-tune",
   });
-  hear(f, 442.0);
+  // practice.tuner/REQ-002's smoothing is always on (T026): 442.0 Hz is
+  // less than SNAP_CENTS from 441.0, so a single reading would only creep
+  // towards it — settle on the new steady pitch instead.
+  hearSteady(f, 442.0);
   expect(f.session.snapshot().tuner.reading).toMatchObject({
     cents: 8,
     verdict: "sharp",
@@ -67,17 +51,21 @@ test("practice.tuner/REQ-002/S4 — the name holds across the boundary (hysteres
   const f = sessionOn("G", "flute-concert");
   await enter(f.session);
   hear(f, 440.0);
+  // practice.tuner/REQ-002's smoothing is always on (T026): each of these
+  // is a steady pitch (the scenario itself: "rises steadily through …",
+  // "coming back down"), not a single nearby reading, so each is settled
+  // before the name/tag is read.
   for (const hz of [452.9, 454.0]) {
-    hear(f, hz);
+    hearSteady(f, hz);
     expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
     expect(f.session.snapshot().tuner.reading!.cents).toBe(50);
   }
-  hear(f, 455.0);
+  hearSteady(f, 455.0);
   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
   expect(f.session.snapshot().tuner.reading!.cents).toBe(-42);
-  hear(f, 452.0);
+  hearSteady(f, 452.0);
   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4"); // 52 ¢ below A♯4: still A♯4
-  hear(f, 450.0);
+  hearSteady(f, 450.0);
   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4"); // 61 ¢ below: handed over
 });
 
diff --git a/tests/practice/scenarios/tuner-target.test.ts b/tests/practice/scenarios/tuner-target.test.ts
index be07157..880f0d0 100644
--- a/tests/practice/scenarios/tuner-target.test.ts
+++ b/tests/practice/scenarios/tuner-target.test.ts
@@ -1,27 +1,8 @@
 import { expect, test } from "vitest";
-import type { NoteJudged, Session } from "../../../src/practice/published";
+import type { NoteJudged } from "../../../src/practice/published";
 import { noteLabel } from "../../../src/theory/published";
-import { sessionOn, type SessionFixture } from "../fakes";
-
-const flush = () => new Promise((r) => setTimeout(r, 0));
-
-// practice.tuner/REQ-004 — enters the tuner and drives it past both of
-// enterTuner()'s awaits (wakeLock.acquire(), then listening.start()), the
-// same "two flushes" shape tuner-reading.test.ts uses, so
-// `listening.listening` is true before a scenario feeds a pitch.
-async function enter(session: Session): Promise<void> {
-  session.enterTuner();
-  await flush();
-  await flush();
-}
-
-// Feeds a detected pitch and advances the fake clock past the session's
-// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
-// committed reading is visible in the snapshot right after this returns.
-function hear(f: SessionFixture, hz: number): void {
-  f.listening.feed(hz);
-  f.clock.advanceMs(1);
-}
+import { sessionOn } from "../fakes";
+import { enter, hear } from "../tuner-helpers";
 
 test("practice.tuner/REQ-004/S1 — Hold", async () => {
   const f = sessionOn("G", "flute-concert");
```

## Verdict (attempt 2, task-reviewer on sonnet, 2026-09-28)

SPEC: PASS · QUALITY: PASS

- Fixes confirmed: every target verb that changes the target resets the smoothing (hold, pin, step, clear all through `pinTargetAt` / `clearTarget`); a refused step does not; `tunerSmoothingState` named; the redundant reset in `enterTuner()` gone.
- The two new tests traced by hand: the target-change test shows about 2 ¢ without the reset and 20 with it; the heard-note test fails if `heard.hz` were smoothed or `heard.cents` raw.
- The `key` in `SmoothingState` is not dead: it catches a slow glissando crossing the 56 ¢ hand-over in steps smaller than 25 ¢.
- The helper extraction is clean; the UI tuner tests needed no change (each reads a first reading or re-feeds the same pitch).
- [minor, may-defer] the task's own Verify grep matched `tunerSmoothingState` — the pattern was broader than meant; every trace of the switch is gone. The controller narrowed the pattern in tasks.md.

Reviewer's commands: `pnpm vitest run tests/practice tests/ui` → 58 files, 253 tests passed; `check-contexts.sh` clean; REQ-002/S1–S8 tested, S9 a gap (T027). Controller's `pnpm check` → 75 files, 314 tests, exit 0.

<!-- recorded 2026-09-28T21:14:13Z by scripts/record.sh -->
