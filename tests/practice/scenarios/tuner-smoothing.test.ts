import { expect, test } from "vitest";
import type { NoteJudged } from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { sessionOn } from "../fakes";
import { enter, hear, hearSteady } from "../tuner-helpers";

test("practice.tuner/REQ-002/S6 — a steady note does not flicker", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0); // Given: A4 is shown
  let previous = f.session.snapshot().tuner.reading!.cents;
  for (let i = 0; i < 20; i += 1) {
    hear(f, i % 2 === 0 ? 440.0 : 441.5);
    const cents = f.session.snapshot().tuner.reading!.cents;
    expect(Math.abs(cents - previous)).toBeLessThanOrEqual(1);
    previous = cents;
  }
  expect(previous).toBeGreaterThanOrEqual(2);
  expect(previous).toBeLessThanOrEqual(4);
});

test("practice.tuner/REQ-002/S7 — a new note is shown at once", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hearSteady(f, 440.0); // Given: A4 has settled at 440.0 Hz
  hear(f, 466.16);
  const snapped = f.session.snapshot().tuner.reading!;
  expect(noteLabel(snapped.target)).toBe("A♯4");
  expect(snapped.cents).toBe(0); // no creep towards it
  hear(f, 467.5); // +5 ¢ off A♯4 — wobble, not a jump
  const wobbled = f.session.snapshot().tuner.reading!;
  expect(noteLabel(wobbled.target)).toBe("A♯4");
  expect(wobbled.cents).toBeLessThan(5);
});

test("practice.tuner/REQ-002/S8 — the first reading is as detected", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 445.0);
  const reading = f.session.snapshot().tuner.reading!;
  expect(noteLabel(reading.target)).toBe("A4");
  expect(reading.cents).toBe(20);
});

test("practice.tuner/REQ-002 — the first reading after the target changes is as detected", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hearSteady(f, 440.0); // Given: A4 is shown and settled
  hear(f, 441.5); // a small nudge, smoothed
  f.session.holdTarget(); // pins A4, the note already shown
  hear(f, 445.0); // next reading
  const snapped = f.session.snapshot().tuner.reading!;
  expect(snapped.cents).toBe(20); // shown at once, not crept towards
});

test("practice.tuner/REQ-002 — the heard note follows the smoothed pitch, the heard frequency is as detected", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  hearSteady(f, 440.0); // Given: A4 is shown and settled
  hear(f, 441.5); // a small nudge
  const last = judged[judged.length - 1]!;
  expect(last.heard.hz).toBeCloseTo(441.5, 3);
  expect(last.heard.cents).toBeLessThan(3); // smoothed
  expect(last.cents).toBe(last.heard.cents); // on auto the target is the heard note
});
