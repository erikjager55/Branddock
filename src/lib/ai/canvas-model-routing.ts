// =============================================================
// Per-content-type model routing (F29, audit 2026-05-13)
// =============================================================
// Eigen experiment 2026-05-13 (8 content-types × 6 modellen)
// toonde dat de optimale generation-model VARIEERT per content-
// type categorie. Voorheen gebruikten we één default voor alle
// content-types (canvas-text-generate feature). Deze module
// resolved per content-type het optimale model.
//
// Mapping per categorie. ⚠️ LEES DE RUISMARGE VOORDAT JE HIER IETS VERPLAATST.
//
//   Long-Form Content       → Opus        (mei 91 / aug 90)
//   Email & Automation      → Opus        (mei 91 / aug 90)
//   Video & Audio           → Opus        (mei 91 / aug 92)
//   PR/HR & Communications  → Opus        (mei 92 / aug 89)
//   Sales Enablement        → Opus        (mei 89 / aug 91)
//   Social Media            → GPT         (mei 91 / aug 90)
//   Advertising & Paid      → Gemini 3.1 Pro (mei 90; aug won GPT-5.6 met 90 — GELIJKSPEL)
//   Website & Landing Pages → Sonnet      (mei 91; aug won GPT-5.6 met 91 — GELIJKSPEL)
//
// ⚠️ DE RUIS IS GROTER DAN DE VERSCHILLEN. Bij de herijking van 2026-08-20
// draaiden twee modellen ONGEWIJZIGD mee als controle (Haiku 4.5, Gemini 3.1
// Pro): zelfde model, zelfde judge, zelfde prompts. Hun scores verschoven
// gemiddeld **4,0 punten** tussen mei en augustus, met een uitschieter van
// **13** (search-ad). De winnaars hierboven liggen 1-4 punten uit elkaar.
//
// Daarmee is dit GEEN tabel om op te sturen. De twee categorieën die van
// winnaar wisselden deden dat op nul punten verschil; dat is gelijkspel, geen
// bevinding. De routing is daarom op 2026-08-20 BEWUST ONGEWIJZIGD gelaten.
//
// En een composite-score meet niet alles wat telt. `smoke:structured-tweaks`
// laat zien dat gpt-5.6 een aangeleverde slide-skeleton voor 3 van de 5 titels
// honoreert waar claude-sonnet-5 er 4 van de 4 haalt — in dezelfde run, met
// dezelfde instructie. Website & Landing Pages naar GPT verplaatsen op grond
// van een gelijkspel zou dat gedrag dus kapotmaken zonder dat de score het ziet.
//
// ⚠️ NAGEMETEN MET 5 SAMPLES (2026-08-20, 240 generaties): het is erger dan
// "de ruis is groot". In **7 van de 8** categorieën is het verschil tussen de
// winnaar en de nummer 2 NIET AANTOONBAAR — gemiddelde sd 2,9 punten, dus een
// verschil is pas hard vanaf ~5,9. De winnaars hierboven liggen 1-4 punten uit
// elkaar. Alleen `one-pager` haalt het (4,0 tegen gepoolde sd 1,7).
//
// De extreemste conditie spreidt 61 tot 86 op IDENTIEKE invoer (sd 9,4). Eén
// generatie daaruit trekken en die "de score van dit model" noemen is een greep,
// geen meting — en zo is deze tabel in mei tot stand gekomen.
//
// Dat betekent NIET dat de routing fout is. Het betekent dat ze niet door deze
// meting wordt gedragen. Laat staan tenzij je een betere reden hebt dan een
// composite-score.
//
// Wil je hier weer op sturen? Eerst de methode repareren: meerdere samples per
// conditie en een spreiding in plaats van één getal. Zie
// tasks/model-routing-herijking.md en de rapporten in docs/experiments/.
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
