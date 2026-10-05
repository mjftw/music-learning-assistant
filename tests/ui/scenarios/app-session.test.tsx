import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler, StrictMode } from "react";
import { afterEach, expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
  summaryLineOf,
  type Session,
} from "../../../src/practice/published";
import {
  builtInCatalogue,
  effectiveOctavesOf,
  scaleById,
} from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";
import {
  advanceUntil,
  FakeSound,
  isTone,
  keyOf,
  sessionDepsWithFakes,
  variantOf,
} from "../../practice/fakes";
import {
  flushApp,
  openSheet,
  pill,
  pillSelected,
  renderLeadApp,
  startLeadInApp,
  storedCMajor,
} from "./lead-app-helpers";

afterEach(() => {
  cleanup();
});

const STORAGE_KEY = "music-learning-assistant.selection.v1";

test("practice.session/REQ-011/S2 (app) — first run shows the S2 defaults in the transport and traversal row", () => {
  localStorage.clear();
  const { sessionDeps } = sessionDepsWithFakes();

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

// Renamed from REQ-011/S1 (T012 review) — a v3 payload has no scale choice
// recorded, so restoring it exercises the v3→v4 migration path (REQ-011/S4),
// not S1 (which is about restoring a stored scale choice — see the new S1
// test below).
test("practice.session/REQ-011/S4 (app) — a stored v3 payload is restored exactly, idle", async () => {
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
  const { sessionDeps } = sessionDepsWithFakes();

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
  // practice.session/REQ-011/S4 — a v3 payload records no lead settings, so
  // they take the S2 defaults: play along, Hold 2, medium, meter on, tone
  // off.
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  const user = userEvent.setup();
  await user.click(screen.getByTestId("mode-word-me"));
  await user.click(screen.getByRole("button", { name: "Edit traversal" }));
  expect(pillSelected("hold", "2")).toBe(true);
  expect(pillSelected("in-tune", "medium")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(true);
  expect(pillSelected("cues", "tone")).toBe(false);
});

test("practice.session/REQ-012/S1 (app) — choosing a scale changes the heading, the formula row and the names view", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );
  // The circle never shows a scale (T012 brief) — the outer-ring wedge's
  // accessible name stays "<tonic> major"/"<tonic> minor" exactly as
  // circle-interaction.test.tsx clicks it elsewhere ("G major", "E minor",
  // …), not the bare tonic the brief's literal test used.
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  await userEvent.click(screen.getByTestId("current-key"));
  await userEvent.click(screen.getByRole("button", { name: /^Lydian/ }));
  expect(screen.getByTestId("current-key").textContent).toBe("G Lydian");
  expect(screen.getByTestId("scale-row-formula").textContent).toBe(
    "1 2 3 ♯4 5 6 7",
  );
  expect(
    screen.getAllByTestId("column-name").map((c) => c.textContent),
  ).toEqual(["G", "A", "B", "C♯", "D", "E", "F♯"]);
  const stored = JSON.parse(
    localStorage.getItem(STORAGE_KEY)!,
  ) as StoredSelection;
  expect(stored.scale).toEqual({ major: "lydian", minor: "natural-minor" });
});

test("practice.session/REQ-011/S1 (app) — Dorian on the minor ring is restored", () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...firstRunDefaults,
      variantId: "flute-concert",
      keyId: "E-naturalMinor",
      scale: { major: "major", minor: "dorian" },
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
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("E Dorian");
  expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
});

test("practice.session/REQ-011/S1 — back where it was, in I lead", async () => {
  const app = renderLeadApp(
    storedCMajor(
      {
        who: "me",
        holdBeats: 4,
        tolerance: "accurate",
        cueMeter: false,
        cueTone: true,
      },
      {
        keyId: "E-naturalMinor",
        traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
        scale: { major: "major", minor: "dorian" },
        session: {
          ...storedCMajor().session,
          soundMode: "metronome",
          loop: false,
          countIn: false,
          restBar: true,
          tempoBpm: 132,
        },
      },
    ),
  );
  expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "hold 4 beats · accurate tuning",
  );
  expect(screen.getByTestId("mode-word-me").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
  expect(app.listening.startCalls).toBe(0);
  await openSheet(app);
  expect(pillSelected("hold", "4")).toBe(true);
  expect(pillSelected("in-tune", "accurate")).toBe(true);
  expect(pillSelected("cues", "tone")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(false);
});

test("practice.session/REQ-011/S2 — first run: play along, the lead defaults behind the sheet", async () => {
  localStorage.clear();
  const fakes = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={fakes.sessionDeps}
    />,
  );
  const user = userEvent.setup();
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  expect(screen.getByTestId("start-circle").textContent).toContain("▶");
  await user.click(screen.getByTestId("mode-word-me"));
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "hold 2 beats · medium tuning",
  );
  await user.click(screen.getByText("edit ›"));
  expect(pillSelected("hold", "2")).toBe(true);
  expect(pillSelected("in-tune", "medium")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(true);
});

// practice.session/REQ-011/S5 — a stored v5 payload (predates lead
// settings): the same shape `selection-store.test.ts`'s own `v5Document`
// fixture carries (flute Concert, G major, ↓ 2 oct arpeggio, metronome,
// loop off, count-in off, rest bar on, 132 bpm, Dorian on the minor ring,
// drone octave 5 warm) — inlined here rather than imported across test
// files.
test("practice.session/REQ-011/S5 — stored state from 007", async () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 5,
      variantId: "flute-concert",
      keyId: "G-major",
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
      scale: { major: "major", minor: "dorian" },
      drone: { octave: 5, sound: "warm" },
    }),
  );
  const fakes = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={fakes.sessionDeps}
    />,
  );
  expect(screen.getByText("132")).toBeTruthy();
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  await userEvent.setup().click(screen.getByTestId("mode-word-me"));
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "hold 2 beats · medium tuning",
  );
});

test("practice.session/REQ-011 — a mode or hold change is stored", async () => {
  const app = renderLeadApp();
  await app.user.click(screen.getByTestId("mode-word-me"));
  expect(
    (JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection).session
      .lead.who,
  ).toBe("me");
  await openSheet(app);
  await app.user.click(pill("hold", "4"));
  expect(
    (JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection).session
      .lead,
  ).toEqual({
    who: "me",
    holdBeats: 4,
    tolerance: "medium",
    cueMeter: true,
    cueTone: false,
  });
});

test("practice.session/REQ-011/S2 (app) — first run: plain key, no scale suffix", () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("C major");
  expect(screen.getByTestId("scale-row-formula").textContent).toBe(
    "1 2 3 4 5 6 7",
  );
});

test("practice.session/REQ-011/S4 (app) — a v3 payload keeps its settings and takes the default scales", async () => {
  localStorage.clear();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 3,
      variantId: "flute-concert",
      keyId: "G-major",
      spelling: "sharp",
      view: "names",
      degreesEnabled: true,
      distanceRingEnabled: true,
      staveNamesEnabled: false,
      traversal: { direction: "up", octaves: 2, shape: "scale" },
      session: {
        soundMode: "both",
        loop: true,
        countIn: true,
        restBar: false,
        tempoBpm: 120,
      },
    }),
  );
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );
  expect(screen.getByTestId("current-key").textContent).toBe("G major");
  expect(screen.getByText("↑ · 2 oct · scale · loop")).toBeTruthy();
  expect(screen.getByText("120")).toBeTruthy();
  // practice.session/REQ-011/S4 — no lead settings recorded either: the S2
  // defaults again.
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  {
    const user = userEvent.setup();
    await user.click(screen.getByTestId("mode-word-me"));
    await user.click(screen.getByRole("button", { name: "Edit traversal" }));
  }
  expect(pillSelected("hold", "2")).toBe(true);
  expect(pillSelected("in-tune", "medium")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(true);
  expect(pillSelected("cues", "tone")).toBe(false);
});

test("practice.session/REQ-011/S3 (app) — a stored v2 payload keeps the selection and takes the S2 defaults for the rest", async () => {
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
  const { sessionDeps } = sessionDepsWithFakes();

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
  // practice.session/REQ-011/S3 — a v2 payload carries no lead settings
  // either: the S2 defaults.
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  {
    const user = userEvent.setup();
    await user.click(screen.getByTestId("mode-word-me"));
    await user.click(screen.getByRole("button", { name: "Edit traversal" }));
  }
  expect(pillSelected("hold", "2")).toBe(true);
  expect(pillSelected("in-tune", "medium")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(true);
  expect(pillSelected("cues", "tone")).toBe(false);
});

test("practice.session/REQ-010/S1 (UI) — a notice appears, nothing modal opens, and the run still walks silently", async () => {
  localStorage.clear();
  const sound = new FakeSound();
  sound.failWith = { reason: "worklet-failed", detail: "" };
  const { sessionDeps, clock } = sessionDepsWithFakes(sound);

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
  const { sessionDeps, clock } = sessionDepsWithFakes(sound);

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
  const { sessionDeps, clock } = sessionDepsWithFakes(sound);

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
  const { sessionDeps, visibility } = sessionDepsWithFakes();

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
  const { sessionDeps, sound, clock } = sessionDepsWithFakes();

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
  const { sessionDeps, clock } = sessionDepsWithFakes(sound);
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

test("practice.session/REQ-012/S4 (app) — the descent group follows the session's direction", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDepsWithFakes().sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "E minor" }));
  await userEvent.click(screen.getByRole("button", { name: "Edit scale" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Melodic minor · classical" }),
  );
  const names = () =>
    screen
      .getAllByTestId("names-column")
      .map((c) => [
        within(c).getByTestId("column-name").textContent,
        c.getAttribute("data-descent"),
      ]);
  expect(names()).toEqual([
    ["E", "false"],
    ["F♯", "false"],
    ["G", "false"],
    ["A", "false"],
    ["B", "false"],
    ["C♯", "false"],
    ["D♯", "false"],
    ["D", "true"],
    ["C", "true"],
  ]);
  await userEvent.click(screen.getByRole("button", { name: "Edit traversal" }));
  await userEvent.click(screen.getByRole("button", { name: "↑" }));
  expect(names().map((n) => n[0])).toEqual([
    "E",
    "F♯",
    "G",
    "A",
    "B",
    "C♯",
    "D♯",
  ]);
});

// practice.session/REQ-021's measured lead budget (pnpm test:lead,
// C008_T019) reads a lead reading's paint age off onPaintAge the same way
// practice.tuner/REQ-006's harness does for the tuner's own reading
// (tuner-screen.test.tsx) — this proves App forwards it for a lead run too,
// mirroring that test's own shape exactly (bump the fake's frame after the
// reading commits but before the deferred layout effect flushes, so the
// reported age is the gap between them, not zero).
test("practice.session/REQ-021 — every painted lead reading is reported with its age", async () => {
  const ages: number[] = [];
  const app = renderLeadApp(storedCMajor(), {
    onPaintAge: (ms) => ages.push(ms),
  });
  await startLeadInApp(app);
  app.listening.frame = 0;
  app.listening.feed(262.5, 0);
  app.clock.advance(1);
  app.listening.frame = 480;
  await flushApp();
  expect(ages.at(-1)).toBe(10);
});
