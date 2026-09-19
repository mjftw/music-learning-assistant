import { expect, test } from "vitest";
import { builtInCatalogue, keyView } from "../../../src/theory/published";
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
  const view = keyView(gMajor, byId("flute-concert"));
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
  expect(view.relative).toEqual({
    tonic: { letter: "E", accidental: "natural" },
    mode: "naturalMinor",
  });
});
test("theory.circle-of-fifths/REQ-003/S2 — Alto C → Bass C shifts everything down one octave", () => {
  const alto = keyView(gMajor, byId("ocarina-alto-c")).notes.map((entry) =>
    label(entry.note),
  );
  const bass = keyView(gMajor, byId("ocarina-bass-c")).notes.map((entry) =>
    label(entry.note),
  );
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
  expect(view.relative).toEqual(gMajor);
});
test("theory.circle-of-fifths/REQ-002/S2 — Gb major spells flat, F# major spells sharp", () => {
  const flute = byId("flute-concert");
  const flats = keyView(
    { tonic: { letter: "G", accidental: "flat" }, mode: "major" },
    flute,
  );
  const sharps = keyView(
    { tonic: { letter: "F", accidental: "sharp" }, mode: "major" },
    flute,
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
