import { createListener } from "../../listening/published";
import type { Listener, ListenerOutcome } from "../../listening/published";
import type {
  ListeningEnded,
  ListeningProblem,
  ListeningUnavailable,
  PitchDetected,
} from "../../listening/published/pitch-detected.schema";
import type { Result } from "../ports/result";
import type { ListeningPort } from "../ports/listening";

// The real ListeningPort — practice.tuner/REQ-001, REQ-002, REQ-006. Takes
// the same memoised `() => AudioContext` factory `webAudioSound` takes
// (main.tsx shares one AudioContext between the two — T014); `create`
// defaults to the real `createListener` and is only ever overridden by
// tests, which inject a fake outcome to drive the port without a real
// AudioContext/worklet (the shape of tests/practice/scenarios/
// web-audio-problems.test.ts for webAudioSound).
//
// `createContext()`/`resume()` are wrapped the way webAudioSound's start()
// wraps them: a backstop for whatever throws synchronously rather than
// resolving a Result. ListeningUnavailable carries no dedicated "no audio
// context" reason (unlike SoundUnavailable), so a resume() failure is
// reported as "failed" — the same bucket REQ-006 uses for the microphone
// failing mid-session, since neither can be told apart from the caller's
// side.
export function webAudioListening(
  createContext: () => AudioContext,
  create: (context: AudioContext) => Promise<ListenerOutcome> = createListener,
): ListeningPort & { context(): AudioContext | null } {
  let audioContext: AudioContext | null = null;
  let listener: Listener | null = null;
  let creating: Promise<ListenerOutcome> | null = null;
  const pitchListeners = new Set<(pitch: PitchDetected) => void>();
  const endedListeners = new Set<(ended: ListeningEnded) => void>();
  // Boundary problems (a malformed pitch report off the worklet's port) are
  // surfaced once per distinct reason, not once per occurrence — mirrors
  // webAudioSound's warnOnce (docs/engineering.md §11).
  const warnedReasons = new Set<ListeningProblem["reason"]>();

  function warnOnce(problem: ListeningProblem): void {
    if (warnedReasons.has(problem.reason)) return;
    warnedReasons.add(problem.reason);
    console.warn(`listening: ${problem.reason}`, problem.detail);
  }

  async function start(): Promise<Result<void, ListeningUnavailable>> {
    try {
      if (audioContext === null) {
        audioContext = createContext();
      }
      await audioContext.resume();
    } catch (cause) {
      return {
        ok: false,
        error: { reason: "failed", detail: String(cause) },
      };
    }

    if (listener === null) {
      // One listener however many requests arrive while it is being built
      // (start, stop, start): a second createListener() would leave the
      // first request's microphone on a listener this port's stop() never
      // reaches (listening.pitch-detection/REQ-001/S3).
      creating ??= create(audioContext);
      let outcome: ListenerOutcome;
      try {
        outcome = await creating;
      } catch (cause) {
        creating = null;
        return {
          ok: false,
          error: { reason: "worklet-failed", detail: String(cause) },
        };
      }
      if (!outcome.ok) {
        creating = null;
        return { ok: false, error: outcome.error };
      }
      if (listener === null) {
        listener = outcome.listener;
        listener.onPitch((pitch) => {
          for (const l of pitchListeners) l(pitch);
        });
        listener.onEnded((ended) => {
          for (const l of endedListeners) l(ended);
        });
        listener.onProblem(warnOnce);
      }
    }

    // The real Listener.start() is what asks for the microphone
    // (idempotent while already listening — listening/published) and must
    // run on every port start(), not only the first: REQ-006/S3 requires a
    // later request to try again after the microphone was refused, absent
    // or failed.
    try {
      const outcome = await listener.start();
      if (!outcome.ok) {
        return { ok: false, error: outcome.error };
      }
    } catch (cause) {
      return {
        ok: false,
        error: { reason: "failed", detail: String(cause) },
      };
    }
    return { ok: true, value: undefined };
  }

  return {
    start,
    stop: () => listener?.stop(),
    currentFrame: () => listener?.currentFrame() ?? 0,
    sampleRate: () => listener?.sampleRate() ?? 0,
    onPitch: (l: (pitch: PitchDetected) => void) => {
      pitchListeners.add(l);
      return () => pitchListeners.delete(l);
    },
    onEnded: (l: (ended: ListeningEnded) => void) => {
      endedListeners.add(l);
      return () => endedListeners.delete(l);
    },
    context: () => audioContext,
  };
}
