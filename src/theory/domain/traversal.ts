import type { Key } from "./keys";
import { scaleNotesOf } from "./keys";
import type { KeyViewNote } from "./key-view";
import { keyView } from "./key-view";
import type { Note } from "./notes";
import type { Scale } from "./scales";
import { scaleById } from "./scales";
import type { Variant } from "../instruments/catalogue";

// The diatonic scale for the key's own mode — a stand-in for the chosen
// scale until the caller can pass one through (T004 threads the learner's
// actual choice; `runOf`/`sequenceOf` are removed at that point).
function diatonicScaleOf(key: Key): Scale {
  return scaleById(key.mode === "major" ? "major" : "natural-minor");
}

export type Direction = "up" | "down" | "updown";
export type Shape = "scale" | "arpeggio";
export type OctaveCount = 1 | 2 | 3 | 4;
export type Octaves =
  | { readonly kind: "full" }
  | { readonly kind: "count"; readonly count: OctaveCount };

export interface Traversal {
  readonly direction: Direction;
  readonly octaves: Octaves;
  readonly shape: Shape;
}

const OCTAVE_COUNTS: readonly OctaveCount[] = [1, 2, 3, 4];

// Degree indices (0-based, into scaleNotesOf) kept by the arpeggio shape —
// the 1st, 3rd and 5th degrees, i.e. the triad.
const ARPEGGIO_DEGREES = new Set([0, 2, 4]);

// An n-octave run is 7*n + 1 consecutive notes starting at a tonic
// (isRoot) — the index of the lowest tonic for which the run still fits
// within the key view's notes, or undefined if no tonic supports it.
function lowestTonicIndexFor(
  notes: readonly KeyViewNote[],
  octaveCount: number,
): number | undefined {
  const runLength = 7 * octaveCount;
  for (let index = 0; index < notes.length; index += 1) {
    if (!notes[index]!.isRoot) continue;
    if (index + runLength <= notes.length - 1) return index;
  }
  return undefined;
}

export function fittingOctaveCounts(
  key: Key,
  variant: Variant,
): readonly OctaveCount[] {
  const notes = keyView(key, variant, diatonicScaleOf(key)).notes;
  return OCTAVE_COUNTS.filter(
    (count) => lowestTonicIndexFor(notes, count) !== undefined,
  );
}

// The clamp REQ-001 of practice.session relies on: the requested octaves
// when they fit, else the largest count that does, else full range.
export function effectiveOctavesOf(
  key: Key,
  variant: Variant,
  octaves: Octaves,
): Octaves {
  if (octaves.kind === "full") return octaves;
  const notes = keyView(key, variant, diatonicScaleOf(key)).notes;
  if (lowestTonicIndexFor(notes, octaves.count) !== undefined) return octaves;

  const fitting = fittingOctaveCounts(key, variant);
  if (fitting.length === 0) return { kind: "full" };
  return { kind: "count", count: fitting[fitting.length - 1]! };
}

function degreeIndexOf(key: Key, note: KeyViewNote): number {
  return scaleNotesOf(key).findIndex(
    (pitchClass) =>
      pitchClass.letter === note.note.letter &&
      pitchClass.accidental === note.note.accidental,
  );
}

function countRunOf(
  notes: readonly KeyViewNote[],
  octaveCount: OctaveCount,
): readonly KeyViewNote[] {
  const startIndex = lowestTonicIndexFor(notes, octaveCount);
  if (startIndex === undefined) return notes; // effectiveOctavesOf already clamped to a count that fits
  return notes.slice(startIndex, startIndex + 7 * octaveCount + 1);
}

export function runOf(
  key: Key,
  variant: Variant,
  traversal: Traversal,
): readonly KeyViewNote[] {
  const view = keyView(key, variant, diatonicScaleOf(key));
  const effective = effectiveOctavesOf(key, variant, traversal.octaves);
  const scaleRun =
    effective.kind === "full"
      ? view.notes
      : countRunOf(view.notes, effective.count);

  if (traversal.shape === "scale") return scaleRun;
  return scaleRun.filter((note) =>
    ARPEGGIO_DEGREES.has(degreeIndexOf(key, note)),
  );
}

export interface SequenceNote {
  readonly note: Note;
  readonly isRoot: boolean;
  readonly runIndex: number;
}

// The run in playing order: ascending for up, descending for down,
// ascending then descending without repeating the top note for updown
// (2n-1 notes for an n-note run). runIndex is always the note's position
// in the ascending run, whichever direction the sequence plays it in.
export function sequenceOf(
  run: readonly KeyViewNote[],
  direction: Direction,
): readonly SequenceNote[] {
  const ascending = run.map((entry, runIndex) => ({
    note: entry.note,
    isRoot: entry.isRoot,
    runIndex,
  }));
  if (direction === "up") return ascending;

  const descending = [...ascending].reverse();
  if (direction === "down") return descending;

  return [...ascending, ...descending.slice(1)];
}
