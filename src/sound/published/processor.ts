/// <reference types="@types/audioworklet" />
import type { OnsetReport, SoundCommand } from "./sound-command.schema";

/// The render quantum: how many mono frames `render` fills per `process`
/// call, and how the Web Audio API always calls `process` (mirrors the
/// Rust-side `QUANTUM_FRAMES`).
const QUANTUM_FRAMES = 128;

/// How many `f64`s make up one onset report triple
/// (`[tag, onsetFrame, actualFrame]`), mirroring the Rust side.
const REPORT_FIELDS = 3;

/// The plain C ABI the Rust `sound` crate exports, as instantiated directly
/// from the compiled `WebAssembly.Module` (no wasm-bindgen glue).
interface SoundExports {
  readonly memory: WebAssembly.Memory;
  init(sampleRate: number): void;
  output_ptr(): number;
  push_tone(
    tag: number,
    hz: number,
    onsetFrame: number,
    durationFrames: number,
  ): number;
  push_click(tag: number, accent: number, onsetFrame: number): number;
  stop_all(): void;
  report_ptr(): number;
  render(nowFrame: number): number;
}

interface SoundProcessorOptions {
  readonly processorOptions: { readonly module: WebAssembly.Module };
}

/// The AudioWorklet host shim: no domain logic, just wiring the WASM
/// synthesiser's C ABI to the render quantum and the command port.
class SoundProcessor extends AudioWorkletProcessor {
  readonly #exports: SoundExports;
  // The 128-frame mono output view over WASM linear memory: constructing a
  // fresh `Float32Array` every `process()` call would be an allocation the
  // render thread cannot afford, so it is created once here and only
  // recreated if `memory.buffer`'s identity changes — which happens after a
  // `memory.grow` detaches the old `ArrayBuffer` (the pointer itself is
  // otherwise stable).
  #outputView: Float32Array | null = null;

  constructor(options: SoundProcessorOptions) {
    super();
    const instance = new WebAssembly.Instance(
      options.processorOptions.module,
      {},
    );
    this.#exports = instance.exports as unknown as SoundExports;
    this.#exports.init(sampleRate);

    this.port.onmessage = (event: MessageEvent<unknown>) => {
      // No parsing on the audio thread: index.ts's post() validates every
      // command against soundCommandSchema (Zod) on the main thread before
      // it reaches this port, and emits the "invalid-command" problem
      // itself on failure. This is a cheap structural narrow, not
      // re-validation — trust the shape once `kind` looks right.
      const data = event.data;
      if (
        data === null ||
        typeof data !== "object" ||
        typeof (data as { kind?: unknown }).kind !== "string"
      ) {
        return;
      }

      const command = data as SoundCommand;
      switch (command.kind) {
        case "tone": {
          // 0 = all 64 voice slots in use; the tone is dropped rather than
          // queued (src/sound/src/lib.rs's push_tone).
          const queued = this.#exports.push_tone(
            command.tag,
            command.hz,
            command.onsetFrame,
            command.durationFrames,
          );
          if (queued === 0) {
            this.port.postMessage({
              type: "problem",
              reason: "voice-pool-full",
              detail: `tone dropped: 64-voice pool full (tag=${command.tag}, onsetFrame=${command.onsetFrame})`,
            });
          }
          break;
        }
        case "click": {
          const queued = this.#exports.push_click(
            command.tag,
            command.accent ? 1 : 0,
            command.onsetFrame,
          );
          if (queued === 0) {
            this.port.postMessage({
              type: "problem",
              reason: "voice-pool-full",
              detail: `click dropped: 64-voice pool full (tag=${command.tag}, onsetFrame=${command.onsetFrame})`,
            });
          }
          break;
        }
        case "stopAll":
          this.#exports.stop_all();
          break;
      }
    };
  }

  #getOutputView(): Float32Array {
    const buffer = this.#exports.memory.buffer;
    if (this.#outputView === null || this.#outputView.buffer !== buffer) {
      const ptr = this.#exports.output_ptr();
      this.#outputView = new Float32Array(buffer, ptr, QUANTUM_FRAMES);
    }
    return this.#outputView;
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const n = this.#exports.render(currentFrame);
    outputs[0]?.[0]?.set(this.#getOutputView());

    if (n > 0) {
      const reportPtr = this.#exports.report_ptr();
      const triples = new Float64Array(
        this.#exports.memory.buffer,
        reportPtr,
        n * REPORT_FIELDS,
      );
      const reports: OnsetReport[] = [];
      for (let i = 0; i < n; i++) {
        const base = i * REPORT_FIELDS;
        reports.push({
          tag: triples[base]!,
          onsetFrame: triples[base + 1]!,
          actualFrame: triples[base + 2]!,
        });
      }
      this.port.postMessage({ type: "onset", reports });
    }

    return true;
  }
}

registerProcessor("sound", SoundProcessor);
