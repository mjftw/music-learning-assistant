import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  defaultTraversal,
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

test("practice.drone/REQ-001/S1 — G major on the flute (acceptance)", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  expect(session.snapshot().drone.on).toBe(false);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
  await startDroneAndFlush(session);
  const drones = sound.posted.filter(isDrone);
  expect(drones).toHaveLength(1);
  expect(drones[0]!.hz).toBeCloseTo(783.99, 2);
  expect(drones[0]!.sound).toBe("warm");
  expect(drones[0]!.onsetFrame).toBeLessThanOrEqual(
    (50 * sound.sampleRate()) / 1000,
  );
  expect(session.snapshot().drone.on).toBe(true);
  expect(session.snapshot().drone.hz).toBeCloseTo(783.99, 2);
});

test("practice.drone/REQ-001/S2 — off", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  session.stopDrone();
  expect(sound.posted.filter(isStop)).toEqual([{ kind: "stop", tag }]);
  expect(session.snapshot().drone.on).toBe(false);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G5");
});

test("practice.drone/REQ-003/S1 — a new key while sounding glides, never stopping", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  const tag = sound.posted.filter(isDrone)[0]!.tag;
  session.setContext({ key: keyOf("D"), variant: variantOf("flute-concert") });
  expect(sound.posted.filter(isRetune)).toEqual([
    // vitest types expect.closeTo's return as `any`; cast to the field's
    // real type (number) so the object literal stays type-safe.
    { kind: "retune", tag, hz: expect.closeTo(587.33, 2) as number },
  ]);
  expect(noteLabel(session.snapshot().drone.note)).toBe("D5");
  session.setContext({
    key: keyOf("Bm"),
    variant: variantOf("flute-concert"),
  });
  expect(sound.posted.filter(isRetune)[1]).toEqual({
    kind: "retune",
    tag,
    hz: expect.closeTo(987.77, 2) as number,
  });
  expect(sound.posted.filter(isStop)).toHaveLength(0);
  expect(sound.posted.filter(isDrone)).toHaveLength(1);
});

test("practice.drone/REQ-003/S2 — respelling keeps the pitch", async () => {
  const { session, sound } = sessionOn(
    "F#",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  expect(noteLabel(session.snapshot().drone.note)).toBe("F♯5");
  session.setContext({
    key: keyOf("Gb"),
    variant: variantOf("flute-concert"),
  });
  expect(noteLabel(session.snapshot().drone.note)).toBe("G♭5");
  expect(sound.posted.filter(isRetune)).toHaveLength(0);
  expect(session.snapshot().drone.hz).toBeCloseTo(739.99, 2);
});

test("practice.drone/REQ-003/S3 — a new instrument while sounding, unpinned, retunes to the new default octave", async () => {
  const { session, sound } = sessionOn(
    "G",
    "flute-concert",
    defaultTraversal,
    defaultSessionSettings,
  );
  await startDroneAndFlush(session);
  session.setContext({
    key: keyOf("G"),
    variant: variantOf("ocarina-bass-c"),
  });
  expect(sound.posted.filter(isRetune)).toEqual([
    {
      kind: "retune",
      tag: sound.posted.filter(isDrone)[0]!.tag,
      hz: expect.closeTo(392.0, 2) as number,
    },
  ]);
  expect(noteLabel(session.snapshot().drone.note)).toBe("G4");
});
