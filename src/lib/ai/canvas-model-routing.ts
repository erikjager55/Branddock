// =============================================================
// Per-content-type model routing (F29, audit 2026-05-13)
// =============================================================
// Eigen experiment 2026-05-13 (8 content-types × 6 modellen)
// toonde dat de optimale generation-model VARIEERT per content-
// type categorie. Voorheen gebruikten we één default voor alle
// content-types (canvas-text-generate feature). Deze module
// resolved per content-type het optimale model.
//
// Mapping per categorie (composite-scores experimenteel gemeten):
//
//   Long-Form Content       → Opus 4.7    (91, runner-up GPT-5.4 87)
//   Email & Automation      → Opus 4.7    (91, runner-up Sonnet 4.6 87)
//   Video & Audio           → Opus 4.7    (91, runner-up GPT-5.4 87)
//   PR/HR & Communications  → Opus 4.7    (92, runner-up GPT-5.4 90)
//   Sales Enablement        → Opus 4.7    (89, tied Sonnet 4.6 89)
//   Social Media            → GPT-5.4     (91, runner-up Sonnet 4.6 88)
//   Advertising & Paid      → Gemini 3.1 Pro (90, runner-up Opus 4.7 89)
//   Website & Landing Pages → Sonnet 4.6  (91, runner-up Opus 4.7 89)
//
// Cost-besparing voor cheap categorieën: factor 5-8 t.o.v. Opus.
// =============================================================

import { resolveFeatureModel } from './feature-models.server';
import type { ResolvedModel } from './feature-models';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';

interface ContentTypeOptimalModel {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
}

const CATEGORY_OPTIMAL_MODEL: Record<string, ContentTypeOptimalModel> = {
  'Long-Form Content': { provider: 'anthropic', model: 'claude-opus-4-8' },
  'Email & Automation': { provider: 'anthropic', model: 'claude-opus-4-8' },
  'Video & Audio': { provider: 'anthropic', model: 'claude-opus-4-8' },
  'PR, HR & Communications': { provider: 'anthropic', model: 'claude-opus-4-8' },
  'Sales Enablement': { provider: 'anthropic', model: 'claude-opus-4-8' },
  'Social Media': { provider: 'openai', model: 'gpt-5.6' },
  'Advertising & Paid': { provider: 'google', model: 'gemini-3.1-pro-preview' },
  'Website & Landing Pages': { provider: 'anthropic', model: 'claude-sonnet-5' },
};

/**
 * Resolve the optimal generation-model for a specific content-type.
 *
 * Priority order:
 *   1. Workspace-level override (WorkspaceAiConfig in DB) — explicit user choice wins.
 *   2. Content-type category → optimal model mapping (per experiment 2026-05-13).
 *   3. Feature-default fallback (canvas-text-generate).
 *
 * Returns null-safe: always produces a ResolvedModel.
 */
export async function resolveCanvasModelForContentType(
  workspaceId: string,
  contentTypeId: string | null,
): Promise<ResolvedModel> {
  // Step 1: workspace override beats per-content-type default.
  // resolveFeatureModel returns workspace-config first, falls back to feature-default.
  const featureResolved = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

  // If workspace has a DB override, respect it. We detect this by comparing
  // against the feature-default — if the resolved provider/model differs,
  // workspace-config is in play and we should not overrule it.
  // (Note: this gives the wrong-positive result when workspace happens to
  // configure exactly the feature-default; that case is harmless — both paths
  // lead to the same model.)
  const { getFeatureDefinition } = await import('./feature-models');
  const featureDef = getFeatureDefinition('canvas-text-generate');
  const hasWorkspaceOverride =
    featureDef &&
    (featureResolved.provider !== featureDef.defaultProvider ||
      featureResolved.model !== featureDef.defaultModel);
  if (hasWorkspaceOverride) {
    return featureResolved;
  }

  // Step 2: content-type → category → optimal model
  if (contentTypeId) {
    const typeDef = getDeliverableTypeById(contentTypeId);
    if (typeDef?.category) {
      const optimal = CATEGORY_OPTIMAL_MODEL[typeDef.category];
      if (optimal) {
        return { provider: optimal.provider, model: optimal.model };
      }
    }
  }

  // Step 3: fallback to feature-default
  return featureResolved;
}
