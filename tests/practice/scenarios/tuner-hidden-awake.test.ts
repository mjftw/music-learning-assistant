import { expect, test } from "vitest";
import { sessionOn } from "../fakes";
import { enter, hear } from "../tuner-helpers";

const flush = () => new Promise((r) => setTimeout(r, 0));

test("practice.tuner/REQ-008/S1 — hidden means deaf, shown means listening", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0);
  f.visibility.hide();
  expect(f.listening.stopCalls).toBe(1);
  expect(f.session.snapshot().tuner.reading).toBeNull();
  expect(f.session.snapshot().tuner.active).toBe(true);
  f.listening.feed(440.0);
  f.clock.advanceMs(1);
  expect(f.session.snapshot().tuner.reading).toBeNull();
  f.visibility.show();
  await flush();
  await flush();
  expect(f.listening.startCalls).toBe(2);
  expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
  hear(f, 445.0);
  expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
});

test("listening.pitch-detection/REQ-005/S1 — hidden means deaf (the port is stopped)", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.visibility.hide();
  expect(f.listening.listening).toBe(false);
});

test("listening.pitch-detection/REQ-005/S2 — shown again means listening again, without a new request from the tuner's side", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.visibility.hide();
  f.visibility.show();
  await flush();
  await flush();
  expect(f.listening.listening).toBe(true);
  expect(f.listening.startCalls).toBe(2); // the platform remembers the grant; the port asks again, no prompt is shown
});

test("practice.tuner/REQ-008/S2 — the phone on the stand stays lit", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  expect(f.wake.acquired).toBe(true);
  f.session.leaveTuner();
  expect(f.wake.acquired).toBe(false);
});

test("practice.tuner/REQ-008 — shown while not on the tuner starts nothing", async () => {
  const f = sessionOn("G", "flute-concert");
  f.visibility.show();
  await flush();
  expect(f.listening.startCalls).toBe(0);
});

test("practice.tuner/REQ-008 — a hide while the microphone cannot be used does not ask for it again on show", async () => {
  const f = sessionOn("G", "flute-concert");
  f.listening.failWith = "refused";
  await enter(f.session);
  expect(f.session.snapshot().tuner.listening).toEqual({
    kind: "cannot-hear",
    reason: "refused",
  });
  f.visibility.hide();
  f.visibility.show();
  await flush();
  await flush();
  expect(f.listening.startCalls).toBe(1);
  expect(f.session.snapshot().tuner.listening).toEqual({
    kind: "cannot-hear",
    reason: "refused",
  });
});
