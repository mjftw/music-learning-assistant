import type { JSX } from "react";
import type { TunerSnapshot } from "../practice/published";
import { noteLabel } from "../theory/published";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup
// lines 183-203) — named here rather than re-derived by eye or copied as
// markup.
const ROW_HEIGHT = 38;
const ROW_PADDING = "6px 16px 0";

const AUTO_PILL_GAP = 9;
const AUTO_PILL_PADDING = "0 15px";
const AUTO_PILL_BORDER = "#e0d7c5";
const AUTO_PILL_BACKGROUND = paper.card;
const AUTO_CAPTION_FONT_SIZE = 9.5;
const AUTO_CAPTION_LETTER_SPACING = "0.08em";
const AUTO_CAPTION_COLOR = paper.faint;
const AUTO_LABEL_FONT_SIZE = 12;
const AUTO_LABEL_COLOR = paper.inkMid;
const AUTO_CHEVRON_FONT_SIZE = 9;
const AUTO_CHEVRON_COLOR = paper.faint;

// rgba(138,75,42,.35) / rgba(138,75,42,.10) — the accent colour (paper.accent
// is the same #8a4b2a) at the reference's own alpha, kept as module-local
// literals per the codebase's convention for a one-off tint (overlay.tsx's
// CLOSE_ICON_COLOR) rather than added to theme.ts for a single caller.
const PINNED_PILL_BORDER = "rgba(138,75,42,.35)";
const PINNED_PILL_BACKGROUND = "rgba(138,75,42,.10)";
const STEP_BUTTON_SIZE_WIDTH = 40;
const STEP_BUTTON_SIZE_HEIGHT = 36;
const STEP_BUTTON_FONT_SIZE = 17;
const STEP_BUTTON_COLOR = "#5e564c";
const STEP_BUTTON_DISABLED_OPACITY = 0.35; // not in the vendored reference (it draws no disabled state) — the minimum needed so REQ-004/S4's bounds read as inert, not just inactive
const MIDDLE_BUTTON_GAP = 8;
const MIDDLE_BUTTON_PADDING = "0 4px";
const MIDDLE_BUTTON_HEIGHT = 36;
const PINNED_CAPTION_FONT_SIZE = 9.5;
const PINNED_CAPTION_LETTER_SPACING = "0.08em";
const PINNED_CAPTION_COLOR = paper.accent;
const PINNED_LABEL_FONT_SIZE = 13;
const PINNED_LABEL_MIN_WIDTH = 30;
const DIVIDER_WIDTH = 1;
const DIVIDER_HEIGHT = 16;
const DIVIDER_COLOR = "#e0d7c5";
const CLEAR_BUTTON_FONT_SIZE = 11;

// practice.tuner/REQ-004 — the target pill row: auto reads "TARGET auto ·
// nearest ▼" and opens the Target sheet; pinned shows − / + (a semitone
// within E2–C7, disabled at the bounds — `canStepDown`/`canStepUp`), the
// pinned note (opens the sheet too), and ✕ (back to auto).
export function TargetPill(props: {
  readonly tuner: TunerSnapshot;
  readonly onOpen: () => void;
  readonly onStep: (delta: -1 | 1) => void;
  readonly onClear: () => void;
}): JSX.Element {
  const { tuner, onOpen, onStep, onClear } = props;

  if (tuner.target.kind === "auto") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: ROW_PADDING,
          height: ROW_HEIGHT,
        }}
      >
        <button
          type="button"
          aria-label="Target"
          onClick={onOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: AUTO_PILL_GAP,
            height: ROW_HEIGHT,
            boxSizing: "border-box",
            padding: AUTO_PILL_PADDING,
            border: `1px solid ${AUTO_PILL_BORDER}`,
            borderRadius: 999,
            background: AUTO_PILL_BACKGROUND,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: AUTO_CAPTION_FONT_SIZE,
              letterSpacing: AUTO_CAPTION_LETTER_SPACING,
              color: AUTO_CAPTION_COLOR,
            }}
          >
            TARGET
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: AUTO_LABEL_FONT_SIZE,
              fontWeight: 600,
              color: AUTO_LABEL_COLOR,
            }}
          >
            auto · nearest
          </span>
          <span
            style={{
              fontSize: AUTO_CHEVRON_FONT_SIZE,
              color: AUTO_CHEVRON_COLOR,
            }}
          >
            ▼
          </span>
        </button>
      </div>
    );
  }

  const targetLabel =
    tuner.targetNote === null ? "" : noteLabel(tuner.targetNote);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: ROW_PADDING,
        height: ROW_HEIGHT,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: ROW_HEIGHT,
          boxSizing: "border-box",
          border: `1px solid ${PINNED_PILL_BORDER}`,
          borderRadius: 999,
          background: PINNED_PILL_BACKGROUND,
        }}
      >
        <button
          type="button"
          aria-label="Target down"
          onClick={() => onStep(-1)}
          disabled={!tuner.canStepDown}
          style={{
            width: STEP_BUTTON_SIZE_WIDTH,
            height: STEP_BUTTON_SIZE_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: STEP_BUTTON_FONT_SIZE,
            lineHeight: 1,
            color: STEP_BUTTON_COLOR,
            background: "none",
            border: "none",
            cursor: tuner.canStepDown ? "pointer" : "default",
            opacity: tuner.canStepDown ? 1 : STEP_BUTTON_DISABLED_OPACITY,
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Target"
          onClick={onOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: MIDDLE_BUTTON_GAP,
            height: MIDDLE_BUTTON_HEIGHT,
            padding: MIDDLE_BUTTON_PADDING,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: PINNED_CAPTION_FONT_SIZE,
              letterSpacing: PINNED_CAPTION_LETTER_SPACING,
              color: PINNED_CAPTION_COLOR,
            }}
          >
            TARGET
          </span>
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: PINNED_LABEL_FONT_SIZE,
              fontWeight: 600,
              color: PINNED_CAPTION_COLOR,
              minWidth: PINNED_LABEL_MIN_WIDTH,
              textAlign: "center",
            }}
          >
            {targetLabel}
          </span>
        </button>
        <button
          type="button"
          aria-label="Target up"
          onClick={() => onStep(1)}
          disabled={!tuner.canStepUp}
          style={{
            width: STEP_BUTTON_SIZE_WIDTH,
            height: STEP_BUTTON_SIZE_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: STEP_BUTTON_FONT_SIZE,
            lineHeight: 1,
            color: STEP_BUTTON_COLOR,
            background: "none",
            border: "none",
            cursor: tuner.canStepUp ? "pointer" : "default",
            opacity: tuner.canStepUp ? 1 : STEP_BUTTON_DISABLED_OPACITY,
          }}
        >
          +
        </button>
        <div
          style={{
            width: DIVIDER_WIDTH,
            height: DIVIDER_HEIGHT,
            background: DIVIDER_COLOR,
          }}
        />
        <button
          type="button"
          aria-label="Auto"
          onClick={onClear}
          style={{
            width: STEP_BUTTON_SIZE_WIDTH,
            height: STEP_BUTTON_SIZE_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: CLEAR_BUTTON_FONT_SIZE,
            lineHeight: 1,
            color: PINNED_CAPTION_COLOR,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
