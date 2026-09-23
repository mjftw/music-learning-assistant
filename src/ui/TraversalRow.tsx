import { memo, type JSX } from "react";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/003-hear-the-scale/design/hear-the-scale.dc.html,
// markup lines 137-140) — named here rather than re-derived by eye.
const ROW_PADDING = "9px 14px";
const ROW_GAP = 10;
const ROW_BACKGROUND = paper.card;
const ROW_BORDER = `1px solid ${paper.borderSoft}`;
const ROW_RADIUS = 14;

const SUMMARY_FONT_SIZE = 11;
const SUMMARY_FONT_WEIGHT = 600;
const SUMMARY_LETTER_SPACING = "0.02em";
// Module-local one-off colour, per the codebase's convention (see e.g.
// CircleOfFifths.tsx's PILL_BORDER) — the vendored reference's summary ink.
const SUMMARY_INK = "#4a4136";

const EDIT_FONT_SIZE = 11;
const EDIT_FONT_WEIGHT = 600;

// Never opens itself (Article VI) — the sheet's `open` state lives with the
// caller; this row only ever asks to open it, via `onOpen`.
// Wrapped in `React.memo` (T032) — `summaryLine` is a string (compared by
// value; only changes when the traversal or session settings actually do)
// and `onOpen` is `useCallback`-stabilised, so this never re-renders
// during playback.
function TraversalRowComponent(props: {
  readonly summaryLine: string;
  readonly onOpen: () => void;
}): JSX.Element {
  const { summaryLine, onOpen } = props;

  return (
    <button
      type="button"
      aria-label="Edit traversal"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ROW_GAP,
        padding: ROW_PADDING,
        background: ROW_BACKGROUND,
        border: ROW_BORDER,
        borderRadius: ROW_RADIUS,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontFamily: fonts.mono,
          fontSize: SUMMARY_FONT_SIZE,
          fontWeight: SUMMARY_FONT_WEIGHT,
          letterSpacing: SUMMARY_LETTER_SPACING,
          color: SUMMARY_INK,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {summaryLine}
      </span>
      <span
        style={{
          fontSize: EDIT_FONT_SIZE,
          fontWeight: EDIT_FONT_WEIGHT,
          color: paper.accent,
          flex: "none",
        }}
      >
        edit ›
      </span>
    </button>
  );
}

export const TraversalRow = memo(TraversalRowComponent);
