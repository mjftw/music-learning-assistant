import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue, loadCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test.
afterEach(() => {
  cleanup();
});

test("theory.instruments/REQ-001/S2 — completing a selection names a variant", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Instrument" }),
    "ocarina-alto-c",
  );
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina — Alto C",
  );
});

test("theory.instruments/REQ-003/S2 — the notice interrupts nothing", async () => {
  localStorage.clear();
  const withBroken = loadCatalogue(
    new Map<string, unknown>([
      [
        "flute-concert.json",
        {
          instrumentId: "flute",
          instrumentName: "Flute",
          variantId: "flute-concert",
          variantName: "Concert",
          range: { lowest: "C4", highest: "C7" },
        },
      ],
      [
        "broken.json",
        {
          instrumentId: "ocarina",
          instrumentName: "Ocarina",
          variantId: "broken",
          variantName: "Broken",
          range: { lowest: "F6", highest: "A4" },
        },
      ],
    ]),
  );
  render(
    <App
      catalogue={withBroken}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  expect(screen.getByRole("status").textContent).toContain("broken.json");
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
});
