import type { CSSProperties, JSX } from "react";
import type { LeadTarget, SessionSnapshot, Who } from "../practice/published";
import { pitchClassLabel, pitchHzOf } from "../theory/published";
import { judgementLabelOf } from "./cents-label";
import { fonts, leadCard, modeWords, paper } from "./theme";

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

// practice.session/REQ-014 — the Tuner glyph (three bars) drawn in the
// start circle while I lead is idle, in place of ▶. Rendered at every
// state — hidden (not unmounted) when not shown — so the card's DOM
// structure (practice.session/REQ-002/S5) never gains or loses a node as
// the mode or transport state changes; its bars carry no text, so hiding
// it this way never affects another element's textContent.
function TunerGlyph(props: { readonly visible: boolean }): JSX.Element {
  return (
    <div
      data-testid="tuner-glyph"
      style={{
        display: props.visible ? "flex" : "none",
        alignItems: "center",
        gap: modeWords.glyphGap,
      }}
    >
      {modeWords.glyphHeights.map((height, index) => (
        <div
          key={index}
          style={{
            width: modeWords.glyphBar,
            height,
            borderRadius: modeWords.glyphBar / 2,
            background: modeWords.glyphCentre,
            boxShadow: `0 0 0 2px ${modeWords.glyphOuter}`,
          }}
        />
      ))}
    </div>
  );
}

// practice.session/REQ-014 — the two mode words beneath the caption, in
// place of the progress bar, in every transport state.
function ModeWords(props: {
  readonly who: Who;
  readonly onWho: (who: Who) => void;
}): JSX.Element {
  const { who, onWho } = props;
  return (
    <div style={{ display: "flex", gap: modeWords.gap }}>
      <ModeWord
        testId="mode-word-tool"
        label="play along"
        selected={who === "tool"}
        onClick={() => onWho("tool")}
      />
      <ModeWord
        testId="mode-word-me"
        label="I lead"
        selected={who === "me"}
        onClick={() => onWho("me")}
      />
    </div>
  );
}

function ModeWord(props: {
  readonly testId: string;
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  const { testId, label, selected, onClick } = props;
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: `${modeWords.padding}px 0`,
        fontSize: TERM_FONT_SIZE_WORD,
        fontWeight: TERM_FONT_WEIGHT_WORD,
        color: selected ? paper.ink : paper.faint,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          marginTop: modeWords.barOffset,
          width: "100%",
          height: modeWords.barHeight,
          borderRadius: modeWords.barHeight / 2,
          background: selected ? paper.accent : "transparent",
        }}
      />
    </button>
  );
}

const TERM_FONT_SIZE_WORD = 12.5;
const TERM_FONT_WEIGHT_WORD = 600;

const JUDGEMENT_FONT_SIZE = 12.5;
const JUDGEMENT_FONT_WEIGHT = 600;

const NO_MIC_GAP = 4;
const NO_MIC_TOP_MARGIN = 10;
const NO_MIC_TITLE_WEIGHT = 600;
const NO_MIC_BODY_INK = paper.muted;

// The tempo stepper and term button, shared by every card layout — it never
// changes with the mode or the lead phase (practice.session/REQ-014:
// "the page unchanged otherwise").
function TempoStepper(props: {
  readonly snapshot: SessionSnapshot;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
}): JSX.Element {
  const { snapshot, onStepTempo, onOpenTempo } = props;
  return (
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
  );
}

function cardShellStyle(): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: CARD_GAP,
    padding: CARD_PADDING,
    background: CARD_BACKGROUND,
    border: CARD_BORDER,
    borderRadius: CARD_RADIUS,
  };
}

// practice.session/REQ-002, REQ-014, REQ-015 — play along idle/playing, and
// I lead idle and complete: all four share one start circle (▶/❚❚ or the
// Tuner glyph), one caption, and a second line that is either the mode
// words or (once the run has completed) the judgement "All held".
function IdleCard(props: {
  readonly snapshot: SessionSnapshot;
  readonly onTogglePlay: () => void;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
  readonly onWho: (who: Who) => void;
}): JSX.Element {
  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo, onWho } = props;
  const playing = isPlaying(snapshot.transport);
  const complete = snapshot.lead.phase === "complete";
  const tunerGlyphShown =
    snapshot.lead.who === "me" && (snapshot.lead.phase === "idle" || complete);
  const caption = complete
    ? (snapshot.lead.completeCaption ?? "")
    : snapshot.lead.phase === "idle" && snapshot.lead.who === "me"
      ? snapshot.lead.idleCaption
      : snapshot.caption;
  const judgement = complete ? judgementLabelOf(snapshot.lead) : null;

  return (
    <div
      data-testid="transport-card"
      style={{
        ...cardShellStyle(),
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        data-testid="start-circle"
        aria-label={playing ? "Stop" : "Play"}
        onClick={onTogglePlay}
        style={circleStyle()}
      >
        <TunerGlyph visible={tunerGlyphShown} />
        {tunerGlyphShown ? null : playing ? "❚❚" : "▶"}
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
        <div data-testid="position-caption" style={captionStyle()}>
          {caption}
        </div>
        {judgement === null ? (
          <ModeWords who={snapshot.lead.who} onWho={onWho} />
        ) : (
          <div
            data-testid="judgement"
            style={{
              fontSize: JUDGEMENT_FONT_SIZE,
              fontWeight: JUDGEMENT_FONT_WEIGHT,
              color: judgement.ink,
            }}
          >
            {judgement.text}
          </div>
        )}
      </div>
      <TempoStepper
        snapshot={snapshot}
        onStepTempo={onStepTempo}
        onOpenTempo={onOpenTempo}
      />
    </div>
  );
}

// practice.session/REQ-015, REQ-017 — the live card: ■ in place of the
// start circle, the target's letter large in the accent with its octave,
// the "<k> of <N>" caption and the judgement line.
function LiveCard(props: {
  readonly snapshot: SessionSnapshot;
  readonly target: LeadTarget;
  readonly onTogglePlay: () => void;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
}): JSX.Element {
  const { snapshot, target, onTogglePlay, onStepTempo, onOpenTempo } = props;
  const judgement = judgementLabelOf(snapshot.lead);

  return (
    <div
      data-testid="transport-card"
      style={{
        ...cardShellStyle(),
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        data-testid="stop-circle"
        aria-label="Stop"
        onClick={onTogglePlay}
        style={circleStyle()}
      >
        ■
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: MIDDLE_GAP,
          minWidth: 0,
          flex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span
            data-testid="target-letter"
            style={{
              fontFamily: fonts.display,
              fontSize: leadCard.targetLetterSize,
              color: paper.accent,
              lineHeight: 1,
            }}
          >
            {pitchClassLabel(target.note)}
          </span>
          <span
            data-testid="target-octave"
            style={{
              fontFamily: fonts.mono,
              fontSize: leadCard.octaveSize,
              fontWeight: 600,
              color: paper.muted,
            }}
          >
            {target.note.octave}
          </span>
          <span
            data-testid="target-hz"
            aria-hidden="true"
            style={{ display: "none" }}
          >
            {pitchHzOf(target.note).toFixed(1)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: MIDDLE_GAP,
            minWidth: 0,
          }}
        >
          <div data-testid="position-caption" style={captionStyle()}>
            {`${target.position} of ${snapshot.sequence.length}`}
          </div>
          {judgement !== null && (
            <div
              data-testid="judgement"
              style={{
                fontSize: JUDGEMENT_FONT_SIZE,
                fontWeight: JUDGEMENT_FONT_WEIGHT,
                color: judgement.ink,
              }}
            >
              {judgement.text}
            </div>
          )}
        </div>
      </div>
      <TempoStepper
        snapshot={snapshot}
        onStepTempo={onStepTempo}
        onOpenTempo={onOpenTempo}
      />
    </div>
  );
}

// practice.session/REQ-022 — "Can't hear — no microphone" with its
// explanation, the start circle and the mode words still shown; nothing
// modal.
function NoMicCard(props: {
  readonly snapshot: SessionSnapshot;
  readonly onTogglePlay: () => void;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
  readonly onWho: (who: Who) => void;
}): JSX.Element {
  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo, onWho } = props;

  return (
    <div data-testid="transport-card" style={cardShellStyle()}>
      <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
        <button
          type="button"
          data-testid="start-circle"
          aria-label="Play"
          onClick={onTogglePlay}
          style={circleStyle()}
        >
          <TunerGlyph visible />
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
          <div data-testid="position-caption" style={captionStyle()}>
            {snapshot.lead.idleCaption}
          </div>
          <ModeWords who={snapshot.lead.who} onWho={onWho} />
        </div>
        <TempoStepper
          snapshot={snapshot}
          onStepTempo={onStepTempo}
          onOpenTempo={onOpenTempo}
        />
      </div>
      <div
        data-testid="no-mic-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: NO_MIC_GAP,
          marginTop: NO_MIC_TOP_MARGIN,
        }}
      >
        <div
          style={{
            fontSize: leadCard.noMicTitleSize,
            fontWeight: NO_MIC_TITLE_WEIGHT,
            color: paper.ink,
          }}
        >
          Can&apos;t hear — no microphone
        </div>
        <div
          style={{
            fontSize: leadCard.noMicBodySize,
            lineHeight: leadCard.noMicLineHeight,
            color: NO_MIC_BODY_INK,
          }}
        >
          It was refused or isn&apos;t there. Allow the microphone for this
          site, then press I lead again.
        </div>
      </div>
    </div>
  );
}

function circleStyle(): CSSProperties {
  return {
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
  };
}

function captionStyle(): CSSProperties {
  return {
    fontFamily: fonts.mono,
    fontSize: CAPTION_FONT_SIZE,
    letterSpacing: CAPTION_LETTER_SPACING,
    color: CAPTION_INK,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

export function TransportCard(props: {
  readonly snapshot: SessionSnapshot;
  readonly onTogglePlay: () => void;
  readonly onStepTempo: (delta: -2 | 2) => void;
  readonly onOpenTempo: () => void;
  readonly onWho: (who: Who) => void;
}): JSX.Element {
  const { snapshot } = props;
  const { lead } = snapshot;

  if (lead.phase === "listening" && lead.target !== null) {
    return <LiveCard {...props} target={lead.target} />;
  }
  if (lead.phase === "cannot-hear") {
    return <NoMicCard {...props} />;
  }
  return <IdleCard {...props} />;
}
