import { expect, test } from "vitest";
import { sessionOn } from "../fakes";
import { enter } from "../tuner-helpers";

test("practice.tuner/REQ-009/S2 — leaving forgets the target", async () => {
  const f = sessionOn("G", "flute-concert");
  await enter(f.session);
  f.session.pinTarget(74);
  f.session.leaveTuner();
  await enter(f.session);
  expect(f.session.snapshot().tuner.target).toEqual({ kind: "auto" });
  expect(f.session.snapshot().tuner.targetNote).toBeNull();
});
