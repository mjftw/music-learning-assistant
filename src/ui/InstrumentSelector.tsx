import type { JSX } from "react";
import type { Catalogue, Variant } from "../theory/published";
import { findVariantById } from "./catalogue-lookup";

// The unit of selection is always a variant (theory.instruments/REQ-001), so
// this renders one flat <select>, options grouped by instrument, rather than
// a two-step instrument-then-variant picker.
export function InstrumentSelector(props: {
  readonly catalogue: Catalogue;
  readonly selectedVariantId: string;
  readonly onSelect: (variant: Variant) => void;
}): JSX.Element {
  const { catalogue, selectedVariantId, onSelect } = props;

  return (
    <select
      aria-label="Instrument"
      value={selectedVariantId}
      onChange={(event) => {
        const variant = findVariantById(catalogue, event.target.value);
        if (variant !== undefined) onSelect(variant);
      }}
    >
      {catalogue.instruments.map((instrument) => (
        <optgroup
          key={instrument.instrumentId}
          label={instrument.instrumentName}
        >
          {instrument.variants.map((variant) => (
            <option key={variant.variantId} value={variant.variantId}>
              {`${instrument.instrumentName} — ${variant.variantName}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
