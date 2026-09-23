import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";

// The SoundPort main.tsx actually wires up — practice.session/REQ-010. Try
// the real engine first; if it cannot start — whether it resolves
// `{ ok: false }` or throws (T025) — hand every later call (sampleRate,
// currentFrame, post, onOnset, dispose) to the silent fallback so the run
// still shows, while still returning the real engine's failure so the
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
    // `webAudioSound.start()` never throws (it turns every failure it knows
    // about into a `Result`), but this composite is also handed whatever
    // primary a caller supplies — a throwing primary counts as failed just
    // as a `{ ok: false }` one does (REQ-010, T025), rather than rejecting
    // and leaving the session's own last-resort catch as the only backstop.
    let result: Result<void, SoundUnavailable>;
    try {
      result = await primary.start();
    } catch (cause) {
      result = {
        ok: false,
        error: { reason: "no-audio-context", detail: String(cause) },
      };
    }
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
    outputLatencyMs: () => active.outputLatencyMs(),
    post: (command: SoundCommand) => active.post(command),
    onOnset: (listener: (report: OnsetReport) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    context: () => active.context?.() ?? null,
    // Disposes both ports, not just the active one — if primary.start()
    // created (and resumed) an AudioContext before failing later (e.g. at
    // createEngine()), the fallback becomes active but the primary's
    // context is still open; disposing only `active` would leak it (a
    // narrow recurrence of W1). Each adapter's dispose() is safe to call
    // even when it acquired nothing (webAudioSound: null checks;
    // silentSound: stopAll() on an empty map).
    dispose: () => {
      primary.dispose();
      fallback.dispose();
    },
  };
}
