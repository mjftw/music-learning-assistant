---
type: Implementation Plan
title: Hear the scale — plan
description: A pure practice transport in TypeScript schedules notes and clicks ahead on the audio clock; a new Rust-owned `sound` context renders them sample-accurately in an AudioWorklet; theory gains traversal fitting and equal-temperament pitch; the UI adds the prototype's transport card and sheets
resource: /changes/003-hear-the-scale/plan.md
status: stable
tags: [sdd, plan, "change:003-hear-the-scale"]
sources:
  - resource: /changes/003-hear-the-scale/proposal.md
  - resource: /changes/003-hear-the-scale/design/hear-the-scale.dc.html
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
  - resource: /docs/adr/0001-language-boundary-follows-contexts.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T18:10:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:17:37Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_phase: approved
---

# Plan: Hear the scale

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | The prototype is vendored and the 002 screenshot review loop iterates against it; every sound decision comes from the grill, not from defaults |
| II — spec precedes implementation | yes | Proposal and three deltas approved 2026-09-22; this plan maps every REQ |
| III — testable requirements | yes | Every scenario has a test; the two timing numbers have measured tests in a real browser |
| IV — separate verification | yes | Implementer and task-reviewer are different subagents; the timing measurement is a test, not a claim |
| V — numbered latency budget | yes (adopted) | ±5 ms onset and ≤30 ms highlight, measured by `pnpm test:timing` in Chromium; a miss fails the test |
| VI — instrument is the focus | yes | Nothing interrupts playback; sheets and the drawer are user-opened; no gamification |
| VII — no third-party services | yes | Sound is synthesised locally; the WASM module is built into the bundle; no CDN, no samples |
| VIII — simplicity | yes, with one cost | One new dependency (none at runtime); the Rust toolchain is the accepted cost, justified in ADR 0003 and bounded by the fallback |
| IX — learning updates the spec | yes | Prototype contradictions were resolved in the spec (REQ-012), not patched in code |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 1 Languages | follows | TS primary; Rust at a hard boundary (the audio thread), as §1 allows |
| 2 Paradigm | follows | Transport is a pure state machine; the audio thread, wake lock and visibility are adapters |
| 3 Types | follows | Sum types for `TransportState`, `Octaves`, `SoundMode`; branded ids unchanged; stored state parsed once with Zod |
| 4 Errors | follows | `SoundPort.start()` returns `Result<…, SoundUnavailable>`; nothing swallowed — the notice surfaces it |
| 5 Immutability | follows | Session state is replaced, never mutated; the only mutable cell is the scheduler's cursor, local to the adapter |
| 6 Architecture | follows | New context root `src/sound/` with `published/`; practice ↔ sound via a schema-first command message; theory via `published/` |
| 7 Testing | follows | TDD; one test per scenario through published interfaces; fakes at ports (FakeSound, settable clock); invariants by exhaustive enumeration |
| 8 Data and interfaces | follows | `SoundCommand` and `TargetAdvanced` are Zod schemas exported from `published/`, the JSON form mirrored by serde on the Rust side |
| 9 Dependencies | follows | One dev dependency (`@types/audioworklet`); Rust crate has zero dependencies |
| 11 Observability | follows | The latency budget is measurable in-app: the engine reports each onset's deviation, the timing test reads it |
| 13 Git | follows | Branch `003-hear-the-scale`; commits cite REQs |
| 14 Tooling | follows | pnpm/Prettier/ESLint/tsc/Vitest; cargo/rustfmt/clippy/cargo test folded into `pnpm check` |
| 15 Always/never | follows | Names from the glossary (`Traversal`, `NoteSequence`, `TargetAdvanced`); controls inherit the page typography |

## Approach

The practice context gets a **pure transport**: a state machine
(`idle → countingIn → playing → resting → …`) that, given the session
settings and the theory sequence, yields the next beat's events — a click,
a tone, a `TargetAdvanced` — as data (`Tick`). A **lookahead scheduler** adapter
runs that machine ~200 ms ahead of the audio clock and posts each tone and
click, stamped with its audio-frame onset, to a **sound engine**: a new
Rust-owned `sound` context compiled to WebAssembly and running inside an
`AudioWorkletProcessor`, where it renders the plain tone and the woody click
sample-accurately. The worklet reports back the moment each onset actually
renders (the timing harness's onset column); practice lights the note from a
clock timer aimed at the onset it scheduled, with the report as confirmation
— so the highlight never waits on a cross-thread message. Theory replaces `span.ts` with `traversal.ts`
(fitting counts, run, sequence) and gains `temperament.ts` (equal, A440).
The UI adds `TransportCard`, `TraversalSheet` and `TempoSheet` from the
prototype, drops the span row, and threads the sounding note into
`StaveView` and `NamesView`. Persistence bumps the stored selection to v3.
If sound cannot start, a `SilentSound` adapter drives the same scheduler
from `performance.now()` so the run still walks.

The stack was driven by (1) the static, no-server deployment and the phone
on the stand, (2) the ±5 ms / ≤30 ms numbers — which rule out JS timers for
onsets and demand the audio clock — and (4) the user's stated preference
that audio generation live in Rust with listening, weighed against Article
VIII; (5) the repo's existing Vite/React/Zod/Vitest/Playwright stack carries
everything else.

### Alternatives rejected

| Option | Why not |
|---|---|
| Web Audio nodes only (`OscillatorNode` + `GainNode` envelopes, `start(t)`) — no WASM, no worklet | Simplest possible and meets ±5 ms; rejected on the user's stated preference (Rust owns audio, with listening) and because 005 needs a worklet anyway — one audio-thread architecture, not two. **This is the fallback** if the Rust path cannot be made to work on the phone (see Risks); the `SoundPort` interface is identical either way |
| Rust synthesis inside `practice` as an adapter | Makes `practice` bilingual, which ADR 0001 forbids; the remedy the ADR itself names is a whole capability moving across the map — hence the `sound` context |
| wasm-bindgen / wasm-pack glue | Generated JS glue does not load cleanly inside an `AudioWorkletGlobalScope` (no `fetch`, no ES module imports of glue); a bare `extern "C"` ABI over a shared `Float32Array` is ~60 lines of hand-written host code, zero npm dependencies, and easier to read |
| `setTimeout`-driven note onsets | Jitter 4–50 ms in background tabs and on phones; fails ±5 ms |
| Highlight strictly from the worklet's onset report | Rejected after converge rounds 2–3: the cross-thread message adds a ~20 ms floor and occasional >30 ms spikes; the session already knows every onset, so a clock timer aimed at the *audible* onset (scheduled frame + `outputLatency`) drives the highlight and the report only confirms (T029, T030) |
| Play the tone in the note's octave via a sampled instrument | Out of scope (proposal); Article VII/VIII |
| Store session settings in a separate localStorage key | Two keys to migrate and keep consistent; one v3 record, one parse |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime (UI, theory, practice) | TypeScript strict, React 19 | as repo | Existing |
| Language / runtime (sound) | Rust, `wasm32-unknown-unknown`, `#![no_std]`-free but allocation-free hot path, `panic = "abort"` | stable ≥ 1.85 | User preference + ADR 0003; runs in the AudioWorklet |
| Audio | Web Audio API: `AudioContext`, `AudioWorkletNode` | browser | The only sample-accurate clock in a browser |
| Screen | Screen Wake Lock API (`navigator.wakeLock`), feature-detected | browser | Only standard way; absent → nothing (REQ-009 "where the platform allows") |
| Data store | `localStorage` behind the existing `SelectionStore` port, schema v3 | — | Existing pattern |
| Schemas | Zod (TS), serde (Rust) over one JSON shape | zod 4 | Existing; ADR 0001's language-neutral seam |
| Testing | Vitest + Testing Library; cargo test; Playwright (Chromium) for the measured timing test | as repo; Playwright 1.63 already dev-only | The timing numbers need a real audio thread; jsdom has none |
| Build / tooling | Vite 8 (worklet via `new URL(…, import.meta.url)`, `.wasm?url`); `cargo build --release --target wasm32-unknown-unknown` via `scripts/build-sound.sh` in `predev`/`prebuild`/`pretest` | as repo | One `pnpm check` still runs everything |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| `@types/audioworklet` (dev) | Types for `AudioWorkletProcessor`/`registerProcessor` in the host shim | TypeScript's DOM lib omits the worklet global scope; the alternative is ~40 lines of hand-declared `declare` blocks that rot |
| Rust crate `sound` (workspace member, zero crates.io deps) | The synthesiser | — |
| Toolchain: rustup, `wasm32-unknown-unknown` target | Build the crate | **Not installed on this machine** — the user installs it (see Open questions) |

## Data model

**Stored selection v3** (`src/ui/selection-store.ts`), parsed once with Zod:

```
StoredSelection v3 = v2 − span + {
  traversal: { direction: 'up'|'down'|'updown', octaves: 'full'|1|2|3|4, shape: 'scale'|'arpeggio' }
  session:   { soundMode: 'notes'|'both'|'metronome',
               loop: boolean, countIn: boolean, restBar: boolean, tempoBpm: 40..200 step 2 }
}
```
Migration: v1 → v2 (existing) → v3: drop `span`, add both groups at the
prototype defaults (↑↓, 1, scale; both, true, true, false, 96).
Unreadable → first-run defaults. Reversal: an older build sees
`schemaVersion: 3`, fails the union parse, falls back to first-run — REQ-008/S3
behaviour, no data loss that matters (settings only).

**Theory (pure values):**
```
Traversal   = { direction: Direction; octaves: Octaves; shape: Shape }
Octaves     = { kind: 'full' } | { kind: 'count'; count: 1|2|3|4 }
Run         = readonly KeyViewNote[]            // ascending, what the stave shows
NoteSequence= readonly SequenceNote[]           // playing order; { note, runIndex }
```

**Practice (pure values):**
```
SessionSettings = { soundMode; loop; countIn; restBar; tempoBpm }   // note length removed 2026-09-22 (user): crotchets only
TransportState  = { kind:'idle' }
                | { kind:'countingIn'; beatsLeft: 4|3|2|1 }
                | { kind:'playing';   position: number }        // 0-based into NoteSequence
                | { kind:'resting';   beatsLeft: 4|3|2|1 }
Tick            = { click: { accent } | null; tonePosition: number | null }   // one beat per tick; frames from tempo alone (was `BeatPlan` in the first draft)
TempoTerm       = { name; fromBpm; toBpm; gloss }   // the eight bands, contiguous 40–200 (test)
```

**Sound (Rust, in WASM linear memory):** a ring of ≤64 pending `Voice`
events `{ kind: Tone{hz, frames} | Click{accent}, onsetFrame: u64 }`;
output `Float32Array(128)` per render quantum; an `onsetReport` slot the
host reads after each `render` (`onsetFrame`, `actualFrame`) — the source
of the ±5 ms measurement.

## Interfaces

**`theory/published`** (adds; removes `Span`, `spanChoicesOf`, `spanNotesOf`):
```ts
fittingOctaveCounts(key, variant): readonly (1|2|3|4)[]
runOf(key, variant, traversal): Run                       // REQ-012 run; falls back to full when the count does not fit
sequenceOf(run, direction): NoteSequence                  // REQ-012 sequence
pitchHzOf(note): number                                   // theory.temperament/REQ-001
```

**`practice/published`** (as built — amended 2026-09-23 after converge round 2, W2):
```ts
createSession(context: SessionContext, traversal: Traversal, settings: SessionSettings, deps: SessionDeps): Session
SessionContext = { key: Key; variant: Variant }
SessionDeps    = { sound: SoundPort; clock: ClockPort; wakeLock: WakeLockPort; visibility: VisibilityPort }
Session {
  snapshot(): SessionSnapshot   // transport, traversal, effectiveOctaves, fittingCounts, settings, run, sequence, caption, progress 0..1, summaryLine, tempoTerm, soundingPosition, notice
  start(): void; stop(): void; dispose(): void
  setContext(c); setTraversal(t); setSettings(s)        // tempo changes go through setSettings; the UI composes steppedTempo / tempoForTerm
  onTargetAdvanced(listener: (e: TargetAdvanced) => void): () => void
  onChange(listener: () => void): () => void
}
TargetAdvanced = { note: Note; position: number; length: number; atFrame: number }   // Zod: practice/published/target-advanced.schema.ts
TEMPO_TERMS, tempoTermFor(bpm), steppedTempo(bpm, ±2), tempoForTerm(term), summaryLineOf(traversal, effectiveOctaves, settings), FIRST_TICK_LEAD_MS
// adapters, also published: webAudioSound, silentSound, fallbackSound, screenWakeLock, pageVisibility, browserClock; port types re-exported for test fakes
```
Errors: `start()` never throws; a `{ ok: false }` **or a thrown** `sound.start()`
raises the notice (`'sound-unavailable'`) through `onChange`; in the app
`fallbackSound(webAudioSound, silentSound)` switches to the silent port so the
run still walks.

**Sounding note → highlight (amended after converge round 2, C1):** the
session knows every tick's onset frame when it schedules it (200 ms ahead).
It fires `TargetAdvanced` from a `ClockPort` timeout aimed at that onset's
*audible* instant (frames → ms via `sound.sampleRate()` and
`sound.currentFrame()`, plus `sound.outputLatencyMs()` — T030), so the
highlight never waits on the worklet → main-thread `OnsetReport` message
(measured ~21 ms floor, occasional >30 ms). The `OnsetReport` still confirms
the onset for the timing harness (`atFrame`, the ±5 ms column) and dedupes:
whichever of timer/report arrives first for a position wins; timers are
cancelled on stop, restart and dispose. The first tick leads ▶ by
`FIRST_TICK_LEAD_MS = 20` so the worklet's warm-up never delays it.

**Ports (practice/ports, as built):**
```ts
SoundPort      { start(): Promise<Result<void, SoundUnavailable>>; sampleRate(): number; currentFrame(): number; post(cmd: SoundCommand): void; onOnset(cb: (report: OnsetReport) => void): () => void; dispose(): void }
ClockPort      { setTimeout(fn, ms): () => void }    // lookahead polls and highlight timers; faked in tests
WakeLockPort   { acquire(): Promise<void>; release(): void }
VisibilityPort { onHidden(cb): () => void }
```

**`sound/published`** — the seam between practice and the audio thread,
schema-first (Zod `sound-command.schema.ts`, mirrored by serde):
```
SoundCommand = { kind:'tone'; tag: number; hz: number; onsetFrame: number; durationFrames: number }   // tag: sequence position for the first sounding command of a playing tick; ≥1_000_000 for count-in/rest clicks
             | { kind:'click'; tag: number; accent: boolean; onsetFrame: number }
             | { kind:'stopAll' }
OnsetReport  = { tag: number; onsetFrame: number; actualFrame: number }   // posted back per rendered onset
SoundProblem = { reason: 'invalid-command' | 'voice-pool-full' | 'invalid-onset-report'; detail: string }   // surfaced, logged once at the adapter
createSoundEngine(context: AudioContext): Promise<Result<SoundEngine, SoundUnavailable>>
SoundEngine  { sampleRate; currentFrame(); post(cmd); onOnset(cb); onProblem(cb); dispose() }
```
Rust ABI (`extern "C"`): `init(sample_rate)`, `push_tone(hz, onset, frames)`,
`push_click(accent, onset)`, `stop_all()`, `render(out_ptr, frames, now_frame) -> reports_written`,
`report_ptr()`. Malformed commands cannot reach Rust: the host validates
with Zod before posting.

**Tone and click (Rust):** tone = sine + 0.25·second harmonic, 8 ms attack,
sustain, 40 ms release starting `durationFrames − release` so it ends before
the next onset (REQ-005/S4); click = 25 ms exponentially decaying burst of a
1.8 kHz damped sine (soft, woody), accent = +6 dB and 1.2 kHz. Levels fixed
(tone −12 dBFS, click −9 dBFS).

## Structure

```
Cargo.toml                          ← workspace (members: src/sound); root config is the accepted exception
src/sound/                          ← NEW context (Rust + host shim), ADR 0003
  Cargo.toml  src/lib.rs            ← synthesiser: voices, envelopes, render, onset reports
  src/tone.rs  src/click.rs  src/voices.rs
  published/
    index.ts                        ← createSoundEngine(): loads worklet, passes compiled WebAssembly.Module
    sound-command.schema.ts         ← Zod SoundCommand / OnsetReport (the JSON shape serde mirrors)
    processor.ts                    ← AudioWorkletProcessor host shim (~60 lines, no domain logic)
  pkg/sound.wasm                    ← built artefact (gitignored), imported with ?url
src/theory/
  domain/traversal.ts               ← replaces span.ts: fittingOctaveCounts, runOf, sequenceOf
  domain/temperament.ts             ← pitchHzOf (equal, A440)
  published/index.ts                ← exports updated
src/practice/                       ← NEW context root
  published/index.ts                ← createSession, Session, TEMPO_TERMS, summaryLineOf
  published/target-advanced.schema.ts
  domain/transport.ts               ← pure state machine: next(state, settings, seq) → { state, plan }
  domain/tempo.ts                   ← bands, termFor, step/clamp
  domain/settings.ts                ← SessionSettings, defaults, summary line
  domain/session.ts                 ← the aggregate: holds state, applies REQ-007 rules, emits TargetAdvanced
  ports/{sound,clock,wake-lock,visibility}.ts
  adapters/lookahead-scheduler.ts   ← runs transport 200 ms ahead on SoundPort.now()
  adapters/web-audio-sound.ts       ← SoundPort over sound/published
  adapters/silent-sound.ts          ← SoundPort with performance.now() clock, no output
  adapters/{screen-wake-lock,page-visibility}.ts
src/ui/
  TransportCard.tsx  TraversalSheet.tsx  TempoSheet.tsx  TraversalRow.tsx
  KeyPanel.tsx (span row removed)  StaveView.tsx / NamesView.tsx (highlight props)  App.tsx (wires session)
  selection-store.ts (v3)
scripts/build-sound.sh              ← cargo build → src/sound/pkg/sound.wasm
scripts/timing-test.mjs             ← Playwright: pnpm test:timing (REQ-008/S1, REQ-006/S4)
tests/theory/{scenarios,invariants}  tests/practice/{scenarios,invariants}  tests/ui/scenarios
```
`scripts/check-contexts.sh`: `PUBLISHED='(published)'` already matches;
add `src/sound/` to the roots and let `IMPORT_RE` cover Rust `use` (it does).

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| theory.circle-of-fifths/REQ-003 (M) | `runOf` feeds `StaveView`; summary still from `keyView` | `tests/theory/scenarios/req-003` S1–S4 through published |
| theory.circle-of-fifths/REQ-007 (M) | `KeyPanel` stave view renders the run | `tests/ui/scenarios/key-panel` S1–S2 |
| theory.circle-of-fifths/REQ-008 (M) | `selection-store.ts` v3, span dropped on migrate | `tests/ui/scenarios/selection-store` S1–S4 |
| theory.circle-of-fifths/REQ-012 (A) | `domain/traversal.ts` | scenarios S1–S4; invariant S5 exhaustive over 30 keys × 3 variants × octaves × 2 shapes × 3 directions |
| theory.temperament/REQ-001 (A) | `domain/temperament.ts` | scenarios S1–S3 (S3 enumerates every catalogued range) |
| practice.session/REQ-001 | `session.setTraversal`, `fittingOctaveCounts`, `summaryLineOf`; `TraversalSheet` | practice scenarios S1–S4 via `createSession` + FakeSound; UI scenario for the sheet's pills |
| practice.session/REQ-002 | `transport.ts`, `session.start/stop`, caption in snapshot; `TransportCard` | S1–S4 with FakeSound recording commands and a settable clock; stop ≤50 ms asserted on `stopAll` timing |
| practice.session/REQ-003 | `transport.ts` countingIn/resting branches; clicks always planned in those states | S1–S3 |
| practice.session/REQ-004 | `tempo.ts`; `TempoSheet`; scheduler recomputes beat length from the next beat | S1–S4; band contiguity property |
| practice.session/REQ-005 | `BeatPlan` tone/click selection by sound mode (TS); tone and click shape (Rust) | S1–S3 on planned commands; S4 in `cargo test` (envelope ends before next onset) |
| practice.session/REQ-006 | highlight timer at the scheduled onset (`OnsetReport` confirms/dedupes) → `TargetAdvanced`; `StaveView`/`NamesView` highlight props | S1–S3 UI scenarios; S4 measured in `test:timing`; S5 invariant over all sequences |
| practice.session/REQ-007 | `session.setContext/setTraversal` restart rules; UI never calls `stop()` on overlay open | S1–S3 |
| practice.session/REQ-008 | Lookahead scheduler + sample-accurate worklet | S1 measured in `test:timing`: 6 configs × 60 s in parallel pages; deterministic unit test that the scheduler never starves the lookahead with a slow fake clock |
| practice.session/REQ-009 | `page-visibility` adapter → `stop()`; `screen-wake-lock` adapter around playing | S1 via fake visibility port; S2 asserted at the wake-lock port (acquire on start, release on stop) — dimming itself not observable |
| practice.session/REQ-010 | `SoundPort.start()` Result → notice + `SilentSound`; engine created only inside `start()` | S1 with a failing FakeSound; S2 asserts no AudioContext before ▶ (spy on the factory) |
| practice.session/REQ-011 | `selection-store.ts` v3 + `firstRunDefaults`; App restores into `createSession` | S1–S3 |

Removed REQ-011 (Span): `span.ts`, `SpanChoicePill`, span tests deleted;
`check-scenarios.sh` confirms nothing cites it.

## Test strategy

- **Unit (pure, Vitest):** transport state machine over every state ×
  settings combination; tempo bands (contiguous, 40–200, middles); summary
  line; traversal fitting and ordering; pitch. Rust: `cargo test` for
  onset exactness (an event at frame N first appears in the quantum
  containing N), envelope bounds, click length, tone frequency by
  zero-crossings, `stop_all` silences within one quantum.
- **Scenario (through published interfaces):** every S in the three deltas,
  practice ones through `createSession` with `FakeSound` (records commands
  with onset frames; can be told to fail `start()`), a settable
  `ClockPort`, fake wake-lock and visibility ports. UI scenarios with
  Testing Library render `App` with the fakes injected.
- **Integration:** the worklet host shim against the real WASM in
  Chromium (`test:timing` also asserts `OnsetReport`s arrive for every
  command).
- **Measured (Playwright, Chromium, `pnpm test:timing`):** REQ-008/S1 and
  REQ-006/S4. Not part of `pnpm check` (≈70 s); mandatory at every
  converge and finish, recorded in `notes.md`. AGENTS.md says so.
- **Design review:** the 002 screenshot loop (`pnpm design:shots`) with the
  new prototype, pairs for: idle, playing (mid-run), count-in, Traversal
  sheet, Tempo sheet, names view playing.
- **Not tested, and why:** actual screen dimming (no API to observe; the
  port call is asserted); audibility on a physical phone (acceptance walk,
  by the user); iOS/Android-specific autoplay behaviour beyond "the first ▶
  resumes the context" (acceptance walk).

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| WASM inside the AudioWorklet fails on the user's phone browser (module transfer, memory) | medium | No sound on the device that matters | T-early spike task: worklet + WASM sine on the phone before any UI work; if it fails, switch the `SoundPort` adapter to Web Audio nodes (the rejected-but-ready alternative) and move Rust to 005 — spec unchanged |
| Rust toolchain not installed / unfamiliar wasm build friction | certain today | `pnpm check` cannot run | User installs rustup + target (Open question 1); `build-sound.sh` fails fast with the install hint |
| `test:timing` flaky in headless Chromium (no real device; throttling) | medium | False failures | Run with `--autoplay-policy=no-user-gesture-required`, compare in audio frames not wall time, retry once, report the max deviation |
| Output latency makes the highlight *look* early on some phones | low | Cosmetic mismatch | The highlight timer adds `SoundPort.outputLatencyMs()` (T030) so it aims at the audible onset; the timing harness measures against the same instant; confirm on the phone |
| Two audio architectures if the fallback is taken later | low | Split effort | The fallback is the same `SoundPort`; the `sound` context is deleted, not kept alongside |
| v3 migration mistake loses 002 preferences | low | Annoyance | REQ-008/S4 test covers v1, v2 and corrupt inputs |

## Rollout

No flag: the traversal replaces the span outright, as the spec says. Turning
it off is `git revert` of the squash on `main`; stored v3 state then falls
back to first-run defaults in the old build (REQ-008/S3 path), losing only
settings. The WASM artefact is built at `pnpm build` and shipped in `dist/`;
no runtime fetch beyond the bundle's own assets (Article VII).

## ADRs

- **ADR 0003 — Rust owns the audio boundary** (`docs/adr/0003-rust-owns-the-audio-boundary.md`,
  proposed with this plan): amends ADR 0001 — a fourth context `sound`
  (synthesis, Rust/WASM in the AudioWorklet) joins `listening`; the host
  shim is TS by necessity and carries no domain logic; contexts still never
  bilingual. Requires the `docs/domain.md` row below.

## Affects (plan-level)

`docs/domain.md`: add context row `sound` — Owns: Voice (a tone or click
with an onset), Onset report; Responsible for: rendering scheduled tones
and clicks on the audio clock, reporting when each onset rendered; Not
responsible for: what to play or when (practice), pitch (theory); Code
root `src/sound/`. Relationship row: `practice → sound`, mechanism
`SoundCommand` message (schema `src/sound/published/sound-command.schema`),
no translation (frames and hertz). Invariant: an onset renders in the
quantum containing its frame or is reported late — never silently shifted.
Proposed at the gate, approved with the plan.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | Install the Rust toolchain on this machine (`rustup`, stable, `wasm32-unknown-unknown`) — a user action, not the agent's? | Every `sound` task and `pnpm check` | Yes; the first implement task is the worklet+WASM spike on the phone, so it is needed immediately |
| 2 | `pnpm test:timing` outside `pnpm check` (≈70 s, needs Chromium), mandatory at converge/finish, rather than inside every check run? | Task verify commands | Yes — check stays fast; the ladder's converge reviewer runs timing and the report records it |
| 3 | Add `sound` as a fourth bounded context in `docs/domain.md` (ADR 0003) rather than an adapter inside `practice`? | Structure, check-contexts | Yes — it is what ADR 0001 prescribes and what 005 will need anyway |
