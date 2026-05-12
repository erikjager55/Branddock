// =============================================================
// Prompt-version registry — type-safe lookup voor AICallSnapshot.promptVersion.
// Sub-sprint #5.A foundation.
//
// Semver-bumps:
//   - major (X.0.0): breaking change in output-format / schema
//   - minor (1.X.0): content-tuning (prompts gewijzigd, output blijft compat)
//   - patch (1.0.X): typo / wording-fix zonder gedragswijziging
//
// Bij elke wijziging in src/lib/studio/prompt-templates/<category>.ts:
//   1. Bump versie in dezelfde file (PROMPT_VERSION constant)
//   2. Update versie in deze registry hieronder
//   3. Run golden-set CI (sub-sprint #5.B) om regression te detecteren
// =============================================================

/**
 * Categorieën corresponderen met 8 prompt-template files in
 * src/lib/studio/prompt-templates/.
 */
export type PromptCategory =
  | 'long-form'
  | 'social-media'
  | 'advertising'
  | 'email'
  | 'website'
  | 'video-audio'
  | 'sales-enablement'
  | 'pr-hr-comms'
  | 'campaign-strategy'
  | 'campaign-concept';

/**
 * Authoritative versie-mapping. Wordt door canvas-orchestrator + andere
 * call-sites geconsulteerd om AICallSnapshot.promptVersion te vullen.
 *
 * v1.0.0 baseline = pre-chain-upgrades (sprint #5.B bumpt naar 2.0.0 wanneer
 * Chain-of-Thought / Plan-and-Solve / Tree-of-Thoughts patronen landen).
 */
export const PROMPT_VERSIONS: Record<PromptCategory, string> = {
  'long-form': '1.0.0',
  'social-media': '1.0.0',
  'advertising': '1.0.0',
  'email': '1.0.0',
  'website': '1.0.0',
  'video-audio': '1.0.0',
  'sales-enablement': '1.0.0',
  'pr-hr-comms': '1.0.0',
  'campaign-strategy': '1.0.0',
  'campaign-concept': '1.0.0',
};

/**
 * Type-safe lookup. Throws bij onbekende category om silent-default-versies
 * te vermijden (debug-vriendelijk bij refactor).
 */
export function getPromptVersion(category: PromptCategory): string {
  const version = PROMPT_VERSIONS[category];
  if (!version) {
    throw new Error(`Unknown prompt category: ${category}`);
  }
  return version;
}

/**
 * Map content-type → prompt-category. Hergebruikt door call-sites die
 * deliverable-type kennen maar niet expliciet category.
 *
 * Categorie-mapping consistent met src/lib/studio/prompt-templates/ files.
 */
const TYPE_TO_CATEGORY: Record<string, PromptCategory> = {
  // Long-form (7)
  'blog-post': 'long-form',
  'pillar-page': 'long-form',
  'whitepaper': 'long-form',
  'case-study': 'long-form',
  'ebook': 'long-form',
  'article': 'long-form',
  'thought-leadership': 'long-form',

  // Social Media (13)
  'linkedin-post': 'social-media',
  'linkedin-article': 'social-media',
  'linkedin-carousel': 'social-media',
  'linkedin-ad': 'social-media',
  'linkedin-newsletter': 'social-media',
  'linkedin-video': 'social-media',
  'linkedin-event': 'social-media',
  'linkedin-poll': 'social-media',
  'instagram-post': 'social-media',
  'twitter-thread': 'social-media',
  'facebook-post': 'social-media',
  'tiktok-script': 'social-media',
  'social-carousel': 'social-media',

  // Advertising & Paid (6)
  'search-ad': 'advertising',
  'social-ad': 'advertising',
  'display-ad': 'advertising',
  'retargeting-ad': 'advertising',
  'video-ad': 'advertising',
  'native-ad': 'advertising',

  // Email (5)
  'newsletter': 'email',
  'welcome-sequence': 'email',
  'promotional-email': 'email',
  'nurture-sequence': 'email',
  're-engagement-email': 'email',

  // Website & Landing Pages (5)
  'landing-page': 'website',
  'product-page': 'website',
  'faq-page': 'website',
  'comparison-page': 'website',
  'microsite': 'website',

  // Video & Audio (5)
  'explainer-video': 'video-audio',
  'promo-video': 'video-audio',
  'product-demo': 'video-audio',
  'podcast-outline': 'video-audio',
  'webinar-outline': 'video-audio',

  // Sales Enablement (4)
  'one-pager': 'sales-enablement',
  'sales-deck': 'sales-enablement',
  'battle-card': 'sales-enablement',
  'objection-handler': 'sales-enablement',

  // PR, HR & Communications (8)
  'press-release': 'pr-hr-comms',
  'media-pitch': 'pr-hr-comms',
  'company-announcement': 'pr-hr-comms',
  'job-description': 'pr-hr-comms',
  'recruitment-post': 'pr-hr-comms',
  'employee-newsletter': 'pr-hr-comms',
  'crisis-statement': 'pr-hr-comms',
  'thought-leadership-bio': 'pr-hr-comms',
};

/**
 * Type-to-category lookup met fallback. Onbekende types → 'long-form'
 * (graceful default ipv throw — orchestrator mag niet falen op nieuwe types).
 */
export function getCategoryForType(contentType: string): PromptCategory {
  return TYPE_TO_CATEGORY[contentType] ?? 'long-form';
}

/**
 * Convenience: ophalen versie direct op basis van content-type.
 */
export function getPromptVersionForType(contentType: string): string {
  return getPromptVersion(getCategoryForType(contentType));
}
