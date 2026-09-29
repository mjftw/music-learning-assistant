// T005 — the practice-side ListeningPort adapter over listening/published's
// createListener: memoises the AudioContext factory, calls the injected
// `create` (defaulting to createListener) exactly once on the first
// start(), and maps its ListenerOutcome straight onto the port's Result
// (web-audio-problems.test.ts's fake-AudioContext pattern for webAudioSound
// is the model here).

import { expect, test, vi } from "vitest";
import { webAudioListening } from "../../../src/practice/adapters/web-audio-listening";

test("webAudioListening creates the listener once on the first start and maps outcomes to Results", async () => {
  const fakeListener = {
    start: vi.fn(() => Promise.resolve({ ok: true } as const)),
    stop: vi.fn(),
    currentFrame: () => 42,
    sampleRate: () => 48000,
    onPitch: () => () => {},
    onEnded: () => () => {},
    onProblem: () => () => {},
    dispose: vi.fn(),
  };
  const create = vi.fn(() =>
    Promise.resolve({ ok: true, listener: fakeListener } as const),
  );
  const contexts: object[] = [];
  const port = webAudioListening(() => {
    const c = { resume: () => Promise.resolve() } as unknown as AudioContext;
    contexts.push(c);
    return c;
  }, create);
  expect(await port.start()).toEqual({ ok: true, value: undefined });
  expect(await port.start()).toEqual({ ok: true, value: undefined });
  expect(create).toHaveBeenCalledTimes(1);
  expect(port.currentFrame()).toBe(42);
  port.stop();
  expect(fakeListener.stop).toHaveBeenCalledTimes(1);
});

test("webAudioListening reports a failed createListener as the port's error", async () => {
  const port = webAudioListening(
    () => ({ resume: () => Promise.resolve() }) as unknown as AudioContext,
    () =>
      Promise.resolve({
        ok: false,
        error: { reason: "wasm-failed", detail: "x" },
      } as const),
  );
  expect(await port.start()).toEqual({
    ok: false,
    error: { reason: "wasm-failed", detail: "x" },
  });
});
