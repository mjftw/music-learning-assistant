import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { NoteMeter } from "../../../src/ui/NoteMeter";
import { lead, tuner } from "../../../src/ui/theme";

afterEach(cleanup);

const stave = { kind: "stave", centreX: 100, centreY: 60 } as const;

test("practice.session/REQ-017/S1 — silent: the band, no fill, no line", () => {
  render(
    <NoteMeter
      geometry={stave}
      toleranceCents={10}
      heldFraction={0}
      reading={null}
    />,
  );
  const band = screen.getByTestId("note-meter-band");
  expect(band.style.top).toBe("40%");
  expect(band.style.height).toBe("20%");
  expect(band.style.background).toBe(tuner.band);
  expect(band.parentElement!.style.width).toBe("26px");
  expect(band.parentElement!.style.height).toBe("40px");
  expect(band.parentElement!.style.left).toBe("87px");
  expect(band.parentElement!.style.top).toBe("40px");
  expect(screen.getByTestId("note-meter-fill").style.width).toBe("0%");
  expect(screen.queryByTestId("note-meter-line")).toBeNull();
});

test("practice.session/REQ-017/S2 — flat, then sharp", () => {
  const { rerender } = render(
    <NoteMeter
      geometry={stave}
      toleranceCents={10}
      heldFraction={0}
      reading={{ cents: -18, verdict: "flat" }}
    />,
  );
  const line = screen.getByTestId("note-meter-line");
  expect(line.style.top).toBe("68%");
  expect(line.style.background).toBe(tuner.flat);
  expect(line.style.left).toBe("-2px");
  expect(line.style.right).toBe("-2px");
  rerender(
    <NoteMeter
      geometry={stave}
      toleranceCents={10}
      heldFraction={0}
      reading={{ cents: 12, verdict: "sharp" }}
    />,
  );
  expect(screen.getByTestId("note-meter-line").style.top).toBe("38%");
  expect(screen.getByTestId("note-meter-line").style.background).toBe(
    tuner.sharp,
  );
});

test("practice.session/REQ-017/S3 — holding: the fill", () => {
  render(
    <NoteMeter
      geometry={stave}
      toleranceCents={10}
      heldFraction={0.6}
      reading={{ cents: 6, verdict: "in-tune" }}
    />,
  );
  expect(screen.getByTestId("note-meter-fill").style.width).toBe("60%");
  expect(screen.getByTestId("note-meter-fill").style.background).toBe(
    lead.holdFill,
  );
  expect(screen.getByTestId("note-meter-line").style.background).toBe(
    tuner.inTune,
  );
});

test("practice.session/REQ-017/S5 — pinned beyond ±50 ¢", () => {
  render(
    <NoteMeter
      geometry={stave}
      toleranceCents={10}
      heldFraction={0}
      reading={{ cents: 1200, verdict: "sharp" }}
    />,
  );
  expect(screen.getByTestId("note-meter-line").style.top).toBe("0%");
});

test("practice.session/REQ-019/S2 — accurate is a 4 px band", () => {
  render(
    <NoteMeter
      geometry={stave}
      toleranceCents={5}
      heldFraction={0}
      reading={null}
    />,
  );
  expect(screen.getByTestId("note-meter-band").style.height).toBe("10%"); // 10 % of 40 px = 4 px
});

test("practice.session/REQ-017/S6 — the column geometry", () => {
  render(
    <NoteMeter
      geometry={{ kind: "column" }}
      toleranceCents={10}
      heldFraction={0.4}
      reading={{ cents: 5, verdict: "in-tune" }}
    />,
  );
  const band = screen.getByTestId("note-meter-band");
  expect(band.style.left).toBe("6px");
  expect(band.style.right).toBe("6px");
  expect(band.parentElement!.style.top).toBe("13px");
  expect(screen.getByTestId("note-meter-fill").style.width).toBe("40%");
  const line = screen.getByTestId("note-meter-line");
  expect(line.style.left).toBe("3px");
  expect(line.style.right).toBe("3px");
  expect(line.style.top).toBe("45%");
});
