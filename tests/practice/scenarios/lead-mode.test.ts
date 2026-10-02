import { expect, test } from "vitest";
import { defaultSessionSettings } from "../../../src/practice/published";
import { leadFixture, leadSettings, startLead } from "../lead-helpers";
import { sessionOn } from "../fakes";

test("practice.session/REQ-014/S1 — choosing I lead", () => {
  const f = sessionOn("C", "flute-concert", {
    direction: "updown",
    octaves: { kind: "count", count: 1 },
    shape: "scale",
  });
  f.session.setSettings(leadSettings());
  const s = f.session.snapshot();
  expect(s.lead.who).toBe("me");
  expect(s.lead.phase).toBe("idle");
  expect(s.lead.idleCaption).toBe("hold 2 beats · medium tuning");
  expect(f.listening.startCalls).toBe(0);
  expect(f.sound.posted).toEqual([]);
});

test("practice.session/REQ-014/S2 — and back", () => {
  const f = leadFixture();
  f.session.setSettings(defaultSessionSettings);
  expect(f.session.snapshot().lead.who).toBe("tool");
  expect(f.session.snapshot().lead.idleCaption).toBe("15 notes · C4–C5");
  expect(f.session.snapshot().caption).toBe("15 notes · C4–C5");
});

test("practice.session/REQ-014/S3 — the words stop a run", async () => {
  const f = sessionOn(
    "C",
    "flute-concert",
    {
      direction: "updown",
      octaves: { kind: "count", count: 1 },
      shape: "scale",
    },
    { ...defaultSessionSettings, countIn: false },
  );
  f.session.start();
  await Promise.resolve();
  await Promise.resolve();
  f.clock.advanceMs(5000);
  expect(f.session.snapshot().transport.kind).toBe("playing");
  f.session.setSettings(
    leadSettings({}, { ...defaultSessionSettings, countIn: false }),
  );
  expect(f.session.snapshot().transport.kind).toBe("idle");
  expect(f.sound.posted.some((c) => c.kind === "stopAll")).toBe(true);
  expect(f.listening.startCalls).toBe(0);
  const g = leadFixture();
  await startLead(g.session);
  expect(g.session.snapshot().lead.phase).toBe("listening");
  g.session.setSettings(defaultSessionSettings);
  expect(g.listening.stopCalls).toBe(1);
  expect(g.session.snapshot().lead.phase).toBe("idle");
  expect(g.session.snapshot().lead.who).toBe("tool");
});

test("practice.session/REQ-014/S4 — one beat, singular", () => {
  const f = leadFixture(leadSettings({ holdBeats: 1, tolerance: "accurate" }));
  expect(f.session.snapshot().lead.idleCaption).toBe(
    "hold 1 beat · accurate tuning",
  );
});
