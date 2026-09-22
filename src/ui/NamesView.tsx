import type { JSX } from "react";
import { scaleNotesOf, signatureOf, type Key } from "../theory/published";
import { pitchClassLabel } from "./key-label";
import { fonts, paper } from "./theme";

// Mirrors the vendored visual reference's `scale:` mapping in renderVals()
// (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html) —
// named constants rather than re-derived by eye.
const ROW_FLEX_GAP = 2;
const COLUMN_GAP = 5;

const MARK_FONT_SIZE = 10;
const MARK_ROW_HEIGHT = 11;
const MARK_WEIGHT_ACCENTED = 700;
const MARK_WEIGHT_PLAIN = 500;
const MARK_INK_ACCENTED = paper.accent;
const MARK_INK_PLAIN = paper.muted;

const NAME_FONT_SIZE = 26;
const NAME_FONT_WEIGHT = 600;
const NAME_LETTER_SPACING = "-.02em";
const NAME_INK = paper.ink;

const DEGREE_FONT_SIZE = 11;
const DEGREE_ROW_HEIGHT = 11;
const DEGREE_FONT_WEIGHT = 600;
const DEGREE_INK = paper.muted;

const SHARP_SYMBOL = "♯";
const FLAT_SYMBOL = "♭";

interface ColumnData {
  readonly name: string;
  readonly mark: string;
  readonly accented: boolean;
  readonly degree: number;
}

// Each accidental-bearing scale note is marked with the symbol the key's
// signature uses plus its 1-based position in the order that signature
// introduces accidentals (`signatureOf`) — the newest, at `count`, accented.
function columnsOf(key: Key): readonly ColumnData[] {
  const scale = scaleNotesOf(key);
  const signature = signatureOf(key);
  const kindSymbol =
    signature.kind === "sharps"
      ? SHARP_SYMBOL
      : signature.kind === "flats"
        ? FLAT_SYMBOL
        : "";

  return scale.map((pitchClass, index) => {
    const degree = index + 1;
    const name = pitchClassLabel(pitchClass);
    if (pitchClass.accidental === "natural") {
      return { name, mark: "", accented: false, degree };
    }
    const orderIndex = signature.accidentals.findIndex(
      (accidental) => accidental.letter === pitchClass.letter,
    );
    const position = orderIndex + 1;
    return {
      name,
      mark: `${kindSymbol}${position}`,
      accented: position === signature.count,
      degree,
    };
  });
}

export function NamesView(props: {
  readonly key_: Key;
  readonly degreesEnabled: boolean;
}): JSX.Element {
  const { key_, degreesEnabled } = props;
  const columns = columnsOf(key_);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: ROW_FLEX_GAP }}>
      {columns.map((column) => (
        <div
          key={column.name}
          data-testid="names-column"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: COLUMN_GAP,
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
              fontSize: NAME_FONT_SIZE,
              fontWeight: NAME_FONT_WEIGHT,
              letterSpacing: NAME_LETTER_SPACING,
              color: NAME_INK,
              lineHeight: 1,
            }}
          >
            {column.name}
          </div>
          <div
            data-testid="note-degree"
            style={{
              fontFamily: fonts.mono,
              fontSize: DEGREE_FONT_SIZE,
              fontWeight: DEGREE_FONT_WEIGHT,
              color: DEGREE_INK,
              lineHeight: 1,
              height: DEGREE_ROW_HEIGHT,
            }}
          >
            {degreesEnabled ? column.degree : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
