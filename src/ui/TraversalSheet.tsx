import { memo, type CSSProperties, type JSX, type ReactNode } from "react";
import type {
  Direction,
  Octaves,
  OctaveCount,
  Shape,
  Traversal,
} from "../theory/published";
import type {
  HoldBeats,
  LeadSettings,
  SessionSettings,
  SoundMode,
  Tolerance,
} from "../practice/published";
import {
  cuesHintOf,
  holdHintOf,
  toleranceHintOf,
  whoHintOf,
} from "../practice/published";
import { fonts, paper, sheetRow } from "./theme";
import { BottomSheet, OverlayCloseButton, OverlayScrim } from "./overlay";
import { Switch } from "./Switch";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/003-hear-the-scale/design/hear-the-scale.dc.html,
// markup lines 145-193, pill/toggle paints script lines 573-584, pill lists
// script lines 692-715) and from the Traversal sheet's rebuild
// (changes/008-learner-leads/design/handoff.md, "Traversal sheet (09, 10)")
// — named here rather than re-derived by eye.
const SCRIM_Z_INDEX = 9;
const SHEET_Z_INDEX = 10;
const SHEET_PADDING_BOTTOM = 16;

const ROW_LABEL_FONT_WEIGHT = 600;

const PILL_ACTIVE_INK = "#4a4136";
const PILL_INACTIVE_INK = paper.pillInk;
// changes/005-scale-selection/design/hear-the-scale.dc.html, `kindPills`
// (script lines 819-822) — the arpeggio pill when the chosen scale does not
// offer one: transparent background, no-op pick, this ink.
const PILL_DISABLED_INK = "#c3baab";

const DIRECTION_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: sheetRow.pillPadding,
  borderRadius: sheetRow.pillRadius,
  fontSize: 14,
  fontWeight: 600,
};

const OCTAVE_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: sheetRow.pillPadding,
  borderRadius: sheetRow.pillRadius,
  fontFamily: fonts.mono,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const SHAPE_PILL_GEOMETRY: CSSProperties = {
  minWidth: 46,
  padding: "9px 12px 10px",
  borderRadius: sheetRow.pillRadius,
  fontSize: sheetRow.pillSize,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const SOUND_PILL_GEOMETRY: CSSProperties = {
  padding: "9px 11px 10px",
  borderRadius: sheetRow.pillRadius,
  fontSize: sheetRow.pillSize,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const WHO_PILL_GEOMETRY: CSSProperties = {
  padding: "9px 11px 10px",
  borderRadius: sheetRow.pillRadius,
  fontSize: sheetRow.pillSize,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const HOLD_PILL_GEOMETRY: CSSProperties = {
  minWidth: 26,
  padding: sheetRow.pillPadding,
  borderRadius: sheetRow.pillRadius,
  fontFamily: fonts.mono,
  fontSize: 12,
  fontWeight: 600,
};

const TOLERANCE_PILL_GEOMETRY: CSSProperties = {
  padding: "9px 11px 10px",
  borderRadius: sheetRow.pillRadius,
  fontSize: sheetRow.pillSize,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const CUE_PILL_GEOMETRY: CSSProperties = {
  padding: "9px 11px 10px",
  borderRadius: sheetRow.pillRadius,
  fontSize: sheetRow.pillSize,
  fontWeight: 600,
  whiteSpace: "nowrap",
};

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

const HOLD_BEATS: readonly HoldBeats[] = [1, 2, 4];

const TOLERANCES: readonly {
  readonly value: Tolerance;
  readonly label: string;
}[] = [
  { value: "lenient", label: "lenient" },
  { value: "medium", label: "medium" },
  { value: "accurate", label: "accurate" },
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

// Every row — fixed height (62 px), the label and its two-line hint box on
// the left, the control on the right, and (who-leads only) a trailing slot
// for the sheet's ✕ — practice.session/REQ-020.
function Row(props: {
  readonly dataRow: string;
  readonly label: string;
  readonly hint: string;
  readonly control: ReactNode;
  readonly trailing?: ReactNode;
}): JSX.Element {
  const { dataRow, label, hint, control, trailing } = props;
  return (
    <div
      data-testid="sheet-row"
      data-row={dataRow}
      style={{
        boxSizing: "border-box",
        height: sheetRow.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: `0 ${sheetRow.paddingX}px`,
        borderBottom: `1px solid ${paper.hairlineSoft}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: sheetRow.labelSize,
            fontWeight: ROW_LABEL_FONT_WEIGHT,
          }}
        >
          {label}
        </div>
        <div
          data-testid="row-hint"
          style={{
            fontSize: sheetRow.hintSize,
            lineHeight: `${sheetRow.hintLineHeight}px`,
            height: sheetRow.hintBoxHeight,
            color: paper.muted,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {hint}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {control}
        {trailing}
      </div>
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
  readonly tempoBpm: number;
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
    tempoBpm,
    onTraversal,
    onSettings,
    onClose,
  } = props;

  const octaveOptions = octaveOptionsOf(fittingCounts);
  const lead = settings.lead;

  function setLead(next: Partial<LeadSettings>): void {
    onSettings({ ...settings, lead: { ...lead, ...next } });
  }

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        <Row
          dataRow="who-leads"
          label="Who leads"
          hint={whoHintOf(lead.who)}
          control={
            <>
              <Pill
                label="play along"
                active={lead.who === "tool"}
                geometry={WHO_PILL_GEOMETRY}
                onClick={() => setLead({ who: "tool" })}
              />
              <Pill
                label="I lead"
                active={lead.who === "me"}
                geometry={WHO_PILL_GEOMETRY}
                onClick={() => setLead({ who: "me" })}
              />
            </>
          }
          trailing={
            <OverlayCloseButton
              ariaLabel="Close traversal sheet"
              onClose={onClose}
              testId="sheet-close"
            />
          }
        />
        {lead.who === "tool" ? (
          <>
            <Row
              dataRow="sound"
              label="Sound"
              hint="What it plays for you"
              control={SOUND_MODES.map((option) => (
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
            />
            <Row
              dataRow="count-in"
              label="Count-in"
              hint="A bar of clicks before it starts"
              control={
                <Switch
                  label="Count-in"
                  on={settings.countIn}
                  onToggle={() =>
                    onSettings({ ...settings, countIn: !settings.countIn })
                  }
                />
              }
            />
            <Row
              dataRow="rest-bar"
              label="Rest bar"
              hint="A bar's rest before each loop"
              control={
                <Switch
                  label="Rest bar"
                  on={settings.restBar}
                  onToggle={() =>
                    onSettings({ ...settings, restBar: !settings.restBar })
                  }
                />
              }
            />
          </>
        ) : (
          <>
            <Row
              dataRow="hold"
              label="Hold"
              hint={holdHintOf(lead.holdBeats, tempoBpm)}
              control={HOLD_BEATS.map((beats) => (
                <Pill
                  key={beats}
                  label={String(beats)}
                  active={lead.holdBeats === beats}
                  geometry={HOLD_PILL_GEOMETRY}
                  onClick={() => setLead({ holdBeats: beats })}
                />
              ))}
            />
            <Row
              dataRow="in-tune"
              label="In tune"
              hint={toleranceHintOf(lead.tolerance)}
              control={TOLERANCES.map((option) => (
                <Pill
                  key={option.value}
                  label={option.label}
                  active={lead.tolerance === option.value}
                  geometry={TOLERANCE_PILL_GEOMETRY}
                  onClick={() => setLead({ tolerance: option.value })}
                />
              ))}
            />
            <Row
              dataRow="cues"
              label="Cues"
              hint={cuesHintOf(lead.cueMeter, lead.cueTone)}
              control={
                <>
                  <Pill
                    label="meter"
                    active={lead.cueMeter}
                    geometry={CUE_PILL_GEOMETRY}
                    onClick={() => setLead({ cueMeter: !lead.cueMeter })}
                  />
                  <Pill
                    label="tone"
                    active={lead.cueTone}
                    geometry={CUE_PILL_GEOMETRY}
                    onClick={() => setLead({ cueTone: !lead.cueTone })}
                  />
                </>
              }
            />
          </>
        )}
        <div
          data-testid="sheet-hairline"
          style={{
            height: 1,
            marginTop: -1,
            background: sheetRow.hairline,
          }}
        />
        <Row
          dataRow="direction"
          label="Direction"
          hint="Up, down, or up and back"
          control={DIRECTIONS.map((option) => (
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
        />
        <Row
          dataRow="octaves"
          label="Octaves"
          hint="How far the run goes"
          control={octaveOptions.map((option) => (
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
        />
        <Row
          dataRow="shape"
          label="Shape"
          hint="Every note, or 1 3 5"
          control={SHAPES.map((option) => {
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
        />
        <Row
          dataRow="loop"
          label="Loop"
          hint="Start again at the end"
          control={
            <Switch
              label="Loop"
              on={settings.loop}
              onToggle={() => onSettings({ ...settings, loop: !settings.loop })}
            />
          }
        />
      </BottomSheet>
    </>
  );
}

export const TraversalSheet = memo(TraversalSheetComponent);
