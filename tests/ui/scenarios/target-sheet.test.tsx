import { act, cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { enterAndHear, enterTuner, letGapPass } from "./tuner-helpers";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test
// (the pattern of tuner-screen.test.tsx / tuner-stave.test.tsx).
afterEach(() => {
  cleanup();
});

test("practice.tuner/REQ-004/S1 — Hold", async () => {
  const f = await enterAndHear(445.0);
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  expect(screen.getByRole("button", { name: "Hold" }).textContent).toContain(
    "A4",
  );
  await userEvent.click(screen.getByRole("button", { name: "Hold" }));
  expect(
    screen.queryByText("Measure from the nearest note, or pin one"),
  ).toBeNull(); // closed
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "TARGETA4",
  );
  f.listening.feed(461.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("tuner-tag").textContent).toContain("▲ 1 st");
  expect(screen.getByText("playing A♯4")).toBeTruthy();
  expect(screen.getByTestId("tuner-line").style.top).toBe("9.5px"); // pinned at +50: 268 − 255 − 3.5
});

test("practice.tuner/REQ-004/S2 — a wedge of the spiral", async () => {
  await enterAndHear(440.0);
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  expect(
    screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("data-position") !== null),
  ).toHaveLength(57); // E2–C7 on the flute
  expect(
    screen.getByRole("button", { name: "E2" }).getAttribute("data-dimmed"),
  ).toBe("true");
  expect(
    screen.getByRole("button", { name: "D5" }).getAttribute("data-dimmed"),
  ).not.toBe("true");
  await userEvent.hover(screen.getByRole("button", { name: "D5" }));
  await userEvent.click(screen.getByRole("button", { name: "D5" }));
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "TARGETD5",
  );
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  expect(screen.getByTestId("spiral-hub").textContent).toContain("D5587.3 Hz");
});

test("practice.tuner/REQ-004/S4 — a semitone either way", async () => {
  const f = await enterAndHear(440.0);
  act(() => {
    f.session.pinTarget(69);
  });
  await userEvent.click(screen.getByRole("button", { name: "Target up" }));
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "A♯4",
  );
  act(() => {
    f.session.pinTarget(96);
  });
  const up: HTMLButtonElement = screen.getByRole("button", {
    name: "Target up",
  });
  expect(up.disabled).toBe(true);
  act(() => {
    f.session.pinTarget(40);
  });
  const down: HTMLButtonElement = screen.getByRole("button", {
    name: "Target down",
  });
  expect(down.disabled).toBe(true);
});

test("practice.tuner/REQ-004/S5 — back to auto", async () => {
  const f = await enterAndHear(445.0);
  act(() => {
    f.session.pinTarget(74);
  });
  await userEvent.click(screen.getByRole("button", { name: "Auto" }));
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "auto · nearest",
  );
  f.listening.feed(445.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
});

test("practice.tuner/REQ-004/S7 — Hold after the note has stopped", async () => {
  const f = await enterAndHear(440.0);
  await letGapPass(f);
  f.clock.advanceMs(2000);
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  const holdCard = screen.getByRole("button", { name: "Hold" });
  expect(holdCard.textContent).toContain("A4");
  expect(holdCard.textContent).toContain("the last note you played");
  expect(screen.getByTestId("spiral-needle").getAttribute("data-state")).toBe(
    "last-heard",
  );
  expect(screen.queryByTestId("spiral-trail")).toBeNull();
  await userEvent.click(holdCard);
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "TARGETA4",
  );
});

test("practice.tuner/REQ-004/S8 — nothing heard yet", async () => {
  await enterTuner();
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  const holdCard = screen.getByRole("button", { name: "Hold" });
  expect(holdCard.textContent).toContain("play a note first");
  expect(screen.queryByTestId("spiral-needle")).toBeNull();
  await userEvent.click(holdCard);
  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
    "auto · nearest",
  );
});

test("practice.tuner/REQ-009/S3 — leaving forgets the last note heard", async () => {
  const f = await enterAndHear(440.0);
  await letGapPass(f);
  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
  );
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  const holdCard = screen.getByRole("button", { name: "Hold" });
  expect(holdCard.textContent).toContain("play a note first");
  expect(screen.queryByTestId("spiral-needle")).toBeNull();
});

test("practice.tuner/REQ-004/S6 — the sheet is not a stop", async () => {
  const f = await enterAndHear(440.0);
  await userEvent.click(screen.getByRole("button", { name: "Target" }));
  f.listening.feed(445.0);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("spiral-needle")).toBeTruthy();
  expect(f.listening.stopCalls).toBe(0);
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(f.listening.stopCalls).toBe(0);
});

test("practice.tuner/REQ-004 — the spiral's needle trail keeps the newest 50 readings", async () => {
  const f = await enterAndHear(440.0);

  // Feed 59 more readings to get 60 total
  for (let i = 0; i < 59; i++) {
    f.listening.feed(440.0);
    f.clock.advanceMs(1);
    await act(async () => {});
  }

  // Open the Target sheet
  await userEvent.click(screen.getByRole("button", { name: "Target" }));

  // Read the spiral-trail element
  const spiralTrail = screen.getByTestId("spiral-trail");
  const pathD = spiralTrail.getAttribute("d");
  expect(pathD).toBeTruthy();

  // Count points by splitting on " L "
  const points = pathD!.split(" L ");

  // Should have at most 50 points and at least 2
  expect(points.length).toBeLessThanOrEqual(50);
  expect(points.length).toBeGreaterThanOrEqual(2);
});
