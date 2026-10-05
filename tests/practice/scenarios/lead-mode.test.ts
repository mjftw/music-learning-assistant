import { expect, test } from "vitest";
import { defaultSessionSettings } from "../../../src/practice/published";
import {
  holdThrough,
  leadFixture,
  leadSettings,
  startLead,
} from "../lead-helpers";
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

test("practice.session/REQ-015/S3 — the complete card goes when the mode changes", async () => {
  const f = leadFixture({ ...leadSettings(), loop: false });
  await startLead(f.session);
  holdThrough(f, 15);
  expect(f.session.snapshot().lead.phase).toBe("complete");

  f.session.setSettings(defaultSessionSettings);
  const s = f.session.snapshot();
  expect(s.lead.phase).toBe("idle");
  expect(s.lead.completeCaption).toBeNull();
  expect(s.caption).toBe("15 notes · C4–C5");

  f.session.start();
  await Promise.resolve();
  await Promise.resolve();
  expect(f.session.snapshot().transport.kind).toBe("countingIn");
});

test("practice.session/REQ-019 — a settings change that leaves who alone keeps the complete card", async () => {
  const f = leadFixture({ ...leadSettings(), loop: false });
  await startLead(f.session);
  holdThrough(f, 15);
  expect(f.session.snapshot().lead.phase).toBe("complete");

  f.session.setSettings({
    ...leadSettings({ holdBeats: 4 }),
    loop: false,
  });
  expect(f.session.snapshot().lead.phase).toBe("complete");
  expect(f.session.snapshot().lead.completeCaption).toBe(
    "15 of 15 held · C4–C5",
  );
});

test("practice.session/REQ-022/S1 — the no-mic card goes when the mode changes", async () => {
  const f = leadFixture();
  f.listening.failWith = "refused";
  await startLead(f.session);
  expect(f.session.snapshot().lead.phase).toBe("cannot-hear");

  f.session.setSettings(defaultSessionSettings);
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });

  f.session.setSettings(leadSettings());
  expect(f.session.snapshot().lead.phase).toBe("idle");
  expect(f.session.snapshot().lead.listening).toEqual({ kind: "off" });
});
