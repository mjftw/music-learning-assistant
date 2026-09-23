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

test("practice.session/REQ-010 (T025) — a throwing primary counts as failed, fallback becomes active", async () => {
  const primary = new FakeSound();
  primary.throwOnStart = new Error("boom");
  const fallback = new FakeSound();
  const sound = fallbackSound(primary, fallback);

  const result = await sound.start();

  expect(result.ok).toBe(false);
  expect(primary.startCalls).toBe(1);
  expect(fallback.startCalls).toBe(1);

  sound.post({ kind: "click", tag: 3, accent: false, onsetFrame: 100 });
  expect(fallback.posted).toEqual([
    { kind: "click", tag: 3, accent: false, onsetFrame: 100 },
  ]);
  expect(primary.posted).toEqual([]);
});

// T018 dev-only harness plumbing — main.tsx exposes `window.__sound` (this
// composite port) so the timing test can read `sampleRate()`/`onOnset()`
// and reach the real `AudioContext` behind `context()` (only `webAudioSound`
// has one; `silentSound`, the REQ-010 fallback, does not). No REQ covers
// this directly — it exists to support the REQ-008/REQ-006 measured test —
// so forwarding is proven here rather than through a spec scenario.
test("T018 harness plumbing — context() forwards from whichever port is active", async () => {
  const primaryContext = {} as AudioContext;
  const primary = Object.assign(new FakeSound(), {
    context: () => primaryContext,
  });
  const fallback = new FakeSound();
  const sound = fallbackSound(primary, fallback);

  expect(sound.context()).toBe(primaryContext);

  primary.failWith = { reason: "worklet-failed", detail: "" };
  await sound.start();

  expect(sound.context()).toBeNull();
});
