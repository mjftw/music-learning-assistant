import { expect, test } from "vitest";
import type { NoteJudged, Session } from "../../../src/practice/published";
import { sessionOn } from "../fakes";

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

test("practice.tuner/REQ-006/S2 — late is dropped", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.listening.frame = 48000;
  f.listening.feed(445.0, 48000 - 4801);
  f.clock.advanceMs(1); // 100.02 ms old → dropped
  expect(judged).toEqual([]);
  expect(f.session.snapshot().tuner.reading).toBeNull();
  f.listening.feed(445.0, 48000 - 4800);
  f.clock.advanceMs(1); // exactly 100 ms → shown
  expect(judged).toHaveLength(1);
});

test("listening.pitch-detection/REQ-004/S3 — a burst before the commit is coalesced to the newest", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.listening.feed(440.0);
  f.listening.feed(441.0);
  f.listening.feed(442.0);
  f.clock.advanceMs(1);
  expect(judged).toHaveLength(1);
  expect(judged[0]!.cents).toBe(8);
});

test("practice.tuner/REQ-006 — readingShown reports the age at paint", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.listening.frame = 9600;
  f.listening.feed(440.0, 9600);
  f.clock.advanceMs(1);
  f.listening.frame = 9600 + 960;
  expect(f.session.readingShown(9600)).toBe(20);
});
