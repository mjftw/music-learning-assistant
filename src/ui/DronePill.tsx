import { memo, type CSSProperties, type JSX } from "react";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/004-the-drone/design/Drone.dc.html, `layoutDisc`
// markup lines 57-68) — named here rather than re-derived by eye.
const DISC_LEFT = 189;
const DISC_TOP = 146;
const DISC_Z_INDEX = 2;

const PILL_BORDER_ON = "rgba(138,75,42,.35)";
const PILL_BORDER_OFF = paper.borderSoft; // "#ddd4c2"
const PILL_BACKGROUND_ON = "rgba(138,75,42,.10)";
const PILL_BACKGROUND_OFF = paper.card; // "#f7f3ea"

const PLAY_WIDTH = 24;
const PLAY_HEIGHT = 22;
const PLAY_FONT_SIZE = 8.5;
const PLAY_PADDING_LEFT = 3;
const PLAY_INK_ON = paper.accent;
const PLAY_INK_OFF = paper.muted; // "#6f675c"

const DIVIDER_WIDTH = 1;
const DIVIDER_HEIGHT = 12;
const DIVIDER_BACKGROUND = "#e0d7c5";

const STEP_WIDTH = 18;
const STEP_HEIGHT = 22;
const STEP_FONT_SIZE = 13;
const STEP_INK_AVAILABLE = "#5e564c";
const STEP_INK_UNAVAILABLE = "#c3baab";

const LABEL_FONT_SIZE = 11;
const LABEL_FONT_WEIGHT = 600;
const LABEL_MIN_WIDTH = 20;
const LABEL_INK_ON = paper.accent;
const LABEL_INK_OFF = paper.ink;

const SHEET_BUTTON_FONT_SIZE = 8;
const SHEET_BUTTON_INK = paper.faint; // "#9a9186"
const SHEET_BUTTON_PADDING = "0 8px 0 2px";
const SHEET_BUTTON_HEIGHT = 22;

function buttonBaseStyle(): CSSProperties {
  return {
    background: "transparent",
    border: "none",
    lineHeight: 1,
  };
}

function DronePillComponent(props: {
  readonly noteLabel: string;
  readonly on: boolean;
  readonly canStepDown: boolean;
  readonly canStepUp: boolean;
  readonly onToggle: () => void;
  readonly onStepOctave: (delta: -1 | 1) => void;
  readonly onOpenSheet: () => void;
}): JSX.Element {
  const {
    noteLabel,
    on,
    canStepDown,
    canStepUp,
    onToggle,
    onStepOctave,
    onOpenSheet,
  } = props;

  return (
    <div
      style={{
        position: "absolute",
        left: DISC_LEFT,
        top: DISC_TOP,
        transform: "translate(-50%,-50%)",
        zIndex: DISC_Z_INDEX,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${on ? PILL_BORDER_ON : PILL_BORDER_OFF}`,
          borderRadius: 999,
          background: on ? PILL_BACKGROUND_ON : PILL_BACKGROUND_OFF,
          transition: "background .2s ease, border-color .2s ease",
        }}
      >
        <button
          type="button"
          aria-label={on ? "Stop drone" : "Start drone"}
          aria-pressed={on}
          onClick={onToggle}
          style={{
            ...buttonBaseStyle(),
            width: PLAY_WIDTH,
            height: PLAY_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: PLAY_FONT_SIZE,
            paddingLeft: PLAY_PADDING_LEFT,
            color: on ? PLAY_INK_ON : PLAY_INK_OFF,
            cursor: "pointer",
          }}
        >
          {on ? "■" : "▶"}
        </button>
        <div
          style={{
            width: DIVIDER_WIDTH,
            height: DIVIDER_HEIGHT,
            background: DIVIDER_BACKGROUND,
          }}
        />
        <button
          type="button"
          aria-label="Drone octave down"
          aria-disabled={canStepDown ? undefined : "true"}
          onClick={canStepDown ? () => onStepOctave(-1) : undefined}
          style={{
            ...buttonBaseStyle(),
            width: STEP_WIDTH,
            height: STEP_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: STEP_FONT_SIZE,
            color: canStepDown ? STEP_INK_AVAILABLE : STEP_INK_UNAVAILABLE,
            cursor: canStepDown ? "pointer" : "default",
          }}
        >
          −
        </button>
        <span
          data-testid="drone-note"
          style={{
            fontFamily: fonts.mono,
            fontSize: LABEL_FONT_SIZE,
            fontWeight: LABEL_FONT_WEIGHT,
            minWidth: LABEL_MIN_WIDTH,
            textAlign: "center",
            color: on ? LABEL_INK_ON : LABEL_INK_OFF,
          }}
        >
          {noteLabel}
        </span>
        <button
          type="button"
          aria-label="Drone octave up"
          aria-disabled={canStepUp ? undefined : "true"}
          onClick={canStepUp ? () => onStepOctave(1) : undefined}
          style={{
            ...buttonBaseStyle(),
            width: STEP_WIDTH,
            height: STEP_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: STEP_FONT_SIZE,
            color: canStepUp ? STEP_INK_AVAILABLE : STEP_INK_UNAVAILABLE,
            cursor: canStepUp ? "pointer" : "default",
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Edit drone"
          onClick={onOpenSheet}
          style={{
            ...buttonBaseStyle(),
            fontSize: SHEET_BUTTON_FONT_SIZE,
            color: SHEET_BUTTON_INK,
            padding: SHEET_BUTTON_PADDING,
            height: SHEET_BUTTON_HEIGHT,
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

export const DronePill = memo(DronePillComponent);
