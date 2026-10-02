import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  defaultDroneSettings,
  defaultScaleChoice,
  defaultSessionSettings,
  defaultTraversal,
  type LeadSnapshot,
  type SessionSnapshot,
  type TempoTerm,
  type TunerSnapshot,
} from "../../../src/practice/published";
import {
  pitchHzOf,
  scaleById,
  spelledScaleOf,
  type Note,
} from "../../../src/theory/published";
import { TransportCard } from "../../../src/ui/TransportCard";
import { keyOf } from "../../practice/fakes";

afterEach(() => {
  cleanup();
});

const andante: TempoTerm = {
  name: "Andante",
  fromBpm: 76,
  toBpm: 107,
  gloss: "walking pace",
};

// TransportCard renders none of the scale fields (they exist on
// SessionSnapshot for other views, T008) — these are just valid
// placeholders so the fixture satisfies the type.
const defaultScale = scaleById("major");

// TransportCard renders nothing about the drone either (the pill and sheet
// are T007+) — another valid placeholder, same reasoning as defaultScale.
const placeholderDroneNote: Note = { ...keyOf("G").tonic, octave: 5 };

// TransportCard renders nothing about the tuner either (the pill and
// screen are T007+) — the default, off shape practice.tuner/REQ-001/S4
// pins the snapshot to before enterTuner() is ever called.
const placeholderTuner: TunerSnapshot = {
  active: false,
  listening: { kind: "off" },
  target: { kind: "auto" },
  targetNote: null,
  reading: null,
  lastHeard: null,
  canStepDown: false,
  canStepUp: false,
};

// TransportCard renders nothing about "I lead" either (the mode words, the
// live/complete/no-mic cards are T012+) — another valid placeholder, same
// reasoning as defaultScale/placeholderTuner.
const placeholderLead: LeadSnapshot = {
  who: "tool",
  phase: "idle",
  listening: { kind: "off" },
  target: null,
  heldFraction: 0,
  reading: null,
  justHeld: null,
  idleCaption: "",
  completeCaption: null,
};

function baseSnapshot(
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    transport: { kind: "idle" },
    traversal: defaultTraversal,
    effectiveOctaves: defaultTraversal.octaves,
    fittingCounts: [],
    settings: defaultSessionSettings,
    run: [],
    sequence: [],
    caption: "",
    summaryLine: "",
    tempoTerm: andante,
    soundingPosition: null,
    notice: null,
    scale: defaultScale,
    spelledScale: spelledScaleOf(keyOf("C"), defaultScale),
    scaleChoice: defaultScaleChoice,
    effectiveShape: defaultTraversal.shape,
    drone: {
      on: false,
      note: placeholderDroneNote,
      hz: pitchHzOf(placeholderDroneNote),
      settings: defaultDroneSettings,
      canStepDown: true,
      canStepUp: true,
    },
    // TransportCard renders nothing about a tapped note either (T007+) —
    // same reasoning as defaultScale/placeholderDroneNote above.
    tappedRunIndex: null,
    tuner: placeholderTuner,
    lead: placeholderLead,
    ...overrides,
  };
}

const noop = () => {
  // no-op handler for props not under test
};

test("practice.session/REQ-002/S1 (UI) — idle transport shows Play, the run caption and the tempo", () => {
  const idleSnapshot = baseSnapshot({
    transport: { kind: "idle" },
    caption: "15 notes · G4–G6",
    tempoTerm: andante,
    settings: { ...defaultSessionSettings, tempoBpm: 96 },
  });

  render(
    <TransportCard
      snapshot={idleSnapshot}
      onTogglePlay={noop}
      onStepTempo={noop}
      onOpenTempo={noop}
    />,
  );

  const playButton = screen.getByRole("button", { name: "Play" });
  expect(playButton.textContent).toBe("▶");
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "15 notes · G4–G6",
  );
  expect(screen.getByText("96")).toBeTruthy();
  expect(screen.getByText("Andante")).toBeTruthy();
});

test("practice.session/REQ-002/S1 (UI) — playing transport shows Stop and the sounding note", () => {
  const playingSnapshot = baseSnapshot({
    transport: { kind: "playing", position: 4 },
    caption: "D5 · 5 of 29",
    soundingPosition: 4,
  });

  render(
    <TransportCard
      snapshot={playingSnapshot}
      onTogglePlay={noop}
      onStepTempo={noop}
      onOpenTempo={noop}
    />,
  );

  const stopButton = screen.getByRole("button", { name: "Stop" });
  expect(stopButton.textContent).toBe("❚❚");
  expect(screen.getByTestId("position-caption").textContent).toBe(
    "D5 · 5 of 29",
  );
});

test("practice.session/REQ-002/S2 (UI) — tapping Stop calls onTogglePlay once", async () => {
  const playingSnapshot = baseSnapshot({
    transport: { kind: "playing", position: 11 },
    caption: "D5 · 12 of 29",
  });
  const onTogglePlay = vi.fn();

  render(
    <TransportCard
      snapshot={playingSnapshot}
      onTogglePlay={onTogglePlay}
      onStepTempo={noop}
      onOpenTempo={noop}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Stop" }));

  expect(onTogglePlay).toHaveBeenCalledTimes(1);
});

test("practice.session/REQ-004/S1, S3 (UI) — Faster and Slower step the tempo, the term opens the Tempo sheet", async () => {
  const idleSnapshot = baseSnapshot({
    settings: { ...defaultSessionSettings, tempoBpm: 106 },
    tempoTerm: andante,
  });
  const onStepTempo = vi.fn();
  const onOpenTempo = vi.fn();

  render(
    <TransportCard
      snapshot={idleSnapshot}
      onTogglePlay={noop}
      onStepTempo={onStepTempo}
      onOpenTempo={onOpenTempo}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Faster" }));
  await userEvent.click(screen.getByRole("button", { name: "Slower" }));
  await userEvent.click(screen.getByRole("button", { name: "Andante" }));

  expect(onStepTempo).toHaveBeenNthCalledWith(1, 2);
  expect(onStepTempo).toHaveBeenNthCalledWith(2, -2);
  expect(onOpenTempo).toHaveBeenCalledTimes(1);
});
