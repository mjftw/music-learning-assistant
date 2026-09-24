import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultScaleChoice,
} from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import type { Traversal } from "../../../src/theory/published";
import { pitchHzOf } from "../../../src/theory/published";
import { advanceUntil, sessionOn } from "../fakes";

const twoOctArpeggio = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "arpeggio",
} as const;

const GMajorTwoOctaves: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "scale",
};

function isTone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "tone" }> {
  return command.kind === "tone";
}

async function flushStart(
  session: ReturnType<typeof sessionOn>["session"],
): Promise<void> {
  session.start();
  // start() awaits sound.start() then wakeLock.acquire() before it kicks
  // off the scheduler — two microtask flushes are enough with the fakes.
  await Promise.resolve();
  await Promise.resolve();
}

test("practice.session/REQ-012/S3 (session) — arpeggio falls back to scale for a scale the catalogue excludes", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    twoOctArpeggio,
    defaultSessionSettings,
    { ...defaultScaleChoice, major: "major-pentatonic" },
  );
  const snapshot = session.snapshot();
  expect(snapshot.scale.id).toBe("major-pentatonic");
  expect(snapshot.scale.offersArpeggio).toBe(false);
  expect(snapshot.effectiveShape).toBe("scale");
  expect(snapshot.traversal.shape).toBe("arpeggio");
  expect(snapshot.summaryLine).toBe("↑↓ · 2 oct · scale · loop");
  expect(snapshot.caption).toBe("21 notes · G4–G6");
  session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
  expect(session.snapshot().effectiveShape).toBe("arpeggio");
  expect(session.snapshot().summaryLine).toBe("↑↓ · 2 oct · arpeggio · loop");
});

test("practice.session/REQ-001/S5 (session) — the chosen scale follows the ring, each ring keeping its own choice", () => {
  const { session } = sessionOn(
    "Em",
    "flute-concert",
    { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" },
    defaultSessionSettings,
    { major: "lydian", minor: "dorian" },
  );
  expect(session.snapshot().scale.id).toBe("dorian");
  expect(session.snapshot().spelledScale.formulaLine).toBe("1 2 3 4 5 ♯6 7");
  expect(session.snapshot().caption).toBe("8 notes · E4–E5");
});

test("practice.session/REQ-002 — the idle caption's extremes are the run's lowest and highest", () => {
  const { session } = sessionOn(
    "Gm",
    "flute-concert",
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "scale",
    },
    defaultSessionSettings,
    { ...defaultScaleChoice, minor: "melodic-minor-classical" },
  );
  expect(session.snapshot().caption).toBe("15 notes · G4–G5");
});

test("practice.session/REQ-007/S4 — a new scale mid-run", async () => {
  const settings = { ...defaultSessionSettings, tempoBpm: 120 };
  const { session, sound, clock } = sessionOn(
    "G",
    "flute-concert",
    GMajorTwoOctaves,
    settings,
  );

  await flushStart(session);
  // "note 9" (REQ-007/S4's Given) is position 8 — the transport advances
  // on the scheduler's own ticks, independently of any onset.
  advanceUntil(clock, () => {
    const transport = session.snapshot().transport;
    return transport.kind === "playing" && transport.position === 8;
  });

  const tonesBefore = sound.posted.filter(isTone).length;

  session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });

  // "begins from its first note straight away, with no count-in"
  // (REQ-007/S4) — the transport must already read position 0, never
  // countingIn, immediately on the call, not after the next tick.
  expect(session.snapshot().transport).toEqual({
    kind: "playing",
    position: 0,
  });

  advanceUntil(clock, () => sound.posted.filter(isTone).length > tonesBefore);
  const tones = sound.posted.filter(isTone);
  const nextTone = tones[tones.length - 1]!;
  expect(nextTone.hz).toBeCloseTo(
    pitchHzOf({ letter: "G", accidental: "natural", octave: 4 }),
    1,
  );

  // The caption follows the new sequence's first note's own highlight
  // timer, aimed at its audible onset (T031) — 2 oct ↑↓ Lydian on the
  // flute is 29 notes, the same tonic-to-tonic span as G major.
  advanceUntil(clock, () => session.snapshot().soundingPosition === 0);
  expect(session.snapshot().caption).toBe("G4 · 1 of 29");
});
