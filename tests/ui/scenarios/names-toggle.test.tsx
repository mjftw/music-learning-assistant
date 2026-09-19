import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

// jsdom has no canvas backing, so VexFlow's text-measurement canvas
// (Element.getTextMeasurementCanvas) can't get a 2D context; VexFlow copes
// (falls back to zeroed metrics) but jsdom logs a "not implemented" error
// per call, which is noisy rather than a real failure. This is the minimal
// stand-in the rendered stave needs to lay out text without that noise.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => ({
    measureText: (text: string) => ({
      width: text.length * 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    }),
    // Unchecked cast: this stand-in only implements the one method VexFlow's
    // text measurement actually calls, not the full CanvasRenderingContext2D
    // surface `getContext`'s real type promises.
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

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
