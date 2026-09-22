import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
  summaryLineOf,
  type SessionDeps,
} from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import {
  builtInCatalogue,
  effectiveOctavesOf,
} from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  advanceUntil,
  FakeClock,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
  keyOf,
  variantOf,
} from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

const STORAGE_KEY = "music-learning-assistant.selection.v1";

function testSessionDeps(sound = new FakeSound()): {
  readonly sessionDeps: SessionDeps;
  readonly sound: FakeSound;
  readonly clock: FakeClock;
} {
  const clock = new FakeClock(sound);
  return {
    sessionDeps: {
      sound,
      clock,
      wakeLock: new FakeWakeLock(),
      visibility: new FakeVisibility(),
    },
    sound,
    clock,
  };
}

function isTone(
  command: SoundCommand,
): command is Extract<SoundCommand, { kind: "tone" }> {
  return command.kind === "tone";
}

test("practice.session/REQ-011/S2 (app) — first run shows the S2 defaults in the transport and traversal row", () => {
  localStorage.clear();
  const { sessionDeps } = testSessionDeps();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(screen.getByText("↑↓ · 1 oct · scale · ♩ · loop")).toBeTruthy();
  expect(screen.getByText("96")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Andante" })).toBeTruthy();
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "8 notes · C4–C5",
  );
});

test("practice.session/REQ-011/S1 (app) — a stored v3 payload is restored exactly, idle", () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      variantId: "flute-concert",
      keyId: "C-major",
      spelling: "sharp",
      view: "names",
      degreesEnabled: true,
      distanceRingEnabled: true,
      staveNamesEnabled: false,
      traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
      session: {
        noteLength: "quaver",
        soundMode: "metronome",
        loop: false,
        countIn: false,
        restBar: true,
        tempoBpm: 132,
      },
    }),
  );
  const { sessionDeps } = testSessionDeps();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(screen.getByText("↓ · 2 oct · click only · ♪ · once")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});

test("practice.session/REQ-011/S3 (app) — a stored v2 payload keeps the selection and takes the S2 defaults for the rest", () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      variantId: "ocarina-bass-c",
      keyId: "Bb-major",
      spelling: "flat",
      view: "names",
      span: "full",
      degreesEnabled: true,
      distanceRingEnabled: true,
      staveNamesEnabled: false,
    }),
  );
  const { sessionDeps } = testSessionDeps();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(screen.getByTestId("current-key").textContent).toBe("B♭ major");
  expect(screen.getByTestId("current-variant").textContent).toBe(
    "Ocarina Bass C",
  );
  const expectedSummary = summaryLineOf(
    defaultTraversal,
    effectiveOctavesOf(
      keyOf("Bb"),
      variantOf("ocarina-bass-c"),
      defaultTraversal.octaves,
    ),
    defaultSessionSettings,
  );
  expect(screen.getByText(expectedSummary)).toBeTruthy();
  expect(screen.getByText("96")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Andante" })).toBeTruthy();
});

test("practice.session/REQ-010/S1 (UI) — a notice appears, nothing modal opens, and the run still walks silently", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  sound.failWith = { reason: "worklet-failed", detail: "" };
  const { sessionDeps, clock } = testSessionDeps(sound);

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Play" }));

  await screen.findByText(
    "Sound unavailable — the run still shows; tap ▶ to try again",
  );
  expect(screen.queryByRole("dialog")).toBeNull();

  act(() => {
    advanceUntil(clock, () => sound.posted.some(isTone));
  });
  const firstTone = sound.posted.find(isTone);
  if (firstTone === undefined) throw new Error("unreachable: no tone posted");
  act(() => {
    sound.fireOnset(firstTone.tag);
  });

  expect(screen.getByTestId("position-caption").textContent).toBe(
    "C4 · 1 of 15",
  );
});

test("practice.session/REQ-007/S3, REQ-010/S2 (UI) — no sound before the gesture, and a sheet opening/closing mid-run is not a stop", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  const { sessionDeps, clock } = testSessionDeps(sound);

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(sound.startCalls).toBe(0);

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => {
    advanceUntil(clock, () => sound.posted.some(isTone));
  });

  await userEvent.click(screen.getByRole("button", { name: "Edit traversal" }));
  act(() => {
    clock.advance(2000);
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Close traversal sheet" }),
  );

  expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  expect(sound.posted.some((command) => command.kind === "stopAll")).toBe(
    false,
  );
});
