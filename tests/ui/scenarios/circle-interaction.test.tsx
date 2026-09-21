import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test.
afterEach(() => {
  cleanup();
});

test("theory.circle-of-fifths/REQ-001/S2 — selecting E minor on the inner ring shows its key view, aligned with its relative major", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  const gMajorWedge = screen.getByRole("button", { name: "G major" });
  const eMinorWedge = screen.getByRole("button", { name: "E minor" });
  expect(eMinorWedge.getAttribute("data-position-index")).toBe(
    gMajorWedge.getAttribute("data-position-index"),
  );

  await userEvent.click(eMinorWedge);
  expect(screen.getByTestId("current-key").textContent).toBe("E minor");
});
