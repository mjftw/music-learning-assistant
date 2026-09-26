// practice.drone/REQ-004/S3 — every interleaving of ▶ / ❚❚ on the transport
// with ▶ / ■ on the pill, up to four taps long, from idle: at no instant is
// a sequence tone or a click sounding while the drone is.

import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
  DRONE_RELEASE_MS,
} from "../../../src/practice/published";
import type { Session } from "../../../src/practice/published";
import type { PostedCommand } from "../fakes";
import {
  isClick,
  isDrone,
  isStop,
  isTone,
  sessionOn,
  startDroneAndFlush,
} from "../fakes";

type Action = "play" | "pause" | "droneOn" | "droneOff" | "droneOnPending";
const ACTIONS: readonly Action[] = [
  "play",
  "pause",
  "droneOn",
  "droneOff",
  "droneOnPending",
];
const GAP_MS = 300;
const CLICK_MS = 25;
const STOP_FADE_MS = 5;

// Every sequence of exactly `length` actions over ACTIONS, recursively:
// length 0 is the single empty sequence; each longer sequence is one action
// followed by every sequence one shorter.
function* sequences(length: number): Generator<readonly Action[]> {
  if (length === 0) {
    yield [];
    return;
  }
  for (const action of ACTIONS) {
    for (const rest of sequences(length - 1)) {
      yield [action, ...rest];
    }
  }
}

// Copied from tests/practice/scenarios/session-transport.test.ts — not
// exported from the fakes (T008's context note).
async function flushStart(session: Session): Promise<void> {
  session.start();
  // start() awaits sound.start() then wakeLock.acquire() before it kicks
  // off the scheduler — two microtask flushes are enough with the fakes.
  await Promise.resolve();
  await Promise.resolve();
}

async function apply(session: Session, action: Action): Promise<void> {
  switch (action) {
    case "play":
      // The session call is synchronous and immediate; the flush comes
      // after — so a pending droneOnPending from the previous action is
      // still mid-flight when this one lands (the T022 race), and only
      // settles once this action's own two microtasks run.
      await flushStart(session);
      return;
    case "pause":
      session.stop();
      await Promise.resolve();
      await Promise.resolve();
      return;
    case "droneOn":
      await startDroneAndFlush(session);
      return;
    case "droneOff":
      session.stopDrone();
      await Promise.resolve();
      await Promise.resolve();
      return;
    case "droneOnPending":
      // T022 — starts the drone but returns without flushing, leaving it
      // awaiting sound.start()/wakeLock.acquire(): the next action's own
      // synchronous call lands inside that window.
      session.startDrone();
      return;
  }
}

interface Interval {
  readonly from: number;
  readonly to: number;
}

// Drone voices as [onset, stop + release] intervals; a stopAll posted at
// frame s also ends every drone live at s (mirroring `stop_all` fading a
// drone over its own release — src/sound/src/voices.rs). Only a stopAll at
// or after the drone's own onset counts: none is ever posted earlier than
// that in this session (a preceding stopAll always precedes the drone's own
// post, since startDrone() posts its stopAll, if any, before the drone
// command exists).
function droneIntervals(
  posts: readonly PostedCommand[],
  sampleRate: number,
): readonly Interval[] {
  const releaseFrames = (DRONE_RELEASE_MS * sampleRate) / 1000;
  const intervals: Interval[] = [];
  posts.forEach((post, index) => {
    if (!isDrone(post.command)) return;
    const tag = post.command.tag;
    const from = post.command.onsetFrame;
    let to = Infinity;
    for (let later = index + 1; later < posts.length; later += 1) {
      const candidate = posts[later]!;
      if (isStop(candidate.command) && candidate.command.tag === tag) {
        to = Math.min(to, candidate.atFrame + releaseFrames);
      } else if (
        candidate.command.kind === "stopAll" &&
        candidate.atFrame >= from
      ) {
        to = Math.min(to, candidate.atFrame + releaseFrames);
      }
    }
    intervals.push({ from, to });
  });
  return intervals;
}

// Tones as [onset, min(onset + duration, stopAll-after-onset + 5 ms)],
// clicks as [onset, min(onset + 25 ms, same)] — a stopAll posted before a
// tone or click's own onset (still queued in the lookahead scheduler's
// window, never yet sounded) drops it entirely rather than cutting it.
function sequenceIntervals(
  posts: readonly PostedCommand[],
  sampleRate: number,
): readonly Interval[] {
  const stopFadeFrames = (STOP_FADE_MS * sampleRate) / 1000;
  const clickFrames = (CLICK_MS * sampleRate) / 1000;
  const intervals: Interval[] = [];
  posts.forEach((post, index) => {
    const command = post.command;
    if (!isTone(command) && !isClick(command)) return;
    const from = command.onsetFrame;
    const naturalTo = isTone(command)
      ? from + command.durationFrames
      : from + clickFrames;
    let stopAllFrame = Infinity;
    for (let later = index + 1; later < posts.length; later += 1) {
      const candidate = posts[later]!;
      if (candidate.command.kind === "stopAll") {
        stopAllFrame = Math.min(stopAllFrame, candidate.atFrame);
      }
    }
    if (stopAllFrame < from) return; // never began — dropped entirely
    intervals.push({
      from,
      to: Math.min(naturalTo, stopAllFrame + stopFadeFrames),
    });
  });
  return intervals;
}

test("practice.drone/REQ-004/S3 — never both (invariant)", async () => {
  let checked = 0;
  for (let length = 1; length <= 4; length += 1)
    for (const sequence of sequences(length)) {
      const { session, sound, clock } = sessionOn(
        "G",
        "flute-concert",
        defaultTraversal,
        { ...defaultSessionSettings, countIn: false },
      );
      for (const action of sequence) {
        await apply(session, action);
        clock.advance(GAP_MS);
      }
      // A trailing droneOnPending never flushes on its own — settle it
      // before reading the timeline, or its eventual post would land after
      // the assertions ran.
      await Promise.resolve();
      await Promise.resolve();
      clock.advance(2000);
      const drones = droneIntervals(sound.posts, sound.sampleRate());
      for (const voice of sequenceIntervals(sound.posts, sound.sampleRate()))
        for (const drone of drones)
          expect(
            voice.from < drone.to && drone.from < voice.to,
            `overlap in ${sequence.join(" → ")}`,
          ).toBe(false);
      session.dispose();
      checked += 1;
    }
  expect(checked).toBe(5 + 25 + 125 + 625);
});
