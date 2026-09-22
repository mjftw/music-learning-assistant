import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { TEMPO_TERMS } from "../../../src/practice/published";
import { TempoSheet } from "../../../src/ui/TempoSheet";

afterEach(() => {
  cleanup();
});

const noop = () => {
  // no-op handler for props not under test
};

test("practice.session/REQ-004/S2 (UI) — the current term is ticked and current, and picking another calls onPick with it", async () => {
  const onPick = vi.fn();

  render(<TempoSheet open tempoBpm={96} onPick={onPick} onClose={noop} />);

  const andante = screen.getByRole("button", { name: /Andante/ });
  expect(andante.getAttribute("aria-current")).toBe("true");
  expect(andante.textContent).toContain("✓");
  expect(andante.textContent).toContain("76–107");

  const allegro = screen.getByRole("button", { name: /Allegro/ });
  expect(allegro.getAttribute("aria-current")).toBeNull();

  await userEvent.click(allegro);

  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith(TEMPO_TERMS[5]);
});

test("practice.session/REQ-004/S2 (UI) — the eight terms render in order, Largo to Presto", () => {
  render(<TempoSheet open tempoBpm={96} onPick={noop} onClose={noop} />);

  const names = screen
    .getAllByTestId("tempo-term-name")
    .map((element) => element.textContent);

  expect(names).toEqual(TEMPO_TERMS.map((term) => term.name));
});
