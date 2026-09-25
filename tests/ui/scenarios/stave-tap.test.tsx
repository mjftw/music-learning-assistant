import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";
import {
  advanceUntil,
  isTone,
  sessionDepsWithFakes,
} from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

const STORAGE_KEY = "music-learning-assistant.selection.v1";

// A stored v5 payload for G major on flute Concert, stave view, ↑↓ 2 oct,
// 96 bpm — the fixture REQ-013/S1 and S5 are both given against
// (tempoBpm and the drone settings are already firstRunDefaults's own).
const storedPayload: StoredSelection = {
  ...firstRunDefaults,
  variantId: "flute-concert",
  keyId: "G-major",
  view: "stave",
  traversal: { direction: "updown", octaves: 2, shape: "scale" },
};

// Drives a tap's async start() round trip (sound.start(), then the tone
// post) to completion — the same shape as app-drone.test.tsx's own local
// `flush`, wrapped in `act()` since it flushes React state updates too.
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

test("practice.session/REQ-013/S1 (stave) — a tapped notehead sounds and is haloed for one beat", async () => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayload));
  const { sessionDeps, sound, clock } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  const d5Hit = within(screen.getByTestId("stave")).getByRole("button", {
    name: "D5",
  });
  await userEvent.click(d5Hit);
  await flush();

  expect(sound.posted.filter(isTone)[0]!.hz).toBeCloseTo(587.33, 2);

  act(() => {
    clock.advance(30);
  });

  const staveNotes = screen.getAllByTestId("stave-note");
  const d5Note = staveNotes.find(
    (note) => note.getAttribute("data-note") === "D5",
  );
  if (d5Note === undefined) throw new Error("unreachable: no D5 notehead");
  expect(within(d5Note).getByTestId("sounding-halo")).toBeTruthy();

  staveNotes.forEach((note) => {
    if (note === d5Note) return;
    expect(note.querySelector("ellipse")!.getAttribute("opacity")).toBe("1");
    expect(within(note).queryByTestId("sounding-halo")).toBeNull();
  });

  act(() => {
    clock.advance(700);
  });

  expect(screen.queryAllByTestId("sounding-halo")).toHaveLength(0);
});

test("practice.session/REQ-013/S5 (stave) — noteheads are inert while playing", async () => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedPayload));
  const { sessionDeps, sound, clock } = sessionDepsWithFakes();

  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  await flush();
  act(() => {
    // Past the count-in, to the first sounding note's own highlight.
    advanceUntil(
      clock,
      () => screen.queryAllByTestId("sounding-halo").length > 0,
    );
  });

  const tones = sound.posted.filter(isTone).length;
  const d5Hit = within(screen.getByTestId("stave")).getByRole("button", {
    name: "D5",
  });
  expect(d5Hit.getAttribute("aria-disabled")).toBe("true");

  await userEvent.click(d5Hit);
  act(() => {
    clock.advance(10);
  });

  expect(sound.posted.filter(isTone).length).toBe(tones);

  const halos = screen.getAllByTestId("sounding-halo");
  expect(halos).toHaveLength(1);
  const haloedNote = halos[0]!.closest('[data-testid="stave-note"]');
  expect(haloedNote?.getAttribute("data-note")).not.toBe("D5");
});
