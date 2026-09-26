import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DroneSheet } from "../../../src/ui/DroneSheet";

afterEach(() => {
  cleanup();
});

const base = {
  open: true,
  noteLabel: "G5",
  hz: 783.99,
  on: false,
  sound: "warm" as const,
  onToggle: () => {},
  onPickSound: () => {},
  onClose: () => {},
};

test("practice.drone/REQ-006/S1 — the sheet's content", () => {
  render(<DroneSheet {...base} />);
  expect(screen.getByText("Drone")).toBeTruthy();
  expect(screen.getByText("G5 · 784.0 Hz")).toBeTruthy();
  expect(
    screen.getByText("Follows the key on the circle · A = 440 Hz"),
  ).toBeTruthy();
  expect(
    screen.getByRole("switch", { name: "Drone" }).getAttribute("aria-checked"),
  ).toBe("false");
  expect(
    screen.getByText(
      "Tap a note on the stave or in the names to hear it for one beat — over the drone, to check an interval.",
    ),
  ).toBeTruthy();
});

test("practice.drone/REQ-005/S1 — warm by default, with its hint", async () => {
  const onPick = vi.fn();
  render(<DroneSheet {...base} onPickSound={onPick} />);
  for (const name of ["pure", "warm", "reed"])
    expect(screen.getByRole("button", { name })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "warm" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByText("Soft, organ-like")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "reed" }));
  expect(onPick).toHaveBeenCalledWith("reed");
});

test("practice.drone/REQ-006/S3 — the header follows the key", () => {
  const { rerender } = render(<DroneSheet {...base} />);
  rerender(<DroneSheet {...base} noteLabel="D5" hz={587.33} />);
  expect(screen.getByText("D5 · 587.3 Hz")).toBeTruthy();
});

test("practice.drone/REQ-001/S3 (sheet) — the switch toggles", async () => {
  const onToggle = vi.fn();
  render(<DroneSheet {...base} on onToggle={onToggle} />);
  const sw = screen.getByRole("switch", { name: "Drone" });
  expect(sw.getAttribute("aria-checked")).toBe("true");
  await userEvent.click(sw);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("practice.drone/REQ-005/S3 (sheet) — the reed and pure hints", () => {
  const { rerender } = render(<DroneSheet {...base} sound="reed" />);
  expect(
    screen.getByRole("button", { name: "reed" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByText("Buzzy · closest to a wind drone")).toBeTruthy();
  rerender(<DroneSheet {...base} sound="pure" />);
  expect(
    screen.getByRole("button", { name: "pure" }).getAttribute("aria-pressed"),
  ).toBe("true");
  expect(screen.getByText("Sine · easiest to hear beats against")).toBeTruthy();
});
