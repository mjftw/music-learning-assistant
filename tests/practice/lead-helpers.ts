// Shared helpers for the "I lead" scenario tests (practice.session/REQ-014+)
// — driving a lead run through the published Session interface only, never
// its internals (docs/engineering.md §7).

import type { Session, SessionSettings } from "../../src/practice/published";
import { defaultSessionSettings } from "../../src/practice/published";
import { pitchHzOf } from "../../src/theory/published";
import type { Traversal } from "../../src/theory/published";
import type { SessionFixture } from "./fakes";
import { sessionOn } from "./fakes";

export const oneOctaveUpdown: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 1 },
  shape: "scale",
};

export const SAMPLE_RATE = 48000;
export const HOP_MS = 512_000 / SAMPLE_RATE; // 10.667 ms — the detector's hop
export const frameOfMs = (ms: number): number =>
  Math.round((ms * SAMPLE_RATE) / 1000);

export function leadSettings(
  overrides: Partial<SessionSettings["lead"]> = {},
  base: SessionSettings = defaultSessionSettings,
): SessionSettings {
  return { ...base, lead: { ...base.lead, who: "me", ...overrides } };
}

/** C major on flute Concert, ↑↓ 1 oct — 15 notes · C4–C5 — in I lead. */
export function leadFixture(
  settings: SessionSettings = leadSettings(),
): SessionFixture {
  return sessionOn("C", "flute-concert", oneOctaveUpdown, settings);
}

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** start() with who = "me", driven past wakeLock.acquire() and listening.start(). */
export async function startLead(session: Session): Promise<void> {
  session.start();
  await flush();
  await flush();
}

/** One detection at `atMs` on the listening clock (age 0), committed. */
export function hearAt(f: SessionFixture, hz: number, atMs: number): void {
  f.listening.frame = frameOfMs(atMs);
  f.listening.feed(hz, f.listening.frame);
  f.clock.advanceMs(1);
}

/** A steady tone from `fromMs` to `toMs`, one reading per hop. Returns the ms of the last reading. */
export function hearSteady(
  f: SessionFixture,
  hz: number,
  fromMs: number,
  toMs: number,
): number {
  let t = fromMs;
  for (; t <= toMs; t += HOP_MS) hearAt(f, hz, t);
  return t - HOP_MS;
}

/** Silence: lets the 300 ms gap timer fire. */
export function letGapPass(f: SessionFixture): void {
  f.clock.advanceMs(300);
}

/**
 * Holds `targets` targets in turn from `fromMs` — each the target's own pitch
 * for 1300 ms (enough for 2 beats at 96 bpm, 1250 ms) then 300 ms of silence
 * (the gap) — and returns the ms at which the next tone may start.
 */
export function holdThrough(
  f: SessionFixture,
  targets: number,
  fromMs = 0,
): number {
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
