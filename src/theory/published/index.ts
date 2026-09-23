export type { Accidental, Note, NoteLetter, PitchClass } from "../domain/notes";
export { pitchPosition } from "../domain/notes";
export type { Key, KeyId, Mode } from "../domain/keys";
export { keyId, scaleNotesOf } from "../domain/keys";
export type { Signature, SignatureKind } from "../domain/signatures";
export { newAccidentalOf, relativeOf, signatureOf } from "../domain/signatures";
export type { CirclePosition } from "../domain/circle";
export { circleOfFifths } from "../domain/circle";
export type { ArcPosition, SpellingPreference } from "../domain/arc";
export { arcOf, spelledMajorAt, spelledMinorAt } from "../domain/arc";
export type { KeyView, KeyViewNote } from "../domain/key-view";
export { keyView } from "../domain/key-view";
export type {
  Degree,
  Formula,
  Scale,
  ScaleDegree,
  ScaleFamily,
  ScaleId,
  ScaleNote,
  SpelledScale,
} from "../domain/scales";
export {
  SCALES,
  scaleById,
  scalesForMode,
  spelledScaleOf,
} from "../domain/scales";
export type {
  Direction,
  Octaves,
  OctaveCount,
  SequenceNote,
  Shape,
  Traversal,
} from "../domain/traversal";
export {
  effectiveOctavesOf,
  fittingOctaveCounts,
  runOf,
  sequenceOf,
} from "../domain/traversal";
export { pitchClassLabel, noteLabel } from "../domain/labels";
export { pitchHzOf, REFERENCE_A4_HZ } from "../domain/temperament";
export type {
  Catalogue,
  CatalogueNotice,
  Instrument,
  NoteRange,
  Variant,
  VariantId,
} from "../instruments/catalogue";
export { builtInCatalogue, loadCatalogue } from "../instruments/catalogue";
