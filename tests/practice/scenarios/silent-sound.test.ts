// practice.session/REQ-010/S1 — the adapter the silent run plays on when
// sound cannot start: it makes no audio but still reports onsets in time,
// so the caption, progress and highlight keep advancing.

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { silentSound } from "../../../src/practice/adapters/silent-sound";
import type { OnsetReport } from "../../../src/sound/published/sound-command.schema";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("practice.session/REQ-010/S1 — a posted tone reports its onset when its scheduled frame is reached", () => {
  const sound = silentSound(() => 0);
  const reports: OnsetReport[] = [];
  sound.onOnset((report) => reports.push(report));

  sound.post({
    kind: "tone",
    tag: 4,
    hz: 440,
    onsetFrame: 4800,
    durationFrames: 100,
  });

  expect(reports).toHaveLength(0);
  vi.advanceTimersByTime(100);

  expect(reports).toEqual([{ tag: 4, onsetFrame: 4800, actualFrame: 4800 }]);
});

test("practice.session/REQ-010/S1 — stopAll before the scheduled frame cancels the report", () => {
  const sound = silentSound(() => 0);
  const reports: OnsetReport[] = [];
  sound.onOnset((report) => reports.push(report));

  sound.post({
    kind: "tone",
    tag: 4,
    hz: 440,
    onsetFrame: 4800,
    durationFrames: 100,
  });
  sound.post({ kind: "stopAll" });

  vi.advanceTimersByTime(100);

  expect(reports).toEqual([]);
});

test("silent port — a drone reports its onset at its scheduled frame; retune and stop schedule nothing", () => {
  const now = 0;
  const port = silentSound(() => now);
  const reports: OnsetReport[] = [];
  port.onOnset((report) => reports.push(report));
  port.post({
    kind: "drone",
    tag: 3_000_000,
    hz: 783.99,
    onsetFrame: 960,
    sound: "warm",
  });
  port.post({ kind: "retune", tag: 3_000_000, hz: 587.33 });
  port.post({ kind: "stop", tag: 3_000_000 });
  vi.advanceTimersByTime(25);
  expect(reports).toEqual([
    { tag: 3_000_000, onsetFrame: 960, actualFrame: 960 },
  ]);
});
