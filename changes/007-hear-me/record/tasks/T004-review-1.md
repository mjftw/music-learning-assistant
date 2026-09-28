---
type: Task Review
title: Review package — T004 · 007-hear-me
description: The diff produced for T004, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T004.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T004.md
  - resource: git:09031aab16eb49773abeb90c6bcbe47c7f63bdf8..09031aab16eb49773abeb90c6bcbe47c7f63bdf8
generated:
  by: process:review-package.sh
  at: 2026-09-28T07:28:22Z
sdd_id: 007-hear-me
---

# Review package — T004 · 007-hear-me

base: `09031aab16eb49773abeb90c6bcbe47c7f63bdf8` → head: `09031aab16eb49773abeb90c6bcbe47c7f63bdf8`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/007-hear-me/delta/theory/temperament.md b/changes/007-hear-me/delta/theory/temperament.md
index b97358b..0811647 100644
--- a/changes/007-hear-me/delta/theory/temperament.md
+++ b/changes/007-hear-me/delta/theory/temperament.md
@@ -53,7 +53,7 @@ spelling preference
   Then it is A♯4 then B♭4, 0 cents either way
 - **REQ-002/S4 — halfway belongs to the note above**
   Given equal temperament
-  When the nearest note to 452.89 Hz (50 cents above A4) is read
+  When the nearest note to 452.90 Hz (just above the point 50 cents above A4, 452.893 Hz) is read
   Then it is A♯4 (or B♭4), −50 cents; for 452.8 Hz it is A4, +50
 - **REQ-002/S5 — the inverse of REQ-001 (invariant)**
   Given every note from A0 to C8
diff --git a/changes/007-hear-me/plan.md b/changes/007-hear-me/plan.md
index 28831d7..278f8c7 100644
--- a/changes/007-hear-me/plan.md
+++ b/changes/007-hear-me/plan.md
@@ -402,7 +402,7 @@ docs/design.md                        ← §7–§8 (sdd-design C, this gate)
 | practice.tuner/REQ-007 (cannot hear) | `enterTuner` on a failed `start()` → `listening: cannot-hear(reason)`; `onEnded` → same; `TunerScreen` NO MIC, "–", the card | S1 `tuner-cannot-hear` (`failWith("refused")` → state, no reading) + `tuner-screen` (card text verbatim, level/strip/footer still rendered, ‹ Practice enabled); S2 (`leaveTuner`, clear `failWith`, `enterTuner` → listening); S3 (`end()` → cannot-hear within one notify, reading null) |
 | practice.tuner/REQ-008 (hidden/shown; awake) | `visibility.onHidden` → `listening.stop()` + reading null; `onShown` → `start()` while active; `wakeLock.acquire()` on enter, `release()` on leave | S1 `tuner-hidden-awake` (hide → `stopCalls` 1, reading null; show → `startCalls` 2, `permissionPrompts` 0 in the fake); S2 (`wake.acquired` while active, released after leave) — the phone itself at acceptance |
 | practice.tuner/REQ-009 (nothing remembered; spelling persists) | No store field; `leaveTuner` → target auto; App always starts on `screen: "practice"`; the spelling toggle writes `selection.spelling` | S1 `selection-persistence` (stored v5 with flat spelling → practice screen, flat; enter → auto); S2 `tuner-memory` (pin D5, leave, enter → auto) |
-| theory.temperament/REQ-002 (nearest note) | `nearestNoteOf`, `noteAtPosition` | S1–S4 `temperament.test` (445 → A4 +20; 436 → −16; 440 → 0; 82.41 → E2; 2093 → C7; 466.16 → A♯4 / B♭4; 452.89 → A♯4 −50, 452.8 → A4 +50); S5 `nearest-note-inverse` (A0–C8 × both spellings: `nearestNoteOf(pitchHzOf(n))` = n, 0 ¢) |
+| theory.temperament/REQ-002 (nearest note) | `nearestNoteOf`, `noteAtPosition` | S1–S4 `temperament.test` (445 → A4 +20; 436 → −16; 440 → 0; 82.41 → E2; 2093 → C7; 466.16 → A♯4 / B♭4; 452.90 → A♯4 −50, 452.8 → A4 +50); S5 `nearest-note-inverse` (A0–C8 × both spellings: `nearestNoteOf(pitchHzOf(n))` = n, 0 ¢) |
 
 ## Test strategy
 
diff --git a/changes/007-hear-me/tasks.md b/changes/007-hear-me/tasks.md
index 7abfcac..13982ab 100644
--- a/changes/007-hear-me/tasks.md
+++ b/changes/007-hear-me/tasks.md
@@ -333,7 +333,7 @@ _Nothing user-visible. The detector proven on synthesised buffers, the crate's C
     expect(near(466.16, "sharp")).toEqual(["A♯4", 0]); expect(near(466.16, "flat")).toEqual(["B♭4", 0]);
   });
   test("theory.temperament/REQ-002/S4 — halfway belongs to the note above", () => {
-    expect(near(452.89)).toEqual(["A♯4", -50]); expect(near(452.8)).toEqual(["A4", 50]);
+    expect(near(452.90)).toEqual(["A♯4", -50]); expect(near(452.8)).toEqual(["A4", 50]);
   });
   ```
   and `tests/theory/invariants/nearest-note-inverse.test.ts`:
diff --git a/docs/decisions.md b/docs/decisions.md
index 09f438f..f29b47d 100644
--- a/docs/decisions.md
+++ b/docs/decisions.md
@@ -161,4 +161,5 @@ tags: [sdd, decisions]
 2026-09-28 · design · System approved (docs/design.md §7–§8, v1.0.0): React 19 + Vite, hand-rolled components, inline style objects from named constants, `src/ui/theme.ts` the tokens file; the 17-role paper palette, four fonts, the type/spacing/radius/motion scales the shipped screens use; the tuner adds sharp/flat/in-tune/band colours and two greys · asked once at 007's plan, the first after the design skill existed; records what six changes already did
 2026-09-28 · 007-hear-me · Plan approved: pitch detection by the McLeod Pitch Method (NSDF over a 2048-frame window, 512-frame hop, clarity as confidence) in a zero-crate Rust `listening` crate running in a second worklet on the same AudioContext as synthesis (ADR 0006); the Session aggregate owns the tuner beside the transport and the drone (004's reasoning: one aggregate, one never-both invariant); a `screen` state, no router; a Playwright harness `pnpm test:tuner` feeds the microphone from the page's own AudioContext for exact onset frames; the budget split listening ≤ 60 ms / judgement + paint ≤ 40 ms is the spike's to confirm, a smaller window preferred over a tighter paint share; the harness reports paint age and gates on onset → readout and arrival age; VisibilityPort gains onShown · gate 2026-09-28; FFT rejected (window length at E2, octave errors on a flute), a second AudioContext rejected (two clocks), YIN kept as the fallback
 2026-09-28 · 007-hear-me · Tasks approved (25 tasks, 5 phases) and implementation started · gate 2026-09-28
+2026-09-28 · 007-hear-me · Spec correction at T004 (theory.temperament/REQ-002/S4): the halfway example amended from 452.89 Hz to 452.90 Hz — 452.89 lies 0.01 ¢ below the true A4–A♯4 midpoint (452.893 Hz) and correctly reads A4 +50; the rule (halfway → the upper note at −50) is unchanged and no tolerance was invented · the implementer's finding; delta, plan and task amended in place with the user's approval (the 005 precedent)
 2026-09-28 · 007-hear-me · The microphone's own capture latency is not observable from a page (AudioContext reports output latency only): the harness measures from the frame the sound reaches the audio thread; the user's walk on the phone is the check for the rest · accepted limit, named in the plan's risks
diff --git a/src/theory/domain/notes.ts b/src/theory/domain/notes.ts
index 5dea1f6..575c775 100644
--- a/src/theory/domain/notes.ts
+++ b/src/theory/domain/notes.ts
@@ -1,3 +1,5 @@
+import type { SpellingPreference } from "./arc";
+
 export type NoteLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G";
 export type Accidental =
   "doubleFlat" | "flat" | "natural" | "sharp" | "doubleSharp";
@@ -68,6 +70,54 @@ export function parseNoteString(input: string): Note | null {
   };
 }
 
+// The pitch class (0..11, 0 = C) spelled with sharps and with flats — the
+// fixed enharmonic table equal temperament actually uses: a natural letter
+// where one lands exactly on the pitch class, otherwise the neighbouring
+// letter raised or lowered by a single accidental.
+const PITCH_CLASS_SHARP: readonly PitchClass[] = [
+  { letter: "C", accidental: "natural" },
+  { letter: "C", accidental: "sharp" },
+  { letter: "D", accidental: "natural" },
+  { letter: "D", accidental: "sharp" },
+  { letter: "E", accidental: "natural" },
+  { letter: "F", accidental: "natural" },
+  { letter: "F", accidental: "sharp" },
+  { letter: "G", accidental: "natural" },
+  { letter: "G", accidental: "sharp" },
+  { letter: "A", accidental: "natural" },
+  { letter: "A", accidental: "sharp" },
+  { letter: "B", accidental: "natural" },
+];
+
+const PITCH_CLASS_FLAT: readonly PitchClass[] = [
+  { letter: "C", accidental: "natural" },
+  { letter: "D", accidental: "flat" },
+  { letter: "D", accidental: "natural" },
+  { letter: "E", accidental: "flat" },
+  { letter: "E", accidental: "natural" },
+  { letter: "F", accidental: "natural" },
+  { letter: "G", accidental: "flat" },
+  { letter: "G", accidental: "natural" },
+  { letter: "A", accidental: "flat" },
+  { letter: "A", accidental: "natural" },
+  { letter: "B", accidental: "flat" },
+  { letter: "B", accidental: "natural" },
+];
+
+// The inverse of pitchPosition: the note at `position` (C4 = 60), spelled
+// per `spelling`. octave increments at C, matching pitchPosition's "+ 1"
+// group of twelve semitones.
+export function noteAtPosition(
+  position: number,
+  spelling: SpellingPreference,
+): Note {
+  const pitchClass = ((position % 12) + 12) % 12;
+  const octave = Math.floor(position / 12) - 1;
+  const table = spelling === "sharp" ? PITCH_CLASS_SHARP : PITCH_CLASS_FLAT;
+  const { letter, accidental } = table[pitchClass]!;
+  return { letter, accidental, octave };
+}
+
 // Internal helper shared by keys.ts and circle.ts — not part of the
 // published surface. Finds the single accidental that spells `letter` at
 // `targetSemitone` (0-11), or throws if none of the five reaches it.
diff --git a/src/theory/domain/temperament.ts b/src/theory/domain/temperament.ts
index eb01983..41883b0 100644
--- a/src/theory/domain/temperament.ts
+++ b/src/theory/domain/temperament.ts
@@ -1,5 +1,6 @@
+import type { SpellingPreference } from "./arc";
 import type { Note } from "./notes";
-import { pitchPosition } from "./notes";
+import { noteAtPosition, pitchPosition } from "./notes";
 
 // A440 equal temperament: A4 (semitone 69 in pitchPosition's numbering) is
 // the reference pitch, and every semitone away from it is a ratio of the
@@ -12,3 +13,28 @@ export function pitchHzOf(note: Note): number {
   const semitonesFromA4 = pitchPosition(note) - REFERENCE_A4_POSITION;
   return REFERENCE_A4_HZ * 2 ** (semitonesFromA4 / SEMITONES_PER_OCTAVE);
 }
+
+// The inverse of pitchHzOf: the nearest note under A440 equal temperament
+// and the signed offset from it in whole cents (-50..+50; a frequency
+// exactly halfway rounds up to the upper note, at -50 — Math.round's own
+// "round half up" is exactly that rule). hz must be greater than zero; the
+// published port's schema guarantees this at the boundary, so a violation
+// here is a programming error, not an expected failure.
+export function nearestNoteOf(
+  hz: number,
+  spelling: SpellingPreference,
+): { readonly note: Note; readonly cents: number } {
+  if (!(hz > 0)) {
+    throw new RangeError(`nearestNoteOf: hz must be greater than 0, got ${hz}`);
+  }
+  const position = Math.round(
+    REFERENCE_A4_POSITION +
+      SEMITONES_PER_OCTAVE * Math.log2(hz / REFERENCE_A4_HZ),
+  );
+  const note = noteAtPosition(position, spelling);
+  // "+ 0" folds a -0 result (Math.round of a hz an insignificant sliver
+  // below the note's exact pitch) back to 0 — the note is in tune either
+  // way, and -0 !== 0 under deep equality.
+  const cents = Math.round(1200 * Math.log2(hz / pitchHzOf(note))) + 0;
+  return { note, cents };
+}
diff --git a/src/theory/published/index.ts b/src/theory/published/index.ts
index 2f2dc55..da4f8d5 100644
--- a/src/theory/published/index.ts
+++ b/src/theory/published/index.ts
@@ -1,5 +1,5 @@
 export type { Accidental, Note, NoteLetter, PitchClass } from "../domain/notes";
-export { pitchPosition } from "../domain/notes";
+export { noteAtPosition, pitchPosition } from "../domain/notes";
 export type { Key, KeyId, Mode } from "../domain/keys";
 export { keyId, scaleNotesOf } from "../domain/keys";
 export type { Signature, SignatureKind } from "../domain/signatures";
@@ -42,7 +42,11 @@ export {
 } from "../domain/traversal";
 export { pitchClassLabel, noteLabel } from "../domain/labels";
 export { inlineAccidentalsOf } from "../domain/notation";
-export { pitchHzOf, REFERENCE_A4_HZ } from "../domain/temperament";
+export {
+  nearestNoteOf,
+  pitchHzOf,
+  REFERENCE_A4_HZ,
+} from "../domain/temperament";
 export type {
   Catalogue,
   CatalogueNotice,
diff --git a/tests/theory/scenarios/temperament.test.ts b/tests/theory/scenarios/temperament.test.ts
index f0e7647..aa1831f 100644
--- a/tests/theory/scenarios/temperament.test.ts
+++ b/tests/theory/scenarios/temperament.test.ts
@@ -1,6 +1,8 @@
 import { expect, test } from "vitest";
 import {
   builtInCatalogue,
+  nearestNoteOf,
+  noteLabel,
   pitchHzOf,
   pitchPosition,
 } from "../../../src/theory/published";
@@ -70,3 +72,29 @@ test("theory.temperament/REQ-001/S3 — the whole catalogue is sounded", () => {
     }
   }
 });
+
+const near = (hz: number, spelling: "sharp" | "flat" = "sharp") => {
+  const r = nearestNoteOf(hz, spelling);
+  return [noteLabel(r.note), r.cents] as const;
+};
+
+test("theory.temperament/REQ-002/S1 — a little sharp of A", () => {
+  expect(near(445.0)).toEqual(["A4", 20]);
+  expect(near(436.0)).toEqual(["A4", -16]);
+  expect(near(440.0)).toEqual(["A4", 0]);
+});
+
+test("theory.temperament/REQ-002/S2 — the ends of the tuner's range", () => {
+  expect(near(82.41)).toEqual(["E2", 0]);
+  expect(near(2093.0)).toEqual(["C7", 0]);
+});
+
+test("theory.temperament/REQ-002/S3 — spelled per the preference", () => {
+  expect(near(466.16, "sharp")).toEqual(["A♯4", 0]);
+  expect(near(466.16, "flat")).toEqual(["B♭4", 0]);
+});
+
+test("theory.temperament/REQ-002/S4 — halfway belongs to the note above", () => {
+  expect(near(452.9)).toEqual(["A♯4", -50]);
+  expect(near(452.8)).toEqual(["A4", 50]);
+});
```

<!-- recorded 2026-09-28T07:31:28Z by scripts/record.sh -->
