import { expect, test } from "vitest";
import {
  builtInCatalogue,
  keyView,
  noteLabel,
  relativeOf,
  scaleById,
} from "../../../src/theory/published";
import type { Variant, VariantId } from "../../../src/theory/published";
const variants = () =>
  builtInCatalogue().instruments.flatMap((instrument) => instrument.variants);
const byId = (id: string) =>
  variants().find((variant) => variant.variantId === id)!;
const gMajor = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "major",
} as const;
const label = (note: { letter: string; accidental: string; octave: number }) =>
  `${note.letter}${note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : ""}${note.octave}`;
test("theory.circle-of-fifths/REQ-003/S1 — G major on the flute (acceptance)", () => {
  const view = keyView(gMajor, byId("flute-concert"), scaleById("major"));
  expect(view.signature).toEqual({
    kind: "sharps",
    count: 1,
    accidentals: [{ letter: "F", accidental: "sharp" }],
  });
  expect(view.notes.map((entry) => label(entry.note))).toEqual([
    "C4",
    "D4",
    "E4",
    "F#4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F#5",
    "G5",
    "A5",
    "B5",
    "C6",
    "D6",
    "E6",
    "F#6",
    "G6",
    "A6",
    "B6",
    "C7",
  ]);
  expect(
    view.notes
      .filter((entry) => entry.isRoot)
      .map((entry) => label(entry.note)),
  ).toEqual(["G4", "G5", "G6"]);
  expect(relativeOf(gMajor)).toEqual({
    tonic: { letter: "E", accidental: "natural" },
    mode: "naturalMinor",
  });
});
test("theory.circle-of-fifths/REQ-003/S2 — Alto C → Bass C shifts everything down one octave", () => {
  const alto = keyView(
    gMajor,
    byId("ocarina-alto-c"),
    scaleById("major"),
  ).notes.map((entry) => label(entry.note));
  const bass = keyView(
    gMajor,
    byId("ocarina-bass-c"),
    scaleById("major"),
  ).notes.map((entry) => label(entry.note));
  expect(alto[0]).toBe("A4");
  expect(bass).toEqual(
    alto.map((noteLabel) =>
      noteLabel.replace(/\d/, (octave) => String(Number(octave) - 1)),
    ),
  );
});
test("theory.circle-of-fifths/REQ-001/S2 — E minor stands on its own", () => {
  const view = keyView(
    { tonic: { letter: "E", accidental: "natural" }, mode: "naturalMinor" },
    byId("flute-concert"),
    scaleById("natural-minor"),
  );
  expect(view.signature).toEqual({
    kind: "sharps",
    count: 1,
    accidentals: [{ letter: "F", accidental: "sharp" }],
  });
  expect(view.notes[0]!.note.letter).toBe("C");
  expect(
    view.notes.some((entry) => entry.isRoot && entry.note.letter === "E"),
  ).toBe(true);
  expect(
    relativeOf({
      tonic: { letter: "E", accidental: "natural" },
      mode: "naturalMinor",
    }),
  ).toEqual(gMajor);
});
test("theory.circle-of-fifths/REQ-002/S2 — Gb major spells flat, F# major spells sharp", () => {
  const flute = byId("flute-concert");
  const flats = keyView(
    { tonic: { letter: "G", accidental: "flat" }, mode: "major" },
    flute,
    scaleById("major"),
  );
  const sharps = keyView(
    { tonic: { letter: "F", accidental: "sharp" }, mode: "major" },
    flute,
    scaleById("major"),
  );
  expect(flats.signature).toMatchObject({ kind: "flats", count: 6 });
  expect(sharps.signature).toMatchObject({ kind: "sharps", count: 6 });
  expect(flats.notes.every((entry) => entry.note.accidental !== "sharp")).toBe(
    true,
  );
  expect(sharps.notes.every((entry) => entry.note.accidental !== "flat")).toBe(
    true,
  );
});
test("theory.circle-of-fifths/REQ-003 — a range boundary spelled across an octave edge still yields every in-range note (W1 regression)", () => {
  const cFlatBottom: Variant = {
    instrumentId: "test",
    instrumentName: "Test",
    variantId: "test-cflat" as VariantId,
    variantName: "C flat bottom",
    range: {
      lowest: { letter: "C", accidental: "flat", octave: 4 },
      highest: { letter: "C", accidental: "natural", octave: 5 },
    },
  };
  const gMajorNotes = keyView(
    { tonic: { letter: "G", accidental: "natural" }, mode: "major" },
    cFlatBottom,
    scaleById("major"),
  ).notes.map(
    (entry) =>
      `${entry.note.letter}${entry.note.accidental}${entry.note.octave}`,
  );
  expect(gMajorNotes[0]).toBe("Bnatural3");
  const bSharpTop: Variant = {
    instrumentId: "test",
    instrumentName: "Test",
    variantId: "test-bsharp" as VariantId,
    variantName: "B sharp top",
    range: {
      lowest: { letter: "C", accidental: "natural", octave: 4 },
      highest: { letter: "B", accidental: "sharp", octave: 6 },
    },
  };
  const cFlatMajorNotes = keyView(
    { tonic: { letter: "C", accidental: "flat" }, mode: "major" },
    bSharpTop,
    scaleById("major"),
  ).notes.map(
    (entry) =>
      `${entry.note.letter}${entry.note.accidental}${entry.note.octave}`,
  );
  expect(cFlatMajorNotes[cFlatMajorNotes.length - 1]).toBe("Cflat7");
});
test("theory.circle-of-fifths/REQ-003/S5 (theory) — a five-note scale's key view has five notes per octave, each carrying its degree", () => {
  const flute = byId("flute-concert");
  const view = keyView(gMajor, flute, scaleById("major-pentatonic"));
  const labels = view.notes.map((n) => noteLabel(n.note));
  expect(labels.slice(0, 6)).toEqual(["D4", "E4", "G4", "A4", "B4", "D5"]);
  expect(view.notes.map((n) => n.degree).slice(0, 6)).toEqual([
    5, 6, 1, 2, 3, 5,
  ]);
  expect(
    view.notes.filter((n) => n.isRoot).map((n) => noteLabel(n.note)),
  ).toEqual(["G4", "G5", "G6"]);
  expect(view.signature.count).toBe(1);
  const lydian = keyView(gMajor, flute, scaleById("lydian"));
  expect(lydian.notes.find((n) => n.altered)?.degreeLabel).toBe("♯4");
});
