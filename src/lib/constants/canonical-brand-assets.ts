/**
 * Canonical Brand Assets — single source of truth for the 11 fixed brand assets
 * every workspace gets automatically.
 *
 * Imported by: seed, workspace creation (API + auth provisioning).
 */

export interface CanonicalBrandAsset {
  name: string;
  slug: string;
  category: string; // Prisma AssetCategory enum value
  description: string;
  frameworkType: string;
}

export const CANONICAL_BRAND_ASSETS: CanonicalBrandAsset[] = [
  { name: "Purpose Statement",    slug: "purpose-statement",    category: "PURPOSE",     description: "The reason your organization exists beyond profit",    frameworkType: "PURPOSE_WHEEL" },
  { name: "Golden Circle",        slug: "golden-circle",        category: "FOUNDATION",  description: "Simon Sinek's WHY → HOW → WHAT framework",           frameworkType: "GOLDEN_CIRCLE" },
  { name: "Brand Essence",        slug: "brand-essence",        category: "CORE",        description: "The heart and soul of your brand",                    frameworkType: "BRAND_ESSENCE" },
  { name: "Brand Promise",        slug: "brand-promise",        category: "STRATEGY",    description: "Core commitment to your customers",                  frameworkType: "BRAND_PROMISE" },
  { name: "Mission & Vision",      slug: "mission-statement",    category: "STRATEGY",    description: "What you do today and where you're headed",           frameworkType: "MISSION_STATEMENT" },
  { name: "Brand Archetype",      slug: "brand-archetype",      category: "PERSONALITY", description: "Universal behavior patterns",                         frameworkType: "BRAND_ARCHETYPE" },
  { name: "Transformative Goals", slug: "transformative-goals", category: "STRATEGY",    description: "Ambitious goals for lasting impact",                  frameworkType: "TRANSFORMATIVE_GOALS" },
  { name: "Brand Personality",    slug: "brand-personality",    category: "PERSONALITY", description: "Human characteristics of your brand",                 frameworkType: "BRAND_PERSONALITY" },
  { name: "Brand Story",          slug: "brand-story",          category: "NARRATIVE",   description: "Your brand's past, present and future",               frameworkType: "BRAND_STORY" },
  { name: "Core Values",          slug: "core-values",          category: "CULTURE",     description: "Fundamental beliefs that guide your brand",            frameworkType: "BRANDHOUSE_VALUES" },
  { name: "Social Relevancy",     slug: "social-relevancy",     category: "ESG",         description: "Your brand's societal and environmental impact",       frameworkType: "ESG" },
];

/** The 4 research method types every brand asset gets */
export const RESEARCH_METHOD_TYPES = [
  "AI_EXPLORATION",
  "WORKSHOP",
  "INTERVIEWS",
  "QUESTIONNAIRE",
] as const;

/** Validation weights per research method (used in validation % calculation) */
export const RESEARCH_METHOD_WEIGHTS: Record<string, number> = {
  AI_EXPLORATION: 0.15,
  WORKSHOP: 0.30,
  INTERVIEWS: 0.25,
  QUESTIONNAIRE: 0.30,
};
