import type { JSX } from "react";
import { paper } from "./theme";
import { OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html
// — the settings drawer block) — named here rather than re-derived by eye.
const SCRIM_Z_INDEX = 5;
const PANEL_Z_INDEX = 6;
const PANEL_WIDTH = 266;
const PANEL_SHADOW = "-10px 0 30px rgba(28,25,22,.16)";

const HEADER_PADDING = "18px 18px 14px";

const ROW_PADDING = "15px 18px";
const ROW_BORDER = `1px solid ${paper.hairlineSoft}`;
const ROW_GAP = 14;

const ROW_TITLE_FONT_SIZE = 13;
const ROW_TITLE_FONT_WEIGHT = 600;

const ROW_DESCRIPTION_FONT_SIZE = 11.5;
const ROW_DESCRIPTION_LINE_HEIGHT = 1.35;
const ROW_DESCRIPTION_COLOR = paper.muted;
const ROW_DESCRIPTION_MARGIN_TOP = 3;

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const TRACK_ON_COLOR = paper.accent;
const TRACK_OFF_COLOR = paper.trackOff;

const KNOB_SIZE = 14;
const KNOB_TOP = 3;
const KNOB_LEFT_OFF = 3;
const KNOB_LEFT_ON = 19;
const KNOB_COLOR = paper.card;

// One row per display toggle — title and description verbatim from the
// visual reference. The whole row is the switch: its accessible name is the
// title alone (`aria-label` overrides the description text nested inside).
function Row(props: {
  readonly title: string;
  readonly description: string;
  readonly on: boolean;
  readonly onToggle: () => void;
}): JSX.Element {
  const { title, description, on, onToggle } = props;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={title}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: ROW_GAP,
        padding: ROW_PADDING,
        border: "none",
        borderBottom: ROW_BORDER,
        background: "none",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: ROW_TITLE_FONT_SIZE,
            fontWeight: ROW_TITLE_FONT_WEIGHT,
            color: paper.ink,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: ROW_DESCRIPTION_FONT_SIZE,
            lineHeight: ROW_DESCRIPTION_LINE_HEIGHT,
            color: ROW_DESCRIPTION_COLOR,
            marginTop: ROW_DESCRIPTION_MARGIN_TOP,
          }}
        >
          {description}
        </div>
      </div>
      <div
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: 999,
          background: on ? TRACK_ON_COLOR : TRACK_OFF_COLOR,
          position: "relative",
          flex: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: KNOB_TOP,
            left: on ? KNOB_LEFT_ON : KNOB_LEFT_OFF,
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            borderRadius: 999,
            background: KNOB_COLOR,
          }}
        />
      </div>
    </button>
  );
}

// Never opens itself (Article VI) — `open` is driven entirely by the
// caller's state; this component only ever asks to close, via `onClose`.
export function SettingsDrawer(props: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly staveNamesEnabled: boolean;
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly onToggleStaveNames: () => void;
  readonly onToggleDegrees: () => void;
  readonly onToggleRing: () => void;
}): JSX.Element {
  const {
    open,
    onClose,
    staveNamesEnabled,
    degreesEnabled,
    distanceRingEnabled,
    onToggleStaveNames,
    onToggleDegrees,
    onToggleRing,
  } = props;

  const display = open ? "flex" : "none";

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: PANEL_WIDTH,
          background: paper.card,
          borderLeft: `1px solid ${paper.drawerBorder}`,
          boxShadow: PANEL_SHADOW,
          display,
          flexDirection: "column",
          zIndex: PANEL_Z_INDEX,
        }}
      >
        <OverlayHeader
          title="Settings"
          padding={HEADER_PADDING}
          closeAriaLabel="Close settings"
          onClose={onClose}
        />
        <Row
          title="Note names on the stave"
          description="Label each notehead underneath"
          on={staveNamesEnabled}
          onToggle={onToggleStaveNames}
        />
        <Row
          title="Scale degrees"
          description="Number each note of the key, set into the arc"
          on={degreesEnabled}
          onToggle={onToggleDegrees}
        />
        <Row
          title="Distance ring"
          description="The arc and its note names — warm sharpward, cool flatward, from the key you are on"
          on={distanceRingEnabled}
          onToggle={onToggleRing}
        />
      </div>
    </>
  );
}
