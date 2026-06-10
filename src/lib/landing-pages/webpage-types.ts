/**
 * Canonieke set van content-types die de Puck web-page-builder gebruiken
 * (web-page-builder spec §4b paradigma B — single structured generation i.p.v.
 * de multi-variant flow). Eén bron van waarheid; eerder 3× los gedupliceerd in
 * Step2ContentVariants, GenericConfigPanel en de generate-structured-variant route.
 */
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
