import { createSoundEngine } from "../../sound/published";
import type {
  SoundEngine,
  SoundEngineOutcome,
  SoundProblem,
} from "../../sound/published";
import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type { Result } from "../ports/result";
import type { SoundPort } from "../ports/sound";

// The real SoundPort — practice.session/REQ-002, REQ-005, REQ-010. The
// AudioContext is created only inside start() (never before the first ▶ —
// REQ-010/S2), once for the life of the session (T024) — later start()
// calls (each ❚❚ → ▶ cycle) only resume it — and handed to sound/published's
// synthesiser; a failed load is reported as a Result rather than thrown, so
// the session can carry on with a notice instead of crashing (REQ-010).
// `createSoundEngine` already turns its own known failure modes (the WASM
// compile, the worklet's `addModule`) into a `Result`, never a throw — the
// try/catches below are a backstop for whatever it and `createContext`/
// `resume()` do not: a browser or environment that throws synchronously
// (a disallowed `AudioContext`, a worklet node construction failure, and
// so on — T025). `context()` exposes the AudioContext for T018's timing
// harness only — nothing in this module's own contract needs it.
// `createEngine` defaults to the real `createSoundEngine` and is only ever
// overridden by tests (T027, `tests/practice/scenarios/web-audio-problems
// .test.ts`), which inject a fake engine to drive `onProblem` without a
// real `AudioContext`/worklet.
export function webAudioSound(
  createContext: () => AudioContext,
  createEngine: (
    context: AudioContext,
  ) => Promise<SoundEngineOutcome> = createSoundEngine,
): SoundPort & { context(): AudioContext | null } {
  let audioContext: AudioContext | null = null;
  let engine: SoundEngine | null = null;
  const listeners = new Set<(report: OnsetReport) => void>();
  // Sound-boundary problems (T027, W6) are surfaced once per distinct
  // reason, not once per occurrence — the reason already told the operator
  // everything the detail of a repeat would (docs/engineering.md §11:
  // "errors logged once with full context at the boundary").
  const warnedReasons = new Set<SoundProblem["reason"]>();

  function warnOnce(problem: SoundProblem): void {
    if (warnedReasons.has(problem.reason)) return;
    warnedReasons.add(problem.reason);
    console.warn(`sound: ${problem.reason}`, problem.detail);
  }

  async function start(): Promise<Result<void, SoundUnavailable>> {
    try {
      if (audioContext === null) {
        audioContext = createContext();
      }
      await audioContext.resume();
    } catch (cause) {
      return {
        ok: false,
        error: { reason: "no-audio-context", detail: String(cause) },
      };
    }

    if (engine === null) {
      let outcome: SoundEngineOutcome;
      try {
        outcome = await createEngine(audioContext);
      } catch (cause) {
        return {
          ok: false,
          error: { reason: "worklet-failed", detail: String(cause) },
        };
      }
      if (!outcome.ok) {
        return { ok: false, error: outcome.error };
      }
      engine = outcome.engine;
      engine.onOnset((report) => {
        for (const listener of listeners) listener(report);
      });
      engine.onProblem(warnOnce);
    }
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
    dispose: () => {
      engine?.dispose();
      audioContext
        ?.close()
        .catch((cause) => console.warn("sound: context close failed", cause));
      engine = null;
      audioContext = null;
    },
  };
}
