import { createElement, type ComponentProps } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import type { Session } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeListening,
  sessionDepsWithFakes,
} from "../../practice/fakes";

// Shared by tuner-screen.test.tsx (T015) and tuner-stave.test.tsx (T016) —
// moved out of tuner-screen.test.tsx once a second file needed it. Renders
// <App>, opens the tuner, and feeds one steady pitch through the fake
// listening port — `listening.feed(hz)` publishes it, `clock.advanceMs(1)`
// runs the session's commit-on-next-tick timer (domain/session.ts's
// `tunerCommitCancel`), and the wrapping `act` flushes the resulting React
// state update. `spelling` optionally taps the circle's ♭ control before
// entering (theory.circle-of-fifths/REQ-002, exercised the same way
// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
// without duplicating the render/open dance. `extraProps` lets a scenario
// override any of <App>'s own props (e.g. a different catalogue) without
// re-deriving the whole render/open dance itself.
//
// Plain `.ts` (not `.tsx`) per the brief — `createElement` stands in for
// JSX so the file needs no JSX transform.
//
// A scenario may call this more than once (tuner-stave.test.tsx's
// REQ-005/S3 feeds two separate frequencies to see how the strip writes
// each) — `cleanup()` here tears down any previous render first, so a
// second call gets a fresh `<App>` rather than a second one stacked beside
// it (each test file's own `afterEach(cleanup)` still handles the last one).
export async function enterAndHear(
  hz: number,
  spelling?: "sharp" | "flat",
  extraProps?: Partial<ComponentProps<typeof App>>,
): Promise<{
  readonly listening: FakeListening;
  readonly clock: FakeClock;
  readonly session: Session;
}> {
  cleanup();
  localStorage.clear();
  const { sessionDeps, listening, clock } = sessionDepsWithFakes();
  let session: Session | null = null;
  render(
    createElement(App, {
      catalogue: builtInCatalogue(),
      selectionStore: localStorageSelectionStore(localStorage),
      sessionDeps,
      onSessionReady: (readySession: Session) => {
        session = readySession;
      },
      ...extraProps,
    }),
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
