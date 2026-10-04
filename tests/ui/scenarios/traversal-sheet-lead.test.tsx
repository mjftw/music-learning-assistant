import { screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { cleanup } from "@testing-library/react";
import type { StoredSelection } from "../../../src/ui/selection-store";
import {
  openSheet,
  pill,
  pillSelected,
  renderLeadApp,
  row,
  storedCMajor,
  STORAGE_KEY,
} from "./lead-app-helpers";

function storedSelection(): StoredSelection {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function rows(): (string | undefined)[] {
  return screen.getAllByTestId("sheet-row").map((r) => r.dataset.row);
}

function hintOf(name: string): string | null {
  return within(row(name)).getByTestId("row-hint").textContent;
}

test("practice.session/REQ-020/S1 — play along's rows", async () => {
  const app = renderLeadApp();
  await openSheet(app);
  expect(rows()).toEqual([
    "who-leads",
    "sound",
    "count-in",
    "rest-bar",
    "direction",
    "octaves",
    "shape",
    "loop",
  ]);
  expect(screen.queryByText("Traversal")).toBeNull();
  expect(
    screen
      .getByTestId("sheet-close")
      .closest("[data-row]")!
      .getAttribute("data-row"),
  ).toBe("who-leads");
  expect(hintOf("who-leads")).toBe("It plays, you follow");
  expect(
    screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px"),
  ).toBe(true);
  expect(
    screen
      .getByTestId("sheet-hairline")
      .previousElementSibling!.getAttribute("data-row"),
  ).toBe("rest-bar");
});

test("practice.session/REQ-020/S2 — I lead's rows", async () => {
  const app = renderLeadApp(
    storedCMajor(
      { who: "me" },
      { session: { ...storedCMajor().session, tempoBpm: 120 } },
    ),
  );
  await openSheet(app);
  expect(rows()).toEqual([
    "who-leads",
    "hold",
    "in-tune",
    "cues",
    "direction",
    "octaves",
    "shape",
    "loop",
  ]);
  expect(
    [
      "who-leads",
      "hold",
      "in-tune",
      "cues",
      "direction",
      "octaves",
      "shape",
      "loop",
    ].map(hintOf),
  ).toEqual([
    "It listens, you play",
    "Beats in tune, then the next · 1.0 s",
    "Within 10% of the way to the next note",
    "Shows sharp or flat on the note",
    "Up, down, or up and back",
    "How far the run goes",
    "Every note, or 1 3 5",
    "Start again at the end",
  ]);
  expect(pillSelected("hold", "2")).toBe(true);
  expect(pillSelected("in-tune", "medium")).toBe(true);
  expect(pillSelected("cues", "meter")).toBe(true);
  expect(pillSelected("cues", "tone")).toBe(false);
});

test("practice.session/REQ-020/S3 — nothing moves under the finger", async () => {
  const app = renderLeadApp();
  await openSheet(app);
  const before = rows();
  const closeBefore = screen.getByTestId("sheet-close");
  await app.user.click(pill("who-leads", "I lead"));
  const after = rows();
  expect(after.slice(0, 1)).toEqual(before.slice(0, 1));
  expect(after.slice(4)).toEqual(before.slice(4));
  expect(after.length).toBe(before.length);
  expect(after.slice(1, 4)).toEqual(["hold", "in-tune", "cues"]);
  expect(screen.getByTestId("sheet-close")).toBe(closeBefore); // the same element, not re-mounted
  expect(
    screen.getAllByTestId("sheet-row").every((r) => r.style.height === "62px"),
  ).toBe(true);
  await app.user.click(pill("who-leads", "play along"));
  expect(rows()).toEqual(before);
});

test("practice.session/REQ-020/S4 — the hints follow the settings", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await openSheet(app);
  await app.user.click(pill("hold", "1"));
  expect(hintOf("hold")).toBe("Beats in tune, then the next · 0.6 s");
  await app.user.click(pill("hold", "2"));
  expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.3 s");
  await app.user.click(pill("hold", "4"));
  expect(hintOf("hold")).toBe("Beats in tune, then the next · 2.5 s");
  await app.user.click(pill("in-tune", "lenient"));
  expect(hintOf("in-tune")).toBe("Within 15% of the way to the next note");
  await app.user.click(pill("in-tune", "accurate"));
  expect(hintOf("in-tune")).toBe("Within 5% of the way to the next note");
  await app.user.click(pill("hold", "2"));
  await app.user.click(screen.getByTestId("sheet-close"));
  const tempoUp = within(screen.getByTestId("transport-card")).getByText("+"); // 96 → 120
  for (let i = 0; i < 12; i += 1) await app.user.click(tempoUp);
  await openSheet(app);
  expect(hintOf("hold")).toBe("Beats in tune, then the next · 1.0 s");
});

test("practice.session/REQ-018/S5 (sheet) — the Cues hint follows the pills", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await openSheet(app);
  await app.user.click(pill("cues", "tone"));
  expect(hintOf("cues")).toBe("Sharp/flat on the note · a tone per note");
  await app.user.click(pill("cues", "meter"));
  expect(hintOf("cues")).toBe("A short tone as each note comes up");
  await app.user.click(pill("cues", "tone"));
  expect(hintOf("cues")).toBe("Just the note highlight");
});

test("practice.session/REQ-020/S5 — the shared rows still do what they did", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await openSheet(app);
  expect(
    within(row("octaves"))
      .getAllByRole("button")
      .map((b) => b.textContent),
  ).toEqual(["1 oct", "2 oct", "3 oct", "full"]);
  await app.user.click(pill("octaves", "2 oct"));
  expect(screen.getByText("↑↓ · 2 oct · scale · loop")).toBeTruthy();
});

test("practice.session/REQ-020 — the switches", async () => {
  const app = renderLeadApp();
  await openSheet(app);
  const countIn = within(row("count-in")).getByRole("switch");
  expect(countIn.getAttribute("aria-checked")).toBe("true");
  await app.user.click(countIn);
  expect(countIn.getAttribute("aria-checked")).toBe("false");
  expect(storedSelection().session.countIn).toBe(false);
  const loop = within(row("loop")).getByRole("switch");
  await app.user.click(loop);
  expect(storedSelection().session.loop).toBe(false);
});
