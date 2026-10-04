import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, expect, test } from "vitest";
import {
  builtInCatalogue,
  scaleById,
  type Key,
} from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { NamesView } from "../../../src/ui/NamesView";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import { testSessionDeps } from "../../practice/fakes";

const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};

afterEach(() => {
  cleanup();
});

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
  readonly altered: string | null;
  readonly descent: string | null;
}

const readColumns = (): readonly ColumnReading[] =>
  screen.getAllByTestId("names-column").map((column) => {
    const mark = within(column).queryByTestId("note-mark");
    return {
      name: within(column).getByTestId("column-name").textContent,
      mark: mark?.textContent ?? null,
      accented: mark?.getAttribute("data-accented") ?? null,
      degree: within(column).getByTestId("note-degree").textContent,
      altered: within(column)
        .getByTestId("note-degree")
        .getAttribute("data-altered"),
      descent: column.getAttribute("data-descent"),
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
      scale={scaleById("major")}
      direction="updown"
      degreesEnabled={false}
      soundingPitchClass={{ letter: "D", accidental: "natural" }}
      onTapColumn={() => {}}
      tapsEnabled={false}
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

test("theory.circle-of-fifths/REQ-003/S3 (UI) — the names view follows the chosen scale", () => {
  render(
    <NamesView
      key_={gMajor}
      scale={scaleById("lydian")}
      direction="updown"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(
    readColumns().map((c) => [c.name, c.degree, c.altered, c.mark]),
  ).toEqual([
    ["G", "1", "false", ""],
    ["A", "2", "false", ""],
    ["B", "3", "false", ""],
    ["C♯", "♯4", "true", ""],
    ["D", "5", "false", ""],
    ["E", "6", "false", ""],
    ["F♯", "7", "false", "♯1"],
  ]);
});

test("practice.session/REQ-012/S4 — the descent of a split-direction scale in the names view", () => {
  const gMinor: Key = {
    tonic: { letter: "G", accidental: "natural" },
    mode: "naturalMinor",
  };
  const melodic = scaleById("melodic-minor-classical");
  render(
    <NamesView
      key_={gMinor}
      scale={melodic}
      direction="updown"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(readColumns().map((c) => [c.name, c.descent])).toEqual([
    ["G", "false"],
    ["A", "false"],
    ["B♭", "false"],
    ["C", "false"],
    ["D", "false"],
    ["E", "false"],
    ["F♯", "false"],
    ["F", "true"],
    ["E♭", "true"],
  ]);
  expect(
    screen.getAllByTestId("descent-mark").map((m) => m.textContent),
  ).toEqual(["↓", "↓"]);
  expect(screen.queryAllByTestId("note-alt")).toHaveLength(0);
  cleanup();
  render(
    <NamesView
      key_={gMinor}
      scale={melodic}
      direction="up"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(readColumns().map((c) => c.name)).toEqual([
    "G",
    "A",
    "B♭",
    "C",
    "D",
    "E",
    "F♯",
  ]);
  cleanup();
  render(
    <NamesView
      key_={gMinor}
      scale={melodic}
      direction="down"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(readColumns().map((c) => c.name)).toEqual([
    "G",
    "A",
    "B♭",
    "C",
    "D",
    "E♭",
    "F",
  ]);
  cleanup();
  render(
    <NamesView
      key_={gMinor}
      scale={scaleById("natural-minor")}
      direction="updown"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(readColumns()).toHaveLength(7);
});

// practice.session/REQ-017 — base props shared by the names-view meter
// scenarios below: the C major scale, direction ↑↓, degrees on, no sound
// and no taps, idle of a lead target and a meter.
type NamesViewProps = ComponentProps<typeof NamesView>;

const baseNamesProps = (): NamesViewProps => ({
  key_: {
    tonic: { letter: "C", accidental: "natural" },
    mode: "major",
  },
  scale: scaleById("major"),
  direction: "updown",
  degreesEnabled: true,
  soundingPitchClass: null,
  onTapColumn: () => {},
  tapsEnabled: false,
  leadTarget: null,
  meter: null,
});

const renderNames = (extra: Partial<NamesViewProps>) =>
  render(<NamesView {...baseNamesProps()} {...extra} />);

test("practice.session/REQ-017/S6 — the names view: band inset 6, fill 40 %, line inset 3 at +5 ¢", () => {
  renderNames({
    leadTarget: { runIndex: 2 },
    meter: {
      toleranceCents: 10,
      heldFraction: 0.4,
      reading: { cents: 5, verdict: "in-tune" },
    },
  });
  const columns = screen.getAllByTestId("names-column");
  const band = within(columns[2]!).getByTestId("note-meter-band");
  expect(band.style.left).toBe("6px");
  expect(band.style.right).toBe("6px");
  expect(band.style.height).toBe("20%");
  expect(within(columns[2]!).getByTestId("note-meter-fill").style.width).toBe(
    "40%",
  );
  const line = within(columns[2]!).getByTestId("note-meter-line");
  expect(line.style.left).toBe("3px");
  expect(line.style.right).toBe("3px");
  expect(line.style.top).toBe("45%");
  expect(screen.getAllByTestId("note-meter-band")).toHaveLength(1);
  expect(columns[2]!.style.background).not.toBe("transparent");
});

test("practice.session/REQ-017/S1 (names) — silent: the column highlighted, the band, no line", () => {
  renderNames({
    leadTarget: { runIndex: 0 },
    meter: { toleranceCents: 10, heldFraction: 0, reading: null },
  });
  const columns = screen.getAllByTestId("names-column");
  expect(within(columns[0]!).getByTestId("note-meter-band")).toBeTruthy();
  expect(screen.queryByTestId("note-meter-line")).toBeNull();
  expect(
    columns
      .slice(1)
      .every(
        (c) => within(c).getByTestId("column-name").style.opacity === "0.4",
      ),
  ).toBe(true);
});

test("theory.circle-of-fifths/REQ-003/S5 (UI) — a five-note scale shows five columns", () => {
  render(
    <NamesView
      key_={gMajor}
      scale={scaleById("major-pentatonic")}
      direction="updown"
      degreesEnabled
      soundingPitchClass={null}
      onTapColumn={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(readColumns().map((c) => [c.name, c.degree])).toEqual([
    ["G", "1"],
    ["A", "2"],
    ["B", "3"],
    ["D", "5"],
    ["E", "6"],
  ]);
});
