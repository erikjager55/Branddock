/**
 * GEO/SEO Fase 1b — pure gate-logica voor de SEO-pipeline. Bewust in de lib-laag
 * (geen feature-dependency) zodat de orchestrator hier veilig op kan leunen; het
 * UI-veld leeft apart in `content-type-inputs` en deelt dezelfde default-constante.
 */
import {
  WEBSITE_DELIVERABLE_TYPES,
  LONG_FORM_SEO_TYPES,
  DEFAULT_LONG_FORM_OPTIMIZATION_GOALS,
  type OptimizationGoal,
} from "./seo-pipeline.types";

function isGoal(value: unknown): value is OptimizationGoal {
  return value === "seo" || value === "geo";
}

/**
 * Actieve optimalisatie-doelen uit de opgeslagen `contentTypeInputs.optimizationGoals`.
 * Geen opgeslagen waarde → de per-type default (long-form: SEO-aan; anders geen).
 * Een expliciet lege array betekent bewust geen doelen (opt-out).
 */
export function resolveOptimizationGoals(
  contentTypeInputs: Record<string, unknown> | null | undefined,
  typeId: string,
): OptimizationGoal[] {
  const stored = contentTypeInputs?.optimizationGoals;
  if (Array.isArray(stored)) return stored.filter(isGoal);
  return LONG_FORM_SEO_TYPES.has(typeId) ? [...DEFAULT_LONG_FORM_OPTIMIZATION_GOALS] : [];
}

/**
 * Beslist of de SEO-pipeline draait. Website-types: altijd (mits keyword).
 * Long-form: alleen als het SEO-doel aanstaat. Buiten beide sets: nooit.
 * Gedeeld door de orchestrator + smoke zodat de regel één bron heeft.
 */
export function shouldRunSeoPipeline(
  typeId: string,
  contentTypeInputs: Record<string, unknown> | null | undefined,
  hasPrimaryKeyword: boolean,
): boolean {
  if (!hasPrimaryKeyword) return false;
  if (WEBSITE_DELIVERABLE_TYPES.has(typeId)) return true;
  if (LONG_FORM_SEO_TYPES.has(typeId)) {
    return resolveOptimizationGoals(contentTypeInputs, typeId).includes("seo");
  }
  return false;
}
