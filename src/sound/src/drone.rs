use std::f32::consts::PI;

/// 60 ms linear attack — REQ-001: audible within 50 ms of ▶, faded in
/// rather than struck (20 ms lead plus this ramp).
pub const ATTACK_S: f32 = 0.060;
/// 80 ms release — this is `VoiceKind::release_seconds` for `Drone`, the
/// same per-kind stop fade every other voice kind has (`Voices::stop`); it
/// is not part of `next_sample` itself. REQ-001: silent within 500 ms.
pub const RELEASE_S: f32 = 0.080;
/// The highest harmonic multiple any drone sound's table reaches. A
/// partial at or above the Nyquist frequency for the drone's own pitch is
/// skipped at render time regardless (band-limited).
pub const MAX_HARMONIC: usize = 24;
/// The summed |gain| of every partial, so the peak never exceeds it: ≤ 0.6
/// × the tone's own peak (tone::PEAK_GAIN · 1.25 = 0.3125).
pub const PEAK_GAIN: f32 = 0.15;
/// How long a `retune` takes to reach its target pitch — a linear glide,
/// not a restart (practice.drone/REQ-003: within 100 ms).
pub const GLIDE_S: f32 = 0.040;

/// The three drone sounds offered from the Drone sheet's Sound row
/// (practice.drone/REQ-005): pure, a single sine; warm, a soft blend with
/// a sub-octave; reed, a buzzier blend.
#[derive(Clone, Copy, PartialEq)]
pub enum DroneSound {
    Pure,
    Warm,
    Reed,
}

impl DroneSound {
    /// The sound code `push_drone` receives over the C ABI: 0 → Pure,
    /// 1 → Warm, 2 → Reed; anything else is not a known sound.
    pub fn from_code(code: u32) -> Option<DroneSound> {
        match code {
            0 => Some(DroneSound::Pure),
            1 => Some(DroneSound::Warm),
            2 => Some(DroneSound::Reed),
            _ => None,
        }
    }
}

/// The low-pass roll-off applied to every partial above the fundamental —
/// the design's 5·f0 low-pass expressed as a one-pole roll-off: 1 at the
/// fundamental, falling off as the partial number `k` climbs.
fn lowpass(k: usize) -> f32 {
    1.0 / (1.0 + (k as f32 / 5.0).powi(2)).sqrt()
}

/// An additive, band-limited drone voice: a fixed table of partial gains
/// built once at construction — index 0 the sub-octave (0.5×), index `k`
/// the `k`-th multiple of the fundamental — summed and attack-enveloped
/// each sample. Its release is `VoiceKind::release_seconds` (`RELEASE_S`),
/// not part of `next_sample`.
#[derive(Clone, Copy)]
pub struct Drone {
    // Kept at f64 (unlike the f32 the rest of the voice runs at) because a
    // glide adds `glide_per_frame` on every one of ~2000 frames; at f32
    // precision that many additions drift by more than a cent — f64 has
    // headroom enough that the drift never shows up in a synthesised pitch.
    hz: f64,
    target_hz: f64,
    glide_per_frame: f64,
    phase: f32,
    gains: [f32; MAX_HARMONIC + 1],
}

impl Drone {
    pub fn new(hz: f32, sound: DroneSound) -> Self {
        let mut gains = [0.0f32; MAX_HARMONIC + 1];

        match sound {
            DroneSound::Pure => {
                gains[1] = 1.0;
            }
            DroneSound::Warm => {
                gains[1] += 0.8; // the fundamental, sine
                gains[0] += 0.35; // the sub-octave, sine
                for (k, gain) in gains.iter_mut().enumerate().skip(1) {
                    *gain += 0.22 * (2.0 / PI) / k as f32 * lowpass(k); // sawtooth
                }
            }
            DroneSound::Reed => {
                for (k, gain) in gains.iter_mut().enumerate().skip(1).step_by(2) {
                    *gain += 0.16 * (4.0 / PI) / k as f32 * lowpass(k); // square, odd partials
                }
                for (k, gain) in gains.iter_mut().enumerate().skip(1) {
                    *gain += 0.20 * (2.0 / PI) / k as f32 * lowpass(k); // sawtooth
                }
                gains[0] += 0.30; // the sub-octave, sine
            }
        }

        // Scaled so the summed |gain| of every partial equals PEAK_GAIN —
        // the peak can then never exceed it, whatever the phases add up to.
        let total: f32 = gains.iter().map(|gain| gain.abs()).sum();
        for gain in gains.iter_mut() {
            *gain *= PEAK_GAIN / total;
        }

        Drone {
            hz: f64::from(hz),
            target_hz: f64::from(hz),
            glide_per_frame: 0.0,
            phase: 0.0,
            gains,
        }
    }

    /// The pitch this instant — `hz` mid-glide, the target once it has
    /// arrived (tests). No production code reads a drone's `hz` back out;
    /// `#[allow(dead_code)]` documents that to clippy rather than inventing
    /// a caller that doesn't otherwise exist — the `cdylib` crate type
    /// flags an unread `pub` method as dead even though the `rlib` target
    /// (what `cargo test` compiles) exercises it.
    #[allow(dead_code)]
    pub fn hz(&self) -> f32 {
        self.hz as f32
    }

    /// Starts a linear glide from the current `hz` to `hz`, reaching it
    /// `GLIDE_S` later; a retune mid-glide restarts the glide from where
    /// the pitch is right now, not from the old target
    /// (practice.drone/REQ-003).
    pub fn retune(&mut self, hz: f32, sample_rate: f32) {
        self.target_hz = f64::from(hz);
        self.glide_per_frame = (self.target_hz - self.hz) / f64::from(GLIDE_S * sample_rate);
    }

    /// Attack-enveloped sum of the partials below Nyquist at
    /// `elapsed_frames` since onset. Moves `hz` one `glide_per_frame` step
    /// toward `target_hz`, clamped so it never overshoots.
    pub fn next_sample(&mut self, elapsed_frames: f64, sample_rate: f32) -> f32 {
        if self.hz != self.target_hz {
            self.hz += self.glide_per_frame;
            let overshot = (self.glide_per_frame > 0.0 && self.hz > self.target_hz)
                || (self.glide_per_frame < 0.0 && self.hz < self.target_hz);
            if overshot {
                self.hz = self.target_hz;
            }
        }
        let hz = self.hz as f32;

        let mut value = self.gains[0] * (0.5 * self.phase).sin();
        for k in 1..=MAX_HARMONIC {
            if k as f32 * hz >= sample_rate / 2.0 {
                break; // band-limited: k·hz only grows from here
            }
            value += self.gains[k] * (k as f32 * self.phase).sin();
        }

        // Advances by a full cycle of the fundamental per `hz` cycles per
        // second, wrapping at 4π rather than 2π so the 0.5× sub-octave
        // partial (half the phase rate) stays continuous across the wrap.
        self.phase += 2.0 * PI * hz / sample_rate;
        if self.phase > 4.0 * PI {
            self.phase -= 4.0 * PI;
        }

        value * attack(elapsed_frames, sample_rate)
    }
}

/// The linear attack multiplier at `elapsed_frames` since onset, at
/// `sample_rate` — 0 at onset, full level by `ATTACK_S`.
fn attack(elapsed_frames: f64, sample_rate: f32) -> f32 {
    let attack_frames = f64::from(ATTACK_S * sample_rate);
    ((elapsed_frames / attack_frames) as f32).min(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tone::Tone;
    use crate::voices::Length;
    use std::f32::consts::PI;

    const SAMPLE_RATE: f32 = 48000.0;

    /// The power Goertzel's algorithm reports at `hz` within `samples`
    /// sampled at `sample_rate` — a narrowband energy detector used to
    /// check a waveform's partials without a full FFT.
    fn goertzel_power(samples: &[f32], hz: f32, sample_rate: f32) -> f32 {
        let n = samples.len() as f32;
        let k = (0.5 + n * hz / sample_rate).floor();
        let omega = 2.0 * PI * k / n;
        let coeff = 2.0 * omega.cos();
        let (mut s1, mut s2) = (0.0f32, 0.0f32);
        for &sample in samples {
            let s0 = sample + coeff * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        s1 * s1 + s2 * s2 - coeff * s1 * s2
    }

    // practice.drone/REQ-005/S2 — pure is a sine: Goertzel power at 2f..8f each < −40 dB relative to f
    #[test]
    fn pure_drone_has_a_single_partial() {
        let mut drone = Drone::new(440.0, DroneSound::Pure);
        let samples: Vec<f32> = (0..48000)
            .map(|f| drone.next_sample(f64::from(f) + 4800.0, SAMPLE_RATE))
            .collect();
        let fundamental = goertzel_power(&samples, 440.0, SAMPLE_RATE);
        for k in 2..=8 {
            let partial = goertzel_power(&samples, 440.0 * k as f32, SAMPLE_RATE);
            assert!(
                10.0 * (partial / fundamental).log10() < -40.0,
                "partial {k} too loud"
            );
        }
    }

    // practice.drone/REQ-001/S1 — faded in, audible within 50 ms: ≥ 5 % of full level by 30 ms, full by 60 ms
    #[test]
    fn drone_attack_is_audible_by_30ms_and_full_by_60ms() {
        for (sound, label) in [
            (DroneSound::Pure, "pure"),
            (DroneSound::Warm, "warm"),
            (DroneSound::Reed, "reed"),
        ] {
            let mut drone = Drone::new(440.0, sound);
            let mut peak_at_30ms: f32 = 0.0;
            let mut peak_at_60ms: f32 = 0.0;
            let mut steady_peak: f32 = 0.0;
            for frame in 0..48000u32 {
                let sample = drone.next_sample(f64::from(frame), SAMPLE_RATE);
                if (1200..1440).contains(&frame) {
                    peak_at_30ms = peak_at_30ms.max(sample.abs());
                }
                if (2880..3120).contains(&frame) {
                    peak_at_60ms = peak_at_60ms.max(sample.abs());
                }
                if frame >= 4800 {
                    steady_peak = steady_peak.max(sample.abs());
                }
            }
            assert!(
                peak_at_30ms >= 0.05 * PEAK_GAIN,
                "{label} should be ≥5% of full level by 30 ms, got {peak_at_30ms}"
            );
            assert!(
                peak_at_60ms >= 0.9 * steady_peak,
                "{label} should be at ≥90% of its steady peak ({steady_peak}) by 60 ms, got {peak_at_60ms}"
            );
        }
    }

    // practice.drone/REQ-005/S4 — every sound's steady peak ≤ 0.6 × the tone's steady peak
    #[test]
    fn every_drone_sound_peaks_at_most_60_percent_of_a_tone() {
        let mut tone = Tone::new(440.0);
        let mut tone_peak: f32 = 0.0;
        for frame in 0..48000u32 {
            let sample = tone.next_sample(f64::from(frame), Length::Frames(96000), SAMPLE_RATE);
            tone_peak = tone_peak.max(sample.abs());
        }

        for sound in [DroneSound::Pure, DroneSound::Warm, DroneSound::Reed] {
            let mut drone = Drone::new(440.0, sound);
            let mut drone_peak: f32 = 0.0;
            for frame in 0..48000u32 {
                let sample = drone.next_sample(f64::from(frame) + 4800.0, SAMPLE_RATE);
                drone_peak = drone_peak.max(sample.abs());
            }
            assert!(
                drone_peak <= 0.6 * tone_peak,
                "a drone sound should peak at most 60% of a tone's peak ({tone_peak}), got {drone_peak}"
            );
        }
    }

    // practice.drone/REQ-003/S1 — the pitch glides to the new one within 100 ms (GLIDE_S = 40 ms), nothing restarts
    #[test]
    fn retune_reaches_the_target_within_40ms_without_a_step() {
        let mut drone = Drone::new(783.99, DroneSound::Warm);
        let mut samples = Vec::new();
        for f in 0..4800 {
            samples.push(drone.next_sample(f64::from(f), SAMPLE_RATE));
        }
        drone.retune(587.33, SAMPLE_RATE);
        for f in 4800..9600 {
            samples.push(drone.next_sample(f64::from(f), SAMPLE_RATE));
        }
        assert!(
            (drone.hz() - 587.33).abs() < 0.01,
            "should have reached the target, at {}",
            drone.hz()
        );
        let after_1920 = {
            let mut d = Drone::new(783.99, DroneSound::Warm);
            for f in 0..4800 {
                d.next_sample(f64::from(f), SAMPLE_RATE);
            }
            d.retune(587.33, SAMPLE_RATE);
            for f in 4800..6720 {
                d.next_sample(f64::from(f), SAMPLE_RATE);
            }
            d.hz()
        };
        assert!(
            (after_1920 - 587.33).abs() < 0.01,
            "40 ms = 1920 frames after retune the glide is complete"
        );
        let step = samples
            .windows(2)
            .fold(0.0f32, |m, p| m.max((p[1] - p[0]).abs()));
        assert!(step < 0.05, "a glide must not step, got {step}");
    }

    // Not a correctness test — Reed is the most expensive sound (every
    // partial's table populated) and 440 Hz keeps all 24 harmonics under
    // Nyquist at 48 kHz, so this is the worst case `render_into` calls
    // `next_sample` for. `--ignored --nocapture` reports it on demand; it
    // is not part of the ordinary suite.
    #[test]
    #[ignore]
    fn reed_drone_render_cost() {
        let mut drone = Drone::new(440.0, DroneSound::Reed);
        let quantums = 375u32;
        let start = std::time::Instant::now();
        for frame in 0..(quantums * 128) {
            std::hint::black_box(drone.next_sample(f64::from(frame), SAMPLE_RATE));
        }
        let elapsed = start.elapsed();
        let us_per_quantum = elapsed.as_secs_f64() * 1_000_000.0 / f64::from(quantums);
        println!("{us_per_quantum:.2} µs per quantum");
    }
}
