import { memo, type JSX } from "react";
import type { Key, Scale, ScaleId } from "../theory/published";
import {
  pitchClassLabel,
  scalesForMode,
  spelledScaleOf,
} from "../theory/published";
import { fonts, paper } from "./theme";
import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/005-scale-selection/design/hear-the-scale.dc.html,
// markup lines 205-223, the `scalesSlide` sheet) — named here rather than
// re-derived by eye.
const SCRIM_Z_INDEX = 13;
const SHEET_Z_INDEX = 14;
const SHEET_PADDING_BOTTOM = 14;

const HEADER_PADDING = "16px 18px 12px";
const HEADER_HINT_FONT_SIZE = 11.5;
const HEADER_HINT_COLOR = paper.muted;

const ROW_PADDING = "10px 18px";
const CURRENT_ROW_BACKGROUND = "rgba(138,75,42,.08)";

const NAME_FONT_SIZE = 14;
const NAME_WEIGHT_CURRENT = 700;
const NAME_WEIGHT_DEFAULT = 600;

const FORMULA_FONT_SIZE = 11;
const FORMULA_COLOR = paper.muted;

const TICK_WIDTH = 14;
const TICK_FONT_SIZE = 13;
const TICK_COLOR = paper.accent;
const TICK_GLYPH = "✓";

function hintFor(key_: Key): string {
  return key_.mode === "major"
    ? "Major family · tap the inner ring for minor"
    : "Minor family · tap the outer ring for major";
}

// Never opens itself (Article VI) — `open` is driven entirely by the
// caller's state; this component only ever asks to close, via `onClose`
// (and `onPick`, which the caller also treats as a close).
// Wrapped in `React.memo` — `key_` and `chosenId` are compared by value and
// the handlers are `useCallback`-stabilised, so this never re-renders
// during playback.
function ScaleSheetComponent(props: {
  readonly open: boolean;
  readonly key_: Key;
  readonly chosenId: ScaleId;
  readonly onPick: (id: ScaleId) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const { open, key_, chosenId, onPick, onClose } = props;
  const scales = scalesForMode(key_.mode);

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
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>Scales on {pitchClassLabel(key_.tonic)}</span>
              <span
                style={{
                  fontSize: HEADER_HINT_FONT_SIZE,
                  fontWeight: 400,
                  color: HEADER_HINT_COLOR,
                }}
              >
                {hintFor(key_)}
              </span>
            </span>
          }
          padding={HEADER_PADDING}
          closeAriaLabel="Close scale sheet"
          onClose={onClose}
        />
        {scales.map((scale: Scale) => {
          const isCurrent = scale.id === chosenId;
          const spelled = spelledScaleOf(key_, scale);
          return (
            <button
              key={scale.id}
              type="button"
              aria-label={scale.name}
              onClick={() => onPick(scale.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: ROW_PADDING,
                border: "none",
                borderBottom: `1px solid ${paper.hairlineSoft}`,
                background: isCurrent ? CURRENT_ROW_BACKGROUND : "transparent",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: NAME_FONT_SIZE,
                    lineHeight: 1.1,
                    fontWeight: isCurrent
                      ? NAME_WEIGHT_CURRENT
                      : NAME_WEIGHT_DEFAULT,
                    color: isCurrent ? paper.accent : paper.ink,
                  }}
                >
                  {scale.name}
                </div>
                <div
                  data-testid="scale-formula"
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: FORMULA_FONT_SIZE,
                    color: FORMULA_COLOR,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {spelled.formulaLine}
                </div>
              </div>
              <div
                data-testid="scale-tick"
                style={{
                  width: TICK_WIDTH,
                  fontSize: TICK_FONT_SIZE,
                  color: TICK_COLOR,
                  textAlign: "right",
                  flex: "none",
                }}
              >
                {isCurrent ? TICK_GLYPH : ""}
              </div>
            </button>
          );
        })}
      </BottomSheet>
    </>
  );
}

export const ScaleSheet = memo(ScaleSheetComponent);
