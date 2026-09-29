// practice.tuner/REQ-002 — the tuner screen's one and only layout (design
// round 5's chosen treatment, T032): the screen and the column that wraps
// it take the visible height, the header row, the target pill row, the
// stave strip card and the footer keep their heights, and the level takes
// whatever's left, its geometry (`levelGeometryFor`) scaling to fit.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { levelGeometryFor, readingGeometry } from "../../../src/ui/TunerLevel";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import type { NoteJudged } from "../../../src/practice/published";
import { sessionDepsWithFakes } from "../../practice/fakes";
import { enterAndHear } from "./tuner-helpers";

afterEach(() => {
  cleanup();
});

// A minimal NoteJudged — `readingGeometry` reads only `cents` and
// `verdict`; target/heard/atFrame are filler to satisfy the type.
function fakeReading(cents: number): NoteJudged {
  const note = { letter: "A", accidental: "natural", octave: 4 } as const;
  return {
    target: note,
    cents,
    verdict: cents >= 0 ? "sharp" : "flat",
    heard: { hz: 440, nearest: note, cents: 0 },
    atFrame: 0,
  };
}

test("practice.tuner/REQ-002 — the level's geometry follows its own height, keeping today's ratio of span to height", () => {
  // At height 352 the centre (`areaMid`) is at 176, and a reading of +20
  // cents sits 20 × (352 × 5.1 / 536) px above the centre — the scale
  // (`pxPerCent`) and the centre are the two numbers everything else on the
  // level (ticks, band, reading line/tag, name area) is placed from.
  const geometry = levelGeometryFor(352);
  expect(geometry.areaMid).toBeCloseTo(176, 5);
  const expectedPxPerCent = (352 * 5.1) / 536;
  expect(geometry.pxPerCent).toBeCloseTo(expectedPxPerCent, 5);
  expect(geometry.areaMid - 20 * geometry.pxPerCent).toBeCloseTo(
    176 - 20 * expectedPxPerCent,
    5,
  );
  // The ±5 ¢ band's height keeps the same proportion.
  expect(geometry.bandHeight).toBeCloseTo(10 * expectedPxPerCent, 5);

  // At 536 (today's own AREA_HEIGHT) the ratio is exactly 1, reproducing
  // every one of today's numbers bit-for-bit.
  const today = levelGeometryFor(536);
  expect(today.areaMid).toBe(268);
  expect(today.pxPerCent).toBe(5.1);
  expect(today.bandTop).toBe(242.5);
  expect(today.bandHeight).toBe(51);
  expect(today.nameAreaTop).toBe(183);
  expect(today.nameAreaHeight).toBe(170);
});

test("practice.tuner/REQ-002 — the screen and the column carry visible-height and no inline minHeight while the tuner shows", async () => {
  await enterAndHear(440.0);
  const visibleHeightElements = document.querySelectorAll(".visible-height");
  // The App column and TunerScreen's own root each carry the class.
  expect(visibleHeightElements.length).toBe(2);
  for (const element of visibleHeightElements) {
    expect((element as HTMLElement).style.minHeight).toBe("");
  }
});

test("practice.tuner/REQ-002 — on the practice screen the column has its inline minHeight and no visible-height class", () => {
  localStorage.clear();
  const { sessionDeps } = sessionDepsWithFakes();
  const { container } = render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={sessionDeps}
    />,
  );
  const column = container.firstElementChild as HTMLElement;
  expect(column.className).toBe("");
  expect(column.style.minHeight).toBe("100vh");
});

test("practice.tuner/REQ-004 — past +50 ¢ pinned, the tag sits below the line, not covering the header (converge round 1 W2)", () => {
  const geometry = levelGeometryFor(536);
  const g = readingGeometry(
    fakeReading(81),
    geometry.areaMid,
    geometry.areaHeight,
    geometry.pxPerCent,
  );
  expect(g.lineTop).toBeCloseTo(9.5, 2); // pinned at +50: 268 − 255 − 3.5
  expect(g.tagTop).toBeCloseTo(45.5, 2); // sharp-over: lineTop + 36
  expect(g.tagTop).toBeGreaterThan(g.lineTop);
});

test("practice.tuner/REQ-004 — past −50 ¢ pinned, the tag sits above the line (converge round 1 W2)", () => {
  const geometry = levelGeometryFor(536);
  const g = readingGeometry(
    fakeReading(-81),
    geometry.areaMid,
    geometry.areaHeight,
    geometry.pxPerCent,
  );
  expect(g.lineTop).toBeCloseTo(519.5, 2); // pinned at −50: 268 + 255 − 3.5
  expect(g.tagTop).toBeCloseTo(461.5, 2); // flat-over: lineTop − 58
  expect(g.tagTop).toBeLessThan(g.lineTop);
});

test("practice.tuner/REQ-002 — a non-over reading's tag keeps today's placement (converge round 1 W2)", () => {
  const geometry = levelGeometryFor(536);
  const g = readingGeometry(
    fakeReading(20),
    geometry.areaMid,
    geometry.areaHeight,
    geometry.pxPerCent,
  );
  expect(g.tagTop).toBeCloseTo(126.5, 2); // unchanged from today: lineTop − 36
});

test("practice.tuner/REQ-002 — the non-over tag's clamp margins scale with the level's own height, not fixed pixels (converge round 1 W2)", () => {
  const geometry = levelGeometryFor(300);
  const g = readingGeometry(
    fakeReading(-50),
    geometry.areaMid,
    geometry.areaHeight,
    geometry.pxPerCent,
  );
  // Unscaled (today's fixed 30/62 at 536 px), the raw tagTop (297.22) would
  // clamp only against 536 − 62 = 474 and pass through untouched; scaled by
  // this height's own ratio (300 / 536), the bottom margin shrinks to
  // 300 − 0.56·62 ≈ 265.3, so the tag is pulled up to stay inside the level.
  expect(g.tagTop).toBeCloseTo(265.3, 1);
  expect(g.tagTop).toBeLessThan(474);
});

test("practice.tuner/REQ-002 — the level's minimum height is 300", async () => {
  await enterAndHear(440.0);
  const levelContainer = screen.getByTestId("tuner-reading").parentElement!;
  expect(levelContainer.style.minHeight).toBe("300px");
});
