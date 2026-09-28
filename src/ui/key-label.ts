import type { Key, Note, NoteLetter, Scale } from "../theory/published";
import { pitchClassLabel } from "../theory/published";

export { pitchClassLabel, noteLabel } from "../theory/published";

const DIATONIC_LETTERS: readonly NoteLetter[] = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "A",
  "B",
];

// The diatonic staff-position index shared by every hand-drawn stave in
// this app (StaveView's run, TunerStave's strip, T016): natural staff steps
// from C0, so consecutive natural letters are always 1 apart regardless of
// accidental. Extracted from StaveView.tsx's own private `diatonicIndex()`
// (itself copied verbatim from the vendored visual reference — see that
// file's module comment) once TunerStave needed the same arithmetic, rather
// than duplicating it (docs/engineering.md, AGENTS.md "things agents get
// wrong here").
export function diatonicIndex(note: Note): number {
  return note.octave * 7 + DIATONIC_LETTERS.indexOf(note.letter);
}

// practice.session/REQ-012 — the heading names the tonic and the chosen
// scale's own title, not a fixed "major"/"minor" suffix: the two home
// scales' titles ("major", "minor") reproduce the old heading exactly,
// every other scale's own title takes over ("G Lydian", "E jazz minor").
export function keyLabel(key: Key, scale: Scale): string {
  return `${pitchClassLabel(key.tonic)} ${scale.title}`;
}

// design's keyNameSize — the heading shrinks as the label grows so longer
// scale titles ("E harmonic minor") still fit the 390px column.
export function keyNameFontSizeOf(label: string): number {
  if (label.length <= 10) return 46;
  if (label.length <= 15) return 40;
  return 34;
}

// The circle wedge's own visible text: the tonic alone for major, the tonic
// plus a trailing "m" for minor (e.g. "F♯", "Em") — shorter than `keyLabel`
// because it sits inside a small wedge rather than standing as a heading.
export function wedgeLabel(key: Key): string {
  return key.mode === "major"
    ? pitchClassLabel(key.tonic)
    : `${pitchClassLabel(key.tonic)}m`;
}
