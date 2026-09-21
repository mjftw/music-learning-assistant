import { cleanup, render, screen, within } from "@testing-library/react";
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

interface ColumnReading {
  readonly name: string | null;
  readonly mark: string | null;
  readonly accented: string | null;
  readonly degree: string | null;
}

const readColumns = (): readonly ColumnReading[] =>
  screen.getAllByTestId("names-column").map((column) => {
    const mark = within(column).getByTestId("note-mark");
    return {
      name: within(column).getByTestId("column-name").textContent,
      mark: mark.textContent,
      accented: mark.getAttribute("data-accented"),
      degree: within(column).getByTestId("note-degree").textContent,
    };
  });

test("theory.circle-of-fifths/REQ-003/S3 — the names view shows G major's seven notes in scale order", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  const names = readColumns().map((column) => column.name);
  expect(names).toEqual(["G", "A", "B", "C", "D", "E", "F♯"]);
});

test("theory.circle-of-fifths/REQ-010/S1 — degrees on the arc and in the names view agree", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  const namesViewDegrees = readColumns().map((column) => column.degree);
  expect(namesViewDegrees).toEqual(["1", "2", "3", "4", "5", "6", "7"]);

  const arcDegrees = screen
    .getAllByTestId("arc-degree")
    .map((element) => element.textContent)
    .sort();
  expect(arcDegrees).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
});

test("theory.circle-of-fifths/REQ-004/S1 — G major's new sharp is marked and accented", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  const columns = readColumns();
  const fSharp = columns.find((column) => column.name === "F♯");
  expect(fSharp?.mark).toBe("♯1");
  expect(fSharp?.accented).toBe("true");
  expect(columns.filter((column) => column.accented === "true")).toHaveLength(
    1,
  );
});

test("theory.circle-of-fifths/REQ-004/S2 — B♭ major marks B♭ flat one and accents E♭ as flat two", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "B♭ major" }));

  const columns = readColumns();
  const bFlat = columns.find((column) => column.name === "B♭");
  const eFlat = columns.find((column) => column.name === "E♭");
  expect(bFlat?.mark).toBe("♭1");
  expect(bFlat?.accented).toBe("false");
  expect(eFlat?.mark).toBe("♭2");
  expect(eFlat?.accented).toBe("true");
});

test("theory.circle-of-fifths/REQ-004/S3 — C major has no marks and no accented signature glyph", () => {
  setup();

  const columns = readColumns();
  expect(columns.every((column) => column.mark === "")).toBe(true);
  const signatureGlyphs = screen.queryAllByTestId("signature-glyph");
  expect(
    signatureGlyphs.every(
      (glyph) => glyph.getAttribute("data-accented") === "false",
    ),
  ).toBe(true);
});
