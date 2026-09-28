import { expect, test } from "vitest";
import {
  canStepTarget,
  judge,
  nearestWithHandover,
  semitoneCountOf,
} from "../../../src/practice/published";
import { noteLabel } from "../../../src/theory/published";
const at = (hz: number, atFrame = 0) => ({ hz, confidence: 0.95, atFrame });
test("practice.tuner/REQ-002 — judge on auto: nearest note, clamped cents, verdict", () => {
  const { judged, shown } = judge(at(445), { kind: "auto" }, null, "sharp");
  expect(noteLabel(judged.target)).toBe("A4");
  expect(judged.cents).toBe(20);
  expect(judged.verdict).toBe("sharp");
  expect(shown).toBe(69);
  expect(judge(at(441), { kind: "auto" }, null, "sharp").judged.verdict).toBe(
    "in-tune",
  );
  expect(judge(at(442), { kind: "auto" }, null, "sharp").judged.verdict).toBe(
    "sharp",
  );
  expect(judge(at(454), { kind: "auto" }, 69, "sharp").judged.cents).toBe(50);
});
test("practice.tuner/REQ-002 — hand-over at 56 cents", () => {
  expect(nearestWithHandover(69, 454.0)).toBe(69);
  expect(nearestWithHandover(69, 455.0)).toBe(70);
  expect(nearestWithHandover(null, 445)).toBe(69);
});
test("practice.tuner/REQ-004 — judge against a pinned target: unclamped cents, semitone count, bounds", () => {
  const { judged } = judge(
    at(523.25),
    { kind: "pinned", position: 69 },
    null,
    "sharp",
  );
  expect(noteLabel(judged.target)).toBe("A4");
  expect(judged.cents).toBe(300);
  expect(judged.verdict).toBe("sharp");
  expect(noteLabel(judged.heard.nearest)).toBe("C5");
  expect(semitoneCountOf(300)).toBe(3);
  expect(semitoneCountOf(-81)).toBe(1);
  expect(canStepTarget({ kind: "pinned", position: 96 }, 1)).toBe(false);
  expect(canStepTarget({ kind: "pinned", position: 40 }, -1)).toBe(false);
  expect(canStepTarget({ kind: "auto" }, 1)).toBe(false);
  expect(canStepTarget({ kind: "pinned", position: 69 }, 1)).toBe(true);
});
