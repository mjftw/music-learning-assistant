import { expect, test } from "vitest";
import type { Session } from "../../../src/practice/published";
import { sessionOn } from "../fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

// practice.tuner/REQ-009 — enters the tuner and drives it past both of
// enterTuner()'s awaits (wakeLock.acquire(), then listening.start()), the
// same "two flushes" shape tuner-reading.test.ts uses.
async function enter(session: Session): Promise<void> {
  session.enterTuner();
  await flush();
  await flush();
}

test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(74);
  f.session.leaveTuner();
  await enter(f.session);
  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
  expect(f.session.snapshot().tuner.targetNote).toBeNull();
});
