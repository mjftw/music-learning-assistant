import type { JSX, ReactNode } from "react";
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

// Added for the Drone sheet (DroneSheet.tsx, changes/004-the-drone/design/
// Drone.dc.html markup lines 355-361) — a subtitle line under the title,
// and a trailing slot before the close button (the on/off switch). Both
// optional and rendered only when given, so every existing caller (none of
// which passes either) renders exactly as before.
const HEADER_SUBTITLE_FONT_SIZE = 11.5;
const HEADER_SUBTITLE_COLOR = paper.muted;
const HEADER_SUBTITLE_MARGIN_TOP = 4;
const HEADER_TRAILING_GAP = 12;

// The bottom-sheet shell shared by every sheet that slides up from the
// bottom edge (InstrumentSheet, TraversalSheet, TempoSheet) — geometry
// copied verbatim from the vendored visual reference
// (changes/003-hear-the-scale/design/hear-the-scale.dc.html, markup lines
// 145-146, 158-159 and 196-197). `open` is driven entirely by the caller;
// this shell never opens or closes itself (Article VI).
const SHEET_BACKGROUND = paper.card;
const SHEET_BORDER_TOP = `1px solid ${paper.drawerBorder}`;
const SHEET_RADIUS = "20px 20px 0 0";
const SHEET_SHADOW = "0 -10px 30px rgba(28,25,22,.16)";
// `display` still gates visibility (and so accessibility-tree membership —
// role queries exclude display:none subtrees) while closed; `transform` and
// `transition` are the vendored reference's slide, declared verbatim
// alongside it. Because `display` flips abruptly the transition does not
// animate in practice — an animated open/close would need a mount-then-
// slide pattern this task does not ask for.
const SHEET_TRANSITION = "transform .34s cubic-bezier(.32,.72,0,1)";
const SHEET_TRANSFORM_OPEN = "translateY(0)";
const SHEET_TRANSFORM_CLOSED = "translateY(110%)";

export function BottomSheet(props: {
  readonly open: boolean;
  readonly zIndex: number;
  readonly paddingBottom: number;
  readonly children: ReactNode;
}): JSX.Element {
  const { open, zIndex, paddingBottom, children } = props;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        background: SHEET_BACKGROUND,
        borderTop: SHEET_BORDER_TOP,
        borderRadius: SHEET_RADIUS,
        boxShadow: SHEET_SHADOW,
        display: open ? "flex" : "none",
        flexDirection: "column",
        paddingBottom,
        transform: open ? SHEET_TRANSFORM_OPEN : SHEET_TRANSFORM_CLOSED,
        transition: SHEET_TRANSITION,
        zIndex,
      }}
    >
      {children}
    </div>
  );
}

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

// Exported (beyond OverlayHeader's own use) for the Traversal sheet's
// Who-leads row, which has no title row to host it (C008_T016,
// practice.session/REQ-020) — the same 28 px circle, reused rather than
// duplicated.
export function OverlayCloseButton(props: {
  readonly ariaLabel: string;
  readonly onClose: () => void;
  readonly testId?: string;
}): JSX.Element {
  const { ariaLabel, onClose, testId } = props;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-testid={testId}
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
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  readonly trailing?: ReactNode;
  readonly padding: string;
  readonly closeAriaLabel: string;
  readonly onClose: () => void;
}): JSX.Element {
  const { title, subtitle, trailing, padding, closeAriaLabel, onClose } = props;

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
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            fontSize: HEADER_TITLE_FONT_SIZE,
            fontWeight: HEADER_TITLE_FONT_WEIGHT,
            color: paper.ink,
          }}
        >
          {title}
        </div>
        {subtitle !== undefined && (
          <div
            style={{
              fontSize: HEADER_SUBTITLE_FONT_SIZE,
              color: HEADER_SUBTITLE_COLOR,
              whiteSpace: "nowrap",
              marginTop: HEADER_SUBTITLE_MARGIN_TOP,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: HEADER_TRAILING_GAP,
          flex: "none",
        }}
      >
        {trailing}
        <OverlayCloseButton ariaLabel={closeAriaLabel} onClose={onClose} />
      </div>
    </div>
  );
}
