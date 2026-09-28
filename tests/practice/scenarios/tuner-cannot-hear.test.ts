import { expect, test } from "vitest";
import { sessionOn } from "../fakes";
import { enter, hear } from "../tuner-helpers";

test("practice.tuner/REQ-007/S1 — refused", async () => {
  const f = sessionOn("G", "flute-concert");
  f.listening.failWith = "refused";
  await enter(f.session);
  expect(f.session.snapshot().tuner).toMatchObject({
    active: true,
    listening: { kind: "cannot-hear", reason: "refused" },
    reading: null,
  });
  f.listening.feed(440.0);
  f.clock.advanceMs(1);
  expect(f.session.snapshot().tuner.reading).toBeNull();
});

test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
  const f = sessionOn("G", "flute-concert");
  f.listening.failWith = "refused";
  await enter(f.session);
  f.session.leaveTuner();
  f.listening.failWith = null;
  await enter(f.session);
  expect(f.listening.startCalls).toBe(2);
  expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
});

test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0);
  f.listening.end();
  expect(f.session.snapshot().tuner.listening).toEqual({
    kind: "cannot-hear",
    reason: "failed",
  });
  expect(f.session.snapshot().tuner.reading).toBeNull();
});
