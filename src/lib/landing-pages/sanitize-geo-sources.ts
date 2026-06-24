/**
 * Scrub interne context-laagnamen uit citeableStats[].source van long-form GEO-articles.
 *
 * Achtergrond: het generatie-model kreeg de instructie "een source uit de aangeleverde
 * context", en de brand-context/content-brief-lagen zijn ZELF onderdeel van die context.
 * Het model citeerde daardoor de laag-namen letterlijk als bron — bv.
 * "Napking briefing: evidence pieces, 2024" of "Napking brand-context: delivery evidence".
 * Dat is user-facing leak van interne terminologie (dezelfde klasse als de Effie-rubric-leak,
 * zie gotchas.md 2026-05-17). De prompt is aangepast om dit te voorkomen; deze sanitizer is
 * het vangnet aan de bron voor restanten die toch doorglippen.
 *
 * Strategie: een source die een bekend intern-laag-patroon bevat → `null` (geen bron getoond).
 * Een echte externe bron (titel met jaartal, of een URL) blijft ongewijzigd. De render toont
 * `label — bron` alleen bij een non-null bron; first-party cijfers vallen dus eerlijk
 * terug op label-only.
 */

/**
 * Patronen die wijzen op een interne context-laagnaam i.p.v. een echte externe bron.
 * Case-insensitief. Curated set — uitbreiden zodra een nieuwe leak-vorm wordt waargenomen.
 *
 * `brand-context`, `evidence pieces` en `delivery evidence` zijn distinctieve interne
 * laag-jargon dat vrijwel nooit een echte publicatietitel is, dus die scrubben we los.
 * `briefing` is daarentegen té generiek als losse term (echte bronnen heten bv.
 * "McKinsey Marketing Briefing, 2024") → alleen scrubben in de interne-laag-vorm met
 * dubbele punt ("briefing:" of ": briefing"), zoals de geobserveerde leak
 * "Napking briefing: evidence pieces, 2024".
 */
const INTERNAL_SOURCE_PATTERNS: ReadonlyArray<RegExp> = [
  /brand[\s-]?context/i,
  /\bevidence\s+pieces?\b/i,
  /\bdelivery\s+evidence\b/i,
  /\bbriefing\s*:|:\s*briefing\b/i,
];

/**
 * Geef `source` terug als die een geldige externe bron lijkt, anders `null`.
 * Leeg/whitespace → null. Bevat een intern-laag-patroon → null.
 */
export function cleanStatSource(
  source: string | null | undefined,
): string | null {
  if (source == null) return null;
  const trimmed = source.trim();
  if (trimmed.length === 0) return null;
  for (const re of INTERNAL_SOURCE_PATTERNS) {
    if (re.test(trimmed)) return null;
  }
  return trimmed;
}

/** Minimale shape die we nodig hebben — vermijdt een import-cyclus met page-type-schemas. */
type GeoVariantLike = {
  citeableStats?: Array<{ source?: string | null } & Record<string, unknown>> | null;
} & Record<string, unknown>;

/**
 * Non-mutating: geeft een kopie van de long-form GEO-variant terug waarin elke
 * `citeableStats[].source` door `cleanStatSource` is gehaald. Andere velden ongewijzigd.
 *
 * Toepassen op het moment dat de variant uit de generator komt (vóór persist), zodat de
 * OPGESLAGEN variant schoon is en alle downstream-consumenten (Puck-render, geo-analysis,
 * flatten-variant) automatisch meeprofiteren.
 */
export function sanitizeLongFormGeoVariant<T extends GeoVariantLike>(variant: T): T {
  if (!Array.isArray(variant.citeableStats)) return variant;
  return {
    ...variant,
    citeableStats: variant.citeableStats.map((stat) => ({
      ...stat,
      source: cleanStatSource(stat.source),
    })),
  };
}
