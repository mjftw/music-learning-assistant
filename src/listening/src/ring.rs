use crate::detector::WINDOW;

/// Frames between consecutive analyses once the window is full (10.7 ms @
/// 48 kHz — ~94 analyses/s, comfortably over the 20/s floor of
/// listening.pitch-detection/REQ-004/S1).
pub const HOP: usize = 512;
/// The render quantum the host pushes at a time — one AudioWorklet
/// `process` call's worth of frames.
pub const QUANTUM_FRAMES: usize = 128;

/// The per-quantum RMS below which a quantum counts as silent for onset
/// tracking. Chosen well under a played note's amplitude (tones in this
/// crate's own tests sit at 0.5, so even a quiet attack has plenty of
/// margin) so silence — no mic-noise floor is modelled here, so true
/// silence is digital zero — is reliably told apart from a genuine attack.
/// Breath noise between notes (louder than this, `req_003_s3_a_breath_
/// between_notes`'s ~0.014 RMS) is not "silence" by this gate — it does not
/// need to be, since `detect`'s own clarity threshold already rejects it.
const SIGNAL_RMS_THRESHOLD: f32 = 0.005;

/// The gate must guarantee the analysed window starts *after* the onset quantum: the
/// onset quantum itself may carry up to 127 silent samples (Web Audio's sample-accurate
/// `start()` is not aligned to the ring's 128-sample quantum boundary), so a hop is only
/// reported ready once `frames_since_onset` reaches `WINDOW + QUANTUM_FRAMES` — one more
/// quantum of patience (2.7 ms, in practice the next 512-frame hop) — which makes every
/// analysed window pure signal.
const ONSET_SETTLE_FRAMES: usize = WINDOW + QUANTUM_FRAMES;

/// A WINDOW-frame ring; `push_quantum` appends 128 frames and returns true when HOP frames
/// have arrived since the last true (the first true after WINDOW frames have been pushed) —
/// and only once the window is filled entirely with sound from after the most recent
/// silence-to-signal transition, one quantum settled (`ONSET_SETTLE_FRAMES` above), so a
/// note's own onset is never analysed against a window still partly the silence that
/// preceded it.
pub struct Ring {
    buf: [f32; WINDOW],
    /// The index the next pushed sample lands at; once the ring has filled,
    /// this is also the oldest sample still held (the one about to be
    /// overwritten), which is what makes `window` able to read the buffer
    /// out in chronological order starting here.
    write: usize,
    /// Frames written so far, capped at `WINDOW` — `push_quantum` cannot
    /// report a hop before the window is full even once `since_hop` alone
    /// would allow it.
    filled: usize,
    /// Frames pushed since the last hop was reported (or since `clear`).
    since_hop: usize,
    /// Frames pushed since the input last went from silent to signal
    /// (per-quantum RMS gate), saturating rather than wrapping over a long
    /// session. `push_quantum` only reports a hop once this reaches
    /// `ONSET_SETTLE_FRAMES` (`WINDOW + QUANTUM_FRAMES`): that is one full
    /// quantum past the point at which every sample now in the ring (which
    /// holds only the most recent `WINDOW` samples) was pushed after the
    /// transition, so the transition quantum itself — which may carry up to
    /// 127 silent samples ahead of the true onset — has been evicted from
    /// the ring by the time a hop is reported, and the window handed to
    /// `detect` is never partly the silence — or the different, preceding
    /// tone — that came before the current sound.
    frames_since_onset: usize,
    /// Whether the most recently pushed quantum had signal (RMS at or above
    /// `SIGNAL_RMS_THRESHOLD`) — tracked so the next quantum can tell a
    /// silent-to-signal transition from signal continuing.
    was_signal: bool,
}

impl Ring {
    pub const fn new() -> Self {
        Ring {
            buf: [0.0; WINDOW],
            write: 0,
            filled: 0,
            since_hop: 0,
            frames_since_onset: 0,
            was_signal: false,
        }
    }

    /// Resets the ring to empty, as at `init` — no samples from a previous
    /// session leak into the first window of a new one.
    pub fn clear(&mut self) {
        self.buf = [0.0; WINDOW];
        self.write = 0;
        self.filled = 0;
        self.since_hop = 0;
        self.frames_since_onset = 0;
        self.was_signal = false;
    }

    /// Appends `quantum`'s 128 frames to the ring. Returns true the first
    /// time the window has just become full, and every `HOP` frames after
    /// that — the caller's cue to analyse the window this call — but only
    /// once the onset gate (`frames_since_onset >= ONSET_SETTLE_FRAMES`) has
    /// opened.
    pub fn push_quantum(&mut self, quantum: &[f32; QUANTUM_FRAMES]) -> bool {
        for &sample in quantum {
            self.buf[self.write] = sample;
            self.write = (self.write + 1) % WINDOW;
        }
        if self.filled < WINDOW {
            self.filled += QUANTUM_FRAMES;
        }
        self.since_hop += QUANTUM_FRAMES;

        let sum_sq: f32 = quantum.iter().map(|&sample| sample * sample).sum();
        let rms = (sum_sq / QUANTUM_FRAMES as f32).sqrt();
        let is_signal = rms >= SIGNAL_RMS_THRESHOLD;
        if is_signal && !self.was_signal {
            self.frames_since_onset = 0;
        }
        self.was_signal = is_signal;
        self.frames_since_onset = self.frames_since_onset.saturating_add(QUANTUM_FRAMES);

        if self.filled == WINDOW
            && self.since_hop >= HOP
            && self.frames_since_onset >= ONSET_SETTLE_FRAMES
        {
            self.since_hop = 0;
            true
        } else {
            false
        }
    }

    /// Copies the ring's WINDOW frames into `out`, oldest first — the
    /// ordering `detect` expects.
    pub fn window(&self, out: &mut [f32; WINDOW]) {
        for (i, slot) in out.iter_mut().enumerate() {
            *slot = self.buf[(self.write + i) % WINDOW];
        }
    }
}
