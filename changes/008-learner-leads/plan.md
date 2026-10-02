---
type: Implementation Plan
title: Learner leads — plan
description: A pure hold-rule reducer over timestamped judgements; the Session aggregate owns the lead run beside the transport, the drone and the tuner on 007's listening pipeline; a NoteMeter overlay shared by both panels; the Traversal sheet rebuilt; a v6 store; a measured `test:lead` harness sharing `test:tuner`'s microphone feed.
resource: /changes/008-learner-leads/plan.md
status: stable
tags: [sdd, plan, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /changes/008-learner-leads/delta/practice/session.md
  - resource: /changes/008-learner-leads/design/handoff.md
  - resource: /docs/engineering.md
  - resource: /memory/constitution.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T16:50:00Z
verified:
  - by: human:merlin-webster
    at: 2026-10-02T16:00:00Z
sdd_id: 008-learner-leads
sdd_context: practice
sdd_phase: approved
---

# Plan: Learner leads

> **HOW.** Everything the spec deliberately excluded. This document is where
> technology choices live, and every choice names its alternative and its reason.

## Constitution check

| Article | Relevant? | How this plan complies |
|---|---|---|
| I — user is source of truth | yes | Every behaviour traces to the approved delta, `design/handoff.md`, `design/rounds.md`'s walkthrough rulings or `docs/decisions.md`; the close calls are Open questions |
| II — spec precedes implementation | yes | Proposal and delta approved 2026-10-02; the preview target (`.sdd/target/008-learner-leads/practice/session.md`, v0.5.0) is what this plan builds against |
| III — testable requirements | yes | Every requirement maps below to a scenario test through `practice/published` with fakes, a rendered-UI test, an exhaustive enumeration, or the measured harness |
| IV — separate verification | yes | Tests first per task (`tdd`); task-reviewer and converge reviewer never the implementer; `pnpm test:lead`, `pnpm test:tuner` and `pnpm test:timing` at converge and finish |
| V — latency budget | yes | The meter is a readout of the learner's own sound: 007's 100 ms pipeline (age check on arrival, coalescing, paint reported) is reused unchanged, the advance is emitted synchronously on the completing reading, and `pnpm test:lead` measures onset → readout, arrival age, readings/s and the advance's lateness |
| VI — instrument is the focus | yes | Nothing needs a tap during a lead run; the mode words, the sheet and the meter are the only new elements on the practice screen, and the meter sits on the note itself (the design's one-place rule) |
| VII — no third-party services | yes | The microphone is the device's own; nothing leaves the page; no runtime dependency |
| VIII — simplicity | yes | No new package or crate; one new pure domain module, one new store version, two new UI components (`NoteMeter`, `Switch`), the harness helpers extracted rather than duplicated; no second aggregate, no router, no flag |

## Engineering preferences check

| § | Follows? | Departure and reason |
|---|---|---|
| 2 Paradigm | Follows | The hold rule is a pure reducer in `domain/lead.ts` (`applyJudgement(state, judged, settings, tempo, length) → { state, advanced }`); the Session is the imperative shell that feeds it timestamps and ports |
| 3 Types | Follows | `LeadPhase` is a sum (`idle \| listening \| complete \| cannot-hear(reason)`); `Who` (`"tool" \| "me"`), `HoldBeats` (`1 \| 2 \| 4`), `Tolerance` (`"lenient" \| "medium" \| "accurate"`) are literal unions; the hold is `{ heldMs, lastInTuneAtMs: number \| null }`, never a flag |
| 4 Errors | Follows | The listening port's `Result` and `onEnded` already carry refused / none / failed; a lead run maps them to `cannot-hear(reason)`; nothing thrown |
| 6 Architecture | Follows | `PitchDetected` is still translated at the session into `NoteJudged`; the UI reads the `lead` block of the snapshot through `practice/published`; nothing new crosses a context boundary |
| 7 Testing | Follows | One test per scenario by ID; fakes at the ports (`FakeListening.feed` at chosen fake-clock frames); the hold invariant (REQ-016/S6) by exhaustive enumeration; the never-both enumeration widened with the lead verbs |
| 8 Data and interfaces | Follows | Stored state v6 is a Zod schema with `.catch` defaults (parse, don't validate); `NoteJudged`'s schema unchanged; `TargetAdvanced` unchanged |
| 9 Dependencies | Follows | None added |
| 11 Observability | Follows | The one SLO (100 ms; the advance's lateness) is measurable in-app: every reading carries its `atFrame`, the advance its frame; the harness reads them through the existing dev hooks |
| 14 Tooling | Follows | `pnpm check` unchanged; `pnpm test:lead` beside `test:tuner` and `test:timing`, outside `check`, mandatory at converge and finish |

## Approach

No stack question arises: the product constraints (a static page, the phone's own microphone), the numbered NFRs (100 ms, the hold's exactness), the map (`practice` consumes `PitchDetected`) and the repository's existing TypeScript/React/Zod/Vitest/Playwright all point the same way, as they did at 007. What is chosen here is **where the hold lives**, **how the lead run joins the aggregate**, **how the meter is drawn without re-rendering the stave at 90 readings a second**, **how the tone cue is kept out of the judgement**, and **how the harness measures the advance**.

**The hold rule** is a pure reducer in `src/practice/domain/lead.ts`. `LeadState` holds the target's sequence position, `heldMs`, `lastInTuneAtMs` (null after silence, a reset or a new target) and a `mutedUntilMs` for the tone window. `applyJudgement` takes a `NoteJudged` (cents from the target, verdict at the tolerance) with its time in ms and returns the next state and whether the target advanced: in tune → `heldMs += now − lastInTuneAtMs` (0 on the first in-tune reading after silence), `lastInTuneAtMs = now`; out of tune → both reset; `heldMs ≥ requiredHoldMs(beats, tempo)` → advance, hold zero, `lastInTuneAtMs` null. `applySilence` nulls `lastInTuneAtMs` and keeps `heldMs`. Time is the reading's `atFrame` converted at the port's sample rate — the same clock the age check uses — so the rule is independent of the reading rate (intent) and the harness can compute the expected advance frame exactly. The rule runs on **every arriving, non-late detection**, not on the coalesced commit: a coalesced-away out-of-tune reading must still reset the hold. The verdict comes from `tuner.ts`'s `verdictOf` given a band parameter (`verdictOf(cents, bandCents = IN_TUNE_BAND_CENTS)` — the tuner's call sites unchanged), and the smoothing is `smoothedPitchHzOf` with a pinned `TunerTarget` at the target's position, so a new target resets it exactly as the spec's "first reading as detected" needs.

**The Session aggregate** owns the lead run beside the transport, the drone and the tuner — 004's and 007's reasoning: the never-both invariant and the microphone's lifecycle live in one place. `SessionSettings` gains a `lead: LeadSettings` block (`who`, `holdBeats`, `tolerance`, `cueMeter`, `cueTone`) so the existing `setSettings` verb and the existing store field carry it (Open question 2). `start()` and `stop()` dispatch on `settings.lead.who`: with `"me"`, `start()` stops the drone, acquires the wake lock, requests listening through the tuner's own `startListening` path generalised with a `listeningOwner` (`none | tuner | lead`), sets the first target and emits `TargetAdvanced`; `stop()` ends listening and returns to idle. `setSettings` with a changed `who` stops a run in progress first (REQ-014). `onPitchDetected` branches on the owner: the lead branch ages the detection (dropping a late one), ignores it inside the tone window, smooths and judges it against the target, applies the reducer, emits `TargetAdvanced` on an advance (and schedules the next tone cue), stores the pending reading for the per-tick commit that emits `NoteJudged`, and re-arms the 300 ms gap timer whose firing clears the reading and applies `applySilence`. `startDrone` and `enterTuner` call `stop()` first when a lead run is in progress; `tapNote` is a no-op. Hidden → `stop()` (REQ-009); `onEnded` → `cannot-hear`. Loop on → the reducer wraps to position 1; loop off → `complete`, listening ended.

**The tone cue** reuses the tapped note's tone scheduling (`REQ-013`'s one-beat tone, with a fixed `CUE_TONE_MS = 400` instead of a beat and its own tag base) and sets `mutedUntilFrame = onsetFrame + (400 + release + 100) ms` in frames; the lead branch drops any detection whose `atFrame` is below it and resets the smoothing, so the first reading after the window is as detected. The sound port's `start()` is awaited once, as `tapNote` does, so the first cue is late by the sound context's start only on a cold session.

**The UI** keeps the panels static and overlays the meter. `NoteMeter.tsx` draws the band, the fill and the pitch line from a `MeterFrame` (`{ x, y, width, toleranceCents, fill, cents | null, verdict }`) as absolutely-positioned HTML over the panel — the prototype's own construction — and is the only thing that re-renders per reading: `StaveView` exposes the target notehead's centre (it already computes head geometry) and `NamesView` the target column's box through a `onTargetBox` callback measured once per layout; `App` subscribes to the snapshot's `lead` block and feeds `NoteMeter`. Both panels gain a `leadTarget` prop (`{ runIndex, pastInk: boolean }`) for the highlight and the ink-behind / faint-ahead styling. `TransportCard` gains the mode words row (in every state; the progress bar and its track are removed), the I-lead idle caption and glyph, the live lead card, the complete card and the no-mic card; `cents-label.ts` gains the judgement copy. `TraversalSheet` is rebuilt to the handoff's rows on a `Row` of fixed height with a hint box, a new `Switch`, the ✕ moved into the Who leads row, and the three mode rows swapped by `who`. `theme.ts` gains `lead.holdFill` and the row metrics; the four other README colours are the existing `tuner.*` tokens (Open question 1). The store goes to **v6** (`session.lead` with `.catch` defaults; v5 state reads with the defaults, REQ-011/S5).

**The harness** `scripts/lead-timing-test.mjs` (`pnpm test:lead`) extracts the dev-server, microphone-override and table helpers of `tuner-timing-test.mjs` into `scripts/harness-lib.mjs` (both scripts import it; `test:tuner`'s output is unchanged) and drives the page through the existing `window.__session` and `onPaintAge` hooks: it sets I lead at medium / 2 beats / 96 bpm, taps the circle, and feeds the example traversal as a scripted oscillator timeline — silence, a −30 ¢ entry settling over 650 ms, in-tune holds, one −16 ¢ drift and back, each note to its advance — recording onset → first `NoteJudged`, arrival age, readings per second, each `TargetAdvanced`'s frame against the expected frame (the first in-tune reading at which ≥ 1250 ms had accumulated), and the paint age; with the tone cue on it plays a 400 ms tone at each advance into the same stream and asserts no `NoteJudged` and no hold inside the window. `design-shots.mjs` is pointed at the eleven states of `Learner Leads Final.dc.html`.

### Alternatives rejected

| Option | Why not |
|---|---|
| A separate `LeadRun` aggregate with the UI coordinating the exclusions | 004's and 007's reasoning again: the never-both invariant (REQ-015/S6) and the mic lifecycle would live in `App.tsx`, untestable through `practice/published`; one aggregate, one invariant, one enumeration |
| Explicit `startLead()` / `stopLead()` verbs beside `start()` / `stop()` | The circle is one control and the mode is session state; dispatching in `start()`/`stop()` keeps the card's handler, `enterTuner`'s and `startDrone`'s "stop first" and the hidden rule on one verb. The cost — the never-both enumeration gains `setSettings(who)` as a verb — is paid once |
| Apply the hold rule on the committed (coalesced) reading | A burst within one tick coalesces onto the newest; an out-of-tune reading inside the burst would never reset the hold. Timestamps make applying on arrival exact and cheap |
| Count readings instead of elapsed time | The feel would change with the reading rate (laptop vs phone, a dropped hop); the harness could not compute the expected advance exactly |
| Judge from raw detections | Decided against at the intent (Q4): the smoothed offset is what is shown, so it is what is counted |
| Re-render the stave SVG per reading with the meter inside it | 590 lines of SVG geometry at ~90 updates/s on the phone — 007's paint-age risk made real; an overlay re-renders one small component and leaves the stave's `React.memo` intact |
| Mute the microphone for the tone cue | Decided against at the intent (Q1): a restart re-gates the detector's onset window on every note; a frame window costs nothing |
| A separate `LeadSettings` verb and store block, like the drone's | The drone has its own sheet and its own voice; the lead settings sit in the Traversal sheet beside the session settings and the mode is a transport-level choice — one verb and one field are fewer moving parts (Open question 2) |
| Extend `test:tuner` with a lead case | Each run is already ~4 minutes; a separate script has its own gate line in `AGENTS.md` and can run alone while the loop tunes the hold |
| Duplicate the microphone override into the new harness | The repo's own rule: extract, do not copy (AGENTS.md › Things agents get wrong) |
| A fourth transport variant `leading` in `TransportState` | The transport machine is the beat clock (count-in, rest, position per tick); a lead run has no ticks. A separate `LeadState` keeps `transport.ts` pure and untouched |

## Stack

| Layer | Choice | Version | Why this, not the obvious alternative |
|---|---|---|---|
| Language / runtime | TypeScript (strict) SPA | as repo | No Rust change: `PitchDetected` is consumed unchanged (ADR 0006) |
| Framework | React 19 + Vite | as repo | Unchanged; the meter is an overlay component, not a renderer change |
| Audio | Web Audio, the shared `AudioContext`; the tone cue through `SoundPort` as a tapped note is | platform | The one audio thread (ADR 0003); the cue's onset frame is known, so the mute window is exact |
| Data store | `localStorage` via `SelectionStore`, schema v6 | as repo | One versioned Zod schema; `.catch` defaults migrate v5 |
| Testing | Vitest + Testing Library; Playwright (dev-only) for `test:lead`, `test:tuner`, `test:timing`, `design-shots` | as repo | Unchanged |
| Build / tooling | pnpm, Prettier, ESLint, tsc, `pnpm check` | as repo | Unchanged |

New dependencies, each with a justification (Article VIII):

| Package | Purpose | Why not stdlib / existing dep |
|---|---|---|
| — | none | The reducer is ~80 lines; the overlay is positioned HTML; the switch is a div |

## Data model

**practice — settings (`domain/settings.ts`, `domain/lead.ts`)**

```ts
type Who = "tool" | "me";
type HoldBeats = 1 | 2 | 4;
type Tolerance = "lenient" | "medium" | "accurate";
const TOLERANCE_CENTS: Record<Tolerance, number> = { lenient: 15, medium: 10, accurate: 5 };

interface LeadSettings {
  readonly who: Who;              // REQ-014
  readonly holdBeats: HoldBeats;  // REQ-016, REQ-020
  readonly tolerance: Tolerance;
  readonly cueMeter: boolean;     // REQ-018
  readonly cueTone: boolean;
}
const defaultLeadSettings: LeadSettings = { who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false };

interface SessionSettings { /* as today */ readonly lead: LeadSettings; }   // REQ-011: stored and restored with the rest

function requiredHoldMs(beats: HoldBeats, tempoBpm: number): number { return (beats * 60000) / tempoBpm; }   // REQ-016
function holdHintOf(beats: HoldBeats, tempoBpm: number): string;        // "Beats in tune, then the next · 1.3 s" — one decimal, half up (REQ-020/S4)
function toleranceHintOf(tolerance: Tolerance): string;                 // "Within 10% of the way to the next note"
function cuesHintOf(cueMeter: boolean, cueTone: boolean): string;       // the four strings of REQ-018
```

**practice — the lead run (`domain/lead.ts`)**

```ts
const LEAD_GAP_MS = 300;             // REQ-017: silence clears the line; shares the tuner's value by name, not by constant
const CUE_TONE_MS = 400;             // REQ-018: the tone's length
const CUE_TAIL_MS = 100;             // REQ-018: judged nothing until the tone's release + this
const HELD_TICK_MS = 400;            // REQ-017: "<note> held ✓" shows this long in silence
const CUE_TAG_BASE = 4_000_000;      // the cue's voice tags, clear of tap/click/drone bases

type LeadPhase =
  | { readonly kind: "idle" }
  | { readonly kind: "listening"; readonly target: LeadTarget; readonly hold: Hold; readonly mutedUntilMs: number | null }
  | { readonly kind: "complete" }
  | { readonly kind: "cannot-hear"; readonly reason: "refused" | "none" | "failed" };

interface LeadTarget { readonly position: number; /* 1-based in the sequence */ readonly note: Note; readonly runIndex: number }
interface Hold { readonly heldMs: number; readonly lastInTuneAtMs: number | null }

function applyJudgement(phase: LeadPhase, judged: NoteJudged, atMs: number, settings: LeadSettings, tempoBpm: number, sequence: readonly SequenceNote[], loop: boolean)
  : { readonly phase: LeadPhase; readonly advanced: boolean };          // REQ-016 — the rule, pure
function applySilence(phase: LeadPhase): LeadPhase;                     // lastInTuneAtMs := null, heldMs kept
function heldFractionOf(hold: Hold, requiredMs: number): number;        // the fill, clamped to [0, 1]
```

**practice — the snapshot**

```ts
interface LeadSnapshot {
  readonly who: Who;
  readonly phase: LeadPhase["kind"];
  readonly listening: ListeningState;          // the same sum the tuner uses
  readonly target: LeadTarget | null;          // listening only
  readonly heldFraction: number;               // 0 when idle/complete
  readonly reading: NoteJudged | null;         // cents from the target (unclamped), verdict at the tolerance; null in silence or inside the tone window
  readonly justHeld: Note | null;              // "<note> held ✓" — set on an advance, cleared on the first reading or HELD_TICK_MS of silence
  readonly idleCaption: string;                // "hold 2 beats · medium tuning" (REQ-014) or the sequence caption
  readonly completeCaption: string | null;     // "15 of 15 held · C4–C5" (REQ-015)
}
SessionSnapshot: + lead: LeadSnapshot; − progress (REQ-002: no progress bar); caption unchanged for play along
```

`NoteJudged` and `TargetAdvanced` schemas are unchanged: a lead run's `NoteJudged.target` is the sequence note, `cents` unclamped (REQ-016/S8 carries +1200), `verdict` at the tolerance; `TargetAdvanced` carries the note, position, length and the frame of the completing reading.

**ui — stored state v6 (`selection-store.ts`)**

```ts
const storedLeadSchema = z.object({
  who: z.enum(["tool", "me"]).catch("tool"),
  holdBeats: z.union([z.literal(1), z.literal(2), z.literal(4)]).catch(2),
  tolerance: z.enum(["lenient", "medium", "accurate"]).catch("medium"),
  cueMeter: z.boolean().catch(true),
  cueTone: z.boolean().catch(false),
}).catch(defaultLeadSettings);
const storedSelectionV6Schema = storedSelectionV5Schema.extend({ schemaVersion: z.literal(6), session: storedSessionSchema.extend({ lead: storedLeadSchema }) });
// read: v6 | v5 | v4 | v3 | v2 | v1 → the v5 branch supplies defaultLeadSettings (REQ-011/S5); nothing about a run is ever stored
```

## Interfaces

**`practice/published` — added / changed**

```ts
export type { Who, HoldBeats, Tolerance, LeadSettings, LeadPhase, LeadTarget, LeadSnapshot };
export { TOLERANCE_CENTS, defaultLeadSettings, requiredHoldMs, holdHintOf, toleranceHintOf, cuesHintOf, applyJudgement, applySilence, heldFractionOf, LEAD_GAP_MS, CUE_TONE_MS, CUE_TAIL_MS, HELD_TICK_MS };
export { verdictOf };                       // now (cents, bandCents = IN_TUNE_BAND_CENTS)

Session.start(): void        // who = "tool": as today; who = "me": stopDrone → wake lock → listening.start() → first target (REQ-015); a no-op on an empty sequence (S8) or while a run is in progress
Session.stop(): void         // stops whichever run is in progress; a lead run: listening.stop(), phase idle, hold forgotten, cue voice stopped
Session.setSettings(s): void // a changed `who` while a run is in progress → stop() first (REQ-014/S3); tempo/holdBeats/tolerance → the next reading uses them (REQ-019); cueMeter at once; cueTone at the next target
Session.setContext / setTraversal / setScaleChoice   // while leading: the run restarts on the new sequence at position 1, still listening (REQ-019/S1, S5)
Session.startDrone(): void   // while leading: stop() first (REQ-015/S5), then as today
Session.enterTuner(): void   // while leading: stop() first (REQ-015/S7), then as today
Session.tapNote(i): void     // while leading: no-op (REQ-013)
Session.readingShown(atFrame): number       // unchanged; the lead reading reports through it too (REQ-021)
Session.onNoteJudged / onTargetAdvanced     // unchanged; a lead run emits both
```

Errors: the lead run surfaces `ListeningUnavailable` (`refused | none | failed`) as `phase: cannot-hear(reason)` (REQ-022) and `ListeningEnded` the same; a `SoundUnavailable` on the cue tone sets the existing `notice: "sound-unavailable"` and the run continues without the cue (the cue is optional; the run is not).

**The lead branch of `onPitchDetected`, precisely.** `ageMs > READING_MAX_AGE_MS` → dropped (REQ-021/S2). `atFrame < mutedUntilFrame` → dropped and the smoothing reset (REQ-018/S3). Otherwise `smoothedPitchHzOf(state, pinned(target.position), …)`, `judge(pitch@smoothed, pinned(target.position), …)` with the verdict recomputed at `TOLERANCE_CENTS[tolerance]`; `applyJudgement` with `atMs = atFrame / sampleRate × 1000`; on `advanced`: `TargetAdvanced` emitted now, `justHeld` set, the next cue scheduled, the smoothing reset; the pending reading set (coalescing as the tuner's) and committed on the next clock tick with `NoteJudged`; the gap timer re-armed. The gap timer fires → `reading = null`, `applySilence`, `justHeld` cleared after `HELD_TICK_MS` if still set.

**Events**

| Event | Direction | Schema | Notes |
|---|---|---|---|
| `PitchDetected` | `listening` → `practice` | `src/listening/published/pitch-detected.schema.ts` | Translated at the session; never reaches the view raw |
| `NoteJudged` | `practice` → UI | `src/practice/published/note-judged.schema.ts` | One per committed lead reading; the harness subscribes |
| `TargetAdvanced` | `practice` → UI | `src/practice/published/target-advanced.schema.ts` | One per lead target, the first included; `atFrame` is the completing reading's frame (the first target's is the start frame) |

**Routes** (the proposal's Interface table, filled): every state is `/` (screen: practice) — the app has no URL routes; `design-shots` / `design_snapshot` reach a state by driving the UI: the mode words, the circle, the sheet, and the harness's microphone feed for the listening states.

## Structure

```
src/practice/
  domain/lead.ts                      ← NEW: LeadSettings, TOLERANCE_CENTS, requiredHoldMs, the hints, LeadPhase/LeadTarget/Hold, applyJudgement, applySilence, heldFractionOf, the constants
  domain/settings.ts                  ← SessionSettings gains `lead`; defaultSessionSettings gains defaultLeadSettings
  domain/tuner.ts                     ← verdictOf(cents, bandCents = IN_TUNE_BAND_CENTS)
  domain/session.ts                   ← listeningOwner; start()/stop() dispatch; the lead branch of onPitchDetected; the cue; the gap timer; hidden/onEnded/wake lock for a lead run; the lead snapshot block; `progress` removed
  published/index.ts                  ← the exports above
src/ui/
  theme.ts                            ← lead: { holdFill: "oklch(0.80 0.07 150)" }; sheet row metrics (rowHeight 62, hintBox 28); the mode-word underline
  cents-label.ts                      ← judgementLabelOf(reading | null, target, justHeld): "Play C4" / "↓ 18 ¢ flat" / "↑ 12 ¢ sharp" / "in tune · holding" / "C4 held ✓" with its colour
  TransportCard.tsx                   ← the mode words row (every state; progress bar removed); I-lead idle glyph + caption; the live lead card; the complete card; the no-mic card
  NoteMeter.tsx                       ← NEW: band / fill / line overlay from a MeterFrame; 180 ms top transition; hidden line in silence; nothing when cueMeter is off
  StaveView.tsx                       ← leadTarget prop (highlight + ink-behind / faint-ahead); onTargetBox(runIndex → {x, y}) from the head geometry
  NamesView.tsx                       ← leadTarget prop; onTargetBox from the column's box
  TraversalSheet.tsx                  ← rebuilt: Row (62 px, label + hint box), the Who leads row with ✕, the three mode rows, the hairline, the shared rows restyled; Octaves/Direction/Shape/Loop behaviour unchanged
  Switch.tsx                          ← NEW: the 36×20 switch (track accent/trackOff, 14 px knob)
  App.tsx                             ← feeds NoteMeter from snapshot.lead; passes leadTarget to the panels; the circle's handler stays onTogglePlay (start/stop dispatch in the session); onPaintAge covers the lead reading
  selection-store.ts                  ← v6 schema, v5 → v6 defaults, write v6
  main.tsx                            ← no change (the hooks exist)
tests/practice/
  fakes.ts                            ← FakeListening.feed at chosen frames (exists); sessionDeps unchanged
  scenarios/lead-mode.test.ts         ← REQ-014
  scenarios/lead-run.test.ts          ← REQ-015 (S1–S5, S7, S8)
  scenarios/lead-hold.test.ts         ← REQ-016 (S1–S5, S7–S9)
  scenarios/lead-meter.test.ts        ← REQ-017's snapshot halves (reading, heldFraction, justHeld, gap)
  scenarios/lead-cues.test.ts         ← REQ-018 (S1–S4 through the session: the cue voice, the mute window)
  scenarios/lead-changes.test.ts      ← REQ-019
  scenarios/lead-budget.test.ts       ← REQ-021/S2 (a stale detection dropped; coalescing keeps the hold exact)
  scenarios/lead-cannot-hear.test.ts  ← REQ-022
  scenarios/session-hidden-awake.test.ts (extend) ← REQ-009/S2–S3
  scenarios/session-tap.test.ts (extend) ← REQ-013/S5, S7
  scenarios/session-transport.test.ts (extend) ← REQ-002/S1, S2 (no progress; caption)
  invariants/hold-never-early.test.ts ← REQ-016/S6: every tolerance × hold × tempo 40–200 step 2 × a generated family of reading/silence sequences
  invariants/never-both.test.ts       ← REQ-015/S6: the enumeration gains start-as-me (via setSettings who) — no tone, click, drone or tap live while a lead run listens; the cue is the one allowed voice
  invariants/target-in-sequence.test.ts ← REQ-015: every TargetAdvanced of a lead run is a member at its position (loop wrap included)
tests/ui/scenarios/
  transport-card-lead.test.tsx        ← REQ-014 (words, glyph, caption), REQ-015 (live/complete cards), REQ-017 (judgement copy/colours), REQ-022 (the card), REQ-002/S5 (one height)
  note-meter.test.tsx                 ← REQ-017 (band 26 px / column−6, 8 px at medium, fill %, line y and colour, hidden in silence), REQ-018/S1 (off)
  traversal-sheet-lead.test.tsx       ← REQ-020 (rows, hints, swap keeps height — measured by the rendered rows' count and fixed height; nothing else moves), REQ-018/S5
  selection-persistence.test.tsx (extend) ← REQ-011/S1, S2, S5
scripts/
  harness-lib.mjs                     ← NEW: ensureDevServer/stopDevServer, installMicrophoneOverride, printTable, the note/position helpers — extracted from tuner-timing-test.mjs
  tuner-timing-test.mjs               ← imports harness-lib; output unchanged
  lead-timing-test.mjs                ← NEW: pnpm test:lead (REQ-021/S1, REQ-018/S3, REQ-016/S1's timing)
  design-shots.mjs                    ← PROTOTYPE_PATH → Learner Leads Final.dc.html (#s01–#s10)
package.json                          ← "test:lead"
AGENTS.md                             ← the command, its healthy output (pasted at converge)
docs/design.md                        ← §8 lead.holdFill; Screens index (at finish)
```

## Requirement → design mapping

| Requirement | Where it is satisfied | How it is verified |
|---|---|---|
| practice.session/REQ-014 (the mode) | `LeadSettings.who`; `setSettings` stops a run on a change of `who`; `TransportCard` mode words, glyph, `idleCaption` | S1–S4 `lead-mode` (snapshot `lead.who`, `idleCaption`, no `listening.startCalls`) + `transport-card-lead` (underline colours from `theme`, the Tuner glyph's three bars, "hold 1 beat · accurate tuning"); S3 (`setSettings` who → `stopAll` within 50 ms / `listening.stopCalls`); S5 `session-transport` unchanged scenarios still pass with the words rendered |
| practice.session/REQ-015 (a lead run) | `start()`/`stop()` dispatch; `listeningOwner`; the first target + `TargetAdvanced`; `complete` / loop wrap; `startDrone`/`enterTuner` stop first; the empty-sequence guard | S1 `lead-run` (`listening.startCalls` 1 at the tap, `TargetAdvanced` C4@1, snapshot target, nothing in `FakeSound`); S2 (`stopCalls`, idle, hold zero on restart); S3 (loop off: `complete`, `completeCaption`, `stopCalls`); S4 (loop on: C4@1 again, no stop); S5 (drone `stop(tag)` before the target; `startDrone` while leading → `stopCalls` then the drone voice); S6 `never-both` widened; S7 (`enterTuner` → lead `stopCalls`, tuner starts); S8 (empty run → no `startCalls`) |
| practice.session/REQ-016 (the judgement and the hold) | `applyJudgement`/`applySilence`; `verdictOf(cents, band)`; the lead branch of `onPitchDetected` on every arriving detection | S1 `lead-hold` (`FakeListening.feed` at frames: 262.5 Hz from frame 0 → `NoteJudged` +6 in tune; `TargetAdvanced` D4@2 at the first reading ≥ 1250 ms); S2 (−18 → flat, never advances; +19 sharp); S3 (900 ms, one +17 reading, reset, advances 1250 ms after the next in-tune); S4 (gap: no `NoteJudged`, `heldMs` kept, advances 350 ms after return); S5 (verdict table at three tolerances); S6 `hold-never-early` enumeration; S7 (tempo + → 1000 ms, advance 100 ms later; − → 2000 ms, 900 kept); S8 (C5 vs C4 → +1200 sharp, no advance); S9 (first reading on D4 as detected, −655, smoothing state reset) |
| practice.session/REQ-017 (the meter and the card) | `NoteMeter` geometry (40 px per 100 ¢; band 2·tol·0.4 px; stave width 26 / column −6; line ±2 / ±3; 180 ms transition); `leadTarget` styling in both panels; `judgementLabelOf`; `justHeld`; the gap timer | S1 `note-meter` + `transport-card-lead` (band 26×8 at medium, no fill/line; "Play C4" in `paper.faint`; others faint); S2 (line top at 50 % + 18 % → 7.2 px below centre in `tuner.flat`; "↓ 18 ¢ flat"; +12 → 4.8 px above in `tuner.sharp`); S3 (fill 60 %, line `tuner.inTune`, "in tune · holding"); S4 (C4 ink not enlarged, D4 highlighted, line pinned at the bottom edge, "C4 held ✓" until the first reading — `lead-meter` for `justHeld`); S5 (+1200 → line at the top edge, "↑ 1200 ¢ sharp"); S6 (names: band inset 6 px, 40 % fill, line inset 3 px at 2 px above centre); S7 `lead-meter` (gap → reading null, heldFraction kept; next reading restores); S8 (run index 10: C4–F4 ink, G4 target, A4–C5 faint) |
| practice.session/REQ-018 (cues) | `cueMeter` → `NoteMeter` renders nothing; `cueTone` → the cue voice at each target; `mutedUntilFrame`; `cuesHintOf` | S1 `lead-cues` + `note-meter` (meter off: no band/fill/line; judgement still shown; hold still advances); S2 (`FakeSound` sees a tone at 261.63 Hz for 400 ms at start, 293.66 at the advance); S3 `lead-cues` (detections inside the window → no `NoteJudged`, hold zero, target C4) + the harness; S4 (tone off: `FakeSound` empty through three targets); S5 `traversal-sheet-lead` (the four hint strings) |
| practice.session/REQ-019 (changes while leading) | `setContext`/`setTraversal`/`setScaleChoice` restart at position 1 while leading; `setSettings` recomputes `requiredHoldMs` at the next reading; the sheet never calls `stop()` | S1 `lead-changes` (G major → G4@1, hold zero, `startCalls` still 1); S2 (accurate → +8 sharp, hold reset, band 4 px); S3 (Hold 4 → 2500 ms, 900 kept, fraction 0.36); S4 (sheet open/close → no `stopCalls`, readings judged); S5 (↑ → run of 8, C4@1) |
| practice.session/REQ-020 (the Traversal sheet) | `TraversalSheet` rebuilt: `Row` 62 px with a 28 px hint box; Who leads with ✕; the mode rows; the hairline; `Switch`; `holdHintOf`/`toleranceHintOf` | S1–S2 `traversal-sheet-lead` (row labels in order, nine rows, no title, hints verbatim at 120 bpm); S3 (render in play along, note every row's `data-testid` order and the sheet's height; switch to I lead: height equal, the first row and the shared rows' order/positions unchanged, only the three mode rows differ — the fidelity screenshots confirm pixels in the loop); S4 (hints at 96 bpm: 0.6 / 1.3 / 2.5 s; 15 % / 5 %; at 120: 1.0 s); S5 `session-traversal` unchanged + the sheet test for the Octaves pills and summary |
| practice.session/REQ-021 (the budget) | 007's age check and coalescing reused; the advance emitted synchronously on the completing reading; `readingShown`/`onPaintAge` cover the lead reading | S1 `pnpm test:lead` (onset → first `NoteJudged` ≤ 100 ms for every tone in the script; arrival age ≤ 100 ms; ≥ 20 readings/s steady; each `TargetAdvanced.atFrame` within one hop of the expected frame and never before it; paint age reported); S2 `lead-budget` (a detection 101 ms old → nothing; a burst of three with the middle out of tune → hold reset, newest shown); S3 `pnpm test:timing` unchanged, PASS at converge; S4 the user's walk |
| practice.session/REQ-022 (no microphone) | `start()`'s failed `listening.start()` → `cannot-hear(reason)`; `onEnded` → the same within one notify; the no-mic card in `TransportCard`; the mic requested only in `start()` with `who = "me"` | S1 `lead-cannot-hear` (`failWith("refused")` → phase, no target) + `transport-card-lead` (the card text verbatim, circle and words present); S2 (clear the fake failure, `start()` → listening); S3 (`end()` → cannot-hear within one tick, reading null, hold forgotten); S4 (`permissionPrompts` 0 after open, sheet, mode word) |
| practice.session/REQ-002 (play and stop — modified) | `progress` removed from the snapshot and the card; the mode words row in every state; the caption as today | S1–S4 `session-transport` (existing, `progress` assertions removed; the words rendered in `transport-card-lead`); S5 `transport-card-lead` (the card's rendered height equal across idle / playing / idle and the I-lead idle card — by the same fixed row structure, asserted on the DOM's row count and the absence of the track) |
| practice.session/REQ-009 (hidden; awake — modified) | `visibility.onHidden` while leading → `stop()`; `wakeLock.acquire()` on a lead start, released by the shared `releaseWakeLockIfIdle` | S1 existing; S2 `session-hidden-awake` (wake acquired while leading, released after `stop()`); S3 (hide → `listening.stopCalls` 1, phase idle, no target; show → no `startCalls`; `start()` → C4@1 fresh) |
| practice.session/REQ-011 (remembered — modified) | `defaultLeadSettings`; store v6; the v5 branch's defaults; `who` restored but never a run | S1 `selection-persistence` (v6 with me / 4 / accurate / off / on → all restored, idle caption "hold 4 beats · accurate tuning", `startCalls` 0); S2 (no state → tool / 2 / medium / on / off); S3–S4 existing extended with the lead defaults; S5 (a v5 document → everything restored + lead defaults) |
| practice.session/REQ-013 (tapped note — modified) | `tapNote` no-op while `listeningOwner === "lead"`; idle in I lead taps as today | S5 `session-tap` (leading → no tone, highlight stays on the target); S7 (I lead idle → tone 329.63 Hz for 625 ms, caption unchanged, `startCalls` 0) |

## Test strategy

- **Unit (pure):** `applyJudgement`/`applySilence` directly — every REQ-016 scenario is first a reducer test with hand-written timestamps, then a session test feeding `FakeListening` at frames; `requiredHoldMs`, the three hint formatters, `verdictOf` with a band, `heldFractionOf`. The enumeration `hold-never-early` generates, for every tolerance × hold × tempo (81 × 3 × 3 settings), reading sequences from a small grammar (in-tune runs, one out-of-tune reading, silences, a target change) and asserts the advance happens only at the first in-tune reading with `heldMs ≥ required` — the invariant the domain map names.
- **Integration (practice scenarios):** the session through `practice/published` with `FakeListening`, `FakeSound`, `FakeClock`, `FakeWakeLock`, `FakeVisibility`: every lead scenario is a statement about the snapshot's `lead` block, the emitted `NoteJudged`/`TargetAdvanced`, and which port verbs were called. `never-both` widened; `target-in-sequence` covers the lead run's wrap.
- **End-to-end (ui scenarios):** `TransportCard`, `NoteMeter`, `TraversalSheet` rendered in `App` with the fakes; `pnpm test:lead` for the measured requirements; `design-shots` against the eleven states, reviewed in the refinement loop (`sdd-design` D) — not a pixel gate.
- **Not tested, and why:** the exact 180 ms line transition (a CSS transition; the loop judges it); the phone's own capture latency (007's accepted limit); the tone cue's acoustic path from the phone's speaker to its microphone (the harness feeds the tone into the stream itself; the walk is the check — if bleed outlasts `CUE_TAIL_MS` the loop raises it); the sheet's pixel positions (asserted structurally in Vitest, visually in the loop's screenshots).

## Risks

| Risk | Likelihood | If it happens | Mitigation / early signal |
|---|---|---|---|
| Medium ±10 ¢ with the tuner's smoothing feels unfair on a real flute tone (vibrato, breath) — the hold keeps resetting | medium | The walk says "it never lets me through" | The tolerance is a setting (lenient ±15 is one tap); the loop can tune `SMOOTHING_FACTOR` for the lead branch only if the tuner's feel must not change; `test:lead`'s −16 ¢ drift case shows what a wobble does |
| The stave overlay's position drifts from the notehead (the panel re-lays out: a key change, names toggled, a narrower phone) | medium | The band sits beside the note, not on it | `onTargetBox` is measured from the same geometry the head is drawn with, re-measured on every panel layout (a `ResizeObserver` through the existing `use-measured-size`); the loop's 360 px screenshots catch it |
| Re-rendering per reading still costs paint on the phone despite the overlay (the card's judgement text and the fill width change ~90×/s) | low–medium | Paint ages creep in `test:lead`'s column; the harness's arrival gate still passes | `NoteMeter` and the judgement line are the only subscribers; the fill width is a style on one div; if needed, the fill updates at 30 Hz from a `requestAnimationFrame` while the line stays per reading |
| The tone cue through the phone's speaker outlasts `CUE_TAIL_MS` in the microphone (room reverb, the phone's AGC — which 007 turned off) | low–medium | A reading right after the window is the tool's own tone, in tune, banking up to one hop of hold | The window is one constant; the walk with tone on is the check; the smoothing reset after the window means a stale tone reads as a jump, not a blend |
| A late reading that would have completed the hold is dropped, so the advance lands one reading later than the harness expects | low | `test:lead`'s "within one hop" gate fails by one hop on a stalled laptop | The gate is "within one hop, never before"; a drop is logged in the harness's table so a near miss is explained, as 003's `vs audible` lateness was |
| The v6 store read by an older build (a rollback) | low | The older schema rejects v6 → defaults (REQ-011's unreadable rule) | Accepted: the user loses stored settings once on rollback; nothing else |
| `setSettings` is called by the sheet for every pill tap; a `who` change mid-run must stop the run but a `holdBeats` change must not | low | A tolerance tap stops the run | `setSettings` diffs `who` only; `lead-changes` S2/S3 assert no `stopCalls` |

## Rollout

No flag. The mode words are the only way in; play along is the stored default, so a user who never taps "I lead" sees only the words and the rebuilt sheet. Reverting the merge removes the mode; stored v6 state falls back to defaults on an older build (the risk above). `pnpm test:lead`, `pnpm test:tuner` and `pnpm test:timing` are all required at converge and finish; `AGENTS.md` gains the command and, at converge, its healthy output.

## Open questions

| # | Question | Blocks | Recommended answer |
|---|---|---|---|
| 1 | *Answered 2026-10-02: add `lead.holdFill` only; the meter uses the four `tuner.*` tokens.* The README lists five "new" tokens; four (`band`, `in tune`, `flat`, `sharp`) already exist as `tuner.*` with the same values (the README itself says the band "i.e. `tuner.band`"). Add only `lead.holdFill` and have the meter use `tuner.*` for the rest, or duplicate them under `lead.*` as the README's list reads? | the theme task | Add `lead.holdFill` only; note in `docs/design.md` §8 that the four `tuner.*` tokens are shared by the meter on the note — one value per role, as §8's own rule says |
| 2 | *Answered 2026-10-02: inside `SessionSettings`.* Lead settings inside `SessionSettings` (one `setSettings` verb, one `session.lead` store field) or a separate `LeadSettings` verb and store block like the drone's? | the settings task | Inside `SessionSettings` — the drone's separation exists because it has its own sheet and voice; these settings live in the Traversal sheet beside the session settings |
| 3 | *Answered 2026-10-02: within one hop, never before.* `test:lead`'s advance gate: "within one hop (≈ 11 ms) of the expected frame, never before" as written, or the spec's looser "within 100 ms" only? | the harness task's assertions | One hop and never before — it is what makes the hold rule's exactness measurable; "never before" is the invariant; the 100 ms gate on the *shown* advance stays as the spec names it |
