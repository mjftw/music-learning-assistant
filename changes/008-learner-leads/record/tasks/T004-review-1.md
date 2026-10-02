---
type: Task Review
title: Review package — T004 · 008-learner-leads
description: The diff produced for T004, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/T004.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T004.md
  - resource: git:b67cc8d..b67cc8d154c2e95da6f099c8d9d53d66ec2f8dc7
generated:
  by: process:review-package.sh
  at: 2026-10-02T18:09:04Z
sdd_id: 008-learner-leads
---

# Review package — T004 · 008-learner-leads

base: `b67cc8d` → head: `b67cc8d154c2e95da6f099c8d9d53d66ec2f8dc7`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index c5cbdbf..58b0fb7 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -218,13 +218,13 @@ function initialTraversalOf(stored: StoredSelection | null): Traversal {
   return traversalFromStored(stored?.traversal ?? firstRunDefaults.traversal);
 }
 
-// The stored session (`StoredSelection["session"]`, schema v5) carries no
-// lead settings yet — that is a later task's v6 schema — so every restored
-// session takes the S2 lead default until then (practice.session/REQ-011/S3).
+// The stored session (`StoredSelection["session"]`, schema v6) carries the
+// lead settings restored alongside the rest (practice.session/REQ-011) —
+// the defaults apply only when nothing at all is stored.
 function initialSettingsOf(stored: StoredSelection | null): SessionSettings {
   return {
     ...(stored?.session ?? firstRunDefaults.session),
-    lead: defaultLeadSettings,
+    lead: stored?.session.lead ?? defaultLeadSettings,
   };
 }
 
@@ -397,7 +397,7 @@ export function App(props: {
     // completion re-renders with a snapshot, so this simply runs again.
     if (snapshot === null) return;
     const toSave: StoredSelection = {
-      schemaVersion: 5,
+      schemaVersion: 6,
       variantId: selection.variantId,
       keyId: keyIdOf(selectedKey),
       spelling: selection.spelling,
diff --git a/src/ui/selection-store.ts b/src/ui/selection-store.ts
index d2617d7..1474687 100644
--- a/src/ui/selection-store.ts
+++ b/src/ui/selection-store.ts
@@ -1,7 +1,7 @@
 import { z } from "zod";
 import type { Direction, ScaleId, Shape } from "../theory/published";
-import { defaultScaleChoice } from "../practice/published";
-import type { SoundMode } from "../practice/published";
+import { defaultLeadSettings, defaultScaleChoice } from "../practice/published";
+import type { LeadSettings, SoundMode } from "../practice/published";
 import {
   droneSoundSchema,
   type DroneSound,
@@ -10,7 +10,7 @@ import {
 export type StoredOctaves = "full" | 1 | 2 | 3 | 4;
 
 export interface StoredSelection {
-  readonly schemaVersion: 5;
+  readonly schemaVersion: 6;
   readonly variantId: string;
   readonly keyId: string;
   readonly spelling: "sharp" | "flat";
@@ -29,6 +29,7 @@ export interface StoredSelection {
     readonly countIn: boolean;
     readonly restBar: boolean;
     readonly tempoBpm: number;
+    readonly lead: LeadSettings;
   };
   readonly scale: { readonly major: ScaleId; readonly minor: ScaleId };
   readonly drone: {
@@ -38,7 +39,7 @@ export interface StoredSelection {
 }
 
 export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId"> = {
-  schemaVersion: 5,
+  schemaVersion: 6,
   spelling: "sharp",
   view: "names",
   degreesEnabled: true,
@@ -51,6 +52,7 @@ export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId"> = {
     countIn: true,
     restBar: false,
     tempoBpm: 96,
+    lead: defaultLeadSettings,
   },
   scale: defaultScaleChoice,
   drone: { octave: null, sound: "warm" },
@@ -99,6 +101,16 @@ const scaleIdSchema = z.enum([
   "chromatic",
 ]);
 
+// Named so the v6 schema (below) can `.extend()` it with `lead` rather than
+// repeat its five fields.
+const storedSessionSchema = z.object({
+  soundMode: soundModeSchema,
+  loop: z.boolean(),
+  countIn: z.boolean(),
+  restBar: z.boolean(),
+  tempoBpm: z.number().int().min(40).max(200),
+});
+
 const storedSelectionV3Schema = z.object({
   schemaVersion: z.literal(3),
   variantId: z.string(),
@@ -113,13 +125,7 @@ const storedSelectionV3Schema = z.object({
     octaves: storedOctavesSchema,
     shape: shapeSchema,
   }),
-  session: z.object({
-    soundMode: soundModeSchema,
-    loop: z.boolean(),
-    countIn: z.boolean(),
-    restBar: z.boolean(),
-    tempoBpm: z.number().int().min(40).max(200),
-  }),
+  session: storedSessionSchema,
 });
 
 const storedSelectionV4Schema = storedSelectionV3Schema.extend({
@@ -148,6 +154,27 @@ const storedSelectionV5Schema = storedSelectionV4Schema.extend({
   drone: storedDroneSchema,
 });
 
+// A bad lead field falls back on its own (`.catch` per field, as the drone
+// group does above); an unreadable group as a whole falls back to the lead
+// defaults entirely — but, unlike the drone, never blocks the rest of the
+// payload from restoring (practice.session/REQ-011).
+const storedLeadSchema = z
+  .object({
+    who: z.enum(["tool", "me"]).catch("tool"),
+    holdBeats: z.union([z.literal(1), z.literal(2), z.literal(4)]).catch(2),
+    tolerance: z.enum(["lenient", "medium", "accurate"]).catch("medium"),
+    cueMeter: z.boolean().catch(true),
+    cueTone: z.boolean().catch(false),
+  })
+  .catch(defaultLeadSettings);
+
+const storedSelectionV6Schema = storedSelectionV5Schema.extend({
+  schemaVersion: z.literal(6),
+  session: storedSessionSchema.extend({ lead: storedLeadSchema }),
+});
+
+type StoredSelectionV5 = z.infer<typeof storedSelectionV5Schema>;
+
 const storedSpanSchema = z.enum(["full", "oct-1", "oct-2", "oct-3", "oct-4"]);
 
 const storedSelectionV2Schema = z.object({
@@ -170,6 +197,7 @@ const storedSelectionV1Schema = z.object({
 });
 
 const storedSelectionSchema = z.union([
+  storedSelectionV6Schema,
   storedSelectionV5Schema,
   storedSelectionV4Schema,
   storedSelectionV3Schema,
@@ -243,7 +271,7 @@ function migrateFromV1(
 // about the drone, so it starts unpinned and warm.
 function migrateFromV4(
   v4: z.infer<typeof storedSelectionV4Schema>,
-): StoredSelection {
+): StoredSelectionV5 {
   return {
     ...v4,
     schemaVersion: 5,
@@ -251,6 +279,17 @@ function migrateFromV4(
   };
 }
 
+// Copies every v5 field and adds `lead` at its first-run default
+// (REQ-011/S5) — stored state from before this change carries nothing
+// about who leads, so it starts in play along.
+function migrateFromV5(v5: StoredSelectionV5): StoredSelection {
+  return {
+    ...v5,
+    schemaVersion: 6,
+    session: { ...v5.session, lead: defaultLeadSettings },
+  };
+}
+
 export function localStorageSelectionStore(storage: Storage): SelectionStore {
   return {
     load(): StoredSelection | null {
@@ -262,14 +301,16 @@ export function localStorageSelectionStore(storage: Storage): SelectionStore {
         if (!result.success) return null;
         switch (result.data.schemaVersion) {
           case 1:
-            return migrateFromV4(migrateFromV1(result.data));
+            return migrateFromV5(migrateFromV4(migrateFromV1(result.data)));
           case 2:
-            return migrateFromV4(migrateFromV2(result.data));
+            return migrateFromV5(migrateFromV4(migrateFromV2(result.data)));
           case 3:
-            return migrateFromV4(migrateFromV3(result.data));
+            return migrateFromV5(migrateFromV4(migrateFromV3(result.data)));
           case 4:
-            return migrateFromV4(result.data);
+            return migrateFromV5(migrateFromV4(result.data));
           case 5:
+            return migrateFromV5(result.data);
+          case 6:
             return result.data;
         }
       } catch {
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index 9775630..111e260 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -43,3 +43,11 @@ export const motion = {
   lingerHoldMs: 600,
   lingerFadeMs: 200,
 } as const;
+
+// practice.session/REQ-017 — the lead run's hold-fill band: the colour the
+// band fills with by held time ÷ required hold. The band, line and verdict
+// colours themselves are tuner.band / tuner.inTune / tuner.flat /
+// tuner.sharp (docs/design.md §8: one value per role).
+export const lead = {
+  holdFill: "oklch(0.80 0.07 150)",
+} as const;
diff --git a/tests/ui/scenarios/selection-store.test.ts b/tests/ui/scenarios/selection-store.test.ts
index b0a3db0..0a01d97 100644
--- a/tests/ui/scenarios/selection-store.test.ts
+++ b/tests/ui/scenarios/selection-store.test.ts
@@ -1,4 +1,5 @@
 import { expect, test } from "vitest";
+import { defaultLeadSettings } from "../../../src/practice/published";
 import {
   firstRunDefaults,
   localStorageSelectionStore,
@@ -11,7 +12,7 @@ test("a v4 payload round-trips (practice.session/REQ-011/S1, theory.circle-of-fi
   localStorage.clear();
   const store = localStorageSelectionStore(localStorage);
   const selection: StoredSelection = {
-    schemaVersion: 5,
+    schemaVersion: 6,
     variantId: "ocarina-bass-c",
     keyId: "Bb-major",
     spelling: "flat",
@@ -26,6 +27,13 @@ test("a v4 payload round-trips (practice.session/REQ-011/S1, theory.circle-of-fi
       countIn: false,
       restBar: true,
       tempoBpm: 132,
+      lead: {
+        who: "me",
+        holdBeats: 1,
+        tolerance: "lenient",
+        cueMeter: false,
+        cueTone: true,
+      },
     },
     scale: { major: "lydian", minor: "dorian" },
     drone: { octave: null, sound: "warm" },
@@ -58,7 +66,7 @@ test("a v3 payload migrates: everything kept, scale defaults to Major / Natural
     }),
   );
   const loaded = localStorageSelectionStore(localStorage).load();
-  expect(loaded?.schemaVersion).toBe(5);
+  expect(loaded?.schemaVersion).toBe(6);
   expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
   expect(loaded?.scale).toEqual({ major: "major", minor: "natural-minor" });
   expect(loaded?.traversal).toEqual({
@@ -101,7 +109,7 @@ test("a v2 payload migrates: preferences kept, traversal and session default, sp
   );
   const loaded = localStorageSelectionStore(localStorage).load();
   expect(loaded).toEqual({
-    schemaVersion: 5,
+    schemaVersion: 6,
     variantId: "ocarina-bass-c",
     keyId: "Bb-major",
     spelling: "flat",
@@ -140,7 +148,7 @@ test("empty storage loads as null; first-run defaults match the spec (practice.s
   localStorage.clear();
   expect(localStorageSelectionStore(localStorage).load()).toBeNull();
   expect(firstRunDefaults).toEqual({
-    schemaVersion: 5,
+    schemaVersion: 6,
     spelling: "sharp",
     view: "names",
     degreesEnabled: true,
@@ -153,6 +161,7 @@ test("empty storage loads as null; first-run defaults match the spec (practice.s
       countIn: true,
       restBar: false,
       tempoBpm: 96,
+      lead: defaultLeadSettings,
     },
     scale: { major: "major", minor: "natural-minor" },
     drone: { octave: null, sound: "warm" },
@@ -194,7 +203,8 @@ const v4Payload = {
 
 const migrateExpectation: StoredSelection = {
   ...v4Payload,
-  schemaVersion: 5,
+  schemaVersion: 6,
+  session: { ...v4Payload.session, lead: defaultLeadSettings },
   drone: { octave: null, sound: "warm" },
 };
 
@@ -202,7 +212,7 @@ test("practice.drone/REQ-009/S3 — stored state from 005 (v4) restores everythi
   localStorage.clear();
   localStorage.setItem(storageKey, JSON.stringify(v4Payload));
   const loaded = localStorageSelectionStore(localStorage).load();
-  expect(loaded?.schemaVersion).toBe(5);
+  expect(loaded?.schemaVersion).toBe(6);
   expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
   expect(loaded?.scale).toEqual(v4Payload.scale);
   expect(loaded?.session.tempoBpm).toBe(v4Payload.session.tempoBpm);
@@ -221,16 +231,142 @@ test("practice.drone/REQ-009/S4 — an unreadable octave or sound falls back on
   const loaded = localStorageSelectionStore(localStorage).load();
   expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
   expect(loaded?.keyId).toBe(v4Payload.keyId);
-  expect(loaded?.session).toEqual(v4Payload.session);
+  expect(loaded?.session).toEqual({
+    ...v4Payload.session,
+    lead: defaultLeadSettings,
+  });
 });
 
-test("practice.drone/REQ-009 — a v5 payload round-trips", () => {
+test("practice.drone/REQ-009 — a v6 payload round-trips", () => {
   localStorage.clear();
   const store = localStorageSelectionStore(localStorage);
-  const v5: StoredSelection = {
+  const v6: StoredSelection = {
     ...migrateExpectation,
     drone: { octave: 4, sound: "reed" },
   };
-  store.save(v5);
-  expect(store.load()).toEqual(v5);
+  store.save(v6);
+  expect(store.load()).toEqual(v6);
+});
+
+// practice.session/REQ-011/S5 — a stored v5 payload (predates lead
+// settings): flute Concert, G major, ↓ 2 oct arpeggio, metronome, loop
+// off, count-in off, rest bar on, 132 bpm, Dorian on the minor ring,
+// drone octave 5 warm.
+const v5Document = {
+  schemaVersion: 5 as const,
+  variantId: "flute-concert",
+  keyId: "G-major",
+  spelling: "sharp" as const,
+  view: "names" as const,
+  degreesEnabled: true,
+  distanceRingEnabled: true,
+  staveNamesEnabled: false,
+  traversal: {
+    direction: "down" as const,
+    octaves: 2 as const,
+    shape: "arpeggio" as const,
+  },
+  session: {
+    soundMode: "metronome" as const,
+    loop: false,
+    countIn: false,
+    restBar: true,
+    tempoBpm: 132,
+  },
+  scale: { major: "major" as const, minor: "dorian" as const },
+  drone: { octave: 5, sound: "warm" as const },
+};
+
+// The v5 fixture above plus `lead` — a full v6 document, for round-trip
+// and fallback tests.
+const v6Document = {
+  ...v5Document,
+  schemaVersion: 6 as const,
+  session: { ...v5Document.session, lead: defaultLeadSettings },
+};
+
+test("practice.session/REQ-011/S5 — stored state from 007 (v5, no lead settings) restores with the lead defaults", () => {
+  localStorage.clear();
+  localStorage.setItem(
+    storageKey,
+    JSON.stringify({ ...v5Document, schemaVersion: 5 }),
+  );
+  const loaded = localStorageSelectionStore(localStorage).load();
+  expect(loaded?.session.tempoBpm).toBe(132);
+  expect(loaded?.session.lead).toEqual({
+    who: "tool",
+    holdBeats: 2,
+    tolerance: "medium",
+    cueMeter: true,
+    cueTone: false,
+  });
+});
+
+test("practice.session/REQ-011/S1 (store) — the lead settings round-trip at v6", () => {
+  localStorage.clear();
+  const store = localStorageSelectionStore(localStorage);
+  store.save({
+    ...v6Document,
+    session: {
+      ...v6Document.session,
+      lead: {
+        who: "me",
+        holdBeats: 4,
+        tolerance: "accurate",
+        cueMeter: false,
+        cueTone: true,
+      },
+    },
+  });
+  const saved = JSON.parse(
+    localStorage.getItem(storageKey)!,
+  ) as StoredSelection;
+  expect(saved.schemaVersion).toBe(6);
+  expect(store.load()?.session.lead).toEqual({
+    who: "me",
+    holdBeats: 4,
+    tolerance: "accurate",
+    cueMeter: false,
+    cueTone: true,
+  });
+});
+
+test("practice.session/REQ-011/S2 (store) — first-run defaults carry the lead defaults", () => {
+  expect(firstRunDefaults.session.lead).toEqual({
+    who: "tool",
+    holdBeats: 2,
+    tolerance: "medium",
+    cueMeter: true,
+    cueTone: false,
+  });
+  expect(firstRunDefaults.schemaVersion).toBe(6);
+});
+
+test("practice.session/REQ-011 — a bad lead field falls back on its own, the rest restores", () => {
+  localStorage.clear();
+  localStorage.setItem(
+    storageKey,
+    JSON.stringify({
+      ...v6Document,
+      session: {
+        ...v6Document.session,
+        lead: {
+          who: "them",
+          holdBeats: 3,
+          tolerance: "medium",
+          cueMeter: true,
+          cueTone: false,
+        },
+      },
+    }),
+  );
+  expect(localStorageSelectionStore(localStorage).load()?.session.lead).toEqual(
+    {
+      who: "tool",
+      holdBeats: 2,
+      tolerance: "medium",
+      cueMeter: true,
+      cueTone: false,
+    },
+  );
 });
```

## Verdict

SPEC: PASS · QUALITY: PASS · FINDINGS: none. The v1→v6 migration chain verified; `read/write/STORAGE_KEY` adapted to the file's `load/save/storageKey` with the assertions verbatim; App.tsx read/write ripple accepted. Observation (not a finding): the "bad lead field" test cannot distinguish per-field from whole-group catch — the brief's own test.

<!-- recorded 2026-10-02T18:12:17Z by scripts/record.sh -->
