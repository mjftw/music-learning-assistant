// Shared helpers for the "I lead" scenario tests (practice.session/REQ-014+)
// — driving a lead run through the published Session interface only, never
// its internals (docs/engineering.md §7).

import type {
  Session,
  SessionContext,
  SessionSettings,
} from "../../src/practice/published";
import {
  createSession,
  defaultDroneSettings,
  defaultScaleChoice,
  defaultSessionSettings,
} from "../../src/practice/published";
import { pitchHzOf } from "../../src/theory/published";
import type { Traversal, Variant, VariantId } from "../../src/theory/published";
import type { SessionFixture } from "./fakes";
import {
  FakeClock,
  FakeListening,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
  keyOf,
  sessionOn,
} from "./fakes";

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

// An empty run, shared by practice.session/REQ-015/S8 and the edge-case row
// "a key with no notes in range" — no key/scale/variant combination in the
// built-in catalogue (flute Concert C4–C7, ocarina Alto C A4–F6, ocarina
// Bass C A3–F5 — every one spans at least two octaves) actually leaves a
// key with zero notes in range: an exhaustive search over the twelve
// majors, every scale and every variant (the brief's one-off loop, run and
// deleted — see the T005 implementation report) never found an empty run.
// This synthetic variant's range is a single pitch outside the key's scale,
// which reliably reproduces "no notes of this key in range" without
// touching the real catalogue.
const noNotesVariant: Variant = {
  instrumentId: "test",
  instrumentName: "Test",
  // Test-only id, never a real catalogue entry — a cast is needed since
  // VariantId is a branded string (docs/engineering.md §3).
  variantId: "test-no-notes" as VariantId,
  variantName: "No notes",
  range: {
    lowest: { letter: "C", accidental: "sharp", octave: 4 },
    highest: { letter: "C", accidental: "sharp", octave: 4 },
  },
};

export function sessionWithEmptyRun(settings: SessionSettings): SessionFixture {
  const sound = new FakeSound();
  const clock = new FakeClock(sound);
  const wake = new FakeWakeLock();
  const visibility = new FakeVisibility();
  const listening = new FakeListening();
  const context: SessionContext = {
    key: keyOf("C"),
    variant: noNotesVariant,
    spelling: "sharp",
  };
  const session = createSession(
    context,
    { direction: "up", octaves: { kind: "count", count: 4 }, shape: "scale" },
    defaultScaleChoice,
    settings,
    defaultDroneSettings,
    { sound, clock, wakeLock: wake, visibility, listening },
  );
  return { session, sound, clock, wake, visibility, listening, context };
}
