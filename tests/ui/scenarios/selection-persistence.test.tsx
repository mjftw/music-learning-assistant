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

const storageKey = "music-learning-assistant.selection.v1";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test.
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

const renderApp = () =>
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );

function pressed(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

function switchChecked(name: string): string | null {
  return screen.getByRole("switch", { name }).getAttribute("aria-checked");
}

async function expectFirstRunDefaults() {
  // Check spelling preference (sharp active)
  expect(pressed("sharp")).toBe("true");
  expect(pressed("flat")).toBe("false");

  // Check view choice (names active)
  expect(pressed("names")).toBe("true");
  expect(pressed("stave")).toBe("false");

  // Check arc degrees visible (7 entries)
  expect(screen.getAllByTestId("arc-degree")).toHaveLength(7);

  // Check distance ring visible (7 arc names)
  expect(screen.getAllByTestId("arc-name")).toHaveLength(7);

  // Check note degrees in names view have text content
  const degrees = screen
    .getAllByTestId("note-degree")
    .map((element) => element.textContent);
  expect(degrees.every((text) => text !== "")).toBe(true);

  // Check settings drawer defaults
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));
  expect(switchChecked("Note names on the stave")).toBe("false");
  expect(switchChecked("Scale degrees")).toBe("true");
  expect(switchChecked("Distance ring")).toBe("true");
  await userEvent.click(screen.getByRole("button", { name: "Close settings" }));
}

test("theory.circle-of-fifths/REQ-008/S1 — resuming mid-week practice", async () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 2,
      variantId: "ocarina-bass-c",
      keyId: "Bb-major",
      spelling: "flat",
      view: "stave",
      span: "oct-1",
      degreesEnabled: false,
      distanceRingEnabled: true,
      staveNamesEnabled: true,
    }),
  );

  const { unmount } = renderApp();

  expect(screen.getByTestId("current-key").textContent).toBe("B♭ major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina Bass C",
  );
  expect(pressed("stave")).toBe("true");
  expect(pressed("names")).toBe("false");
  expect(screen.queryAllByTestId("arc-degree")).toHaveLength(0);
  expect(screen.getAllByTestId("arc-name")).toHaveLength(7);
  expect(screen.getAllByTestId("stave-note-name").length).toBeGreaterThan(0);
  expect(pressed("flat")).toBe("true");
  expect(pressed("sharp")).toBe("false");

  // theory.circle-of-fifths/REQ-008 (T008 review follow-up): persistence has
  // to survive every toggle change, not just the state a session started
  // with — change two preferences through the UI, remount a fresh App over
  // the same storage, and see both choices come back.
  await userEvent.click(screen.getByRole("button", { name: "names" }));
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));
  await userEvent.click(screen.getByRole("switch", { name: "Scale degrees" }));
  await userEvent.click(screen.getByRole("button", { name: "Close settings" }));

  unmount();
  renderApp();

  expect(screen.getByTestId("current-key").textContent).toBe("B♭ major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina Bass C",
  );
  expect(pressed("names")).toBe("true");
  expect(pressed("stave")).toBe("false");
  expect(screen.getAllByTestId("arc-degree")).toHaveLength(7);
});

test("theory.circle-of-fifths/REQ-008/S2 — first run", async () => {
  localStorage.clear();
  renderApp();

  expect(screen.getByTestId("current-key").textContent).toBe("C major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Flute Concert",
  );

  await expectFirstRunDefaults();
});

test("theory.circle-of-fifths/REQ-008/S3 — corrupt stored state", async () => {
  localStorage.clear();
  localStorage.setItem(storageKey, "{not json");
  renderApp();

  expect(screen.getByTestId("current-key").textContent).toBe("C major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Flute Concert",
  );

  await expectFirstRunDefaults();

  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
});

test("theory.circle-of-fifths/REQ-008/S4 — stored state from the previous shape", async () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 1,
      variantId: "ocarina-alto-c",
      keyId: "G-major",
      noteNamesVisible: false,
    }),
  );
  renderApp();

  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina Alto C",
  );

  await expectFirstRunDefaults();
});
