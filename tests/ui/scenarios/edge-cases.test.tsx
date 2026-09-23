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
