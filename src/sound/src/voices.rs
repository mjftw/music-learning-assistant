use crate::click::Click;
use crate::tone::Tone;

/// The maximum number of voices sounding — or queued to sound — at once.
pub const MAX_VOICES: usize = 64;

/// What a voice synthesises.
#[derive(Clone, Copy)]
pub enum VoiceKind {
    Tone(Tone),
    Click(Click),
}

impl VoiceKind {
    fn next_sample(&mut self, elapsed_frames: f64, duration_frames: f64, sample_rate: f32) -> f32 {
        match self {
            VoiceKind::Tone(tone) => tone.next_sample(elapsed_frames, duration_frames, sample_rate),
            VoiceKind::Click(click) => click.next_sample(elapsed_frames, sample_rate),
        }
    }
}

/// How long a voice fades out when `Voices::stop_all` is called, rather
/// than being cleared instantly — an abrupt cut is itself a click on the
/// render thread's output (practice.session/REQ-005).
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
    pub duration_frames: u32,
    reported: bool,
    fade: Fade,
}

impl Voice {
    pub fn new(tag: u32, kind: VoiceKind, onset_frame: f64, duration_frames: u32) -> Self {
        Voice {
            tag,
            kind,
            onset_frame,
            duration_frames,
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

        let fade_frames = f64::from(STOP_FADE_S) * f64::from(sample_rate);

        for slot in slots.iter_mut() {
            let Some(voice) = slot else { continue };

            // `stop_all` marks a voice `Requested` from off-thread, with no
            // frame of its own; the fade starts from whichever frame first
            // renders it afterwards.
            if voice.fade == Fade::Requested {
                voice.fade = Fade::Started(now_frame);
            }

            let natural_end = voice.onset_frame + f64::from(voice.duration_frames);
            let voice_end = match voice.fade {
                Fade::Started(fade_start) => natural_end.min(fade_start + fade_frames),
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
                let mut value =
                    voice
                        .kind
                        .next_sample(elapsed, f64::from(voice.duration_frames), sample_rate);
                if let Fade::Started(fade_start) = voice.fade {
                    let fade_elapsed = (frame - fade_start).max(0.0);
                    let gain = (1.0 - (fade_elapsed / fade_frames) as f32).clamp(0.0, 1.0);
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
        voices.push(Voice::new(1, VoiceKind::Tone(Tone::new(440.0)), 0.0, 4800));

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
}
