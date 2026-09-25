import { expect, test } from "vitest";
import {
  defaultDroneSettings,
  droneNoteOf,
} from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import { keyOf, variantOf } from "../fakes";

test("practice.drone/REQ-002/S1 — the default octave per key and variant", () => {
  const cases: readonly [string, string, string][] = [
    ["G", "flute-concert", "G5"],
    ["G", "ocarina-alto-c", "G5"],
    ["G", "ocarina-bass-c", "G4"],
    ["C", "flute-concert", "C5"],
    ["C", "ocarina-alto-c", "C6"],
    ["C", "ocarina-bass-c", "C5"],
  ];
  for (const [key, variant, expected] of cases) {
    expect(
      noteLabel(
        droneNoteOf(keyOf(key), variantOf(variant), defaultDroneSettings),
      ),
    ).toBe(expected);
  }
});

test("practice.drone/REQ-002/S5 — a pinned octave the new key cannot use falls back to that key's default, the pin kept", () => {
  const pinnedToZero = {
    ...defaultDroneSettings,
    octave: { kind: "pinned", octave: 0 },
  } as const;
  expect(
    noteLabel(
      droneNoteOf(keyOf("A"), variantOf("flute-concert"), pinnedToZero),
    ),
  ).toBe("A0");
  expect(
    noteLabel(
      droneNoteOf(keyOf("C"), variantOf("flute-concert"), pinnedToZero),
    ),
  ).toBe("C5");
  expect(
    noteLabel(
      droneNoteOf(keyOf("A"), variantOf("flute-concert"), pinnedToZero),
    ),
  ).toBe("A0");
});
