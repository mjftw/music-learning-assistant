import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import {
  builtInCatalogue,
  runOf,
  type Key,
} from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import { StaveView } from "../../../src/ui/StaveView";
import { testSessionDeps } from "../../practice/fakes";

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

const enterStaveView = async () => {
  await userEvent.click(screen.getByRole("button", { name: "stave" }));
};

// The instrument picker moved from a `<select>` to the bottom sheet
// (theory.instruments/REQ-001/S2, T010) — open it via the header pill, then
// pick the row named for the variant.
const selectVariant = async (rowName: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Instrument" }));
  await userEvent.click(screen.getByRole("button", { name: rowName }));
};

const gMajor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
};
const flute = () =>
  builtInCatalogue()
    .instruments.flatMap((instrument) => instrument.variants)
    .find((variant) => variant.variantId === "flute-concert")!;

test("theory.circle-of-fifths/REQ-003/S1 — G major on the flute (acceptance)", () => {
  const notes = runOf(gMajor, flute(), {
    direction: "updown",
    octaves: { kind: "full" },
    shape: "scale",
  });

  render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      noteLength="crotchet"
    />,
  );

  const heads = screen.getAllByTestId("stave-note");
  expect(heads).toHaveLength(22);
  expect(heads[0]?.getAttribute("data-note")).toBe("C4");
  expect(heads[heads.length - 1]?.getAttribute("data-note")).toBe("C7");

  const roots = heads
    .filter((head) => head.getAttribute("data-root") === "true")
    .map((head) => head.getAttribute("data-note"));
  expect(roots).toEqual(["G4", "G5", "G6"]);

  const accentedSignatureGlyphs = screen
    .getAllByTestId("stave-signature-glyph")
    .filter((glyph) => glyph.getAttribute("data-accented") === "true");
  expect(accentedSignatureGlyphs).toHaveLength(1);
});

test("theory.circle-of-fifths/REQ-003/S4 — the stave shows the traversal's run, the summary the key", () => {
  const notes = runOf(gMajor, flute(), {
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "arpeggio",
  });

  render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      noteLength="crotchet"
    />,
  );

  const heads = screen.getAllByTestId("stave-note");
  expect(heads.map((head) => head.getAttribute("data-note"))).toEqual([
    "G4",
    "B4",
    "D5",
    "G5",
    "B5",
    "D6",
    "G6",
  ]);
});

test("theory.circle-of-fifths/REQ-003/S5 — the stave shows the note length", () => {
  const notes = runOf(gMajor, flute(), {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });
  expect(notes).toHaveLength(8);

  const { rerender } = render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      noteLength="quaver"
    />,
  );

  const heads = screen.getAllByTestId("stave-note");
  const flags = screen.getAllByTestId("stave-flag");
  expect(flags).toHaveLength(8);

  // index 0 (G4) is stem-up; the top of the run (G5) is stem-down — one of
  // each, per REQ-003/S5.
  const stemUpLine = heads[0]!.querySelector("line")!;
  const stemDownLine = heads[heads.length - 1]!.querySelector("line")!;
  const stemUpFlag = flags[0]!;
  const stemDownFlag = flags[flags.length - 1]!;

  expect(stemUpFlag.getAttribute("d")).toBe(
    `M ${stemUpLine.getAttribute("x1")} ${stemUpLine.getAttribute("y2")} c 6.5 3 8.5 9 4.5 15 c 1 -6 -1.5 -9 -4.5 -11 z`,
  );
  expect(stemDownFlag.getAttribute("d")).toBe(
    `M ${stemDownLine.getAttribute("x1")} ${stemDownLine.getAttribute("y2")} c 6.5 -3 8.5 -9 4.5 -15 c 1 6 -1.5 9 -4.5 11 z`,
  );

  rerender(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      noteLength="crotchet"
    />,
  );

  expect(screen.queryAllByTestId("stave-flag")).toHaveLength(0);
});

test("practice.session/REQ-006/S1 — the sounding note is accented, enlarged and haloed; the rest are dimmed", () => {
  const notes = runOf(gMajor, flute(), {
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "arpeggio",
  });

  const { rerender } = render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={4}
      playing={true}
      noteLength="crotchet"
    />,
  );

  const heads = screen.getAllByTestId("stave-note");
  const soundingEllipse = heads[4]!.querySelector("ellipse")!;
  const otherEllipse = heads[0]!.querySelector("ellipse")!;

  expect(soundingEllipse.getAttribute("fill")).toBe("#8a4b2a");
  expect(soundingEllipse.getAttribute("opacity")).toBe("1");
  expect(Number(soundingEllipse.getAttribute("rx"))).toBeCloseTo(
    Number(otherEllipse.getAttribute("rx")) * 1.25,
  );

  const halos = screen.getAllByTestId("sounding-halo");
  expect(halos).toHaveLength(1);
  expect(halos[0]?.getAttribute("cx")).toBe(soundingEllipse.getAttribute("cx"));
  expect(halos[0]?.getAttribute("cy")).toBe(soundingEllipse.getAttribute("cy"));

  heads.forEach((head, index) => {
    if (index === 4) return;
    expect(head.querySelector("ellipse")!.getAttribute("opacity")).toBe("0.72");
  });

  rerender(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      noteLength="crotchet"
    />,
  );

  expect(screen.queryAllByTestId("sounding-halo")).toHaveLength(0);
  screen.getAllByTestId("stave-note").forEach((head) => {
    expect(head.querySelector("ellipse")!.getAttribute("opacity")).toBe("1");
  });
});

test("theory.circle-of-fifths/REQ-003/S2 — the display follows the variant's range", async () => {
  setup();
  await selectVariant("Ocarina Alto C");
  await userEvent.click(screen.getByRole("button", { name: "G major" }));
  await enterStaveView();

  const before = screen
    .getAllByTestId("stave-note")
    .map((note) => note.getAttribute("data-note"));

  await selectVariant("Ocarina Bass C");

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
