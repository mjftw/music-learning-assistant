import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  flushApp,
  hearInApp,
  hearSteadyInApp,
  renderLeadApp,
  silenceInApp,
  startLeadInApp,
  storedCMajor,
} from "./lead-app-helpers";

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

test("practice.session/REQ-015/S1 (card) — the live card", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await startLeadInApp(app);
  expect(screen.getByTestId("stop-circle").textContent).toBe("■");
  expect(screen.getByTestId("target-letter").textContent).toBe("C");
  expect(screen.getByTestId("target-octave").textContent).toBe("4");
  expect(screen.getByTestId("position-caption").textContent).toBe("1 of 15");
  expect(screen.getByTestId("judgement").textContent).toBe("Play C4");
  expect(screen.getByTestId("judgement").style.color).toBe(
    "rgb(154, 145, 134)",
  );
  expect(screen.getByTestId("mode-word-tool")).toBeTruthy();
  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
  expect(screen.getByTestId("mode-word-me").style.color).toBe(
    "rgb(28, 25, 22)",
  );
});

test("practice.session/REQ-017/S2 (card) — flat and sharp", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await startLeadInApp(app);
  hearInApp(app, 258.92, 0);
  expect(screen.getByTestId("judgement").textContent).toBe("↓ 18 ¢ flat");
  expect(screen.getByTestId("judgement").style.color).toBe(
    "oklch(0.55 0.11 258)",
  );
  silenceInApp(app, 300);
  hearInApp(app, 263.45, 500);
  expect(screen.getByTestId("judgement").textContent).toBe("↑ 12 ¢ sharp");
  expect(screen.getByTestId("judgement").style.color).toBe(
    "oklch(0.55 0.11 28)",
  );
});

test("practice.session/REQ-017/S3 (card) — holding", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await startLeadInApp(app);
  hearSteadyInApp(app, 262.5, 0, 750);
  expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
  expect(screen.getByTestId("judgement").style.color).toBe(
    "oklch(0.55 0.11 150)",
  );
});

test("practice.session/REQ-017/S4 (card) — advanced", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await startLeadInApp(app);
  // Steady to 1240 ms, then one further reading at 1260 ms that completes
  // the hold (still C4's own judgement, committed before the advance) —
  // mirrors tests/practice/scenarios/lead-meter.test.ts's own REQ-017/S4,
  // which stops here for the same reason: one more continuous reading past
  // this point is itself "the first reading against the new target"
  // (session.ts's clearLeadJustHeld, called on every surviving detection)
  // and would clear "held ✓" before this assertion ever saw it.
  hearSteadyInApp(app, 262.5, 0, 1240);
  hearInApp(app, 262.5, 1260);
  expect(screen.getByTestId("target-letter").textContent).toBe("D");
  expect(screen.getByTestId("position-caption").textContent).toBe("2 of 15");
  expect(screen.getByTestId("judgement").textContent).toBe("C4 held ✓");
  expect(screen.getByTestId("judgement").style.color).toBe(
    "oklch(0.55 0.11 150)",
  );
  hearInApp(app, 293.66, 1300);
  expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
});

test("practice.session/REQ-017/S5 (card) — pinned beyond ±50 ¢", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  await startLeadInApp(app);
  hearInApp(app, 523.25, 0);
  expect(screen.getByTestId("judgement").textContent).toBe("↑ 1200 ¢ sharp");
});

// Driving all 15 notes of the run, each a full 1300 ms hold plus a 300 ms
// gap, means ~1800 hearInApp/act() calls — comfortably under 5 s alone, but
// past vitest's default per-test timeout under full-suite load; given its
// own budget rather than a shorter, looser scenario (docs/engineering.md's
// test-through-the-published-interface rule leaves no cheaper way to reach
// "run complete" than playing the whole run through).
test("practice.session/REQ-015/S3 (card) — the complete card", async () => {
  const app = renderLeadApp(
    storedCMajor(
      { who: "me" },
      { session: { ...storedCMajor().session, loop: false } },
    ),
  );
  await startLeadInApp(app);
  let t = 0;
  for (let n = 0; n < 15; n += 1) {
    const hz = Number(screen.getByTestId("target-hz").textContent);
    hearSteadyInApp(app, hz, t, t + 1300);
    silenceInApp(app, 300);
    t += 1700;
  }
  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "15 of 15 held · C4–C5",
  );
  expect(screen.getByTestId("judgement").textContent).toBe("All held");
  expect(screen.getByTestId("mode-word-tool")).toBeTruthy();
  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
  expect(app.listening.stopCalls).toBe(1);
}, 15000);

test("practice.session/REQ-022/S1 (card) — the no-mic card", async () => {
  const app = renderLeadApp(storedCMajor({ who: "me" }));
  app.listening.failWith = "refused";
  await startLeadInApp(app);
  expect(screen.getByTestId("no-mic-card").textContent).toContain(
    "Can't hear — no microphone",
  );
  expect(screen.getByTestId("no-mic-card").textContent).toContain(
    "It was refused or isn't there. Allow the microphone for this site, then press I lead again.",
  );
  expect(screen.getByTestId("start-circle")).toBeTruthy();
  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});
