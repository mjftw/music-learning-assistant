import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, expect, test } from "vitest";
import {
  builtInCatalogue,
  inlineAccidentalsOf,
  scaleById,
  signatureOf,
  traversalOf,
  type Accidental,
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

// practice.session/REQ-017 — a local helper for the lead-target tests
// below: the eight KeyViewNotes of C major on the flute, rendered with the
// file's usual base props, `extra` spread over the top.
const cMajor: Key = {
  tonic: { letter: "C", accidental: "natural" },
  mode: "major",
};
const renderStave = (extra: Partial<ComponentProps<typeof StaveView>> = {}) => {
  const notes = traversalOf(cMajor, flute(), scaleById("major"), {
    direction: "up",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  }).run;
  return render(
    <StaveView
      key_={cMajor}
      variant={flute()}
      notes={notes}
      staveNamesEnabled={false}
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
      {...extra}
    />,
  );
};

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
      onTapNote={() => {}}
      tapsEnabled={false}
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
      onTapNote={() => {}}
      tapsEnabled={false}
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
      onTapNote={() => {}}
      tapsEnabled={false}
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
      onTapNote={() => {}}
      tapsEnabled={false}
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
}, 15_000);

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
      onTapNote={() => {}}
      tapsEnabled={false}
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
      onTapNote={() => {}}
      tapsEnabled={false}
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
  const aMinor: Key = {
    tonic: { letter: "A", accidental: "natural" },
    mode: "naturalMinor",
  };
  const oneOctUpDown = {
    direction: "updown",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  } as const;
  const runFor = (key: Key, id: ScaleId) =>
    traversalOf(key, flute(), scaleById(id), oneOctUpDown).run;
  const dataNotes = () =>
    screen
      .getAllByTestId("stave-note")
      .map((head) => head.getAttribute("data-note"));

  const { rerender } = render(
    <StaveView
      key_={gMinor}
      variant={flute()}
      notes={runFor(gMinor, "melodic-minor-classical")}
      staveNamesEnabled
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
    />,
  );
  // Given: G minor, melodic minor classical, ↑↓, 1 oct — a written-out run
  // that repeats G4, D5 and other labels (the scenario's premise).
  expect(dataNotes()).toHaveLength(15);
  expect(
    screen.getAllByTestId("stave-note-name").map((n) => n.textContent),
  ).toEqual([
    "G",
    "A",
    "B♭",
    "C",
    "D",
    "E",
    "F♯",
    "G",
    "F",
    "E♭",
    "D",
    "C",
    "B♭",
    "A",
    "G",
  ]);

  // When the key changes to A minor (still melodic minor classical, ↑↓):
  // exactly that run, and nothing from the G minor run remains.
  rerender(
    <StaveView
      key_={aMinor}
      variant={flute()}
      notes={runFor(aMinor, "melodic-minor-classical")}
      staveNamesEnabled
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(dataNotes()).toEqual([
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F♯5",
    "G♯5",
    "A5",
    "G5",
    "F5",
    "E5",
    "D5",
    "C5",
    "B4",
    "A4",
  ]);
  expect(
    screen.getAllByTestId("stave-note-name").map((n) => n.textContent),
  ).toEqual([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F♯",
    "G♯",
    "A",
    "G",
    "F",
    "E",
    "D",
    "C",
    "B",
    "A",
  ]);

  // Then Natural minor is chosen.
  rerender(
    <StaveView
      key_={aMinor}
      variant={flute()}
      notes={runFor(aMinor, "natural-minor")}
      staveNamesEnabled
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(dataNotes()).toEqual(["A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5"]);
  expect(
    screen.getAllByTestId("stave-note-name").map((n) => n.textContent),
  ).toEqual(["A", "B", "C", "D", "E", "F", "G", "A"]);

  // Then Harmonic minor.
  rerender(
    <StaveView
      key_={aMinor}
      variant={flute()}
      notes={runFor(aMinor, "harmonic-minor")}
      staveNamesEnabled
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(dataNotes()).toEqual([
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
    "G♯5",
    "A5",
  ]);
  expect(
    screen.getAllByTestId("stave-note-name").map((n) => n.textContent),
  ).toEqual(["A", "B", "C", "D", "E", "F", "G♯", "A"]);

  // Then Blues — the seven noteheads the scenario names, and nothing from
  // an earlier run.
  const bluesRun = runFor(aMinor, "blues");
  rerender(
    <StaveView
      key_={aMinor}
      variant={flute()}
      notes={bluesRun}
      staveNamesEnabled
      soundingRunIndex={null}
      playing={false}
      onTapNote={() => {}}
      tapsEnabled={false}
    />,
  );
  expect(dataNotes()).toEqual(["A4", "C5", "D5", "E♭5", "E5", "G5", "A5"]);
  expect(
    screen.getAllByTestId("stave-note-name").map((n) => n.textContent),
  ).toEqual(["A", "C", "D", "E♭", "E", "G", "A"]);

  const glyphOf: Record<Accidental, string> = {
    doubleFlat: "𝄫",
    flat: "♭",
    natural: "♮",
    sharp: "♯",
    doubleSharp: "𝄪",
  };
  const expectedGlyphs = inlineAccidentalsOf(signatureOf(aMinor), bluesRun)
    .filter((accidental): accidental is Accidental => accidental !== null)
    .map((accidental) => glyphOf[accidental]);
  expect(
    screen
      .getAllByTestId("inline-accidental")
      .map((glyph) => glyph.getAttribute("data-glyph")),
  ).toEqual(expectedGlyphs);
});

test("practice.session/REQ-017/S8 — ink behind, faint ahead", () => {
  renderStave({ leadTarget: { runIndex: 4 } });
  const heads = screen.getAllByTestId("stave-note");
  expect(heads.slice(0, 4).map((h) => h.getAttribute("opacity"))).toEqual([
    "1",
    "1",
    "1",
    "1",
  ]);
  expect(heads.slice(5).map((h) => h.getAttribute("opacity"))).toEqual([
    "0.3",
    "0.3",
    "0.3",
  ]);
  expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
  expect(Number(heads[4]!.getAttribute("rx"))).toBeGreaterThan(
    Number(heads[3]!.getAttribute("rx")),
  );
});

test("practice.session/REQ-017/S1 (stave) — the target is highlighted as a sounding note", () => {
  renderStave({ leadTarget: { runIndex: 0 } });
  expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
  expect(screen.getAllByTestId("stave-note")[0]!.getAttribute("fill")).toBe(
    "#8a4b2a",
  );
});

test("practice.session/REQ-017 — onTargetBox reports the target head's centre", () => {
  const boxes: ({ x: number; y: number } | null)[] = [];
  renderStave({
    leadTarget: { runIndex: 0 },
    onTargetBox: (b) => boxes.push(b),
  });
  const head = screen.getAllByTestId("stave-note")[0]!;
  expect(boxes.at(-1)).toEqual({
    x: Number(head.getAttribute("cx")),
    y: Number(head.getAttribute("cy")),
  });
});
