// practice.tuner/REQ-003 — the last reading's own linger: once nothing more
// is detected it stays where it was, grey, for motion.lingerHoldMs, then
// fades out over motion.lingerFadeMs, before "Play a note" takes its place.
// S4–S6 are the rule's own scenarios; the rest below were kept from the
// design-loop exploration that arrived at it (rounds.md, round 4), renamed
// to state the rule rather than the exploration that found it.
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { motion, paper } from "../../../src/ui/theme";
import {
  enterAndHear,
  letGapPass,
  letLingerPass,
  manualAnimationClock,
} from "./tuner-helpers";

// jsdom's CSSOM canonicalises a hex colour set via an inline style object
// to `rgb(...)` (but leaves a function colour like `oklch(...)` alone) —
// this reproduces that canonicalisation from the theme's own hex tokens
// rather than hardcoding the converted string.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("practice.tuner/REQ-003/S4 — the last reading lingers, then goes", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);

  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-line").getAttribute("aria-hidden")).toBe(
    "true",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-tag").style.color).toBe(rgbOf(paper.faint));
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("strip-cents").textContent).toBe("+20");
  expect(screen.getByTestId("heard-hz").textContent).toBe("445.0 Hz");
  expect(screen.getByTestId("heard-hz").style.color).toBe(rgbOf(paper.faint));
  // practice.tuner/REQ-003/S4 (converge round 1, I6) — the "<note> IS"
  // caption lingers grey alongside "HEARD", not clearing to "— IS" at once.
  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
  expect(screen.getByTestId("reference-hz").style.color).toBe(
    rgbOf(paper.faint),
  );
  expect(screen.queryByTestId("tuner-empty")).toBeNull();

  // 0.5 s later they are still shown.
  act(() => {
    animClock.advanceMs(500);
  });
  expect(screen.getByTestId("tuner-line")).toBeTruthy();
  expect(screen.getByTestId("tuner-tag")).toBeTruthy();
  expect(screen.getByTestId("heard-head")).toBeTruthy();
  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.queryByTestId("tuner-empty")).toBeNull();

  // 0.8 s after they turned grey they are gone and "Play a note" is shown:
  // the remaining 0.1 s of the hold, then the 0.2 s fade.
  act(() => {
    animClock.advanceMs(motion.lingerHoldMs - 500);
  });
  act(() => {
    animClock.advanceMs(motion.lingerFadeMs);
  });
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.queryByTestId("strip-cents")).toBeNull();
  expect(screen.getByTestId("heard-hz").textContent).toBe("—");
  expect(screen.getByTestId("reference-hz").textContent).toBe("—");
  expect(screen.getByText("— IS")).toBeTruthy();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

test("practice.tuner/REQ-003/S5 — a note during the linger", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(animClock.timerPending).toBe(true); // the linger's own timer is armed

  f.listening.feed(523.25); // C5
  f.clock.advanceMs(1);
  await act(async () => {});

  expect(screen.getByTestId("tuner-name").textContent).toBe("C5");
  expect(document.querySelectorAll('[data-state="fading"]').length).toBe(0);
  expect(screen.queryByTestId("tuner-empty")).toBeNull(); // never appeared in between
  expect(animClock.timerPending).toBe(false); // the pending linger timer was cancelled
});

test("practice.tuner/REQ-003/S6 — lingering with a target", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(440.0, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  act(() => {
    f.session.pinTarget(69); // A4
  });
  f.listening.feed(523.25); // C5, now measured from A4 (REQ-004/S3)
  f.clock.advanceMs(1);
  await act(async () => {});

  await letGapPass(f);

  // The big name follows REQ-003/S2 at once — no linger of its own.
  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");

  // The line, the tag, the heard head and the Hz linger grey and fade, as S4.
  expect(screen.getByTestId("tuner-line").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("tuner-tag").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("heard-head").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("heard-hz").textContent).toBe("523.3 Hz");
  // practice.tuner/REQ-003/S6 (converge round 1, I6) — "A4 IS 440.0 Hz"
  // lingers grey and fades as in S4, even though the target's own name
  // (above) never lingers — the two follow different rules.
  expect(screen.getByTestId("reference-hz").getAttribute("data-state")).toBe(
    "fading",
  );
  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");

  letLingerPass({ timer: animClock });
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
  // Once gone, the strip shows only the target's grey head with "A4 IS
  // 440.0 Hz" again (S2) — full strength, no longer fading.
  expect(screen.getByTestId("reference-hz").textContent).toBe("440.0 Hz");
  expect(
    screen.getByTestId("reference-hz").getAttribute("data-state"),
  ).toBeNull();
});

test("practice.tuner/REQ-003 — reduced motion removes the linger at 0.8 s without fading", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  await letGapPass(f);

  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();

  act(() => {
    animClock.advanceMs(motion.lingerHoldMs);
  });
  expect(screen.getByTestId("tuner-line")).toBeTruthy();
  expect(screen.getByTestId("tuner-line").style.transition).toBeFalsy();
  expect(screen.getByTestId("heard-head").style.transition).toBeFalsy();

  act(() => {
    animClock.advanceMs(motion.lingerFadeMs);
  });
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("heard-head")).toBeNull();
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
});

// The heard head's own furniture (ledgers, accidental, octave mark, dotted
// guide) must linger with the head, not vanish out from under it while it
// still fades (a floating head with no ledger lines, or an accidental-less
// sharp, reads as a different note).

test("practice.tuner/REQ-003 — the ledger lines linger with the head, then fade with it", async () => {
  const animClock = manualAnimationClock();
  // C6 (two ledger lines above the stave — practice.tuner/REQ-005/S3's own
  // register/ledger arithmetic).
  const f = await enterAndHear(1046.5, undefined, {
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

  letLingerPass({ timer: animClock });
  expect(screen.queryAllByTestId("heard-ledger")).toHaveLength(0);
  expect(screen.queryByTestId("heard-guide")).toBeNull();
});

test("practice.tuner/REQ-003 — the accidental glyph lingers with the head, then fades with it", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(466.16, "sharp", {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  expect(screen.getByTestId("heard-accidental").textContent).toBe("♯");
  await letGapPass(f);

  expect(
    screen.getByTestId("heard-accidental").getAttribute("data-state"),
  ).toBe("fading");

  letLingerPass({ timer: animClock });
  expect(screen.queryByTestId("heard-accidental")).toBeNull();
});

test("practice.tuner/REQ-003 — the octave mark lingers with the head", async () => {
  const animClock = manualAnimationClock();
  // E2, drawn under 8vb (practice.tuner/REQ-005/S3).
  const f = await enterAndHear(82.41, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
  await letGapPass(f);

  expect(screen.getByTestId("heard-octave-mark").textContent).toBe("8vb");
  expect(
    screen.getByTestId("heard-octave-mark").getAttribute("data-state"),
  ).toBe("fading");
});

test("practice.tuner/REQ-003 — the head does not jump between the last sounding render and the first silent one", async () => {
  const animClock = manualAnimationClock();
  const f = await enterAndHear(445.0, undefined, {
    setTimer: animClock.setTimer,
    clearTimer: animClock.clearTimer,
  });
  const soundingTransform = screen.getByTestId("heard-head").style.transform;

  await letGapPass(f);
  const firstSilentTransform = screen.getByTestId("heard-head").style.transform;

  expect(firstSilentTransform).toBe(soundingTransform);
});
