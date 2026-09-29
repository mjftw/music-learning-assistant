mod detector;
mod ring;

use ring::{Ring, QUANTUM_FRAMES};

pub use detector::{detect, Detection, CLARITY_THRESHOLD, MAX_HZ, MIN_HZ, WINDOW};

/// The engine's state: the configured sample rate, the 128-frame quantum
/// the host fills before each `push`, the analysis ring, the scratch buffer
/// `detect` reads the window into, and the most recent detection's result
/// triple.
struct Engine {
    sample_rate: f32,
    input: [f32; QUANTUM_FRAMES],
    ring: Ring,
    window: [f32; WINDOW],
    result: [f64; 3],
}

impl Engine {
    const fn new() -> Self {
        Engine {
            sample_rate: 0.0,
            input: [0.0; QUANTUM_FRAMES],
            ring: Ring::new(),
            window: [0.0; WINDOW],
            result: [0.0; 3],
        }
    }
}

// The engine lives for the process lifetime and is only ever touched from
// the single audio-rendering thread (the AudioWorklet's render thread, or
// this thread in tests): `init` and `push` are never called concurrently.
// `#[allow(static_mut_refs)]` documents that invariant to clippy rather than
// working around it with interior mutability we do not otherwise need.
static mut ENGINE: Engine = Engine::new();

#[allow(static_mut_refs)]
fn engine() -> &'static mut Engine {
    unsafe { &mut ENGINE }
}

/// Configures the engine for the given sample rate and clears the ring.
/// Must be called once before any `push` call.
#[no_mangle]
pub extern "C" fn init(sample_rate: f32) {
    let engine = engine();
    engine.sample_rate = sample_rate;
    engine.input = [0.0; QUANTUM_FRAMES];
    engine.ring.clear();
    engine.window = [0.0; WINDOW];
    engine.result = [0.0; 3];
}

/// Returns a pointer to the 128-frame mono input buffer the host fills
/// before each `push`.
#[no_mangle]
pub extern "C" fn input_ptr() -> *mut f32 {
    engine().input.as_mut_ptr()
}

/// Appends the 128 frames at `input_ptr` (frames `[now_frame, now_frame +
/// 128)`) to the ring. When that completes a hop, analyses the window in
/// place — never queued — and, on a detection, writes `[hz, clarity,
/// at_frame]` (`at_frame = now_frame + 127`, the quantum's last frame) to
/// the result buffer. Returns 1 if a detection was written, 0 otherwise (no
/// hop yet, or nothing detected).
#[no_mangle]
pub extern "C" fn push(now_frame: f64) -> u32 {
    let engine = engine();
    let Engine {
        input,
        ring,
        window,
        result,
        sample_rate,
    } = engine;

    if !ring.push_quantum(input) {
        return 0;
    }
    ring.window(window);

    let Some(detection) = detect(window, *sample_rate) else {
        return 0;
    };
    result[0] = f64::from(detection.hz);
    result[1] = f64::from(detection.clarity);
    result[2] = now_frame + (QUANTUM_FRAMES as f64 - 1.0);
    1
}

/// Returns a pointer to the 3-`f64` result buffer `[hz, clarity, at_frame]`
/// written by the most recent `push` call that returned 1.
#[no_mangle]
pub extern "C" fn result_ptr() -> *const f64 {
    engine().result.as_ptr()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn lock_engine() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    // `chunks_exact` (not `as_chunks`) matches the brief's test code
    // verbatim; the chunk size (128) is `QUANTUM_FRAMES`, fixed by the ABI.
    #[allow(clippy::chunks_exact_to_as_chunks)]
    fn feed(samples: &[f32], start_frame: f64) -> Vec<(f64, [f64; 3])> {
        // pushes whole quanta; returns (now_frame, result) for every push that returned 1
        let mut out = Vec::new();
        let mut frame = start_frame;
        for chunk in samples.chunks_exact(128) {
            let dst = unsafe { std::slice::from_raw_parts_mut(input_ptr(), 128) };
            dst.copy_from_slice(chunk);
            if push(frame) == 1 {
                let r = unsafe { std::slice::from_raw_parts(result_ptr(), 3) };
                out.push((frame, [r[0], r[1], r[2]]));
            }
            frame += 128.0;
        }
        out
    }

    // listening.pitch-detection/REQ-004 (the crate's half of S3) — a hop is analysed in the push that completes it, never queued: exactly one result per HOP frames of a steady tone once the window is full
    #[test]
    fn req_004_s3_a_hop_is_analysed_in_place_never_queued() {
        let _g = lock_engine();
        init(48000.0);
        let tone: Vec<f32> = (0..48000)
            .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
            .collect();
        let results = feed(&tone, 0.0);
        let expected = (48000 - 2048) / 512 + 1;
        assert_eq!(results.len(), expected);
        for pair in results.windows(2) {
            assert_eq!(pair[1].0 - pair[0].0, 512.0);
        }
        for (now, r) in &results {
            assert_eq!(
                r[2],
                now + 127.0,
                "at_frame is the last frame of the quantum"
            );
            assert!(r[0] > 439.0 && r[0] < 441.0);
        }
    }

    // Continues a sine of `hz` starting at phase index `start_index` for `count` more
    // samples — lets a test build one continuous tone across several `Vec`s that are
    // concatenated (an onset quantum's tail, then the rest of the tone).
    fn sine_from(hz: f32, start_index: usize, count: usize) -> Vec<f32> {
        (0..count)
            .map(|i| {
                (2.0 * std::f32::consts::PI * hz * (start_index + i) as f32 / 48000.0).sin() * 0.5
            })
            .collect()
    }

    fn cents(hz: f64, of: f32) -> f64 {
        1200.0 * (hz / f64::from(of)).log2()
    }

    // Feeds 20 silent quanta, then one onset quantum whose first 100 samples are silence
    // and whose last 28 start `hz`'s sine, then the sine continuing across quanta for
    // 1.5 s. Every published detection must be within ±2 ¢ of `hz`, and at least one
    // must be published — the guarantee that a note's onset, landing mid-quantum as Web
    // Audio's sample-accurate `start()` does, is never analysed against a window still
    // partly the silence that preceded it.
    fn assert_mid_quantum_onset_never_misreads(hz: f32) {
        let _g = lock_engine();
        init(48000.0);

        let mut signal = vec![0.0f32; 128 * 20];
        let mut onset_quantum = vec![0.0f32; 100];
        onset_quantum.extend(sine_from(hz, 0, 28));
        assert_eq!(onset_quantum.len(), 128);
        signal.extend(onset_quantum);
        signal.extend(sine_from(hz, 28, 72_000)); // 1.5 s continuing

        let results = feed(&signal, 0.0);
        assert!(
            !results.is_empty(),
            "{hz} Hz: expected at least one published detection"
        );
        for (now, r) in &results {
            assert!(
                cents(r[0], hz).abs() <= 2.0,
                "{hz} Hz: at frame {now}, published {} ({} ¢ off)",
                r[0],
                cents(r[0], hz)
            );
        }
    }

    // listening.pitch-detection/REQ-002 — a note's onset, landing mid-quantum, never
    // publishes a wrong pitch: covers a mid-quantum onset at the low end (E2) and the
    // high end (C7), and a tone change with no silence between (D♯2→E2, the change
    // itself mid-quantum) — `detect()`'s own contract is a window of a steady tone; this
    // partial-window guarantee is the pipeline's (ring onset gate), so it lives here,
    // not in `detector.rs`.
    #[test]
    fn req_002_a_note_onset_mid_quantum_never_publishes_a_wrong_pitch() {
        assert_mid_quantum_onset_never_misreads(82.41); // E2
        assert_mid_quantum_onset_never_misreads(2093.0); // C7

        // A D♯2→E2 change with no silence between them — the onset gate only resets on
        // a silence→signal transition, so it does nothing here; a window still
        // straddling the change may read anything, and that is the hand-over's business,
        // not this guarantee's. Only readings from ≥100 ms after the change are
        // asserted; the change itself lands mid-quantum (2600 is not a multiple of 128).
        let _g = lock_engine();
        init(48000.0);
        let d_sharp_2 = 77.78f32;
        let e2 = 82.41f32;
        let change_frame = 128 * 20 + 40; // 2600: mid-quantum, not a quantum boundary
        let mut signal = sine_from(d_sharp_2, 0, change_frame);
        signal.extend(sine_from(e2, 0, 72_000));

        let results = feed(&signal, 0.0);
        let settle_frames = 4_800.0; // 100 ms @ 48 kHz
        let late: Vec<_> = results
            .iter()
            .filter(|(now, _)| *now >= change_frame as f64 + settle_frames)
            .collect();
        assert!(
            !late.is_empty(),
            "expected published detections well after the change"
        );
        for (now, r) in &late {
            assert!(
                cents(r[0], e2).abs() <= 2.0,
                "at frame {now}, published {} ({} ¢ off E2)",
                r[0],
                cents(r[0], e2)
            );
        }
    }

    // listening.pitch-detection/REQ-003/S3 — a breath between notes publishes nothing
    #[test]
    fn req_003_s3_a_breath_between_notes() {
        let _g = lock_engine();
        init(48000.0);
        let tone = |n: usize| -> Vec<f32> {
            (0..n)
                .map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5)
                .collect()
        };
        let mut s = 12345u32;
        let breath: Vec<f32> = (0..40960)
            .map(|_| {
                s = s.wrapping_mul(1664525).wrapping_add(1013904223);
                (((s >> 8) as f32 / (1u32 << 24) as f32) - 0.5) * 0.05
            })
            .collect(); // 853 ms of quiet noise
        let mut signal = tone(24064);
        signal.extend(breath);
        signal.extend(tone(24064));
        let results = feed(&signal, 0.0);
        let in_breath = results
            .iter()
            .filter(|(now, _)| *now >= 24064.0 + 2048.0 && *now < 24064.0 + 40960.0)
            .count();
        assert_eq!(
            in_breath, 0,
            "no detection while only breath fills the window"
        );
        assert!(
            results
                .iter()
                .any(|(now, _)| *now >= 24064.0 + 40960.0 + 2048.0),
            "the next tone is detected again"
        );
    }
}
