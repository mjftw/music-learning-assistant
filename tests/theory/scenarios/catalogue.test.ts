import { expect, test } from "vitest";
import { builtInCatalogue, loadCatalogue } from "../../../src/theory/published";
const asFile = (json: object) => json as unknown;
test("theory.instruments/REQ-001/S1 — the v1 catalogue", () => {
  const catalogue = builtInCatalogue();
  expect(catalogue.notices).toEqual([]);
  expect(
    catalogue.instruments.map((instrument) => instrument.instrumentId).sort(),
  ).toEqual(["flute", "ocarina"]);
  const flute = catalogue.instruments.find(
    (instrument) => instrument.instrumentId === "flute",
  )!;
  expect(flute.variants.map((variant) => variant.variantName)).toEqual([
    "Concert",
  ]);
  expect(flute.variants[0]!.range).toEqual({
    lowest: { letter: "C", accidental: "natural", octave: 4 },
    highest: { letter: "C", accidental: "natural", octave: 7 },
  });
  const ocarina = catalogue.instruments.find(
    (instrument) => instrument.instrumentId === "ocarina",
  )!;
  expect(
    ocarina.variants
      .map(
        (variant) =>
          `${variant.variantName}: ${variant.range.lowest.letter}${variant.range.lowest.octave}–${variant.range.highest.letter}${variant.range.highest.octave}`,
      )
      .sort(),
  ).toEqual(["Alto C: A4–F6", "Bass C: A3–F5"]);
});
test("theory.instruments/REQ-002/S1 — a new valid variant file appears", () => {
  const catalogue = loadCatalogue(
    new Map([
      [
        "ocarina-soprano-g.json",
        asFile({
          instrumentId: "ocarina",
          instrumentName: "Ocarina",
          variantId: "ocarina-soprano-g",
          variantName: "Soprano G",
          range: { lowest: "D5", highest: "B6" },
        }),
      ],
    ]),
  );
  expect(catalogue.notices).toEqual([]);
  expect(catalogue.instruments[0]!.variants[0]!.variantName).toBe("Soprano G");
  expect(catalogue.instruments[0]!.variants[0]!.range.lowest).toEqual({
    letter: "D",
    accidental: "natural",
    octave: 5,
  });
});
test("theory.instruments/REQ-003/S1 — a bad file is excluded with a notice and the rest load", () => {
  const catalogue = loadCatalogue(
    new Map<string, unknown>([
      [
        "broken.json",
        asFile({
          instrumentId: "ocarina",
          instrumentName: "Ocarina",
          variantId: "broken",
          variantName: "Broken",
          range: { lowest: "F6", highest: "A4" },
        }),
      ],
      [
        "ok.json",
        asFile({
          instrumentId: "flute",
          instrumentName: "Flute",
          variantId: "flute-concert",
          variantName: "Concert",
          range: { lowest: "C4", highest: "C7" },
        }),
      ],
    ]),
  );
  expect(
    catalogue.instruments.flatMap((instrument) => instrument.variants),
  ).toHaveLength(1);
  expect(catalogue.notices).toHaveLength(1);
  expect(catalogue.notices[0]!.source).toBe("broken.json");
  expect(catalogue.notices[0]!.problem).toMatch(/range/i);
});
