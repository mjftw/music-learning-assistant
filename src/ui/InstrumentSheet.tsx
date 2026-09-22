import type { JSX } from "react";
import type { Catalogue, Variant } from "../theory/published";
import { noteLabel } from "./key-label";
import { fonts, paper } from "./theme";
import { BottomSheet, OverlayScrim, OverlayHeader } from "./overlay";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html
// — the instrument picker block) — named here rather than re-derived by eye.
const SCRIM_Z_INDEX = 7;
const SHEET_Z_INDEX = 8;
const SHEET_PADDING_BOTTOM = 14;

const HEADER_PADDING = "16px 18px 12px";

const ROW_PADDING = "15px 18px";
const ROW_BORDER = `1px solid ${paper.hairlineSoft}`;
const ROW_SELECTED_BACKGROUND = "rgba(138,75,42,.08)";
const ROW_GAP = 12;

const NAME_GROUP_GAP = 8;
const INSTRUMENT_NAME_FONT_SIZE = 14;
const INSTRUMENT_NAME_WEIGHT_SELECTED = 700;
const INSTRUMENT_NAME_WEIGHT_DEFAULT = 600;

const VARIANT_NAME_FONT_SIZE = 12.5;
const VARIANT_NAME_COLOR = paper.muted;

const META_GAP = 10;
const RANGE_FONT_SIZE = 11.5;
const RANGE_COLOR = paper.muted;

const TICK_SLOT_WIDTH = 16;
const TICK_FONT_SIZE = 13;
const TICK_COLOR = paper.accent;
const TICK_GLYPH = "✓";

function rangeLabel(variant: Variant): string {
  return `${noteLabel(variant.range.lowest)}–${noteLabel(variant.range.highest)}`;
}

// Never opens itself (Article VI) — `open` is driven entirely by the
// caller's state; this component only ever asks to close, via `onClose`
// (and `onSelect`, which the caller also treats as a close).
export function InstrumentSheet(props: {
  readonly open: boolean;
  readonly catalogue: Catalogue;
  readonly selectedVariantId: string;
  readonly onSelect: (variant: Variant) => void;
  readonly onClose: () => void;
}): JSX.Element {
  const { open, catalogue, selectedVariantId, onSelect, onClose } = props;

  return (
    <>
      <OverlayScrim open={open} zIndex={SCRIM_Z_INDEX} onClose={onClose} />
      <BottomSheet
        open={open}
        zIndex={SHEET_Z_INDEX}
        paddingBottom={SHEET_PADDING_BOTTOM}
      >
        <OverlayHeader
          title="Instrument"
          padding={HEADER_PADDING}
          closeAriaLabel="Close instrument picker"
          onClose={onClose}
        />
        {catalogue.instruments.flatMap((instrument) =>
          instrument.variants.map((variant) => {
            const selected = variant.variantId === selectedVariantId;
            return (
              <button
                key={variant.variantId}
                type="button"
                aria-label={`${instrument.instrumentName} ${variant.variantName}`}
                onClick={() => onSelect(variant)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: ROW_GAP,
                  padding: ROW_PADDING,
                  border: "none",
                  borderBottom: ROW_BORDER,
                  background: selected ? ROW_SELECTED_BACKGROUND : "none",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: NAME_GROUP_GAP,
                  }}
                >
                  <span
                    style={{
                      fontSize: INSTRUMENT_NAME_FONT_SIZE,
                      fontWeight: selected
                        ? INSTRUMENT_NAME_WEIGHT_SELECTED
                        : INSTRUMENT_NAME_WEIGHT_DEFAULT,
                      color: paper.ink,
                    }}
                  >
                    {instrument.instrumentName}
                  </span>
                  <span
                    style={{
                      fontSize: VARIANT_NAME_FONT_SIZE,
                      color: VARIANT_NAME_COLOR,
                    }}
                  >
                    {variant.variantName}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: META_GAP,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: RANGE_FONT_SIZE,
                      color: RANGE_COLOR,
                    }}
                  >
                    {rangeLabel(variant)}
                  </span>
                  <span
                    style={{
                      width: TICK_SLOT_WIDTH,
                      fontSize: TICK_FONT_SIZE,
                      color: TICK_COLOR,
                      textAlign: "right",
                    }}
                  >
                    {selected ? TICK_GLYPH : ""}
                  </span>
                </div>
              </button>
            );
          }),
        )}
      </BottomSheet>
    </>
  );
}
