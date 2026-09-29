---
type: Task Review
title: Review package — T023 · 007-hear-me
description: The diff produced for T023, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T023.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T023.md
  - resource: git:f416323698a1b28a1552097653b6d8884727b366..33576e2b5470a3cf59ee020b176ba70e7a88e9f0
generated:
  by: process:review-package.sh
  at: 2026-09-28T16:44:05Z
sdd_id: 007-hear-me
---

# Review package — T023 · 007-hear-me

base: `f416323698a1b28a1552097653b6d8884727b366` → head: `33576e2b5470a3cf59ee020b176ba70e7a88e9f0`

## Files changed

- M	AGENTS.md

## Diff

```diff
diff --git a/AGENTS.md b/AGENTS.md
index a481a23..696af7d 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -95,14 +95,14 @@ Healthy output looks like (last ~8 lines of `pnpm check`: vitest summary,
 then cargo's `test result`):
 
 ```
- Test Files  43 passed (43)
-      Tests  172 passed (172)
-   Start at  04:05:21
-   Duration  5.31s (environment 41%, tests 39%, import 11%, transform 9%)
+ Test Files  74 passed (74)
+      Tests  309 passed (309)
+   Start at  17:40:59
+   Duration  10.63s (tests 50%, environment 33%, import 10%, transform 7%)
 
-running 13 tests
+running 24 tests
 ...
-test result: ok. 13 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
+test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
 ```
 
 `pnpm test:timing` prints `measuring 3 tempos sequentially, N s each` first
@@ -123,6 +123,26 @@ side of the audible onset counts); `vs scheduled (ms)` is printed for
 information only, never gated, and normally sits near the port's reported
 output latency.
 
+`pnpm test:tuner` feeds the microphone from the page's own AudioContext,
+sweeping E2–C7 as a sine and a flute-like tone; it takes approximately 4
+minutes. Healthy output shows five test rows — sine E2–C7, flute-like E2–C7,
+hand-over glissando, silence, and white noise — plus worst-case summaries,
+ending with a PASS line. The first readout budget (≤100 ms), arrival age
+(≤100 ms), readings per second (≥20), and cents error (≤2 ¢) are gated; paint
+age is printed for information and is not gated.
+
+```
+case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
+sine E2–C7           57     84.30                   63.98                 18.69               92.86           0.09           PASS
+flute-like E2–C7     57     80.40                   66.65                 8.02                92.86           0.65           PASS
+hand-over glissando  1      59.30                   61.31                 10.69               93.57           —              PASS
+silence              —      —                       —                     —                   0.00            —              PASS
+white noise          —      —                       —                     —                   0.00            —              PASS
+  worst: first readout E2 84.30 ms · arrival age E2 63.98 ms · cents err A♯6 0.09 ¢
+  worst: first readout E5 80.40 ms · arrival age E5 66.65 ms · cents err B6 0.65 ¢
+test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, nothing for silence or noise
+```
+
 Run `check` before calling any task done, and paste the output.
 
 ## Conventions
@@ -148,14 +168,17 @@ Run `check` before calling any task done, and paste the output.
 A static single-page web app; no server, no runtime services (Article VII).
 Four bounded contexts (docs/domain.md): `src/theory/` (pure functions —
 notes, keys, circle, traversal, pitch, catalogue, scales (the catalogue),
-notation), `src/practice/` (the
-session: a pure transport state machine, the drone, a lookahead scheduler
-adapter on the audio clock, ports for sound / clock / wake lock /
-visibility),
+notation), `src/practice/` (the session: a pure transport state machine, the
+drone, the tuner (target, reading, the never-both invariant extended to
+listening), a lookahead scheduler adapter on the audio clock, ports for sound
+/ clock / wake lock / visibility / listening),
 `src/sound/` (Rust→WASM synthesiser in an AudioWorklet plus a ~60-line TS
 host shim in its `published/`; ADR 0003) — voices are addressable by tag
 and a drone voice has no end (ADR 0005), `src/listening/` (pitch
-detection; Rust→WASM from change 006 (hear-me), ADR 0001).
+detection by the McLeod Pitch Method: NSDF, 2048-frame window, 512-frame hop,
+an onset gate so every analysed window is pure signal, in a second AudioWorklet
+sharing the sound context's AudioContext; the host shim in its `published/`;
+ADR 0006).
 `src/ui/` is the view layer over the contexts, not a context itself. Each
 context exposes `published/` and nothing else crosses its boundary
 (scripts/check-contexts.sh). Data files (instrument variants) and stored
```

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: none. Pasted outputs match the report's real runs (check 74/309; test:timing PASS; test:tuner PASS with the worst lines); Architecture updated; no FILL THIS IN.

<!-- recorded 2026-09-28T16:46:18Z by scripts/record.sh -->
