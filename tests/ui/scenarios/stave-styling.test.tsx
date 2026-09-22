import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

afterEach(() => {
  cleanup();
});

const setup = () => {
  localStorage.clear();
  return render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
};

const rootEmphasisCount = (container: HTMLElement): number =>
  container.querySelectorAll(
    '[data-testid="stave"] svg [fill="var(--root-emphasis)"]',
  ).length;

const newAccidentalCount = (container: HTMLElement): number =>
  container.querySelectorAll(
    '[data-testid="stave"] svg [fill="var(--new-accidental)"]',
  ).length;

test("theory.circle-of-fifths/REQ-003/S1, REQ-004/S1 — G major styles three roots and three new accidentals", async () => {
  const { container } = setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  expect(rootEmphasisCount(container)).toBe(3);
  expect(newAccidentalCount(container)).toBe(3);
});

test("theory.circle-of-fifths/REQ-004/S2 — B♭ major moves the highlight to the new flat and the roots to B♭", async () => {
  const { container } = setup();
  await userEvent.click(screen.getByRole("button", { name: "B♭ major" }));

  expect(rootEmphasisCount(container)).toBe(3);
  expect(newAccidentalCount(container)).toBe(3);
});
