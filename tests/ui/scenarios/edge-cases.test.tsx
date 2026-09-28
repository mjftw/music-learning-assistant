// Edge cases from changes/003-hear-the-scale/proposal.md › "Edge cases and
// failure modes" not already exercised by a scenario test (T019). Rows
// already covered are cited here, not duplicated:
//   - first run defaults        → practice.session/REQ-011/S2
//     (tests/ui/scenarios/app-session.test.tsx, tests/ui/scenarios/selection-store.test.ts)
//   - tempo at 40 and 200       → practice.session/REQ-004/S3
//     (tests/practice/scenarios/tempo.test.ts)
//   - oversized octave clamped  → practice.session/REQ-001/S4
//     (tests/practice/scenarios/session-traversal.test.ts)
//   - corrupt stored state      → theory.circle-of-fifths/REQ-008/S3
//     (tests/ui/scenarios/selection-persistence.test.tsx)
// "silent-tick timeout is cancelled by stop" (raised at T009's review) is
// obsolete: T023 removed note length and the silent-tick path entirely —
// every crotchet tick sounds something now, so there is no silent tick left
// to time out.
//
// The one genuinely new row at the app level: ▶ toggles to stop while
// playing, rather than restarting or being ignored
// (practice.session/REQ-002/S2, wired through `App.handleTogglePlay`).
//
// 005-scale-selection's proposal (T017) adds one further row: stored state
// predating this change carries no scale choice at all. The migration
// itself is already covered end to end (selection-store.test.ts's v2→v4
// chain, app-session.test.tsx's REQ-011/S4 v3 payload) — this is a one-line
// reference test that the rendered heading and formula row, specifically,
// show the default scale for a payload from even before that (a v2
// payload, chaining through v3 on the way to v4).

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { SessionDeps } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeListening,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
} from "../../practice/fakes";

const STORAGE_KEY = "music-learning-assistant.selection.v1";

afterEach(() => {
  cleanup();
});

test("practice.session/REQ-002/S2 (app) — ▶ tapped while playing is stop", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  const clock = new FakeClock(sound);
  const sessionDeps: SessionDeps = {
    sound,
    clock,
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
    listening: new FakeListening(),
  };

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  clock.advance(300);

  await userEvent.click(screen.getByRole("button", { name: "Stop" }));

  expect(sound.posted.at(-1)).toEqual({ kind: "stopAll" });
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});

test("practice.session/REQ-011/S4 (ui) — a v2 payload predating scale choice renders the default scale's heading and formula", () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 2,
      variantId: "flute-concert",
      keyId: "G-major",
      spelling: "sharp",
      view: "names",
      span: "full",
      degreesEnabled: true,
      distanceRingEnabled: true,
      staveNamesEnabled: false,
    }),
  );
  const sound = new FakeSound();
  const sessionDeps: SessionDeps = {
    sound,
    clock: new FakeClock(sound),
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
    listening: new FakeListening(),
  };

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  expect(screen.getByTestId("scale-row-formula").textContent).toBe(
    "1 2 3 4 5 6 7",
  );
});
