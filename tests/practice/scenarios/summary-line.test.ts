import { expect, test } from "vitest";
import {
  defaultSessionSettings,
  summaryLineOf,
} from "../../../src/practice/published";

test("practice.session/REQ-001/S2 — the summary line", () => {
  expect(
    summaryLineOf(
      {
        direction: "updown",
        octaves: { kind: "count", count: 2 },
        shape: "scale",
      },
      { kind: "count", count: 2 },
      "scale",
      defaultSessionSettings,
    ),
  ).toBe("↑↓ · 2 oct · scale · loop");

  expect(
    summaryLineOf(
      { direction: "updown", octaves: { kind: "full" }, shape: "scale" },
      { kind: "full" },
      "scale",
      { ...defaultSessionSettings, soundMode: "metronome", loop: false },
    ),
  ).toBe("↑↓ · full range · click only · once");
});
