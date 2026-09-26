import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DronePill } from "../../../src/ui/DronePill";

afterEach(cleanup);

test("practice.drone/REQ-001/S1 (pill) — off shows ▶ and the note; on shows ■ and presses", async () => {
  const onToggle = vi.fn();
  const { rerender } = render(
    <DronePill
      noteLabel="G5"
      on={false}
      canStepDown
      canStepUp
      onToggle={onToggle}
      onStepOctave={() => {}}
      onOpenSheet={() => {}}
    />,
  );
  expect(screen.getByTestId("drone-note").textContent).toBe("G5");
  const start = screen.getByRole("button", { name: "Start drone" });
  expect(start.textContent).toBe("▶");
  expect(start.getAttribute("aria-pressed")).toBe("false");
  await userEvent.click(start);
  expect(onToggle).toHaveBeenCalledTimes(1);
  rerender(
    <DronePill
      noteLabel="G5"
      on
      canStepDown
      canStepUp
      onToggle={onToggle}
      onStepOctave={() => {}}
      onOpenSheet={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: "Stop drone" }).textContent).toBe(
    "■",
  );
});

test("practice.drone/REQ-002/S4 (pill) — a stepper at the piano's end is shown unavailable and does nothing", async () => {
  const onStep = vi.fn();
  render(
    <DronePill
      noteLabel="G1"
      on={false}
      canStepDown={false}
      canStepUp
      onToggle={() => {}}
      onStepOctave={onStep}
      onOpenSheet={() => {}}
    />,
  );
  const down = screen.getByRole("button", { name: "Drone octave down" });
  expect(down.getAttribute("aria-disabled")).toBe("true");
  await userEvent.click(down);
  expect(onStep).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Drone octave up" }),
  );
  expect(onStep).toHaveBeenCalledWith(1);
});

test("practice.drone/REQ-006 (pill) — ▼ opens the sheet", async () => {
  const onOpen = vi.fn();
  render(
    <DronePill
      noteLabel="G5"
      on={false}
      canStepDown
      canStepUp
      onToggle={() => {}}
      onStepOctave={() => {}}
      onOpenSheet={onOpen}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});
