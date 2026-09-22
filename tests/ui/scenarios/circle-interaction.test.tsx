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

// No global `afterEach` in scope (vitest globals are off), so
// @testing-library/react's automatic cleanup never registers itself; without
// this, each test's render would still be in the DOM for the next test.
afterEach(() => {
  cleanup();
});

// This suite doesn't exercise the session — a bare set of fakes is enough
// to satisfy App's now-required `sessionDeps` (practice.session/REQ-011,
// T016).
function testSessionDeps(): SessionDeps {
  const sound = new FakeSound();
  return {
    sound,
    clock: new FakeClock(sound),
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
  };
}

// Guard, not a spec scenario (no REQ traces label sizing) — added after a
// user finding (2026-09-21, T018): the design reference's selected-label
// size (17px/700) overflows the inner wedge for three-character minor
// labels ("C♯m", "F♯m", …) at every position the T018 sweep checked, so the
// SELECTED size must step down for those without shrinking the two-character
// labels ("Am", …), which the reference's 17 fits. Extended (T018 follow-up,
// same day): even the stepped-down 14px left only ~1px clearance on the
// tightest wedge, so the SELECTED weight also steps down for the same
// three-character labels (600, not 700) to buy margin without shrinking
// below the unselected size — still above the unselected weight (500), so
// it still reads as emphasised.
test("a selected wedge label never uses a larger font than fits its label length", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "A minor" }));
  const aMinorLabel = screen.getByText("Am");
  expect(aMinorLabel.style.fontSize).toBe("17px");
  expect(aMinorLabel.style.fontWeight).toBe("700");

  await userEvent.click(screen.getByRole("button", { name: "C♯ minor" }));
  const cSharpMinorLabel = screen.getByText("C♯m");
  const cSharpMinorSize = Number.parseFloat(cSharpMinorLabel.style.fontSize);
  expect(cSharpMinorSize).toBeLessThan(17);
  expect(cSharpMinorLabel.style.fontWeight).toBe("600");
});

test("theory.circle-of-fifths/REQ-001/S2 — selecting E minor on the inner ring shows its key view, aligned with its relative major", async () => {
  localStorage.clear();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );
  const gMajorWedge = screen.getByRole("button", { name: "G major" });
  const eMinorWedge = screen.getByRole("button", { name: "E minor" });
  expect(eMinorWedge.getAttribute("data-position-index")).toBe(
    gMajorWedge.getAttribute("data-position-index"),
  );

  await userEvent.click(eMinorWedge);
  expect(screen.getByTestId("current-key").textContent).toBe("E minor");
});

// Accessibility guard, not a spec scenario (no REQ traces a visible
// indicator) — added after the T012 design-review loop found the browser's
// default focus outline unusable on the circle's non-rectangular SVG wedges
// (Chromium renders it as a bleeding fragment, not a ring). Drives real Tab
// navigation (userEvent, not a bare `.focus()`/`.blur()` call — jsdom does
// not dispatch those through React's event system) to exercise the
// wiring/geometry only: which browsers treat a given focus as
// keyboard-vs-pointer (`:focus-visible`) is the browser's own concern, not
// this component's, and isn't something jsdom can distinguish either way.
test("Tab-focusing a wedge shows a focus ring that follows focus, and disappears once focus leaves the circle", async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
    />,
  );

  expect(screen.queryByTestId("wedge-focus-ring")).toBeNull();

  // The instrument pill and settings button precede the circle in tab
  // order; three tabs reaches the first wedge (C major, outer ring).
  await user.tab();
  await user.tab();
  await user.tab();
  expect(document.activeElement?.getAttribute("aria-label")).toBe("C major");
  expect(screen.getByTestId("wedge-focus-ring")).toBeTruthy();

  // The next tab stop is C major's own inner-ring sibling, A minor —
  // proves the ring follows focus onto an inner-ring wedge too, not just
  // the outer ring.
  await user.tab();
  expect(document.activeElement?.getAttribute("aria-label")).toBe("A minor");
  expect(screen.getByTestId("wedge-focus-ring")).toBeTruthy();

  // Moving focus off the circle entirely (a click, which also blurs
  // whatever the circle held) leaves no ring behind.
  await user.click(screen.getByRole("button", { name: "sharp" }));
  expect(screen.queryByTestId("wedge-focus-ring")).toBeNull();
});
