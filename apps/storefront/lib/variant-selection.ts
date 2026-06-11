import type { ProductDetailView } from "@/lib/db";

export type Variant = ProductDetailView["variants"][number];
export type Media = ProductDetailView["media"][number];

export type AttrGroup = {
  code: string;
  label: string;
  values: Array<{ value: string; valueLabel: string; swatchHex: string | null }>;
};

export function buildAttrGroups(variants: Variant[]): AttrGroup[] {
  const groups = new Map<string, AttrGroup>();
  for (const v of variants) {
    for (const a of v.attributes) {
      let g = groups.get(a.code);
      if (!g) {
        g = { code: a.code, label: a.label, values: [] };
        groups.set(a.code, g);
      }
      if (!g.values.find((x) => x.value === a.value)) {
        g.values.push({ value: a.value, valueLabel: a.valueLabel, swatchHex: a.swatchHex });
      }
    }
  }
  return [...groups.values()];
}

export function findVariant(
  variants: Variant[],
  selection: Record<string, string>,
): Variant | undefined {
  return variants.find((v) =>
    Object.entries(selection).every(([code, val]) =>
      v.attributes.some((a) => a.code === code && a.value === val),
    ),
  );
}

/**
 * A value is "selectable" if at least one variant carries it. We do NOT
 * require compatibility with the rest of the selection — clicking snaps the
 * other attributes to a matching variant (see pickBestVariant), avoiding the
 * sparse-matrix dead-end.
 */
export function valueExists(variants: Variant[], code: string, value: string): boolean {
  return variants.some((v) => v.attributes.some((a) => a.code === code && a.value === value));
}

export function valueInStock(variants: Variant[], code: string, value: string): boolean {
  return variants.some(
    (v) => v.available > 0 && v.attributes.some((a) => a.code === code && a.value === value),
  );
}

/**
 * Given the current selection and a newly-clicked (code,value), pick the
 * variant that best matches: it must contain the clicked value; among those
 * prefer maximum overlap with the rest of the selection, breaking ties toward
 * in-stock variants. Returns the full attribute selection for that variant.
 */
export function pickBestVariant(
  variants: Variant[],
  selection: Record<string, string>,
  code: string,
  value: string,
): Record<string, string> {
  const candidates = variants.filter((v) =>
    v.attributes.some((a) => a.code === code && a.value === value),
  );
  if (candidates.length === 0) return { ...selection, [code]: value };

  let best = candidates[0]!;
  let bestScore = -1;
  for (const v of candidates) {
    let overlap = 0;
    for (const [c, val] of Object.entries(selection)) {
      if (c === code) continue;
      if (v.attributes.some((a) => a.code === c && a.value === val)) overlap += 1;
    }
    const score = overlap * 2 + (v.available > 0 ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }

  const next: Record<string, string> = {};
  for (const a of best.attributes) next[a.code] = a.value;
  return next;
}

/**
 * Filters the gallery to the active variant when the product opted into
 * per-attribute images: images tagged to the selected image-attribute value,
 * with shared (untagged) images appended as fallback.
 */
export function pickGalleryImages(
  product: ProductDetailView,
  selection: Record<string, string>,
): Media[] {
  const code = product.imageAttributeCode;
  if (!product.useVariantImages || !code) return product.media;
  const selectedValue = selection[code];
  if (!selectedValue) return product.media;
  const tagged = product.media.filter((m) => m.attributeValue === selectedValue);
  const shared = product.media.filter((m) => m.attributeValue === null);
  return tagged.length > 0 ? [...tagged, ...shared] : product.media;
}

/** Initial attribute selection from a product's default (or first) variant. */
export function initialSelection(variants: Variant[]): Record<string, string> {
  const def = variants.find((v) => v.isDefault) ?? variants[0];
  const out: Record<string, string> = {};
  if (def) for (const a of def.attributes) out[a.code] = a.value;
  return out;
}
