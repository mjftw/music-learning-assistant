use std::f32::consts::PI;

/// The click's total length: how long until it has decayed to −60 dB.
const DURATION_S: f32 = 0.025;

/// A soft, woody click: a damped sine at these frequencies. The accent beat
/// is lower and louder, like a conductor's downbeat.
const NORMAL_HZ: f32 = 1800.0;
const ACCENT_HZ: f32 = 1200.0;

/// Peak level (−9 dBFS) and the accent's extra gain (+6 dB ≈ ×2).
const PEAK_GAIN: f32 = 0.355;
const ACCENT_GAIN: f32 = 2.0;

/// The exponential decay rate that reaches −60 dB (amplitude ×0.001) at
/// `DURATION_S`: −ln(0.001) / `DURATION_S`, precomputed since `f32::ln` is
/// not a `const fn`.
const DECAY_RATE_PER_S: f32 = 276.310_2;

/// A soft, woody metronome click: an exponentially-decaying damped sine.
#[derive(Clone, Copy)]
pub struct Click {
    hz: f32,
    gain: f32,
    phase: f32,
}

impl Click {
    pub fn new(accent: bool) -> Self {
        Click {
            hz: if accent { ACCENT_HZ } else { NORMAL_HZ },
            gain: if accent {
                PEAK_GAIN * ACCENT_GAIN
            } else {
                PEAK_GAIN
            },
            phase: 0.0,
        }
    }

    /// How many frames the click lasts at `sample_rate` — its voice's
    /// `duration_frames`.
    pub fn duration_frames(sample_rate: f32) -> u32 {
        (DURATION_S * sample_rate).round() as u32
    }

    /// Advances the oscillator by one sample and returns the damped value
    /// at `elapsed_frames` into the click, sampled at `sample_rate`.
    pub fn next_sample(&mut self, elapsed_frames: f64, sample_rate: f32) -> f32 {
        let raw = self.phase.sin();
        self.phase += 2.0 * PI * self.hz / sample_rate;
        if self.phase > 2.0 * PI {
            self.phase -= 2.0 * PI;
        }

        let t = (elapsed_frames as f32) / sample_rate;
        let envelope = (-DECAY_RATE_PER_S * t).exp();
        raw * self.gain * envelope
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_RATE: f32 = 48000.0;

    #[test]
    fn click_lasts_25_ms() {
        let mut click = Click::new(false);
        let mut peak_early: f32 = 0.0;
        let mut peak_late: f32 = 0.0;

        for frame in 0..2000u32 {
            let sample = click.next_sample(frame as f64, SAMPLE_RATE);
            if frame < 100 {
                peak_early = peak_early.max(sample.abs());
            }
            if frame >= 1200 {
                peak_late = peak_late.max(sample.abs());
            }
        }

        assert!(
            peak_early > 0.2,
            "click should be clearly sounding in the first 100 frames, peak was {peak_early}"
        );
        assert!(
            peak_late < 1e-3,
            "click should have decayed to near-silence 25 ms in, peak was {peak_late}"
        );
    }

    #[test]
    fn accent_is_louder_and_lower() {
        let mut normal = Click::new(false);
        let mut accent = Click::new(true);

        let mut normal_peak: f32 = 0.0;
        let mut accent_peak: f32 = 0.0;
        let mut normal_crossings = 0u32;
        let mut accent_crossings = 0u32;
        let mut prev_normal = 0.0f32;
        let mut prev_accent = 0.0f32;

        const TEN_MS_FRAMES: u32 = 480; // 10 ms at 48 kHz

        for frame in 0..2000u32 {
            let normal_sample = normal.next_sample(frame as f64, SAMPLE_RATE);
            let accent_sample = accent.next_sample(frame as f64, SAMPLE_RATE);
            normal_peak = normal_peak.max(normal_sample.abs());
            accent_peak = accent_peak.max(accent_sample.abs());

            if frame < TEN_MS_FRAMES {
                if prev_normal * normal_sample < 0.0 {
                    normal_crossings += 1;
                }
                if prev_accent * accent_sample < 0.0 {
                    accent_crossings += 1;
                }
            }
            prev_normal = normal_sample;
            prev_accent = accent_sample;
        }

        let ratio = accent_peak / normal_peak;
        assert!(
            (1.9..=2.1).contains(&ratio),
            "accent should peak about twice as loud (+6 dB), ratio was {ratio}"
        );
        assert!(
            accent_crossings < normal_crossings,
            "accent's lower pitch should cross zero less often in the first 10 ms: normal={normal_crossings} accent={accent_crossings}"
        );
    }
}
