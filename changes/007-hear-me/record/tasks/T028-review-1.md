---
type: Task Review
title: Review package — T028 · 007-hear-me
description: The diff produced for T028, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T028.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T028.md
  - resource: git:d396cd1e302293123b28c4fe7549ee1e6cf01a22..f11197b99e0787af80ac52429c37d62aa81e4bc6
generated:
  by: process:review-package.sh
  at: 2026-09-28T21:46:01Z
sdd_id: 007-hear-me
---

# Review package — T028 · 007-hear-me

base: `d396cd1e302293123b28c4fe7549ee1e6cf01a22` → head: `f11197b99e0787af80ac52429c37d62aa81e4bc6`

## Files changed

- M	src/practice/domain/session.ts
- M	src/practice/domain/tuner.ts
- M	src/ui/PitchSpiral.tsx
- M	src/ui/TargetSheet.tsx
- M	tests/practice/scenarios/tuner-memory.test.ts
- M	tests/practice/scenarios/tuner-target.test.ts
- M	tests/practice/scenarios/tuner-way-in-out.test.ts
- M	tests/practice/tuner-helpers.ts
- M	tests/ui/scenarios/target-sheet.test.tsx
- M	tests/ui/scenarios/transport-card.test.tsx
- M	tests/ui/scenarios/tuner-helpers.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 87a7131..d8a6c21 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -336,16 +336,18 @@ function snapshotsMateriallyEqual(
     // practice.tuner/REQ-001 — `active`, `listening` and `reading` are only
     // ever reassigned by enterTuner()/leaveTuner()/commitTunerReading()
     // (never mutated in place), so reference equality is enough, the same
-    // reasoning as settings/traversal/run above; `target` and `targetNote`
-    // compare by value (targetEqual/targetNoteEqual, above) — targetNote is
-    // now derived fresh on every buildSnapshot() call and would otherwise
-    // never compare equal, and comparing target by value too keeps a
-    // scheduler poll while pinned from ever firing a spurious notify.
+    // reasoning as settings/traversal/run above; `target`, `targetNote` and
+    // `lastHeard` compare by value (targetEqual/targetNoteEqual, above) —
+    // targetNote and lastHeard are now derived fresh on every
+    // buildSnapshot() call and would otherwise never compare equal, and
+    // comparing target by value too keeps a scheduler poll while pinned
+    // from ever firing a spurious notify.
     a.tuner.active === b.tuner.active &&
     a.tuner.listening === b.tuner.listening &&
     targetEqual(a.tuner.target, b.tuner.target) &&
     targetNoteEqual(a.tuner.targetNote, b.tuner.targetNote) &&
-    a.tuner.reading === b.tuner.reading
+    a.tuner.reading === b.tuner.reading &&
+    targetNoteEqual(a.tuner.lastHeard, b.tuner.lastHeard)
   );
 }
 
@@ -456,6 +458,14 @@ export function createSession(
   let tunerListeningState: ListeningState = { kind: "off" };
   let tunerTarget: TunerTarget = { kind: "auto" };
   let tunerReading: NoteJudged | null = null;
+  // practice.tuner/REQ-004/S7, REQ-009/S3 — the pitch position of
+  // `heard.nearest` of the last committed reading, kept through a gap (a
+  // page hidden, or the microphone failing) and forgotten only on
+  // leaveTuner(): NOT reset by clearTunerReading() below, which runs on
+  // every gap. Hold pins this once `tunerReading` has cleared, and
+  // buildSnapshot() derives `lastHeard` from it, spelled per the
+  // preference like `targetNote`.
+  let tunerLastHeardPosition: number | null = null;
   // practice.tuner/REQ-002 — the shown-note hysteresis position
   // (nearestWithHandover's `shown`), reset alongside `tunerReading` on a gap
   // or on leaveTuner(): a fresh reading after silence starts from the
@@ -837,6 +847,9 @@ export function createSession(
     invalidateSnapshot();
     tunerReading = tunerPendingReading.judged;
     tunerShownPosition = tunerPendingReading.shown;
+    // practice.tuner/REQ-004/S7 — every committed reading, not only a
+    // pinned one, updates what was last heard.
+    tunerLastHeardPosition = pitchPosition(tunerReading.heard.nearest);
     tunerPendingReading = null;
     for (const listener of noteJudgedListeners) listener(tunerReading);
     notifyChange();
@@ -1049,6 +1062,13 @@ export function createSession(
             ? noteAtPosition(tunerTarget.position, currentContext.spelling)
             : null,
         reading: tunerReading,
+        // practice.tuner/REQ-004/S7, REQ-009/S3 — derived, not stored, the
+        // same reasoning as targetNote above: a spelling change re-spells
+        // this for free.
+        lastHeard:
+          tunerLastHeardPosition === null
+            ? null
+            : noteAtPosition(tunerLastHeardPosition, currentContext.spelling),
         canStepDown: canStepTarget(tunerTarget, -1),
         canStepUp: canStepTarget(tunerTarget, 1),
       },
@@ -1598,6 +1618,9 @@ export function createSession(
     tunerListeningState = { kind: "off" };
     tunerTarget = { kind: "auto" };
     clearTunerReading();
+    // practice.tuner/REQ-009/S3 — the last note heard is forgotten only
+    // here, not by clearTunerReading()'s gap (that runs on every silence).
+    tunerLastHeardPosition = null;
     releaseWakeLockIfSilent();
     notifyChange();
   }
@@ -1614,11 +1637,17 @@ export function createSession(
     notifyChange();
   }
 
-  // practice.tuner/REQ-004/S1 — Hold: pins the last committed reading's
-  // nearest note; a no-op while nothing has been heard yet.
+  // practice.tuner/REQ-004/S1, S7, S8 — Hold: pins the note playing now if
+  // a reading is showing; otherwise, while nothing is heard, pins the last
+  // note heard since the tuner was entered; a no-op while neither exists.
   function holdTarget(): void {
-    if (tunerReading === null) return;
-    pinTargetAt(pitchPosition(tunerReading.heard.nearest));
+    if (tunerReading !== null) {
+      pinTargetAt(pitchPosition(tunerReading.heard.nearest));
+      return;
+    }
+    if (tunerLastHeardPosition !== null) {
+      pinTargetAt(tunerLastHeardPosition);
+    }
   }
 
   // practice.tuner/REQ-004/S2 — a wedge of the spiral: clamped to E2–C7 so a
diff --git a/src/practice/domain/tuner.ts b/src/practice/domain/tuner.ts
index 4b2172c..f5f28e9 100644
--- a/src/practice/domain/tuner.ts
+++ b/src/practice/domain/tuner.ts
@@ -40,6 +40,12 @@ export interface TunerSnapshot {
   readonly target: TunerTarget;
   readonly targetNote: Note | null;
   readonly reading: NoteJudged | null;
+  // practice.tuner/REQ-004/S7, REQ-009/S3 — the last note heard since the
+  // tuner was entered, spelled per the preference like `targetNote`; kept
+  // through a gap, a hidden page or a failed microphone, forgotten only on
+  // leaveTuner(). Hold pins this once `reading` has cleared, and the
+  // spiral's needle rests greyed on it.
+  readonly lastHeard: Note | null;
   readonly canStepDown: boolean;
   readonly canStepUp: boolean;
 }
diff --git a/src/ui/PitchSpiral.tsx b/src/ui/PitchSpiral.tsx
index 418a347..339839e 100644
--- a/src/ui/PitchSpiral.tsx
+++ b/src/ui/PitchSpiral.tsx
@@ -6,6 +6,7 @@ import {
   pitchClassLabel,
   pitchHzOf,
   pitchPosition,
+  type Note,
   type SpellingPreference,
 } from "../theory/published";
 import { fonts, paper, tuner } from "./theme";
@@ -132,6 +133,9 @@ export function PitchSpiral(props: {
   readonly rangeHighest: number;
   readonly target: TunerTarget;
   readonly reading: NoteJudged | null;
+  // practice.tuner/REQ-004/S7, S8 — while nothing is heard, the needle
+  // rests greyed on the last note heard instead of following `reading`.
+  readonly lastHeard: Note | null;
   readonly trail: readonly NoteJudged[];
   readonly spelling: SpellingPreference;
   readonly onPick: (position: number) => void;
@@ -143,6 +147,7 @@ export function PitchSpiral(props: {
     rangeHighest,
     target,
     reading,
+    lastHeard,
     trail,
     spelling,
     onPick,
@@ -202,11 +207,22 @@ export function PitchSpiral(props: {
     });
   }
 
+  // practice.tuner/REQ-004/S7, S8 — while a reading is showing, the needle
+  // tracks it at its own verdict colour; while nothing is heard but a note
+  // was, it rests exactly on that note (zero cents) in the grey
+  // `tuner.ghostInk` token instead; while neither, no needle at all.
   const needleQ =
-    reading === null
-      ? null
-      : clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5);
-  const needleTone = reading === null ? null : TONE_BY_VERDICT[reading.verdict];
+    reading !== null
+      ? clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5)
+      : lastHeard !== null
+        ? clamp(pitchPosition(lastHeard), lowest - 0.5, highest + 0.5)
+        : null;
+  const needleTone =
+    reading !== null
+      ? TONE_BY_VERDICT[reading.verdict]
+      : lastHeard !== null
+        ? tuner.ghostInk
+        : null;
   let needleD = "";
   if (needleQ !== null) {
     const deg = (((needleQ % 12) + 12) % 12) * HUE_STEP_DEGREES;
@@ -275,7 +291,11 @@ export function PitchSpiral(props: {
           stroke={paper.border}
           strokeWidth={HUB_STROKE_WIDTH}
         />
-        {trailD !== "" && needleTone !== null && (
+        {/* practice.tuner/REQ-004/S7 — no trail while the needle is
+            resting greyed on the last note heard: `reading !== null` is
+            the live state's own condition, same as needleTone/needleQ
+            above. */}
+        {trailD !== "" && reading !== null && needleTone !== null && (
           <path
             data-testid="spiral-trail"
             d={trailD}
@@ -289,7 +309,11 @@ export function PitchSpiral(props: {
           />
         )}
         {needleQ !== null && needleTone !== null && (
-          <g data-testid="spiral-needle" style={{ pointerEvents: "none" }}>
+          <g
+            data-testid="spiral-needle"
+            data-state={reading !== null ? "heard" : "last-heard"}
+            style={{ pointerEvents: "none" }}
+          >
             <path
               d={needleD}
               stroke={paper.card}
diff --git a/src/ui/TargetSheet.tsx b/src/ui/TargetSheet.tsx
index e8ecd5e..8cea338 100644
--- a/src/ui/TargetSheet.tsx
+++ b/src/ui/TargetSheet.tsx
@@ -127,12 +127,17 @@ function AutoCard(props: {
   );
 }
 
+// practice.tuner/REQ-004/S7, S8 — the Hold card's three states: `active`
+// (a reading showing, or the last note heard while nothing is) styles the
+// card and shows `holdName`, exactly as the reading-showing state always
+// did; `subtitle` carries which of the three texts applies.
 function HoldCard(props: {
-  readonly hasReading: boolean;
+  readonly active: boolean;
   readonly holdName: string;
+  readonly subtitle: string;
   readonly onHold: () => void;
 }): JSX.Element {
-  const { hasReading, holdName, onHold } = props;
+  const { active, holdName, subtitle, onHold } = props;
   return (
     <button
       type="button"
@@ -146,7 +151,7 @@ function HoldCard(props: {
         gap: 3,
         padding: CARD_PADDING,
         borderRadius: CARD_RADIUS,
-        border: `1px solid ${hasReading ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
+        border: `1px solid ${active ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
         background: "none",
         cursor: "pointer",
         textAlign: "left",
@@ -157,12 +162,12 @@ function HoldCard(props: {
           style={{
             fontSize: CARD_TITLE_FONT_SIZE,
             fontWeight: 600,
-            color: hasReading ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
+            color: active ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
           }}
         >
           Hold
         </span>
-        {hasReading && (
+        {active && (
           <span
             style={{
               fontFamily: fonts.mono,
@@ -182,7 +187,7 @@ function HoldCard(props: {
           whiteSpace: "nowrap",
         }}
       >
-        {hasReading ? "what you're playing" : "play a note first"}
+        {subtitle}
       </span>
     </button>
   );
@@ -222,8 +227,18 @@ export function TargetSheet(props: {
     noteAtPosition(span.highest, spelling),
   )} · low in the middle`;
 
-  const holdName =
-    tuner.reading === null ? "" : noteLabel(tuner.reading.heard.nearest);
+  // practice.tuner/REQ-004/S7, S8 — the note Hold would pin: the note
+  // playing now, or, while nothing is heard, the last note heard.
+  const holdNote =
+    tuner.reading !== null ? tuner.reading.heard.nearest : tuner.lastHeard;
+  const holdActive = holdNote !== null;
+  const holdName = holdNote === null ? "" : noteLabel(holdNote);
+  const holdSubtitle =
+    tuner.reading !== null
+      ? "what you're playing"
+      : tuner.lastHeard !== null
+        ? "the last note you played"
+        : "play a note first";
 
   return (
     <>
@@ -258,8 +273,9 @@ export function TargetSheet(props: {
             >
               <AutoCard auto={tuner.target.kind === "auto"} onAuto={onAuto} />
               <HoldCard
-                hasReading={tuner.reading !== null}
+                active={holdActive}
                 holdName={holdName}
+                subtitle={holdSubtitle}
                 onHold={onHold}
               />
             </div>
@@ -292,6 +308,7 @@ export function TargetSheet(props: {
                 rangeHighest={rangeHighest}
                 target={tuner.target}
                 reading={tuner.reading}
+                lastHeard={tuner.lastHeard}
                 trail={trail}
                 spelling={spelling}
                 onPick={onPin}
diff --git a/tests/practice/scenarios/tuner-memory.test.ts b/tests/practice/scenarios/tuner-memory.test.ts
index a9d5694..395582e 100644
--- a/tests/practice/scenarios/tuner-memory.test.ts
+++ b/tests/practice/scenarios/tuner-memory.test.ts
@@ -1,6 +1,6 @@
 import { expect, test } from "vitest";
 import { sessionOn } from "../fakes";
-import { enter } from "../tuner-helpers";
+import { enter, hearSteady, letGapPass } from "../tuner-helpers";
 
 test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
   const f = sessionOn("G", "flute-concert");
@@ -11,3 +11,16 @@ test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
   expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
   expect(f.session.snapshot().tuner.targetNote).toBeNull();
 });
+
+test("practice.tuner/REQ-009/S3 — leaving forgets the last note heard", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hearSteady(f, 440.0);
+  letGapPass(f);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+  f.session.leaveTuner();
+  await enter(f.session);
+  expect(f.session.snapshot().tuner.lastHeard).toBeNull();
+  f.session.holdTarget();
+  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
+});
diff --git a/tests/practice/scenarios/tuner-target.test.ts b/tests/practice/scenarios/tuner-target.test.ts
index 880f0d0..00b8363 100644
--- a/tests/practice/scenarios/tuner-target.test.ts
+++ b/tests/practice/scenarios/tuner-target.test.ts
@@ -2,7 +2,7 @@ import { expect, test } from "vitest";
 import type { NoteJudged } from "../../../src/practice/published";
 import { noteLabel } from "../../../src/theory/published";
 import { sessionOn } from "../fakes";
-import { enter, hear } from "../tuner-helpers";
+import { enter, hear, hearSteady, letGapPass } from "../tuner-helpers";
 
 test("practice.tuner/REQ-004/S1 — Hold", async () => {
   const f = sessionOn("G", "flute-concert");
@@ -99,6 +99,42 @@ test("practice.tuner/REQ-004 — a spelling change re-spells the pinned target",
   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
 });
 
+test("practice.tuner/REQ-004/S7 — Hold after the note has stopped", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hearSteady(f, 440.0);
+  letGapPass(f);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+  f.clock.advanceMs(2000);
+  f.session.holdTarget();
+  expect(f.session.snapshot().tuner.target).toEqual({
+    kind: "pinned",
+    position: 69,
+  });
+  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+});
+
+test("practice.tuner/REQ-004/S8 — nothing heard yet", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  expect(f.session.snapshot().tuner.lastHeard).toBeNull();
+  f.session.holdTarget();
+  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
+  expect(f.session.snapshot().tuner.targetNote).toBeNull();
+});
+
+test("practice.tuner/REQ-004 — a spelling change re-spells the last note heard", async () => {
+  const f = sessionOn("G", "flute-concert");
+  await enter(f.session);
+  hearSteady(f, 466.16);
+  expect(noteLabel(f.session.snapshot().tuner.lastHeard!)).toBe("A♯4");
+  letGapPass(f);
+  expect(f.session.snapshot().tuner.reading).toBeNull();
+  f.session.setContext({ ...f.context, spelling: "flat" });
+  expect(noteLabel(f.session.snapshot().tuner.lastHeard!)).toBe("B♭4");
+});
+
 test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
   // The sheet is a UI overlay; through the published interface "open" is
   // nothing at all — listening continues across any sequence of target verbs.
diff --git a/tests/practice/scenarios/tuner-way-in-out.test.ts b/tests/practice/scenarios/tuner-way-in-out.test.ts
index bf094cb..81a8f56 100644
--- a/tests/practice/scenarios/tuner-way-in-out.test.ts
+++ b/tests/practice/scenarios/tuner-way-in-out.test.ts
@@ -69,6 +69,7 @@ test("practice.tuner/REQ-001/S4 — out", async () => {
     target: { kind: "auto" },
     targetNote: null,
     reading: null,
+    lastHeard: null,
     canStepDown: false,
     canStepUp: false,
   });
diff --git a/tests/practice/tuner-helpers.ts b/tests/practice/tuner-helpers.ts
index 8323f79..e3a7d33 100644
--- a/tests/practice/tuner-helpers.ts
+++ b/tests/practice/tuner-helpers.ts
@@ -34,3 +34,13 @@ const SETTLE_READINGS = 50;
 export function hearSteady(f: SessionFixture, hz: number): void {
   for (let i = 0; i < SETTLE_READINGS; i += 1) hear(f, hz);
 }
+
+// practice.tuner/REQ-003 — the gap rule: advances the fake clock past the
+// session's 300 ms silence timer (domain/session.ts's private
+// TUNER_GAP_MS, mirrored here rather than exported since it is an
+// implementation detail — the existing REQ-003 scenarios advance the same
+// 300 ms inline), clearing the reading back to "Play a note" without
+// touching what was last heard (REQ-004/S7, REQ-009/S3).
+export function letGapPass(f: SessionFixture): void {
+  f.clock.advanceMs(300);
+}
diff --git a/tests/ui/scenarios/target-sheet.test.tsx b/tests/ui/scenarios/target-sheet.test.tsx
index ff536dd..d3b2790 100644
--- a/tests/ui/scenarios/target-sheet.test.tsx
+++ b/tests/ui/scenarios/target-sheet.test.tsx
@@ -1,7 +1,7 @@
-import { act, cleanup, screen } from "@testing-library/react";
+import { act, cleanup, screen, waitFor } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { afterEach, expect, test } from "vitest";
-import { enterAndHear } from "./tuner-helpers";
+import { enterAndHear, enterTuner, letGapPass } from "./tuner-helpers";
 
 // No global `afterEach` in scope (vitest globals are off), so
 // @testing-library/react's automatic cleanup never registers itself; without
@@ -95,6 +95,50 @@ test("practice.tuner/REQ-004/S5 — back to auto", async () => {
   expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
 });
 
+test("practice.tuner/REQ-004/S7 — Hold after the note has stopped", async () => {
+  const f = await enterAndHear(440.0);
+  await letGapPass(f);
+  f.clock.advanceMs(2000);
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  const holdCard = screen.getByRole("button", { name: "Hold" });
+  expect(holdCard.textContent).toContain("A4");
+  expect(holdCard.textContent).toContain("the last note you played");
+  expect(screen.getByTestId("spiral-needle").getAttribute("data-state")).toBe(
+    "last-heard",
+  );
+  expect(screen.queryByTestId("spiral-trail")).toBeNull();
+  await userEvent.click(holdCard);
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "TARGETA4",
+  );
+});
+
+test("practice.tuner/REQ-004/S8 — nothing heard yet", async () => {
+  await enterTuner();
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  const holdCard = screen.getByRole("button", { name: "Hold" });
+  expect(holdCard.textContent).toContain("play a note first");
+  expect(screen.queryByTestId("spiral-needle")).toBeNull();
+  await userEvent.click(holdCard);
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "auto · nearest",
+  );
+});
+
+test("practice.tuner/REQ-009/S3 — leaving forgets the last note heard", async () => {
+  const f = await enterAndHear(440.0);
+  await letGapPass(f);
+  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await waitFor(() =>
+    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+  const holdCard = screen.getByRole("button", { name: "Hold" });
+  expect(holdCard.textContent).toContain("play a note first");
+  expect(screen.queryByTestId("spiral-needle")).toBeNull();
+});
+
 test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
   const f = await enterAndHear(440.0);
   await userEvent.click(screen.getByRole("button", { name: "Target" }));
diff --git a/tests/ui/scenarios/transport-card.test.tsx b/tests/ui/scenarios/transport-card.test.tsx
index 6bba739..b137589 100644
--- a/tests/ui/scenarios/transport-card.test.tsx
+++ b/tests/ui/scenarios/transport-card.test.tsx
@@ -48,6 +48,7 @@ const placeholderTuner: TunerSnapshot = {
   target: { kind: "auto" },
   targetNote: null,
   reading: null,
+  lastHeard: null,
   canStepDown: false,
   canStepUp: false,
 };
diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
index 05591c1..daf7efa 100644
--- a/tests/ui/scenarios/tuner-helpers.ts
+++ b/tests/ui/scenarios/tuner-helpers.ts
@@ -13,13 +13,9 @@ import {
 } from "../../practice/fakes";
 
 // Shared by tuner-screen.test.tsx (T015) and tuner-stave.test.tsx (T016) —
-// moved out of tuner-screen.test.tsx once a second file needed it. Renders
-// <App>, opens the tuner, and feeds one steady pitch through the fake
-// listening port — `listening.feed(hz)` publishes it, `clock.advanceMs(1)`
-// runs the session's commit-on-next-tick timer (domain/session.ts's
-// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
-// state update. `spelling` optionally taps the circle's ♭ control before
-// entering (theory.circle-of-fifths/REQ-002, exercised the same way
+// moved out of tuner-screen.test.tsx once a second file needed it.
+// `spelling` optionally taps the circle's ♭ control before entering
+// (theory.circle-of-fifths/REQ-002, exercised the same way
 // circle-spelling.test.tsx does) so a scenario can ask for flat spelling
 // without duplicating the render/open dance. `extraProps` lets a scenario
 // override any of <App>'s own props (e.g. a different catalogue) without
@@ -28,13 +24,15 @@ import {
 // Plain `.ts` (not `.tsx`) per the brief — `createElement` stands in for
 // JSX so the file needs no JSX transform.
 //
-// A scenario may call this more than once (tuner-stave.test.tsx's
-// REQ-005/S3 feeds two separate frequencies to see how the strip writes
-// each) — `cleanup()` here tears down any previous render first, so a
-// second call gets a fresh `<App>` rather than a second one stacked beside
-// it (each test file's own `afterEach(cleanup)` still handles the last one).
-export async function enterAndHear(
-  hz: number,
+// The render/open dance shared by enterAndHear (below) and any scenario
+// that needs the tuner listening with nothing heard yet
+// (practice.tuner/REQ-004/S8) — extracted rather than duplicated (the
+// codebase's own convention: see AGENTS.md "Things agents get wrong here").
+// `cleanup()` here tears down any previous render first, so a second call
+// in the same test gets a fresh `<App>` rather than a second one stacked
+// beside it (each test file's own `afterEach(cleanup)` still handles the
+// last one).
+export async function enterTuner(
   spelling?: "sharp" | "flat",
   extraProps?: Partial<ComponentProps<typeof App>>,
 ): Promise<{
@@ -64,11 +62,42 @@ export async function enterAndHear(
   await waitFor(() =>
     expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
   );
-  listening.feed(hz);
-  clock.advanceMs(1);
-  await act(async () => {});
   if (session === null) {
     throw new Error("unreachable: onSessionReady was not called by render()");
   }
   return { listening, clock, session };
 }
+
+// A scenario may call this more than once (tuner-stave.test.tsx's
+// REQ-005/S3 feeds two separate frequencies to see how the strip writes
+// each) — `enterTuner` above tears down any previous render first, so a
+// second call gets a fresh `<App>` rather than a second one stacked beside
+// it (each test file's own `afterEach(cleanup)` still handles the last one).
+export async function enterAndHear(
+  hz: number,
+  spelling?: "sharp" | "flat",
+  extraProps?: Partial<ComponentProps<typeof App>>,
+): Promise<{
+  readonly listening: FakeListening;
+  readonly clock: FakeClock;
+  readonly session: Session;
+}> {
+  const { listening, clock, session } = await enterTuner(spelling, extraProps);
+  listening.feed(hz);
+  clock.advanceMs(1);
+  await act(async () => {});
+  return { listening, clock, session };
+}
+
+// practice.tuner/REQ-004/S7, REQ-009/S3 — advances the fake clock past the
+// 300 ms gap timer (domain/session.ts's private TUNER_GAP_MS, mirrored here
+// the same way tests/practice/tuner-helpers.ts's letGapPass does) and
+// flushes the resulting React update, so a scenario can see what the sheet
+// and spiral show once a reading has cleared but the last note heard is
+// still remembered.
+export async function letGapPass(f: {
+  readonly clock: FakeClock;
+}): Promise<void> {
+  f.clock.advanceMs(300);
+  await act(async () => {});
+}
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-28)

SPEC: PASS · QUALITY: PASS

- The last note heard is written only where a reading is committed (from `heard.nearest`, the heard note, not the target) and cleared only in `leaveTuner()`; it survives the gap, a hidden page and a failed microphone; no path leaves it stale across entries. `holdTarget()`'s three cases match S1, S7 and S8. `lastHeard` is derived with the spelling and compared by value.
- The Hold card's three texts are the requirement's, word for word; the greyed needle uses `tuner.ghostInk`, has no trail, and carries `data-state`; no new colour or size.
- No existing assertion weakened; the two hand-built snapshots gained `lastHeard: null`.
- [minor, may-defer] the sheet-side S7 test asserts the pill after Hold but not the greyed big name with "Play a note"; the session-side S7 test and REQ-003/S2's test cover the behaviour between them. **Noted for converge.**
- [minor, may-defer] the report cites a "Test helpers" section the brief does not have; the ripple itself is right.

Reviewer's commands: the five test files 29 passed; `check-contexts.sh` clean; REQ-004/S7, S8 and REQ-009/S3 tested. Controller's `pnpm check` at f11197b: exit 0, 75 files, 321 tests.

<!-- recorded 2026-09-28T21:51:25Z by scripts/record.sh -->
