// practice.drone/REQ-002 — the drone's note and the octave rule: which
// octave of the key's tonic sounds, unpinned (nearest the middle of the
// selected variant's range) or pinned by a step of − / + (kept within the
// piano's own bounds, A0–C8).

import type {
  Key,
  Note,
  NoteRange,
  PitchClass,
  Variant,
} from "../../theory/published";
import { pitchPosition } from "../../theory/published";
import type { DroneSound } from "../../sound/published/sound-command.schema";

export type { DroneSound };

export type DroneOctave =
  | { readonly kind: "nearest" }
  | { readonly kind: "pinned"; readonly octave: number };

export interface DroneSettings {
  readonly octave: DroneOctave;
  readonly sound: DroneSound;
}

export const defaultDroneSettings: DroneSettings = {
  octave: { kind: "nearest" },
  sound: "warm",
};

// A0–C8 in theory's pitchPosition numbering (C4 = 60).
export const PIANO_LOWEST_POSITION = 21; // A0
export const PIANO_HIGHEST_POSITION = 108; // C8

// Among the octaves 0..=8 whose `tonic` note satisfies `isWithinBounds`,
// the one nearest `middle` — iterating ascending and replacing the
// candidate only when strictly nearer, so a tie keeps the lower octave.
// `null` when no octave 0..=8 satisfies the bounds.
function nearestOctaveWithin(
  tonic: PitchClass,
  middle: number,
  isWithinBounds: (position: number) => boolean,
): number | null {
  let best: { readonly octave: number; readonly distance: number } | null =
    null;
  for (let octave = 0; octave <= 8; octave += 1) {
    const position = pitchPosition({ ...tonic, octave });
    if (!isWithinBounds(position)) continue;
    const distance = Math.abs(position - middle);
    if (best === null || distance < best.distance) {
      best = { octave, distance };
    }
  }
  return best === null ? null : best.octave;
}

/**
 * The octave (0–8) putting `tonic` nearest the middle of `range`, within
 * the range; the lower octave on a tie; if no octave of the tonic lies
 * within the range, the nearest to the middle within A0–C8.
 */
export function defaultDroneOctave(
  tonic: PitchClass,
  range: NoteRange,
): number {
  const lowestPosition = pitchPosition(range.lowest);
  const highestPosition = pitchPosition(range.highest);
  const middle = (lowestPosition + highestPosition) / 2;

  const withinRange = nearestOctaveWithin(
    tonic,
    middle,
    (position) => position >= lowestPosition && position <= highestPosition,
  );
  if (withinRange !== null) return withinRange;

  const withinPiano = nearestOctaveWithin(
    tonic,
    middle,
    (position) =>
      position >= PIANO_LOWEST_POSITION && position <= PIANO_HIGHEST_POSITION,
  );
  if (withinPiano !== null) return withinPiano;

  // Unreachable for every spelling this app produces (natural, sharp or
  // flat tonics always have an octave 0..=8 within A0–C8) — a bug, not an
  // expected failure (docs/engineering.md §4).
  throw new Error(
    `no octave of ${tonic.letter} (${tonic.accidental}) lies within A0–C8`,
  );
}

/**
 * The drone's note: the key's tonic (its spelling) at the pinned octave
 * when that lies within A0–C8, else at defaultDroneOctave.
 */
export function droneNoteOf(
  key: Key,
  variant: Variant,
  settings: DroneSettings,
): Note {
  if (settings.octave.kind === "pinned") {
    const pinned: Note = { ...key.tonic, octave: settings.octave.octave };
    const position = pitchPosition(pinned);
    if (
      position >= PIANO_LOWEST_POSITION &&
      position <= PIANO_HIGHEST_POSITION
    ) {
      return pinned;
    }
  }
  return { ...key.tonic, octave: defaultDroneOctave(key.tonic, variant.range) };
}

/**
 * Whether the note one octave away in `delta`'s direction still lies
 * within A0–C8.
 */
export function canStepDroneOctave(note: Note, delta: -1 | 1): boolean {
  const steppedPosition = pitchPosition(note) + delta * 12;
  return (
    steppedPosition >= PIANO_LOWEST_POSITION &&
    steppedPosition <= PIANO_HIGHEST_POSITION
  );
}
