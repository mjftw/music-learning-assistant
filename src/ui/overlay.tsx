import type { JSX } from "react";
import { paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference — named here rather than re-derived by eye.
const CLOSE_SIZE = 28;
const CLOSE_BORDER = paper.border;
// Single-use close button colour (mirrored in both InstrumentSheet and
// SettingsDrawer) — not lifted into theme.ts, per the codebase's convention
// of module-local one-off colours (see e.g. CircleOfFifths.tsx's PILL_BORDER).
const CLOSE_ICON_COLOR = "#5e564c";
const CLOSE_FONT_SIZE = 12;
const CLOSE_GLYPH = "✕";

const HEADER_TITLE_FONT_SIZE = 14;
const HEADER_TITLE_FONT_WEIGHT = 600;
const HEADER_BORDER = `1px solid ${paper.hairline}`;

export function OverlayScrim(props: {
  readonly open: boolean;
  readonly zIndex: number;
  readonly onClose: () => void;
}): JSX.Element {
  const { open, zIndex, onClose } = props;
  const display = open ? "flex" : "none";

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        background: paper.scrim,
        display,
        zIndex,
      }}
    />
  );
}

function OverlayCloseButton(props: {
  readonly ariaLabel: string;
  readonly onClose: () => void;
}): JSX.Element {
  const { ariaLabel, onClose } = props;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClose}
      style={{
        width: CLOSE_SIZE,
        height: CLOSE_SIZE,
        borderRadius: 999,
        border: `1px solid ${CLOSE_BORDER}`,
        background: "none",
        color: CLOSE_ICON_COLOR,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: CLOSE_FONT_SIZE,
        cursor: "pointer",
      }}
    >
      {CLOSE_GLYPH}
    </button>
  );
}

export function OverlayHeader(props: {
  readonly title: string;
  readonly padding: string;
  readonly closeAriaLabel: string;
  readonly onClose: () => void;
}): JSX.Element {
  const { title, padding, closeAriaLabel, onClose } = props;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding,
        borderBottom: HEADER_BORDER,
      }}
    >
      <div
        style={{
          fontSize: HEADER_TITLE_FONT_SIZE,
          fontWeight: HEADER_TITLE_FONT_WEIGHT,
          color: paper.ink,
        }}
      >
        {title}
      </div>
      <OverlayCloseButton ariaLabel={closeAriaLabel} onClose={onClose} />
    </div>
  );
}
