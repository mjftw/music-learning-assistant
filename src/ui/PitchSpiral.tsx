import type { JSX } from "react";
import type { NoteJudged, TunerTarget, Verdict } from "../practice/published";
import {
  noteAtPosition,
  noteLabel,
  pitchClassLabel,
  pitchHzOf,
  pitchPosition,
  type SpellingPreference,
} from "../theory/published";
import { fonts, paper, tuner } from "./theme";

// Geometry below is copied verbatim from the vendored visual reference
// (changes/007-hear-me/design/Tuner.dc.html, frame #5c, markup lines 85-113,
// and the spiral's own arithmetic at script lines 1382-1429) — named here
// rather than re-derived by eye or copied as markup. The octave-separator
// spiral the script also computes (`spSep`, lines 1420-1424) is never drawn
// by the reference's own markup (dead in the source — nothing in 86-96
// renders it) and so is not reproduced here; the design is a spec, never a
// source.
const VIEWBOX_WIDTH = 358;
const VIEWBOX_HEIGHT = 368;
const SPIRAL_CENTER = { x: 179, y: 184 };
const HUB_RADIUS = 36;
const BAND_OUTER_RADIUS = 176;
const HUB_STROKE_WIDTH = 1;

const WEDGE_STROKE = paper.card;
const WEDGE_STROKE_WIDTH = 1.8;
const WEDGE_DIMMED_OPACITY = 0.4;
const WEDGE_LABEL_LETTER_SPACING = "-0.02em";

const NATURAL_LIGHTNESS = 0.855;
const NATURAL_CHROMA = 0.068;
const ACCIDENTAL_LIGHTNESS = 0.785;
const ACCIDENTAL_CHROMA = 0.098;
const PINNED_LIGHTNESS = 0.4;
const PINNED_CHROMA = 0.125;

// The circle-of-fifths hue order — the same 30°-per-fifth, 25°-offset
// formula CircleOfFifths.tsx's own `wedgeHue` uses (docs/design.md §8's
// token), reproduced here (module-local, per the codebase's own convention
// for a small one-off formula — see DroneSheet.tsx's switch geometry
// comment) rather than importing a UI sibling's private helper.
const FIFTHS: readonly number[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const HUE_STEP_DEGREES = 30;
const HUE_OFFSET_DEGREES = 25;
const HUE_MODULUS = 360;

const NEEDLE_HALO_WIDTH = 9;
const NEEDLE_WIDTH = 4.5;
const NEEDLE_INSET = 2;

const TRAIL_STROKE_WIDTH = 3;
const TRAIL_OPACITY = 0.5;

const HUB_NAME_FONT_SIZE = 22;
const HUB_HZ_FONT_SIZE = 9.5;
const HUB_GAP = 4;

const WEDGE_LABEL_MAX_SIZE = 15;
const WEDGE_LABEL_SCALE_PINNED = 0.52;
const WEDGE_LABEL_SCALE_PLAIN = 0.44;
const WEDGE_LABEL_C_SCALE = 0.88;

const TONE_BY_VERDICT: Record<Verdict, string> = {
  sharp: tuner.sharp,
  flat: tuner.flat,
  "in-tune": tuner.inTune,
};

function f1(value: number): number {
  return Number(value.toFixed(1));
}

function pol(deg: number, radius: number): readonly [number, number] {
  const angle = ((deg - 90) * Math.PI) / 180;
  return [
    SPIRAL_CENTER.x + radius * Math.cos(angle),
    SPIRAL_CENTER.y + radius * Math.sin(angle),
  ];
}

function hueOf(pitchClass: number): number {
  return (
    (FIFTHS.indexOf(pitchClass) * HUE_STEP_DEGREES + HUE_OFFSET_DEGREES) %
    HUE_MODULUS
  );
}

function oklch(lightness: number, chroma: number, hue: number): string {
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
}

// The reading's fractional pitch position (whole semitones plus a cents
// remainder) — the vendored reference's own `r.m + c/100`, shared by the
// needle and the trail (both track the raw heard pitch, not whatever the
// target measures it against).
function fractionalPositionOf(entry: NoteJudged): number {
  return pitchPosition(entry.heard.nearest) + entry.heard.cents / 100;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

interface Wedge {
  readonly position: number;
  readonly d: string;
  readonly fill: string;
  readonly fillOpacity: number;
  readonly dimmed: boolean;
  readonly pinned: boolean;
  readonly ariaLabel: string;
  readonly visibleLabel: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelSize: number;
  readonly labelWeight: number;
  readonly labelColor: string;
}

// practice.tuner/REQ-004 — one ring of wedges per octave, E2–C7 ∪ the
// instrument's range (`lowest`/`highest`, computed by the caller —
// TargetSheet.tsx's `spiralSpanOf`), winding outward from the hub; wedges
// outside `rangeLowest`..`rangeHighest` dimmed; a needle and a short trail
// track the heard pitch; the hub names the target.
export function PitchSpiral(props: {
  readonly lowest: number;
  readonly highest: number;
  readonly rangeLowest: number;
  readonly rangeHighest: number;
  readonly target: TunerTarget;
  readonly reading: NoteJudged | null;
  readonly trail: readonly NoteJudged[];
  readonly spelling: SpellingPreference;
  readonly onPick: (position: number) => void;
}): JSX.Element {
  const {
    lowest,
    highest,
    rangeLowest,
    rangeHighest,
    target,
    reading,
    trail,
    spelling,
    onPick,
  } = props;

  const span = highest - lowest;
  const dr = (BAND_OUTER_RADIUS - HUB_RADIUS) / (span / 12 + 1);
  const r0 = HUB_RADIUS + dr / 2;
  const rAt = (q: number): number => r0 + ((q - lowest) / 12) * dr;

  const wedges: Wedge[] = [];
  for (let m = lowest; m <= highest; m += 1) {
    const pitchClass = ((m % 12) + 12) % 12;
    const note = noteAtPosition(m, spelling);
    const pinned = target.kind === "pinned" && target.position === m;
    const dimmed = m < rangeLowest || m > rangeHighest;
    const hue = hueOf(pitchClass);
    const fill = pinned
      ? oklch(PINNED_LIGHTNESS, PINNED_CHROMA, hue)
      : note.accidental === "natural"
        ? oklch(NATURAL_LIGHTNESS, NATURAL_CHROMA, hue)
        : oklch(ACCIDENTAL_LIGHTNESS, ACCIDENTAL_CHROMA, hue);

    const outer: Array<readonly [number, number]> = [];
    const inner: Array<readonly [number, number]> = [];
    for (let k = 0; k <= 6; k += 1) {
      const f = -0.5 + k / 6;
      const deg = pitchClass * HUE_STEP_DEGREES + f * HUE_STEP_DEGREES;
      const radius = rAt(m + f);
      outer.push(pol(deg, radius + dr / 2));
      inner.push(pol(deg, radius - dr / 2));
    }
    const points = [...outer, ...inner.reverse()];
    const d = `M ${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L ")} Z`;
    const [labelX, labelY] = pol(pitchClass * HUE_STEP_DEGREES, rAt(m));

    wedges.push({
      position: m,
      d,
      fill,
      fillOpacity: dimmed ? WEDGE_DIMMED_OPACITY : 1,
      dimmed,
      pinned,
      ariaLabel: noteLabel(note),
      visibleLabel:
        note.letter === "C" ? noteLabel(note) : pitchClassLabel(note),
      labelX: f1(labelX),
      labelY: f1(labelY),
      labelSize: f1(
        Math.min(
          WEDGE_LABEL_MAX_SIZE,
          dr * (pinned ? WEDGE_LABEL_SCALE_PINNED : WEDGE_LABEL_SCALE_PLAIN),
        ) * (pitchClass === 0 ? WEDGE_LABEL_C_SCALE : 1),
      ),
      labelWeight: pinned ? 700 : 600,
      labelColor: pinned ? paper.card : paper.ink,
    });
  }

  const needleQ =
    reading === null
      ? null
      : clamp(fractionalPositionOf(reading), lowest - 0.5, highest + 0.5);
  const needleTone = reading === null ? null : TONE_BY_VERDICT[reading.verdict];
  let needleD = "";
  if (needleQ !== null) {
    const deg = (((needleQ % 12) + 12) % 12) * HUE_STEP_DEGREES;
    const radius = rAt(needleQ);
    const [ax, ay] = pol(deg, radius - dr / 2 + NEEDLE_INSET);
    const [bx, by] = pol(deg, radius + dr / 2 - NEEDLE_INSET);
    needleD = `M ${f1(ax)} ${f1(ay)} L ${f1(bx)} ${f1(by)}`;
  }

  const trailWithin = trail.filter((entry) => {
    const q = fractionalPositionOf(entry);
    return q >= lowest - 0.5 && q <= highest + 0.5;
  });
  const trailD =
    trailWithin.length > 1
      ? `M ${trailWithin
          .map((entry) => {
            const q = fractionalPositionOf(entry);
            const deg = (((q % 12) + 12) % 12) * HUE_STEP_DEGREES;
            const [x, y] = pol(deg, rAt(q));
            return `${f1(x)} ${f1(y)}`;
          })
          .join(" L ")}`
      : "";

  const pinnedNote =
    target.kind === "pinned" ? noteAtPosition(target.position, spelling) : null;

  return (
    <div
      style={{
        position: "relative",
        width: VIEWBOX_WIDTH,
        height: VIEWBOX_HEIGHT,
        margin: "0 auto",
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        width={VIEWBOX_WIDTH}
        height={VIEWBOX_HEIGHT}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {wedges.map((wedge) => (
          <path
            key={wedge.position}
            role="button"
            aria-label={wedge.ariaLabel}
            data-position={wedge.position}
            data-dimmed={wedge.dimmed ? "true" : "false"}
            d={wedge.d}
            fill={wedge.fill}
            fillOpacity={wedge.fillOpacity}
            stroke={WEDGE_STROKE}
            strokeWidth={WEDGE_STROKE_WIDTH}
            strokeLinejoin="round"
            onClick={() => onPick(wedge.position)}
            style={{ cursor: "pointer" }}
          />
        ))}
        <circle
          cx={SPIRAL_CENTER.x}
          cy={SPIRAL_CENTER.y}
          r={HUB_RADIUS - HUB_STROKE_WIDTH / 2}
          fill={paper.disc}
          stroke={paper.border}
          strokeWidth={HUB_STROKE_WIDTH}
        />
        {trailD !== "" && needleTone !== null && (
          <path
            data-testid="spiral-trail"
            d={trailD}
            fill="none"
            stroke={needleTone}
            strokeWidth={TRAIL_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={TRAIL_OPACITY}
            style={{ pointerEvents: "none" }}
          />
        )}
        {needleQ !== null && needleTone !== null && (
          <g data-testid="spiral-needle" style={{ pointerEvents: "none" }}>
            <path
              d={needleD}
              stroke={paper.card}
              strokeWidth={NEEDLE_HALO_WIDTH}
              strokeLinecap="round"
            />
            <path
              d={needleD}
              stroke={needleTone}
              strokeWidth={NEEDLE_WIDTH}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      {wedges.map((wedge) => (
        <div
          key={wedge.position}
          style={{
            position: "absolute",
            left: wedge.labelX,
            top: wedge.labelY,
            transform: "translate(-50%,-50%)",
            fontSize: wedge.labelSize,
            fontWeight: wedge.labelWeight,
            letterSpacing: WEDGE_LABEL_LETTER_SPACING,
            color: wedge.labelColor,
            lineHeight: 1,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {wedge.visibleLabel}
        </div>
      ))}
      <div
        data-testid="spiral-hub"
        style={{
          position: "absolute",
          left: SPIRAL_CENTER.x,
          top: SPIRAL_CENTER.y,
          transform: "translate(-50%,-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: HUB_GAP,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: HUB_NAME_FONT_SIZE,
            lineHeight: 1,
            color: paper.ink,
          }}
        >
          {pinnedNote === null ? "—" : noteLabel(pinnedNote)}
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: HUB_HZ_FONT_SIZE,
            color: paper.muted,
          }}
        >
          {pinnedNote === null
            ? "pick a note"
            : `${pitchHzOf(pinnedNote).toFixed(1)} Hz`}
        </div>
      </div>
    </div>
  );
}
