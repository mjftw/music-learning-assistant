import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { Session } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeListening,
  sessionDepsWithFakes,
} from "../../practice/fakes";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test
// (the pattern of app-drone.test.tsx).
afterEach(() => {
  cleanup();
});

// T015's shared fixture (reused by T017/T018): renders `<App>`, opens the
// tuner, and feeds one steady pitch through the fake listening port —
// `listening.feed(hz)` publishes it, `clock.advanceMs(1)` runs the
// session's commit-on-next-tick timer (domain/session.ts's
// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
// state update. `spelling` optionally taps the circle's ♭ control before
// entering (theory.circle-of-fifths/REQ-002, exercised the same way
// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
// without duplicating the render/open dance.
async function enterAndHear(
  hz: number,
  spelling?: "sharp" | "flat",
): Promise<{
  readonly listening: FakeListening;
  readonly clock: FakeClock;
  readonly session: Session;
}> {
  localStorage.clear();
  const { sessionDeps, listening, clock } = sessionDepsWithFakes();
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
  if (spelling === "flat") {
    await userEvent.click(screen.getByRole("button", { name: "flat" }));
  }
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
  );
  listening.feed(hz);
  clock.advanceMs(1);
  await act(async () => {});
  if (session === null) {
    throw new Error("unreachable: onSessionReady was not called by render()");
  }
  return { listening, clock, session };
}

test("practice.tuner/REQ-001/S1 — in from idle: the Tuner pill opens the tuner, LISTENING shows", async () => {
  localStorage.clear();
  const { sessionDeps, listening } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
  );
  expect(listening.startCalls).toBe(1);
  expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
});

test("practice.tuner/REQ-001/S4 — out: ‹ Practice returns to the practice screen as it was", async () => {
  localStorage.clear();
  const { sessionDeps, listening } = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
  expect(listening.stopCalls).toBe(1);
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
});

test("practice.tuner/REQ-002/S1 — a little sharp", async () => {
  await enterAndHear(445.0);
  expect(screen.getByTestId("tuner-name").textContent).toBe("A4");
  expect(screen.getByTestId("tuner-tag").textContent).toBe("+20sharp");
  expect(screen.getByTestId("tuner-tag").style.color).toBe(
    "oklch(0.55 0.11 28)",
  );
  expect(screen.getByTestId("tuner-line").style.top).toBe("162.5px");
  // Both edges of the rule read "halfway to" (above *and* below the
  // reading — REQ-002/S1's own text: "'halfway to A♯4' above and 'halfway
  // to G♯4' below"), so this is a multiple match, not a single one.
  expect(screen.getAllByText("halfway to")).toHaveLength(2);
  expect(screen.getByText("A♯4")).toBeTruthy();
  expect(screen.getByText("G♯4")).toBeTruthy();
});

test("practice.tuner/REQ-002/S2 — in tune", async () => {
  await enterAndHear(441.0);
  expect(screen.getByTestId("tuner-tag").textContent).toBe("+4in tune");
  expect(screen.getByTestId("tuner-tag").style.color).toBe(
    "oklch(0.55 0.11 150)",
  );
});

test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
  const f = await enterAndHear(445.0);
  f.clock.advanceMs(300);
  await act(async () => {});
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
});
