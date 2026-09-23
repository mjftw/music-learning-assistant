import { expect, test } from "vitest";
import {
  TEMPO_TERMS,
  steppedTempo,
  tempoForTerm,
  tempoTermFor,
} from "../../../src/practice/published";

test("practice.session/REQ-004/S1 — stepping through a band boundary", () => {
  expect(tempoTermFor(106).name).toBe("Andante");
  expect(steppedTempo(106, 2)).toBe(108);
  expect(tempoTermFor(108).name).toBe("Moderato");
  expect(steppedTempo(108, -2)).toBe(106);
});

test("practice.session/REQ-004/S2 — picking a term", () => {
  expect(tempoForTerm(TEMPO_TERMS.find((t) => t.name === "Allegro")!)).toBe(
    138,
  );
});

test("practice.session/REQ-004/S3 — the limits hold", () => {
  expect(steppedTempo(200, 2)).toBe(200);
  expect(tempoTermFor(200).name).toBe("Presto");
  expect(steppedTempo(40, -2)).toBe(40);
  expect(tempoTermFor(40).name).toBe("Largo");
});

test("practice.session/REQ-004 — the bands are contiguous across the whole range", () => {
  for (let bpm = 40; bpm <= 200; bpm += 1) {
    expect(
      TEMPO_TERMS.filter((t) => bpm >= t.fromBpm && bpm <= t.toBpm),
    ).toHaveLength(1);
  }
});
