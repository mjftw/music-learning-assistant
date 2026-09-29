import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  enterAndHear,
  enterTuner,
  letGapPass,
  letLingerPass,
  manualAnimationClock,
} from "./tuner-helpers";

// TunerStave.tsx's own TRAIL_X_START/TRAIL_X_END (practice.tuner/REQ-005) —
// replicated here as the tests elsewhere in this file already replicate the
// strip's other geometry (`translateY(109.6px)` etc.) rather than importing
// a view's internals.
const TRAIL_X_START = 52;
const TRAIL_X_END = 140;

function xsOf(pathD: string): readonly number[] {
  return pathD
    .split(/M |L /)
    .filter((chunk) => chunk.trim() !== "")
    .map((chunk) => Number(chunk.trim().split(" ")[0]));
}

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test
// (the pattern of tuner-screen.test.tsx).
afterEach(() => {
  cleanup();
});

test("practice.tuner/REQ-005/S1 — A4 a little sharp", async () => {
  await enterAndHear(445.0);
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(109.6px)",
  ); // A4: i = 33, guide y = 111, −20·0.07
  expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
  expect(screen.getByTestId("strip-cents").style.color).toBe(
    "oklch(0.55 0.11 28)",
  );
  expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
  expect(screen.getByText("A4 IS")).toBeTruthy();
  expect(screen.queryByText("8va")).toBeNull();
});

// practice.tuner/REQ-002, practice.tuner/REQ-005 — converge round 1 (W1):
// on auto the stave's head must agree with the level, not the raw heard
// note. A4 settles at 440 Hz (the first reading is shown as detected,
// REQ-002/S8, so a single feed already settles the smoothing filter); one
// feed at 454 Hz then jumps the smoothed pitch straight to 454 (+54 ¢ raw,
// past SNAP_CENTS's 25 ¢, so it snaps rather than creeps — no need to feed
// it twice), 56 ¢ (HANDOVER_CENTS) short of crossing, so A4 is still shown,
// clamped to +50 (tests/practice/scenarios/tuner-reading.test.ts's own
// REQ-002/S4 confirms `reading.target`/`.cents` land on A4/+50 here). The
// raw nearest note to 454 Hz is A♯4 at about −46 ¢ (`reading.heard.nearest`/
// `.cents`) — the bug drew the head there instead of at the level's own A4
// +50.
test("practice.tuner/REQ-002, practice.tuner/REQ-005 — the stave head agrees with the level in the hand-over band (converge round 1, W1)", async () => {
  const f = await enterAndHear(440.0);
  f.listening.feed(454.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(107.5px)",
  ); // A4: i = 33, guide y = 111, −50·0.07 — not A♯4's −(−46)·0.07
  expect(screen.queryByTestId("heard-accidental")).toBeNull(); // A4 is natural, not A♯4's ♯
  expect(screen.getByTestId("strip-cents").textContent).toBe("+50");
  expect(screen.getByTestId("strip-cents").style.color).toBe(
    "oklch(0.55 0.11 28)",
  ); // the level's own warm/sharp colour (docs/design.md §8)
});

test("practice.tuner/REQ-005/S2 — a flat accidental", async () => {
  await enterAndHear(461.0, "flat");
  expect(screen.getByTestId("heard-accidental").textContent).toBe("♭");
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(107.33px)",
  ); // B♭4: i = 34, guide 106, −(−19)·0.07 = +1.33
  expect(screen.getByTestId("strip-cents").textContent).toBe("−19");
});

test("practice.tuner/REQ-005/S3 — the low end takes 8vb", async () => {
  await enterAndHear(82.41);
  expect(screen.getByText("8vb")).toBeTruthy();
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(161px)",
  ); // written at E3, i = 23
  await enterAndHear(65.41);
  expect(screen.getByText("15mb")).toBeTruthy(); // C2 → written C4, i = 28 → y 136
});

test("practice.tuner/REQ-005 — E3 is written an octave up under 8vb", async () => {
  await enterAndHear(164.81);
  expect(screen.getByText("8vb")).toBeTruthy();
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(126px)",
  ); // written at E4, i = 30 → y 126, cents 0
});

test("practice.tuner/REQ-005/S4 — the target beside the heard note", async () => {
  const f = await enterAndHear(440.0);
  act(() => {
    f.session.pinTarget(69);
  });
  f.listening.feed(523.25);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("heard-head").style.transform).toBe(
    "translateY(101px)",
  ); // C5, i = 35
  expect(screen.getByTestId("target-head").getAttribute("cy")).toBe("111");
  expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
  expect(screen.getByText("A4 IS")).toBeTruthy();
});

// practice.tuner/REQ-005's amendment (design round 3): the trail is no
// longer a fixed count of readings but the last 2.5 s by TIME, x placed by
// age — replaces the old "the last 50 readings" rule this test used to
// state (a change of rule the requirement itself approved, not a loosened
// assertion).
test("practice.tuner/REQ-005 — the trail keeps the last 2.5 s, oldest first, placed by age", async () => {
  const animClock = manualAnimationClock();
  const f = await enterTuner(undefined, {
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
  });
  const READING_INTERVAL_MS = 50; // ~20/s — well below the tuner's own ~93/s, but all that matters here is spanning well past the 2.5 s trail
  const READINGS = 80; // 4 s of simulated clock time
  for (let k = 0; k < READINGS; k += 1) {
    f.listening.feed(440.0 + k * 0.01);
    f.clock.advanceMs(1);
    await act(async () => {});
    animClock.advanceMs(READING_INTERVAL_MS);
  }
  const xs = xsOf(screen.getByTestId("trail").getAttribute("d")!);
  // Fewer points than readings sent: the oldest aged out past the 2.5 s
  // trail rather than accumulating forever.
  expect(xs.length).toBeGreaterThan(0);
  expect(xs.length).toBeLessThan(READINGS);
  // Oldest first, newest at the head (age 0 sits at TRAIL_X_END), each
  // successive point further right (younger) than the one before — x is
  // placed by age, not by a fixed per-point spacing — and never further
  // left than TRAIL_X_START (an older point is dropped, not drawn off the
  // strip's own start).
  expect(xs.at(-1)).toBeCloseTo(TRAIL_X_END, 1);
  expect(xs[0]).toBeGreaterThanOrEqual(TRAIL_X_START);
  for (let i = 1; i < xs.length; i += 1) {
    expect(xs[i]).toBeGreaterThan(xs[i - 1]!);
  }
});

test("practice.tuner/REQ-005/S5 — the trail outlives the note", async () => {
  const animClock = manualAnimationClock();
  const f = await enterTuner(undefined, {
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
  });
  // "Hear A4 for about a second of clock time" — three readings spanning
  // 0..1000 ms of the trail's own clock.
  for (let reading = 0; reading < 3; reading += 1) {
    f.listening.feed(440.0);
    f.clock.advanceMs(1);
    await act(async () => {});
    animClock.advanceMs(500);
  }
  await letGapPass(f); // the session's own 300 ms gap — the reading clears
  letLingerPass(f); // the last reading lingers, then goes (REQ-003/S4)
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.queryByTestId("strip-cents")).toBeNull();
  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
  const xsAtStop = xsOf(screen.getByTestId("trail").getAttribute("d")!);
  expect(xsAtStop.length).toBe(3);

  // "Advance one second and let a frame run."
  expect(animClock.pending).toBe(true); // the silence loop is already running
  animClock.advanceMs(1000);
  act(() => {
    animClock.runFrame();
  });
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.queryByTestId("strip-cents")).toBeNull();
  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
  const xsAfterOneMore = xsOf(screen.getByTestId("trail").getAttribute("d")!);
  expect(screen.getByTestId("trail")).toBeTruthy();
  expect(xsAfterOneMore.length).toBe(xsAtStop.length); // nothing added
  expect(Math.max(...xsAfterOneMore)).toBeLessThan(Math.max(...xsAtStop)); // further left

  // Past the trail's length in time (2.5 s default) since the note stopped.
  expect(animClock.pending).toBe(true); // still ageing, still redrawing
  animClock.advanceMs(3000);
  act(() => {
    animClock.runFrame();
  });
  expect(screen.queryByTestId("trail")).toBeNull();
  expect(animClock.pending).toBe(false); // no further frame requested
});

test("practice.tuner/REQ-005/S6 — a new note does not join the old trail", async () => {
  const animClock = manualAnimationClock();
  const f = await enterTuner(undefined, {
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
  });
  f.listening.feed(440.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  animClock.advanceMs(300);
  f.listening.feed(440.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  await letGapPass(f); // A4's trail is now moving left in silence

  animClock.advanceMs(400);
  act(() => {
    animClock.runFrame();
  }); // let the old trail actually move before C5 arrives
  const oldXsBefore = xsOf(screen.getByTestId("trail").getAttribute("d")!);

  animClock.advanceMs(200);
  f.listening.feed(523.25); // C5
  f.clock.advanceMs(1);
  await act(async () => {});
  animClock.advanceMs(50);
  f.listening.feed(523.25);
  f.clock.advanceMs(1);
  await act(async () => {});

  const d = screen.getByTestId("trail").getAttribute("d")!;
  expect(d.match(/M /g)?.length).toBe(2); // two sub-paths — two runs
  const runs = d.split(/(?=M )/).map((run) => xsOf(run));
  expect(runs).toHaveLength(2);
  const [oldRun, newRun] = runs;
  expect(oldRun!.length).toBe(oldXsBefore.length);
  for (let i = 0; i < oldRun!.length; i += 1) {
    expect(oldRun![i]).toBeLessThan(oldXsBefore[i]!); // the old run carried on leftward
  }
  expect(newRun!.at(-1)).toBeCloseTo(TRAIL_X_END, 1); // the newest point is at the head
});

test("practice.tuner/REQ-005 — the frame loop never runs while a note sounds, and stops once the trail is empty", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(440.0, undefined, {
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
  });
  expect(animClock.pending).toBe(false); // sounding — no frame requested
  await letGapPass(f); // silence begins
  expect(animClock.pending).toBe(true); // now the trail is ageing on its own
  animClock.advanceMs(3000); // past the 2.5 s default trail
  act(() => {
    animClock.runFrame();
  });
  expect(screen.queryByTestId("trail")).toBeNull();
  expect(animClock.pending).toBe(false); // stopped once the trail emptied
});

test('practice.tuner/REQ-005 — nothing referenced reads "— IS" over "—"', async () => {
  // practice.tuner/REQ-003/S4 (converge round 1, I6) — the "<note> IS"
  // caption now lingers with the head (T038): nothing is truly referenced
  // only once the screen's own linger has fully passed, not merely once the
  // session's reading has cleared.
  const f = await enterAndHear(440.0);
  await letGapPass(f);
  letLingerPass(f);
  expect(screen.getByText("— IS")).toBeTruthy();
  expect(screen.getByTestId("reference-hz").textContent).toBe("—");
});
