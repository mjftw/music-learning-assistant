import type { Octaves, Traversal } from "../../theory/published";

export type SoundMode = "notes" | "both" | "metronome";

export interface SessionSettings {
  readonly soundMode: SoundMode;
  readonly loop: boolean;
  readonly countIn: boolean;
  readonly restBar: boolean;
  readonly tempoBpm: number;
}

export const defaultSessionSettings: SessionSettings = {
  soundMode: "both",
  loop: true,
  countIn: true,
  restBar: false,
  tempoBpm: 96,
};

export const defaultTraversal: Traversal = {
  direction: "updown",
  octaves: { kind: "count", count: 1 },
  shape: "scale",
};

const DIRECTION_GLYPH: Record<Traversal["direction"], string> = {
  up: "↑",
  down: "↓",
  updown: "↑↓",
};

function octavesWordOf(octaves: Octaves): string {
  return octaves.kind === "full" ? "full range" : `${octaves.count} oct`;
}

// The shape word is replaced by "click only" when the sound mode is
// metronome — practice.session/REQ-001/S2.
function shapeWordOf(shape: Traversal["shape"], soundMode: SoundMode): string {
  if (soundMode === "metronome") return "click only";
  return shape;
}

export function summaryLineOf(
  traversal: Traversal,
  effectiveOctaves: Octaves,
  settings: SessionSettings,
): string {
  return [
    DIRECTION_GLYPH[traversal.direction],
    octavesWordOf(effectiveOctaves),
    shapeWordOf(traversal.shape, settings.soundMode),
    settings.loop ? "loop" : "once",
  ].join(" · ");
}
