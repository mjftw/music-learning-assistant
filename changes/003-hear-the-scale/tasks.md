---
type: Task List
title: Hear the scale — tasks
description: 20 tasks across 6 phases — Rust sound engine spike, theory traversal and pitch, practice transport and session, sound adapters, UI from the prototype, hardening and measured timing
resource: /changes/003-hear-the-scale/tasks.md
status: stable
tags: [sdd, tasks, "change:003-hear-the-scale"]
sources:
  - resource: /changes/003-hear-the-scale/plan.md
  - resource: /changes/003-hear-the-scale/proposal.md
  - resource: /changes/003-hear-the-scale/design/hear-the-scale.dc.html
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T18:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:27:31Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_phase: in-progress
---

# Tasks: Hear the scale

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
> Requirement and scenario IDs are qualified: `<context>.<capability>/REQ-NNN`.
> The brief pulls each cited requirement from the target state.
>
> **The design reference** is `changes/003-hear-the-scale/design/hear-the-scale.dc.html`
> (line numbers below refer to it). It wins on every visual and interaction
> divergence; colours already live in `src/ui/theme.ts` (`paper.*`, `fonts.*`).
> Test helpers shared across theory tests: `variantById(id)`, `major(letter,
> accidental?)`, `label(note)` as in `tests/theory/scenarios/span.test.ts:8-17`
> (copy the three helpers into a new test file; they are five lines).

## Phase 1 — Foundations

_Rust workspace, the sound engine loaded in an AudioWorklet, one audible sine on the phone._

### T001 · — · Rust workspace, `sound` crate skeleton, build script, `pnpm check` gains cargo

**Status:** done

**Files**
- Create: `Cargo.toml`, `src/sound/Cargo.toml`, `src/sound/src/lib.rs`, `scripts/build-sound.sh`
- Modify: `package.json` (scripts, devDependency), `.gitignore`, `.prettierignore`
- Test: `src/sound/src/lib.rs` (`#[cfg(test)] mod tests`)

**Interfaces**
- Produces (Rust, `extern "C"`, all `#[no_mangle]`):
  ```rust
  pub extern "C" fn init(sample_rate: f32)
  pub extern "C" fn output_ptr() -> *const f32        // 128 f32 frames, mono
  pub extern "C" fn render(now_frame: f64) -> u32      // fills the output buffer for frames [now_frame, now_frame+128); returns onset reports written (0 in this task)
  ```
- Produces: `scripts/build-sound.sh` — `cargo build --release --target wasm32-unknown-unknown -p sound` then copies `target/wasm32-unknown-unknown/release/sound.wasm` to `src/sound/pkg/sound.wasm`; exits 2 with `install rustup and run: rustup target add wasm32-unknown-unknown` if `cargo` or the target is missing
- Produces: `package.json` scripts — `"check": "prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test"`, `"build:sound": "./scripts/build-sound.sh"`, `"predev": "pnpm build:sound"`, `"prebuild": "pnpm build:sound"`, `"pretest": "pnpm build:sound"`, `"test:timing": "node scripts/timing-test.mjs"` (script file lands in T018)

**Steps**
- [ ] 1. Root `Cargo.toml`: `[workspace] members = ["src/sound"] resolver = "2"`. `src/sound/Cargo.toml`: `[package] name = "sound" version = "0.1.0" edition = "2021"`, `[lib] crate-type = ["cdylib", "rlib"]`, `[dependencies]` empty, `[profile.release] panic = "abort" opt-level = "s" lto = true`. Add `target/` and `src/sound/pkg/` to `.gitignore`; add `target/`, `src/sound/pkg/`, `Cargo.lock` to `.prettierignore`
- [ ] 2. RED — in `lib.rs` a test `render_fills_128_frames_of_silence_before_any_voice`: `init(48000.0); let n = render(0.0); assert_eq!(n, 0); let out = unsafe { std::slice::from_raw_parts(output_ptr(), 128) }; assert!(out.iter().all(|s| *s == 0.0));` — run `cargo test -p sound` → expect FAIL: `cannot find function `init``
- [ ] 3. GREEN — a `static mut ENGINE: Engine` behind a `fn engine() -> &'static mut Engine` (documented: single audio thread, no concurrent access) holding `sample_rate: f32` and `output: [f32; 128]`; `render` zeroes the buffer and returns 0. `cargo test -p sound` → PASS
- [ ] 4. Write `scripts/build-sound.sh` as in Interfaces (`set -euo pipefail`; check `command -v cargo` and `rustup target list --installed | grep -q wasm32-unknown-unknown`); `chmod +x`. Run it → `src/sound/pkg/sound.wasm` exists (< 20 kB)
- [ ] 5. `pnpm add -D @types/audioworklet`; add `"types": ["vite/client", "@types/audioworklet"]`? — no: add `/// <reference types="@types/audioworklet" />` at the top of the processor file in T002 instead, so the DOM lib and the worklet lib do not collide project-wide. Update `package.json` scripts exactly as in Interfaces
- [ ] 6. Run `pnpm check` — expect green including `cargo fmt --check`, clippy with zero warnings, `test result: ok. 1 passed`

**Verify** — `pnpm check` → exit 0 and the cargo section prints `test result: ok. 1 passed`; `ls -la src/sound/pkg/sound.wasm` → present; `git status --short | grep -c 'target/\|pkg/'` → `0`

### T002 · — · Sound engine host shim + one audible sine on the phone (the spike)

**Status:** done

**Files**
- Create: `src/sound/published/sound-command.schema.ts`, `src/sound/published/processor.ts`, `src/sound/published/index.ts`
- Modify: `src/sound/src/lib.rs` (add `push_tone`, tone as a plain sine for now), `src/ui/main.tsx` (spike button behind `?sound-spike`, removed in T019)
- Test: `src/sound/src/lib.rs` tests

**Interfaces**
- Produces (`sound-command.schema.ts`, Zod 4):
  ```ts
  export const soundCommandSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("tone"), tag: z.number().int().nonnegative(), hz: z.number().positive(), onsetFrame: z.number().nonnegative(), durationFrames: z.number().int().positive() }),
    z.object({ kind: z.literal("click"), tag: z.number().int().nonnegative(), accent: z.boolean(), onsetFrame: z.number().nonnegative() }),
    z.object({ kind: z.literal("stopAll") }),
  ]);
  export type SoundCommand = z.infer<typeof soundCommandSchema>;
  export const onsetReportSchema = z.object({ tag: z.number().int().nonnegative(), onsetFrame: z.number().nonnegative(), actualFrame: z.number().nonnegative() });
  export type OnsetReport = z.infer<typeof onsetReportSchema>;
  export type SoundUnavailable = { readonly reason: "no-audio-context" | "worklet-failed" | "wasm-failed"; readonly detail: string };
  ```
- Produces (`index.ts`):
  ```ts
  export interface SoundEngine { readonly sampleRate: number; currentFrame(): number; post(command: SoundCommand): void; onOnset(listener: (report: OnsetReport) => void): () => void; dispose(): void }
  export type SoundEngineOutcome = { readonly ok: true; readonly engine: SoundEngine } | { readonly ok: false; readonly error: SoundUnavailable };
  export function createSoundEngine(context: AudioContext): Promise<SoundEngineOutcome>
  ```
- Produces (Rust): `pub extern "C" fn push_tone(tag: u32, hz: f32, onset_frame: f64, duration_frames: u32) -> u32` — 1 = queued, 0 = queue full (64 voices)

**Steps**
- [ ] 1. RED (Rust) — test `a_tone_starts_exactly_at_its_onset_frame`: `init(48000.0); push_tone(7, 440.0, 200.0, 4800); render(0.0)` → output all zero; `render(128.0)` → frames 0..71 zero, frame 72 onward non-zero (200 − 128 = 72). Run `cargo test -p sound` → FAIL: `cannot find function `push_tone``
- [ ] 2. GREEN — `Voice { tag, kind: Tone { hz, phase }, onset_frame: f64, duration_frames: u32 }` in a fixed `[Option<Voice>; 64]`; `render` sums each active voice's plain sine (`sin(2π·hz·t)` × 0.25) for frames ≥ onset; voices past onset+duration are cleared. `cargo test -p sound` → PASS
- [ ] 3. `processor.ts` (first line `/// <reference types="@types/audioworklet" />`): `class SoundProcessor extends AudioWorkletProcessor` — constructor receives `processorOptions.module: WebAssembly.Module`, instantiates it synchronously (`new WebAssembly.Instance(module, {})`), calls `init(sampleRate)`; `port.onmessage` validates with `soundCommandSchema.safeParse` and calls `push_tone`/`stop_all`(T010)/ignores invalid with `port.postMessage({ type: "invalid", detail })`; `process(_, outputs)` calls `render(currentFrame)` and copies 128 floats from `output_ptr()` into `outputs[0][0]`; `registerProcessor("sound", SoundProcessor)`
- [ ] 4. `index.ts`: `import processorUrl from "./processor.ts?worker&url"`, `import wasmUrl from "../pkg/sound.wasm?url"`; `createSoundEngine`: `WebAssembly.compileStreaming(fetch(wasmUrl))` (catch → `{ ok: false, error: { reason: "wasm-failed", detail } }`), `context.audioWorklet.addModule(processorUrl)` (catch → `worklet-failed`), `new AudioWorkletNode(context, "sound", { processorOptions: { module }, outputChannelCount: [1] })` connected to `context.destination`; `currentFrame = () => Math.round(context.currentTime * context.sampleRate)`; `onOnset` fans out `port` messages of `type: "onset"` (empty until T010)
- [ ] 5. Spike in `src/ui/main.tsx`: `if (location.search === "?sound-spike")` render a single `<button>` "A4 for one second" that creates an `AudioContext`, awaits `createSoundEngine`, posts `{ kind: "tone", tag: 1, hz: 440, onsetFrame: engine.currentFrame() + 4800, durationFrames: 48000 }`, and writes the outcome into the button text (`ok` / the `reason`). Comment: `// T002 spike — removed in T019`
- [ ] 6. `pnpm dev --host`; open `http://<laptop-ip>:5173/?sound-spike` on the phone and on the laptop; tap → a one-second A4. Record device, browser and result in `changes/003-hear-the-scale/notes.md` under `## Spike`. **If the phone fails: STOP and report `blocked` — the plan's fallback decision is the user's.**
- [ ] 7. `pnpm check` → green

**Verify** — `pnpm check` → exit 0; `notes.md › Spike` records phone + laptop results with browser versions; on the laptop `?sound-spike` button text reads `ok` after the tap

## Phase 2 — Theory: the traversal and the pitch

### T003 [P] · theory.circle-of-fifths/REQ-012 (S2, S3) · Fitting octave counts and the run

**Status:** done

**Files**
- Create: `src/theory/domain/traversal.ts`, `src/theory/domain/labels.ts`
- Modify: `src/theory/published/index.ts` (export the new module; keep span exports until T013), `src/ui/key-label.ts` (re-export `pitchClassLabel`, `noteLabel` from `../theory/published` instead of defining them)
- Test: `tests/theory/scenarios/traversal-run.test.ts`

**Interfaces**
- Produces (`traversal.ts`):
  ```ts
  export type Direction = "up" | "down" | "updown";
  export type Shape = "scale" | "arpeggio";
  export type OctaveCount = 1 | 2 | 3 | 4;
  export type Octaves = { readonly kind: "full" } | { readonly kind: "count"; readonly count: OctaveCount };
  export interface Traversal { readonly direction: Direction; readonly octaves: Octaves; readonly shape: Shape }
  export function fittingOctaveCounts(key: Key, variant: Variant): readonly OctaveCount[]
  export function runOf(key: Key, variant: Variant, traversal: Traversal): readonly KeyViewNote[]   // count that does not fit → the largest that fits, else full
  export function effectiveOctavesOf(key: Key, variant: Variant, octaves: Octaves): Octaves         // the clamp REQ-001 of practice.session relies on
  ```
- Produces (`labels.ts`, moved verbatim from `src/ui/key-label.ts:9-33`): `export function pitchClassLabel(pitchClass: PitchClass): string`, `export function noteLabel(note: Note): string`

**Steps**
- [ ] 1. RED — theory.circle-of-fifths/REQ-012/S2:
  ```ts
  test("theory.circle-of-fifths/REQ-012/S2 — which counts fit", () => {
    const flute = variantById("flute-concert");
    expect(fittingOctaveCounts(major("C"), flute)).toEqual([1, 2, 3]);
    expect(fittingOctaveCounts(major("G"), flute)).toEqual([1, 2]);
    expect(fittingOctaveCounts(major("F", "sharp"), variantById("ocarina-bass-c"))).toEqual([]);
  });
  ```
  Run `pnpm vitest run tests/theory/scenarios/traversal-run.test.ts` → FAIL: `fittingOctaveCounts is not a function`
- [ ] 2. GREEN — port `lowestTonicIndexFor` from `span.ts:19-30` into `traversal.ts` (private); `fittingOctaveCounts` filters `[1,2,3,4]`; `effectiveOctavesOf` returns the input when it fits, else `{kind:"count", count: max fitting}`, else `{kind:"full"}`; `runOf` for `count` slices `7n+1` from the lowest fitting tonic, for `full` returns `keyView(...).notes`, then for `shape === "arpeggio"` keeps notes whose degree (index of the pitch class in `scaleNotesOf(key)`) is 0, 2 or 4. → PASS
- [ ] 3. RED — REQ-012/S3:
  ```ts
  test("theory.circle-of-fifths/REQ-012/S3 — an arpeggio keeps the chord tones wherever they fall", () => {
    const flute = variantById("flute-concert");
    const full = runOf(major("G"), flute, { direction: "up", octaves: { kind: "full" }, shape: "arpeggio" });
    expect(full.map((n) => label(n.note))).toEqual(["D4", "G4", "B4", "D5", "G5", "B5", "D6", "G6", "B6"]);
    const one = runOf(major("G"), flute, { direction: "up", octaves: { kind: "count", count: 1 }, shape: "arpeggio" });
    expect(one.map((n) => label(n.note))).toEqual(["G4", "B4", "D5", "G5"]);
  });
  ```
  → PASS already if step 2 is right; if not, fix until PASS
- [ ] 4. RED — the clamp (REQ-012 sentence, "falls back"): `expect(runOf(major("C"), variantById("ocarina-alto-c"), { direction: "up", octaves: { kind: "count", count: 3 }, shape: "scale" }).map((n) => label(n.note))).toEqual(["C5","D5","E5","F5","G5","A5","B5","C6"]); expect(effectiveOctavesOf(major("C"), variantById("ocarina-alto-c"), { kind: "count", count: 3 })).toEqual({ kind: "count", count: 1 })` → PASS
- [ ] 5. Create `labels.ts` by moving the two functions; `key-label.ts` becomes `export { pitchClassLabel, noteLabel } from "../theory/published";` plus its own `keyLabel`, `wedgeLabel` unchanged. Export everything new from `published/index.ts`
- [ ] 6. `pnpm check` → green (the UI tests still pass through the re-export)

**Verify** — `pnpm vitest run tests/theory/scenarios/traversal-run.test.ts` → 3 passed; `pnpm check` → exit 0

### T004 [P] · theory.circle-of-fifths/REQ-012 (S1, S4, S5) · The sequence and its range invariant

**Status:** done

**Files**
- Modify: `src/theory/domain/traversal.ts`, `src/theory/published/index.ts`
- Test: `tests/theory/scenarios/traversal-sequence.test.ts`, `tests/theory/invariants/sequence-range.test.ts`

**Interfaces**
- Consumes: `runOf(key: Key, variant: Variant, traversal: Traversal): readonly KeyViewNote[]`, `fittingOctaveCounts(key: Key, variant: Variant): readonly OctaveCount[]`
- Produces:
  ```ts
  export interface SequenceNote { readonly note: Note; readonly isRoot: boolean; readonly runIndex: number }
  export function sequenceOf(run: readonly KeyViewNote[], direction: Direction): readonly SequenceNote[]   // up: as is; down: reversed; updown: up then down without repeating the top (2n−1)
  ```

**Steps**
- [ ] 1. RED — REQ-012/S1:
  ```ts
  test("theory.circle-of-fifths/REQ-012/S1 — two octaves of G major on the flute", () => {
    const run = runOf(major("G"), variantById("flute-concert"), { direction: "updown", octaves: { kind: "count", count: 2 }, shape: "scale" });
    expect(run.map((n) => label(n.note))).toEqual(["G4","A4","B4","C5","D5","E5","F#5","G5","A5","B5","C6","D6","E6","F#6","G6"]);
    const seq = sequenceOf(run, "updown").map((n) => label(n.note));
    expect(seq).toHaveLength(29);
    expect(seq).toEqual([...seq].reverse());
    expect(seq[0]).toBe("G4"); expect(seq[14]).toBe("G6"); expect(seq[28]).toBe("G4");
  });
  ```
  Run → FAIL: `sequenceOf is not a function`
- [ ] 2. GREEN — implement `sequenceOf` with `runIndex` = index into `run` → PASS
- [ ] 3. RED — REQ-012/S4: `expect(sequenceOf(run, "down").map((n) => label(n.note))).toEqual([...up].reverse())` and length 15 → PASS
- [ ] 4. RED — REQ-012/S5 invariant, `tests/theory/invariants/sequence-range.test.ts`: enumerate every variant of `builtInCatalogue()`, every key from `circleOfFifths()` positions in both spellings and both modes (30 keys — reuse the enumeration in `tests/theory/invariants/range-safety.test.ts`), every `fittingOctaveCounts` count plus `full`, both shapes, three directions; assert every `sequenceOf(runOf(...)).note` has `pitchPosition` within `[lowest, highest]`, and for `arpeggio` every note's pitch class is in `scaleNotesOf(key)` → PASS (report the enumeration count in the test name's console line: `expect(count).toBeGreaterThan(1000)`)
- [ ] 5. `pnpm check` → green

**Verify** — `pnpm vitest run tests/theory` → all passed incl. the two new files; `pnpm check` → exit 0

### T005 [P] · theory.temperament/REQ-001 (S1, S2, S3) · Every note has a pitch

**Status:** done

**Files**
- Create: `src/theory/domain/temperament.ts`
- Modify: `src/theory/published/index.ts`
- Test: `tests/theory/scenarios/temperament.test.ts`

**Interfaces**
- Produces: `export function pitchHzOf(note: Note): number` — `440 · 2^((pitchPosition(note) − 69) / 12)`; `export const REFERENCE_A4_HZ = 440`

**Steps**
- [ ] 1. RED — REQ-001/S1: `expect(pitchHzOf({ letter: "A", accidental: "natural", octave: 4 })).toBeCloseTo(440, 2); …A5 → 880; C4 → 261.63; F♯5 → 739.99` (`toBeCloseTo(x, 2)`). Run → FAIL: `pitchHzOf is not a function`
- [ ] 2. GREEN — implement → PASS
- [ ] 3. RED — REQ-001/S2: `expect(pitchHzOf(F♯4)).toBe(pitchHzOf(G♭4)); expect(pitchHzOf(E♯5)).toBe(pitchHzOf(F5))` → PASS
- [ ] 4. RED — REQ-001/S3: for every variant in `builtInCatalogue()`, for every semitone position from `pitchPosition(range.lowest)` to `pitchPosition(range.highest)` build a natural/sharp note at that position and assert `pitchHzOf > 0` and strictly greater than the previous → PASS
- [ ] 5. Export from `published/index.ts`; `pnpm check` → green

**Verify** — `pnpm vitest run tests/theory/scenarios/temperament.test.ts` → 3 passed; `pnpm check` → exit 0

## Phase 3 — Practice: the transport, pure

### T006 [P] · practice.session/REQ-004 (S1, S2, S3), REQ-001 (S2) · Tempo terms and the summary line

**Status:** done

**Files**
- Create: `src/practice/domain/tempo.ts`, `src/practice/domain/settings.ts`, `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/tempo.test.ts`, `tests/practice/scenarios/summary-line.test.ts`

**Interfaces**
- Consumes: `Traversal`, `Octaves` from `src/theory/published`
- Produces (`tempo.ts`):
  ```ts
  export interface TempoTerm { readonly name: string; readonly fromBpm: number; readonly toBpm: number; readonly gloss: string }
  export const TEMPO_TERMS: readonly TempoTerm[]   // Largo 40–59 "broadly"; Larghetto 60–65 "rather broadly"; Adagio 66–75 "slowly, at ease"; Andante 76–107 "walking pace"; Moderato 108–119 "moderately"; Allegro 120–155 "fast, cheerful"; Vivace 156–175 "lively"; Presto 176–200 "very fast"
  export const TEMPO_MIN_BPM = 40; export const TEMPO_MAX_BPM = 200; export const TEMPO_STEP_BPM = 2;
  export function tempoTermFor(bpm: number): TempoTerm
  export function steppedTempo(bpm: number, delta: -2 | 2): number        // clamped to [40, 200]
  export function tempoForTerm(term: TempoTerm): number                   // Math.round((fromBpm + toBpm) / 2)
  ```
- Produces (`settings.ts`):
  ```ts
  export type NoteLength = "crotchet" | "quaver";
  export type SoundMode = "notes" | "both" | "metronome";
  export interface SessionSettings { readonly noteLength: NoteLength; readonly soundMode: SoundMode; readonly loop: boolean; readonly countIn: boolean; readonly restBar: boolean; readonly tempoBpm: number }
  export const defaultSessionSettings: SessionSettings   // crotchet, both, true, true, false, 96
  export const defaultTraversal: Traversal               // { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" }
  export function summaryLineOf(traversal: Traversal, effectiveOctaves: Octaves, settings: SessionSettings): string
  // "↑↓ · 2 oct · scale · ♩ · loop" — direction ↑ ↓ ↑↓; "N oct" | "full range"; shape word, or "click only" when soundMode is metronome; ♩ | ♪; "loop" | "once"
  ```
- Produces: `published/index.ts` re-exporting all of the above

**Steps**
- [ ] 1. RED — REQ-004/S1: `expect(tempoTermFor(106).name).toBe("Andante"); expect(steppedTempo(106, 2)).toBe(108); expect(tempoTermFor(108).name).toBe("Moderato"); expect(steppedTempo(108, -2)).toBe(106)`. Run `pnpm vitest run tests/practice/scenarios/tempo.test.ts` → FAIL: `Cannot find module '../../../src/practice/published'`
- [ ] 2. GREEN — `tempo.ts` + `published/index.ts` → PASS
- [ ] 3. RED — REQ-004/S2: `expect(tempoForTerm(TEMPO_TERMS.find((t) => t.name === "Allegro")!)).toBe(138)`; REQ-004/S3: `expect(steppedTempo(200, 2)).toBe(200); expect(tempoTermFor(200).name).toBe("Presto"); expect(steppedTempo(40, -2)).toBe(40); expect(tempoTermFor(40).name).toBe("Largo")` → PASS
- [ ] 4. Property (REQ-004 sentence): bands contiguous — `for (let bpm = 40; bpm <= 200; bpm += 1) expect(TEMPO_TERMS.filter((t) => bpm >= t.fromBpm && bpm <= t.toBpm)).toHaveLength(1)` → PASS
- [ ] 5. RED — REQ-001/S2 in `summary-line.test.ts`: `summaryLineOf({ direction: "updown", octaves: { kind: "count", count: 2 }, shape: "scale" }, { kind: "count", count: 2 }, defaultSessionSettings)` → `"↑↓ · 2 oct · scale · ♩ · loop"`; with `octaves {kind:"full"}`, `soundMode: "metronome"`, `loop: false` → `"↑↓ · full range · click only · ♩ · once"` → FAIL then GREEN
- [ ] 6. `pnpm check` → green

**Verify** — `pnpm vitest run tests/practice` → 5 passed; `pnpm check` → exit 0

### T007 · practice.session/REQ-003 (S1, S2, S3), REQ-005 (S1, S2, S3), REQ-004 (S4) · The transport state machine

**Status:** done

**Files**
- Create: `src/practice/domain/transport.ts`
- Modify: `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/transport.test.ts`

**Interfaces**
- Consumes: `SessionSettings` from `src/practice/domain/settings.ts`
- Produces:
  ```ts
  export type BeatsLeft = 1 | 2 | 3 | 4;
  export type TransportState =
    | { readonly kind: "idle" }
    | { readonly kind: "countingIn"; readonly beatsLeft: BeatsLeft }
    | { readonly kind: "playing"; readonly position: number }     // 0-based into the sequence
    | { readonly kind: "resting"; readonly beatsLeft: BeatsLeft };
  export interface Tick {
    readonly click: { readonly accent: boolean } | null;   // what sounds at this state's onset
    readonly tonePosition: number | null;                  // sequence position whose tone sounds, else null
    readonly durationBeats: 1 | 0.5;                        // until the next tick
  }
  export function startTransport(settings: SessionSettings): TransportState   // countIn ? countingIn 4 : playing 0
  export function tickOf(state: TransportState, settings: SessionSettings): Tick
  export function advance(state: TransportState, settings: SessionSettings, sequenceLength: number): TransportState
  ```
  Rules: `countingIn`/`resting` ticks always click (accent when `beatsLeft === 4`), `durationBeats: 1`, no tone. `playing` ticks: tone at `position` unless `soundMode === "metronome"`; click when `soundMode !== "notes"` and (`noteLength === "crotchet"` or `position % 2 === 0`), never accented; `durationBeats` 1 for crotchet, 0.5 for quaver. `advance`: countingIn n>1 → n−1, countingIn 1 → playing 0; playing p → p+1 while p+1 < length; at the end: loop ? (restBar ? resting 4 : playing 0) : idle; resting n>1 → n−1; resting 1 → playing 0. `idle` → `idle`.

**Steps**
- [ ] 1. RED — REQ-003/S1: `let s = startTransport({ ...defaultSessionSettings, soundMode: "notes", tempoBpm: 120 }); const ticks = []; for (let i = 0; i < 5; i++) { ticks.push(tickOf(s, settings)); s = advance(s, settings, 29); }` → `ticks.slice(0,4).map(t => t.click)` equals `[{accent:true},{accent:false},{accent:false},{accent:false}]`, all four `tonePosition === null`, `ticks[4]` has `tonePosition 0` and `click null` (notes mode). Run → FAIL: `startTransport is not a function`
- [ ] 2. GREEN — implement `transport.ts` → PASS
- [ ] 3. RED — REQ-003/S2: settings `{ loop: true, restBar: true, countIn: false }`, sequence length 3: advance from `playing 2` → `resting 4`; three more advances → `resting 1`; one more → `playing 0`; each resting tick clicks, first accented. REQ-003/S3: `{ countIn: false, restBar: false, loop: true }` → `startTransport` is `playing 0`, and from `playing 2` (length 3) `advance` is `playing 0` → PASS
- [ ] 4. RED — REQ-005/S1 (`both`, crotchet): every playing tick has `click {accent:false}` and `tonePosition === position`, `durationBeats 1`; REQ-005/S2 (`metronome`): click yes, `tonePosition null`, state still advances; REQ-005/S3 (`notes`): countingIn ticks click, playing ticks `click null` → PASS
- [ ] 5. RED — REQ-004/S4 (`quaver`, `both`): `durationBeats 0.5`; ticks at positions 0,2,4 click, 1,3 do not → PASS
- [ ] 6. Once-through: `{ loop: false }` from `playing (length−1)` → `idle` (REQ-002/S3's transport half) → PASS. Export from `published/index.ts`; `pnpm check` → green

**Verify** — `pnpm vitest run tests/practice/scenarios/transport.test.ts` → 7 passed; `pnpm check` → exit 0

### T008 · practice.session/REQ-001 (S1, S3, S4), REQ-002 (S1, S2, S3, S4), REQ-007 (S1, S2, S3) · The session aggregate over fake ports

**Status:** done

**Files**
- Create: `src/practice/ports/sound.ts`, `src/practice/ports/clock.ts`, `src/practice/ports/wake-lock.ts`, `src/practice/ports/visibility.ts`, `src/practice/ports/result.ts`, `src/practice/domain/session.ts`, `src/practice/adapters/lookahead-scheduler.ts`
- Modify: `src/practice/published/index.ts`
- Test: `tests/practice/fakes.ts`, `tests/practice/scenarios/session-transport.test.ts`, `tests/practice/scenarios/session-traversal.test.ts`

**Interfaces**
- Consumes: `startTransport`, `tickOf`, `advance`, `TransportState` (T007); `runOf`, `sequenceOf`, `fittingOctaveCounts`, `effectiveOctavesOf`, `pitchHzOf`, `noteLabel` from `src/theory/published`; `summaryLineOf`, `tempoTermFor`, `SessionSettings` (T006); `SoundCommand`, `OnsetReport`, `SoundUnavailable` from `src/sound/published/sound-command.schema`
- Produces (ports):
  ```ts
  export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
  export interface SoundPort { start(): Promise<Result<void, SoundUnavailable>>; sampleRate(): number; currentFrame(): number; post(command: SoundCommand): void; onOnset(listener: (report: OnsetReport) => void): () => void }
  export interface ClockPort { setTimeout(callback: () => void, ms: number): () => void }
  export interface WakeLockPort { acquire(): Promise<void>; release(): void }
  export interface VisibilityPort { onHidden(listener: () => void): () => void }
  ```
- Produces (`lookahead-scheduler.ts`):
  ```ts
  export const LOOKAHEAD_MS = 200; export const POLL_MS = 25;
  export interface TickPlan { readonly commands: readonly SoundCommand[]; readonly durationFrames: number }
  export interface LookaheadScheduler { start(firstOnsetFrame: number, next: (onsetFrame: number) => TickPlan | null): void; stop(): void }
  export function createLookaheadScheduler(sound: SoundPort, clock: ClockPort): LookaheadScheduler
  // every POLL_MS: while nextOnset < currentFrame + LOOKAHEAD_MS·sampleRate/1000 → plan = next(nextOnset); null → stop; else post each command and nextOnset += durationFrames
  ```
- Produces (`session.ts`, re-exported from `published/index.ts`):
  ```ts
  export interface SessionContext { readonly key: Key; readonly variant: Variant }
  export interface SessionDeps { readonly sound: SoundPort; readonly clock: ClockPort; readonly wakeLock: WakeLockPort; readonly visibility: VisibilityPort }
  export interface TargetAdvanced { readonly note: Note; readonly position: number; readonly length: number; readonly atFrame: number }
  export interface SessionSnapshot {
    readonly transport: TransportState; readonly traversal: Traversal; readonly effectiveOctaves: Octaves; readonly fittingCounts: readonly OctaveCount[];
    readonly settings: SessionSettings; readonly run: readonly KeyViewNote[]; readonly sequence: readonly SequenceNote[];
    readonly caption: string; readonly progress: number; readonly summaryLine: string; readonly tempoTerm: TempoTerm;
    readonly soundingPosition: number | null; readonly notice: "sound-unavailable" | null;
  }
  export interface Session {
    snapshot(): SessionSnapshot; start(): void; stop(): void;
    setContext(context: SessionContext): void; setTraversal(traversal: Traversal): void; setSettings(settings: SessionSettings): void;
    onTargetAdvanced(listener: (event: TargetAdvanced) => void): () => void; onChange(listener: () => void): () => void; dispose(): void;
  }
  export function createSession(context: SessionContext, traversal: Traversal, settings: SessionSettings, deps: SessionDeps): Session
  ```
  Captions: idle → `` `${run.length} notes · ${noteLabel(first)}–${noteLabel(last)}` ``; countingIn → `` `COUNT IN · ${beatsLeft}` ``; resting → `` `REST · ${beatsLeft}` ``; playing with a sounding position → `` `${noteLabel(note)} · ${position+1} of ${sequence.length}` ``. `progress` = (position+1)/length while a note sounds, else 0. `soundingPosition` is set from onset reports (T009) — in this task it is set when the tone command is posted (replaced in T009). Tone `durationFrames` = tick frames − 40 ms release headroom is Rust's job; post the full tick length. `hz` from `pitchHzOf`. Tags: tone tag = sequence position; click tag = 1_000_000 + running counter.

**Steps**
- [ ] 1. Write `tests/practice/fakes.ts`: `FakeSound` (`sampleRate 48000`; `frame` settable; `posted: SoundCommand[]`; `start()` resolves ok unless `failWith` set; `fireOnset(tag)` calls listeners with `{ tag, onsetFrame, actualFrame: onsetFrame }` using the posted command's onset), `FakeClock` (queue of timeouts; `advance(ms)` runs due callbacks and moves `FakeSound.frame` when linked), `FakeWakeLock` (`acquired: boolean`), `FakeVisibility` (`hide()`). Helper `sessionOn(keyLetter, variantId, traversal, settings)` returning `{ session, sound, clock, wake, visibility }`
- [ ] 2. RED — REQ-002/S4 (idle captions) and REQ-001/S1, S3, S4 in `session-traversal.test.ts`: G major flute `updown/2/scale` → `snapshot().caption === "15 notes · G4–G6"`; `setTraversal({..., shape: "arpeggio"})` → `"7 notes · G4–G6"`; full scale → `"22 notes · C4–C7"`. C major flute → `fittingCounts [1,2,3]`; F♯ major Bass C → `fittingCounts []`, `run.length 12`, `effectiveOctaves {kind:"full"}`; C major flute 3 oct then `setContext` Alto C → `effectiveOctaves {kind:"count",count:1}` and `run` C5–C6 while `traversal.octaves` still `{count:3}`; back to flute → run 22? no — 3 oct = 22 notes C4–C7. Run → FAIL: `createSession is not a function`
- [ ] 3. GREEN — `session.ts` holding `{ context, traversal, settings, transport, soundingPosition, notice }`, recomputing `run/sequence/fittingCounts/effectiveOctaves` from theory on every change; `onChange` fan-out → PASS
- [ ] 4. RED — REQ-002/S1, S2, S3 in `session-transport.test.ts`: `start()` → `snapshot().transport` is `countingIn 4`, `wake.acquired === true`, `sound.posted` begins with four click commands 24000 frames apart (120 bpm at 48 kHz = 0.5 s) once `clock.advance(50)`; advance the clock through the count-in → the first tone command has `hz ≈ 392.0` (G4), `tag 0`, and the caption reads `"G4 · 1 of 29"`; after 29 tones the 30th tone posted has `tag 0` again (loop). S2: at note 12 `stop()` → `sound.posted.at(-1)` is `{ kind: "stopAll" }`, transport `idle`, caption `"15 notes · G4–G6"`, `progress 0`, `wake.acquired === false`; `start()` again → countingIn 4. S3: `loop: false` → after the 29th tone's tick the transport is `idle`. Run → FAIL on `start`
- [ ] 5. GREEN — `createLookaheadScheduler` + `start()` (`sound.start()` awaited; on `ok:false` set `notice` and continue — REQ-010 lands in T009), `stop()` posts `stopAll`, scheduler.stop, wake release; `next(onsetFrame)` maps `tickOf` to commands (tone: `hz`, `durationFrames = tickFrames`; click) and advances the transport, returning `null` when it reaches `idle` → PASS
- [ ] 6. RED — REQ-007/S1: playing G major at position 9 → `setContext(D major)` → next posted tone is D4 (`hz ≈ 293.66`) at the very next tick, transport `playing 0`, no `countingIn`; REQ-007/S2: `setSettings({ soundMode: "notes" })` mid-run → the next tick posts a tone and no click; REQ-007/S3: nothing in the API stops playback except `stop()` — assert 20 ticks continue across `setSettings` and `setTraversal` calls (which restart per S1 but keep `playing`). Also: `setSettings({ tempoBpm })` mid-run keeps `position` (REQ-004 sentence) → GREEN
- [ ] 7. `pnpm check` → green

**Verify** — `pnpm vitest run tests/practice` → all passed (≥ 14 tests); `pnpm check` → exit 0

### T009 · practice.session/REQ-006 (S3, S5), REQ-005 (S2), REQ-009 (S1, S2), REQ-010 (S1, S2) · Onsets become TargetAdvanced; hidden stops; silence is not stuck

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts`
- Create: `src/practice/published/target-advanced.schema.ts`
- Test: `tests/practice/scenarios/session-target.test.ts`, `tests/practice/invariants/target-in-sequence.test.ts`

**Interfaces**
- Consumes: everything T008 produces; `FakeSound.fireOnset(tag)`, `FakeVisibility.hide()`
- Produces: `export const targetAdvancedSchema = z.object({ note: noteSchema, position: z.number().int().nonnegative(), length: z.number().int().positive(), atFrame: z.number().nonnegative() })` where `noteSchema` mirrors `Note` (`letter` enum, `accidental` enum, `octave` int); `session.onTargetAdvanced` now fires from `sound.onOnset` reports whose `tag < 1_000_000`, and `soundingPosition`/caption/progress update at that moment, not at post time

**Steps**
- [ ] 1. RED — REQ-006/S3: after `start()` and through the count-in, `snapshot().soundingPosition === null` even though tone commands are already posted (lookahead); `sound.fireOnset(0)` → `soundingPosition 0`, caption `"G4 · 1 of 29"`, and one `TargetAdvanced { note: G4, position: 0, length: 29 }` delivered. Run → FAIL (position set at post time)
- [ ] 2. GREEN — move the sounding state to the onset listener; parse each emitted event through `targetAdvancedSchema` in the test → PASS
- [ ] 3. RED — REQ-006/S5 invariant in `tests/practice/invariants/target-in-sequence.test.ts`: for every variant × 30 keys × each fitting count + full × both shapes × three directions: create the session with `countIn false`, `loop false`, drive the fake clock through the whole sequence firing each tone's onset, collect events; assert every event's `note` equals `sequence[event.position].note` and `event.length === sequence.length`, and the event count equals the sequence length → PASS
- [ ] 4. RED — REQ-009/S1: playing → `visibility.hide()` → transport `idle`, `stopAll` posted, caption idle. REQ-009/S2: `wake.acquired` is `true` from `start()` until `stop()`/hide, then `false` → GREEN (subscribe to `visibility.onHidden` in `createSession`; `dispose()` unsubscribes)
- [ ] 5. RED — REQ-010/S1: `sound.failWith = { reason: "worklet-failed", detail: "x" }` → `start()` → `snapshot().notice === "sound-unavailable"`, transport still `countingIn 4` and ticks still advance as the clock runs (the fake still delivers onsets); REQ-010/S2: `sound.startCalls === 0` before `start()` → GREEN (the session never touches `sound` before `start()`)
- [ ] 6. RED — REQ-005/S2 at the session level (added after T008's review found the gap): `soundMode: "metronome"`, crotchet → after each playing tick's click onset fires, `soundingPosition` and the caption advance exactly as in `both`; with `noteLength: "quaver"` the odd positions (no click, no tone) still advance at their tick time. Tag rule: a playing tick's *first* sounding command (the tone, else the click) carries `tag = position`; count-in and rest-bar clicks keep `tag ≥ 1_000_000`; a playing tick with nothing sounding schedules a `clock.setTimeout` for its onset (frames → ms via `sound.sampleRate()`) that advances `soundingPosition` and emits `TargetAdvanced` with `atFrame` = its onset frame → GREEN
- [ ] 7. `pnpm check` → green

**Verify** — `pnpm vitest run tests/practice` → all passed (≥ 21 tests); `pnpm check` → exit 0

## Phase 4 — Sound: the real engine and the adapters

### T010 · practice.session/REQ-005 (S4) · Tone, click, onset reports and stop in Rust

**Status:** done

**Files**
- Modify: `src/sound/src/lib.rs`
- Create: `src/sound/src/tone.rs`, `src/sound/src/click.rs`, `src/sound/src/voices.rs`
- Modify: `src/sound/published/processor.ts` (route `click` and `stopAll`; post `onset` reports)
- Test: Rust unit tests in each module

**Interfaces**
- Consumes: T002's `init`, `output_ptr`, `render`, `push_tone`
- Produces (Rust `extern "C"`): `pub extern "C" fn push_click(tag: u32, accent: u32, onset_frame: f64) -> u32`, `pub extern "C" fn stop_all()`, `pub extern "C" fn report_ptr() -> *const f64` — after `render` returns `n`, `report_ptr()` holds `n` triples `[tag, onset_frame, actual_frame]`
- Produces (processor): after each `render`, if `n > 0` posts `{ type: "onset", reports: OnsetReport[] }`
- Sound design (plan › Interfaces): tone = `sin(2πft) + 0.25·sin(4πft)`, 8 ms linear attack, sustain, 40 ms linear release beginning at `duration − release`, peak −12 dBFS (0.25); click = 25 ms damped sine, 1.8 kHz (accent: 1.2 kHz, +6 dB), exponential decay to −60 dB at 25 ms, peak −9 dBFS (0.355)

**Steps**
- [ ] 1. RED — `tone.rs` test `tone_is_silent_before_its_next_onset`: at 48 kHz a tone with `duration_frames 24000` (500 ms) has amplitude `< 1e-4` at frame 23999 and `> 0.1` somewhere in frames 400..1000 (REQ-005/S4). `cargo test -p sound` → FAIL
- [ ] 2. GREEN — `Tone` with phase accumulator and the envelope; move `Voice` storage into `voices.rs` (`Voices { slots: [Option<Voice>; 64] }`, `push`, `clear_all`, `render_into(out, now_frame, reports)`) → PASS
- [ ] 3. RED — `click.rs` tests: `click_lasts_25_ms` (amplitude `< 1e-3` after frame 1200 at 48 kHz, `> 0.2` in the first 100 frames); `accent_is_louder_and_lower` (peak ratio ≈ 2.0 ± 0.1; zero-crossing count over the first 10 ms is lower for the accent) → GREEN
- [ ] 4. RED — `lib.rs` test `onsets_are_reported_in_the_quantum_they_render`: `push_tone(3, 440.0, 300.0, 4800); push_click(9, 1, 300.0, )`; `render(0.0) == 0`, `render(128.0) == 0`, `render(256.0) == 2` and `report_ptr()` holds `[3, 300, 300]` and `[9, 300, 300]` (actual_frame = onset when on time); a voice pushed with `onset_frame 100.0` and rendered first at `render(256.0)` reports `actual_frame 256` (late, never dropped) → GREEN
- [ ] 5. RED — `stop_all_silences_within_one_quantum`: two sounding voices, `stop_all()`, `render(next)` → all zero → GREEN
- [ ] 6. `processor.ts`: route `click` → `push_click(tag, accent ? 1 : 0, onsetFrame)`, `stopAll` → `stop_all()`; read `report_ptr()` after `render` and post `onset` reports. `index.ts` `onOnset` listeners receive them (validate with `onsetReportSchema`)
- [ ] 7. `pnpm check` → green (cargo section: all Rust tests pass, clippy clean)

**Verify** — `cargo test -p sound` → `test result: ok. 8 passed` (or more); `pnpm check` → exit 0; `?sound-spike` on the laptop still plays A4 (now with the envelope)

### T011 · — · Practice adapters: Web Audio sound, silent sound, wake lock, visibility

**Status:** done

**Files**
- Create: `src/practice/adapters/web-audio-sound.ts`, `src/practice/adapters/silent-sound.ts`, `src/practice/adapters/screen-wake-lock.ts`, `src/practice/adapters/page-visibility.ts`, `src/practice/adapters/browser-clock.ts`
- Test: `tests/practice/scenarios/silent-sound.test.ts`

**Interfaces**
- Consumes: `SoundPort`, `ClockPort`, `WakeLockPort`, `VisibilityPort`, `Result` (T008); `createSoundEngine`, `SoundEngineOutcome` (T002/T010)
- Produces:
  ```ts
  export function webAudioSound(createContext: () => AudioContext): SoundPort     // context created inside start(); start() resumes it; maps SoundEngineOutcome → Result; sampleRate/currentFrame from the engine
  export function silentSound(now: () => number): SoundPort                       // sampleRate 48000; currentFrame = now()·48; start() ok; post(tone|click) schedules an onset report at its onsetFrame via setTimeout; stopAll cancels them
  export function screenWakeLock(navigatorLike: Navigator): WakeLockPort           // navigator.wakeLock?.request("screen"); absent → acquire resolves, release no-op
  export function pageVisibility(documentLike: Document): VisibilityPort           // visibilitychange → hidden
  export function browserClock(): ClockPort                                        // window.setTimeout / clearTimeout
  ```

**Steps**
- [ ] 1. RED — `silent-sound.test.ts` (this adapter is what REQ-010/S1 runs on): with a fake `now` and vitest fake timers, `post({ kind: "tone", tag: 4, hz: 440, onsetFrame: 4800, durationFrames: 100 })` → after `vi.advanceTimersByTime(100)` the listener received `{ tag: 4, onsetFrame: 4800, actualFrame: 4800 }`; `post({ kind: "stopAll" })` before the time → nothing fires. Run → FAIL
- [ ] 2. GREEN — `silent-sound.ts` → PASS
- [ ] 3. `web-audio-sound.ts`: `start()` creates the context, `await context.resume()`, `await createSoundEngine(context)`; `{ ok:false }` → `{ ok: false, error }`; `post` forwards; `onOnset` forwards the engine's reports; also `stopAll` on `stop`. No unit test (needs a real audio thread — covered by `pnpm test:timing` in T018)
- [ ] 4. `screen-wake-lock.ts`, `page-visibility.ts`, `browser-clock.ts` as in Interfaces; each ≤ 30 lines
- [ ] 5. `pnpm check` → green (tsc is the check on the three browser adapters)

**Verify** — `pnpm vitest run tests/practice/scenarios/silent-sound.test.ts` → 2 passed; `pnpm check` → exit 0

## Phase 5 — UI from the prototype

### T012 · practice.session/REQ-011 (S1, S2, S3), theory.circle-of-fifths/REQ-008 (S1, S2, S3, S4) · Stored selection v3

**Status:** done

**Files**
- Modify: `src/ui/selection-store.ts`, `tests/ui/scenarios/selection-store-v2.test.ts` → rename to `selection-store.test.ts`
- Test: `tests/ui/scenarios/selection-store.test.ts`

**Interfaces**
- Consumes: `Traversal`, `Direction`, `Shape` (T003); `SessionSettings`, `NoteLength`, `SoundMode` (T006)
- Produces:
  ```ts
  export type StoredOctaves = "full" | 1 | 2 | 3 | 4;
  export interface StoredSelection {
    readonly schemaVersion: 3; readonly variantId: string; readonly keyId: string; readonly spelling: "sharp" | "flat"; readonly view: "names" | "stave";
    readonly degreesEnabled: boolean; readonly distanceRingEnabled: boolean; readonly staveNamesEnabled: boolean;
    readonly traversal: { readonly direction: Direction; readonly octaves: StoredOctaves; readonly shape: Shape };
    readonly session: { readonly noteLength: NoteLength; readonly soundMode: SoundMode; readonly loop: boolean; readonly countIn: boolean; readonly restBar: boolean; readonly tempoBpm: number };
  }
  export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId">   // schemaVersion 3, sharp, names, true, true, false, traversal {updown, 1, scale}, session {crotchet, both, true, true, false, 96}
  ```
  `load()` accepts v1, v2 (with `span`, ignored) and v3; anything else → `null`

**Steps**
- [ ] 1. RED — REQ-011/S1 + REQ-008/S1: save a full v3 (`down`, `2`, `arpeggio`, `quaver`, `metronome`, `false`, `false`, `true`, `132`; B♭ major, Bass C, flat, stave, degrees off, ring on, stave names on) → `load()` deep-equals it. Run → FAIL (type error / parse fails on `schemaVersion 3`)
- [ ] 2. GREEN — v3 Zod schema, `tempoBpm: z.number().int().min(40).max(200)`, union `[v3, v2, v1]`, `migrateFromV2` drops `span` and adds `firstRunDefaults.traversal/session`, `migrateFromV1` chains through v2 → PASS
- [ ] 3. RED — REQ-011/S3 + REQ-008/S4: store the exact v2 payload from the old test (with `span: "oct-1"`) → `load()` returns v3 with the v2 preferences kept, `traversal`/`session` at defaults, no `span` key; store a v1 payload → variant, key kept, everything else default → PASS
- [ ] 4. RED — REQ-011/S2 + REQ-008/S2: empty storage → `load() === null` and `firstRunDefaults` equals the values in Interfaces; REQ-008/S3: `localStorage.setItem(key, "{not json")` and `{"schemaVersion":9}` → `null` → PASS
- [ ] 5. `pnpm check` → expect FAIL only in `App.tsx` (`span` no longer on `StoredSelection`) — that is T013's job; **do not fix App here**; instead confirm the store's own tests pass with `pnpm vitest run tests/ui/scenarios/selection-store.test.ts`

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` → 5 passed; `pnpm exec tsc --noEmit 2>&1 | grep -v App.tsx | grep -c 'error TS'` → `0`

### T013 · theory.circle-of-fifths/REQ-003 (S1, S2, S3, S4), REQ-007 (S1, S2), REQ-011 (REMOVED), practice.session/REQ-006 (S1, S2) · The panel shows the run and the sounding note; Span deleted

**Status:** done

**Files**
- Modify: `src/ui/StaveView.tsx:284-296` (props), `src/ui/NamesView.tsx:71-79` (props), `src/ui/KeyPanel.tsx` (remove `spanCaption`, `spanChoices`, `SpanChoicePill`, the span row `:35-75,122-150`), `src/ui/App.tsx` (remove span helpers `:66-110`, wire `runOf`, temporary `soundingPosition: null`), `src/theory/published/index.ts` (remove `Span`, `spanChoicesOf`, `spanNotesOf`)
- Delete: `src/theory/domain/span.ts`, `tests/theory/scenarios/span.test.ts`
- Test: `tests/ui/scenarios/stave-view.test.tsx`, `tests/ui/scenarios/names-view.test.tsx`, `tests/theory/scenarios/key-view.test.ts` (REQ-003 rows)

**Interfaces**
- Consumes: `runOf`, `Traversal`, `SequenceNote` (T003/T004)
- Produces:
  ```ts
  export function StaveView(props: { readonly key_: Key; readonly variant: Variant; readonly notes: readonly KeyViewNote[]; readonly staveNamesEnabled: boolean; readonly soundingRunIndex: number | null; readonly playing: boolean }): JSX.Element
  export function NamesView(props: { readonly key_: Key; readonly degreesEnabled: boolean; readonly soundingPitchClass: PitchClass | null }): JSX.Element
  export function KeyPanel(props: { readonly view: "names" | "stave"; readonly onSelectView: (view: "names" | "stave") => void; readonly children: ReactNode; readonly rangeSummary: string }): JSX.Element
  ```
  Highlight (design lines 78-89, 103-105, script 436-447, 465-469, 779-795): sounding notehead `rx × 1.25`, `ry = rx × 1.25 × 0.76`, fill `paper.accent`, a `<circle r={rx*2.5} fill="rgba(138,75,42,.13)">` halo behind it (`data-testid="sounding-halo"`), every other head and stem `opacity .72` while `playing`; stave name label under the sounding note in `paper.accent`. Names view: the sounding column `background rgba(138,75,42,.10)`, name ink `paper.accent` (`data-sounding="true"` on the column)

**Steps**
- [ ] 1. RED — REQ-003/S4 in `stave-view.test.tsx`: render `StaveView` with `notes = runOf(G major, flute, { updown, count 2, arpeggio })` → exactly 7 noteheads (`getAllByTestId("notehead")`) labelled/positioned for G4 B4 D5 G5 B5 D6 G6 (assert the `data-note` attribute the view already sets; add it if absent); REQ-003/S1 with `full/scale` → 22 heads, and the App-level summary still reads `22 notes · C4–C7` (test in `key-view.test.ts` via `keyView(...).notes.length`). Run → FAIL (`notes` prop unknown)
- [ ] 2. GREEN — `StaveView` takes `notes` instead of `span`; App computes `runOf(selectedKey, variant, traversal)` (traversal from the stored selection, T012) → PASS. REQ-003/S2, S3 and REQ-007/S1, S2 existing tests: update their setup from `span` to `notes`/`traversal`, assert unchanged behaviour → PASS
- [ ] 3. RED — practice.session/REQ-006/S1: `soundingRunIndex 4, playing true` → head 4 has `fill paper.accent`, `rx` 1.25× the others, a `sounding-halo` exists centred on it, other heads have `opacity 0.72`; `soundingRunIndex null, playing false` → no halo, all `opacity 1`; REQ-006/S2 in `names-view.test.tsx`: `soundingPitchClass {D natural}` → only the D column has `data-sounding="true"` → GREEN
- [ ] 4. Remove the span row from `KeyPanel`, the span helpers from `App.tsx`, `span.ts`, its test and the published exports (REMOVED REQ-011). `grep -rn "span" src tests --include=*.ts --include=*.tsx -i | grep -v "letter-spacing\|<span\|</span"` → nothing
- [ ] 5. `pnpm check` → green; `./scripts/check-scenarios.sh --change changes/003-hear-the-scale` → no test cites `REQ-011`

**Verify** — `pnpm check` → exit 0; `ls src/theory/domain/span.ts tests/theory/scenarios/span.test.ts 2>&1 | grep -c 'No such file'` → `2`

### T014 · practice.session/REQ-002 (S1, S2 UI), REQ-004 (S1, S3 UI) · The transport card

**Status:** done

**Files**
- Create: `src/ui/TransportCard.tsx`
- Test: `tests/ui/scenarios/transport-card.test.tsx`
- Reference: design lines 121-136 (markup), script 726-731, 805-810, 830-831

**Interfaces**
- Consumes: `SessionSnapshot`, `TempoTerm` (T008)
- Produces:
  ```ts
  export function TransportCard(props: { readonly snapshot: SessionSnapshot; readonly onTogglePlay: () => void; readonly onStepTempo: (delta: -2 | 2) => void; readonly onOpenTempo: () => void }): JSX.Element
  ```
  Exact styling: card `display flex, alignItems center, gap 12, padding "12px 14px", background paper.card, border 1px paper.borderSoft, borderRadius 16`; play `<button aria-label="Play"|"Stop">` 56×56 circle `background paper.accent, color #f9f4e9, fontSize 20, fontWeight 600, lineHeight 1`, glyph `▶` idle / `❚❚` otherwise; middle column `gap 7, minWidth 0`: caption `fonts.mono 10.5px, letterSpacing .04em, color paper.muted, nowrap, ellipsis` (`data-testid="position-caption"`), progress track `height 3, borderRadius 2, background #e0d7c5` with fill `background paper.accent, width ${progress*100}%` (`data-testid="progress-fill"`); right column `gap 4`: stepper `border 1px #e0d7c5, borderRadius 999, padding "3px 4px", background paper.disc, gap 2` with `<button aria-label="Slower">−</button>` and `"Faster" +` each 26×26 circle `fontSize 15, color #5e564c`, tempo `fonts.mono 13px 600 minWidth 28 textAlign center`; term `<button>` `fontSize 12.5, fontWeight 600, color paper.accent, nowrap` naming the term. All buttons `font: inherit`, background transparent unless stated

**Steps**
- [ ] 1. RED — REQ-002/S1 (UI): render with an idle snapshot (`caption "15 notes · G4–G6"`, `progress 0`, `tempoTerm Andante`, `settings.tempoBpm 96`) → button `Play` shows `▶`, caption text, `progress-fill` width `0%`, `96` and `Andante` visible; playing snapshot (`playing`, caption `"D5 · 5 of 29"`, `progress 5/29`) → button `Stop` shows `❚❚`, width `17.241379310344826%` (assert `toMatch(/^17\.24/)`). Run → FAIL: module not found
- [ ] 2. GREEN — `TransportCard.tsx` → PASS
- [ ] 3. RED — REQ-002/S2 (UI): clicking `Stop` calls `onTogglePlay` once; REQ-004/S1, S3 (UI): `Faster` → `onStepTempo(2)`, `Slower` → `onStepTempo(-2)`, the term button → `onOpenTempo` → GREEN
- [ ] 4. `pnpm check` → green

**Verify** — `pnpm vitest run tests/ui/scenarios/transport-card.test.tsx` → 4 passed; `pnpm check` → exit 0

### T015 · practice.session/REQ-001 (S1, S2 UI), REQ-004 (S2 UI), REQ-003 (toggles UI) · The Traversal sheet, its row, and the Tempo sheet

**Status:** done

**Files**
- Create: `src/ui/TraversalRow.tsx`, `src/ui/TraversalSheet.tsx`, `src/ui/TempoSheet.tsx`
- Test: `tests/ui/scenarios/traversal-sheet.test.tsx`, `tests/ui/scenarios/tempo-sheet.test.tsx`
- Reference: design lines 137-217 (markup), script 573-584 (pill/toggle paints), 692-715 (pill lists), 816-829 (tempo rows); reuse `OverlayScrim`, `OverlayHeader` from `src/ui/overlay.tsx` and the sheet shell pattern of `src/ui/InstrumentSheet.tsx:55-80`

**Interfaces**
- Consumes: `Traversal`, `Octaves`, `OctaveCount`, `Direction`, `Shape` (T003); `SessionSettings`, `TEMPO_TERMS`, `TempoTerm`, `tempoTermFor` (T006); `OverlayScrim(props: { open, zIndex, onClose })`, `OverlayHeader(props: { title, padding, closeAriaLabel, onClose })`
- Produces:
  ```ts
  export function TraversalRow(props: { readonly summaryLine: string; readonly onOpen: () => void }): JSX.Element            // lines 137-140: padding "9px 14px", radius 14, mono 11px 600 .02em #4a4136, "edit ›" 11px 600 accent; whole row is a <button aria-label="Edit traversal">
  export function TraversalSheet(props: { readonly open: boolean; readonly traversal: Traversal; readonly effectiveOctaves: Octaves; readonly fittingCounts: readonly OctaveCount[]; readonly settings: SessionSettings; readonly onTraversal: (t: Traversal) => void; readonly onSettings: (s: SessionSettings) => void; readonly onClose: () => void }): JSX.Element
  export function TempoSheet(props: { readonly open: boolean; readonly tempoBpm: number; readonly onPick: (term: TempoTerm) => void; readonly onClose: () => void }): JSX.Element
  ```
  Traversal sheet rows (label 13px 600; row `padding "14px 18px"`, hairline `paper.hairlineSoft` below): Direction pills `↑ ↓ ↑↓` (14px 600, `minWidth 46, padding "9px 10px 10px", radius 10`); Octaves pills `"1 oct"…` for each fitting count then `"full"` (mono 12px 600) — active = `effectiveOctaves`; Shape `scale | arpeggio` (12.5px 600, padding "9px 12px 10px"); Note length `♩ | ♪` (`fonts.music` 16px, padding "7px 12px 9px"); Sound `notes | both | metronome` (12.5px 600, padding "9px 11px 10px"). Pill paint: active `background paper.pillActive, color #4a4136`; inactive `transparent, #756c60`. Toggle pills `loop | count-in | rest bar` (line 189-193): `padding "8px 12px 9px", radius 999, border 1px, mono 11px 600`; on: `background rgba(138,75,42,.10), color paper.accent, border rgba(138,75,42,.35)`; off: `transparent, #8a8175, border paper.borderSoft`. All pills are `<button aria-pressed>`; z-indexes: scrim 9 / sheet 10 (tempo: 11 / 12). Tempo rows (lines 205-216): name 14.5px (700 current / 600), gloss 11.5px muted, band mono 11.5px `"40–59"`, tick `✓` accent 14px wide on the current; current row `background rgba(138,75,42,.08)`; header shows `Tempo` and `` `${tempoBpm} bpm` `` mono 11.5px

**Steps**
- [ ] 1. RED — REQ-001/S1 (UI): render `TraversalSheet` open with `fittingCounts [1,2,3]`, `effectiveOctaves {count 2}` → Octaves buttons are exactly `1 oct, 2 oct, 3 oct, full` with `2 oct` `aria-pressed="true"`; with `fittingCounts []` and `effectiveOctaves full` → only `full`, pressed. Clicking `full` → `onTraversal({ ...traversal, octaves: { kind: "full" } })`; clicking `↓` → `direction "down"`; `arpeggio` → `shape "arpeggio"`. Run → FAIL: module not found
- [ ] 2. GREEN — `TraversalSheet.tsx` + `TraversalRow.tsx` → PASS
- [ ] 3. RED — REQ-003 toggles (UI) and the settings pills: `♪` → `onSettings({ ...settings, noteLength: "quaver" })`; `metronome` → `soundMode "metronome"`; `rest bar` (off) → `restBar true`; `count-in` (on, `aria-pressed="true"`) → `countIn false`; REQ-001/S2 (UI): `TraversalRow` shows the `summaryLine` text and `edit ›`, click → `onOpen` → GREEN
- [ ] 4. RED — REQ-004/S2 (UI) in `tempo-sheet.test.tsx`: open at 96 → row `Andante` has `✓` and `aria-current="true"`, band text `76–107`; clicking `Allegro` → `onPick(TEMPO_TERMS[5])` (Allegro); eight rows in order Largo…Presto → GREEN
- [ ] 5. `pnpm check` → green

**Verify** — `pnpm vitest run tests/ui/scenarios/traversal-sheet.test.tsx tests/ui/scenarios/tempo-sheet.test.tsx` → 6 passed; `pnpm check` → exit 0

### T016 · practice.session/REQ-011 (S1, S2, S3 app), REQ-010 (S1 UI), REQ-007 (S3 UI) · Wire the session into the app

**Status:** done

**Files**
- Modify: `src/ui/App.tsx`, `src/ui/main.tsx`, `src/ui/Notices.tsx` (accept a `soundUnavailable: boolean` prop and render the notice text `Sound unavailable — the run still shows; tap ▶ to try again`), `src/ui/global.css` (nothing new expected; confirm `button { font: inherit }` covers the new controls)
- Test: `tests/ui/scenarios/app-session.test.tsx`

**Interfaces**
- Consumes: `createSession`, `Session`, `SessionDeps` (T008/T009); adapters (T011); `TransportCard` (T014); `TraversalRow`, `TraversalSheet`, `TempoSheet` (T015); `StaveView`/`NamesView` props (T013); `StoredSelection` v3 (T012)
- Produces: `src/practice/adapters/fallback-sound.ts` — `export function fallbackSound(primary: SoundPort, fallback: SoundPort): SoundPort` — `start()` tries `primary`; on `{ ok: false }` it starts `fallback` and thereafter delegates every method to it while still returning the primary's `{ ok: false, error }` so the session raises the notice (REQ-010/S1 in the real app: `webAudioSound` has no clock without an engine; `silentSound(() => performance.now())` walks the run). Test `tests/practice/scenarios/fallback-sound.test.ts` with two `FakeSound`s: primary `failWith` set → `start()` is `{ ok: false }`, `post`/`currentFrame`/`onOnset` reach the fallback, `startCalls` on both is 1.
- Produces: `App(props: { catalogue: Catalogue; selectionStore: SelectionStore; sessionDeps: SessionDeps })` — `main.tsx` passes `{ sound: fallbackSound(webAudioSound(() => new AudioContext()), silentSound(() => performance.now())), clock: browserClock(), wakeLock: screenWakeLock(navigator), visibility: pageVisibility(document) }`; tests pass the fakes from `tests/practice/fakes.ts`. In dev only (`import.meta.env.DEV`) `main.tsx` sets `window.__session = session` for `pnpm test:timing` (T018). Layout (design lines 121-141): below the key panel a `div` with `marginTop auto, padding "14px 16px 20px", display flex column, gap 9` holding `TransportCard` then `TraversalRow`; the sheets and their scrims are siblings of the settings drawer

**Steps**
- [ ] 1. RED — REQ-011/S2 (app): render `App` with empty storage → `TraversalRow` text `↑↓ · 1 oct · scale · ♩ · loop`, tempo `96`, term `Andante`, caption `8 notes · C4–C5` (C major, flute, 1 oct). Run → FAIL (no transport rendered)
- [ ] 2. GREEN — create the session once (`useRef`), subscribe `onChange` → `useState` snapshot; `setContext` on key/variant change; persist `traversal` + `session` settings into the v3 store on every change; render the bottom area, sheets, `TempoSheet` → PASS
- [ ] 3. RED — REQ-011/S1 (app): pre-seed a v3 payload (`down, 2, arpeggio, quaver, metronome, loop false, countIn false, restBar true, 132`) → row reads `↓ · 2 oct · click only · ♪ · once`, term `Allegro`, `Play` button shows `▶` (idle); REQ-011/S3: seed the v2 payload → defaults for the traversal and session, B♭ major on Bass C kept → GREEN
- [ ] 4. RED — REQ-010/S1 (UI): `FakeSound.failWith = { reason: "worklet-failed", detail: "" }`, click `Play` → the notice `Sound unavailable — …` appears in `Notices`, no dialog, and after `clock.advance(…)` through the count-in the caption changes to `C4 · 1 of 15` (still walking) → GREEN
- [ ] 5. RED — REQ-007/S3 (UI): while playing, open `Edit traversal`, advance the clock 2 s, close → `Stop` button still shows `❚❚` and `FakeSound.posted` has no `stopAll` → GREEN. Also assert `FakeSound.startCalls === 0` before any click (REQ-010/S2 at app level)
- [ ] 6. Manual: `pnpm dev --host`, phone: G major on the flute, ▶ → count-in then the scale, note lights as it sounds. Note anything off in `notes.md`
- [ ] 7. `pnpm check` → green

**Verify** — `pnpm vitest run tests/ui/scenarios/app-session.test.tsx` → 5 passed; `pnpm check` → exit 0

### T017 · — · Design review loop: the screen matches the prototype

**Status:** done

**Files**
- Modify: `scripts/design-shots.mjs` (`PROTOTYPE_PATH` → `changes/003-hear-the-scale/design/hear-the-scale.dc.html`; states), `src/ui/*.tsx` as the diffs demand
- Output: `.sdd/design-review/*.png`, `changes/003-hear-the-scale/notes.md › Design review`

**Steps**
- [ ] 1. States: `idle-g-major-stave` (G major wedge, stave pill), `traversal-sheet-open` (edit ›), `tempo-sheet-open` (term button), `names-idle` (defaults), `settings-open`. The prototype's playing state cannot be frozen deterministically — skip it here; the phone walk covers it
- [ ] 2. `pnpm design:shots` → pairs written. Dispatch the visual comparison to the task-reviewer (sonnet) with both PNGs per state; it lists every divergence with coordinates and values
- [ ] 3. Fix each listed divergence in the named component; re-shoot; repeat until the reviewer reports none beyond anti-aliasing
- [ ] 4. Record the final pass (states, iterations, residuals) in `notes.md`
- [ ] 5. `pnpm check` → green

**Verify** — reviewer report in `notes.md` says "matches" for all five states; `pnpm check` → exit 0

### T021 · theory.circle-of-fifths/REQ-003 (S5) · Quaver flags on the stave

**Status:** done — superseded by T023 (user dropped note length, 2026-09-22); S5 removed from the delta

**Files**
- Modify: `src/ui/StaveView.tsx` (new prop; flag paths), `src/ui/App.tsx` (pass the session's note length), `scripts/design-shots.mjs` (state `quaver-stave`)
- Test: `tests/ui/scenarios/stave-view.test.tsx`
- Reference: design script lines 454–464 (the flag path) and markup lines 81–83 (`stave.flags` rendered as `<path d fill opacity>` between the stems and the halos)

**Interfaces**
- Consumes: `NoteLength` from `src/practice/published`; `SessionSnapshot.settings.noteLength`
- Produces: `StaveView` gains `readonly noteLength: NoteLength` — with `"quaver"`, one `<path data-testid="stave-flag">` per notehead: `d = M ${sx} ${ty} c 6.5 ${3*s} 8.5 ${9*s} 4.5 ${15*s} c 1 ${-6*s} -1.5 ${-9*s} -4.5 ${-11*s} z` where `sx` is the stem x, `ty` the stem's far end y (`ny − 24` for a stem up, `ny + 24` for a stem down) and `s = 1` for stem up, `−1` for stem down; fill = the head's ink, opacity = the head's opacity (dimmed while playing like the head). With `"crotchet"` no flags. No beams ever.

**Steps**
- [ ] 1. RED — REQ-003/S5: render `StaveView` for G major on the flute with an 8-note run and `noteLength: "quaver"` → `getAllByTestId("stave-flag")` has 8 entries, each `d` begins `M <stemX> <stemEndY> c 6.5 ` and the second number after `c 6.5` is `3` for a stem-up head and `-3` for a stem-down one (find one of each in the run: index 0 is stem-up, the top G6 is stem-down); with `"crotchet"` → `queryAllByTestId("stave-flag")` is empty. Run → FAIL (prop unknown / no flags)
- [ ] 2. GREEN — build the flag path per head from the existing `StaveHead.stemX/stemY2` (that is the stem end) and stem direction; render the `<path>`s after the stems and before the halo/heads so the head sits on top; apply `opacity` like the head → PASS
- [ ] 3. App passes `noteLength={snapshot?.settings.noteLength ?? "crotchet"}`; add `quaver-stave` to `design-shots.mjs` (G major, stave pill, open the traversal sheet, tap `♪`, close the sheet — both sides) → run `pnpm design:shots --states quaver-stave` → two PNGs
- [ ] 4. `source ~/.cargo/env && pnpm check` → green

**Verify** — `pnpm vitest run tests/ui/scenarios/stave-view.test.tsx` → all passed incl. REQ-003/S5; `.sdd/design-review/quaver-stave.{prototype,app}.png` exist; `pnpm check` → exit 0

### T022 · practice.session/REQ-002 (S2, S3, S4 amended) · The idle caption counts the sequence

**Status:** done

**Files**
- Modify: `src/practice/domain/session.ts:96-102` (`captionOf` idle branch)
- Test: `tests/practice/scenarios/session-transport.test.ts`, `tests/practice/scenarios/session-traversal.test.ts`, `tests/ui/scenarios/app-session.test.tsx` (expected strings)

**Interfaces**
- Consumes: `captionOf(transport, run, sequence, soundingPosition)` (private to `session.ts`)
- Produces: idle caption `` `${sequence.length} notes · ${noteLabel(run[0])}–${noteLabel(run[last])}` `` — the prototype's formula (design script line 730)

**Steps**
- [ ] 1. RED — update the expected idle captions to the amended scenarios: REQ-002/S2 and S3 `"29 notes · G4–G6"`; REQ-002/S4 `"13 notes · G4–G6"` (2 oct ↑↓ arpeggio), `"43 notes · C4–C7"` (full ↑↓ scale), `"15 notes · G4–G6"` (2 oct ↑ scale); the app-level first-run caption (C major, flute, 1 oct ↑↓) becomes `"15 notes · C4–C5"`. Run `pnpm vitest run tests/practice tests/ui/scenarios/app-session.test.tsx` → FAIL on each old count
- [ ] 2. GREEN — `captionOf` idle branch uses `sequence.length` → PASS
- [ ] 3. `source ~/.cargo/env && pnpm check` → green

**Verify** — `pnpm vitest run tests/practice tests/ui/scenarios/app-session.test.tsx` → all passed; `pnpm check` → exit 0

### T023 · practice.session/REQ-001 (S2), REQ-004 (S4 amended), REQ-005, REQ-011; theory.circle-of-fifths/REQ-003 · Crotchets only — note length removed everywhere

**Status:** done

**Files**
- Modify: `src/practice/domain/settings.ts` (drop `NoteLength`, `noteLength`; summary line loses the ♩/♪ segment), `src/practice/domain/transport.ts` (`Tick.durationBeats` always 1 → remove the field and the quaver branch), `src/practice/domain/session.ts` (tick frames from one beat), `src/practice/published/index.ts`, `src/ui/selection-store.ts` (v3 `session` group loses `noteLength` — the v3 shape was never shipped, so no migration), `src/ui/TraversalSheet.tsx` (remove the Note length row), `src/ui/StaveView.tsx` (remove `noteLength` prop, `quaverFlagPathOf`, the flag `<path>`), `src/ui/App.tsx`, `scripts/design-shots.mjs` (remove the `quaver-stave` state)
- Test: every test that mentions `noteLength`, `quaver`, `♩` or `♪` — `grep -rn "noteLength\|quaver\|♩\|♪" src tests scripts` must return nothing at the end; delete REQ-003/S5 and REQ-004/S4 (old) tests; add the amended REQ-004/S4 (tempo change keeps the place: from note 6 at 96 bpm, three + taps → next tick 588 ms / 28 235 frames apart at 48 kHz, position kept); summary strings become `"↑↓ · 2 oct · scale · loop"`, `"↑↓ · full range · click only · once"`, `"↑↓ · 1 oct · scale · loop"`

**Interfaces**
- Produces: `SessionSettings = { soundMode; loop; countIn; restBar; tempoBpm }`; `Tick = { click; tonePosition }` (one beat per tick); `StoredSelection.session` without `noteLength`; `StaveView` without `noteLength`; `summaryLineOf` → `"<dir> · <octaves> · <shape|click only> · <loop|once>"`

**Steps**
- [ ] 1. RED — change the summary-line test (REQ-001/S2) and the store round-trip test to the new shapes; add the amended REQ-004/S4 in `session-transport.test.ts` → run `pnpm vitest run tests/practice tests/ui` → FAIL (type errors on `noteLength`, old strings)
- [ ] 2. GREEN — remove note length through the stack as listed in Files; `Tick` loses `durationBeats`; the session computes tick frames as `60 / tempoBpm · sampleRate`; the transport's click rule becomes "click when soundMode !== notes" for playing ticks
- [ ] 3. Delete the quaver tests (REQ-003/S5 in `stave-view.test.tsx`, the quaver case in `transport.test.ts`), the `quaver-stave` design state and its PNGs; `grep -rn "noteLength\|quaver\|♩\|♪" src tests scripts` → empty
- [ ] 4. `source ~/.cargo/env && pnpm check` → green; `./scripts/check-scenarios.sh --change changes/003-hear-the-scale` → no test cites a removed scenario; `pnpm design:shots --states traversal-sheet-open` → the sheet has no Note length row on the app side (the prototype still shows one — deliberate divergence, recorded in notes.md)

**Verify** — `pnpm check` → exit 0; `grep -rn "noteLength\|quaver\|♩\|♪" src tests scripts | wc -l` → `0`

## Phase 6 — Hardening

### T018 · practice.session/REQ-008 (S1), REQ-006 (S4) · The measured timing test

**Status:** done

**Files**
- Create: `scripts/timing-test.mjs`
- Modify: `AGENTS.md` (Commands already lists `pnpm test:timing`; add the healthy output line)
- Reference: plan › Test strategy › Measured

**Interfaces**
- Consumes: `window.__session` (dev only, T016); `data-sounding="true"` / `sounding-halo` DOM markers (T013); `OnsetReport`s via `session.onTargetAdvanced` (`atFrame`)
- Produces: `pnpm test:timing [--seconds 60]` — starts `pnpm dev` if port 5173 is closed, launches headless Chromium with `--autoplay-policy=no-user-gesture-required --use-fake-device-for-media-stream`, opens six pages (40/96/200 bpm × crotchet/quaver, G major flute updown 2 oct, count-in off, loop on, sound both), clicks Play, runs 60 s each in parallel, then evaluates: for REQ-008/S1 the max `|actualFrame − onsetFrame| / sampleRate` over every onset report and the drift (last minus first deviation); for REQ-006/S4 a `MutationObserver` on the stave records `performance.now()` at each `sounding-halo` insertion, compared with the onset's wall time via `AudioContext.getOutputTimestamp()` mapping. Prints a table and exits 1 if any max > 5 ms, any drift > 1 ms, or any highlight > 30 ms

**Steps**
- [ ] 1. Write the harness skeleton (launch, six pages, table) reusing the dev-server bootstrap from `scripts/design-shots.mjs`
- [ ] 2. In `main.tsx` dev hook, also expose `window.__audioContext` from the `webAudioSound` adapter (add `context(): AudioContext | null` to its return, typed as an intersection, dev-only usage)
- [ ] 3. Run `pnpm test:timing --seconds 10` → table printed; fix harness bugs until six rows appear
- [ ] 4. Run `pnpm test:timing` (60 s) → all six rows within budget; paste the table into `notes.md › Timing`. If a row fails, the failure is real: report it — it is the plan's Risk 1/3 and needs the user, not a looser threshold
- [ ] 5. Add the table's last line as the healthy output for `test:timing` in `AGENTS.md`

**Verify** — `pnpm test:timing` → exit 0 and a six-row table with `max onset dev ≤ 5.0 ms`, `drift ≤ 1.0 ms`, `max highlight ≤ 30 ms`

### T019 · — · Edge cases, spike removal, AGENTS.md healthy output

**Status:** todo

**Files**
- Modify: `src/ui/main.tsx` (remove the `?sound-spike` block), `AGENTS.md` (Commands healthy output; "Things agents get wrong here")
- Test: `tests/practice/scenarios/edge-cases.test.ts`, `tests/ui/scenarios/edge-cases.test.tsx`

**Steps**
- [ ] 1. One test per row of proposal › Edge cases not already covered by a scenario test, named after the row (plus, from T009's review: `silent-tick timeout is cancelled by stop` — metronome + quaver, `stop()` during a silent odd tick → no later `TargetAdvanced` and `soundingPosition` stays null): `first run defaults` (already REQ-011/S2 — cite, no new test); `▶ tapped while playing is stop` (session: `start(); start()` → second call is a no-op? No — `App.onTogglePlay` maps to `stop()` when not idle: test at App level, `Play` then `Stop` → `stopAll` posted); `key changed during a count-in continues the count` (session: `setContext` while `countingIn 3` → still `countingIn 3`, new sequence afterwards); `tempo at 40 and 200` (already REQ-004/S3 — cite); `corrupt stored state` (already REQ-008/S3 — cite); `oversized octave count clamped` (already REQ-001/S4 — cite)
- [ ] 2. Remove the spike block from `main.tsx`; `grep -c 'sound-spike' src/ui/main.tsx` → `0`. Also cite `practice.session/REQ-005/S4` in the Rust test `tone_is_silent_before_its_next_onset` (a doc comment `// practice.session/REQ-005/S4` above the `#[test]`) and extend `scripts/check-scenarios.sh`'s search to `*.rs` if it does not already scan them, so the scenario checker attributes it
- [ ] 3. Run `pnpm check`; paste its last ~8 lines (vitest summary + cargo `test result`) into `AGENTS.md › Healthy output`, replacing the stale 17-files/52-tests block
- [ ] 4. Add to `AGENTS.md › Things agents get wrong here` one line for anything a T00x review flagged twice during this change (leave the section unchanged if nothing recurred; say so in the report)
- [ ] 5. `./scripts/check-scenarios.sh --change changes/003-hear-the-scale` → every ADDED/MODIFIED scenario has a test; `./scripts/check-specs.sh` → clean

**Verify** — `pnpm check` → exit 0; `./scripts/check-scenarios.sh --change changes/003-hear-the-scale` → no gaps; `grep -c 'sound-spike' src/ui/main.tsx` → `0`

### T020 · — · Converge

**Status:** todo

**Files**
- Output: `.sdd/reports/003-hear-the-scale/converge.md`, `changes/003-hear-the-scale/notes.md`

**Steps**
- [ ] 1. `pnpm check` green; `pnpm test:timing` green (paste both into `notes.md`)
- [ ] 2. Run `sdd-converge` (reviewer subagent, opus) against the target specs of `merge_delta.py preview`; append gaps as tasks; loop until Converged
- [ ] 3. Acceptance walk on the phone per intent Q10; record the verdict in `notes.md`

**Verify** — `.sdd/reports/003-hear-the-scale/converge.md` ends with `Converged`

## Coverage

| Requirement | Tasks | Covered |
|---|---|---|
| theory.circle-of-fifths/REQ-003 (M) | T013, T021 (S5) | ✅ |
| theory.circle-of-fifths/REQ-007 (M) | T013 | ✅ |
| theory.circle-of-fifths/REQ-008 (M) | T012 | ✅ |
| theory.circle-of-fifths/REQ-011 (REMOVED) | T013 (deletes span.ts and its tests) | ✅ |
| theory.circle-of-fifths/REQ-012 (A) | T003 (S2, S3), T004 (S1, S4, S5) | ✅ |
| theory.temperament/REQ-001 (A) | T005 | ✅ |
| practice.session/REQ-001 | T006 (S2), T008 (S1, S3, S4), T015 (UI) | ✅ |
| practice.session/REQ-002 | T008 (S1–S4), T014 (UI), T022 (caption amended) | ✅ |
| practice.session/REQ-003 | T007 (S1–S3), T015 (toggles UI) | ✅ |
| practice.session/REQ-004 | T006 (S1–S3), T023 (S4 amended), T014, T015 (UI) | ✅ |
| practice.session/REQ-005 | T007 (S1–S3), T009 (S2 session-level), T010 (S4) | ✅ |
| practice.session/REQ-006 | T013 (S1, S2), T009 (S3, S5), T018 (S4) | ✅ |
| practice.session/REQ-007 | T008 (S1–S3), T016 (S3 UI) | ✅ |
| practice.session/REQ-008 | T018 (S1) | ✅ |
| practice.session/REQ-009 | T009 (S1, S2) | ✅ |
| practice.session/REQ-010 | T009 (S1, S2), T016 (S1 UI) | ✅ |
| practice.session/REQ-011 | T012 (S1–S3), T016 (app) | ✅ |

## Interface consistency

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `render(now_frame: f64) -> u32`, `output_ptr() -> *const f32`, `init(sample_rate: f32)` | T002, T010 |
| T002 | `push_tone(tag: u32, hz: f32, onset_frame: f64, duration_frames: u32) -> u32` | T010 |
| T002 | `soundCommandSchema`, `SoundCommand`, `OnsetReport`, `SoundUnavailable` | T008, T010, T011 |
| T002 | `createSoundEngine(context: AudioContext): Promise<SoundEngineOutcome>` | T011 |
| T003 | `fittingOctaveCounts`, `runOf`, `effectiveOctavesOf`, `Traversal`, `Octaves`, `OctaveCount`, `Direction`, `Shape` | T004, T006, T008, T012, T013, T015 |
| T003 | `noteLabel(note: Note): string` (moved to theory) | T008 |
| T004 | `sequenceOf(run, direction): readonly SequenceNote[]`, `SequenceNote` | T008, T013 |
| T005 | `pitchHzOf(note: Note): number` | T008 |
| T006 | `TEMPO_TERMS`, `tempoTermFor`, `steppedTempo`, `tempoForTerm`, `TempoTerm`, `SessionSettings`, `NoteLength`, `SoundMode`, `defaultSessionSettings`, `defaultTraversal`, `summaryLineOf` | T007, T008, T012, T014, T015, T016 |
| T007 | `startTransport`, `tickOf`, `advance`, `TransportState`, `Tick` | T008 |
| T008 | `SoundPort`, `ClockPort`, `WakeLockPort`, `VisibilityPort`, `Result` | T009, T011 |
| T008 | `createSession(...)`, `Session`, `SessionSnapshot`, `SessionDeps`, `TargetAdvanced` | T009, T014, T015, T016, T018 |
| T010 | `push_click`, `stop_all`, `report_ptr` ; processor posts `onset` | T011 (via engine), T018 |
| T011 | `webAudioSound`, `silentSound`, `screenWakeLock`, `pageVisibility`, `browserClock` | T016 |
| T012 | `StoredSelection` v3, `firstRunDefaults` | T013, T016 |
| T013 | `StaveView`/`NamesView`/`KeyPanel` new props | T016, T017, T018 |
| T014 | `TransportCard(props)` | T016, T017 |
| T015 | `TraversalRow`, `TraversalSheet`, `TempoSheet` | T016, T017 |
| T016 | `window.__session` (dev), `App(props)` | T018 |

## Deferred

- Wide/laptop layout — carried from 002; the design has none.
- Per-instrument timbre, volume control, metres other than 4/4, pause — out of scope by the proposal.
- The prototype's `progress`/`playhead` feedback styles — it fixes `minimal`; the others are dead code in the design.
- A `pnpm check` that includes `test:timing` — deliberately separate (plan open question 2, decided).
