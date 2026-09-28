import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import { sessionDepsWithFakes } from "../../practice/fakes";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test
// (the pattern of app-drone.test.tsx).
afterEach(() => {
  cleanup();
});

test("practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows", async () => {
  localStorage.clear();
  const { sessionDeps, listening } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
  );
  expect(listening.startCalls).toBe(1);
  expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
});

test("practice.tuner/REQ-001/S4 — out: ‹ Practice returns to the practice screen as it was", async () => {
  localStorage.clear();
  const { sessionDeps, listening } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
  expect(listening.stopCalls).toBe(1);
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});
