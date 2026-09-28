import { expect, test } from "vitest";
import type { NoteJudged, Session } from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
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

test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  hear(f, 445.0);
  const reading = f.session.snapshot().tuner.reading!;
  expect(noteLabel(reading.target)).toBe("A4");
  expect(reading.cents).toBe(20);
  expect(reading.verdict).toBe("sharp");
  expect(judged).toHaveLength(1);
  expect(judged[0]).toMatchObject({ cents: 20, verdict: "sharp" });
});

test("practice.tuner/REQ-002/S2 — in tune", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 441.0);
  expect(f.session.snapshot().tuner.reading).toMatchObject({
    cents: 4,
    verdict: "in-tune",
  });
  hear(f, 442.0);
  expect(f.session.snapshot().tuner.reading).toMatchObject({
    cents: 8,
    verdict: "sharp",
  });
});

test("practice.tuner/REQ-002/S3 — flat, spelled flat", async () => {
  const f = sessionOn("G", "flute-concert");
  f.session.setContext({ ...f.context, spelling: "flat" });
  await enter(f.session);
  hear(f, 461.0);
  const reading = f.session.snapshot().tuner.reading!;
  expect(noteLabel(reading.target)).toBe("B♭4");
  expect(reading.cents).toBe(-19);
  expect(reading.verdict).toBe("flat");
});

test("practice.tuner/REQ-002/S4 — the name holds across the boundary (hysteresis)", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0);
  for (const hz of [452.9, 454.0]) {
    hear(f, hz);
    expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
    expect(f.session.snapshot().tuner.reading!.cents).toBe(50);
  }
  hear(f, 455.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
  expect(f.session.snapshot().tuner.reading!.cents).toBe(-42);
  hear(f, 452.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4"); // 52 ¢ below A♯4: still A♯4
  hear(f, 450.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4"); // 61 ¢ below: handed over
});

test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 466.16);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
  f.session.setContext({ ...f.context, spelling: "flat" });
  hear(f, 466.16);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
});

test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 445.0);
  f.clock.advanceMs(300);
  expect(f.session.snapshot().tuner.reading).toBeNull();
});

test("practice.tuner/REQ-003/S2 — silence with a target", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(69);
  hear(f, 445.0);
  f.clock.advanceMs(300);
  expect(f.session.snapshot().tuner.reading).toBeNull();
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
});

test("practice.tuner/REQ-003/S3 — a breath between notes", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0);
  // hear() already spent 1 ms on the commit tick, so the clock is at t0 + 1
  // here; advancing 298 more reaches t0 + 299, one short of the 300 ms gap.
  f.clock.advanceMs(298);
  expect(f.session.snapshot().tuner.reading).not.toBeNull();
  f.clock.advanceMs(1);
  expect(f.session.snapshot().tuner.reading).toBeNull();
  hear(f, 445.0);
  expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
});
