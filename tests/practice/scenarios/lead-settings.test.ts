import { expect, test } from "vitest";
import {
  cuesHintOf,
  defaultSessionSettings,
  holdHintOf,
  requiredHoldMs,
  toleranceHintOf,
  verdictOf,
  whoHintOf,
} from "../../../src/practice/published";

test("practice.session/REQ-020/S4 — the Hold and In tune hints follow the settings", () => {
  expect(holdHintOf(1, 96)).toBe("Beats in tune, then the next · 0.6 s");
  expect(holdHintOf(2, 96)).toBe("Beats in tune, then the next · 1.3 s");
  expect(holdHintOf(4, 96)).toBe("Beats in tune, then the next · 2.5 s");
  expect(holdHintOf(2, 120)).toBe("Beats in tune, then the next · 1.0 s");
  expect(toleranceHintOf("lenient")).toBe(
    "Within 15% of the way to the next note",
  );
  expect(toleranceHintOf("medium")).toBe(
    "Within 10% of the way to the next note",
  );
  expect(toleranceHintOf("accurate")).toBe(
    "Within 5% of the way to the next note",
  );
  expect(whoHintOf("tool")).toBe("It plays, you follow");
  expect(whoHintOf("me")).toBe("It listens, you play");
});
test("practice.session/REQ-018/S5 — the Cues hint follows the pills", () => {
  expect(cuesHintOf(true, true)).toBe(
    "Sharp/flat on the note · a tone per note",
  );
  expect(cuesHintOf(true, false)).toBe("Shows sharp or flat on the note");
  expect(cuesHintOf(false, true)).toBe("A short tone as each note comes up");
  expect(cuesHintOf(false, false)).toBe("Just the note highlight");
});
test("practice.session/REQ-016/S5 — the tolerance decides the verdict", () => {
  expect([verdictOf(12, 15), verdictOf(12, 10), verdictOf(12, 5)]).toEqual([
    "in-tune",
    "sharp",
    "sharp",
  ]);
  expect([verdictOf(8, 15), verdictOf(8, 10), verdictOf(8, 5)]).toEqual([
    "in-tune",
    "in-tune",
    "sharp",
  ]);
  expect([verdictOf(4, 15), verdictOf(4, 10), verdictOf(4, 5)]).toEqual([
    "in-tune",
    "in-tune",
    "in-tune",
  ]);
  expect(verdictOf(-18, 10)).toBe("flat");
  expect(verdictOf(4)).toBe("in-tune"); // the tuner's default band of 5 is unchanged
  expect(verdictOf(6)).toBe("sharp");
});
test("practice.session/REQ-016 — the required hold is beats × 60000 / tempo", () => {
  expect(requiredHoldMs(2, 96)).toBe(1250);
  expect(requiredHoldMs(2, 120)).toBe(1000);
  expect(requiredHoldMs(4, 96)).toBe(2500);
  expect(requiredHoldMs(1, 150)).toBe(400);
});
test("practice.session/REQ-011/S2 — the lead defaults", () => {
  expect(defaultSessionSettings.lead).toEqual({
    who: "tool",
    holdBeats: 2,
    tolerance: "medium",
    cueMeter: true,
    cueTone: false,
  });
});
