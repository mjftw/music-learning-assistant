use crate::detector::WINDOW;

/// Frames between consecutive analyses once the window is full (10.7 ms @
/// 48 kHz — ~94 analyses/s, comfortably over the 20/s floor of
/// listening.pitch-detection/REQ-004/S1).
pub const HOP: usize = 512;
/// The render quantum the host pushes at a time — one AudioWorklet
/// `process` call's worth of frames.
pub const QUANTUM_FRAMES: usize = 128;

/// A WINDOW-frame ring; `push_quantum` appends 128 frames and returns true when HOP frames
/// have arrived since the last true (the first true after WINDOW frames have been pushed).
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
}

impl Ring {
    pub const fn new() -> Self {
        Ring {
            buf: [0.0; WINDOW],
            write: 0,
            filled: 0,
            since_hop: 0,
        }
    }

    /// Resets the ring to empty, as at `init` — no samples from a previous
    /// session leak into the first window of a new one.
    pub fn clear(&mut self) {
        self.buf = [0.0; WINDOW];
        self.write = 0;
        self.filled = 0;
        self.since_hop = 0;
    }

    /// Appends `quantum`'s 128 frames to the ring. Returns true the first
    /// time the window has just become full, and every `HOP` frames after
    /// that — the caller's cue to analyse the window this call.
    pub fn push_quantum(&mut self, quantum: &[f32; QUANTUM_FRAMES]) -> bool {
        for &sample in quantum {
            self.buf[self.write] = sample;
            self.write = (self.write + 1) % WINDOW;
        }
        if self.filled < WINDOW {
            self.filled += QUANTUM_FRAMES;
        }
        self.since_hop += QUANTUM_FRAMES;

        if self.filled == WINDOW && self.since_hop >= HOP {
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
