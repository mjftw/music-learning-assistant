// practice.drone/REQ-004/S3 — every interleaving of ▶ / ❚❚ on the transport
// with ▶ / ■ on the pill, up to four taps long, from idle: at no instant is
// a sequence tone or a click sounding while the drone is.
//
// practice.tuner/REQ-001/S3 — the same enumeration, widened with the
// tuner's two verbs (enterTuner, leaveTuner) and, since S3's Given names a
// tapped note among the ways in, two tap verbs (tapNote, tapNotePending):
// at no instant is a sequence tone, a click or the drone sounding while
// the tuner is active.

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

type Action =
  | "play"
  | "pause"
  | "droneOn"
  | "droneOff"
  | "droneOnPending"
  | "enterTuner"
  | "leaveTuner"
  | "tapNote"
  | "tapNotePending";
const ACTIONS: readonly Action[] = [
  "play",
  "pause",
  "droneOn",
  "droneOff",
  "droneOnPending",
  "enterTuner",
  "leaveTuner",
  "tapNote",
  "tapNotePending",
];
const GAP_MS = 300;
const CLICK_MS = 25;
const STOP_FADE_MS = 5;
// practice.session/REQ-013 — a tapped note's tag range (session.ts's
// TAP_TAG_BASE, private to the domain and not exported through
// published/); hardcoded here the same way session-tap.test.ts already
// does, to tell a tapped tone's own targeted stop(tag) apart from a
// sequence tone's or a click's (which are only ever ended by a stopAll).
const TAP_TAG_BASE = 2_000_000;
// Sequences of length 1 to 4 over ACTIONS.length verbs — the file's own
// timeout budget for the exhaustive walk below (`sequences()`'s sum for
// however many verbs ACTIONS currently holds).
const TEST_TIMEOUT_MS = 20_000;

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
    case "enterTuner":
      // Mirrors droneOnPending — enterTuner() is async internally (awaits
      // the wake lock, then listening.start()); returning without flushing
      // leaves it mid-flight so the next action's own call lands while the
      // tuner's start is pending (practice.tuner/REQ-001/S3's own version
      // of the T022 race — see brief T013).
      session.enterTuner();
      return;
    case "leaveTuner":
      // leaveTuner() itself is synchronous, but flushing here (as pause and
      // droneOff do) gives any still-pending enterTuner/droneOnPending from
      // an earlier action a chance to settle sooner rather than piling up
      // unflushed across the whole sequence.
      session.leaveTuner();
      await Promise.resolve();
      await Promise.resolve();
      return;
    case "tapNote":
      // practice.tuner/REQ-001/S3 — a way in named by S3's Given: "a tapped
      // note sounding". Mirrors droneOn/startDroneAndFlush: drives
      // tapNote() through its internal await (sound.start(), only on the
      // first-ever tap of the session) so the posted tone and the updated
      // snapshot are both settled afterwards. Run index 0 is always a real
      // note of the default G major traversal.
      session.tapNote(0);
      await Promise.resolve();
      await Promise.resolve();
      return;
    case "tapNotePending":
      // Mirrors droneOnPending's shape — starts tapNote()'s internal
      // `await sound.start()` round trip and returns without an explicit
      // flush of its own. Every case above, including this one, returns
      // without ever internally awaiting, so `apply(...)`'s own promise
      // settles after exactly the one tick any `await apply(...)` costs
      // its caller (the "await" cost is the caller's, not the callee's).
      // That one tick is enough to also drain droneOnPending's *first*
      // internal await (sound.start()), but startDrone()'s pending branch
      // has a *second* internal await (wakeLock.acquire()) still queued
      // behind it, so it genuinely survives an `await apply(...)` — the
      // T022 race. tapNote()'s pending branch has only the one internal
      // await, so an `await apply(session, "tapNotePending")` at the call
      // site would itself drain it, and the tap would already be posted
      // by the time control returned — never reproducing the reviewer's
      // race (b), brief T013's fixer round. Both sequence loops below
      // therefore call this one action un-awaited (`void apply(...)`)
      // rather than through a uniform `await apply(...)`, leaving the
      // tap's single pending tick to be drained by whatever the
      // sequence's next actual await turns out to be — typically the
      // next action's own `apply()` — landing after a later enterTuner()
      // in between has already run synchronously.
      session.tapNote(0);
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
    // practice.drone/REQ-004 — "a tapped note ... is the one thing that
    // sounds over the drone": a tapped tone (tag ≥ TAP_TAG_BASE) is exempt
    // from this test's "never both" check, unlike a sequence tone or a
    // click. Widening ACTIONS with tapNote/tapNotePending (T013's fixer)
    // means this function now sees taps too, so the exemption has to be
    // stated here or a legitimate tap-over-drone overlap would fail this
    // test.
    if (isTone(command) && command.tag >= TAP_TAG_BASE) return;
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

// The file's notion of "live at a frame": posted (onsetFrame ≤ frame) and
// not yet stopped before the frame minus its release — the same rule
// droneIntervals/sequenceIntervals above already encode as [from, to)
// pairs across the whole timeline, here queried at a single instant. Used
// by the tuner-silence assertion below (practice.tuner/REQ-001/S3): "is
// anything live right now", asked at every step of every sequence.
function liveVoicesAt(
  sound: { readonly posts: readonly PostedCommand[]; sampleRate(): number },
  atFrame: number,
): readonly PostedCommand[] {
  const sampleRate = sound.sampleRate();
  const droneReleaseFrames = (DRONE_RELEASE_MS * sampleRate) / 1000;
  const stopFadeFrames = (STOP_FADE_MS * sampleRate) / 1000;
  const clickFrames = (CLICK_MS * sampleRate) / 1000;
  const posts = sound.posts;
  const live: PostedCommand[] = [];
  posts.forEach((post, index) => {
    const command = post.command;
    if (!isTone(command) && !isClick(command) && !isDrone(command)) return;
    const from = command.onsetFrame;
    if (from > atFrame) return; // not yet begun
    const naturalTo = isDrone(command)
      ? Infinity
      : isTone(command)
        ? from + command.durationFrames
        : from + clickFrames;
    // A tapped tone (tag ≥ TAP_TAG_BASE) is ended by its own targeted
    // stop(tag) — endTapIfSounding() (session.ts) — the same as a drone
    // voice, not only by a stopAll; a sequence tone's or a click's tag
    // never appears on a stop command (only stopAll ever ends those), so
    // this only ever matches a drone or a tap.
    const endedByOwnStop =
      isDrone(command) || (isTone(command) && command.tag >= TAP_TAG_BASE);
    let stopFrame = Infinity;
    for (let later = index + 1; later < posts.length; later += 1) {
      const candidate = posts[later]!;
      if (
        endedByOwnStop &&
        isStop(candidate.command) &&
        candidate.command.tag === command.tag
      ) {
        stopFrame = Math.min(stopFrame, candidate.atFrame);
      } else if (candidate.command.kind === "stopAll") {
        stopFrame = Math.min(stopFrame, candidate.atFrame);
      }
    }
    // Mirrors sequenceIntervals: a stopAll posted before this command's own
    // onset — still queued in the lookahead scheduler's window, never yet
    // sounded — cancels it outright rather than cutting it short.
    if (stopFrame < from) return;
    const release = isDrone(command) ? droneReleaseFrames : stopFadeFrames;
    const to = Math.min(naturalTo, stopFrame + release);
    if (from <= atFrame && atFrame < to) live.push(post);
  });
  return live;
}

test(
  "practice.drone/REQ-004/S3 — never both (invariant)",
  async () => {
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
          // tapNotePending must never itself be awaited — see its comment
          // in apply() above.
          if (action === "tapNotePending") void apply(session, action);
          else await apply(session, action);
          clock.advance(GAP_MS);
        }
        // A trailing droneOnPending/enterTuner never flushes on its own —
        // settle it before reading the timeline, or its eventual post
        // would land after the assertions ran.
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
    expect(checked).toBe(
      ACTIONS.length +
        ACTIONS.length ** 2 +
        ACTIONS.length ** 3 +
        ACTIONS.length ** 4,
    );
  },
  TEST_TIMEOUT_MS,
);

test(
  "practice.tuner/REQ-001/S3 — nothing sounds while the tuner listens (invariant)",
  async () => {
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
          // tapNotePending must never itself be awaited — see its comment
          // in apply() above.
          if (action === "tapNotePending") void apply(session, action);
          else await apply(session, action);
          if (session.snapshot().tuner.active) {
            // REQ-001 grants playback up to 50 ms and the drone up to
            // DRONE_RELEASE_MS (80 ms) to fall silent as *part of*
            // entering — wait that out before judging "still sounding", or
            // this flags the transition's own budgeted release (a tone or
            // the drone stopped this same step, still inside its own
            // stop-fade tail) rather than a real violation.
            clock.advance(DRONE_RELEASE_MS);
            const liveAt = sound.frame;
            expect(
              liveVoicesAt(sound, liveAt).filter(
                (v) =>
                  isTone(v.command) || isClick(v.command) || isDrone(v.command),
              ),
              `sounding while the tuner is active in ${sequence.join(" → ")}`,
            ).toEqual([]);
          }
          clock.advance(GAP_MS);
        }
        // As above — settle a trailing droneOnPending/enterTuner before the
        // final check, so a post it makes only once flushed is not missed.
        await Promise.resolve();
        await Promise.resolve();
        clock.advance(2000);
        if (session.snapshot().tuner.active) {
          const liveAt = sound.frame;
          expect(
            liveVoicesAt(sound, liveAt).filter(
              (v) =>
                isTone(v.command) || isClick(v.command) || isDrone(v.command),
            ),
            `sounding while the tuner is active after ${sequence.join(" → ")}`,
          ).toEqual([]);
        }
        session.dispose();
        checked += 1;
      }
    expect(checked).toBe(
      ACTIONS.length +
        ACTIONS.length ** 2 +
        ACTIONS.length ** 3 +
        ACTIONS.length ** 4,
    );
  },
  TEST_TIMEOUT_MS,
);
