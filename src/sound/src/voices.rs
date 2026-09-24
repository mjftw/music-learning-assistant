use crate::click::Click;
use crate::tone::Tone;

/// The maximum number of voices sounding — or queued to sound — at once.
pub const MAX_VOICES: usize = 64;

/// How long a voice sounds: a fixed number of frames from its onset, or
/// indefinitely until `Voices::stop`/`stop_all` releases it.
#[derive(Clone, Copy, PartialEq)]
pub enum Length {
    Frames(u32),
    // Not constructed until the drone voice (T002's `push_drone`) — this
    // crate builds `cdylib`, so an unconstructed variant is otherwise
    // flagged dead rather than treated as public API.
    #[allow(dead_code)]
    UntilStopped,
}

/// What a voice synthesises.
#[derive(Clone, Copy)]
pub enum VoiceKind {
    Tone(Tone),
    Click(Click),
}

impl VoiceKind {
    fn next_sample(&mut self, elapsed_frames: f64, length: Length, sample_rate: f32) -> f32 {
        match self {
            VoiceKind::Tone(tone) => tone.next_sample(elapsed_frames, length, sample_rate),
            VoiceKind::Click(click) => click.next_sample(elapsed_frames, sample_rate),
        }
    }

    /// How long this kind of voice takes to fade to silence once stopped
    /// (`Voices::stop`/`stop_all`) — matched exhaustively rather than with a
    /// wildcard so a future voice kind must state its own release here
    /// rather than silently inheriting this one's.
    pub fn release_seconds(&self) -> f32 {
        match self {
            VoiceKind::Tone(_) | VoiceKind::Click(_) => STOP_FADE_S,
        }
    }
}

/// How long a voice fades out when `Voices::stop`/`stop_all` releases it,
/// rather than being cleared instantly — an abrupt cut is itself a click on
/// the render thread's output (practice.session/REQ-005). Tone and Click
/// share this fade; a future voice kind may report a different one from
/// `VoiceKind::release_seconds`.
const STOP_FADE_S: f32 = 0.005;

/// A voice's stop-fade state: not stopping, stopping but the frame the fade
/// began at is not yet known (`stop_all` itself never sees `now_frame`), or
/// stopping from a known frame.
#[derive(Clone, Copy, PartialEq)]
enum Fade {
    None,
    Requested,
    Started(f64),
}

/// A single queued or sounding voice: what to play, and the frame range (in
/// the global, ever-increasing frame timeline) it sounds across.
#[derive(Clone, Copy)]
pub struct Voice {
    pub tag: u32,
    pub kind: VoiceKind,
    pub onset_frame: f64,
    pub length: Length,
    reported: bool,
    fade: Fade,
}

impl Voice {
    pub fn new(tag: u32, kind: VoiceKind, onset_frame: f64, length: Length) -> Self {
        Voice {
            tag,
            kind,
            onset_frame,
            length,
            reported: false,
            fade: Fade::None,
        }
    }
}

/// One voice's onset, as reported back to the host: the frame it was meant
/// to start (`onset_frame`) and the frame it actually first rendered at
/// (`actual_frame` — equal to `onset_frame` when on time, or the first
/// frame of the quantum it was first rendered in when late).
#[derive(Clone, Copy)]
pub struct OnsetReport {
    pub tag: u32,
    pub onset_frame: f64,
    pub actual_frame: f64,
}

/// The fixed pool of queued/sounding voices and the sample rate they render
/// at.
pub struct Voices {
    slots: [Option<Voice>; MAX_VOICES],
    sample_rate: f32,
}

impl Voices {
    pub const fn new() -> Self {
        Voices {
            slots: [None; MAX_VOICES],
            sample_rate: 0.0,
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
    }

    /// Queues `voice`. Returns `true` if a slot was free, `false` if all
    /// `MAX_VOICES` are already in use (the voice is dropped).
    pub fn push(&mut self, voice: Voice) -> bool {
        for slot in self.slots.iter_mut() {
            if slot.is_none() {
                *slot = Some(voice);
                return true;
            }
        }
        false
    }

    /// Drops every queued and sounding voice at once, with no fade —
    /// used only to reset the engine (`init`), never mid-playback.
    pub fn clear_all(&mut self) {
        self.slots = [None; MAX_VOICES];
    }

    /// Marks every queued and sounding voice to fade out over
    /// `STOP_FADE_S` rather than being cleared instantly (❚❚, REQ-002 and
    /// REQ-005: an abrupt cut is itself a click). The fade's start frame is
    /// filled in by the next `render_into` call, since `stop_all` is called
    /// from the command port asynchronously with no frame of its own.
    pub fn stop_all(&mut self) {
        for voice in self.slots.iter_mut().flatten() {
            if voice.fade == Fade::None {
                voice.fade = Fade::Requested;
            }
        }
    }

    /// Marks only the voice tagged `tag` to fade out over its own kind's
    /// release (`VoiceKind::release_seconds`) rather than continuing or
    /// being cut abruptly; an unknown tag is a no-op. Several voices may
    /// share a tag only transiently (a crossfade), so every matching one is
    /// marked.
    pub fn stop(&mut self, tag: u32) {
        for voice in self.slots.iter_mut().flatten() {
            if voice.tag == tag && voice.fade == Fade::None {
                voice.fade = Fade::Requested;
            }
        }
    }

    /// Fills `out` (one render quantum) with the sum of every sounding
    /// voice at `now_frame`, clears voices whose duration has elapsed, and
    /// writes an `OnsetReport` into `reports` for every voice rendering for
    /// the first time this call. Returns the number of reports written.
    pub fn render_into(
        &mut self,
        out: &mut [f32],
        now_frame: f64,
        reports: &mut [OnsetReport; MAX_VOICES],
    ) -> usize {
        for sample in out.iter_mut() {
            *sample = 0.0;
        }

        let Voices { slots, sample_rate } = self;
        let sample_rate = *sample_rate;
        let quantum_frames = out.len() as f64;
        let mut n = 0;

        for slot in slots.iter_mut() {
            let Some(voice) = slot else { continue };

            // `stop_all`/`stop` mark a voice `Requested` from off-thread,
            // with no frame of their own; the fade starts from whichever
            // frame first renders it afterwards.
            if voice.fade == Fade::Requested {
                voice.fade = Fade::Started(now_frame);
            }

            let release_frames = f64::from(voice.kind.release_seconds()) * f64::from(sample_rate);
            let natural_end = match voice.length {
                Length::Frames(frames) => voice.onset_frame + f64::from(frames),
                Length::UntilStopped => f64::INFINITY,
            };
            let voice_end = match voice.fade {
                Fade::Started(fade_start) => natural_end.min(fade_start + release_frames),
                Fade::None | Fade::Requested => natural_end,
            };

            if !voice.reported && voice.onset_frame < now_frame + quantum_frames {
                reports[n] = OnsetReport {
                    tag: voice.tag,
                    onset_frame: voice.onset_frame,
                    actual_frame: voice.onset_frame.max(now_frame),
                };
                n += 1;
                voice.reported = true;
            }

            for (i, sample) in out.iter_mut().enumerate() {
                let frame = now_frame + i as f64;
                if frame < voice.onset_frame || frame >= voice_end {
                    continue;
                }
                let elapsed = frame - voice.onset_frame;
                let mut value = voice.kind.next_sample(elapsed, voice.length, sample_rate);
                if let Fade::Started(fade_start) = voice.fade {
                    let fade_elapsed = (frame - fade_start).max(0.0);
                    let gain = (1.0 - (fade_elapsed / release_frames) as f32).clamp(0.0, 1.0);
                    value *= gain;
                }
                *sample += value;
            }

            if now_frame + quantum_frames >= voice_end {
                *slot = None;
            }
        }

        n
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_RATE: f32 = 48000.0;

    #[test]
    fn a_voice_is_reported_only_once() {
        let mut voices = Voices::new();
        voices.set_sample_rate(SAMPLE_RATE);
        voices.push(Voice::new(
            1,
            VoiceKind::Tone(Tone::new(440.0)),
            0.0,
            Length::Frames(4800),
        ));

        let mut out = [0.0f32; 128];
        let mut reports = [OnsetReport {
            tag: 0,
            onset_frame: 0.0,
            actual_frame: 0.0,
        }; MAX_VOICES];

        let first = voices.render_into(&mut out, 0.0, &mut reports);
        assert_eq!(
            first, 1,
            "the voice's onset should be reported the first time it renders"
        );

        let second = voices.render_into(&mut out, 128.0, &mut reports);
        assert_eq!(
            second, 0,
            "a voice already reported should not be reported again"
        );
    }

    #[test]
    fn stop_fades_only_the_voice_with_that_tag() {
        let mut voices = Voices::new();
        voices.set_sample_rate(SAMPLE_RATE);
        voices.push(Voice::new(
            1,
            VoiceKind::Tone(Tone::new(440.0)),
            0.0,
            Length::Frames(48000),
        ));
        voices.push(Voice::new(
            2,
            VoiceKind::Tone(Tone::new(660.0)),
            0.0,
            Length::Frames(48000),
        ));
        let mut out = [0.0f32; 128];
        let mut reports = [OnsetReport {
            tag: 0,
            onset_frame: 0.0,
            actual_frame: 0.0,
        }; MAX_VOICES];
        voices.render_into(&mut out, 0.0, &mut reports);
        voices.stop(1);
        // 5 ms = 240 frames: after three more quantums voice 1 is gone, voice 2 still sounds
        for q in 1..4 {
            voices.render_into(&mut out, f64::from(q) * 128.0, &mut reports);
        }
        assert!(
            voices.slots[0].is_none(),
            "the stopped voice should have been dropped"
        );
        assert!(
            voices.slots[1].is_some(),
            "the other voice must be untouched"
        );
        assert!(
            out.iter().any(|s| *s != 0.0),
            "the other voice should still be sounding"
        );
    }
}
