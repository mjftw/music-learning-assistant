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

// A getUserMedia that stays pending until the test answers it, one request at
// a time, each granting its own stream with its own track — so the tests can
// count the live tracks on the streams themselves, whatever the adapter does.
function heldMediaDevices() {
  // One entry per granted request, in the order requests were made; a track
  // exists (and can be live) only once its request has been answered.
  const tracks: ({ stopped: boolean } | undefined)[] = [];
  const answers: (() => void)[] = [];
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        const n = answers.length;
        answers.push(() => {
          const track = {
            stopped: false,
            stop() {
              this.stopped = true;
            },
            getSettings: () => ({}),
            onended: null as null | (() => void),
          };
          tracks[n] = track;
          resolve({
            getAudioTracks: () => [track],
            getTracks: () => [track],
          } as unknown as MediaStream);
        });
      }),
  );
  return {
    mediaDevices: { getUserMedia } as unknown as MediaDevices,
    tracks,
    // Answers the nth request (0-based) and lets the adapter's continuation run.
    async resolve(n: number): Promise<void> {
      answers[n]?.();
      await Promise.resolve();
      await Promise.resolve();
    },
    live: () => tracks.filter((t) => t !== undefined && !t.stopped).length,
  };
}

// listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending
// request still releases its stream (convergence 2, W1)
test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (a: start, stop, resolve)", async () => {
  const held = heldMediaDevices();
  const listener = okListener(
    await createListener(fakeContext(), held.mediaDevices),
  );
  const heard: number[] = [];
  listener.onPitch((pitch) => heard.push(pitch.hz));
  const pending = listener.start();
  listener.stop();
  await held.resolve(0);
  await pending;
  expect(held.live()).toBe(0);
  expect(nodeBox.current).toBeUndefined();
  expect(heard).toEqual([]);
});

test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (b: start A, stop, start B, resolve A then B)", async () => {
  const held = heldMediaDevices();
  const context = fakeContext();
  const listener = okListener(await createListener(context, held.mediaDevices));
  const heard: number[] = [];
  listener.onPitch((pitch) => heard.push(pitch.hz));
  const a = listener.start();
  listener.stop();
  const b = listener.start();
  await held.resolve(0);
  await a;
  expect(held.live()).toBe(0);
  await held.resolve(1);
  expect(await b).toEqual({ ok: true });
  expect(held.live()).toBe(1);
  expect(held.tracks[1]?.stopped).toBe(false);
  listener.stop();
  expect(held.live()).toBe(0);
  context.lastNode.port.onmessage?.({
    data: { type: "pitch", hz: 440, confidence: 0.95, atFrame: 100 },
  } as MessageEvent);
  expect(heard).toEqual([]);
});

test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (c: start A, stop, start B, resolve B then A)", async () => {
  const held = heldMediaDevices();
  const listener = okListener(
    await createListener(fakeContext(), held.mediaDevices),
  );
  const a = listener.start();
  listener.stop();
  const b = listener.start();
  await held.resolve(1);
  expect(await b).toEqual({ ok: true });
  await held.resolve(0);
  await a;
  expect(held.live()).toBe(1);
  expect(held.tracks[1]?.stopped).toBe(false);
  listener.stop();
  expect(held.live()).toBe(0);
});

test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (d: start, start, resolve both)", async () => {
  const held = heldMediaDevices();
  const listener = okListener(
    await createListener(fakeContext(), held.mediaDevices),
  );
  const first = listener.start();
  const second = listener.start();
  await held.resolve(0);
  await held.resolve(1);
  expect(await first).toEqual({ ok: true });
  expect(await second).toEqual({ ok: true });
  expect(held.live()).toBe(1);
  listener.stop();
  expect(held.live()).toBe(0);
});
