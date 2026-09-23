use std::f32::consts::PI;

/// 8 ms linear attack and 40 ms linear release, the release beginning at
/// `duration_frames − release` so the tone is silent before the next note's
/// onset (REQ-005/S4).
const ATTACK_S: f32 = 0.008;
const RELEASE_S: f32 = 0.040;

/// Overall gain applied to the fundamental plus second harmonic (peak
/// −12 dBFS).
const PEAK_GAIN: f32 = 0.25;

/// A plain synthesised tone: a sine plus a quieter second harmonic, shaped
/// by an attack/sustain/release envelope.
#[derive(Clone, Copy)]
pub struct Tone {
    hz: f32,
    phase: f32,
}

impl Tone {
    pub fn new(hz: f32) -> Self {
        Tone { hz, phase: 0.0 }
    }

    /// Advances the oscillator by one sample and returns the enveloped
    /// value at `elapsed_frames` into a voice lasting `duration_frames`,
    /// sampled at `sample_rate`.
    pub fn next_sample(
        &mut self,
        elapsed_frames: f64,
        duration_frames: f64,
        sample_rate: f32,
    ) -> f32 {
        let raw = self.phase.sin() + 0.25 * (2.0 * self.phase).sin();
        self.phase += 2.0 * PI * self.hz / sample_rate;
        if self.phase > 2.0 * PI {
            self.phase -= 2.0 * PI;
        }
        raw * PEAK_GAIN * envelope(elapsed_frames, duration_frames, sample_rate)
    }
}

/// The attack/sustain/release amplitude multiplier at `elapsed_frames` into
/// a voice lasting `duration_frames`, at `sample_rate`.
fn envelope(elapsed_frames: f64, duration_frames: f64, sample_rate: f32) -> f32 {
    let attack_frames = f64::from(ATTACK_S * sample_rate);
    let release_frames = f64::from(RELEASE_S * sample_rate);
    let release_start = duration_frames - release_frames;

    if elapsed_frames < attack_frames {
        (elapsed_frames / attack_frames) as f32
    } else if elapsed_frames < release_start {
        1.0
    } else {
        (((duration_frames - elapsed_frames) / release_frames) as f32).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_RATE: f32 = 48000.0;

    // practice.session/REQ-005/S4
    #[test]
    fn tone_is_silent_before_its_next_onset() {
        let mut tone = Tone::new(440.0);
        let duration_frames = 24000.0; // 500 ms at 48 kHz: the next note's onset

        let mut peak_mid_note: f32 = 0.0;
        let mut sample_before_next_onset = 0.0f32;
        for frame in 0..24000u32 {
            let sample = tone.next_sample(frame as f64, duration_frames, SAMPLE_RATE);
            if (400..1000).contains(&frame) {
                peak_mid_note = peak_mid_note.max(sample.abs());
            }
            if frame == 23999 {
                sample_before_next_onset = sample;
            }
        }

        assert!(
            peak_mid_note > 0.1,
            "tone should be clearly sounding mid-note, peak was {peak_mid_note}"
        );
        assert!(
            sample_before_next_onset.abs() < 1e-4,
            "tone should be silent just before the next note's onset, got {sample_before_next_onset}"
        );
    }
}
