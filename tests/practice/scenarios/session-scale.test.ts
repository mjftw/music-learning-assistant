import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultScaleChoice,
} from "../../../src/practice/published";
import { sessionOn } from "../fakes";

const twoOctArpeggio = {
  direction: "updown",
  octaves: { kind: "count", count: 2 },
  shape: "arpeggio",
} as const;

test("practice.session/REQ-012/S3 (session) — arpeggio falls back to scale for a scale the catalogue excludes", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    twoOctArpeggio,
    defaultSessionSettings,
    { ...defaultScaleChoice, major: "major-pentatonic" },
  );
  const snapshot = session.snapshot();
  expect(snapshot.scale.id).toBe("major-pentatonic");
  expect(snapshot.scale.offersArpeggio).toBe(false);
  expect(snapshot.effectiveShape).toBe("scale");
  expect(snapshot.traversal.shape).toBe("arpeggio");
  expect(snapshot.summaryLine).toBe("↑↓ · 2 oct · scale · loop");
  expect(snapshot.caption).toBe("21 notes · G4–G6");
  session.setScaleChoice({ ...defaultScaleChoice, major: "lydian" });
  expect(session.snapshot().effectiveShape).toBe("arpeggio");
  expect(session.snapshot().summaryLine).toBe("↑↓ · 2 oct · arpeggio · loop");
});

test("practice.session/REQ-001/S5 (session) — the chosen scale follows the ring, each ring keeping its own choice", () => {
  const { session } = sessionOn(
    "Em",
    "flute-concert",
    { direction: "up", octaves: { kind: "count", count: 1 }, shape: "scale" },
    defaultSessionSettings,
    { major: "lydian", minor: "dorian" },
  );
  expect(session.snapshot().scale.id).toBe("dorian");
  expect(session.snapshot().spelledScale.formulaLine).toBe("1 2 3 4 5 ♯6 7");
  expect(session.snapshot().caption).toBe("8 notes · E4–E5");
});

test("practice.session/REQ-002 — the idle caption's extremes are the run's lowest and highest", () => {
  const { session } = sessionOn(
    "Gm",
    "flute-concert",
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "scale",
    },
    defaultSessionSettings,
    { ...defaultScaleChoice, minor: "melodic-minor-classical" },
  );
  expect(session.snapshot().caption).toBe("15 notes · G4–G5");
});
