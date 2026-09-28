import { expect, test } from "vitest";
import type { NoteJudged, Session } from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { sessionOn, type SessionFixture } from "../fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

// practice.tuner/REQ-004 — enters the tuner and drives it past both of
// enterTuner()'s awaits (wakeLock.acquire(), then listening.start()), the
// same "two flushes" shape tuner-reading.test.ts uses, so
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

test("practice.tuner/REQ-004/S1 — Hold", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 445.0);
  f.session.holdTarget();
  expect(f.session.snapshot().tuner.target).toEqual({
    kind: "pinned",
    position: 69,
  });
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A4");
  hear(f, 445.0);
  expect(f.session.snapshot().tuner.reading).toMatchObject({
    cents: 20,
    verdict: "sharp",
  });
  hear(f, 461.0);
  const r = f.session.snapshot().tuner.reading!;
  expect(noteLabel(r.target)).toBe("A4");
  expect(r.cents).toBe(81);
  expect(noteLabel(r.heard.nearest)).toBe("A♯4");
});

test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(74);
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("D5");
  f.session.pinTarget(30);
  expect(f.session.snapshot().tuner.target).toEqual({
    kind: "pinned",
    position: 40,
  });
});

test("practice.tuner/REQ-004/S3 — far from the target", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  const judged: NoteJudged[] = [];
  f.session.onNoteJudged((e) => judged.push(e));
  f.session.pinTarget(69);
  hear(f, 523.25);
  expect(judged.at(-1)).toMatchObject({ cents: 300, verdict: "sharp" });
  expect(noteLabel(judged.at(-1)!.target)).toBe("A4");
  expect(noteLabel(judged.at(-1)!.heard.nearest)).toBe("C5");
});

test("practice.tuner/REQ-004/S4 — a semitone either way", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(69);
  f.session.stepTarget(1);
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A♯4");
  f.session.stepTarget(-1);
  f.session.stepTarget(-1);
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("G♯4");
  f.session.pinTarget(96);
  f.session.stepTarget(1);
  expect(f.session.snapshot().tuner.target).toEqual({
    kind: "pinned",
    position: 96,
  });
  expect(f.session.snapshot().tuner.canStepUp).toBe(false);
  f.session.pinTarget(40);
  f.session.stepTarget(-1);
  expect(f.session.snapshot().tuner.target).toEqual({
    kind: "pinned",
    position: 40,
  });
  expect(f.session.snapshot().tuner.canStepDown).toBe(false);
});

test("practice.tuner/REQ-004/S5 — back to auto", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(74);
  hear(f, 445.0);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("D5");
  f.session.clearTarget();
  hear(f, 445.0);
  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
  expect(f.session.snapshot().tuner.reading).toMatchObject({ cents: 20 });
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("A4");
});

test("practice.tuner/REQ-004 — a spelling change re-spells the pinned target", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(70);
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("A♯4");
  f.session.setContext({ ...f.context, spelling: "flat" });
  expect(noteLabel(f.session.snapshot().tuner.targetNote!)).toBe("B♭4");
  hear(f, 466.16);
  expect(noteLabel(f.session.snapshot().tuner.reading!.target)).toBe("B♭4");
});

test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
  // The sheet is a UI overlay; through the published interface "open" is
  // nothing at all — listening continues across any sequence of target verbs.
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  hear(f, 440.0);
  f.session.pinTarget(74);
  f.session.clearTarget();
  hear(f, 440.0);
  expect(f.listening.stopCalls).toBe(0);
  expect(f.session.snapshot().tuner.listening).toEqual({ kind: "listening" });
});
