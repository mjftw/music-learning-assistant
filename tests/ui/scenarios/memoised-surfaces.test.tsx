import { expect, test } from "vitest";
import { CircleOfFifths } from "../../../src/ui/CircleOfFifths";
import { Header } from "../../../src/ui/Header";
import { SettingsDrawer } from "../../../src/ui/SettingsDrawer";
import { InstrumentSheet } from "../../../src/ui/InstrumentSheet";
import { TraversalSheet } from "../../../src/ui/TraversalSheet";
import { TempoSheet } from "../../../src/ui/TempoSheet";
import { TraversalRow } from "../../../src/ui/TraversalRow";
import { TransportCard } from "../../../src/ui/TransportCard";

test("practice.session/REQ-006 — the static surfaces are memoised so playback re-renders only the transport", () => {
  // A Profiler at the root cannot see a child skipping re-renders due to
  // shallow prop equality; the Profiler only observes commits and unmounts.
  // This structural check ensures that static surfaces are wrapped in React.memo,
  // so they will not re-render when parent props change during playback.

  const memoComponents = [
    CircleOfFifths,
    Header,
    SettingsDrawer,
    InstrumentSheet,
    TraversalSheet,
    TempoSheet,
    TraversalRow,
  ];

  for (const Component of memoComponents) {
    const isMemoised =
      (Component as unknown as { $$typeof?: symbol }).$$typeof ===
      Symbol.for("react.memo");
    expect(isMemoised, `${Component.name} should be memoised`).toBe(true);
  }

  // TransportCard must NOT be memoised because it re-renders every beat
  // to update the progress bar and other transport state during playback
  const transportIsMemoised =
    (TransportCard as unknown as { $$typeof?: symbol }).$$typeof ===
    Symbol.for("react.memo");
  expect(transportIsMemoised).toBe(false);
});
