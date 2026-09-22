import type { SoundCommand } from "../../sound/published/sound-command.schema";
import type { ClockPort } from "../ports/clock";
import type { SoundPort } from "../ports/sound";

// Runs the transport LOOKAHEAD_MS ahead of the sound engine's current
// frame, polling every POLL_MS — the standard Web Audio look-ahead
// scheduling pattern, so a tab throttled to background timers still posts
// commands with the right onset frame even when it posts them late
// (practice.session/REQ-008).
export const LOOKAHEAD_MS = 200;
export const POLL_MS = 25;

export interface TickPlan {
  readonly commands: readonly SoundCommand[];
  readonly durationFrames: number;
}

export interface LookaheadScheduler {
  start(
    firstOnsetFrame: number,
    next: (onsetFrame: number) => TickPlan | null,
  ): void;
  stop(): void;
}

// every POLL_MS: while nextOnset < currentFrame + LOOKAHEAD_MS·sampleRate/1000
// → plan = next(nextOnset); null → stop; else post each command and
// nextOnset += durationFrames
export function createLookaheadScheduler(
  sound: SoundPort,
  clock: ClockPort,
): LookaheadScheduler {
  let nextOnset = 0;
  let next: ((onsetFrame: number) => TickPlan | null) | null = null;
  let cancelPoll: (() => void) | null = null;

  function horizonFrame(): number {
    return sound.currentFrame() + (LOOKAHEAD_MS * sound.sampleRate()) / 1000;
  }

  function poll(): void {
    if (next === null) return;
    while (nextOnset < horizonFrame()) {
      const plan = next(nextOnset);
      if (plan === null) {
        stop();
        return;
      }
      for (const command of plan.commands) sound.post(command);
      nextOnset += plan.durationFrames;
    }
    cancelPoll = clock.setTimeout(poll, POLL_MS);
  }

  function start(
    firstOnsetFrame: number,
    nextFn: (onsetFrame: number) => TickPlan | null,
  ): void {
    nextOnset = firstOnsetFrame;
    next = nextFn;
    poll();
  }

  function stop(): void {
    next = null;
    cancelPoll?.();
    cancelPoll = null;
  }

  return { start, stop };
}
