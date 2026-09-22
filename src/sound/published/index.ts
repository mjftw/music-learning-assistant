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
  dispose(): void;
}

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
  node.port.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (
      data === null ||
      typeof data !== "object" ||
      (data as { type?: unknown }).type !== "onset"
    ) {
      return;
    }
    const reports = (data as { reports?: unknown }).reports;
    if (!Array.isArray(reports)) {
      return;
    }
    for (const candidate of reports) {
      const parsed = onsetReportSchema.safeParse(candidate);
      if (!parsed.success) {
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
    dispose: () => {
      node.disconnect();
      node.port.onmessage = null;
      listeners.clear();
    },
  };

  return { ok: true, engine };
}
