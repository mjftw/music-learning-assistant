import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  builtInCatalogue,
  scaleById,
  traversalOf,
  type Key,
  type ScaleId,
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
  const notes = traversalOf(gMajor, flute(), scaleById("major"), {
    direction: "updown",
    octaves: { kind: "full" },
    shape: "scale",
  }).run;

  render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
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
  const notes = traversalOf(gMajor, flute(), scaleById("major"), {
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "arpeggio",
  }).run;

  render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
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

test("practice.session/REQ-006/S1 — the sounding note is accented, enlarged and haloed; the rest are dimmed", () => {
  const notes = traversalOf(gMajor, flute(), scaleById("major"), {
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "arpeggio",
  }).run;

  const { rerender } = render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={4}
      playing={true}
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

test("theory.circle-of-fifths/REQ-003/S6 (UI) — a split-direction scale is written out with held accidentals", () => {
  const gMinor: Key = {
    tonic: { letter: "G", accidental: "natural" },
    mode: "naturalMinor",
  };
  const { run } = traversalOf(
    gMinor,
    flute(),
    scaleById("melodic-minor-classical"),
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "scale",
    },
  );

  render(
    <StaveView
      key_={gMinor}
      variant={flute()}
      notes={run}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
    />,
  );

  expect(screen.getAllByTestId("stave-note")).toHaveLength(15);
  expect(
    screen
      .getAllByTestId("inline-accidental")
      .map((glyph) => [
        glyph.getAttribute("data-run-index"),
        glyph.getAttribute("data-glyph"),
      ]),
  ).toEqual([
    ["5", "♮"],
    ["6", "♯"],
    ["8", "♮"],
    ["9", "♭"],
  ]);
});

test("theory.circle-of-fifths/REQ-003/S3 (UI, stave) — Lydian's C♯ carries an inline sharp", () => {
  const { run } = traversalOf(gMajor, flute(), scaleById("lydian"), {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });

  render(
    <StaveView
      key_={gMajor}
      variant={flute()}
      notes={run}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
    />,
  );

  expect(
    screen
      .getAllByTestId("inline-accidental")
      .map((glyph) => [
        glyph.getAttribute("data-run-index"),
        glyph.getAttribute("data-glyph"),
      ]),
  ).toEqual([["3", "♯"]]);
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

test("theory.circle-of-fifths/REQ-003/S7 — the stave after a scale change is exactly the new run", () => {
  const gMinor: Key = {
    tonic: { letter: "G", accidental: "natural" },
    mode: "naturalMinor",
  };
  const oneOctUpDown = {
    direction: "updown",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  } as const;
  const runFor = (id: ScaleId) =>
    traversalOf(gMinor, flute(), scaleById(id), oneOctUpDown).run;
  const heads = () => screen.getAllByTestId("stave-note").length;
  // Make the test load-bearing: `noteLabel`-keyed noteheads don't fail any
  // count/glyph assertion in jsdom (React still renders every element
  // despite the duplicate key), so the only observable regression signal is
  // React's own "same key" console.error — assert on it directly.
  const errors = vi.spyOn(console, "error");
  try {
    const { rerender } = render(
      <StaveView
        key_={gMinor}
        variant={flute()}
        notes={runFor("melodic-minor-classical")}
        staveNamesEnabled
        soundingRunIndex={null}
        playing={false}
      />,
    );
    expect(heads()).toBe(15);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    for (const [id, count] of [
      ["natural-minor", 8],
      ["harmonic-minor", 8],
      ["blues", 7],
    ] as const) {
      rerender(
        <StaveView
          key_={gMinor}
          variant={flute()}
          notes={runFor(id)}
          staveNamesEnabled
          soundingRunIndex={null}
          playing={false}
        />,
      );
      expect(heads()).toBe(count);
      expect(screen.getAllByTestId("stave-note-name").length).toBe(count);
    }
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/same key/);
    // Order derived from inlineAccidentalsOf(signatureOf(gMinor), runFor("blues")) — the
    // brief's guessed ["♮","♭"] was in the wrong order; the blues run is G4 B♭4 C5 D♭5 D5
    // F5 G5, so the inline accidentals appear flat (D♭5) then natural (D5).
    expect(
      screen
        .getAllByTestId("inline-accidental")
        .map((g) => g.getAttribute("data-glyph")),
    ).toEqual(["♭", "♮"]);
  } finally {
    errors.mockRestore();
  }
});
