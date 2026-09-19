export type { Accidental, Note, NoteLetter, PitchClass } from "../domain/notes";
export { pitchPosition } from "../domain/notes";
export type { Key, KeyId, Mode } from "../domain/keys";
export { keyId, scaleNotesOf } from "../domain/keys";
export type { Signature, SignatureKind } from "../domain/signatures";
export { newAccidentalOf, relativeOf, signatureOf } from "../domain/signatures";
export type { CirclePosition } from "../domain/circle";
export { circleOfFifths } from "../domain/circle";
