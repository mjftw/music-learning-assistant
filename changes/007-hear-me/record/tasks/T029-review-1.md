---
type: Task Review
title: Review package — T029 · 007-hear-me
description: The diff produced for T029, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T029.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T029.md
  - resource: git:f11197b99e0787af80ac52429c37d62aa81e4bc6..123ac6293679f810b3db1b234bdeab9f1bb601ef
generated:
  by: process:review-package.sh
  at: 2026-09-28T22:09:23Z
sdd_id: 007-hear-me
---

# Review package — T029 · 007-hear-me

base: `f11197b99e0787af80ac52429c37d62aa81e4bc6` → head: `123ac6293679f810b3db1b234bdeab9f1bb601ef`

## Files changed

- M	changes/007-hear-me/design/rounds.md
- M	changes/007-hear-me/notes.md
- A	changes/007-hear-me/record/tasks/T028-report-1.md
- A	changes/007-hear-me/record/tasks/T028-review-1.md
- M	changes/007-hear-me/tasks.md

## Diff

```diff
diff --git a/changes/007-hear-me/design/rounds.md b/changes/007-hear-me/design/rounds.md
index 69368b2..2d60df0 100644
--- a/changes/007-hear-me/design/rounds.md
+++ b/changes/007-hear-me/design/rounds.md
@@ -139,11 +139,17 @@ sdd_phase: open           # open | exited
 - **Problem:** "on note selector spiral I'd like it to remember the last
   heard so you can press hold on this without needing to press while
   you're playing which is often not possible."
-- **Tried:** <pending>
-- **Chose:** <pending>
-- **Rejected because:** <pending>
-- **Requirement changed?** <pending — practice.tuner/REQ-004 (Hold, the
-  needle), REQ-009 (what leaving forgets)>
+- **Tried:** one treatment, as asked, with one choice put to the user —
+  whether the spiral's needle stays in silence. No switch: nothing to
+  compare but that.
+- **Chose:** Hold pins the last note heard once the note has stopped; the
+  Hold card names it; the needle stays greyed on it — "Approve, needle
+  stays greyed" (the user, 2026-09-28).
+- **Rejected because:** the needle vanishing in silence — not chosen; it
+  would leave nothing on the spiral to show what Hold will pin.
+- **Requirement changed?** yes: practice.tuner/REQ-004 (S7, S8),
+  REQ-009/S3, REQ-003's last clause — written to the delta with the
+  user's approval; built as T028.
 
 ### Round 3 — tuner · silent (the stave strip's trail)
 
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 2ca8b7a..3984b3d 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -573,3 +573,14 @@ For converge (T027's review): a tone whose readings stop between about
 350 ms and 500 ms passes the shown-offset gate with an error of 0 — the
 column is seeded at 0 and the readings-per-second gate needs only ~150 ms
 of readings; the raw cents column has the same shape.
+
+## T028 — Hold and the needle remember the last note heard (2026-09-28)
+
+- `tunerLastHeardPosition` in the session: written where a reading is
+  committed, cleared only by `leaveTuner()`; `TunerSnapshot.lastHeard`
+  derived with the spelling, as `targetNote` is.
+- For converge (T028's review): the sheet-side REQ-004/S7 test asserts
+  the pill after Hold, not the greyed big name with "Play a note" —
+  covered between the session-side S7 test and REQ-003/S2's.
+- For the plan at finish: `TunerSnapshot.lastHeard`; `NoteJudged.heard`'s
+  comment (T026).
diff --git a/changes/007-hear-me/record/tasks/T028-report-1.md b/changes/007-hear-me/record/tasks/T028-report-1.md
new file mode 100644
index 0000000..29c017a
--- /dev/null
+++ b/changes/007-hear-me/record/tasks/T028-report-1.md
@@ -0,0 +1,165 @@
+---
+type: Implementation Report
+title: T028 — implementation report
+resource: /.sdd/reports/007-hear-me/T028.md
+status: draft
+tags: [sdd, report, "change:007-hear-me"]
+sources:
+  - resource: /.sdd/briefs/007-hear-me/T028.md
+generated:
+  by: claude-code/claude-sonnet-5
+  at: 2026-09-28T21:44:18Z
+sdd_id: 007-hear-me
+---
+
+TASK: T028
+STATUS: DONE
+COMMIT: none (not requested)
+FILES:
+src/practice/domain/session.ts
+src/practice/domain/tuner.ts
+src/ui/TargetSheet.tsx
+src/ui/PitchSpiral.tsx
+tests/practice/scenarios/tuner-target.test.ts
+tests/practice/scenarios/tuner-memory.test.ts
+tests/practice/tuner-helpers.ts
+tests/ui/scenarios/target-sheet.test.tsx
+tests/ui/scenarios/tuner-helpers.ts
+tests/practice/scenarios/tuner-way-in-out.test.ts
+tests/ui/scenarios/transport-card.test.tsx
+
+VERIFY:
+```
+$ pnpm vitest run tests/practice/scenarios/tuner-target.test.ts tests/practice/scenarios/tuner-memory.test.ts tests/ui/scenarios/target-sheet.test.tsx
+
+ RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
+
+ Test Files  3 passed (3)
+      Tests  20 passed (20)
+   Start at  22:43:20
+   Duration  2.88s (tests 55%, environment 20%, transform 15%, import 9%)
+```
+
+```
+$ pnpm vitest run tests/practice tests/ui
+
+ RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
+
+ Test Files  58 passed (58)
+      Tests  260 passed (260)
+   Start at  22:43:26
+   Duration  9.01s (tests 52%, environment 31%, import 10%, transform 7%)
+```
+
+```
+$ ./scripts/check-scenarios.sh --change changes/007-hear-me | grep "❌"
+  ❌ practice.tuner/REQ-005/S5 has no test citing it
+  ❌ practice.tuner/REQ-005/S6 has no test citing it
+❌ scenario gaps
+```
+(exactly the two the brief said would remain — the next task)
+
+```
+$ ./scripts/check-contexts.sh
+✅ context boundaries respected
+```
+
+CHECK:
+```
+$ bash -c "source ~/.cargo/env && pnpm check"
+
+Checking formatting...
+All matched files use Prettier code style!
+
+ Test Files  75 passed (75)
+      Tests  321 passed (321)
+   Start at  22:43:50
+   Duration  10.55s (tests 51%, environment 33%, import 9%, transform 7%)
+
+running 13 tests (listening)
+test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.20s
+
+running 24 tests (sound)
+test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s
+```
+prettier, eslint, tsc, vitest, cargo fmt, cargo clippy and cargo test all
+ran and passed (the chain never stopped early).
+
+DECISIONS:
+- `session.ts` tracks the last note heard as a *pitch position* (`let
+  tunerLastHeardPosition: number | null`), the same shape as
+  `tunerShownPosition`, set in `commitTunerReading()` from every committed
+  reading's `heard.nearest`, left untouched by `clearTunerReading()` (the
+  gap/hidden/failed-mic clearer), and reset to `null` only in
+  `leaveTuner()`. `buildSnapshot()` derives `TunerSnapshot.lastHeard`
+  fresh from it each call (spelled per `currentContext.spelling`), exactly
+  mirroring how `targetNote` is derived from `tunerTarget` — so a spelling
+  change re-spells it for free, and `snapshotsMateriallyEqual` compares it
+  by value with the existing `targetNoteEqual` helper (a fresh `Note`
+  object every call would otherwise never compare equal by reference).
+- `holdTarget()` now pins `tunerReading.heard.nearest` when a reading is
+  showing (unchanged), else `tunerLastHeardPosition` when set, else no-op —
+  matching REQ-004/S1, S7, S8.
+- `TargetSheet.tsx`'s `HoldCard` takes `active`/`holdName`/`subtitle`
+  instead of the old `hasReading`/`holdName`: `active` is true whenever
+  there is a note to show (a live reading *or* a remembered last-heard
+  note), driving the same border/title styling the reading-showing state
+  always had; `subtitle` carries "what you're playing" / "the last note
+  you played" / "play a note first".
+- `PitchSpiral.tsx` takes a new `lastHeard: Note | null` prop. The needle
+  now has three states: tracks `reading` at its verdict colour (unchanged);
+  rests at `pitchPosition(lastHeard)` (zero cents) in `tuner.ghostInk` when
+  there's no reading but a last-heard note; or is absent. The needle
+  `<g>` carries `data-state="heard"` / `"last-heard"` so tests can tell the
+  two apart, per the brief's suggestion. The trail is now additionally
+  gated on `reading !== null` (previously just on `needleTone !== null`,
+  which would otherwise also be true for the greyed state) — in practice
+  `TunerScreen.tsx`'s `trailRef` already resets to `[]` whenever
+  `tuner.reading` goes null, so the trail array itself is already empty by
+  the time the needle turns grey; this extra guard makes the "no trail
+  while greyed" requirement hold from `PitchSpiral`'s own contract too,
+  not just by relying on that caller behaviour.
+- Test helpers: added `letGapPass(f)` to both
+  `tests/practice/tuner-helpers.ts` and `tests/ui/scenarios/tuner-helpers.ts`
+  (`f.clock.advanceMs(300)`, matching the 300 ms the existing REQ-003
+  scenarios already advance inline — `TUNER_GAP_MS` is a private constant
+  in `session.ts`, not exported, so this mirrors the value rather than
+  importing it, the same as the existing tests do). In
+  `tests/ui/scenarios/tuner-helpers.ts` I extracted the render/open dance
+  out of `enterAndHear` into a new `enterTuner(spelling?, extraProps?)`
+  (returns once LISTENING shows, before feeding any pitch), and rewrote
+  `enterAndHear` to call it — needed for REQ-004/S8's "nothing heard yet"
+  scenario, which must enter the tuner without ever feeding a pitch; this
+  follows AGENTS.md's "extract, don't duplicate" note rather than
+  copy-pasting the render/open block into a second helper.
+
+RIPPLES (not in the brief's Files list, touched because the type change
+required it — found by `grep -rn "targetNote:"`):
+- `tests/practice/scenarios/tuner-way-in-out.test.ts` — REQ-001/S4's
+  `toEqual` snapshot of the whole `tuner` object needed `lastHeard: null`
+  added (a second test in the same file uses `toMatchObject` and needed no
+  change).
+- `tests/ui/scenarios/transport-card.test.tsx` — `placeholderTuner`, a
+  hand-built `TunerSnapshot` fixture, needed `lastHeard: null` added to
+  satisfy the widened interface.
+- `tests/ui/scenarios/tuner-helpers.ts` — extended with `enterTuner` and
+  `letGapPass` (see DECISIONS above); not in the brief's Files list but
+  explicitly invited by the brief's "Test helpers" section.
+
+TDD notes: every new/changed assertion was run red before any production
+code changed. `tuner-target.test.ts`'s S7 failed on the pinned-target
+assertion (`{kind:"auto"}` vs `{kind:"pinned", position:69}`); S8 and
+`tuner-memory.test.ts`'s S3 failed on `lastHeard` reading back `undefined`
+instead of `null` (Vitest doesn't type-check, so the missing field showed
+up as a genuine runtime mismatch, not a compile error); the spelling-respell
+test failed the same way. The UI-side S7 test failed on the Hold card's
+text ("Holdplay a note first" not containing "A4"). S8 and REQ-009/S3 on
+the UI side were already green before any production change — the old
+`hasReading`-only logic already showed "play a note first" and no needle
+whenever `tuner.reading` was null, which is also true in both those
+scenarios; I kept them as explicit scenario-ID-tagged regression coverage
+per the brief's own ask, not as a TDD-driving red.
+
+CONCERNS: none.
+
+<!-- recorded 2026-09-28T21:51:25Z by scripts/record.sh -->
diff --git a/changes/007-hear-me/record/tasks/T028-review-1.md b/changes/007-hear-me/record/tasks/T028-review-1.md
new file mode 100644
index 0000000..a547b94
--- /dev/null
+++ b/changes/007-hear-me/record/tasks/T028-review-1.md
@@ -0,0 +1,631 @@
+---
+type: Task Review
+title: Review package — T028 · 007-hear-me
+description: The diff produced for T028, for the task reviewer.
+resource: /.sdd/reviews/007-hear-me/T028.md
+status: draft
+tags: [sdd, review, "change:007-hear-me"]
+sources:
+  - resource: /.sdd/briefs/007-hear-me/T028.md
+  - resource: git:d396cd1e302293123b28c4fe7549ee1e6cf01a22..f11197b99e0787af80ac52429c37d62aa81e4bc6
+generated:
+  by: process:review-package.sh
+  at: 2026-09-28T21:46:01Z
+sdd_id: 007-hear-me
+---
+
+# Review package — T028 · 007-hear-me
+
+base: `d396cd1e302293123b28c4fe7549ee1e6cf01a22` → head: `f11197b99e0787af80ac52429c37d62aa81e4bc6`
+
+## Files changed
+
+- M	src/practice/domain/session.ts
+- M	src/practice/domain/tuner.ts
+- M	src/ui/PitchSpiral.tsx
+- M	src/ui/TargetSheet.tsx
+- M	tests/practice/scenarios/tuner-memory.test.ts
+- M	tests/practice/scenarios/tuner-target.test.ts
+- M	tests/practice/scenarios/tuner-way-in-out.test.ts
+- M	tests/practice/tuner-helpers.ts
+- M	tests/ui/scenarios/target-sheet.test.tsx
+- M	tests/ui/scenarios/transport-card.test.tsx
+- M	tests/ui/scenarios/tuner-helpers.ts
+
+## Diff
+
+```diff
+diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
+index 87a7131..d8a6c21 100644
+--- a/src/practice/domain/session.ts
++++ b/src/practice/domain/session.ts
+@@ -336,16 +336,18 @@ function snapshotsMateriallyEqual(
+     // practice.tuner/REQ-001 — `active`, `listening` and `reading` are only
+     // ever reassigned by enterTuner()/leaveTuner()/commitTunerReading()
+     // (never mutated in place), so reference equality is enough, the same
+-    // reasoning as settings/traversal/run above; `target` and `targetNote`
+-    // compare by value (targetEqual/targetNoteEqual, above) — targetNote is
+-    // now derived fresh on every buildSnapshot() call and would otherwise
+-    // never compare equal, and comparing target by value too keeps a
+-    // scheduler poll while pinned from ever firing a spurious notify.
++    // reasoning as settings/traversal/run above; `target`, `targetNote` and
++    // `lastHeard` compare by value (targetEqual/targetNoteEqual, above) —
++    // targetNote and lastHeard are now derived fresh on every
++    // buildSnapshot() call and would otherwise never compare equal, and
++    // comparing target by value too keeps a scheduler poll while pinned
++    // from ever firing a spurious notify.
+     a.tuner.active === b.tuner.active &&
+     a.tuner.listening === b.tuner.listening &&
+     targetEqual(a.tuner.target, b.tuner.target) &&
+     targetNoteEqual(a.tuner.targetNote, b.tuner.targetNote) &&
+-    a.tuner.reading === b.tuner.reading
++    a.tuner.reading === b.tuner.reading &&
++    targetNoteEqual(a.tuner.lastHeard, b.tuner.lastHeard)
+   );
+ }
+ 
+@@ -456,6 +458,14 @@ export function createSession(
+   let tunerListeningState: ListeningState = { kind: "off" };
+   let tunerTarget: TunerTarget = { kind: "auto" };
+   let tunerReading: NoteJudged | null = null;
++  // practice.tuner/REQ-004/S7, REQ-009/S3 — the pitch position of
++  // `heard.nearest` of the last committed reading, kept through a gap (a
++  // page hidden, or the microphone failing) and forgotten only on
++  // leaveTuner(): NOT reset by clearTunerReading() below, which runs on
++  // every gap. Hold pins this once `tunerReading` has cleared, and
++  // buildSnapshot() derives `lastHeard` from it, spelled per the
++  // preference like `targetNote`.
++  let tunerLastHeardPosition: number | null = null;
+   // practice.tuner/REQ-002 — the shown-note hysteresis position
+   // (nearestWithHandover's `shown`), reset alongside `tunerReading` on a gap
+   // or on leaveTuner(): a fresh reading after silence starts from the
+@@ -837,6 +847,9 @@ export function createSession(
+     invalidateSnapshot();
+     tunerReading = tunerPendingReading.judged;
+     tunerShownPosition = tunerPendingReading.shown;
++    // practice.tuner/REQ-004/S7 — every committed reading, not only a
++    // pinned one, updates what was last heard.
++    tunerLastHeardPosition = pitchPosition(tunerReading.heard.nearest);
+     tunerPendingReading = null;
+     for (const listener of noteJudgedListeners) listener(tunerReading);
+     notifyChange();
+@@ -1049,6 +1062,13 @@ export function createSession(
+             ? noteAtPosition(tunerTarget.position, currentContext.spelling)
+             : null,
+         reading: tunerReading,
++        // practice.tuner/REQ-004/S7, REQ-009/S3 — derived, not stored, the
++        // same reasoning as targetNote above: a spelling change re-spells
++        // this for free.
++        lastHeard:
++          tunerLastHeardPosition === null
++            ? null
++            : noteAtPosition(tunerLastHeardPosition, currentContext.spelling),
+         canStepDown: canStepTarget(tunerTarget, -1),
+         canStepUp: canStepTarget(tunerTarget, 1),
+       },
+@@ -1598,6 +1618,9 @@ export function createSession(
+     tunerListeningState = { kind: "off" };
+     tunerTarget = { kind: "auto" };
+     clearTunerReading();
++    // practice.tuner/REQ-009/S3 — the last note heard is forgotten only
++    // here, not by clearTunerReading()'s gap (that runs on every silence).
++    tunerLastHeardPosition = null;
+     releaseWakeLockIfSilent();
+     notifyChange();
+   }
+@@ -1614,11 +1637,17 @@ export function createSession(
+     notifyChange();
+   }
+ 
+-  // practice.tuner/REQ-004/S1 — Hold: pins the last committed reading's
+-  // nearest note; a no-op while nothing has been heard yet.
++  // practice.tuner/REQ-004/S1, S7, S8 — Hold: pins the note playing now if
++  // a reading is showing; otherwise, while nothing is heard, pins the last
++  // note heard since the tuner was entered; a no-op while neither exists.
+   function holdTarget(): void {
+-    if (tunerReading === null) return;
+-    pinTargetAt(pitchPosition(tunerReading.heard.nearest));
++    if (tunerReading !== null) {
++      pinTargetAt(pitchPosition(tunerReading.heard.nearest));
++      return;
++    }
++    if (tunerLastHeardPosition !== null) {
++      pinTargetAt(tunerLastHeardPosition);
++    }
+   }
+ 
+   // practice.tuner/REQ-004/S2 — a wedge of the spiral: clamped to E2–C7 so a
+diff --git a/src/practice/domain/tuner.ts b/src/practice/domain/tuner.ts
+index 4b2172c..f5f28e9 100644
+--- a/src/practice/domain/tuner.ts
++++ b/src/practice/domain/tuner.ts
+@@ -40,6 +40,12 @@ export interface TunerSnapshot {
+   readonly target: TunerTarget;
+   readonly targetNote: Note | null;
+   readonly reading: NoteJudged | null;
++  // practice.tuner/REQ-004/S7, REQ-009/S3 — the last note heard since the
++  // tuner was entered, spelled per the preference like `targetNote`; kept
++  // through a gap, a hidden page or a failed microphone, forgotten only on
++  // leaveTuner(). Hold pins this once `reading` has cleared, and the
++  // spiral's needle rests greyed on it.
++  readonly lastHeard: Note | null;
+   readonly canStepDown: boolean;
+   readonly canStepUp: boolean;
+ }
+diff --git a/src/ui/PitchSpiral.tsx b/src/ui/PitchSpiral.tsx
+index 418a347..339839e 100644
+--- a/src/ui/PitchSpiral.tsx
++++ b/src/ui/PitchSpiral.tsx
+@@ -6,6 +6,7 @@ import {
+   pitchClassLabel,
+   pitchHzOf,
+   pitchPosition,
++  type Note,
+   type SpellingPreference,
+ } from "../theory/published";
+ import { fonts, paper, tuner } from "./theme";
+@@ -132,6 +133,9 @@ export function PitchSpiral(props: {
+   readonly rangeHighest: number;
+   readonly target: TunerTarget;
+   readonly reading: NoteJudged | null;
++  // practice.tuner/REQ-004/S7, S8 — while nothing is heard, the needle
++  // rests greyed on the last note heard instead of following `reading`.
++  readonly lastHeard: Note | null;
+   readonly trail: readonly NoteJudged[];
+   readonly spelling: SpellingPreference;
+   readonly onPick: (position: number) => void;
+@@ -143,6 +147,7 @@ export function PitchSpiral(props: {
+     rangeHighest,
+     target,
+     reading,
++    lastHeard,
+     trail,
+     spelling,
+     onPick,
+@@ -202,11 +207,22 @@ export function PitchSpiral(props: {
+     });
+   }
+ 
++  // practice.tuner/REQ-004/S7, S8 — while a reading is showing, the needle
++  // tracks it at its own verdict colour; while nothing is heard but a note
++  // was, it rests exactly on that note (zero cents) in the grey
++  // `tuner.ghostInk` token instead; while neither, no needle at all.
+   const needleQ =
+-    reading === null
+-      ? null
+-      : clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5);
+-  const needleTone = reading === null ? null : TONE_BY_VERDICT[reading.verdict];
++    reading !== null
++      ? clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5)
++      : lastHeard !== null
++        ? clamp(pitchPosition(lastHeard), lowest - 0.5, highest + 0.5)
++        : null;
++  const needleTone =
++    reading !== null
++      ? TONE_BY_VERDICT[reading.verdict]
++      : lastHeard !== null
++        ? tuner.ghostInk
++        : null;
+   let needleD = "";
+   if (needleQ !== null) {
+     const deg = (((needleQ % 12) + 12) % 12) * HUE_STEP_DEGREES;
+@@ -275,7 +291,11 @@ export function PitchSpiral(props: {
+           stroke={paper.border}
+           strokeWidth={HUB_STROKE_WIDTH}
+         />
+-        {trailD !== "" && needleTone !== null && (
++        {/* practice.tuner/REQ-004/S7 — no trail while the needle is
++            resting greyed on the last note heard: `reading !== null` is
++            the live state's own condition, same as needleTone/needleQ
++            above. */}
++        {trailD !== "" && reading !== null && needleTone !== null && (
+           <path
+             data-testid="spiral-trail"
+             d={trailD}
+@@ -289,7 +309,11 @@ export function PitchSpiral(props: {
+           />
+         )}
+         {needleQ !== null && needleTone !== null && (
+-          <g data-testid="spiral-needle" style={{ pointerEvents: "none" }}>
++          <g
++            data-testid="spiral-needle"
++            data-state={reading !== null ? "heard" : "last-heard"}
++            style={{ pointerEvents: "none" }}
++          >
+             <path
+               d={needleD}
+               stroke={paper.card}
+diff --git a/src/ui/TargetSheet.tsx b/src/ui/TargetSheet.tsx
+index e8ecd5e..8cea338 100644
+--- a/src/ui/TargetSheet.tsx
++++ b/src/ui/TargetSheet.tsx
+@@ -127,12 +127,17 @@ function AutoCard(props: {
+   );
+ }
+ 
++// practice.tuner/REQ-004/S7, S8 — the Hold card's three states: `active`
++// (a reading showing, or the last note heard while nothing is) styles the
++// card and shows `holdName`, exactly as the reading-showing state always
++// did; `subtitle` carries which of the three texts applies.
+ function HoldCard(props: {
+-  readonly hasReading: boolean;
++  readonly active: boolean;
+   readonly holdName: string;
++  readonly subtitle: string;
+   readonly onHold: () => void;
+ }): JSX.Element {
+-  const { hasReading, holdName, onHold } = props;
++  const { active, holdName, subtitle, onHold } = props;
+   return (
+     <button
+       type="button"
+@@ -146,7 +151,7 @@ function HoldCard(props: {
+         gap: 3,
+         padding: CARD_PADDING,
+         borderRadius: CARD_RADIUS,
+-        border: `1px solid ${hasReading ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
++        border: `1px solid ${active ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
+         background: "none",
+         cursor: "pointer",
+         textAlign: "left",
+@@ -157,12 +162,12 @@ function HoldCard(props: {
+           style={{
+             fontSize: CARD_TITLE_FONT_SIZE,
+             fontWeight: 600,
+-            color: hasReading ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
++            color: active ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
+           }}
+         >
+           Hold
+         </span>
+-        {hasReading && (
++        {active && (
+           <span
+             style={{
+               fontFamily: fonts.mono,
+@@ -182,7 +187,7 @@ function HoldCard(props: {
+           whiteSpace: "nowrap",
+         }}
+       >
+-        {hasReading ? "what you're playing" : "play a note first"}
++        {subtitle}
+       </span>
+     </button>
+   );
+@@ -222,8 +227,18 @@ export function TargetSheet(props: {
+     noteAtPosition(span.highest, spelling),
+   )} · low in the middle`;
+ 
+-  const holdName =
+-    tuner.reading === null ? "" : noteLabel(tuner.reading.heard.nearest);
++  // practice.tuner/REQ-004/S7, S8 — the note Hold would pin: the note
++  // playing now, or, while nothing is heard, the last note heard.
++  const holdNote =
++    tuner.reading !== null ? tuner.reading.heard.nearest : tuner.lastHeard;
++  const holdActive = holdNote !== null;
++  const holdName = holdNote === null ? "" : noteLabel(holdNote);
++  const holdSubtitle =
++    tuner.reading !== null
++      ? "what you're playing"
++      : tuner.lastHeard !== null
++        ? "the last note you played"
++        : "play a note first";
+ 
+   return (
+     <>
+@@ -258,8 +273,9 @@ export function TargetSheet(props: {
+             >
+               <AutoCard auto={tuner.target.kind === "auto"} onAuto={onAuto} />
+               <HoldCard
+-                hasReading={tuner.reading !== null}
++                active={holdActive}
+                 holdName={holdName}
++                subtitle={holdSubtitle}
+                 onHold={onHold}
+               />
+             </div>
+@@ -292,6 +308,7 @@ export function TargetSheet(props: {
+                 rangeHighest={rangeHighest}
+                 target={tuner.target}
+                 reading={tuner.reading}
++                lastHeard={tuner.lastHeard}
+                 trail={trail}
+                 spelling={spelling}
+                 onPick={onPin}
+diff --git a/tests/practice/scenarios/tuner-memory.test.ts b/tests/practice/scenarios/tuner-memory.test.ts
+index a9d5694..395582e 100644
+--- a/tests/practice/scenarios/tuner-memory.test.ts
++++ b/tests/practice/scenarios/tuner-memory.test.ts
+@@ -1,6 +1,6 @@
+ import { expect, test } from "vitest";
+ import { sessionOn } from "../fakes";
+-import { enter } from "../tuner-helpers";
++import { enter, hearSteady, letGapPass } from "../tuner-helpers";
+ 
+ test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
+   const f = sessionOn("G", "flute-concert");
+@@ -11,3 +11,16 @@ test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
+   expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
+   expect(f.session.snapshot().tuner.targetNote).toBeNull();
+ });
++
++test("practice.tuner/REQ-009/S3 — leaving forgets the last note heard", async () => {
++  const f = sessionOn("G", "flute-concert");
++  await enter(f.session);
++  hearSteady(f, 440.0);
++  letGapPass(f);
++  expect(f.session.snapshot().tuner.reading).toBeNull();
++  f.session.leaveTuner();
++  await enter(f.session);
++  expect(f.session.snapshot().tuner.lastHeard).toBeNull();
++  f.session.holdTarget();
++  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
++});
+diff --git a/tests/practice/scenarios/tuner-target.test.ts b/tests/practice/scenarios/tuner-target.test.ts
+index 880f0d0..00b8363 100644
+--- a/tests/practice/scenarios/tuner-target.test.ts
++++ b/tests/practice/scenarios/tuner-target.test.ts
+@@ -2,7 +2,7 @@ import { expect, test } from "vitest";
+ import type { NoteJudged } from "../../../src/practice/published";
+ import { noteLabel } from "../../../src/theory/published";
+ import { sessionOn } from "../fakes";
+-import { enter, hear } from "../tuner-helpers";
++import { enter, hear, hearSteady, letGapPass } from "../tuner-helpers";
+ 
+ test("practice.tuner/REQ-004/S1 — Hold", async () => {
+   const f = sessionOn("G", "flute-concert");
+@@ -99,6 +99,42 @@ test("practice.tuner/REQ-004 — a spelling change re-spells the pinned target",
+   expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
+ });
+ 
++test("practice.tuner/REQ-004/S7 — Hold after the note has stopped", async () => {
++  const f = sessionOn("G", "flute-concert");
++  await enter(f.session);
++  hearSteady(f, 440.0);
++  letGapPass(f);
++  expect(f.session.snapshot().tuner.reading).toBeNull();
++  f.clock.advanceMs(2000);
++  f.session.holdTarget();
++  expect(f.session.snapshot().tuner.target).toEqual({
++    kind: "pinned",
++    position: 69,
++  });
++  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
++  expect(f.session.snapshot().tuner.reading).toBeNull();
++});
++
++test("practice.tuner/REQ-004/S8 — nothing heard yet", async () => {
++  const f = sessionOn("G", "flute-concert");
++  await enter(f.session);
++  expect(f.session.snapshot().tuner.lastHeard).toBeNull();
++  f.session.holdTarget();
++  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
++  expect(f.session.snapshot().tuner.targetNote).toBeNull();
++});
++
++test("practice.tuner/REQ-004 — a spelling change re-spells the last note heard", async () => {
++  const f = sessionOn("G", "flute-concert");
++  await enter(f.session);
++  hearSteady(f, 466.16);
++  expect(noteLabel(f.session.snapshot().tuner.lastHeard!)).toBe("A♯4");
++  letGapPass(f);
++  expect(f.session.snapshot().tuner.reading).toBeNull();
++  f.session.setContext({ ...f.context, spelling: "flat" });
++  expect(noteLabel(f.session.snapshot().tuner.lastHeard!)).toBe("B♭4");
++});
++
+ test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
+   // The sheet is a UI overlay; through the published interface "open" is
+   // nothing at all — listening continues across any sequence of target verbs.
+diff --git a/tests/practice/scenarios/tuner-way-in-out.test.ts b/tests/practice/scenarios/tuner-way-in-out.test.ts
+index bf094cb..81a8f56 100644
+--- a/tests/practice/scenarios/tuner-way-in-out.test.ts
++++ b/tests/practice/scenarios/tuner-way-in-out.test.ts
+@@ -69,6 +69,7 @@ test("practice.tuner/REQ-001/S4 — out", async () => {
+     target: { kind: "auto" },
+     targetNote: null,
+     reading: null,
++    lastHeard: null,
+     canStepDown: false,
+     canStepUp: false,
+   });
+diff --git a/tests/practice/tuner-helpers.ts b/tests/practice/tuner-helpers.ts
+index 8323f79..e3a7d33 100644
+--- a/tests/practice/tuner-helpers.ts
++++ b/tests/practice/tuner-helpers.ts
+@@ -34,3 +34,13 @@ const SETTLE_READINGS = 50;
+ export function hearSteady(f: SessionFixture, hz: number): void {
+   for (let i = 0; i < SETTLE_READINGS; i += 1) hear(f, hz);
+ }
++
++// practice.tuner/REQ-003 — the gap rule: advances the fake clock past the
++// session's 300 ms silence timer (domain/session.ts's private
++// TUNER_GAP_MS, mirrored here rather than exported since it is an
++// implementation detail — the existing REQ-003 scenarios advance the same
++// 300 ms inline), clearing the reading back to "Play a note" without
++// touching what was last heard (REQ-004/S7, REQ-009/S3).
++export function letGapPass(f: SessionFixture): void {
++  f.clock.advanceMs(300);
++}
+diff --git a/tests/ui/scenarios/target-sheet.test.tsx b/tests/ui/scenarios/target-sheet.test.tsx
+index ff536dd..d3b2790 100644
+--- a/tests/ui/scenarios/target-sheet.test.tsx
++++ b/tests/ui/scenarios/target-sheet.test.tsx
+@@ -1,7 +1,7 @@
+-import { act, cleanup, screen } from "@testing-library/react";
++import { act, cleanup, screen, waitFor } from "@testing-library/react";
+ import userEvent from "@testing-library/user-event";
+ import { afterEach, expect, test } from "vitest";
+-import { enterAndHear } from "./tuner-helpers";
++import { enterAndHear, enterTuner, letGapPass } from "./tuner-helpers";
+ 
+ // No global `afterEach` in scope (vitest globals are off), so
+ // @testing-library/react's automatic cleanup never registers itself; without
+@@ -95,6 +95,50 @@ test("practice.tuner/REQ-004/S5 — back to auto", async () => {
+   expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
+ });
+ 
++test("practice.tuner/REQ-004/S7 — Hold after the note has stopped", async () => {
++  const f = await enterAndHear(440.0);
++  await letGapPass(f);
++  f.clock.advanceMs(2000);
++  await userEvent.click(screen.getByRole("button", { name: "Target" }));
++  const holdCard = screen.getByRole("button", { name: "Hold" });
++  expect(holdCard.textContent).toContain("A4");
++  expect(holdCard.textContent).toContain("the last note you played");
++  expect(screen.getByTestId("spiral-needle").getAttribute("data-state")).toBe(
++    "last-heard",
++  );
++  expect(screen.queryByTestId("spiral-trail")).toBeNull();
++  await userEvent.click(holdCard);
++  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
++    "TARGETA4",
++  );
++});
++
++test("practice.tuner/REQ-004/S8 — nothing heard yet", async () => {
++  await enterTuner();
++  await userEvent.click(screen.getByRole("button", { name: "Target" }));
++  const holdCard = screen.getByRole("button", { name: "Hold" });
++  expect(holdCard.textContent).toContain("play a note first");
++  expect(screen.queryByTestId("spiral-needle")).toBeNull();
++  await userEvent.click(holdCard);
++  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
++    "auto · nearest",
++  );
++});
++
++test("practice.tuner/REQ-009/S3 — leaving forgets the last note heard", async () => {
++  const f = await enterAndHear(440.0);
++  await letGapPass(f);
++  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
++  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
++  await waitFor(() =>
++    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
++  );
++  await userEvent.click(screen.getByRole("button", { name: "Target" }));
++  const holdCard = screen.getByRole("button", { name: "Hold" });
++  expect(holdCard.textContent).toContain("play a note first");
++  expect(screen.queryByTestId("spiral-needle")).toBeNull();
++});
++
+ test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
+   const f = await enterAndHear(440.0);
+   await userEvent.click(screen.getByRole("button", { name: "Target" }));
+diff --git a/tests/ui/scenarios/transport-card.test.tsx b/tests/ui/scenarios/transport-card.test.tsx
+index 6bba739..b137589 100644
+--- a/tests/ui/scenarios/transport-card.test.tsx
++++ b/tests/ui/scenarios/transport-card.test.tsx
+@@ -48,6 +48,7 @@ const placeholderTuner: TunerSnapshot = {
+   target: { kind: "auto" },
+   targetNote: null,
+   reading: null,
++  lastHeard: null,
+   canStepDown: false,
+   canStepUp: false,
+ };
+diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
+index 05591c1..daf7efa 100644
+--- a/tests/ui/scenarios/tuner-helpers.ts
++++ b/tests/ui/scenarios/tuner-helpers.ts
+@@ -13,13 +13,9 @@ import {
+ } from "../../practice/fakes";
+ 
+ // Shared by tuner-screen.test.tsx (T015) and tuner-stave.test.tsx (T016) —
+-// moved out of tuner-screen.test.tsx once a second file needed it. Renders
+-// <App>, opens the tuner, and feeds one steady pitch through the fake
+-// listening port — `listening.feed(hz)` publishes it, `clock.advanceMs(1)`
+-// runs the session's commit-on-next-tick timer (domain/session.ts's
+-// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
+-// state update. `spelling` optionally taps the circle's ♭ control before
+-// entering (theory.circle-of-fifths/REQ-002, exercised the same way
++// moved out of tuner-screen.test.tsx once a second file needed it.
++// `spelling` optionally taps the circle's ♭ control before entering
++// (theory.circle-of-fifths/REQ-002, exercised the same way
+ // circle-spelling.test.tsx does) so a scenario can ask for flat spelling
+ // without duplicating the render/open dance. `extraProps` lets a scenario
+ // override any of <App>'s own props (e.g. a different catalogue) without
+@@ -28,13 +24,15 @@ import {
+ // Plain `.ts` (not `.tsx`) per the brief — `createElement` stands in for
+ // JSX so the file needs no JSX transform.
+ //
+-// A scenario may call this more than once (tuner-stave.test.tsx's
+-// REQ-005/S3 feeds two separate frequencies to see how the strip writes
+-// each) — `cleanup()` here tears down any previous render first, so a
+-// second call gets a fresh `<App>` rather than a second one stacked beside
+-// it (each test file's own `afterEach(cleanup)` still handles the last one).
+-export async function enterAndHear(
+-  hz: number,
++// The render/open dance shared by enterAndHear (below) and any scenario
++// that needs the tuner listening with nothing heard yet
++// (practice.tuner/REQ-004/S8) — extracted rather than duplicated (the
++// codebase's own convention: see AGENTS.md "Things agents get wrong here").
++// `cleanup()` here tears down any previous render first, so a second call
++// in the same test gets a fresh `<App>` rather than a second one stacked
++// beside it (each test file's own `afterEach(cleanup)` still handles the
++// last one).
++export async function enterTuner(
+   spelling?: "sharp" | "flat",
+   extraProps?: Partial<ComponentProps<typeof App>>,
+ ): Promise<{
+@@ -64,11 +62,42 @@ export async function enterAndHear(
+   await waitFor(() =>
+     expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
+   );
+-  listening.feed(hz);
+-  clock.advanceMs(1);
+-  await act(async () => {});
+   if (session === null) {
+     throw new Error("unreachable: onSessionReady was not called by render()");
+   }
+   return { listening, clock, session };
+ }
++
++// A scenario may call this more than once (tuner-stave.test.tsx's
++// REQ-005/S3 feeds two separate frequencies to see how the strip writes
++// each) — `enterTuner` above tears down any previous render first, so a
++// second call gets a fresh `<App>` rather than a second one stacked beside
++// it (each test file's own `afterEach(cleanup)` still handles the last one).
++export async function enterAndHear(
++  hz: number,
++  spelling?: "sharp" | "flat",
++  extraProps?: Partial<ComponentProps<typeof App>>,
++): Promise<{
++  readonly listening: FakeListening;
++  readonly clock: FakeClock;
++  readonly session: Session;
++}> {
++  const { listening, clock, session } = await enterTuner(spelling, extraProps);
++  listening.feed(hz);
++  clock.advanceMs(1);
++  await act(async () => {});
++  return { listening, clock, session };
++}
++
++// practice.tuner/REQ-004/S7, REQ-009/S3 — advances the fake clock past the
++// 300 ms gap timer (domain/session.ts's private TUNER_GAP_MS, mirrored here
++// the same way tests/practice/tuner-helpers.ts's letGapPass does) and
++// flushes the resulting React update, so a scenario can see what the sheet
++// and spiral show once a reading has cleared but the last note heard is
++// still remembered.
++export async function letGapPass(f: {
++  readonly clock: FakeClock;
++}): Promise<void> {
++  f.clock.advanceMs(300);
++  await act(async () => {});
++}
+```
+
+## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-28)
+
+SPEC: PASS · QUALITY: PASS
+
+- The last note heard is written only where a reading is committed (from `heard.nearest`, the heard note, not the target) and cleared only in `leaveTuner()`; it survives the gap, a hidden page and a failed microphone; no path leaves it stale across entries. `holdTarget()`'s three cases match S1, S7 and S8. `lastHeard` is derived with the spelling and compared by value.
+- The Hold card's three texts are the requirement's, word for word; the greyed needle uses `tuner.ghostInk`, has no trail, and carries `data-state`; no new colour or size.
+- No existing assertion weakened; the two hand-built snapshots gained `lastHeard: null`.
+- [minor, may-defer] the sheet-side S7 test asserts the pill after Hold but not the greyed big name with "Play a note"; the session-side S7 test and REQ-003/S2's test cover the behaviour between them. **Noted for converge.**
+- [minor, may-defer] the report cites a "Test helpers" section the brief does not have; the ripple itself is right.
+
+Reviewer's commands: the five test files 29 passed; `check-contexts.sh` clean; REQ-004/S7, S8 and REQ-009/S3 tested. Controller's `pnpm check` at f11197b: exit 0, 75 files, 321 tests.
+
+<!-- recorded 2026-09-28T21:51:25Z by scripts/record.sh -->
diff --git a/changes/007-hear-me/tasks.md b/changes/007-hear-me/tasks.md
index 7288a9c..ff9361a 100644
--- a/changes/007-hear-me/tasks.md
+++ b/changes/007-hear-me/tasks.md
@@ -1370,7 +1370,7 @@ _Ends with the tuner reachable from the header, grey and correct against 4a / 5c
 > Appended 2026-09-28 by design round 2 (`design/rounds.md`); REQ-004
 > (S7, S8), REQ-009/S3 and REQ-003 amended with the user's approval.
 
-**Status:** todo
+**Status:** done
 
 **Files**
 - Modify: `src/practice/domain/session.ts` (the last note heard, kept from each committed reading, kept through a gap, forgotten on leaving; `holdTarget()` pins it when no reading is showing), `src/practice/domain/tuner.ts` (`TunerSnapshot.lastHeard: Note | null`, spelled per the preference like `targetNote`)
@@ -1390,7 +1390,7 @@ _Ends with the tuner reachable from the header, grey and correct against 4a / 5c
 > user's approval. The length is tried live behind a temporary
 > `?variant=a|b|c` switch (2.5 s, 1.2 s, 0.5 s) and fixed by T030.
 
-**Status:** todo
+**Status:** in-progress
 
 **Files**
 - Modify: `src/ui/TunerScreen.tsx` (the trail keeps each point's time and its run; kept through silence; dropped by age), `src/ui/TunerStave.tsx` (x by age; one path per run; drawn in silence), `src/ui/App.tsx`, `src/ui/main.tsx` (the temporary switch)
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index ba09654..d218668 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -238,9 +238,26 @@ export function App(props: {
   // dev-only `window.__paintAgesMs` the measured harness reads; App stays
   // fully testable without it, as `onSessionReady` does above.
   readonly onPaintAge?: (ageMs: number) => void;
+  // Optional, additive, forwarded straight to TunerScreen (practice.tuner/
+  // REQ-005/S5, S6) — TunerScreen already carries its own real defaults, so
+  // App need only pass these through for a test (or main.tsx's design-loop
+  // switch, T029/T030) to reach them; nothing here reads or resolves them.
+  readonly trailMs?: number;
+  readonly now?: () => number;
+  readonly requestFrame?: (callback: FrameRequestCallback) => number;
+  readonly cancelFrame?: (handle: number) => void;
 }): JSX.Element {
-  const { catalogue, selectionStore, sessionDeps, onSessionReady, onPaintAge } =
-    props;
+  const {
+    catalogue,
+    selectionStore,
+    sessionDeps,
+    onSessionReady,
+    onPaintAge,
+    trailMs,
+    now,
+    requestFrame,
+    cancelFrame,
+  } = props;
   const [selection, setSelection] = useState<Selection>(() =>
     initialSelection(catalogue, selectionStore),
   );
@@ -679,6 +696,10 @@ export function App(props: {
           onClear={handleClearTarget}
           onSpellingChange={handleSelectSpelling}
           onReadingShown={handleReadingShown}
+          {...(trailMs !== undefined ? { trailMs } : {})}
+          {...(now !== undefined ? { now } : {})}
+          {...(requestFrame !== undefined ? { requestFrame } : {})}
+          {...(cancelFrame !== undefined ? { cancelFrame } : {})}
         />
       ) : (
         <>
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index a0d845c..f9bb5f1 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -1,7 +1,9 @@
 import {
   memo,
   useCallback,
+  useEffect,
   useLayoutEffect,
+  useReducer,
   useRef,
   useState,
   type JSX,
@@ -12,20 +14,41 @@ import { TargetPill } from "./TargetPill";
 import { TargetSheet } from "./TargetSheet";
 import { fonts, paper } from "./theme";
 import { TunerLevel } from "./TunerLevel";
-import { TunerStave } from "./TunerStave";
+import { TRAIL_MS, TunerStave, type TrailPoint } from "./TunerStave";
 
-// practice.tuner/REQ-005 — the strip's 2.5 s trail is the last 50 readings,
-// oldest first (T016's brief).
-const TRAIL_CAPACITY = 50;
+// Real defaults for the trail's injectable clock and frame scheduler
+// (practice.tuner/REQ-005/S5, S6) — wrapped rather than passed by reference
+// so neither depends on being called with `this === performance`/`window`.
+function defaultNow(): number {
+  return performance.now();
+}
+function defaultRequestFrame(callback: FrameRequestCallback): number {
+  return requestAnimationFrame(callback);
+}
+function defaultCancelFrame(handle: number): void {
+  cancelAnimationFrame(handle);
+}
 
-function appendToTrail(
-  trail: readonly NoteJudged[],
+function appendTrailPoint(
+  trail: readonly TrailPoint[],
   reading: NoteJudged,
-): readonly NoteJudged[] {
-  const appended = [...trail, reading];
-  return appended.length > TRAIL_CAPACITY
-    ? appended.slice(appended.length - TRAIL_CAPACITY)
-    : appended;
+  atMs: number,
+  runId: number,
+  trailMs: number,
+): readonly TrailPoint[] {
+  return prunedByAge([...trail, { reading, atMs, runId }], atMs, trailMs);
+}
+
+// Drops points older than `trailMs` relative to `nowMs` — called both when
+// a fresh reading is appended (bounding the trail's memory while sounding)
+// and on every silent render (this is what lets the animation stop: once
+// this returns `[]` there is nothing left to re-draw).
+function prunedByAge(
+  trail: readonly TrailPoint[],
+  nowMs: number,
+  trailMs: number,
+): readonly TrailPoint[] {
+  return trail.filter((point) => nowMs - point.atMs <= trailMs);
 }
 
 // The header row — copied verbatim from the vendored visual reference
@@ -109,6 +132,9 @@ const SPELLING_INACTIVE_INK = "#756c60";
 const SHARP_GLYPH = "♯";
 const FLAT_GLYPH = "♭";
 
+// the spiral's needle trail: the newest 50 readings of the current run
+const SPIRAL_TRAIL_READINGS = 50;
+
 // practice.tuner/REQ-001 — "LISTENING" covers both "starting" (the
 // microphone has been asked for but capture has not begun yet) and
 // "listening" itself; only "cannot-hear" reads "NO MIC" (REQ-007). The
@@ -134,6 +160,14 @@ function TunerScreenComponent(props: {
   readonly onClear: () => void;
   readonly onSpellingChange: (preference: SpellingPreference) => void;
   readonly onReadingShown: (atFrame: number) => void;
+  // practice.tuner/REQ-005/S5, S6 — the trail's length and its injectable
+  // clock/frame scheduler; all optional with real defaults (T029's brief)
+  // so a test can drive the trail's ageing without depending on wall-clock
+  // time, and production code never has to pass any of them.
+  readonly trailMs?: number;
+  readonly now?: () => number;
+  readonly requestFrame?: (callback: FrameRequestCallback) => number;
+  readonly cancelFrame?: (handle: number) => void;
 }): JSX.Element {
   const {
     tuner,
@@ -146,6 +180,10 @@ function TunerScreenComponent(props: {
     onClear,
     onSpellingChange,
     onReadingShown,
+    trailMs = TRAIL_MS,
+    now = defaultNow,
+    requestFrame = defaultRequestFrame,
+    cancelFrame = defaultCancelFrame,
   } = props;
   const listening = isListening(tuner);
   const cannotHear = tuner.listening.kind === "cannot-hear";
@@ -176,26 +214,90 @@ function TunerScreenComponent(props: {
     [onPin],
   );
 
-  // The strip's trail (practice.tuner/REQ-005) — a ring of the last 50
-  // NoteJudged, oldest first, kept here (not in the session) so it is pure
-  // view state: appended whenever `tuner.reading` becomes a genuinely new
-  // reading (a fresh object each commit — domain/session.ts's
-  // `commitTunerReading`), reset on a gap ("Play a note" — REQ-003/S3) or on
-  // leaving the tuner (this component unmounts, discarding the ref, since
-  // App only renders it while `screen === "tuner"`). Mutated directly during
-  // render, not in an effect, because the trail this render hands to
-  // TunerStave must already include the reading this same render just
-  // received.
-  const trailRef = useRef<readonly NoteJudged[]>([]);
+  // The strip's trail (practice.tuner/REQ-005/S5, S6) — points of the last
+  // `trailMs`, kept here (not in the session) so it is pure view state:
+  // appended whenever `tuner.reading` becomes a genuinely new reading (a
+  // fresh object each commit — domain/session.ts's `commitTunerReading`),
+  // kept (not reset) on a gap ("Play a note" — REQ-003/S3) so it can carry
+  // on ageing off the left edge, reset only by leaving the tuner (this
+  // component unmounts, discarding the ref, since App only renders it while
+  // `screen === "tuner"`). Mutated directly during render, not in an
+  // effect, because the trail this render hands to TunerStave must already
+  // include the reading this same render just received (while sounding) or
+  // the age-pruning this same render must reflect (while silent).
+  const trailRef = useRef<readonly TrailPoint[]>([]);
   const lastReadingRef = useRef<NoteJudged | null>(null);
+  // Whether the *previous* render was silent — this is the run boundary:
+  // a reading that arrives right after this was true starts a new run
+  // (REQ-005/S6), never joined to whatever the trail already carried.
+  // Starts `true` so the very first reading ever heard begins run 1.
+  const wasSilentRef = useRef(true);
+  const runIdRef = useRef(0);
+  // The pending frame silence redraws with (below) — a ref, not state,
+  // since scheduling it is a side effect, not something this render reads.
+  const frameHandleRef = useRef<number | null>(null);
+  const [, forceTrailRedraw] = useReducer((tick: number) => tick + 1, 0);
+
+  let nowMs: number;
   if (tuner.reading === null) {
-    trailRef.current = [];
+    wasSilentRef.current = true;
     lastReadingRef.current = null;
+    nowMs = now();
+    trailRef.current = prunedByAge(trailRef.current, nowMs, trailMs);
   } else if (tuner.reading !== lastReadingRef.current) {
+    const atMs = now();
+    if (wasSilentRef.current) runIdRef.current += 1;
+    wasSilentRef.current = false;
     lastReadingRef.current = tuner.reading;
-    trailRef.current = appendToTrail(trailRef.current, tuner.reading);
+    trailRef.current = appendTrailPoint(
+      trailRef.current,
+      tuner.reading,
+      atMs,
+      runIdRef.current,
+      trailMs,
+    );
+    nowMs = atMs;
+  } else {
+    // A re-render with nothing new while sounding — "now" stays the
+    // newest point's own time (no animation while a note sounds).
+    const newest = trailRef.current.at(-1);
+    nowMs = newest === undefined ? now() : newest.atMs;
   }
 
+  // practice.tuner/REQ-005/S5 — redraw the trail while it is still ageing
+  // in silence, and only then: scheduled/cancelled after every render since
+  // the condition depends on `trailRef.current`, a ref this render's own
+  // pruning above just mutated, not on anything already tracked as a
+  // dependency. Runs on the phone, on battery — never while a note sounds,
+  // and stops for good once the trail has emptied.
+  useEffect(() => {
+    const shouldAnimate = tuner.reading === null && trailRef.current.length > 0;
+    if (shouldAnimate) {
+      if (frameHandleRef.current === null) {
+        frameHandleRef.current = requestFrame(() => {
+          frameHandleRef.current = null;
+          forceTrailRedraw();
+        });
+      }
+    } else if (frameHandleRef.current !== null) {
+      cancelFrame(frameHandleRef.current);
+      frameHandleRef.current = null;
+    }
+    return () => {
+      if (frameHandleRef.current !== null) {
+        cancelFrame(frameHandleRef.current);
+        frameHandleRef.current = null;
+      }
+    };
+  });
+
+  // Current run only, newest 50 readings; the spiral draws it only while
+  // a note sounds (REQ-005/S6).
+  const spiralTrail = trailRef.current
+    .filter((point) => point.runId === runIdRef.current)
+    .slice(-SPIRAL_TRAIL_READINGS)
+    .map((point) => point.reading);
+
   // practice.tuner/REQ-006 — the paint is reported once per distinct
   // reading, right after React has committed it (useLayoutEffect, not
   // useEffect, so the report reflects this exact commit rather than a
@@ -293,7 +395,12 @@ function TunerScreenComponent(props: {
         onClear={onClear}
       />
       <div style={{ padding: "10px 16px 0" }}>
-        <TunerStave tuner={tuner} trail={trailRef.current} />
+        <TunerStave
+          tuner={tuner}
+          trail={trailRef.current}
+          nowMs={nowMs}
+          trailMs={trailMs}
+        />
       </div>
       {cannotHear && (
         <div
@@ -401,7 +508,7 @@ function TunerScreenComponent(props: {
         tuner={tuner}
         spelling={spelling}
         range={range}
-        trail={trailRef.current}
+        trail={spiralTrail}
         onClose={handleCloseTarget}
         onAuto={handleAuto}
         onHold={handleHold}
diff --git a/src/ui/TunerStave.tsx b/src/ui/TunerStave.tsx
index 56bc2e5..89fcf93 100644
--- a/src/ui/TunerStave.tsx
+++ b/src/ui/TunerStave.tsx
@@ -208,6 +208,32 @@ const TRAIL_X_END = 140;
 const TRAIL_STROKE_WIDTH = 2.2;
 const TRAIL_GRADIENT_ID = "tuner-stave-trail-fade";
 
+// practice.tuner/REQ-005 — the trail's default length in time: age 0 sits
+// at TRAIL_X_END (the head), age TRAIL_MS sits at TRAIL_X_START, linear in
+// between (trailXOf below). The design-loop switch (main.tsx, T029/T030)
+// overrides this by passing a `trailMs` prop through App and TunerScreen;
+// this is only the default when none is passed.
+export const TRAIL_MS = 2500;
+
+// A trail point remembers the reading it came from, when it was taken (an
+// injectable clock — TunerScreen owns it, never a raw `Date.now()`/
+// `performance.now()` call here), and which unbroken run of readings it
+// belongs to — a new run starts whenever a reading arrives after the
+// reading had been cleared (silence), so two runs are never drawn joined by
+// a line (REQ-005/S6).
+export interface TrailPoint {
+  readonly reading: NoteJudged;
+  readonly atMs: number;
+  readonly runId: number;
+}
+
+// x by age: age 0 (the newest point) sits at TRAIL_X_END, age trailMs sits
+// at TRAIL_X_START; a point older than trailMs (a negative or >TRAIL_X_END-
+// clamped x) is filtered out where `trailRenderPoints` is built, below.
+function trailXOf(age: number, trailMs: number): number {
+  return TRAIL_X_END - (age / trailMs) * (TRAIL_X_END - TRAIL_X_START);
+}
+
 const COLUMN_LEFT = 214;
 const COLUMN_RIGHT = 12;
 const COLUMN_TOP = 30;
@@ -285,14 +311,23 @@ function referenceNoteOf(
 
 // The treble stave strip (practice.tuner/REQ-005): the heard note as a
 // drifting whole-note head along a dotted guide, its cents, a trail of the
-// last 2.5 s (the last 50 readings TunerScreen keeps), the pinned target as
-// a grey head to the right, 8va/8vb/15ma/15mb past the ledger range, and
-// the HEARD / "<note> IS" Hz column.
+// last `trailMs` by TIME (x by age, oldest first, dropped past `trailMs`),
+// the pinned target as a grey head to the right, 8va/8vb/15ma/15mb past the
+// ledger range, and the HEARD / "<note> IS" Hz column. WHILE nothing is
+// heard the head/cents/Hz clear as before but the trail carries on moving
+// left, each run its own sub-path so a new run is never joined to the one
+// silence left behind (S5, S6).
 export function TunerStave(props: {
   readonly tuner: TunerSnapshot;
-  readonly trail: readonly NoteJudged[];
+  readonly trail: readonly TrailPoint[];
+  // The instant age is measured from: the newest reading's own time while
+  // one is sounding (so a live render needs no clock read of its own), or
+  // TunerScreen's injectable "now" while silent and the trail is still
+  // aging (TunerScreen's own rAF-driven re-renders keep advancing it).
+  readonly nowMs: number;
+  readonly trailMs: number;
 }): JSX.Element {
-  const { tuner: snapshot, trail } = props;
+  const { tuner: snapshot, trail, nowMs, trailMs } = props;
   const reading = snapshot.reading;
   const targetNote = snapshot.targetNote;
 
@@ -302,6 +337,22 @@ export function TunerStave(props: {
   const referenceRawIndex = referenceRawIndexOf(targetNote, reading);
   const adj = referenceRawIndex === null ? 0 : registerAdjOf(referenceRawIndex);
 
+  // The trail's own register decision: `adj` above whenever something
+  // governs it (a target, or the live reading — the same value while
+  // sounding, matching today); in silence with no target, there is no
+  // current reading to fall back on, so the newest trail point's own heard
+  // note stands in instead (practice.tuner/REQ-005's amendment) rather than
+  // the trail snapping to the un-shifted register.
+  const newestTrailPoint = trail.length > 0 ? trail[trail.length - 1]! : null;
+  const trailReferenceRawIndex =
+    referenceRawIndex !== null
+      ? referenceRawIndex
+      : newestTrailPoint === null
+        ? null
+        : diatonicIndex(newestTrailPoint.reading.heard.nearest);
+  const trailAdj =
+    trailReferenceRawIndex === null ? 0 : registerAdjOf(trailReferenceRawIndex);
+
   const heard =
     reading === null
       ? null
@@ -320,19 +371,51 @@ export function TunerStave(props: {
       ? targetMarkY(target.position.mark, target.position.y)
       : null;
 
+  // practice.tuner/REQ-005/S5 — the strip's vertical centring (`shift`,
+  // below) must not jump the instant a note stops: while a reading shows,
+  // this is simply `heard`; once it clears, as long as the trail is still
+  // drawn the newest trail point's own placement (at the same `trailAdj`
+  // the trail itself is drawn with) stands in, so `tops`/`bots` keep seeing
+  // the same shape of contribution across the note stopping. Once the
+  // trail has emptied too, this is `null` and the layout falls back to the
+  // stave-lines-only baseline, exactly as an empty reading always did.
+  const layoutHeard =
+    heard !== null
+      ? heard
+      : newestTrailPoint === null
+        ? null
+        : placeHeard(
+            newestTrailPoint.reading.heard.nearest,
+            newestTrailPoint.reading.heard.cents,
+            trailAdj,
+          );
+  const layoutHeardMarkY =
+    layoutHeard !== null && layoutHeard.position.mark !== ""
+      ? octaveMarkY(
+          layoutHeard.position.mark,
+          layoutHeard.position.y,
+          layoutHeard.hy,
+        )
+      : null;
+
   // Centre whatever is drawn (clef, lines, heads, ledgers, labels) in the
   // 144-tall card; top-align if it can't fit — the design's own pass
   // (lines 1271-1279), reproduced with our simplified single-clef model.
   const tops: number[] = [82];
   const bots: number[] = [136];
-  let centsTop: number | null = null;
-  if (heard !== null) {
-    centsTop = Math.min(heard.position.y, heard.hy) - CENTS_TOP_OFFSET;
-    tops.push(centsTop, heard.hy - 8);
-    bots.push(heard.hy + 8, heard.position.y + 8);
-    if (heardMarkY !== null) {
-      tops.push(heardMarkY);
-      bots.push(heardMarkY + OCTAVE_MARK_HEIGHT);
+  const centsTop =
+    heard !== null
+      ? Math.min(heard.position.y, heard.hy) - CENTS_TOP_OFFSET
+      : null;
+  if (layoutHeard !== null) {
+    tops.push(
+      Math.min(layoutHeard.position.y, layoutHeard.hy) - CENTS_TOP_OFFSET,
+      layoutHeard.hy - 8,
+    );
+    bots.push(layoutHeard.hy + 8, layoutHeard.position.y + 8);
+    if (layoutHeardMarkY !== null) {
+      tops.push(layoutHeardMarkY);
+      bots.push(layoutHeardMarkY + OCTAVE_MARK_HEIGHT);
     }
   }
   if (target !== null) {
@@ -348,30 +431,46 @@ export function TunerStave(props: {
   const shift =
     bot - top > CARD_HEIGHT - 16 ? 8 - top : CARD_HEIGHT / 2 - (top + bot) / 2;
 
-  // x runs from TRAIL_X_START (oldest, index 0) to TRAIL_X_END (newest, the
-  // last entry) — only meaningful with at least two points, so the branch
-  // above already guarantees `trail.length - 1` is never zero here.
-  const trailPoints =
-    heard === null || trail.length < 2
-      ? []
-      : trail.map((entry, index) => {
-          // The whole trail is drawn with the current reading's own `adj`
-          // (not a fresh register decision per point) so it never jumps
-          // mid-trail as a historical point crosses a register threshold on
-          // its own — matching the design's own `p.tot` applied uniformly
-          // across `hist` (lines 1257-1264).
-          const placement = placeHeard(
-            entry.heard.nearest,
-            entry.heard.cents,
-            adj,
-          );
-          const x =
-            TRAIL_X_START +
-            index * ((TRAIL_X_END - TRAIL_X_START) / (trail.length - 1));
-          return `${x} ${placement.hy}`;
-        });
-  const trailPath =
-    trailPoints.length > 1 ? `M ${trailPoints.join(" L ")}` : null;
+  // x by age (practice.tuner/REQ-005/S5, S6) — each point placed by how old
+  // it is relative to `nowMs` (age 0 at TRAIL_X_END, `trailMs` at
+  // TRAIL_X_START), points older than `trailMs` dropped; the whole trail is
+  // drawn with `trailAdj` (not a fresh register decision per point) so it
+  // never jumps mid-trail as a historical point crosses a register
+  // threshold on its own — matching the design's own `p.tot` applied
+  // uniformly across `hist` (lines 1257-1264).
+  const trailRenderPoints = trail
+    .map((point) => ({
+      x: trailXOf(nowMs - point.atMs, trailMs),
+      y: placeHeard(
+        point.reading.heard.nearest,
+        point.reading.heard.cents,
+        trailAdj,
+      ).hy,
+      runId: point.runId,
+    }))
+    .filter((point) => point.x >= TRAIL_X_START && point.x <= TRAIL_X_END);
+
+  // One sub-path per run (S6) — a run with a single point draws nothing for
+  // that run; runs are concatenated with a space so `path`'s single `d`
+  // never joins two runs with a line.
+  const runSubpaths: string[] = [];
+  let currentRunId: number | null = null;
+  let currentRunCoords: string[] = [];
+  const flushCurrentRun = (): void => {
+    if (currentRunCoords.length > 1) {
+      runSubpaths.push(`M ${currentRunCoords.join(" L ")}`);
+    }
+  };
+  for (const point of trailRenderPoints) {
+    if (point.runId !== currentRunId) {
+      flushCurrentRun();
+      currentRunId = point.runId;
+      currentRunCoords = [];
+    }
+    currentRunCoords.push(`${point.x} ${point.y}`);
+  }
+  flushCurrentRun();
+  const trailPath = runSubpaths.length > 0 ? runSubpaths.join(" ") : null;
 
   const referenceNote = referenceNoteOf(reading, targetNote);
   const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
@@ -503,39 +602,45 @@ export function TunerStave(props: {
                 strokeWidth={GUIDE_STROKE_WIDTH}
                 strokeDasharray={GUIDE_DASH}
               />
-              {trailPath !== null && (
-                <path
-                  data-testid="trail"
-                  d={trailPath}
-                  fill="none"
-                  stroke={`url(#${TRAIL_GRADIENT_ID})`}
-                  strokeWidth={TRAIL_STROKE_WIDTH}
-                  strokeLinecap="round"
-                  strokeLinejoin="round"
-                />
-              )}
-              <g
-                data-testid="heard-head"
-                style={{ transform: `translateY(${pxValue(heard.hy)})` }}
-              >
-                <ellipse
-                  cx={HEARD_X}
-                  cy={0}
-                  rx={HEAD_RX}
-                  ry={HEAD_RY}
-                  fill={tone}
-                />
-                <ellipse
-                  cx={HEARD_X}
-                  cy={0}
-                  rx={HEAD_INNER_RX}
-                  ry={HEAD_INNER_RY}
-                  transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${HEARD_X} 0)`}
-                  fill={paper.card}
-                />
-              </g>
             </>
           )}
+          {/* practice.tuner/REQ-005/S5 — drawn on its own condition, not
+              nested under `heard !== null`: the trail keeps moving while
+              nothing is heard, well after the head/ledgers/guide above have
+              gone. */}
+          {trailPath !== null && (
+            <path
+              data-testid="trail"
+              d={trailPath}
+              fill="none"
+              stroke={`url(#${TRAIL_GRADIENT_ID})`}
+              strokeWidth={TRAIL_STROKE_WIDTH}
+              strokeLinecap="round"
+              strokeLinejoin="round"
+            />
+          )}
+          {heard !== null && (
+            <g
+              data-testid="heard-head"
+              style={{ transform: `translateY(${pxValue(heard.hy)})` }}
+            >
+              <ellipse
+                cx={HEARD_X}
+                cy={0}
+                rx={HEAD_RX}
+                ry={HEAD_RY}
+                fill={tone}
+              />
+              <ellipse
+                cx={HEARD_X}
+                cy={0}
+                rx={HEAD_INNER_RX}
+                ry={HEAD_INNER_RY}
+                transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${HEARD_X} 0)`}
+                fill={paper.card}
+              />
+            </g>
+          )}
         </svg>
         <div
           style={{
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 417a2f2..e619d73 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -112,6 +112,25 @@ exposeSoundForTiming(sound);
 const listening = webAudioListening(audioContext);
 exposeListeningForTiming(listening);
 
+// design-loop variant (007 round 3)
+// The tuner strip's trail length is being tried live on the phone
+// (practice.tuner/REQ-005's amendment) via `?variant=a|b|c`; anything else,
+// including no parameter, is the requirement's own 2.5 s. T030 removes this
+// switch once the user has chosen a length.
+function trailMsFromVariant(search: URLSearchParams): number {
+  switch (search.get("variant")) {
+    case "a":
+      return 2500;
+    case "b":
+      return 1200;
+    case "c":
+      return 550;
+    default:
+      return 2500;
+  }
+}
+const trailMs = trailMsFromVariant(new URLSearchParams(window.location.search));
+
 createRoot(rootElement).render(
   <StrictMode>
     <App
@@ -129,6 +148,7 @@ createRoot(rootElement).render(
         exposeNoteJudgedForTiming(session);
       }}
       onPaintAge={collectPaintAge}
+      trailMs={trailMs}
     />
   </StrictMode>,
 );
diff --git a/tests/ui/scenarios/target-sheet.test.tsx b/tests/ui/scenarios/target-sheet.test.tsx
index d3b2790..199fcc2 100644
--- a/tests/ui/scenarios/target-sheet.test.tsx
+++ b/tests/ui/scenarios/target-sheet.test.tsx
@@ -150,3 +150,29 @@ test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
   await userEvent.click(screen.getByRole("button", { name: "Close" }));
   expect(f.listening.stopCalls).toBe(0);
 });
+
+test("practice.tuner/REQ-004 — the spiral's needle trail keeps the newest 50 readings", async () => {
+  const f = await enterAndHear(440.0);
+
+  // Feed 59 more readings to get 60 total
+  for (let i = 0; i < 59; i++) {
+    f.listening.feed(440.0);
+    f.clock.advanceMs(1);
+    await act(async () => {});
+  }
+
+  // Open the Target sheet
+  await userEvent.click(screen.getByRole("button", { name: "Target" }));
+
+  // Read the spiral-trail element
+  const spiralTrail = screen.getByTestId("spiral-trail");
+  const pathD = spiralTrail.getAttribute("d");
+  expect(pathD).toBeTruthy();
+
+  // Count points by splitting on " L "
+  const points = pathD!.split(" L ");
+
+  // Should have at most 50 points and at least 2
+  expect(points.length).toBeLessThanOrEqual(50);
+  expect(points.length).toBeGreaterThanOrEqual(2);
+});
diff --git a/tests/ui/scenarios/tuner-helpers.ts b/tests/ui/scenarios/tuner-helpers.ts
index daf7efa..6dc40bb 100644
--- a/tests/ui/scenarios/tuner-helpers.ts
+++ b/tests/ui/scenarios/tuner-helpers.ts
@@ -101,3 +101,56 @@ export async function letGapPass(f: {
   f.clock.advanceMs(300);
   await act(async () => {});
 }
+
+// practice.tuner/REQ-005/S5, S6 — the trail's own clock is TunerScreen's
+// injectable `now`/`requestFrame`/`cancelFrame` (not the session's own
+// `FakeClock` above, which drives the *session's* gap timer only, and never
+// wall-clock time). A manual, single-slot scheduler: at most one callback is
+// ever pending (matching `requestAnimationFrame`'s own one-shot contract),
+// `runFrame()` invokes it synchronously (wrap in `act()` — it triggers a
+// `setState`) and reports whether one was actually pending, and `pending`
+// lets a scenario assert the loop is/isn't running without inspecting
+// TunerScreen's own internals.
+export function manualAnimationClock(startMs = 0): {
+  readonly now: () => number;
+  readonly requestFrame: (callback: FrameRequestCallback) => number;
+  readonly cancelFrame: (handle: number) => void;
+  readonly advanceMs: (deltaMs: number) => void;
+  readonly runFrame: () => boolean;
+  readonly pending: boolean;
+} {
+  let ms = startMs;
+  let nextId = 1;
+  let pendingId: number | null = null;
+  let pendingCallback: FrameRequestCallback | null = null;
+  return {
+    now: () => ms,
+    requestFrame: (callback) => {
+      const id = nextId;
+      nextId += 1;
+      pendingId = id;
+      pendingCallback = callback;
+      return id;
+    },
+    cancelFrame: (handle) => {
+      if (handle === pendingId) {
+        pendingId = null;
+        pendingCallback = null;
+      }
+    },
+    advanceMs: (deltaMs) => {
+      ms += deltaMs;
+    },
+    runFrame: () => {
+      const callback = pendingCallback;
+      pendingId = null;
+      pendingCallback = null;
+      if (callback === null) return false;
+      callback(ms);
+      return true;
+    },
+    get pending() {
+      return pendingCallback !== null;
+    },
+  };
+}
diff --git a/tests/ui/scenarios/tuner-stave.test.tsx b/tests/ui/scenarios/tuner-stave.test.tsx
index f5eeba5..6fac2a1 100644
--- a/tests/ui/scenarios/tuner-stave.test.tsx
+++ b/tests/ui/scenarios/tuner-stave.test.tsx
@@ -1,6 +1,25 @@
 import { act, cleanup, screen } from "@testing-library/react";
 import { afterEach, expect, test } from "vitest";
-import { enterAndHear } from "./tuner-helpers";
+import {
+  enterAndHear,
+  enterTuner,
+  letGapPass,
+  manualAnimationClock,
+} from "./tuner-helpers";
+
+// TunerStave.tsx's own TRAIL_X_START/TRAIL_X_END (practice.tuner/REQ-005) —
+// replicated here as the tests elsewhere in this file already replicate the
+// strip's other geometry (`translateY(109.6px)` etc.) rather than importing
+// a view's internals.
+const TRAIL_X_START = 52;
+const TRAIL_X_END = 140;
+
+function xsOf(pathD: string): readonly number[] {
+  return pathD
+    .split(/M |L /)
+    .filter((chunk) => chunk.trim() !== "")
+    .map((chunk) => Number(chunk.trim().split(" ")[0]));
+}
 
 // No global `afterEach` in scope (vitest globals are off), so
 // @testing-library/react's automatic cleanup never registers itself; without
@@ -68,16 +87,148 @@ test("practice.tuner/REQ-005/S4 — the target beside the heard note", async ()
   expect(screen.getByText("A4 IS")).toBeTruthy();
 });
 
-test("practice.tuner/REQ-005 — the trail keeps the last 50 readings, oldest first", async () => {
-  const f = await enterAndHear(440.0);
-  for (let k = 0; k < 60; k += 1) {
-    f.listening.feed(440.0 + k * 0.1);
+// practice.tuner/REQ-005's amendment (design round 3): the trail is no
+// longer a fixed count of readings but the last 2.5 s by TIME, x placed by
+// age — replaces the old "the last 50 readings" rule this test used to
+// state (a change of rule the requirement itself approved, not a loosened
+// assertion).
+test("practice.tuner/REQ-005 — the trail keeps the last 2.5 s, oldest first, placed by age", async () => {
+  const animClock = manualAnimationClock();
+  const f = await enterTuner(undefined, {
+    now: animClock.now,
+    requestFrame: animClock.requestFrame,
+    cancelFrame: animClock.cancelFrame,
+  });
+  const READING_INTERVAL_MS = 50; // ~20/s — well below the tuner's own ~93/s, but all that matters here is spanning well past the 2.5 s trail
+  const READINGS = 80; // 4 s of simulated clock time
+  for (let k = 0; k < READINGS; k += 1) {
+    f.listening.feed(440.0 + k * 0.01);
+    f.clock.advanceMs(1);
+    await act(async () => {});
+    animClock.advanceMs(READING_INTERVAL_MS);
+  }
+  const xs = xsOf(screen.getByTestId("trail").getAttribute("d")!);
+  // Fewer points than readings sent: the oldest aged out past the 2.5 s
+  // trail rather than accumulating forever.
+  expect(xs.length).toBeGreaterThan(0);
+  expect(xs.length).toBeLessThan(READINGS);
+  // Oldest first, newest at the head (age 0 sits at TRAIL_X_END), each
+  // successive point further right (younger) than the one before — x is
+  // placed by age, not by a fixed per-point spacing — and never further
+  // left than TRAIL_X_START (an older point is dropped, not drawn off the
+  // strip's own start).
+  expect(xs.at(-1)).toBeCloseTo(TRAIL_X_END, 1);
+  expect(xs[0]).toBeGreaterThanOrEqual(TRAIL_X_START);
+  for (let i = 1; i < xs.length; i += 1) {
+    expect(xs[i]).toBeGreaterThan(xs[i - 1]!);
+  }
+});
+
+test("practice.tuner/REQ-005/S5 — the trail outlives the note", async () => {
+  const animClock = manualAnimationClock();
+  const f = await enterTuner(undefined, {
+    now: animClock.now,
+    requestFrame: animClock.requestFrame,
+    cancelFrame: animClock.cancelFrame,
+  });
+  // "Hear A4 for about a second of clock time" — three readings spanning
+  // 0..1000 ms of the trail's own clock.
+  for (let reading = 0; reading < 3; reading += 1) {
+    f.listening.feed(440.0);
     f.clock.advanceMs(1);
     await act(async () => {});
+    animClock.advanceMs(500);
   }
-  expect(
-    screen.getByTestId("trail").getAttribute("d")!.split(" L "),
-  ).toHaveLength(50);
+  await letGapPass(f); // the session's own 300 ms gap — the reading clears
+  expect(screen.queryByTestId("heard-head")).toBeNull();
+  expect(screen.queryByTestId("strip-cents")).toBeNull();
+  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
+  const xsAtStop = xsOf(screen.getByTestId("trail").getAttribute("d")!);
+  expect(xsAtStop.length).toBe(3);
+
+  // "Advance one second and let a frame run."
+  expect(animClock.pending).toBe(true); // the silence loop is already running
+  animClock.advanceMs(1000);
+  act(() => {
+    animClock.runFrame();
+  });
+  expect(screen.queryByTestId("heard-head")).toBeNull();
+  expect(screen.queryByTestId("strip-cents")).toBeNull();
+  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
+  const xsAfterOneMore = xsOf(screen.getByTestId("trail").getAttribute("d")!);
+  expect(screen.getByTestId("trail")).toBeTruthy();
+  expect(xsAfterOneMore.length).toBe(xsAtStop.length); // nothing added
+  expect(Math.max(...xsAfterOneMore)).toBeLessThan(Math.max(...xsAtStop)); // further left
+
+  // Past the trail's length in time (2.5 s default) since the note stopped.
+  expect(animClock.pending).toBe(true); // still ageing, still redrawing
+  animClock.advanceMs(3000);
+  act(() => {
+    animClock.runFrame();
+  });
+  expect(screen.queryByTestId("trail")).toBeNull();
+  expect(animClock.pending).toBe(false); // no further frame requested
+});
+
+test("practice.tuner/REQ-005/S6 — a new note does not join the old trail", async () => {
+  const animClock = manualAnimationClock();
+  const f = await enterTuner(undefined, {
+    now: animClock.now,
+    requestFrame: animClock.requestFrame,
+    cancelFrame: animClock.cancelFrame,
+  });
+  f.listening.feed(440.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  animClock.advanceMs(300);
+  f.listening.feed(440.0);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  await letGapPass(f); // A4's trail is now moving left in silence
+
+  animClock.advanceMs(400);
+  act(() => {
+    animClock.runFrame();
+  }); // let the old trail actually move before C5 arrives
+  const oldXsBefore = xsOf(screen.getByTestId("trail").getAttribute("d")!);
+
+  animClock.advanceMs(200);
+  f.listening.feed(523.25); // C5
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  animClock.advanceMs(50);
+  f.listening.feed(523.25);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+
+  const d = screen.getByTestId("trail").getAttribute("d")!;
+  expect(d.match(/M /g)?.length).toBe(2); // two sub-paths — two runs
+  const runs = d.split(/(?=M )/).map((run) => xsOf(run));
+  expect(runs).toHaveLength(2);
+  const [oldRun, newRun] = runs;
+  expect(oldRun!.length).toBe(oldXsBefore.length);
+  for (let i = 0; i < oldRun!.length; i += 1) {
+    expect(oldRun![i]).toBeLessThan(oldXsBefore[i]!); // the old run carried on leftward
+  }
+  expect(newRun!.at(-1)).toBeCloseTo(TRAIL_X_END, 1); // the newest point is at the head
+});
+
+test("practice.tuner/REQ-005 — the frame loop never runs while a note sounds, and stops once the trail is empty", async () => {
+  const animClock = manualAnimationClock();
+  const f = await enterAndHear(440.0, undefined, {
+    now: animClock.now,
+    requestFrame: animClock.requestFrame,
+    cancelFrame: animClock.cancelFrame,
+  });
+  expect(animClock.pending).toBe(false); // sounding — no frame requested
+  await letGapPass(f); // silence begins
+  expect(animClock.pending).toBe(true); // now the trail is ageing on its own
+  animClock.advanceMs(3000); // past the 2.5 s default trail
+  act(() => {
+    animClock.runFrame();
+  });
+  expect(screen.queryByTestId("trail")).toBeNull();
+  expect(animClock.pending).toBe(false); // stopped once the trail emptied
 });
 
 test('practice.tuner/REQ-005 — nothing referenced reads "— IS" over "—"', async () => {
```

## Verdict (attempt 1, task-reviewer on sonnet, 2026-09-28)

SPEC: PASS · QUALITY: PASS

- Placement by age is linear from `TRAIL_X_END` to `TRAIL_X_START`; while a note sounds "now" is the newest point's time and no frame is scheduled; in silence "now" is the clock. The redraw effect runs after every render but is a property check; StrictMode's double render cannot double a run id or a point.
- Runs: one sub-path each, a run of one point draws nothing, two runs never joined.
- Vertical placement traced by hand for A4 and for E2 under 8vb with a target pinned: the last sounding render and the first silent render place the trail identically.
- The head, cents and Hz clear in silence as before. The clock and frame scheduler are optional props with real defaults; production passes only `trailMs`.
- The switch is confined to `main.tsx`; the default is 2500 ms.
- [minor, may-defer] the replacement test "the trail keeps the last 2.5 s, oldest first, placed by age" feeds a reading every 50 ms, so its count bound would also pass a 50-point cap; S5 and S6 do discriminate. **Noted for converge.**
- [minor, may-defer] the trail turns grey (`paper.faint`) the instant the reading clears — an existing variable now visible in silence; no requirement speaks to it. **Put to the user; left as built.**
- [minor] S5 and S6 were not run against the old code (a sandbox denial); traced by hand, both would fail there at `getByTestId("trail")`.

Fix round before review (haiku): the trail handed to the spiral capped at the newest 50 readings of the current run (`SPIRAL_TRAIL_READINGS`), with a test that showed 60 points before the change.

Reviewer's commands: `pnpm vitest run tests/ui` 24 files, 126 tests; `check-contexts.sh` clean; scenario gaps 0; `pnpm check` exit 0, 75 files, 325 tests.

<!-- recorded 2026-09-28T22:16:07Z by scripts/record.sh -->
