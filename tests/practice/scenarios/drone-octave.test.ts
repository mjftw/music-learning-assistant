import { expect, test } from "vitest";
import {
  defaultDroneSettings,
  defaultSessionSettings,
  defaultTraversal,
  droneNoteOf,
} from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
import {
  isDrone,
  isRetune,
  isStop,
  keyOf,
  sessionOn,
  startDroneAndFlush,
  variantOf,
} from "../fakes";

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

test("practice.drone/REQ-002/S2 — stepping while sounding retunes without a break", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  session.stepDroneOctave(-1);
  expect(sound.posted.filter(isRetune)).toEqual([
    // vitest types expect.closeTo's return as `any`; cast to the field's
    // real type (number) so the object literal stays type-safe.
    { kind: "retune", tag, hz: expect.closeTo(392.0, 2) as number },
  ]);
  expect(sound.posted.filter(isStop)).toHaveLength(0);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
  session.stepDroneOctave(1);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
});

test("practice.drone/REQ-002/S3 — the stepped octave follows the key and the instrument", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  session.stepDroneOctave(-1);
  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
  expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
  session.setContext({
    key: keyOf("D"),
    variant: variantOf("ocarina-alto-c"),
  });
  expect(noteLabel(session.snapshot().drone.note)).toBe("D4");
});

test("practice.drone/REQ-002/S4 — the piano's ends", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  for (const expected of ["G4", "G3", "G2", "G1"]) {
    session.stepDroneOctave(-1);
    expect(noteLabel(session.snapshot().drone.note)).toBe(expected);
  }
  expect(session.snapshot().drone.canStepDown).toBe(false);
  session.stepDroneOctave(-1);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G1");
  for (let i = 0; i < 6; i += 1) session.stepDroneOctave(1);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G7");
  expect(session.snapshot().drone.canStepUp).toBe(false);
  session.setContext({ key: keyOf("C"), variant: variantOf("flute-concert") });
  session.stepDroneOctave(1);
  expect(noteLabel(session.snapshot().drone.note)).toBe("C8");
  expect(session.snapshot().drone.canStepUp).toBe(false);
  session.setContext({ key: keyOf("A"), variant: variantOf("flute-concert") });
  for (let i = 0; i < 8; i += 1) session.stepDroneOctave(-1);
  expect(noteLabel(session.snapshot().drone.note)).toBe("A0");
  expect(session.snapshot().drone.canStepDown).toBe(false);
});

test("practice.drone/REQ-002/S6 — unpinned, the octave follows the instrument", () => {
  const { session } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
  session.setContext({
    key: keyOf("G"),
    variant: variantOf("ocarina-bass-c"),
  });
  expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
});
