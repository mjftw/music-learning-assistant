// T027 (W6) — sound-boundary problems (a Zod-rejected command, a full
// 64-voice pool, a malformed onset report) reach the operator via
// console.warn, logged once per distinct reason with its detail
// (docs/engineering.md §11: "errors logged once with full context at the
// boundary where they are handled") rather than swallowed or repeated once
// per occurrence.

import { afterEach, expect, test, vi } from "vitest";
import { webAudioSound } from "../../../src/practice/adapters/web-audio-sound";
import type {
  SoundEngine,
  SoundEngineOutcome,
  SoundProblem,
} from "../../../src/sound/published";

// webAudioSound only calls resume()/close() and reads currentTime/sampleRate
// on the AudioContext it's given; AudioContext itself is a browser-only type
// unavailable under Vitest's default (non-browser) environment, so a tiny
// object literal cast stands in for it at this test boundary
// (docs/engineering.md §3 permits an unchecked cast with a comment saying
// why).
function fakeAudioContext(): AudioContext {
  return {
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
    currentTime: 0,
    sampleRate: 48000,
  } as unknown as AudioContext;
}

// A fake SoundEngine whose `emitProblem` lets the test raise a problem on
// demand, standing in for a real engine forwarding a worklet's `problem`
// message or its own onset-report validation failure.
class FakeEngine implements SoundEngine {
  readonly sampleRate = 48000;
  private readonly problemListeners = new Set<
    (problem: SoundProblem) => void
  >();

  currentFrame(): number {
    return 0;
  }

  post(): void {}

  onOnset(): () => void {
    return () => {};
  }

  onProblem(listener: (problem: SoundProblem) => void): () => void {
    this.problemListeners.add(listener);
    return () => this.problemListeners.delete(listener);
  }

  dispose(): void {}

  emitProblem(problem: SoundProblem): void {
    for (const listener of this.problemListeners) listener(problem);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("T027 (W6) — a problem reaches console.warn exactly once per distinct reason", async () => {
  const engine = new FakeEngine();
  const createEngine = (): Promise<SoundEngineOutcome> =>
    Promise.resolve({ ok: true, engine });
  const sound = webAudioSound(fakeAudioContext, createEngine);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  await sound.start();

  engine.emitProblem({ reason: "invalid-command", detail: "bad shape #1" });
  engine.emitProblem({ reason: "invalid-command", detail: "bad shape #2" });
  engine.emitProblem({ reason: "voice-pool-full", detail: "tone dropped" });

  expect(warn).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining("invalid-command"),
    expect.stringContaining("bad shape #1"),
  );
  expect(warn).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining("voice-pool-full"),
    expect.stringContaining("tone dropped"),
  );
});
