import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
  type SessionSettings,
} from "../../../src/practice/published";
import type { Octaves, Traversal } from "../../../src/theory/published";
import { TraversalRow } from "../../../src/ui/TraversalRow";
import { TraversalSheet } from "../../../src/ui/TraversalSheet";

afterEach(() => {
  cleanup();
});

const noop = () => {
  // no-op handler for props not under test
};

function baseTraversal(overrides: Partial<Traversal> = {}): Traversal {
  return { ...defaultTraversal, ...overrides };
}

function baseSettings(
  overrides: Partial<SessionSettings> = {},
): SessionSettings {
  return { ...defaultSessionSettings, ...overrides };
}

function pressedOf(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

test("practice.session/REQ-001/S1 (UI) — Octaves offers a pill for each fitting count plus full, the effective choice pressed", () => {
  const twoOct = baseTraversal({ octaves: { kind: "count", count: 2 } });
  const { unmount } = render(
    <TraversalSheet
      open
      traversal={twoOct}
      effectiveShape={twoOct.shape}
      arpeggioOffered
      effectiveOctaves={{ kind: "count", count: 2 }}
      fittingCounts={[1, 2, 3]}
      settings={baseSettings()}
      onTraversal={noop}
      onSettings={noop}
      onClose={noop}
    />,
  );

  expect(pressedOf("1 oct")).toBe("false");
  expect(pressedOf("2 oct")).toBe("true");
  expect(pressedOf("3 oct")).toBe("false");
  expect(pressedOf("full")).toBe("false");
  expect(screen.queryByRole("button", { name: "4 oct" })).toBeNull();

  unmount();

  const fullOct = baseTraversal({ octaves: { kind: "full" } });
  render(
    <TraversalSheet
      open
      traversal={fullOct}
      effectiveShape={fullOct.shape}
      arpeggioOffered
      effectiveOctaves={{ kind: "full" }}
      fittingCounts={[]}
      settings={baseSettings()}
      onTraversal={noop}
      onSettings={noop}
      onClose={noop}
    />,
  );

  expect(screen.queryByRole("button", { name: "1 oct" })).toBeNull();
  expect(pressedOf("full")).toBe("true");
});

test("practice.session/REQ-001/S1 (UI) — picking full, ↓ and arpeggio calls onTraversal with the change", async () => {
  const traversal = baseTraversal({ octaves: { kind: "count", count: 2 } });
  const effectiveOctaves: Octaves = { kind: "count", count: 2 };
  const onTraversal = vi.fn();

  render(
    <TraversalSheet
      open
      traversal={traversal}
      effectiveShape={traversal.shape}
      arpeggioOffered
      effectiveOctaves={effectiveOctaves}
      fittingCounts={[1, 2, 3]}
      settings={baseSettings()}
      onTraversal={onTraversal}
      onSettings={noop}
      onClose={noop}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "full" }));
  await userEvent.click(screen.getByRole("button", { name: "↓" }));
  await userEvent.click(screen.getByRole("button", { name: "arpeggio" }));

  expect(onTraversal).toHaveBeenNthCalledWith(1, {
    ...traversal,
    octaves: { kind: "full" },
  });
  expect(onTraversal).toHaveBeenNthCalledWith(2, {
    ...traversal,
    direction: "down",
  });
  expect(onTraversal).toHaveBeenNthCalledWith(3, {
    ...traversal,
    shape: "arpeggio",
  });
});

test("practice.session/REQ-003 (UI) — the settings pills and toggles call onSettings with the change", async () => {
  const settings = baseSettings({ countIn: true, restBar: false });
  const onSettings = vi.fn();

  render(
    <TraversalSheet
      open
      traversal={defaultTraversal}
      effectiveShape={defaultTraversal.shape}
      arpeggioOffered
      effectiveOctaves={defaultTraversal.octaves}
      fittingCounts={[1]}
      settings={settings}
      onTraversal={noop}
      onSettings={onSettings}
      onClose={noop}
    />,
  );

  const countInButton = screen.getByRole("button", { name: "count-in" });
  expect(countInButton.getAttribute("aria-pressed")).toBe("true");

  await userEvent.click(screen.getByRole("button", { name: "metronome" }));
  await userEvent.click(screen.getByRole("button", { name: "rest bar" }));
  await userEvent.click(countInButton);

  expect(onSettings).toHaveBeenNthCalledWith(1, {
    ...settings,
    soundMode: "metronome",
  });
  expect(onSettings).toHaveBeenNthCalledWith(2, {
    ...settings,
    restBar: true,
  });
  expect(onSettings).toHaveBeenNthCalledWith(3, {
    ...settings,
    countIn: false,
  });
});

test("practice.session/REQ-001/S2 (UI) — TraversalRow shows the summary line and opens the sheet on click", async () => {
  const onOpen = vi.fn();

  render(
    <TraversalRow summaryLine="↑↓ · 2 oct · scale · loop" onOpen={onOpen} />,
  );

  const row = screen.getByRole("button", { name: "Edit traversal" });
  expect(row.textContent).toContain("↑↓ · 2 oct · scale · loop");
  expect(row.textContent).toContain("edit ›");

  await userEvent.click(row);

  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("practice.session/REQ-001/S5 — arpeggio unavailable in the Traversal sheet itself", async () => {
  const onTraversal = vi.fn();
  render(
    <TraversalSheet
      open
      traversal={baseTraversal({ shape: "arpeggio" })}
      effectiveShape="scale"
      arpeggioOffered={false}
      effectiveOctaves={{ kind: "count", count: 1 }}
      fittingCounts={[1, 2]}
      settings={baseSettings()}
      onTraversal={onTraversal}
      onSettings={noop}
      onClose={noop}
    />,
  );
  const arpeggio = screen.getByRole("button", { name: "arpeggio" });
  expect(arpeggio.getAttribute("aria-disabled")).toBe("true");
  expect(pressedOf("scale")).toBe("true");
  expect(pressedOf("arpeggio")).toBe("false");
  await userEvent.click(arpeggio);
  expect(onTraversal).not.toHaveBeenCalled();
});

test("practice.session/REQ-012/S3 (UI) — an offered arpeggio is pressable again", () => {
  const onTraversal = vi.fn();
  render(
    <TraversalSheet
      open
      traversal={baseTraversal({ shape: "arpeggio" })}
      effectiveShape="arpeggio"
      arpeggioOffered
      effectiveOctaves={{ kind: "count", count: 1 }}
      fittingCounts={[1, 2]}
      settings={baseSettings()}
      onTraversal={onTraversal}
      onSettings={noop}
      onClose={noop}
    />,
  );
  expect(
    screen
      .getByRole("button", { name: "arpeggio" })
      .getAttribute("aria-disabled"),
  ).toBeNull();
  expect(pressedOf("arpeggio")).toBe("true");
});
