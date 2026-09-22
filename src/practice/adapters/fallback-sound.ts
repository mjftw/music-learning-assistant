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
//
// `context()` is dev-only usage for T018's timing harness (`window.__sound`,
// main.tsx) — nothing in this module's own contract needs it. It forwards to
// whichever port is currently active; `silentSound` (the REQ-010 fallback)
// has none, so the intersection keeps it optional on the inputs while the
// return always exposes it, same as `webAudioSound`.
export function fallbackSound(
  primary: SoundPort & { context?(): AudioContext | null },
  fallback: SoundPort & { context?(): AudioContext | null },
): SoundPort & { context(): AudioContext | null } {
  let active: SoundPort & { context?(): AudioContext | null } = primary;
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
    context: () => active.context?.() ?? null,
  };
}
