import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

const storageKey = "music-learning-assistant.selection.v1";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test.
afterEach(() => {
  cleanup();
});

test("theory.circle-of-fifths/REQ-008/S2 — first run shows C major on the flute, names on", () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("C major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Flute Concert",
  );
});

test("theory.circle-of-fifths/REQ-008/S1 — reopening restores Bb major on Bass C with names hidden", () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 1,
      variantId: "ocarina-bass-c",
      keyId: "Bb-major",
      noteNamesVisible: false,
    }),
  );
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("B♭ major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina Bass C",
  );
});

test("theory.circle-of-fifths/REQ-008/S3 — corrupt storage falls back to the default, usable", () => {
  localStorage.setItem(storageKey, "{not json");
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("C major");
});

test("theory.circle-of-fifths/REQ-008/S3 — stored selection naming an unknown variant falls back to default", () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 1,
      variantId: "ocarina-soprano-g",
      keyId: "G-major",
      noteNamesVisible: true,
    }),
  );
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("C major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Flute Concert",
  );
});
