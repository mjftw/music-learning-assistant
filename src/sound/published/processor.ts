/// <reference types="@types/audioworklet" />
import { soundCommandSchema } from "./sound-command.schema";

/// The render quantum: how many mono frames `render` fills per `process`
/// call, and how the Web Audio API always calls `process` (mirrors the
/// Rust-side `QUANTUM_FRAMES`).
const QUANTUM_FRAMES = 128;

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
          // push_click lands in T010 — accepted by the schema, not yet actioned.
          break;
        case "stopAll":
          // stop_all lands in T010 — accepted by the schema, not yet actioned.
          break;
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    this.#exports.render(currentFrame);
    const ptr = this.#exports.output_ptr();
    const rendered = new Float32Array(
      this.#exports.memory.buffer,
      ptr,
      QUANTUM_FRAMES,
    );
    outputs[0]?.[0]?.set(rendered);
    return true;
  }
}

registerProcessor("sound", SoundProcessor);
