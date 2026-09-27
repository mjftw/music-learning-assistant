---
type: Implementation Plan
title: Hear me — plan
description: A zero-crate Rust listening crate in the shared AudioWorklet detects pitch by normalised autocorrelation (MPM) and publishes PitchDetected; the session aggregate owns the tuner beside the transport and the drone so nothing sounds while it listens; a second screen in the UI; a Playwright harness feeds the microphone from the page's own AudioContext and measures the 100 ms budget.
resource: /changes/007-hear-me/plan.md
status: stable
tags: [sdd, plan, "change:007-hear-me"]
sources:
  - resource: /changes/007-hear-me/proposal.md
  - resource: /changes/007-hear-me/design/rounds.md
  - resource: /docs/engineering.md
  - resource: /docs/design.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-28T00:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-27T22:18:38Z
sdd_id: 007-hear-me
sdd_context: listening
sdd_phase: approved
---

# Plan: Hear me

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | Every behaviour traces to the three approved deltas, `design/rounds.md`'s walkthrough rulings or `docs/decisions.md`; the close calls are Open questions |
| II — spec precedes implementation | yes | Proposal and deltas approved 2026-09-27; the preview target state (`.sdd/target/007-hear-me/`) is what this plan builds against |
| III — testable requirements | yes | Every requirement maps below to a scenario test — through `listening/published` on a fed signal, through `practice/published` with fakes, through the rendered UI, in `cargo test` on synthesised buffers, or in the measured harness |
| IV — separate verification | yes | Tests first per task (`tdd`); task-reviewer and converge reviewer never the implementer; `pnpm test:tuner` and `pnpm test:timing` at converge and finish |
| V — latency budget | **yes — this is the slice Article V was written for** | 100 ms sound → readout, split below (listening ≤ 60 ms, judgement + paint ≤ 40 ms); a late reading is dropped by an age check on the main thread; measured by a harness that feeds the microphone from the page's own AudioContext so every onset frame is known exactly |
| VI — instrument is the focus | yes | The tuner is a separate screen entered by choice; on it nothing needs a tap; the only new element on the practice screen is one header pill (the design's 1d); the Target sheet opens by choice and never stops listening |
| VII — no third-party services | yes | The microphone is the device's own; audio never leaves the page; detection runs in the existing WASM/worklet architecture; no runtime dependency |
| VIII — simplicity | yes | No new npm package, no crate; one new Rust crate of three files; one new practice domain module and one port/adapter pair; one theory function; the screens the design names and nothing more; no router |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | Follows | The detector is a pure function over a window (`detector.rs`); nearest-note, hysteresis, judgement and semitone counting are pure functions in `practice/domain/tuner.ts`; the session (imperative shell) subscribes to the port and holds the target |
| 3 Types | Follows | `TunerTarget` a sum (`auto \| pinned(position)`); `ListeningState` a sum (`off \| starting \| listening \| cannot-hear(reason)`); `Verdict` a string-literal union; the Rust detector returns `Option<Detection>`, never a sentinel frequency |
| 4 Errors | Follows | `ListeningPort.start()` returns `Result<void, ListeningUnavailable>` (refused / none / failed); a mid-session failure is an `onEnded(reason)` event; nothing throws across the boundary; a malformed message from the worklet is a `ListeningProblem` warning like `SoundProblem` |
| 6 Architecture | Follows | `listening/published` is the only thing `practice` imports from listening; `practice/published` is the only thing the UI imports; the consumed `PitchDetected` is translated into a `NoteJudged` at the session, never used raw in the view |
| 7 Testing | Follows | One test per scenario by ID; fakes at the ports (`FakeListening`); the never-both invariant's enumeration widened with the tuner's two verbs; property-style enumerations for the nearest-note inverse and the spelling |
| 8 Data and interfaces | Follows | `PitchDetected` schema-first (Zod on the host, the C ABI's result triple in Rust); `NoteJudged` schema under `practice/published`; nothing stored, so no store bump |
| 9 Dependencies | Follows | None added — no crate (the detector is ~150 lines of arithmetic), no npm package |
| 11 Observability | Follows | The one SLO (100 ms) is measurable in-app: every `PitchDetected` carries its frame, every shown reading its age; the harness reads both through dev-only hooks as `test:timing` does |
| 14 Tooling | Follows | `pnpm check` unchanged (cargo fmt/clippy/test now cover two crates); `pnpm test:tuner` beside `pnpm test:timing`, both outside `check`, both mandatory at converge and finish |

## Approach

No stack question arises for the languages: ADR 0001 and ADR 0003 put
`listening` in Rust→WASM on the audio thread, and the drivers are the
imposed constraints (a static page; the phone's own microphone — product
constraints 1), the numbered NFRs (100 ms, ±2 ¢ down to E2, 20 readings/s —
2), and the map (3); §1/§14 and the repository agree (4, 5). What is chosen
here is the **detector**, the **thread and clock**, the **aggregate**, and
the **harness**.

A new crate `listening` (`src/listening/`, zero crates, `cdylib`, a
workspace member beside `sound`) runs in a second `AudioWorkletProcessor`
in the **same AudioContext** as synthesis: `main.tsx` memoises one
`() => new AudioContext()` and hands it to both adapters, so there is one
audio thread and one clock (ADR 0003's "one audio-thread architecture")
without touching `SoundPort`. The host shim (`listening/published/
processor.ts`, boundary plumbing like `sound`'s) copies each 128-frame input
quantum into the crate's ring buffer; every **hop of 512 frames** the crate
analyses the last **2048 frames** by the **McLeod Pitch Method** — the
normalised square-difference function (NSDF) over lags 22–686 (2200 Hz down
to 70 Hz at 48 kHz), the first key maximum above a clarity threshold
picked and refined by parabolic interpolation — and writes a result triple
`[hz, clarity, at_frame]` or nothing. The shim posts each result to the
main thread as a `PitchDetected` (`hz`, `confidence` = clarity, `atFrame`
= the frame of the last sample in the window). `createListener(context)`
in `listening/published/index.ts` owns `getUserMedia` (echo cancellation,
noise suppression and auto-gain **off**), the `MediaStreamAudioSourceNode →
AudioWorkletNode` graph, the permission outcomes (`refused` / `none` /
`failed`), track-ended, and `stop()` (tracks stopped, node disconnected).

The **practice** context gets a `ListeningPort` and its adapter
(`web-audio-listening.ts`), a pure `tuner.ts` (the in-tune band, the 56 ¢
hand-over, the judgement against a target, the semitone count beyond ±50 ¢,
the −/+ bounds E2–C7), and the **Session aggregate** owns the tuner's
lifecycle beside the transport and the drone, exactly as 004 put the drone
there: `enterTuner()` stops both, refuses every sound-making verb while the
tuner is active, holds the wake lock, stops listening when hidden and
resumes when shown; `leaveTuner()` releases the microphone and forgets the
target. Each `PitchDetected` is aged against `listening.currentFrame()` on
arrival and again at paint (the UI's `useEffect` after commit reports the
paint frame back through `session.readingShown(id)` — see Interfaces); a
reading older than 100 ms at either point is dropped, never shown. The
session emits `NoteJudged` per shown reading and exposes a `tuner` block on
the snapshot. **theory** gains `nearestNoteOf(hz, spelling)` in
`temperament.ts` — the inverse of `pitchHzOf` — plus the `noteAtPosition`
spelling helper it needs.

The **UI** adds a `screen` state (`practice | tuner`; no router — the tool
never opens on the tuner, so there is no URL to honour): `Header` gains
the Tuner pill; `TunerScreen` composes `TunerLevel`, `TunerStave` (the
whole-note head on a treble stave, reusing `StaveView`'s geometry
constants), `TargetPill`, `TargetSheet` with `PitchSpiral`, and the
footer with the ♯/♭ toggle bound to the existing spelling preference. The
tuner colours (warm / cool / in-tune / band) join `theme.ts`, which
`docs/design.md` §7–§8 now names as the tokens file.

The **harness** `scripts/tuner-timing-test.mjs` (`pnpm test:tuner`) runs
headless Chromium with the page's `getUserMedia` replaced (dev-only init
script) by a `MediaStreamAudioDestinationNode` fed from an oscillator in
the **page's own AudioContext**, so every tone's onset is an exact frame on
the same clock the listener stamps `atFrame` with. It sweeps E2–C7 as a
sine and as a six-harmonic PeriodicWave, measures onset → first readout,
per-readout age, readings per second, cents error, the hand-over
glissando, and silence / white noise, and prints a table like
`test:timing`'s. The design is vendored; `scripts/design-shots.mjs` is
pointed at `Tuner.dc.html` 4a / 5c and `Practice.dc.html`.

### Alternatives rejected

| Option | Why not |
|---|---|
| FFT peak picking | ±2 ¢ at E2 needs ~0.1 Hz resolution — a window of several hundred ms, outside the 100 ms budget; and a flute's strong harmonics make the loudest bin the octave above (`listening.pitch-detection/REQ-002/S2`) |
| YIN (cumulative mean normalised difference) | Equivalent accuracy and cost; MPM's NSDF gives a clarity in [0, 1] directly usable as the confidence, and its "first key maximum" rule is less octave-prone on harmonic-rich tones. Kept as the fallback if the spike finds MPM's clarity threshold unstable on the flute |
| A time-domain zero-crossing / period counter | Cheap, but ±2 ¢ needs sub-sample period estimates a harmonic-rich tone defeats |
| A second, dedicated AudioContext for listening | Two audio threads and two clocks to correlate; the drop rule and the harness would need cross-context time mapping; ADR 0003 wants one audio-thread architecture. The memoised factory shares one context with no change to `SoundPort` |
| Detect on the main thread with `AnalyserNode` + JS | The main thread is where paint contends; `getFloatTimeDomainData` is polled, not clocked, so `atFrame` would be a guess — Article V wants the measurement at the source, as `sound` reports onsets |
| A separate `Tuner` aggregate with the UI coordinating the exclusions | 004's reasoning: the never-both invariant (`practice.tuner/REQ-001/S3`) would live in `App.tsx`, untestable through `practice/published`; the wake lock and hidden rules would be duplicated. One aggregate, one invariant |
| A router library for the second screen | A dependency for two screens and no URL requirement (REQ-009: never opens on the tuner) — Article VIII |
| Feed the harness's microphone with Chromium's `--use-file-for-fake-audio-capture` | The file's start is not aligned to the page's clock, so onset instants are unknown; kept as the fallback if the in-page override cannot be attached before `getUserMedia` is called |
| Tolerate a late reading and mark it stale | Article V: silence beats late feedback; the spec says drop |
| Send raw audio to the main thread and detect in TypeScript | Makes listening bilingual — ADR 0001 |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | TypeScript (strict) SPA; Rust (stable, `wasm32-unknown-unknown`, zero crates) for the detector | as repo | ADR 0001/0003 — listening's rules in one language, on the audio thread |
| Framework | React 19 + Vite | as repo | Unchanged; a `screen` state, no router |
| Audio | Web Audio: one `AudioContext` shared by both worklets; `getUserMedia` for capture | platform | The only capture API; the worklet is the only clocked, non-polled place to analyse |
| Data store | none — nothing is stored (REQ-009); the spelling preference already lives in `SelectionStore` v5 | as repo | No schema bump |
| Testing | Vitest + Testing Library; `cargo test`; Playwright (dev-only) for `test:tuner`, `test:timing`, `design-shots` | as repo | Unchanged |
| Build / tooling | pnpm, Prettier, ESLint, tsc, cargo fmt/clippy, `pnpm check`; `scripts/build-sound.sh` generalised to build both crates | as repo | One script, two crates |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| — | none | The detector is ~150 lines of `f32` arithmetic; `getUserMedia` and the worklet are the platform |

## Data model

**listening (Rust, `src/listening/src/`)**

```rust
const WINDOW: usize = 2048;      // 42.7 ms @ 48 kHz — ≥ 2.9 periods of E2 (period 582 frames)
const HOP: usize = 512;          // 10.7 ms — ~94 analyses/s, ≥ 20/s with margin (REQ-004/S1)
const MIN_HZ: f32 = 70.0;        // below E2 (82.41) with margin; lag_max = sample_rate / MIN_HZ
const MAX_HZ: f32 = 2200.0;      // above C7 (2093.00); lag_min = sample_rate / MAX_HZ
const CLARITY_THRESHOLD: f32 = 0.90;  // spike-tuned (Open question 2 of the proposal): silence, breath and noise fall well below; a flute well above

pub struct Detector { sample_rate: f32, ring: [f32; WINDOW], write: usize, since_hop: usize }
pub struct Detection { hz: f32, clarity: f32 }        // clarity ∈ (0, 1]; never emitted below the threshold

// nsdf(τ) = 2·Σ x[i]x[i+τ] / Σ (x[i]² + x[i+τ]²) over the window, τ ∈ [lag_min, lag_max]
// pick: the first positive-going zero crossing after τ = 0, then the highest maximum among the
//       key maxima whose value ≥ 0.93 × the global maximum (McLeod's k), refined by a parabola
//       through its neighbours → τ*; hz = sample_rate / τ*; clarity = nsdf(τ*)
```

The C ABI result is a triple `[hz, clarity, at_frame]` in a 3-`f64` buffer;
`analyse(now_frame) -> u32` returns 1 when a detection was written for
this hop, else 0. `at_frame` = `now_frame + 128 − 1` of the quantum that
completed the hop (the last sample in the window).

**listening (published schema)**

```ts
pitchDetectedSchema = z.object({
  hz: z.number().positive(),          // REQ-003/S4: > 0 always
  confidence: z.number().min(0).max(1),
  atFrame: z.number().nonnegative(),  // the AudioContext frame of the last sample the detection reflects
});
type ListeningUnavailable = { reason: "refused" | "none" | "failed" | "worklet-failed" | "wasm-failed"; detail: string };
type ListeningEnded = { reason: "failed" };            // track ended / permission revoked mid-session
```

**practice**

```ts
const IN_TUNE_BAND_CENTS = 5;          // practice.tuner/REQ-002; fixed (walkthrough)
const HANDOVER_CENTS = 56;             // REQ-002/S4: the shown note holds until the pitch is this far from it
const READING_MAX_AGE_MS = 100;        // REQ-006: dropped beyond this, measured against listening.currentFrame()
const TUNER_LOWEST_POSITION = 40;      // E2 in theory's pitchPosition numbering (C4 = 60)
const TUNER_HIGHEST_POSITION = 96;     // C7

type TunerTarget = { readonly kind: "auto" } | { readonly kind: "pinned"; readonly position: number };
type Verdict = "sharp" | "flat" | "in-tune";
type ListeningState =
  | { readonly kind: "off" }
  | { readonly kind: "starting" }
  | { readonly kind: "listening" }
  | { readonly kind: "cannot-hear"; readonly reason: "refused" | "none" | "failed" };

interface NoteJudged {                  // practice/published/note-judged.schema.ts — the map's event
  readonly target: Note;               // the pinned target, or the nearest note (with hysteresis) on auto
  readonly cents: number;              // signed, whole cents from `target` — may exceed ±50 only when pinned
  readonly verdict: Verdict;
  readonly heard: { readonly hz: number; readonly nearest: Note; readonly cents: number }; // the raw detection and its nearest note
  readonly atFrame: number;
}

interface TunerSnapshot {
  readonly active: boolean;            // the tuner screen is showing
  readonly listening: ListeningState;
  readonly target: TunerTarget;
  readonly targetNote: Note | null;    // the pinned note, spelled per the preference; null on auto
  readonly reading: NoteJudged | null; // null = "Play a note" (REQ-003)
  readonly canStepDown: boolean;       // pinned and position > E2
  readonly canStepUp: boolean;         // pinned and position < C7
}
```

`SessionSnapshot` gains `tuner: TunerSnapshot`. Hysteresis state (the
shown nearest note) lives in the session, not the snapshot; it resets when
a reading gap ("Play a note") occurs, as the prototype's `fresh` does.

**theory**

```ts
nearestNoteOf(hz: number, spelling: SpellingPreference): { readonly note: Note; readonly cents: number }
// position = round(69 + 12·log2(hz / 440)); a .5 rounds up (REQ-002/S4: halfway → the upper note at −50)
// cents = round(1200·log2(hz / pitchHzOf(note)))
noteAtPosition(position: number, spelling: SpellingPreference): Note
// pitch class 0..11 → C C♯/D♭ D D♯/E♭ E F F♯/G♭ G G♯/A♭ A A♯/B♭ B; octave = floor(position / 12) − 1
```

**ui — no stored data changes.** The spelling toggle on the tuner writes
the same `selection.spelling` the circle's toggle writes (REQ-009/S1).

## Interfaces

**`listening/published` (new)**

```ts
export interface Listener {
  start(): Promise<Result<void, ListeningUnavailable>>;  // asks for the mic now (REQ-001/S2); idempotent while listening
  stop(): void;                                          // stops tracks, disconnects; nothing published after (REQ-001/S3)
  currentFrame(): number;                                // the shared context's frame, for ageing
  sampleRate(): number;
  onPitch(listener: (pitch: PitchDetected) => void): () => void;
  onEnded(listener: (ended: ListeningEnded) => void): () => void;
  onProblem(listener: (problem: ListeningProblem) => void): () => void;   // "invalid-pitch-report" — a malformed triple, warned once like SoundProblem
  dispose(): void;
}
export function createListener(context: AudioContext): Promise<ListenerOutcome>;  // compiles listening.wasm, adds the worklet module; failures as Results
```

C ABI (`lib.rs` / `processor.ts`): `init(sample_rate)`, `input_ptr()`
(128 `f32`), `push(now_frame) -> u32` (copies the quantum into the ring;
when a hop completes, analyses and returns 1 if a detection was written),
`result_ptr()` (3 `f64`). The shim's `process(inputs)` copies
`inputs[0][0]` into `input_ptr()` (the hoisted-view pattern from
`sound`'s shim), calls `push(currentFrame)`, and posts `{type: "pitch",
hz, confidence, atFrame}` when it returns 1. No allocation, no parsing on
the audio thread.

**`practice/ports/listening.ts` (new)** — the `Listener` interface above
minus `dispose` ordering details: `start`, `stop`, `currentFrame`,
`sampleRate`, `onPitch`, `onEnded`. The adapter
`practice/adapters/web-audio-listening.ts` takes the same memoised
`() => AudioContext` factory `webAudioSound` takes (main.tsx: `const
audioContext = memoised(() => new AudioContext())`, passed to both) and
calls `createListener(context)` once; `ListeningUnavailable` passes
through as the port's error.

**`practice/published` — added**

```ts
export type { TunerTarget, TunerSnapshot, NoteJudged, Verdict, ListeningState, ListeningPort };
export { IN_TUNE_BAND_CENTS, HANDOVER_CENTS, READING_MAX_AGE_MS, TUNER_LOWEST_POSITION, TUNER_HIGHEST_POSITION };
export { judge, nearestWithHandover, semitoneCountOf };          // pure, from domain/tuner.ts
export { webAudioListening } from "../adapters/web-audio-listening";

Session.enterTuner(): void            // stop() + stopDrone() first (REQ-001); wake lock; listening.start() → state
Session.leaveTuner(): void            // listening.stop(); target := auto; state off; wake lock released unless… (nothing else holds it: playback and the drone are already stopped)
Session.holdTarget(): void            // pins the current reading's nearest note; no-op without a reading (REQ-004/S1)
Session.pinTarget(position: number): void   // from the spiral; clamped to E2–C7
Session.stepTarget(delta: -1 | 1): void     // no-op on auto or at the bounds (REQ-004/S4)
Session.clearTarget(): void           // ✕ / Auto (REQ-004/S5)
Session.readingShown(atFrame: number): void // the UI reports the paint of the reading it just committed; the session drops the *next* reading if this one's age at paint exceeded the budget — see below
Session.onNoteJudged(listener: (event: NoteJudged) => void): () => void
createSession(context, traversal, scaleChoice, settings, droneSettings, spelling, deps)   // deps gains `listening`; spelling is needed for the nearest note's name
Session.setSpelling(spelling): void   // re-spells targetNote and the next reading (REQ-002/S5)
```

While `tuner.active`, `start()`, `startDrone()` and `tapNote()` are
no-ops (REQ-001/S3); `setContext` / `setSpelling` still apply (the
spiral's instrument range and the spelling follow the practice screen).

**The age check, precisely.** On each `PitchDetected`: `ageMs = (listening.
currentFrame() − atFrame) / sampleRate × 1000`; if `> READING_MAX_AGE_MS`
the detection is dropped (REQ-006/S2). Otherwise the session judges it,
updates `tuner.reading`, emits `NoteJudged` and notifies. The UI's
`TunerScreen` calls `session.readingShown(reading.atFrame)` in a
`useLayoutEffect` after the commit; the session computes the age at that
instant and records `lastPaintAgeMs` (dev-exposed for the harness). A
paint that missed the budget cannot be un-shown; what the rule buys is that
a *backlog* never accumulates — the session coalesces: while a reading is
awaiting paint, newer detections replace it rather than queue, so at most
one reading is ever in flight. Open question 1 asks whether the harness
should gate on the paint age as well as the arrival age.

**Events**

| Event | Direction | Schema | Notes |
|---|---|---|---|
| `PitchDetected` | `listening` → `practice` | `src/listening/published/pitch-detected.schema.ts` | Translated at the session into a `NoteJudged`; never reaches the view raw |
| `NoteJudged` | `practice` → UI | `src/practice/published/note-judged.schema.ts` | One per shown reading; the harness subscribes to it as it subscribes to `TargetAdvanced` today |

## Structure

```
src/listening/                        ← NEW context root (docs/domain.md: src/listening/)
  Cargo.toml                          ← crate "listening", cdylib + rlib, zero deps; workspace member
  src/lib.rs                          ← C ABI: init, input_ptr, push(now_frame), result_ptr; the static engine as in sound
  src/ring.rs                         ← the 2048-frame ring and hop counter
  src/detector.rs                     ← NSDF, key-maximum pick, parabolic refine, clarity; unit tests on synthesised sines/harmonic tones/noise
  published/index.ts                  ← createListener(context): getUserMedia, graph, Results, onPitch/onEnded/onProblem
  published/processor.ts              ← the worklet host shim (no domain logic)
  published/pitch-detected.schema.ts  ← Zod: PitchDetected, ListeningUnavailable, ListeningEnded, ListeningProblem
  pkg/listening.wasm                  ← built by scripts/build-sound.sh (renamed target: both crates)
src/theory/
  domain/notes.ts                     ← noteAtPosition(position, spelling)
  domain/temperament.ts               ← nearestNoteOf(hz, spelling)
  published/index.ts                  ← export both
src/practice/
  ports/listening.ts                  ← NEW: ListeningPort
  adapters/web-audio-listening.ts     ← NEW: the real port over listening/published
  domain/tuner.ts                     ← NEW: constants, TunerTarget, judge(), nearestWithHandover(), semitoneCountOf(), step bounds
  domain/session.ts                   ← enterTuner/leaveTuner, the exclusions, ageing + coalescing, target verbs, NoteJudged, hidden/shown, wake lock
  published/note-judged.schema.ts     ← NEW
  published/index.ts                  ← exports above
src/ui/
  theme.ts                            ← tuner: { sharp, flat, inTune, band, targetHead, ghostInk } (docs/design.md §8)
  Header.tsx                          ← the Tuner pill (design 1d) beside ⚙; onOpenTuner
  App.tsx                             ← screen state; enter/leave; passes the tuner snapshot; spelling toggle shared
  TunerScreen.tsx                     ← NEW: header (‹ Practice, LISTENING/NO MIC), the level area, the stave strip, the target pill row, the "Can't hear" card, the footer
  TunerLevel.tsx                      ← NEW: the ±50 ¢ rule, band, line, tag, "↑ sharp / halfway to", "▼ N st"
  TunerStave.tsx                      ← NEW: treble stave, whole-note head drift (≤ 3.5 px), dotted guide, cents, 2.5 s trail (last 50 readings), ghost target head, 8va/8vb/15ma/15mb, HEARD / IS Hz
  TargetPill.tsx                      ← NEW: "TARGET auto · nearest ▼" / "− TARGET A4 + ✕"
  TargetSheet.tsx                     ← NEW: Auto / Hold / the spiral, on BottomSheet
  PitchSpiral.tsx                     ← NEW: one ring per octave E2–C7 ∪ range, wedges, dimming, needle, trail, hub
  main.tsx                            ← memoised AudioContext factory shared by webAudioSound and webAudioListening; window.__listening dev hook
tests/listening/
  scenarios/pitch-detection.test.ts   ← REQ-001, REQ-005, REQ-006 through createListener with a fake AudioContext/getUserMedia (jsdom); REQ-002/REQ-003/REQ-004 cite the harness (the timing.test.ts pattern)
tests/practice/
  fakes.ts                            ← FakeListening (feed(pitch), end(), failWith), sessionDeps gains it
  scenarios/tuner-way-in-out.test.ts  ← practice.tuner/REQ-001/S1, S2, S4
  scenarios/tuner-reading.test.ts     ← REQ-002 (S1–S5), REQ-003
  scenarios/tuner-target.test.ts      ← REQ-004
  scenarios/tuner-budget.test.ts      ← REQ-006/S2 (fake clock: a stale detection is dropped, coalescing)
  scenarios/tuner-cannot-hear.test.ts ← REQ-007
  scenarios/tuner-hidden-awake.test.ts← REQ-008
  scenarios/tuner-memory.test.ts      ← REQ-009/S2
  invariants/never-both.test.ts       ← REQ-001/S3: the enumeration gains enterTuner/leaveTuner (six verbs, up to four taps)
tests/theory/scenarios/temperament.test.ts ← theory.temperament/REQ-002/S1–S4; invariants/nearest-note-inverse.test.ts ← S5
tests/ui/scenarios/
  tuner-screen.test.tsx               ← REQ-002 rendered texts/colours, REQ-003, REQ-007 card, REQ-001 pill and ‹ Practice
  tuner-stave.test.tsx                ← REQ-005
  target-sheet.test.tsx               ← REQ-004 sheet, spiral wedges, hub
  selection-persistence.test.tsx      ← REQ-009/S1
scripts/
  build-sound.sh                      ← builds both crates (name kept; AGENTS.md notes it)
  tuner-timing-test.mjs               ← NEW: pnpm test:tuner — the measured harness (REQ-006/S1, listening REQ-002/S5, REQ-003/S1–S2, REQ-004/S1–S2)
  design-shots.mjs                    ← PROTOTYPE_PATH → Tuner.dc.html (#4a live/silent/cannot-hear/pinned, #5c) and Practice.dc.html
docs/adr/0006-pitch-detection-by-normalised-autocorrelation.md
docs/design.md                        ← §7–§8 (sdd-design C, this gate)
```

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| listening.pitch-detection/REQ-001 (mic on request, released) | `createListener.start()` calls `getUserMedia` only then; `stop()` stops every track and disconnects | S1 `pitch-detection` (no `getUserMedia` call before `start`); S2 (called on `start`, graph built after grant); S3 (tracks stopped, no `onPitch` after `stop`) — with a fake `mediaDevices` in jsdom |
| listening.pitch-detection/REQ-002 (a heard pitch, ±2 ¢, E2–C7, no octave error) | `detector.rs` NSDF + key-maximum pick + parabolic refine | S1–S4 `cargo test` on synthesised buffers (sine 440 → 439.5–440.5; six-harmonic 440 → never 880/220; E2 82.41; C7 2093); S5 the harness sweep (both tones, every semitone) |
| listening.pitch-detection/REQ-003 (silence/noise nothing; invariant) | `CLARITY_THRESHOLD`; `hz > 0` by construction (`lag_min ≥ 1`); schema `positive()` | S1–S3 `cargo test` (silence, white noise, tone-breath-tone) + the harness; S4 an enumeration in `cargo test` over tones, silence, noise, a chord, clipping: every emitted detection has hz > 0 and clarity ∈ (0, 1] |
| listening.pitch-detection/REQ-004 (every 50 ms; time; late dropped) | HOP = 512 (≈ 10.7 ms); `atFrame` from the quantum; the drop is the session's age check (the crate never buffers — a hop is analysed in the quantum that completes it) | S1 the harness (≥ 100 readings in 5 s, gaps ≤ 50 ms); S2 the harness (first `PitchDetected` for a tone with `atFrame` ∈ [onset, onset + 100 ms]); S3 `tuner-budget` (a stale detection dropped) — the invariant's listening half is "a hop is never queued", a `cargo test` that `push` analyses in place |
| listening.pitch-detection/REQ-005 (hidden stops, shown resumes) | `Listener` has no visibility logic; the session's `visibility.onHidden` → `listening.stop()`, `onShown` → `start()` while the tuner is active (`VisibilityPort` gains `onShown`) | S1/S2 `tuner-hidden-awake` (FakeVisibility hide → `stopCalls`; show → `startCalls`, no new permission request because the adapter re-uses the granted stream? — no: `stop()` released it; `start()` asks again, and the platform remembers the grant, so no prompt is *shown*) |
| listening.pitch-detection/REQ-006 (refused/none/failed) | `createListener.start()` maps `NotAllowedError` → refused, `NotFoundError` → none, else failed; `track.onended` → `onEnded({reason: "failed"})` | S1–S3 `pitch-detection` with the fake `mediaDevices` rejecting / ending a track |
| practice.tuner/REQ-001 (way in/out; nothing sounds) | `Session.enterTuner/leaveTuner`; `start/startDrone/tapNote` no-ops while active; `Header` pill; `TunerScreen` ‹ Practice | S1 `tuner-way-in-out` (listening `startCalls` 1, nothing posted to sound) + `tuner-screen` (LISTENING); S2 (stopAll within 50 ms, drone `stop(tag)`, caption after leave); S3 `never-both` widened (every interleaving of ▶ ❚❚ drone-▶ drone-■ enter leave up to four taps: no tone/click/drone live while active); S4 (listening `stopCalls`, target auto, snapshot identical to before) |
| practice.tuner/REQ-002 (the reading, the level, hysteresis, spelling) | `nearestNoteOf`; `judge()`; `nearestWithHandover()`; `TunerLevel`; `NoteJudged` | S1–S3 `tuner-reading` (445 → A4 +20 sharp; 441 → in tune, 442 → sharp; 461 flat-spelled → B♭4 −19) + `tuner-screen` (texts, colours from `theme.tuner`); S4 (a fed glissando 452.9 → 454 → 455 Hz: A4 +50, A4 +50, A♯4 −42; back down holds A♯4 to 56 ¢) ; S5 `tuner-screen` (♭ tapped → `onSpellingChange("flat")`, the same handler the circle uses) |
| practice.tuner/REQ-003 (nothing heard) | `reading = null` after a gap; `TunerScreen` "Play a note"; target name greyed | S1–S3 `tuner-reading` (no reading → null, hysteresis reset) + `tuner-screen` (texts; with a target: greyed name, ghost head, "A4 IS 440.0 Hz") |
| practice.tuner/REQ-004 (the target) | `holdTarget/pinTarget/stepTarget/clearTarget`; `judge()` against the target; `semitoneCountOf`; `TargetPill`; `TargetSheet`; `PitchSpiral` | S1 `tuner-target` (hold → pinned A4; 461 Hz → cents +81, "▲ 1 st", "playing A♯4") + `target-sheet`; S2 `target-sheet` (D5 wedge → pinned 74; hub "D5 · 587.3 Hz"; wedges < C4 and > C7 at the dimmed opacity, E2 present); S3 `tuner-target` (523.25 vs A4 → +300, sharp, "▲ 3 st") + `tuner-stave` (heard C5, ghost A4); S4 (+ → 70, − − → 69, 68; no-op at 96 and 40); S5 (clear → auto, 445 → A4 +20); S6 (sheet open through a reading: `stopCalls` 0, needle path updates) |
| practice.tuner/REQ-005 (the stave strip) | `TunerStave`: `StaveView`'s geometry constants, whole-note head, drift = cents × 0.07 px (≤ 3.5), dotted guide, trail path from the last 50 readings, ghost head, 8va/8vb/15ma/15mb by diatonic index (> 49 → −7; < 24 → +7; repeat once more for 15), HEARD / IS | S1–S4 `tuner-stave` (head y, accidental, "+20" text and colour, "HEARD 445.0 Hz", "A4 IS 440.0 Hz"; ♭ on B♭4; E2 → E3 + "8vb", C2 → C4 + "15mb"; ghost at A4 beside heard C5) |
| practice.tuner/REQ-006 (100 ms, measured; late dropped) | The age check + coalescing in the session; HOP/WINDOW in the crate; `readingShown` | S1 the harness (`pnpm test:tuner`: onset → first `tuner-reading` mutation ≤ 100 ms for every tone; ≥ 20 readings/s steady; per-reading paint age reported — Open question 1); S2 `tuner-budget` (FakeListening feeds a detection whose `atFrame` is 101 ms behind the fake `currentFrame` → no reading, no `NoteJudged`; a burst of three detections while one is unpainted → only the newest is judged); S3 the user's walk |
| practice.tuner/REQ-007 (cannot hear) | `enterTuner` on a failed `start()` → `listening: cannot-hear(reason)`; `onEnded` → same; `TunerScreen` NO MIC, "–", the card | S1 `tuner-cannot-hear` (`failWith("refused")` → state, no reading) + `tuner-screen` (card text verbatim, level/strip/footer still rendered, ‹ Practice enabled); S2 (`leaveTuner`, clear `failWith`, `enterTuner` → listening); S3 (`end()` → cannot-hear within one notify, reading null) |
| practice.tuner/REQ-008 (hidden/shown; awake) | `visibility.onHidden` → `listening.stop()` + reading null; `onShown` → `start()` while active; `wakeLock.acquire()` on enter, `release()` on leave | S1 `tuner-hidden-awake` (hide → `stopCalls` 1, reading null; show → `startCalls` 2, `permissionPrompts` 0 in the fake); S2 (`wake.acquired` while active, released after leave) — the phone itself at acceptance |
| practice.tuner/REQ-009 (nothing remembered; spelling persists) | No store field; `leaveTuner` → target auto; App always starts on `screen: "practice"`; the spelling toggle writes `selection.spelling` | S1 `selection-persistence` (stored v5 with flat spelling → practice screen, flat; enter → auto); S2 `tuner-memory` (pin D5, leave, enter → auto) |
| theory.temperament/REQ-002 (nearest note) | `nearestNoteOf`, `noteAtPosition` | S1–S4 `temperament.test` (445 → A4 +20; 436 → −16; 440 → 0; 82.41 → E2; 2093 → C7; 466.16 → A♯4 / B♭4; 452.89 → A♯4 −50, 452.8 → A4 +50); S5 `nearest-note-inverse` (A0–C8 × both spellings: `nearestNoteOf(pitchHzOf(n))` = n, 0 ¢) |

## Test strategy

- **Unit (Rust, `cargo test`):** the detector on synthesised buffers —
  sines and six-harmonic tones at every semitone E2–C7 (the accuracy
  bound, the octave-error bound), silence, white noise (a seeded LCG, no
  crate), a two-note chord, a clipped tone; clarity threshold behaviour;
  `push` analysing exactly once per hop with no queue; `hz > 0` on every
  emitted detection. A `--release` benchmark test prints the cost of one
  analysis at 48 kHz (the spike's number; not asserted, so the phone is
  never gated by the laptop).
- **Unit (theory, pure):** `nearestNoteOf` scenarios and the A0–C8 inverse
  enumeration.
- **Integration (practice scenarios):** the session through
  `practice/published` with `FakeListening` (a `feed(pitch)` that the test
  calls at chosen fake-clock frames), `FakeSound`, `FakeClock`,
  `FakeWakeLock`, `FakeVisibility` (gaining `show()`): every tuner scenario
  is a statement about the snapshot, the emitted `NoteJudged`, and which
  port verbs were called.
- **Invariant:** `never-both` widened to six verbs; `nearest-note-inverse`.
- **End-to-end (ui scenarios):** `TunerScreen` and its parts rendered in
  `App` with the fakes; the harness `pnpm test:tuner` for the measured
  requirements; design fidelity via `scripts/design-shots.mjs` against 4a
  / 5c, reviewed in the refinement loop (sdd-design D) — not a pixel gate.
- **Not tested, and why:** the microphone's own capture latency on the phone
  (not observable from a page — `AudioContext` reports output latency
  only; the user's walk is the check, and the risk table says so); the
  spiral's hover state (a desktop-only affordance the phone never shows —
  rendered, not asserted); the exact trail geometry beyond "50 points,
  oldest first"; the Wake Lock on a real phone (acceptance, as in 003/004).
  `pnpm test:timing` is not extended (transport and scheduler untouched)
  but still runs at converge and finish.

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| MPM over 2048 × 665 lags (~1.4 M multiply-adds per hop, ~94 hops/s) is too slow in WASM on the phone's audio thread — dropouts in the *sound* worklet sharing the thread | medium | Crackle or missed hops while the tuner listens (never during playback — the two never run together) | T001 is the spike: the `--release` benchmark and a phone run; fallbacks in order: HOP 1024 (halves the load, still ≥ 45/s); NSDF computed only every other lag above 300 Hz; downsample ×2 for lags > 200 (E2–E4 need no 48 kHz resolution) |
| The onset latency (window fill ~25 ms + hop ≤ 11 + paint) plus the phone's unmeasurable capture latency exceeds what feels instant even though the harness passes | medium | The user's walk says "behind the breath" | The harness prints the onset → readout number; the walk decides; the next knob is WINDOW 1536 (32 ms, still 2.6 periods of E2) at the cost of accuracy at the very bottom — E2 is the first cut (intent Q10) |
| `getUserMedia` constraints ignored — the browser applies echo cancellation / noise suppression anyway and eats the flute's tone | low–medium | Readings drop out on soft notes | The harness cannot see this (its stream is synthetic); the walk can; log the applied `track.getSettings()` once in dev (engineering §11) |
| The phone's browser cannot run a worklet on a `MediaStreamAudioSourceNode` (iOS Safari has had such gaps) | low (the user's phone already runs the sound worklet) | "Can't hear" although the mic was granted | Surfaces as `worklet-failed`; the spike's phone run checks capture before anything else is built |
| React re-rendering the tuner ≥ 47×/s (spiral + stave + level) costs paint time on the phone and pushes readings over the budget | medium | Paint ages creep past 100 ms in the harness's paint-age column | `TunerScreen` subscribes to `NoteJudged` and updates only the level/stave/tag; the spiral re-renders only while the sheet is open; `React.memo` on the static parts as 004 did; `useLayoutEffect` reports the paint so the harness sees it |
| Clarity threshold too high (flute breathy attacks read as "Play a note") or too low (breath reads as a note) | medium | Flicker at note starts or phantom readings | The threshold is one constant; the harness's breath scenario (REQ-003/S3) and the walk tune it; the reading's hysteresis already suppresses name flicker |
| Two worklet nodes on one context: `createListener` before any ▶ means the shared context is created at tuner entry, not at the first ▶ — `test:timing`'s pre-flight counts one context per session, which stays true | low | The pre-flight count changes | The memoised factory guarantees one; the pre-flight never enters the tuner |
| The in-page `getUserMedia` override cannot be attached before the app calls it | low | The harness cannot feed a signal | `page.addInitScript` runs before any module (as the pre-flight's `AudioContext` wrapper does); fallback: Chromium's file-based fake capture with a silence-anchored file |

## Rollout

No flag. The Tuner pill is the only way in; reverting the merge removes
the screen, the crate and the port. Nothing is stored, so there is no
migration and nothing to reverse. `scripts/build-sound.sh` builds both
crates (name kept; `AGENTS.md` notes it). `pnpm test:tuner` and
`pnpm test:timing` are both required at converge and finish.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | *Answered 2026-09-28: report the paint age, gate on onset → readout and arrival age.* Should the harness *gate* on the paint age (main-thread commit → paint, reported by `readingShown`) as well as on onset → first readout and arrival age? Gating on it makes the laptop's headless Chromium paint timing decisive, as 003/004's 30 ms highlight gate did (which passed by 0.57 ms once); reporting it only keeps the gate on what the spec names | the harness task's assertions | Report the paint age in a column, gate on onset → readout ≤ 100 ms and arrival age ≤ 100 ms; revisit after the phone walk, as 004 did |
| 2 | *Answered 2026-09-28: measure at the spike; a smaller window before a tighter paint share.* The budget split — listening ≤ 60 ms (window fill + hop + analysis + message), judgement + paint ≤ 40 ms — is a plan number for the spike to confirm; if the spike measures listening at > 60 ms on the laptop, cut WINDOW to 1536 (then E2 has 2.6 periods and ±2 ¢ at the bottom is at risk) or accept a tighter paint share? | nothing until the spike reports | Measure at T001; prefer the smaller window over a tighter paint share — the phone's paint is the part we cannot speed up |
| 3 | *Answered 2026-09-28: add `onShown` to the port.* `VisibilityPort` gains `onShown` (REQ-008/S1 needs it; playback and the drone only ever needed `onHidden`). Add it to the port (every fake and adapter grows one method) or give the tuner its own visibility subscription in the adapter? | the hidden/shown task | Add `onShown` to the port — one port, one adapter, one fake |
