mod click;
mod tone;
mod voices;

use click::Click;
use tone::Tone;
use voices::{OnsetReport, Voice, VoiceKind, Voices, MAX_VOICES};

/// The render quantum: one call to `render` fills exactly this many mono frames.
const QUANTUM_FRAMES: usize = 128;

/// The synthesiser engine's state: the configured sample rate, the mono
/// output buffer for the current render quantum, the queued/sounding
/// voices, and the onset reports written by the most recent `render` call.
struct Engine {
    sample_rate: f32,
    output: [f32; QUANTUM_FRAMES],
    voices: Voices,
    reports: [f64; MAX_VOICES * 3],
}

impl Engine {
    const fn new() -> Self {
        Engine {
            sample_rate: 0.0,
            output: [0.0; QUANTUM_FRAMES],
            voices: Voices::new(),
            reports: [0.0; MAX_VOICES * 3],
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
    engine.voices.clear_all();
    engine.voices.set_sample_rate(sample_rate);
    engine.reports = [0.0; MAX_VOICES * 3];
}

/// Returns a pointer to the 128-frame mono output buffer filled by the most
/// recent `render` call.
#[no_mangle]
pub extern "C" fn output_ptr() -> *const f32 {
    engine().output.as_ptr()
}

/// Queues a plain synthesised tone voice starting at `onset_frame` (in the
/// same ever-increasing frame timeline `render` is called with) and lasting
/// `duration_frames`. Returns 1 if a voice slot was free, 0 if all 64 are in
/// use (the tone is dropped).
#[no_mangle]
pub extern "C" fn push_tone(tag: u32, hz: f32, onset_frame: f64, duration_frames: u32) -> u32 {
    let voice = Voice::new(
        tag,
        VoiceKind::Tone(Tone::new(hz)),
        onset_frame,
        duration_frames,
    );
    u32::from(engine().voices.push(voice))
}

/// Queues a metronome click voice — `accent` nonzero for the accented,
/// louder, lower click — starting at `onset_frame`. Its duration (25 ms) is
/// fixed by the click's sound design. Returns 1 if a voice slot was free, 0
/// if all 64 are in use (the click is dropped).
#[no_mangle]
pub extern "C" fn push_click(tag: u32, accent: u32, onset_frame: f64) -> u32 {
    let engine = engine();
    let duration_frames = Click::duration_frames(engine.sample_rate);
    let voice = Voice::new(
        tag,
        VoiceKind::Click(Click::new(accent != 0)),
        onset_frame,
        duration_frames,
    );
    u32::from(engine.voices.push(voice))
}

/// Silences every queued and sounding voice at once (❚❚, REQ-002).
#[no_mangle]
pub extern "C" fn stop_all() {
    engine().voices.clear_all();
}

/// Returns a pointer to the onset-report buffer filled by the most recent
/// `render` call: `render`'s return value `n` triples of
/// `[tag, onset_frame, actual_frame]`, beginning at this pointer.
#[no_mangle]
pub extern "C" fn report_ptr() -> *const f64 {
    engine().reports.as_ptr()
}

/// Fills the output buffer for frames `[now_frame, now_frame + 128)` with
/// the sum of every sounding voice, clears voices whose duration has
/// elapsed, writes an onset report for every voice rendering for the first
/// time this call, and returns how many reports were written.
#[no_mangle]
pub extern "C" fn render(now_frame: f64) -> u32 {
    let engine = engine();
    let mut reports = [OnsetReport {
        tag: 0,
        onset_frame: 0.0,
        actual_frame: 0.0,
    }; MAX_VOICES];
    let Engine {
        output,
        voices,
        reports: report_buf,
        ..
    } = engine;

    let n = voices.render_into(output, now_frame, &mut reports);
    for (i, report) in reports.iter().take(n).enumerate() {
        report_buf[3 * i] = f64::from(report.tag);
        report_buf[3 * i + 1] = report.onset_frame;
        report_buf[3 * i + 2] = report.actual_frame;
    }

    n as u32
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
        // sample (sin(0) = 0), so that sample alone can't tell "sounding"
        // from "silent" — frame 73, one step further round the phase, can.
        assert_ne!(
            out[73], 0.0,
            "frame 73 (one frame after the onset) should be sounding"
        );
    }

    #[test]
    fn onsets_are_reported_in_the_quantum_they_render() {
        let _guard = TEST_LOCK.lock().unwrap();

        // On-time onsets: reported in the quantum containing the onset
        // frame, with actual_frame equal to onset_frame.
        init(48000.0);
        push_tone(3, 440.0, 300.0, 4800);
        push_click(9, 1, 300.0);
        assert_eq!(render(0.0), 0);
        assert_eq!(render(128.0), 0);
        assert_eq!(render(256.0), 2);
        let reports = unsafe { std::slice::from_raw_parts(report_ptr(), 6) };
        assert_eq!(reports[0..3], [3.0, 300.0, 300.0]);
        assert_eq!(reports[3..6], [9.0, 300.0, 300.0]);

        // A voice whose onset has already passed by the time it is first
        // rendered (the host was slow to push it) is never dropped, and
        // reports the frame it actually started at, not the missed onset.
        init(48000.0);
        push_tone(5, 550.0, 100.0, 4800);
        assert_eq!(render(256.0), 1);
        let late = unsafe { std::slice::from_raw_parts(report_ptr(), 3) };
        assert_eq!(late, [5.0, 100.0, 256.0]);
    }

    #[test]
    fn stop_all_silences_within_one_quantum() {
        let _guard = TEST_LOCK.lock().unwrap();
        init(48000.0);
        push_tone(1, 440.0, 0.0, 48000);
        push_click(2, 0, 0.0);

        render(0.0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(
            out.iter().any(|s| *s != 0.0),
            "both voices should be sounding before stop_all"
        );

        stop_all();
        render(128.0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(
            out.iter().all(|s| *s == 0.0),
            "stop_all should silence every voice within one quantum"
        );
    }
}
