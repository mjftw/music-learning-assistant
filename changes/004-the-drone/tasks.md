---
type: Task List
title: The drone — tasks
description: 21 tasks across 4 phases — the addressable drone voice in the sound crate, the session owning the drone and the tapped note, the pill, the sheet and the tap targets in the UI, then hardening.
resource: /changes/004-the-drone/tasks.md
status: stable
tags: [sdd, tasks, "change:004-the-drone"]
sources:
  - resource: /changes/004-the-drone/plan.md
  - resource: /changes/004-the-drone/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T17:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T23:37:47Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: in-progress
---

# Tasks: The drone

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.**
>
> Steps are 2–5 minutes each. A task is 3–8 steps. Larger → split.
> `[P]` after the ID: no dependency on the neighbouring `[P]` tasks.
>
> Status per task: `todo` · `in-progress` · `done` · `blocked`.
>
> Every RED step names the scenario ID it proves. A task with no scenario is
> Foundations or Hardening.
>
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.
>
> Frame arithmetic throughout assumes the fakes' 48 000 Hz sample rate:
> 20 ms (`FIRST_TICK_LEAD_MS`) = 960 frames, 50 ms = 2 400, 80 ms
> (`DRONE_RELEASE_MS`) = 3 840, one beat at 96 bpm = 30 000, at 120 bpm =
> 24 000. `src/sound/pkg/sound.wasm` is not tracked by git: after any Rust
> change run `pnpm build:sound` before `pnpm check` (which runs vitest
> against the staged binary).

## Phase 1 — Foundations (the sound crate and its published contract)

_Nothing user-visible. The voice model widens (ADR 0005); the schema and the
worklet shim learn three commands; the fakes learn to record them._

### T001 · — · Voices are addressable: `Length`, per-kind stop fade, `stop(tag)`

**Status:** done

**Files**
- Modify: `src/sound/src/voices.rs` (`Voice`, `VoiceKind::next_sample`, `Voices::render_into`; add `Length`, `Voices::stop`)
- Modify: `src/sound/src/lib.rs` (`push_tone`, `push_click` build a `Length::Frames`; add `stop`)
- Modify: `src/sound/src/tone.rs:660-672` (`next_sample` takes `Length`, not `duration_frames: f64`)
- Test: `src/sound/src/voices.rs` (`mod tests`), `src/sound/src/lib.rs` (`mod tests`)

**Interfaces**
- Consumes: `Voices::stop_all()`, `Fade::{None, Requested, Started(f64)}` (as they stand)
- Produces:
  ```rust
  /// How long a voice sounds: a fixed number of frames, or until `stop`/`stop_all`.
  #[derive(Clone, Copy, PartialEq)]
  pub enum Length { Frames(u32), UntilStopped }
  pub struct Voice { pub tag: u32, pub kind: VoiceKind, pub onset_frame: f64, pub length: Length, /* reported, fade as today */ }
  impl Voice { pub fn new(tag: u32, kind: VoiceKind, onset_frame: f64, length: Length) -> Self }
  impl VoiceKind { pub fn release_seconds(&self) -> f32 }   // Tone | Click → STOP_FADE_S (0.005); Drone (T002) → drone::RELEASE_S
  impl Voices { pub fn stop(&mut self, tag: u32) }           // marks only the voices with that tag Fade::Requested; unknown tag → no-op
  #[no_mangle] pub extern "C" fn stop(tag: u32)
  ```
  `render_into`: `natural_end = match length { Frames(n) => onset + n, UntilStopped => f64::INFINITY }`; `voice_end = natural_end.min(fade_start + release_seconds · sample_rate)` once the fade has started; the fade gain uses that same per-kind length. `Tone::next_sample(&mut self, elapsed_frames: f64, length: Length, sample_rate: f32)` — `Frames(n)` keeps today's envelope; `UntilStopped` means no release (never used for a tone).

**Steps**
- [ ] 1. RED — in `voices.rs`'s `mod tests` (Foundations: no scenario; guards the invariant `stop` touches one voice):
  ```rust
  #[test]
  fn stop_fades_only_the_voice_with_that_tag() {
      let mut voices = Voices::new();
      voices.set_sample_rate(SAMPLE_RATE);
      voices.push(Voice::new(1, VoiceKind::Tone(Tone::new(440.0)), 0.0, Length::Frames(48000)));
      voices.push(Voice::new(2, VoiceKind::Tone(Tone::new(660.0)), 0.0, Length::Frames(48000)));
      let mut out = [0.0f32; 128];
      let mut reports = [OnsetReport { tag: 0, onset_frame: 0.0, actual_frame: 0.0 }; MAX_VOICES];
      voices.render_into(&mut out, 0.0, &mut reports);
      voices.stop(1);
      // 5 ms = 240 frames: after three more quantums voice 1 is gone, voice 2 still sounds
      for q in 1..4 { voices.render_into(&mut out, f64::from(q) * 128.0, &mut reports); }
      assert!(voices.slots[0].is_none(), "the stopped voice should have been dropped");
      assert!(voices.slots[1].is_some(), "the other voice must be untouched");
      assert!(out.iter().any(|s| *s != 0.0), "the other voice should still be sounding");
  }
  ```
  and in `lib.rs`'s `mod tests`:
  ```rust
  #[test]
  fn stop_by_tag_leaves_other_voices_sounding() {
      let _guard = lock_engine();
      init(48000.0);
      push_tone(1, 440.0, 0.0, 48000);
      push_tone(2, 660.0, 0.0, 48000);
      render(0.0);
      stop(1);
      for q in 1..4 { render(f64::from(q) * 128.0); }
      let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
      assert!(out.iter().any(|s| *s != 0.0));
  }
  ```
- [ ] 2. Run `cargo test -p sound` — expect FAIL: `no variant or associated item named `Frames`` / `cannot find function `stop``.
- [ ] 3. GREEN — add `Length`; replace `duration_frames: u32` on `Voice` with `length: Length` (`push_tone`/`push_click` wrap theirs in `Length::Frames`); `VoiceKind::release_seconds` (Tone/Click → `STOP_FADE_S`); `Voices::stop(tag)`; in `render_into` compute `natural_end` and the fade length from `voice.kind.release_seconds()` instead of the single `fade_frames`; `extern "C" fn stop(tag)` calling `engine().voices.stop(tag)`. `slots` stays private — the first test reads it from inside the module.
- [ ] 4. Run `cargo test -p sound` — expect PASS, every existing test (including `stop_all_fades_rather_than_clicks` and the step tests) still green.
- [ ] 5. REFACTOR — none.

**Verify** — `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test -p sound` → `test result: ok. 15 passed` (13 today + 2).

### T002 · practice.drone/REQ-001, practice.drone/REQ-005 · The `Drone` voice: harmonic tables, attack, release, level

**Status:** done

**Files**
- Create: `src/sound/src/drone.rs`
- Modify: `src/sound/src/voices.rs` (`VoiceKind::Drone(Drone)`, its `next_sample` and `release_seconds` arms)
- Modify: `src/sound/src/lib.rs` (`mod drone;`, `push_drone`)
- Test: `src/sound/src/drone.rs` (`mod tests`), `src/sound/src/lib.rs` (`mod tests`)

**Interfaces**
- Consumes: `Length::UntilStopped`, `Voice::new(tag, kind, onset_frame, length)`, `VoiceKind::release_seconds` (T001)
- Produces:
  ```rust
  pub const ATTACK_S: f32 = 0.060;
  pub const RELEASE_S: f32 = 0.080;
  pub const MAX_HARMONIC: usize = 24;
  /// The summed |gain| of every partial, so the peak never exceeds it: ≤ 0.6 × the tone's own peak (tone::PEAK_GAIN · 1.25 = 0.3125).
  pub const PEAK_GAIN: f32 = 0.15;
  #[derive(Clone, Copy, PartialEq)] pub enum DroneSound { Pure, Warm, Reed }
  impl DroneSound { pub fn from_code(code: u32) -> Option<DroneSound> }   // 0 → Pure, 1 → Warm, 2 → Reed
  #[derive(Clone, Copy)]
  pub struct Drone { hz: f32, phase: f32, gains: [f32; MAX_HARMONIC + 1] /* index 0 = the sub-octave (0.5×), index k = k× */ }
  impl Drone {
      pub fn new(hz: f32, sound: DroneSound) -> Self;
      /// Attack-enveloped sum of the partials below Nyquist at `elapsed_frames` since onset.
      pub fn next_sample(&mut self, elapsed_frames: f64, sample_rate: f32) -> f32;
  }
  #[no_mangle] pub extern "C" fn push_drone(tag: u32, hz: f32, onset_frame: f64, sound: u32) -> u32   // 0 = pool full or unknown sound code
  ```
  Gain tables (built in `Drone::new`, then scaled so `Σ|gains| == PEAK_GAIN`): with `lowpass(k) = 1 / (1 + (k/5)²).sqrt()` —
  `Pure`: `gains[1] = 1`.
  `Warm`: `gains[1] += 0.8` (sine), `gains[0] += 0.35` (sub-octave sine), and for k in 1..=24 `gains[k] += 0.22 · (2/π) / k · lowpass(k)` (sawtooth).
  `Reed`: for odd k `gains[k] += 0.16 · (4/π) / k · lowpass(k)` (square); for k in 1..=24 `gains[k] += 0.20 · (2/π) / k · lowpass(k)` (sawtooth); `gains[0] += 0.30` (sub-octave sine).
  Rendering: `phase` advances by `2π·hz/sample_rate` and wraps at `4π` (so the 0.5× partial stays continuous); sample = `attack(elapsed) · (gains[0]·sin(0.5·phase) + Σ_{k=1..=24, k·hz < sample_rate/2} gains[k]·sin(k·phase))`; `attack(e) = (e / (ATTACK_S·sample_rate)).min(1.0)`. The release is T001's per-kind stop fade (`release_seconds` → `RELEASE_S`), not part of `next_sample`.

**Steps**
- [ ] 1. RED — in `drone.rs`'s `mod tests`:
  ```rust
  // practice.drone/REQ-005/S2 — pure is a sine: Goertzel power at 2f..8f each < −40 dB relative to f
  #[test]
  fn pure_drone_has_a_single_partial() {
      let mut drone = Drone::new(440.0, DroneSound::Pure);
      let samples: Vec<f32> = (0..48000).map(|f| drone.next_sample(f64::from(f) + 4800.0, SAMPLE_RATE)).collect();
      let fundamental = goertzel_power(&samples, 440.0, SAMPLE_RATE);
      for k in 2..=8 {
          let partial = goertzel_power(&samples, 440.0 * k as f32, SAMPLE_RATE);
          assert!(10.0 * (partial / fundamental).log10() < -40.0, "partial {k} too loud");
      }
  }
  // practice.drone/REQ-001/S1 — faded in, audible within 50 ms: ≥ 5 % of full level by 30 ms, full by 60 ms
  #[test]
  fn drone_attack_is_audible_by_30ms_and_full_by_60ms() { /* peak over frames 1200..1440 ≥ 0.05·PEAK_GAIN; peak over 2880..3120 ≥ 0.9·steady peak, for each of the three sounds */ }
  // practice.drone/REQ-005/S4 — every sound's steady peak ≤ 0.6 × the tone's steady peak
  #[test]
  fn every_drone_sound_peaks_at_most_60_percent_of_a_tone() { /* tone::Tone::new(440.0) rendered 48000 frames with Length::Frames(96000): peak; each DroneSound rendered from elapsed 4800: peak ≤ 0.6 · tone_peak */ }
  ```
  Write `goertzel_power(samples, hz, sample_rate) -> f32` as a test helper in the same module. Write the two bodies sketched in comments out in full — they are the test, not a description.
  And in `lib.rs`'s `mod tests`:
  ```rust
  // practice.drone/REQ-001/S2 — silent within 500 ms of ■: with RELEASE_S = 0.080 the drone is fully silent 80 ms + one quantum after stop(tag)
  #[test]
  fn a_stopped_drone_is_silent_within_its_release() {
      let _guard = lock_engine();
      init(48000.0);
      assert_eq!(push_drone(7, 440.0, 0.0, 1), 1);
      for q in 0..40 { render(f64::from(q) * 128.0); }   // past the attack
      stop(7);
      for q in 40..72 { render(f64::from(q) * 128.0); }  // 32 quantums = 4096 frames > 3840 + 128
      let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
      assert!(out.iter().all(|s| *s == 0.0));
  }
  #[test]
  fn an_unknown_sound_code_is_refused() { let _guard = lock_engine(); init(48000.0); assert_eq!(push_drone(1, 440.0, 0.0, 3), 0); }
  #[test]
  fn a_drone_renders_without_large_steps_across_attack_and_stop() { /* push_drone(1, 110.0, 0.0, 1) — Warm at A2, the sub-octave's worst case; render 20 quantums, stop(1), render 40 more; max_step over everything < 0.05 */ }
  ```
- [ ] 2. Run `cargo test -p sound` — expect FAIL: `unresolved import `crate::drone``.
- [ ] 3. GREEN — write `drone.rs` per Interfaces; `VoiceKind::Drone(Drone)` with `next_sample` → `drone.next_sample(elapsed, sample_rate)` and `release_seconds` → `RELEASE_S`; `push_drone` → `DroneSound::from_code(sound)` (None → return 0) → `Voice::new(tag, VoiceKind::Drone(Drone::new(hz, sound)), onset_frame, Length::UntilStopped)` → `voices.push`.
- [ ] 4. Run `cargo test -p sound` — expect PASS.
- [ ] 5. REFACTOR — none. Then add the ignored benchmark (`#[test] #[ignore] fn reed_drone_render_cost()`: 375 quantums of Reed at 440 Hz, print `µs per quantum`); run `cargo test -p sound --release -- --ignored reed_drone_render_cost --nocapture` and paste the number in the report. If a quantum costs more than 500 µs, lower `MAX_HARMONIC` until it does not and say so.

**Verify** — `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test -p sound` → `test result: ok. 21 passed` (15 + 6, the benchmark ignored).

### T003 · practice.drone/REQ-003, practice.drone/REQ-005 · The drone glides on retune; a sound change crossfades without silence

**Status:** done

**Files**
- Modify: `src/sound/src/drone.rs` (`target_hz`, `glide_per_frame`, `retune`)
- Modify: `src/sound/src/voices.rs` (`Voices::retune`)
- Modify: `src/sound/src/lib.rs` (`retune`)
- Test: `src/sound/src/drone.rs`, `src/sound/src/lib.rs`

**Interfaces**
- Consumes: `Drone`, `DroneSound`, `push_drone`, `stop` (T001, T002)
- Produces:
  ```rust
  pub const GLIDE_S: f32 = 0.040;
  impl Drone {
      /// Starts a linear glide from the current hz to `hz`, reaching it GLIDE_S later; a retune mid-glide restarts the glide from where the pitch is.
      pub fn retune(&mut self, hz: f32, sample_rate: f32);
      pub fn hz(&self) -> f32;   // the pitch this instant (tests)
  }
  impl Voices { pub fn retune(&mut self, tag: u32, hz: f32) }   // Drone voices with that tag only; tones, clicks and unknown tags → no-op
  #[no_mangle] pub extern "C" fn retune(tag: u32, hz: f32)
  ```
  `next_sample` moves `hz` toward `target_hz` by `glide_per_frame` each frame until equal; `glide_per_frame = (target − hz) / (GLIDE_S · sample_rate)`, recomputed at each `retune`.

**Steps**
- [ ] 1. RED — in `drone.rs`'s `mod tests`:
  ```rust
  // practice.drone/REQ-003/S1 — the pitch glides to the new one within 100 ms (GLIDE_S = 40 ms), nothing restarts
  #[test]
  fn retune_reaches_the_target_within_40ms_without_a_step() {
      let mut drone = Drone::new(783.99, DroneSound::Warm);
      let mut samples = Vec::new();
      for f in 0..4800 { samples.push(drone.next_sample(f64::from(f), SAMPLE_RATE)); }
      drone.retune(587.33, SAMPLE_RATE);
      for f in 4800..9600 { samples.push(drone.next_sample(f64::from(f), SAMPLE_RATE)); }
      assert!((drone.hz() - 587.33).abs() < 0.01, "should have reached the target, at {}", drone.hz());
      let after_1920 = { let mut d = Drone::new(783.99, DroneSound::Warm); for f in 0..4800 { d.next_sample(f64::from(f), SAMPLE_RATE); } d.retune(587.33, SAMPLE_RATE); for f in 4800..6720 { d.next_sample(f64::from(f), SAMPLE_RATE); } d.hz() };
      assert!((after_1920 - 587.33).abs() < 0.01, "40 ms = 1920 frames after retune the glide is complete");
      let step = samples.windows(2).fold(0.0f32, |m, p| m.max((p[1] - p[0]).abs()));
      assert!(step < 0.05, "a glide must not step, got {step}");
  }
  ```
  In `lib.rs`'s `mod tests`:
  ```rust
  // practice.drone/REQ-005/S3 — a sound change is a crossfade: the new voice's attack overlaps the old voice's release, never silent
  #[test]
  fn a_sound_change_crossfade_is_never_silent() {
      let _guard = lock_engine();
      init(48000.0);
      push_drone(1, 440.0, 0.0, 1);
      for q in 0..40 { render(f64::from(q) * 128.0); }
      push_drone(2, 440.0, 40.0 * 128.0 + 960.0, 2);   // the new sound 20 ms out, as the session posts it
      stop(1);
      for q in 40..80 {
          render(f64::from(q) * 128.0);
          let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) };
          let peak = out.iter().fold(0.0f32, |m, s| m.max(s.abs()));
          assert!(peak > 0.01, "quantum {q} went silent during the crossfade (peak {peak})");
      }
  }
  #[test]
  fn retune_ignores_tones_and_unknown_tags() { let _guard = lock_engine(); init(48000.0); push_tone(1, 440.0, 0.0, 4800); retune(1, 880.0); retune(9, 880.0); render(0.0); /* no panic; the tone still renders: */ let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) }; assert!(out[73] != 0.0); }
  ```
- [ ] 2. Run `cargo test -p sound` — expect FAIL: `no method named `retune``.
- [ ] 3. GREEN — per Interfaces.
- [ ] 4. Run `cargo test -p sound` — expect PASS; the step tests of T002 still green.
- [ ] 5. REFACTOR — none.

**Verify** — `cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test -p sound` → `test result: ok. 24 passed`.

### T004 · — · `SoundCommand` learns `drone`, `retune`, `stop`; the shim, the silent port and the fakes follow

**Status:** done

**Files**
- Modify: `src/sound/published/sound-command.schema.ts`
- Modify: `src/sound/published/processor.ts` (`SoundExports`, the `switch`)
- Modify: `src/practice/adapters/silent-sound.ts:31-46` (`post`)
- Modify: `tests/practice/fakes.ts` (`FakeSound`, `sessionOn`, helpers)
- Test: `tests/practice/scenarios/silent-sound.test.ts`, `tests/practice/scenarios/web-audio-problems.test.ts` (schema)

**Interfaces**
- Consumes: the C ABI `push_drone(tag, hz, onset_frame, sound)`, `retune(tag, hz)`, `stop(tag)` (T001–T003)
- Produces:
  ```ts
  // sound/published/sound-command.schema.ts
  export const droneSoundSchema = z.enum(["pure", "warm", "reed"]);
  export type DroneSound = z.infer<typeof droneSoundSchema>;
  // three new members of soundCommandSchema's discriminated union:
  z.object({ kind: z.literal("drone"), tag: z.number().int().nonnegative(), hz: z.number().positive(), onsetFrame: z.number().nonnegative(), sound: droneSoundSchema })
  z.object({ kind: z.literal("retune"), tag: z.number().int().nonnegative(), hz: z.number().positive() })
  z.object({ kind: z.literal("stop"), tag: z.number().int().nonnegative() })
  // processor.ts
  const DRONE_SOUND_CODE: Record<DroneSound, number> = { pure: 0, warm: 1, reed: 2 };
  // SoundExports gains: push_drone(tag: number, hz: number, onsetFrame: number, sound: number): number; retune(tag: number, hz: number): void; stop(tag: number): void
  // tests/practice/fakes.ts
  export interface PostedCommand { readonly command: SoundCommand; readonly atFrame: number }
  // FakeSound gains: readonly posts: PostedCommand[]  (every post, with this.frame at the time) — `posted` stays
  export function isDrone(c: SoundCommand): c is Extract<SoundCommand, { kind: "drone" }>
  export function isRetune(c: SoundCommand): c is Extract<SoundCommand, { kind: "retune" }>
  export function isStop(c: SoundCommand): c is Extract<SoundCommand, { kind: "stop" }>
  export function isTone(c: SoundCommand): c is Extract<SoundCommand, { kind: "tone" }>
  export function isClick(c: SoundCommand): c is Extract<SoundCommand, { kind: "click" }>
  ```
  `FakeSound.fireOnset` narrows to commands that carry `onsetFrame` (`"onsetFrame" in command`), so `retune`/`stop` never match. `silentSound.post`: `retune` and `stop` return without scheduling; `drone` schedules an onset report exactly as a tone does. `processor.ts`: `drone` → `push_drone(..., DRONE_SOUND_CODE[command.sound])`, 0 → the existing `voice-pool-full` problem with `drone dropped: …`; `retune` → `retune`; `stop` → `stop`.

**Steps**
- [ ] 1. RED — append to `tests/practice/scenarios/silent-sound.test.ts`:
  ```ts
  test("silent port — a drone reports its onset at its scheduled frame; retune and stop schedule nothing", () => {
    let now = 0;
    const port = silentSound(() => now);
    const reports: OnsetReport[] = [];
    port.onOnset((report) => reports.push(report));
    port.post({ kind: "drone", tag: 3_000_000, hz: 783.99, onsetFrame: 960, sound: "warm" });
    port.post({ kind: "retune", tag: 3_000_000, hz: 587.33 });
    port.post({ kind: "stop", tag: 3_000_000 });
    vi.advanceTimersByTime(25);
    expect(reports).toEqual([{ tag: 3_000_000, onsetFrame: 960, actualFrame: 960 }]);
  });
  ```
  (use the file's existing fake-timer setup; add `vi` to the import if missing) and to `tests/practice/scenarios/web-audio-problems.test.ts`:
  ```ts
  test("sound command schema — drone, retune and stop are accepted; an unknown drone sound is refused", () => {
    expect(soundCommandSchema.safeParse({ kind: "drone", tag: 1, hz: 440, onsetFrame: 0, sound: "reed" }).success).toBe(true);
    expect(soundCommandSchema.safeParse({ kind: "retune", tag: 1, hz: 440 }).success).toBe(true);
    expect(soundCommandSchema.safeParse({ kind: "stop", tag: 1 }).success).toBe(true);
    expect(soundCommandSchema.safeParse({ kind: "drone", tag: 1, hz: 440, onsetFrame: 0, sound: "bright" }).success).toBe(false);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/silent-sound.test.ts tests/practice/scenarios/web-audio-problems.test.ts` — expect FAIL: the schema rejects `kind: "drone"` (`Invalid discriminator value`).
- [ ] 3. GREEN — schema, processor dispatch, silent port, fakes per Interfaces. `pnpm build:sound` so the staged WASM exports the three new functions.
- [ ] 4. Run the two files — expect PASS. Run `pnpm check` — green (tsc will flag every `posted` narrowing in the existing tests that assumed `kind !== "stopAll"` means "has onsetFrame"; fix each with the new `isTone`/`isClick` helpers, deleting the local copies in `tests/practice/scenarios/session-transport.test.ts:11-21` and `tests/ui/scenarios/app-session.test.tsx:63-67`).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → vitest all files pass; `cargo test` 24 passed.

## Phase 2 — The session holds the drone

_Ends with a drone that starts, stops, retunes, excludes playback and survives the page — all through `practice/published` on the fakes._

### T005 · practice.drone/REQ-002 · The octave rule and the drone's note, pure

**Status:** done

**Files**
- Create: `src/practice/domain/drone.ts`
- Modify: `src/practice/published/index.ts` (exports)
- Test: `tests/practice/scenarios/drone-octave.test.ts`, `tests/practice/invariants/drone-note-in-bounds.test.ts`

**Interfaces**
- Consumes: `pitchPosition(note: Note): number`, `pitchHzOf(note: Note): number`, `type Key`, `type Variant`, `type NoteRange`, `type PitchClass` (`theory/published`); `type DroneSound` (T004)
- Produces:
  ```ts
  export type { DroneSound } from "../../sound/published/sound-command.schema";
  export type DroneOctave = { readonly kind: "nearest" } | { readonly kind: "pinned"; readonly octave: number };
  export interface DroneSettings { readonly octave: DroneOctave; readonly sound: DroneSound }
  export const defaultDroneSettings: DroneSettings = { octave: { kind: "nearest" }, sound: "warm" };
  export const PIANO_LOWEST_POSITION = 21;   // A0 in pitchPosition's numbering (C4 = 60)
  export const PIANO_HIGHEST_POSITION = 108; // C8
  /** The octave (0–8) putting `tonic` nearest the middle of `range`, within the range; the lower octave on a tie; if no octave of the tonic lies within the range, the nearest to the middle within A0–C8. */
  export function defaultDroneOctave(tonic: PitchClass, range: NoteRange): number
  /** The drone's note: the key's tonic (its spelling) at the pinned octave when that lies within A0–C8, else at defaultDroneOctave. */
  export function droneNoteOf(key: Key, variant: Variant, settings: DroneSettings): Note
  /** Whether the note one octave away in `delta`'s direction still lies within A0–C8. */
  export function canStepDroneOctave(note: Note, delta: -1 | 1): boolean
  ```
  Middle = `(pitchPosition(range.lowest) + pitchPosition(range.highest)) / 2` (may be x.5); iterate octaves 0..=8 ascending and keep a candidate only when strictly nearer, so a tie keeps the lower.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/drone-octave.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { defaultDroneSettings, droneNoteOf } from "../../../src/practice/published";
  import { noteLabel } from "../../../src/theory/published";
  import { keyOf, variantOf } from "../fakes";

  test("practice.drone/REQ-002/S1 — the default octave per key and variant", () => {
    const cases: readonly [string, string, string][] = [
      ["G", "flute-concert", "G5"], ["G", "ocarina-alto-c", "G5"], ["G", "ocarina-bass-c", "G4"],
      ["C", "flute-concert", "C5"], ["C", "ocarina-alto-c", "C6"], ["C", "ocarina-bass-c", "C5"],
    ];
    for (const [key, variant, expected] of cases) {
      expect(noteLabel(droneNoteOf(keyOf(key), variantOf(variant), defaultDroneSettings))).toBe(expected);
    }
  });

  test("practice.drone/REQ-002/S5 — a pinned octave the new key cannot use falls back to that key's default, the pin kept", () => {
    const pinnedToZero = { ...defaultDroneSettings, octave: { kind: "pinned", octave: 0 } } as const;
    expect(noteLabel(droneNoteOf(keyOf("A"), variantOf("flute-concert"), pinnedToZero))).toBe("A0");
    expect(noteLabel(droneNoteOf(keyOf("C"), variantOf("flute-concert"), pinnedToZero))).toBe("C5");
    expect(noteLabel(droneNoteOf(keyOf("A"), variantOf("flute-concert"), pinnedToZero))).toBe("A0");
  });
  ```
  and `tests/practice/invariants/drone-note-in-bounds.test.ts`:
  ```ts
  // practice.drone/REQ-002 — over every catalogued variant, every selectable key spelling (both rings, both spellings) and every octave setting: unpinned lies within the variant's range; every result lies within A0–C8; canStepDroneOctave agrees with the bounds.
  test("practice.drone/REQ-002 (invariant) — the drone's note is always within A0–C8, and within the range when unpinned", () => {
    for (const variant of builtInCatalogue().instruments.flatMap((i) => i.variants))
      for (const position of circleOfFifths())
        for (const spelling of ["sharp", "flat"] as const)
          for (const key of [spelledMajorAt(position, spelling), spelledMinorAt(position, spelling)]) {
            const nearest = droneNoteOf(key, variant, defaultDroneSettings);
            expect(pitchPosition(nearest)).toBeGreaterThanOrEqual(pitchPosition(variant.range.lowest));
            expect(pitchPosition(nearest)).toBeLessThanOrEqual(pitchPosition(variant.range.highest));
            for (let octave = 0; octave <= 8; octave += 1) {
              const note = droneNoteOf(key, variant, { sound: "warm", octave: { kind: "pinned", octave } });
              expect(pitchPosition(note)).toBeGreaterThanOrEqual(PIANO_LOWEST_POSITION);
              expect(pitchPosition(note)).toBeLessThanOrEqual(PIANO_HIGHEST_POSITION);
              expect(canStepDroneOctave(note, -1)).toBe(pitchPosition(note) - 12 >= PIANO_LOWEST_POSITION);
              expect(canStepDroneOctave(note, 1)).toBe(pitchPosition(note) + 12 <= PIANO_HIGHEST_POSITION);
            }
          }
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-octave.test.ts tests/practice/invariants/drone-note-in-bounds.test.ts` — expect FAIL: `"droneNoteOf" is not exported`.
- [ ] 3. GREEN — `drone.ts` per Interfaces; export everything from `practice/published`.
- [ ] 4. Run the two files — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass, the two new files included.

### T006 · practice.drone/REQ-001, practice.drone/REQ-005 · The session starts, stops and re-sounds the drone

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`SessionSnapshot`, `Session`, `createSession` signature, `recompute`, new functions)
- Modify: `src/practice/published/index.ts` (`DroneSnapshot`, `DRONE_RELEASE_MS`)
- Modify: `tests/practice/fakes.ts` (`sessionOn` gains `droneSettings = defaultDroneSettings` after `scaleChoice`; `startDroneAndFlush`)
- Modify (call sites of `createSession`): `src/ui/App.tsx:251-257` (pass `defaultDroneSettings` for now — T016 wires the store), `tests/ui/scenarios/*.test.tsx` only where they call `createSession` directly (`grep -ln "createSession(" tests/ui`)
- Test: `tests/practice/scenarios/drone-tonic.test.ts`, `tests/practice/scenarios/drone-sound.test.ts`

**Interfaces**
- Consumes: `droneNoteOf`, `canStepDroneOctave`, `DroneSettings`, `defaultDroneSettings` (T005); `isDrone`, `isStop`, `FakeSound.posts` (T004)
- Produces:
  ```ts
  export interface DroneSnapshot { readonly on: boolean; readonly note: Note; readonly hz: number; readonly settings: DroneSettings; readonly canStepDown: boolean; readonly canStepUp: boolean }
  // SessionSnapshot gains: readonly drone: DroneSnapshot
  export const DRONE_RELEASE_MS = 80;   // mirrors src/sound/src/drone.rs RELEASE_S
  export function createSession(context: SessionContext, traversal: Traversal, scaleChoice: ScaleChoice, settings: SessionSettings, droneSettings: DroneSettings, deps: SessionDeps): Session
  Session.startDrone(): void   // async inside, like start(): await sound.start() → on failure notice = "sound-unavailable" and stay off; await wakeLock.acquire(); post drone at sound.currentFrame() + firstTickLeadFrames(); on = true
  Session.stopDrone(): void    // post { kind: "stop", tag }; on = false; wakeLock.release() unless playing
  Session.setDroneSound(sound: DroneSound): void   // settings.sound; if on: post a new drone (new tag, same hz, new sound) at currentFrame() + lead and stop the old tag in the same call
  // tests/practice/fakes.ts
  export async function startDroneAndFlush(session: Session): Promise<void>   // session.startDrone(); await Promise.resolve(); await Promise.resolve();
  ```
  Tags: `DRONE_TAG_BASE = 3_000_000`, one new tag per drone voice (`DRONE_TAG_BASE + droneCounter`); the live tag is kept privately. A pending `startDrone()` whose await outlives a `stopDrone()` (or a second `startDrone()`) posts nothing: keep a `droneGeneration` counter, bump it in both, and compare after the await. `recompute()` also derives `droneNote = droneNoteOf(currentContext.key, currentContext.variant, currentDroneSettings)`. `snapshotsMateriallyEqual` compares `drone.on`, `drone.note` (by `noteLabel`) and `drone.settings` (by reference). The notice is the existing `"sound-unavailable"` field.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/drone-tonic.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { defaultSessionSettings, defaultTraversal } from "../../../src/practice/published";
  import { noteLabel } from "../../../src/theory/published";
  import { isDrone, isStop, sessionOn, startDroneAndFlush } from "../fakes";

  test("practice.drone/REQ-001/S1 — G major on the flute (acceptance)", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    expect(session.snapshot().drone.on).toBe(false);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
    await startDroneAndFlush(session);
    const drones = sound.posted.filter(isDrone);
    expect(drones).toHaveLength(1);
    expect(drones[0]!.hz).toBeCloseTo(783.99, 2);
    expect(drones[0]!.sound).toBe("warm");
    expect(drones[0]!.onsetFrame).toBeLessThanOrEqual((50 * sound.sampleRate()) / 1000);
    expect(session.snapshot().drone.on).toBe(true);
    expect(session.snapshot().drone.hz).toBeCloseTo(783.99, 2);
  });

  test("practice.drone/REQ-001/S2 — off", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    const tag = sound.posted.filter(isDrone)[0]!.tag;
    session.stopDrone();
    expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
    expect(session.snapshot().drone.on).toBe(false);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
  });
  ```
  `tests/practice/scenarios/drone-sound.test.ts`:
  ```ts
  test("practice.drone/REQ-005/S3 — changing the sound mid-drone crossfades: a new voice and a stop of the old, never silent", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    const first = sound.posted.filter(isDrone)[0]!;
    session.setDroneSound("reed");
    const drones = sound.posted.filter(isDrone);
    expect(drones).toHaveLength(2);
    expect(drones[1]!.sound).toBe("reed");
    expect(drones[1]!.hz).toBeCloseTo(first.hz, 5);
    expect(drones[1]!.tag).not.toBe(first.tag);
    expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag: first.tag }]);
    expect(session.snapshot().drone.settings.sound).toBe("reed");
    expect(session.snapshot().drone.on).toBe(true);
    // the overlap itself (attack over release, never silent) is proved on rendered samples by sound::tests::a_sound_change_crossfade_is_never_silent
  });

  test("practice.drone/REQ-005/S2 — pure is posted as pure (its single partial is proved by sound::tests::pure_drone_has_a_single_partial)", async () => {
    const { session, sound } = sessionOn("A", "flute-concert", defaultTraversal, defaultSessionSettings, defaultScaleChoice, { ...defaultDroneSettings, sound: "pure" });
    await startDroneAndFlush(session);
    expect(sound.posted.filter(isDrone)[0]!.sound).toBe("pure");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-tonic.test.ts tests/practice/scenarios/drone-sound.test.ts` — expect FAIL: `session.startDrone is not a function` (after the `createSession` arity error in fakes is fixed by adding the parameter).
- [ ] 3. GREEN — per Interfaces. `startDrone` mirrors `start()`'s try/catch around `sound.start()`. Update every `createSession` call site listed in Files.
- [ ] 4. Run the two files — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — `start()` and `startDrone()` share the "await sound.start(), turn any failure into the notice" block: extract `async function acquireSound(): Promise<boolean>` inside `createSession` and use it from both.

**Verify** — `pnpm check` → all vitest files pass.

### T007 · practice.drone/REQ-002, practice.drone/REQ-003 · Stepping the octave; the drone follows the key and the instrument

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`stepDroneOctave`, retune in `setContext`)
- Test: `tests/practice/scenarios/drone-octave.test.ts` (append), `tests/practice/scenarios/drone-tonic.test.ts` (append)

**Interfaces**
- Consumes: `Session.startDrone`, `DroneSnapshot`, `startDroneAndFlush` (T006); `isRetune` (T004)
- Produces:
  ```ts
  Session.stepDroneOctave(delta: -1 | 1): void   // no-op when !canStep; else settings.octave = { kind: "pinned", octave: current.octave + delta }, recompute, and if on: post { kind: "retune", tag, hz }
  ```
  `setContext` (and any recompute) compares the drone's hz before and after; if on and the hz changed → `retune`; a respelling (same hz) posts nothing.

**Steps**
- [ ] 1. RED — append to `drone-octave.test.ts` (imports: `isRetune`, `isStop`, `startDroneAndFlush`, `keyOf`, `variantOf`, `defaultSessionSettings`, `defaultTraversal`):
  ```ts
  test("practice.drone/REQ-002/S2 — stepping while sounding retunes without a break", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    const tag = sound.posted.filter(isDrone)[0]!.tag;
    session.stepDroneOctave(-1);
    expect(sound.posted.filter(isRetune)).toEqual([{ kind: "retune", tag, hz: expect.closeTo(392.0, 2) }]);
    expect(sound.posted.filter(isStop)).toHaveLength(0);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
    session.stepDroneOctave(1);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
  });

  test("practice.drone/REQ-002/S3 — the stepped octave follows the key and the instrument", () => {
    const { session } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    session.stepDroneOctave(-1);
    session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
    expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
    session.setContext({ key: keyOf("D"), variant: variantOf("ocarina-alto-c") });
    expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
  });

  test("practice.drone/REQ-002/S4 — the piano's ends", () => {
    const { session } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    for (const expected of ["G4", "G3", "G2", "G1"]) { session.stepDroneOctave(-1); expect(noteLabel(session.snapshot().drone.note)).toBe(expected); }
    expect(session.snapshot().drone.canStepDown).toBe(false);
    session.stepDroneOctave(-1);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G1");
    for (let i = 0; i < 6; i += 1) session.stepDroneOctave(1);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G7");
    expect(session.snapshot().drone.canStepUp).toBe(false);
    session.setContext({ key: keyOf("C"), variant: variantOf("flute-concert") });
    session.stepDroneOctave(1);
    expect(noteLabel(session.snapshot().drone.note)).toBe("C8");
    expect(session.snapshot().drone.canStepUp).toBe(false);
    session.setContext({ key: keyOf("A"), variant: variantOf("flute-concert") });
    for (let i = 0; i < 8; i += 1) session.stepDroneOctave(-1);
    expect(noteLabel(session.snapshot().drone.note)).toBe("A0");
    expect(session.snapshot().drone.canStepDown).toBe(false);
  });

  test("practice.drone/REQ-002/S6 — unpinned, the octave follows the instrument", () => {
    const { session } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
    session.setContext({ key: keyOf("G"), variant: variantOf("ocarina-bass-c") });
    expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
  });
  ```
  Append to `drone-tonic.test.ts`:
  ```ts
  test("practice.drone/REQ-003/S1 — a new key while sounding glides, never stopping", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    const tag = sound.posted.filter(isDrone)[0]!.tag;
    session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
    expect(sound.posted.filter(isRetune)).toEqual([{ kind: "retune", tag, hz: expect.closeTo(587.33, 2) }]);
    expect(noteLabel(session.snapshot().drone.note)).toBe("D5");
    session.setContext({ key: keyOf("Bm"), variant: variantOf("flute-concert") });
    expect(sound.posted.filter(isRetune)[1]).toEqual({ kind: "retune", tag, hz: expect.closeTo(987.77, 2) });
    expect(sound.posted.filter(isStop)).toHaveLength(0);
    expect(sound.posted.filter(isDrone)).toHaveLength(1);
  });

  test("practice.drone/REQ-003/S2 — respelling keeps the pitch", async () => {
    const { session, sound } = sessionOn("F#", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    expect(noteLabel(session.snapshot().drone.note)).toBe("F♯5");
    session.setContext({ key: keyOf("Gb"), variant: variantOf("flute-concert") });
    expect(noteLabel(session.snapshot().drone.note)).toBe("G♭5");
    expect(sound.posted.filter(isRetune)).toHaveLength(0);
    expect(session.snapshot().drone.hz).toBeCloseTo(739.99, 2);
  });

  test("practice.drone/REQ-003/S3 — a new instrument while sounding, unpinned, retunes to the new default octave", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    session.setContext({ key: keyOf("G"), variant: variantOf("ocarina-bass-c") });
    expect(sound.posted.filter(isRetune)).toEqual([{ kind: "retune", tag: sound.posted.filter(isDrone)[0]!.tag, hz: expect.closeTo(392.0, 2) }]);
    expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-octave.test.ts tests/practice/scenarios/drone-tonic.test.ts` — expect FAIL: `session.stepDroneOctave is not a function`.
- [ ] 3. GREEN — per Interfaces.
- [ ] 4. Run the two files — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass.

### T008 · practice.drone/REQ-004 · Playback and the drone exclude each other; the wake lock is shared

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`start`, `stop`, `startDrone`, `stopDrone`, `armIdleTimer`'s release)
- Test: `tests/practice/scenarios/drone-exclusion.test.ts`

**Interfaces**
- Consumes: `Session.startDrone/stopDrone`, `DRONE_RELEASE_MS`, `startDroneAndFlush` (T006); `flushStart` pattern from `tests/practice/scenarios/session-transport.test.ts:28-34` (copy it into the new file); `isClick`, `isStop`, `isDrone`, `FakeSound.posts` (T004)
- Produces (behaviour, no new signatures):
  - `startDrone()`: if `transport.kind !== "idle"` → `stop()` first (its `stopAll`), then the drone.
  - `start()`: if the drone is on → `stopDrone()` and schedule the scheduler's first onset at `sound.currentFrame() + firstTickLeadFrames() + Math.round((DRONE_RELEASE_MS * sound.sampleRate()) / 1000)` instead of `+ firstTickLeadFrames()` alone.
  - The wake lock is released by `stop()`, the idle transition and `stopDrone()` only when neither playback nor the drone remains: `function releaseWakeLockIfSilent()`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/drone-exclusion.test.ts`:
  ```ts
  const GMajorTwoOctaves: Traversal = { direction: "updown", octaves: { kind: "count", count: 2 }, shape: "scale" };

  test("practice.drone/REQ-004/S1 — the drone interrupts a run", async () => {
    const { session, sound, clock, wake } = sessionOn("G", "flute-concert", GMajorTwoOctaves, { ...defaultSessionSettings, countIn: false });
    await flushStart(session);
    advanceUntil(clock, () => session.snapshot().soundingPosition === 8);
    const postsBefore = sound.posts.length;
    await startDroneAndFlush(session);
    const after = sound.posts.slice(postsBefore).map((p) => p.command.kind);
    expect(after[0]).toBe("stopAll");
    expect(after).toContain("drone");
    expect(session.snapshot().transport).toEqual({ kind: "idle" });
    expect(session.snapshot().caption).toBe("29 notes · G4–G6");
    expect(session.snapshot().progress).toBe(0);
    expect(session.snapshot().drone.on).toBe(true);
    expect(wake.acquired).toBe(true);
  });

  test("practice.drone/REQ-004/S2 — ▶ silences the drone before the first click", async () => {
    const { session, sound, clock, wake } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    await startDroneAndFlush(session);
    clock.advance(500);
    const tapFrame = sound.currentFrame();
    const tag = sound.posted.filter(isDrone)[0]!.tag;
    await flushStart(session);
    expect(session.snapshot().drone.on).toBe(false);
    const stop = sound.posts.find((p) => isStop(p.command) && p.command.tag === tag);
    expect(stop?.atFrame).toBe(tapFrame);
    advanceUntil(clock, () => sound.posted.some(isClick));
    const releaseFrames = (DRONE_RELEASE_MS * sound.sampleRate()) / 1000;
    const leadFrames = (FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000;
    expect(sound.posted.filter(isClick)[0]!.onsetFrame).toBe(tapFrame + leadFrames + releaseFrames);
    expect(wake.acquired).toBe(true);
    session.stop();
    expect(wake.acquired).toBe(false);
  });

  test("practice.drone/REQ-004 — the wake lock is held while either sounds and released only when neither does", async () => {
    const { session, wake } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    await startDroneAndFlush(session);
    expect(wake.acquired).toBe(true);
    session.stopDrone();
    expect(wake.acquired).toBe(false);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-exclusion.test.ts` — expect FAIL: S1's `after[0]` is `"drone"` (no stopAll), S2's first click onset is `tapFrame + 960`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green (every existing transport test's first-tick frame is unchanged because no drone was on).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass.

### T009 · practice.drone/REQ-004 · Never both: the invariant over every interleaving

**Status:** done

**Files**
- Test: `tests/practice/invariants/never-both.test.ts`

**Interfaces**
- Consumes: everything T008 produces; `FakeSound.posts` (T004); `DRONE_RELEASE_MS`, `FIRST_TICK_LEAD_MS`
- Produces: none (a test)

**Steps**
- [ ] 1. RED — `tests/practice/invariants/never-both.test.ts`:
  ```ts
  // practice.drone/REQ-004/S3 — every interleaving of ▶ / ❚❚ on the transport with ▶ / ■ on the pill, up to four taps long, from idle: at no instant is a sequence tone or a click sounding while the drone is.
  type Action = "play" | "pause" | "droneOn" | "droneOff";
  const ACTIONS: readonly Action[] = ["play", "pause", "droneOn", "droneOff"];
  const GAP_MS = 300;
  const CLICK_MS = 25;
  const STOP_FADE_MS = 5;

  function* sequences(length: number): Generator<readonly Action[]> { /* every sequence of exactly `length` actions over ACTIONS, recursively */ }

  async function apply(session: Session, action: Action): Promise<void> {
    switch (action) {
      case "play": await flushStart(session); return;
      case "pause": session.stop(); return;
      case "droneOn": await startDroneAndFlush(session); return;
      case "droneOff": session.stopDrone(); return;
    }
  }

  interface Interval { readonly from: number; readonly to: number }

  // Drone voices as [onset, stop + release] intervals; a stopAll posted at frame s also ends every drone live at s.
  function droneIntervals(posts: readonly PostedCommand[], sampleRate: number): readonly Interval[] { /* from the posts */ }
  // Tones as [onset, min(onset + duration, stopAll-after-onset + 5 ms)], clicks as [onset, min(onset + 25 ms, same)].
  function sequenceIntervals(posts: readonly PostedCommand[], sampleRate: number): readonly Interval[] { /* from the posts */ }

  test("practice.drone/REQ-004/S3 — never both (invariant)", async () => {
    let checked = 0;
    for (let length = 1; length <= 4; length += 1)
      for (const sequence of sequences(length)) {
        const { session, sound, clock } = sessionOn("G", "flute-concert", defaultTraversal, { ...defaultSessionSettings, countIn: false });
        for (const action of sequence) { await apply(session, action); clock.advance(GAP_MS); }
        clock.advance(2000);
        const drones = droneIntervals(sound.posts, sound.sampleRate());
        for (const voice of sequenceIntervals(sound.posts, sound.sampleRate()))
          for (const drone of drones)
            expect(voice.from < drone.to && drone.from < voice.to, `overlap in ${sequence.join(" → ")}`).toBe(false);
        session.dispose();
        checked += 1;
      }
    expect(checked).toBe(4 + 16 + 64 + 256);
  });
  ```
  Write the three helper bodies in full (the comments say what each must compute; the `stopAll` posted by `stop()`/`restartIfPlaying` cuts a tone or click 5 ms after its post frame if it had begun, and drops it entirely if it had not yet begun).
- [ ] 2. Run `pnpm vitest run tests/practice/invariants/never-both.test.ts` — expect PASS on the first run if T008 is right; if it FAILS, the failing sequence names the gap — fix `session.ts`, not the test, and say which sequence in the report.
- [ ] 3. `pnpm check` — green.

**Verify** — `pnpm vitest run tests/practice/invariants/never-both.test.ts` → `1 passed`, and the run takes under 10 s.

### T010 · practice.drone/REQ-007, practice.drone/REQ-008 · The page hidden, the screen awake, sound that cannot start

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`unsubscribeVisibility`'s listener; `dispose`)
- Test: `tests/practice/scenarios/drone-hidden-awake.test.ts`, `tests/practice/scenarios/drone-sound-unavailable.test.ts`

**Interfaces**
- Consumes: T006–T008's session surface; `FakeSound.failWith`, `FakeSound.startCalls`, `FakeVisibility.hide()`, `FakeWakeLock.acquired`
- Produces (behaviour): `visibility.onHidden` → `stop()` then `stopDrone()`; `dispose()` → `stopDrone()` before `sound.dispose()`; `startDrone()` failure leaves `on === false` with `notice === "sound-unavailable"` and no wake lock; a later `startDrone()` clears the notice on success.

**Steps**
- [ ] 1. RED — `drone-hidden-awake.test.ts`:
  ```ts
  test("practice.drone/REQ-007/S1 — hidden means silent", async () => {
    const { session, sound, visibility } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    const tag = sound.posted.filter(isDrone)[0]!.tag;
    visibility.hide();
    expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
    expect(session.snapshot().drone.on).toBe(false);
    await startDroneAndFlush(session);
    expect(sound.posted.filter(isDrone)).toHaveLength(2);
    expect(session.snapshot().drone.on).toBe(true);
  });

  test("practice.drone/REQ-007/S2 — the phone on the stand stays lit", async () => {
    const { session, wake, clock } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    await startDroneAndFlush(session);
    clock.advance(120_000);
    expect(wake.acquired).toBe(true);
    session.stopDrone();
    expect(wake.acquired).toBe(false);
  });
  ```
  `drone-sound-unavailable.test.ts`:
  ```ts
  test("practice.drone/REQ-008/S1 — off, not silently on", async () => {
    const { session, sound, wake } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    sound.failWith = { reason: "no-audio-context", detail: "test" };
    await startDroneAndFlush(session);
    expect(session.snapshot().notice).toBe("sound-unavailable");
    expect(session.snapshot().drone.on).toBe(false);
    expect(sound.posted.filter(isDrone)).toHaveLength(0);
    expect(wake.acquired).toBe(false);
  });

  test("practice.drone/REQ-008/S2 — the next tap tries again", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    sound.failWith = { reason: "worklet-failed", detail: "test" };
    await startDroneAndFlush(session);
    sound.failWith = null;
    await startDroneAndFlush(session);
    expect(sound.startCalls).toBe(2);
    expect(sound.posted.filter(isDrone)).toHaveLength(1);
    expect(session.snapshot().drone.on).toBe(true);
    expect(session.snapshot().notice).toBeNull();
  });

  test("practice.drone/REQ-008/S3 — nothing before the gesture", () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings, defaultScaleChoice, { octave: { kind: "pinned", octave: 4 }, sound: "reed" });
    expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
    expect(sound.startCalls).toBe(0);
    expect(sound.posted).toHaveLength(0);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-hidden-awake.test.ts tests/practice/scenarios/drone-sound-unavailable.test.ts` — expect FAIL: REQ-007/S1 (hide does not stop the drone); REQ-008/S1 may already pass — say so.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the two files — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass.

### T011 · practice.session/REQ-013 · A tapped note sounds for one beat

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`tapNote`, `tappedRunIndex`, timers, `start()` ending a tap)
- Modify: `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/session-tap.test.ts`

**Interfaces**
- Consumes: `Session.startDrone` (T006); `isTone`, `isStop`, `FakeSound.posts` (T004); `HIGHLIGHT_LEAD_MS`, `FIRST_TICK_LEAD_MS`
- Produces:
  ```ts
  // SessionSnapshot gains: readonly tappedRunIndex: number | null
  Session.tapNote(runIndex: number): void
  ```
  Behaviour: ignored unless `transport.kind === "idle"` and `run[runIndex]` exists. If a tap is sounding: post `{ kind: "stop", tag: previousTapTag }`, cancel its two timers, clear `tappedRunIndex`. Then post `{ kind: "tone", tag: TAP_TAG_BASE + tapCounter, hz: pitchHzOf(run[runIndex].note), onsetFrame: sound.currentFrame() + firstTickLeadFrames(), durationFrames: tickFramesOf() }` (`TAP_TAG_BASE = 2_000_000`), and two `clock.setTimeout`s: one aimed like `scheduleHighlight` (audible onset − `HIGHLIGHT_LEAD_MS`) that sets `tappedRunIndex = runIndex`, one a beat later (`tickFramesOf()` in ms) that clears it; both notify. Never touches `soundingPosition`, the caption, `progress` or `targetAdvancedListeners`. `start()` and `restartIfPlaying()` end a sounding tap the same way (stop + cancel + clear). `snapshotsMateriallyEqual` compares `tappedRunIndex`. A tap does not start the sound port: it posts only if `sound.start()` has ever succeeded (keep a `soundReady` flag set by `acquireSound`); before that, `tapNote` calls `acquireSound()` first — async, like `startDrone`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/session-tap.test.ts` (2 oct ↑↓ G major run: index 4 is D5, 5 is E5, 9 is B5):
  ```ts
  async function tapAndFlush(session: Session, runIndex: number): Promise<void> { session.tapNote(runIndex); await Promise.resolve(); await Promise.resolve(); }

  test("practice.session/REQ-013/S1 — a notehead tapped at 96 bpm", async () => {
    const { session, sound, clock } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    let targetAdvanced = 0;
    session.onTargetAdvanced(() => { targetAdvanced += 1; });
    await tapAndFlush(session, 4);
    const tone = sound.posted.filter(isTone)[0]!;
    expect(tone.hz).toBeCloseTo(587.33, 2);
    expect(tone.durationFrames).toBe(30000);
    expect(tone.tag).toBeGreaterThanOrEqual(2_000_000);
    advanceUntil(clock, () => session.snapshot().tappedRunIndex === 4);
    expect(session.snapshot().caption).toBe("29 notes · G4–G6");
    expect(session.snapshot().soundingPosition).toBeNull();
    clock.advance(624);
    expect(session.snapshot().tappedRunIndex).toBe(4);
    clock.advance(2);
    expect(session.snapshot().tappedRunIndex).toBeNull();
    expect(targetAdvanced).toBe(0);
  });

  test("practice.session/REQ-013/S3 — over the drone", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    await startDroneAndFlush(session);
    const droneTag = sound.posted.filter(isDrone)[0]!.tag;
    await tapAndFlush(session, 9);
    expect(sound.posted.filter(isTone)[0]!.hz).toBeCloseTo(987.77, 2);
    expect(sound.posted.filter(isStop).some((s) => s.tag === droneTag)).toBe(false);
    expect(session.snapshot().drone.on).toBe(true);
  });

  test("practice.session/REQ-013/S4 — a second tap restarts", async () => {
    const { session, sound, clock } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    await tapAndFlush(session, 4);
    const first = sound.posted.filter(isTone)[0]!;
    advanceUntil(clock, () => session.snapshot().tappedRunIndex === 4);
    clock.advance(300);
    await tapAndFlush(session, 5);
    expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag: first.tag }]);
    expect(sound.posted.filter(isTone)[1]!.hz).toBeCloseTo(659.26, 2);
    advanceUntil(clock, () => session.snapshot().tappedRunIndex === 5);
    clock.advance(624);
    expect(session.snapshot().tappedRunIndex).toBe(5);
    clock.advance(2);
    expect(session.snapshot().tappedRunIndex).toBeNull();
  });

  test("practice.session/REQ-013/S5 — ignored while playing or counting", async () => {
    const { session, sound, clock } = sessionOn("G", "flute-concert", GMajorTwoOctaves, defaultSessionSettings);
    await flushStart(session);
    const duringCountIn = sound.posted.length;
    await tapAndFlush(session, 4);
    expect(sound.posted.length).toBe(duringCountIn);
    advanceUntil(clock, () => session.snapshot().soundingPosition === 2);
    const duringRun = sound.posted.filter(isTone).length;
    await tapAndFlush(session, 4);
    clock.advance(10);
    expect(sound.posted.filter(isTone).length).toBe(duringRun);
    expect(session.snapshot().tappedRunIndex).toBeNull();
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/session-tap.test.ts` — expect FAIL: `session.tapNote is not a function`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — `scheduleHighlight`'s aim arithmetic (frames → ms + output latency − lead) is now needed twice: extract `msUntilAudible(onsetFrame: number): number` and use it from both.

**Verify** — `pnpm vitest run tests/practice` → all pass.

## Phase 3 — The UI

_Ends with the pill in the disc, the sheet, the tap targets and the remembered settings, screenshot-comparable against the design._

### T012 · practice.drone/REQ-009 · Stored selection v5 carries the drone's octave and sound

**Status:** done

**Files**
- Modify: `src/ui/selection-store.ts`
- Test: `tests/ui/scenarios/selection-store.test.ts`

**Interfaces**
- Consumes: `droneSoundSchema`, `type DroneSound` (`sound/published/sound-command.schema`, T004)
- Produces:
  ```ts
  // StoredSelection: schemaVersion: 5; gains
  readonly drone: { readonly octave: number | null; readonly sound: DroneSound }   // null = nearest
  // firstRunDefaults gains: drone: { octave: null, sound: "warm" }
  const storedDroneSchema = z.object({
    octave: z.number().int().min(0).max(8).nullable().catch(null),
    sound: droneSoundSchema.catch("warm"),
  }).catch({ octave: null, sound: "warm" });
  const storedSelectionV5Schema = storedSelectionV4Schema.extend({ schemaVersion: z.literal(5), drone: storedDroneSchema });
  function migrateFromV4(v4: z.infer<typeof storedSelectionV4Schema>): StoredSelection   // every v4 field + drone at its defaults
  ```
  v1–v3 chain through v4 as today. The union lists v5 first. A comment at `storedDroneSchema` says why it falls back per field where `tempoBpm` does not (REQ-009/S4 vs REQ-011).

**Steps**
- [ ] 1. RED — append to `tests/ui/scenarios/selection-store.test.ts` (it already builds a v4 payload and a store; reuse its helpers):
  ```ts
  test("practice.drone/REQ-009/S3 — stored state from 005 (v4) restores everything it carries; the drone takes its defaults", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v4Payload));
    const loaded = localStorageSelectionStore(localStorage).load();
    expect(loaded?.schemaVersion).toBe(5);
    expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
    expect(loaded?.scale).toEqual(v4Payload.scale);
    expect(loaded?.session.tempoBpm).toBe(v4Payload.session.tempoBpm);
  });

  test("practice.drone/REQ-009/S4 — an unreadable octave or sound falls back on its own; the rest is restored", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v4Payload, schemaVersion: 5, drone: { octave: 12, sound: "bright" } }));
    const loaded = localStorageSelectionStore(localStorage).load();
    expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
    expect(loaded?.keyId).toBe(v4Payload.keyId);
    expect(loaded?.session).toEqual(v4Payload.session);
  });

  test("practice.drone/REQ-009 — a v5 payload round-trips", () => {
    const store = localStorageSelectionStore(localStorage);
    const v5: StoredSelection = { ...migrateExpectation, drone: { octave: 4, sound: "reed" } };
    store.save(v5);
    expect(store.load()).toEqual(v5);
  });
  ```
  (`v4Payload` and `migrateExpectation` — the file's existing v4 fixture and the expected loaded object it compares against; name them as the file does.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` — expect FAIL: `loaded.schemaVersion` is 4 / `drone` undefined.
- [ ] 3. GREEN — per Interfaces; every existing v1/v2/v3/v4 expectation in the file gains `drone: { octave: null, sound: "warm" }` and `schemaVersion: 5`.
- [ ] 4. Run the file — expect PASS. `pnpm check` — tsc flags `App.tsx`'s `schemaVersion: 4` save; set it to 5 with `drone: firstRunDefaults.drone` for now (T015 wires the real value).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → all vitest files pass.

### T013 [P] · practice.drone/REQ-001, practice.drone/REQ-002 · `DronePill` — the pill in the disc

**Status:** done

**Files**
- Create: `src/ui/DronePill.tsx`
- Test: `tests/ui/scenarios/drone-pill.test.tsx`

**Interfaces**
- Consumes: `fonts`, `paper` (`src/ui/theme.ts`)
- Produces:
  ```tsx
  export function DronePill(props: {
    readonly noteLabel: string;      // "G5"
    readonly on: boolean;
    readonly canStepDown: boolean;
    readonly canStepUp: boolean;
    readonly onToggle: () => void;
    readonly onStepOctave: (delta: -1 | 1) => void;
    readonly onOpenSheet: () => void;
  }): JSX.Element   // memo-wrapped, like TempoSheet
  ```
  Markup and geometry verbatim from the design's `layoutDisc` block (`changes/004-the-drone/design/Drone.dc.html` lines 57-68), named as constants: outer `div` absolute `left: 189, top: 146, transform: translate(-50%,-50%), zIndex: 2`; inner flex row `border: 1px solid` (`on` ? `rgba(138,75,42,.35)` : `#ddd4c2`), `borderRadius: 999`, `background` (`on` ? `rgba(138,75,42,.10)` : `#f7f3ea`), `transition: background .2s ease, border-color .2s ease`; play button `24×22`, `fontSize: 8.5`, `paddingLeft: 3`, ink (`on` ? `paper.accent` : `#6f675c`), glyph `■` when on else `▶`, `aria-label` `"Stop drone"` / `"Start drone"`, `aria-pressed={on}`; divider `1×12 #e0d7c5`; `−` and `+` buttons `18×22`, `fontSize: 13`, ink `#5e564c` when available else `#c3baab`, `aria-label` `"Drone octave down"` / `"Drone octave up"`, `aria-disabled="true"` and no click when unavailable; label `span` `data-testid="drone-note"` mono `11`/`600`, `minWidth: 20`, centred, ink (`on` ? `paper.accent` : `paper.ink`); `▼` button `fontSize: 8`, `#9a9186`, `padding: "0 8px 0 2px"`, `height: 22`, `aria-label="Edit drone"`. Every button: `type="button"`, `background: transparent`, `border: none`, `lineHeight: 1`, `padding` as given, `cursor: pointer` (default when unavailable).

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/drone-pill.test.tsx`:
  ```tsx
  test("practice.drone/REQ-001/S1 (pill) — off shows ▶ and the note; on shows ■ and presses", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<DronePill noteLabel="G5" on={false} canStepDown canStepUp onToggle={onToggle} onStepOctave={() => {}} onOpenSheet={() => {}} />);
    expect(screen.getByTestId("drone-note").textContent).toBe("G5");
    const start = screen.getByRole("button", { name: "Start drone" });
    expect(start.textContent).toBe("▶");
    expect(start.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(start);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<DronePill noteLabel="G5" on canStepDown canStepUp onToggle={onToggle} onStepOctave={() => {}} onOpenSheet={() => {}} />);
    expect(screen.getByRole("button", { name: "Stop drone" }).textContent).toBe("■");
  });

  test("practice.drone/REQ-002/S4 (pill) — a stepper at the piano's end is shown unavailable and does nothing", async () => {
    const onStep = vi.fn();
    render(<DronePill noteLabel="G1" on={false} canStepDown={false} canStepUp onToggle={() => {}} onStepOctave={onStep} onOpenSheet={() => {}} />);
    const down = screen.getByRole("button", { name: "Drone octave down" });
    expect(down.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(down);
    expect(onStep).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Drone octave up" }));
    expect(onStep).toHaveBeenCalledWith(1);
  });

  test("practice.drone/REQ-006 (pill) — ▼ opens the sheet", async () => {
    const onOpen = vi.fn();
    render(<DronePill noteLabel="G5" on={false} canStepDown canStepUp onToggle={() => {}} onStepOctave={() => {}} onOpenSheet={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/drone-pill.test.tsx` — expect FAIL: cannot resolve `../../../src/ui/DronePill`.
- [ ] 3. GREEN — per Interfaces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/drone-pill.test.tsx` → `3 passed`.

### T014 [P] · practice.drone/REQ-006, practice.drone/REQ-005 · `DroneSheet`, and a header that carries a subtitle and a switch

**Status:** done

**Files**
- Create: `src/ui/DroneSheet.tsx`
- Modify: `src/ui/overlay.tsx:1234-1264` (`OverlayHeader`)
- Test: `tests/ui/scenarios/drone-sheet.test.tsx`

**Interfaces**
- Consumes: `BottomSheet`, `OverlayScrim`, `OverlayHeader` (`src/ui/overlay.tsx`); `type DroneSound`
- Produces:
  ```tsx
  // overlay.tsx — OverlayHeader gains two optional props, both rendered only when given:
  //   subtitle?: ReactNode   — a line under the title: fontSize 11.5, color paper.muted, whiteSpace nowrap, marginTop 4
  //   trailing?: ReactNode   — rendered before the close button, in a flex row with gap 12
  export function DroneSheet(props: {
    readonly open: boolean;
    readonly noteLabel: string;   // "G5"
    readonly hz: number;          // 783.99 → shown as "784.0 Hz"
    readonly on: boolean;
    readonly sound: DroneSound;
    readonly onToggle: () => void;
    readonly onPickSound: (sound: DroneSound) => void;
    readonly onClose: () => void;
  }): JSX.Element   // memo-wrapped
  ```
  From the design (`Drone.dc.html` lines 353-394): scrim z 15, sheet z 16, `paddingBottom: 14`; header title `Drone` with, beside it (baseline, gap 8), mono `11.5` muted `"<noteLabel> · <hz.toFixed(1)> Hz"`; subtitle `"Follows the key on the circle · A = 440 Hz"`; trailing: a switch `button role="switch" aria-checked={on} aria-label="Drone"` drawn like `SettingsDrawer`'s track/knob (36×20 track `paper.accent` on / `paper.trackOff` off, 14 px knob at left 19 / 3, `transition: left .2s ease`); close `aria-label="Close drone sheet"`. One row `padding: "12px 18px"`, `borderBottom: 1px solid paper.hairlineSoft`: left a title `Sound` (`13`/`600`) over a hint (`11.5`, muted, `marginTop: 3`) — `pure` → `"Sine · easiest to hear beats against"`, `warm` → `"Soft, organ-like"`, `reed` → `"Buzzy · closest to a wind drone"`; right three pills `pure` / `warm` / `reed` (`minWidth: 40`, `padding: "9px 10px 10px"`, `borderRadius: 10`, `12.5`/`600`, active `background: paper.pillActive` ink `#4a4136`, inactive ink `#756c60`, `aria-pressed`). Below, a note `padding: "12px 18px 2px"`, `11.5`, muted, `lineHeight: 1.35`: `Tap a note on the stave or in the names to hear it for one beat — over the drone, to check an interval.`

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/drone-sheet.test.tsx`:
  ```tsx
  const base = { open: true, noteLabel: "G5", hz: 783.99, on: false, sound: "warm" as const, onToggle: () => {}, onPickSound: () => {}, onClose: () => {} };

  test("practice.drone/REQ-006/S1 — the sheet's content", () => {
    render(<DroneSheet {...base} />);
    expect(screen.getByText("Drone")).toBeTruthy();
    expect(screen.getByText("G5 · 784.0 Hz")).toBeTruthy();
    expect(screen.getByText("Follows the key on the circle · A = 440 Hz")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Drone" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Tap a note on the stave or in the names to hear it for one beat — over the drone, to check an interval.")).toBeTruthy();
  });

  test("practice.drone/REQ-005/S1 — warm by default, with its hint", async () => {
    const onPick = vi.fn();
    render(<DroneSheet {...base} onPickSound={onPick} />);
    for (const name of ["pure", "warm", "reed"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.getByRole("button", { name: "warm" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Soft, organ-like")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "reed" }));
    expect(onPick).toHaveBeenCalledWith("reed");
  });

  test("practice.drone/REQ-006/S3 — the header follows the key", () => {
    const { rerender } = render(<DroneSheet {...base} />);
    rerender(<DroneSheet {...base} noteLabel="D5" hz={587.33} />);
    expect(screen.getByText("D5 · 587.3 Hz")).toBeTruthy();
  });

  test("practice.drone/REQ-001/S3 (sheet) — the switch toggles", async () => {
    const onToggle = vi.fn();
    render(<DroneSheet {...base} on onToggle={onToggle} />);
    const sw = screen.getByRole("switch", { name: "Drone" });
    expect(sw.getAttribute("aria-checked")).toBe("true");
    await userEvent.click(sw);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/drone-sheet.test.tsx` — expect FAIL: cannot resolve `DroneSheet`.
- [ ] 3. GREEN — per Interfaces; the reed hint when `sound === "reed"`, and so on.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green (the other sheets pass no `subtitle`/`trailing` and render as before).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/drone-sheet.test.tsx` → `4 passed`.

### T015 · practice.drone/REQ-001, practice.drone/REQ-006, practice.drone/REQ-008, practice.drone/REQ-009 · App wiring: the pill over the circle, the sheet, persistence

**Status:** done

**Files**
- Modify: `src/ui/App.tsx` (session creation, save effect, handlers, render)
- Test: `tests/ui/scenarios/app-drone.test.tsx`

**Interfaces**
- Consumes: `DronePill` (T013), `DroneSheet` (T014), `StoredSelection.drone` (T012), `Session.startDrone/stopDrone/stepDroneOctave/setDroneSound`, `DroneSnapshot`, `defaultDroneSettings` (T005–T007)
- Produces (in `App.tsx`):
  ```ts
  function droneSettingsFromStored(stored: StoredSelection["drone"]): DroneSettings   // octave null → { kind: "nearest" }, n → { kind: "pinned", octave: n }
  function storedFromDroneSettings(settings: DroneSettings): StoredSelection["drone"]
  // createSession(..., droneSettingsFromStored(stored?.drone ?? firstRunDefaults.drone), sessionDeps)
  // the save effect writes drone: storedFromDroneSettings(snapshot.drone.settings) and depends on snapshot?.drone.settings
  // state: const [droneSheetOpen, setDroneSheetOpen] = useState(false)
  // handlers (useCallback over `session`): handleToggleDrone (on ? stopDrone : startDrone, reading session.snapshot().drone.on live), handleStepDroneOctave, handlePickDroneSound, handleOpenDroneSheet, handleCloseDroneSheet
  ```
  Render: the circle's wrapper `div` becomes `position: "relative", width: 378, margin: CIRCLE_WRAPPER_MARGIN, flex: "none"` with `<CircleOfFifths …/>` then `<DronePill noteLabel={noteLabel(snapshot.drone.note)} on={snapshot.drone.on} canStepDown={snapshot.drone.canStepDown} canStepUp={snapshot.drone.canStepUp} …/>` (only when `snapshot !== null`); `<DroneSheet open={droneSheetOpen} noteLabel=… hz={snapshot.drone.hz} on={snapshot.drone.on} sound={snapshot.drone.settings.sound} …/>` beside the other sheets.

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/app-drone.test.tsx` (same `testSessionDeps`/render shape as `app-session.test.tsx`; import `isDrone`, `isStop`, `isRetune` from the fakes; `flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }`):
  ```tsx
  test("practice.drone/REQ-001/S1 (app) — tapping ▶ on the pill sounds G5 and the pill shows ■", async () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v4Payload, keyId: "G-major", variantId: "flute-concert" }));
    const { sessionDeps, sound } = testSessionDeps();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={sessionDeps} />);
    expect(screen.getByTestId("drone-note").textContent).toBe("G5");
    await userEvent.click(screen.getByRole("button", { name: "Start drone" }));
    await flush();
    expect(sound.posted.filter(isDrone)[0]!.hz).toBeCloseTo(783.99, 2);
    expect(screen.getByRole("button", { name: "Stop drone" })).toBeTruthy();
  });

  test("practice.drone/REQ-001/S3 (app) — the sheet's switch and the pill are one control", async () => { /* open the sheet via "Edit drone"; click the "Drone" switch; flush; the pill reads "Stop drone"; close the sheet; click "Stop drone"; the pill reads "Start drone"; reopen the sheet: the switch is aria-checked "false" */ });

  test("practice.drone/REQ-001/S4 (app) — sheets, the drawer and the picker never stop it", async () => {
    /* start the drone (flush); then for each of "Edit traversal", "Edit scale", "Andante" (the tempo term button), "Edit drone", "Settings", "Instrument": click it, click its close button, and assert sound.posted has no "stop" and no "retune" and exactly one "drone" throughout */
  });

  test("practice.drone/REQ-006/S2 (app) — the sheet is not a control", async () => {
    /* start playback via "Play" (flush); advance the clock through three ticks (act + clock.advance); open "Edit drone", advance three more ticks, close it; assert no "drone" command was posted and sound.posted.filter(isTone).length grew across the open/close */
  });

  test("practice.drone/REQ-008/S1 (app) — no sound: the notice appears, the pill stays off", async () => {
    /* sound.failWith = { reason: "no-audio-context", detail: "test" }; click "Start drone"; flush; expect screen.getByRole("status").textContent to contain "Sound unavailable"; expect the pill still reads "Start drone"; no dialog role in the document */
  });

  test("practice.drone/REQ-009/S1 (app) — back where it was", async () => {
    /* store a v5 payload with keyId "G-major", drone { octave: 4, sound: "reed" }; render; pill reads "G4"; "Start drone" present (off); open the sheet: "reed" aria-pressed true; close; click the D major wedge (button named "D major"); pill reads "D4" */
  });

  test("practice.drone/REQ-009/S2 (app) — first run", () => {
    /* localStorage cleared; render; pill reads "C5"; "Start drone" present; open the sheet: "warm" aria-pressed true */
  });

  test("practice.drone/REQ-009 (app) — the octave and sound are saved, on/off never", async () => {
    /* click "Drone octave down", open the sheet, click "reed", click "Start drone", flush; parse localStorage: drone equals { octave: 4, sound: "reed" } and no key of the payload mentions the drone being on */
  });
  ```
  Write every body sketched in a comment out in full — the comments name the exact buttons and assertions.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/app-drone.test.tsx` — expect FAIL: no element with test id `drone-note`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green. `tests/ui/scenarios/memoised-surfaces.test.tsx` must still pass: the pill's props are primitives and stable callbacks, so it does not re-render per beat — if the Profiler counts grow, memoise what leaked.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → all vitest files pass.

### T016 · practice.session/REQ-013 · Tapping a notehead on the stave

**Status:** done

**Files**
- Modify: `src/ui/StaveView.tsx` (`buildStave` hit rects; highlight when `soundingRunIndex !== null`, dim only while playing; new props)
- Modify: `src/ui/App.tsx` (`soundingRunIndex` from the tap when idle; `onTapNote`; `tapsEnabled`)
- Test: `tests/ui/scenarios/stave-tap.test.tsx`

**Interfaces**
- Consumes: `Session.tapNote`, `SessionSnapshot.tappedRunIndex` (T011); `isTone`, `isStop` (T004)
- Produces:
  ```tsx
  // StaveView props gain:
  readonly onTapNote: (runIndex: number) => void;
  readonly tapsEnabled: boolean;   // idle
  // per notehead, inside its <g data-testid="stave-note">, after the ellipse: a transparent <rect data-testid="stave-note-hit" role="button" aria-label={noteLabel(note)} aria-disabled={tapsEnabled ? undefined : "true"} onClick={tapsEnabled ? () => onTapNote(runIndex) : undefined} style={{ cursor: tapsEnabled ? "pointer" : "default" }}>
  //   x = x − max(step, 16) / 2, width = max(step, 16), y = min(ny, topY) − 14, height = |ny − topY| + 4·PANEL_GAP + 28   (the design's hitX/hitW/hitY/hitH)
  // isSounding = soundingRunIndex === index (no longer requires `playing`); opacity dims only while `playing`
  // App: soundingRunIndex = playing ? soundingRunIndex : snapshot.tappedRunIndex; onTapNote = (i) => session.tapNote(i); tapsEnabled = snapshot.transport.kind === "idle"
  ```

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/stave-tap.test.tsx` (render `App` as `stave-view.test.tsx`'s `setup` does, with `testSessionDeps()` from `app-session.test.tsx`'s shape so `sound` and `clock` are reachable; G major, stave view, 96 bpm, 2 oct ↑↓ stored in a v5 payload):
  ```tsx
  test("practice.session/REQ-013/S1 (stave) — a tapped notehead sounds and is haloed for one beat", async () => {
    /* click within(getByTestId("stave")).getByRole("button", { name: "D5" }); flush; expect sound.posted.filter(isTone)[0].hz ≈ 587.33; act(() => clock.advance(30)); expect the stave-note with data-note "D5" to contain a "sounding-halo"; every other stave-note has opacity 1 (not dimmed) and no halo; act(() => clock.advance(700)); no halo anywhere */
  });

  test("practice.session/REQ-013/S5 (stave) — noteheads are inert while playing", async () => {
    /* click "Play"; flush; act(() => clock.advance(2100)) — past the count-in into the run; const tones = sound.posted.filter(isTone).length; click the D5 hit rect (aria-disabled "true"); act(() => clock.advance(10)); expect sound.posted.filter(isTone).length toBe tones; the halo is on the sounding sequence note, not D5 */
  });
  ```
  Write both bodies in full.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/stave-tap.test.tsx` — expect FAIL: no button named `D5` inside the stave.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green (`stave-view.test.tsx`'s existing REQ-006 halo tests still pass — they render with `playing` true).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-tap.test.tsx tests/ui/scenarios/stave-view.test.tsx` → all pass.

### T017 · practice.session/REQ-013 · Tapping a column in the names view

**Status:** done

**Files**
- Modify: `src/ui/NamesView.tsx` (columns become buttons; new props)
- Modify: `src/ui/App.tsx` (`onTapColumn` → run index; `soundingPitchClass` from the tap when idle)
- Test: `tests/ui/scenarios/names-tap.test.tsx`

**Interfaces**
- Consumes: `Session.tapNote`, `SessionSnapshot.tappedRunIndex` (T011); `SessionSnapshot.run`
- Produces:
  ```tsx
  // NamesView props gain:
  readonly onTapColumn: (pitchClass: PitchClass) => void;
  readonly tapsEnabled: boolean;
  // each column's outer <div> becomes a <button type="button" data-testid="names-column" aria-label={column.name} aria-disabled={tapsEnabled ? undefined : "true"} onClick={tapsEnabled ? () => onTapColumn(pitchClass) : undefined}> keeping its layout styles (border none, background as today, padding 0, font inherit); ColumnData carries the note's PitchClass
  // App: onTapColumn = (pc) => { const i = snapshot.run.findIndex((n) => n.note.letter === pc.letter && n.note.accidental === pc.accidental); if (i >= 0) session.tapNote(i); }  — the lowest note of that name in the run
  //      soundingPitchClass = playing ? (as today) : tappedRunIndex === null ? null : pitch class of snapshot.run[tappedRunIndex].note
  ```

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/names-tap.test.tsx`:
  ```tsx
  test("practice.session/REQ-013/S2 (names) — a tapped column sounds the run's lowest note of that name and lights for one beat", async () => {
    /* G major, names view, 120 bpm, 2 oct ↑↓ (v5 payload); click getByRole("button", { name: "D" }); flush; tone hz ≈ 587.33 (D5 — the lowest D in G4–G6), durationFrames 24000; act(clock.advance(30)); the "D" column has data-sounding "true" and no other column does; act(clock.advance(500)); no column is sounding */
  });

  test("practice.session/REQ-013/S6 (names) — the ↓ column sounds the descent's own note", async () => {
    /* G minor (keyId "G-naturalMinor"), scale { major: "major", minor: "melodic-minor-classical" }, names view, ↑↓; click the column with data-descent "true" named "F"; flush; tone hz ≈ 698.46 (F5) */
  });
  ```
  Write both bodies in full.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/names-tap.test.tsx` — expect FAIL: no button named `D`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green (`names-view.test.tsx` queries by test id, unchanged).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/names-tap.test.tsx tests/ui/scenarios/names-view.test.tsx` → all pass.

### T018 · — · The design-review loop points at this change's design

**Status:** done

**Files**
- Modify: `scripts/design-shots.mjs` (`PROTOTYPE_PATH`, `STATES`, the prototype-side capture)

**Interfaces**
- Consumes: the vendored `changes/004-the-drone/design/Drone Ideas.dc.html` (frames `#3a` — pill on, drone sounding — and `#4a` — the sheet open) and `support.js`
- Produces: two states — `"drone-on-3a"`: prototype = the bounding box of `#3a dc-import`'s rendered frame, clipped to 390×844 from its top-left; app = tap `Start drone`. `"drone-sheet-4a"`: prototype = `#4a dc-import`'s frame; app = tap `Edit drone`. Existing states from 005 stay runnable against their own prototype only if trivially so; otherwise replace them — the script serves the *current* change's review loop (its header comment says so).

**Steps**
- [ ] 1. Point `PROTOTYPE_PATH` at the Ideas page; add a prototype-side `captureFrame(page, selector)` that waits for the `dc-import` inside `selector` to render (the runtime replaces it with the component's frame) and screenshots its bounding box at the script's device scale.
- [ ] 2. Add the two states; drive the app side through the same `page.getByRole` names the tests use.
- [ ] 3. `pnpm dev` in one terminal, `pnpm design:shots` in another → `.sdd/design-review/` holds `drone-on-3a.{prototype,app}.png` and `drone-sheet-4a.{prototype,app}.png`. Look at each pair yourself once and list any difference you see in the report (position of the pill, sizes, the header's two lines) — the user reviews at acceptance.

**Verify** — `pnpm design:shots` → exits 0; the four files exist; the report lists the differences seen.

## Phase 4 — Hardening

### T019 · — · Every row of the proposal's edge-case table has a test; scenario coverage is complete

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (only if step 1's test fails)
- Test: `tests/practice/scenarios/drone-edge-cases.test.ts`

**Steps**
- [ ] 1. RED — the one row no scenario covers, "two quick taps on ▶/■ leave one voice or none":
  ```ts
  // changes/004-the-drone/proposal.md › Edge cases › "Concurrent or duplicate action" — a ■ that arrives while ▶'s start is still awaiting the sound port cancels it: nothing is posted, the drone is off.
  test("practice.drone/REQ-001 (edge) — ■ during a pending ▶ leaves no voice", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    session.startDrone();
    session.stopDrone();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(sound.posted.filter(isDrone)).toHaveLength(0);
    expect(session.snapshot().drone.on).toBe(false);
  });
  // "▶ ▶" quickly: the second start is ignored while the first is pending — exactly one drone voice
  test("practice.drone/REQ-001 (edge) — ▶ ▶ posts one voice", async () => {
    const { session, sound } = sessionOn("G", "flute-concert", defaultTraversal, defaultSessionSettings);
    session.startDrone();
    session.startDrone();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(sound.posted.filter(isDrone)).toHaveLength(1);
    expect(session.snapshot().drone.on).toBe(true);
  });
  ```
  Cite, in the file's header comment, where every other row already lives (first run → REQ-009/S2; malformed store → REQ-009/S4; pinned octave a key cannot use → REQ-002/S5; upstream unavailable → REQ-008/S1; page hidden → REQ-007/S1; key change while sounding → REQ-003/S1; retap → REQ-013/S4; ▶ while droning → REQ-004/S2).
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/drone-edge-cases.test.ts` — if either FAILS, fix the generation check in `startDrone` (T006) and rerun.
- [ ] 3. `./scripts/check-scenarios.sh --change changes/004-the-drone` → no gaps: every ADDED scenario of both deltas is cited by a test under `tests/`. Fix any missing citation by adding the qualified ID to the test that already proves it.
- [ ] 4. `./scripts/check-contexts.sh` → no violations.

**Verify** — `./scripts/check-scenarios.sh --change changes/004-the-drone` → ends `✅`; `pnpm check` green.

### T020 · — · `AGENTS.md` architecture line, `pnpm check`, `pnpm test:timing`

**Status:** done

**Files**
- Modify: `AGENTS.md` (Architecture paragraph)

**Steps**
- [ ] 1. In `AGENTS.md › Architecture`, after "`src/sound/` (Rust→WASM synthesiser in an AudioWorklet plus a ~60-line TS host shim in its `published/`; ADR 0003)", add: "— voices are addressable by tag and a drone voice has no end (ADR 0005)". In the `src/practice/` clause add "the drone" after "a pure transport state machine".
- [ ] 2. `pnpm build:sound && pnpm check` → paste the last eight lines (vitest summary + cargo `test result`) into the report.
- [ ] 3. `pnpm test:timing` → paste the table and the final `test:timing: PASS` line into the report. The transport is untouched, so the numbers should match 006's; if `vs audible` exceeds 30 ms on the laptop, note it as the same headroom 005 accepted by name (decisions 2026-09-24) — it is not this change's regression unless onset deviation or drift moved.

**Verify** — `grep -c 'ADR 0005' AGENTS.md` → `1`; `pnpm check` green; `pnpm test:timing` → `PASS`.

### T021 · — · Converge

**Status:** todo

**Steps**
- [ ] 1. Run `sdd-converge` (the `reviewer` subagent, strongest model) against `.sdd/target/004-the-drone/`, `plan.md`, this file, the constitution and `REVIEW.md`.
- [ ] 2. Append any gap it finds as tasks under a new phase here; run `sdd-implement` on them; converge again until it reports Converged.

**Verify** — the convergence report says Converged.

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| practice.drone/REQ-001 | T002, T006, T013, T015, T019 | ✅ |
| practice.drone/REQ-002 | T005, T007, T013 | ✅ |
| practice.drone/REQ-003 | T003, T007 | ✅ |
| practice.drone/REQ-004 | T008, T009 | ✅ |
| practice.drone/REQ-005 | T002, T003, T006, T014 | ✅ |
| practice.drone/REQ-006 | T013, T014, T015 | ✅ |
| practice.drone/REQ-007 | T010 | ✅ |
| practice.drone/REQ-008 | T010, T015 | ✅ |
| practice.drone/REQ-009 | T012, T015 | ✅ |
| practice.session/REQ-013 | T011, T016, T017 | ✅ |

Scenario → RED step: REQ-001 S1 T002/T006/T015 · S2 T002/T006 · S3 T014/T015 · S4 T015; REQ-002 S1 T005 · S2 T007 · S3 T007 · S4 T007/T013 · S5 T005 · S6 T007; REQ-003 S1 T003/T007 · S2 T007 · S3 T007; REQ-004 S1 T008 · S2 T008 · S3 T009; REQ-005 S1 T014 · S2 T002/T006 · S3 T003/T006 · S4 T002 (rendered level; the command half in T011's S3); REQ-006 S1 T014 · S2 T015 · S3 T014; REQ-007 S1 T010 · S2 T010; REQ-008 S1 T010/T015 · S2 T010 · S3 T010; REQ-009 S1 T015 · S2 T015 · S3 T012 · S4 T012; REQ-013 S1 T011/T016 · S2 T017 · S3 T011 · S4 T011 · S5 T011/T016 · S6 T017.

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `pub enum Length { Frames(u32), UntilStopped }`; `Voice::new(tag: u32, kind: VoiceKind, onset_frame: f64, length: Length)`; `Voices::stop(&mut self, tag: u32)`; `extern "C" fn stop(tag: u32)` | T002, T003, T004 |
| T002 | `Drone::new(hz: f32, sound: DroneSound) -> Self`; `Drone::next_sample(&mut self, elapsed_frames: f64, sample_rate: f32) -> f32`; `DroneSound::from_code(code: u32) -> Option<DroneSound>`; `extern "C" fn push_drone(tag: u32, hz: f32, onset_frame: f64, sound: u32) -> u32`; `RELEASE_S = 0.080` | T003, T004, T006 (`DRONE_RELEASE_MS = 80`) |
| T003 | `Drone::retune(&mut self, hz: f32, sample_rate: f32)`; `Voices::retune(&mut self, tag: u32, hz: f32)`; `extern "C" fn retune(tag: u32, hz: f32)` | T004 |
| T004 | `droneSoundSchema`, `type DroneSound`; `SoundCommand` ∪ `{ kind: "drone"; tag; hz; onsetFrame; sound }`, `{ kind: "retune"; tag; hz }`, `{ kind: "stop"; tag }`; `FakeSound.posts: PostedCommand[]`; `isDrone`, `isRetune`, `isStop`, `isTone`, `isClick` | T005–T012, T015–T017, T019 |
| T005 | `DroneOctave`, `DroneSettings`, `defaultDroneSettings`, `PIANO_LOWEST_POSITION = 21`, `PIANO_HIGHEST_POSITION = 108`, `defaultDroneOctave(tonic: PitchClass, range: NoteRange): number`, `droneNoteOf(key: Key, variant: Variant, settings: DroneSettings): Note`, `canStepDroneOctave(note: Note, delta: -1 \| 1): boolean` | T006, T007, T012, T015 |
| T006 | `DroneSnapshot`; `SessionSnapshot.drone`; `DRONE_RELEASE_MS = 80`; `createSession(context, traversal, scaleChoice, settings, droneSettings: DroneSettings, deps)`; `Session.startDrone(): void`; `Session.stopDrone(): void`; `Session.setDroneSound(sound: DroneSound): void`; `startDroneAndFlush(session: Session): Promise<void>`; `sessionOn(…, scaleChoice = defaultScaleChoice, droneSettings = defaultDroneSettings)` | T007–T011, T015, T019 |
| T007 | `Session.stepDroneOctave(delta: -1 \| 1): void` | T015 |
| T011 | `SessionSnapshot.tappedRunIndex: number \| null`; `Session.tapNote(runIndex: number): void` | T016, T017 |
| T012 | `StoredSelection.drone: { octave: number \| null; sound: DroneSound }`; `schemaVersion: 5`; `firstRunDefaults.drone` | T015 |
| T013 | `DronePill(props: { noteLabel; on; canStepDown; canStepUp; onToggle; onStepOctave: (delta: -1 \| 1) => void; onOpenSheet })` | T015 |
| T014 | `DroneSheet(props: { open; noteLabel; hz; on; sound: DroneSound; onToggle; onPickSound: (sound: DroneSound) => void; onClose })`; `OverlayHeader` `subtitle?`, `trailing?` | T015 |

## Deferred

- A wavetable per drone sound instead of per-sample additive synthesis — only if T002's benchmark shows a quantum over 500 µs on the laptop or the phone crackles at acceptance (ADR 0005, "Revisit if").
- Extending `pnpm test:timing` to the drone's onset and retune — the budgets here (50 ms, 100 ms) are ten times playback's and are proved on the fakes' frame clock; a measured harness earns its place only if the phone says otherwise.
- `docs/domain.md` (sound's Voice noun, the never-both invariant, the session settings) and `docs/glossary.md` (Drone sound, Tapped note) — re-approved at `sdd-finish`, per the proposal's Affects table.
