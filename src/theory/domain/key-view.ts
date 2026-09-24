import type { Key } from "./keys";
import type { Note, PitchClass } from "./notes";
import { pitchPosition } from "./notes";
import type { Degree, Scale, ScaleNote } from "./scales";
import { spelledScaleOf } from "./scales";
import { newAccidentalOf, signatureOf } from "./signatures";
import type { Signature } from "./signatures";
import type { Variant } from "../instruments/catalogue";

export interface KeyViewNote {
  readonly note: Note;
  readonly isRoot: boolean;
  readonly degree: Degree;
  readonly degreeLabel: string;
  readonly altered: boolean;
}

export interface KeyView {
  readonly signature: Signature;
  readonly notes: readonly KeyViewNote[];
  readonly newAccidental: PitchClass | null;
}

function samePitchClass(a: PitchClass, b: PitchClass): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

// The in-range notes of a spelled scale form, ascending, one octave at a
// time either side of the variant's range (a note's octave alone can put
// it in or out of range at the edges).
export function rangedNotesOf(
  scaleNotes: readonly ScaleNote[],
  tonic: PitchClass,
  variant: Variant,
): readonly KeyViewNote[] {
  const lowestPosition = pitchPosition(variant.range.lowest);
  const highestPosition = pitchPosition(variant.range.highest);

  const notes: KeyViewNote[] = [];
  for (
    let octave = variant.range.lowest.octave - 1;
    octave <= variant.range.highest.octave + 1;
    octave += 1
  ) {
    for (const scaleNote of scaleNotes) {
      const note: Note = { ...scaleNote.pitchClass, octave };
      const position = pitchPosition(note);
      if (position < lowestPosition || position > highestPosition) continue;
      notes.push({
        note,
        isRoot: samePitchClass(scaleNote.pitchClass, tonic),
        degree: scaleNote.degree,
        degreeLabel: scaleNote.degreeLabel,
        altered: scaleNote.altered,
      });
    }
  }
  notes.sort((a, b) => pitchPosition(a.note) - pitchPosition(b.note));
  return notes;
}

export function keyView(key: Key, variant: Variant, scale: Scale): KeyView {
  return {
    signature: signatureOf(key),
    notes: rangedNotesOf(
      spelledScaleOf(key, scale).ascending,
      key.tonic,
      variant,
    ),
    newAccidental: newAccidentalOf(key),
  };
}
