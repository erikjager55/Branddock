// Render-edge helpers for translating the product category registry.
// The constant registry (product-constants.ts) stays English source-of-truth;
// these helpers map its labels onto the `products-registry` i18n namespace.

/**
 * Derive the stable `products-registry:categoryGroup.*` key from a category
 * group's English label (e.g. "Experience & Lifestyle" -> "experience-lifestyle").
 */
export function categoryGroupKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s*&\s*/g, "-")
    .replace(/\s+/g, "-");
}
