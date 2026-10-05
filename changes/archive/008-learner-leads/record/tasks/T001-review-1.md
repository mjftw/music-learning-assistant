---
type: Task Review
title: Review package — T001 · 008-learner-leads
description: The diff produced for T001, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/T001.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T001.md
  - resource: git:04714d32ab10cb9a011349b9f7f6d8214fc90f62..04714d32ab10cb9a011349b9f7f6d8214fc90f62
generated:
  by: process:review-package.sh
  at: 2026-10-02T16:40:19Z
sdd_id: 008-learner-leads
---

# Review package — T001 · 008-learner-leads

base: `04714d32ab10cb9a011349b9f7f6d8214fc90f62` → head: `04714d32ab10cb9a011349b9f7f6d8214fc90f62`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks.md b/changes/008-learner-leads/tasks.md
index 496b602..55d3020 100644
--- a/changes/008-learner-leads/tasks.md
+++ b/changes/008-learner-leads/tasks.md
@@ -18,7 +18,7 @@ verified:
     at: 2026-10-02T16:34:00Z
 sdd_id: 008-learner-leads
 sdd_context: practice
-sdd_phase: approved
+sdd_phase: in-progress
 ---
 
 # Tasks: Learner leads
diff --git a/src/practice/domain/settings.ts b/src/practice/domain/settings.ts
index 99a9f2d..8d2bf2c 100644
--- a/src/practice/domain/settings.ts
+++ b/src/practice/domain/settings.ts
@@ -1,4 +1,5 @@
 import type { Octaves, Shape, Traversal } from "../../theory/published";
+import { defaultLeadSettings, type LeadSettings } from "./lead";
 
 export type SoundMode = "notes" | "both" | "metronome";
 
@@ -8,6 +9,7 @@ export interface SessionSettings {
   readonly countIn: boolean;
   readonly restBar: boolean;
   readonly tempoBpm: number;
+  readonly lead: LeadSettings;
 }
 
 export const defaultSessionSettings: SessionSettings = {
@@ -16,6 +18,7 @@ export const defaultSessionSettings: SessionSettings = {
   countIn: true,
   restBar: false,
   tempoBpm: 96,
+  lead: defaultLeadSettings,
 };
 
 export const defaultTraversal: Traversal = {
diff --git a/src/practice/domain/tuner.ts b/src/practice/domain/tuner.ts
index f5f28e9..1d61735 100644
--- a/src/practice/domain/tuner.ts
+++ b/src/practice/domain/tuner.ts
@@ -82,9 +82,13 @@ function rawCentsFrom(note: Note, hz: number): number {
   return 1200 * Math.log2(hz / pitchHzOf(note));
 }
 
-// |cents| ≤ IN_TUNE_BAND_CENTS → "in-tune"; > 0 sharp; < 0 flat
-export function verdictOf(cents: number): Verdict {
-  if (Math.abs(cents) <= IN_TUNE_BAND_CENTS) return "in-tune";
+// |cents| ≤ bandCents → "in-tune"; > 0 sharp; < 0 flat — the band defaults
+// to the tuner's own (practice.session/REQ-016/S5 passes a lead tolerance).
+export function verdictOf(
+  cents: number,
+  bandCents: number = IN_TUNE_BAND_CENTS,
+): Verdict {
+  if (Math.abs(cents) <= bandCents) return "in-tune";
   return cents > 0 ? "sharp" : "flat";
 }
 
diff --git a/src/practice/published/index.ts b/src/practice/published/index.ts
index 0401f56..575ec48 100644
--- a/src/practice/published/index.ts
+++ b/src/practice/published/index.ts
@@ -13,6 +13,16 @@ export {
   defaultTraversal,
   summaryLineOf,
 } from "../domain/settings";
+export type { HoldBeats, LeadSettings, Tolerance, Who } from "../domain/lead";
+export {
+  cuesHintOf,
+  defaultLeadSettings,
+  holdHintOf,
+  requiredHoldMs,
+  TOLERANCE_CENTS,
+  toleranceHintOf,
+  whoHintOf,
+} from "../domain/lead";
 export type { ScaleChoice } from "../domain/scale-choice";
 export { defaultScaleChoice, chosenScaleIdFor } from "../domain/scale-choice";
 export type { DroneOctave, DroneSettings, DroneSound } from "../domain/drone";
@@ -55,6 +65,7 @@ export {
   semitoneCountOf,
   TUNER_HIGHEST_POSITION,
   TUNER_LOWEST_POSITION,
+  verdictOf,
 } from "../domain/tuner";
 export type { NoteJudged, Verdict } from "./note-judged.schema";
 export { verdictSchema } from "./note-judged.schema";
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 77d681f..c5cbdbf 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -21,6 +21,7 @@ import {
 import {
   chosenScaleIdFor,
   createSession,
+  defaultLeadSettings,
   defaultScaleChoice,
   steppedTempo,
   tempoForTerm,
@@ -217,8 +218,14 @@ function initialTraversalOf(stored: StoredSelection | null): Traversal {
   return traversalFromStored(stored?.traversal ?? firstRunDefaults.traversal);
 }
 
+// The stored session (`StoredSelection["session"]`, schema v5) carries no
+// lead settings yet — that is a later task's v6 schema — so every restored
+// session takes the S2 lead default until then (practice.session/REQ-011/S3).
 function initialSettingsOf(stored: StoredSelection | null): SessionSettings {
-  return stored?.session ?? firstRunDefaults.session;
+  return {
+    ...(stored?.session ?? firstRunDefaults.session),
+    lead: defaultLeadSettings,
+  };
 }
 
 export function App(props: {
```

## Verdict

SPEC: PASS · QUALITY: PASS · FINDINGS: none. The App.tsx ripple (initialSettingsOf merges defaultLeadSettings over a v5 session) judged the minimal correct one for REQ-011/S3 until T004's v6 store. check-contexts clean.

<!-- recorded 2026-10-02T16:43:12Z by scripts/record.sh -->
