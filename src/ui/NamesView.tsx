import type { JSX } from "react";
import {
  signatureOf,
  spelledScaleOf,
  type Direction,
  type Key,
  type PitchClass,
  type Scale,
  type ScaleNote,
} from "../theory/published";
import { pitchClassLabel } from "./key-label";
import { fonts, paper } from "./theme";

// Mirrors the vendored visual reference's `scale:` mapping in renderVals()
// (changes/005-scale-selection/design/hear-the-scale.dc.html) — named
// constants rather than re-derived by eye.
const ROW_FLEX_GAP = 2;
const COLUMN_GAP = 5;

const MARK_FONT_SIZE = 10;
const MARK_ROW_HEIGHT = 11;
const MARK_WEIGHT_ACCENTED = 700;
const MARK_WEIGHT_PLAIN = 500;
const MARK_INK_ACCENTED = paper.accent;
const MARK_INK_PLAIN = paper.muted;

// design's namesSize — the name column shrinks as the scale gains notes per
// octave so a sixteen-note chromatic run still fits the 342px row.
const NAME_FONT_SIZE_UP_TO_SEVEN_COLUMNS = 26;
const NAME_FONT_SIZE_UP_TO_NINE_COLUMNS = 21;
const NAME_FONT_SIZE_BEYOND_NINE_COLUMNS = 15;
const NAME_FONT_WEIGHT = 600;
const NAME_LETTER_SPACING = "-.02em";
const NAME_INK = paper.ink;

const DEGREE_FONT_SIZE = 11;
const DEGREE_ROW_HEIGHT = 11;
const DEGREE_FONT_WEIGHT = 600;
const DEGREE_INK_ACCENTED = paper.accent;
const DEGREE_INK_PLAIN = paper.muted;

const SHARP_SYMBOL = "♯";
const FLAT_SYMBOL = "♭";
const DESCENT_SYMBOL = "↓";

// practice.session/REQ-006 — the sounding note's column, matched by pitch
// class (spelling and octave both irrelevant to the names view).
const SOUNDING_BACKGROUND = "rgba(138,75,42,.10)";
const SOUNDING_INK = paper.accent;

interface ColumnData {
  readonly name: string;
  readonly mark: string;
  readonly accented: boolean;
  readonly degreeLabel: string;
  readonly altered: boolean;
  readonly isSounding: boolean;
  readonly isDescent: boolean;
}

function samePitchClass(a: PitchClass, b: PitchClass): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

// A note's mark is the signature's own glyph for its letter — only when the
// note's accidental actually matches what the signature carries for that
// letter (theory.circle-of-fifths/REQ-003/S3: an altered note the signature
// doesn't carry, e.g. Lydian's ♯4, shows no mark at all).
function markOf(
  pitchClass: PitchClass,
  signature: ReturnType<typeof signatureOf>,
): { readonly mark: string; readonly accented: boolean } {
  const signed = signature.accidentals.find(
    (accidental) => accidental.letter === pitchClass.letter,
  );
  if (signed === undefined || signed.accidental !== pitchClass.accidental) {
    return { mark: "", accented: false };
  }
  const kindSymbol = signature.kind === "sharps" ? SHARP_SYMBOL : FLAT_SYMBOL;
  const position = signature.accidentals.indexOf(signed) + 1;
  return {
    mark: `${kindSymbol}${position}`,
    accented: position === signature.count,
  };
}

function columnFor(
  note: ScaleNote,
  signature: ReturnType<typeof signatureOf>,
  soundingPitchClass: PitchClass | null,
  isDescent: boolean,
): ColumnData {
  const { mark, accented } = markOf(note.pitchClass, signature);
  return {
    name: pitchClassLabel(note.pitchClass),
    mark,
    accented,
    degreeLabel: note.degreeLabel,
    altered: note.altered,
    isSounding:
      soundingPitchClass !== null &&
      samePitchClass(note.pitchClass, soundingPitchClass),
    isDescent,
  };
}

// The descending form's notes that differ from the ascending form at the
// same degree (practice.session/REQ-012/S4), in descending playing order —
// highest degree first, matching the order they are actually played in ↑↓.
function descentNotesOf(
  ascending: readonly ScaleNote[],
  descending: readonly ScaleNote[],
): readonly ScaleNote[] {
  return descending
    .filter((note) => {
      const counterpart = ascending.find(
        (entry) => entry.degree === note.degree,
      );
      return (
        counterpart !== undefined &&
        !samePitchClass(note.pitchClass, counterpart.pitchClass)
      );
    })
    .slice()
    .sort((a, b) => b.degree - a.degree);
}

function columnsOf(
  key: Key,
  scale: Scale,
  direction: Direction,
  soundingPitchClass: PitchClass | null,
): readonly ColumnData[] {
  const spelled = spelledScaleOf(key, scale);
  const signature = signatureOf(key);

  // The names view's main columns follow the notes that actually play in the
  // chosen direction (practice.session/REQ-012): the descending form's own
  // notes for ↓, the ascending form's for ↑ or ↑↓ (↑↓'s descent — where it
  // differs — is appended below, not substituted for the ascending octave).
  const primary =
    direction === "down" && spelled.descending !== null
      ? spelled.descending
      : spelled.ascending;
  const mainColumns = primary.map((note) =>
    columnFor(note, signature, soundingPitchClass, false),
  );

  const descentColumns =
    direction === "updown" && spelled.descending !== null
      ? descentNotesOf(spelled.ascending, spelled.descending).map((note) =>
          columnFor(note, signature, soundingPitchClass, true),
        )
      : [];

  return [...mainColumns, ...descentColumns];
}

function nameFontSizeOf(columnCount: number): number {
  if (columnCount <= 7) return NAME_FONT_SIZE_UP_TO_SEVEN_COLUMNS;
  if (columnCount <= 9) return NAME_FONT_SIZE_UP_TO_NINE_COLUMNS;
  return NAME_FONT_SIZE_BEYOND_NINE_COLUMNS;
}

export function NamesView(props: {
  readonly key_: Key;
  readonly scale: Scale;
  readonly direction: Direction;
  readonly degreesEnabled: boolean;
  readonly soundingPitchClass: PitchClass | null;
}): JSX.Element {
  const { key_, scale, direction, degreesEnabled, soundingPitchClass } = props;
  const columns = columnsOf(key_, scale, direction, soundingPitchClass);
  const nameFontSize = nameFontSizeOf(columns.length);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: ROW_FLEX_GAP }}>
      {columns.map((column, index) => (
        <div
          key={`${column.name}-${index}`}
          data-testid="names-column"
          data-descent={column.isDescent ? "true" : "false"}
          data-sounding={column.isSounding ? "true" : "false"}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: COLUMN_GAP,
            background: column.isSounding ? SOUNDING_BACKGROUND : "transparent",
          }}
        >
          {column.isDescent ? (
            <div
              data-testid="descent-mark"
              style={{
                fontFamily: fonts.mono,
                fontSize: MARK_FONT_SIZE,
                fontWeight: MARK_WEIGHT_PLAIN,
                color: MARK_INK_PLAIN,
                lineHeight: 1,
                height: MARK_ROW_HEIGHT,
              }}
            >
              {DESCENT_SYMBOL}
            </div>
          ) : (
            <div
              data-testid="note-mark"
              data-accented={column.accented ? "true" : "false"}
              style={{
                fontFamily: fonts.mono,
                fontSize: MARK_FONT_SIZE,
                fontWeight: column.accented
                  ? MARK_WEIGHT_ACCENTED
                  : MARK_WEIGHT_PLAIN,
                color: column.accented ? MARK_INK_ACCENTED : MARK_INK_PLAIN,
                lineHeight: 1,
                height: MARK_ROW_HEIGHT,
              }}
            >
              {column.mark}
            </div>
          )}
          <div
            data-testid="column-name"
            style={{
              fontSize: nameFontSize,
              fontWeight: NAME_FONT_WEIGHT,
              letterSpacing: NAME_LETTER_SPACING,
              color: column.isSounding ? SOUNDING_INK : NAME_INK,
              lineHeight: 1,
            }}
          >
            {column.name}
          </div>
          <div
            data-testid="note-degree"
            data-altered={column.altered ? "true" : "false"}
            style={{
              fontFamily: fonts.mono,
              fontSize: DEGREE_FONT_SIZE,
              fontWeight: DEGREE_FONT_WEIGHT,
              color: column.altered ? DEGREE_INK_ACCENTED : DEGREE_INK_PLAIN,
              lineHeight: 1,
              height: DEGREE_ROW_HEIGHT,
            }}
          >
            {degreesEnabled ? column.degreeLabel : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
