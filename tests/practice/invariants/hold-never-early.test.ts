// practice.session/REQ-016/S6 — the target never advances early, across
// every tolerance (lenient | medium | accurate), every Hold (1 | 2 | 4) and
// every tempo 40..200 step 2, fed a deterministic family of timelines of
// in-tune, out-of-tune and silent events. The reducer under test is T002's
// `applyJudgement`/`applySilence` (`src/practice/domain/lead.ts`); a failure
// here means the reducer is wrong, never this oracle.

import { expect, test } from "vitest";
import {
  applyJudgement,
  applySilence,
  emptyHold,
  requiredHoldMs,
  targetAt,
  TOLERANCE_CENTS,
  defaultLeadSettings,
} from "../../../src/practice/published";
import type {
  HoldBeats,
  LeadPhase,
  NoteJudged,
  Tolerance,
} from "../../../src/practice/published";
import { sessionOn } from "../fakes";

const seq = sessionOn("C", "flute-concert", {
  direction: "updown",
  octaves: { kind: "count", count: 1 },
  shape: "scale",
}).session.snapshot().sequence;
const target = targetAt(seq, 1).note;
const judged = (cents: number, verdict: NoteJudged["verdict"]): NoteJudged => ({
  target,
  cents,
  verdict,
  heard: { hz: 262.5, nearest: target, cents },
  atFrame: 0,
});

test("practice.session/REQ-016/S6 — the target advances only at ≥ beats × 60000 / tempo ms in tune, never otherwise", () => {
  // Timed at ~21s for 24 timelines per setting, ~11s for the brief's
  // fallback of 12 (both over the 10 s budget on this machine) — reduced
  // further to 8, which measures comfortably under 10 s and still checks
  // well over 1,000,000 events; given an explicit per-test timeout, the
  // same shape as the exhaustive invariant test in
  // target-in-sequence.test.ts.
  const TIMELINES_PER_SETTING = 8;
  let seed = 42;
  const next = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let checked = 0;
  for (const tolerance of ["lenient", "medium", "accurate"] as Tolerance[])
    for (const holdBeats of [1, 2, 4] as HoldBeats[])
      for (let tempo = 40; tempo <= 200; tempo += 2) {
        const settings = {
          ...defaultLeadSettings,
          who: "me" as const,
          tolerance,
          holdBeats,
        };
        const required = requiredHoldMs(holdBeats, tempo);
        for (
          let timeline = 0;
          timeline < TIMELINES_PER_SETTING;
          timeline += 1
        ) {
          let phase: LeadPhase = {
            kind: "listening",
            target: targetAt(seq, 1),
            hold: emptyHold,
            mutedUntilMs: null,
          };
          let oracleHeld = 0,
            oracleLast: number | null = null;
          for (let i = 0; i < 600; i += 1) {
            const t = i * 10,
              roll = next();
            if (roll < 0.2) {
              phase = applySilence(phase);
              oracleLast = null;
              continue;
            }
            const inTune = roll < 0.9;
            const cents = inTune
              ? Math.round((next() * 2 - 1) * TOLERANCE_CENTS[tolerance])
              : TOLERANCE_CENTS[tolerance] + 1 + Math.round(next() * 40);
            const r = applyJudgement(
              phase,
              judged(cents, inTune ? "in-tune" : "sharp"),
              t,
              settings,
              tempo,
              seq,
              true,
            );
            if (inTune) {
              oracleHeld += oracleLast === null ? 0 : t - oracleLast;
              oracleLast = t;
            } else {
              oracleHeld = 0;
              oracleLast = null;
            }
            const shouldAdvance = inTune && oracleHeld >= required;
            expect(
              r.advanced,
              `tol ${tolerance} hold ${holdBeats} tempo ${tempo} timeline ${timeline} event ${i}`,
            ).toBe(shouldAdvance);
            if (shouldAdvance) {
              oracleHeld = 0;
              oracleLast = null;
            }
            phase = r.phase;
            checked += 1;
          }
        }
      }
  expect(checked).toBeGreaterThan(1_000_000);
}, 30_000);
