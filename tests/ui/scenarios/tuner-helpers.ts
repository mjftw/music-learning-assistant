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

// practice.tuner/REQ-005/S5, S6 — the trail's own clock is TunerScreen's
// injectable `now`/`requestFrame`/`cancelFrame` (not the session's own
// `FakeClock` above, which drives the *session's* gap timer only, and never
// wall-clock time). A manual, single-slot scheduler: at most one callback is
// ever pending (matching `requestAnimationFrame`'s own one-shot contract),
// `runFrame()` invokes it synchronously (wrap in `act()` — it triggers a
// `setState`) and reports whether one was actually pending, and `pending`
// lets a scenario assert the loop is/isn't running without inspecting
// TunerScreen's own internals.
//
// design-loop variant (007 round 4) — extended with a fake setTimeout/
// clearTimeout pair (`setTimer`/`clearTimer`, `timerPending`) sharing this
// same `ms`, for TunerScreen's injectable silence-treatment timers (the
// fade/linger/ghost hold and fade-out). Unlike the frame slot above, more
// than one timer can be pending at once (mirroring real setTimeout), and
// `advanceMs` itself fires whatever is due — including one a just-fired
// timer schedules, if its own delay lands within the same advance (b's
// hold → fade chain) — so a scenario drives everything through the one
// `now`/`advanceMs` pair already in hand, exactly as the acceptance text
// describes ("advance 600 ms → they are gone").
export function manualAnimationClock(startMs = 0): {
  readonly now: () => number;
  readonly requestFrame: (callback: FrameRequestCallback) => number;
  readonly cancelFrame: (handle: number) => void;
  readonly setTimer: (callback: () => void, delayMs: number) => number;
  readonly clearTimer: (handle: number) => void;
  readonly advanceMs: (deltaMs: number) => void;
  readonly runFrame: () => boolean;
  readonly pending: boolean;
  readonly timerPending: boolean;
} {
  let ms = startMs;
  let nextId = 1;
  let pendingId: number | null = null;
  let pendingCallback: FrameRequestCallback | null = null;
  const timers = new Map<number, { dueAt: number; callback: () => void }>();

  function fireDueTimers(): void {
    for (;;) {
      let earliestId: number | null = null;
      let earliestDueAt = Infinity;
      for (const [id, timer] of timers) {
        if (timer.dueAt <= ms && timer.dueAt < earliestDueAt) {
          earliestId = id;
          earliestDueAt = timer.dueAt;
        }
      }
      if (earliestId === null) return;
      const timer = timers.get(earliestId);
      timers.delete(earliestId);
      timer?.callback();
    }
  }

  return {
    now: () => ms,
    requestFrame: (callback) => {
      const id = nextId;
      nextId += 1;
      pendingId = id;
      pendingCallback = callback;
      return id;
    },
    cancelFrame: (handle) => {
      if (handle === pendingId) {
        pendingId = null;
        pendingCallback = null;
      }
    },
    setTimer: (callback, delayMs) => {
      const id = nextId;
      nextId += 1;
      timers.set(id, { dueAt: ms + delayMs, callback });
      return id;
    },
    clearTimer: (handle) => {
      timers.delete(handle);
    },
    advanceMs: (deltaMs) => {
      ms += deltaMs;
      fireDueTimers();
    },
    runFrame: () => {
      const callback = pendingCallback;
      pendingId = null;
      pendingCallback = null;
      if (callback === null) return false;
      callback(ms);
      return true;
    },
    get pending() {
      return pendingCallback !== null;
    },
    get timerPending() {
      return timers.size > 0;
    },
  };
}
