// design-loop variant (007 round 4) — exploration for the tuner's silence
// treatment (the problem: "it's very abrupt how quickly everything
// disappears when going from hearing something to nothing"). TEMPORARY:
// behind `?variant=a|b|c`; one treatment becomes the rule in a later task
// and this whole file is deleted along with every other block carrying
// this comment.
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  enterAndHear,
  letGapPass,
  manualAnimationClock,
} from "./tuner-helpers";

afterEach(() => {
  cleanup();
});

test("design-loop variant (007 round 4) — a: fades over 600 ms, then Play a note", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "fade",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);

  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
  expect(screen.queryByTestId("tuner-empty")).toBeNull();

  act(() => {
    animClock.advanceMs(600);
  });

  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

test("design-loop variant (007 round 4) — b: lingers 1000 ms, then fades 400 ms more", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "linger",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);

  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "fading",
  );

  act(() => {
    animClock.advanceMs(1000);
  });
  expect(screen.getByTestId("tuner-line")).toBeTruthy();
  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
  expect(screen.getByTestId("heard-head")).toBeTruthy();
  expect(screen.queryByTestId("tuner-empty")).toBeNull();

  act(() => {
    animClock.advanceMs(400);
  });
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

test("design-loop variant (007 round 4) — c: ghosts until the next reading, no timer", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "ghost",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);

  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "ghost",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "ghost",
  );
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "ghost",
  );
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");

  act(() => {
    animClock.advanceMs(10_000);
  });
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "ghost",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "ghost",
  );
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "ghost",
  );

  f.listening.feed(523.25); // C5
  f.clock.advanceMs(1);
  await act(async () => {});

  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
  expect(document.querySelectorAll('[data-state="ghost"]').length).toBe(0);
});

test("design-loop variant (007 round 4) — a, interrupted: a new reading during the fade replaces it live at once", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "fade",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(animClock.timerPending).toBe(true);

  f.listening.feed(523.25); // C5
  f.clock.advanceMs(1);
  await act(async () => {});

  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
  expect(animClock.timerPending).toBe(false);
});

test("design-loop variant (007 round 4) — default: no silence prop removes everything at once, as today", async () => {
  const f = await enterAndHear(445.0);
  await letGapPass(f);
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

// design-loop variant (007 round 4, follow-up 1) — the heard head's own
// furniture (ledgers, accidental, octave mark, dotted guide) must linger
// with the head, not vanish out from under it while it still fades/holds/
// ghosts (a floating head with no ledger lines, or an accidental-less
// sharp, reads as a different note).

test("design-loop variant (007 round 4, follow-up 1) — a: the ledger lines linger with the head, then fade with it", async () => {
  const animClock = manualAnimationClock();
  // C6 (two ledger lines above the stave — practice.tuner/REQ-005/S3's own
  // register/ledger arithmetic).
  const f = await enterAndHear(1046.5, undefined, {
    silence: "fade",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  expect(screen.getAllByTestId("heard-ledger")).toHaveLength(2);
  await letGapPass(f);

  const ledgers = screen.getAllByTestId("heard-ledger");
  expect(ledgers).toHaveLength(2);
  for (const ledger of ledgers) {
    expect(ledger.getAttribute("data-state")).toBe("fading");
  }
  expect(screen.getByTestId("heard-guide").getAttribute("data-state")).toBe(
    "fading",
  );

  act(() => {
    animClock.advanceMs(600);
  });
  expect(screen.queryAllByTestId("heard-ledger")).toHaveLength(0);
  expect(screen.queryByTestId("heard-guide")).toBeNull();
});

test("design-loop variant (007 round 4, follow-up 1) — a: the accidental glyph lingers with the head, then fades with it", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(466.16, "sharp", {
    silence: "fade",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  expect(screen.getByTestId("heard-accidental").textContent).toBe("♯");
  await letGapPass(f);

  expect(
    screen.getByTestId("heard-accidental").getAttribute("data-state"),
  ).toBe("fading");

  act(() => {
    animClock.advanceMs(600);
  });
  expect(screen.queryByTestId("heard-accidental")).toBeNull();
});

test("design-loop variant (007 round 4, follow-up 1) — c: the octave mark stays ghosted with the head", async () => {
  const animClock = manualAnimationClock();
  // E2, drawn under 8vb (practice.tuner/REQ-005/S3).
  const f = await enterAndHear(82.41, undefined, {
    silence: "ghost",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
  await letGapPass(f);

  expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
  expect(
    screen.getByTestId("heard-octave-mark").getAttribute("data-state"),
  ).toBe("ghost");
});

test("design-loop variant (007 round 4, follow-up 2) — linger with its own timing (600 ms hold, 200 ms fade)", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "linger",
    lingerMs: 600,
    lingerFadeMs: 200,
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );

  act(() => {
    animClock.advanceMs(600);
  });
  expect(screen.getByTestId("tuner-line")).toBeTruthy();
  expect(screen.queryByTestId("tuner-empty")).toBeNull();

  act(() => {
    animClock.advanceMs(200);
  });
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

test("design-loop variant (007 round 4, follow-up 1) — a: the head does not jump between the last sounding render and the first silent one", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    silence: "fade",
    now: animClock.now,
    requestFrame: animClock.requestFrame,
    cancelFrame: animClock.cancelFrame,
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  const soundingTransform = screen.getByTestId("heard-head").style.transform;

  await letGapPass(f);
  const firstSilentTransform = screen.getByTestId("heard-head").style.transform;

  expect(firstSilentTransform).toBe(soundingTransform);
});
