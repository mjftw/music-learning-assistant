import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import type { SessionDeps } from "../../../src/practice/published";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import { localStorageSelectionStore } from "../../../src/ui/selection-store";
import {
  FakeClock,
  FakeSound,
  FakeVisibility,
  FakeWakeLock,
} from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

// This suite doesn't exercise the session — a bare set of fakes is enough
// to satisfy App's now-required `sessionDeps` (practice.session/REQ-011,
// T016).
function testSessionDeps(): SessionDeps {
  const sound = new FakeSound();
  return {
    sound,
    clock: new FakeClock(sound),
    wakeLock: new FakeWakeLock(),
    visibility: new FakeVisibility(),
  };
}

const setup = () => {
  localStorage.clear();
  return render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={testSessionDeps()}
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
