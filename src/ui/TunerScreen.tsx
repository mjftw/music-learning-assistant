import { memo, type JSX } from "react";
import type { TunerSnapshot } from "../practice/published";
import type { SpellingPreference } from "../theory/published";
import { fonts, paper } from "./theme";
import { TunerLevel } from "./TunerLevel";

// The header row — copied verbatim from the vendored visual reference
// (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
// 131-141) — named here rather than re-derived by eye.
const HEADER_ROW_PADDING = "14px 16px 2px";
const HEADER_ROW_GAP = 10;

const BACK_PILL_GAP = 8;
const BACK_PILL_PADDING = "7px 13px 7px 11px";
const BACK_PILL_BORDER = paper.border;
const BACK_PILL_BACKGROUND = paper.card;

const CHEVRON_FONT_SIZE = 15;
const CHEVRON_COLOR = paper.mutedMore;
const CHEVRON_GLYPH = "‹";

const LABEL_FONT_SIZE = 13;
const LABEL_FONT_WEIGHT = 600;

const INDICATOR_GAP = 7;
const INDICATOR_FONT_SIZE = 10.5;
const INDICATOR_FONT_WEIGHT = 600;
const INDICATOR_LETTER_SPACING = "0.08em";

const DOT_SIZE = 8;
const DOT_BORDER_WIDTH = 1.5;

// The indicator's two states (practice.tuner/REQ-001, REQ-007) — the
// reference's script-side `micInk`/`micDot`/`micRing` values, listed once
// here rather than inline per branch.
const LISTENING_INK = paper.muted;
const LISTENING_DOT = paper.accent;
const LISTENING_RING = paper.accent;
const NO_MIC_INK = paper.faint;
const NO_MIC_DOT = "transparent";
const NO_MIC_RING = paper.faint;

// practice.tuner/REQ-001 — "LISTENING" covers both "starting" (the
// microphone has been asked for but capture has not begun yet) and
// "listening" itself; only "cannot-hear" reads "NO MIC" (REQ-007). The
// screen is never shown while "off" outlives the render that opens it
// (App only renders this once `session.enterTuner()` has run), so that
// state never reaches here in practice.
function isListening(tuner: TunerSnapshot): boolean {
  return tuner.listening.kind !== "cannot-hear";
}

// The way in and out's shell (practice.tuner/REQ-001) — the header row
// (‹ Practice, the LISTENING/NO MIC indicator) plus the structural areas
// later tasks fill in: the level (T015), the stave strip (T016), the
// target row (T017) and the footer (T018). Empty now.
function TunerScreenComponent(props: {
  readonly tuner: TunerSnapshot;
  readonly spelling: SpellingPreference;
  readonly onLeave: () => void;
}): JSX.Element {
  const { tuner, spelling, onLeave } = props;
  const listening = isListening(tuner);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: HEADER_ROW_GAP,
          padding: HEADER_ROW_PADDING,
        }}
      >
        <button
          type="button"
          aria-label="Practice"
          onClick={onLeave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: BACK_PILL_GAP,
            padding: BACK_PILL_PADDING,
            border: `1px solid ${BACK_PILL_BORDER}`,
            borderRadius: 999,
            background: BACK_PILL_BACKGROUND,
            color: paper.ink,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: CHEVRON_FONT_SIZE,
              color: CHEVRON_COLOR,
              marginTop: -2,
            }}
          >
            {CHEVRON_GLYPH}
          </span>
          <span
            style={{ fontSize: LABEL_FONT_SIZE, fontWeight: LABEL_FONT_WEIGHT }}
          >
            Practice
          </span>
        </button>
        <span
          data-testid="mic-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: INDICATOR_GAP,
            fontFamily: fonts.mono,
            fontSize: INDICATOR_FONT_SIZE,
            fontWeight: INDICATOR_FONT_WEIGHT,
            letterSpacing: INDICATOR_LETTER_SPACING,
            color: listening ? LISTENING_INK : NO_MIC_INK,
          }}
        >
          <span
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: 999,
              boxSizing: "border-box",
              background: listening ? LISTENING_DOT : NO_MIC_DOT,
              border: `${DOT_BORDER_WIDTH}px solid ${
                listening ? LISTENING_RING : NO_MIC_RING
              }`,
            }}
          />
          <span>{listening ? "LISTENING" : "NO MIC"}</span>
        </span>
      </div>
      <TunerLevel tuner={tuner} spelling={spelling} />
      {/* T016 — the stave strip */}
      <div />
      {/* T017 — the target row */}
      <div />
      {/* T018 — the footer */}
      <div />
    </div>
  );
}

export const TunerScreen = memo(TunerScreenComponent);
