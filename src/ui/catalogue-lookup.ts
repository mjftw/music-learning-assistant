import type { Catalogue, Variant } from "../theory/published";

export function findVariantById(
  catalogue: Catalogue,
  variantId: string,
): Variant | undefined {
  for (const instrument of catalogue.instruments) {
    for (const variant of instrument.variants) {
      if (variant.variantId === variantId) return variant;
    }
  }
  return undefined;
}
