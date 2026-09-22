/// The render quantum: one call to `render` fills exactly this many mono frames.
const QUANTUM_FRAMES: usize = 128;

/// The synthesiser engine's state: the configured sample rate and the mono
/// output buffer for the current render quantum.
struct Engine {
    sample_rate: f32,
    output: [f32; QUANTUM_FRAMES],
}

impl Engine {
    const fn new() -> Self {
        Engine {
            sample_rate: 0.0,
            output: [0.0; QUANTUM_FRAMES],
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
}

/// Returns a pointer to the 128-frame mono output buffer filled by the most
/// recent `render` call.
#[no_mangle]
pub extern "C" fn output_ptr() -> *const f32 {
    engine().output.as_ptr()
}

/// Fills the output buffer for frames `[now_frame, now_frame + 128)` and
/// returns the number of onset reports written (always 0 until voices exist).
#[no_mangle]
pub extern "C" fn render(_now_frame: f64) -> u32 {
    let engine = engine();
    engine.output = [0.0; QUANTUM_FRAMES];
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn render_fills_128_frames_of_silence_before_any_voice() {
        init(48000.0);
        let n = render(0.0);
        assert_eq!(n, 0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(out.iter().all(|s| *s == 0.0));
    }
}
