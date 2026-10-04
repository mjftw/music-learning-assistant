import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { Session } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";
import {
  advanceUntil,
  FakeSound,
  isDrone,
  isRetune,
  isStop,
  isTone,
  sessionDepsWithFakes,
} from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

const STORAGE_KEY = "music-learning-assistant.selection.v1";

// A full, valid v5 `StoredSelection` — every field at its first-run
// default, standing in for "a stored payload" wherever a scenario needs
// one to override fields on (keyId, drone, …).
const storedPayload: StoredSelection = {
  ...firstRunDefaults,
  variantId: "flute-concert",
  keyId: "C-major",
};

// Drives `startDrone()`'s two internal awaits (sound.start(), then
// wakeLock.acquire()) to completion, the same shape as fakes.ts's own
// `startDroneAndFlush` — but wrapped in `act()` since this flushes React
// state updates too, not just the session's own promises.
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("practice.drone/REQ-001/S1 (app) — tapping ▶ on the pill sounds G5 and the pill shows ■", async () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...storedPayload,
      keyId: "G-major",
      variantId: "flute-concert",
    }),
  );
  const { sessionDeps, sound } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  expect(screen.getByTestId("drone-note").textContent).toBe("G5");
  await userEvent.click(screen.getByRole("button", { name: "Start drone" }));
  await flush();
  expect(sound.posted.filter(isDrone)[0]!.hz).toBeCloseTo(783.99, 2);
  expect(screen.getByRole("button", { name: "Stop drone" })).toBeTruthy();
});

test("practice.drone/REQ-001/S3 (app) — the sheet's switch and the pill are one control", async () => {
  localStorage.clear();
  const { sessionDeps } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  await userEvent.click(screen.getByRole("switch", { name: "Drone" }));
  await flush();
  expect(screen.getByRole("button", { name: "Stop drone" })).toBeTruthy();

  await userEvent.click(
    screen.getByRole("button", { name: "Close drone sheet" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Stop drone" }));
  expect(screen.getByRole("button", { name: "Start drone" })).toBeTruthy();

  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  expect(
    screen.getByRole("switch", { name: "Drone" }).getAttribute("aria-checked"),
  ).toBe("false");
});

test("practice.drone/REQ-001/S4 (app) — sheets, the drawer and the picker never stop it", async () => {
  localStorage.clear();
  const { sessionDeps, sound } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Start drone" }));
  await flush();
  expect(sound.posted.filter(isDrone)).toHaveLength(1);

  const openCloseNames: ReadonlyArray<readonly [string, string]> = [
    ["Edit traversal", "Close traversal sheet"],
    ["Edit scale", "Close scale sheet"],
    ["Andante", "Close tempo sheet"],
    ["Edit drone", "Close drone sheet"],
    ["Settings", "Close settings"],
    ["Instrument", "Close instrument picker"],
  ];

  for (const [openName, closeName] of openCloseNames) {
    await userEvent.click(screen.getByRole("button", { name: openName }));
    await userEvent.click(screen.getByRole("button", { name: closeName }));
    expect(sound.posted.filter(isStop)).toHaveLength(0);
    expect(sound.posted.filter(isRetune)).toHaveLength(0);
    expect(sound.posted.filter(isDrone)).toHaveLength(1);
  }
}, 15_000);

test("practice.drone/REQ-006/S2 (app) — the sheet is not a control", async () => {
  localStorage.clear();
  const { sessionDeps, sound, clock } = sessionDepsWithFakes();
  let session: Session | null = null;

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
      onSessionReady={(readySession) => {
        session = readySession;
      }}
    />,
  );
  if (session === null) throw new Error("unreachable: session not ready");
  const readySession: Session = session;

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => {
    advanceUntil(clock, () => sound.posted.some(isTone));
  });

  const advanceTicks = (count: number): void => {
    let beats = 0;
    const unsubscribe = readySession.onTargetAdvanced(() => {
      beats += 1;
    });
    while (beats < count) {
      act(() => {
        clock.advance(5);
      });
    }
    unsubscribe();
  };

  advanceTicks(3);
  const tonesBeforeOpen = sound.posted.filter(isTone).length;

  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  advanceTicks(3);
  await userEvent.click(
    screen.getByRole("button", { name: "Close drone sheet" }),
  );

  expect(sound.posted.filter(isDrone)).toHaveLength(0);
  expect(sound.posted.filter(isTone).length).toBeGreaterThan(tonesBeforeOpen);
});

test("practice.drone/REQ-008/S1 (app) — no sound: the notice appears, the pill stays off", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  sound.failWith = { reason: "no-audio-context", detail: "test" };
  const { sessionDeps } = sessionDepsWithFakes(sound);

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Start drone" }));
  await flush();

  expect(screen.getByRole("status").textContent).toContain("Sound unavailable");
  expect(screen.getByRole("button", { name: "Start drone" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("practice.drone/REQ-009/S1 (app) — back where it was", async () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...storedPayload,
      keyId: "G-major",
      variantId: "flute-concert",
      drone: { octave: 4, sound: "reed" },
    }),
  );
  const { sessionDeps } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(screen.getByTestId("drone-note").textContent).toBe("G4");
  expect(screen.getByRole("button", { name: "Start drone" })).toBeTruthy();

  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  expect(
    screen.getByRole("button", { name: "reed" }).getAttribute("aria-pressed"),
  ).toBe("true");
  await userEvent.click(
    screen.getByRole("button", { name: "Close drone sheet" }),
  );

  await userEvent.click(screen.getByRole("button", { name: "D major" }));
  expect(screen.getByTestId("drone-note").textContent).toBe("D4");
});

test("practice.drone/REQ-009/S2 (app) — first run", () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );

  expect(screen.getByTestId("drone-note").textContent).toBe("C5");
  expect(screen.getByRole("button", { name: "Start drone" })).toBeTruthy();

  act(() => {
    screen.getByRole("button", { name: "Edit drone" }).click();
  });
  expect(
    screen.getByRole("button", { name: "warm" }).getAttribute("aria-pressed"),
  ).toBe("true");
});

test("practice.drone/REQ-009 (app) — the octave and sound are saved, on/off never", async () => {
  localStorage.clear();
  const { sessionDeps } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(
    screen.getByRole("button", { name: "Drone octave down" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Edit drone" }));
  await userEvent.click(screen.getByRole("button", { name: "reed" }));
  await userEvent.click(screen.getByRole("button", { name: "Start drone" }));
  await flush();

  const stored = JSON.parse(
    localStorage.getItem(STORAGE_KEY)!,
  ) as StoredSelection;
  expect(stored.drone).toEqual({ octave: 4, sound: "reed" });
  expect(Object.keys(stored.drone)).toEqual(["octave", "sound"]);
});
