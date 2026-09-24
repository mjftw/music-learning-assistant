import { memo, type JSX } from "react";
import { fonts } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/005-scale-selection/design/hear-the-scale.dc.html,
// markup lines 62-66, the `scaleFormula` pill) — named here rather than
// re-derived by eye.
const PILL_GAP = 8;
const PILL_PADDING = "5px 11px 6px";
// Module-local one-off colour, per the codebase's convention (see e.g.
// CircleOfFifths.tsx's PILL_BORDER) — the vendored reference's pill border.
const PILL_BORDER = "#e0d7c5";
const PILL_RADIUS = 999;
const PILL_BACKGROUND = "#f7f3ea";

const LABEL_FONT_SIZE = 9.5;
const LABEL_LETTER_SPACING = "0.08em";
const LABEL_COLOR = "#9a9186";

const FORMULA_FONT_SIZE = 11.5;
const FORMULA_FONT_WEIGHT = 600;
const FORMULA_COLOR = "#4a4136";

const CHEVRON_FONT_SIZE = 9;
const CHEVRON_COLOR = "#9a9186";
const CHEVRON_GLYPH = "▼";

// Never opens itself (Article VI) — the sheet's `open` state lives with the
// caller; this row only ever asks to open it, via `onOpen`.
// Wrapped in `React.memo` — `formulaLine` is a string (compared by value;
// only changes when the scale choice actually does) and `onOpen` is
// `useCallback`-stabilised, so this never re-renders during playback.
function ScaleRowComponent(props: {
  readonly formulaLine: string;
  readonly onOpen: () => void;
}): JSX.Element {
  const { formulaLine, onOpen } = props;

  return (
    <button
      type="button"
      aria-label="Scale"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: PILL_GAP,
        padding: PILL_PADDING,
        border: `1px solid ${PILL_BORDER}`,
        borderRadius: PILL_RADIUS,
        background: PILL_BACKGROUND,
        maxWidth: "100%",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: LABEL_FONT_SIZE,
          letterSpacing: LABEL_LETTER_SPACING,
          color: LABEL_COLOR,
          flex: "none",
        }}
      >
        SCALE
      </span>
      <span
        data-testid="scale-row-formula"
        style={{
          fontFamily: fonts.mono,
          fontSize: FORMULA_FONT_SIZE,
          fontWeight: FORMULA_FONT_WEIGHT,
          color: FORMULA_COLOR,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {formulaLine}
      </span>
      <span
        style={{
          fontSize: CHEVRON_FONT_SIZE,
          color: CHEVRON_COLOR,
          flex: "none",
        }}
      >
        {CHEVRON_GLYPH}
      </span>
    </button>
  );
}

export const ScaleRow = memo(ScaleRowComponent);
