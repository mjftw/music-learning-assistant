import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler, StrictMode } from "react";
import { afterEach, expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
  summaryLineOf,
  type Session,
  type SessionDeps,
} from "../../../src/practice/published";
import type { SoundCommand } from "../../../src/sound/published/sound-command.schema";
import {
  builtInCatalogue,
  effectiveOctavesOf,
  scaleById,
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

// This suite (unlike the shared `testSessionDeps` in `tests/practice/fakes`)
// needs the `sound`, `clock` and `visibility` fakes back out for its own
// assertions — every scenario here drives sound/clock directly or, for the
// dispose regression below, inspects the visibility subscription.
function testSessionDeps(sound = new FakeSound()): {
  readonly sessionDeps: SessionDeps;
  readonly sound: FakeSound;
  readonly clock: FakeClock;
  readonly visibility: FakeVisibility;
} {
  const clock = new FakeClock(sound);
  const visibility = new FakeVisibility();
  return {
    sessionDeps: {
      sound,
      clock,
      wakeLock: new FakeWakeLock(),
      visibility,
    },
    sound,
    clock,
    visibility,
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

  expect(screen.getByText("↑↓ · 1 oct · scale · loop")).toBeTruthy();
  expect(screen.getByText("96")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Andante" })).toBeTruthy();
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "15 notes · C4–C5",
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

  expect(screen.getByText("↓ · 2 oct · click only · once")).toBeTruthy();
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
      scaleById("major"),
      defaultTraversal.octaves,
    ),
    defaultTraversal.shape,
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
    advanceUntil(
      clock,
      () =>
        screen.getByTestId("position-caption").textContent === "C4 · 1 of 15",
    );
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

test("practice.session/REQ-006/S4 (UI) — the onset-driven highlight commits synchronously, before any await", async () => {
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

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => {
    // Past the count-in, to the sequence's first note.
    advanceUntil(clock, () => sound.posted.some(isTone));
  });
  const firstTone = sound.posted.find(isTone);
  if (firstTone === undefined) throw new Error("unreachable: no tone posted");
  const msUntilOnset =
    ((firstTone.onsetFrame - sound.frame) * 1000) / sound.sampleRate() +
    sound.outputLatencyMs();

  // Advanced directly, the way the highlight timer's own callback fires —
  // not from a React event, and deliberately not wrapped in `act()` — so
  // the very next line proves the highlight is already in the DOM without
  // needing an `await` or a flush of its own (practice.session/REQ-006's
  // 30 ms budget: `onTargetAdvanced` commits with `flushSync`, unlike the
  // batched `onChange` path; T031: the timer itself, not an onset report,
  // drives it).
  clock.advance(msUntilOnset);

  const columns = screen.getAllByTestId("names-column");
  expect(columns.some((column) => column.dataset.sounding === "true")).toBe(
    true,
  );
});

// T016 fixer round: the session's effect must be symmetric — created and
// disposed by the same effect — so a genuine unmount always tears down its
// subscriptions (practice.session/REQ-009 relies on the visibility
// subscription; a leaked one would keep stopping playback on a page that no
// longer exists). Rendering `<App>` with no `<StrictMode>` wrapper (as every
// other test in this suite does) is exactly the "DEV, no double-invoke"
// case the reviewer found broken.
test("practice.session/REQ-009 (app) — unmounting the app disposes the session (its visibility subscription is released)", () => {
  localStorage.clear();
  const { sessionDeps, visibility } = testSessionDeps();

  const { unmount } = render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  expect(visibility.listenerCount).toBe(1);

  unmount();

  expect(visibility.listenerCount).toBe(0);
});

// The other half of the same fix: StrictMode's mount → cleanup → mount
// double-invoke of the session-creating effect must leave exactly one live,
// working session behind (create → dispose → create), not a stuck or
// doubled one.
test("practice.session/REQ-009 (app) — under StrictMode the session still plays after the double-mount", async () => {
  localStorage.clear();
  const { sessionDeps, sound, clock } = testSessionDeps();

  render(
    <StrictMode>
      <App
        catalogue={builtInCatalogue()}
        selectionStore={localStorageSelectionStore(localStorage)}
        sessionDeps={sessionDeps}
      />
    </StrictMode>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(sound.startCalls).toBe(1);

  act(() => {
    advanceUntil(
      clock,
      () =>
        screen.getByTestId("position-caption").textContent === "C4 · 1 of 15",
    );
  });

  expect(screen.getByTestId("position-caption").textContent).toBe(
    "C4 · 1 of 15",
  );
});

// T032 — the lookahead scheduler polls every 25 ms and posts commands up to
// 200 ms ahead of each beat's audible onset, so a poll-driven re-render (or
// a session that notifies on every poll) would commit App many times per
// beat. Counting root commits with React's own Profiler over ten
// clock-advanced beats — rather than probing whether any one child
// (e.g. the circle) re-rendered — is the one measurement that can't be
// fooled by a child bailing out of an unchanged tree while the root still
// commits needlessly.
test("T032 — App commits about once per beat during playback, not once per lookahead poll", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  const { sessionDeps, clock } = testSessionDeps(sound);
  let session: Session | null = null;
  let commits = 0;

  render(
    <Profiler
      id="app"
      onRender={() => {
        commits += 1;
      }}
    >
      <App
        catalogue={builtInCatalogue()}
        selectionStore={localStorageSelectionStore(localStorage)}
        sessionDeps={sessionDeps}
        onSessionReady={(readySession) => {
          session = readySession;
        }}
      />
    </Profiler>,
  );
  if (session === null) throw new Error("unreachable: session not ready");
  const readySession: Session = session;

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => {
    // Past the count-in, to the sequence's first note.
    advanceUntil(clock, () => sound.posted.some(isTone));
  });

  const BEATS_TO_OBSERVE = 10;
  let beats = 0;
  const unsubscribe = readySession.onTargetAdvanced(() => {
    beats += 1;
  });
  commits = 0;

  // Each poll (25 ms) and each highlight timer fires as its own separate
  // task in production — a single `act()` around the whole span would let
  // React's automatic batching coalesce every one of those into a single
  // commit, hiding exactly the regression this test exists to catch. One
  // `act()` per 5 ms step (finer than the scheduler's own 25 ms poll)
  // keeps poll-driven and highlight-driven updates in separate React
  // flushes, the way separate `setTimeout` callbacks would be in a real
  // browser.
  const STEP_MS = 5;
  while (beats < BEATS_TO_OBSERVE) {
    act(() => {
      clock.advance(STEP_MS);
    });
  }
  unsubscribe();

  expect(commits).toBeLessThanOrEqual(BEATS_TO_OBSERVE + 1);
});
