import { expect, test } from "vitest";
import type { NoteJudged } from "../../../src/practice/published";
import { sessionOn } from "../fakes";
import { enter } from "../tuner-helpers";

test("practice.tuner/REQ-006/S2 · listening.pitch-detection/REQ-004/S3 — late is dropped", async () => {
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

test("listening.pitch-detection/REQ-004/S1 — a burst before the commit is coalesced to the newest", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  // practice.tuner/REQ-002's smoothing is always on (T026): three
  // detections of the same steady 442.0 Hz, at three different frames,
  // arrive before the session's commit-on-next-tick timer fires — still
  // only one NoteJudged, carrying the newest (last-fed) detection's frame.
  f.listening.feed(442.0, 0);
  f.listening.feed(442.0, 1);
  f.listening.feed(442.0, 2);
  f.clock.advanceMs(1);
  expect(judged).toHaveLength(1);
  expect(judged[0]!.cents).toBe(8);
  expect(judged[0]!.atFrame).toBe(2);
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
