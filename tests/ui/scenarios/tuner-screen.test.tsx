import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import { sessionDepsWithFakes } from "../../practice/fakes";
import { enterAndHear, letLingerPass } from "./tuner-helpers";

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test
// (the pattern of app-drone.test.tsx).
afterEach(() => {
  cleanup();
});

// T015's shared fixture (reused by T016/T017/T018) — moved to
// ./tuner-helpers.ts once tuner-stave.test.tsx needed it too.

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
  letLingerPass(f); // the last reading lingers, then goes (S4)
  expect(screen.getByTestId("tuner-empty").textContent).toBe("Play a note");
  expect(screen.queryByTestId("tuner-line")).toBeNull();
  expect(screen.queryByTestId("tuner-tag")).toBeNull();
});

// T018 — the "Can't hear" card and NO MIC state (practice.tuner/REQ-007),
// the footer's ♯/♭ toggle bound to the circle's own preference
// (practice.tuner/REQ-002/S5). The footer's segmented control carries the
// circle's own accessible names ("sharp"/"flat", not "Sharp
// spelling"/"Flat spelling" — CircleOfFifths.tsx lines 808-840): the two
// controls share one preference, so they share one name.
test("practice.tuner/REQ-007/S1 — refused", async () => {
  const { sessionDeps, listening } = sessionDepsWithFakes();
  listening.failWith = "refused";
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("NO MIC"),
  );
  expect(screen.getByTestId("cannot-hear").textContent).toContain(
    "Can't hear — no microphone",
  );
  expect(screen.getByTestId("cannot-hear").textContent).toContain(
    "It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again.",
  );
  expect(screen.getByTestId("tuner-name").textContent).toBe("–");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByText("A4 = 440 Hz · in tune ±5 ¢")).toBeTruthy();
  const practiceButton: HTMLButtonElement = screen.getByRole("button", {
    name: "Practice",
  });
  expect(practiceButton.disabled).toBe(false);
});

test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
  const { sessionDeps, listening } = sessionDepsWithFakes();
  listening.failWith = "refused";
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
  listening.failWith = null;
  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
  await waitFor(() =>
    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
  );
});

test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
  const f = await enterAndHear(440.0);
  act(() => {
    f.listening.end();
  });
  expect(screen.getByTestId("mic-indicator").textContent).toBe("NO MIC");
  expect(screen.getByTestId("cannot-hear")).toBeTruthy();
  expect(screen.queryByTestId("tuner-line")).toBeNull();
});

test("practice.tuner/REQ-006 — every painted reading is reported with its age", async () => {
  const ages: number[] = [];
  const f = await enterAndHear(440.0, "sharp", {
    onPaintAge: (ms) => ages.push(ms),
  });
  f.listening.frame = 4800;
  f.listening.feed(440.0, 4800);
  f.clock.advanceMs(1);
  f.listening.frame = 4800 + 480;
  await act(async () => {});
  expect(ages.at(-1)).toBe(10);
});

test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
  const f = await enterAndHear(466.16);
  expect(screen.getByTestId("tuner-name").textContent).toBe("A♯4");
  await userEvent.click(screen.getByRole("button", { name: "flat" }));
  f.listening.feed(466.16);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("tuner-name").textContent).toBe("B♭4");
  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
  expect(screen.getByRole("button", { name: "G♭ major" })).toBeTruthy(); // the circle now spells flat
});

test("practice.tuner/REQ-004 — the target pill sits between the level and the stave strip (design 4a)", async () => {
  await enterAndHear(440.0);
  const level = screen.getByTestId("tuner-reading");
  const pill = screen.getByRole("button", { name: "Target" });
  const strip = screen.getByTestId("heard-head").closest("svg")!;
  expect(
    level.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    pill.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
