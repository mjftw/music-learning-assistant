---
type: Task List
title: Hear me — tasks
description: 25 tasks across 5 phases — the listening crate and its contract, the session holding the tuner, the tuner screen, the measured harness, hardening.
resource: /changes/007-hear-me/tasks.md
status: stable
tags: [sdd, tasks, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/plan.md
  - resource: /changes/007-hear-me/proposal.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-28T01:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T22:29:42Z
sdd_id: 007-hear-me
sdd_context: listening
sdd_phase: in-progress
---

# Tasks: Hear me

> Each task is executed by an implementer that has **only its brief** — the
> task block below, the requirements it cites, the plan sections it touches,
> the engineering preferences, and the commands. It cannot see the rest of
> this file. So every task is self-contained: exact files, exact interfaces,
> exact values, exact commands. **No placeholders.** "Add error handling",
> "handle edge cases", "like T011 but for Y", `TBD`, and a test described in
> prose instead of written out are all failures.
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
> Conventions that hold for every task here: `cargo` is on PATH only after
> `source ~/.cargo/env`; run it as `bash -c "source ~/.cargo/env && cargo …"`.
> Frame numbers are in `pitchPosition` semitones for notes (C4 = 60, A4 =
> 69, E2 = 40, C7 = 96) and in AudioContext frames at 48 000 Hz for time
> (100 ms = 4800 frames, 50 ms = 2400). Test names cite scenario IDs fully
> qualified. Tests reach a context only through its `published/`.

## Phase 1 — Foundations (the listening crate, its contract, the port)

_Nothing user-visible. The detector proven on synthesised buffers, the crate's C ABI, the published contract, the nearest-note lookup, the port and the fakes._

### T001 · listening.pitch-detection/REQ-002, listening.pitch-detection/REQ-003 · The MPM detector on synthesised buffers, and its cost

**Status:** done

**Files**
- Create: `src/listening/Cargo.toml`, `src/listening/src/lib.rs` (module declarations only for now; the ABI arrives in T002), `src/listening/src/detector.rs`
- Modify: `Cargo.toml` (root — `members = ["src/sound", "src/listening"]`)

**Interfaces**
- Consumes: nothing.
- Produces:
  ```rust
  // src/listening/src/detector.rs
  pub const WINDOW: usize = 2048;
  pub const MIN_HZ: f32 = 70.0;
  pub const MAX_HZ: f32 = 2200.0;
  pub const CLARITY_THRESHOLD: f32 = 0.90;
  /// One published detection: the fundamental and the NSDF clarity it was picked at.
  #[derive(Clone, Copy, Debug, PartialEq)]
  pub struct Detection { pub hz: f32, pub clarity: f32 }
  /// McLeod Pitch Method over `window` (exactly WINDOW samples at `sample_rate`): the normalised
  /// square-difference function nsdf(τ) = 2·Σ x[i]x[i+τ] / Σ(x[i]² + x[i+τ]²) for τ in
  /// [ceil(sample_rate / MAX_HZ), floor(sample_rate / MIN_HZ)]; the key maxima are the highest
  /// point of each positive region between zero crossings; the chosen one is the first key
  /// maximum ≥ 0.93 × the global key maximum; τ* is refined by the parabola through its two
  /// neighbours; hz = sample_rate / τ*, clarity = nsdf(τ*). None when clarity < CLARITY_THRESHOLD
  /// or no positive region exists (silence, noise).
  pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection>
  ```
  `src/listening/Cargo.toml` mirrors `src/sound/Cargo.toml` exactly (`name = "listening"`, `crate-type = ["cdylib", "rlib"]`, no dependencies).

**Steps**
- [ ] 1. RED — `src/listening/src/detector.rs` `#[cfg(test)] mod tests` with these helpers and tests (a seeded LCG for noise — no crate):
  ```rust
  const SR: f32 = 48000.0;
  fn sine(hz: f32) -> Vec<f32> { (0..WINDOW).map(|i| (2.0 * std::f32::consts::PI * hz * i as f32 / SR).sin() * 0.5).collect() }
  // A flute-like tone: six partials at falling amplitude (REQ-002/S2's spectrum).
  fn flute(hz: f32) -> Vec<f32> {
      let gains = [1.0, 0.6, 0.35, 0.2, 0.1, 0.05];
      (0..WINDOW).map(|i| gains.iter().enumerate().map(|(k, g)| g * (2.0 * std::f32::consts::PI * hz * (k + 1) as f32 * i as f32 / SR).sin()).sum::<f32>() * 0.3).collect()
  }
  fn white_noise(seed: u32) -> Vec<f32> { let mut s = seed; (0..WINDOW).map(|_| { s = s.wrapping_mul(1664525).wrapping_add(1013904223); ((s >> 8) as f32 / (1u32 << 24) as f32) - 0.5 }).collect() }
  fn cents(hz: f32, of: f32) -> f32 { 1200.0 * (hz / of).log2() }

  // listening.pitch-detection/REQ-002/S1 — a sine at concert A within ±2 ¢
  #[test] fn req_002_s1_a_sine_at_concert_a() { let d = detect(&sine(440.0), SR).unwrap(); assert!(cents(d.hz, 440.0).abs() <= 2.0, "{}", d.hz); }
  // listening.pitch-detection/REQ-002/S2 — a flute-like tone is not heard an octave out
  #[test] fn req_002_s2_a_flute_like_tone_is_not_heard_an_octave_out() { let d = detect(&flute(440.0), SR).unwrap(); assert!(cents(d.hz, 440.0).abs() <= 2.0, "{}", d.hz); }
  // listening.pitch-detection/REQ-002/S3 — the low end, E2
  #[test] fn req_002_s3_the_low_end() { let d = detect(&flute(82.41), SR).unwrap(); assert!(d.hz >= 82.31 && d.hz <= 82.50, "{}", d.hz); }
  // listening.pitch-detection/REQ-002/S4 — the high end, C7
  #[test] fn req_002_s4_the_high_end() { let d = detect(&sine(2093.0), SR).unwrap(); assert!(d.hz >= 2090.6 && d.hz <= 2095.4, "{}", d.hz); }
  // listening.pitch-detection/REQ-002/S5 — every semitone E2–C7, both tones, within ±2 ¢ (the harness repeats this live)
  #[test] fn req_002_s5_every_semitone_in_between() {
      for position in 40..=96 { let hz = 440.0 * 2f32.powf((position - 69) as f32 / 12.0);
          for tone in [sine(hz), flute(hz)] { let d = detect(&tone, SR).unwrap_or_else(|| panic!("no detection at position {position}")); assert!(cents(d.hz, hz).abs() <= 2.0, "position {position}: {} vs {hz}", d.hz); } }
  }
  // listening.pitch-detection/REQ-003/S1 — silence
  #[test] fn req_003_s1_silence() { assert_eq!(detect(&vec![0.0; WINDOW], SR), None); }
  // listening.pitch-detection/REQ-003/S2 — noise
  #[test] fn req_003_s2_noise() { for seed in 1..=8 { assert_eq!(detect(&white_noise(seed), SR), None, "seed {seed}"); } }
  // listening.pitch-detection/REQ-003/S4 — always a positive frequency and a clarity in (0, 1]
  #[test] fn req_003_s4_always_a_positive_frequency_and_a_confidence() {
      let chord: Vec<f32> = sine(440.0).iter().zip(sine(554.37)).map(|(a, b)| a + b).collect();
      let clipped: Vec<f32> = flute(440.0).iter().map(|s| (s * 8.0).clamp(-1.0, 1.0)).collect();
      for buf in [sine(440.0), flute(82.41), vec![0.0; WINDOW], white_noise(3), chord, clipped] {
          if let Some(d) = detect(&buf, SR) { assert!(d.hz > 0.0 && d.clarity > 0.0 && d.clarity <= 1.0); } }
  }
  ```
- [ ] 2. Run `bash -c "source ~/.cargo/env && cargo test -p listening"` — expect FAIL to compile: `cannot find function detect`.
- [ ] 3. GREEN — `detect` per Interfaces: compute nsdf into a local `[f32; 700]` sized by `lag_max + 1` (no allocation on the audio thread — use a fixed array of 768 and assert `lag_max < 768`), walk the key maxima, pick, refine, threshold.
- [ ] 4. Run the same — expect PASS (all 8). Add the workspace member; `bash -c "source ~/.cargo/env && cargo fmt --check && cargo clippy --all-targets -- -D warnings"` — clean.
- [ ] 5. The cost — a `#[test] #[ignore] fn cost_of_one_analysis()` that times 1000 `detect` calls on `flute(440.0)` with `std::time::Instant` and prints `µs per analysis`; run it once with `bash -c "source ~/.cargo/env && cargo test -p listening --release -- --ignored --nocapture cost_of_one_analysis"` and paste the number into `changes/007-hear-me/notes.md` under a `## T001 — cost of one analysis` heading (the plan's spike number; the budget for one hop is 10 ms).
- [ ] 6. REFACTOR — none.

**Verify** — `bash -c "source ~/.cargo/env && cargo test -p listening"` → `test result: ok. 8 passed; 0 failed; 0 ignored` (the ignored cost test aside: `1 ignored`); `notes.md` carries the µs figure.

### T002 · listening.pitch-detection/REQ-003, listening.pitch-detection/REQ-004 · The ring, the hop and the C ABI; both crates built

**Status:** done

**Files**
- Create: `src/listening/src/ring.rs`
- Modify: `src/listening/src/lib.rs` (the static engine and the ABI, the pattern of `src/sound/src/lib.rs`), `scripts/build-sound.sh` (build both crates), `.gitignore` only if `src/sound/pkg` is listed there (mirror it for `src/listening/pkg`)

**Interfaces**
- Consumes: `detect(window: &[f32], sample_rate: f32) -> Option<Detection>`, `WINDOW` (T001).
- Produces:
  ```rust
  // src/listening/src/ring.rs
  pub const HOP: usize = 512;
  pub const QUANTUM_FRAMES: usize = 128;
  /// A WINDOW-frame ring; `push_quantum` appends 128 frames and returns true when HOP frames
  /// have arrived since the last true (the first true after WINDOW frames have been pushed).
  pub struct Ring { … }
  impl Ring { pub const fn new() -> Self; pub fn clear(&mut self); pub fn push_quantum(&mut self, quantum: &[f32; QUANTUM_FRAMES]) -> bool; pub fn window(&self, out: &mut [f32; WINDOW]); }
  // src/listening/src/lib.rs — the C ABI, the single-thread static engine as in sound
  #[no_mangle] pub extern "C" fn init(sample_rate: f32)
  #[no_mangle] pub extern "C" fn input_ptr() -> *mut f32          // 128 f32 the host fills before each push
  #[no_mangle] pub extern "C" fn push(now_frame: f64) -> u32       // appends input; on a completed hop runs detect over the window and writes the result; 1 = a detection was written, 0 = none (no hop, or nothing detected)
  #[no_mangle] pub extern "C" fn result_ptr() -> *const f64        // [hz, clarity, at_frame] — at_frame = now_frame + 127 (the last frame of the quantum that completed the hop)
  ```
  `scripts/build-sound.sh` runs `cargo build --release --target wasm32-unknown-unknown -p sound -p listening` and copies both `.wasm` files to `src/sound/pkg/sound.wasm` and `src/listening/pkg/listening.wasm`.

**Steps**
- [ ] 1. RED — tests in `lib.rs` (`TEST_LOCK` as in sound's):
  ```rust
  fn feed(samples: &[f32], start_frame: f64) -> Vec<(f64, [f64; 3])> { // pushes whole quanta; returns (now_frame, result) for every push that returned 1
      let mut out = Vec::new(); let mut frame = start_frame;
      for chunk in samples.chunks_exact(128) { let dst = unsafe { std::slice::from_raw_parts_mut(input_ptr(), 128) }; dst.copy_from_slice(chunk);
          if push(frame) == 1 { let r = unsafe { std::slice::from_raw_parts(result_ptr(), 3) }; out.push((frame, [r[0], r[1], r[2]])); } frame += 128.0; }
      out
  }
  // listening.pitch-detection/REQ-004 (the crate's half of S3) — a hop is analysed in the push that completes it, never queued: exactly one result per HOP frames of a steady tone once the window is full
  #[test] fn req_004_s3_a_hop_is_analysed_in_place_never_queued() { let _g = lock_engine(); init(48000.0);
      let tone: Vec<f32> = (0..48000).map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5).collect();
      let results = feed(&tone, 0.0);
      let expected = (48000 - 2048) / 512 + 1; assert_eq!(results.len(), expected);
      for pair in results.windows(2) { assert_eq!(pair[1].0 - pair[0].0, 512.0); }
      for (now, r) in &results { assert_eq!(r[2], now + 127.0, "at_frame is the last frame of the quantum"); assert!(r[0] > 439.0 && r[0] < 441.0); } }
  // listening.pitch-detection/REQ-003/S3 — a breath between notes publishes nothing
  #[test] fn req_003_s3_a_breath_between_notes() { let _g = lock_engine(); init(48000.0);
      let tone = |n: usize| -> Vec<f32> { (0..n).map(|i| (2.0 * std::f32::consts::PI * 440.0 * i as f32 / 48000.0).sin() * 0.5).collect() };
      let mut s = 12345u32; let breath: Vec<f32> = (0..40960).map(|_| { s = s.wrapping_mul(1664525).wrapping_add(1013904223); (((s >> 8) as f32 / (1u32 << 24) as f32) - 0.5) * 0.05 }).collect(); // 853 ms of quiet noise
      let mut signal = tone(24064); signal.extend(breath); signal.extend(tone(24064));
      let results = feed(&signal, 0.0);
      let in_breath = results.iter().filter(|(now, _)| *now >= 24064.0 + 2048.0 && *now < 24064.0 + 40960.0).count();
      assert_eq!(in_breath, 0, "no detection while only breath fills the window");
      assert!(results.iter().any(|(now, _)| *now >= 24064.0 + 40960.0 + 2048.0), "the next tone is detected again"); }
  ```
- [ ] 2. Run `bash -c "source ~/.cargo/env && cargo test -p listening"` — expect FAIL to compile: `cannot find function push`.
- [ ] 3. GREEN — `ring.rs` and the ABI per Interfaces; the engine holds `sample_rate`, `input: [f32; 128]`, `ring: Ring`, `window: [f32; WINDOW]`, `result: [f64; 3]`.
- [ ] 4. Run the same — expect PASS. `scripts/build-sound.sh` builds both; `ls src/listening/pkg/listening.wasm` exists.
- [ ] 5. Run `pnpm check` — green (the workspace's fmt/clippy/test now cover both crates).
- [ ] 6. REFACTOR — none.

**Verify** — `pnpm check` → green; `bash -c "source ~/.cargo/env && cargo test -p listening"` → `10 passed` (+ `1 ignored`); `./scripts/build-sound.sh` → both `.wasm` files present.

### T003 · listening.pitch-detection/REQ-001, listening.pitch-detection/REQ-006 · The published contract: the schema, the worklet shim, `createListener`

**Status:** done

**Files**
- Create: `src/listening/published/pitch-detected.schema.ts`, `src/listening/published/processor.ts`, `src/listening/published/index.ts`
- Test: `tests/listening/scenarios/pitch-detection.test.ts`

**Interfaces**
- Consumes: the C ABI of T002 (`init`, `input_ptr`, `push`, `result_ptr`).
- Produces:
  ```ts
  // pitch-detected.schema.ts
  export const pitchDetectedSchema = z.object({ hz: z.number().positive(), confidence: z.number().min(0).max(1), atFrame: z.number().nonnegative() });
  export type PitchDetected = z.infer<typeof pitchDetectedSchema>;
  export type ListeningUnavailable = { readonly reason: "refused" | "none" | "failed" | "worklet-failed" | "wasm-failed"; readonly detail: string };
  export type ListeningEnded = { readonly reason: "failed"; readonly detail: string };
  export type ListeningProblem = { readonly reason: "invalid-pitch-report"; readonly detail: string };
  // index.ts
  export type ListeningStartOutcome = { readonly ok: true } | { readonly ok: false; readonly error: ListeningUnavailable };
  export interface Listener {
    start(): Promise<ListeningStartOutcome>;   // getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }) now, never before; idempotent while listening
    stop(): void;                              // every track stopped, the source node disconnected; nothing published afterwards
    currentFrame(): number;                    // Math.round(context.currentTime * context.sampleRate)
    sampleRate(): number;
    onPitch(listener: (pitch: PitchDetected) => void): () => void;
    onEnded(listener: (ended: ListeningEnded) => void): () => void;
    onProblem(listener: (problem: ListeningProblem) => void): () => void;
    dispose(): void;
  }
  export type ListenerOutcome = { readonly ok: true; readonly listener: Listener } | { readonly ok: false; readonly error: ListeningUnavailable };
  /// Compiles listening.wasm (`?url` import as sound does) and adds the worklet module; a failure is a Result. `mediaDevices` defaults to navigator.mediaDevices and is injectable for tests.
  export function createListener(context: AudioContext, mediaDevices?: MediaDevices): Promise<ListenerOutcome>
  ```
  Error mapping in `start()`: a rejection named `NotAllowedError` / `SecurityError` → `refused`; `NotFoundError` / `OverconstrainedError` → `none`; anything else → `failed`. `track.onended` → `onEnded({ reason: "failed", detail: "track ended" })` and the listener is stopped. In dev (`import.meta.env.DEV`) `start()` logs `track.getSettings()` once with `console.info("listening: track settings", settings)` (the plan's risk on ignored constraints).
  `processor.ts` registers `"listening"`: `process(inputs)` copies `inputs[0]?.[0]` into the hoisted input view (the `#getOutputView` pattern from `src/sound/published/processor.ts`, over `input_ptr()`), calls `push(currentFrame)`, and when it returns 1 posts `{ type: "pitch", hz, confidence, atFrame }` from `result_ptr()`. A missing input (no channel yet) pushes 128 zeros.

**Steps**
- [ ] 1. RED — `tests/listening/scenarios/pitch-detection.test.ts`, with a fake `mediaDevices` and a fake `AudioContext` (jsdom has neither; `createListener` is given a stub context whose `audioWorklet.addModule` resolves, whose `createMediaStreamSource` returns `{ connect() {}, disconnect() {} }`, and a stub `AudioWorkletNode` installed on `globalThis` with a `port` and `connect/disconnect`; `WebAssembly.compileStreaming` is stubbed to resolve — the module is never instantiated in jsdom):
  ```ts
  import { afterEach, beforeEach, expect, test, vi } from "vitest";
  import { createListener } from "../../../src/listening/published";

  function fakeTrack() { return { stop: vi.fn(), getSettings: () => ({}), onended: null as null | (() => void) }; }
  function fakeMediaDevices(behaviour: "grant" | "NotAllowedError" | "NotFoundError" | "TypeError") {
    const track = fakeTrack();
    const getUserMedia = vi.fn(() => behaviour === "grant"
      ? Promise.resolve({ getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream)
      : Promise.reject(Object.assign(new Error(behaviour), { name: behaviour })));
    return { mediaDevices: { getUserMedia } as unknown as MediaDevices, getUserMedia, track };
  }
  // listening.pitch-detection/REQ-001/S1 — nothing before the request
  test("listening.pitch-detection/REQ-001/S1 — nothing before the request", async () => {
    const { mediaDevices, getUserMedia } = fakeMediaDevices("grant");
    const outcome = await createListener(fakeContext(), mediaDevices);
    expect(outcome.ok).toBe(true);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
  // listening.pitch-detection/REQ-001/S2 — asked for on request
  test("listening.pitch-detection/REQ-001/S2 — asked for on request", async () => {
    const { mediaDevices, getUserMedia } = fakeMediaDevices("grant");
    const listener = okListener(await createListener(fakeContext(), mediaDevices));
    expect(await listener.start()).toEqual({ ok: true });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  });
  // listening.pitch-detection/REQ-001/S3 — released on demand
  test("listening.pitch-detection/REQ-001/S3 — released on demand", async () => {
    const { mediaDevices, track } = fakeMediaDevices("grant");
    const context = fakeContext();
    const listener = okListener(await createListener(context, mediaDevices));
    await listener.start();
    const heard: number[] = [];
    listener.onPitch((pitch) => heard.push(pitch.hz));
    listener.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    context.lastNode.port.onmessage?.({ data: { type: "pitch", hz: 440, confidence: 0.95, atFrame: 100 } } as MessageEvent);
    expect(heard).toEqual([]);
  });
  // listening.pitch-detection/REQ-006/S1 — refused
  test("listening.pitch-detection/REQ-006/S1 — refused", async () => {
    const listener = okListener(await createListener(fakeContext(), fakeMediaDevices("NotAllowedError").mediaDevices));
    const outcome = await listener.start();
    expect(outcome).toMatchObject({ ok: false, error: { reason: "refused" } });
  });
  // listening.pitch-detection/REQ-006/S2 — none
  test("listening.pitch-detection/REQ-006/S2 — none", async () => {
    const listener = okListener(await createListener(fakeContext(), fakeMediaDevices("NotFoundError").mediaDevices));
    expect(await listener.start()).toMatchObject({ ok: false, error: { reason: "none" } });
  });
  // listening.pitch-detection/REQ-006/S3 — failed mid-way
  test("listening.pitch-detection/REQ-006/S3 — failed mid-way", async () => {
    const { mediaDevices, track, getUserMedia } = fakeMediaDevices("grant");
    const listener = okListener(await createListener(fakeContext(), mediaDevices));
    await listener.start();
    const ended: string[] = [];
    listener.onEnded((e) => ended.push(e.reason));
    track.onended?.();
    expect(ended).toEqual(["failed"]);
    await listener.start();
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });
  ```
  `fakeContext()` returns `{ sampleRate: 48000, currentTime: 0, audioWorklet: { addModule: vi.fn(() => Promise.resolve()) }, createMediaStreamSource: () => ({ connect() {}, disconnect() {} }), lastNode }` and installs `globalThis.AudioWorkletNode = class { port = { onmessage: null, postMessage() {} }; connect() {} disconnect() {} constructor() { lastNode = this } }`; `okListener(outcome)` throws unless `outcome.ok`.
- [ ] 2. Run `pnpm vitest run tests/listening/scenarios/pitch-detection.test.ts` — expect FAIL: `Cannot find module '../../../src/listening/published'`.
- [ ] 3. GREEN — the three files per Interfaces. `vite.config.ts` needs nothing new (the `?url` and `?worker&url` imports work as for sound).
- [ ] 4. Run the same — expect PASS (6). `pnpm check` — green (`scripts/check-contexts.sh` sees `src/listening/` as a context root already).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/listening` → 6 passed; `pnpm check` → green.

### T004 [P] · theory.temperament/REQ-002 · The nearest note to a frequency

**Status:** done

**Files**
- Modify: `src/theory/domain/notes.ts` (add `noteAtPosition`), `src/theory/domain/temperament.ts` (add `nearestNoteOf`), `src/theory/published/index.ts` (export both)
- Test: `tests/theory/scenarios/temperament.test.ts` (append), `tests/theory/invariants/nearest-note-inverse.test.ts`

**Interfaces**
- Consumes: `pitchPosition(note: Note): number`, `pitchHzOf(note: Note): number`, `type SpellingPreference` (`"sharp" | "flat"`), `type Note` (`theory/published`).
- Produces:
  ```ts
  /** The note at `position` (pitchPosition's numbering, C4 = 60): pitch class 0..11 spelled C C♯ D D♯ E F F♯ G G♯ A A♯ B with sharp spelling, C D♭ D E♭ E F G♭ G A♭ A B♭ B with flat; octave = floor(position / 12) − 1. */
  export function noteAtPosition(position: number, spelling: SpellingPreference): Note
  /** The nearest note under A4 = 440 equal temperament and the offset from it in whole cents, −50..+50; a frequency exactly halfway rounds up to the upper note at −50. */
  export function nearestNoteOf(hz: number, spelling: SpellingPreference): { readonly note: Note; readonly cents: number }
  ```
  `position = Math.round(69 + 12 * Math.log2(hz / 440))` (JS `Math.round` rounds .5 up); `cents = Math.round(1200 * Math.log2(hz / pitchHzOf(note)))`.

**Steps**
- [ ] 1. RED — append to `tests/theory/scenarios/temperament.test.ts`:
  ```ts
  import { nearestNoteOf, noteLabel } from "../../../src/theory/published";
  const near = (hz: number, spelling: "sharp" | "flat" = "sharp") => { const r = nearestNoteOf(hz, spelling); return [noteLabel(r.note), r.cents] as const; };
  test("theory.temperament/REQ-002/S1 — a little sharp of A", () => {
    expect(near(445.0)).toEqual(["A4", 20]); expect(near(436.0)).toEqual(["A4", -16]); expect(near(440.0)).toEqual(["A4", 0]);
  });
  test("theory.temperament/REQ-002/S2 — the ends of the tuner's range", () => {
    expect(near(82.41)).toEqual(["E2", 0]); expect(near(2093.0)).toEqual(["C7", 0]);
  });
  test("theory.temperament/REQ-002/S3 — spelled per the preference", () => {
    expect(near(466.16, "sharp")).toEqual(["A♯4", 0]); expect(near(466.16, "flat")).toEqual(["B♭4", 0]);
  });
  test("theory.temperament/REQ-002/S4 — halfway belongs to the note above", () => {
    expect(near(452.90)).toEqual(["A♯4", -50]); expect(near(452.8)).toEqual(["A4", 50]);
  });
  ```
  and `tests/theory/invariants/nearest-note-inverse.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { nearestNoteOf, noteAtPosition, pitchHzOf, pitchPosition } from "../../../src/theory/published";
  test("theory.temperament/REQ-002/S5 — the inverse of REQ-001 (invariant)", () => {
    for (const spelling of ["sharp", "flat"] as const)
      for (let position = 21; position <= 108; position += 1) {
        const note = noteAtPosition(position, spelling);
        expect(pitchPosition(note)).toBe(position);
        const back = nearestNoteOf(pitchHzOf(note), spelling);
        expect(back.note).toEqual(note);
        expect(back.cents).toBe(0);
      }
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/theory` — expect FAIL: `"nearestNoteOf" is not exported`.
- [ ] 3. GREEN — the two functions per Interfaces; export.
- [ ] 4. Run the same — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/theory` → all pass, the five new tests included.

### T005 · — · The `ListeningPort`, its adapter, `onShown` on the visibility port, and the fakes

**Status:** done

**Files**
- Create: `src/practice/ports/listening.ts`, `src/practice/adapters/web-audio-listening.ts`
- Modify: `src/practice/ports/visibility.ts` (add `onShown`), `src/practice/adapters/page-visibility.ts` (implement it: `!documentLike.hidden` → listener), `src/practice/domain/session.ts:57-62` (`SessionDeps` gains `readonly listening: ListeningPort`), `src/practice/published/index.ts` (export the port type and `webAudioListening`), `tests/practice/fakes.ts` (`FakeListening`; `FakeVisibility.onShown/show()`; `sessionDepsWithFakes` returns `listening`)
- Test: `tests/practice/scenarios/web-audio-listening.test.ts`

**Interfaces**
- Consumes: `createListener(context, mediaDevices?)`, `type Listener`, `type ListenerOutcome`, `type PitchDetected`, `type ListeningUnavailable`, `type ListeningEnded` (`listening/published`, T003).
- Produces:
  ```ts
  // src/practice/ports/listening.ts
  export interface ListeningPort {
    start(): Promise<Result<void, ListeningUnavailable>>;
    stop(): void;
    currentFrame(): number;
    sampleRate(): number;
    onPitch(listener: (pitch: PitchDetected) => void): () => void;
    onEnded(listener: (ended: ListeningEnded) => void): () => void;
  }
  // src/practice/ports/visibility.ts
  export interface VisibilityPort { onHidden(listener: () => void): () => void; onShown(listener: () => void): () => void; }
  // src/practice/adapters/web-audio-listening.ts — the same memoised factory webAudioSound takes; createListener once, on the first start()
  export function webAudioListening(createContext: () => AudioContext, create: (context: AudioContext) => Promise<ListenerOutcome> = createListener): ListeningPort & { context(): AudioContext | null }
  // tests/practice/fakes.ts
  export class FakeListening implements ListeningPort {
    startCalls = 0; stopCalls = 0; listening = false; frame = 0;
    failWith: ListeningUnavailable["reason"] | null = null;      // start() resolves { ok: false, error: { reason, detail: "fake" } } while set
    start(): Promise<Result<void, ListeningUnavailable>>; stop(): void;
    currentFrame(): number { return this.frame; } sampleRate(): number { return 48000; }
    onPitch(...): () => void; onEnded(...): () => void;
    feed(hz: number, atFrame: number = this.frame, confidence = 0.95): void;   // publishes to onPitch listeners; a no-op unless listening
    end(): void;   // fires onEnded({ reason: "failed", detail: "fake track ended" }) and sets listening = false
  }
  ```
  `FakeVisibility` gains `onShown` and `show()`; `sessionDepsWithFakes(sound?, listening = new FakeListening())` returns `{ sessionDeps, sound, clock, visibility, listening }`; `sessionOn(...)` fixtures pass it through. `createSession`'s existing callers (App, tests) compile because `SessionDeps` is built by the fakes/App only.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/web-audio-listening.test.ts` (the adapter over an injected fake `create`; `webAudioSound`'s `web-audio-problems.test.ts` is the pattern):
  ```ts
  test("webAudioListening creates the listener once on the first start and maps outcomes to Results", async () => {
    const fakeListener = { start: vi.fn(() => Promise.resolve({ ok: true } as const)), stop: vi.fn(), currentFrame: () => 42, sampleRate: () => 48000, onPitch: () => () => {}, onEnded: () => () => {}, onProblem: () => () => {}, dispose: vi.fn() };
    const create = vi.fn(() => Promise.resolve({ ok: true, listener: fakeListener } as const));
    const contexts: object[] = [];
    const port = webAudioListening(() => { const c = { resume: () => Promise.resolve() } as unknown as AudioContext; contexts.push(c); return c; }, create);
    expect(await port.start()).toEqual({ ok: true, value: undefined });
    expect(await port.start()).toEqual({ ok: true, value: undefined });
    expect(create).toHaveBeenCalledTimes(1);
    expect(port.currentFrame()).toBe(42);
    port.stop(); expect(fakeListener.stop).toHaveBeenCalledTimes(1);
  });
  test("webAudioListening reports a failed createListener as the port's error", async () => {
    const port = webAudioListening(() => ({ resume: () => Promise.resolve() }) as unknown as AudioContext, () => Promise.resolve({ ok: false, error: { reason: "wasm-failed", detail: "x" } } as const));
    expect(await port.start()).toEqual({ ok: false, error: { reason: "wasm-failed", detail: "x" } });
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/web-audio-listening.test.ts` — expect FAIL: `"webAudioListening" is not exported`.
- [ ] 3. GREEN — the port, the adapter, `onShown`, `SessionDeps.listening`, the fakes per Interfaces. `session.ts` only stores `deps.listening` for now.
- [ ] 4. Run the same — expect PASS. `pnpm check` — green (every existing test still passes with the widened fakes).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm check` → green.

## Phase 2 — The session holds the tuner

_Ends with the whole tuner observable through `practice/published` with the fakes: enter, read, target, budget, cannot hear, hidden, leave._

### T006 · practice.tuner/REQ-002, practice.tuner/REQ-004 · The tuner's rules, pure

**Status:** done

**Files**
- Create: `src/practice/domain/tuner.ts`, `src/practice/published/note-judged.schema.ts`
- Modify: `src/practice/published/index.ts` (exports)
- Test: `tests/practice/scenarios/tuner-rules.test.ts`

**Interfaces**
- Consumes: `nearestNoteOf(hz, spelling)`, `noteAtPosition(position, spelling)`, `pitchHzOf(note)`, `pitchPosition(note)`, `type Note`, `type SpellingPreference` (`theory/published`, T004); `type PitchDetected` (`listening/published`).
- Produces:
  ```ts
  // note-judged.schema.ts (Zod, the map's event: src/practice/published/note-judged.schema)
  export const verdictSchema = z.enum(["sharp", "flat", "in-tune"]);
  export type Verdict = z.infer<typeof verdictSchema>;
  export interface NoteJudged { readonly target: Note; readonly cents: number; readonly verdict: Verdict; readonly heard: { readonly hz: number; readonly nearest: Note; readonly cents: number }; readonly atFrame: number }
  // tuner.ts
  export const IN_TUNE_BAND_CENTS = 5; export const HANDOVER_CENTS = 56; export const READING_MAX_AGE_MS = 100;
  export const TUNER_LOWEST_POSITION = 40; export const TUNER_HIGHEST_POSITION = 96;
  export type TunerTarget = { readonly kind: "auto" } | { readonly kind: "pinned"; readonly position: number };
  export type ListeningState = { readonly kind: "off" } | { readonly kind: "starting" } | { readonly kind: "listening" } | { readonly kind: "cannot-hear"; readonly reason: "refused" | "none" | "failed" };
  export interface TunerSnapshot { readonly active: boolean; readonly listening: ListeningState; readonly target: TunerTarget; readonly targetNote: Note | null; readonly reading: NoteJudged | null; readonly canStepDown: boolean; readonly canStepUp: boolean }
  /** The position to show on auto: `shown` unless it is null or the pitch is ≥ HANDOVER_CENTS from it, then the nearest note's position. */
  export function nearestWithHandover(shown: number | null, hz: number): number
  /** cents from `note` to `hz`, whole, unclamped */
  export function centsFrom(note: Note, hz: number): number
  export function verdictOf(cents: number): Verdict          // |cents| ≤ IN_TUNE_BAND_CENTS → "in-tune"; > 0 sharp; < 0 flat
  export function semitoneCountOf(cents: number): number     // Math.round(Math.abs(cents) / 100)
  export function canStepTarget(target: TunerTarget, delta: -1 | 1): boolean   // pinned and within E2–C7 after the step
  /** The judgement: on auto the target is the shown note (after hand-over) and cents are clamped to ±50; pinned, the target is the pinned note and cents are unclamped. `heard.nearest` is always nearestNoteOf(hz). */
  export function judge(pitch: PitchDetected, target: TunerTarget, shown: number | null, spelling: SpellingPreference): { readonly judged: NoteJudged; readonly shown: number }
  ```

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-rules.test.ts` (pure-function checks for the numbers the session scenarios rely on):
  ```ts
  import { expect, test } from "vitest";
  import { canStepTarget, judge, nearestWithHandover, semitoneCountOf } from "../../../src/practice/published";
  import { noteLabel } from "../../../src/theory/published";
  const at = (hz: number, atFrame = 0) => ({ hz, confidence: 0.95, atFrame });
  test("practice.tuner/REQ-002 — judge on auto: nearest note, clamped cents, verdict", () => {
    const { judged, shown } = judge(at(445), { kind: "auto" }, null, "sharp");
    expect(noteLabel(judged.target)).toBe("A4"); expect(judged.cents).toBe(20); expect(judged.verdict).toBe("sharp"); expect(shown).toBe(69);
    expect(judge(at(441), { kind: "auto" }, null, "sharp").judged.verdict).toBe("in-tune");
    expect(judge(at(442), { kind: "auto" }, null, "sharp").judged.verdict).toBe("sharp");
    expect(judge(at(454), { kind: "auto" }, 69, "sharp").judged.cents).toBe(50);
  });
  test("practice.tuner/REQ-002 — hand-over at 56 cents", () => {
    expect(nearestWithHandover(69, 454.0)).toBe(69); expect(nearestWithHandover(69, 455.0)).toBe(70); expect(nearestWithHandover(null, 445)).toBe(69);
  });
  test("practice.tuner/REQ-004 — judge against a pinned target: unclamped cents, semitone count, bounds", () => {
    const { judged } = judge(at(523.25), { kind: "pinned", position: 69 }, null, "sharp");
    expect(noteLabel(judged.target)).toBe("A4"); expect(judged.cents).toBe(300); expect(judged.verdict).toBe("sharp"); expect(noteLabel(judged.heard.nearest)).toBe("C5");
    expect(semitoneCountOf(300)).toBe(3); expect(semitoneCountOf(-81)).toBe(1);
    expect(canStepTarget({ kind: "pinned", position: 96 }, 1)).toBe(false); expect(canStepTarget({ kind: "pinned", position: 40 }, -1)).toBe(false); expect(canStepTarget({ kind: "auto" }, 1)).toBe(false); expect(canStepTarget({ kind: "pinned", position: 69 }, 1)).toBe(true);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/tuner-rules.test.ts` — expect FAIL: `"judge" is not exported`.
- [ ] 3. GREEN — `tuner.ts` and the schema per Interfaces; export.
- [ ] 4. Run the same — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/tuner-rules.test.ts` → 3 passed.

### T007 · practice.tuner/REQ-001 · The session enters and leaves the tuner; nothing sounds while it listens

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`SessionContext` gains `spelling`; `Session` gains `enterTuner`, `leaveTuner`, `onNoteJudged`; `SessionSnapshot` gains `tuner`; the guards on `start`, `startDrone`, `tapNote`), `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/tuner-way-in-out.test.ts`

**Interfaces**
- Consumes: `ListeningPort` (T005); `TunerSnapshot`, `TunerTarget`, `ListeningState`, `NoteJudged` (T006); `FakeListening`, `FakeSound`, `sessionOn`, `isTone`, `isClick`, `isDrone`, `isStop` (fakes).
- Produces:
  ```ts
  export interface SessionContext { readonly key: Key; readonly variant: Variant; readonly spelling: SpellingPreference }   // App passes selection.spelling; setContext re-spells the tuner's notes
  interface Session {  // added
    enterTuner(): void;      // stop() if playing/counting; stopDrone() if on; tuner.active = true; listening = starting; wakeLock.acquire(); await listening.start() → listening | cannot-hear(reason); notifies
    leaveTuner(): void;      // listening.stop(); tuner.active = false; listening = off; target = auto; reading = null; wakeLock.release(); notifies
    onNoteJudged(listener: (event: NoteJudged) => void): () => void;
  }
  SessionSnapshot.tuner: TunerSnapshot   // { active: false, listening: { kind: "off" }, target: { kind: "auto" }, targetNote: null, reading: null, canStepDown: false, canStepUp: false } until entered
  ```
  While `tuner.active`: `start()`, `startDrone()` and `tapNote()` return without posting anything. `keyOf`/`variantOf` fixtures in `fakes.ts` gain `spelling: "sharp"` in the context they build (`sessionOn` passes `{ key, variant, spelling: "sharp" }`).

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-way-in-out.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { isClick, isDrone, isTone, sessionOn, startDroneAndFlush } from "../fakes";
  const flush = () => new Promise((r) => setTimeout(r, 0));
  test("practice.tuner/REQ-001/S1 — in from idle", async () => {
    const { session, listening, sound } = sessionOn("G", "flute-concert");
    session.enterTuner(); await flush(); await flush();
    expect(listening.startCalls).toBe(1);
    expect(session.snapshot().tuner).toMatchObject({ active: true, listening: { kind: "listening" }, target: { kind: "auto" } });
    expect(sound.posted.filter((p) => isTone(p.command) || isClick(p.command) || isDrone(p.command))).toEqual([]);
  });
  test("practice.tuner/REQ-001/S2 — in from a run and a drone", async () => {
    const { session, sound, clock } = sessionOn("G", "flute-concert");
    session.start(); await flush(); await flush(); clock.advanceMs(6000);
    const postedBefore = sound.posted.length;
    session.enterTuner(); await flush(); await flush();
    expect(sound.stopAllCalls).toBeGreaterThanOrEqual(1);
    expect(sound.posted.slice(postedBefore).filter((p) => isTone(p.command) || isClick(p.command))).toEqual([]);
    session.leaveTuner();
    expect(session.snapshot().transport.kind).toBe("idle");
    expect(session.snapshot().caption).toBe("29 notes · G4–G6");
    const drone = sessionOn("G", "flute-concert");
    await startDroneAndFlush(drone.session);
    drone.session.enterTuner(); await flush(); await flush();
    expect(drone.session.snapshot().drone.on).toBe(false);
    expect(drone.sound.posted.some((p) => p.command.kind === "stop")).toBe(true);
  });
  test("practice.tuner/REQ-001/S4 — out", async () => {
    const { session, listening } = sessionOn("G", "flute-concert");
    const before = session.snapshot();
    session.enterTuner(); await flush(); await flush();
    session.leaveTuner();
    expect(listening.stopCalls).toBe(1);
    expect(session.snapshot().tuner).toEqual({ active: false, listening: { kind: "off" }, target: { kind: "auto" }, targetNote: null, reading: null, canStepDown: false, canStepUp: false });
    expect(session.snapshot().caption).toBe(before.caption); expect(session.snapshot().transport).toEqual(before.transport);
  });
  test("practice.tuner/REQ-001 — while active, ▶, the drone and a tapped note are refused", async () => {
    const { session, sound } = sessionOn("G", "flute-concert");
    session.enterTuner(); await flush(); await flush();
    session.start(); session.startDrone(); session.tapNote(0); await flush(); await flush();
    expect(sound.posted.filter((p) => isTone(p.command) || isClick(p.command) || isDrone(p.command))).toEqual([]);
    expect(session.snapshot().transport.kind).toBe("idle");
  });
  ```
  (`sessionOn` returns the fixture's `listening` fake from T005; `sound.posted` / `stopAllCalls` / `clock.advanceMs` exist in `fakes.ts` — read it for the exact names before writing.)
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/tuner-way-in-out.test.ts` — expect FAIL: `session.enterTuner is not a function`.
- [ ] 3. GREEN — per Interfaces. `enterTuner` follows `startDrone`'s shape (the `await` inline, the generation counter pattern for a stale continuation: a `leaveTuner` before `listening.start()` resolves must leave the state `off`).
- [ ] 4. Run the same — expect PASS (4). `pnpm check` — green (App and every test updated for `SessionContext.spelling` and `SessionDeps.listening`).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass.

### T008 · practice.tuner/REQ-002, practice.tuner/REQ-003 · The reading: a detected pitch becomes a judgement; nothing heard clears it

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (subscribe to `listening.onPitch` while active; the shown-note hysteresis state; `reading`; `NoteJudged`; the gap rule)
- Test: `tests/practice/scenarios/tuner-reading.test.ts`

**Interfaces**
- Consumes: `judge`, `nearestWithHandover` (T006); `Session.enterTuner`, `onNoteJudged`, `snapshot().tuner` (T007); `FakeListening.feed(hz, atFrame?, confidence?)`, `FakeClock`.
- Produces: no new signatures. Semantics fixed here: on each `PitchDetected` the session calls `judge(pitch, target, shown, context.spelling)`, stores `reading` and `shown`, commits on the next clock tick (`clock.setTimeout(commit, 0)` — one commit per tick, the newest reading wins), and at commit emits `NoteJudged` and notifies. The gap rule: a `clock.setTimeout` of 300 ms armed at every detection; when it fires with no newer detection, `reading = null`, `shown = null`, notify. `setContext` with a new spelling re-spells `targetNote` and the next reading.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-reading.test.ts` (helper `enter(session)`: `enterTuner()` + two flushes; helper `hear(fixture, hz)`: `listening.feed(hz)` then `clock.advanceMs(1)`):
  ```ts
  test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    const judged: NoteJudged[] = []; f.session.onNoteJudged((e) => judged.push(e));
    hear(f, 445.0);
    const reading = f.session.snapshot().tuner.reading!;
    expect(noteLabel(reading.target)).toBe("A4"); expect(reading.cents).toBe(20); expect(reading.verdict).toBe("sharp");
    expect(judged).toHaveLength(1); expect(judged[0]).toMatchObject({ cents: 20, verdict: "sharp" });
  });
  test("practice.tuner/REQ-002/S2 — in tune", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 441.0); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 4, verdict: "in-tune" });
    hear(f, 442.0); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 8, verdict: "sharp" });
  });
  test("practice.tuner/REQ-002/S3 — flat, spelled flat", async () => {
    const f = sessionOn("G", "flute-concert"); f.session.setContext({ ...f.context, spelling: "flat" }); await enter(f.session);
    hear(f, 461.0);
    const reading = f.session.snapshot().tuner.reading!;
    expect(noteLabel(reading.target)).toBe("B♭4"); expect(reading.cents).toBe(-19); expect(reading.verdict).toBe("flat");
  });
  test("practice.tuner/REQ-002/S4 — the name holds across the boundary (hysteresis)", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0);
    for (const hz of [452.9, 454.0]) { hear(f, hz); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4"); expect(f.session.snapshot().tuner.reading!.cents).toBe(50); }
    hear(f, 455.0); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4"); expect(f.session.snapshot().tuner.reading!.cents).toBe(-42);
    hear(f, 452.0); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");   // 52 ¢ below A♯4: still A♯4
    hear(f, 450.0); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");    // 61 ¢ below: handed over
  });
  test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 466.16); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
    f.session.setContext({ ...f.context, spelling: "flat" }); hear(f, 466.16);
    expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
  });
  test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 445.0); f.clock.advanceMs(300);
    expect(f.session.snapshot().tuner.reading).toBeNull();
  });
  test("practice.tuner/REQ-003/S2 — silence with a target", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0); f.session.holdTarget(); f.clock.advanceMs(300);
    expect(f.session.snapshot().tuner.reading).toBeNull(); expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
  });
  test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0); f.clock.advanceMs(299); expect(f.session.snapshot().tuner.reading).not.toBeNull();
    f.clock.advanceMs(1); expect(f.session.snapshot().tuner.reading).toBeNull();
    hear(f, 445.0); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
  });
  ```
  (`holdTarget` arrives in T009; REQ-003/S2 is written now and passes after T009 — mark it `test.todo` until then and un-todo it in T009.)
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/tuner-reading.test.ts` — expect FAIL: `reading` stays `null` (`expected null to be truthy`).
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the same — expect PASS (7 + 1 todo). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/tuner-reading.test.ts` → 7 passed, 1 todo.

### T009 · practice.tuner/REQ-004, practice.tuner/REQ-009 · A target: Hold, pin, step, clear; forgotten on leaving

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (the four target verbs; `targetNote`, `canStepDown/Up`; judgement against the target)
- Test: `tests/practice/scenarios/tuner-target.test.ts`, `tests/practice/scenarios/tuner-memory.test.ts`; un-todo REQ-003/S2 in `tuner-reading.test.ts`

**Interfaces**
- Consumes: `judge`, `canStepTarget`, `semitoneCountOf`, `TUNER_LOWEST_POSITION`, `TUNER_HIGHEST_POSITION` (T006); the reading pipeline (T008).
- Produces:
  ```ts
  interface Session {  // added
    holdTarget(): void;                 // no-op without a reading; pins reading.heard.nearest's position
    pinTarget(position: number): void;  // clamped to E2–C7 (40..96)
    stepTarget(delta: -1 | 1): void;    // no-op on auto or when !canStepTarget
    clearTarget(): void;                // back to auto; the shown-note hysteresis restarts from the next detection
  }
  ```
  `targetNote = noteAtPosition(position, context.spelling)` when pinned. A pinned target keeps the last reading judged against it; the next detection is re-judged at once (the test feeds again).

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-target.test.ts`:
  ```ts
  test("practice.tuner/REQ-004/S1 — Hold", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 445.0); f.session.holdTarget();
    expect(f.session.snapshot().tuner.target).toEqual({ kind: "pinned", position: 69 }); expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
    hear(f, 445.0); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20, verdict: "sharp" });
    hear(f, 461.0); const r = f.session.snapshot().tuner.reading!;
    expect(noteLabel(r.target)).toBe("A4"); expect(r.cents).toBe(81); expect(noteLabel(r.heard.nearest)).toBe("A♯4");
  });
  test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    f.session.pinTarget(74); expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("D5");
    f.session.pinTarget(30); expect(f.session.snapshot().tuner.target).toEqual({ kind: "pinned", position: 40 });
  });
  test("practice.tuner/REQ-004/S3 — far from the target", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    const judged: NoteJudged[] = []; f.session.onNoteJudged((e) => judged.push(e));
    f.session.pinTarget(69); hear(f, 523.25);
    expect(judged.at(-1)).toMatchObject({ cents: 300, verdict: "sharp" }); expect(noteLabel(judged.at(-1)!.target)).toBe("A4"); expect(noteLabel(judged.at(-1)!.heard.nearest)).toBe("C5");
  });
  test("practice.tuner/REQ-004/S4 — a semitone either way", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    f.session.pinTarget(69);
    f.session.stepTarget(1); expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A♯4");
    f.session.stepTarget(-1); f.session.stepTarget(-1); expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("G♯4");
    f.session.pinTarget(96); f.session.stepTarget(1); expect(f.session.snapshot().tuner.target).toEqual({ kind: "pinned", position: 96 }); expect(f.session.snapshot().tuner.canStepUp).toBe(false);
    f.session.pinTarget(40); f.session.stepTarget(-1); expect(f.session.snapshot().tuner.target).toEqual({ kind: "pinned", position: 40 }); expect(f.session.snapshot().tuner.canStepDown).toBe(false);
  });
  test("practice.tuner/REQ-004/S5 — back to auto", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    f.session.pinTarget(74); hear(f, 445.0); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("D5");
    f.session.clearTarget(); hear(f, 445.0);
    expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" }); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 }); expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
  });
  test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
    // The sheet is a UI overlay; through the published interface "open" is nothing at all — listening continues across any sequence of target verbs.
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0); f.session.pinTarget(74); f.session.clearTarget(); hear(f, 440.0);
    expect(f.listening.stopCalls).toBe(0); expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
  });
  ```
  and `tests/practice/scenarios/tuner-memory.test.ts`:
  ```ts
  test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    f.session.pinTarget(74); f.session.leaveTuner(); await enter(f.session);
    expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" }); expect(f.session.snapshot().tuner.targetNote).toBeNull();
  });
  ```
- [ ] 2. Run both files — expect FAIL: `session.pinTarget is not a function`.
- [ ] 3. GREEN — per Interfaces; un-todo REQ-003/S2.
- [ ] 4. Run `pnpm vitest run tests/practice` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice` → all pass, `tuner-reading` now 8 passed.

### T010 · practice.tuner/REQ-006, listening.pitch-detection/REQ-004 · A late detection is dropped; a burst is coalesced; the paint age is reported

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (the age check before `judge`; `readingShown`)
- Test: `tests/practice/scenarios/tuner-budget.test.ts`

**Interfaces**
- Consumes: `READING_MAX_AGE_MS` (T006); `FakeListening.frame` and `feed(hz, atFrame)`; the commit-on-next-tick rule (T008).
- Produces:
  ```ts
  interface Session {  // added
    /** The UI reports that the reading with this atFrame has just been painted; returns that reading's age in ms at this instant (listening.currentFrame() − atFrame, at the port's sample rate). Used by the harness; never changes state. */
    readingShown(atFrame: number): number;
  }
  ```
  The age check: on `PitchDetected`, `ageMs = (listening.currentFrame() − pitch.atFrame) / listening.sampleRate() × 1000`; if `ageMs > READING_MAX_AGE_MS` the detection is ignored — no judgement, no `NoteJudged`, the pending reading (if any) untouched.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-budget.test.ts`:
  ```ts
  test("practice.tuner/REQ-006/S2 — late is dropped", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    const judged: NoteJudged[] = []; f.session.onNoteJudged((e) => judged.push(e));
    f.listening.frame = 48000;
    f.listening.feed(445.0, 48000 - 4801); f.clock.advanceMs(1);     // 100.02 ms old → dropped
    expect(judged).toEqual([]); expect(f.session.snapshot().tuner.reading).toBeNull();
    f.listening.feed(445.0, 48000 - 4800); f.clock.advanceMs(1);     // exactly 100 ms → shown
    expect(judged).toHaveLength(1);
  });
  test("listening.pitch-detection/REQ-004/S3 — a burst before the commit is coalesced to the newest", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    const judged: NoteJudged[] = []; f.session.onNoteJudged((e) => judged.push(e));
    f.listening.feed(440.0); f.listening.feed(441.0); f.listening.feed(442.0); f.clock.advanceMs(1);
    expect(judged).toHaveLength(1); expect(judged[0]!.cents).toBe(8);
  });
  test("practice.tuner/REQ-006 — readingShown reports the age at paint", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    f.listening.frame = 9600; f.listening.feed(440.0, 9600); f.clock.advanceMs(1);
    f.listening.frame = 9600 + 960;
    expect(f.session.readingShown(9600)).toBe(20);
  });
  ```
- [ ] 2. Run the file — expect FAIL: the late detection is judged (`expected [] to have length 0` fails on the first assertion).
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the same — expect PASS (3). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/tuner-budget.test.ts` → 3 passed.

### T011 · practice.tuner/REQ-007 · When the microphone cannot be used

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`cannot-hear` from a failed `start()` and from `onEnded`)
- Test: `tests/practice/scenarios/tuner-cannot-hear.test.ts`

**Interfaces**
- Consumes: `FakeListening.failWith`, `end()` (T005); `enterTuner`/`leaveTuner` (T007).
- Produces: no new signatures. `enterTuner` with `start()` → `{ ok: false, error }` sets `listening: { kind: "cannot-hear", reason }` (`worklet-failed`/`wasm-failed` map to `failed`); `onEnded` while active sets the same with `reason: "failed"` and clears `reading`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-cannot-hear.test.ts`:
  ```ts
  test("practice.tuner/REQ-007/S1 — refused", async () => {
    const f = sessionOn("G", "flute-concert"); f.listening.failWith = "refused";
    await enter(f.session);
    expect(f.session.snapshot().tuner).toMatchObject({ active: true, listening: { kind: "cannot-hear", reason: "refused" }, reading: null });
    f.listening.feed(440.0); f.clock.advanceMs(1); expect(f.session.snapshot().tuner.reading).toBeNull();
  });
  test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
    const f = sessionOn("G", "flute-concert"); f.listening.failWith = "refused"; await enter(f.session);
    f.session.leaveTuner(); f.listening.failWith = null; await enter(f.session);
    expect(f.listening.startCalls).toBe(2); expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
  });
  test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0); f.listening.end();
    expect(f.session.snapshot().tuner.listening).toEqual({ kind: "cannot-hear", reason: "failed" }); expect(f.session.snapshot().tuner.reading).toBeNull();
  });
  ```
- [ ] 2. Run the file — expect FAIL: `listening` reads `{ kind: "listening" }` or the state is unchanged after `end()`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run the same — expect PASS (3). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/tuner-cannot-hear.test.ts` → 3 passed.

### T012 · practice.tuner/REQ-008, listening.pitch-detection/REQ-005 · The page hidden, the screen awake

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (`visibility.onHidden` → stop listening while active; `visibility.onShown` → start again; the wake lock over the tuner)
- Test: `tests/practice/scenarios/tuner-hidden-awake.test.ts`

**Interfaces**
- Consumes: `FakeVisibility.hide()/show()`, `FakeWakeLock.acquired` (T005); `enterTuner`/`leaveTuner` (T007).
- Produces: no new signatures. Hidden while active: `listening.stop()`, `reading = null`, `listening: { kind: "off" }`? — no: the tuner is still active; the state becomes `starting` again on `onShown` and `listening` once `start()` resolves. While hidden the snapshot reads `listening: { kind: "off" }` with `active: true`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/tuner-hidden-awake.test.ts`:
  ```ts
  test("practice.tuner/REQ-008/S1 — hidden means deaf, shown means listening", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session);
    hear(f, 440.0);
    f.visibility.hide();
    expect(f.listening.stopCalls).toBe(1); expect(f.session.snapshot().tuner.reading).toBeNull(); expect(f.session.snapshot().tuner.active).toBe(true);
    f.listening.feed(440.0); f.clock.advanceMs(1); expect(f.session.snapshot().tuner.reading).toBeNull();
    f.visibility.show(); await flush(); await flush();
    expect(f.listening.startCalls).toBe(2); expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
    hear(f, 445.0); expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
  });
  test("listening.pitch-detection/REQ-005/S1 — hidden means deaf (the port is stopped)", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session); f.visibility.hide();
    expect(f.listening.listening).toBe(false);
  });
  test("listening.pitch-detection/REQ-005/S2 — shown again means listening again, without a new request from the tuner's side", async () => {
    const f = sessionOn("G", "flute-concert"); await enter(f.session); f.visibility.hide(); f.visibility.show(); await flush(); await flush();
    expect(f.listening.listening).toBe(true); expect(f.listening.startCalls).toBe(2);   // the platform remembers the grant; the port asks again, no prompt is shown
  });
  test("practice.tuner/REQ-008/S2 — the phone on the stand stays lit", async () => {
    const f = sessionOn("G", "flute-concert"); const wake = f.sessionDeps.wakeLock as FakeWakeLock;
    await enter(f.session); expect(wake.acquired).toBe(true);
    f.session.leaveTuner(); expect(wake.acquired).toBe(false);
  });
  test("practice.tuner/REQ-008 — shown while not on the tuner starts nothing", async () => {
    const f = sessionOn("G", "flute-concert"); f.visibility.show(); await flush();
    expect(f.listening.startCalls).toBe(0);
  });
  ```
- [ ] 2. Run the file — expect FAIL: `stopCalls` is 0 after `hide()`.
- [ ] 3. GREEN — per Produces (the existing `onHidden` handler gains the tuner branch; a new `onShown` subscription; both unsubscribed in `dispose()`).
- [ ] 4. Run the same — expect PASS (5). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/tuner-hidden-awake.test.ts` → 5 passed.

### T013 · practice.tuner/REQ-001 · Never both: the invariant over every interleaving, with the tuner

**Status:** done

**Files**
- Modify: `tests/practice/invariants/never-both.test.ts` (the verb set gains `enterTuner` and `leaveTuner`; the check gains "no tone, click or drone live while the tuner is active")

**Interfaces**
- Consumes: the existing enumeration harness in `never-both.test.ts` (read it first: it walks every sequence of up to four verbs from idle and inspects the fake's posted timeline); `snapshot().tuner.active`.
- Produces: nothing new.

**Steps**
- [ ] 1. RED — add the two verbs and, at every step of every sequence, this assertion:
  ```ts
  // practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant)
  if (session.snapshot().tuner.active) {
    const liveAt = sound.frame;
    expect(liveVoicesAt(sound, liveAt).filter((v) => isTone(v.command) || isClick(v.command) || isDrone(v.command))).toEqual([]);
  }
  ```
  (`liveVoicesAt` is the file's existing helper for "posted and not stopped before this frame minus its release" — reuse it; six verbs up to four taps is 1554 sequences, keep the file's 20 s timeout.) Name the test `practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant)` beside the existing `practice.drone/REQ-004/S3` one.
- [ ] 2. Run `pnpm vitest run tests/practice/invariants/never-both.test.ts` — expect PASS if T007's guards are complete, FAIL naming the offending sequence otherwise; either way the assertion must be present and the run green before step 3.
- [ ] 3. GREEN — fix any guard the enumeration finds (a pending `enterTuner` racing `start()` is the likely one — the generation-counter pattern of 004's C1).
- [ ] 4. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/invariants/never-both.test.ts` → 2 passed within the timeout.

## Phase 3 — The tuner screen

_Ends with the tuner reachable from the header, grey and correct against 4a / 5c; the phone can enter it._

### T014 · practice.tuner/REQ-001 · The Tuner pill, the `screen` state, the tuner screen's shell; one AudioContext for both worklets

**Status:** done

**Files**
- Create: `src/ui/TunerScreen.tsx`
- Modify: `src/ui/Header.tsx` (the Tuner pill between the instrument pill and ⚙ — design 1d / `Practice.dc.html` lines 22–28), `src/ui/App.tsx` (`screen` state; `enterTuner`/`leaveTuner`; renders `TunerScreen` instead of the practice column while `screen === "tuner"`; passes `spelling` in `setContext`), `src/ui/main.tsx` (the memoised context factory; `webAudioListening`; `window.__listening` dev hook), `src/ui/theme.ts` (`tuner` tokens)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx`

**Interfaces**
- Consumes: `Session.enterTuner/leaveTuner`, `SessionSnapshot.tuner` (T007); `webAudioListening` (T005); `sessionDepsWithFakes` (fakes).
- Produces:
  ```ts
  // theme.ts
  export const tuner = { sharp: "oklch(0.55 0.11 28)", flat: "oklch(0.55 0.11 258)", inTune: "oklch(0.55 0.11 150)", band: "oklch(0.90 0.045 150)", targetHead: "#a39a8c", ghostInk: "#8a8175" } as const;
  // Header.tsx — props gain
  readonly onOpenTuner: () => void;   // <button aria-label="Tuner"> with the three-bar glyph and the text "Tuner"
  // TunerScreen.tsx
  export function TunerScreen(props: {
    readonly tuner: TunerSnapshot;
    readonly onLeave: () => void;            // ‹ Practice: <button aria-label="Practice">
  }): JSX.Element
  // renders: the header row (‹ Practice; the indicator <span data-testid="mic-indicator"> reading "LISTENING" while listening/starting and "NO MIC" while cannot-hear, with the dot); an empty level area (T015), an empty strip (T016), an empty target row (T017), the footer (T018). Grey and structural now.
  // main.tsx
  const audioContext = memoisedAudioContext(() => new AudioContext());   // one factory, called by both adapters on their first start()
  const listening = webAudioListening(audioContext);
  window.__listening = listening (DEV only), beside __session / __sound
  ```

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/tuner-screen.test.tsx` (render `<App>` with `sessionDepsWithFakes()`, the pattern of `app-drone.test.tsx`):
  ```tsx
  test("practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows", async () => {
    const { sessionDeps, listening } = sessionDepsWithFakes();
    render(<App catalogue={builtInCatalogue()} selectionStore={memoryStore()} sessionDeps={sessionDeps} />);
    await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
    await waitFor(() => expect(screen.getByTestId("mic-indicator")).toHaveTextContent("LISTENING"));
    expect(listening.startCalls).toBe(1);
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
  });
  test("practice.tuner/REQ-001/S4 — out: ‹ Practice returns to the practice screen as it was", async () => {
    const { sessionDeps, listening } = sessionDepsWithFakes();
    render(<App catalogue={builtInCatalogue()} selectionStore={memoryStore()} sessionDeps={sessionDeps} />);
    await userEvent.click(screen.getByRole("button", { name: "G major" }));
    await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
    await userEvent.click(screen.getByRole("button", { name: "Practice" }));
    expect(listening.stopCalls).toBe(1);
    expect(screen.getByTestId("current-key")).toHaveTextContent("G major");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
  ```
  (`memoryStore()` is whatever in-memory `SelectionStore` the existing UI tests use — read `tests/ui/scenarios/app-drone.test.tsx` for its name.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx` — expect FAIL: `Unable to find role="button" and name "Tuner"`.
- [ ] 3. GREEN — per Interfaces; the practice column and the tuner screen share the outer 390 px frame; nothing else on the practice screen changes.
- [ ] 4. Run the same — expect PASS (2). `pnpm check` — green.
- [ ] 5. Start `pnpm dev`; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` — the `practice--way-in` shot shows the pill beside ⚙; `tuner--listening` shows ‹ Practice and LISTENING (the rest empty). Then `pnpm dev:phone`, open the tuner on the phone: the browser asks for the microphone; LISTENING shows; the dev console logs `listening: track settings` — paste the settings object into `notes.md` under `## T014 — the phone's track settings` (the plan's constraints risk). If the phone shows NO MIC although granted, stop and report: that is ADR 0006's "revisit if".
- [ ] 6. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui` → all pass; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` → `practice--way-in.png` matches `design/Practice.dc.html`'s header in structure (instrument pill · Tuner pill · ⚙); `tuner--listening.png` has the header row of `design/Tuner.dc.html` 4a; `notes.md` carries the phone's track settings.

### T015 · practice.tuner/REQ-002, practice.tuner/REQ-003 · The level, the big name, the tag; "Play a note"

**Status:** done

**Files**
- Create: `src/ui/TunerLevel.tsx`
- Modify: `src/ui/TunerScreen.tsx` (mount it in the level area)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx` (append)

**Interfaces**
- Consumes: `TunerSnapshot`, `NoteJudged`, `Verdict`, `IN_TUNE_BAND_CENTS`, `semitoneCountOf` (`practice/published`); `noteLabel`, `noteAtPosition`, `pitchPosition` (`theory/published`); `tuner`, `paper`, `fonts` (theme).
- Produces:
  ```ts
  export function TunerLevel(props: { readonly tuner: TunerSnapshot; readonly spelling: SpellingPreference }): JSX.Element
  ```
  Geometry from `design/Tuner.dc.html` 4a (`L4 = level(536, lin(5.1), every5, [0,10,25,50])`): area height 536, `mid = 268`; centre line at top 267, 2 px, `paper.borderSoft`; band top `mid − 5·5.1 = 242.5`, height 51, `tuner.band`; ticks every 5 ¢ (labelled 10/25/50: 16 px wide, 2 px; others 8 px, 1.5 px) on both edges, labels at left 21; "↑ sharp" (`tuner.sharp`) top-left and "halfway to" + the note above top-right; "↓ flat" (`tuner.flat`) bottom-left and "halfway to" + the note below bottom-right; the big name (`fonts.display` 164 px, `paper.ink`; `paper.faint` when a target is pinned and there is no reading) with the octave (mono 22 px, `paper.muted`) in a block `data-testid="tuner-name"`; the line `data-testid="tuner-line"` 7 px tall, radius 4, left 52 right 24, top `mid − cents·5.1 − 3.5`, colour by verdict; the tag `data-testid="tuner-tag"` right 24, top `cents ≥ 0 ? lineTop − 36 : lineTop + 8`, reading the "playing …" caption (pinned only) + "+20" + "sharp" (mono 22 px + word 13 px, both the verdict colour); beyond ±50 with a target: the line pinned at cents = ±50, the tag `"▲ 3 st"` / `"▼ N st"` and the caption `playing C5`; no reading: `data-testid="tuner-empty"` "Play a note" and no line/tag. The block `data-testid="tuner-reading"` wraps name + line + tag and re-renders per reading (the harness watches it).

**Steps**
- [ ] 1. RED — append to `tuner-screen.test.tsx` (a helper `enterAndHear(hz)` renders App, clicks Tuner, `listening.feed(hz)`, `clock.advanceMs(1)`, and `await`s `act`):
  ```tsx
  test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
    await enterAndHear(445.0);
    expect(screen.getByTestId("tuner-name")).toHaveTextContent("A4");
    expect(screen.getByTestId("tuner-tag")).toHaveTextContent("+20sharp");
    expect(screen.getByTestId("tuner-tag").style.color).toBe("oklch(0.55 0.11 28)");
    expect(screen.getByTestId("tuner-line").style.top).toBe("162.5px");
    expect(screen.getByText("halfway to")).toBeInTheDocument(); expect(screen.getByText("A♯4")).toBeInTheDocument(); expect(screen.getByText("G♯4")).toBeInTheDocument();
  });
  test("practice.tuner/REQ-002/S2 — in tune", async () => {
    await enterAndHear(441.0);
    expect(screen.getByTestId("tuner-tag")).toHaveTextContent("+4in tune"); expect(screen.getByTestId("tuner-tag").style.color).toBe("oklch(0.55 0.11 150)");
  });
  test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
    const f = await enterAndHear(445.0); f.clock.advanceMs(300); await act(async () => {});
    expect(screen.getByTestId("tuner-empty")).toHaveTextContent("Play a note"); expect(screen.queryByTestId("tuner-line")).toBeNull(); expect(screen.queryByTestId("tuner-tag")).toBeNull();
  });
  ```
- [ ] 2. Run the file — expect FAIL: `Unable to find an element by: [data-testid="tuner-name"]`.
- [ ] 3. GREEN — `TunerLevel` per Produces, mounted in `TunerScreen`.
- [ ] 4. Run the same — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx` → all pass; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` → `tuner--listening.png` (feed a tone: in dev, `window.__listening` is the real port — instead drive the fake by opening the page with `?tuner-demo=445` is **not** added; use the harness's oscillator route from T021 once it exists, or check structure on the `silent` state now) matches 4a's level area in structure: rule, band, ticks, the name block, "↑ sharp / ↓ flat", "halfway to".

### T016 · practice.tuner/REQ-005 · The stave strip

**Status:** done

**Files**
- Create: `src/ui/TunerStave.tsx`
- Modify: `src/ui/TunerScreen.tsx` (mount it; keep the last 50 readings for the trail in a `useRef` ring, oldest first)
- Test: `tests/ui/scenarios/tuner-stave.test.tsx`

**Interfaces**
- Consumes: `TunerSnapshot`, `NoteJudged` (`practice/published`); `noteLabel`, `pitchPosition`, `pitchHzOf` (`theory/published`); `tuner`, `paper`, `fonts` (theme).
- Produces:
  ```ts
  export function TunerStave(props: { readonly tuner: TunerSnapshot; readonly trail: readonly NoteJudged[] }): JSX.Element
  ```
  Geometry from `design/Tuner.dc.html` 4a (`st4`): a card 358×144 (`paper.card`, border `paper.borderSoft`, radius 14, overflow hidden) holding an SVG 358×176 shifted by `st4.shift` (centre the drawn extent; top-align if it cannot fit — the design's block at lines 1271–1279); five lines y = 86, 96, 106, 116, 126 from x 12 to 196 (`paper.inkSoft`), the bar at x 196; treble clef `𝄞` (Noto Music 36 px) at (28, 108). Diatonic index `i = octave·7 + [C,D,E,F,G,A,B].indexOf(letter)`; `y(i) = 126 − (i − 30)·5`; an octave mark: above index 49 → written 7 lower under `8va` (twice → `15ma`), below 24 → 7 higher under `8vb` (twice → `15mb`), the mark italic 14 px (`fonts.display`) at x 150 for the heard note, 182 for the target. The heard head `data-testid="heard-head"`: `<g style="transform: translateY(hy px)">` with an ellipse cx 150 cy 0 rx 8.2 ry 5.4 filled in the verdict colour and an inner ellipse rx 4.4 ry 3 rotated −35° filled paper.card — a whole-note look; `hy = guideY − cents·0.07` (so ≤ 3.5 px at ±50 — pinned readings beyond ±50 still clamp the drift to ±3.5); the dotted guide a line x 52–166 at guideY, stroke paper.faint, dasharray "2 4"; ledgers from `bottom − 2` down and `bottom + 10` up, x 138–162 (heard) / 170–194 (target); the accidental (Noto Music 20 px) at x 133 (heard, verdict colour) / 167 (target, `tuner.ghostInk`); the cents `data-testid="strip-cents"` (mono 11 px, verdict colour) at x 150, top `min(guideY, hy) − 27`; the band rect x 126 w 48 around the guide (`tuner.band`); the trail path `data-testid="trail"` through the last 50 readings' `hy` at x from 52 to 140 (oldest first), stroke a `linearGradient` of the verdict colour fading in; the ghost target head `data-testid="target-head"` at cx 182 (`tuner.targetHead`) when pinned; the right column: "HEARD" / the hz to one decimal + " Hz" `data-testid="heard-hz"` (verdict colour) and the target or nearest note + " IS" / its Hz to one decimal `data-testid="reference-hz"`; "—" for both when nothing is heard and nothing pinned.

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/tuner-stave.test.tsx`:
  ```tsx
  test("practice.tuner/REQ-005/S1 — A4 a little sharp", async () => {
    await enterAndHear(445.0);
    expect(screen.getByTestId("heard-head").style.transform).toBe("translateY(109.6px)");   // A4: i = 33, guide y = 111, −20·0.07
    expect(screen.getByTestId("strip-cents")).toHaveTextContent("+20"); expect(screen.getByTestId("strip-cents").style.color).toBe("oklch(0.55 0.11 28)");
    expect(screen.getByTestId("heard-hz")).toHaveTextContent("445.0 Hz"); expect(screen.getByTestId("reference-hz")).toHaveTextContent("440.0 Hz"); expect(screen.getByText("A4 IS")).toBeInTheDocument();
    expect(screen.queryByText("8va")).toBeNull();
  });
  test("practice.tuner/REQ-005/S2 — a flat accidental", async () => {
    await enterAndHear(461.0, "flat");
    expect(screen.getByTestId("heard-accidental")).toHaveTextContent("♭");
    expect(screen.getByTestId("heard-head").style.transform).toBe("translateY(107.33px)");   // B♭4: i = 34, guide 106, −(−19)·0.07 = +1.33
    expect(screen.getByTestId("strip-cents")).toHaveTextContent("−19");
  });
  test("practice.tuner/REQ-005/S3 — the low end takes 8vb", async () => {
    await enterAndHear(82.41); expect(screen.getByText("8vb")).toBeInTheDocument(); expect(screen.getByTestId("heard-head").style.transform).toBe("translateY(161px)");   // written at E3, i = 23
    await enterAndHear(65.41); expect(screen.getByText("15mb")).toBeInTheDocument();   // C2 → written C4, i = 28 → y 136
  });
  test("practice.tuner/REQ-005/S4 — the target beside the heard note", async () => {
    const f = await enterAndHear(440.0); await act(async () => { f.session.pinTarget(69); });
    f.listening.feed(523.25); f.clock.advanceMs(1); await act(async () => {});
    expect(screen.getByTestId("heard-head").style.transform).toBe("translateY(101px)");   // C5, i = 35
    expect(screen.getByTestId("target-head").getAttribute("cy")).toBe("111");
    expect(screen.getByTestId("heard-hz")).toHaveTextContent("523.3 Hz"); expect(screen.getByText("A4 IS")).toBeInTheDocument();
  });
  test("practice.tuner/REQ-005 — the trail keeps the last 50 readings, oldest first", async () => {
    const f = await enterAndHear(440.0);
    for (let k = 0; k < 60; k += 1) { f.listening.feed(440.0 + k * 0.1); f.clock.advanceMs(1); await act(async () => {}); }
    expect(screen.getByTestId("trail").getAttribute("d")!.split(" L ")).toHaveLength(50);
  });
  ```
  (Formatting: a `translateY` value uses at most two decimals, trimmed — `109.6px`, `107.33px`, `161px`; the component formats with `Number(v.toFixed(2))`.)
- [ ] 2. Run the file — expect FAIL: `Unable to find an element by: [data-testid="heard-head"]`.
- [ ] 3. GREEN — `TunerStave` per Produces; the trail ring in `TunerScreen`.
- [ ] 4. Run the same — expect PASS (5). `pnpm check` — green.
- [ ] 5. REFACTOR — extract the diatonic-index and `y(i)` helpers if `StaveView.tsx` already has equivalents; say so in the report rather than duplicating.

**Verify** — `pnpm vitest run tests/ui/scenarios/tuner-stave.test.tsx` → 5 passed; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` → `tuner--silent.png`'s strip matches 4a's card in structure (lines, clef, HEARD / IS column reading "—").

### T017 · practice.tuner/REQ-004 · The target pill, the Target sheet, the pitch spiral

**Status:** done

**Files**
- Create: `src/ui/TargetPill.tsx`, `src/ui/TargetSheet.tsx`, `src/ui/PitchSpiral.tsx`
- Modify: `src/ui/TunerScreen.tsx` (the pill row; the sheet on `BottomSheet`), `src/ui/App.tsx` (the four target handlers; the instrument range for the spiral)
- Test: `tests/ui/scenarios/target-sheet.test.tsx`

**Interfaces**
- Consumes: `Session.holdTarget/pinTarget/stepTarget/clearTarget`, `TunerSnapshot` (T009); `BottomSheet`, `OverlayScrim`, `OverlayHeader` (`overlay.tsx`); `noteAtPosition`, `noteLabel`, `pitchHzOf`, `pitchPosition`, `type NoteRange` (`theory/published`).
- Produces:
  ```ts
  export function TargetPill(props: { readonly tuner: TunerSnapshot; readonly onOpen: () => void; readonly onStep: (delta: -1 | 1) => void; readonly onClear: () => void }): JSX.Element
  // auto: <button aria-label="Target"> "TARGET" · "auto · nearest" · ▼ ; pinned: − (aria-label "Target down") · TARGET A4 — the pinned note (opens) · + ("Target up") · | · ✕ ("Auto"); − / + rendered disabled when !canStepDown / !canStepUp
  export function TargetSheet(props: { readonly open: boolean; readonly tuner: TunerSnapshot; readonly spelling: SpellingPreference; readonly range: NoteRange; readonly onClose: () => void; readonly onAuto: () => void; readonly onHold: () => void; readonly onPin: (position: number) => void }): JSX.Element
  // header "Target" / "Measure from the nearest note, or pin one" / ✕; the Auto card (aria-label "Auto", ✓ when auto); the Hold card (aria-label "Hold", "Hold A4" (the reading's nearest note) + "what you're playing" when a reading exists, else greyed "play a note first"); "Or tap a note" + "E2–C7 · low in the middle" (the spiral's lowest–highest); the spiral
  export function PitchSpiral(props: { readonly lowest: number; readonly highest: number; readonly rangeLowest: number; readonly rangeHighest: number; readonly target: TunerTarget; readonly reading: NoteJudged | null; readonly trail: readonly NoteJudged[]; readonly spelling: SpellingPreference; readonly onPick: (position: number) => void }): JSX.Element
  // design 5c: SC (179, 184), HUB 36, span = highest − lowest, dr = (176 − 36) / (span / 12 + 1), R0 = 36 + dr / 2, rAt(q) = R0 + (q − lowest) / 12 · dr; one path with role="button" and aria-label = the note label (e.g. "D5") per position lowest..highest (7 outer + 7 inner points; fill oklch(0.855 0.068 hue) / accidentals oklch(0.785 0.098 hue), hue = (FIFTHS.indexOf(pc)·30 + 25) % 360; the pinned wedge oklch(0.40 0.125 hue) with the label in paper.card); wedges outside rangeLowest..rangeHighest get fill-opacity 0.4 (data-dimmed="true"); every C labelled with its octave ("C4"); the needle path data-testid="spiral-needle" across the band at the reading's fractional position (paper.card 9 px under the verdict colour 4.5 px) when a reading exists; the trail through the last readings' positions; the hub: the target's name (fonts.display 22 px) and its Hz to one decimal ("587.3 Hz"), or "—" / "pick a note" on auto
  ```
  `lowest = min(40, pitchPosition(range.lowest), reading?.position, pinned?)`, `highest = max(96, pitchPosition(range.highest), …)` — as 5c's `sLo/sHi`. The sheet never touches the session on open/close.

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/target-sheet.test.tsx`:
  ```tsx
  test("practice.tuner/REQ-004/S1 — Hold", async () => {
    const f = await enterAndHear(445.0);
    await userEvent.click(screen.getByRole("button", { name: "Target" }));
    expect(screen.getByRole("button", { name: "Hold" })).toHaveTextContent("A4");
    await userEvent.click(screen.getByRole("button", { name: "Hold" }));
    expect(screen.queryByText("Measure from the nearest note, or pin one")).toBeNull();   // closed
    expect(screen.getByRole("button", { name: "Target" })).toHaveTextContent("TARGETA4");
    f.listening.feed(461.0); f.clock.advanceMs(1); await act(async () => {});
    expect(screen.getByTestId("tuner-tag")).toHaveTextContent("▲ 1 st"); expect(screen.getByText("playing A♯4")).toBeInTheDocument();
    expect(screen.getByTestId("tuner-line").style.top).toBe("9.5px");   // pinned at +50: 268 − 255 − 3.5
  });
  test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
    await enterAndHear(440.0);
    await userEvent.click(screen.getByRole("button", { name: "Target" }));
    expect(screen.getAllByRole("button").filter((b) => b.getAttribute("data-position") !== null)).toHaveLength(57);   // E2–C7 on the flute
    expect(screen.getByRole("button", { name: "E2" })).toHaveAttribute("data-dimmed", "true");
    expect(screen.getByRole("button", { name: "D5" })).not.toHaveAttribute("data-dimmed", "true");
    await userEvent.hover(screen.getByRole("button", { name: "D5" }));
    await userEvent.click(screen.getByRole("button", { name: "D5" }));
    expect(screen.getByRole("button", { name: "Target" })).toHaveTextContent("TARGETD5");
    await userEvent.click(screen.getByRole("button", { name: "Target" }));
    expect(screen.getByTestId("spiral-hub")).toHaveTextContent("D5587.3 Hz");
  });
  test("practice.tuner/REQ-004/S4 — a semitone either way", async () => {
    const f = await enterAndHear(440.0); await act(async () => { f.session.pinTarget(69); });
    await userEvent.click(screen.getByRole("button", { name: "Target up" })); expect(screen.getByRole("button", { name: "Target" })).toHaveTextContent("A♯4");
    await act(async () => { f.session.pinTarget(96); }); expect(screen.getByRole("button", { name: "Target up" })).toBeDisabled();
    await act(async () => { f.session.pinTarget(40); }); expect(screen.getByRole("button", { name: "Target down" })).toBeDisabled();
  });
  test("practice.tuner/REQ-004/S5 — back to auto", async () => {
    const f = await enterAndHear(445.0); await act(async () => { f.session.pinTarget(74); });
    await userEvent.click(screen.getByRole("button", { name: "Auto" }));
    expect(screen.getByRole("button", { name: "Target" })).toHaveTextContent("auto · nearest");
    f.listening.feed(445.0); f.clock.advanceMs(1); await act(async () => {}); expect(screen.getByTestId("tuner-name")).toHaveTextContent("A4");
  });
  test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
    const f = await enterAndHear(440.0);
    await userEvent.click(screen.getByRole("button", { name: "Target" }));
    f.listening.feed(445.0); f.clock.advanceMs(1); await act(async () => {});
    expect(screen.getByTestId("spiral-needle")).toBeInTheDocument(); expect(f.listening.stopCalls).toBe(0);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(f.listening.stopCalls).toBe(0);
  });
  ```
  (`Close` is `OverlayHeader`'s ✕ accessible name — read `overlay.tsx` for the exact label before writing.)
- [ ] 2. Run the file — expect FAIL: `Unable to find role="button" and name "Target"`.
- [ ] 3. GREEN — the three components per Produces; wire in `TunerScreen` and `App`.
- [ ] 4. Run the same — expect PASS (5). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/target-sheet.test.tsx` → 5 passed; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` → `tuner--target-sheet.png` matches 5c in structure (header, Auto/Hold cards, "Or tap a note", the spiral with a hub); `tuner--target-pinned.png` shows the − TARGET + ✕ pill.

### T018 · practice.tuner/REQ-007, practice.tuner/REQ-002, practice.tuner/REQ-009 · "Can't hear", the footer's ♯/♭ toggle, the spelling persists

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx` (the "Can't hear" card; the footer; NO MIC), `src/ui/App.tsx` (the toggle writes `selection.spelling` through the same handler the circle uses)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx` (append), `tests/ui/scenarios/selection-persistence.test.tsx` (append)

**Interfaces**
- Consumes: `TunerSnapshot.listening` (T011); App's existing `onSpellingChange` handler (`App.tsx` line ~501); `SelectionStore`.
- Produces: `TunerScreen` props gain `readonly spelling: SpellingPreference; readonly onSpellingChange: (preference: SpellingPreference) => void`. The card `data-testid="cannot-hear"`: title "Can't hear — no microphone", body "It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again." (`paper.card`, border `paper.borderSoft`, radius 14, absolutely positioned at top 440 as in 4a); the big name shows "–" (`paper.drawerBorder`) while cannot-hear; the footer: "A4 = 440 Hz · in tune ±5 ¢" (mono 10.5 px) and the ♯/♭ segmented control (`<button aria-label="Sharp spelling">` / `"Flat spelling"`, the circle's own labels — read `CircleOfFifths.tsx` for them and reuse).

**Steps**
- [ ] 1. RED — append to `tuner-screen.test.tsx`:
  ```tsx
  test("practice.tuner/REQ-007/S1 — refused", async () => {
    const { sessionDeps, listening } = sessionDepsWithFakes(); listening.failWith = "refused";
    render(<App catalogue={builtInCatalogue()} selectionStore={memoryStore()} sessionDeps={sessionDeps} />);
    await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
    await waitFor(() => expect(screen.getByTestId("mic-indicator")).toHaveTextContent("NO MIC"));
    expect(screen.getByTestId("cannot-hear")).toHaveTextContent("Can't hear — no microphone");
    expect(screen.getByTestId("cannot-hear")).toHaveTextContent("It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again.");
    expect(screen.getByTestId("tuner-name")).toHaveTextContent("–");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("A4 = 440 Hz · in tune ±5 ¢")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Practice" })).toBeEnabled();
  });
  test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
    const { sessionDeps, listening } = sessionDepsWithFakes(); listening.failWith = "refused";
    render(<App catalogue={builtInCatalogue()} selectionStore={memoryStore()} sessionDeps={sessionDeps} />);
    await userEvent.click(screen.getByRole("button", { name: "Tuner" })); await userEvent.click(screen.getByRole("button", { name: "Practice" }));
    listening.failWith = null; await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
    await waitFor(() => expect(screen.getByTestId("mic-indicator")).toHaveTextContent("LISTENING"));
  });
  test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
    const f = await enterAndHear(440.0); await act(async () => { f.listening.end(); });
    expect(screen.getByTestId("mic-indicator")).toHaveTextContent("NO MIC"); expect(screen.getByTestId("cannot-hear")).toBeInTheDocument(); expect(screen.queryByTestId("tuner-line")).toBeNull();
  });
  test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
    const f = await enterAndHear(466.16); expect(screen.getByTestId("tuner-name")).toHaveTextContent("A♯4");
    await userEvent.click(screen.getByRole("button", { name: "Flat spelling" }));
    f.listening.feed(466.16); f.clock.advanceMs(1); await act(async () => {}); expect(screen.getByTestId("tuner-name")).toHaveTextContent("B♭4");
    await userEvent.click(screen.getByRole("button", { name: "Practice" }));
    expect(screen.getByRole("button", { name: "G♭ major" })).toBeInTheDocument();   // the circle now spells flat
  });
  ```
  and to `selection-persistence.test.tsx`:
  ```tsx
  test("practice.tuner/REQ-009/S1 — reopened: the practice screen, the flat spelling, the tuner on Auto", async () => {
    const store = memoryStore({ ...firstRunDefaults, variantId: "flute-concert", keyId: "C-major", spelling: "flat" });
    render(<App catalogue={builtInCatalogue()} selectionStore={store} sessionDeps={testSessionDeps()} />);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Practice" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
    expect(screen.getByRole("button", { name: "Target" })).toHaveTextContent("auto · nearest");
    expect(screen.getByRole("button", { name: "Flat spelling" })).toHaveAttribute("aria-pressed", "true");
  });
  ```
  (If the circle's spelling buttons carry no `aria-pressed`, assert the active background `paper.pillActive` instead — read `CircleOfFifths.tsx`.)
- [ ] 2. Run both files — expect FAIL: `Unable to find an element by: [data-testid="cannot-hear"]`.
- [ ] 3. GREEN — per Produces.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui` → all pass; `python3 scripts/design_snapshot.py changes/007-hear-me live --base http://localhost:5173` → `tuner--cannot-hear.png` (deny the mic in the snapshot browser: `design_snapshot.py` passes no permission, so Chromium's headless default denies) matches 4a's cannot-hear state in structure: NO MIC, "–", the card, the footer.

### T019 · practice.tuner/REQ-006 · The paint is reported; the dev hooks the harness needs

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx` (`useLayoutEffect` on `tuner.reading?.atFrame` → `onReadingShown(atFrame)`), `src/ui/App.tsx` (`onReadingShown` → `session.readingShown(atFrame)` → pushes the returned age to `props.onPaintAge?.(ageMs)`), `src/ui/main.tsx` (DEV: `window.__paintAgesMs: number[]` collected via `onPaintAge`; `window.__enterTuner = () => …` is **not** added — the harness clicks the pill)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx` (append)

**Interfaces**
- Consumes: `Session.readingShown(atFrame): number` (T010).
- Produces: `App` props gain `readonly onPaintAge?: (ageMs: number) => void`; `TunerScreen` props gain `readonly onReadingShown: (atFrame: number) => void`.

**Steps**
- [ ] 1. RED — append:
  ```tsx
  test("practice.tuner/REQ-006 — every painted reading is reported with its age", async () => {
    const ages: number[] = [];
    const f = await enterAndHear(440.0, "sharp", { onPaintAge: (ms) => ages.push(ms) });
    f.listening.frame = 4800; f.listening.feed(440.0, 4800); f.clock.advanceMs(1); f.listening.frame = 4800 + 480; await act(async () => {});
    expect(ages.at(-1)).toBe(10);
  });
  ```
  (`enterAndHear`'s third argument spreads extra props onto `<App>`.)
- [ ] 2. Run the file — expect FAIL: `expected undefined to be 10`.
- [ ] 3. GREEN — per Produces; the effect runs once per distinct `atFrame`.
- [ ] 4. Run the same — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/tuner-screen.test.tsx` → all pass.

### T020 [P] · — · The design-review loop points at this change's design

**Status:** done

**Files**
- Modify: `scripts/design-shots.mjs` (`PROTOTYPE_PATH` → `changes/007-hear-me/design/Tuner.dc.html`; a second prototype path for `Practice.dc.html`; `STATES`: `practice-way-in` (Practice.dc.html, no interaction), `tuner-listening` (Tuner.dc.html `#4a`, Tweaks State = sweep — set via the dc-runtime's props if the page exposes them, else the default live script), `tuner-silent` (State = silent), `tuner-cannot-hear`, `tuner-target-pinned` (click the Hold card), `tuner-target-sheet` (click TARGET); the live app driven to the same states: click "Tuner"; for silent nothing more; for cannot-hear deny the permission; for pinned/sheet click "Target"/"Hold")

**Interfaces**
- Consumes: the script's existing `STATES` shape (read it: each state is `{ name, prototype(page), app(page) }`).
- Produces: nothing new.

**Steps**
- [ ] 1. Point the paths and write the six states.
- [ ] 2. Run `pnpm design:shots` with `pnpm dev` running — twelve PNGs land in `.sdd/design-review/` (six pairs).
- [ ] 3. Read every pair; note in `changes/007-hear-me/notes.md` under `## T020 — design shots` which pairs differ in *structure* (a missing element) — those are bugs for the task that owns the element, not taste.

**Verify** — `ls .sdd/design-review/*.png | wc -l` → `12`; `notes.md` lists the structural differences (or "none").

## Phase 4 — The measured harness

### T021 · practice.tuner/REQ-006, listening.pitch-detection/REQ-002, listening.pitch-detection/REQ-003, listening.pitch-detection/REQ-004 · `pnpm test:tuner` — the budget, the accuracy, the refresh, silence and noise, measured

**Status:** done

**Files**
- Create: `scripts/tuner-timing-test.mjs`, `tests/listening/scenarios/tuner-harness.test.ts` (the citation file, the pattern of `tests/practice/scenarios/timing.test.ts`)
- Modify: `package.json` (`"test:tuner": "node scripts/tuner-timing-test.mjs"`), `src/ui/main.tsx` (DEV: `window.__noteJudged(listener)` — subscribes to `session.onNoteJudged`, beside `__session`)

**Interfaces**
- Consumes: `window.__session`, `window.__sound.context()`, `window.__listening`, `window.__paintAgesMs` (T014, T019); `[data-testid="tuner-reading"]`, `[data-testid="tuner-tag"]`, `[data-testid="tuner-name"]` (T015).
- Produces: `pnpm test:tuner` prints, after `feeding the microphone from the page's own AudioContext`, one table:
  ```
  case                     tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  status
  sine E2–C7               57     …                       …                     …                   …               …              PASS
  flute-like E2–C7         57     …                       …                     …                   …               …              PASS
  hand-over glissando      1      …                       …                     …                   …               —              PASS
  silence                  —      —                       —                     —                   0.00            —              PASS
  white noise              —      —                       —                     —                   0.00            —              PASS
  test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, nothing for silence or noise
  ```
  Gates (the plan's Open question 1): first readout ≤ 100 ms (`practice.tuner/REQ-006/S1`), arrival age ≤ 100 ms (`listening.pitch-detection/REQ-004/S2`: the first `PitchDetected`'s `atFrame` within [onset, onset + 100 ms] — read through `__listening.onPitch`), readings/s ≥ 20 while steady (`REQ-004/S1`), |cents error| ≤ 2 for every reading after the first 60 ms of each tone (`REQ-002/S5`), no reading during silence and noise (`REQ-003/S1`, `S2`); the hand-over case checks the name changes exactly once, at the 56 ¢ crossing (`practice.tuner/REQ-002/S4` live). Paint age is printed, never gated.
  Mechanics: `page.addInitScript` replaces `navigator.mediaDevices.getUserMedia` with a function that, on first call, reads the page's context from `window.__sound.context()` — **not yet created** at that moment: the tuner creates it — so the override instead creates the stream lazily from `window.__listening.context()` after `start()` has run: the override returns a `MediaStream` from `context.createMediaStreamDestination()` and stores the destination on `window.__micDestination`; the harness then connects an `OscillatorNode` (type `sine`, or `setPeriodicWave` with real coefficients `[0, 1, 0.6, 0.35, 0.2, 0.1, 0.05]` for the flute-like tone) to it and calls `osc.start(context.currentTime + 0.3)` / `osc.stop(+1.3)` per tone, recording `onsetFrame = round(startTime × sampleRate)`; each tone is 1 s, tones 300 ms apart, at every semitone 40..96 (57 per row, ~75 s per row); first readout = the first `[data-testid="tuner-reading"]` mutation after `onsetFrame` (MutationObserver, `performance.now()`), converted to frames via `context.currentTime`/`performance.now()` as `timing-test.mjs` does; white noise via an `AudioBufferSourceNode` of 2 s LCG noise. Headless Chromium launched with `--use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required`. Enters the tuner by clicking `button[aria-label="Tuner"]`.

**Steps**
- [ ] 1. The citation test `tests/listening/scenarios/tuner-harness.test.ts`:
  ```ts
  // listening.pitch-detection/REQ-002/S5, listening.pitch-detection/REQ-003/S1, listening.pitch-detection/REQ-003/S2, listening.pitch-detection/REQ-004/S1, listening.pitch-detection/REQ-004/S2, practice.tuner/REQ-006/S1 — measured by scripts/tuner-timing-test.mjs (pnpm test:tuner), not re-measured here
  test("scripts/tuner-timing-test.mjs exists and its header cites the measured scenarios", () => {
    const header = readFileSync(resolve(__dirname, "../../../scripts/tuner-timing-test.mjs"), "utf8").slice(0, 900);
    for (const id of ["REQ-002/S5", "REQ-003/S1", "REQ-003/S2", "REQ-004/S1", "REQ-004/S2", "practice.tuner/REQ-006/S1"]) expect(header).toContain(id);
  });
  ```
- [ ] 2. Write `scripts/tuner-timing-test.mjs` per Produces (start from `timing-test.mjs`'s dev-server, browser and table plumbing; ~400 lines).
- [ ] 3. Run `pnpm test:tuner` — expect the table; if a row FAILs, the number is the finding: report it, do not loosen a gate. A first-readout failure is the plan's Open question 2 (shrink WINDOW to 1536 in `detector.rs`, re-run `cargo test -p listening` — `req_002_s3_the_low_end` must still pass — and re-measure).
- [ ] 4. Paste the passing table into `changes/007-hear-me/notes.md` under `## T021 — test:tuner on the laptop`.
- [ ] 5. `pnpm check` — green (the citation test passes).

**Verify** — `pnpm test:tuner` → `test:tuner: PASS — …`; `notes.md` carries the table.

## Phase 5 — Hardening

### T022 · — · Every row of the proposal's edge-case table has a test; scenario coverage is complete

**Status:** done

**Files**
- Test: `tests/practice/scenarios/tuner-edge-cases.test.ts`; any file `./scripts/check-scenarios.sh changes/007-hear-me` names

**Steps**
- [ ] 1. Run `./scripts/check-scenarios.sh changes/007-hear-me` — every scenario ID of the three deltas must be attributed to a test (the measured ones through the two citation files). For each gap, add the test in the file the phase above would have owned, named by its ID.
- [ ] 2. RED → GREEN, one test per edge-case row not already covered by a scenario: "a note outside E2–C7" (`listening.pitch-detection/REQ-002/S5`'s last clause — a `cargo test` that `detect` on a 60 Hz sine either returns `None` or a positive hz), "the pitch sits on a boundary" (covered by REQ-002/S4 — cite), "entering while counting in" (`sessionOn`, `start()`, `enterTuner()` during the count-in → `stopAllCalls ≥ 1`, idle), "a tapped note sounding when the tuner is entered" (`tapNote(0)`, `enterTuner()` → a `stop(tag)` posted for the tap).
- [ ] 3. `pnpm check` — green; `./scripts/check-scenarios.sh changes/007-hear-me` — no gaps.

**Verify** — `./scripts/check-scenarios.sh changes/007-hear-me` → every scenario attributed; `pnpm check` → green.

### T023 · — · `AGENTS.md` healthy outputs; `pnpm check`, `pnpm test:timing`, `pnpm test:tuner`

**Status:** done

**Files**
- Modify: `AGENTS.md` (paste `pnpm test:tuner`'s healthy table under the `test:timing` one; update the `pnpm check` healthy-output counts; the Architecture paragraph's `src/listening/` line: "pitch detection by MPM in a second worklet sharing the AudioContext; ADR 0006")

**Steps**
- [ ] 1. Run `pnpm check` and paste its last eight lines; run `pnpm test:timing` and `pnpm test:tuner` and paste both tables.
- [ ] 2. `grep -c 'FILL THIS IN' AGENTS.md` → `0`.

**Verify** — `pnpm check` → green; both harnesses PASS; `AGENTS.md` carries all three outputs.

### T024 · practice.tuner/REQ-006 · The phone: the harness against `pnpm dev:phone`, and the user's walk

**Status:** done

**Files**
- Modify: `changes/007-hear-me/notes.md`

**Steps**
- [ ] 1. Start `pnpm dev:phone`; run `APP_URL=https://localhost:5173 pnpm test:tuner`; paste the table into `notes.md` under `## T024 — test:tuner against dev:phone`.
- [ ] 2. The user, on the phone on the stand with the flute (`practice.tuner/REQ-006/S3`): long tones up and down the instrument — the readout names each note, moves with the embouchure, never feels behind; silence shows "Play a note"; Hold and the spiral pin a target; ‹ Practice returns idle. The user's words go into `notes.md` verbatim; anything that is wrong is a task appended by converge, not fixed here.

**Verify** — `notes.md` carries the phone-server table and the user's walk.

### T026 · practice.tuner/REQ-002 · The shown offset is smoothed (design round 1: variant A becomes the rule)

> Appended 2026-09-28 by design round 1 (`design/rounds.md`); the delta's
> REQ-002 was amended with the user's approval (S6–S9).

**Status:** done

**Files**
- Modify: `src/practice/domain/tuner.ts` (the smoothing as the one rule: `SMOOTHING_FACTOR = 0.1`, `SNAP_CENTS = 25`; delete `TunerSmoothing`, variants b and c and every `design-loop variant` marker)
- Modify: `src/practice/domain/session.ts` (one smoothed pitch held by the session; reset with the reading, on a change of shown note, on a change of target; `heard.hz` stays the detected pitch; delete `SessionOptions` and `createSession`'s last argument)
- Modify: `src/practice/published/index.ts`, `src/ui/App.tsx`, `src/ui/main.tsx`, `tests/practice/fakes.ts` (the `?variant` switch and its plumbing removed)
- Modify: `tests/practice/scenarios/tuner-smoothing.test.ts` (becomes `practice.tuner/REQ-002/S6`, `S7`, `S8`; the variant tests deleted)
- Modify: every test that feeds one reading per pitch and reads a settled offset (`tests/practice/scenarios/tuner-*.test.ts`, `tests/ui/scenarios/tuner-*.test.tsx`, `tuner-helpers.ts`) — feed the steady pitch the scenario names

**Steps**
- [ ] 1. Red: S6, S7, S8 by their full IDs, through the published interface, with no smoothing switch passed.
- [ ] 2. Green: variant A's behaviour as the only path; the switch, b, c and the options plumbing deleted.
- [ ] 3. Existing scenarios that say "steady" feed a steady pitch; no assertion is loosened.

**Verify** — `pnpm check` → green; `./scripts/check-scenarios.sh --change changes/007-hear-me` shows S6–S8 tested; `grep -rn "design-loop variant\|TunerSmoothing\|SessionOptions" src tests` → nothing.

### T027 · practice.tuner/REQ-002 · The harness gates the shown offset (S9)

> Appended 2026-09-28 by design round 1.

**Status:** done

**Files**
- Modify: `scripts/tuner-timing-test.mjs` (a gated column: the shown offset — `NoteJudged.cents` — half a second into each steady tone, within ±2 ¢ of the tone fed)
- Modify: `tests/listening/scenarios/tuner-harness.test.ts` (cites `practice.tuner/REQ-002/S9`)
- Modify: `AGENTS.md` (the `test:tuner` healthy table and the `pnpm check` counts)

**Steps**
- [ ] 1. Add the column and the gate; the PASS / FAIL lines name it.
- [ ] 2. Run `pnpm test:tuner` and paste the table into `notes.md` and `AGENTS.md`.

**Verify** — `pnpm test:tuner` → PASS with the new column; `pnpm check` → green; `check-scenarios.sh` shows S9 tested.

### T028 · practice.tuner/REQ-004 · Hold and the needle remember the last note heard

> Appended 2026-09-28 by design round 2 (`design/rounds.md`); REQ-004
> (S7, S8), REQ-009/S3 and REQ-003 amended with the user's approval.

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts` (the last note heard, kept from each committed reading, kept through a gap, forgotten on leaving; `holdTarget()` pins it when no reading is showing), `src/practice/domain/tuner.ts` (`TunerSnapshot.lastHeard: Note | null`, spelled per the preference like `targetNote`)
- Modify: `src/ui/TargetSheet.tsx` (the Hold card's three states), `src/ui/PitchSpiral.tsx` (the needle greyed on the last note heard while nothing is heard, no trail)
- Test: `tests/practice/scenarios/tuner-target.test.ts`, `tests/practice/scenarios/tuner-memory.test.ts`, `tests/ui/scenarios/target-sheet.test.tsx`

**Steps**
- [ ] 1. Red: `practice.tuner/REQ-004/S7`, `S8`, `practice.tuner/REQ-009/S3` by their full IDs — the session's side through `published/`, the sheet's side in `tests/ui/scenarios/`.
- [ ] 2. Green: the session keeps and forgets the last note heard; the sheet and the spiral show it.
- [ ] 3. The never-both invariant and every existing target scenario pass untouched.

**Verify** — `pnpm check` → green; `check-scenarios.sh` shows REQ-004/S7, S8 and REQ-009/S3 tested.

### T029 · practice.tuner/REQ-005 · The trail moves with time and outlives the note

> Appended 2026-09-28 by design round 3; REQ-005 (S5, S6) amended with the
> user's approval. The length is tried live behind a temporary
> `?variant=a|b|c` switch (2.5 s, 1.2 s, 0.5 s) and fixed by T030.

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx` (the trail keeps each point's time and its run; kept through silence; dropped by age), `src/ui/TunerStave.tsx` (x by age; one path per run; drawn in silence), `src/ui/App.tsx`, `src/ui/main.tsx` (the temporary switch)
- Test: `tests/ui/scenarios/tuner-stave.test.tsx`, `tests/ui/scenarios/tuner-screen.test.tsx`

**Steps**
- [ ] 1. Red: `practice.tuner/REQ-005/S5`, `S6` by their full IDs.
- [ ] 2. Green: the trail by time; redrawn in silence only while a trail is left to move.
- [ ] 3. The spiral's needle trail is unchanged while a note sounds and absent in silence.

**Verify** — `pnpm check` → green; `check-scenarios.sh` shows REQ-005/S5, S6 tested; on the phone the trail drifts off in silence at each of the three lengths.

### T030 · practice.tuner/REQ-005 · The trail's length as chosen; the switch removed

> Appended 2026-09-28 by design round 3.

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx`, `src/ui/App.tsx`, `src/ui/main.tsx` (one named length; the switch and its plumbing gone)

**Steps**
- [ ] 1. The chosen length as the one constant; S5's test reads it.

**Verify** — `pnpm check` → green; `grep -rn "design-loop variant" src tests` → nothing.

### T031 · practice.tuner/REQ-003 · The last reading lingers and fades (design round 4: the rule)

> Appended 2026-09-28 by design round 4 (`design/rounds.md`); REQ-003
> amended with the user's approval (the linger clause, S4–S6, S1 and S3
> reworded).

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx`, `src/ui/TunerLevel.tsx`, `src/ui/TunerStave.tsx` (linger 600 ms grey, fade 200 ms, as the one rule; the "fade" and "ghost" treatments, the `silence` / `lingerMs` / `lingerFadeMs` props and every `design-loop variant (007 round 4)` marker removed), `src/ui/tuner-silence.ts` (kept only if still needed, renamed if not the right home), `src/ui/App.tsx`, `src/ui/main.tsx` (the `?variant` switch removed)
- Modify: `src/ui/theme.ts` (the two durations as motion tokens, promoted at the loop's exit)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx`, `tests/ui/scenarios/tuner-stave.test.tsx`; `tests/ui/scenarios/tuner-silence-variants.test.tsx` becomes the scenario tests or is removed

**Steps**
- [ ] 1. Red: `practice.tuner/REQ-003/S4`, `S5`, `S6` by their full IDs.
- [ ] 2. Green: the linger as the only path; the switch and the unchosen treatments deleted.
- [ ] 3. Existing REQ-003 tests that read the silent state let the linger pass first; no assertion is loosened.

**Verify** — `pnpm check` → green; `check-scenarios.sh` shows REQ-003/S4–S6 tested; `grep -rn "design-loop variant (007 round 4)" src tests` → nothing.

### T032 · practice.tuner/REQ-002 · The tuner fits the phone: the level flexes (design round 5: the rule)

> Appended 2026-09-29 by design round 5 (`design/rounds.md`). No
> requirement names a size; the level's rule (REQ-002: a linear ±50 ¢
> rule, the ±5 ¢ band) keeps its proportions at any height.

**Status:** done

**Files**
- Modify: `src/ui/TunerScreen.tsx`, `src/ui/TunerLevel.tsx` (the level takes the height left over, its geometry from its measured height, 536 px when unmeasured, 300 px at least; the "fixed" and "flex-compact" treatments, the `fit` prop and every `design-loop variant (007 round 5)` marker removed), `src/ui/App.tsx` (the column takes the visible height while the tuner shows), `src/ui/main.tsx` (the `?fit` switch removed), `src/ui/global.css` (`.visible-height`), `src/ui/use-measured-size.ts`, `src/ui/TunerStave.tsx` (the card fits the column)
- Test: `tests/ui/scenarios/tuner-screen.test.tsx`; `tests/ui/scenarios/tuner-fit-variants.test.tsx` becomes plain tests of the rule or is removed

**Steps**
- [ ] 1. The flexing level as the only layout; the switch and the unchosen treatments deleted.
- [ ] 2. The "Can't hear" card sits inside the screen at 360 × 660 and 360 × 780.
- [ ] 3. Measured in a browser: no vertical or horizontal scroll at 360 × 660, 360 × 780, 390 × 844, in the listening, silent, target-pinned and cannot-hear states.

**Verify** — `pnpm check` → green; the measurement table in the report; `grep -rn "design-loop variant" src tests` → nothing.

### T033 · practice.tuner/REQ-002, practice.tuner/REQ-005 · The stave head agrees with the level in the hand-over band (converge W1)

> Appended 2026-09-29 by converge round 1 (`.sdd/reports/007-hear-me/converge.md` W1), fixed with the user's approval.

**Status:** done

**Files**
- Modify: `src/ui/TunerStave.tsx` (the head, its cents, its accidental, ledger lines and octave mark, and the trail's own points: on auto, place them from `reading.target`/`reading.cents` — the same hysteresis-held note and offset the level shows — not `reading.heard.nearest`/`reading.heard.cents`; with a target pinned, keep `heard.nearest`/`heard.cents` exactly as now, per REQ-005's "with a target, the note nearest the detected pitch")
- Test: `tests/ui/scenarios/tuner-stave.test.tsx`

**Steps**
- [ ] 1. Read `src/ui/TunerStave.tsx:127,371,378,384-391,444-445,503-504,803-828,856` (every place `.heard.nearest`/`.heard.cents` places the head, the trail or the accidental) and `src/ui/TunerLevel.tsx:242-250` (how the level already reads `reading.target`/`snapshot.targetNote`). Introduce one small helper — a local function is enough, this is presentation logic, not a domain rule — that picks, for a given `NoteJudged` and the current `targetNote` (`snapshot.targetNote`, non-null only when pinned): pinned → `{ note: judged.heard.nearest, cents: judged.heard.cents }`; auto → `{ note: judged.target, cents: judged.cents }`. Use it everywhere the file currently reads `X.heard.nearest`/`X.heard.cents` for placement — the live head, the lingering head (`heardStale`), the accidental block, the octave mark, the cents text, and every trail point (`newestTrailPoint.reading`, each `point.reading` in the trail's map) — so the head and its trail never show a note the level disagrees with.
- [ ] 2. Red, then green: settle on A4 (440 Hz, `hearSteady`), feed 454 Hz once (a jump past `SNAP_CENTS`, so the smoothed pitch snaps straight to 454 — no need to feed it more than once). At 454 Hz the raw nearest note is A♯4 at about −46 ¢, but the shown/hysteresis note is still A4 at +50 ¢ (56 ¢ hasn't been crossed) — assert the stave's head sits at A4's position (not A♯4's), draws no accidental, and its cents text and colour match the level's ("+50", the sharp/warm colour) — not the level's own test, the stave's.
- [ ] 3. Existing REQ-005 scenarios (S1–S6) all feed steady tones where the raw and hysteresis notes already agree, so none should need a changed expectation — confirm each still passes; if one's expected value needs to change, stop and report it rather than editing it to fit.

**Verify** — `pnpm check` → green; the new test passes and would fail against the old code (trace it, don't just assert).

### T034 · practice.tuner/REQ-002, practice.tuner/REQ-004 · The reading's tag never covers LISTENING / NO MIC past ±50 ¢ (converge W2)

> Appended 2026-09-29 by converge round 1 (converge.md W2), fixed with the user's approval.

**Status:** done

**Files**
- Modify: `src/ui/TunerLevel.tsx` (`readingGeometry`, `TAG_ABOVE_OFFSET`/`TAG_BELOW_OFFSET`/`LINE_CENTS_LIMIT`, lines 149–174)
- Test: wherever the level's existing pixel-placement tests live (`grep -rn "tagTop\|TAG_ABOVE_OFFSET" tests/ui` to find them; likely `tests/ui/scenarios/tuner-screen.test.tsx`)

**Steps**
- [ ] 1. The 4a design (`changes/007-hear-me/design/Tuner.dc.html:1292`) places the tag past ±50 ¢ (`over`, where the line is pinned to the edge) on the OPPOSITE side of the line from the normal rule — sharp-over: below the line (`lineTop + 36`, the same magnitude as today's `TAG_ABOVE_OFFSET`); flat-over: above the line (`lineTop − 58`, a new offset — name it `TAG_OVER_ABOVE_OFFSET = 58`) — so the tag never runs off the level's top or bottom edge. In the NOT-over case it additionally clamps the tag within the level's own height: `Math.max(30, Math.min(areaHeight − 62, tagTop))`. Since T032 made the level's height flexible (`levelGeometryFor`), scale these two clamp margins (30 and 62) by the same `ratio = areaHeight / AREA_HEIGHT` the rest of the geometry already uses, not as fixed pixels — read `levelGeometryFor` (around line 197) to match its pattern, and pass `areaHeight` into `readingGeometry` (it currently only takes `areaMid`/`pxPerCent`; `areaHeight` is `2 * areaMid`, or thread it through explicitly — your choice, say which).
- [ ] 2. Red, then green: at a reading of +54 ¢ sharp (over the ±50 line), the tag's top sits BELOW the line, not above it, and stays within the header's own bottom edge (below wherever LISTENING/NO MIC is drawn) at 360×660, 360×780 and 390×844; at −54 ¢ flat, the tag sits ABOVE the line. A non-over reading (e.g. +20 ¢) is unchanged from today.
- [ ] 3. Existing level tests at non-over readings must pass untouched.

**Verify** — `pnpm check` → green; measured in a browser at the three viewports (a throwaway Playwright script is fine, as earlier tasks used) that the tag never overlaps the header row.

### T035 · listening.pitch-detection/REQ-004 · The coalescing test cites the right scenario (converge W3)

> Appended 2026-09-29 by converge round 1 (converge.md W3), fixed with the user's approval.

**Status:** done

**Files**
- Modify: `tests/practice/scenarios/tuner-budget.test.ts` (the test at line 21, titled "listening.pitch-detection/REQ-004/S3 — a burst before the commit is coalesced to the newest": re-title it to cite `listening.pitch-detection/REQ-004/S1` — coalescing to the newest reading — instead of S3, which is "late is dropped". S3's own Then is already exercised by the test at line 6, titled for `practice.tuner/REQ-006/S2`; add the `listening.pitch-detection/REQ-004/S3` citation to THAT test's title alongside its existing one, since it is the test that actually proves a late detection is dropped.)

**Steps**
- [ ] 1. Rename both titles exactly as above; change no assertion, no stimulus, no expected value.

**Verify** — `pnpm check` → green; `./scripts/check-scenarios.sh --change changes/007-hear-me | grep "REQ-004"` shows S3 attributed to the line-6 test, S1 to the renamed line-21 test.

### T036 · practice.tuner/REQ-002 · The harness's shown-offset and cents-error gates cannot pass on zero readings (converge W4)

> Appended 2026-09-29 by converge round 1 (converge.md W4), fixed with the user's approval.

**Status:** done

**Files**
- Modify: `scripts/tuner-timing-test.mjs` (`measureTone`, lines ~383–425; `sweepRow`, lines ~632–652)

**Steps**
- [ ] 1. In `measureTone`, add two counters (`centsErrReadings`, `shownErrReadings`) incremented alongside each existing `if` that updates `maxCentsErr`/`maxShownCentsErr`; return them in the tone's result object.
- [ ] 2. In `sweepRow`, add to `passed`: every tone in `perTone` has `centsErrReadings > 0` and `shownErrReadings > 0`. On a failure from this, the printed reason should say which tone took no qualifying reading, not just restate the numeric gate.
- [ ] 3. Run `APP_URL=https://localhost:5173 pnpm test:tuner` against the running `pnpm dev:phone` server (do not stop or restart it) and confirm it still PASSES with the new counters non-zero throughout — paste the table.

**Verify** — the harness still PASSES on the real build; `pnpm check` → green (the harness itself is not part of `pnpm check`, but nothing else may break).

### T037 · practice.tuner/REQ-002 · `NoteJudged` gets a Zod schema, schema-first as `docs/domain.md` requires (converge W5)

> Appended 2026-09-29 by converge round 1 (converge.md W5), fixed with the user's approval.

**Status:** done

**Files**
- Modify: `src/practice/published/note-judged.schema.ts` (add `noteJudgedSchema`, following `src/practice/published/target-advanced.schema.ts`'s pattern exactly — a `noteSchema` for the nested `Note`, reused or duplicated the same way; `satisfies z.ZodType<NoteJudged>` so the schema and the interface cannot drift; rewrite the file's own comment, which currently argues NoteJudged should NOT be a Zod object — that reasoning is superseded by `docs/domain.md`'s "Events" table, which already names this file as `NoteJudged`'s schema)
- Modify: `src/practice/published/index.ts` only if the schema needs exporting (check whether the sibling `targetAdvancedSchema` is exported there — mirror whatever it does)

**Steps**
- [ ] 1. Add the schema; do not add a `.parse()` call anywhere in production code — like `targetAdvancedSchema`, it exists as the documented contract, not as active parsing of an in-process value (unchanged: `NoteJudged` still never crosses a boundary that needs parsing).
- [ ] 2. A schema test the same shape existing schema tests take (find one for `targetAdvancedSchema` or `pitchDetectedSchema` and follow it) — a valid `NoteJudged` parses; an invalid one (e.g. a non-integer octave) fails.

**Verify** — `pnpm check` → green.

### T038 · practice.tuner/REQ-003 · The "<note> IS" caption lingers and fades with "HEARD" (delta amendment at converge, S4/S6)

> Appended 2026-09-29 by converge round 1 (converge.md I6); `practice.tuner/REQ-003` S4 and S6 reworded with the user's approval.

**Status:** done

**Files**
- Modify: `src/ui/TunerStave.tsx` (`referenceNoteOf`, line ~305: take `effectiveReading` — the live-or-lingering reading already computed at line 349 — in place of `reading`, so the caption lingers whenever the head does; the "<note> IS" block, lines ~930–953: give it the same stale `data-state`/`aria-hidden` attributes the "HEARD" block already carries, and grey its colour — `paper.faint` while stale, `paper.inkMid` live — instead of the fixed `paper.inkMid` it uses now)
- Test: `tests/ui/scenarios/tuner-linger.test.tsx` (or wherever REQ-003/S4, S6 already live — extend those, do not duplicate)

**Steps**
- [ ] 1. Red, then green: settle on A4, hear it, stop; 500 ms into the linger `reference-hz` still reads "440.0" with `data-state="fading"`; once the linger has fully gone, it reads "—" and the caption reads "— IS".
- [ ] 2. REQ-003/S2 (silence with a target pinned, nothing ever heard) is unaffected — the caption still shows the target's name and Hz at once, since `effectiveReading` is null there too and the fallback to `targetNote` is unchanged.

**Verify** — `pnpm check` → green; `check-scenarios.sh` shows REQ-003/S4, S6 tested with the reworded Then.

### T039 · — · One hard-coded colour in 007's own files matches an existing token (converge W7, narrowed)

> Appended 2026-09-29 by converge round 1 (converge.md W7). The other colours converge flagged (`#e0d7c5`, `#756c60`, `#5e564c`, `#b0a797`, the `rgba(138,75,42,…)` pair) predate 007 and are already used the same way across many other screens (`CircleOfFifths.tsx`, `DronePill.tsx`, `DroneSheet.tsx`, `KeyPanel.tsx`, `overlay.tsx`, `ScaleRow.tsx`, `TransportCard.tsx`, `TraversalSheet.tsx`, and more) — a repo-wide token-promotion exercise outside this change's scope, deferred (see `## Deferred`), not fixed here.

**Status:** done

**Files**
- Modify: `src/ui/TargetSheet.tsx` (`HOLD_CARD_BORDER_OFF = "#ece4d5"` → `paper.hairlineSoft`, byte-identical already)

**Steps**
- [ ] 1. Replace the literal with the token; import `paper` if not already imported in this file (it is, for `paper.ink`).

**Verify** — `pnpm check` → green; `grep -n "ece4d5" src/ui/TargetSheet.tsx` → nothing.

### T025 · — · Converge

**Status:** todo

**Steps**
- [ ] 1. `pnpm check` green, `pnpm test:timing` PASS, `pnpm test:tuner` PASS, `./scripts/check-contexts.sh` clean, `./scripts/check-design.sh --change changes/007-hear-me` clean; then invoke `sdd-converge`. Before converge, the refinement loop (`sdd-design` D) runs on the live tuner with the user.

**Verify** — the convergence report under `.sdd/reports/007-hear-me/`.

## Coverage

> Every `REQ-` in the spec appears at least once. Every task cites a
> requirement or sits in Foundations / Hardening.

| Requirement | Tasks | Covered |
|---|---|---|
| listening.pitch-detection/REQ-001 | T003 | ✅ |
| listening.pitch-detection/REQ-002 | T001, T021, T022 | ✅ |
| listening.pitch-detection/REQ-003 | T001, T002, T021 | ✅ |
| listening.pitch-detection/REQ-004 | T002, T010, T021 | ✅ |
| listening.pitch-detection/REQ-005 | T012 | ✅ |
| listening.pitch-detection/REQ-006 | T003 | ✅ |
| practice.tuner/REQ-001 | T007, T013, T014 | ✅ |
| practice.tuner/REQ-002 | T006, T008, T015, T018, T026, T027, T032, T033, T034, T036, T037 | ✅ |
| practice.tuner/REQ-003 | T008, T015, T031, T038 | ✅ |
| practice.tuner/REQ-004 | T006, T009, T017, T028, T034 | ✅ |
| practice.tuner/REQ-005 | T016, T029, T030, T033 | ✅ |
| practice.tuner/REQ-006 | T010, T019, T021, T024 | ✅ |
| practice.tuner/REQ-007 | T011, T018 | ✅ |
| practice.tuner/REQ-008 | T012 | ✅ |
| practice.tuner/REQ-009 | T009, T018, T028 | ✅ |
| theory.temperament/REQ-002 | T004 | ✅ |

Scenario → task: listening REQ-001/S1–S3 T003; REQ-002/S1–S5 T001 (S5 also T021); REQ-003/S1, S2, S4 T001, S3 T002; REQ-004/S1, S2 T021, S3 T002 + T010; REQ-005/S1–S2 T012; REQ-006/S1–S3 T003. practice.tuner REQ-001/S1, S2, S4 T007, S3 T013; REQ-002/S1–S5 T008 (S1, S2, S5 also T015/T018), S6–S8 T026, S9 T027; REQ-003/S1–S3 T008 (S1 also T015), S4–S6 T031; REQ-004/S1–S6 T009 (S1, S2, S4–S6 also T017), S7–S8 T028; REQ-005/S1–S4 T016, S5–S6 T029; REQ-006/S1 T021, S2 T010, S3 T024; REQ-007/S1–S3 T011 (also T018); REQ-008/S1–S2 T012; REQ-009/S1 T018, S2 T009, S3 T028. theory.temperament REQ-002/S1–S5 T004.

## Interface consistency

> Signatures a later task *consumes* match what an earlier task *produces*,
> character for character. List each pair.

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `pub fn detect(window: &[f32], sample_rate: f32) -> Option<Detection>` | T002 |
| T002 | `push(now_frame: f64) -> u32`, `input_ptr() -> *mut f32`, `result_ptr() -> *const f64`, `init(sample_rate: f32)` | T003 (the shim) |
| T003 | `createListener(context: AudioContext, mediaDevices?: MediaDevices): Promise<ListenerOutcome>`; `type PitchDetected`, `ListeningUnavailable`, `ListeningEnded` | T005, T006 |
| T004 | `nearestNoteOf(hz: number, spelling: SpellingPreference): { readonly note: Note; readonly cents: number }`; `noteAtPosition(position: number, spelling: SpellingPreference): Note` | T006, T009, T015, T017 |
| T005 | `interface ListeningPort`; `class FakeListening` (`feed`, `end`, `failWith`, `frame`, `startCalls`, `stopCalls`, `listening`); `FakeVisibility.show()`; `SessionDeps.listening` | T007–T012, T014–T019 |
| T006 | `judge(pitch, target, shown, spelling): { judged, shown }`; `nearestWithHandover`; `canStepTarget`; `semitoneCountOf`; `TunerSnapshot`; `TunerTarget`; `NoteJudged`; the five constants | T007–T010, T015–T017 |
| T007 | `Session.enterTuner(): void`, `leaveTuner(): void`, `onNoteJudged(listener): () => void`; `SessionContext.spelling`; `SessionSnapshot.tuner` | T008–T019 |
| T009 | `Session.holdTarget(): void`, `pinTarget(position: number): void`, `stepTarget(delta: -1 \| 1): void`, `clearTarget(): void` | T016, T017 |
| T010 | `Session.readingShown(atFrame: number): number` | T019 |
| T014 | `TunerScreen(props)`; `Header.onOpenTuner`; `theme.tuner`; `window.__listening` | T015–T019, T021 |
| T019 | `App.onPaintAge`; `window.__paintAgesMs` | T021 |

## Deferred

- A 1024 hop / sparser lag grid / ×2 downsampling — only if T001's cost or T021's budget demands it (the plan's ordered knobs); not built speculatively (Article VIII).
- The spiral's hover state ("TAP FOR" + the note) — rendered as the design draws it but not asserted: the phone never hovers.
- Chromium's file-based fake microphone — the fallback route for T021 if the in-page override cannot be attached; not built unless needed.
- Tablet / laptop layouts of the tuner — design §2 "later".
- **Converge W6** (`.sdd/reports/007-hear-me/converge.md`): the consumed `PitchDetected` shape appears directly in practice's domain code (`domain/tuner.ts`, `domain/session.ts`) rather than translated at the `ListeningPort` adapter. Accepted by the user as this repo's established reading — `sound`'s events have crossed the same way since 003, and `check-contexts.sh` is clean. To be raised as a `docs/engineering.md` §6 question (whether a port signature may carry the upstream context's own published event type) via `sdd-engineering` › Refine, in a later session — not built here.
- **Converge W7, the rest** (`.sdd/reports/007-hear-me/converge.md`): `#e0d7c5`, `#756c60`, `#5e564c`, `#b0a797` and the `rgba(138,75,42,…)` pair are pre-existing, repo-wide unpromoted literals (present since 001–006, in `CircleOfFifths.tsx`, `DronePill.tsx`, `DroneSheet.tsx`, `KeyPanel.tsx`, `overlay.tsx`, `ScaleRow.tsx`, `TransportCard.tsx`, `TraversalSheet.tsx` and others), not introduced by 007 — `check-design.sh` only scans `.css`, so it never caught any of them, in this change or any earlier one. Promoting them is a repo-wide token exercise, not proportionate to this slice; T039 fixes the one exact-token match in 007's own file. The tooling gap (`check-design.sh` should scan `.tsx` literals too) is proposed via `sdd-engineering` › Refine alongside W6, not built here.
