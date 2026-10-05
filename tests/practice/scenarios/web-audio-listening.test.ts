// T005 — the practice-side ListeningPort adapter over listening/published's
// createListener: memoises the AudioContext factory, calls the injected
// `create` (defaulting to createListener) exactly once on the first
// start(), and maps its ListenerOutcome straight onto the port's Result
// (web-audio-problems.test.ts's fake-AudioContext pattern for webAudioSound
// is the model here).

import { expect, test, vi } from "vitest";
import type { ListenerOutcome } from "../../../src/listening/published";
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

// listening.pitch-detection/REQ-001/S3 — the first microphone request is
// still building the listener when a second one arrives (start, stop, start):
// both must end up on the one listener, so a stop reaches whichever opened.
test("listening.pitch-detection/REQ-001/S3 — two requests while the listener is still being built never leave one open out of reach", async () => {
  const listeners: { open: boolean }[] = [];
  const answers: (() => void)[] = [];
  const create = (): Promise<ListenerOutcome> =>
    new Promise<ListenerOutcome>((resolve) => {
      const state = { open: false };
      listeners.push(state);
      const listener = {
        start: () => {
          state.open = true;
          return Promise.resolve({ ok: true } as const);
        },
        stop: () => {
          state.open = false;
        },
        currentFrame: () => 0,
        sampleRate: () => 48000,
        onPitch: () => () => {},
        onEnded: () => () => {},
        onProblem: () => () => {},
        dispose: () => {},
      };
      answers.push(() => resolve({ ok: true, listener }));
    });
  const port = webAudioListening(
    () => ({ resume: () => Promise.resolve() }) as unknown as AudioContext,
    create,
  );

  const a = port.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  port.stop();
  const b = port.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (const answer of answers) answer();
  await Promise.all([a, b]);

  port.stop();
  expect(listeners.filter((l) => l.open)).toEqual([]);
});
