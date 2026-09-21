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

const enterStaveView = async () => {
  await userEvent.click(screen.getByRole("button", { name: "stave" }));
};

test("theory.circle-of-fifths/REQ-003/S1 — G major on the flute (acceptance)", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await enterStaveView();

  const notes = screen.getAllByTestId("stave-note");
  expect(notes).toHaveLength(22);
  expect(notes[0]?.getAttribute("data-note")).toBe("C4");
  expect(notes[notes.length - 1]?.getAttribute("data-note")).toBe("C7");

  const roots = notes
    .filter((note) => note.getAttribute("data-root") === "true")
    .map((note) => note.getAttribute("data-note"));
  expect(roots).toEqual(["G4", "G5", "G6"]);

  expect(screen.getByTestId("range-summary").textContent).toBe(
    "22 notes · C4–C7",
  );

  const accentedSignatureGlyphs = screen
    .getAllByTestId("stave-signature-glyph")
    .filter((glyph) => glyph.getAttribute("data-accented") === "true");
  expect(accentedSignatureGlyphs).toHaveLength(1);
});

test("theory.circle-of-fifths/REQ-003/S2 — the display follows the variant's range", async () => {
  setup();
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Instrument" }),
    "ocarina-alto-c",
  );
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await enterStaveView();

  const before = screen
    .getAllByTestId("stave-note")
    .map((note) => note.getAttribute("data-note"));

  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Instrument" }),
    "ocarina-bass-c",
  );

  const after = screen
    .getAllByTestId("stave-note")
    .map((note) => note.getAttribute("data-note"));

  expect(after).toHaveLength(before.length);
  before.forEach((note, index) => {
    if (note === null) throw new Error("unreachable: missing data-note");
    const pitchClass = note.slice(0, -1);
    const octave = Number(note.slice(-1));
    expect(after[index]).toBe(`${pitchClass}${octave - 1}`);
  });
});

test("theory.circle-of-fifths/REQ-007/S1 — switching views shows noteheads with no name labels", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  expect(screen.queryAllByTestId("stave-note")).toHaveLength(0);

  await enterStaveView();

  expect(screen.getAllByTestId("stave-note").length).toBeGreaterThan(0);
  expect(screen.queryAllByTestId("stave-note-name")).toHaveLength(0);
});

test("theory.circle-of-fifths/REQ-007/S2 — stave names on demand, and the choice sticks", async () => {
  setup();
  await enterStaveView();
  await userEvent.click(screen.getByRole("button", { name: "Settings" }));
  await userEvent.click(
    screen.getByRole("switch", { name: "Note names on the stave" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Close settings" }));
  await userEvent.click(screen.getByRole("button", { name: "D major" }));

  expect(screen.getAllByTestId("stave-note-name").length).toBeGreaterThan(0);
  expect(screen.getAllByTestId("stave-note").length).toBeGreaterThan(0);
});

test("theory.circle-of-fifths/REQ-011 — G major on the flute offers 1 oct, 2 oct and full, choosing 1 oct shows 8 notes", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await enterStaveView();

  const pillLabels = screen
    .getAllByTestId("span-pill")
    .map((pill) => pill.textContent);
  expect(pillLabels).toEqual(["1 oct", "2 oct", "full"]);

  await userEvent.click(screen.getByRole("button", { name: "1 oct" }));

  expect(screen.getAllByTestId("stave-note")).toHaveLength(8);
  expect(screen.getByTestId("span-caption").textContent).toBe(
    "1 oct from G · 8",
  );
});
