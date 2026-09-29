// Dedicated, readable tests for two rows of the proposal's edge-case table
// — both are already exhaustively covered as instances of
// practice.tuner/REQ-001/S3's invariant ("at no instant is a sequence
// note, a click, the drone or a tapped note sounding" from every named way
// in, including "counting" and "a tapped note sounding") by
// tests/practice/invariants/never-both.test.ts's enumeration, but the
// proposal calls them out by name and a reader should be able to find each
// one as its own test rather than only inside the enumeration's sequences.
//
// The third row, "the pitch sits on a boundary", is covered by
// practice.tuner/REQ-002/S4 (tests/practice/scenarios/tuner-reading.test.ts)
// already — cited here, no new test.
// practice.tuner/REQ-002/S4

import { expect, test } from "vitest";
import { isClick, isDrone, isStop, isTone, sessionOn } from "../fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

test("practice.tuner/REQ-001/S3 — entering while counting in silences the count-in", async () => {
  const { session, sound } = sessionOn("G", "flute-concert");
  session.start();
  await flush();
  await flush();
  expect(session.snapshot().transport.kind).toBe("countingIn");

  session.enterTuner();
  await flush();
  await flush();

  expect(sound.stopAllCalls).toBeGreaterThanOrEqual(1);
  expect(session.snapshot().transport.kind).toBe("idle");
  expect(session.snapshot().tuner.active).toBe(true);
});

test("practice.tuner/REQ-001/S3 — a tapped note sounding when the tuner is entered", async () => {
  const { session, sound } = sessionOn("G", "flute-concert");
  session.tapNote(0);
  await flush();
  await flush();
  const tapped = sound.posted.filter(isTone)[0]!;
  expect(tapped.tag).toBeGreaterThanOrEqual(2_000_000);

  const postedBefore = sound.posts.length;
  session.enterTuner();
  await flush();
  await flush();

  expect(
    sound.posts
      .slice(postedBefore)
      .some((p) => isStop(p.command) && p.command.tag === tapped.tag),
  ).toBe(true);
  expect(
    sound.posts
      .slice(postedBefore)
      .filter(
        (p) => isTone(p.command) || isClick(p.command) || isDrone(p.command),
      ),
  ).toEqual([]);
});
