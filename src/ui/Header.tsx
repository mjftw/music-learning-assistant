import { memo, type JSX } from "react";
import { paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html
// — the header row block) — named here rather than re-derived by eye.
const ROW_PADDING = "14px 16px 2px";
const ROW_GAP = 10;

const PILL_GAP = 8;
const PILL_PADDING = "7px 12px 7px 11px";
const PILL_BORDER = paper.border;
const PILL_BACKGROUND = paper.card;

const DOT_SIZE = 7;
const DOT_COLOR = paper.accent;

const LABEL_FONT_SIZE = 13;
const LABEL_FONT_WEIGHT = 600;

const RANGE_FONT_SIZE = 12;
const RANGE_COLOR = paper.mutedMore;

const CHEVRON_FONT_SIZE = 9;
const CHEVRON_COLOR = paper.faint;
const CHEVRON_GLYPH = "▼";

const GEAR_SIZE = 32;
const GEAR_BORDER = paper.border;
const GEAR_BACKGROUND = paper.card;
const GEAR_ICON_COLOR = paper.muted;
const GEAR_FONT_SIZE = 14;
const GEAR_GLYPH = "⚙";

// The instrument pill's accessible name is fixed as "Instrument" — what it
// opens, not the variant currently shown (that's the visible label/range
// text inside it).
// Wrapped in `React.memo` (T032) — `variantLabel`/`rangeLabel` are strings
// (compared by value) and the handlers are `useCallback`-stabilised in
// App, so this never re-renders during playback.
function HeaderComponent(props: {
  readonly variantLabel: string;
  readonly rangeLabel: string;
  readonly onOpenPicker: () => void;
  readonly onOpenSettings: () => void;
}): JSX.Element {
  const { variantLabel, rangeLabel, onOpenPicker, onOpenSettings } = props;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ROW_GAP,
        padding: ROW_PADDING,
      }}
    >
      <button
        type="button"
        aria-label="Instrument"
        onClick={onOpenPicker}
        style={{
          display: "flex",
          alignItems: "center",
          gap: PILL_GAP,
          padding: PILL_PADDING,
          border: `1px solid ${PILL_BORDER}`,
          borderRadius: 999,
          background: PILL_BACKGROUND,
          whiteSpace: "nowrap",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: 999,
            background: DOT_COLOR,
            flex: "none",
          }}
        />
        <span
          data-testid="current-variant"
          style={{ fontSize: LABEL_FONT_SIZE, fontWeight: LABEL_FONT_WEIGHT }}
        >
          {variantLabel}
        </span>
        <span style={{ fontSize: RANGE_FONT_SIZE, color: RANGE_COLOR }}>
          {rangeLabel}
        </span>
        <span style={{ fontSize: CHEVRON_FONT_SIZE, color: CHEVRON_COLOR }}>
          {CHEVRON_GLYPH}
        </span>
      </button>
      <button
        type="button"
        aria-label="Settings"
        onClick={onOpenSettings}
        style={{
          width: GEAR_SIZE,
          height: GEAR_SIZE,
          borderRadius: 999,
          border: `1px solid ${GEAR_BORDER}`,
          background: GEAR_BACKGROUND,
          color: GEAR_ICON_COLOR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: GEAR_FONT_SIZE,
          cursor: "pointer",
          flex: "none",
        }}
      >
        {GEAR_GLYPH}
      </button>
    </div>
  );
}

export const Header = memo(HeaderComponent);
