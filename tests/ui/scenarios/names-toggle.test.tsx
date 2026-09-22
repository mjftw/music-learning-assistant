import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

afterEach(() => {
  cleanup();
});

const setup = () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
};

test("theory.circle-of-fifths/REQ-007/S1 — switching names off hides them, notes remain", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  expect(screen.getAllByTestId("note-name").length).toBe(22);
  await userEvent.click(screen.getByRole("switch", { name: /note names/i }));
  expect(screen.queryAllByTestId("note-name")).toHaveLength(0);
  expect(screen.getByTestId("stave")).toBeTruthy();
});

test("theory.circle-of-fifths/REQ-007/S2 — the choice sticks across key changes", async () => {
  setup();
  await userEvent.click(screen.getByRole("switch", { name: /note names/i }));
  await userEvent.click(screen.getByRole("button", { name: "D major" }));
  expect(screen.queryAllByTestId("note-name")).toHaveLength(0);
});
