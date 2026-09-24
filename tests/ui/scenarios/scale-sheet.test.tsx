import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import type { Key } from "../../../src/theory/published";
import { ScaleSheet } from "../../../src/ui/ScaleSheet";

afterEach(() => cleanup());
const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};
const eMinor: Key = {
  tonic: { letter: "E", accidental: "natural" },
  mode: "naturalMinor",
};
const rows = () =>
  screen
    .getAllByRole("button")
    .filter((b) => within(b).queryByTestId("scale-formula") !== null)
    .map((b) => [
      b.textContent
        ?.replace(within(b).getByTestId("scale-formula").textContent ?? "", "")
        .replace("✓", "")
        .trim(),
      within(b).getByTestId("scale-formula").textContent,
      within(b).getByTestId("scale-tick").textContent,
    ]);

test("practice.session/REQ-012/S2 — the sheet lists only the current mode's family", async () => {
  const onPick = vi.fn();
  const { unmount } = render(
    <ScaleSheet
      open
      key_={gMajor}
      chosenId="major"
      onPick={onPick}
      onClose={() => undefined}
    />,
  );
  expect(screen.getByText("Scales on G")).toBeTruthy();
  expect(
    screen.getByText("Major family · tap the inner ring for minor"),
  ).toBeTruthy();
  expect(rows()).toEqual([
    ["Major", "1 2 3 4 5 6 7", "✓"],
    ["Major pentatonic", "1 2 3 5 6", ""],
    ["Lydian", "1 2 3 ♯4 5 6 7", ""],
    ["Mixolydian", "1 2 3 4 5 6 ♭7", ""],
    ["Harmonic major", "1 2 3 4 5 ♭6 7", ""],
    ["Whole tone", "1 2 3 ♯4 ♭6 ♭7", ""],
    ["Chromatic", "1 ♯1 2 ♯2 3 4 ♯4 5 ♯5 6 ♯6 7", ""],
  ]);
  await userEvent.click(screen.getByRole("button", { name: /Lydian/ }));
  expect(onPick).toHaveBeenCalledWith("lydian");
  unmount();
  render(
    <ScaleSheet
      open
      key_={eMinor}
      chosenId="natural-minor"
      onPick={onPick}
      onClose={() => undefined}
    />,
  );
  expect(
    screen.getByText("Minor family · tap the outer ring for major"),
  ).toBeTruthy();
  expect(rows().map((r) => r[0])).toEqual([
    "Natural minor",
    "Harmonic minor",
    "Melodic minor · classical",
    "Melodic minor · jazz",
    "Minor pentatonic",
    "Blues",
    "Dorian",
    "Phrygian",
    "Locrian",
    "Whole tone",
    "Chromatic",
  ]);
  expect(rows()[0]![2]).toBe("✓");
});
