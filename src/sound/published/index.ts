/// <reference types="vite/client" />
import wasmUrl from "../pkg/sound.wasm?url";
import processorUrl from "./processor.ts?worker&url";
import {
  onsetReportSchema,
  type OnsetReport,
  type SoundCommand,
  type SoundUnavailable,
} from "./sound-command.schema";

export interface SoundEngine {
  readonly sampleRate: number;
  currentFrame(): number;
  post(command: SoundCommand): void;
  onOnset(listener: (report: OnsetReport) => void): () => void;
  onProblem(listener: (problem: SoundProblem) => void): () => void;
  dispose(): void;
}

// A boundary failure that does not stop playback but should not be
// swallowed either (docs/engineering.md §11, §15 "never silently swallow a
// recoverable failure"): a command the worklet's Zod schema rejected, a
// voice dropped because the 64-voice pool was full, or an onset report the
// host could not parse. `web-audio-sound.ts` is the adapter that turns
// these into a `console.warn`.
export type SoundProblem = {
  readonly reason:
    "invalid-command" | "voice-pool-full" | "invalid-onset-report";
  readonly detail: string;
};

export type SoundEngineOutcome =
  | { readonly ok: true; readonly engine: SoundEngine }
  | { readonly ok: false; readonly error: SoundUnavailable };

/// Loads the synthesiser worklet and the compiled WASM module, wires them
/// together on an `AudioWorkletNode`, and returns a `SoundEngine` — or, if
/// either load fails, the reason why.
export async function createSoundEngine(
  context: AudioContext,
): Promise<SoundEngineOutcome> {
  let module: WebAssembly.Module;
  try {
    module = await WebAssembly.compileStreaming(fetch(wasmUrl));
  } catch (cause) {
    return {
      ok: false,
      error: { reason: "wasm-failed", detail: String(cause) },
    };
  }

  try {
    await context.audioWorklet.addModule(processorUrl);
  } catch (cause) {
    return {
      ok: false,
      error: { reason: "worklet-failed", detail: String(cause) },
    };
  }

  const node = new AudioWorkletNode(context, "sound", {
    processorOptions: { module },
    outputChannelCount: [1],
  });
  node.connect(context.destination);

  const listeners = new Set<(report: OnsetReport) => void>();
  const problemListeners = new Set<(problem: SoundProblem) => void>();
  const notifyProblem = (problem: SoundProblem): void => {
    for (const listener of problemListeners) listener(problem);
  };

  node.port.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (data === null || typeof data !== "object") {
      return;
    }
    const type = (data as { type?: unknown }).type;

    if (type === "problem") {
      const reason = (data as { reason?: unknown }).reason;
      const detail = (data as { detail?: unknown }).detail;
      if (
        (reason === "invalid-command" || reason === "voice-pool-full") &&
        typeof detail === "string"
      ) {
        notifyProblem({ reason, detail });
      }
      return;
    }

    if (type !== "onset") {
      return;
    }
    const reports = (data as { reports?: unknown }).reports;
    if (!Array.isArray(reports)) {
      return;
    }
    for (const candidate of reports) {
      const parsed = onsetReportSchema.safeParse(candidate);
      if (!parsed.success) {
        notifyProblem({
          reason: "invalid-onset-report",
          detail: parsed.error.message,
        });
        continue;
      }
      for (const listener of listeners) {
        listener(parsed.data);
      }
    }
  };

  const engine: SoundEngine = {
    sampleRate: context.sampleRate,
    currentFrame: () => Math.round(context.currentTime * context.sampleRate),
    post: (command) => node.port.postMessage(command),
    onOnset: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onProblem: (listener) => {
      problemListeners.add(listener);
      return () => problemListeners.delete(listener);
    },
    dispose: () => {
      node.disconnect();
      node.port.onmessage = null;
      listeners.clear();
      problemListeners.clear();
    },
  };

  return { ok: true, engine };
}
