import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";
import { isTone, sessionDepsWithFakes } from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

const STORAGE_KEY = "music-learning-assistant.selection.v1";

// A stored v5 payload for G major on flute Concert, names view, ↑↓ 2 oct,
// 120 bpm — REQ-013/S2 is given against this fixture.
const storedPayloadS2: StoredSelection = {
  ...firstRunDefaults,
  variantId: "flute-concert",
  keyId: "G-major",
  view: "names",
  traversal: { direction: "updown", octaves: 2, shape: "scale" },
  session: { ...firstRunDefaults.session, tempoBpm: 120 },
};

// A stored v5 payload for G melodic minor · classical on flute Concert,
// names view, ↑↓ — REQ-013/S6 is given against this fixture.
const storedPayloadS6: StoredSelection = {
  ...firstRunDefaults,
  variantId: "flute-concert",
  keyId: "G-naturalMinor",
  view: "names",
  scale: { major: "major", minor: "melodic-minor-classical" },
};

// Drives a tap's async start() round trip (sound.start(), then the tone
// post) to completion — the same shape as stave-tap.test.tsx's own local
// `flush`, wrapped in `act()` since it flushes React state updates too.
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("practice.session/REQ-013/S2 (names) — a tapped column sounds the run's lowest note of that name and lights for one beat", async () => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayloadS2));
  const { sessionDeps, sound, clock } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  const dColumn = screen.getByRole("button", { name: "D" });
  await userEvent.click(dColumn);
  await flush();

  expect(sound.posted.filter(isTone)[0]!.hz).toBeCloseTo(587.33, 2);
  expect(sound.posted.filter(isTone)[0]!.durationFrames).toBe(24000);

  act(() => {
    clock.advance(30);
  });

  const columns = screen.getAllByTestId("names-column");
  columns.forEach((column) => {
    const isD = column === dColumn;
    expect(column.getAttribute("data-sounding")).toBe(isD ? "true" : "false");
  });

  act(() => {
    clock.advance(500);
  });

  expect(
    screen
      .getAllByTestId("names-column")
      .every((column) => column.getAttribute("data-sounding") === "false"),
  ).toBe(true);
});

test("practice.session/REQ-013/S6 (names) — the ↓ column sounds the descent's own note", async () => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayloadS6));
  const { sessionDeps, sound } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  const fColumn = screen
    .getAllByRole("button", { name: "F" })
    .find((column) => column.getAttribute("data-descent") === "true");
  if (fColumn === undefined) {
    throw new Error("unreachable: no descent-marked F column");
  }
  await userEvent.click(fColumn);
  await flush();

  expect(sound.posted.filter(isTone)[0]!.hz).toBeCloseTo(698.46, 2);
});
