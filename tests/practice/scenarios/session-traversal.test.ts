import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
} from "../../../src/practice/published";
import type { Traversal } from "../../../src/theory/published";
import { noteLabel } from "../../../src/theory/published";
import { keyOf, sessionOn, variantOf } from "../fakes";

test("practice.session/REQ-002/S4 — the idle caption follows the traversal", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    {
      direction: "updown",
      octaves: { kind: "count", count: 2 },
      shape: "scale",
    },
    defaultSessionSettings,
  );

  expect(session.snapshot().caption).toBe("29 notes · G4–G6");

  session.setTraversal({
    direction: "updown",
    octaves: { kind: "count", count: 2 },
    shape: "arpeggio",
  });
  expect(session.snapshot().caption).toBe("13 notes · G4–G6");

  session.setTraversal({
    direction: "updown",
    octaves: { kind: "full" },
    shape: "scale",
  });
  expect(session.snapshot().caption).toBe("43 notes · C4–C7");

  session.setTraversal({
    direction: "up",
    octaves: { kind: "count", count: 2 },
    shape: "scale",
  });
  expect(session.snapshot().caption).toBe("15 notes · G4–G6");
});

test("practice.session/REQ-001/S1 — C major on the flute offers three octave counts", () => {
  const { session } = sessionOn(
    "C",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  expect(session.snapshot().fittingCounts).toEqual([1, 2, 3]);
});

test("practice.session/REQ-001/S3 — a range with no whole-octave run offers only full", () => {
  const { session } = sessionOn(
    "F#",
    "ocarina-bass-c",
    defaultTraversal,
    defaultSessionSettings,
  );
  const snapshot = session.snapshot();
  expect(snapshot.fittingCounts).toEqual([]);
  expect(snapshot.run).toHaveLength(12);
  expect(snapshot.effectiveOctaves).toEqual({ kind: "full" });
});

test("practice.session/REQ-001/S4 — an octave choice that no longer fits is clamped, not lost", () => {
  const traversal: Traversal = {
    direction: "updown",
    octaves: { kind: "count", count: 3 },
    shape: "scale",
  };
  const { session } = sessionOn(
    "C",
    "flute-concert",
    traversal,
    defaultSessionSettings,
  );

  session.setContext({
    key: keyOf("C"),
    variant: variantOf("ocarina-alto-c"),
    spelling: "sharp",
  });
  const onOcarina = session.snapshot();
  expect(onOcarina.effectiveOctaves).toEqual({ kind: "count", count: 1 });
  expect(onOcarina.traversal.octaves).toEqual({ kind: "count", count: 3 });
  expect(onOcarina.run.map((entry) => noteLabel(entry.note))).toEqual([
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
    "A5",
    "B5",
    "C6",
  ]);

  session.setContext({
    key: keyOf("C"),
    variant: variantOf("flute-concert"),
    spelling: "sharp",
  });
  const backOnFlute = session.snapshot();
  expect(backOnFlute.run).toHaveLength(22);
  expect(noteLabel(backOnFlute.run[0]!.note)).toBe("C4");
  expect(noteLabel(backOnFlute.run.at(-1)!.note)).toBe("C7");
});
