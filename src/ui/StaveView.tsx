import { memo, useLayoutEffect, type JSX } from "react";
import {
  inlineAccidentalsOf,
  signatureOf,
  type Accidental,
  type Key,
  type KeyViewNote,
  type Note,
  type Variant,
} from "../theory/published";
import {
  ACCIDENTAL_GLYPH,
  diatonicIndex,
  noteLabel,
  pitchClassLabel,
} from "./key-label";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference's bottom-panel stave (`buildStave()`, `diatonicIndex()` and the
// `PANEL_*` constants in changes/002-circle-redesign/design/
// Circle 1c Function Paper.dc.html) — named here rather than re-derived by
// eye. The reference also declares `PANEL_TOP_Y`/`panelY()`, but `buildStave`
// never calls `panelY` — it derives the top line from the literal `16`
// below instead, so that is what this view follows too.
const SVG_WIDTH = 342;
const TOP_Y_BASE = 16;
const PANEL_GAP = 10;
const PANEL_F5 = 5 * 7 + 3; // diatonic index of F5, the reference stave's top line
const PANEL_SIG_X0 = 42;
const PANEL_SIG_DX = 8.5;
const PANEL_NOTES_END = 318;

const STAVE_LINE_X1 = 10;
const STAVE_LINE_X2 = 332;
const STAVE_LINE_STROKE = paper.inkSoft;
const STAVE_LINE_STROKE_WIDTH = 1;
const LEDGER_STROKE_WIDTH = 1.1;
const LEDGER_OVERHANG = 3;
const LEDGER_LOW_INDEX = 28;
const LEDGER_HIGH_INDEX = 40;
const END_BAR_X = 332;
const END_BAR_STROKE_WIDTH = 1.6;

const STEM_LENGTH = 24;
const STEM_STROKE_WIDTH = 1.4;
const STEM_UP_THRESHOLD_INDEX = 34;
const STEM_X_INSET = 0.4;

const NOTEHEAD_TILT_DEGREES = -20;
const NOTEHEAD_RY_RATIO = 0.76;
const NOTEHEAD_RX_LARGE = 6.1;
const NOTEHEAD_RX_MEDIUM = 5.2;
const NOTEHEAD_RX_SMALL = 4.3;
const NOTEHEAD_RX_MEDIUM_THRESHOLD = 12;
const NOTEHEAD_RX_SMALL_THRESHOLD = 18;

const CLEF_X = 20;
const CLEF_GLYPH = "𝄞";
const CLEF_FONT_SIZE = 31;
const CLEF_COLOR = paper.inkSoft;

const NAME_FONT_WEIGHT = 600;
const NAME_SIZE_LARGE = 11.5;
const NAME_SIZE_MEDIUM = 10;
const NAME_SIZE_SMALL = 8.5;
const NAME_SIZE_MEDIUM_THRESHOLD = 12;
const NAME_SIZE_SMALL_THRESHOLD = 18;
const NAME_ROW_Y_OFFSET = 20;
const NAME_ROW_EXTRA_WITH_NAMES = 16;
const NAME_ROW_EXTRA_WITHOUT_NAMES = 12;
const HEIGHT_FLOOR_OFFSET = 72;

const SIG_GLYPH_SHARP_SIZE = 20;
const SIG_GLYPH_FLAT_SIZE = 24;
const SIG_GLYPH_FLAT_Y_ADJUST = 4.5;
const SHARP_STAFF_STEPS: readonly number[] = [0, 1.5, -0.5, 1, 2.5, 0.5, 2];
const FLAT_STAFF_STEPS: readonly number[] = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];
const SHARP_GLYPH_CHAR = "♯";
const FLAT_GLYPH_CHAR = "♭";

// Inline accidentals (theory.circle-of-fifths/REQ-003) — geometry copied
// verbatim from the vendored reference's `buildStave()` `accs` entries
// (changes/005-scale-selection/design/hear-the-scale.dc.html): offset left
// of the notehead, nudged up for a flat/double-flat's descender, sized off
// the notehead radius, in the same font as the clef.
const INLINE_ACCIDENTAL_X_OFFSET = 6.5;
const INLINE_ACCIDENTAL_LOWERED_Y_ADJUST = -3;
const INLINE_ACCIDENTAL_SIZE_RATIO = 2.7;
function isLowered(accidental: Accidental): boolean {
  return accidental === "flat" || accidental === "doubleFlat";
}

// Tonic emphasis (theory.circle-of-fifths/REQ-003) — the same accent used
// for the newest signature glyph, per the vendored reference.
const TONIC_INK = paper.accent;
const NOTE_INK = paper.ink;
const TONIC_NAME_INK = paper.accent;
const NAME_INK = paper.inkMid;
const SIG_GLYPH_ACCENT = paper.accent;
const SIG_GLYPH_INK = paper.inkSoft;

// The sounding note's highlight (practice.session/REQ-006) — the same
// accent colour as the tonic, enlarged with a soft halo behind it; every
// other notehead and stem dims while a sequence is playing.
const SOUNDING_INK = paper.accent;
const SOUNDING_HALO_FILL = "rgba(138,75,42,.13)";
const SOUNDING_RX_MULTIPLIER = 1.25;
const SOUNDING_HALO_RADIUS_MULTIPLIER = 2.5;
const DIM_OPACITY = 0.72;
const FULL_OPACITY = 1;

// A lead run's ink-behind / faint-ahead (practice.session/REQ-017/S8):
// notes up to and including the target are ink, the rest of the run is
// faint — a different dimming from `playing`'s uniform DIM_OPACITY, so the
// two never mix.
const LEAD_FAINT_OPACITY = 0.3;

type NoteOpacityMode =
  | { readonly kind: "none" }
  | { readonly kind: "playing"; readonly soundingRunIndex: number | null }
  | { readonly kind: "lead"; readonly targetRunIndex: number };

function noteOpacityOf(runIndex: number, mode: NoteOpacityMode): number {
  switch (mode.kind) {
    case "none":
      return FULL_OPACITY;
    case "playing":
      return mode.soundingRunIndex === runIndex ? FULL_OPACITY : DIM_OPACITY;
    case "lead":
      return runIndex <= mode.targetRunIndex
        ? FULL_OPACITY
        : LEAD_FAINT_OPACITY;
  }
}

// The tap target behind every notehead (practice.session/REQ-013) — wider
// than a narrow notehead's own spacing (`step`) so a cluster of notes
// stays tappable, and tall enough to span the stave regardless of a
// ledger line reaching above or below it. Geometry copied verbatim from
// the vendored reference's `hitX`/`hitW`/`hitY`/`hitH` (see the module
// comment above).
const HIT_RECT_MIN_WIDTH = 16;
const HIT_RECT_Y_INSET = 14;
const HIT_RECT_HEIGHT_PAD = 28;

interface StaveHead {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly tilt: string;
  readonly ink: string;
  readonly opacity: number;
  readonly isSounding: boolean;
  readonly stemX: number;
  readonly stemY1: number;
  readonly stemY2: number;
  readonly stemUp: boolean;
  readonly note: Note;
  readonly isRoot: boolean;
  readonly runIndex: number;
  readonly hitX: number;
  readonly hitY: number;
  readonly hitW: number;
  readonly hitH: number;
}

interface StaveLedger {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

interface StaveNameLabel {
  readonly x: number;
  readonly label: string;
  readonly ink: string;
}

interface StaveSignatureGlyph {
  readonly x: number;
  readonly y: number;
  readonly glyph: string;
  readonly size: number;
  readonly ink: string;
  readonly accented: boolean;
}

interface StaveInlineAccidental {
  readonly x: number;
  readonly y: number;
  readonly glyph: string;
  readonly size: number;
  readonly ink: string;
  readonly opacity: number;
  readonly runIndex: number;
}

interface StaveGeometry {
  readonly height: number;
  readonly viewBox: string;
  readonly heads: readonly StaveHead[];
  readonly ledgers: readonly StaveLedger[];
  readonly lineYs: readonly number[];
  readonly sig: readonly StaveSignatureGlyph[];
  readonly accs: readonly StaveInlineAccidental[];
  readonly names: readonly StaveNameLabel[];
  readonly nameRowY: number;
  readonly nameSize: number;
  readonly barTop: number;
  readonly barBottom: number;
  readonly clefY: number;
  readonly haloRadius: number;
}

// Mirrors the reference's `buildStave()`: lays a run of notes onto one
// system, sizing the box to whatever ledger lines the extremes need.
function buildStave(
  notes: readonly KeyViewNote[],
  inlineAccidentals: readonly (Accidental | null)[],
  staffSteps: readonly number[],
  signatureCount: number,
  signatureGlyph: string,
  signatureGlyphSize: number,
  signatureGlyphYAdjust: number,
  withNames: boolean,
  soundingRunIndex: number | null,
  playing: boolean,
  leadTargetRunIndex: number | null,
): StaveGeometry {
  const indices = notes.map((entry) => diatonicIndex(entry.note));
  const highest = Math.max(...indices, PANEL_F5);
  const lowest = Math.min(...indices, PANEL_F5 - 8);
  const topY =
    TOP_Y_BASE + Math.max(0, Math.ceil((highest - PANEL_F5) / 2)) * PANEL_GAP;
  const y = (index: number): number =>
    topY + (PANEL_F5 - index) * (PANEL_GAP / 2);
  const nameRowY = Math.max(
    y(lowest) + NAME_ROW_Y_OFFSET,
    topY + 4 * PANEL_GAP + NAME_ROW_Y_OFFSET,
  );

  const rx =
    notes.length > NOTEHEAD_RX_SMALL_THRESHOLD
      ? NOTEHEAD_RX_SMALL
      : notes.length > NOTEHEAD_RX_MEDIUM_THRESHOLD
        ? NOTEHEAD_RX_MEDIUM
        : NOTEHEAD_RX_LARGE;
  const sigEnd =
    signatureCount === 0
      ? PANEL_SIG_X0
      : PANEL_SIG_X0 + (signatureCount - 1) * PANEL_SIG_DX + 7;
  const x0 = Math.max(sigEnd + 14, 62);
  const step =
    notes.length > 1 ? (PANEL_NOTES_END - x0) / (notes.length - 1) : 0;

  const heads: StaveHead[] = [];
  const ledgers: StaveLedger[] = [];
  const names: StaveNameLabel[] = [];
  const accs: StaveInlineAccidental[] = [];

  notes.forEach((entry, index) => {
    const { note, isRoot } = entry;
    const index_ = diatonicIndex(note);
    const x = x0 + index * step;
    const ny = y(index_);
    const stemUp = index_ < STEM_UP_THRESHOLD_INDEX;
    // No longer requires `playing` — REQ-013's tapped highlight applies
    // idle too; REQ-006's dim-the-rest still only applies while playing
    // (below), so a tap's highlight is never accompanied by a dim. A lead
    // run's target (REQ-017) is highlighted the same way, in place of
    // `soundingRunIndex`.
    const isSounding =
      leadTargetRunIndex !== null
        ? leadTargetRunIndex === index
        : soundingRunIndex === index;
    const ink = isSounding ? SOUNDING_INK : isRoot ? TONIC_INK : NOTE_INK;
    const opacity = noteOpacityOf(
      index,
      leadTargetRunIndex !== null
        ? { kind: "lead", targetRunIndex: leadTargetRunIndex }
        : playing
          ? { kind: "playing", soundingRunIndex }
          : { kind: "none" },
    );
    const headRx = isSounding ? rx * SOUNDING_RX_MULTIPLIER : rx;
    const hitW = Math.max(step, HIT_RECT_MIN_WIDTH);
    const hitY = Math.min(ny, topY) - HIT_RECT_Y_INSET;
    const hitH = Math.abs(ny - topY) + 4 * PANEL_GAP + HIT_RECT_HEIGHT_PAD;

    for (let v = LEDGER_LOW_INDEX; v >= index_; v -= 2) {
      ledgers.push({
        x1: x - rx - LEDGER_OVERHANG,
        x2: x + rx + LEDGER_OVERHANG,
        y: y(v),
      });
    }
    for (let v = LEDGER_HIGH_INDEX; v <= index_; v += 2) {
      ledgers.push({
        x1: x - rx - LEDGER_OVERHANG,
        x2: x + rx + LEDGER_OVERHANG,
        y: y(v),
      });
    }

    heads.push({
      x,
      y: ny,
      rx: headRx,
      ry: headRx * NOTEHEAD_RY_RATIO,
      tilt: `rotate(${NOTEHEAD_TILT_DEGREES} ${x.toFixed(1)} ${ny.toFixed(1)})`,
      ink,
      opacity,
      isSounding,
      stemX: stemUp ? x + rx - STEM_X_INSET : x - rx + STEM_X_INSET,
      stemY1: ny,
      stemY2: stemUp ? ny - STEM_LENGTH : ny + STEM_LENGTH,
      stemUp,
      note,
      isRoot,
      runIndex: index,
      hitX: x - hitW / 2,
      hitY,
      hitW,
      hitH,
    });

    const inlineAccidental = inlineAccidentals[index];
    if (inlineAccidental != null) {
      accs.push({
        x: x - rx - INLINE_ACCIDENTAL_X_OFFSET,
        y:
          ny +
          (isLowered(inlineAccidental)
            ? INLINE_ACCIDENTAL_LOWERED_Y_ADJUST
            : 0),
        glyph: ACCIDENTAL_GLYPH[inlineAccidental],
        size: Math.round(rx * INLINE_ACCIDENTAL_SIZE_RATIO),
        ink,
        opacity,
        runIndex: index,
      });
    }

    if (withNames) {
      names.push({
        x,
        label: pitchClassLabel(note),
        ink: isSounding ? SOUNDING_INK : isRoot ? TONIC_NAME_INK : NAME_INK,
      });
    }
  });

  const lineYs = Array.from(
    { length: 5 },
    (_, index) => topY + index * PANEL_GAP,
  );

  const sig: StaveSignatureGlyph[] = [];
  for (let index = 0; index < signatureCount; index += 1) {
    const staffStep = staffSteps[index];
    if (staffStep === undefined)
      throw new Error("unreachable: signature longer than its staff steps");
    const accented = index === signatureCount - 1;
    sig.push({
      x: PANEL_SIG_X0 + index * PANEL_SIG_DX,
      y: topY + staffStep * PANEL_GAP - signatureGlyphYAdjust,
      glyph: signatureGlyph,
      size: signatureGlyphSize,
      ink: accented ? SIG_GLYPH_ACCENT : SIG_GLYPH_INK,
      accented,
    });
  }

  const height = Math.max(
    nameRowY +
      (withNames ? NAME_ROW_EXTRA_WITH_NAMES : NAME_ROW_EXTRA_WITHOUT_NAMES),
    topY + HEIGHT_FLOOR_OFFSET,
  );

  return {
    height,
    viewBox: `0 0 ${SVG_WIDTH} ${height}`,
    heads,
    ledgers,
    lineYs,
    sig,
    accs,
    names,
    nameRowY,
    nameSize:
      notes.length > NAME_SIZE_SMALL_THRESHOLD
        ? NAME_SIZE_SMALL
        : notes.length > NAME_SIZE_MEDIUM_THRESHOLD
          ? NAME_SIZE_MEDIUM
          : NAME_SIZE_LARGE,
    barTop: topY,
    barBottom: topY + 4 * PANEL_GAP,
    clefY: topY + 18,
    haloRadius: rx * SOUNDING_HALO_RADIUS_MULTIPLIER,
  };
}

// The hand-drawn SVG stave that replaced VexFlow (ADR 0002) — renders the
// traversal's run (theory.circle-of-fifths/REQ-003, REQ-012), ordered lowest
// to highest with the root emphasised, and the note names underneath only
// when enabled (REQ-007). `variant` is carried in the props for interface
// parity with the rest of the key view even though this component no longer
// derives the run itself — the caller (App.tsx) already fits it to the
// variant via `traversalOf` before passing `notes` down.
// A fixer finding (REQ-017): the stave must not re-render per reading (the
// plan's constraint) — `App` re-renders on every reading (the live card),
// and `leadTarget` is now memoized on the run index alone, but `React.memo`
// here is the belt as well as the braces, since every other prop (`notes`,
// `variant`, `onTapNote`, `onTargetBox`) is already stable across a reading.
export const StaveView = memo(function StaveView(props: {
  readonly key_: Key;
  readonly variant: Variant;
  readonly notes: readonly KeyViewNote[];
  readonly staveNamesEnabled: boolean;
  readonly soundingRunIndex: number | null;
  readonly playing: boolean;
  readonly onTapNote: (runIndex: number) => void;
  readonly tapsEnabled: boolean;
  readonly leadTarget?: { readonly runIndex: number } | null;
  readonly onTargetBox?: (
    box: { readonly x: number; readonly y: number } | null,
  ) => void;
}): JSX.Element {
  const {
    key_,
    notes,
    staveNamesEnabled,
    soundingRunIndex,
    playing,
    onTapNote,
    tapsEnabled,
    leadTarget = null,
    onTargetBox,
  } = props;

  const signature = signatureOf(key_);
  const isFlat = signature.kind === "flats";
  const staffSteps = isFlat ? FLAT_STAFF_STEPS : SHARP_STAFF_STEPS;
  const signatureGlyph = isFlat ? FLAT_GLYPH_CHAR : SHARP_GLYPH_CHAR;
  const signatureGlyphSize = isFlat
    ? SIG_GLYPH_FLAT_SIZE
    : SIG_GLYPH_SHARP_SIZE;
  const signatureGlyphYAdjust = isFlat ? SIG_GLYPH_FLAT_Y_ADJUST : 0;
  const inlineAccidentals = inlineAccidentalsOf(signature, notes);

  const stave = buildStave(
    notes,
    inlineAccidentals,
    staffSteps,
    signature.count,
    signatureGlyph,
    signatureGlyphSize,
    signatureGlyphYAdjust,
    staveNamesEnabled,
    soundingRunIndex,
    playing,
    leadTarget?.runIndex ?? null,
  );

  const targetHead =
    leadTarget === null
      ? null
      : (stave.heads.find((head) => head.runIndex === leadTarget.runIndex) ??
        null);

  // The stave must never re-render per reading (the plan's constraint):
  // `App` positions `NoteMeter` from this box, so it reads the target
  // head's own centre rather than the DOM — this effect only reports a new
  // box when the target (or its geometry) actually changes.
  useLayoutEffect(() => {
    if (onTargetBox === undefined) return;
    onTargetBox(
      targetHead === null ? null : { x: targetHead.x, y: targetHead.y },
    );
  }, [leadTarget?.runIndex, targetHead?.x, targetHead?.y, onTargetBox]);

  return (
    <div
      data-testid="stave"
      style={{ position: "relative", width: SVG_WIDTH, height: stave.height }}
    >
      <svg
        viewBox={stave.viewBox}
        width={SVG_WIDTH}
        height={stave.height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {stave.ledgers.map((ledger, index) => (
          <line
            key={index}
            x1={ledger.x1}
            y1={ledger.y}
            x2={ledger.x2}
            y2={ledger.y}
            stroke={STAVE_LINE_STROKE}
            strokeWidth={LEDGER_STROKE_WIDTH}
          />
        ))}
        {stave.lineYs.map((lineY) => (
          <line
            key={lineY}
            x1={STAVE_LINE_X1}
            y1={lineY}
            x2={STAVE_LINE_X2}
            y2={lineY}
            stroke={STAVE_LINE_STROKE}
            strokeWidth={STAVE_LINE_STROKE_WIDTH}
          />
        ))}
        <line
          x1={END_BAR_X}
          y1={stave.barTop}
          x2={END_BAR_X}
          y2={stave.barBottom}
          stroke={STAVE_LINE_STROKE}
          strokeWidth={END_BAR_STROKE_WIDTH}
        />
        {stave.heads.map((head) => (
          <g
            key={head.runIndex}
            data-testid="stave-note"
            data-note={noteLabel(head.note)}
            data-root={head.isRoot ? "true" : "false"}
            // cx/cy/rx/fill/opacity mirror the notehead ellipse below —
            // read-only probes so a test (and `onTargetBox`) can reach the
            // head's own geometry and styling without `querySelector`;
            // they carry no visual meaning on a `<g>`.
            cx={head.x}
            cy={head.y}
            rx={head.rx}
            fill={head.ink}
            opacity={head.opacity}
          >
            <line
              x1={head.stemX}
              y1={head.stemY1}
              x2={head.stemX}
              y2={head.stemY2}
              stroke={head.ink}
              strokeWidth={STEM_STROKE_WIDTH}
              opacity={head.opacity}
            />
            {head.isSounding && (
              <circle
                data-testid="sounding-halo"
                cx={head.x}
                cy={head.y}
                r={stave.haloRadius}
                fill={SOUNDING_HALO_FILL}
              />
            )}
            <ellipse
              cx={head.x}
              cy={head.y}
              rx={head.rx}
              ry={head.ry}
              transform={head.tilt}
              fill={head.ink}
              opacity={head.opacity}
            />
            <rect
              data-testid="stave-note-hit"
              role="button"
              aria-label={noteLabel(head.note)}
              aria-disabled={tapsEnabled ? undefined : "true"}
              onClick={tapsEnabled ? () => onTapNote(head.runIndex) : undefined}
              x={head.hitX}
              y={head.hitY}
              width={head.hitW}
              height={head.hitH}
              fill="transparent"
              style={{ cursor: tapsEnabled ? "pointer" : "default" }}
            />
          </g>
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          left: CLEF_X,
          top: stave.clefY,
          transform: "translate(-50%,-50%)",
          fontFamily: fonts.music,
          fontSize: CLEF_FONT_SIZE,
          lineHeight: 1,
          color: CLEF_COLOR,
          pointerEvents: "none",
        }}
      >
        {CLEF_GLYPH}
      </div>
      {staveNamesEnabled &&
        stave.names.map((name, index) => (
          <div
            key={index}
            data-testid="stave-note-name"
            style={{
              position: "absolute",
              left: name.x,
              top: stave.nameRowY,
              transform: "translateX(-50%)",
              fontSize: stave.nameSize,
              fontWeight: NAME_FONT_WEIGHT,
              lineHeight: 1,
              color: name.ink,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {name.label}
          </div>
        ))}
      {stave.sig.map((glyph, index) => (
        <div
          key={index}
          data-testid="stave-signature-glyph"
          data-accented={glyph.accented ? "true" : "false"}
          style={{
            position: "absolute",
            left: glyph.x,
            top: glyph.y,
            transform: "translate(-50%,-50%)",
            fontFamily: fonts.body,
            fontSize: glyph.size,
            fontWeight: 500,
            lineHeight: 1,
            color: glyph.ink,
            pointerEvents: "none",
          }}
        >
          {glyph.glyph}
        </div>
      ))}
      {stave.accs.map((acc) => (
        <div
          key={acc.runIndex}
          data-testid="inline-accidental"
          data-run-index={acc.runIndex}
          data-glyph={acc.glyph}
          style={{
            position: "absolute",
            left: acc.x,
            top: acc.y,
            transform: "translate(-50%,-50%)",
            fontFamily: fonts.music,
            fontSize: acc.size,
            lineHeight: 1,
            color: acc.ink,
            opacity: acc.opacity,
            pointerEvents: "none",
          }}
        >
          {acc.glyph}
        </div>
      ))}
    </div>
  );
});
