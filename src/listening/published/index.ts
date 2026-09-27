/// <reference types="vite/client" />
import wasmUrl from "../pkg/listening.wasm?url";
import processorUrl from "./processor.ts?worker&url";
import {
  pitchDetectedSchema,
  type ListeningEnded,
  type ListeningProblem,
  type ListeningUnavailable,
  type PitchDetected,
} from "./pitch-detected.schema";

export type ListeningStartOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: ListeningUnavailable };

export interface Listener {
  // Asks for the microphone now — never before — with echo cancellation,
  // noise suppression and automatic gain control all off (the tuner reads
  // the raw signal). Idempotent while already listening.
  start(): Promise<ListeningStartOutcome>;
  // Stops every track, disconnects the source node; nothing is published
  // afterwards.
  stop(): void;
  currentFrame(): number;
  sampleRate(): number;
  onPitch(listener: (pitch: PitchDetected) => void): () => void;
  onEnded(listener: (ended: ListeningEnded) => void): () => void;
  onProblem(listener: (problem: ListeningProblem) => void): () => void;
  dispose(): void;
}

export type ListenerOutcome =
  | { readonly ok: true; readonly listener: Listener }
  | { readonly ok: false; readonly error: ListeningUnavailable };

interface Graph {
  readonly stream: MediaStream;
  readonly track: MediaStreamTrack;
  readonly source: { disconnect(): void };
  readonly node: AudioWorkletNode;
}

/// Compiles `listening.wasm` (a `?url` import, as `sound` does) and adds
/// the worklet module; either failing is reported as a `ListenerOutcome`
/// rather than thrown. `mediaDevices` defaults to `navigator.mediaDevices`
/// and is injectable so tests never touch the real device.
export async function createListener(
  context: AudioContext,
  mediaDevices: MediaDevices = navigator.mediaDevices,
): Promise<ListenerOutcome> {
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

  const pitchListeners = new Set<(pitch: PitchDetected) => void>();
  const endedListeners = new Set<(ended: ListeningEnded) => void>();
  const problemListeners = new Set<(problem: ListeningProblem) => void>();

  const notify = <T>(listeners: Set<(value: T) => void>, value: T): void => {
    for (const listener of listeners) listener(value);
  };

  let graph: Graph | null = null;

  // Shared by stop() and the track's own "ended" handler: stops every
  // track, disconnects the source, and clears the port's handler so that
  // nothing already in flight can be published afterwards (REQ-001/S3).
  const teardown = (): void => {
    if (graph === null) return;
    const { track, source, node } = graph;
    track.stop();
    source.disconnect();
    node.disconnect();
    node.port.onmessage = null;
    graph = null;
  };

  const handleMessage = (event: MessageEvent<unknown>): void => {
    const data = event.data;
    if (
      data === null ||
      typeof data !== "object" ||
      (data as { type?: unknown }).type !== "pitch"
    ) {
      return;
    }
    const parsed = pitchDetectedSchema.safeParse(data);
    if (!parsed.success) {
      notify(problemListeners, {
        reason: "invalid-pitch-report",
        detail: parsed.error.message,
      });
      return;
    }
    notify(pitchListeners, parsed.data);
  };

  const listener: Listener = {
    start: async () => {
      if (graph !== null) {
        return { ok: true };
      }

      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (cause) {
        const name = cause instanceof Error ? cause.name : undefined;
        const reason =
          name === "NotAllowedError" || name === "SecurityError"
            ? "refused"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "none"
              : "failed";
        return { ok: false, error: { reason, detail: String(cause) } };
      }

      const track = stream.getAudioTracks()[0];
      if (track === undefined) {
        for (const t of stream.getTracks()) t.stop();
        return {
          ok: false,
          error: {
            reason: "none",
            detail: "no audio track on the granted stream",
          },
        };
      }

      if (import.meta.env.DEV) {
        // The plan's risk on ignored constraints (echoCancellation etc. are
        // requests, not guarantees) — surfaced once per start() so it is
        // visible without being noisy.
        console.info("listening: track settings", track.getSettings());
      }

      const source = context.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(context, "listening", {
        numberOfOutputs: 0,
        processorOptions: { module },
      });
      // A zero-output AudioWorkletNode is processed as a graph sink once
      // its input is connected — like AudioDestinationNode — so nothing
      // needs connecting onward from it (and nothing could be: it has no
      // output). Connecting the source into it is what keeps the graph
      // pulling frames through `process()`.
      source.connect(node);
      node.port.onmessage = handleMessage;

      track.onended = () => {
        teardown();
        notify(endedListeners, { reason: "failed", detail: "track ended" });
      };

      graph = { stream, track, source, node };
      return { ok: true };
    },
    stop: () => {
      teardown();
    },
    currentFrame: () => Math.round(context.currentTime * context.sampleRate),
    sampleRate: () => context.sampleRate,
    onPitch: (l) => {
      pitchListeners.add(l);
      return () => pitchListeners.delete(l);
    },
    onEnded: (l) => {
      endedListeners.add(l);
      return () => endedListeners.delete(l);
    },
    onProblem: (l) => {
      problemListeners.add(l);
      return () => problemListeners.delete(l);
    },
    dispose: () => {
      teardown();
      pitchListeners.clear();
      endedListeners.clear();
      problemListeners.clear();
    },
  };

  return { ok: true, listener };
}
