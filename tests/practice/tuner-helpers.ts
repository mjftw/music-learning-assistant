// Shared by every tuner scenario file under tests/practice/scenarios/ — was
// copy-pasted into each one (tuner-budget, tuner-cannot-hear,
// tuner-hidden-awake, tuner-memory, tuner-reading, tuner-target) until T026
// extracted it here.
import type { Session } from "../../src/practice/published";
import type { SessionFixture } from "./fakes";

const flush = () => new Promise((r) => setTimeout(r, 0));

// practice.tuner/REQ-002, REQ-003 — enters the tuner and drives it past
// both of enterTuner()'s awaits (wakeLock.acquire(), then listening.start()),
// so `listening.listening` is true before a scenario feeds a pitch.
export async function enter(session: Session): Promise<void> {
  session.enterTuner();
  await flush();
  await flush();
}

// Feeds a detected pitch and advances the fake clock past the session's
// commit-on-next-tick timer (`clock.setTimeout(commit, 0)`), so the
// committed reading is visible in the snapshot right after this returns.
export function hear(f: SessionFixture, hz: number): void {
  f.listening.feed(hz);
  f.clock.advanceMs(1);
}

// practice.tuner/REQ-002 — the shown pitch is smoothed (T026): a single
// `hear()` at a pitch less than SNAP_CENTS away only nudges the shown value
// a tenth of the way there, so a scenario that wants a *settled* reading at
// `hz` feeds it enough times to converge — 50 readings leaves the smoothed
// value under 1% of the step away (0.9^50 ≈ 0.5%).
const SETTLE_READINGS = 50;

export function hearSteady(f: SessionFixture, hz: number): void {
  for (let i = 0; i < SETTLE_READINGS; i += 1) hear(f, hz);
}
