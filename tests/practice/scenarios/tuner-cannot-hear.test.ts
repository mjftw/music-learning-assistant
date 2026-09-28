import { expect, test } from "vitest";
import type { Session } from "../../../src/practice/published";
import { sessionOn, type SessionFixture } from "../fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
// the same "two flushes" shape tuner-way-in-out.test.ts uses, so
// `listening.listening` is true before a scenario feeds a pitch.
async function enter(session: Session): Promise<void> {
  session.enterTuner();
  await flush();
  await flush();
}

// Feeds a detected pitch and advances the fake clock past the session's
// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
// committed reading is visible in the snapshot right after this returns.
function hear(f: SessionFixture, hz: number): void {
  f.listening.feed(hz);
  f.clock.advanceMs(1);
}

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
