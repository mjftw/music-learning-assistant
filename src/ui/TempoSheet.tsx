import { memo, type JSX } from "react";
import type { TempoTerm } from "../practice/published";
import { TEMPO_TERMS, tempoTermFor } from "../practice/published";
import { fonts, paper } from "./theme";
import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/003-hear-the-scale/design/hear-the-scale.dc.html,
// markup lines 196-217, tempo row paints script lines 816-829) — named here
// rather than re-derived by eye.
const SCRIM_Z_INDEX = 11;
const SHEET_Z_INDEX = 12;
const SHEET_PADDING_BOTTOM = 14;

const HEADER_PADDING = "16px 18px 12px";
const HEADER_BPM_FONT_SIZE = 11.5;
const HEADER_BPM_FONT_WEIGHT = 400;
const HEADER_BPM_COLOR = paper.muted;

const ROW_PADDING = "11px 18px";
const CURRENT_ROW_BACKGROUND = "rgba(138,75,42,.08)";

const NAME_FONT_SIZE = 14.5;
const NAME_WEIGHT_CURRENT = 700;
const NAME_WEIGHT_DEFAULT = 600;

const GLOSS_FONT_SIZE = 11.5;
const GLOSS_COLOR = paper.muted;

const BAND_FONT_SIZE = 11.5;
const BAND_COLOR = paper.muted;

const TICK_WIDTH = 14;
const TICK_FONT_SIZE = 13;
const TICK_COLOR = paper.accent;
const TICK_GLYPH = "✓";

function bandLabelOf(term: TempoTerm): string {
  return `${term.fromBpm}–${term.toBpm}`;
}

// Never opens itself (Article VI) — `open` is driven entirely by the
// caller's state; this component only ever asks to close, via `onClose`
// (and `onPick`, which the caller also treats as a close).
// Wrapped in `React.memo` (T032) — `tempoBpm` is a primitive and the
// handlers are `useCallback`-stabilised, so this never re-renders during
// playback (`tempoBpm` itself only changes on a tempo change, not per
// beat).
function TempoSheetComponent(props: {
  readonly open: boolean;
  readonly tempoBpm: number;
  readonly onPick: (term: TempoTerm) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const { open, tempoBpm, onPick, onClose } = props;
  const currentTerm = tempoTermFor(tempoBpm);

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        <OverlayHeader
          title={
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span>Tempo</span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: HEADER_BPM_FONT_SIZE,
                  fontWeight: HEADER_BPM_FONT_WEIGHT,
                  color: HEADER_BPM_COLOR,
                }}
              >
                {tempoBpm} bpm
              </span>
            </span>
          }
          padding={HEADER_PADDING}
          closeAriaLabel="Close tempo sheet"
          onClose={onClose}
        />
        {TEMPO_TERMS.map((term) => {
          const isCurrent = term.name === currentTerm.name;
          return (
            <button
              key={term.name}
              type="button"
              aria-current={isCurrent ? "true" : undefined}
              onClick={() => onPick(term)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: ROW_PADDING,
                border: "none",
                borderBottom: `1px solid ${paper.hairlineSoft}`,
                background: isCurrent ? CURRENT_ROW_BACKGROUND : "transparent",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 9,
                  minWidth: 0,
                }}
              >
                <div
                  data-testid="tempo-term-name"
                  style={{
                    fontSize: NAME_FONT_SIZE,
                    lineHeight: 1,
                    fontWeight: isCurrent
                      ? NAME_WEIGHT_CURRENT
                      : NAME_WEIGHT_DEFAULT,
                    color: isCurrent ? paper.accent : paper.ink,
                  }}
                >
                  {term.name}
                </div>
                <div
                  style={{
                    fontSize: GLOSS_FONT_SIZE,
                    color: GLOSS_COLOR,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {term.gloss}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: "none",
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: BAND_FONT_SIZE,
                    color: BAND_COLOR,
                  }}
                >
                  {bandLabelOf(term)}
                </div>
                <div
                  style={{
                    width: TICK_WIDTH,
                    fontSize: TICK_FONT_SIZE,
                    color: TICK_COLOR,
                    textAlign: "right",
                  }}
                >
                  {isCurrent ? TICK_GLYPH : ""}
                </div>
              </div>
            </button>
          );
        })}
      </BottomSheet>
    </>
  );
}

export const TempoSheet = memo(TempoSheetComponent);
