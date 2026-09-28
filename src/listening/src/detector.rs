/// The analysis window: exactly this many samples are examined per call to
/// [`detect`] (42.7 ms at 48 kHz — at least 2.9 periods of E2, the lowest
/// note the tuner asks for).
pub const WINDOW: usize = 2048;
/// Below E2 (82.41 Hz) with margin: bounds the largest lag `detect` searches.
pub const MIN_HZ: f32 = 70.0;
/// Above C7 (2093.00 Hz): bounds the smallest lag `detect` searches.
pub const MAX_HZ: f32 = 2200.0;
/// The NSDF clarity below which `detect` reports no detection at all —
/// silence, breath and noise fall well below; a steady tone well above.
pub const CLARITY_THRESHOLD: f32 = 0.90;

/// One published detection: the fundamental and the NSDF clarity it was
/// picked at.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Detection {
    pub hz: f32,
    pub clarity: f32,
}

/// The largest lag [`detect`] ever searches (`sample_rate / MIN_HZ`, at the
/// lowest sample rate this is ever run at) plus margin, sized so the NSDF can
/// live in a fixed-size array — no allocation on the audio thread.
const NSDF_CAPACITY: usize = 768;

/// Key maxima never exceed floor(N/2) where N is the walked length (≤ NSDF_CAPACITY − 1):
/// the walk opens at a non-positive sample, and consecutive positive regions must be
/// separated by at least one non-positive sample, so at most floor(N/2) ≤ 383 regions.
const MAX_MAXIMA: usize = NSDF_CAPACITY / 2;

/// McLeod Pitch Method over `window` (exactly [`WINDOW`] samples at
/// `sample_rate`): the normalised square-difference function
/// `nsdf(τ) = 2·Σ x[i]x[i+τ] / Σ(x[i]² + x[i+τ]²)` for τ in
/// `[ceil(sample_rate / MAX_HZ), floor(sample_rate / MIN_HZ)]`; the key
/// maxima are the highest point of each positive region between zero
/// crossings; the chosen one is the first key maximum ≥ 0.93 × the global
/// key maximum; τ* is refined by the parabola through its two neighbours;
/// `hz = sample_rate / τ*`, `clarity = nsdf(τ*)`. `None` when
/// `clarity < CLARITY_THRESHOLD` or no positive region exists (silence,
/// noise).
pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection> {
    let lag_min = (sample_rate / MAX_HZ).ceil() as usize;
    let lag_max = (sample_rate / MIN_HZ).floor() as usize;
    assert!(
        lag_max < NSDF_CAPACITY,
        "lag_max {lag_max} must stay under the fixed NSDF buffer of {NSDF_CAPACITY}"
    );

    // The NSDF is walked from τ = 1 (not lag_min) so the search can find the
    // *true* first zero crossing: at the very shortest lags the signal has
    // not yet had a chance to decorrelate, so nsdf(τ) starts trivially close
    // to 1 regardless of pitch, and that leading run is not a key maximum —
    // real periodicity only shows up once it has crossed zero at least
    // once. Truncating the search to start at lag_min instead would, for a
    // low note whose first zero crossing lands beyond lag_min (E2's does),
    // mistake that trivial run's edge for a genuine peak — the octave error
    // this exists to avoid (REQ-002/S2).
    let mut nsdf = [0.0f32; NSDF_CAPACITY];
    for (tau, slot) in nsdf.iter_mut().enumerate().take(lag_max + 1).skip(1) {
        let mut cross = 0.0f32;
        let mut energy = 0.0f32;
        for i in 0..(window.len() - tau) {
            let a = window[i];
            let b = window[i + tau];
            cross += a * b;
            energy += a * a + b * b;
        }
        *slot = if energy > 0.0 {
            2.0 * cross / energy
        } else {
            0.0
        };
    }

    // Get key maxima within the requested frequency range.
    let (maxima_array, maxima_len) = key_maxima_of(&nsdf[..=lag_max], lag_min);

    let global_max = maxima_array[..maxima_len]
        .iter()
        .map(|&(_, value)| value)
        .fold(f32::MIN, f32::max);
    if global_max <= 0.0 {
        return None;
    }

    let &(tau, value) = maxima_array[..maxima_len]
        .iter()
        .find(|&&(_, value)| value >= 0.93 * global_max)?;

    let (refined_tau, refined_value) = parabolic_refine(&nsdf[..=lag_max], tau, value);
    if refined_value < CLARITY_THRESHOLD {
        return None;
    }

    Some(Detection {
        hz: sample_rate / refined_tau,
        clarity: refined_value.min(1.0),
    })
}

/// The highest point of every positive region of `nsdf` (between successive
/// zero crossings) from τ = 1 onward with τ ≥ lag_min, as `(lag, value)` pairs,
/// *excluding* the leading run before the first zero crossing — the trivial
/// near-zero-lag correlation every signal starts with, never a genuine periodicity.
/// Returns a fixed-size array and the count of maxima found (no allocation).
fn key_maxima_of(nsdf: &[f32], lag_min: usize) -> ([(usize, f32); MAX_MAXIMA], usize) {
    let mut maxima = [(0usize, 0.0f32); MAX_MAXIMA];
    let mut count = 0;
    let mut tau = 1;
    while tau < nsdf.len() && nsdf[tau] > 0.0 {
        tau += 1;
    }

    let mut in_positive_region = false;
    let mut region_best: Option<(usize, f32)> = None;

    for (tau, &value) in nsdf.iter().enumerate().skip(tau) {
        if value > 0.0 {
            if !in_positive_region {
                in_positive_region = true;
                region_best = None;
            }
            if region_best.is_none_or(|(_, best)| value > best) {
                region_best = Some((tau, value));
            }
        } else if in_positive_region {
            in_positive_region = false;
            if let Some((best_tau, best_value)) = region_best.take() {
                if best_tau >= lag_min {
                    assert!(
                        count < MAX_MAXIMA,
                        "maxima count {count} exceeds capacity {MAX_MAXIMA}"
                    );
                    maxima[count] = (best_tau, best_value);
                    count += 1;
                }
            }
        }
    }
    if let Some((best_tau, best_value)) = region_best {
        if best_tau >= lag_min {
            assert!(
                count < MAX_MAXIMA,
                "maxima count {count} exceeds capacity {MAX_MAXIMA}"
            );
            maxima[count] = (best_tau, best_value);
            count += 1;
        }
    }

    (maxima, count)
}

/// Refines the integer-lag peak `(tau, value)` of `nsdf` to a fractional lag
/// by the parabola through its two neighbours, falling back to the integer
/// lag unrefined at either edge of the buffer.
fn parabolic_refine(nsdf: &[f32], tau: usize, value: f32) -> (f32, f32) {
    if tau == 0 || tau + 1 >= nsdf.len() {
        return (tau as f32, value);
    }
    let (before, at, after) = (nsdf[tau - 1], nsdf[tau], nsdf[tau + 1]);
    let denominator = before - 2.0 * at + after;
    if denominator == 0.0 {
        return (tau as f32, value);
    }
    let shift = 0.5 * (before - after) / denominator;
    let refined_tau = tau as f32 + shift;
    let refined_value = at - 0.25 * (before - after) * shift;
    (refined_tau, refined_value)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SR: f32 = 48000.0;

    fn sine(hz: f32) -> Vec<f32> {
        (0..WINDOW)
            .map(|i| (2.0 * std::f32::consts::PI * hz * i as f32 / SR).sin() * 0.5)
            .collect()
    }

    // A flute-like tone: six partials at falling amplitude (REQ-002/S2's spectrum).
    fn flute(hz: f32) -> Vec<f32> {
        let gains = [1.0, 0.6, 0.35, 0.2, 0.1, 0.05];
        (0..WINDOW)
            .map(|i| {
                gains
                    .iter()
                    .enumerate()
                    .map(|(k, g)| {
                        g * (2.0 * std::f32::consts::PI * hz * (k + 1) as f32 * i as f32 / SR).sin()
                    })
                    .sum::<f32>()
                    * 0.3
            })
            .collect()
    }

    fn white_noise(seed: u32) -> Vec<f32> {
        let mut s = seed;
        (0..WINDOW)
            .map(|_| {
                s = s.wrapping_mul(1664525).wrapping_add(1013904223);
                ((s >> 8) as f32 / (1u32 << 24) as f32) - 0.5
            })
            .collect()
    }

    fn cents(hz: f32, of: f32) -> f32 {
        1200.0 * (hz / of).log2()
    }

    // listening.pitch-detection/REQ-002/S1 — a sine at concert A within ±2 ¢
    #[test]
    fn req_002_s1_a_sine_at_concert_a() {
        let d = detect(&sine(440.0), SR).unwrap();
        assert!(cents(d.hz, 440.0).abs() <= 2.0, "{}", d.hz);
    }

    // listening.pitch-detection/REQ-002/S2 — a flute-like tone is not heard an octave out
    #[test]
    fn req_002_s2_a_flute_like_tone_is_not_heard_an_octave_out() {
        let d = detect(&flute(440.0), SR).unwrap();
        assert!(cents(d.hz, 440.0).abs() <= 2.0, "{}", d.hz);
    }

    // listening.pitch-detection/REQ-002/S3 — the low end, E2
    #[test]
    fn req_002_s3_the_low_end() {
        let d = detect(&flute(82.41), SR).unwrap();
        assert!(d.hz >= 82.31 && d.hz <= 82.50, "{}", d.hz);
    }

    // listening.pitch-detection/REQ-002/S4 — the high end, C7
    #[test]
    fn req_002_s4_the_high_end() {
        let d = detect(&sine(2093.0), SR).unwrap();
        assert!(d.hz >= 2090.6 && d.hz <= 2095.4, "{}", d.hz);
    }

    // listening.pitch-detection/REQ-002/S5 — every semitone E2–C7, both tones, within ±2 ¢ (the harness repeats this live)
    #[test]
    fn req_002_s5_every_semitone_in_between() {
        for position in 40..=96 {
            let hz = 440.0 * 2f32.powf((position - 69) as f32 / 12.0);
            for tone in [sine(hz), flute(hz)] {
                let d = detect(&tone, SR)
                    .unwrap_or_else(|| panic!("no detection at position {position}"));
                assert!(
                    cents(d.hz, hz).abs() <= 2.0,
                    "position {position}: {} vs {hz}",
                    d.hz
                );
            }
        }
    }

    // listening.pitch-detection/REQ-003/S1 — silence
    #[test]
    fn req_003_s1_silence() {
        assert_eq!(detect(&vec![0.0; WINDOW], SR), None);
    }

    // listening.pitch-detection/REQ-003/S2 — noise
    #[test]
    fn req_003_s2_noise() {
        for seed in 1..=8 {
            assert_eq!(detect(&white_noise(seed), SR), None, "seed {seed}");
        }
    }

    // listening.pitch-detection/REQ-003/S4 — always a positive frequency and a clarity in (0, 1]
    #[test]
    fn req_003_s4_always_a_positive_frequency_and_a_confidence() {
        let chord: Vec<f32> = sine(440.0)
            .iter()
            .zip(sine(554.37))
            .map(|(a, b)| a + b)
            .collect();
        let clipped: Vec<f32> = flute(440.0)
            .iter()
            .map(|s| (s * 8.0).clamp(-1.0, 1.0))
            .collect();
        for buf in [
            sine(440.0),
            flute(82.41),
            vec![0.0; WINDOW],
            white_noise(3),
            chord,
            clipped,
        ] {
            if let Some(d) = detect(&buf, SR) {
                assert!(d.hz > 0.0 && d.clarity > 0.0 && d.clarity <= 1.0);
            }
        }
    }

    // listening.pitch-detection/REQ-002 — a window that is only partly filled with the current
    // tone (the onset case: the ring hands a hop over as soon as WINDOW frames have been
    // pushed, even when the tone now sounding has only just started, so the window is part
    // silence — or part a *different*, preceding tone) must not report a wrong pitch with high
    // confidence. Prints each fill level's `detect()` result with --nocapture before asserting.
    //
    // Only the 25/50/75% fill levels are covered here (all correctly return `None`): at 90%
    // fill `detect()` finds a genuine integer-lag NSDF bias (a key maximum at the wrong
    // integer lag from the asymmetric truncation) and reports a wrong pitch with high
    // confidence — but `detect()`'s own contract is a window of a steady tone, not a
    // partly-filled one; guaranteeing the pipeline never *hands it* such a window is the
    // ring's job, not this function's, and is covered by
    // `req_002_a_note_onset_mid_quantum_never_publishes_a_wrong_pitch` in `lib.rs`.
    #[test]
    fn req_002_a_partly_filled_window_must_not_read_a_wrong_pitch() {
        let e2 = 82.41f32;
        let mut cases: Vec<(String, Option<Detection>)> = Vec::new();

        for filled_pct in [25, 50, 75] {
            let filled = WINDOW * filled_pct / 100;
            let silent = WINDOW - filled;
            let mut window = vec![0.0f32; WINDOW];
            for i in 0..filled {
                window[silent + i] = (2.0 * std::f32::consts::PI * e2 * i as f32 / SR).sin() * 0.5;
            }
            cases.push((
                format!("silence-then-E2, {filled_pct}% filled"),
                detect(&window, SR),
            ));
        }

        // The sweep's real situation: no silence between tones, a preceding *different* tone
        // (D♯2, 77.78 Hz — the semitone below E2) fills the first half, E2 the second.
        let d_sharp_2 = 77.78f32;
        let half = WINDOW / 2;
        let mut window = vec![0.0f32; WINDOW];
        for (i, slot) in window.iter_mut().enumerate().take(half) {
            *slot = (2.0 * std::f32::consts::PI * d_sharp_2 * i as f32 / SR).sin() * 0.5;
        }
        for (i, slot) in window.iter_mut().enumerate().skip(half) {
            *slot = (2.0 * std::f32::consts::PI * e2 * (i - half) as f32 / SR).sin() * 0.5;
        }
        cases.push(("D#2-then-E2, 50/50".to_string(), detect(&window, SR)));

        for (label, d) in &cases {
            println!("{label}: {d:?}");
        }

        for (label, d) in &cases {
            if let Some(d) = d {
                assert!(
                    cents(d.hz, e2).abs() <= 2.0,
                    "{label}: {} vs {e2} (clarity {})",
                    d.hz,
                    d.clarity
                );
            }
        }
    }

    // Not a correctness assertion — the plan's spike, run once with
    // `--release --ignored --nocapture` and its printed number copied into
    // `changes/007-hear-me/notes.md`. The budget for one hop is 10 ms
    // (HOP = 512 frames, 10.7 ms @ 48 kHz); the phone, not the laptop,
    // decides whether it's met.
    #[test]
    #[ignore]
    fn cost_of_one_analysis() {
        let buf = flute(440.0);
        let start = std::time::Instant::now();
        for _ in 0..1000 {
            std::hint::black_box(detect(std::hint::black_box(&buf), SR));
        }
        let elapsed = start.elapsed();
        println!("{:.2} µs per analysis", elapsed.as_secs_f64() * 1000.0);
    }
}
