/**
 * Shared stripping of brandstyle-analyzer review markers.
 *
 * The brandstyle analyzer labels imagery/photography fields with
 * "OBSERVED:" (seen on the scraped site) and "RECOMMENDED:" (inferred
 * direction when no photography was visible) — see analysis-prompts.ts.
 * Those markers are review metadata for the styleguide UI, not prompt
 * copy: unstripped they leak verbatim into image/video prompts where
 * models treat them as literal style direction (audit 2026-06-11 T5).
 *
 * Behavior intentionally mirrors the LP brand-tokens fix of 2026-06-10:
 * labels are removed wherever they occur (also mid-string) while the
 * passage content is kept — RECOMMENDED text is the analyzer's only
 * style signal for brands without visible photography, so dropping the
 * passage would empty the field exactly where it matters most.
 */

/**
 * Remove all analyzer markers (OBSERVED:/RECOMMENDED:/NOTE:) from a text
 * value, keeping the passage content. Collapses the double whitespace
 * left behind by removed labels. Returns '' for null/undefined input.
 */
export function stripAnalyzerMarkers(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\b(observed|recommended|note):\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Strip analyzer markers from every entry of a string list (e.g.
 * photography guidelines), dropping entries that end up empty.
 */
export function stripAnalyzerMarkersFromList(
  items: readonly (string | null | undefined)[],
): string[] {
  return items.map(stripAnalyzerMarkers).filter((item) => item.length > 0);
}
