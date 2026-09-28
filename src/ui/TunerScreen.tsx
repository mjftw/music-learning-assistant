import { memo, useCallback, useRef, useState, type JSX } from "react";
import type { NoteJudged, TunerSnapshot } from "../practice/published";
import type { NoteRange, SpellingPreference } from "../theory/published";
import { TargetPill } from "./TargetPill";
import { TargetSheet } from "./TargetSheet";
import { fonts, paper } from "./theme";
import { TunerLevel } from "./TunerLevel";
import { TunerStave } from "./TunerStave";

// practice.tuner/REQ-005 — the strip's 2.5 s trail is the last 50 readings,
// oldest first (T016's brief).
const TRAIL_CAPACITY = 50;

function appendToTrail(
  trail: readonly NoteJudged[],
  reading: NoteJudged,
): readonly NoteJudged[] {
  const appended = [...trail, reading];
  return appended.length > TRAIL_CAPACITY
    ? appended.slice(appended.length - TRAIL_CAPACITY)
    : appended;
}

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
  readonly range: NoteRange;
  readonly onLeave: () => void;
  readonly onHold: () => void;
  readonly onPin: (position: number) => void;
  readonly onStep: (delta: -1 | 1) => void;
  readonly onClear: () => void;
}): JSX.Element {
  const { tuner, spelling, range, onLeave, onHold, onPin, onStep, onClear } =
    props;
  const listening = isListening(tuner);

  // practice.tuner/REQ-004/S6 — the Target sheet's open/closed state is
  // local to this screen: opening or closing it never touches the session.
  // Hold, Auto and a spiral wedge each close the sheet as they pin/clear the
  // target (the vendored reference's own `pickAuto`/`holdNote`/wedge `pick`,
  // each `sheet: false` alongside its target change) — composed here rather
  // than in TargetSheet, which only knows the handlers it was given.
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const handleOpenTarget = useCallback(() => setTargetSheetOpen(true), []);
  const handleCloseTarget = useCallback(() => setTargetSheetOpen(false), []);
  const handleAuto = useCallback(() => {
    onClear();
    setTargetSheetOpen(false);
  }, [onClear]);
  const handleHold = useCallback(() => {
    onHold();
    setTargetSheetOpen(false);
  }, [onHold]);
  const handlePin = useCallback(
    (position: number) => {
      onPin(position);
      setTargetSheetOpen(false);
    },
    [onPin],
  );

  // The strip's trail (practice.tuner/REQ-005) — a ring of the last 50
  // NoteJudged, oldest first, kept here (not in the session) so it is pure
  // view state: appended whenever `tuner.reading` becomes a genuinely new
  // reading (a fresh object each commit — domain/session.ts's
  // `commitTunerReading`), reset on a gap ("Play a note" — REQ-003/S3) or on
  // leaving the tuner (this component unmounts, discarding the ref, since
  // App only renders it while `screen === "tuner"`). Mutated directly during
  // render, not in an effect, because the trail this render hands to
  // TunerStave must already include the reading this same render just
  // received.
  const trailRef = useRef<readonly NoteJudged[]>([]);
  const lastReadingRef = useRef<NoteJudged | null>(null);
  if (tuner.reading === null) {
    trailRef.current = [];
    lastReadingRef.current = null;
  } else if (tuner.reading !== lastReadingRef.current) {
    lastReadingRef.current = tuner.reading;
    trailRef.current = appendToTrail(trailRef.current, tuner.reading);
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
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
      <div style={{ padding: "10px 16px 0" }}>
        <TunerStave tuner={tuner} trail={trailRef.current} />
      </div>
      <TargetPill
        tuner={tuner}
        onOpen={handleOpenTarget}
        onStep={onStep}
        onClear={onClear}
      />
      {/* T018 — the footer */}
      <div />
      <TargetSheet
        open={targetSheetOpen}
        tuner={tuner}
        spelling={spelling}
        range={range}
        trail={trailRef.current}
        onClose={handleCloseTarget}
        onAuto={handleAuto}
        onHold={handleHold}
        onPin={handlePin}
      />
    </div>
  );
}

export const TunerScreen = memo(TunerScreenComponent);
