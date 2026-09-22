// practice.session/REQ-010 — the composite SoundPort main.tsx wires: try the
// real engine first, and if it cannot start, hand every later call to the
// silent fallback (so the run still shows) while still reporting the real
// engine's failure so the session raises its notice.

import { expect, test } from "vitest";
import { fallbackSound } from "../../../src/practice/adapters/fallback-sound";
import type { OnsetReport } from "../../../src/sound/published/sound-command.schema";
import { FakeSound } from "../fakes";

test("practice.session/REQ-010 — primary fails: start() reports the failure, post/currentFrame/onOnset reach the fallback", async () => {
  const primary = new FakeSound();
  primary.failWith = { reason: "worklet-failed", detail: "" };
  const fallback = new FakeSound();
  const sound = fallbackSound(primary, fallback);

  const events: OnsetReport[] = [];
  sound.onOnset((report) => events.push(report));

  const result = await sound.start();

  expect(result).toEqual({ ok: false, error: primary.failWith });
  expect(primary.startCalls).toBe(1);
  expect(fallback.startCalls).toBe(1);

  sound.post({ kind: "click", tag: 7, accent: false, onsetFrame: 480 });
  expect(fallback.posted).toEqual([
    { kind: "click", tag: 7, accent: false, onsetFrame: 480 },
  ]);
  expect(primary.posted).toEqual([]);

  fallback.frame = 480;
  expect(sound.currentFrame()).toBe(480);

  fallback.fireOnset(7);
  expect(events).toEqual([{ tag: 7, onsetFrame: 480, actualFrame: 480 }]);
});
