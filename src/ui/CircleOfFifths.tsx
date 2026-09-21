import { useState, type JSX } from "react";
import {
  arcOf,
  circleOfFifths,
  keyId as keyIdOf,
  signatureOf,
  spelledMajorAt,
  spelledMinorAt,
  type CirclePosition,
  type Key,
  type SpellingPreference,
} from "../theory/published";
import { keyLabel, pitchClassLabel, wedgeLabel } from "./key-label";
import { fonts, paper } from "./theme";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html)
// — named here rather than re-derived by eye, so the two stay traceable to
// one another.
const VIEWBOX_SIZE = 378;
const CENTER = 189;
const POSITIONS = 12;
const DEGREES_PER_POSITION = 360 / POSITIONS;
const WEDGE_HALF_ANGLE = DEGREES_PER_POSITION / 2;

const MINOR_RADII: readonly [number, number] = [72, 100];
const MAJOR_RADII: readonly [number, number] = [100, 142];

const DISTANCE_RING_RADII: readonly [number, number] = [148, 153];
const DEGREE_RADIUS = 150.5;
const DEGREE_NOTCH_GAP_DEGREES = 3.1;
const OUTSIDE_NAME_RADIUS = 170;

const WEDGE_STROKE = paper.frame;
const WEDGE_STROKE_WIDTH = 1.8;

// Not in the reference (a static screenshot has no focus state) — global.css
// suppresses the browser's default outline on this class entirely (never
// seen in the prototype, and unusable here regardless: Chromium renders
// `outline` on a non-rectangular SVG <path> as a partial fragment, not a
// ring — confirmed with keyboard-focus screenshots, T012 fixer round). The
// visible keyboard-focus ring is instead painted below as a same-shaped
// overlay <path>, driven by React focus state, which paints reliably on any
// path geometry because it IS the path's own outline stroked, not the CSS
// `outline` box model applied to it.
const WEDGE_CLASS_NAME = "circle-wedge";
const FOCUS_RING_COLOR = paper.accent;
const FOCUS_RING_STROKE_WIDTH = 3;

const HUE_STEP_DEGREES = 30;
const HUE_OFFSET_DEGREES = 25;
const HUE_MODULUS = 360;

const SELECTED_WEDGE_LIGHTNESS = 0.4;
const SELECTED_WEDGE_CHROMA = 0.125;
const MAJOR_WEDGE_LIGHTNESS = 0.785;
const MAJOR_WEDGE_CHROMA = 0.098;
const MINOR_WEDGE_LIGHTNESS = 0.855;
const MINOR_WEDGE_CHROMA = 0.068;

const LABEL_INK_LIGHTNESS_THRESHOLD = 0.58;
const LABEL_INK_LIGHT = "#f9f4e9";
const MAJOR_LABEL_INK_DARK = paper.ink;
const MINOR_LABEL_INK_DARK = "#33302a";
const MAJOR_LABEL_SIZE_SELECTED = 23;
const MAJOR_LABEL_SIZE = 19;
const MAJOR_LABEL_WEIGHT_SELECTED = 700;
const MAJOR_LABEL_WEIGHT = 600;
const MINOR_LABEL_SIZE_SELECTED = 17;
const MINOR_LABEL_SIZE = 14;
const MINOR_LABEL_WEIGHT_SELECTED = 700;
const MINOR_LABEL_WEIGHT = 500;

const ARC_SELECTED_FILL = "oklch(0.330 0.095 40)";
const DISTANCE_LIGHTNESS: readonly number[] = [
  0.42, 0.665, 0.75, 0.818, 0.868, 0.906, 0.93,
];
const DISTANCE_CHROMA: readonly number[] = [
  0.16, 0.15, 0.124, 0.096, 0.068, 0.042, 0.023,
];
const ARC_HUE_SHARPWARD = 28;
const ARC_HUE_FLATWARD = 258;

const NUMERAL_FONT_SIZE = 11;
const NUMERAL_FONT_WEIGHT = 600;
const NUMERAL_INK = paper.ink;

const SCALE_NAME_FONT_SIZE = 12.5;
const SCALE_NAME_WEIGHT_ACCENTED = 700;
const SCALE_NAME_WEIGHT_PLAIN = 600;
const SCALE_NAME_INK_ACCENTED = paper.accent;
const SCALE_NAME_INK_PLAIN = paper.muted;

const CENTER_DISC_RADIUS = 72;
const CENTER_DISC_FILL = paper.disc;
const CENTER_DISC_STROKE = paper.border;
const CENTER_DISC_STROKE_WIDTH = 1;

const STAVE_LINE_X1 = 125;
const STAVE_LINE_X2 = 253;
const STAVE_LINE_YS: readonly number[] = [171, 180, 189, 198, 207];
const STAVE_LINE_STROKE = paper.inkSoft;
const STAVE_LINE_STROKE_WIDTH = 1;
const STAVE_BAR_X = 253;
const STAVE_BAR_Y1 = 171;
const STAVE_BAR_Y2 = 207;
const STAVE_BAR_STROKE_WIDTH = 1.4;

const CLEF_X = 140;
const CLEF_Y = 187;
const CLEF_GLYPH = "𝄞";
const CLEF_FONT_SIZE = 28;
const CLEF_COLOR = paper.inkSoft;

// Treble stave inside the centre disc: top line at y=171, 9px apart. Each
// step is half a stave gap, one per line/space the glyph rides on — see
// SHARP_STAFF_STEPS/FLAT_STAFF_STEPS in the visual reference.
const STAVE_TOP = 171;
const STAVE_STEP = 9;
const SHARP_STAFF_STEPS: readonly number[] = [0, 1.5, -0.5, 1, 2.5, 0.5, 2];
const FLAT_STAFF_STEPS: readonly number[] = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];
const SIGNATURE_GLYPH_X0 = 163;
const SIGNATURE_GLYPH_DX = 13;
const SHARP_GLYPH_SIZE = 26;
const FLAT_GLYPH_SIZE = 32;
const FLAT_GLYPH_Y_ADJUST = 6;
const SIGNATURE_GLYPH_ACCENT = paper.accent;
const SIGNATURE_GLYPH_INK = paper.inkSoft;
const SHARP_GLYPH_CHAR = "♯";
const FLAT_GLYPH_CHAR = "♭";

const PILL_X = 189;
const PILL_Y = 230;
const PILL_BORDER = "#e0d7c5";
const PILL_ACTIVE_BG = paper.pillActive;
const PILL_ACTIVE_INK = "#4a4136";
const PILL_INACTIVE_INK = "#756c60";
const PILL_BUTTON_PADDING = "2px 12px 4px";
const PILL_BUTTON_FONT_SIZE = 14;
const PILL_BUTTON_FONT_WEIGHT = 600;
const PILL_BUTTON_LINE_HEIGHT = 1.2;
const PILL_BORDER_RADIUS = 999;

interface Point {
  readonly x: number;
  readonly y: number;
}

// Converts a compass-style angle (0deg at 12 o'clock, increasing clockwise)
// and a radius into the SVG coordinate the annulus path needs.
function pointOnCircle(angleDegrees: number, radius: number): Point {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRadians),
    y: CENTER + radius * Math.sin(angleRadians),
  };
}

// Builds an SVG path for a single annulus wedge (a ring segment) — used both
// for the selectable key wedges and for the distance ring's arcs/notches.
function wedgePath(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const outerStart = pointOnCircle(startAngle, outerRadius);
  const outerEnd = pointOnCircle(endAngle, outerRadius);
  const innerStart = pointOnCircle(endAngle, innerRadius);
  const innerEnd = pointOnCircle(startAngle, innerRadius);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

interface WedgePaint {
  readonly fill: string;
  readonly lightness: number;
}

// The wedge carries the key's own hue — fixed, so a key looks the same every
// time the circle is opened; distance from the selected key lives in the
// ring outside it, not here.
function wedgeHue(positionIndex: number): number {
  return (positionIndex * HUE_STEP_DEGREES + HUE_OFFSET_DEGREES) % HUE_MODULUS;
}

function wedgePaint(
  positionIndex: number,
  isSelected: boolean,
  band: "major" | "minor",
): WedgePaint {
  const hue = wedgeHue(positionIndex);
  if (isSelected) {
    return {
      fill: `oklch(${SELECTED_WEDGE_LIGHTNESS} ${SELECTED_WEDGE_CHROMA} ${hue})`,
      lightness: SELECTED_WEDGE_LIGHTNESS,
    };
  }
  const lightness =
    band === "minor" ? MINOR_WEDGE_LIGHTNESS : MAJOR_WEDGE_LIGHTNESS;
  const chroma = band === "minor" ? MINOR_WEDGE_CHROMA : MAJOR_WEDGE_CHROMA;
  return { fill: `oklch(${lightness} ${chroma} ${hue})`, lightness };
}

// One record per circle position, carrying both spellings the current
// preference picked — the single source the wedges, their labels and the
// selection lookup all read from.
interface PositionRender {
  readonly position: CirclePosition;
  readonly majorKey: Key;
  readonly minorKey: Key;
  readonly majorSelected: boolean;
  readonly minorSelected: boolean;
  readonly majorPaint: WedgePaint;
  readonly minorPaint: WedgePaint;
}

function buildPositionRenders(
  selectedKeyId: string,
  spelling: SpellingPreference,
): readonly PositionRender[] {
  return circleOfFifths().map((position) => {
    const majorKey = spelledMajorAt(position, spelling);
    const minorKey = spelledMinorAt(position, spelling);
    const majorSelected = keyIdOf(majorKey) === selectedKeyId;
    const minorSelected = keyIdOf(minorKey) === selectedKeyId;
    return {
      position,
      majorKey,
      minorKey,
      majorSelected,
      minorSelected,
      majorPaint: wedgePaint(position.index, majorSelected, "major"),
      minorPaint: wedgePaint(position.index, minorSelected, "minor"),
    };
  });
}

// Resolves a stored/clicked key id to the circle position and the exact
// spelling of that key under a given preference — the one place App needs
// to turn "a key id" back into "a position", since selection is kept keyed
// by position (see App.tsx).
export interface SpelledKeyLocation {
  readonly position: CirclePosition;
  readonly key: Key;
}

export function locateSpelledKey(
  id: string,
  preference: SpellingPreference,
): SpelledKeyLocation | undefined {
  for (const position of circleOfFifths()) {
    const majorKey = spelledMajorAt(position, preference);
    if (keyIdOf(majorKey) === id) return { position, key: majorKey };
    const minorKey = spelledMinorAt(position, preference);
    if (keyIdOf(minorKey) === id) return { position, key: minorKey };
  }
  return undefined;
}

function labelInk(lightness: number, darkInk: string): string {
  return lightness < LABEL_INK_LIGHTNESS_THRESHOLD ? LABEL_INK_LIGHT : darkInk;
}

// Identifies which of the 24 wedges (12 positions × major/minor) currently
// holds keyboard focus, so the overlay ring below knows which single path
// to redraw — kept separate from selection (aria-pressed), which is a
// different, independent piece of state.
interface FocusedWedgeKey {
  readonly positionIndex: number;
  readonly ring: "major" | "minor";
}

function isSameWedge(a: FocusedWedgeKey | null, b: FocusedWedgeKey): boolean {
  return a !== null && a.positionIndex === b.positionIndex && a.ring === b.ring;
}

export function CircleOfFifths(props: {
  readonly selectedKeyId: string;
  readonly spelling: SpellingPreference;
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly onSelectKey: (key: Key) => void;
  readonly onSelectSpelling: (preference: SpellingPreference) => void;
}): JSX.Element {
  const {
    selectedKeyId,
    spelling,
    degreesEnabled,
    distanceRingEnabled,
    onSelectKey,
    onSelectSpelling,
  } = props;

  const positionRenders = buildPositionRenders(selectedKeyId, spelling);
  const selectedRender = positionRenders.find(
    (render) => render.majorSelected || render.minorSelected,
  );
  const selectedKey =
    selectedRender === undefined
      ? undefined
      : selectedRender.majorSelected
        ? selectedRender.majorKey
        : selectedRender.minorKey;

  const arc =
    selectedKey === undefined || !distanceRingEnabled
      ? []
      : arcOf(selectedKey, spelling);

  const signature =
    selectedKey === undefined ? undefined : signatureOf(selectedKey);
  const isFlatSignature = signature?.kind === "flats";
  const signatureGlyphCount = signature?.count ?? 0;
  const signatureStaffSteps = isFlatSignature
    ? FLAT_STAFF_STEPS
    : SHARP_STAFF_STEPS;
  const signatureGlyphChar = isFlatSignature
    ? FLAT_GLYPH_CHAR
    : SHARP_GLYPH_CHAR;
  const signatureGlyphSize = isFlatSignature
    ? FLAT_GLYPH_SIZE
    : SHARP_GLYPH_SIZE;

  const sharpSelected = spelling === "sharp";

  const handleWedgeKeyDown = (
    event: React.KeyboardEvent<SVGPathElement>,
    key: Key,
  ): void => {
    if (event.key === "Enter" || event.key === " ") onSelectKey(key);
  };

  const [focusedWedge, setFocusedWedge] = useState<FocusedWedgeKey | null>(
    null,
  );

  // `:focus-visible` is the browser's own pointer-vs-keyboard heuristic —
  // reading it here (rather than reimplementing it) keeps a mouse click on
  // a wedge showing no ring, exactly as the prototype never shows one.
  const handleWedgeFocus = (
    event: React.FocusEvent<SVGPathElement>,
    wedge: FocusedWedgeKey,
  ): void => {
    if (event.currentTarget.matches(":focus-visible")) setFocusedWedge(wedge);
  };

  const handleWedgeBlur = (wedge: FocusedWedgeKey): void => {
    setFocusedWedge((current) =>
      isSameWedge(current, wedge) ? null : current,
    );
  };

  const focusedWedgeRender =
    focusedWedge === null
      ? undefined
      : positionRenders.find(
          (render) => render.position.index === focusedWedge.positionIndex,
        );

  return (
    <div
      style={{
        position: "relative",
        width: VIEWBOX_SIZE,
        height: VIEWBOX_SIZE,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        width={VIEWBOX_SIZE}
        height={VIEWBOX_SIZE}
        style={{ position: "absolute", top: 0, left: 0 }}
        role="img"
        aria-label="Circle of fifths"
      >
        <g data-testid="distance-ring">
          {arc.map((arcPosition) => {
            const startAngle =
              arcPosition.positionIndex * DEGREES_PER_POSITION -
              WEDGE_HALF_ANGLE;
            const endAngle =
              arcPosition.positionIndex * DEGREES_PER_POSITION +
              WEDGE_HALF_ANGLE;
            const centreAngle =
              arcPosition.positionIndex * DEGREES_PER_POSITION;
            const distance = Math.abs(arcPosition.signedStep);
            const distanceLightness = DISTANCE_LIGHTNESS[distance];
            const distanceChroma = DISTANCE_CHROMA[distance];
            if (
              distanceLightness === undefined ||
              distanceChroma === undefined
            ) {
              throw new Error("unreachable: arc distance out of range");
            }
            const fill =
              arcPosition.signedStep === 0
                ? ARC_SELECTED_FILL
                : `oklch(${distanceLightness.toFixed(3)} ${distanceChroma.toFixed(3)} ${arcPosition.signedStep >= 0 ? ARC_HUE_SHARPWARD : ARC_HUE_FLATWARD})`;
            if (!degreesEnabled) {
              return (
                <path
                  key={arcPosition.positionIndex}
                  d={wedgePath(
                    startAngle,
                    endAngle,
                    DISTANCE_RING_RADII[0],
                    DISTANCE_RING_RADII[1],
                  )}
                  fill={fill}
                />
              );
            }
            return (
              <g key={arcPosition.positionIndex}>
                <path
                  d={wedgePath(
                    startAngle,
                    centreAngle - DEGREE_NOTCH_GAP_DEGREES,
                    DISTANCE_RING_RADII[0],
                    DISTANCE_RING_RADII[1],
                  )}
                  fill={fill}
                />
                <path
                  d={wedgePath(
                    centreAngle + DEGREE_NOTCH_GAP_DEGREES,
                    endAngle,
                    DISTANCE_RING_RADII[0],
                    DISTANCE_RING_RADII[1],
                  )}
                  fill={fill}
                />
              </g>
            );
          })}
        </g>

        {positionRenders.map((render) => {
          const startAngle =
            render.position.index * DEGREES_PER_POSITION - WEDGE_HALF_ANGLE;
          const endAngle =
            render.position.index * DEGREES_PER_POSITION + WEDGE_HALF_ANGLE;
          return (
            <g key={render.position.index}>
              <path
                className={WEDGE_CLASS_NAME}
                role="button"
                tabIndex={0}
                aria-label={keyLabel(render.majorKey)}
                aria-pressed={render.majorSelected}
                data-position-index={render.position.index}
                d={wedgePath(
                  startAngle,
                  endAngle,
                  MAJOR_RADII[0],
                  MAJOR_RADII[1],
                )}
                fill={render.majorPaint.fill}
                stroke={WEDGE_STROKE}
                strokeWidth={WEDGE_STROKE_WIDTH}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectKey(render.majorKey)}
                onKeyDown={(event) =>
                  handleWedgeKeyDown(event, render.majorKey)
                }
                onFocus={(event) =>
                  handleWedgeFocus(event, {
                    positionIndex: render.position.index,
                    ring: "major",
                  })
                }
                onBlur={() =>
                  handleWedgeBlur({
                    positionIndex: render.position.index,
                    ring: "major",
                  })
                }
              />
              <path
                className={WEDGE_CLASS_NAME}
                role="button"
                tabIndex={0}
                aria-label={keyLabel(render.minorKey)}
                aria-pressed={render.minorSelected}
                data-position-index={render.position.index}
                d={wedgePath(
                  startAngle,
                  endAngle,
                  MINOR_RADII[0],
                  MINOR_RADII[1],
                )}
                fill={render.minorPaint.fill}
                stroke={WEDGE_STROKE}
                strokeWidth={WEDGE_STROKE_WIDTH}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectKey(render.minorKey)}
                onKeyDown={(event) =>
                  handleWedgeKeyDown(event, render.minorKey)
                }
                onFocus={(event) =>
                  handleWedgeFocus(event, {
                    positionIndex: render.position.index,
                    ring: "minor",
                  })
                }
                onBlur={() =>
                  handleWedgeBlur({
                    positionIndex: render.position.index,
                    ring: "minor",
                  })
                }
              />
            </g>
          );
        })}

        {focusedWedge !== null && focusedWedgeRender !== undefined && (
          <path
            data-testid="wedge-focus-ring"
            aria-hidden="true"
            pointerEvents="none"
            fill="none"
            stroke={FOCUS_RING_COLOR}
            strokeWidth={FOCUS_RING_STROKE_WIDTH}
            d={wedgePath(
              focusedWedgeRender.position.index * DEGREES_PER_POSITION -
                WEDGE_HALF_ANGLE,
              focusedWedgeRender.position.index * DEGREES_PER_POSITION +
                WEDGE_HALF_ANGLE,
              focusedWedge.ring === "major" ? MAJOR_RADII[0] : MINOR_RADII[0],
              focusedWedge.ring === "major" ? MAJOR_RADII[1] : MINOR_RADII[1],
            )}
          />
        )}

        <circle
          cx={CENTER}
          cy={CENTER}
          r={CENTER_DISC_RADIUS}
          fill={CENTER_DISC_FILL}
          stroke={CENTER_DISC_STROKE}
          strokeWidth={CENTER_DISC_STROKE_WIDTH}
        />
        {STAVE_LINE_YS.map((y) => (
          <line
            key={y}
            x1={STAVE_LINE_X1}
            y1={y}
            x2={STAVE_LINE_X2}
            y2={y}
            stroke={STAVE_LINE_STROKE}
            strokeWidth={STAVE_LINE_STROKE_WIDTH}
          />
        ))}
        <line
          x1={STAVE_BAR_X}
          y1={STAVE_BAR_Y1}
          x2={STAVE_BAR_X}
          y2={STAVE_BAR_Y2}
          stroke={STAVE_LINE_STROKE}
          strokeWidth={STAVE_BAR_STROKE_WIDTH}
        />
      </svg>

      {!degreesEnabled
        ? null
        : arc.map((arcPosition) => {
            const p = pointOnCircle(
              arcPosition.positionIndex * DEGREES_PER_POSITION,
              DEGREE_RADIUS,
            );
            return (
              <div
                key={arcPosition.positionIndex}
                data-testid="arc-degree"
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  transform: "translate(-50%,-50%)",
                  fontFamily: fonts.mono,
                  fontSize: NUMERAL_FONT_SIZE,
                  fontWeight: NUMERAL_FONT_WEIGHT,
                  color: NUMERAL_INK,
                  lineHeight: 1,
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {arcPosition.degree}
              </div>
            );
          })}

      {arc.map((arcPosition) => {
        const p = pointOnCircle(
          arcPosition.positionIndex * DEGREES_PER_POSITION,
          OUTSIDE_NAME_RADIUS,
        );
        return (
          <div
            key={arcPosition.positionIndex}
            data-testid="arc-name"
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              transform: "translate(-50%,-50%)",
              fontFamily: fonts.body,
              fontSize: SCALE_NAME_FONT_SIZE,
              fontWeight: arcPosition.differsFromWedge
                ? SCALE_NAME_WEIGHT_ACCENTED
                : SCALE_NAME_WEIGHT_PLAIN,
              color: arcPosition.differsFromWedge
                ? SCALE_NAME_INK_ACCENTED
                : SCALE_NAME_INK_PLAIN,
              lineHeight: 1,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {pitchClassLabel(arcPosition.scaleName)}
          </div>
        );
      })}

      {positionRenders.flatMap((render) => {
        const majorPos = pointOnCircle(
          render.position.index * DEGREES_PER_POSITION,
          (MAJOR_RADII[0] + MAJOR_RADII[1]) / 2,
        );
        const minorPos = pointOnCircle(
          render.position.index * DEGREES_PER_POSITION,
          (MINOR_RADII[0] + MINOR_RADII[1]) / 2,
        );
        return [
          <div
            key={`major-${render.position.index}`}
            style={{
              position: "absolute",
              left: majorPos.x,
              top: majorPos.y,
              transform: "translate(-50%,-50%)",
              fontFamily: fonts.body,
              fontSize: render.majorSelected
                ? MAJOR_LABEL_SIZE_SELECTED
                : MAJOR_LABEL_SIZE,
              fontWeight: render.majorSelected
                ? MAJOR_LABEL_WEIGHT_SELECTED
                : MAJOR_LABEL_WEIGHT,
              color: labelInk(
                render.majorPaint.lightness,
                MAJOR_LABEL_INK_DARK,
              ),
              lineHeight: 1,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {wedgeLabel(render.majorKey)}
          </div>,
          <div
            key={`minor-${render.position.index}`}
            style={{
              position: "absolute",
              left: minorPos.x,
              top: minorPos.y,
              transform: "translate(-50%,-50%)",
              fontFamily: fonts.body,
              fontSize: render.minorSelected
                ? MINOR_LABEL_SIZE_SELECTED
                : MINOR_LABEL_SIZE,
              fontWeight: render.minorSelected
                ? MINOR_LABEL_WEIGHT_SELECTED
                : MINOR_LABEL_WEIGHT,
              color: labelInk(
                render.minorPaint.lightness,
                MINOR_LABEL_INK_DARK,
              ),
              lineHeight: 1,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {wedgeLabel(render.minorKey)}
          </div>,
        ];
      })}

      <div
        style={{
          position: "absolute",
          left: CLEF_X,
          top: CLEF_Y,
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

      {Array.from({ length: signatureGlyphCount }, (_, index) => {
        const step = signatureStaffSteps[index];
        if (step === undefined)
          throw new Error("unreachable: signature too long");
        const accented = index === signatureGlyphCount - 1;
        return (
          <div
            key={index}
            data-testid="signature-glyph"
            data-accented={accented ? "true" : "false"}
            style={{
              position: "absolute",
              left: SIGNATURE_GLYPH_X0 + index * SIGNATURE_GLYPH_DX,
              top:
                STAVE_TOP +
                step * STAVE_STEP -
                (isFlatSignature ? FLAT_GLYPH_Y_ADJUST : 0),
              transform: "translate(-50%,-50%)",
              fontFamily: fonts.body,
              fontSize: signatureGlyphSize,
              fontWeight: 500,
              lineHeight: 1,
              color: accented ? SIGNATURE_GLYPH_ACCENT : SIGNATURE_GLYPH_INK,
              pointerEvents: "none",
            }}
          >
            {signatureGlyphChar}
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: PILL_X,
          top: PILL_Y,
          transform: "translate(-50%,-50%)",
          display: "flex",
          border: `1px solid ${PILL_BORDER}`,
          borderRadius: PILL_BORDER_RADIUS,
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          aria-label="sharp"
          aria-pressed={sharpSelected}
          onClick={() => onSelectSpelling("sharp")}
          style={{
            padding: PILL_BUTTON_PADDING,
            fontSize: PILL_BUTTON_FONT_SIZE,
            fontWeight: PILL_BUTTON_FONT_WEIGHT,
            lineHeight: PILL_BUTTON_LINE_HEIGHT,
            color: sharpSelected ? PILL_ACTIVE_INK : PILL_INACTIVE_INK,
            background: sharpSelected ? PILL_ACTIVE_BG : "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {SHARP_GLYPH_CHAR}
        </button>
        <button
          type="button"
          aria-label="flat"
          aria-pressed={!sharpSelected}
          onClick={() => onSelectSpelling("flat")}
          style={{
            padding: PILL_BUTTON_PADDING,
            fontSize: PILL_BUTTON_FONT_SIZE,
            fontWeight: PILL_BUTTON_FONT_WEIGHT,
            lineHeight: PILL_BUTTON_LINE_HEIGHT,
            color: !sharpSelected ? PILL_ACTIVE_INK : PILL_INACTIVE_INK,
            background: !sharpSelected ? PILL_ACTIVE_BG : "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {FLAT_GLYPH_CHAR}
        </button>
      </div>
    </div>
  );
}
