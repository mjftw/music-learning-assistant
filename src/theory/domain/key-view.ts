import type { Key } from "./keys";
import { scaleNotesOf } from "./keys";
import type { Note, PitchClass } from "./notes";
import { pitchPosition } from "./notes";
import { newAccidentalOf, signatureOf } from "./signatures";
import type { Signature } from "./signatures";
import type { Variant } from "../instruments/catalogue";

export interface KeyViewNote {
  readonly note: Note;
  readonly isRoot: boolean;
}

export interface KeyView {
  readonly signature: Signature;
  readonly notes: readonly KeyViewNote[];
  readonly newAccidental: PitchClass | null;
}

function samePitchClass(a: PitchClass, b: PitchClass): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

export function keyView(key: Key, variant: Variant): KeyView {
  const scale = scaleNotesOf(key);
  const lowestPosition = pitchPosition(variant.range.lowest);
  const highestPosition = pitchPosition(variant.range.highest);

  const notes: KeyViewNote[] = [];
  for (
    let octave = variant.range.lowest.octave - 1;
    octave <= variant.range.highest.octave + 1;
    octave += 1
  ) {
    for (const pitchClass of scale) {
      const note: Note = { ...pitchClass, octave };
      const position = pitchPosition(note);
      if (position < lowestPosition || position > highestPosition) continue;
      notes.push({ note, isRoot: samePitchClass(pitchClass, key.tonic) });
    }
  }
  notes.sort((a, b) => pitchPosition(a.note) - pitchPosition(b.note));

  return {
    signature: signatureOf(key),
    notes,
    newAccidental: newAccidentalOf(key),
  };
}
