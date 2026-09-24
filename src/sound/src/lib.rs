mod click;
mod tone;
mod voices;

use click::Click;
use tone::Tone;
use voices::{Length, OnsetReport, Voice, VoiceKind, Voices, MAX_VOICES};

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
        Length::Frames(duration_frames),
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
        Length::Frames(duration_frames),
    );
    u32::from(engine.voices.push(voice))
}

/// Silences every queued and sounding voice at once (❚❚, REQ-002), fading
/// each out over its own kind's release rather than cutting it instantly —
/// an abrupt cut is itself a click (REQ-005).
#[no_mangle]
pub extern "C" fn stop_all() {
    engine().voices.stop_all();
}

/// Marks the voice tagged `tag` — if any — to fade out over its own kind's
/// release rather than continuing or being cut abruptly; an unknown tag is
/// a no-op.
#[no_mangle]
pub extern "C" fn stop(tag: u32) {
    engine().voices.stop(tag);
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

    // A test that panics while holding `TEST_LOCK` (an assertion failing
    // after every engine call in that test has already completed, so the
    // engine itself is never left mid-mutation) poisons the `Mutex` for
    // every test that locks it afterwards — recovering keeps each test's
    // pass/fail independent of run order.
    fn lock_engine() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    #[test]
    fn render_fills_128_frames_of_silence_before_any_voice() {
        let _guard = lock_engine();
        init(48000.0);
        let n = render(0.0);
        assert_eq!(n, 0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(out.iter().all(|s| *s == 0.0));
    }

    #[test]
    fn a_tone_starts_exactly_at_its_onset_frame() {
        let _guard = lock_engine();
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
        let _guard = lock_engine();

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
    fn stop_all_silences_within_5ms_plus_one_quantum() {
        let _guard = lock_engine();
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
        // stop_all now fades over 5 ms rather than cutting instantly (an
        // abrupt cut is itself a click) — the fade begins at the next
        // render call (one quantum of latency to discover the stop) and
        // takes 240 frames (5 ms @ 48 kHz) from there, so full silence
        // lands a couple of quantums later rather than in the very next
        // one.
        render(128.0);
        render(256.0);
        render(384.0);
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(
            out.iter().all(|s| *s == 0.0),
            "stop_all should silence every voice within 5 ms plus one quantum"
        );
    }

    /// The largest absolute difference between two consecutive samples in
    /// `samples` — a click or a synthesis discontinuity shows up as an
    /// outsized step here.
    fn max_step(samples: &[f32]) -> f32 {
        samples
            .windows(2)
            .fold(0.0f32, |acc, pair| acc.max((pair[1] - pair[0]).abs()))
    }

    /// Renders `quantums` render-quantums back to back, starting at frame
    /// 0, and returns every rendered sample in order.
    fn render_all(quantums: u32) -> Vec<f32> {
        let mut samples = Vec::with_capacity(quantums as usize * QUANTUM_FRAMES);
        for q in 0..quantums {
            render(f64::from(q) * QUANTUM_FRAMES as f64);
            let out = unsafe { std::slice::from_raw_parts(output_ptr(), QUANTUM_FRAMES) };
            samples.extend_from_slice(out);
        }
        samples
    }

    // practice.session/REQ-005 — a 2 s scenario at 48 kHz (tones every
    // 500 ms, `duration_frames` 24 000 each, so the four tones exactly
    // fill the 96 000-frame/750-quantum render): a smooth sine has a small
    // per-sample step, so any large jump is a discontinuity (a crackle).
    #[test]
    fn tones_only_render_without_large_steps() {
        let _guard = lock_engine();
        init(48000.0);
        for (tag, onset) in [0.0, 24000.0, 48000.0, 72000.0].into_iter().enumerate() {
            push_tone(tag as u32 + 1, 880.0, onset, 24000);
        }

        let samples = render_all(750);
        let step = max_step(&samples);
        assert!(
            step < 0.05,
            "a smooth tone should not step by more than 0.05 between samples, got {step}"
        );
    }

    // A click is a sharper, louder transient than a tone, so it tolerates a
    // larger per-sample step before it counts as a discontinuity on top of
    // its own damped-sine shape.
    #[test]
    fn clicks_only_render_without_large_steps() {
        let _guard = lock_engine();
        init(48000.0);
        for (tag, onset) in [0.0, 24000.0, 48000.0, 72000.0].into_iter().enumerate() {
            let accent = tag == 0; // one accented beat, like a metronome downbeat
            push_click(tag as u32 + 1, u32::from(accent), onset);
        }

        let samples = render_all(750);
        let step = max_step(&samples);
        assert!(
            step < 0.25,
            "a click should not step by more than 0.25 between samples, got {step}"
        );
    }

    // Tones and clicks summed together (the realistic playback scenario):
    // both voices sounding at once should not add up to a step any more
    // discontinuous than each on its own, with headroom for their sum.
    #[test]
    fn tones_and_clicks_together_render_without_large_steps() {
        let _guard = lock_engine();
        init(48000.0);
        for (tag, onset) in [0.0, 24000.0, 48000.0, 72000.0].into_iter().enumerate() {
            let accent = tag == 0;
            push_tone(tag as u32 + 1, 880.0, onset, 24000);
            push_click(tag as u32 + 5, u32::from(accent), onset);
        }

        let samples = render_all(750);
        let step = max_step(&samples);
        assert!(
            step < 0.3,
            "tones and clicks together should not step by more than 0.3 between samples, got {step}"
        );
    }

    // A tone's 40 ms release already ramps it to silence by `onset_frame +
    // duration_frames` (tone::tests::tone_is_silent_before_its_next_onset);
    // this checks that boundary doesn't itself produce a discontinuity when
    // nothing follows it into silence.
    #[test]
    fn a_tone_ending_into_silence_has_no_large_step() {
        let _guard = lock_engine();
        init(48000.0);
        push_tone(1, 880.0, 0.0, 24000);

        // 190 quantums (24 320 frames) comfortably covers the tone's
        // 24 000-frame duration plus a margin of silence after it ends.
        let samples = render_all(190);
        let boundary = 24000usize;
        let step_into_boundary = (samples[boundary] - samples[boundary - 1]).abs();
        let step_out_of_boundary = (samples[boundary + 1] - samples[boundary]).abs();
        assert!(
            step_into_boundary < 0.05 && step_out_of_boundary < 0.05,
            "the tone's end should not itself be a discontinuity: {step_into_boundary}, {step_out_of_boundary}"
        );
    }

    // The genuine bug this file's other new tests rule out elsewhere:
    // `stop_all` used to clear a sounding voice instantly, which is itself
    // a click (a full-amplitude sample followed by silence). It now fades
    // over 5 ms instead. Tone only (not a click too): a click's own onset
    // has no attack ramp by design and steps by up to ~0.17 on its own
    // (clicks_only_render_without_large_steps), which would swamp the much
    // smaller step this test is isolating.
    #[test]
    fn stop_all_fades_rather_than_clicks() {
        let _guard = lock_engine();
        init(48000.0);
        push_tone(1, 880.0, 0.0, 48000);

        let mut samples = Vec::new();
        render(0.0);
        samples.extend_from_slice(unsafe { std::slice::from_raw_parts(output_ptr(), 128) });

        stop_all();

        // 12 quantums (1536 frames) comfortably covers the 5 ms (240-frame)
        // fade plus a margin, so the tail is guaranteed fully silent.
        for q in 1..12u32 {
            render(f64::from(q) * 128.0);
            samples.extend_from_slice(unsafe { std::slice::from_raw_parts(output_ptr(), 128) });
        }

        let step = max_step(&samples);
        assert!(
            step < 0.05,
            "stop_all should fade rather than click, max step was {step}"
        );

        let tail = &samples[samples.len() - 128..];
        assert!(
            tail.iter().all(|s| *s == 0.0),
            "voices should be fully silent well after the fade completes"
        );
    }

    #[test]
    fn stop_by_tag_leaves_other_voices_sounding() {
        let _guard = lock_engine();
        init(48000.0);
        push_tone(1, 440.0, 0.0, 48000);
        push_tone(2, 660.0, 0.0, 48000);
        render(0.0);
        stop(1);
        for q in 1..4 {
            render(f64::from(q) * 128.0);
        }
        let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
        assert!(out.iter().any(|s| *s != 0.0));
    }
}
