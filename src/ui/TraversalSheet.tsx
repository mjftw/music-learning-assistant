import { memo, type CSSProperties, type JSX, type ReactNode } from "react";
import type {
  Direction,
  Octaves,
  OctaveCount,
  Shape,
  Traversal,
} from "../theory/published";
import type { SessionSettings, SoundMode } from "../practice/published";
import { fonts, paper } from "./theme";
import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/003-hear-the-scale/design/hear-the-scale.dc.html,
// markup lines 145-193, pill/toggle paints script lines 573-584, pill lists
// script lines 692-715) — named here rather than re-derived by eye.
const SCRIM_Z_INDEX = 9;
const SHEET_Z_INDEX = 10;
const SHEET_PADDING_BOTTOM = 16;

const HEADER_PADDING = "16px 18px 12px";

const ROW_PADDING = "14px 18px";
const ROW_LABEL_FONT_SIZE = 13;
const ROW_LABEL_FONT_WEIGHT = 600;

const PILL_ACTIVE_INK = "#4a4136";
const PILL_INACTIVE_INK = "#756c60";
// changes/005-scale-selection/design/hear-the-scale.dc.html, `kindPills`
// (script lines 819-822) — the arpeggio pill when the chosen scale does not
// offer one: transparent background, no-op pick, this ink.
const PILL_DISABLED_INK = "#c3baab";

const DIRECTION_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: "9px 10px 10px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
};

const OCTAVE_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: "9px 10px 10px",
  borderRadius: 10,
  fontFamily: fonts.mono,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const SHAPE_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: "9px 12px 10px",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const SOUND_PILL_GEOMETRY: CSSProperties = {
  padding: "9px 11px 10px",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const TOGGLE_ROW_PADDING = "14px 18px 4px";
const TOGGLE_GAP = 6;
const TOGGLE_GEOMETRY: CSSProperties = {
  padding: "8px 12px 9px",
  borderRadius: 999,
  fontFamily: fonts.mono,
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.2,
};
const TOGGLE_ON_INK = paper.accent;
const TOGGLE_ON_BACKGROUND = "rgba(138,75,42,.10)";
const TOGGLE_ON_BORDER = "rgba(138,75,42,.35)";
const TOGGLE_OFF_INK = "#8a8175";

const DIRECTIONS: readonly {
  readonly value: Direction;
  readonly label: string;
}[] = [
  { value: "up", label: "↑" },
  { value: "down", label: "↓" },
  { value: "updown", label: "↑↓" },
];

const SHAPES: readonly { readonly value: Shape; readonly label: string }[] = [
  { value: "scale", label: "scale" },
  { value: "arpeggio", label: "arpeggio" },
];

const SOUND_MODES: readonly {
  readonly value: SoundMode;
  readonly label: string;
}[] = [
  { value: "notes", label: "notes" },
  { value: "both", label: "both" },
  { value: "metronome", label: "metronome" },
];

function octavesEqual(a: Octaves, b: Octaves): boolean {
  if (a.kind === "full" || b.kind === "full") return a.kind === b.kind;
  return a.count === b.count;
}

function octaveOptionsOf(
  fittingCounts: readonly OctaveCount[],
): readonly { readonly label: string; readonly octaves: Octaves }[] {
  return [
    ...fittingCounts.map((count) => ({
      label: `${count} oct`,
      octaves: { kind: "count", count } as const satisfies Octaves,
    })),
    { label: "full", octaves: { kind: "full" } as const satisfies Octaves },
  ];
}

function Row(props: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  const { label, children } = props;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: ROW_PADDING,
        borderBottom: `1px solid ${paper.hairlineSoft}`,
      }}
    >
      <div
        style={{
          fontSize: ROW_LABEL_FONT_SIZE,
          fontWeight: ROW_LABEL_FONT_WEIGHT,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 4 }}>{children}</div>
    </div>
  );
}

function Pill(props: {
  readonly label: string;
  readonly active: boolean;
  readonly geometry: CSSProperties;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}): JSX.Element {
  const { label, active, geometry, onClick, disabled = false } = props;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={disabled ? "true" : undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        ...geometry,
        textAlign: "center",
        lineHeight: 1.1,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        color: disabled
          ? PILL_DISABLED_INK
          : active
            ? PILL_ACTIVE_INK
            : PILL_INACTIVE_INK,
        background: !disabled && active ? paper.pillActive : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function TogglePill(props: {
  readonly label: string;
  readonly on: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  const { label, on, onClick } = props;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        ...TOGGLE_GEOMETRY,
        border: `1px solid ${on ? TOGGLE_ON_BORDER : paper.borderSoft}`,
        color: on ? TOGGLE_ON_INK : TOGGLE_OFF_INK,
        background: on ? TOGGLE_ON_BACKGROUND : "transparent",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// Never opens itself (Article VI) — `open` is driven entirely by the
// caller's state; this component only ever asks to close, via `onClose`.
// Wrapped in `React.memo` (T032) — `traversal`/`settings`/`effectiveOctaves`/
// `fittingCounts` are the session's own values, only reassigned when they
// actually change, and the handlers are `useCallback`-stabilised, so this
// never re-renders during playback.
function TraversalSheetComponent(props: {
  readonly open: boolean;
  readonly traversal: Traversal;
  readonly effectiveShape: Shape;
  readonly arpeggioOffered: boolean;
  readonly effectiveOctaves: Octaves;
  readonly fittingCounts: readonly OctaveCount[];
  readonly settings: SessionSettings;
  readonly onTraversal: (t: Traversal) => void;
  readonly onSettings: (s: SessionSettings) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const {
    open,
    traversal,
    effectiveShape,
    arpeggioOffered,
    effectiveOctaves,
    fittingCounts,
    settings,
    onTraversal,
    onSettings,
    onClose,
  } = props;

  const octaveOptions = octaveOptionsOf(fittingCounts);

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        <OverlayHeader
          title="Traversal"
          padding={HEADER_PADDING}
          closeAriaLabel="Close traversal sheet"
          onClose={onClose}
        />
        <Row label="Direction">
          {DIRECTIONS.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              active={traversal.direction === option.value}
              geometry={DIRECTION_PILL_GEOMETRY}
              onClick={() =>
                onTraversal({ ...traversal, direction: option.value })
              }
            />
          ))}
        </Row>
        <Row label="Octaves">
          {octaveOptions.map((option) => (
            <Pill
              key={option.label}
              label={option.label}
              active={octavesEqual(effectiveOctaves, option.octaves)}
              geometry={OCTAVE_PILL_GEOMETRY}
              onClick={() =>
                onTraversal({ ...traversal, octaves: option.octaves })
              }
            />
          ))}
        </Row>
        <Row label="Shape">
          {SHAPES.map((option) => {
            const disabled = option.value === "arpeggio" && !arpeggioOffered;
            return (
              <Pill
                key={option.value}
                label={option.label}
                active={effectiveShape === option.value}
                geometry={SHAPE_PILL_GEOMETRY}
                disabled={disabled}
                onClick={() =>
                  onTraversal({ ...traversal, shape: option.value })
                }
              />
            );
          })}
        </Row>
        <Row label="Sound">
          {SOUND_MODES.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              active={settings.soundMode === option.value}
              geometry={SOUND_PILL_GEOMETRY}
              onClick={() =>
                onSettings({ ...settings, soundMode: option.value })
              }
            />
          ))}
        </Row>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: TOGGLE_GAP,
            flexWrap: "wrap",
            padding: TOGGLE_ROW_PADDING,
          }}
        >
          <TogglePill
            label="loop"
            on={settings.loop}
            onClick={() => onSettings({ ...settings, loop: !settings.loop })}
          />
          <TogglePill
            label="count-in"
            on={settings.countIn}
            onClick={() =>
              onSettings({ ...settings, countIn: !settings.countIn })
            }
          />
          <TogglePill
            label="rest bar"
            on={settings.restBar}
            onClick={() =>
              onSettings({ ...settings, restBar: !settings.restBar })
            }
          />
        </div>
      </BottomSheet>
    </>
  );
}

export const TraversalSheet = memo(TraversalSheetComponent);
