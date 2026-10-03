import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { flushApp, renderLeadApp, storedCMajor } from "./lead-app-helpers";

afterEach(cleanup);

test("practice.session/REQ-014/S1 (card) — choosing I lead", async () => {
  const app = renderLeadApp();
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  expect(screen.getByTestId("mode-word-me").style.color).toBe(
    "rgb(154, 145, 134)",
  );
  await app.user.click(screen.getByTestId("mode-word-me"));
  expect(screen.getByTestId("mode-word-me").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(154, 145, 134)",
  );
  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
  expect(screen.getByTestId("start-circle").textContent).not.toContain("▶");
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "hold 2 beats · medium tuning",
  );
  expect(app.listening.startCalls).toBe(0);
});

test("practice.session/REQ-014/S2 (card) — and back", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
  await app.user.click(screen.getByTestId("mode-word-tool"));
  expect(screen.getByTestId("start-circle").textContent).toContain("▶");
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "15 notes · C4–C5",
  );
});

test("practice.session/REQ-014/S4 (card) — one beat, singular", () => {
  renderLeadApp(
    storedCMajor({ who: "me", holdBeats: 1, tolerance: "accurate" }),
  );
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "hold 1 beat · accurate tuning",
  );
});

test("practice.session/REQ-002/S5 — one card structure, idle and playing, in both modes", async () => {
  const app = renderLeadApp(
    storedCMajor(
      {},
      { session: { ...storedCMajor().session, countIn: false } },
    ),
  );
  const card = screen.getByTestId("transport-card");
  const idleIds = [...card.querySelectorAll("[data-testid]")].map((e) =>
    e.getAttribute("data-testid"),
  );
  expect(idleIds).not.toContain("progress-fill");
  await app.user.click(screen.getByTestId("start-circle"));
  await flushApp();
  act(() => app.clock.advance(3000));
  expect(screen.getByTestId("position-caption").textContent).toMatch(
    /^[A-G]♯?4 · \d+ of 15$/,
  );
  expect(
    [...card.querySelectorAll("[data-testid]")].map((e) =>
      e.getAttribute("data-testid"),
    ),
  ).toEqual(idleIds);
  await app.user.click(screen.getByTestId("mode-word-me"));
  expect(
    [...card.querySelectorAll("[data-testid]")].map((e) =>
      e.getAttribute("data-testid"),
    ),
  ).toEqual(idleIds);
});

test("practice.session/REQ-002/S1 · practice.session/REQ-014/S5 (card) — play along is as it was, the words beneath the caption", async () => {
  const app = renderLeadApp(
    storedCMajor(
      {},
      { session: { ...storedCMajor().session, countIn: false } },
    ),
  );
  await app.user.click(screen.getByTestId("start-circle"));
  await flushApp();
  act(() => app.clock.advance(100));
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "C4 · 1 of 15",
  );
  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
    "rgb(28, 25, 22)",
  );
  expect(screen.getByTestId("start-circle").textContent).toContain("❚❚");
});
