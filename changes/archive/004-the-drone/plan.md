---
type: Implementation Plan
title: The drone — plan
description: An addressable, open-ended drone voice in the Rust synthesiser; the session owns the drone beside the transport so the two can never sound together; a pill in the disc and a sound-only sheet in the UI.
resource: /changes/004-the-drone/plan.md
status: stable
tags: [sdd, plan, "change:004-the-drone"]
sources:
  - resource: /changes/004-the-drone/proposal.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-24T16:30:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T15:12:56Z
sdd_id: 004-the-drone
sdd_context: practice
sdd_phase: approved
---

# Plan: The drone

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | Every behaviour traces to the approved deltas or `docs/decisions.md`; the two close calls are Open questions |
| II — spec precedes implementation | yes | Proposal and both deltas approved 2026-09-24; the preview target state (`.sdd/target/004-the-drone/`) is what this plan builds against |
| III — testable requirements | yes | Every requirement maps to a scenario test below — through `practice/published` with the fakes, through the rendered UI, or in `cargo test` on rendered samples |
| IV — separate verification | yes | Tests first per task (`tdd`); task-reviewer and converge reviewer never the implementer; `pnpm test:timing` at converge and finish |
| V — latency budget | no | The drone gives no feedback on the learner's playing; its own numbers (50 ms on, 500 ms off, 100 ms glide) are the spec's and are tested on the fakes' frame clock |
| VI — instrument is the focus | yes | One pill in the disc's empty upper half (attention cost stated in the proposal); the sheet opens only by choice; nothing ever interrupts a run — the drone can only be *started* deliberately, and a sheet never stops anything |
| VII — no third-party services | yes | Synthesised in the existing WASM worklet; no new runtime dependency |
| VIII — simplicity | yes | No new dependency; one new Rust voice kind, three new commands, one new practice domain module, two new UI components; the transport, scheduler and theory context are untouched |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | Follows | The octave rule, note resolution and bounds are pure functions in `practice/domain/drone.ts`; the session (imperative shell) posts commands and holds on/off |
| 3 Types | Follows | `DroneSound` a string-literal union; `DroneOctave` a sum (`{ kind: "nearest" } \| { kind: "pinned"; octave }`), not `number \| null`; the Rust voice's length a sum (`Frames(u32) \| UntilStopped`), not a sentinel |
| 4 Errors | Follows | Sound failure stays a `Result` from `SoundPort.start()`; a dropped drone voice is a `SoundProblem` warning, never a throw |
| 6 Architecture | Follows | Only `published/` crosses a boundary: `sound/published` gains three commands; `theory/published` is consumed unchanged (`pitchHzOf`, `pitchPosition`); the UI imports `practice/published` only |
| 7 Testing | Follows | One test per scenario by ID; the fakes at the ports; the never-both invariant enumerated (REQ-004/S3); Rust tests on rendered samples for the voice's own properties |
| 8 Data and interfaces | Follows | `SoundCommand` schema extended (Zod + the C ABI mirror); stored selection v5 with a v4→v5 migration |
| 9 Dependencies | Follows | None added |
| 14 Tooling | Follows | `pnpm check` unchanged; `pnpm test:timing` unchanged and mandatory at converge/finish |

## Approach

No stack question arises: the repository already has a TypeScript `practice`
context over a Rust `sound` context (ADR 0003), and the drone is exactly the
kind of thing the audio boundary exists for. The **sound** crate gains a
third voice kind, `Drone`: an additive, band-limited oscillator whose
harmonic table is one of three *drone sounds* (pure = one sine; warm and
reed = the design's oscillator stacks folded into per-harmonic gains, with
the design's low-pass baked in as a roll-off), a linear attack and release,
and a frequency that glides linearly to a new target. A drone voice has no
end: `Voice` gains a `Length` of `Frames(n)` or `UntilStopped`. Voices
become **addressable**: two new commands, `retune(tag, hz)` and
`stop(tag)`, act on one voice by its tag (ADR 0005), and `stop_all` keeps
its meaning but fades each kind over its own release (5 ms for a tone or
click, 80 ms for a drone). `sound/published`'s `SoundCommand` schema and
the worklet shim dispatch the three additions; nothing else in the crate
changes. The **practice** context gets a pure `drone.ts` (the octave rule —
nearest the middle of the variant's range, lower on a tie, pinned once
stepped, clamped to A0–C8 — the note, its label and pitch via
`theory/published`, and the step bounds) and the `Session` aggregate owns
the drone's lifecycle beside the transport: `startDrone()`, `stopDrone()`,
`stepDroneOctave()`, `setDroneSound()`, a `drone` block on the snapshot, the
retune on `setContext`, the wake lock held while *either* sounds, the
hidden-page stop for both, and the two exclusions — `start()` releases the
drone and delays the run's first tick until the release has finished;
`startDrone()` calls `stop()` first. The tapped note (`practice.session/
REQ-013`) is `Session.tapNote(runIndex)`: one `tone` command for a beat,
a clock-timed highlight (`tappedRunIndex`) and a per-tag `stop` on a retap.
The **UI** adds `DronePill` (absolutely positioned in the disc over the
circle, the design's 3a geometry), `DroneSheet` (the Tempo sheet's shell,
the design's 4a rows), tap targets on `StaveView` noteheads and `NamesView`
columns, and stored selection v5 carrying the drone's octave and sound.
The design is vendored under `changes/004-the-drone/design/` and
`scripts/design-shots.mjs` is pointed at the Ideas page's 3a/4a frames.

### Alternatives rejected

| Option | Why not |
|---|---|
| The drone as its own aggregate (`createDrone(deps)`) with the UI coordinating the exclusions | The never-both invariant (`practice.drone/REQ-004`) would live in `App.tsx`, outside the context, untestable through `practice/published`; the wake lock and hidden-page rules would be duplicated. One aggregate, one invariant. |
| Render the drone with Web Audio nodes in TypeScript (as the prototype does) | Makes `practice` bilingual with the sound boundary — ADR 0001/0003 forbid it; and the worklet already owns the output, so two graphs would need mixing. |
| A drone as a very long `tone` re-posted before it ends | Pitch glide and sound change impossible without a gap; retuning would need stop+start (a click or a dip); the 64-voice pool would fill with re-posts. |
| Naive sawtooth/square oscillators (the prototype's) | Alias audibly at drone pitches up to C8 in a 48 kHz worklet. Additive synthesis with harmonics capped below Nyquist is band-limited by construction and lets the low-pass be a gain table — no filter state, no per-sample transcendental beyond the sines. |
| Retune by restarting the drone voice with a crossfade | A crossfade is two voices for 80 ms — fine for a *sound* change (used for that, below) but wrong for a key change, where the ear expects one voice bending, not two voices swapping. |
| Persist on/off | Decided against (REQ-009: always starts silent; decisions 2026-09-24). |
| A `stop` that cuts instantly | Every abrupt cut is a click (003's crackle fix); the per-kind release is the fix generalised. |
| `duration_frames = u32::MAX` as "no end" | A sentinel a reader must know about; `Length::UntilStopped` says it. |
| Put the tapped note in a separate module from the session | It needs the session's tempo, its `SoundPort`, its clock, its "idle" state and its run — everything the session already holds; a module would re-plumb all of it. |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | TypeScript (strict) SPA; Rust (stable, `wasm32-unknown-unknown`, zero crates) for the voice | as repo | ADR 0003 — synthesis lives in the sound crate; nothing else is bilingual |
| Framework | React 19 + Vite | as repo | Unchanged |
| Data store | `localStorage` behind `SelectionStore`, Zod-parsed | as repo | Schema v5 (below); same migration pattern as v3→v4 |
| Testing | Vitest + Testing Library; `cargo test`; Playwright for `design-shots` and `test:timing` (dev-only) | as repo | Unchanged |
| Build / tooling | pnpm, Prettier, ESLint, tsc, cargo fmt/clippy, `pnpm check`, `scripts/build-sound.sh` | as repo | Unchanged |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| — | none | — |

## Data model

**sound (Rust)**

```rust
pub enum DroneSound { Pure, Warm, Reed }          // C ABI: 0 / 1 / 2
pub struct Drone {
    hz: f32, target_hz: f32, glide_per_frame: f32, // linear glide to target_hz over GLIDE_S = 0.040
    phase: f32,
    harmonics: [(f32 /*multiple*/, f32 /*gain*/); MAX_HARMONICS],  // per-sound table, built once
    harmonic_count: usize,
}
// pure: [(1.0, 1.0)]
// warm: sine 1.0×0.8, sub-octave sine 0.5×0.35, saw 1.0×0.22 → harmonics k=1..N at (2/π)/k · lowpass(k)
// reed: square 1.0×0.16 → odd k at (4/π)/k · lowpass(k), saw 1.0×0.20, sub-octave sine 0.5×0.30
// lowpass(k) = 1 / sqrt(1 + (k / 5)^2)   — the design's 5·f0 low-pass, Q 0.4, as a roll-off
// N = the largest k with k·hz < sample_rate/2 (capped at MAX_HARMONICS = 24): band-limited
// Every table is scaled so the summed peak ≤ DRONE_PEAK_GAIN, chosen ≤ 0.6 × the tone's peak (0.25 · 1.25)
const ATTACK_S: f32 = 0.060;   // REQ-001: audible within 50 ms of ▶ (20 ms lead + ramp), faded in
const RELEASE_S: f32 = 0.080;  // REQ-001: silent within 500 ms; REQ-004: the run waits for it
const GLIDE_S: f32 = 0.040;    // REQ-003: within 100 ms

pub enum VoiceKind { Tone(Tone), Click(Click), Drone(Drone) }
pub enum Length { Frames(u32), UntilStopped }     // Voice.duration_frames → Voice.length
// Fade (stop) per kind: Tone/Click → STOP_FADE_S 0.005 (as today); Drone → RELEASE_S
// Voices::stop(tag) marks one voice Requested; Voices::retune(tag, hz) sets its target (no-op on non-drones)
```

**practice**

```ts
type DroneSound = "pure" | "warm" | "reed";
type DroneOctave = { readonly kind: "nearest" } | { readonly kind: "pinned"; readonly octave: number }; // 0–8
interface DroneSettings { readonly octave: DroneOctave; readonly sound: DroneSound }
const defaultDroneSettings: DroneSettings = { octave: { kind: "nearest" }, sound: "warm" };

// A0–C8 in theory's pitchPosition numbering (C4 = 60): 21..108
const PIANO_LOWEST_POSITION = 21; const PIANO_HIGHEST_POSITION = 108;

interface DroneSnapshot {
  readonly on: boolean;
  readonly note: Note;            // the tonic, spelled as the key spells it, at the resolved octave
  readonly hz: number;            // pitchHzOf(note)
  readonly settings: DroneSettings;
  readonly canStepDown: boolean;  // note one octave down still ≥ A0
  readonly canStepUp: boolean;    // note one octave up still ≤ C8
}
```

`SessionSnapshot` gains `drone: DroneSnapshot` and `tappedRunIndex: number | null`.

**ui — stored selection v5**

```ts
schemaVersion: 5
drone: {
  octave: z.number().int().min(0).max(8).nullable().catch(null),   // null = nearest
  sound:  z.enum(["pure", "warm", "reed"]).catch("warm"),
}
```

Migration `v4 → v5`: copy every v4 field, add `drone` at its defaults
(REQ-009/S3). v1–v3 chain through v4 as today. A malformed drone *field*
falls back on its own (`.catch`) rather than failing the whole payload
(REQ-009/S4 — everything else is still restored); an unreadable payload
still yields `null` → first-run defaults as before. Reversal: an older
build reads a v5 payload as unparseable and starts from defaults — the
same one-way behaviour every earlier bump had.

## Interfaces

**`sound/published` — `SoundCommand` gains three members**

```ts
{ kind: "drone";  tag; hz: positive; onsetFrame; sound: "pure" | "warm" | "reed" }  // open-ended; onset report like a tone
{ kind: "retune"; tag; hz: positive }                                             // glide this voice; ignored for a tone/click or an unknown tag
{ kind: "stop";   tag }                                                            // release this voice over its own fade; ignored for an unknown tag
```

C ABI mirror (`lib.rs` / `processor.ts`): `push_drone(tag, hz, onset_frame,
sound: u32) -> u32` (0 = pool full → the existing `voice-pool-full`
problem), `retune(tag, hz)`, `stop(tag)`. `stop_all` unchanged in
signature. Errors: a `drone` command failing the Zod schema is the existing
`invalid-command` problem; a full pool drops the drone with
`voice-pool-full` (never reached in practice — one drone at a time, at most
two during a sound change).

**`practice/published` — added**

```ts
export type { DroneSound, DroneOctave, DroneSettings, DroneSnapshot };
export { defaultDroneSettings, droneNoteOf, defaultDroneOctave };
droneNoteOf(key: Key, variant: Variant, settings: DroneSettings): Note   // pure, total
defaultDroneOctave(tonic: PitchClass, range: NoteRange): number          // nearest the middle, lower on a tie, within the range (or nearest overall if none fits)

Session.startDrone(): void          // stops playback first (REQ-004); sound.start() → on failure notice, stays off (REQ-008)
Session.stopDrone(): void
Session.stepDroneOctave(delta: -1 | 1): void   // pins; no-op past A0/C8
Session.setDroneSound(sound: DroneSound): void // crossfade if sounding (REQ-005)
Session.tapNote(runIndex: number): void        // REQ-013; no-op unless idle or run index out of range
createSession(context, traversal, scaleChoice, settings, droneSettings, deps)
```

`TargetAdvanced` unchanged and never emitted for the drone or a tapped
note. No new events.

**Session internals worth fixing here (so tasks agree)**

- Tags: `DRONE_TAG_BASE = 3_000_000 + counter` (a new tag per drone voice
  so a crossfade's two voices are distinct); `TAP_TAG_BASE = 2_000_000 +
  counter`. Both above `CLICK_TAG_BASE`, never colliding with a position tag.
- `startDrone()`: `if playing → stop()`; `await sound.start()` (a `{ok:false}`
  or throw → `notice = "sound-unavailable"`, drone stays off, return);
  `await wakeLock.acquire()`; post `drone` at `currentFrame() +
  firstTickLeadFrames()`; `on = true`.
- `stopDrone()`: post `stop(tag)`; `on = false`; release the wake lock only
  if not playing.
- `start()` (▶): if the drone is on → `stopDrone()` and schedule the first
  tick at `currentFrame() + firstTickLeadFrames() + releaseFrames(80 ms)` so
  the drone is silent before the first click or note (REQ-004/S2). Open
  question 1.
- `stop()`/idle transition: release the wake lock only if the drone is off.
- `setContext`/spelling: recompute `droneNote`; if on and hz changed →
  `retune`; label follows (a respell changes the label, not the hz —
  REQ-003/S2 posts nothing).
- `setDroneSound` while on: post the new `drone` (new tag) and `stop(old
  tag)` at the same frame — the attack and release overlap, never silent.
- `tapNote(runIndex)`: ignored unless `transport.kind === "idle"`; if a tap
  is sounding → `stop(oldTag)` and cancel its timers; post `tone` (hz of
  `run[runIndex].note`, `durationFrames = tickFramesOf()`, onset `currentFrame()
  + firstTickLeadFrames()`); clock timers at the audible onset set
  `tappedRunIndex`, and at onset + beat clear it. Not `soundingPosition`, not
  the caption, no `TargetAdvanced`.
- `visibility.onHidden` → `stop()` and `stopDrone()`.
- `dispose()` → `stopDrone()` before `sound.dispose()`.

## Structure

```
src/sound/
  src/drone.rs                       ← NEW: Drone voice — harmonic tables per DroneSound, attack/release, linear glide
  src/voices.rs                      ← VoiceKind::Drone, Length, per-kind stop fade, stop(tag), retune(tag, hz)
  src/lib.rs                         ← push_drone / retune / stop C ABI + tests (peaks, sine purity, glide, no large steps)
  published/sound-command.schema.ts  ← drone / retune / stop; droneSoundSchema
  published/processor.ts             ← dispatch the three (sound enum → 0/1/2)
src/practice/
  domain/drone.ts                    ← NEW: DroneSound, DroneOctave, DroneSettings, defaults, piano bounds, defaultDroneOctave, droneNoteOf, canStepDown/Up
  domain/session.ts                  ← drone lifecycle, exclusions, wake-lock sharing, tapNote, snapshot fields
  adapters/silent-sound.ts           ← drone reports an onset like a tone; retune/stop ignored
  published/index.ts                 ← exports above
src/ui/
  DronePill.tsx                      ← NEW: ▶/■ · − · label · + · ▼ at the design's disc position (left 189, top 146)
  DroneSheet.tsx                     ← NEW: header (Drone · "G5 · 784.0 Hz" · switch) + "Follows the key on the circle · A = 440 Hz" + Sound row + tapping note
  overlay.tsx                        ← OverlayHeader gains `subtitle?` and `trailing?` (the switch beside ✕)
  App.tsx                            ← pill over the circle wrapper; sheet; store v5; drone/tap handlers; tapped highlight props
  StaveView.tsx                      ← transparent hit rects per notehead (design's hitX/hitW/hitY/hitH); highlight when `soundingRunIndex` set, dim only while playing; `onTapNote`, `tapsEnabled`
  NamesView.tsx                      ← columns as buttons (`aria-label` = the note name); `onTapColumn(index)`, `tapsEnabled`; sounding column from the tapped note's pitch class as today
  selection-store.ts                 ← v5 schema, migrateFromV4, firstRunDefaults.drone
tests/practice/
  scenarios/drone-tonic.test.ts      ← REQ-001, REQ-003
  scenarios/drone-octave.test.ts     ← REQ-002 (+ pure-function tests of droneNoteOf/defaultDroneOctave)
  scenarios/drone-exclusion.test.ts  ← REQ-004/S1–S2
  scenarios/drone-sound.test.ts      ← REQ-005/S1, S3 (commands posted); S2/S4 are cargo tests
  scenarios/drone-hidden-awake.test.ts ← REQ-007
  scenarios/drone-sound-unavailable.test.ts ← REQ-008
  scenarios/session-tap.test.ts      ← practice.session/REQ-013
  invariants/never-both.test.ts      ← REQ-004/S3 (every interleaving up to four taps)
  fakes.ts                           ← FakeSound: `dronesPosted()`, `stopsPosted()` helpers; `sessionOn` takes drone settings
tests/ui/scenarios/
  drone-pill.test.tsx                ← pill label/glyphs/greyed steppers (REQ-001/S1–S3, REQ-002/S4 rendered)
  drone-sheet.test.tsx               ← REQ-006, REQ-005/S1
  stave-tap.test.tsx, names-tap.test.tsx ← REQ-013 highlight paths
  selection-store.test.ts, selection-persistence.test.tsx ← REQ-009
scripts/design-shots.mjs             ← PROTOTYPE_PATH → changes/004-the-drone/design/Drone Ideas.dc.html; states: the #3a frame (drone on) and #4a (sheet open)
docs/adr/0005-addressable-voices.md
```

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| practice.drone/REQ-001 (tonic, on/off, label) | `droneNoteOf`; `Session.startDrone/stopDrone`; `DronePill`; `DroneSheet` header; `drone.rs` attack/release | S1 `drone-tonic` (drone command hz 783.99 at ≤ 50 ms, label "G5") + `drone-pill`; S2 `drone-tonic` (stop posted; cargo: silent within RELEASE after stop); S3 `drone-sheet` (switch ↔ pill); S4 `drone-pill` + `app-session` (open/close every sheet, no stop/retune posted) |
| practice.drone/REQ-002 (octave) | `defaultDroneOctave`, `droneNoteOf`, `canStep*`; `Session.stepDroneOctave`; pill − / + greyed | S1 `drone-octave` (three variants × two keys); S2 (retune 392.00 posted, no stop); S3 (pinned across key and variant); S4 (bounds G1/G7, C8, A0; `drone-pill` greyed ink); S5 (A0 pin, C major → C5, back → A0); S6 (unpinned follows the variant) |
| practice.drone/REQ-003 (follows the key) | `setContext` → retune; `drone.rs` glide | S1 `drone-tonic` (retune 587.33; cargo: reaches target within GLIDE, no step > 0.05); S2 (respell posts nothing, label changes); S3 (variant change retunes) |
| practice.drone/REQ-004 (never together) | `startDrone` → `stop()`; `start()` → `stopDrone()` + delayed first tick | S1 `drone-exclusion` (stopAll within 50 ms, idle caption, drone posted); S2 (stop(tag) posted, first click onset ≥ stop + release frames); S3 `never-both` invariant over the fake's posted timeline |
| practice.drone/REQ-005 (sounds) | `drone.rs` tables; `Session.setDroneSound` crossfade; `DroneSheet` Sound row + hints | S1 `drone-sheet` (warm marked, hint); S2 cargo (Goertzel at 2f–8f each < −40 dB vs f); S3 `drone-sound` (new drone + stop(old) same frame; cargo: summed level never 0 across the crossfade); S4 cargo (tone peak vs drone peak ≤ 0.6) |
| practice.drone/REQ-006 (the sheet) | `DroneSheet`; ▼ on the pill; sheets never touch the session | S1 `drone-sheet` (texts); S2 `app-session` (playing through open/close, nothing posted for the drone); S3 (header follows the key) |
| practice.drone/REQ-007 (hidden, awake) | `visibility.onHidden` → `stopDrone`; wake lock while on | S1 `drone-hidden-awake` (hide → stop posted, `drone.on` false); S2 (`wake.acquired` while on, released after ■) — the phone itself at acceptance |
| practice.drone/REQ-008 (no sound) | `startDrone` failure path; `Notices` | S1 `drone-sound-unavailable` (`failWith` → notice, on = false, no drone posted); S2 (clear `failWith`, tap again → drone posted); S3 (`startCalls` 0 before any gesture with stored settings) |
| practice.drone/REQ-009 (remembered) | store v5, `migrateFromV4`, `.catch` fallbacks, App wiring | S1 `selection-persistence` (G4 reed restored, off, D → D4); S2 first run C5 warm; S3 v4 payload → nearest/warm; S4 `selection-store` (octave 12, "bright" → defaults, rest kept) |
| practice.session/REQ-013 (tapped note) | `Session.tapNote`; `StaveView` hit rects + highlight; `NamesView` buttons | S1 `session-tap` (tone 587.33, 625 ms = 30 000 frames, `tappedRunIndex` set then cleared, caption unchanged, no TargetAdvanced) + `stave-tap` (halo); S2 `names-tap` (lowest D → D5, column lit 500 ms); S3 (drone stays, tone posted, no stop for the drone tag); S4 (stop(oldTag), new tone, timers restarted); S5 (playing/counting → nothing posted); S6 (↓ F column → F5) |

## Test strategy

- **Unit (Rust, `cargo test`):** the drone voice's own physics — attack
  length, release to true silence, glide reaching the target within
  GLIDE_S, pure = single partial (Goertzel), peak ratios per sound, no
  per-sample step > 0.05 across start, retune, crossfade and stop; `stop(tag)`
  touching only its voice; `stop_all` fading a drone over its release.
- **Unit (practice, pure):** `defaultDroneOctave` and `droneNoteOf` over
  every catalogued variant × every selectable key spelling (an
  enumeration: every result within the variant's range when unpinned, and
  within A0–C8 always).
- **Integration (practice scenarios):** the session through
  `practice/published` with `FakeSound`/`FakeClock`: which commands are
  posted, at which frames, in which order — every drone and tap scenario
  is a statement about the posted timeline.
- **Invariant:** `never-both` — every sequence of up to four taps drawn
  from {▶, ❚❚, drone ▶, drone ■} from idle; walk the fake clock through
  each; at every posted tone/click onset, no drone voice is live (posted
  and not stopped before that frame minus its release).
- **End-to-end (ui scenarios):** the pill and sheet rendered in `App` with
  the fakes; the tap targets; the store round-trip and migrations. Design
  fidelity via `scripts/design-shots.mjs` against the vendored 3a/4a
  frames, reviewed at acceptance — not a pixel-diff gate, as in 002/003/005.
- **Not tested, and why:** the *character* of warm and reed (a matter of
  ear — acceptance on the phone, per the intent's assumption); the exact
  glide curve beyond "reaches the target within 40 ms without a step"; the
  Wake Lock and visibility on a real phone (carried to acceptance, as in
  003). `pnpm test:timing` is not extended — the transport and scheduler
  are untouched — but still runs at converge and finish.

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| Additive synthesis of up to 24 harmonics per sample is too slow for the worklet on the phone (under-runs, crackle) | low | Crackle while the drone sounds | 24 sines × 128 frames per quantum is ~3 k `sin` calls per 2.7 ms; the tone already does 2. The first Rust task benchmarks `render` at 48 kHz in `cargo test --release` and caps `MAX_HARMONICS` lower if a quantum exceeds 0.5 ms |
| The 80 ms delay of ▶'s first tick after a drone is felt as lag | low | ▶ feels late only when a drone was sounding | Open question 1; the alternative (5 ms cut) is one constant |
| Warm/reed tables do not sound like the prototype | medium | The user dislikes the sound at acceptance | Tables are data; the prototype is in the repo for A/B on the laptop; adjusting a gain is a one-line change with the peak test guarding the level |
| `stop_all` semantics shift (per-kind fade) regress the crackle fix | low | A click at ❚❚ | The existing `stop_all_fades_rather_than_clicks` and step tests stay green; the drone's own release path is tested separately |
| Tap targets on the stave collide (noteheads 8 px apart on a 43-note full-range run) | medium | A tap lands on the neighbour | The design's hit rects are `max(step, 16)` wide, adjoining — a tap is never dead, at worst one column off; acceptable on the laptop, checked on the phone |
| Store `.catch` fallback per drone field differs from the strict tempo rule | certain | Two fallback styles in one schema | Commented at the schema: REQ-009/S4 asks for field-level recovery; REQ-011 does not |

## Rollout

No flag. Reversible by reverting the merge; the store bump is one-way in the
same sense as every earlier bump. The sound crate's three new commands are
additive: a build without a drone never posts them. `pnpm test:timing` runs
unchanged at converge and finish.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | *Answered 2026-09-24: delay by the release.* ▶ while the drone sounds: delay the run's first tick by the drone's 80 ms release (the drone is truly silent before the first click, as REQ-004/S2 reads; ▶ lands ~100 ms after the tap instead of 20 ms, only in this case), or cut the drone over the tone's 5 ms stop fade (▶ as fast as today; a low drone's 5 ms cut may thump)? | the exclusion task's timing assertions | Delay by the release — the spec's words, and a fade is what 003 learned to do |
| 2 | *Answered 2026-09-24: amended in the delta to B5 / 987.77 Hz.* Spec correction: `practice.drone/REQ-003/S1` says B minor glides to "493.88 Hz (B4 — the octave nearest the middle of C4–C7 for B)". By REQ-002's own rule the nearest is B5 (987.77 Hz: B5 is 5 semitones from the middle F♯5, B4 is 7). Amend the delta's scenario to B5 / 987.77 Hz before anything is built (the 005 precedent: spec corrections at plan time, nothing built yet)? | REQ-003's test | Yes — amend to B5 / 987.77 Hz and log it |

## Amendments at finish (converge rounds 1–2, 2026-09-26)

- **Data model:** `Drone`'s `hz`, `target_hz` and `glide_per_frame` are f64 internally (the sketch said f32) — per-frame f32 accumulation drifted 0.019 Hz over the 1920-frame glide; the public signatures stay f32.
- **Session internals:** no async `acquireSound()` helper — one more awaited hop breaks the fakes' two-flush convention; `start()`, `startDrone()` and `tapNote()` keep the `await sound.start()` block inline and share a synchronous `noticeFromSoundStart`.
- **Session internals:** the pending-start race (converge C1): `start()` bumps `droneGeneration` before its own await, `startDrone()`'s continuation re-checks `transport.kind === "idle"`, and `stop()` calls `stopDrone()` first when the drone is on; the never-both invariant enumerates a pending drone start (780 interleavings).
