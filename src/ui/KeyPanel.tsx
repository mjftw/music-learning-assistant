import type { CSSProperties, JSX, ReactNode } from "react";
import { fonts, paper } from "./theme";

// Mirrors the vendored visual reference's bottom-panel card (the `<div
// style="margin:22px 16px 0;...">` block in changes/002-circle-redesign/
// design/Circle 1c Function Paper.dc.html) — named constants rather than
// re-derived by eye.
const CARD_MARGIN = "22px 16px 0";
const CARD_PADDING = "12px 8px 11px";
const CARD_BACKGROUND = paper.card;
const CARD_BORDER = `1px solid ${paper.borderSoft}`;
const CARD_RADIUS = 14;

const SUMMARY_ROW_MARGIN_TOP = 10;
const SUMMARY_ROW_PADDING_TOP = 9;
const SUMMARY_ROW_BORDER = `1px solid ${paper.hairline}`;

const SUMMARY_TEXT_FONT_SIZE = 10.5;
const SUMMARY_TEXT_LETTER_SPACING = "0.02em";
const SUMMARY_TEXT_INK = paper.muted;

const PILL_BORDER = "#e0d7c5";
const PILL_ACTIVE_BACKGROUND = paper.pillActive;
const PILL_ACTIVE_INK = "#4a4136";
const PILL_INACTIVE_INK = "#756c60";
const PILL_PADDING = "4px 11px 5px";
const PILL_FONT_SIZE = 11;
const PILL_FONT_WEIGHT = 600;

function pillStyle(active: boolean): CSSProperties {
  return {
    padding: PILL_PADDING,
    fontSize: PILL_FONT_SIZE,
    fontWeight: PILL_FONT_WEIGHT,
    lineHeight: 1.2,
    color: active ? PILL_ACTIVE_INK : PILL_INACTIVE_INK,
    background: active ? PILL_ACTIVE_BACKGROUND : "transparent",
    border: "none",
    cursor: "pointer",
  };
}

export function KeyPanel(props: {
  readonly view: "names" | "stave";
  readonly onSelectView: (view: "names" | "stave") => void;
  readonly children: ReactNode;
}): JSX.Element {
  const { view, onSelectView, children } = props;

  return (
    <div
      style={{
        margin: CARD_MARGIN,
        padding: CARD_PADDING,
        background: CARD_BACKGROUND,
        border: CARD_BORDER,
        borderRadius: CARD_RADIUS,
      }}
    >
      {children}
      <div
        style={{
          marginTop: SUMMARY_ROW_MARGIN_TOP,
          paddingTop: SUMMARY_ROW_PADDING_TOP,
          borderTop: SUMMARY_ROW_BORDER,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        {/* The range summary ("22 notes · C4–C7") is built in T009 — this
            slot stays empty until then. */}
        <div
          data-testid="range-summary"
          style={{
            fontFamily: fonts.mono,
            fontSize: SUMMARY_TEXT_FONT_SIZE,
            letterSpacing: SUMMARY_TEXT_LETTER_SPACING,
            color: SUMMARY_TEXT_INK,
            whiteSpace: "nowrap",
          }}
        />
        <div
          style={{
            display: "flex",
            border: `1px solid ${PILL_BORDER}`,
            borderRadius: 999,
            overflow: "hidden",
            flex: "none",
          }}
        >
          <button
            type="button"
            aria-pressed={view === "names"}
            onClick={() => onSelectView("names")}
            style={pillStyle(view === "names")}
          >
            names
          </button>
          <button
            type="button"
            aria-pressed={view === "stave"}
            onClick={() => onSelectView("stave")}
            style={pillStyle(view === "stave")}
          >
            stave
          </button>
        </div>
      </div>
    </div>
  );
}
