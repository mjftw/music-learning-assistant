import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";

afterEach(() => {
  cleanup();
});

const setup = () => {
  localStorage.clear();
  return render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
    />,
  );
};

test("theory.circle-of-fifths/REQ-003/S1 — the centre disc carries G major's one-sharp signature", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  const glyphs = screen.getAllByTestId("signature-glyph");
  expect(glyphs).toHaveLength(1);
  expect(glyphs[0]?.textContent).toBe("♯");
});

test("theory.circle-of-fifths/REQ-004/S1 — G major's F♯ glyph is the accented one in the centre", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  const glyphs = screen.getAllByTestId("signature-glyph");
  expect(glyphs).toHaveLength(1);
  expect(glyphs[0]?.getAttribute("data-accented")).toBe("true");
});

test("theory.circle-of-fifths/REQ-004/S2 — B♭ major accents its second flat in the centre", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "B♭ major" }));

  const glyphs = screen.getAllByTestId("signature-glyph");
  expect(glyphs).toHaveLength(2);
  expect(glyphs[0]?.textContent).toBe("♭");
  expect(glyphs[1]?.textContent).toBe("♭");
  expect(glyphs[0]?.getAttribute("data-accented")).toBe("false");
  expect(glyphs[1]?.getAttribute("data-accented")).toBe("true");
});

test("theory.circle-of-fifths/REQ-004/S3 — C major shows no signature glyph in the centre", async () => {
  setup();
  await userEvent.click(screen.getByRole("button", { name: "G major" }));

  let glyphs = screen.getAllByTestId("signature-glyph");
  expect(glyphs).toHaveLength(1);

  await userEvent.click(screen.getByRole("button", { name: "C major" }));

  glyphs = screen.queryAllByTestId("signature-glyph");
  expect(glyphs).toHaveLength(0);
});
