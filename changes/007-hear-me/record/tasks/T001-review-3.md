---
type: Task Review
title: Review package — T001 · 007-hear-me
description: The diff produced for T001, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T001.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T001.md
  - resource: git:b916b953aa4f72bd86e33d39548ef177532914c7..b916b953aa4f72bd86e33d39548ef177532914c7
generated:
  by: process:review-package.sh
  at: 2026-09-27T23:02:11Z
sdd_id: 007-hear-me
---

# Review package — T001 · 007-hear-me

base: `b916b953aa4f72bd86e33d39548ef177532914c7` → head: `b916b953aa4f72bd86e33d39548ef177532914c7`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/listening/src/detector.rs b/src/listening/src/detector.rs
index bb64f2c..6995e9d 100644
--- a/src/listening/src/detector.rs
+++ b/src/listening/src/detector.rs
@@ -23,6 +23,11 @@ pub struct Detection {
 /// live in a fixed-size array — no allocation on the audio thread.
 const NSDF_CAPACITY: usize = 768;
 
+/// Key maxima never exceed floor(N/2) where N is the walked length (≤ NSDF_CAPACITY − 1):
+/// the walk opens at a non-positive sample, and consecutive positive regions must be
+/// separated by at least one non-positive sample, so at most floor(N/2) ≤ 383 regions.
+const MAX_MAXIMA: usize = NSDF_CAPACITY / 2;
+
 /// McLeod Pitch Method over `window` (exactly [`WINDOW`] samples at
 /// `sample_rate`): the normalised square-difference function
 /// `nsdf(τ) = 2·Σ x[i]x[i+τ] / Σ(x[i]² + x[i+τ]²)` for τ in
@@ -67,13 +72,10 @@ pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection> {
         };
     }
 
-    // Only maxima within the requested frequency range are eligible answers,
-    // even though the walk that found them started earlier.
-    let key_maxima: Vec<(usize, f32)> = key_maxima_of(&nsdf[..=lag_max])
-        .into_iter()
-        .filter(|&(tau, _)| tau >= lag_min)
-        .collect();
-    let global_max = key_maxima
+    // Get key maxima within the requested frequency range.
+    let (maxima_array, maxima_len) = key_maxima_of(&nsdf[..=lag_max], lag_min);
+
+    let global_max = maxima_array[..maxima_len]
         .iter()
         .map(|&(_, value)| value)
         .fold(f32::MIN, f32::max);
@@ -81,7 +83,7 @@ pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection> {
         return None;
     }
 
-    let &(tau, value) = key_maxima
+    let &(tau, value) = maxima_array[..maxima_len]
         .iter()
         .find(|&&(_, value)| value >= 0.93 * global_max)?;
 
@@ -97,11 +99,13 @@ pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection> {
 }
 
 /// The highest point of every positive region of `nsdf` (between successive
-/// zero crossings) from τ = 1 onward, as `(lag, value)` pairs, *excluding*
-/// the leading run before the first zero crossing — the trivial near-zero-lag
-/// correlation every signal starts with, never a genuine periodicity.
-fn key_maxima_of(nsdf: &[f32]) -> Vec<(usize, f32)> {
-    let mut maxima = Vec::new();
+/// zero crossings) from τ = 1 onward with τ ≥ lag_min, as `(lag, value)` pairs,
+/// *excluding* the leading run before the first zero crossing — the trivial
+/// near-zero-lag correlation every signal starts with, never a genuine periodicity.
+/// Returns a fixed-size array and the count of maxima found (no allocation).
+fn key_maxima_of(nsdf: &[f32], lag_min: usize) -> ([(usize, f32); MAX_MAXIMA], usize) {
+    let mut maxima = [(0usize, 0.0f32); MAX_MAXIMA];
+    let mut count = 0;
     let mut tau = 1;
     while tau < nsdf.len() && nsdf[tau] > 0.0 {
         tau += 1;
@@ -121,16 +125,30 @@ fn key_maxima_of(nsdf: &[f32]) -> Vec<(usize, f32)> {
             }
         } else if in_positive_region {
             in_positive_region = false;
-            if let Some(best) = region_best.take() {
-                maxima.push(best);
+            if let Some((best_tau, best_value)) = region_best.take() {
+                if best_tau >= lag_min {
+                    assert!(
+                        count < MAX_MAXIMA,
+                        "maxima count {count} exceeds capacity {MAX_MAXIMA}"
+                    );
+                    maxima[count] = (best_tau, best_value);
+                    count += 1;
+                }
             }
         }
     }
-    if let Some(best) = region_best {
-        maxima.push(best);
+    if let Some((best_tau, best_value)) = region_best {
+        if best_tau >= lag_min {
+            assert!(
+                count < MAX_MAXIMA,
+                "maxima count {count} exceeds capacity {MAX_MAXIMA}"
+            );
+            maxima[count] = (best_tau, best_value);
+            count += 1;
+        }
     }
 
-    maxima
+    (maxima, count)
 }
 
 /// Refines the integer-lag peak `(tau, value)` of `nsdf` to a fractional lag
```

<!-- recorded 2026-09-27T23:04:59Z by scripts/record.sh -->
