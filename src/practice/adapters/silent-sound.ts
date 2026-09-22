import type {
  OnsetReport,
  SoundCommand,
} from "../../sound/published/sound-command.schema";
import type { SoundPort } from "../ports/sound";

const SAMPLE_RATE = 48000;
const FRAMES_PER_MS = SAMPLE_RATE / 1000;

// The port the silent run plays on when sound cannot start —
// practice.session/REQ-010. It makes no audio but mirrors the real engine's
// frame clock (48 kHz, driven by the injected `now()` in ms) closely enough
// that a posted tone or click still reports its onset at the scheduled
// frame, via setTimeout, so the caption, progress and highlight keep moving
// in time.
export function silentSound(now: () => number): SoundPort {
  const listeners = new Set<(report: OnsetReport) => void>();
  const pending = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 0;

  function currentFrame(): number {
    return now() * FRAMES_PER_MS;
  }

  function stopAll(): void {
    for (const timeoutId of pending.values()) clearTimeout(timeoutId);
    pending.clear();
  }

  function post(command: SoundCommand): void {
    if (command.kind === "stopAll") {
      stopAll();
      return;
    }
    const { tag, onsetFrame } = command;
    const delayMs = Math.max(0, (onsetFrame - currentFrame()) / FRAMES_PER_MS);
    const id = nextId;
    nextId += 1;
    const timeoutId = setTimeout(() => {
      pending.delete(id);
      const report: OnsetReport = { tag, onsetFrame, actualFrame: onsetFrame };
      for (const listener of listeners) listener(report);
    }, delayMs);
    pending.set(id, timeoutId);
  }

  return {
    start: () => Promise.resolve({ ok: true, value: undefined }),
    sampleRate: () => SAMPLE_RATE,
    currentFrame,
    post,
    onOnset: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
