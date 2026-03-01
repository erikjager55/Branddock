/**
 * Maps brand asset frameworkType (UPPER_SNAKE_CASE) to exploration subType (kebab-case).
 * PURPOSE_WHEEL maps to 'purpose-statement' (not 'purpose-wheel') because the DB config
 * and system defaults use 'purpose-statement' as the subtype.
 */
export const FRAMEWORK_TO_SUBTYPE: Record<string, string> = {
  PURPOSE_WHEEL: 'purpose-statement',
  GOLDEN_CIRCLE: 'golden-circle',
  BRAND_ESSENCE: 'brand-essence',
  BRAND_PROMISE: 'brand-promise',
  MISSION_STATEMENT: 'mission-statement',
  VISION_STATEMENT: 'vision-statement',
  BRAND_ARCHETYPE: 'brand-archetype',
  TRANSFORMATIVE_GOALS: 'transformative-goals',
  BRAND_PERSONALITY: 'brand-personality',
  BRAND_STORY: 'brand-story',
  BRANDHOUSE_VALUES: 'brandhouse-values',
  // Legacy types
  ESG: 'social-relevancy',
  PURPOSE_KOMPAS: 'purpose-statement',
};

/**
 * Resolve the exploration itemSubType from an item record.
 * For brand assets: uses slug if available, otherwise converts frameworkType to kebab-case.
 * For other types: uses slug directly.
 */
export function resolveItemSubType(item: Record<string, unknown> | null): string | null {
  if (!item) return null;

  if (item.slug && typeof item.slug === 'string') {
    return item.slug;
  }

  if (item.frameworkType && typeof item.frameworkType === 'string') {
    return FRAMEWORK_TO_SUBTYPE[item.frameworkType]
      ?? (item.frameworkType as string).toLowerCase().replace(/_/g, '-');
  }

  return null;
}
