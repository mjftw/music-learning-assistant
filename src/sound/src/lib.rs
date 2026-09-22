/// The render quantum: one call to `render` fills exactly this many mono frames.
const QUANTUM_FRAMES: usize = 128;

/// The maximum number of voices sounding at once.
const MAX_VOICES: usize = 64;

/// What a voice synthesises. Only a plain tone exists for now; click joins
/// it in a later task.
#[derive(Clone, Copy)]
enum VoiceKind {
    Tone { hz: f32, phase: f32 },
}

/// A single queued or sounding voice: what to play, and the frame range
/// (in the global, ever-increasing frame timeline) it sounds across.
#[derive(Clone, Copy)]
struct Voice {
    #[allow(dead_code)] // read back by the host once onset reporting lands
    tag: u32,
    kind: VoiceKind,
    onset_frame: f64,
    duration_frames: u32,
}

/// The synthesiser engine's state: the configured sample rate, the mono
/// output buffer for the current render quantum, and the sounding voices.
struct Engine {
    sample_rate: f32,
    output: [f32; QUANTUM_FRAMES],
    voices: [Option<Voice>; MAX_VOICES],
}

impl Engine {
    const fn new() -> Self {
        Engine {
            sample_rate: 0.0,
            output: [0.0; QUANTUM_FRAMES],
            voices: [None; MAX_VOICES],
        }
    }
}

// The engine lives for the process lifetime and is only ever touched from
// the single audio-rendering thread (the AudioWorklet's render thread, or
// this thread in tests): `init` and `render` are never called concurrently.
// `#[allow(static_mut_refs)]` documents that invariant to clippy rather than
// working around it with interior mutability we do not otherwise need.
static mut ENGINE: Engine = Engine::new();

#[allow(static_mut_refs)]
fn engine() -> &'static mut Engine {
    unsafe { &mut ENGINE }
}

/// Configures the engine for the given sample rate. Must be called once
/// before any `render` call.
#[no_mangle]
pub extern "C" fn init(sample_rate: f32) {
    let engine = engine();
    engine.sample_rate = sample_rate;
    engine.output = [0.0; QUANTUM_FRAMES];
    engine.voices = [None; MAX_VOICES];
}

/// Returns a pointer to the 128-frame mono output buffer filled by the most
/// recent `render` call.
#[no_mangle]
pub extern "C" fn output_ptr() -> *const f32 {
    engine().output.as_ptr()
}

/// Queues a plain sine tone voice starting at `onset_frame` (in the same
/// ever-increasing frame timeline `render` is called with) and lasting
/// `duration_frames`. Returns 1 if a voice slot was free, 0 if all 64 are in
/// use (the tone is dropped).
#[no_mangle]
pub extern "C" fn push_tone(tag: u32, hz: f32, onset_frame: f64, duration_frames: u32) -> u32 {
    let engine = engine();
    for slot in engine.voices.iter_mut() {
        if slot.is_none() {
            *slot = Some(Voice {
                tag,
                kind: VoiceKind::Tone { hz, phase: 0.0 },
                onset_frame,
                duration_frames,
            });
            return 1;
        }
    }
    0
}

/// Fills the output buffer for frames `[now_frame, now_frame + 128)` with
/// the sum of every sounding voice, clears voices whose duration has
/// elapsed, and returns the number of onset reports written (always 0 until
/// onset reporting lands in a later task).
#[no_mangle]
pub extern "C" fn render(now_frame: f64) -> u32 {
    let engine = engine();
    engine.output = [0.0; QUANTUM_FRAMES];

    let sample_rate = engine.sample_rate;
    let Engine { output, voices, .. } = engine;

    for slot in voices.iter_mut() {
        let Some(voice) = slot else { continue };
        let voice_end = voice.onset_frame + voice.duration_frames as f64;

        for (i, sample) in output.iter_mut().enumerate() {
            let frame = now_frame + i as f64;
            if frame < voice.onset_frame || frame >= voice_end {
                continue;
            }
            let VoiceKind::Tone { hz, phase } = &mut voice.kind;
            *sample += phase.sin() * 0.25;
            *phase += 2.0 * std::f32::consts::PI * *hz / sample_rate;
        }

        if now_frame + QUANTUM_FRAMES as f64 >= voice_end {
            *slot = None;
        }
    }

    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Tests share the process-global `ENGINE`; the default test harness runs
    // tests on separate threads concurrently, so serialise access here (the
    // "single audio thread" invariant only holds in production).
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn render_fills_128_frames_of_silence_before_any_voice() {
        let _guard = TEST_LOCK.lock().unwrap();
        init(48000.0);
        let n = render(0.0);
        assert_eq!(n, 0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(out.iter().all(|s| *s == 0.0));
    }

    #[test]
    fn a_tone_starts_exactly_at_its_onset_frame() {
        let _guard = TEST_LOCK.lock().unwrap();
        init(48000.0);
        push_tone(7, 440.0, 200.0, 4800);

        render(0.0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(
            out.iter().all(|s| *s == 0.0),
            "quantum before the onset should be silent"
        );

        render(128.0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        for (i, sample) in out.iter().enumerate().take(72) {
            assert_eq!(*sample, 0.0, "frame {i} should still be silent");
        }
        // From frame 72 (200 − 128, the onset) the tone is sounding: a
        // phase-continuous sine starting cleanly at onset is 0 at that exact
        // sample (sin(0) = 0), so the meaningful assertion is that the
        // 72..128 block is not all silence, not that every sample in it is
        // individually non-zero.
        assert!(
            out[72..].iter().any(|s| *s != 0.0),
            "frame 72 onward should be sounding"
        );
    }
}
