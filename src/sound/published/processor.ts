/// <reference types="@types/audioworklet" />
import { soundCommandSchema, type OnsetReport } from "./sound-command.schema";

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

  constructor(options: SoundProcessorOptions) {
    super();
    const instance = new WebAssembly.Instance(
      options.processorOptions.module,
      {},
    );
    this.#exports = instance.exports as unknown as SoundExports;
    this.#exports.init(sampleRate);

    this.port.onmessage = (event: MessageEvent<unknown>) => {
      const result = soundCommandSchema.safeParse(event.data);
      if (!result.success) {
        this.port.postMessage({
          type: "invalid",
          detail: result.error.message,
        });
        return;
      }

      const command = result.data;
      switch (command.kind) {
        case "tone":
          this.#exports.push_tone(
            command.tag,
            command.hz,
            command.onsetFrame,
            command.durationFrames,
          );
          break;
        case "click":
          this.#exports.push_click(
            command.tag,
            command.accent ? 1 : 0,
            command.onsetFrame,
          );
          break;
        case "stopAll":
          this.#exports.stop_all();
          break;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const n = this.#exports.render(currentFrame);
    const ptr = this.#exports.output_ptr();
    const rendered = new Float32Array(
      this.#exports.memory.buffer,
      ptr,
      QUANTUM_FRAMES,
    );
    outputs[0]?.[0]?.set(rendered);

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
