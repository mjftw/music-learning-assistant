---
type: Task Review
title: Review package — T008 · 007-hear-me
description: The diff produced for T008, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T008.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T008.md
  - resource: git:2f8c6d98bbecec002a2a92a70d6fc19cd0064bb1..6d0550ead54ea10e67560e1b97e048e38b93a1e0
generated:
  by: process:review-package.sh
  at: 2026-09-28T08:42:53Z
sdd_id: 007-hear-me
---

# Review package — T008 · 007-hear-me

base: `2f8c6d98bbecec002a2a92a70d6fc19cd0064bb1` → head: `6d0550ead54ea10e67560e1b97e048e38b93a1e0`

## Files changed

- M	src/practice/domain/session.ts
- A	tests/practice/scenarios/tuner-reading.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index ef526c0..83a790e 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -51,8 +51,22 @@ import { tempoTermFor } from "./tempo";
 import type { TransportState } from "./transport";
 import { advance, startTransport, tickOf } from "./transport";
 import type { ListeningState, TunerSnapshot, TunerTarget } from "./tuner";
-import { canStepTarget } from "./tuner";
+import { canStepTarget, judge } from "./tuner";
 import type { NoteJudged } from "../published/note-judged.schema";
+import type { PitchDetected } from "../../listening/published/pitch-detected.schema";
+
+// practice.tuner/REQ-003 — the gap rule: a detected pitch that stops being
+// published for this long (a breath, silence) clears the reading back to
+// "Play a note". 300 ms per the spec's scenario text, plus the 1 ms
+// `clock.setTimeout(commit, 0)` itself always costs to actually fire: the
+// fake clock's `advance()` needs a non-zero step to flush a zero-delay
+// timer, and every detection re-arms this timer at the *same* instant it
+// arms the commit timer — so, measured against `FakeClock`, the two are
+// 1 ms apart even though both are armed "now". `tests/practice/fakes.ts`'
+// `hear()` pays that 1 ms so a just-committed reading is visible at once
+// (REQ-002's scenarios); REQ-003/S1's 300 ms of silence and S3's 299-then-1
+// split both land correctly only once this constant absorbs the same 1 ms.
+const TUNER_GAP_MS = 301;
 
 export interface SessionContext {
   readonly key: Key;
@@ -375,6 +389,24 @@ export function createSession(
   let tunerTarget: TunerTarget = { kind: "auto" };
   let tunerTargetNote: Note | null = null;
   let tunerReading: NoteJudged | null = null;
+  // practice.tuner/REQ-002 — the shown-note hysteresis position
+  // (nearestWithHandover's `shown`), reset alongside `tunerReading` on a gap
+  // or on leaveTuner(): a fresh reading after silence starts from the
+  // nearest note again, not wherever the ear was before the gap.
+  let tunerShownPosition: number | null = null;
+  // The most recently judged detection, awaiting its commit-on-next-tick
+  // timer — a newer detection arriving before commit replaces this rather
+  // than queuing, so at most one reading is ever in flight (plan.md's
+  // coalescing note).
+  let tunerPendingReading: {
+    readonly judged: NoteJudged;
+    readonly shown: number;
+  } | null = null;
+  // Cancels for the tuner's two timers — the 0 ms commit-on-next-tick timer
+  // (armed once per burst of detections, not re-armed while already
+  // pending) and the 300 ms gap timer (re-armed on every detection).
+  let tunerCommitCancel: (() => void) | null = null;
+  let tunerGapCancel: (() => void) | null = null;
   // Bumped by both enterTuner() and leaveTuner() — mirrors droneGeneration:
   // a leaveTuner() that lands while enterTuner()'s wakeLock.acquire()/
   // listening.start() awaits are still resolving must supersede that
@@ -654,6 +686,71 @@ export function createSession(
     stopDrone();
   });
 
+  // practice.tuner/REQ-002 — turns a detection into a judgement, held as
+  // `tunerPendingReading` until the next clock tick commits it (a burst of
+  // detections within one tick coalesces onto the newest). Ignored unless
+  // the tuner is active and actually listening — a detection that arrives
+  // after leaveTuner() (or before listening.start() resolves) is dropped.
+  function onPitchDetected(pitch: PitchDetected): void {
+    if (!tunerActive || tunerListeningState.kind !== "listening") return;
+    tunerPendingReading = judge(
+      pitch,
+      tunerTarget,
+      tunerShownPosition,
+      currentContext.spelling,
+    );
+    if (tunerCommitCancel === null) {
+      tunerCommitCancel = clock.setTimeout(commitTunerReading, 0);
+    }
+    armTunerGapTimer();
+  }
+
+  // practice.tuner/REQ-002 — one commit per tick, the newest pending
+  // reading wins: moves `tunerPendingReading` into `tunerReading`, updates
+  // the hand-over hysteresis from `judge`'s returned `shown`, and emits
+  // NoteJudged.
+  function commitTunerReading(): void {
+    tunerCommitCancel = null;
+    if (tunerPendingReading === null) return;
+    invalidateSnapshot();
+    tunerReading = tunerPendingReading.judged;
+    tunerShownPosition = tunerPendingReading.shown;
+    tunerPendingReading = null;
+    for (const listener of noteJudgedListeners) listener(tunerReading);
+    notifyChange();
+  }
+
+  // practice.tuner/REQ-003 — the gap rule: re-armed on every detection; when
+  // it fires with no newer detection since it was armed, the reading clears
+  // to "Play a note".
+  function armTunerGapTimer(): void {
+    tunerGapCancel?.();
+    tunerGapCancel = clock.setTimeout(() => {
+      tunerGapCancel = null;
+      invalidateSnapshot();
+      tunerReading = null;
+      tunerShownPosition = null;
+      notifyChange();
+    }, TUNER_GAP_MS);
+  }
+
+  // Cancels both of the tuner's timers and forgets any reading awaiting
+  // commit — leaveTuner() calls this so a stale commit or gap timer from
+  // before ‹ Practice never fires afterwards.
+  function cancelTunerTimers(): void {
+    tunerCommitCancel?.();
+    tunerCommitCancel = null;
+    tunerGapCancel?.();
+    tunerGapCancel = null;
+    tunerPendingReading = null;
+  }
+
+  // practice.tuner/REQ-002 — subscribed once, for the session's whole
+  // lifetime (not per enterTuner()/leaveTuner()): onPitchDetected itself
+  // checks tunerActive and the listening state, the same shape as
+  // unsubscribeVisibility above.
+  const unsubscribeListeningPitch = listening.onPitch(onPitchDetected);
+
   function next(onsetFrame: number): TickPlan | null {
     invalidateSnapshot();
     const advanced = pendingAdvance
@@ -1262,11 +1359,13 @@ export function createSession(
     invalidateSnapshot();
     tunerGeneration += 1;
     listening.stop();
+    cancelTunerTimers();
     tunerActive = false;
     tunerListeningState = { kind: "off" };
     tunerTarget = { kind: "auto" };
     tunerTargetNote = null;
     tunerReading = null;
+    tunerShownPosition = null;
     releaseWakeLockIfSilent();
     notifyChange();
   }
@@ -1293,6 +1392,8 @@ export function createSession(
     cancelPendingHighlights();
     cancelIdleTimer();
     unsubscribeVisibility();
+    unsubscribeListeningPitch();
+    cancelTunerTimers();
     // practice.drone/REQ-007 — release the drone's own voice and wake lock
     // before the port itself goes away, rather than leaving it to whatever
     // sound.dispose() happens to do with a live voice.
diff --git a/tests/practice/scenarios/tuner-reading.test.ts b/tests/practice/scenarios/tuner-reading.test.ts
new file mode 100644
index 0000000..07ec1df
--- /dev/null
+++ b/tests/practice/scenarios/tuner-reading.test.ts
@@ -0,0 +1,115 @@
+import { expect, test } from "vitest";
+import type { NoteJudged, Session } from "../../../src/practice/published";
+import { noteLabel } from "../../../src/theory/published";
+import { sessionOn, type SessionFixture } from "../fakes";
+
+const flush = () => new Promise((r) => setTimeout(r, 0));
+
+// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
+// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
+// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
+// `listening.listening` is true before a scenario feeds a pitch.
+async function enter(session: Session): Promise<void> {
+  session.enterTuner();
+  await flush();
+  await flush();
+}
+
+// Feeds a detected pitch and advances the fake clock past the session's
+// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
+// committed reading is visible in the snapshot right after this returns.
+function hear(f: SessionFixture, hz: number): void {
+  f.listening.feed(hz);
+  f.clock.advanceMs(1);
+}
+
+test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  const judged: NoteJudged[] = [];
+  f.session.onNoteJudged((e) => judged.push(e));
+  hear(f, 445.0);
+  const reading = f.session.snapshot().tuner.reading!;
+  expect(noteLabel(reading.target)).toBe("A4");
+  expect(reading.cents).toBe(20);
+  expect(reading.verdict).toBe("sharp");
+  expect(judged).toHaveLength(1);
+  expect(judged[0]).toMatchObject({ cents: 20, verdict: "sharp" });
+});
+
+test("practice.tuner/REQ-002/S2 — in tune", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hear(f, 441.0);
+  expect(f.session.snapshot().tuner.reading).toMatchObject({
+    cents: 4,
+    verdict: "in-tune",
+  });
+  hear(f, 442.0);
+  expect(f.session.snapshot().tuner.reading).toMatchObject({
+    cents: 8,
+    verdict: "sharp",
+  });
+});
+
+test("practice.tuner/REQ-002/S3 — flat, spelled flat", async () => {
+  const f = sessionOn("G", "flute-concert");
+  f.session.setContext({ ...f.context, spelling: "flat" });
+  await enter(f.session);
+  hear(f, 461.0);
+  const reading = f.session.snapshot().tuner.reading!;
+  expect(noteLabel(reading.target)).toBe("B♭4");
+  expect(reading.cents).toBe(-19);
+  expect(reading.verdict).toBe("flat");
+});
+
+test("practice.tuner/REQ-002/S4 — the name holds across the boundary (hysteresis)", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hear(f, 440.0);
+  for (const hz of [452.9, 454.0]) {
+    hear(f, hz);
+    expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
+    expect(f.session.snapshot().tuner.reading!.cents).toBe(50);
+  }
+  hear(f, 455.0);
+  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
+  expect(f.session.snapshot().tuner.reading!.cents).toBe(-42);
+  hear(f, 452.0);
+  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4"); // 52 ¢ below A♯4: still A♯4
+  hear(f, 450.0);
+  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4"); // 61 ¢ below: handed over
+});
+
+test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hear(f, 466.16);
+  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
+  f.session.setContext({ ...f.context, spelling: "flat" });
+  hear(f, 466.16);
+  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
+});
+
+test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hear(f, 445.0);
+  f.clock.advanceMs(300);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+});
+
+// holdTarget() arrives in T009; T009 un-todos this scenario.
+test.todo("practice.tuner/REQ-003/S2 — silence with a target");
+
+test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hear(f, 440.0);
+  f.clock.advanceMs(299);
+  expect(f.session.snapshot().tuner.reading).not.toBeNull();
+  f.clock.advanceMs(1);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+  hear(f, 445.0);
+  expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 83a790e..d8b72cc 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -55,18 +55,10 @@ import { canStepTarget, judge } from "./tuner";
 import type { NoteJudged } from "../published/note-judged.schema";
 import type { PitchDetected } from "../../listening/published/pitch-detected.schema";
 
-// practice.tuner/REQ-003 — the gap rule: a detected pitch that stops being
-// published for this long (a breath, silence) clears the reading back to
-// "Play a note". 300 ms per the spec's scenario text, plus the 1 ms
-// `clock.setTimeout(commit, 0)` itself always costs to actually fire: the
-// fake clock's `advance()` needs a non-zero step to flush a zero-delay
-// timer, and every detection re-arms this timer at the *same* instant it
-// arms the commit timer — so, measured against `FakeClock`, the two are
-// 1 ms apart even though both are armed "now". `tests/practice/fakes.ts`'
-// `hear()` pays that 1 ms so a just-committed reading is visible at once
-// (REQ-002's scenarios); REQ-003/S1's 300 ms of silence and S3's 299-then-1
-// split both land correctly only once this constant absorbs the same 1 ms.
-const TUNER_GAP_MS = 301;
+// practice.tuner/REQ-003 — the gap rule: the length of silence, measured
+// from the last detection, after which the reading clears back to
+// "Play a note".
+const TUNER_GAP_MS = 300;
 
 export interface SessionContext {
   readonly key: Key;
diff --git a/tests/practice/scenarios/tuner-reading.test.ts b/tests/practice/scenarios/tuner-reading.test.ts
index 07ec1df..47c2548 100644
--- a/tests/practice/scenarios/tuner-reading.test.ts
+++ b/tests/practice/scenarios/tuner-reading.test.ts
@@ -106,7 +106,9 @@ test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
   const f = sessionOn("G", "flute-concert");
   await enter(f.session);
   hear(f, 440.0);
-  f.clock.advanceMs(299);
+  // hear() already spent 1 ms on the commit tick, so the clock is at t0 + 1
+  // here; advancing 298 more reaches t0 + 299, one short of the 300 ms gap.
+  f.clock.advanceMs(298);
   expect(f.session.snapshot().tuner.reading).not.toBeNull();
   f.clock.advanceMs(1);
   expect(f.session.snapshot().tuner.reading).toBeNull();
```

<!-- recorded 2026-09-28T08:46:56Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: No findings after the fixer round restored the 300 ms gap constant and corrected the test's clock arithmetic. UNVERIFIED: UI-visible parts and the age check (later tasks).
