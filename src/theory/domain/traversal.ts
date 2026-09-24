import type { Key } from "./keys";
import type { KeyViewNote } from "./key-view";
import { keyView, rangedNotesOf } from "./key-view";
import type { Note } from "./notes";
import type { Scale } from "./scales";
import { spelledScaleOf } from "./scales";
import type { Variant } from "../instruments/catalogue";

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

// How many notes the chosen scale has per octave — the literal 7 the
// diatonic-only version of this module used, generalised to any catalogued
// scale (REQ-012).
function notesPerOctaveOf(key: Key, scale: Scale): number {
  return spelledScaleOf(key, scale).ascending.length;
}

// An n-octave run is notesPerOctave*n + 1 consecutive notes starting at a
// tonic (isRoot) — the index of the lowest tonic for which the run still
// fits within the key view's notes, or undefined if no tonic supports it.
function lowestTonicIndexFor(
  notes: readonly KeyViewNote[],
  octaveCount: number,
  notesPerOctave: number,
): number | undefined {
  const runLength = notesPerOctave * octaveCount;
  for (let index = 0; index < notes.length; index += 1) {
    if (!notes[index]!.isRoot) continue;
    if (index + runLength <= notes.length - 1) return index;
  }
  return undefined;
}

export function fittingOctaveCounts(
  key: Key,
  variant: Variant,
  scale: Scale,
): readonly OctaveCount[] {
  const notes = keyView(key, variant, scale).notes;
  const notesPerOctave = notesPerOctaveOf(key, scale);
  return OCTAVE_COUNTS.filter(
    (count) => lowestTonicIndexFor(notes, count, notesPerOctave) !== undefined,
  );
}

// The clamp REQ-001 of practice.session relies on: the requested octaves
// when they fit, else the largest count that does, else full range.
export function effectiveOctavesOf(
  key: Key,
  variant: Variant,
  scale: Scale,
  octaves: Octaves,
): Octaves {
  if (octaves.kind === "full") return octaves;
  const notes = keyView(key, variant, scale).notes;
  const notesPerOctave = notesPerOctaveOf(key, scale);
  if (lowestTonicIndexFor(notes, octaves.count, notesPerOctave) !== undefined)
    return octaves;

  const fitting = fittingOctaveCounts(key, variant, scale);
  if (fitting.length === 0) return { kind: "full" };
  return { kind: "count", count: fitting[fitting.length - 1]! };
}

function countRunOf(
  notes: readonly KeyViewNote[],
  octaveCount: OctaveCount,
  notesPerOctave: number,
  startIndex: number | undefined,
): readonly KeyViewNote[] {
  if (startIndex === undefined) return notes; // effectiveOctavesOf already clamped to a count that fits
  return notes.slice(startIndex, startIndex + notesPerOctave * octaveCount + 1);
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
function sequenceFromRun(
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

export interface TraversalNotes {
  readonly run: readonly KeyViewNote[];
  readonly sequence: readonly SequenceNote[];
}

// REQ-012/S6, REQ-003/S6 — a scale with its own descending form (classical
// melodic minor): ↑ walks the ascending run `A`, ↓ walks the descending
// form `D` (its own notes, ascending order, reversed for the sequence),
// and ↑↓ is written out in playing order so the descent shows D's notes
// rather than a mirror of A.
function splitDirectionOf(
  ascendingRun: readonly KeyViewNote[],
  descendingRun: readonly KeyViewNote[],
  direction: Direction,
): TraversalNotes {
  if (direction === "up") {
    return { run: ascendingRun, sequence: sequenceFromRun(ascendingRun, "up") };
  }

  const descendingAscending = descendingRun.map((entry, runIndex) => ({
    note: entry.note,
    isRoot: entry.isRoot,
    runIndex,
  }));

  if (direction === "down") {
    return { run: descendingRun, sequence: [...descendingAscending].reverse() };
  }

  const run = [...ascendingRun, ...[...descendingRun].reverse().slice(1)];
  const sequence = run.map((entry, position) => ({
    note: entry.note,
    isRoot: entry.isRoot,
    runIndex: position,
  }));
  return { run, sequence };
}

// REQ-012 — the run fitted to the instrument and the chosen scale, and the
// sequence it is played in.
export function traversalOf(
  key: Key,
  variant: Variant,
  scale: Scale,
  traversal: Traversal,
): TraversalNotes {
  const view = keyView(key, variant, scale);
  const notesPerOctave = notesPerOctaveOf(key, scale);
  const effective = effectiveOctavesOf(key, variant, scale, traversal.octaves);
  const scaleRun =
    effective.kind === "full"
      ? view.notes
      : countRunOf(
          view.notes,
          effective.count,
          notesPerOctave,
          lowestTonicIndexFor(view.notes, effective.count, notesPerOctave),
        );

  if (traversal.shape === "arpeggio") {
    const run = scaleRun.filter(
      (note) => note.degree === 1 || note.degree === 3 || note.degree === 5,
    );
    return { run, sequence: sequenceFromRun(run, traversal.direction) };
  }

  const descendingFormula = spelledScaleOf(key, scale).descending;
  if (descendingFormula === null) {
    return {
      run: scaleRun,
      sequence: sequenceFromRun(scaleRun, traversal.direction),
    };
  }

  const descendingNotes = rangedNotesOf(descendingFormula, key.tonic, variant);
  const descendingRun =
    effective.kind === "full"
      ? descendingNotes
      : countRunOf(
          descendingNotes,
          effective.count,
          notesPerOctave,
          lowestTonicIndexFor(view.notes, effective.count, notesPerOctave),
        );

  return splitDirectionOf(scaleRun, descendingRun, traversal.direction);
}
