/**
 * Canonieke set van content-types die de Puck web-page-builder gebruiken
 * (web-page-builder spec §4b paradigma B — single structured generation i.p.v.
 * de multi-variant flow). Eén bron van waarheid; eerder 3× los gedupliceerd in
 * Step2ContentVariants, GenericConfigPanel en de generate-structured-variant route.
 */
import { LONG_FORM_SEO_TYPES } from '@/lib/ai/seo-pipeline.types';
import { resolveOptimizationGoals } from '@/lib/ai/seo-pipeline-utils';

export const PUCK_WEBPAGE_TYPES: ReadonlySet<string> = new Set([
  'landing-page',
  'product-page',
  'faq-page',
  'comparison-page',
  'microsite',
]);

/** True wanneer een content-type via de Puck-builder gerenderd wordt. */
export function isPuckWebpageType(contentType: string | null | undefined): boolean {
  return typeof contentType === 'string' && PUCK_WEBPAGE_TYPES.has(contentType);
}

/**
 * Long-form types die OOK via de Puck/structured-variant-flow renderen — maar
 * alleen wanneer het GEO-doel actief is (GEO/SEO Fase 2). Bewust een aparte set
 * van `PUCK_WEBPAGE_TYPES`: long-form mag NIET de website-page-type-paden raken
 * (W1-dubbelpad-gate), alleen de GEO-render-eligibiliteit via `isPuckRenderable`.
 * Membership is nu identiek aan `LONG_FORM_SEO_TYPES`; gescheiden gehouden zodat
 * render- en SEO-eligibiliteit later kunnen divergeren.
 */
export const LONG_FORM_GEO_PUCK_TYPES: ReadonlySet<string> = LONG_FORM_SEO_TYPES;

/**
 * True wanneer een content-type via de Puck-builder/structured-variant-flow
 * gerenderd wordt: alle `PUCK_WEBPAGE_TYPES`, plus long-form-types wanneer het
 * GEO-doel (`optimizationGoals` bevat 'geo') actief is. Gedeelde gate zodat de
 * canvas-flow + routes long-form-GEO consistent toelaten zonder het bestaande
 * website-page-type-gedrag te wijzigen (geen geo-goal → identiek aan isPuckWebpageType).
 */
export function isPuckRenderable(
  contentType: string | null | undefined,
  contentTypeInputs: Record<string, unknown> | null | undefined,
): boolean {
  if (isPuckWebpageType(contentType)) return true;
  if (typeof contentType === 'string' && LONG_FORM_GEO_PUCK_TYPES.has(contentType)) {
    return resolveOptimizationGoals(contentTypeInputs, contentType).includes('geo');
  }
  return false;
}
