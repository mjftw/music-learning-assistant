import type { CSSProperties, JSX } from "react";
import type { SessionSnapshot } from "../practice/published";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference's bottom-panel transport card (changes/003-hear-the-scale/
// design/hear-the-scale.dc.html, markup lines 121-136; the play/stop glyph
// and "playing" flag mirror script lines 726-731, 805-810, 830-831) — named
// here rather than re-derived by eye.
const CARD_GAP = 12;
const CARD_PADDING = "12px 14px";
const CARD_BACKGROUND = paper.card;
const CARD_BORDER = `1px solid ${paper.borderSoft}`;
const CARD_RADIUS = 16;

const PLAY_SIZE = 56;
const PLAY_BACKGROUND = paper.accent;
const PLAY_INK = "#f9f4e9";
const PLAY_FONT_SIZE = 20;
const PLAY_FONT_WEIGHT = 600;

const MIDDLE_GAP = 7;

const CAPTION_FONT_SIZE = 10.5;
const CAPTION_LETTER_SPACING = "0.04em";
const CAPTION_INK = paper.muted;

const TRACK_HEIGHT = 3;
const TRACK_RADIUS = 2;
const TRACK_BACKGROUND = "#e0d7c5";
const FILL_BACKGROUND = paper.accent;

const RIGHT_GAP = 4;

const STEPPER_BORDER = "#e0d7c5";
const STEPPER_BACKGROUND = paper.disc;
const STEPPER_PADDING = "3px 4px";
const STEPPER_GAP = 2;

const STEP_BUTTON_SIZE = 26;
const STEP_BUTTON_FONT_SIZE = 15;
const STEP_BUTTON_INK = "#5e564c";

const TEMPO_FONT_SIZE = 13;
const TEMPO_FONT_WEIGHT = 600;
const TEMPO_MIN_WIDTH = 28;

const TERM_FONT_SIZE = 12.5;
const TERM_FONT_WEIGHT = 600;
const TERM_INK = paper.accent;

function stepButtonStyle(): CSSProperties {
  return {
    width: STEP_BUTTON_SIZE,
    height: STEP_BUTTON_SIZE,
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: STEP_BUTTON_FONT_SIZE,
    color: STEP_BUTTON_INK,
    lineHeight: 1,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  };
}

// The prototype's top-level `playing` flag covers counting-in, playing and
// resting alike — only `idle` shows the play glyph (script lines 726-731,
// 830-831).
function isPlaying(transport: SessionSnapshot["transport"]): boolean {
  return transport.kind !== "idle";
}

export function TransportCard(props: {
  readonly snapshot: SessionSnapshot;
  readonly onTogglePlay: () => void;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
}): JSX.Element {
  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo } = props;
  const playing = isPlaying(snapshot.transport);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: CARD_GAP,
        padding: CARD_PADDING,
        background: CARD_BACKGROUND,
        border: CARD_BORDER,
        borderRadius: CARD_RADIUS,
      }}
    >
      <button
        type="button"
        aria-label={playing ? "Stop" : "Play"}
        onClick={onTogglePlay}
        style={{
          width: PLAY_SIZE,
          height: PLAY_SIZE,
          borderRadius: 999,
          background: PLAY_BACKGROUND,
          color: PLAY_INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: PLAY_FONT_SIZE,
          fontWeight: PLAY_FONT_WEIGHT,
          lineHeight: 1,
          border: "none",
          cursor: "pointer",
          padding: 0,
          flex: "none",
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: MIDDLE_GAP,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div
          data-testid="position-caption"
          style={{
            fontFamily: fonts.mono,
            fontSize: CAPTION_FONT_SIZE,
            letterSpacing: CAPTION_LETTER_SPACING,
            color: CAPTION_INK,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {snapshot.caption}
        </div>
        <div
          style={{
            height: TRACK_HEIGHT,
            borderRadius: TRACK_RADIUS,
            background: TRACK_BACKGROUND,
            overflow: "hidden",
          }}
        >
          <div
            data-testid="progress-fill"
            style={{
              height: TRACK_HEIGHT,
              borderRadius: TRACK_RADIUS,
              background: FILL_BACKGROUND,
              width: `${snapshot.progress * 100}%`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: RIGHT_GAP,
          flex: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: STEPPER_GAP,
            border: `1px solid ${STEPPER_BORDER}`,
            borderRadius: 999,
            padding: STEPPER_PADDING,
            background: STEPPER_BACKGROUND,
          }}
        >
          <button
            type="button"
            aria-label="Slower"
            onClick={() => onStepTempo(-2)}
            style={stepButtonStyle()}
          >
            −
          </button>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: TEMPO_FONT_SIZE,
              fontWeight: TEMPO_FONT_WEIGHT,
              minWidth: TEMPO_MIN_WIDTH,
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            {snapshot.settings.tempoBpm}
          </div>
          <button
            type="button"
            aria-label="Faster"
            onClick={() => onStepTempo(2)}
            style={stepButtonStyle()}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onOpenTempo}
          style={{
            fontSize: TERM_FONT_SIZE,
            fontWeight: TERM_FONT_WEIGHT,
            lineHeight: 1,
            color: TERM_INK,
            whiteSpace: "nowrap",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {snapshot.tempoTerm.name}
        </button>
      </div>
    </div>
  );
}
