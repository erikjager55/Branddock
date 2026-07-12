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

import { LONG_FORM_TEMPLATES } from '@/lib/studio/prompt-templates/long-form';
import { SOCIAL_MEDIA_TEMPLATES } from '@/lib/studio/prompt-templates/social-media';
import { ADVERTISING_TEMPLATES } from '@/lib/studio/prompt-templates/advertising';
import { EMAIL_TEMPLATES } from '@/lib/studio/prompt-templates/email';
import { WEBSITE_TEMPLATES } from '@/lib/studio/prompt-templates/website';
import { VIDEO_AUDIO_TEMPLATES } from '@/lib/studio/prompt-templates/video-audio';
import { SALES_TEMPLATES } from '@/lib/studio/prompt-templates/sales';
import { PR_HR_TEMPLATES } from '@/lib/studio/prompt-templates/pr-hr';

/**
 * Categorieën corresponderen met de 8 prompt-template files in
 * src/lib/studio/prompt-templates/, plus prompt-families buiten die map
 * die wél AICallSnapshot-tracking hebben (campaign-strategy/-concept,
 * exploration, fidelity-judge, strategic-implications).
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
  | 'campaign-concept'
  | 'exploration'
  | 'fidelity-judge'
  | 'strategic-implications';

/**
 * Authoritative versie-mapping. Wordt door canvas-orchestrator + andere
 * call-sites geconsulteerd om AICallSnapshot.promptVersion te vullen.
 *
 * v1.0.0 baseline = pre-chain-upgrades (sprint #5.B bumpt naar 2.0.0 wanneer
 * Chain-of-Thought / Plan-and-Solve / Tree-of-Thoughts patronen landen).
 */
export const PROMPT_VERSIONS: Record<PromptCategory, string> = {
  // 1.2.0 = FORMULA_LIBRARY toegevoegd aan buildBaseSystemPrompt (content-test
  // verbeterpunten #2/#3/#5 uit Cowork-analyse 2026-05-12: expliciete
  // headline-formules + hook-types + CTA-richtlijnen). Output-format compat.
  // 1.1.0 = REASONING_APPROACH implicit-CoT.
  // 1.3.0 (2026-06-11): registry liep achter op long-form.ts (pre-existing
  // drift, gevonden door smoke:prompt-contracts) — gelijkgetrokken met de
  // file zodat AICallSnapshot.promptVersion truthful is.
  'long-form': '1.3.0',
  // 2.0.0 (2026-06-11) = prompt-audit Fase 2: output-schema gewijzigd naar
  // per-group component-contracten (C3/C4/C5) — nieuwe/hernoemde groepen voor
  // email-sequences, website-types, sales, pr-hr, video-outlines en
  // linkedin-carousel/tiktok-script. Major: output-format breaking t.o.v. 1.2.0.
  'social-media': '2.0.0',
  'advertising': '1.2.0',
  'email': '2.0.0',
  'website': '2.0.0',
  'video-audio': '2.0.0',
  'sales-enablement': '2.0.0',
  'pr-hr-comms': '2.0.0',
  // campaign-strategy + campaign-concept gebruiken niet buildBaseSystemPrompt.
  // 1.1.0 (2026-06-11): Fase 4 jargon-sweep (award-namen vervangen, output-
  // language-guards in variant B/C + defense, English-forcering quick-concept
  // verwijderd) + runtime locale-fragment/EXACT-schema-block appends.
  'campaign-strategy': '1.1.0',
  'campaign-concept': '1.0.0',
  // Niet-content-template-families met bestaande AICallSnapshot-tracking maar
  // zonder registry-entry tot nu toe (prompt-audit 2026-06-11 §4 T8).
  // 'exploration' = de admin-configureerbare ExplorationConfig-prompts
  // (system/feedback/report), gelogd via generateAIResponse in de exploration
  // answer-route. 'fidelity-judge' = de visual-fidelity judge-stack
  // (visual-ai-judge + OCR-penalty + copy-image-coherence), gelogd via
  // tryTrackStart in visual-fidelity-scorer.ts. 'strategic-implications' =
  // de persona strategic-implications-prompt, gelogd via
  // createClaudeStructuredCompletion in de personas-route (Fase 5 M2).
  // 1.0.0 = baseline op moment van opname; bump bij prompt-wijzigingen in
  // die families.
  'exploration': '1.0.0',
  'fidelity-judge': '1.0.0',
  'strategic-implications': '1.0.0',
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
 * Map content-type → prompt-category, afgeleid uit de 8 template-collecties
 * zelf (CF-4, content-flow-improvements-7a). De handmatige voorganger was
 * gedivergeerd: ~9 phantom-IDs (battle-card, product-demo, crisis-statement, …)
 * en ~11 echte types die ontbraken en daardoor via de fallback op 'long-form'
 * landden (o.a. facebook-ad, proposal-template, impact-report). Door de map
 * uit dezelfde bron als TEMPLATE_REGISTRY op te bouwen kán hij niet opnieuw
 * divergeren; smoke:prompt-contracts sectie (g) bewaakt de dekking tegen
 * DELIVERABLE_TYPE_IDS.
 *
 * NB: linkedin-ad / facebook-ad / linkedin-article leven in social-media.ts
 * terwijl hun UI-categorie afwijkt (CF-8) — de prompt-versie-categorie volgt
 * bewust het template-bestand; model-routing gebruikt de UI-categorie via
 * getDeliverableTypeById en raakt deze map niet.
 */
const CATEGORY_COLLECTIONS: ReadonlyArray<
  readonly [Record<string, unknown>, PromptCategory]
> = [
  [LONG_FORM_TEMPLATES, 'long-form'],
  [SOCIAL_MEDIA_TEMPLATES, 'social-media'],
  [ADVERTISING_TEMPLATES, 'advertising'],
  [EMAIL_TEMPLATES, 'email'],
  [WEBSITE_TEMPLATES, 'website'],
  [VIDEO_AUDIO_TEMPLATES, 'video-audio'],
  [SALES_TEMPLATES, 'sales-enablement'],
  [PR_HR_TEMPLATES, 'pr-hr-comms'],
];

const TYPE_TO_CATEGORY: Record<string, PromptCategory> = Object.fromEntries(
  CATEGORY_COLLECTIONS.flatMap(([collection, category]) =>
    Object.keys(collection).map((typeId) => [typeId, category] as const),
  ),
);

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
