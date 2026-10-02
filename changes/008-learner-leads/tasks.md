---
type: Task List
title: Learner leads — tasks
description: 22 tasks across four phases — foundations (the lead domain, the store), the lead run in the Session aggregate, the practice screen (card, meter, panels, sheet), the harness and hardening.
resource: /changes/008-learner-leads/tasks.md
status: stable
tags: [sdd, tasks, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/plan.md
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /changes/008-learner-leads/delta/practice/session.md
  - resource: /changes/008-learner-leads/design/handoff.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-10-02T17:20:00Z
verified:
  - by: human:merlin-webster
    at: 2026-10-02T16:34:00Z
sdd_id: 008-learner-leads
sdd_context: practice
sdd_phase: in-progress
---

# Tasks: Learner leads

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
> **The worked example everywhere:** C major on flute Concert, ↑↓, 1 oct,
> scale — the run C4 D4 E4 F4 G4 A4 B4 C5, the sequence of 15 notes · C4–C5.
> Pitches: C4 261.63 Hz, D4 293.66, E4 329.63; 262.5 Hz is C4 +6 ¢, 258.92
> is −18 ¢, 264.47 is +19 ¢; 330.6 is E4 +5 ¢, 331.15 +8 ¢, 331.92 +12 ¢,
> 332.9 +17 ¢; C5 523.25 is C4 +1200 ¢. Medium = ±10 ¢; 2 beats at 96 bpm =
> 1250 ms, at 120 bpm = 1000 ms. The detector's hop is 512 frames at 48 kHz
> = 10.667 ms. **Smoothing (practice.tuner/REQ-002) is on:** a steady tone
> reads exactly (the first reading after silence or a new target is as
> detected); a step of less than 25 ¢ creeps a tenth of the way per reading,
> so a reading that must *leave* the band is fed for ~100 ms, not once.

## Phase 1 — Foundations

_Nothing user-visible. The lead domain module, the settings, the store._

### T001 · practice.session/REQ-016, practice.session/REQ-018, practice.session/REQ-020 · The lead settings, the tolerances, the hints, `verdictOf` with a band

**Status:** done

**Files**
- Create: `src/practice/domain/lead.ts`
- Modify: `src/practice/domain/settings.ts:3-20` (`SessionSettings` gains `lead`; `defaultSessionSettings` gains `defaultLeadSettings`), `src/practice/domain/tuner.ts:86-90` (`verdictOf` takes a band), `src/practice/published/index.ts:10-15` (exports)
- Test: `tests/practice/scenarios/lead-settings.test.ts`

**Interfaces**
- Consumes: `verdictOf(cents: number): Verdict` (tuner.ts, today), `SessionSettings` (settings.ts, today).
- Produces:
  ```ts
  // src/practice/domain/lead.ts
  export type Who = "tool" | "me";
  export type HoldBeats = 1 | 2 | 4;
  export type Tolerance = "lenient" | "medium" | "accurate";
  export const TOLERANCE_CENTS: Readonly<Record<Tolerance, number>> = { lenient: 15, medium: 10, accurate: 5 };
  export interface LeadSettings { readonly who: Who; readonly holdBeats: HoldBeats; readonly tolerance: Tolerance; readonly cueMeter: boolean; readonly cueTone: boolean; }
  export const defaultLeadSettings: LeadSettings = { who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false };
  export function requiredHoldMs(beats: HoldBeats, tempoBpm: number): number;        // beats * 60000 / tempoBpm
  export function holdHintOf(beats: HoldBeats, tempoBpm: number): string;             // `Beats in tune, then the next · ${s} s`, s = (beats * 60 / tempoBpm) to one decimal, half rounded up (1.25 → "1.3")
  export function toleranceHintOf(tolerance: Tolerance): string;                      // `Within ${TOLERANCE_CENTS[tolerance]}% of the way to the next note`
  export function cuesHintOf(cueMeter: boolean, cueTone: boolean): string;            // both: "Sharp/flat on the note · a tone per note"; meter: "Shows sharp or flat on the note"; tone: "A short tone as each note comes up"; neither: "Just the note highlight"
  export function whoHintOf(who: Who): string;                                         // "It plays, you follow" | "It listens, you play"
  // src/practice/domain/settings.ts
  export interface SessionSettings { readonly soundMode: SoundMode; readonly loop: boolean; readonly countIn: boolean; readonly restBar: boolean; readonly tempoBpm: number; readonly lead: LeadSettings; }
  // src/practice/domain/tuner.ts
  export function verdictOf(cents: number, bandCents: number = IN_TUNE_BAND_CENTS): Verdict;   // |cents| ≤ bandCents → "in-tune"; > 0 → "sharp"; < 0 → "flat"
  ```
  `published/index.ts` re-exports every name above from `lead.ts` and `verdictOf` from `tuner.ts`. Half-up rounding for the hint: `Math.round(seconds * 10 + Number.EPSILON) / 10` then `toFixed(1)`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-settings.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { cuesHintOf, defaultSessionSettings, holdHintOf, requiredHoldMs, toleranceHintOf, verdictOf, whoHintOf } from "../../../src/practice/published";

  test("practice.session/REQ-020/S4 — the Hold and In tune hints follow the settings", () => {
    expect(holdHintOf(1, 96)).toBe("Beats in tune, then the next · 0.6 s");
    expect(holdHintOf(2, 96)).toBe("Beats in tune, then the next · 1.3 s");
    expect(holdHintOf(4, 96)).toBe("Beats in tune, then the next · 2.5 s");
    expect(holdHintOf(2, 120)).toBe("Beats in tune, then the next · 1.0 s");
    expect(toleranceHintOf("lenient")).toBe("Within 15% of the way to the next note");
    expect(toleranceHintOf("medium")).toBe("Within 10% of the way to the next note");
    expect(toleranceHintOf("accurate")).toBe("Within 5% of the way to the next note");
    expect(whoHintOf("tool")).toBe("It plays, you follow");
    expect(whoHintOf("me")).toBe("It listens, you play");
  });
  test("practice.session/REQ-018/S5 — the Cues hint follows the pills", () => {
    expect(cuesHintOf(true, true)).toBe("Sharp/flat on the note · a tone per note");
    expect(cuesHintOf(true, false)).toBe("Shows sharp or flat on the note");
    expect(cuesHintOf(false, true)).toBe("A short tone as each note comes up");
    expect(cuesHintOf(false, false)).toBe("Just the note highlight");
  });
  test("practice.session/REQ-016/S5 — the tolerance decides the verdict", () => {
    expect([verdictOf(12, 15), verdictOf(12, 10), verdictOf(12, 5)]).toEqual(["in-tune", "sharp", "sharp"]);
    expect([verdictOf(8, 15), verdictOf(8, 10), verdictOf(8, 5)]).toEqual(["in-tune", "in-tune", "sharp"]);
    expect([verdictOf(4, 15), verdictOf(4, 10), verdictOf(4, 5)]).toEqual(["in-tune", "in-tune", "in-tune"]);
    expect(verdictOf(-18, 10)).toBe("flat");
    expect(verdictOf(4)).toBe("in-tune"); // the tuner's default band of 5 is unchanged
    expect(verdictOf(6)).toBe("sharp");
  });
  test("practice.session/REQ-016 — the required hold is beats × 60000 / tempo", () => {
    expect(requiredHoldMs(2, 96)).toBe(1250);
    expect(requiredHoldMs(2, 120)).toBe(1000);
    expect(requiredHoldMs(4, 96)).toBe(2500);
    expect(requiredHoldMs(1, 150)).toBe(400);
  });
  test("practice.session/REQ-011/S2 — the lead defaults", () => {
    expect(defaultSessionSettings.lead).toEqual({ who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false });
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-settings.test.ts` — expect FAIL: `Error: Failed to resolve import "…/lead"` / `holdHintOf is not a function`.
- [ ] 3. GREEN — write `lead.ts` with the types, constants and the five functions exactly as in Produces; add `lead: defaultLeadSettings` to `defaultSessionSettings` and the field to `SessionSettings`; give `verdictOf` its `bandCents` parameter with the default; re-export from `published/index.ts`.
- [ ] 4. Run `pnpm vitest run tests/practice/scenarios/lead-settings.test.ts` — expect PASS. Run `pnpm check` — green (every existing construction of a `SessionSettings` literal in `src/` and `tests/` now needs `lead`; add `lead: defaultLeadSettings` where a literal is spelled out — `grep -rn "tempoBpm:" src tests` lists them).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-settings.test.ts` → `Tests  5 passed (5)`; `pnpm check` → green.

### T002 · practice.session/REQ-016, practice.session/REQ-015 · The hold rule as a pure reducer

**Status:** done

**Files**
- Modify: `src/practice/domain/lead.ts` (append), `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/lead-reducer.test.ts`

**Interfaces**
- Consumes: `TOLERANCE_CENTS`, `requiredHoldMs(beats, tempoBpm)`, `LeadSettings` (T001); `NoteJudged` (`practice/published/note-judged.schema.ts`); `SequenceNote { note: Note; isRoot: boolean; runIndex: number }` (`theory/published`).
- Produces:
  ```ts
  export const LEAD_GAP_MS = 300;
  export const CUE_TONE_MS = 400;
  export const CUE_TAIL_MS = 100;
  export const HELD_TICK_MS = 400;
  export interface LeadTarget { readonly position: number; /* 1-based position in the sequence */ readonly note: Note; readonly runIndex: number; }
  export interface Hold { readonly heldMs: number; readonly lastInTuneAtMs: number | null; }
  export type LeadPhase =
    | { readonly kind: "idle" }
    | { readonly kind: "listening"; readonly target: LeadTarget; readonly hold: Hold; readonly mutedUntilMs: number | null }
    | { readonly kind: "complete" }
    | { readonly kind: "cannot-hear"; readonly reason: "refused" | "none" | "failed" };
  export const emptyHold: Hold = { heldMs: 0, lastInTuneAtMs: null };
  export function targetAt(sequence: readonly SequenceNote[], position: number): LeadTarget;   // position 1-based; throws RangeError outside 1..length (a bug, never an input)
  export function applyJudgement(
    phase: LeadPhase, judged: NoteJudged, atMs: number, settings: LeadSettings, tempoBpm: number,
    sequence: readonly SequenceNote[], loop: boolean,
  ): { readonly phase: LeadPhase; readonly advanced: boolean };
  // not "listening" → unchanged, advanced false. in-tune: heldMs += lastInTuneAtMs === null ? 0 : atMs − lastInTuneAtMs; lastInTuneAtMs = atMs.
  // sharp/flat: hold = emptyHold. Then if heldMs ≥ requiredHoldMs(settings.holdBeats, tempoBpm): advanced true and
  //   position < length → listening at targetAt(sequence, position + 1) with emptyHold, mutedUntilMs null;
  //   position === length → loop ? listening at targetAt(sequence, 1) with emptyHold : { kind: "complete" }.
  export function applySilence(phase: LeadPhase): LeadPhase;                 // listening → hold.lastInTuneAtMs = null, heldMs kept; else unchanged
  export function heldFractionOf(hold: Hold, requiredMs: number): number;   // min(1, heldMs / requiredMs); 0 when requiredMs ≤ 0
  ```
  A judgement whose `verdict` is `"in-tune"` is in tune — the caller (T006) computes the verdict at the tolerance; the reducer trusts it.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-reducer.test.ts` (a `judgedAt(cents, verdict)` helper builds a `NoteJudged` with `target` C4, `heard` filled from the same cents, `atFrame` 0; `seq` is `traversalOf` for the example run — `import { traversalOf, keyOf… }` as `tests/practice/fakes.ts` builds a context: use `sessionOn("C", "flute-concert", oneOctaveUpdown).session.snapshot().sequence` to obtain the 15-note sequence):
  ```ts
  import { expect, test } from "vitest";
  import type { LeadPhase, NoteJudged, SequenceNote } from "../../../src/practice/published";
  import { applyJudgement, applySilence, defaultLeadSettings, emptyHold, heldFractionOf, targetAt } from "../../../src/practice/published";
  import { sessionOn } from "../fakes";

  const oneOctaveUpdown = { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" } as const;
  const seq: readonly SequenceNote[] = sessionOn("C", "flute-concert", oneOctaveUpdown).session.snapshot().sequence;
  const me = { ...defaultLeadSettings, who: "me" as const };
  const listeningAt = (position: number): LeadPhase => ({ kind: "listening", target: targetAt(seq, position), hold: emptyHold, mutedUntilMs: null });
  function judged(cents: number, verdict: NoteJudged["verdict"]): NoteJudged {
    const target = targetAt(seq, 1).note;
    return { target, cents, verdict, heard: { hz: 262.5, nearest: target, cents }, atFrame: 0 };
  }
  const inTune = judged(6, "in-tune"), flat = judged(-18, "flat");
  function feedSteady(phase: LeadPhase, fromMs: number, toMs: number, stepMs = 10): { phase: LeadPhase; advancedAtMs: number | null } {
    let p = phase, advancedAtMs: number | null = null;
    for (let t = fromMs; t <= toMs && advancedAtMs === null; t += stepMs) {
      const r = applyJudgement(p, inTune, t, me, 96, seq, true);
      p = r.phase; if (r.advanced) advancedAtMs = t;
    }
    return { phase: p, advancedAtMs };
  }

  test("practice.session/REQ-016/S1 — held, then the next (reducer)", () => {
    const { phase, advancedAtMs } = feedSteady(listeningAt(1), 0, 2000);
    expect(advancedAtMs).toBe(1250);
    expect(phase).toMatchObject({ kind: "listening", target: { position: 2, note: { letter: "D", octave: 4 } }, hold: emptyHold });
  });
  test("practice.session/REQ-016/S2 — out of tune never accumulates", () => {
    let p = listeningAt(1);
    for (let t = 0; t <= 5000; t += 10) { const r = applyJudgement(p, flat, t, me, 96, seq, true); expect(r.advanced).toBe(false); p = r.phase; }
    expect(p).toMatchObject({ kind: "listening", target: { position: 1 }, hold: emptyHold });
  });
  test("practice.session/REQ-016/S3 — leaving the band resets", () => {
    const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
    expect(held900).toMatchObject({ hold: { heldMs: 900 } });
    const reset = applyJudgement(held900, judged(17, "sharp"), 910, me, 96, seq, true).phase;
    expect(reset).toMatchObject({ hold: emptyHold });
    expect(feedSteady(reset, 920, 4000).advancedAtMs).toBe(920 + 1250);
  });
  test("practice.session/REQ-016/S4 — silence pauses", () => {
    const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
    const paused = applySilence(held900);
    expect(paused).toMatchObject({ hold: { heldMs: 900, lastInTuneAtMs: null } });
    expect(feedSteady(paused, 2900, 5000).advancedAtMs).toBe(2900 + 350);
  });
  test("practice.session/REQ-016/S7 — the tempo changes the requirement, not the progress", () => {
    const { phase: held900 } = feedSteady(listeningAt(1), 0, 900);
    let p = held900, at: number | null = null;
    for (let t = 910; t <= 2000 && at === null; t += 10) { const r = applyJudgement(p, inTune, t, me, 120, seq, true); p = r.phase; if (r.advanced) at = t; }
    expect(at).toBe(1000);
    const r60 = applyJudgement(held900, inTune, 910, me, 60, seq, true);
    expect(r60.advanced).toBe(false);
    expect(r60.phase).toMatchObject({ hold: { heldMs: 910 } });
  });
  test("practice.session/REQ-015/S3 — the last note held, loop off → complete", () => {
    let p = listeningAt(15), advanced = false;
    for (let t = 0; t <= 2000 && !advanced; t += 10) { const r = applyJudgement(p, inTune, t, me, 96, seq, false); p = r.phase; advanced = r.advanced; }
    expect(p).toEqual({ kind: "complete" });
  });
  test("practice.session/REQ-015/S4 — the last note held, loop on → position 1 again", () => {
    let p = listeningAt(15), advanced = false;
    for (let t = 0; t <= 2000 && !advanced; t += 10) { const r = applyJudgement(p, inTune, t, me, 96, seq, true); p = r.phase; advanced = r.advanced; }
    expect(p).toMatchObject({ kind: "listening", target: { position: 1, note: { letter: "C", octave: 4 } }, hold: emptyHold });
  });
  test("practice.session/REQ-017/S3 — the held fraction", () => {
    expect(heldFractionOf({ heldMs: 750, lastInTuneAtMs: 750 }, 1250)).toBeCloseTo(0.6, 10);
    expect(heldFractionOf({ heldMs: 2000, lastInTuneAtMs: 2000 }, 1250)).toBe(1);
    expect(heldFractionOf(emptyHold, 1250)).toBe(0);
  });
  test("practice.session/REQ-016 — idle, complete and cannot-hear ignore judgements", () => {
    for (const phase of [{ kind: "idle" }, { kind: "complete" }, { kind: "cannot-hear", reason: "refused" }] as const) {
      expect(applyJudgement(phase, inTune, 5000, me, 96, seq, true)).toEqual({ phase, advanced: false });
    }
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-reducer.test.ts` — expect FAIL: `applyJudgement is not a function`.
- [ ] 3. GREEN — append the constants, types and the four functions to `lead.ts` as specified; export from `published/index.ts`.
- [ ] 4. Run `pnpm vitest run tests/practice/scenarios/lead-reducer.test.ts` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — the "advance or wrap or complete" branch is one `nextPhaseAfterHold(…)` helper so `applyJudgement` reads as the three rules of the spec.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-reducer.test.ts` → `Tests  9 passed (9)`.

### T003 · practice.session/REQ-016 · The target never advances early (invariant, exhaustive)

**Status:** todo

**Files**
- Test: `tests/practice/invariants/hold-never-early.test.ts`

**Interfaces**
- Consumes: `applyJudgement`, `applySilence`, `targetAt`, `emptyHold`, `TOLERANCE_CENTS`, `requiredHoldMs`, `LeadPhase`, `HoldBeats`, `Tolerance` (T001, T002).

**Steps**
- [ ] 1. RED — `tests/practice/invariants/hold-never-early.test.ts`: for every tolerance (`lenient | medium | accurate`) × every hold (`1 | 2 | 4`) × every tempo 40..200 step 2, run a deterministic family of 24 timelines built from a seeded linear congruential generator (`seed = 1664525 * seed + 1013904223 >>> 0`): each timeline is 600 events 10 ms apart, each event in-tune (|cents| ≤ the tolerance, the verdict `"in-tune"`), out of tune (the verdict `"sharp"` or `"flat"`) or silence (`applySilence`), with probabilities 0.7 / 0.1 / 0.2. Track the oracle alongside: `oracleHeld` accumulates `10` ms per consecutive in-tune event after the first, resets on out-of-tune, pauses on silence; assert on every event that `advanced === (verdict in tune && oracleHeld ≥ requiredHoldMs(hold, tempo))` and that after an advance the oracle resets. Assert at the end that the number of advances equals the oracle's count:
  ```ts
  import { expect, test } from "vitest";
  import { applyJudgement, applySilence, emptyHold, requiredHoldMs, targetAt, TOLERANCE_CENTS, defaultLeadSettings } from "../../../src/practice/published";
  import type { HoldBeats, LeadPhase, NoteJudged, Tolerance } from "../../../src/practice/published";
  import { sessionOn } from "../fakes";

  const seq = sessionOn("C", "flute-concert", { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" }).session.snapshot().sequence;
  const target = targetAt(seq, 1).note;
  const judged = (cents: number, verdict: NoteJudged["verdict"]): NoteJudged => ({ target, cents, verdict, heard: { hz: 262.5, nearest: target, cents }, atFrame: 0 });

  test("practice.session/REQ-016/S6 — the target advances only at ≥ beats × 60000 / tempo ms in tune, never otherwise", () => {
    let seed = 42;
    const next = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    let checked = 0;
    for (const tolerance of ["lenient", "medium", "accurate"] as Tolerance[]) for (const holdBeats of [1, 2, 4] as HoldBeats[]) for (let tempo = 40; tempo <= 200; tempo += 2) {
      const settings = { ...defaultLeadSettings, who: "me" as const, tolerance, holdBeats };
      const required = requiredHoldMs(holdBeats, tempo);
      for (let timeline = 0; timeline < 24; timeline += 1) {
        let phase: LeadPhase = { kind: "listening", target: targetAt(seq, 1), hold: emptyHold, mutedUntilMs: null };
        let oracleHeld = 0, oracleLast: number | null = null;
        for (let i = 0; i < 600; i += 1) {
          const t = i * 10, roll = next();
          if (roll < 0.2) { phase = applySilence(phase); oracleLast = null; continue; }
          const inTune = roll < 0.9;
          const cents = inTune ? Math.round((next() * 2 - 1) * TOLERANCE_CENTS[tolerance]) : TOLERANCE_CENTS[tolerance] + 1 + Math.round(next() * 40);
          const r = applyJudgement(phase, judged(cents, inTune ? "in-tune" : "sharp"), t, settings, tempo, seq, true);
          if (inTune) { oracleHeld += oracleLast === null ? 0 : t - oracleLast; oracleLast = t; } else { oracleHeld = 0; oracleLast = null; }
          const shouldAdvance = inTune && oracleHeld >= required;
          expect(r.advanced, `tol ${tolerance} hold ${holdBeats} tempo ${tempo} timeline ${timeline} event ${i}`).toBe(shouldAdvance);
          if (shouldAdvance) { oracleHeld = 0; oracleLast = null; }
          phase = r.phase; checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(1_000_000);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/invariants/hold-never-early.test.ts` — expect PASS on T002's reducer (this is an invariant test over existing behaviour; if it FAILS, the reducer is wrong — fix `lead.ts`, not the oracle). Record the run time; it must stay under 10 s (reduce the timelines per setting to 12 if not, and say so in the report).
- [ ] 3. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/invariants/hold-never-early.test.ts` → `Tests  1 passed (1)` in under 10 s.

### T004 [P] · practice.session/REQ-011 · Stored state v6 with the lead settings; the `lead.holdFill` token

**Status:** todo

**Files**
- Modify: `src/ui/selection-store.ts:10-60` (`StoredSelection`, `firstRunDefaults`), `src/ui/selection-store.ts:146-152` (v6 schema), `src/ui/selection-store.ts:170-260` (read: v6 | v5 → defaults; write v6), `src/ui/theme.ts` (append `lead`)
- Test: `tests/ui/scenarios/selection-store.test.ts` (extend)

**Interfaces**
- Consumes: `defaultLeadSettings`, `LeadSettings` (T001).
- Produces:
  ```ts
  // selection-store.ts
  export interface StoredSelection { readonly schemaVersion: 6; /* every v5 field unchanged */ readonly session: { readonly soundMode: SoundMode; readonly loop: boolean; readonly countIn: boolean; readonly restBar: boolean; readonly tempoBpm: number; readonly lead: LeadSettings } }
  // the v6 schema: storedSelectionV5Schema.extend({ schemaVersion: z.literal(6), session: <the v3 session object>.extend({ lead: storedLeadSchema }) })
  // storedLeadSchema = z.object({ who: z.enum(["tool","me"]).catch("tool"), holdBeats: z.union([z.literal(1), z.literal(2), z.literal(4)]).catch(2), tolerance: z.enum(["lenient","medium","accurate"]).catch("medium"), cueMeter: z.boolean().catch(true), cueTone: z.boolean().catch(false) }).catch(defaultLeadSettings)
  // read(): a v5 document parses as before and gets session.lead = defaultLeadSettings; write() always writes schemaVersion 6
  // theme.ts
  export const lead = { holdFill: "oklch(0.80 0.07 150)" } as const;   // the band fills with this (practice.session/REQ-017); the band, line and verdict colours are tuner.band / tuner.inTune / tuner.flat / tuner.sharp (docs/design.md §8: one value per role)
  ```

**Steps**
- [ ] 1. RED — append to `tests/ui/scenarios/selection-store.test.ts` (follow the file's existing v4→v5 pattern for building a stored document and reading it back through `localStorageSelectionStore(localStorage)`):
  ```ts
  test("practice.session/REQ-011/S5 — stored state from 007 (v5, no lead settings) restores with the lead defaults", () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v5Document, schemaVersion: 5 }));   // v5Document: the file's existing v5 fixture (variant flute-concert, key G major, ↓ 2 oct arpeggio, metronome, loop off, count-in off, rest bar on, 132 bpm, Dorian, drone octave 5 warm)
    const read = localStorageSelectionStore(localStorage).read();
    expect(read?.session.tempoBpm).toBe(132);
    expect(read?.session.lead).toEqual({ who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false });
  });
  test("practice.session/REQ-011/S1 (store) — the lead settings round-trip at v6", () => {
    localStorage.clear();
    const store = localStorageSelectionStore(localStorage);
    store.write({ ...v6Document, session: { ...v6Document.session, lead: { who: "me", holdBeats: 4, tolerance: "accurate", cueMeter: false, cueTone: true } } });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).schemaVersion).toBe(6);
    expect(store.read()?.session.lead).toEqual({ who: "me", holdBeats: 4, tolerance: "accurate", cueMeter: false, cueTone: true });
  });
  test("practice.session/REQ-011/S2 (store) — first-run defaults carry the lead defaults", () => {
    expect(firstRunDefaults.session.lead).toEqual({ who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false });
    expect(firstRunDefaults.schemaVersion).toBe(6);
  });
  test("practice.session/REQ-011 — a bad lead field falls back on its own, the rest restores", () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v6Document, session: { ...v6Document.session, lead: { who: "them", holdBeats: 3, tolerance: "medium", cueMeter: true, cueTone: false } } }));
    expect(localStorageSelectionStore(localStorage).read()?.session.lead).toEqual({ who: "tool", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false });
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` — expect FAIL: the v5 read has no `lead`; `firstRunDefaults.schemaVersion` is 5.
- [ ] 3. GREEN — the v6 schema, the read branch (`z.union([v6, v5, v4, v3, v2, v1])` as today with the v5→v6 mapping adding `lead: defaultLeadSettings`), `firstRunDefaults` at 6, `write` at 6; `theme.ts` gains `lead`.
- [ ] 4. Run `pnpm vitest run tests/ui/scenarios/selection-store.test.ts tests/ui/scenarios/selection-persistence.test.ts` — expect PASS (the persistence tests' v5 fixtures still read). `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-store.test.ts` → all passed, including the four new names.

## Phase 2 — The lead run in the Session aggregate

_Ends with a lead run that starts, judges, holds, advances, completes and stops — through `practice/published`, no UI._

### T005 · practice.session/REQ-014, practice.session/REQ-015 · `start()` / `stop()` dispatch on the mode; the first target; the idle caption

**Status:** todo

**Files**
- Create: `tests/practice/lead-helpers.ts`
- Modify: `src/practice/domain/session.ts` (`SessionSnapshot` gains `lead`, loses `progress`; `start()`/`stop()`; `setSettings`; the `listeningOwner`), `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/lead-mode.test.ts`, `tests/practice/scenarios/lead-run.test.ts`

**Interfaces**
- Consumes: `LeadPhase`, `LeadTarget`, `targetAt`, `emptyHold`, `heldFractionOf`, `requiredHoldMs`, `LeadSettings`, `Who` (T001, T002); the tuner's `startListening(generation)`, `tunerListeningState`, `wakeLock`, `releaseWakeLockIfIdle` (session.ts, today); `ListeningState` (tuner.ts).
- Produces:
  ```ts
  // session.ts
  export interface LeadSnapshot {
    readonly who: Who;
    readonly phase: LeadPhase["kind"];
    readonly listening: ListeningState;
    readonly target: LeadTarget | null;          // listening only
    readonly heldFraction: number;               // heldFractionOf(hold, requiredHoldMs(settings.lead.holdBeats, settings.tempoBpm)); 0 unless listening
    readonly reading: NoteJudged | null;         // T006 fills it; null here
    readonly justHeld: Note | null;              // T011 fills it; null here
    readonly idleCaption: string;                // who === "me": `hold ${holdBeats} ${holdBeats === 1 ? "beat" : "beats"} · ${tolerance} tuning`; who === "tool": the sequence caption of REQ-002
    readonly completeCaption: string | null;     // phase complete: `${N} of ${N} held · ${lowest}–${highest}` (extremesOf, as captionOf uses)
  }
  SessionSnapshot: + readonly lead: LeadSnapshot;  − progress
  // Session (verbs unchanged in name):
  start(): void   // settings.lead.who === "tool": as today. "me": if the sequence is empty or lead.phase is listening/starting → no-op; else stopDrone() if sounding, wakeLock.acquire(), listeningOwner = "lead", listening.start() via the tuner's startListening path → ok: phase listening at targetAt(sequence, 1), emit TargetAdvanced { note, position: 1, length, atFrame: listening.currentFrame() }; error → phase cannot-hear(reason) (T009 tests it)
  stop(): void    // a lead run in progress (phase listening, or a start awaiting listening) → listening.stop(), listeningOwner "none", phase idle, hold forgotten, wake lock released if nothing else holds it; otherwise as today
  setSettings(s)  // s.lead.who !== current who while a run (playback or lead) is in progress → stop() first; then store s; the idle caption follows at once
  ```
  Internal: `let listeningOwner: "none" | "tuner" | "lead"`; `tunerActive` stays as it is (the tuner's own flag); every tuner-only check (`!tunerActive || …`) is unchanged; the lead branches test `listeningOwner === "lead"`. `tests/practice/lead-helpers.ts`:
  ```ts
  import type { Session, SessionSettings } from "../../src/practice/published";
  import { defaultSessionSettings } from "../../src/practice/published";
  import type { Traversal } from "../../src/theory/published";
  import type { SessionFixture } from "./fakes";
  import { sessionOn } from "./fakes";
  export const oneOctaveUpdown: Traversal = { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" };
  export const SAMPLE_RATE = 48000;
  export const HOP_MS = 512_000 / SAMPLE_RATE;                                  // 10.667 ms — the detector's hop
  export const frameOfMs = (ms: number): number => Math.round((ms * SAMPLE_RATE) / 1000);
  export function leadSettings(overrides: Partial<SessionSettings["lead"]> = {}, base: SessionSettings = defaultSessionSettings): SessionSettings {
    return { ...base, lead: { ...base.lead, who: "me", ...overrides } };
  }
  /** C major on flute Concert, ↑↓ 1 oct — 15 notes · C4–C5 — in I lead. */
  export function leadFixture(settings: SessionSettings = leadSettings()): SessionFixture { return sessionOn("C", "flute-concert", oneOctaveUpdown, settings); }
  const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
  /** start() with who = "me", driven past wakeLock.acquire() and listening.start(). */
  export async function startLead(session: Session): Promise<void> { session.start(); await flush(); await flush(); }
  /** One detection at `atMs` on the listening clock (age 0), committed. */
  export function hearAt(f: SessionFixture, hz: number, atMs: number): void {
    f.listening.frame = frameOfMs(atMs);
    f.listening.feed(hz, f.listening.frame);
    f.clock.advanceMs(1);
  }
  /** A steady tone from `fromMs` to `toMs`, one reading per hop. Returns the ms of the last reading. */
  export function hearSteady(f: SessionFixture, hz: number, fromMs: number, toMs: number): number {
    let t = fromMs;
    for (; t <= toMs; t += HOP_MS) hearAt(f, hz, t);
    return t - HOP_MS;
  }
  /** Silence: lets the 300 ms gap timer fire. */
  export function letGapPass(f: SessionFixture): void { f.clock.advanceMs(300); }
  /**
   * Holds `targets` targets in turn from `fromMs` — each the target's own pitch
   * for 1300 ms (enough for 2 beats at 96 bpm, 1250 ms) then 300 ms of silence
   * (the gap) — and returns the ms at which the next tone may start.
   */
  export function holdThrough(f: SessionFixture, targets: number, fromMs = 0): number {
    let t = fromMs;
    for (let n = 0; n < targets; n += 1) {
      const target = f.session.snapshot().lead.target;
      if (target === null) throw new Error("holdThrough: no target");
      hearSteady(f, pitchHzOf(target.note), t, t + 1300);
      letGapPass(f);
      t += 1700;
    }
    return t;
  }
  ```
  (`pitchHzOf` from `../../src/theory/published`.)

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-mode.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { defaultSessionSettings } from "../../../src/practice/published";
  import { leadFixture, leadSettings, startLead } from "../lead-helpers";
  import { sessionOn } from "../fakes";

  test("practice.session/REQ-014/S1 — choosing I lead", () => {
    const f = sessionOn("C", "flute-concert", { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" });
    f.session.setSettings(leadSettings());
    const s = f.session.snapshot();
    expect(s.lead.who).toBe("me");
    expect(s.lead.phase).toBe("idle");
    expect(s.lead.idleCaption).toBe("hold 2 beats · medium tuning");
    expect(f.listening.startCalls).toBe(0);
    expect(f.sound.posted).toEqual([]);
  });
  test("practice.session/REQ-014/S2 — and back", () => {
    const f = leadFixture();
    f.session.setSettings(defaultSessionSettings);
    expect(f.session.snapshot().lead.who).toBe("tool");
    expect(f.session.snapshot().lead.idleCaption).toBe("15 notes · C4–C5");
    expect(f.session.snapshot().caption).toBe("15 notes · C4–C5");
  });
  test("practice.session/REQ-014/S3 — the words stop a run", async () => {
    const f = sessionOn("C", "flute-concert", { direction: "updown", octaves: { kind: "count", count: 1 }, shape: "scale" }, { ...defaultSessionSettings, countIn: false });
    f.session.start(); await Promise.resolve(); await Promise.resolve();
    f.clock.advanceMs(5000);
    expect(f.session.snapshot().transport.kind).toBe("playing");
    f.session.setSettings(leadSettings({}, { ...defaultSessionSettings, countIn: false }));
    expect(f.session.snapshot().transport.kind).toBe("idle");
    expect(f.sound.posted.some((c) => c.kind === "stop-all")).toBe(true);
    expect(f.listening.startCalls).toBe(0);
    const g = leadFixture();
    await startLead(g.session);
    expect(g.session.snapshot().lead.phase).toBe("listening");
    g.session.setSettings(defaultSessionSettings);
    expect(g.listening.stopCalls).toBe(1);
    expect(g.session.snapshot().lead.phase).toBe("idle");
    expect(g.session.snapshot().lead.who).toBe("tool");
  });
  test("practice.session/REQ-014/S4 — one beat, singular", () => {
    const f = leadFixture(leadSettings({ holdBeats: 1, tolerance: "accurate" }));
    expect(f.session.snapshot().lead.idleCaption).toBe("hold 1 beat · accurate tuning");
  });
  ```
  (`stop-all` is the kind `FakeSound` records for `stop()`'s silence — confirm against `tests/practice/scenarios/session-transport.test.ts`'s REQ-002/S2 assertion and use the same predicate.) And `tests/practice/scenarios/lead-run.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { TargetAdvanced } from "../../../src/practice/published";
  import { leadFixture, startLead } from "../lead-helpers";
  import { sessionOn } from "../fakes";

  test("practice.session/REQ-015/S1 — the run starts on the first note", async () => {
    const f = leadFixture();
    const advanced: TargetAdvanced[] = [];
    f.session.onTargetAdvanced((e) => advanced.push(e));
    expect(f.listening.startCalls).toBe(0);
    await startLead(f.session);
    expect(f.listening.startCalls).toBe(1);
    const s = f.session.snapshot();
    expect(s.lead.phase).toBe("listening");
    expect(s.lead.target).toMatchObject({ position: 1, note: { letter: "C", accidental: "natural", octave: 4 }, runIndex: 0 });
    expect(s.lead.reading).toBeNull();
    expect(s.lead.heldFraction).toBe(0);
    expect(advanced).toHaveLength(1);
    expect(advanced[0]).toMatchObject({ note: { letter: "C", octave: 4 }, position: 1, length: 15 });
    expect(f.sound.posted.filter((c) => c.kind === "tone" || c.kind === "click" || c.kind === "drone")).toEqual([]);
    expect(f.wake.acquired).toBe(true);
  });
  test("practice.session/REQ-015/S2 — stop", async () => {
    const f = leadFixture();
    await startLead(f.session);
    f.session.stop();
    expect(f.listening.stopCalls).toBe(1);
    expect(f.session.snapshot().lead.phase).toBe("idle");
    expect(f.session.snapshot().lead.target).toBeNull();
    expect(f.session.snapshot().lead.idleCaption).toBe("hold 2 beats · medium tuning");
    expect(f.wake.acquired).toBe(false);
    await startLead(f.session);
    expect(f.session.snapshot().lead.target?.position).toBe(1);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
  });
  test("practice.session/REQ-015/S8 — no notes, no run", async () => {
    const f = sessionOn("F♯", "ocarina-alto-c", { direction: "up", octaves: { kind: "count", count: 4 }, shape: "scale" }, leadSettings());
    // (an F♯ major run that leaves Alto C's A4–F6 at every whole-octave count falls back to full range — pick the key the summary reports as
    //  "no notes of this key in range"; practice.session/REQ-001/S3's neighbours: use the fixture whose snapshot().run is empty, asserting that first)
    expect(f.session.snapshot().run).toHaveLength(0);
    await startLead(f.session);
    expect(f.listening.startCalls).toBe(0);
    expect(f.session.snapshot().lead.phase).toBe("idle");
  });
  ```
  For S8, find the key/variant pair whose `run` is empty with a one-off loop in the test file over `builtInCatalogue()` and the twelve majors (the existing `rangeSummaryOf` scenario in `summary-line.test.ts` names one); fix the test to that pair and delete the loop.
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-mode.test.ts tests/practice/scenarios/lead-run.test.ts` — expect FAIL: `snapshot().lead` is undefined.
- [ ] 3. GREEN — `listeningOwner`; the `lead` snapshot block (built in the same place `tuner` is, from `leadPhase`, `currentSettings.lead`, the sequence and `extremesOf`); `start()`'s dispatch (the "me" branch mirrors `enterTuner()`'s shape: generation bump, `stopDrone()`, `await wakeLock.acquire()`, `await listening.start()`, then the phase and the event, superseded if the generation moved); `stop()`'s lead branch; `setSettings`'s `who` diff; remove `progress` from the snapshot and from `snapshotsMateriallyEqual` (and from `tests/practice/scenarios/session-transport.test.ts` / `tests/ui/scenarios/transport-card.test.tsx` where asserted — delete those assertions, citing REQ-002's change in the commit).
- [ ] 4. Run the two files — expect PASS. `pnpm vitest run tests/practice tests/ui` — green: the unchanged scenarios keep their existing tests and must still pass untouched except for the `progress` assertions and the `lead` field in settings literals — practice.session/REQ-002/S3, REQ-002/S4, REQ-009/S1, REQ-011/S3, REQ-011/S4, REQ-013/S1, REQ-013/S2, REQ-013/S3, REQ-013/S4, REQ-013/S6, and REQ-014/S5 (play along is as it was: `session-transport.test.ts`'s REQ-002, REQ-003, REQ-005 and REQ-006 scenarios all pass with `who: "tool"`). `pnpm check` — green.
- [ ] 5. REFACTOR — `enterTuner()` and the "me" branch of `start()` share one `requestListening(owner, onStarted)` helper; say so in the report.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-mode.test.ts tests/practice/scenarios/lead-run.test.ts` → `Tests  7 passed (7)`; `pnpm check` → green.

### T006 · practice.session/REQ-016, practice.session/REQ-017, practice.session/REQ-021 · The lead branch of `onPitchDetected`: age, smoothing, judgement at the tolerance, the hold, the advance, the gap

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts:796-893` (the lead branch beside the tuner's; the lead gap timer), `src/practice/published/index.ts`
- Test: `tests/practice/scenarios/lead-hold.test.ts`, `tests/practice/scenarios/lead-meter.test.ts`, `tests/practice/scenarios/lead-budget.test.ts`

**Interfaces**
- Consumes: `applyJudgement`, `applySilence`, `heldFractionOf`, `requiredHoldMs`, `TOLERANCE_CENTS`, `LEAD_GAP_MS` (T002); `smoothedPitchHzOf`, `judge`, `verdictOf(cents, band)`, `READING_MAX_AGE_MS` (tuner.ts); `hearAt`, `hearSteady`, `letGapPass`, `startLead`, `leadFixture`, `HOP_MS`, `frameOfMs` (T005).
- Produces: the lead branch, precisely —
  ```
  onPitchDetected(pitch): if listeningOwner === "lead" and leadPhase.kind === "listening" and leadListeningState.kind === "listening":
    ageMs = (listening.currentFrame() − pitch.atFrame) / listening.sampleRate() × 1000; if ageMs > READING_MAX_AGE_MS → return (dropped)
    if leadPhase.mutedUntilMs !== null and atMs < mutedUntilMs → leadSmoothing = initialSmoothingState; return   (T011 sets mutedUntilMs; null until then)
    atMs = pitch.atFrame / listening.sampleRate() × 1000
    pinned = { kind: "pinned", position: pitchPosition(leadPhase.target.note) }
    { hz, state } = smoothedPitchHzOf(leadSmoothing, pinned, null, pitch.hz); leadSmoothing = state
    { judged } = judge({ ...pitch, hz }, pinned, null, currentContext.spelling)
    reading = { ...judged, heard: { ...judged.heard, hz: pitch.hz }, verdict: verdictOf(judged.cents, TOLERANCE_CENTS[currentSettings.lead.tolerance]) }
    { phase, advanced } = applyJudgement(leadPhase, reading, atMs, currentSettings.lead, currentSettings.tempoBpm, sequence, currentSettings.loop); leadPhase = phase
    if advanced: leadSmoothing = initialSmoothingState; emit TargetAdvanced for the new target (position, note, length, atFrame: pitch.atFrame) when still listening; if phase is complete → listening.stop(), listeningOwner "none", wake lock released if idle
    leadPendingReading = reading; schedule the commit (clock.setTimeout(commitLeadReading, 0) if none pending); arm the lead gap timer (LEAD_GAP_MS) → on fire: leadReading = null, leadPhase = applySilence(leadPhase), notify
  commitLeadReading(): leadReading = pending; emit NoteJudged; notify
  snapshot.lead.reading = leadReading; snapshot.lead.heldFraction from leadPhase.hold
  ```
  `NoteJudged.cents` is unclamped (C5 against C4 → +1200); the smoothing's `shown` argument is `null` because a pinned target ignores it.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-hold.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { NoteJudged, TargetAdvanced } from "../../../src/practice/published";
  import { hearAt, hearSteady, holdThrough, HOP_MS, leadFixture, leadSettings, letGapPass, startLead } from "../lead-helpers";

  async function running(settings = leadSettings()) {
    const f = leadFixture(settings);
    const judged: NoteJudged[] = [], advanced: TargetAdvanced[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    f.session.onTargetAdvanced((e) => advanced.push(e));
    await startLead(f.session);
    return { f, judged, advanced };
  }
  test("practice.session/REQ-016/S1 — held, then the next", async () => {
    const { f, judged, advanced } = await running();
    hearSteady(f, 262.5, 0, 1400);
    expect(judged.every((j) => j.verdict === "in-tune" && j.cents === 6 && j.target.letter === "C")).toBe(true);
    expect(advanced).toHaveLength(2);
    expect(advanced[1]).toMatchObject({ note: { letter: "D", octave: 4 }, position: 2, length: 15 });
    const advanceMs = (advanced[1]!.atFrame / 48000) * 1000;
    expect(advanceMs).toBeGreaterThanOrEqual(1250);
    expect(advanceMs).toBeLessThan(1250 + HOP_MS);
    expect(f.session.snapshot().lead.target?.position).toBe(2);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
  });
  test("practice.session/REQ-016/S2 — out of tune", async () => {
    const { f, judged, advanced } = await running();
    hearSteady(f, 258.92, 0, 3000);
    expect(judged.every((j) => j.verdict === "flat" && j.cents === -18)).toBe(true);
    expect(advanced).toHaveLength(1);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    hearAt(f, 264.47, 3100);
    expect(judged.at(-1)).toMatchObject({ cents: 19, verdict: "sharp" });
  });
  test("practice.session/REQ-016/S3 — leaving the band resets", async () => {
    const { f, judged, advanced } = await running();
    const t0 = holdThrough(f, 2);                                // C4, D4 held → the target is E4
    expect(f.session.snapshot().lead.target?.note).toMatchObject({ letter: "E", octave: 4 });
    hearSteady(f, 330.6, t0, t0 + 900);                          // +5 ¢
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 1250, 2);
    const lastSharp = hearSteady(f, 332.9, t0 + 910, t0 + 1010); // +17 ¢ for 100 ms: smoothed, the offset leaves ±10 after the sixth reading
    const firstSharpIndex = judged.findIndex((j) => j.target.letter === "E" && j.verdict === "sharp");
    expect(firstSharpIndex).toBeGreaterThan(0);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    hearSteady(f, 330.6, lastSharp + HOP_MS, t0 + 4000);
    const firstInTuneAfter = judged.find((j, i) => i > firstSharpIndex && j.verdict === "in-tune")!;
    expect(advanced).toHaveLength(4);                            // C4@1, D4@2, E4@3, F4@4
    const expectedMs = (firstInTuneAfter.atFrame / 48000) * 1000 + 1250;
    const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
    expect(advanceMs).toBeGreaterThanOrEqual(expectedMs);
    expect(advanceMs).toBeLessThan(expectedMs + HOP_MS);
  });
  test("practice.session/REQ-016/S4 — silence pauses", async () => {
    const { f, judged, advanced } = await running();
    const t0 = holdThrough(f, 2);                                // the target is E4
    hearSteady(f, 330.6, t0, t0 + 900);
    const before = judged.length;
    letGapPass(f); f.clock.advanceMs(1700);
    expect(judged).toHaveLength(before);
    expect(f.session.snapshot().lead.reading).toBeNull();
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 1250, 2);
    hearSteady(f, 330.6, t0 + 2900, t0 + 3400);
    const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
    expect(advanceMs).toBeGreaterThanOrEqual(t0 + 2900 + 350);
    expect(advanceMs).toBeLessThan(t0 + 2900 + 350 + HOP_MS);
  });
  test("practice.session/REQ-016/S5 — the tolerance decides the verdict (session)", async () => {
    for (const [tolerance, expected] of [["lenient", "in-tune"], ["medium", "sharp"], ["accurate", "sharp"]] as const) {
      const { f, judged } = await running(leadSettings({ tolerance }));
      const t0 = holdThrough(f, 2);                              // the target is E4
      hearAt(f, 331.92, t0);                                     // +12 ¢
      expect(judged.at(-1)).toMatchObject({ target: { letter: "E" }, cents: 12, verdict: expected });
    }
  });
  test("practice.session/REQ-016/S7 — the tempo changes the requirement, not the progress", async () => {
    const { f, advanced } = await running();
    const t0 = holdThrough(f, 2);                                // the target is E4
    hearSteady(f, 330.6, t0, t0 + 900);
    f.session.setSettings({ ...leadSettings(), tempoBpm: 120 });
    hearSteady(f, 330.6, t0 + 910, t0 + 1200);
    const advanceMs = (advanced[3]!.atFrame / 48000) * 1000;
    expect(advanceMs).toBeGreaterThanOrEqual(t0 + 1000);
    expect(advanceMs).toBeLessThan(t0 + 1000 + HOP_MS);
    const g = await running();
    const u0 = holdThrough(g.f, 2);
    hearSteady(g.f, 330.6, u0, u0 + 900);
    g.f.session.setSettings({ ...leadSettings(), tempoBpm: 60 });
    expect(g.f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 2000, 2);
  });
  test("practice.session/REQ-016/S8 — far away, an octave included", async () => {
    const { f, judged, advanced } = await running();
    hearSteady(f, 523.25, 0, 2000);
    expect(judged[0]).toMatchObject({ target: { letter: "C", octave: 4 }, cents: 1200, verdict: "sharp" });
    expect(advanced).toHaveLength(1);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
  });
  test("practice.session/REQ-016/S9 — a new target starts clean", async () => {
    const { f, judged } = await running();
    hearSteady(f, 262.5, 0, 1300);
    expect(f.session.snapshot().lead.target?.position).toBe(2);
    const firstOnD = judged.find((j) => j.target.letter === "D")!;
    expect(firstOnD.cents).toBe(-194);                          // as detected, not smoothed from C4's +6
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
  });
  ```
  `tests/practice/scenarios/lead-meter.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import { hearAt, hearSteady, leadFixture, letGapPass, startLead } from "../lead-helpers";

  test("practice.session/REQ-017/S7 — silence clears the line, keeps the fill", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 900);
    expect(f.session.snapshot().lead.reading).not.toBeNull();
    letGapPass(f);
    expect(f.session.snapshot().lead.reading).toBeNull();
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(0.72, 2);
    hearAt(f, 262.5, 1500);
    expect(f.session.snapshot().lead.reading).toMatchObject({ cents: 6, verdict: "in-tune" });
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(0.72, 2);
  });
  test("practice.session/REQ-017/S1 — silent: no reading, the target highlighted", async () => {
    const f = leadFixture();
    await startLead(f.session);
    expect(f.session.snapshot().lead.reading).toBeNull();
    expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
    expect(f.session.snapshot().soundingPosition).toBeNull();
  });
  ```
  `tests/practice/scenarios/lead-budget.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { NoteJudged } from "../../../src/practice/published";
  import { leadFixture, startLead } from "../lead-helpers";

  test("practice.session/REQ-021/S2 — late is dropped", async () => {
    const f = leadFixture();
    await startLead(f.session);
    const judged: NoteJudged[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    f.listening.frame = 48000;
    f.listening.feed(262.5, 48000 - 4801); f.clock.advanceMs(1);   // 100.02 ms old → dropped
    expect(judged).toEqual([]);
    expect(f.session.snapshot().lead.reading).toBeNull();
    f.listening.feed(262.5, 48000 - 4800); f.clock.advanceMs(1);   // exactly 100 ms → judged
    expect(judged).toHaveLength(1);
  });
  test("practice.session/REQ-021/S2 — a burst coalesces for the display but every reading counts for the hold", async () => {
    const f = leadFixture();
    await startLead(f.session);
    const judged: NoteJudged[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    f.listening.frame = 0;
    f.listening.feed(262.5, 0); f.listening.feed(262.5, 512); f.listening.feed(262.5, 1024);
    f.clock.advanceMs(1);
    expect(judged).toHaveLength(1);
    expect(judged[0]!.atFrame).toBe(1024);
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo((1024 / 48) / 1250, 3);   // 21.3 ms of 1250 — both gaps counted
    f.listening.frame = 1536;
    f.listening.feed(262.5, 1536); f.listening.feed(285.0, 2048); f.listening.feed(262.5, 2560);   // the middle one is 150 ¢ sharp → a jump, as detected
    f.clock.advanceMs(1);
    expect(judged).toHaveLength(2);
    expect(judged[1]!.atFrame).toBe(2560);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);     // the coalesced-away sharp reading still reset the hold
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-hold.test.ts tests/practice/scenarios/lead-meter.test.ts tests/practice/scenarios/lead-budget.test.ts` — expect FAIL: no `NoteJudged` emitted, `advanced` has length 1.
- [ ] 3. GREEN — the lead branch exactly as Produces; `leadSmoothing`, `leadPendingReading`, `leadReading`, the commit and gap timers (their own cancel handles, cancelled by `stop()`, the hidden branch and `onEnded`); the snapshot's `reading` and `heldFraction`.
- [ ] 4. Run the three files — expect PASS. `pnpm vitest run tests/practice` — green (the tuner's scenarios untouched). `pnpm check` — green.
- [ ] 5. REFACTOR — the age check is one `isTooOld(pitch)` shared by the tuner and lead branches; the commit-and-gap pair for the lead reading mirrors the tuner's — extract `readingPipeline(onCommit, onGap)` only if the two bodies are identical after the change; otherwise leave two and say why in the report.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-hold.test.ts tests/practice/scenarios/lead-meter.test.ts tests/practice/scenarios/lead-budget.test.ts` → `Tests  12 passed (12)`.

### T007 · practice.session/REQ-015 · Complete, loop, and the target-in-sequence invariant for a lead run

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (complete → listening ended; the `completeCaption`; a key/traversal change clears a complete card)
- Test: `tests/practice/scenarios/lead-run.test.ts` (extend), `tests/practice/invariants/target-in-sequence.test.ts` (extend)

**Interfaces**
- Consumes: T005's `start()`/`stop()`, T006's branch; `hearSteady`, `letGapPass`.
- Produces: on `complete`: `listening.stop()`, `listeningOwner = "none"`, the wake lock released if nothing else holds it, `snapshot.lead.completeCaption = "15 of 15 held · C4–C5"`, `snapshot.lead.target = null`, every run note drawn as past (the UI's concern; the snapshot exposes `phase: "complete"`); `start()` from `complete` begins a new run at position 1; `setContext`/`setTraversal`/`setScaleChoice` from `complete` → `idle`.

**Steps**
- [ ] 1. RED — append to `lead-run.test.ts` (`holdThrough` from `tests/practice/lead-helpers.ts`):
  ```ts
  test("practice.session/REQ-015/S3 — the last note held, loop off", async () => {
    const f = leadFixture({ ...leadSettings(), loop: false });
    const advanced: TargetAdvanced[] = [];
    f.session.onTargetAdvanced((e) => advanced.push(e));
    await startLead(f.session);
    holdThrough(f, 15);
    const s = f.session.snapshot();
    expect(s.lead.phase).toBe("complete");
    expect(s.lead.completeCaption).toBe("15 of 15 held · C4–C5");
    expect(s.lead.target).toBeNull();
    expect(f.listening.stopCalls).toBe(1);
    expect(f.wake.acquired).toBe(false);
    expect(advanced).toHaveLength(15);
    await startLead(f.session);
    expect(f.session.snapshot().lead.target?.position).toBe(1);
    expect(f.listening.startCalls).toBe(2);
  });
  test("practice.session/REQ-015/S4 — the last note held, loop on", async () => {
    const f = leadFixture();
    const advanced: TargetAdvanced[] = [];
    f.session.onTargetAdvanced((e) => advanced.push(e));
    await startLead(f.session);
    holdThrough(f, 15);
    expect(f.session.snapshot().lead.phase).toBe("listening");
    expect(f.session.snapshot().lead.target).toMatchObject({ position: 1, note: { letter: "C", octave: 4 } });
    expect(advanced).toHaveLength(16);
    expect(advanced[15]).toMatchObject({ position: 1, note: { letter: "C", octave: 4 } });
    expect(f.listening.stopCalls).toBe(0);
    expect(f.session.snapshot().lead.completeCaption).toBeNull();
  });
  ```
  And in `tests/practice/invariants/target-in-sequence.test.ts`, a second enumeration named `practice.session/REQ-015 — every TargetAdvanced of a lead run is a member of the sequence at its position (loop wrap included)`: for every catalogued variant × the twelve majors × the three directions × 1 oct and full: start a lead run with loop on, hold through `length + 1` targets, and assert for every event `sequence[position − 1].note` equals the event's note and `position ∈ 1..length`.
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-run.test.ts tests/practice/invariants/target-in-sequence.test.ts` — expect FAIL: `completeCaption` undefined / listening not stopped on complete.
- [ ] 3. GREEN — as Produces.
- [ ] 4. Run both — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-run.test.ts tests/practice/invariants/target-in-sequence.test.ts` → all passed.

### T008 · practice.session/REQ-015, practice.session/REQ-013 · The exclusions: the drone both ways, the Tuner pill, tapped notes; never-both widened

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (`startDrone()`, `enterTuner()`, `tapNote()` while leading)
- Test: `tests/practice/scenarios/lead-run.test.ts` (extend), `tests/practice/scenarios/session-tap.test.ts` (extend), `tests/practice/invariants/never-both.test.ts` (extend)

**Interfaces**
- Consumes: T005–T007; `startDroneAndFlush`, `isDrone`, `isTone`, `isStop` (fakes.ts); `enter` (tuner-helpers.ts).
- Produces: `startDrone()` while a lead run is in progress → `stop()` first (listening ended, phase idle), then the drone as today; `start()` in I lead while the drone sounds → the drone stopped (its `stop` command posted) before `listening.start()`; `enterTuner()` while leading → `stop()` first, then the tuner as today; `tapNote()` while leading → no-op (no tone posted, `tappedRunIndex` null); `tapNote()` in I lead idle → as today.

**Steps**
- [ ] 1. RED — append to `lead-run.test.ts`:
  ```ts
  test("practice.session/REQ-015/S5 — the drone goes first", async () => {
    const f = leadFixture();
    await startDroneAndFlush(f.session);
    expect(f.session.snapshot().drone.on).toBe(true);
    await startLead(f.session);
    const droneStopIndex = f.sound.posts.findIndex((p) => isStop(p.command) && p.command.tag >= 3_000_000);
    expect(droneStopIndex).toBeGreaterThanOrEqual(0);
    expect(f.session.snapshot().drone.on).toBe(false);
    expect(f.session.snapshot().lead.phase).toBe("listening");
    const g = leadFixture();
    await startLead(g.session);
    await startDroneAndFlush(g.session);
    expect(g.listening.stopCalls).toBe(1);
    expect(g.session.snapshot().lead.phase).toBe("idle");
    expect(g.session.snapshot().drone.on).toBe(true);
  });
  test("practice.session/REQ-015/S7 — the Tuner pill ends the run", async () => {
    const f = leadFixture();
    await startLead(f.session);
    await enter(f.session);
    expect(f.listening.stopCalls).toBe(1);
    expect(f.listening.startCalls).toBe(2);
    expect(f.session.snapshot().lead.phase).toBe("idle");
    expect(f.session.snapshot().tuner.active).toBe(true);
    f.session.leaveTuner();
    expect(f.session.snapshot().lead.idleCaption).toBe("hold 2 beats · medium tuning");
  });
  ```
  Append to `session-tap.test.ts`:
  ```ts
  test("practice.session/REQ-013/S5 — ignored while leading", async () => {
    const f = leadFixture();
    await startLead(f.session);
    f.session.tapNote(3);
    await Promise.resolve(); await Promise.resolve();
    expect(f.sound.posted.filter(isTone)).toEqual([]);
    expect(f.session.snapshot().tappedRunIndex).toBeNull();
    expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
  });
  test("practice.session/REQ-013/S7 — idle in I lead, too", async () => {
    const f = leadFixture();
    f.session.tapNote(2);                                          // E4
    await Promise.resolve(); await Promise.resolve();
    const tone = f.sound.posted.find(isTone)!;
    expect(tone.hz).toBeCloseTo(329.63, 1);
    expect(tone.durationFrames).toBe(Math.round((625 / 1000) * 48000));
    expect(f.session.snapshot().lead.idleCaption).toBe("hold 2 beats · medium tuning");
    expect(f.listening.startCalls).toBe(0);
  });
  ```
  (match the tone's duration field name to what `session-tap.test.ts`'s REQ-013/S1 already asserts.) In `never-both.test.ts`, add the verb `start-as-me` (= `setSettings(leadSettings())` then `start()`) and `stop-lead` (= `stop()`) to the enumeration's verb list and the predicate `practice.session/REQ-015/S6 — nothing sounds while leading (invariant)`: after every interleaving of up to four taps, whenever `snapshot().lead.phase === "listening"` no tone, click, drone or tapped voice is live in `FakeSound` (the file's existing "live voices" bookkeeping), and `snapshot().drone.on` is false.
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-run.test.ts tests/practice/scenarios/session-tap.test.ts tests/practice/invariants/never-both.test.ts` — expect FAIL: the drone starts under a lead run; a tap posts a tone while leading.
- [ ] 3. GREEN — the three guards as Produces.
- [ ] 4. Run the three files — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — `startDrone()`, `enterTuner()` and `start()`-as-tool all begin with "stop whatever run is in progress": one `stopAnyRun()` helper, named in the report.

**Verify** — `pnpm vitest run tests/practice/invariants/never-both.test.ts` → passed with the widened enumeration; the enumeration's count printed by the test is larger than before (note the two numbers in the report).

### T009 · practice.session/REQ-009, practice.session/REQ-022 · Hidden, the wake lock, and the microphone that cannot be used

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (the hidden branch; `onEnded`; `start()`'s failed `listening.start()`)
- Test: `tests/practice/scenarios/session-hidden-awake.test.ts` (extend), `tests/practice/scenarios/lead-cannot-hear.test.ts`

**Interfaces**
- Consumes: T005–T008; `FakeVisibility.hide()/show()`, `FakeListening.failWith`, `FakeListening.end()`, `FakeWakeLock.acquired`.
- Produces: `visibility.onHidden` while `listeningOwner === "lead"` → `stop()` (listening stopped, phase idle, hold forgotten, wake lock released); `onShown` does nothing for a lead run (the tuner's resume is unchanged); `start()` with `listening.start()` → `{ ok: false, error }` → `phase = { kind: "cannot-hear", reason }`, `listeningOwner = "none"`, wake lock released, no target, no `TargetAdvanced`; `listening.onEnded` while leading → the same with reason `"failed"` within the same notify, the reading and hold cleared; `start()` from `cannot-hear` tries again.

**Steps**
- [ ] 1. RED — append to `session-hidden-awake.test.ts`:
  ```ts
  test("practice.session/REQ-009/S2 — the phone on the stand stays lit while leading", async () => {
    const f = leadFixture();
    await startLead(f.session);
    expect(f.wake.acquired).toBe(true);
    f.session.stop();
    expect(f.wake.acquired).toBe(false);
  });
  test("practice.session/REQ-009/S3 — a lead run hidden", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 700);
    f.visibility.hide();
    expect(f.listening.stopCalls).toBe(1);
    expect(f.session.snapshot().lead.phase).toBe("idle");
    expect(f.session.snapshot().lead.target).toBeNull();
    expect(f.session.snapshot().lead.idleCaption).toBe("hold 2 beats · medium tuning");
    expect(f.wake.acquired).toBe(false);
    f.visibility.show();
    await Promise.resolve(); await Promise.resolve();
    expect(f.listening.startCalls).toBe(1);
    await startLead(f.session);
    expect(f.session.snapshot().lead.target?.position).toBe(1);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
  });
  ```
  `tests/practice/scenarios/lead-cannot-hear.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { TargetAdvanced } from "../../../src/practice/published";
  import { hearSteady, leadFixture, startLead } from "../lead-helpers";

  test("practice.session/REQ-022/S1 — refused", async () => {
    const f = leadFixture();
    f.listening.failWith = "refused";
    const advanced: TargetAdvanced[] = [];
    f.session.onTargetAdvanced((e) => advanced.push(e));
    await startLead(f.session);
    expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
    expect(f.session.snapshot().lead.listening).toEqual({ kind: "cannot-hear", reason: "refused" });
    expect(f.session.snapshot().lead.target).toBeNull();
    expect(advanced).toEqual([]);
    expect(f.wake.acquired).toBe(false);
    f.session.startDrone(); await Promise.resolve(); await Promise.resolve();
    expect(f.session.snapshot().drone.on).toBe(true);           // the drone still works
  });
  test("practice.session/REQ-022/S2 — the next tap tries again", async () => {
    const f = leadFixture();
    f.listening.failWith = "none";
    await startLead(f.session);
    expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
    f.listening.failWith = null;
    await startLead(f.session);
    expect(f.listening.startCalls).toBe(2);
    expect(f.session.snapshot().lead.phase).toBe("listening");
    expect(f.session.snapshot().lead.target?.position).toBe(1);
  });
  test("practice.session/REQ-022/S3 — failed while leading", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 500);
    f.listening.end();
    expect(f.session.snapshot().lead.phase).toBe("cannot-hear");
    expect(f.session.snapshot().lead.listening).toEqual({ kind: "cannot-hear", reason: "failed" });
    expect(f.session.snapshot().lead.reading).toBeNull();
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    expect(f.session.snapshot().lead.target).toBeNull();
  });
  test("practice.session/REQ-022/S4 — nothing before the gesture", () => {
    const f = leadFixture();
    f.session.setSettings(leadSettings({ holdBeats: 4 }));
    f.session.setSettings(leadSettings({ who: "tool" }));
    f.session.setSettings(leadSettings());
    expect(f.listening.startCalls).toBe(0);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/session-hidden-awake.test.ts tests/practice/scenarios/lead-cannot-hear.test.ts` — expect FAIL: hidden does not stop the lead run; a refused start leaves the phase idle.
- [ ] 3. GREEN — as Produces. The `onEnded` and hidden handlers branch on `listeningOwner`.
- [ ] 4. Run both — expect PASS. `pnpm vitest run tests/practice` — green. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/session-hidden-awake.test.ts tests/practice/scenarios/lead-cannot-hear.test.ts` → all passed.

### T010 · practice.session/REQ-019 · Changes while leading

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (`setContext`, `setTraversal`, `setScaleChoice`, `setSettings` while leading)
- Test: `tests/practice/scenarios/lead-changes.test.ts`

**Interfaces**
- Consumes: T005–T009.
- Produces: `setContext`/`setTraversal`/`setScaleChoice` while `leadPhase.kind === "listening"` → the sequence rebuilt as today, `leadPhase` = listening at `targetAt(newSequence, 1)` with `emptyHold`, the smoothing reset, `TargetAdvanced` emitted for the new first target, listening untouched (no `stopCalls`/`startCalls`); from `complete` → `idle`; `setSettings` with the same `who`: nothing stops; `tempoBpm`/`holdBeats`/`tolerance` take effect at the next reading (the reducer reads `currentSettings` each time); `cueMeter`/`cueTone` are stored (the UI reads `cueMeter`; T011 reads `cueTone`).

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-changes.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { NoteJudged, TargetAdvanced } from "../../../src/practice/published";
  import { defaultScaleChoice } from "../../../src/practice/published";
  import { keyOf } from "../fakes";
  import { hearAt, hearSteady, holdThrough, leadFixture, leadSettings, startLead } from "../lead-helpers";

  test("practice.session/REQ-019/S1 — a new key mid-run", async () => {
    const f = leadFixture();
    const advanced: TargetAdvanced[] = [];
    f.session.onTargetAdvanced((e) => advanced.push(e));
    await startLead(f.session);
    holdThrough(f, 8);
    expect(f.session.snapshot().lead.target?.position).toBe(9);
    f.session.setContext({ ...f.context, key: keyOf("G") });
    expect(f.session.snapshot().lead.target).toMatchObject({ position: 1, note: { letter: "G", octave: 4 } });
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    expect(advanced.at(-1)).toMatchObject({ note: { letter: "G", octave: 4 }, position: 1 });
    expect(f.listening.stopCalls).toBe(0);
    expect(f.listening.startCalls).toBe(1);
  });
  test("practice.session/REQ-019/S2 — a tighter tolerance mid-hold", async () => {
    const f = leadFixture();
    const judged: NoteJudged[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    await startLead(f.session);
    const t0 = holdThrough(f, 2);                                  // the target is E4
    hearSteady(f, 331.15, t0, t0 + 600);                           // +8 ¢
    expect(judged.at(-1)?.verdict).toBe("in-tune");
    f.session.setSettings(leadSettings({ tolerance: "accurate" }));
    hearAt(f, 331.15, t0 + 620);
    expect(judged.at(-1)).toMatchObject({ target: { letter: "E" }, cents: 8, verdict: "sharp" });
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    expect(f.listening.stopCalls).toBe(0);
  });
  test("practice.session/REQ-019/S3 — more beats mid-hold", async () => {
    const f = leadFixture();
    await startLead(f.session);
    const t0 = holdThrough(f, 2);                                  // the target is E4
    hearSteady(f, 330.6, t0, t0 + 900);
    f.session.setSettings(leadSettings({ holdBeats: 4 }));
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(900 / 2500, 2);
    expect(f.session.snapshot().lead.phase).toBe("listening");
  });
  test("practice.session/REQ-019/S4 — the sheet is not a stop (the session never sees the sheet; the verbs it calls never stop)", async () => {
    const f = leadFixture();
    const judged: NoteJudged[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 400);
    f.session.setSettings(leadSettings({ cueMeter: false }));
    f.session.setSettings(leadSettings({ cueMeter: true }));
    hearSteady(f, 262.5, 410, 800);
    expect(f.listening.stopCalls).toBe(0);
    expect(judged.length).toBeGreaterThan(60);
    expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(800 / 1250, 1);
  });
  test("practice.session/REQ-019/S5 — a traversal change restarts", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 1300);
    expect(f.session.snapshot().lead.target?.position).toBe(2);
    f.session.setTraversal({ direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" });
    expect(f.session.snapshot().sequence).toHaveLength(8);
    expect(f.session.snapshot().lead.target).toMatchObject({ position: 1, note: { letter: "C", octave: 4 } });
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    f.session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
    expect(f.session.snapshot().lead.target?.position).toBe(1);
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-changes.test.ts` — expect FAIL: after `setContext` the target is still position 9 of the old sequence (or the run stopped).
- [ ] 3. GREEN — in the shared "sequence rebuilt" path (where `restartIfPlaying` lives), add the lead restart; `complete` → `idle` there too.
- [ ] 4. Run the file — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-changes.test.ts` → `Tests  5 passed (5)`.

### T011 · practice.session/REQ-018, practice.session/REQ-017 · The tone cue and its mute window; "held ✓"

**Status:** todo

**Files**
- Modify: `src/practice/domain/session.ts` (the cue voice; `mutedUntilMs`; `justHeld`)
- Test: `tests/practice/scenarios/lead-cues.test.ts`, `tests/practice/scenarios/lead-meter.test.ts` (extend)

**Interfaces**
- Consumes: T005–T010; `CUE_TONE_MS`, `CUE_TAIL_MS`, `HELD_TICK_MS` (T002); the tapped-note tone scheduling (`tapNote`'s tone command and its release, session.ts today); `FakeSound.posts`, `isTone`, `isStop`.
- Produces: with `currentSettings.lead.cueTone`, when a target is shown (the first on start, each advance, each restart of REQ-019): `await sound.start()` once if not yet started (as `tapNote` does), then a tone command at `pitchHzOf(target.note)` with `durationFrames` = `CUE_TONE_MS` in frames and tag `CUE_TAG_BASE + n` (`4_000_000 + n`), onset at `sound.currentFrame()` + `FIRST_TICK_LEAD_MS`; `leadPhase.mutedUntilMs = onsetMs + CUE_TONE_MS + <the tone's release ms as tapNote's tone has> + CUE_TAIL_MS` measured on the listening clock (convert the sound onset frame to ms with `sound.sampleRate()`; the two ports share one context in production and `FakeSound`/`FakeListening` both use 48 kHz); a `SoundUnavailable` → `notice: "sound-unavailable"`, the run continues; `stop()` stops a sounding cue (`stop` with its tag). `justHeld`: set to the previous target's note on an advance; cleared on the next committed reading or `HELD_TICK_MS` after the advance with no reading (a clock timer), whichever first; `snapshot.lead.justHeld`.

**Steps**
- [ ] 1. RED — `tests/practice/scenarios/lead-cues.test.ts`:
  ```ts
  import { expect, test } from "vitest";
  import type { NoteJudged } from "../../../src/practice/published";
  import { CUE_TAIL_MS, CUE_TONE_MS } from "../../../src/practice/published";
  import { isTone } from "../fakes";
  import { frameOfMs, hearAt, hearSteady, leadFixture, leadSettings, letGapPass, startLead } from "../lead-helpers";

  test("practice.session/REQ-018/S2 — the tone sounds each target", async () => {
    const f = leadFixture(leadSettings({ cueTone: true }));
    await startLead(f.session);
    await Promise.resolve(); await Promise.resolve();
    const tones = f.sound.posted.filter(isTone);
    expect(tones).toHaveLength(1);
    expect(tones[0]!.hz).toBeCloseTo(261.63, 1);
    expect(tones[0]!.durationFrames).toBe(frameOfMs(CUE_TONE_MS));
    expect(tones[0]!.tag).toBeGreaterThanOrEqual(4_000_000);
    const windowMs = CUE_TONE_MS + CUE_TAIL_MS + 200;              // past the tone, its release and the tail
    hearSteady(f, 262.5, windowMs, windowMs + 1300);
    const after = f.sound.posted.filter(isTone);
    expect(after).toHaveLength(2);
    expect(after[1]!.hz).toBeCloseTo(293.66, 1);
  });
  test("practice.session/REQ-018/S3 — the tone is never the learner", async () => {
    const f = leadFixture({ ...leadSettings({ cueTone: true, holdBeats: 1 }), tempoBpm: 150 });   // a 400 ms hold
    const judged: NoteJudged[] = [];
    f.session.onNoteJudged((e) => judged.push(e));
    await startLead(f.session);
    await Promise.resolve(); await Promise.resolve();
    hearSteady(f, 261.63, 20, 20 + CUE_TONE_MS + CUE_TAIL_MS);     // the tool's own tone, fed back, in tune
    expect(judged).toEqual([]);
    expect(f.session.snapshot().lead.heldFraction).toBe(0);
    expect(f.session.snapshot().lead.target?.position).toBe(1);
    expect(f.session.snapshot().lead.reading).toBeNull();
    hearAt(f, 262.5, 20 + CUE_TONE_MS + CUE_TAIL_MS + 200);
    expect(judged).toHaveLength(1);
    expect(judged[0]!.cents).toBe(6);                               // as detected after the window
  });
  test("practice.session/REQ-018/S4 — tone off", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 1300); letGapPass(f);
    hearSteady(f, 293.66, 1700, 3000); letGapPass(f);
    hearSteady(f, 329.63, 3400, 4700);
    expect(f.session.snapshot().lead.target?.position).toBe(4);
    expect(f.sound.posted.filter(isTone)).toEqual([]);
  });
  test("practice.session/REQ-018/S1 — meter off still judges and advances", async () => {
    const f = leadFixture(leadSettings({ cueMeter: false }));
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 1300);
    expect(f.session.snapshot().lead.target?.position).toBe(2);
    expect(f.session.snapshot().settings.lead.cueMeter).toBe(false);
  });
  ```
  Append to `lead-meter.test.ts`:
  ```ts
  test("practice.session/REQ-017/S4 — 'held ✓' until the first reading on the new target", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 1240);
    hearAt(f, 262.5, 1260);                                         // completes the hold → D4
    expect(f.session.snapshot().lead.target?.position).toBe(2);
    expect(f.session.snapshot().lead.justHeld).toMatchObject({ letter: "C", octave: 4 });
    hearAt(f, 293.66, 1300);
    expect(f.session.snapshot().lead.justHeld).toBeNull();
  });
  test("practice.session/REQ-017/S4 — 'held ✓' goes after 0.4 s of silence", async () => {
    const f = leadFixture();
    await startLead(f.session);
    hearSteady(f, 262.5, 0, 1240);
    hearAt(f, 262.5, 1260);
    letGapPass(f);
    expect(f.session.snapshot().lead.justHeld).not.toBeNull();
    f.clock.advanceMs(100);
    expect(f.session.snapshot().lead.justHeld).toBeNull();
  });
  ```
- [ ] 2. Run `pnpm vitest run tests/practice/scenarios/lead-cues.test.ts tests/practice/scenarios/lead-meter.test.ts` — expect FAIL: no tone posted; the fed-back tone is judged; `justHeld` undefined.
- [ ] 3. GREEN — as Produces.
- [ ] 4. Run both — expect PASS. `pnpm vitest run tests/practice` — green. `pnpm check` — green.
- [ ] 5. REFACTOR — the cue and the tapped note share one `scheduleOneTone(hz, durationMs, tag)`; say so.

**Verify** — `pnpm vitest run tests/practice/scenarios/lead-cues.test.ts tests/practice/scenarios/lead-meter.test.ts` → all passed.

## Phase 3 — The practice screen

_Ends with the eleven states reachable on the live app._

### T012 · practice.session/REQ-014, practice.session/REQ-002 · The transport card: the mode words, the I-lead idle card, no progress bar

**Status:** todo

**Files**
- Modify: `src/ui/TransportCard.tsx`, `src/ui/theme.ts` (append the mode-word metrics), `src/ui/App.tsx:855-870` (the card's props)
- Create: `tests/ui/scenarios/lead-app-helpers.tsx`
- Test: `tests/ui/scenarios/transport-card-lead.test.tsx`, `tests/ui/scenarios/transport-card.test.tsx` (remove the progress-fill assertions)

**Interfaces**
- Consumes: `SessionSnapshot.lead` (T005), `Who`.
- Produces:
  ```ts
  // TransportCard props: + readonly onWho: (who: Who) => void   (App: session.setSettings({ ...snapshot.settings, lead: { ...snapshot.settings.lead, who } }))
  // DOM: data-testid="mode-word-tool" ("play along") and "mode-word-me" ("I lead") in a flex row, gap 16, each a column of the word (fontSize 12.5, weight 600) over a 2 px bar (radius 2, 4 px below) — selected: ink paper.ink, bar paper.accent; unselected: ink paper.faint, bar transparent; 4 px vertical padding; onClick → onWho
  // data-testid="start-circle": the 56 px circle; in I lead idle its content is data-testid="tuner-glyph" (three bars 3 px wide, gap 3, heights 10/20/10; outer rgba(249,244,233,.6), centre #f9f4e9) instead of "▶"
  // the caption (data-testid="position-caption") reads snapshot.lead.idleCaption when lead.who === "me" && lead.phase === "idle", else snapshot.caption as today
  // the progress track and data-testid="progress-fill" are removed; the words row sits where the track was, in every state
  // theme.ts: export const modeWords = { gap: 16, barHeight: 2, barOffset: 4, padding: 4, glyphBar: 3, glyphGap: 3, glyphHeights: [10, 20, 10] as const, glyphOuter: "rgba(249,244,233,.6)", glyphCentre: "#f9f4e9" } as const;
  ```

**Steps**
- [ ] 1. RED — first the shared helpers, `tests/ui/scenarios/lead-app-helpers.tsx` (every UI task of this change imports them):
  ```tsx
  import { act, render, screen } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { builtInCatalogue } from "../../../src/theory/published";
  import { App } from "../../../src/ui/App";
  import { firstRunDefaults, localStorageSelectionStore, type StoredSelection } from "../../../src/ui/selection-store";
  import { sessionDepsWithFakes } from "../../practice/fakes";
  export const STORAGE_KEY = "music-learning-assistant.selection.v1";
  export const frameOfMs = (ms: number): number => Math.round((ms * 48000) / 1000);
  export const HOP_MS = 512_000 / 48000;
  /** C major on flute Concert, ↑↓ 1 oct — 15 notes · C4–C5 — stored at v6 with `lead` overridden. */
  export function storedCMajor(lead: Partial<StoredSelection["session"]["lead"]> = {}, rest: Partial<StoredSelection> = {}): StoredSelection {
    return { ...firstRunDefaults, variantId: "flute-concert", keyId: "C-major", ...rest, session: { ...firstRunDefaults.session, ...rest.session, lead: { ...firstRunDefaults.session.lead, ...lead } } };
  }
  export function renderLeadApp(stored: StoredSelection = storedCMajor()) {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const fakes = sessionDepsWithFakes();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={fakes.sessionDeps} />);
    return { ...fakes, user: userEvent.setup() };
  }
  export type LeadApp = ReturnType<typeof renderLeadApp>;
  export async function flushApp(): Promise<void> { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
  /** Taps "I lead" (if not already) and the start circle, past the session's two awaits. */
  export async function startLeadInApp(app: LeadApp): Promise<void> {
    if (screen.getByTestId("mode-word-me").style.color !== "rgb(28, 25, 22)") await app.user.click(screen.getByTestId("mode-word-me"));
    await app.user.click(screen.getByTestId("start-circle"));
    await flushApp();
  }
  export function hearInApp(app: LeadApp, hz: number, atMs: number): void {
    act(() => { app.listening.frame = frameOfMs(atMs); app.listening.feed(hz, app.listening.frame); app.clock.advance(1); });
  }
  export function hearSteadyInApp(app: LeadApp, hz: number, fromMs: number, toMs: number): number {
    let t = fromMs; for (; t <= toMs; t += HOP_MS) hearInApp(app, hz, t); return t - HOP_MS;
  }
  export function silenceInApp(app: LeadApp, ms: number): void { act(() => app.clock.advance(ms)); }
  ```
  (jsdom normalises `style.color` to `rgb(...)`: `paper.ink` `#1c1916` reads `rgb(28, 25, 22)`, `paper.faint` `#9a9186` reads `rgb(154, 145, 134)`; an `oklch(...)` value is kept verbatim — match the file's existing colour assertions.) Then `tests/ui/scenarios/transport-card-lead.test.tsx`:
  ```tsx
  import { act, cleanup, screen } from "@testing-library/react";
  import { afterEach, expect, test } from "vitest";
  import { renderLeadApp, startLeadInApp, flushApp, storedCMajor } from "./lead-app-helpers";
  afterEach(cleanup);

  test("practice.session/REQ-014/S1 (card) — choosing I lead", async () => {
    const app = renderLeadApp();
    expect(screen.getByTestId("mode-word-tool").style.color).toBe("rgb(28, 25, 22)");
    expect(screen.getByTestId("mode-word-me").style.color).toBe("rgb(154, 145, 134)");
    await app.user.click(screen.getByTestId("mode-word-me"));
    expect(screen.getByTestId("mode-word-me").style.color).toBe("rgb(28, 25, 22)");
    expect(screen.getByTestId("mode-word-tool").style.color).toBe("rgb(154, 145, 134)");
    expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
    expect(screen.getByTestId("start-circle").textContent).not.toContain("▶");
    expect(screen.getByTestId("position-caption").textContent).toBe("hold 2 beats · medium tuning");
    expect(app.listening.startCalls).toBe(0);
  });
  test("practice.session/REQ-014/S2 (card) — and back", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
    await app.user.click(screen.getByTestId("mode-word-tool"));
    expect(screen.getByTestId("start-circle").textContent).toContain("▶");
    expect(screen.getByTestId("position-caption").textContent).toBe("15 notes · C4–C5");
  });
  test("practice.session/REQ-014/S4 (card) — one beat, singular", () => {
    renderLeadApp(storedCMajor({ who: "me", holdBeats: 1, tolerance: "accurate" }));
    expect(screen.getByTestId("position-caption").textContent).toBe("hold 1 beat · accurate tuning");
  });
  test("practice.session/REQ-002/S5 — one card structure, idle and playing, in both modes", async () => {
    const app = renderLeadApp(storedCMajor({}, { session: { ...storedCMajor().session, countIn: false } }));
    const card = screen.getByTestId("transport-card");
    const idleIds = [...card.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid"));
    expect(idleIds).not.toContain("progress-fill");
    await app.user.click(screen.getByTestId("start-circle")); await flushApp();
    act(() => app.clock.advance(3000));
    expect(screen.getByTestId("position-caption").textContent).toMatch(/^[A-G]♯?4 · \d+ of 15$/);
    expect([...card.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid"))).toEqual(idleIds);
    await app.user.click(screen.getByTestId("mode-word-me"));
    expect([...card.querySelectorAll("[data-testid]")].map((e) => e.getAttribute("data-testid"))).toEqual(idleIds);
  });
  test("practice.session/REQ-002/S1 · practice.session/REQ-014/S5 (card) — play along is as it was, the words beneath the caption", async () => {
    const app = renderLeadApp(storedCMajor({}, { session: { ...storedCMajor().session, countIn: false } }));
    await app.user.click(screen.getByTestId("start-circle")); await flushApp();
    act(() => app.clock.advance(100));
    expect(screen.getByTestId("position-caption").textContent).toBe("C4 · 1 of 15");
    expect(screen.getByTestId("mode-word-tool").style.color).toBe("rgb(28, 25, 22)");
    expect(screen.getByTestId("start-circle").textContent).toContain("❚❚");
  });
  ```
  jsdom has no layout, so S5's "one height" is asserted as one DOM structure here; the design loop's screenshots check the pixels. Add `data-testid="transport-card"` to the card's root.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx` — expect FAIL: no `mode-word-me`.
- [ ] 3. GREEN — as Produces; delete the progress track and its constants; remove the `progress-fill` assertions from `transport-card.test.tsx` and `app-session.test.tsx` (cite REQ-002's change in the commit message).
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green (including `scripts/check-design.sh`: the two glyph colours are tokens in `theme.ts`, not literals in the component).
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx` → all passed; `python3 scripts/design_snapshot.py changes/008-learner-leads live --base http://localhost:5173` → `practice--idle-play-along.png` and `practice--idle-i-lead.png` match canvas phones 01 and 02 in structure (the words row under the caption; the glyph and caption in 02).

### T013 · practice.session/REQ-015, practice.session/REQ-017, practice.session/REQ-022 · The live lead card, the judgement copy, the complete card, the no-mic card

**Status:** todo

**Files**
- Modify: `src/ui/TransportCard.tsx`, `src/ui/cents-label.ts`, `src/ui/theme.ts` (the target letter size 40 is already in the type scale; add `leadCard = { targetLetterSize: 40, octaveSize: 12, noMicTitleSize: 14, noMicBodySize: 12.5, noMicLineHeight: 1.45 }`)
- Test: `tests/ui/scenarios/transport-card-lead.test.tsx` (extend)

**Interfaces**
- Consumes: `SessionSnapshot.lead` (`phase`, `target`, `reading`, `justHeld`, `completeCaption`), `sequence.length`; `tuner.sharp / flat / inTune`, `paper.faint` (theme.ts).
- Produces:
  ```ts
  // cents-label.ts
  export function judgementLabelOf(lead: LeadSnapshot): { readonly text: string; readonly ink: string } | null;
  // listening: justHeld !== null → `${noteLabel(justHeld)} held ✓` in tuner.inTune; reading === null → `Play ${noteLabel(target.note)}` in paper.faint;
  //   verdict in-tune → "in tune · holding" in tuner.inTune; flat → `↓ ${Math.abs(Math.round(cents))} ¢ flat` in tuner.flat; sharp → `↑ ${Math.round(cents)} ¢ sharp` in tuner.sharp
  // complete → { text: "All held", ink: tuner.inTune }; idle / cannot-hear → null
  // TransportCard, phase listening: data-testid="stop-circle" (■, 56 px, bg paper.accent, ink #f9f4e9 — the existing glyph ink token) → onTogglePlay; data-testid="target-letter" (fonts.display 40, paper.accent, the note's letter + accidental glyph) with data-testid="target-octave" (fonts.mono 12/600); data-testid="position-caption" `${target.position} of ${sequence.length}`; data-testid="judgement" with judgementLabelOf's text and colour; the tempo stepper as today
  // phase complete: the start circle (tuner glyph), position-caption = lead.completeCaption, judgement "All held"
  // phase cannot-hear: data-testid="no-mic-card": "Can't hear — no microphone" (14/600) and "It was refused or isn't there. Allow the microphone for this site, then press I lead again." (12.5, paper.muted, line-height 1.45) below the top row; the start circle and the mode words still shown
  ```

**Steps**
- [ ] 1. RED — append to `transport-card-lead.test.tsx` (`hearInApp`, `hearSteadyInApp`, `silenceInApp`, `startLeadInApp` from the helpers):
  ```tsx
  test("practice.session/REQ-015/S1 (card) — the live card", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await startLeadInApp(app);
    expect(screen.getByTestId("stop-circle").textContent).toBe("■");
    expect(screen.getByTestId("target-letter").textContent).toBe("C");
    expect(screen.getByTestId("target-octave").textContent).toBe("4");
    expect(screen.getByTestId("position-caption").textContent).toBe("1 of 15");
    expect(screen.getByTestId("judgement").textContent).toBe("Play C4");
    expect(screen.getByTestId("judgement").style.color).toBe("rgb(154, 145, 134)");
  });
  test("practice.session/REQ-017/S2 (card) — flat and sharp", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await startLeadInApp(app);
    hearInApp(app, 258.92, 0);
    expect(screen.getByTestId("judgement").textContent).toBe("↓ 18 ¢ flat");
    expect(screen.getByTestId("judgement").style.color).toBe("oklch(0.55 0.11 258)");
    silenceInApp(app, 300);
    hearInApp(app, 263.45, 500);
    expect(screen.getByTestId("judgement").textContent).toBe("↑ 12 ¢ sharp");
    expect(screen.getByTestId("judgement").style.color).toBe("oklch(0.55 0.11 28)");
  });
  test("practice.session/REQ-017/S3 (card) — holding", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await startLeadInApp(app);
    hearSteadyInApp(app, 262.5, 0, 750);
    expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
    expect(screen.getByTestId("judgement").style.color).toBe("oklch(0.55 0.11 150)");
  });
  test("practice.session/REQ-017/S4 (card) — advanced", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await startLeadInApp(app);
    hearSteadyInApp(app, 262.5, 0, 1300);
    expect(screen.getByTestId("target-letter").textContent).toBe("D");
    expect(screen.getByTestId("position-caption").textContent).toBe("2 of 15");
    expect(screen.getByTestId("judgement").textContent).toBe("C4 held ✓");
    expect(screen.getByTestId("judgement").style.color).toBe("oklch(0.55 0.11 150)");
    hearInApp(app, 293.66, 1400);
    expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
  });
  test("practice.session/REQ-017/S5 (card) — pinned beyond ±50 ¢", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await startLeadInApp(app);
    hearInApp(app, 523.25, 0);
    expect(screen.getByTestId("judgement").textContent).toBe("↑ 1200 ¢ sharp");
  });
  test("practice.session/REQ-015/S3 (card) — the complete card", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }, { session: { ...storedCMajor().session, loop: false } }));
    await startLeadInApp(app);
    let t = 0;
    for (let n = 0; n < 15; n += 1) { const hz = Number(screen.getByTestId("target-hz").textContent); hearSteadyInApp(app, hz, t, t + 1300); silenceInApp(app, 300); t += 1700; }
    expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
    expect(screen.getByTestId("position-caption").textContent).toBe("15 of 15 held · C4–C5");
    expect(screen.getByTestId("judgement").textContent).toBe("All held");
    expect(app.listening.stopCalls).toBe(1);
  });
  test("practice.session/REQ-022/S1 (card) — the no-mic card", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    app.listening.failWith = "refused";
    await startLeadInApp(app);
    expect(screen.getByTestId("no-mic-card").textContent).toContain("Can't hear — no microphone");
    expect(screen.getByTestId("no-mic-card").textContent).toContain("It was refused or isn't there. Allow the microphone for this site, then press I lead again.");
    expect(screen.getByTestId("start-circle")).toBeTruthy();
    expect(screen.getByTestId("mode-word-me")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  ```
  `data-testid="target-hz"` is a visually hidden span on the live card carrying `pitchHzOf(target.note)` to one decimal, so the complete-card test can hold every note without a theory import; it is `aria-hidden`.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx` — expect FAIL: no `stop-circle` / `judgement`.
- [ ] 3. GREEN — as Produces.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — the card's three layouts (idle, live, no-mic) are three small components in the same file, each under 60 lines.

**Verify** — `pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx` → all passed; `design_snapshot.py … live` → `practice--listening-silent.png`, `practice--heard-out-of-tune.png`, `practice--holding.png`, `practice--advanced.png`, `practice--complete.png`, `practice--no-microphone.png` match canvas phones 03–08 in the card's structure (the meter on the note arrives with T014).

### T014 · practice.session/REQ-017, practice.session/REQ-018 · `NoteMeter` and the stave: the band, the fill, the line on the target notehead; ink behind, faint ahead

**Status:** todo

**Files**
- Create: `src/ui/NoteMeter.tsx`
- Modify: `src/ui/StaveView.tsx` (`leadTarget`, `onTargetBox`), `src/ui/App.tsx:805-850` (the panel container, the overlay), `src/ui/theme.ts` (`noteMeter` metrics)
- Test: `tests/ui/scenarios/note-meter.test.tsx`, `tests/ui/scenarios/stave-view.test.tsx` (extend)

**Interfaces**
- Consumes: `SessionSnapshot.lead`, `TOLERANCE_CENTS`, `lead.holdFill`, `tuner.band / inTune / flat / sharp`.
- Produces:
  ```ts
  // theme.ts
  export const noteMeter = { boxHeight: 40, pxPerCent: 0.4, staveBandWidth: 26, staveLineOverhang: 2, columnBandInset: 6, columnLineInset: 3, columnBoxTop: 13, bandRadius: 3, lineHeight: 2, lineRadius: 1, lineTransition: "top .18s cubic-bezier(.3,.7,.3,1)" } as const;
  // NoteMeter.tsx
  export type MeterGeometry = { readonly kind: "stave"; readonly centreX: number; readonly centreY: number } | { readonly kind: "column" };
  export function NoteMeter(props: { readonly geometry: MeterGeometry; readonly toleranceCents: number; readonly heldFraction: number; readonly reading: { readonly cents: number; readonly verdict: Verdict } | null }): JSX.Element;
  // stave: a 26 × 40 box at (centreX − 13, centreY − 20), pointer-events none; column: left 0 right 0 top 13 height 40 inside the cell
  // data-testid="note-meter-band": top `${50 − tol}%`, height `${2·tol}%`, background tuner.band, radius 3, overflow hidden; band left/right: stave 0, column 6 px
  //   inside it data-testid="note-meter-fill": left 0, width `${Math.round(heldFraction·100)}%`, background lead.holdFill
  // data-testid="note-meter-line" only when reading !== null: top `${50 − clamp(cents, −50, 50)}%`, height 2, marginTop −1, radius 1, transition noteMeter.lineTransition,
  //   background verdict in-tune → tuner.inTune, flat → tuner.flat, sharp → tuner.sharp; left/right: stave −2 px, column 3 px; z-index above the note
  // StaveView props: + readonly leadTarget: { readonly runIndex: number } | null   (the target highlighted as a sounding note — the existing isSounding path — and: run index < target ink at opacity 1, > target opacity 0.3, the target itself accent; without leadTarget the existing styling)
  //                  + readonly onTargetBox: ((box: { readonly x: number; readonly y: number } | null) => void) | undefined   (useLayoutEffect on [leadTarget?.runIndex, the head geometry]: the target head's centre in the stave's own px, or null)
  // App: a relative wrapper around the panel; <NoteMeter> rendered absolutely over the stave at the reported box when lead.phase === "listening" && settings.lead.cueMeter && view === "stave"
  ```

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/note-meter.test.tsx`:
  ```tsx
  import { cleanup, render, screen } from "@testing-library/react";
  import { afterEach, expect, test } from "vitest";
  import { NoteMeter } from "../../../src/ui/NoteMeter";
  import { lead, tuner } from "../../../src/ui/theme";
  afterEach(cleanup);
  const stave = { kind: "stave", centreX: 100, centreY: 60 } as const;

  test("practice.session/REQ-017/S1 — silent: the band, no fill, no line", () => {
    render(<NoteMeter geometry={stave} toleranceCents={10} heldFraction={0} reading={null} />);
    const band = screen.getByTestId("note-meter-band");
    expect(band.style.top).toBe("40%"); expect(band.style.height).toBe("20%"); expect(band.style.background).toBe(tuner.band);
    expect(band.parentElement!.style.width).toBe("26px"); expect(band.parentElement!.style.height).toBe("40px");
    expect(band.parentElement!.style.left).toBe("87px"); expect(band.parentElement!.style.top).toBe("40px");
    expect(screen.getByTestId("note-meter-fill").style.width).toBe("0%");
    expect(screen.queryByTestId("note-meter-line")).toBeNull();
  });
  test("practice.session/REQ-017/S2 — flat, then sharp", () => {
    const { rerender } = render(<NoteMeter geometry={stave} toleranceCents={10} heldFraction={0} reading={{ cents: -18, verdict: "flat" }} />);
    const line = screen.getByTestId("note-meter-line");
    expect(line.style.top).toBe("68%"); expect(line.style.background).toBe(tuner.flat); expect(line.style.left).toBe("-2px"); expect(line.style.right).toBe("-2px");
    rerender(<NoteMeter geometry={stave} toleranceCents={10} heldFraction={0} reading={{ cents: 12, verdict: "sharp" }} />);
    expect(screen.getByTestId("note-meter-line").style.top).toBe("38%"); expect(screen.getByTestId("note-meter-line").style.background).toBe(tuner.sharp);
  });
  test("practice.session/REQ-017/S3 — holding: the fill", () => {
    render(<NoteMeter geometry={stave} toleranceCents={10} heldFraction={0.6} reading={{ cents: 6, verdict: "in-tune" }} />);
    expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
    expect(screen.getByTestId("note-meter-fill").style.background).toBe(lead.holdFill);
    expect(screen.getByTestId("note-meter-line").style.background).toBe(tuner.inTune);
  });
  test("practice.session/REQ-017/S5 — pinned beyond ±50 ¢", () => {
    render(<NoteMeter geometry={stave} toleranceCents={10} heldFraction={0} reading={{ cents: 1200, verdict: "sharp" }} />);
    expect(screen.getByTestId("note-meter-line").style.top).toBe("0%");
  });
  test("practice.session/REQ-019/S2 — accurate is a 4 px band", () => {
    render(<NoteMeter geometry={stave} toleranceCents={5} heldFraction={0} reading={null} />);
    expect(screen.getByTestId("note-meter-band").style.height).toBe("10%");   // 10 % of 40 px = 4 px
  });
  test("practice.session/REQ-017/S6 — the column geometry", () => {
    render(<NoteMeter geometry={{ kind: "column" }} toleranceCents={10} heldFraction={0.4} reading={{ cents: 5, verdict: "in-tune" }} />);
    const band = screen.getByTestId("note-meter-band");
    expect(band.style.left).toBe("6px"); expect(band.style.right).toBe("6px");
    expect(band.parentElement!.style.top).toBe("13px");
    expect(screen.getByTestId("note-meter-fill").style.width).toBe("40%");
    const line = screen.getByTestId("note-meter-line");
    expect(line.style.left).toBe("3px"); expect(line.style.right).toBe("3px"); expect(line.style.top).toBe("45%");
  });
  ```
  Append to `stave-view.test.tsx` (render `StaveView` directly as the file's existing tests do, with the example run — `notes` the eight `KeyViewNote`s of C major on the flute, `key_` C major, `variant` flute Concert, `playing` false, `soundingRunIndex` null, `tapsEnabled` false):
  ```tsx
  test("practice.session/REQ-017/S8 — ink behind, faint ahead", () => {
    renderStave({ leadTarget: { runIndex: 4 } });
    const heads = screen.getAllByTestId("stave-note");
    expect(heads.slice(0, 4).map((h) => h.getAttribute("opacity"))).toEqual(["1", "1", "1", "1"]);
    expect(heads.slice(5).map((h) => h.getAttribute("opacity"))).toEqual(["0.3", "0.3", "0.3"]);
    expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
    expect(Number(heads[4]!.getAttribute("rx"))).toBeGreaterThan(Number(heads[3]!.getAttribute("rx")));
  });
  test("practice.session/REQ-017/S1 (stave) — the target is highlighted as a sounding note", () => {
    renderStave({ leadTarget: { runIndex: 0 } });
    expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
    expect(screen.getAllByTestId("stave-note")[0]!.getAttribute("fill")).toBe("#8a4b2a");
  });
  test("practice.session/REQ-017 — onTargetBox reports the target head's centre", () => {
    const boxes: ({ x: number; y: number } | null)[] = [];
    renderStave({ leadTarget: { runIndex: 0 }, onTargetBox: (b) => boxes.push(b) });
    const head = screen.getAllByTestId("stave-note")[0]!;
    expect(boxes.at(-1)).toEqual({ x: Number(head.getAttribute("cx")), y: Number(head.getAttribute("cy")) });
  });
  ```
  and to `transport-card-lead.test.tsx`:
  ```tsx
  test("practice.session/REQ-018/S1 (app) — meter off: no band, fill or line; the highlight stays", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me", cueMeter: false }, { view: "stave" }));
    await startLeadInApp(app);
    hearInApp(app, 258.92, 0);
    expect(screen.queryByTestId("note-meter-band")).toBeNull();
    expect(screen.queryByTestId("note-meter-line")).toBeNull();
    expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
    expect(screen.getByTestId("judgement").textContent).toBe("↓ 18 ¢ flat");
  });
  test("practice.session/REQ-017/S3 (app, stave) — the meter sits on the target", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }, { view: "stave" }));
    await startLeadInApp(app);
    hearSteadyInApp(app, 262.5, 0, 750);
    const head = screen.getAllByTestId("stave-note")[0]!;
    const box = screen.getByTestId("note-meter-band").parentElement!;
    expect(box.style.left).toBe(`${Number(head.getAttribute("cx")) - 13}px`);
    expect(box.style.top).toBe(`${Number(head.getAttribute("cy")) - 20}px`);
    expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
  });
  ```
  (`renderStave(extra)` is a local helper in `stave-view.test.tsx` spreading `extra` over the file's base props.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx` — expect FAIL: `NoteMeter` not found.
- [ ] 3. GREEN — as Produces. In `App`, the meter's `reading` is `lead.reading === null ? null : { cents: lead.reading.cents, verdict: lead.reading.verdict }`; `heldFraction` from the snapshot; `toleranceCents` from `TOLERANCE_CENTS[settings.lead.tolerance]`.
- [ ] 4. Run `pnpm vitest run tests/ui` — expect PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — `StaveView`'s opacity rule (today's `playing`/`soundingRunIndex` dimming and the new lead rule) is one `noteOpacityOf(runIndex, mode)` function; say so.

**Verify** — `pnpm vitest run tests/ui/scenarios/note-meter.test.tsx tests/ui/scenarios/stave-view.test.tsx` → all passed; `design_snapshot.py … live` → `practice--holding.png` (stave) matches phone 05: band behind the enlarged head, fill, the line in front; `practice--holding-meter-off.png` matches the README's rule.

### T015 · practice.session/REQ-017 · The names view: the meter in the target column

**Status:** todo

**Files**
- Modify: `src/ui/NamesView.tsx` (`leadTarget`, the meter inside the target cell), `src/ui/App.tsx` (pass `lead` to the names view)
- Test: `tests/ui/scenarios/names-view.test.tsx` (extend)

**Interfaces**
- Consumes: `NoteMeter` with `geometry: { kind: "column" }` (T014); `SessionSnapshot.lead`.
- Produces: `NamesView` props `+ readonly leadTarget: { readonly runIndex: number } | null`, `+ readonly meter: { readonly toleranceCents: number; readonly heldFraction: number; readonly reading: { cents: number; verdict: Verdict } | null } | null` — the target's column is highlighted as a sounding column (the existing `isSounding` path, matching by the run note's pitch class as `soundingPitchClass` does today), the other columns at opacity 0.4 while a lead run is in progress (the prototype's `op`), and `<NoteMeter geometry={{ kind: "column" }} …/>` rendered inside the target cell (position relative) when `meter !== null`.

**Steps**
- [ ] 1. RED — append to `names-view.test.tsx`:
  ```tsx
  test("practice.session/REQ-017/S6 — the names view: band inset 6, fill 40 %, line inset 3 at +5 ¢", () => {
    renderNames({ leadTarget: { runIndex: 2 }, meter: { toleranceCents: 10, heldFraction: 0.4, reading: { cents: 5, verdict: "in-tune" } } });
    const columns = screen.getAllByTestId("names-column");
    const band = within(columns[2]!).getByTestId("note-meter-band");
    expect(band.style.left).toBe("6px"); expect(band.style.right).toBe("6px"); expect(band.style.height).toBe("20%");
    expect(within(columns[2]!).getByTestId("note-meter-fill").style.width).toBe("40%");
    const line = within(columns[2]!).getByTestId("note-meter-line");
    expect(line.style.left).toBe("3px"); expect(line.style.right).toBe("3px"); expect(line.style.top).toBe("45%");
    expect(screen.getAllByTestId("note-meter-band")).toHaveLength(1);
    expect(columns[2]!.style.background).not.toBe("transparent");
  });
  test("practice.session/REQ-017/S1 (names) — silent: the column highlighted, the band, no line", () => {
    renderNames({ leadTarget: { runIndex: 0 }, meter: { toleranceCents: 10, heldFraction: 0, reading: null } });
    const columns = screen.getAllByTestId("names-column");
    expect(within(columns[0]!).getByTestId("note-meter-band")).toBeTruthy();
    expect(screen.queryByTestId("note-meter-line")).toBeNull();
    expect(columns.slice(1).every((c) => within(c).getByTestId("column-name").style.opacity === "0.4")).toBe(true);
  });
  ```
  (`renderNames(extra)` is a local helper spreading `extra` over the file's base props — the C major scale, direction ↑↓, degrees on, `soundingPitchClass` null, taps off.)
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` — expect FAIL: no band in any column.
- [ ] 3. GREEN — as Produces; `App` passes `leadTarget` and `meter` (null unless `lead.phase === "listening" && settings.lead.cueMeter`).
- [ ] 4. Run `pnpm vitest run tests/ui` — PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/names-view.test.tsx` → all passed; `design_snapshot.py … live` → `practice--holding.png` in the names view matches phone 05 switched to names.

### T016 · practice.session/REQ-020, practice.session/REQ-018 · The Traversal sheet rebuilt: fixed rows with hints, Who leads with ✕, the three mode rows, the hairline, switches

**Status:** todo

**Files**
- Create: `src/ui/Switch.tsx`
- Modify: `src/ui/TraversalSheet.tsx` (rebuilt), `src/ui/theme.ts` (`sheetRow` metrics), `src/ui/App.tsx:895-910` (props)
- Test: `tests/ui/scenarios/traversal-sheet-lead.test.tsx`, `tests/ui/scenarios/traversal-sheet.test.tsx` (the title-row assertion removed; the toggle-pill assertions become switch assertions)

**Interfaces**
- Consumes: `holdHintOf`, `toleranceHintOf`, `cuesHintOf`, `whoHintOf`, `LeadSettings`, `Who`, `HoldBeats`, `Tolerance` (T001); the existing `Row`, pills, `onTraversal`, `onSettings` (TraversalSheet.tsx today).
- Produces:
  ```ts
  // theme.ts
  export const sheetRow = { height: 62, paddingX: 18, labelSize: 13, hintSize: 11, hintLineHeight: 14, hintBoxHeight: 28, pillPadding: "9px 10px 10px", pillRadius: 10, pillSize: 12.5, switchWidth: 36, switchHeight: 20, knob: 14, knobInset: 3, knobOnLeft: 19, closeSize: 28, hairline: paper.borderSoft } as const;
  // Switch.tsx
  export function Switch(props: { readonly on: boolean; readonly onToggle: () => void; readonly label: string }): JSX.Element;   // role="switch", aria-checked, aria-label; track paper.accent on / paper.trackOff off; knob paper.card at left 3 / 19
  // TraversalSheet: rows in order, each data-testid="sheet-row" with data-row="who-leads" | "sound" | "count-in" | "rest-bar" | "hold" | "in-tune" | "cues" | "direction" | "octaves" | "shape" | "loop", height 62, box-sizing border-box, padding 0 18, border-bottom 1px paper.hairlineSoft;
  //   left: the label (13/600) over data-testid="row-hint" (11 / line-height 14 / height 28 / -webkit-line-clamp 2 / paper.muted); right: the control
  //   no title row; data-testid="sheet-close" (✕, 28 px circle, border paper.border) at the right of the who-leads row
  //   who-leads: pills "play along" | "I lead" (selected bg paper.pillActive ink paper.inkMid; unselected transparent ink #756c60 — promote to paper.pillInk if not a token yet, and say so)
  //   settings.lead.who === "tool": sound (pills notes / both / metronome), count-in (Switch), rest-bar (Switch); "me": hold (pills "1" "2" "4", fonts.mono 12, min-width 26), in-tune (pills lenient / medium / accurate), cues (two toggle pills meter / tone, each independently selected)
  //   data-testid="sheet-hairline": 1 px paper.borderSoft, margin-top −1, between the mode rows and direction
  //   direction / octaves / shape: the existing pills unchanged; loop: Switch
  //   hints: who-leads whoHintOf(who); sound "What it plays for you"; count-in "A bar of clicks before it starts"; rest-bar "A bar's rest before each loop"; hold holdHintOf(holdBeats, tempoBpm); in-tune toleranceHintOf(tolerance); cues cuesHintOf(cueMeter, cueTone); direction "Up, down, or up and back"; octaves "How far the run goes"; shape "Every note, or 1 3 5"; loop "Start again at the end"
  // props: + readonly tempoBpm: number (for the hold hint); onSettings carries the lead block as part of SessionSettings
  ```

**Steps**
- [ ] 1. RED — `tests/ui/scenarios/traversal-sheet-lead.test.tsx` (`renderLeadApp`, `storedCMajor`, `STORAGE_KEY` from `lead-app-helpers.tsx`; `within` from Testing Library):
  ```tsx
  test("practice.session/REQ-020/S1 — play along's rows", async () => {
    const app = renderLeadApp();
    await openSheet(app);
    expect(rows()).toEqual(["who-leads", "sound", "count-in", "rest-bar", "direction", "octaves", "shape", "loop"]);
    expect(screen.queryByText("Traversal")).toBeNull();
    expect(screen.getByTestId("sheet-close").closest("[data-row]")!.getAttribute("data-row")).toBe("who-leads");
    expect(hintOf("who-leads")).toBe("It plays, you follow");
    expect(screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px")).toBe(true);
    expect(screen.getByTestId("sheet-hairline").previousElementSibling!.getAttribute("data-row")).toBe("rest-bar");
  });
  test("practice.session/REQ-020/S2 — I lead's rows", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }, { session: { ...storedCMajor().session, tempoBpm: 120 } }));
    await openSheet(app);
    expect(rows()).toEqual(["who-leads", "hold", "in-tune", "cues", "direction", "octaves", "shape", "loop"]);
    expect(["who-leads", "hold", "in-tune", "cues", "direction", "octaves", "shape", "loop"].map(hintOf)).toEqual([
      "It listens, you play", "Beats in tune, then the next · 1.0 s", "Within 10% of the way to the next note", "Shows sharp or flat on the note",
      "Up, down, or up and back", "How far the run goes", "Every note, or 1 3 5", "Start again at the end",
    ]);
    expect(pillSelected("hold", "2")).toBe(true); expect(pillSelected("in-tune", "medium")).toBe(true);
    expect(pillSelected("cues", "meter")).toBe(true); expect(pillSelected("cues", "tone")).toBe(false);
  });
  test("practice.session/REQ-020/S3 — nothing moves under the finger", async () => {
    const app = renderLeadApp();
    await openSheet(app);
    const before = rows(); const closeBefore = screen.getByTestId("sheet-close");
    await app.user.click(pill("who-leads", "I lead"));
    const after = rows();
    expect(after.slice(0, 1)).toEqual(before.slice(0, 1)); expect(after.slice(4)).toEqual(before.slice(4)); expect(after.length).toBe(before.length);
    expect(after.slice(1, 4)).toEqual(["hold", "in-tune", "cues"]);
    expect(screen.getByTestId("sheet-close")).toBe(closeBefore);                    // the same element, not re-mounted
    expect(screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px")).toBe(true);
    await app.user.click(pill("who-leads", "play along"));
    expect(rows()).toEqual(before);
  });
  test("practice.session/REQ-020/S4 — the hints follow the settings", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await openSheet(app);
    await app.user.click(pill("hold", "1")); expect(hintOf("hold")).toBe("Beats in tune, then the next · 0.6 s");
    await app.user.click(pill("hold", "2")); expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.3 s");
    await app.user.click(pill("hold", "4")); expect(hintOf("hold")).toBe("Beats in tune, then the next · 2.5 s");
    await app.user.click(pill("in-tune", "lenient")); expect(hintOf("in-tune")).toBe("Within 15% of the way to the next note");
    await app.user.click(pill("in-tune", "accurate")); expect(hintOf("in-tune")).toBe("Within 5% of the way to the next note");
    await app.user.click(pill("hold", "2"));
    await app.user.click(screen.getByTestId("sheet-close"));
    for (let i = 0; i < 12; i += 1) await app.user.click(screen.getByText("+"));           // 96 → 120
    await openSheet(app);
    expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.0 s");
  });
  test("practice.session/REQ-018/S5 (sheet) — the Cues hint follows the pills", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await openSheet(app);
    await app.user.click(pill("cues", "tone")); expect(hintOf("cues")).toBe("Sharp/flat on the note · a tone per note");
    await app.user.click(pill("cues", "meter")); expect(hintOf("cues")).toBe("A short tone as each note comes up");
    await app.user.click(pill("cues", "tone")); expect(hintOf("cues")).toBe("Just the note highlight");
  });
  test("practice.session/REQ-020/S5 — the shared rows still do what they did", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me" }));
    await openSheet(app);
    expect(within(row("octaves")).getAllByRole("button").map((b) => b.textContent)).toEqual(["1 oct", "2 oct", "3 oct", "full"]);
    await app.user.click(pill("octaves", "2 oct"));
    expect(screen.getByText("↑↓ · 2 oct · scale · loop")).toBeTruthy();
  });
  test("practice.session/REQ-020 — the switches", async () => {
    const app = renderLeadApp();
    await openSheet(app);
    const countIn = within(row("count-in")).getByRole("switch");
    expect(countIn.getAttribute("aria-checked")).toBe("true");
    await app.user.click(countIn);
    expect(countIn.getAttribute("aria-checked")).toBe("false");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).session.countIn).toBe(false);
    const loop = within(row("loop")).getByRole("switch");
    await app.user.click(loop);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).session.loop).toBe(false);
  });
  ```
  Local helpers at the top of the file: `openSheet(app)` clicks the summary row's "edit ›"; `rows()` = `screen.getAllByTestId("sheet-row").map((r) => r.dataset.row)`; `row(name)` = `screen.getAllByTestId("sheet-row").find((r) => r.dataset.row === name)!`; `hintOf(name)` = `within(row(name)).getByTestId("row-hint").textContent`; `pill(name, label)` = `within(row(name)).getByText(label)`; `pillSelected(name, label)` = `pill(name, label).style.background === "rgb(231, 220, 198)"` (`paper.pillActive` `#e7dcc6`). Every pill is a `<button type="button">` so `getAllByRole("button")` lists them.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/traversal-sheet-lead.test.tsx` — expect FAIL: `sheet-row` not found.
- [ ] 3. GREEN — as Produces; update `traversal-sheet.test.tsx` for the removed title and the switches (keep every behavioural assertion).
- [ ] 4. Run `pnpm vitest run tests/ui` — PASS. `pnpm check` — green (`check-design.sh`: the row metrics are tokens).
- [ ] 5. REFACTOR — `Row` takes `label`, `hint`, `control` and `trailing` (the ✕) so every row is one call.

**Verify** — `pnpm vitest run tests/ui/scenarios/traversal-sheet-lead.test.tsx` → all passed; `design_snapshot.py … live` → `practice--sheet-play-along.png` and `practice--sheet-i-lead.png` match phones 09 and 10 in structure, the same number of rows and the ✕ in the first.

### T017 · practice.session/REQ-011 · The app restores and stores the lead settings

**Status:** todo

**Files**
- Modify: `src/ui/App.tsx` (the stored `session.lead` → `createSession`'s settings; every `setSettings` writes `session.lead` back through the store)
- Test: `tests/ui/scenarios/selection-persistence.test.tsx` (extend)

**Interfaces**
- Consumes: T004's store, T005's session, T012/T016's controls.
- Produces: on start `createSession(…, { ...stored.session })` includes `lead`; `handleSessionSettings` writes the whole `SessionSettings` including `lead` to the store (the existing write path, now carrying `lead`); the app never calls `start()` on load.

**Steps**
- [ ] 1. RED — append to `selection-persistence.test.tsx`:
  ```tsx
  test("practice.session/REQ-011/S1 — back where it was, in I lead", async () => {
    const app = renderLeadApp(storedCMajor({ who: "me", holdBeats: 4, tolerance: "accurate", cueMeter: false, cueTone: true }, {
      keyId: "E-naturalMinor", traversal: { direction: "down", octaves: 2, shape: "arpeggio" }, scale: { major: "major", minor: "dorian" },
      session: { ...storedCMajor().session, soundMode: "metronome", loop: false, countIn: false, restBar: true, tempoBpm: 132 },
    }));
    expect(screen.getByText("Allegro")).toBeTruthy();
    expect(screen.getByTestId("position-caption").textContent).toBe("hold 4 beats · accurate tuning");
    expect(screen.getByTestId("mode-word-me").style.color).toBe("rgb(28, 25, 22)");
    expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
    expect(app.listening.startCalls).toBe(0);
    await openSheet(app);
    expect(pillSelected("hold", "4")).toBe(true); expect(pillSelected("in-tune", "accurate")).toBe(true);
    expect(pillSelected("cues", "tone")).toBe(true); expect(pillSelected("cues", "meter")).toBe(false);
  });
  test("practice.session/REQ-011/S2 — first run: play along, the lead defaults behind the sheet", async () => {
    localStorage.clear();
    const fakes = sessionDepsWithFakes();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={fakes.sessionDeps} />);
    const user = userEvent.setup();
    expect(screen.getByTestId("mode-word-tool").style.color).toBe("rgb(28, 25, 22)");
    expect(screen.getByTestId("start-circle").textContent).toContain("▶");
    await user.click(screen.getByTestId("mode-word-me"));
    expect(screen.getByTestId("position-caption").textContent).toBe("hold 2 beats · medium tuning");
    await user.click(screen.getByText("edit ›"));
    expect(pillSelected("hold", "2")).toBe(true); expect(pillSelected("in-tune", "medium")).toBe(true); expect(pillSelected("cues", "meter")).toBe(true);
  });
  test("practice.session/REQ-011/S5 — stored state from 007", async () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5Document));            // the file's existing v5 fixture: ↓ 2 oct arpeggio, 132 bpm, Dorian, drone octave 5
    const fakes = sessionDepsWithFakes();
    render(<App catalogue={builtInCatalogue()} selectionStore={localStorageSelectionStore(localStorage)} sessionDeps={fakes.sessionDeps} />);
    expect(screen.getByText("132")).toBeTruthy();
    expect(screen.getByTestId("mode-word-tool").style.color).toBe("rgb(28, 25, 22)");
    await userEvent.setup().click(screen.getByTestId("mode-word-me"));
    expect(screen.getByTestId("position-caption").textContent).toBe("hold 2 beats · medium tuning");
  });
  test("practice.session/REQ-011 — a mode or hold change is stored", async () => {
    const app = renderLeadApp();
    await app.user.click(screen.getByTestId("mode-word-me"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).session.lead.who).toBe("me");
    await openSheet(app);
    await app.user.click(pill("hold", "4"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).session.lead).toEqual({ who: "me", holdBeats: 4, tolerance: "medium", cueMeter: true, cueTone: false });
  });
  ```
  (`openSheet`, `pill`, `pillSelected` as `traversal-sheet-lead.test.tsx` defines them — move those three into `lead-app-helpers.tsx` in this task and import them in both files.)
  Extend the existing S3/S4 tests' expectations with the lead defaults.
- [ ] 2. Run `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` — expect FAIL: the restored session has the default lead block.
- [ ] 3. GREEN — as Produces.
- [ ] 4. Run `pnpm vitest run tests/ui` — PASS. `pnpm check` — green.
- [ ] 5. REFACTOR — none.

**Verify** — `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` → all passed.

## Phase 4 — The harness and hardening

### T018 · — · Extract the microphone-feeding harness helpers into `scripts/harness-lib.mjs`

**Status:** todo

**Files**
- Create: `scripts/harness-lib.mjs`
- Modify: `scripts/tuner-timing-test.mjs:82-204, 610-800` (import from the lib; delete the moved bodies)

**Interfaces**
- Produces:
  ```js
  // scripts/harness-lib.mjs
  export function positionsE2ToC7()                       // moved verbatim
  export function noteLabelOfPosition(position)           // moved verbatim
  export function isDevServerUp(), waitForDevServer(deadline), ensureDevServer(), stopDevServer(child)   // moved verbatim
  export function installMicrophoneOverride()             // moved verbatim — the page.addInitScript body
  export function maxOf(values), minOf(values), paintAgeMaxOf(values), printTable(rows)   // moved verbatim
  export const APP_URL                                    // the same env-or-default the tuner harness reads today
  ```

**Steps**
- [ ] 1. Move each named function into `harness-lib.mjs` unchanged; import them in `tuner-timing-test.mjs`; delete the originals.
- [ ] 2. Run `node --check scripts/harness-lib.mjs scripts/tuner-timing-test.mjs` — no output.
- [ ] 3. Run `pnpm test:tuner` — expect the same five rows and `test:tuner: PASS …` as `AGENTS.md` shows (the numbers vary; the columns, labels and the PASS line do not).
- [ ] 4. `pnpm check` — green (ESLint covers `scripts/*.mjs`).

**Verify** — `pnpm test:tuner` → ends `test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise`.

### T019 · practice.session/REQ-021, practice.session/REQ-018, practice.session/REQ-016 · `pnpm test:lead` — the measured lead run

**Status:** todo

**Files**
- Create: `scripts/lead-timing-test.mjs`
- Modify: `package.json:16-18` (`"test:lead": "node scripts/lead-timing-test.mjs"`), `src/ui/App.tsx` (the `onPaintAge` hook also fires for a committed lead reading — the same `useLayoutEffect` → `session.readingShown(atFrame)` path the tuner uses, now keyed on `lead.reading?.atFrame` while leading)
- Test: the script is the test.

**Interfaces**
- Consumes: `harness-lib.mjs` (T018); `window.__session` (`setSettings`, `start`, `stop`, `snapshot`, `onNoteJudged`, `onTargetAdvanced`), `window.__listening` (`currentFrame`, `sampleRate`), the `onPaintAge` dev hook (main.tsx) — all existing.
- Produces: the script —
  ```
  1. ensureDevServer(); launch Chromium (playwright, as the tuner harness); addInitScript(installMicrophoneOverride)
  2. in the page: __session.setSettings({ ...snapshot().settings, lead: { who: "me", holdBeats: 2, tolerance: "medium", cueMeter: true, cueTone: false } }); select C major, flute Concert, ↑↓ 1 oct through __session.setContext/setTraversal; subscribe onNoteJudged → push { atFrame, cents, verdict, arrivedAtFrame: __listening.currentFrame() }, onTargetAdvanced → push { position, atFrame, shownAtFrame: <the frame when snapshot().lead.target.position changed, polled by a requestAnimationFrame loop> }; paint ages from the onPaintAge hook
  3. __session.start(); the oscillator script (the override's source) for each of the 15 targets: 300 ms silence → the target's pitch at −30 ¢ ramping exponentially to −2 ¢ over 650 ms → steady until the advance (poll snapshot().lead.target.position) → on target 4 only: a drift to −16 ¢ for 400 ms then back; record each tone's onset frame (the frame at which the oscillator's frequency was set and the gain opened)
  4. practice.session/REQ-021/S1 (and REQ-016/S1's timing) — per tone: first readout = first NoteJudged.atFrame ≥ onset → (its arrivedAtFrame − onset) / sampleRate × 1000 ≤ 100; arrival age max over all readings ≤ 100; readings/s ≥ 20 over any steady 1 s; per advance: expected = the first NoteJudged (in tune, after the last out-of-tune one) at which accumulated in-tune time ≥ 1250 ms, computed from the recorded readings; actual = TargetAdvanced.atFrame; (actual − expected) within [0, 512] frames; shown lateness = (shownAtFrame − actual) / sampleRate × 1000 ≤ 100
  5. practice.session/REQ-018/S3 (measured) — the tone cue case: cueTone true, holdBeats 1, tempo 150; at each advance the script itself plays a 400 ms tone at the new target's pitch into the stream (the speaker bleed), then silence 300 ms, then the learner's tone; assert no NoteJudged with atFrame inside [advance, advance + 400 + 100 ms + release] and heldFraction 0 at the window's end
  6. print rows: `case  targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  advance lateness max (frames)  shown lateness max (ms)  status` for "lead run C4–C5" and "tone cue fed back"; then `test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone` or FAIL with the failing cell named; exit 1 on FAIL
  ```

**Steps**
- [ ] 1. Write the script per Produces, reusing the tuner harness's `measureInPage` shape (one `page.evaluate` with the whole timeline in the page, returning plain data).
- [ ] 2. Add the `onPaintAge` keying for the lead reading in `App.tsx`; `pnpm vitest run tests/ui` — green.
- [ ] 3. Run `pnpm test:lead` — expect the two rows and the PASS line. If the advance lateness exceeds 512 frames, print the offending advance's readings around it before failing (the plan's risk: a dropped late reading) — and report it; do not loosen the gate.
- [ ] 4. `pnpm check` — green. Paste the healthy output into `AGENTS.md` under the `pnpm test:lead` comment, the way `test:tuner`'s is.

**Verify** — `pnpm test:lead` → ends `test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone`; `grep -c "test:lead: PASS" AGENTS.md` → `1`.

### T020 [P] · — · `design-shots` points at the eleven states; `design_snapshot.py live` reaches them

**Status:** todo

**Files**
- Modify: `scripts/design-shots.mjs` (`PROTOTYPE_PATH` → `changes/008-learner-leads/design/Learner Leads Final.dc.html`, the state list `#s01`…`#s10`, the live-app driver for each state: the mode words, the start circle, the sheet, and — for 03–07 — the microphone override feeding the state's tone), `scripts/design_snapshot.py` (the `live` state list for this change: the twelve Interface rows, each reached as the proposal's Route column says)

**Steps**
- [ ] 1. Point the prototype path and the state list at the canvas; map each Interface row to its driver.
- [ ] 2. Run `pnpm design:shots` — twelve pairs of PNGs under `changes/008-learner-leads/design/rounds/shots/` (prototype vs live).
- [ ] 3. Run `python3 scripts/design_snapshot.py changes/008-learner-leads live --base http://localhost:5173` — one PNG per Interface row.
- [ ] 4. Read every PNG; list in `notes.md` any structural miss (an element missing, out of order, a state unreachable) as a task for the implementer before the design loop starts — a structural miss is a bug, not taste.

**Verify** — `ls changes/008-learner-leads/design/rounds/shots/ | wc -l` → `24`; `notes.md` lists the structural findings (or "none").

### T021 · — · Hardening: every edge-case row, the three measured budgets, the hygiene scripts

**Status:** todo

**Files**
- Test: `tests/practice/scenarios/lead-edge-cases.test.ts`

**Steps**
- [ ] 1. RED → GREEN, one test per row of the proposal's edge-case table not already covered by a scenario above, named after the row: "the circle tapped while already leading is a no-op" (`start()` twice → `startCalls` 1, position unchanged); "■ twice" (`stop()` twice → `stopCalls` 1); "a key with no notes in range in play along" (▶ does nothing — the existing behaviour, asserted alongside REQ-015/S8); "stored settings unreadable → defaults" (store test exists — cite it); "a reading with no confidence is never published" (listening's own scenario — cite it).
- [ ] 2. `pnpm check` — green; paste the last eight lines into the report.
- [ ] 3. `pnpm test:timing` — PASS (practice.session/REQ-021/S3; the transport is untouched — the same laptop-headroom reading as 007 if `vs audible` misses by under 1 ms once: rerun once, report both).
- [ ] 4. `pnpm test:tuner` — PASS (the tuner's pipeline shares `onPitchDetected`; prove it unchanged).
- [ ] 5. `pnpm test:lead` — PASS.
- [ ] 6. `./scripts/check-contexts.sh` and `./scripts/check-design.sh --change changes/008-learner-leads` — clean; `./scripts/check-scenarios.sh changes/008-learner-leads` — every scenario ID attributed.

**Verify** — `pnpm check` → `Test Files  N passed (N)` / `test result: ok.`; the three harnesses' PASS lines; `check-scenarios.sh` → no gaps.

### T022 · — · `AGENTS.md` is real; converge

**Status:** todo

**Files**
- Modify: `AGENTS.md` (Commands: the `test:lead` output pasted at T019; Architecture: the practice paragraph gains "a lead run (the hold rule as a pure reducer over timestamped judgements; the Session owns it beside the transport, the drone and the tuner)"; Conventions: `tests/practice/lead-helpers.ts` beside `tuner-helpers.ts`), `changes/008-learner-leads/notes.md` (every departure a task reported, the tokens promoted)

**Steps**
- [ ] 1. Update the three sections; `grep -c 'FILL THIS IN' AGENTS.md` → `0`.
- [ ] 2. `pnpm check` — green.
- [ ] 3. Hand to `sdd-design` D (the refinement loop on the live app, the eleven states on the phone — practice.session/REQ-021/S4 is the user's walk there: `pnpm dev:phone`, I lead, C major up and down, the user signs off) and then `sdd-converge`.

**Verify** — `grep -c "test:lead" AGENTS.md` → `≥ 3`; `sdd-converge` reports Converged, or its gaps are appended here as T023+.

## Coverage

> Every `REQ-` in the spec appears at least once. Every task cites a
> requirement or sits in Foundations / Hardening.

| Requirement | Tasks | Covered |
|---|---|---|
| practice.session/REQ-014 (the mode) | T005, T012 | ✅ |
| practice.session/REQ-015 (a lead run) | T002, T005, T007, T008, T013 | ✅ |
| practice.session/REQ-016 (the judgement and the hold) | T001, T002, T003, T006, T019 | ✅ |
| practice.session/REQ-017 (the meter and the card) | T002, T006, T011, T013, T014, T015 | ✅ |
| practice.session/REQ-018 (cues) | T001, T011, T014, T016, T019 | ✅ |
| practice.session/REQ-019 (changes while leading) | T010, T014 | ✅ |
| practice.session/REQ-020 (the Traversal sheet) | T001, T016 | ✅ |
| practice.session/REQ-021 (the budget) | T006, T019, T021 | ✅ |
| practice.session/REQ-022 (no microphone) | T009, T013 | ✅ |
| practice.session/REQ-002 (play and stop — modified) | T005, T012 | ✅ |
| practice.session/REQ-009 (hidden; awake — modified) | T009 | ✅ |
| practice.session/REQ-011 (remembered — modified) | T001, T004, T017 | ✅ |
| practice.session/REQ-013 (tapped note — modified) | T008 | ✅ |

Scenario IDs by task — REQ-014: S1 S2 S3 S4 (T005), S1 S2 (card, T012), S5 (T005 via `session-transport`); REQ-015: S1 S2 S8 (T005), S3 S4 (T002, T007), S5 S7 (T008), S6 (T008 `never-both`), S1 S3 (card, T013); REQ-016: S1–S4 S7–S9 (T002, T006), S5 (T001, T006), S6 (T003); REQ-017: S1 (T006, T013, T014, T015), S2 S3 S5 (T013, T014), S4 (T011, T013), S6 (T014, T015), S7 (T006), S8 (T014); REQ-018: S1 (T011, T014), S2 S3 S4 (T011), S3 measured (T019), S5 (T001, T016); REQ-019: S1–S5 (T010), S2 (meter, T014); REQ-020: S1–S5 (T016), S4 (T001); REQ-021: S1 (T019), S2 (T006), S3 (T021), S4 (the user's walk at the design loop); REQ-022: S1–S4 (T009), S1 (card, T013); REQ-002: S1 S2 S5 (T012), S3 S4 (unchanged tests, T005); REQ-009: S1 (unchanged), S2 S3 (T009); REQ-011: S1 S2 S5 (T004, T017), S3 S4 (T017 extends); REQ-013: S1–S4 S6 (unchanged), S5 S7 (T008).

## Interface consistency

> Signatures a later task *consumes* match what an earlier task *produces*,
> character for character. List each pair.

| Produced by | Signature | Consumed by |
|---|---|---|
| T001 | `TOLERANCE_CENTS`, `requiredHoldMs(beats: HoldBeats, tempoBpm: number): number`, `LeadSettings`, `defaultLeadSettings` | T002, T003, T004, T005, T006, T016 |
| T001 | `verdictOf(cents: number, bandCents?: number): Verdict` | T006 |
| T001 | `holdHintOf`, `toleranceHintOf`, `cuesHintOf`, `whoHintOf` | T016 |
| T002 | `applyJudgement(phase, judged, atMs, settings, tempoBpm, sequence, loop): { phase; advanced }`, `applySilence(phase)`, `heldFractionOf(hold, requiredMs)`, `targetAt(sequence, position)`, `emptyHold`, `LeadPhase`, `LeadTarget` | T003, T005, T006, T007 |
| T002 | `LEAD_GAP_MS`, `CUE_TONE_MS`, `CUE_TAIL_MS`, `HELD_TICK_MS` | T006, T011 |
| T004 | `lead.holdFill` (theme.ts); stored v6 `session.lead` | T014, T017 |
| T005 | `SessionSnapshot.lead: LeadSnapshot`; `start()`/`stop()`/`setSettings` dispatch; `tests/practice/lead-helpers.ts` (`leadFixture`, `leadSettings`, `startLead`, `hearAt`, `hearSteady`, `holdThrough`, `letGapPass`, `HOP_MS`, `frameOfMs`) | T006–T017 |
| T006 | `snapshot.lead.reading`, `snapshot.lead.heldFraction`; `NoteJudged`/`TargetAdvanced` from a lead run | T007–T015, T019 |
| T011 | `snapshot.lead.justHeld`; the cue voice | T013 |
| T012 | `onWho`, `data-testid` `mode-word-tool` / `mode-word-me` / `start-circle` / `tuner-glyph` / `transport-card` | T013, T016, T017 |
| T014 | `NoteMeter({ geometry, toleranceCents, heldFraction, reading })`, `MeterGeometry`; `StaveView` `leadTarget` / `onTargetBox`; `noteMeter` tokens | T015 |
| T016 | `sheet-row` / `row-hint` / `sheet-close` / `sheet-hairline` test ids; `Switch` | T017 |
| T018 | `scripts/harness-lib.mjs` exports | T019 |

## Deferred

- The tone cue's acoustic tail on the phone (`CUE_TAIL_MS` = 100) and the 0.4 s "held ✓" — tuned in the design loop on the device, not here (intent: still open).
- A `requestAnimationFrame`-throttled fill (30 Hz) — only if `test:lead`'s paint-age column shows the per-reading fill update costing paint on the phone (plan risk).
- Promoting `#756c60` (the unselected pill ink the sheet already uses) to a token — T016 says so if `check-design.sh` warns; otherwise it stays as the shipped sheet has it.
