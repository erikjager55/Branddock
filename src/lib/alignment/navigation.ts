/**
 * Alignment Navigation Helper
 *
 * Maps alignment issue entity types to their sidebar section IDs.
 * Used by IssueCard "View Source" and FixIssueModal "Edit Manually".
 */

const ENTITY_SECTION_MAP: Record<string, string> = {
  BrandAsset: 'brand-asset-detail',
  Persona: 'persona-detail',
  Product: 'product-detail',
  Insight: 'insight-detail',
  MarketInsight: 'insight-detail',
  Strategy: 'strategy-detail',
  BusinessStrategy: 'strategy-detail',
  Brandstyle: 'brandstyle-guide',
  BrandStyleguide: 'brandstyle-guide',
};

/**
 * Returns the sidebar section ID for a given entity type.
 * Returns null if the entity type is unknown or null.
 */
export function getEntitySection(itemType: string | null): string | null {
  if (!itemType) return null;
  return ENTITY_SECTION_MAP[itemType] ?? null;
}
