import { type JSX } from "react";
import type { NoteJudged, TunerSnapshot } from "../practice/published";
import {
  TUNER_HIGHEST_POSITION,
  TUNER_LOWEST_POSITION,
} from "../practice/published";
import {
  noteAtPosition,
  noteLabel,
  pitchPosition,
  type NoteRange,
  type SpellingPreference,
} from "../theory/published";
import { PitchSpiral } from "./PitchSpiral";
import { BottomSheet, OverlayHeader, OverlayScrim } from "./overlay";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/007-hear-me/design/Tuner.dc.html, frame #5c, markup
// lines 69-84 — the header and the Auto/Hold cards are the same block 4a's
// own target sheet uses, lines 290-306) — named here rather than re-derived
// by eye or copied as markup.
const SCRIM_Z_INDEX = 15;
const SHEET_Z_INDEX = 16;
const SHEET_PADDING_BOTTOM = 16;

const HEADER_PADDING = "16px 18px 12px";
const SUBTITLE_TEXT = "Measure from the nearest note, or pin one";

const CARDS_ROW_PADDING = "14px 18px 6px";
const CARDS_GAP = 8;
const CARD_PADDING = "11px 13px 12px";
const CARD_RADIUS = 12;
const CARD_TITLE_FONT_SIZE = 14;
const CARD_SUBTITLE_FONT_SIZE = 11.5;
const CARD_SUBTITLE_COLOR = paper.muted;

const AUTO_CARD_BORDER = "#e0d7c5";
const AUTO_CARD_BACKGROUND_ON = paper.pillActive;
const AUTO_TICK_COLOR = paper.accent;

const HOLD_CARD_BORDER_ON = "#e0d7c5";
const HOLD_CARD_BORDER_OFF = paper.hairlineSoft;
const HOLD_TITLE_COLOR_ON = paper.ink;
const HOLD_TITLE_COLOR_OFF = "#b0a797";
const HOLD_NAME_FONT_SIZE = 13;

const TAP_ROW_PADDING = "10px 18px 0";
const TAP_LABEL_FONT_SIZE = 13;
const TAP_RANGE_FONT_SIZE = 11;
const TAP_RANGE_COLOR = paper.muted;

const SPIRAL_WRAPPER_PADDING = "0 0 10px";

interface SpiralSpan {
  readonly lowest: number;
  readonly highest: number;
}

function spiralSpanOf(range: NoteRange, tuner: TunerSnapshot): SpiralSpan {
  const rangeLowest = pitchPosition(range.lowest);
  const rangeHighest = pitchPosition(range.highest);
  const nowPosition =
    tuner.reading === null ? null : pitchPosition(tuner.reading.heard.nearest);
  const pinnedPosition =
    tuner.target.kind === "pinned" ? tuner.target.position : null;
  const candidates = [
    TUNER_LOWEST_POSITION,
    rangeLowest,
    ...(nowPosition === null ? [] : [nowPosition]),
    ...(pinnedPosition === null ? [] : [pinnedPosition]),
  ];
  const highCandidates = [
    TUNER_HIGHEST_POSITION,
    rangeHighest,
    ...(nowPosition === null ? [] : [nowPosition]),
    ...(pinnedPosition === null ? [] : [pinnedPosition]),
  ];
  return {
    lowest: Math.min(...candidates),
    highest: Math.max(...highCandidates),
  };
}

function AutoCard(props: {
  readonly auto: boolean;
  readonly onAuto: () => void;
}): JSX.Element {
  const { auto, onAuto } = props;
  return (
    <button
      type="button"
      aria-label="Auto"
      onClick={onAuto}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: CARD_PADDING,
        borderRadius: CARD_RADIUS,
        border: `1px solid ${AUTO_CARD_BORDER}`,
        background: auto ? AUTO_CARD_BACKGROUND_ON : "transparent",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
          Auto
        </span>
        <span
          style={{
            fontSize: CARD_SUBTITLE_FONT_SIZE,
            color: CARD_SUBTITLE_COLOR,
          }}
        >
          nearest note
        </span>
      </span>
      <span style={{ fontSize: 13, color: AUTO_TICK_COLOR }}>
        {auto ? "✓" : ""}
      </span>
    </button>
  );
}

// practice.tuner/REQ-004/S7, S8 — the Hold card's three states: `active`
// (a reading showing, or the last note heard while nothing is) styles the
// card and shows `holdName`, exactly as the reading-showing state always
// did; `subtitle` carries which of the three texts applies.
function HoldCard(props: {
  readonly active: boolean;
  readonly holdName: string;
  readonly subtitle: string;
  readonly onHold: () => void;
}): JSX.Element {
  const { active, holdName, subtitle, onHold } = props;
  return (
    <button
      type="button"
      aria-label="Hold"
      onClick={onHold}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: CARD_PADDING,
        borderRadius: CARD_RADIUS,
        border: `1px solid ${active ? HOLD_CARD_BORDER_ON : HOLD_CARD_BORDER_OFF}`,
        background: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontSize: CARD_TITLE_FONT_SIZE,
            fontWeight: 600,
            color: active ? HOLD_TITLE_COLOR_ON : HOLD_TITLE_COLOR_OFF,
          }}
        >
          Hold
        </span>
        {active && (
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: HOLD_NAME_FONT_SIZE,
              fontWeight: 600,
              color: paper.inkMid,
            }}
          >
            {holdName}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: CARD_SUBTITLE_FONT_SIZE,
          color: CARD_SUBTITLE_COLOR,
          whiteSpace: "nowrap",
        }}
      >
        {subtitle}
      </span>
    </button>
  );
}

// practice.tuner/REQ-004 — the Target sheet: Auto, Hold, and the pitch
// spiral, on the shared BottomSheet shell. Never touches the session on
// open or close (REQ-004/S6) — `onAuto`/`onHold`/`onPin` are the only calls
// that reach the session, and only when the learner actually picks one.
export function TargetSheet(props: {
  readonly open: boolean;
  readonly tuner: TunerSnapshot;
  readonly spelling: SpellingPreference;
  readonly range: NoteRange;
  readonly trail: readonly NoteJudged[];
  readonly onClose: () => void;
  readonly onAuto: () => void;
  readonly onHold: () => void;
  readonly onPin: (position: number) => void;
}): JSX.Element {
  const {
    open,
    tuner,
    spelling,
    range,
    trail,
    onClose,
    onAuto,
    onHold,
    onPin,
  } = props;

  const span = spiralSpanOf(range, tuner);
  const rangeLowest = pitchPosition(range.lowest);
  const rangeHighest = pitchPosition(range.highest);
  const rangeLabel = `${noteLabel(noteAtPosition(span.lowest, spelling))}–${noteLabel(
    noteAtPosition(span.highest, spelling),
  )} · low in the middle`;

  // practice.tuner/REQ-004/S7, S8 — the note Hold would pin: the note
  // playing now, or, while nothing is heard, the last note heard.
  const holdNote =
    tuner.reading !== null ? tuner.reading.heard.nearest : tuner.lastHeard;
  const holdActive = holdNote !== null;
  const holdName = holdNote === null ? "" : noteLabel(holdNote);
  const holdSubtitle =
    tuner.reading !== null
      ? "what you're playing"
      : tuner.lastHeard !== null
        ? "the last note you played"
        : "play a note first";

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        {/* BottomSheet itself always renders its children (its own doc
            comment: `display` alone gates visibility, for every other
            sheet's sake). This sheet additionally gates its own content on
            `open` — REQ-004/S6 (closed means gone, not just off-screen: no
            lingering "Measure from the nearest note…" text, no reachable
            Auto/Hold/wedge buttons) and, practically, so the spiral's 57-
            wedge geometry is never computed while nobody can see it. */}
        {open && (
          <>
            <OverlayHeader
              title="Target"
              subtitle={SUBTITLE_TEXT}
              padding={HEADER_PADDING}
              closeAriaLabel="Close"
              onClose={onClose}
            />
            <div
              style={{
                display: "flex",
                gap: CARDS_GAP,
                padding: CARDS_ROW_PADDING,
              }}
            >
              <AutoCard auto={tuner.target.kind === "auto"} onAuto={onAuto} />
              <HoldCard
                active={holdActive}
                holdName={holdName}
                subtitle={holdSubtitle}
                onHold={onHold}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                padding: TAP_ROW_PADDING,
              }}
            >
              <div style={{ fontSize: TAP_LABEL_FONT_SIZE, fontWeight: 600 }}>
                Or tap a note
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: TAP_RANGE_FONT_SIZE,
                  color: TAP_RANGE_COLOR,
                }}
              >
                {rangeLabel}
              </div>
            </div>
            <div style={{ padding: SPIRAL_WRAPPER_PADDING }}>
              <PitchSpiral
                lowest={span.lowest}
                highest={span.highest}
                rangeLowest={rangeLowest}
                rangeHighest={rangeHighest}
                target={tuner.target}
                reading={tuner.reading}
                lastHeard={tuner.lastHeard}
                trail={trail}
                spelling={spelling}
                onPick={onPin}
              />
            </div>
          </>
        )}
      </BottomSheet>
    </>
  );
}
