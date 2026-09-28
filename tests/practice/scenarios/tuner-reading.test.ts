import { expect, test } from "vitest";
import type { NoteJudged } from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { sessionOn } from "../fakes";
import { enter, hear, hearSteady } from "../tuner-helpers";

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
  // practice.tuner/REQ-002's smoothing is always on (T026): 442.0 Hz is
  // less than SNAP_CENTS from 441.0, so a single reading would only creep
  // towards it — settle on the new steady pitch instead.
  hearSteady(f, 442.0);
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
  // practice.tuner/REQ-002's smoothing is always on (T026): each of these
  // is a steady pitch (the scenario itself: "rises steadily through …",
  // "coming back down"), not a single nearby reading, so each is settled
  // before the name/tag is read.
  for (const hz of [452.9, 454.0]) {
    hearSteady(f, hz);
    expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
    expect(f.session.snapshot().tuner.reading!.cents).toBe(50);
  }
  hearSteady(f, 455.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4");
  expect(f.session.snapshot().tuner.reading!.cents).toBe(-42);
  hearSteady(f, 452.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A♯4"); // 52 ¢ below A♯4: still A♯4
  hearSteady(f, 450.0);
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
