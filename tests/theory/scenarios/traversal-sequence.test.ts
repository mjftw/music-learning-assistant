import { expect, test } from "vitest";
import {
  builtInCatalogue,
  noteLabel,
  scaleById,
  traversalOf,
  type Direction,
  type Key,
  type Traversal,
} from "../../../src/theory/published";

const variantById = (id: string) =>
  builtInCatalogue()
    .instruments.flatMap((instrument) => instrument.variants)
    .find((variant) => variant.variantId === id)!;
const major = (
  letter: "A" | "B" | "C" | "D" | "E" | "F" | "G",
  accidental: "natural" | "sharp" | "flat" = "natural",
) => ({ tonic: { letter, accidental }, mode: "major" as const });
const label = (note: { letter: string; accidental: string; octave: number }) =>
  `${note.letter}${note.accidental === "sharp" ? "#" : note.accidental === "flat" ? "b" : ""}${note.octave}`;

test("theory.circle-of-fifths/REQ-012/S1 — two octaves of G major on the flute", () => {
  const { run, sequence } = traversalOf(
    major("G"),
    variantById("flute-concert"),
    scaleById("major"),
    {
      direction: "updown",
      octaves: { kind: "count", count: 2 },
      shape: "scale",
    },
  );
  expect(run.map((n) => label(n.note))).toEqual([
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
  ]);
  const seq = sequence.map((n) => label(n.note));
  expect(seq).toHaveLength(29);
  expect(seq).toEqual([...seq].reverse());
  expect(seq[0]).toBe("G4");
  expect(seq[14]).toBe("G6");
  expect(seq[28]).toBe("G4");
});

test("theory.circle-of-fifths/REQ-012/S4 — down", () => {
  const majorScale = scaleById("major");
  const flute = variantById("flute-concert");
  const traversal = {
    octaves: { kind: "count" as const, count: 2 as const },
    shape: "scale" as const,
  };
  const up = traversalOf(major("G"), flute, majorScale, {
    ...traversal,
    direction: "up",
  }).sequence.map((n) => label(n.note));
  const down = traversalOf(major("G"), flute, majorScale, {
    ...traversal,
    direction: "down",
  }).sequence.map((n) => label(n.note));
  expect(down).toEqual([...up].reverse());
  expect(down).toHaveLength(15);
});

const gMinor: Key = {
  tonic: { letter: "G", accidental: "natural" },
  mode: "naturalMinor",
};
const oneOct = (direction: Direction): Traversal => ({
  direction,
  octaves: { kind: "count", count: 1 },
  shape: "scale",
});

test("theory.circle-of-fifths/REQ-012/S6 — a scale with its own descending form", () => {
  const { run, sequence } = traversalOf(
    gMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    oneOct("updown"),
  );
  expect(sequence.map((n) => noteLabel(n.note))).toEqual([
    "G4",
    "A4",
    "B♭4",
    "C5",
    "D5",
    "E5",
    "F♯5",
    "G5",
    "F5",
    "E♭5",
    "D5",
    "C5",
    "B♭4",
    "A4",
    "G4",
  ]);
  expect(run.map((n) => noteLabel(n.note))).toEqual(
    sequence.map((n) => noteLabel(n.note)),
  );
  expect(sequence.map((n) => n.runIndex)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  ]);
});

test("theory.circle-of-fifths/REQ-003/S6 (theory) — ↑ shows the ascending form, ↓ the descending form lowest to highest", () => {
  const up = traversalOf(
    gMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    oneOct("up"),
  );
  expect(up.run.map((n) => noteLabel(n.note))).toEqual([
    "G4",
    "A4",
    "B♭4",
    "C5",
    "D5",
    "E5",
    "F♯5",
    "G5",
  ]);
  const down = traversalOf(
    gMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    oneOct("down"),
  );
  expect(down.run.map((n) => noteLabel(n.note))).toEqual([
    "G4",
    "A4",
    "B♭4",
    "C5",
    "D5",
    "E♭5",
    "F5",
    "G5",
  ]);
  expect(down.sequence.map((n) => noteLabel(n.note))).toEqual([
    "G5",
    "F5",
    "E♭5",
    "D5",
    "C5",
    "B♭4",
    "A4",
    "G4",
  ]);
  const arpeggio = traversalOf(
    gMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "arpeggio",
    },
  );
  expect(arpeggio.sequence.map((n) => noteLabel(n.note))).toEqual([
    "G4",
    "B♭4",
    "D5",
    "G5",
    "D5",
    "B♭4",
    "G4",
  ]);
});

test("theory.circle-of-fifths/REQ-012 (converge C1) — a split-direction run starts and ends on the tonic on every key", () => {
  const cSharpMinor: Key = {
    tonic: { letter: "C", accidental: "sharp" },
    mode: "naturalMinor",
  };
  const down = traversalOf(
    cSharpMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    oneOct("down"),
  );
  expect(down.sequence.map((n) => noteLabel(n.note))).toEqual([
    "C♯5",
    "B4",
    "A4",
    "G♯4",
    "F♯4",
    "E4",
    "D♯4",
    "C♯4",
  ]);
  const both = traversalOf(
    cSharpMinor,
    variantById("flute-concert"),
    scaleById("melodic-minor-classical"),
    oneOct("updown"),
  );
  expect(both.sequence.map((n) => noteLabel(n.note))).toEqual([
    "C♯4",
    "D♯4",
    "E4",
    "F♯4",
    "G♯4",
    "A♯4",
    "B♯4",
    "C♯5",
    "B4",
    "A4",
    "G♯4",
    "F♯4",
    "E4",
    "D♯4",
    "C♯4",
  ]);
});

test("theory.circle-of-fifths/REQ-012 (converge C2) — ↑↓ over the full range never repeats a pitch when the forms' tops differ", () => {
  const aMinor: Key = {
    tonic: { letter: "A", accidental: "natural" },
    mode: "naturalMinor",
  };
  const { sequence } = traversalOf(
    aMinor,
    variantById("ocarina-alto-c"),
    scaleById("melodic-minor-classical"),
    { direction: "updown", octaves: { kind: "full" }, shape: "scale" },
  );
  const labels = sequence.map((n) => noteLabel(n.note));
  for (let i = 1; i < labels.length; i += 1)
    expect(labels[i]).not.toBe(labels[i - 1]);
  // A4 is in range on Ocarina Alto C (A4–F6) and is the tonic of both forms,
  // so it is both run's lowest note — the brief's literal fixture here
  // (["B4","C5","D5"] / "B4") is off by the tonic at each end; the
  // converge report's own C2 probe output for this exact combination,
  // with only its "repeat E6@12" defect removed, is A4 B4 C5 … D6 C6 B5 A5
  // G5 F5 E5 D5 C5 B4 A4 (.sdd/reports/005-scale-selection/converge.md:360).
  expect(labels.slice(0, 3)).toEqual(["A4", "B4", "C5"]);
  expect(labels[labels.length - 1]).toBe("A4");
});
