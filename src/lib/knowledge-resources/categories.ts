/**
 * Single source of truth voor de Knowledge Library-categorieën.
 *
 * Geëxtraheerd uit de categories-route (`/api/knowledge-resources/categories`)
 * zodat de Deep Research-pipeline (FINALIZE-fase) kan garanderen dat een door
 * het model voorgestelde categorie altijd een geldige waarde is.
 */
export const RESOURCE_CATEGORIES = [
  "Brand Strategy",
  "Competitor Analysis",
  "Data Analysis",
  "Research",
  "Content",
  "Marketing",
  "Design",
  "Technology",
  "Psychology",
  "User Experience",
  "Trends",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

/** Default-categorie als er geen match is. */
export const DEFAULT_RESOURCE_CATEGORY: ResourceCategory = "Research";

/**
 * Mapt een vrije string naar de dichtstbijzijnde geldige categorie
 * (case-insensitief). Valt terug op {@link DEFAULT_RESOURCE_CATEGORY}.
 */
export function coerceCategory(value: string | null | undefined): string {
  if (!value) return DEFAULT_RESOURCE_CATEGORY;
  const normalized = value.trim().toLowerCase();
  const match = RESOURCE_CATEGORIES.find((c) => c.toLowerCase() === normalized);
  return match ?? DEFAULT_RESOURCE_CATEGORY;
}
