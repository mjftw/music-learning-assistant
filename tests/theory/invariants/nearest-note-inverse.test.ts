import { expect, test } from "vitest";
import {
  nearestNoteOf,
  noteAtPosition,
  pitchHzOf,
  pitchPosition,
} from "../../../src/theory/published";

test("theory.temperament/REQ-002/S5 — the inverse of REQ-001 (invariant)", () => {
  for (const spelling of ["sharp", "flat"] as const)
    for (let position = 21; position <= 108; position += 1) {
      const note = noteAtPosition(position, spelling);
      expect(pitchPosition(note)).toBe(position);
      const back = nearestNoteOf(pitchHzOf(note), spelling);
      expect(back.note).toEqual(note);
      expect(back.cents).toBe(0);
    }
});
