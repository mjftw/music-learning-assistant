import { expect, test } from "vitest";
import {
  advance,
  defaultSessionSettings,
  startTransport,
  tickOf,
  type Tick,
  type TransportState,
} from "../../../src/practice/published";

test("practice.session/REQ-003/S1 — a bar counted in", () => {
  const settings = {
    ...defaultSessionSettings,
    soundMode: "notes" as const,
    tempoBpm: 120,
  };
  let s = startTransport(settings);
  const ticks: Tick[] = [];
  for (let i = 0; i < 5; i++) {
    ticks.push(tickOf(s, settings));
    s = advance(s, settings, 29);
  }

  expect(ticks.slice(0, 4).map((t) => t.click)).toEqual([
    { accent: true },
    { accent: false },
    { accent: false },
    { accent: false },
  ]);
  expect(ticks.slice(0, 4).every((t) => t.tonePosition === null)).toBe(true);
  const firstNoteTick = ticks[4]!;
  expect(firstNoteTick.tonePosition).toBe(0);
  expect(firstNoteTick.click).toBeNull();
});

test("practice.session/REQ-003/S2 — a rest between loops", () => {
  const settings = {
    ...defaultSessionSettings,
    loop: true,
    restBar: true,
    countIn: false,
  };

  let s: TransportState = advance(
    { kind: "playing", position: 2 },
    settings,
    3,
  );
  expect(s).toEqual({ kind: "resting", beatsLeft: 4 });
  expect(tickOf(s, settings).click).toEqual({ accent: true });

  s = advance(s, settings, 3);
  expect(s).toEqual({ kind: "resting", beatsLeft: 3 });
  expect(tickOf(s, settings).click).toEqual({ accent: false });

  s = advance(s, settings, 3);
  expect(s).toEqual({ kind: "resting", beatsLeft: 2 });
  expect(tickOf(s, settings).click).toEqual({ accent: false });

  s = advance(s, settings, 3);
  expect(s).toEqual({ kind: "resting", beatsLeft: 1 });
  expect(tickOf(s, settings).click).toEqual({ accent: false });

  s = advance(s, settings, 3);
  expect(s).toEqual({ kind: "playing", position: 0 });
});

test("practice.session/REQ-003/S3 — off means straight in", () => {
  const settings = {
    ...defaultSessionSettings,
    countIn: false,
    restBar: false,
    loop: true,
  };

  expect(startTransport(settings)).toEqual({ kind: "playing", position: 0 });
  expect(advance({ kind: "playing", position: 2 }, settings, 3)).toEqual({
    kind: "playing",
    position: 0,
  });

  // practice.session/REQ-002/S3 — once through: with looping off, the last
  // note of the sequence returns the transport to idle.
  const onceSettings = { ...settings, loop: false };
  expect(advance({ kind: "playing", position: 2 }, onceSettings, 3)).toEqual({
    kind: "idle",
  });
});

test("practice.session/REQ-005/S1 — both", () => {
  const settings = {
    ...defaultSessionSettings,
    soundMode: "both" as const,
  };

  for (let position = 0; position < 5; position++) {
    const tick = tickOf({ kind: "playing", position }, settings);
    expect(tick.click).toEqual({ accent: false });
    expect(tick.tonePosition).toBe(position);
  }
});

test("practice.session/REQ-005/S2 — metronome only is a silent walk with a click", () => {
  const settings = {
    ...defaultSessionSettings,
    soundMode: "metronome" as const,
  };
  const state: TransportState = { kind: "playing", position: 1 };

  const tick = tickOf(state, settings);
  expect(tick.click).toEqual({ accent: false });
  expect(tick.tonePosition).toBeNull();
  expect(advance(state, settings, 5)).toEqual({
    kind: "playing",
    position: 2,
  });
});

test("practice.session/REQ-005/S3 — notes only", () => {
  const settings = {
    ...defaultSessionSettings,
    soundMode: "notes" as const,
    countIn: true,
  };

  expect(tickOf({ kind: "countingIn", beatsLeft: 2 }, settings).click).toEqual({
    accent: false,
  });
  expect(tickOf({ kind: "playing", position: 0 }, settings).click).toBeNull();
});
