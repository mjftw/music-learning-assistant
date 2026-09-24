import type { Accidental } from "./notes";
import type { Signature } from "./signatures";
import type { KeyViewNote } from "./key-view";

// REQ-003 — an inline accidental holds for the rest of the run, as in one
// bar: a map from letter+octave to the accidental currently in effect,
// initialised lazily from the signature (sharp/flat for a letter the
// signature names, else natural). A note whose accidental differs from
// what is in effect at its letter+octave draws that accidental inline and
// updates what is in effect there; otherwise nothing is drawn.
export function inlineAccidentalsOf(
  signature: Signature,
  run: readonly KeyViewNote[],
): readonly (Accidental | null)[] {
  const inEffect = new Map<string, Accidental>();

  const effectiveAccidentalFor = (note: KeyViewNote): Accidental => {
    const key = `${note.note.letter}${note.note.octave}`;
    const existing = inEffect.get(key);
    if (existing !== undefined) return existing;
    const signed = signature.accidentals.find(
      (pitchClass) => pitchClass.letter === note.note.letter,
    );
    return signed !== undefined ? signed.accidental : "natural";
  };

  return run.map((note) => {
    const key = `${note.note.letter}${note.note.octave}`;
    const current = effectiveAccidentalFor(note);
    if (note.note.accidental === current) return null;
    inEffect.set(key, note.note.accidental);
    return note.note.accidental;
  });
}
