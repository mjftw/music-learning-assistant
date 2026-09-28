// design-loop variant (007 round 5) — exploration for the tuner screen's
// layout on a phone too short for the fixed 844px design (the problem: "The
// screen is a bit too tall and doesn't fit on my phone without scrolling up
// and down"). TEMPORARY: behind `?fit=a|b`; one treatment becomes the rule
// in a later task and this whole file is deleted along with every other
// block carrying this comment.
import { act, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { levelGeometryFor } from "../../../src/ui/TunerLevel";
import { enterAndHear } from "./tuner-helpers";

afterEach(() => {
  cleanup();
});

test("design-loop variant (007 round 5) — the level's geometry follows its own height, keeping today's ratio of span to height", () => {
  // "at height 352 the centre is at 176, ... a reading of +20 cents sits
  // 20 × (352 × 5.1 / 536) px above the centre" (this round's own brief) —
  // the centre (`areaMid`) and the scale (`pxPerCent`) are the two numbers
  // everything else on the level (the ticks, the band, the reading line/tag,
  // the name area) is placed from; a reading N cents above the centre sits
  // at `areaMid - N * pxPerCent`, so testing the two directly covers it.
  const geometry = levelGeometryFor(352);
  expect(geometry.areaMid).toBeCloseTo(176, 5);
  const expectedPxPerCent = (352 * 5.1) / 536;
  expect(geometry.pxPerCent).toBeCloseTo(expectedPxPerCent, 5);

  // "fixed" always calls this with today's own AREA_HEIGHT (536) — the
  // ratio is then exactly 1, reproducing today's numbers bit-for-bit (the
  // fallback every existing test — many assert pixel positions on the
  // level — keeps exercising in jsdom, which measures nothing).
  const today = levelGeometryFor(536);
  expect(today.areaMid).toBe(268);
  expect(today.pxPerCent).toBe(5.1);
  expect(today.bandTop).toBe(242.5);
  expect(today.bandHeight).toBe(51);
  expect(today.nameAreaTop).toBe(183);
  expect(today.nameAreaHeight).toBe(170);
});

test('design-loop variant (007 round 5) — flex-compact: the sharp/flat toggle sits in the header, no footer row, and tapping "flat" still changes the spelling', async () => {
  const f = await enterAndHear(466.16, undefined, { fit: "flex-compact" });

  // No footer row: its own text is gone entirely (this round's own choice —
  // see the report — rather than a second line under LISTENING, given how
  // little room three groups already leave at 360px).
  expect(screen.queryByText("A4 = 440 Hz · in tune ±5 ¢")).toBeNull();

  // The toggle sits above the level (in the header), not below it (where
  // the footer used to be).
  const flatButton = screen.getByRole("button", { name: "flat" });
  const level = screen.getByTestId("tuner-reading");
  expect(
    level.compareDocumentPosition(flatButton) &
      Node.DOCUMENT_POSITION_PRECEDING,
  ).toBeTruthy();

  // Tapping "flat" still changes the spelling (practice.tuner/REQ-002/S5's
  // own pattern).
  expect(screen.getByTestId("tuner-name").textContent).toBe("A♯4");
  await userEvent.click(flatButton);
  f.listening.feed(466.16);
  f.clock.advanceMs(1);
  await act(async () => {});
  expect(screen.getByTestId("tuner-name").textContent).toBe("B♭4");
});

test("design-loop variant (007 round 5) — fixed (no prop): the level is 536px tall and the footer is where it is today", async () => {
  await enterAndHear(440.0);
  const levelContainer = screen.getByTestId("tuner-reading").parentElement!;
  expect(levelContainer.style.height).toBe("536px");
  expect(screen.getByText("A4 = 440 Hz · in tune ±5 ¢")).toBeTruthy();
});

test("design-loop variant (007 round 5) — the screen takes the visible height by class, not by an inline height", async () => {
  await enterAndHear(440.0, undefined, { fit: "flex" });
  const visibleHeightElement = document.querySelector(".visible-height");
  expect(visibleHeightElement).toBeTruthy();
  if (visibleHeightElement !== null) {
    expect((visibleHeightElement as HTMLElement).style.minHeight).toBe("");
  }
});
