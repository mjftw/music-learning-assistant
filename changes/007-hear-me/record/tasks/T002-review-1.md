---
type: Task Review
title: Review package — T002 · 007-hear-me
description: The diff produced for T002, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T002.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T002.md
  - resource: git:935b9bf25dcc3fff694613a5ba6106a2b21ccb86..935b9bf25dcc3fff694613a5ba6106a2b21ccb86
generated:
  by: process:review-package.sh
  at: 2026-09-27T23:11:35Z
sdd_id: 007-hear-me
---

# Review package — T002 · 007-hear-me

base: `935b9bf25dcc3fff694613a5ba6106a2b21ccb86` → head: `935b9bf25dcc3fff694613a5ba6106a2b21ccb86`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/.gitignore b/.gitignore
index 5921b9b..6f10fbd 100644
--- a/.gitignore
+++ b/.gitignore
@@ -28,3 +28,4 @@ node_modules/
 dist/
 target/
 src/sound/pkg/
+src/listening/pkg/
diff --git a/scripts/build-sound.sh b/scripts/build-sound.sh
index ddafc59..1a78a11 100755
--- a/scripts/build-sound.sh
+++ b/scripts/build-sound.sh
@@ -1,5 +1,7 @@
 #!/usr/bin/env bash
-# Builds the sound crate to WebAssembly and stages it where the host loads it.
+# Builds the sound and listening crates to WebAssembly and stages them where
+# the host loads them (the script keeps its name from when there was only
+# one crate).
 #
 #   ./scripts/build-sound.sh
 set -euo pipefail
@@ -10,7 +12,8 @@ if ! command -v cargo >/dev/null 2>&1 || ! rustup target list --installed | grep
   exit 2
 fi
 
-cargo build --release --target wasm32-unknown-unknown -p sound
+cargo build --release --target wasm32-unknown-unknown -p sound -p listening
 
-mkdir -p src/sound/pkg
+mkdir -p src/sound/pkg src/listening/pkg
 cp target/wasm32-unknown-unknown/release/sound.wasm src/sound/pkg/sound.wasm
+cp target/wasm32-unknown-unknown/release/listening.wasm src/listening/pkg/listening.wasm
diff --git a/src/listening/src/lib.rs b/src/listening/src/lib.rs
index a557be3..191b97e 100644
--- a/src/listening/src/lib.rs
+++ b/src/listening/src/lib.rs
@@ -1,3 +1,193 @@
 mod detector;
+mod ring;
+
+use ring::{Ring, QUANTUM_FRAMES};
 
 pub use detector::{detect, Detection, CLARITY_THRESHOLD, MAX_HZ, MIN_HZ, WINDOW};
+
+/// The engine's state: the configured sample rate, the 128-frame quantum
+/// the host fills before each `push`, the analysis ring, the scratch buffer
+/// `detect` reads the window into, and the most recent detection's result
+/// triple.
+struct Engine {
+    sample_rate: f32,
+    input: [f32; QUANTUM_FRAMES],
+    ring: Ring,
+    window: [f32; WINDOW],
+    result: [f64; 3],
+}
+
+impl Engine {
+    const fn new() -> Self {
+        Engine {
+            sample_rate: 0.0,
+            input: [0.0; QUANTUM_FRAMES],
+            ring: Ring::new(),
+            window: [0.0; WINDOW],
+            result: [0.0; 3],
+        }
+    }
+}
+
+// The engine lives for the process lifetime and is only ever touched from
+// the single audio-rendering thread (the AudioWorklet's render thread, or
+// this thread in tests): `init` and `push` are never called concurrently.
+// `#[allow(static_mut_refs)]` documents that invariant to clippy rather than
+// working around it with interior mutability we do not otherwise need.
+static mut ENGINE: Engine = Engine::new();
+
+#[allow(static_mut_refs)]
+fn engine() -> &'static mut Engine {
+    unsafe { &mut ENGINE }
+}
+
+/// Configures the engine for the given sample rate and clears the ring.
+/// Must be called once before any `push` call.
+#[no_mangle]
+pub extern "C" fn init(sample_rate: f32) {
+    let engine = engine();
+    engine.sample_rate = sample_rate;
+    engine.input = [0.0; QUANTUM_FRAMES];
+    engine.ring.clear();
+    engine.window = [0.0; WINDOW];
+    engine.result = [0.0; 3];
+}
+
+/// Returns a pointer to the 128-frame mono input buffer the host fills
+/// before each `push`.
+#[no_mangle]
+pub extern "C" fn input_ptr() -> *mut f32 {
+    engine().input.as_mut_ptr()
+}
+
+/// Appends the 128 frames at `input_ptr` (frames `[now_frame, now_frame +
+/// 128)`) to the ring. When that completes a hop, analyses the window in
+/// place — never queued — and, on a detection, writes `[hz, clarity,
+/// at_frame]` (`at_frame = now_frame + 127`, the quantum's last frame) to
+/// the result buffer. Returns 1 if a detection was written, 0 otherwise (no
+/// hop yet, or nothing detected).
+#[no_mangle]
+pub extern "C" fn push(now_frame: f64) -> u32 {
+    let engine = engine();
+    let Engine {
+        input,
+        ring,
+        window,
+        result,
+        sample_rate,
+    } = engine;
+
+    if !ring.push_quantum(input) {
+        return 0;
+    }
+    ring.window(window);
+
+    let Some(detection) = detect(window, *sample_rate) else {
+        return 0;
+    };
+    result[0] = f64::from(detection.hz);
+    result[1] = f64::from(detection.clarity);
+    result[2] = now_frame + (QUANTUM_FRAMES as f64 - 1.0);
+    1
+}
+
+/// Returns a pointer to the 3-`f64` result buffer `[hz, clarity, at_frame]`
+/// written by the most recent `push` call that returned 1.
+#[no_mangle]
+pub extern "C" fn result_ptr() -> *const f64 {
+    engine().result.as_ptr()
+}
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use std::sync::Mutex;
+
+    static TEST_LOCK: Mutex<()> = Mutex::new(());
+
+    fn lock_engine() -> std::sync::MutexGuard<'static, ()> {
+        TEST_LOCK
+            .lock()
+            .unwrap_or_else(std::sync::PoisonError::into_inner)
+    }
+
+    // `chunks_exact` (not `as_chunks`) matches the brief's test code
+    // verbatim; the chunk size (128) is `QUANTUM_FRAMES`, fixed by the ABI.
+    #[allow(clippy::chunks_exact_to_as_chunks)]
+    fn feed(samples: &[f32], start_frame: f64) -> Vec<(f64, [f64; 3])> {
+        // pushes whole quanta; returns (now_frame, result) for every push that returned 1
+        let mut out = Vec::new();
+        let mut frame = start_frame;
+        for chunk in samples.chunks_exact(128) {
+            let dst = unsafe { std::slice::from_raw_parts_mut(input_ptr(), 128) };
+            dst.copy_from_slice(chunk);
+            if push(frame) == 1 {
+                let r = unsafe { std::slice::from_raw_parts(result_ptr(), 3) };
+                out.push((frame, [r[0], r[1], r[2]]));
+            }
+            frame += 128.0;
+        }
+        out
+    }
+
+    // listening.pitch-detection/REQ-004 (the crate's half of S3) — a hop is analysed in the push that completes it, never queued: exactly one result per HOP frames of a steady tone once the window is full
+    #[test]
+    fn req_004_s3_a_hop_is_analysed_in_place_never_queued() {
+        let _g = lock_engine();
+        init(48000.0);
+        let tone: Vec<f32> = (0..48000)
+            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
+            .collect();
+        let results = feed(&tone, 0.0);
+        let expected = (48000 - 2048) / 512 + 1;
+        assert_eq!(results.len(), expected);
+        for pair in results.windows(2) {
+            assert_eq!(pair[1].0 - pair[0].0, 512.0);
+        }
+        for (now, r) in &results {
+            assert_eq!(
+                r[2],
+                now + 127.0,
+                "at_frame is the last frame of the quantum"
+            );
+            assert!(r[0] > 439.0 && r[0] < 441.0);
+        }
+    }
+
+    // listening.pitch-detection/REQ-003/S3 — a breath between notes publishes nothing
+    #[test]
+    fn req_003_s3_a_breath_between_notes() {
+        let _g = lock_engine();
+        init(48000.0);
+        let tone = |n: usize| -> Vec<f32> {
+            (0..n)
+                .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
+                .collect()
+        };
+        let mut s = 12345u32;
+        let breath: Vec<f32> = (0..40960)
+            .map(|_| {
+                s = s.wrapping_mul(1664525).wrapping_add(1013904223);
+                (((s >> 8) as f32 / (1u32 << 24) as f32) - 0.5) * 0.05
+            })
+            .collect(); // 853 ms of quiet noise
+        let mut signal = tone(24064);
+        signal.extend(breath);
+        signal.extend(tone(24064));
+        let results = feed(&signal, 0.0);
+        let in_breath = results
+            .iter()
+            .filter(|(now, _)| *now >= 24064.0 + 2048.0 && *now < 24064.0 + 40960.0)
+            .count();
+        assert_eq!(
+            in_breath, 0,
+            "no detection while only breath fills the window"
+        );
+        assert!(
+            results
+                .iter()
+                .any(|(now, _)| *now >= 24064.0 + 40960.0 + 2048.0),
+            "the next tone is detected again"
+        );
+    }
+}
```

<!-- recorded 2026-09-27T23:13:50Z by scripts/record.sh -->
