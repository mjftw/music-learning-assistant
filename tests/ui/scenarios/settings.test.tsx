import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { SessionDeps } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
} from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

// This suite doesn't exercise the session — a bare set of fakes is enough
// to satisfy App's now-required `sessionDeps` (practice.session/REQ-011,
// T016).
function testSessionDeps(): SessionDeps {
  const sound = new FakeSound();
  return {
    sound,
    clock: new FakeClock(sound),
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
  };
}

const setup = () => {
  localStorage.clear();
  return render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );
};

const openSettings = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));
};

test("theory.circle-of-fifths/REQ-009/S3 — switching the ring off removes everything key-relative", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  const currentKeyBefore = screen.getByTestId("current-key").textContent;

  await openSettings();
  await userEvent.click(screen.getByRole("switch", { name: "Distance ring" }));

  expect(screen.getByTestId("distance-ring").children.length).toBe(0);
  expect(screen.queryAllByTestId("arc-degree")).toHaveLength(0);
  expect(screen.queryAllByTestId("arc-name")).toHaveLength(0);

  // 12 positions × (1 major + 1 minor) — one spelling per dual position, not
  // both, so 24 wedge buttons in total (not 27).
  const wedgeButtons = screen.getAllByRole("button", { name: /major|minor/ });
  expect(wedgeButtons).toHaveLength(24);

  expect(screen.getByTestId("current-key").textContent).toBe(currentKeyBefore);
});

test("theory.circle-of-fifths/REQ-010/S2 — disabling degrees clears both places", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  const marksBefore = screen
    .getAllByTestId("note-mark")
    .map((element) => element.textContent);

  await openSettings();
  await userEvent.click(screen.getByRole("switch", { name: "Scale degrees" }));

  expect(screen.queryAllByTestId("arc-degree")).toHaveLength(0);
  const noteDegrees = screen
    .getAllByTestId("note-degree")
    .map((element) => element.textContent);
  expect(noteDegrees.every((text) => text === "")).toBe(true);

  expect(screen.getAllByTestId("arc-name")).toHaveLength(7);

  const marksAfter = screen
    .getAllByTestId("note-mark")
    .map((element) => element.textContent);
  expect(marksAfter).toEqual(marksBefore);
});
