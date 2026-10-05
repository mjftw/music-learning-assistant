import type { JSX } from "react";
import type { Verdict } from "../practice/published";
import { lead, noteMeter, tuner } from "./theme";

// practice.session/REQ-017, REQ-018 — the meter drawn on the target note:
// ±50 ¢ spans `noteMeter.boxHeight` px, sharp up and flat down. A pale
// band ±tolerance tall sits behind the note, filling left to right by
// held time ÷ required hold; a 2 px pitch line sits in front, clamped to
// ±50 ¢, hidden while nothing is detected. Two geometries share this one
// component: the stave (a fixed-size box centred on the notehead) and the
// names view's column (inset from the cell's own box, drawn by the
// caller).
export type MeterGeometry =
  | {
      readonly kind: "stave";
      readonly centreX: number;
      readonly centreY: number;
    }
  | { readonly kind: "column" };

const CENTS_RANGE = 50; // ±50 ¢ spans the box

function clampCents(cents: number): number {
  return Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
}

function verdictColour(verdict: Verdict): string {
  if (verdict === "flat") return tuner.flat;
  if (verdict === "sharp") return tuner.sharp;
  return tuner.inTune;
}

export function NoteMeter(props: {
  readonly geometry: MeterGeometry;
  readonly toleranceCents: number;
  readonly heldFraction: number;
  readonly reading: {
    readonly cents: number;
    readonly verdict: Verdict;
  } | null;
  // practice.session/REQ-017 — App renders the band and the line as two
  // separate DOM layers (the band behind the panel's content, the line in
  // front of it — see `KeyPanel`'s `underlay`/`overlay`), each its own
  // `NoteMeter` sharing this geometry so the two paint either side of it
  // with no `z-index`. Omitted (the unit tests below), both draw in one box
  // as before.
  readonly layer?: "band" | "line";
}): JSX.Element {
  const { geometry, toleranceCents, heldFraction, reading, layer } = props;
  const showBand = layer !== "line";
  const showLine = layer !== "band";

  const bandTopPercent = 50 - toleranceCents;
  const bandHeightPercent = 2 * toleranceCents;

  const boxStyle =
    geometry.kind === "stave"
      ? {
          position: "absolute" as const,
          left: geometry.centreX - noteMeter.staveBandWidth / 2,
          top: geometry.centreY - noteMeter.boxHeight / 2,
          width: noteMeter.staveBandWidth,
          height: noteMeter.boxHeight,
          pointerEvents: "none" as const,
        }
      : {
          position: "absolute" as const,
          left: 0,
          right: 0,
          top: noteMeter.columnBoxTop,
          height: noteMeter.boxHeight,
          pointerEvents: "none" as const,
        };

  const bandInset = geometry.kind === "stave" ? 0 : noteMeter.columnBandInset;
  const lineInset =
    geometry.kind === "stave"
      ? -noteMeter.staveLineOverhang
      : noteMeter.columnLineInset;

  return (
    <div style={boxStyle}>
      {showBand && (
        <div
          data-testid="note-meter-band"
          style={{
            position: "absolute",
            top: `${bandTopPercent}%`,
            height: `${bandHeightPercent}%`,
            left: bandInset,
            right: bandInset,
            background: tuner.band,
            borderRadius: noteMeter.bandRadius,
            overflow: "hidden",
          }}
        >
          <div
            data-testid="note-meter-fill"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.round(heldFraction * 100)}%`,
              background: lead.holdFill,
            }}
          />
        </div>
      )}
      {showLine && reading !== null && (
        <div
          data-testid="note-meter-line"
          style={{
            position: "absolute",
            top: `${50 - clampCents(reading.cents)}%`,
            height: noteMeter.lineHeight,
            marginTop: -1,
            left: lineInset,
            right: lineInset,
            borderRadius: noteMeter.lineRadius,
            background: verdictColour(reading.verdict),
            transition: noteMeter.lineTransition,
          }}
        />
      )}
    </div>
  );
}
