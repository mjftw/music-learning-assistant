import { memo, type JSX } from "react";
import type { DroneSound } from "../practice/published";
import { fonts, paper } from "./theme";
import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/004-the-drone/design/Drone.dc.html, drone sheet block,
// markup lines 353-394 — the `sheetFifth` "Plays" row at lines 368-380 is
// out of scope for this task) — named here rather than re-derived by eye.
const SCRIM_Z_INDEX = 15;
const SHEET_Z_INDEX = 16;
const SHEET_PADDING_BOTTOM = 14;

const HEADER_PADDING = "16px 18px 12px";
const HEADER_HZ_FONT_SIZE = 11.5;
const HEADER_HZ_COLOR = paper.muted;
const SUBTITLE_TEXT = "Follows the key on the circle · A = 440 Hz";

// The switch, drawn like SettingsDrawer.tsx's track/knob (its constants at
// lines 27-36) — copied here rather than imported, per the codebase's
// convention of module-local geometry constants.
const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const TRACK_ON_COLOR = paper.accent;
const TRACK_OFF_COLOR = paper.trackOff;
const KNOB_SIZE = 14;
const KNOB_TOP = 3;
const KNOB_LEFT_OFF = 3;
const KNOB_LEFT_ON = 19;
const KNOB_COLOR = paper.card;

const ROW_PADDING = "12px 18px";
const ROW_BORDER = `1px solid ${paper.hairlineSoft}`;
const ROW_TITLE_FONT_SIZE = 13;
const ROW_TITLE_FONT_WEIGHT = 600;
const ROW_HINT_FONT_SIZE = 11.5;
const ROW_HINT_COLOR = paper.muted;
const ROW_HINT_MARGIN_TOP = 3;

const PILL_MIN_WIDTH = 40;
const PILL_PADDING = "9px 10px 10px";
const PILL_RADIUS = 10;
const PILL_FONT_SIZE = 12.5;
const PILL_FONT_WEIGHT = 600;
const PILL_BACKGROUND_ACTIVE = paper.pillActive;
const PILL_INK_ACTIVE = "#4a4136";
const PILL_INK_INACTIVE = "#756c60";

const NOTE_PADDING = "12px 18px 2px";
const NOTE_FONT_SIZE = 11.5;
const NOTE_COLOR = paper.muted;
const NOTE_LINE_HEIGHT = 1.35;
const NOTE_TEXT =
  "Tap a note on the stave or in the names to hear it for one beat — over the drone, to check an interval.";

const SOUNDS: ReadonlyArray<DroneSound> = ["pure", "warm", "reed"];

const SOUND_HINTS: Record<DroneSound, string> = {
  pure: "Sine · easiest to hear beats against",
  warm: "Soft, organ-like",
  reed: "Buzzy · closest to a wind drone",
};

function DroneSwitch(props: {
  readonly on: boolean;
  readonly onToggle: () => void;
}): JSX.Element {
  const { on, onToggle } = props;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Drone"
      onClick={onToggle}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: 999,
        border: "none",
        background: on ? TRACK_ON_COLOR : TRACK_OFF_COLOR,
        position: "relative",
        flex: "none",
        cursor: "pointer",
        transition: "background .2s ease",
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
          transition: "left .2s ease",
        }}
      />
    </button>
  );
}

function SoundPill(props: {
  readonly sound: DroneSound;
  readonly active: boolean;
  readonly onPick: (sound: DroneSound) => void;
}): JSX.Element {
  const { sound, active, onPick } = props;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPick(sound)}
      style={{
        minWidth: PILL_MIN_WIDTH,
        textAlign: "center",
        padding: PILL_PADDING,
        borderRadius: PILL_RADIUS,
        border: "none",
        fontSize: PILL_FONT_SIZE,
        fontWeight: PILL_FONT_WEIGHT,
        lineHeight: 1.1,
        whiteSpace: "nowrap",
        cursor: "pointer",
        color: active ? PILL_INK_ACTIVE : PILL_INK_INACTIVE,
        background: active ? PILL_BACKGROUND_ACTIVE : "transparent",
      }}
    >
      {sound}
    </button>
  );
}

// Never starts, stops or retunes the drone, nor stops playback, because the
// sheet opened or closed (REQ-006) — every prop here is display or a
// handler owned by the caller; `open` is driven entirely by the caller
// (Article VI). Wrapped in `React.memo` (T032 precedent) — every prop is a
// primitive, a `DroneSound` or a `useCallback`-stabilised handler.
function DroneSheetComponent(props: {
  readonly open: boolean;
  readonly noteLabel: string;
  readonly hz: number;
  readonly on: boolean;
  readonly sound: DroneSound;
  readonly onToggle: () => void;
  readonly onPickSound: (sound: DroneSound) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const { open, noteLabel, hz, on, sound, onToggle, onPickSound, onClose } =
    props;

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        <OverlayHeader
          title={
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span>Drone</span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: HEADER_HZ_FONT_SIZE,
                  color: HEADER_HZ_COLOR,
                }}
              >
                {noteLabel} · {hz.toFixed(1)} Hz
              </span>
            </span>
          }
          subtitle={SUBTITLE_TEXT}
          trailing={<DroneSwitch on={on} onToggle={onToggle} />}
          padding={HEADER_PADDING}
          closeAriaLabel="Close drone sheet"
          onClose={onClose}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: ROW_PADDING,
            borderBottom: ROW_BORDER,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: ROW_TITLE_FONT_SIZE,
                fontWeight: ROW_TITLE_FONT_WEIGHT,
                whiteSpace: "nowrap",
              }}
            >
              Sound
            </div>
            <div
              style={{
                fontSize: ROW_HINT_FONT_SIZE,
                color: ROW_HINT_COLOR,
                marginTop: ROW_HINT_MARGIN_TOP,
              }}
            >
              {SOUND_HINTS[sound]}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flex: "none" }}>
            {SOUNDS.map((candidate) => (
              <SoundPill
                key={candidate}
                sound={candidate}
                active={candidate === sound}
                onPick={onPickSound}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            padding: NOTE_PADDING,
            fontSize: NOTE_FONT_SIZE,
            color: NOTE_COLOR,
            lineHeight: NOTE_LINE_HEIGHT,
          }}
        >
          {NOTE_TEXT}
        </div>
      </BottomSheet>
    </>
  );
}

export const DroneSheet = memo(DroneSheetComponent);
