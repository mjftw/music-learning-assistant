import type { JSX } from "react";
import {
  signatureOf,
  spelledScaleOf,
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

const ALT_FONT_SIZE = 11;
const ALT_ROW_HEIGHT = 11;
const ALT_FONT_WEIGHT = 600;
const ALT_INK_ACCENTED = paper.accent;
const ALT_INK_PLAIN = paper.muted;

const DEGREE_FONT_SIZE = 11;
const DEGREE_ROW_HEIGHT = 11;
const DEGREE_FONT_WEIGHT = 600;
const DEGREE_INK_ACCENTED = paper.accent;
const DEGREE_INK_PLAIN = paper.muted;

const SHARP_SYMBOL = "♯";
const FLAT_SYMBOL = "♭";

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
  readonly alt: string | null;
  readonly isSounding: boolean;
  readonly altIsSounding: boolean;
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

// The descending form's note for the same degree, where the ascending and
// descending forms differ (practice.session/REQ-012/S4) — `null` when the
// scale has no descending form of its own.
function altOf(
  note: ScaleNote,
  descending: readonly ScaleNote[] | null,
): string | null {
  if (descending === null) return null;
  const counterpart = descending.find((entry) => entry.degree === note.degree);
  if (counterpart === undefined) return "";
  if (samePitchClass(note.pitchClass, counterpart.pitchClass)) return "";
  return `↓${pitchClassLabel(counterpart.pitchClass)}`;
}

function columnsOf(
  key: Key,
  scale: Scale,
  soundingPitchClass: PitchClass | null,
): readonly ColumnData[] {
  const spelled = spelledScaleOf(key, scale);
  const signature = signatureOf(key);

  return spelled.ascending.map((note) => {
    const { mark, accented } = markOf(note.pitchClass, signature);
    // practice.session/REQ-012/S4 — the sounding highlight also lands on the
    // alt row's own note, not only the ascending name above it, so a
    // descending-only match still lights up its column.
    const altIsSounding =
      soundingPitchClass !== null &&
      spelled.descending !== null &&
      spelled.descending.some(
        (entry) =>
          entry.degree === note.degree &&
          samePitchClass(entry.pitchClass, soundingPitchClass),
      );
    const isSounding =
      (soundingPitchClass !== null &&
        samePitchClass(note.pitchClass, soundingPitchClass)) ||
      altIsSounding;
    return {
      name: pitchClassLabel(note.pitchClass),
      mark,
      accented,
      degreeLabel: note.degreeLabel,
      altered: note.altered,
      alt: altOf(note, spelled.descending),
      isSounding,
      altIsSounding,
    };
  });
}

function nameFontSizeOf(columnCount: number): number {
  if (columnCount <= 7) return NAME_FONT_SIZE_UP_TO_SEVEN_COLUMNS;
  if (columnCount <= 9) return NAME_FONT_SIZE_UP_TO_NINE_COLUMNS;
  return NAME_FONT_SIZE_BEYOND_NINE_COLUMNS;
}

export function NamesView(props: {
  readonly key_: Key;
  readonly scale: Scale;
  readonly degreesEnabled: boolean;
  readonly soundingPitchClass: PitchClass | null;
}): JSX.Element {
  const { key_, scale, degreesEnabled, soundingPitchClass } = props;
  const columns = columnsOf(key_, scale, soundingPitchClass);
  const nameFontSize = nameFontSizeOf(columns.length);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: ROW_FLEX_GAP }}>
      {columns.map((column, index) => (
        <div
          key={`${column.name}-${index}`}
          data-testid="names-column"
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
          {column.alt !== null && (
            <div
              data-testid="note-alt"
              style={{
                fontSize: ALT_FONT_SIZE,
                fontWeight: ALT_FONT_WEIGHT,
                color: column.altIsSounding ? ALT_INK_ACCENTED : ALT_INK_PLAIN,
                lineHeight: 1,
                height: ALT_ROW_HEIGHT,
              }}
            >
              {column.alt}
            </div>
          )}
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
