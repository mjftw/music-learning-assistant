import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import { testSessionDeps } from "../../practice/fakes";

afterEach(cleanup);

const renderApp = () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );
};

test("theory.circle-of-fifths/REQ-002/S1 — the preference respells all three dual positions", async () => {
  renderApp();
  expect(screen.getByRole("button", { name: "B major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "F♯ major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "C♯ major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "G♯ minor" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "flat" }));
  expect(screen.getByRole("button", { name: "C♭ major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "G♭ major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "D♭ major" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "A♭ minor" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "F♯ major" })).toBeNull();
  expect(screen.getByRole("button", { name: "C major" })).toBeTruthy();
});

test("theory.circle-of-fifths/REQ-002/S2 — the selection follows the position across a respell", async () => {
  renderApp();
  await userEvent.click(screen.getByRole("button", { name: "flat" }));
  await userEvent.click(screen.getByRole("button", { name: "G♭ major" }));
  expect(screen.getByTestId("current-key").textContent).toBe("G♭ major");
  await userEvent.click(screen.getByRole("button", { name: "sharp" }));
  expect(screen.getByTestId("current-key").textContent).toBe("F♯ major");
});
