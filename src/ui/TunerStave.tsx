import type { JSX } from "react";
import type { NoteJudged, TunerSnapshot, Verdict } from "../practice/published";
import { noteLabel, pitchHzOf, type Note } from "../theory/published";
import { formatCents } from "./cents-label";
import { ACCIDENTAL_GLYPH, diatonicIndex } from "./key-label";
import { fonts, paper, tuner } from "./theme";

// Geometry below is copied verbatim from the vendored visual reference
// (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
// 204-275, and the `st4` block's arithmetic at lines 1222-1279) — named
// here rather than re-derived by eye or copied as markup. `diatonicIndex`
// itself is shared with StaveView.tsx (./key-label.ts) rather than
// duplicated.
const CARD_WIDTH = 358;
const CARD_HEIGHT = 144;
const SVG_HEIGHT = 176;

const STAVE_LINE_X1 = 12;
const STAVE_LINE_X2 = 196;
const STAVE_TOP_LINE_Y = 86;
const STAVE_BOTTOM_LINE_Y = 126;
const STAVE_LINE_YS: readonly number[] = [86, 96, 106, 116, 126];
const STAVE_LINE_STROKE_WIDTH = 1;
const END_BAR_STROKE_WIDTH = 1.6;

const CLEF_X = 28;
const CLEF_Y = 108;
const CLEF_GLYPH = "𝄞";
const CLEF_FONT_SIZE = 36;

// y(i) = 126 − (i − 30)·5 — index 30 (E4) is the stave's bottom line, at
// the card's own y = 126; each diatonic step is 5 px.
const BASE_Y = 126;
const BOTTOM_LINE_INDEX = 30; // E4
const Y_STEP = 5;
function writtenY(index: number): number {
  return BASE_Y - (index - BOTTOM_LINE_INDEX) * Y_STEP;
}

// A note beyond the ledger range is instead written an octave (or two) in,
// under an 8va/15ma (too high) or 8vb/15mb (too low) mark. The design (
// `changes/007-hear-me/design/Tuner.dc.html` lines 1222-1241) uses two
// distinct thresholds rather than one shared one:
//
//  - the register decision (`REGISTER_HIGH_LIMIT`/`REGISTER_LOW_LIMIT`) is
//    made once, from whichever note governs the reading (the pinned target
//    when there is one, else the heard note) — it decides a single ±7
//    shift (`adj`) that is applied to the target's placement directly
//    (never re-wrapped), and to the heard note's placement as a baseline;
//  - the heard note's own correction loop then wraps that baseline into
//    the ledger range using its own, slightly wider bounds
//    (`WRAP_HIGH_INDEX`/`WRAP_LOW_INDEX`) — this is the loop that can
//    double up into 15ma/15mb, and it alone governs the heard note.
//
// `REGISTER_HIGH_LIMIT` and `WRAP_HIGH_INDEX` share a value (49 — C7 fits
// exactly, above it wraps) but `REGISTER_LOW_LIMIT` (24) sits one step
// above `WRAP_LOW_INDEX` (23 — E3 fits exactly): a heard E3 (raw index 23)
// is below the register decision's own threshold and so is written an
// octave up under 8vb, even though 23 itself already fits the heard note's
// own wrap floor.
const REGISTER_HIGH_LIMIT = BOTTOM_LINE_INDEX + 19; // 49
const REGISTER_LOW_LIMIT = BOTTOM_LINE_INDEX - 6; // 24
const WRAP_HIGH_INDEX = BOTTOM_LINE_INDEX + 19; // 49
const WRAP_LOW_INDEX = BOTTOM_LINE_INDEX - 7; // 23
const OCTAVE_SHIFT = 7; // diatonic steps in one octave

type OctaveMark = "" | "8va" | "15ma" | "8vb" | "15mb";

interface WrittenPosition {
  readonly index: number;
  readonly y: number;
  readonly mark: OctaveMark;
}

// The register decision: the single ±7 shift, if any, that governs both
// the target's placement and the heard note's baseline, from whichever raw
// index governs the reading (`referenceRawIndexOf`, below).
function registerAdjOf(referenceRawIndex: number): number {
  if (referenceRawIndex > REGISTER_HIGH_LIMIT) return -OCTAVE_SHIFT;
  if (referenceRawIndex < REGISTER_LOW_LIMIT) return OCTAVE_SHIFT;
  return 0;
}

// octLab: the octave mark for a total shift — ±7 → 8va/8vb, ±14 → 15ma/15mb.
function octaveMarkOf(totalShift: number): OctaveMark {
  if (totalShift === 0) return "";
  if (totalShift < 0) return totalShift <= -2 * OCTAVE_SHIFT ? "15ma" : "8va";
  return totalShift >= 2 * OCTAVE_SHIFT ? "15mb" : "8vb";
}

// The target is written at the raw index shifted once by the register
// decision's `adj` — never re-wrapped (the design's `place(tgt, 182)`,
// called without `own`).
function targetWrittenPositionOf(
  rawIndex: number,
  adj: number,
): WrittenPosition {
  const index = rawIndex + adj;
  return { index, y: writtenY(index), mark: octaveMarkOf(adj) };
}

// The heard note is written at the raw index shifted by the register
// decision's `adj`, then wrapped by its own correction loop so it always
// lands within the ledger range (the design's `place(r.m, 150, true)`, the
// `own`-only loop bounded by `WRAP_HIGH_INDEX`/`WRAP_LOW_INDEX`).
function heardWrittenPositionOf(
  rawIndex: number,
  adj: number,
): WrittenPosition {
  const base = rawIndex + adj;
  let ownShift = 0;
  while (base + ownShift > WRAP_HIGH_INDEX) ownShift -= OCTAVE_SHIFT;
  while (base + ownShift < WRAP_LOW_INDEX) ownShift += OCTAVE_SHIFT;
  const index = base + ownShift;
  return { index, y: writtenY(index), mark: octaveMarkOf(adj + ownShift) };
}

// The raw index that governs the register decision: the pinned target when
// there is one, else the heard note (the design's `ref`).
function referenceRawIndexOf(
  targetNote: Note | null,
  reading: NoteJudged | null,
): number | null {
  if (targetNote !== null) return diatonicIndex(targetNote);
  if (reading !== null) return diatonicIndex(reading.heard.nearest);
  return null;
}

interface Ledger {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

const LEDGER_LOW_START = BOTTOM_LINE_INDEX - 2; // 28
const LEDGER_HIGH_START = BOTTOM_LINE_INDEX + 10; // 40
const LEDGER_X_HALF = 12;
const LEDGER_STROKE_WIDTH = 1.1;

function ledgersFor(writtenIndex: number, x: number): readonly Ledger[] {
  const ledgers: Ledger[] = [];
  for (let v = LEDGER_LOW_START; v >= writtenIndex; v -= 2) {
    ledgers.push({
      x1: x - LEDGER_X_HALF,
      x2: x + LEDGER_X_HALF,
      y: writtenY(v),
    });
  }
  for (let v = LEDGER_HIGH_START; v <= writtenIndex; v += 2) {
    ledgers.push({
      x1: x - LEDGER_X_HALF,
      x2: x + LEDGER_X_HALF,
      y: writtenY(v),
    });
  }
  return ledgers;
}

const HEARD_X = 150;
const TARGET_X = 182;

const HEAD_RX = 8.2;
const HEAD_RY = 5.4;
const HEAD_INNER_RX = 4.4;
const HEAD_INNER_RY = 3;
const HEAD_INNER_ROTATE_DEGREES = -35;

// hy = guideY − cents·CENTS_TO_PX_DRIFT — at most ±50 cents (nearestNoteOf's
// own range), so the drift never exceeds ±3.5 px, never as far as the next
// staff position (practice.tuner/REQ-005).
const CENTS_TO_PX_DRIFT = 0.07;
const MAX_DRIFT_CENTS = 50;

const ACCIDENTAL_X_HEARD = 133;
const ACCIDENTAL_X_TARGET = 167;
const ACCIDENTAL_FONT_SIZE = 20;
const ACCIDENTAL_LOWERED_Y_ADJUST = -3; // a flat's descender needs a nudge up

const GUIDE_X1 = 52;
const GUIDE_X2 = 166;
const GUIDE_DASH = "2 4";
const GUIDE_STROKE_WIDTH = 1;

// The ±5 ¢ in-tune band's rect, shaded around the guide — a fixed geometry
// constant local to this view (the Produces interface consumes no
// practice/published constant), matching the design's own literal band
// arithmetic (`band` = 5, `PXC` = 0.07).
const BAND_HALF_WIDTH_CENTS = 5;
const BAND_X = 126;
const BAND_WIDTH = 48;
const BAND_RADIUS = 6;
const BAND_TOP_OFFSET = BAND_HALF_WIDTH_CENTS * CENTS_TO_PX_DRIFT + 6;
const BAND_HEIGHT = BAND_HALF_WIDTH_CENTS * CENTS_TO_PX_DRIFT * 2 + 12;

const CENTS_X = HEARD_X;
const CENTS_FONT_SIZE = 11;
const CENTS_TOP_OFFSET = 27;

const OCTAVE_MARK_FONT_SIZE = 14;
const OCTAVE_MARK_BELOW_OFFSET = 12;
const OCTAVE_MARK_ABOVE_OFFSET = 44;
const TARGET_MARK_BELOW_OFFSET = 12;
const TARGET_MARK_ABOVE_OFFSET = 30;
const OCTAVE_MARK_HEIGHT = 14; // for the centring pass below

const TRAIL_X_START = 52;
const TRAIL_X_END = 140;
const TRAIL_STROKE_WIDTH = 2.2;
const TRAIL_GRADIENT_ID = "tuner-stave-trail-fade";

// practice.tuner/REQ-005 — the trail's length in time: 2.5 s. Age 0 sits
// at TRAIL_X_END (the head), age TRAIL_MS sits at TRAIL_X_START, linear in
// between (trailXOf below).
export const TRAIL_MS = 2500;

// A trail point remembers the reading it came from, when it was taken (an
// injectable clock — TunerScreen owns it, never a raw `Date.now()`/
// `performance.now()` call here), and which unbroken run of readings it
// belongs to — a new run starts whenever a reading arrives after the
// reading had been cleared (silence), so two runs are never drawn joined by
// a line (REQ-005/S6).
export interface TrailPoint {
  readonly reading: NoteJudged;
  readonly atMs: number;
  readonly runId: number;
}

// x by age: age 0 (the newest point) sits at TRAIL_X_END, age TRAIL_MS sits
// at TRAIL_X_START; a point older than TRAIL_MS (a negative or >TRAIL_X_END-
// clamped x) is filtered out where `trailRenderPoints` is built, below.
function trailXOf(age: number): number {
  return TRAIL_X_END - (age / TRAIL_MS) * (TRAIL_X_END - TRAIL_X_START);
}

const COLUMN_LEFT = 214;
const COLUMN_RIGHT = 12;
const COLUMN_TOP = 30;
const COLUMN_BOTTOM = 30;
const COLUMN_CAPTION_FONT_SIZE = 9.5;
const COLUMN_CAPTION_LETTER_SPACING = "0.08em";
const COLUMN_VALUE_FONT_SIZE = 15;

const TONE_BY_VERDICT: Record<Verdict, string> = {
  sharp: tuner.sharp,
  flat: tuner.flat,
  "in-tune": tuner.inTune,
};

function pxValue(value: number): string {
  return `${Number(value.toFixed(2))}px`;
}

function hzText(hz: number | null): string {
  return hz === null ? "—" : `${hz.toFixed(1)} Hz`;
}

interface HeardPlacement {
  readonly position: WrittenPosition;
  readonly hy: number;
  readonly ledgers: readonly Ledger[];
}

function placeHeard(note: Note, cents: number, adj: number): HeardPlacement {
  const position = heardWrittenPositionOf(diatonicIndex(note), adj);
  const clampedCents = Math.max(
    -MAX_DRIFT_CENTS,
    Math.min(MAX_DRIFT_CENTS, cents),
  );
  return {
    position,
    hy: position.y - clampedCents * CENTS_TO_PX_DRIFT,
    ledgers: ledgersFor(position.index, HEARD_X),
  };
}

interface TargetPlacement {
  readonly position: WrittenPosition;
  readonly ledgers: readonly Ledger[];
}

function placeTarget(note: Note, adj: number): TargetPlacement {
  const position = targetWrittenPositionOf(diatonicIndex(note), adj);
  return { position, ledgers: ledgersFor(position.index, TARGET_X) };
}

function octaveMarkY(mark: OctaveMark, top: number, bottom: number): number {
  return mark.endsWith("b")
    ? Math.max(top, bottom) + OCTAVE_MARK_BELOW_OFFSET
    : Math.min(top, bottom) - OCTAVE_MARK_ABOVE_OFFSET;
}

function targetMarkY(mark: OctaveMark, y: number): number {
  return mark.endsWith("b")
    ? y + TARGET_MARK_BELOW_OFFSET
    : y - TARGET_MARK_ABOVE_OFFSET;
}

// Note (letter/octave) that governs the "<note> IS" caption and its Hz —
// the pinned target when there is a reading or one is pinned silently
// (practice.tuner/REQ-003/S2), else the reading's own nearest note
// (`reading.target` already carries whichever governs measurement — the
// pinned target, or the hysteresis-tracked nearest note on auto).
function referenceNoteOf(
  reading: NoteJudged | null,
  targetNote: Note | null,
): Note | null {
  return reading?.target ?? targetNote;
}

// The treble stave strip (practice.tuner/REQ-005): the heard note as a
// drifting whole-note head along a dotted guide, its cents, a trail of the
// last TRAIL_MS by TIME (x by age, oldest first, dropped past TRAIL_MS),
// the pinned target as a grey head to the right, 8va/8vb/15ma/15mb past the
// ledger range, and the HEARD / "<note> IS" Hz column. WHILE nothing is
// heard the head/cents/Hz clear as before but the trail carries on moving
// left, each run its own sub-path so a new run is never joined to the one
// silence left behind (S5, S6).
export function TunerStave(props: {
  readonly tuner: TunerSnapshot;
  readonly trail: readonly TrailPoint[];
  // The instant age is measured from: the newest reading's own time while
  // one is sounding (so a live render needs no clock read of its own), or
  // TunerScreen's injectable "now" while silent and the trail is still
  // aging (TunerScreen's own rAF-driven re-renders keep advancing it).
  readonly nowMs: number;
}): JSX.Element {
  const { tuner: snapshot, trail, nowMs } = props;
  const reading = snapshot.reading;
  const targetNote = snapshot.targetNote;

  // The register decision is made once, from whichever note governs the
  // reading (the pinned target when there is one, else the heard note —
  // `referenceRawIndexOf`), and its `adj` governs both placements below.
  const referenceRawIndex = referenceRawIndexOf(targetNote, reading);
  const adj = referenceRawIndex === null ? 0 : registerAdjOf(referenceRawIndex);

  // The trail's own register decision: `adj` above whenever something
  // governs it (a target, or the live reading — the same value while
  // sounding, matching today); in silence with no target, there is no
  // current reading to fall back on, so the newest trail point's own heard
  // note stands in instead (practice.tuner/REQ-005's amendment) rather than
  // the trail snapping to the un-shifted register.
  const newestTrailPoint = trail.length > 0 ? trail[trail.length - 1]! : null;
  const trailReferenceRawIndex =
    referenceRawIndex !== null
      ? referenceRawIndex
      : newestTrailPoint === null
        ? null
        : diatonicIndex(newestTrailPoint.reading.heard.nearest);
  const trailAdj =
    trailReferenceRawIndex === null ? 0 : registerAdjOf(trailReferenceRawIndex);

  const heard =
    reading === null
      ? null
      : placeHeard(reading.heard.nearest, reading.heard.cents, adj);
  const target = targetNote === null ? null : placeTarget(targetNote, adj);

  const tone =
    reading === null ? paper.faint : TONE_BY_VERDICT[reading.verdict];

  const heardMarkY =
    heard !== null && heard.position.mark !== ""
      ? octaveMarkY(heard.position.mark, heard.position.y, heard.hy)
      : null;
  const targetMarkYValue =
    target !== null && target.position.mark !== ""
      ? targetMarkY(target.position.mark, target.position.y)
      : null;

  // practice.tuner/REQ-005/S5 — the strip's vertical centring (`shift`,
  // below) must not jump the instant a note stops: while a reading shows,
  // this is simply `heard`; once it clears, as long as the trail is still
  // drawn the newest trail point's own placement (at the same `trailAdj`
  // the trail itself is drawn with) stands in, so `tops`/`bots` keep seeing
  // the same shape of contribution across the note stopping. Once the
  // trail has emptied too, this is `null` and the layout falls back to the
  // stave-lines-only baseline, exactly as an empty reading always did.
  // TRAIL_MS is used directly for all trail age calculations.
  const layoutHeard =
    heard !== null
      ? heard
      : newestTrailPoint === null
        ? null
        : placeHeard(
            newestTrailPoint.reading.heard.nearest,
            newestTrailPoint.reading.heard.cents,
            trailAdj,
          );
  const layoutHeardMarkY =
    layoutHeard !== null && layoutHeard.position.mark !== ""
      ? octaveMarkY(
          layoutHeard.position.mark,
          layoutHeard.position.y,
          layoutHeard.hy,
        )
      : null;

  // Centre whatever is drawn (clef, lines, heads, ledgers, labels) in the
  // 144-tall card; top-align if it can't fit — the design's own pass
  // (lines 1271-1279), reproduced with our simplified single-clef model.
  const tops: number[] = [82];
  const bots: number[] = [136];
  const centsTop =
    heard !== null
      ? Math.min(heard.position.y, heard.hy) - CENTS_TOP_OFFSET
      : null;
  if (layoutHeard !== null) {
    tops.push(
      Math.min(layoutHeard.position.y, layoutHeard.hy) - CENTS_TOP_OFFSET,
      layoutHeard.hy - 8,
    );
    bots.push(layoutHeard.hy + 8, layoutHeard.position.y + 8);
    if (layoutHeardMarkY !== null) {
      tops.push(layoutHeardMarkY);
      bots.push(layoutHeardMarkY + OCTAVE_MARK_HEIGHT);
    }
  }
  if (target !== null) {
    tops.push(target.position.y - 8);
    bots.push(target.position.y + 8);
    if (targetMarkYValue !== null) {
      tops.push(targetMarkYValue);
      bots.push(targetMarkYValue + OCTAVE_MARK_HEIGHT);
    }
  }
  const top = Math.min(...tops);
  const bot = Math.max(...bots);
  const shift =
    bot - top > CARD_HEIGHT - 16 ? 8 - top : CARD_HEIGHT / 2 - (top + bot) / 2;

  // x by age (practice.tuner/REQ-005/S5, S6) — each point placed by how old
  // it is relative to `nowMs` (age 0 at TRAIL_X_END, TRAIL_MS at
  // TRAIL_X_START), points older than TRAIL_MS dropped; the whole trail is
  // drawn with `trailAdj` (not a fresh register decision per point) so it
  // never jumps mid-trail as a historical point crosses a register
  // threshold on its own — matching the design's own `p.tot` applied
  // uniformly across `hist` (lines 1257-1264).
  const trailRenderPoints = trail
    .map((point) => ({
      x: trailXOf(nowMs - point.atMs),
      y: placeHeard(
        point.reading.heard.nearest,
        point.reading.heard.cents,
        trailAdj,
      ).hy,
      runId: point.runId,
    }))
    .filter((point) => point.x >= TRAIL_X_START && point.x <= TRAIL_X_END);

  // One sub-path per run (S6) — a run with a single point draws nothing for
  // that run; runs are concatenated with a space so `path`'s single `d`
  // never joins two runs with a line.
  const runSubpaths: string[] = [];
  let currentRunId: number | null = null;
  let currentRunCoords: string[] = [];
  const flushCurrentRun = (): void => {
    if (currentRunCoords.length > 1) {
      runSubpaths.push(`M ${currentRunCoords.join(" L ")}`);
    }
  };
  for (const point of trailRenderPoints) {
    if (point.runId !== currentRunId) {
      flushCurrentRun();
      currentRunId = point.runId;
      currentRunCoords = [];
    }
    currentRunCoords.push(`${point.x} ${point.y}`);
  }
  flushCurrentRun();
  const trailPath = runSubpaths.length > 0 ? runSubpaths.join(" ") : null;

  const referenceNote = referenceNoteOf(reading, targetNote);
  const referenceHz = referenceNote === null ? null : pitchHzOf(referenceNote);
  const referenceLabel =
    referenceNote === null ? "— IS" : `${noteLabel(referenceNote)} IS`;
  const heardHz = reading === null ? null : reading.heard.hz;

  return (
    <div
      style={{
        position: "relative",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: paper.card,
        border: `1px solid ${paper.borderSoft}`,
        borderRadius: 14,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: SVG_HEIGHT,
          transform: `translateY(${shift}px)`,
        }}
      >
        <svg
          viewBox={`0 0 ${CARD_WIDTH} ${SVG_HEIGHT}`}
          width={CARD_WIDTH}
          height={SVG_HEIGHT}
          style={{ position: "absolute", top: -1, left: -1 }}
        >
          <defs>
            <linearGradient
              id={TRAIL_GRADIENT_ID}
              gradientUnits="userSpaceOnUse"
              x1={TRAIL_X_START}
              y1={0}
              x2={TRAIL_X_END}
              y2={0}
            >
              <stop offset="0" stopColor={tone} stopOpacity={0} />
              <stop offset="1" stopColor={tone} stopOpacity={0.75} />
            </linearGradient>
          </defs>
          {heard !== null && (
            <rect
              x={BAND_X}
              y={heard.position.y - BAND_TOP_OFFSET}
              width={BAND_WIDTH}
              height={BAND_HEIGHT}
              rx={BAND_RADIUS}
              fill={tuner.band}
            />
          )}
          {STAVE_LINE_YS.map((y) => (
            <line
              key={y}
              x1={STAVE_LINE_X1}
              y1={y}
              x2={STAVE_LINE_X2}
              y2={y}
              stroke={paper.inkSoft}
              strokeWidth={STAVE_LINE_STROKE_WIDTH}
            />
          ))}
          <line
            x1={STAVE_LINE_X2}
            y1={STAVE_TOP_LINE_Y}
            x2={STAVE_LINE_X2}
            y2={STAVE_BOTTOM_LINE_Y}
            stroke={paper.inkSoft}
            strokeWidth={END_BAR_STROKE_WIDTH}
          />
          {target !== null && (
            <>
              {target.ledgers.map((ledger, index) => (
                <line
                  key={index}
                  x1={ledger.x1}
                  y1={ledger.y}
                  x2={ledger.x2}
                  y2={ledger.y}
                  stroke={paper.inkSoft}
                  strokeWidth={LEDGER_STROKE_WIDTH}
                />
              ))}
              <ellipse
                data-testid="target-head"
                cx={TARGET_X}
                cy={target.position.y}
                rx={HEAD_RX}
                ry={HEAD_RY}
                fill={tuner.targetHead}
              />
              <ellipse
                cx={TARGET_X}
                cy={target.position.y}
                rx={HEAD_INNER_RX}
                ry={HEAD_INNER_RY}
                transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${TARGET_X} ${target.position.y})`}
                fill={paper.card}
              />
            </>
          )}
          {heard !== null && (
            <>
              {heard.ledgers.map((ledger, index) => (
                <line
                  key={index}
                  x1={ledger.x1}
                  y1={ledger.y}
                  x2={ledger.x2}
                  y2={ledger.y}
                  stroke={paper.inkSoft}
                  strokeWidth={LEDGER_STROKE_WIDTH}
                />
              ))}
              <line
                x1={GUIDE_X1}
                y1={heard.position.y}
                x2={GUIDE_X2}
                y2={heard.position.y}
                stroke={paper.faint}
                strokeWidth={GUIDE_STROKE_WIDTH}
                strokeDasharray={GUIDE_DASH}
              />
            </>
          )}
          {/* practice.tuner/REQ-005/S5 — drawn on its own condition, not
              nested under `heard !== null`: the trail keeps moving while
              nothing is heard, well after the head/ledgers/guide above have
              gone. */}
          {trailPath !== null && (
            <path
              data-testid="trail"
              d={trailPath}
              fill="none"
              stroke={`url(#${TRAIL_GRADIENT_ID})`}
              strokeWidth={TRAIL_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {heard !== null && (
            <g
              data-testid="heard-head"
              style={{ transform: `translateY(${pxValue(heard.hy)})` }}
            >
              <ellipse
                cx={HEARD_X}
                cy={0}
                rx={HEAD_RX}
                ry={HEAD_RY}
                fill={tone}
              />
              <ellipse
                cx={HEARD_X}
                cy={0}
                rx={HEAD_INNER_RX}
                ry={HEAD_INNER_RY}
                transform={`rotate(${HEAD_INNER_ROTATE_DEGREES} ${HEARD_X} 0)`}
                fill={paper.card}
              />
            </g>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            left: CLEF_X,
            top: CLEF_Y,
            transform: "translate(-50%,-50%)",
            fontFamily: fonts.music,
            fontSize: CLEF_FONT_SIZE,
            lineHeight: 1,
            color: paper.inkSoft,
          }}
        >
          {CLEF_GLYPH}
        </div>
        {target !== null &&
          target.position.mark !== "" &&
          targetMarkYValue !== null && (
            <div
              style={{
                position: "absolute",
                left: TARGET_X,
                top: targetMarkYValue,
                transform: "translateX(-50%)",
                fontFamily: fonts.display,
                fontSize: OCTAVE_MARK_FONT_SIZE,
                fontStyle: "italic",
                lineHeight: 1,
                color: tuner.ghostInk,
              }}
            >
              {target.position.mark}
            </div>
          )}
        {target !== null &&
          targetNote !== null &&
          targetNote.accidental !== "natural" && (
            <div
              data-testid="target-accidental"
              style={{
                position: "absolute",
                left: ACCIDENTAL_X_TARGET,
                top:
                  target.position.y +
                  (targetNote.accidental === "flat"
                    ? ACCIDENTAL_LOWERED_Y_ADJUST
                    : 0),
                transform: "translate(-50%,-50%)",
                fontFamily: fonts.music,
                fontSize: ACCIDENTAL_FONT_SIZE,
                lineHeight: 1,
                color: tuner.ghostInk,
              }}
            >
              {ACCIDENTAL_GLYPH[targetNote.accidental]}
            </div>
          )}
        {heard !== null &&
          reading !== null &&
          reading.heard.nearest.accidental !== "natural" && (
            <div
              data-testid="heard-accidental"
              style={{
                position: "absolute",
                left: ACCIDENTAL_X_HEARD,
                top:
                  heard.hy +
                  (reading.heard.nearest.accidental === "flat"
                    ? ACCIDENTAL_LOWERED_Y_ADJUST
                    : 0),
                transform: "translate(-50%,-50%)",
                fontFamily: fonts.music,
                fontSize: ACCIDENTAL_FONT_SIZE,
                lineHeight: 1,
                color: tone,
              }}
            >
              {ACCIDENTAL_GLYPH[reading.heard.nearest.accidental]}
            </div>
          )}
        {heard !== null && reading !== null && centsTop !== null && (
          <div
            data-testid="strip-cents"
            style={{
              position: "absolute",
              left: CENTS_X,
              top: centsTop,
              transform: "translateX(-50%)",
              fontFamily: fonts.mono,
              fontSize: CENTS_FONT_SIZE,
              fontWeight: 600,
              lineHeight: 1,
              color: tone,
              whiteSpace: "nowrap",
            }}
          >
            {formatCents(reading.heard.cents)}
          </div>
        )}
        {heard !== null &&
          heard.position.mark !== "" &&
          heardMarkY !== null && (
            <div
              style={{
                position: "absolute",
                left: HEARD_X,
                top: heardMarkY,
                transform: "translateX(-50%)",
                fontFamily: fonts.display,
                fontSize: OCTAVE_MARK_FONT_SIZE,
                fontStyle: "italic",
                lineHeight: 1,
                color: paper.inkSoft,
              }}
            >
              {heard.position.mark}
            </div>
          )}
      </div>
      <div
        style={{
          position: "absolute",
          left: COLUMN_LEFT,
          right: COLUMN_RIGHT,
          top: COLUMN_TOP,
          bottom: COLUMN_BOTTOM,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: COLUMN_CAPTION_FONT_SIZE,
              letterSpacing: COLUMN_CAPTION_LETTER_SPACING,
              color: paper.faint,
            }}
          >
            HEARD
          </div>
          <div
            data-testid="heard-hz"
            style={{
              fontFamily: fonts.mono,
              fontSize: COLUMN_VALUE_FONT_SIZE,
              fontWeight: 600,
              color: tone,
            }}
          >
            {hzText(heardHz)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: COLUMN_CAPTION_FONT_SIZE,
              letterSpacing: COLUMN_CAPTION_LETTER_SPACING,
              color: paper.faint,
            }}
          >
            {referenceLabel}
          </div>
          <div
            data-testid="reference-hz"
            style={{
              fontFamily: fonts.mono,
              fontSize: COLUMN_VALUE_FONT_SIZE,
              fontWeight: 600,
              color: paper.inkMid,
            }}
          >
            {hzText(referenceHz)}
          </div>
        </div>
      </div>
    </div>
  );
}
