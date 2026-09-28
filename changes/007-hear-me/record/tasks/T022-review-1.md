---
type: Task Review
title: Review package — T022 · 007-hear-me
description: The diff produced for T022, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T022.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T022.md
  - resource: git:59b57ded13ba7c028e390263475f053d2e701525..59b57ded13ba7c028e390263475f053d2e701525
generated:
  by: process:review-package.sh
  at: 2026-09-28T16:22:30Z
sdd_id: 007-hear-me
---

# Review package — T022 · 007-hear-me

base: `59b57ded13ba7c028e390263475f053d2e701525` → head: `59b57ded13ba7c028e390263475f053d2e701525`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/src/listening/src/detector.rs b/src/listening/src/detector.rs
index 8a5c8f9..2738a60 100644
--- a/src/listening/src/detector.rs
+++ b/src/listening/src/detector.rs
@@ -257,6 +257,18 @@ mod tests {
         }
     }
 
+    // listening.pitch-detection/REQ-002/S5's last clause — "outside E2–C7
+    // nothing is promised, and anything published still obeys REQ-003": a
+    // note below E2 (60 Hz, outside the tuner's E2–C7 range) must not crash
+    // or report a non-positive frequency — either no detection, or a
+    // positive hz, is acceptable.
+    #[test]
+    fn req_002_s5_a_note_outside_e2_to_c7() {
+        if let Some(d) = detect(&sine(60.0), SR) {
+            assert!(d.hz > 0.0, "{}", d.hz);
+        }
+    }
+
     // listening.pitch-detection/REQ-003/S1 — silence
     #[test]
     fn req_003_s1_silence() {
diff --git a/tests/listening/scenarios/tuner-harness.test.ts b/tests/listening/scenarios/tuner-harness.test.ts
index 953ef73..9484d96 100644
--- a/tests/listening/scenarios/tuner-harness.test.ts
+++ b/tests/listening/scenarios/tuner-harness.test.ts
@@ -1,4 +1,5 @@
 // listening.pitch-detection/REQ-002/S5, listening.pitch-detection/REQ-003/S1, listening.pitch-detection/REQ-003/S2, listening.pitch-detection/REQ-004/S1, listening.pitch-detection/REQ-004/S2, practice.tuner/REQ-006/S1 — measured by scripts/tuner-timing-test.mjs (pnpm test:tuner), not re-measured here
+// practice.tuner/REQ-006/S3 — "on the phone (acceptance)": the phone walk, measured at acceptance, T024 — not a test here either
 import { readFileSync } from "node:fs";
 import { resolve } from "node:path";
 import { expect, test } from "vitest";
```

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] the count-in test asserts stopAll ≥ 1 and idle but does not advance the clock to observe "no click live" (traced as non-vacuous). [minor] the 60 Hz test's None-or-positive disjunction mirrors the spec's "nothing promised" clause, commented. Coverage complete; the REQ-006/S3 citation honest.

<!-- recorded 2026-09-28T16:26:17Z by scripts/record.sh -->
