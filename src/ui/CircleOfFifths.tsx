import type { JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  type Key,
} from "../theory/published";
import { keyLabel } from "./key-label";

const VIEWBOX_SIZE = 400;
const CENTER = VIEWBOX_SIZE / 2;
const POSITIONS = 12;
const DEGREES_PER_POSITION = 360 / POSITIONS;

const OUTER_RING_RADIUS: readonly [number, number] = [130, 190];
const INNER_RING_RADIUS: readonly [number, number] = [70, 130];

const SELECTED_FILL = "#facc15";
const MAJOR_FILL = "#e0e7ff";
const MINOR_FILL = "#c7d2fe";

// Converts a compass-style angle (0deg at 12 o'clock, increasing clockwise)
// and a radius into the SVG coordinate the annulus path needs.
function pointOnCircle(
  angleDegrees: number,
  radius: number,
): { x: number; y: number } {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRadians),
    y: CENTER + radius * Math.sin(angleRadians),
  };
}

// Builds an SVG path for a single annulus wedge (a ring segment), the shape
// each selectable key occupies.
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
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

// Splits a ring band into as many equal radial sub-bands as there are
// spellings sharing this circle position — one everywhere, two at the three
// enharmonic positions (B/C♭, F♯/G♭, C♯/D♭), stacked from inner to outer.
function subBands(
  [innerRadius, outerRadius]: readonly [number, number],
  count: number,
): readonly (readonly [number, number])[] {
  const bandHeight = (outerRadius - innerRadius) / count;
  return Array.from({ length: count }, (_, index) => [
    innerRadius + bandHeight * index,
    innerRadius + bandHeight * (index + 1),
  ]);
}

function Wedge(props: {
  readonly wedgeKey: Key;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly fill: string;
  readonly isSelected: boolean;
  readonly onSelect: (key: Key) => void;
}): JSX.Element {
  const {
    wedgeKey,
    startAngle,
    endAngle,
    innerRadius,
    outerRadius,
    fill,
    isSelected,
    onSelect,
  } = props;
  const label = keyLabel(wedgeKey);
  const midAngle = (startAngle + endAngle) / 2;
  const midRadius = (innerRadius + outerRadius) / 2;
  const labelPosition = pointOnCircle(midAngle, midRadius);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={() => onSelect(wedgeKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect(wedgeKey);
      }}
      style={{ cursor: "pointer" }}
    >
      <path
        d={wedgePath(startAngle, endAngle, innerRadius, outerRadius)}
        fill={isSelected ? SELECTED_FILL : fill}
        stroke="#1e1b4b"
        strokeWidth={1}
      />
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

export function CircleOfFifths(props: {
  readonly selectedKeyId: string;
  readonly onSelect: (key: Key) => void;
}): JSX.Element {
  const { selectedKeyId, onSelect } = props;
  const positions = circleOfFifths();

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      role="img"
      aria-label="Circle of fifths"
      width="100%"
      height="auto"
    >
      {positions.map((position) => {
        const startAngle = position.index * DEGREES_PER_POSITION;
        const endAngle = startAngle + DEGREES_PER_POSITION;
        const outerBands = subBands(OUTER_RING_RADIUS, position.majors.length);
        const innerBands = subBands(INNER_RING_RADIUS, position.minors.length);
        return (
          <g key={position.index}>
            {position.majors.map((majorKey, spellingIndex) => {
              const [innerRadius, outerRadius] = outerBands[spellingIndex]!;
              return (
                <Wedge
                  key={keyIdOf(majorKey)}
                  wedgeKey={majorKey}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  fill={MAJOR_FILL}
                  isSelected={keyIdOf(majorKey) === selectedKeyId}
                  onSelect={onSelect}
                />
              );
            })}
            {position.minors.map((minorKey, spellingIndex) => {
              const [innerRadius, outerRadius] = innerBands[spellingIndex]!;
              return (
                <Wedge
                  key={keyIdOf(minorKey)}
                  wedgeKey={minorKey}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  fill={MINOR_FILL}
                  isSelected={keyIdOf(minorKey) === selectedKeyId}
                  onSelect={onSelect}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
