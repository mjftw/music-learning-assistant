import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { SessionDeps } from "../../../src/practice/published";
import { builtInCatalogue, type Key } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { NamesView } from "../../../src/ui/NamesView";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
} from "../../practice/fakes";

const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};

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

const setup = () => {
  localStorage.clear();
  return render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
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

test("practice.session/REQ-006/S2 — the names view follows the sound", () => {
  render(
    <NamesView
      key_={gMajor}
      degreesEnabled={false}
      soundingPitchClass={{ letter: "D", accidental: "natural" }}
    />,
  );

  const columns = screen.getAllByTestId("names-column");
  const readings = columns.map((column) => ({
    name: within(column).getByTestId("column-name").textContent,
    sounding: column.getAttribute("data-sounding"),
  }));
  const sounding = readings.filter((reading) => reading.sounding === "true");
  expect(sounding).toHaveLength(1);
  expect(sounding[0]?.name).toBe("D");
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
