/// <reference types="@types/audioworklet" />

/// The render quantum: how many mono frames `push` consumes per `process`
/// call (mirrors the Rust-side `QUANTUM_FRAMES` and `src/sound`'s shim).
const QUANTUM_FRAMES = 128;

/// How many `f64`s make up one detection triple `[hz, confidence,
/// atFrame]`, mirroring the Rust side's result buffer.
const RESULT_FIELDS = 3;

/// The plain C ABI the Rust `listening` crate exports, as instantiated
/// directly from the compiled `WebAssembly.Module` (no wasm-bindgen glue).
interface ListeningExports {
  readonly memory: WebAssembly.Memory;
  init(sampleRate: number): void;
  input_ptr(): number;
  push(nowFrame: number): number;
  result_ptr(): number;
}

interface ListeningProcessorOptions {
  readonly processorOptions: { readonly module: WebAssembly.Module };
}

/// The AudioWorklet host shim: no domain logic, just wiring the WASM pitch
/// detector's C ABI to the render quantum and the message port. Produces
/// no audio of its own — the node has zero outputs (analysis only), so
/// `process` never writes to an `outputs` array.
class ListeningProcessor extends AudioWorkletProcessor {
  readonly #exports: ListeningExports;
  // The 128-frame mono input view over WASM linear memory: constructing a
  // fresh `Float32Array` every `process()` call would be an allocation the
  // render thread cannot afford, so it is created once here and only
  // recreated if `memory.buffer`'s identity changes — which happens after a
  // `memory.grow` detaches the old `ArrayBuffer` (the pointer itself is
  // otherwise stable). Mirrors `src/sound/published/processor.ts`'s
  // `#getOutputView`.
  #inputView: Float32Array | null = null;
  // 128 frames of silence to copy in when no input channel has arrived yet
  // (`inputs[0]?.[0]` is `undefined`) — a fresh `Float32Array(128)` each
  // call would itself be an allocation on the render thread.
  readonly #silence = new Float32Array(QUANTUM_FRAMES);

  constructor(options: ListeningProcessorOptions) {
    super();
    const instance = new WebAssembly.Instance(
      options.processorOptions.module,
      {},
    );
    this.#exports = instance.exports as unknown as ListeningExports;
    this.#exports.init(sampleRate);
  }

  #getInputView(): Float32Array {
    const buffer = this.#exports.memory.buffer;
    if (this.#inputView === null || this.#inputView.buffer !== buffer) {
      const ptr = this.#exports.input_ptr();
      this.#inputView = new Float32Array(buffer, ptr, QUANTUM_FRAMES);
    }
    return this.#inputView;
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0] ?? this.#silence;
    this.#getInputView().set(channel);

    if (this.#exports.push(currentFrame) === 1) {
      const resultPtr = this.#exports.result_ptr();
      const result = new Float64Array(
        this.#exports.memory.buffer,
        resultPtr,
        RESULT_FIELDS,
      );
      this.port.postMessage({
        type: "pitch",
        hz: result[0],
        confidence: result[1],
        atFrame: result[2],
      });
    }

    return true;
  }
}

registerProcessor("listening", ListeningProcessor);
