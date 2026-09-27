// listening.pitch-detection/REQ-001, listening.pitch-detection/REQ-006 —
// createListener's published contract: the microphone is asked for on
// start(), never before; it is released on stop(); and a refused, missing
// or mid-session-failed microphone is reported rather than thrown.
//
// jsdom has neither AudioWorkletNode nor WebAssembly.compileStreaming, so
// both are stubbed on globalThis for the duration of each test and restored
// afterwards; createListener's own WASM module is never instantiated here.

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createListener } from "../../../src/listening/published";
import type {
  Listener,
  ListenerOutcome,
} from "../../../src/listening/published";

interface FakePort {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: () => void;
}

interface FakeAudioWorkletNode {
  readonly port: FakePort;
  connect: () => void;
  disconnect: () => void;
}

// A box (rather than a plain variable `this` would alias into) holding the
// most recently constructed stub node, so tests can reach the port the
// production code wired up without the stub class needing to expose
// anything beyond what a real AudioWorkletNode does.
const nodeBox: { current: FakeAudioWorkletNode | undefined } = {
  current: undefined,
};

class StubAudioWorkletNode implements FakeAudioWorkletNode {
  readonly port: FakePort = { onmessage: null, postMessage: () => {} };
  connect(): void {}
  disconnect(): void {}
  constructor() {
    nodeBox.current = this;
  }
}

const originalAudioWorkletNode = globalThis.AudioWorkletNode;
const originalCompileStreaming = WebAssembly.compileStreaming;

beforeEach(() => {
  nodeBox.current = undefined;
  globalThis.AudioWorkletNode =
    StubAudioWorkletNode as unknown as typeof AudioWorkletNode;
  // Resolves regardless of the argument, but — unlike `vi.fn(() =>
  // Promise.resolve(...))` — actually consumes it via `.then`, so
  // `wasmUrl`'s fetch() (unparseable as an absolute URL outside a browser)
  // rejecting is observed and handled here rather than left as an
  // unhandled rejection at the Node process level.
  WebAssembly.compileStreaming = vi.fn(
    (source: Response | PromiseLike<Response>) =>
      Promise.resolve(source).then(
        (): WebAssembly.Module => ({}),
        (): WebAssembly.Module => ({}),
      ),
  );
});

afterEach(() => {
  globalThis.AudioWorkletNode = originalAudioWorkletNode;
  WebAssembly.compileStreaming = originalCompileStreaming;
  vi.restoreAllMocks();
});

function fakeContext(): AudioContext & {
  readonly lastNode: FakeAudioWorkletNode;
} {
  return {
    sampleRate: 48000,
    currentTime: 0,
    audioWorklet: { addModule: vi.fn(() => Promise.resolve()) },
    createMediaStreamSource: () => ({ connect() {}, disconnect() {} }),
    get lastNode() {
      return nodeBox.current as FakeAudioWorkletNode;
    },
  } as unknown as AudioContext & { readonly lastNode: FakeAudioWorkletNode };
}

function okListener(outcome: ListenerOutcome): Listener {
  if (!outcome.ok) {
    throw new Error(
      `expected an ok ListenerOutcome, got ${JSON.stringify(outcome.error)}`,
    );
  }
  return outcome.listener;
}

function fakeTrack() {
  return {
    stop: vi.fn(),
    getSettings: () => ({}),
    onended: null as null | (() => void),
  };
}
function fakeMediaDevices(
  behaviour: "grant" | "NotAllowedError" | "NotFoundError" | "TypeError",
) {
  const track = fakeTrack();
  const getUserMedia = vi.fn(() =>
    behaviour === "grant"
      ? Promise.resolve({
          getAudioTracks: () => [track],
          getTracks: () => [track],
        } as unknown as MediaStream)
      : Promise.reject(
          Object.assign(new Error(behaviour), { name: behaviour }),
        ),
  );
  return {
    mediaDevices: { getUserMedia } as unknown as MediaDevices,
    getUserMedia,
    track,
  };
}

// listening.pitch-detection/REQ-001/S1 — nothing before the request
test("listening.pitch-detection/REQ-001/S1 — nothing before the request", async () => {
  const { mediaDevices, getUserMedia } = fakeMediaDevices("grant");
  const outcome = await createListener(fakeContext(), mediaDevices);
  expect(outcome.ok).toBe(true);
  expect(getUserMedia).not.toHaveBeenCalled();
});

// listening.pitch-detection/REQ-001/S2 — asked for on request
test("listening.pitch-detection/REQ-001/S2 — asked for on request", async () => {
  const { mediaDevices, getUserMedia } = fakeMediaDevices("grant");
  const listener = okListener(
    await createListener(fakeContext(), mediaDevices),
  );
  expect(await listener.start()).toEqual({ ok: true });
  expect(getUserMedia).toHaveBeenCalledWith({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
});

// listening.pitch-detection/REQ-001/S3 — released on demand
test("listening.pitch-detection/REQ-001/S3 — released on demand", async () => {
  const { mediaDevices, track } = fakeMediaDevices("grant");
  const context = fakeContext();
  const listener = okListener(await createListener(context, mediaDevices));
  await listener.start();
  const heard: number[] = [];
  listener.onPitch((pitch) => heard.push(pitch.hz));
  listener.stop();
  expect(track.stop).toHaveBeenCalledTimes(1);
  context.lastNode.port.onmessage?.({
    data: { type: "pitch", hz: 440, confidence: 0.95, atFrame: 100 },
  } as MessageEvent);
  expect(heard).toEqual([]);
});

// listening.pitch-detection/REQ-006/S1 — refused
test("listening.pitch-detection/REQ-006/S1 — refused", async () => {
  const listener = okListener(
    await createListener(
      fakeContext(),
      fakeMediaDevices("NotAllowedError").mediaDevices,
    ),
  );
  const outcome = await listener.start();
  expect(outcome).toMatchObject({ ok: false, error: { reason: "refused" } });
});

// listening.pitch-detection/REQ-006/S2 — none
test("listening.pitch-detection/REQ-006/S2 — none", async () => {
  const listener = okListener(
    await createListener(
      fakeContext(),
      fakeMediaDevices("NotFoundError").mediaDevices,
    ),
  );
  expect(await listener.start()).toMatchObject({
    ok: false,
    error: { reason: "none" },
  });
});

// listening.pitch-detection/REQ-006/S3 — failed mid-way
test("listening.pitch-detection/REQ-006/S3 — failed mid-way", async () => {
  const { mediaDevices, track, getUserMedia } = fakeMediaDevices("grant");
  const listener = okListener(
    await createListener(fakeContext(), mediaDevices),
  );
  await listener.start();
  const ended: string[] = [];
  listener.onEnded((e) => ended.push(e.reason));
  track.onended?.();
  expect(ended).toEqual(["failed"]);
  await listener.start();
  expect(getUserMedia).toHaveBeenCalledTimes(2);
});
