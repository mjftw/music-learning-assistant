import type { JSX } from "react";
import { paper, sheetRow } from "./theme";

// A 36×20 on/off switch for the Traversal sheet's Count-in, Rest bar and
// Loop rows (practice.session/REQ-020) — track `paper.accent` on /
// `paper.trackOff` off, a 14 px `paper.card` knob at left 3 (off) or 19
// (on). Never opens or closes itself (Article VI) — `on` is the caller's.
export function Switch(props: {
  readonly on: boolean;
  readonly onToggle: () => void;
  readonly label: string;
}): JSX.Element {
  const { on, onToggle, label } = props;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      style={{
        position: "relative",
        width: sheetRow.switchWidth,
        height: sheetRow.switchHeight,
        borderRadius: sheetRow.switchHeight / 2,
        border: "none",
        padding: 0,
        cursor: "pointer",
        background: on ? paper.accent : paper.trackOff,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: sheetRow.knobInset,
          left: on ? sheetRow.knobOnLeft : sheetRow.knobInset,
          width: sheetRow.knob,
          height: sheetRow.knob,
          borderRadius: sheetRow.knob / 2,
          background: paper.card,
          transition: "left .15s ease",
        }}
      />
    </button>
  );
}
