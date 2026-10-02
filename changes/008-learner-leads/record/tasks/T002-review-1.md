---
type: Task Review
title: Review package — T002 · 008-learner-leads
description: The diff produced for T002, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/T002.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T002.md
  - resource: git:24aba48ddc50dfa9cf9f89b4cfa776290794e836..24aba48ddc50dfa9cf9f89b4cfa776290794e836
generated:
  by: process:review-package.sh
  at: 2026-10-02T16:57:07Z
sdd_id: 008-learner-leads
---

# Review package — T002 · 008-learner-leads

base: `24aba48ddc50dfa9cf9f89b4cfa776290794e836` → head: `24aba48ddc50dfa9cf9f89b4cfa776290794e836`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/practice/domain/lead.ts b/src/practice/domain/lead.ts
index dffed6b..39d74f4 100644
--- a/src/practice/domain/lead.ts
+++ b/src/practice/domain/lead.ts
@@ -1,7 +1,11 @@
 // The lead settings — who leads, the Hold, the In tune tolerance and the
 // Cues — plus the hints the Traversal sheet shows beneath each row
-// (practice.session/REQ-016, REQ-018, REQ-020). Pure (docs/engineering.md
-// §2: functional core).
+// (practice.session/REQ-016, REQ-018, REQ-020) — and the hold rule itself,
+// a pure reducer over a lead run's phase (practice.session/REQ-015,
+// REQ-016). Pure (docs/engineering.md §2: functional core).
+
+import type { Note, SequenceNote } from "../../theory/published";
+import type { NoteJudged } from "../published/note-judged.schema";
 
 export type Who = "tool" | "me";
 export type HoldBeats = 1 | 2 | 4;
@@ -59,3 +63,135 @@ export function cuesHintOf(cueMeter: boolean, cueTone: boolean): string {
 export function whoHintOf(who: Who): string {
   return who === "tool" ? "It plays, you follow" : "It listens, you play";
 }
+
+// practice.session/REQ-017: silence clears the pitch line (shares the
+// tuner's value by name, not by constant).
+export const LEAD_GAP_MS = 300;
+// practice.session/REQ-018: the tone cue's length, and how long after its
+// release nothing is judged.
+export const CUE_TONE_MS = 400;
+export const CUE_TAIL_MS = 100;
+// practice.session/REQ-017: "<note> held ✓" shows this long in silence.
+export const HELD_TICK_MS = 400;
+
+export interface LeadTarget {
+  readonly position: number; // 1-based position in the sequence
+  readonly note: Note;
+  readonly runIndex: number;
+}
+
+export interface Hold {
+  readonly heldMs: number;
+  readonly lastInTuneAtMs: number | null;
+}
+
+export type LeadPhase =
+  | { readonly kind: "idle" }
+  | {
+      readonly kind: "listening";
+      readonly target: LeadTarget;
+      readonly hold: Hold;
+      readonly mutedUntilMs: number | null;
+    }
+  | { readonly kind: "complete" }
+  | {
+      readonly kind: "cannot-hear";
+      readonly reason: "refused" | "none" | "failed";
+    };
+
+export const emptyHold: Hold = { heldMs: 0, lastInTuneAtMs: null };
+
+// The sequence's 1-based position `position` as a `LeadTarget` — a bug if
+// `position` falls outside 1..sequence.length, never an input a caller
+// should see at runtime.
+export function targetAt(
+  sequence: readonly SequenceNote[],
+  position: number,
+): LeadTarget {
+  if (position < 1 || position > sequence.length) {
+    throw new RangeError(
+      `targetAt: position ${position} outside 1..${sequence.length}`,
+    );
+  }
+  const entry = sequence[position - 1]!;
+  return { position, note: entry.note, runIndex: entry.runIndex };
+}
+
+// The three rules of practice.session/REQ-015 for what follows a completed
+// hold: the next position, or the wrap to the first note when looping, or
+// the run's completion.
+function nextPhaseAfterHold(
+  position: number,
+  sequence: readonly SequenceNote[],
+  loop: boolean,
+): LeadPhase {
+  if (position < sequence.length) {
+    return {
+      kind: "listening",
+      target: targetAt(sequence, position + 1),
+      hold: emptyHold,
+      mutedUntilMs: null,
+    };
+  }
+  return loop
+    ? {
+        kind: "listening",
+        target: targetAt(sequence, 1),
+        hold: emptyHold,
+        mutedUntilMs: null,
+      }
+    : { kind: "complete" };
+}
+
+// The hold rule, pure (practice.session/REQ-016): accumulates hold time
+// between consecutive in-tune readings, resets it on a reading that is not
+// in tune, and advances the target once the accumulated hold reaches the
+// required hold for the current settings and tempo. The reducer trusts
+// `judged.verdict` — the caller computes it at the tolerance.
+export function applyJudgement(
+  phase: LeadPhase,
+  judged: NoteJudged,
+  atMs: number,
+  settings: LeadSettings,
+  tempoBpm: number,
+  sequence: readonly SequenceNote[],
+  loop: boolean,
+): { readonly phase: LeadPhase; readonly advanced: boolean } {
+  if (phase.kind !== "listening") return { phase, advanced: false };
+
+  const hold: Hold =
+    judged.verdict === "in-tune"
+      ? {
+          heldMs:
+            phase.hold.heldMs +
+            (phase.hold.lastInTuneAtMs === null
+              ? 0
+              : atMs - phase.hold.lastInTuneAtMs),
+          lastInTuneAtMs: atMs,
+        }
+      : emptyHold;
+
+  if (hold.heldMs >= requiredHoldMs(settings.holdBeats, tempoBpm)) {
+    return {
+      phase: nextPhaseAfterHold(phase.target.position, sequence, loop),
+      advanced: true,
+    };
+  }
+
+  return { phase: { ...phase, hold }, advanced: false };
+}
+
+// practice.session/REQ-016: nothing detected neither adds to the hold nor
+// resets it — only the "last in tune at" marker is cleared, so the next
+// reading's elapsed time is measured from itself, not across the gap.
+export function applySilence(phase: LeadPhase): LeadPhase {
+  if (phase.kind !== "listening") return phase;
+  return { ...phase, hold: { ...phase.hold, lastInTuneAtMs: null } };
+}
+
+// The meter's fill — practice.session/REQ-017 — clamped to [0, 1]; 0 when
+// there is nothing to divide by.
+export function heldFractionOf(hold: Hold, requiredMs: number): number {
+  if (requiredMs <= 0) return 0;
+  return Math.min(1, hold.heldMs / requiredMs);
+}
diff --git a/src/practice/published/index.ts b/src/practice/published/index.ts
index 575ec48..bf2a31b 100644
--- a/src/practice/published/index.ts
+++ b/src/practice/published/index.ts
@@ -13,12 +13,34 @@ export {
   defaultTraversal,
   summaryLineOf,
 } from "../domain/settings";
-export type { HoldBeats, LeadSettings, Tolerance, Who } from "../domain/lead";
+export type {
+  Hold,
+  HoldBeats,
+  LeadPhase,
+  LeadSettings,
+  LeadTarget,
+  Tolerance,
+  Who,
+} from "../domain/lead";
+// SequenceNote is theory's type, but it appears in the lead reducer's own
+// public signature (targetAt, applyJudgement take `readonly
+// SequenceNote[]`) — re-exported here so a practice consumer never needs
+// to reach into theory/published just to name a practice parameter type.
+export type { SequenceNote } from "../../theory/published";
 export {
+  applyJudgement,
+  applySilence,
+  CUE_TAIL_MS,
+  CUE_TONE_MS,
   cuesHintOf,
   defaultLeadSettings,
+  emptyHold,
+  heldFractionOf,
+  HELD_TICK_MS,
   holdHintOf,
+  LEAD_GAP_MS,
   requiredHoldMs,
+  targetAt,
   TOLERANCE_CENTS,
   toleranceHintOf,
   whoHintOf,
```

## Verdict

SPEC: PASS · QUALITY: PASS · FINDINGS: [minor] lead.ts nextPhaseAfterHold builds the identical listening object in two branches — a one-line extraction; not blocking. The ≥ boundary confirmed (a reading exactly at the required time advances). The `SequenceNote` re-export judged a legitimate ripple (the brief's own test imports it).

<!-- recorded 2026-10-02T17:04:19Z by scripts/record.sh -->
