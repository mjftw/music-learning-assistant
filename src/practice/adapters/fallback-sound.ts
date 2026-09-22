import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";

// The SoundPort main.tsx actually wires up — practice.session/REQ-010. Try
// the real engine first; if it cannot start, hand every later call
// (sampleRate, currentFrame, post, onOnset) to the silent fallback so the
// run still shows, while still returning the real engine's failure so the
// session raises its notice. Both ports' onset reports are subscribed to up
// front, not lazily on the first onOnset call, because the session
// subscribes once at creation, before start() ever runs — a lazy
// subscription would still be bound to the primary after the switch to the
// fallback.
export function fallbackSound(
  primary: SoundPort,
  fallback: SoundPort,
): SoundPort {
  let active: SoundPort = primary;
  const listeners = new Set<(report: OnsetReport) => void>();

  function forwardFrom(port: SoundPort, report: OnsetReport): void {
    if (active !== port) return;
    for (const listener of listeners) listener(report);
  }

  primary.onOnset((report) => forwardFrom(primary, report));
  fallback.onOnset((report) => forwardFrom(fallback, report));

  async function start(): Promise<Result<void, SoundUnavailable>> {
    const result = await primary.start();
    if (result.ok) {
      active = primary;
      return result;
    }
    await fallback.start();
    active = fallback;
    return result;
  }

  return {
    start,
    sampleRate: () => active.sampleRate(),
    currentFrame: () => active.currentFrame(),
    post: (command: SoundCommand) => active.post(command),
    onOnset: (listener: (report: OnsetReport) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
