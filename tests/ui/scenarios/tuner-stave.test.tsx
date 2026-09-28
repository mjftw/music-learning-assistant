import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { enterAndHear } from "./tuner-helpers";

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

test("practice.tuner/REQ-005 — the trail keeps the last 50 readings, oldest first", async () => {
  const f = await enterAndHear(440.0);
  for (let k = 0; k < 60; k += 1) {
    f.listening.feed(440.0 + k * 0.1);
    f.clock.advanceMs(1);
    await act(async () => {});
  }
  expect(
    screen.getByTestId("trail").getAttribute("d")!.split(" L "),
  ).toHaveLength(50);
});
