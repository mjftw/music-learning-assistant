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
// moved out of tuner-screen.test.tsx once a second file needed it.
// `spelling` optionally taps the circle's ♭ control before entering
// (theory.circle-of-fifths/REQ-002, exercised the same way
// circle-spelling.test.tsx does) so a scenario can ask for flat spelling
// without duplicating the render/open dance. `extraProps` lets a scenario
// override any of <App>'s own props (e.g. a different catalogue) without
// re-deriving the whole render/open dance itself.
//
// Plain `.ts` (not `.tsx`) per the brief — `createElement` stands in for
// JSX so the file needs no JSX transform.
//
// The render/open dance shared by enterAndHear (below) and any scenario
// that needs the tuner listening with nothing heard yet
// (practice.tuner/REQ-004/S8) — extracted rather than duplicated (the
// codebase's own convention: see AGENTS.md "Things agents get wrong here").
// `cleanup()` here tears down any previous render first, so a second call
// in the same test gets a fresh `<App>` rather than a second one stacked
// beside it (each test file's own `afterEach(cleanup)` still handles the
// last one).
export async function enterTuner(
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
  if (session === null) {
    throw new Error("unreachable: onSessionReady was not called by render()");
  }
  return { listening, clock, session };
}

// A scenario may call this more than once (tuner-stave.test.tsx's
// REQ-005/S3 feeds two separate frequencies to see how the strip writes
// each) — `enterTuner` above tears down any previous render first, so a
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
  const { listening, clock, session } = await enterTuner(spelling, extraProps);
  listening.feed(hz);
  clock.advanceMs(1);
  await act(async () => {});
  return { listening, clock, session };
}

// practice.tuner/REQ-004/S7, REQ-009/S3 — advances the fake clock past the
// 300 ms gap timer (domain/session.ts's private TUNER_GAP_MS, mirrored here
// the same way tests/practice/tuner-helpers.ts's letGapPass does) and
// flushes the resulting React update, so a scenario can see what the sheet
// and spiral show once a reading has cleared but the last note heard is
// still remembered.
export async function letGapPass(f: {
  readonly clock: FakeClock;
}): Promise<void> {
  f.clock.advanceMs(300);
  await act(async () => {});
}
