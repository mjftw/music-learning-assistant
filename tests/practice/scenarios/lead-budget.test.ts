import { expect, test } from "vitest";
import type { NoteJudged } from "../../../src/practice/published";
import { leadFixture, startLead } from "../lead-helpers";

test("practice.session/REQ-021/S2 — late is dropped", async () => {
  const f = leadFixture();
  await startLead(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.listening.frame = 48000;
  f.listening.feed(262.5, 48000 - 4801);
  f.clock.advanceMs(1); // 100.02 ms old → dropped
  expect(judged).toEqual([]);
  expect(f.session.snapshot().lead.reading).toBeNull();
  f.listening.feed(262.5, 48000 - 4800);
  f.clock.advanceMs(1); // exactly 100 ms → judged
  expect(judged).toHaveLength(1);
});
test("practice.session/REQ-021/S2 — a burst coalesces for the display but every reading counts for the hold", async () => {
  const f = leadFixture();
  await startLead(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.listening.frame = 0;
  f.listening.feed(262.5, 0);
  f.listening.feed(262.5, 512);
  f.listening.feed(262.5, 1024);
  f.clock.advanceMs(1);
  expect(judged).toHaveLength(1);
  expect(judged[0]!.atFrame).toBe(1024);
  expect(f.session.snapshot().lead.heldFraction).toBeCloseTo(
    1024 / 48 / 1250,
    3,
  ); // 21.3 ms of 1250 — both gaps counted
  f.listening.frame = 1536;
  f.listening.feed(262.5, 1536);
  f.listening.feed(285.0, 2048);
  f.listening.feed(262.5, 2560); // the middle one is 150 ¢ sharp → a jump, as detected
  f.clock.advanceMs(1);
  expect(judged).toHaveLength(2);
  expect(judged[1]!.atFrame).toBe(2560);
  expect(f.session.snapshot().lead.heldFraction).toBe(0); // the coalesced-away sharp reading still reset the hold
});
