import { createSoundEngine } from "../../sound/published";
import type { SoundEngine } from "../../sound/published";
import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";

// The real SoundPort — practice.session/REQ-002, REQ-005, REQ-010. The
// AudioContext is created only inside start() (never before the first ▶ —
// REQ-010/S2) and handed to sound/published's synthesiser; a failed load is
// reported as a Result rather than thrown, so the session can carry on with
// a notice instead of crashing. `context()` exposes the AudioContext for
// T018's timing harness only — nothing in this module's own contract needs
// it.
export function webAudioSound(
  createContext: () => AudioContext,
): SoundPort & { context(): AudioContext | null } {
  let audioContext: AudioContext | null = null;
  let engine: SoundEngine | null = null;
  const listeners = new Set<(report: OnsetReport) => void>();

  async function start(): Promise<Result<void, SoundUnavailable>> {
    const context = createContext();
    audioContext = context;
    await context.resume();
    const outcome = await createSoundEngine(context);
    if (!outcome.ok) {
      return { ok: false, error: outcome.error };
    }
    engine = outcome.engine;
    engine.onOnset((report) => {
      for (const listener of listeners) listener(report);
    });
    return { ok: true, value: undefined };
  }

  return {
    start,
    sampleRate: () => engine?.sampleRate ?? 0,
    currentFrame: () => engine?.currentFrame() ?? 0,
    post: (command: SoundCommand) => engine?.post(command),
    onOnset: (listener: (report: OnsetReport) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    context: () => audioContext,
  };
}
